import { normalizePart, validateParts } from '../schema';
import type { BomPart, ParseIssue } from '../types';
import type { CadImportResult } from './types';

/** Parse ASCII DXF into code/value groups. */
export function parseDxfGroups(text: string): Array<{ code: number; value: string }> {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const groups: Array<{ code: number; value: string }> = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isFinite(code)) continue;
    groups.push({ code, value: lines[i + 1] ?? '' });
  }
  return groups;
}

function looksLikeMaterialName(name: string): boolean {
  const n = name.trim();
  if (n.length < 2 || n.length > 80) return false;
  if (/^(0|DEFPOINTS|VIEW_|DIM_|HATCH|ANNOTATION|CENTER|HIDDEN|PHANTOM)/i.test(n)) return false;
  if (/^layer\d+$/i.test(n)) return false;
  return true;
}

/**
 * Extract candidate part/material names from an ASCII DXF.
 * Prefers LAYER table names, then BLOCK names, then TEXT/MTEXT strings
 * that look like materials (or MATERIAL_ prefixes).
 */
export function importDxf(text: string, fileName: string): CadImportResult {
  const issues: ParseIssue[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      format: 'dxf',
      nativeCad: true,
      parts: [],
      issues: [{ severity: 'error', message: 'Empty DXF file' }],
    };
  }
  if (trimmed.charCodeAt(0) === 0x41 && trimmed.startsWith('AC10') && !trimmed.includes('SECTION')) {
    // Unlikely ASCII; may be DWG misnamed
    return {
      format: 'dxf',
      nativeCad: true,
      parts: [],
      issues: [
        {
          severity: 'error',
          message: 'File does not look like ASCII DXF. If this is DWG, rename/export to DXF or use the DWG conversion path.',
        },
      ],
      conversion: {
        needed: true,
        recommend: 'Export ASCII DXF from AutoCAD (Save As → DXF) or convert DWG→DXF.',
        preferredExports: ['.dxf', '.step', '.json'],
      },
    };
  }

  const groups = parseDxfGroups(trimmed);
  const layers = new Set<string>();
  const blocks = new Set<string>();
  const texts = new Set<string>();

  let section = '';
  let table = '';
  let entity = '';
  let inLayerTable = false;

  for (let i = 0; i < groups.length; i++) {
    const { code, value } = groups[i];
    const v = value.trim();

    if (code === 0 && v === 'SECTION') {
      const name = groups[i + 1]?.code === 2 ? groups[i + 1].value.trim() : '';
      section = name.toUpperCase();
      table = '';
      entity = '';
      continue;
    }
    if (code === 0 && v === 'ENDSEC') {
      section = '';
      inLayerTable = false;
      continue;
    }
    if (section === 'TABLES' && code === 0 && v === 'TABLE') {
      table = groups[i + 1]?.code === 2 ? groups[i + 1].value.trim().toUpperCase() : '';
      inLayerTable = table === 'LAYER';
      continue;
    }
    if (inLayerTable && code === 0 && v === 'LAYER') {
      // next code 2 is layer name
      for (let j = i + 1; j < Math.min(i + 8, groups.length); j++) {
        if (groups[j].code === 2) {
          const layer = groups[j].value.trim();
          if (looksLikeMaterialName(layer)) layers.add(layer);
          break;
        }
      }
      continue;
    }
    if (section === 'BLOCKS' && code === 0 && v === 'BLOCK') {
      for (let j = i + 1; j < Math.min(i + 12, groups.length); j++) {
        if (groups[j].code === 2) {
          const block = groups[j].value.trim();
          if (looksLikeMaterialName(block) && !/^(\*|$)/.test(block)) blocks.add(block);
          break;
        }
      }
      continue;
    }
    if (section === 'ENTITIES' && code === 0) {
      entity = v.toUpperCase();
      continue;
    }
    if (section === 'ENTITIES' && (entity === 'TEXT' || entity === 'MTEXT') && (code === 1 || code === 3)) {
      const t = v.replace(/\\[A-Za-z][^\\;]*;?/g, ' ').replace(/[{}]/g, ' ').trim();
      if (looksLikeMaterialName(t)) texts.add(t);
    }
  }

  const materialish = (name: string) => {
    const cleaned = name.replace(/^MATERIAL[_:\s-]+/i, '').trim();
    return cleaned || name;
  };

  const candidates: string[] = [];
  const pushUnique = (raw: string) => {
    const name = materialish(raw);
    if (!name) return;
    if (candidates.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    candidates.push(name);
  };

  // Prefer explicitly tagged materials, then layers, blocks, texts
  [...layers].filter((l) => /^MATERIAL/i.test(l)).forEach(pushUnique);
  [...texts].filter((t) => /^MATERIAL/i.test(t) || /\b(PMMA|Nomex|ABS|PTFE|Aluminum|Steel)\b/i.test(t)).forEach(pushUnique);
  [...layers].forEach(pushUnique);
  [...blocks].forEach(pushUnique);
  [...texts].forEach(pushUnique);

  const parts: BomPart[] = [];
  candidates.forEach((name, idx) => {
    const part = normalizePart(
      {
        id: `dxf-${idx + 1}`,
        material: name,
        zone: 'cabin',
      },
      idx + 1,
      issues,
    );
    if (part) parts.push(part);
  });

  const validated = validateParts(parts, issues);
  if (!validated.length) {
    issues.push({
      severity: 'warning',
      message:
        'No material-like layer/block/text names found in DXF. Tag layers as MATERIAL_PMMA (etc.) or export a BOM CSV/JSON.',
    });
  } else {
    issues.push({
      severity: 'warning',
      message: `DXF import used ${validated.length} name candidate(s) from layers/blocks/text in ${fileName}. Confirm against the materials library; add maxExpectedTempC via BOM overlay when needed.`,
    });
  }

  return {
    format: 'dxf',
    nativeCad: true,
    parts: validated,
    issues,
  };
}
