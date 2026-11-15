import { normalizePart, validateParts } from './schema';
import type { BomPart, ParseBomResult, ParseIssue } from './types';
import { adjacencyFromParentHints, parseStepAssembly } from './importers/step-assembly';

/** Detected build/BOM formats the checker accepts. */
export type BuildFileFormat =
  | 'json'
  | 'ndjson'
  | 'csv'
  | 'tsv'
  | 'xml'
  | 'gltf'
  | 'glb'
  | 'step'
  | 'unknown';

export const ACCEPTED_BUILD_EXTENSIONS = [
  '.json',
  '.ndjson',
  '.jsonl',
  '.csv',
  '.tsv',
  '.txt',
  '.xml',
  '.gltf',
  '.glb',
  '.step',
  '.stp',
] as const;

export const ACCEPTED_BUILD_ACCEPT =
  '.json,.ndjson,.jsonl,.csv,.tsv,.txt,.xml,.gltf,.glb,.step,.stp,application/json,text/csv,text/tab-separated-values,text/plain,model/gltf+json,model/gltf-binary,application/xml,text/xml';

function detectFormat(text: string, fileName?: string): BuildFileFormat {
  const name = (fileName ?? '').toLowerCase();
  if (name.endsWith('.gltf')) return 'gltf';
  if (name.endsWith('.glb')) return 'glb';
  if (name.endsWith('.step') || name.endsWith('.stp')) return 'step';
  if (name.endsWith('.ndjson') || name.endsWith('.jsonl')) return 'ndjson';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.tsv')) return 'tsv';
  if (name.endsWith('.xml')) return 'xml';
  if (name.endsWith('.json')) return 'json';

  const t = text.trim();
  if (!t) return 'unknown';
  if (t.startsWith('ISO-10303') || /\bFILE_SCHEMA\b/i.test(t) || /\bPRODUCT\b/.test(t) && /\b#\d+\s*=/.test(t)) {
    return 'step';
  }
  if (t.startsWith('<') && /<(bom|parts|part|Part|material)/i.test(t)) return 'xml';
  if (t.startsWith('{') && /"materials"\s*:/.test(t) && /"asset"\s*:/.test(t)) return 'gltf';
  if (t.startsWith('[') || t.startsWith('{')) return 'json';
  // NDJSON: multiple JSON objects on separate lines
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length > 1 && lines.every((l) => l.trim().startsWith('{'))) return 'ndjson';
  if (lines[0]?.includes('\t')) return 'tsv';
  if (lines[0]?.includes(',')) return 'csv';
  return 'unknown';
}

/** Quote-aware delimiter split (RFC4180-ish). */
export function splitDelimitedLine(line: string, delimiter: ',' | '\t'): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function headerKey(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function mapHeader(h: string): keyof BomPart | undefined {
  const n = headerKey(h).replace(/_/g, '');
  const map: Record<string, keyof BomPart> = {
    material: 'material',
    mat: 'material',
    name: 'material',
    partmaterial: 'material',
    id: 'id',
    partid: 'id',
    mass: 'mass',
    area: 'area',
    nearbyfuel: 'nearbyFuel',
    fuel: 'nearbyFuel',
    maxexpectedtempc: 'maxExpectedTempC',
    tempc: 'maxExpectedTempC',
    temp: 'maxExpectedTempC',
    temperature: 'maxExpectedTempC',
    zone: 'zone',
    heaterid: 'heaterId',
    heater: 'heaterId',
  };
  return map[n];
}

function parseDelimited(text: string, delimiter: ',' | '\t', issues: ParseIssue[]): BomPart[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const firstCells = splitDelimitedLine(lines[0], delimiter);
  const mappedFirst = firstCells.map((c) => mapHeader(c));
  const hasHeader = mappedFirst.includes('material');
  const headers = hasHeader
    ? mappedFirst
    : (['material', 'mass', 'area', 'nearbyFuel', 'maxExpectedTempC', 'zone'] as (keyof BomPart)[]);
  const start = hasHeader ? 1 : 0;
  const parts: BomPart[] = [];

  for (let i = start; i < lines.length; i++) {
    const cells = splitDelimitedLine(lines[i], delimiter);
    if (cells.every((c) => !c)) continue;
    const raw: Record<string, unknown> = {};
    headers.forEach((key, idx) => {
      if (!key) return;
      raw[key] = cells[idx] ?? '';
    });
    if (raw.material == null && cells[0]) raw.material = cells[0];
    const part = normalizePart(raw, i + 1, issues);
    if (part) parts.push(part);
  }
  return parts;
}

function parseJsonBom(text: string, issues: ParseIssue[]): BomPart[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    issues.push({ severity: 'error', message: `JSON parse failed: ${(e as Error).message}` });
    return [];
  }

  let rows: unknown[] = [];
  if (Array.isArray(parsed)) rows = parsed;
  else if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.parts)) rows = o.parts;
    else if (Array.isArray(o.bom)) rows = o.bom;
    else if (Array.isArray(o.items)) rows = o.items;
    else if (Array.isArray(o.components)) rows = o.components;
    else {
      issues.push({
        severity: 'error',
        message: 'JSON object must include parts, bom, items, or components array (or be a top-level array)',
      });
      return [];
    }
  } else {
    issues.push({ severity: 'error', message: 'JSON root must be an array or object' });
    return [];
  }

  const parts: BomPart[] = [];
  rows.forEach((row, i) => {
    if (!row || typeof row !== 'object') {
      issues.push({ severity: 'error', message: 'Part row is not an object', row: i + 1 });
      return;
    }
    const part = normalizePart(row as Record<string, unknown>, i + 1, issues);
    if (part) parts.push(part);
  });
  return parts;
}

function parseNdjson(text: string, issues: ParseIssue[]): BomPart[] {
  const parts: BomPart[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    try {
      const row = JSON.parse(t) as Record<string, unknown>;
      const part = normalizePart(row, i + 1, issues);
      if (part) parts.push(part);
    } catch (e) {
      issues.push({ severity: 'error', message: `NDJSON line ${i + 1}: ${(e as Error).message}`, row: i + 1 });
    }
  });
  return parts;
}

function parseXmlBom(text: string, issues: ParseIssue[]): BomPart[] {
  const parts: BomPart[] = [];
  // Attribute form: <part material="PMMA" zone="cabin" maxExpectedTempC="60" />
  const attrRe =
    /<(?:part|Part|component|Component)\b([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(text))) {
    const attrs = m[1];
    const get = (name: string) => {
      const am = attrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
      return am?.[1];
    };
    const part = normalizePart(
      {
        id: get('id'),
        material: get('material') ?? get('name'),
        mass: get('mass'),
        area: get('area'),
        nearbyFuel: get('nearbyFuel') ?? get('nearby_fuel'),
        maxExpectedTempC: get('maxExpectedTempC') ?? get('temp'),
        zone: get('zone'),
        heaterId: get('heaterId') ?? get('heater'),
      },
      parts.length + 1,
      issues,
    );
    if (part) parts.push(part);
  }

  // Element form: <Material>PMMA</Material> inside <Part>
  const elRe = /<(?:part|Part)\b[^>]*>([\s\S]*?)<\/(?:part|Part)>/gi;
  while ((m = elRe.exec(text))) {
    const body = m[1];
    const grab = (tag: string) => {
      const tm = body.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
      return tm?.[1]?.trim();
    };
    if (!grab('material') && !grab('Material') && !grab('name')) continue;
    // Skip if we already captured via self-closing with same material+id — still add element forms
    const part = normalizePart(
      {
        id: grab('id') ?? grab('Id'),
        material: grab('material') ?? grab('Material') ?? grab('name'),
        mass: grab('mass'),
        area: grab('area'),
        nearbyFuel: grab('nearbyFuel') ?? grab('nearby_fuel'),
        maxExpectedTempC: grab('maxExpectedTempC') ?? grab('temp'),
        zone: grab('zone'),
        heaterId: grab('heaterId'),
      },
      parts.length + 1,
      issues,
    );
    if (part) parts.push(part);
  }

  if (!parts.length) {
    issues.push({
      severity: 'error',
      message: 'No <part material="…"> or <Part><Material>… nodes found in XML',
    });
  }
  return parts;
}

function parseGltfMaterials(text: string, issues: ParseIssue[]): BomPart[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    issues.push({ severity: 'error', message: `glTF JSON parse failed: ${(e as Error).message}` });
    return [];
  }
  const o = parsed as { materials?: Array<{ name?: string }>; nodes?: Array<{ name?: string; mesh?: number }> };
  const mats = o.materials ?? [];
  if (!mats.length) {
    issues.push({
      severity: 'warning',
      message: 'glTF has no materials[] entries — export a BOM CSV/JSON with material tags for full checks',
    });
  }
  const parts: BomPart[] = [];
  mats.forEach((mat, i) => {
    const name = mat.name?.trim();
    if (!name) {
      issues.push({ severity: 'warning', message: `glTF materials[${i}] has no name`, row: i });
      return;
    }
    const part = normalizePart({ id: `gltf-mat-${i}`, material: name, zone: 'cabin' }, i + 1, issues);
    if (part) parts.push(part);
  });
  // Also harvest node names that look like materials when materials[] empty
  if (!parts.length && o.nodes) {
    o.nodes.forEach((n, i) => {
      if (!n.name) return;
      const part = normalizePart({ id: `gltf-node-${i}`, material: n.name, zone: 'cabin' }, i + 1, issues);
      if (part) parts.push(part);
    });
    if (parts.length) {
      issues.push({
        severity: 'warning',
        message: 'Used glTF node names as material candidates — verify against the materials library',
      });
    }
  }
  issues.push({
    severity: 'warning',
    message:
      'glTF import extracts material/node names only (no temperatures or zones). Enrich via BOM CSV for LOI/temp screens.',
  });
  return parts;
}

function parseStepMaterials(
  text: string,
  issues: ParseIssue[],
  fileName?: string,
): { parts: BomPart[]; adjacency?: import('./types').AdjacencyEdge[] } {
  const assembled = parseStepAssembly(text, fileName ?? 'assembly.step');
  issues.push(...assembled.issues);
  return { parts: assembled.parts, adjacency: assembled.adjacency };
}

/**
 * Parse a build/BOM file or pasted text into validated parts.
 * Supports JSON, NDJSON, CSV, TSV, simple BOM XML, glTF JSON materials, and STEP text name extraction.
 */
export function parseBuildFile(text: string, fileName?: string): ParseBomResult {
  const issues: ParseIssue[] = [];
  const format = detectFormat(text, fileName);

  let parts: BomPart[] = [];
  let adjacency: ParseBomResult['adjacency'];
  switch (format) {
    case 'json':
      parts = parseJsonBom(text, issues);
      break;
    case 'ndjson':
      parts = parseNdjson(text, issues);
      break;
    case 'csv':
      parts = parseDelimited(text, ',', issues);
      break;
    case 'tsv':
      parts = parseDelimited(text, '\t', issues);
      break;
    case 'xml':
      parts = parseXmlBom(text, issues);
      break;
    case 'gltf':
      parts = parseGltfMaterials(text, issues);
      break;
    case 'step': {
      const step = parseStepMaterials(text, issues, fileName);
      parts = step.parts;
      adjacency = step.adjacency;
      break;
    }
    default:
      // Last-chance: try JSON then CSV
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        parts = parseJsonBom(text, issues);
      } else if (text.includes(',')) {
        parts = parseDelimited(text, ',', issues);
        issues.push({ severity: 'warning', message: 'Format unclear — parsed as CSV' });
      } else {
        issues.push({
          severity: 'error',
          message: `Unrecognized build file format${fileName ? ` (${fileName})` : ''}. Use JSON, CSV, TSV, NDJSON, XML, glTF, or STEP.`,
        });
      }
  }

  parts = validateParts(parts, issues);

  if (!adjacency?.length && parts.some((p) => p.parentId)) {
    adjacency = adjacencyFromParentHints(parts);
  }

  return { format, parts, issues, adjacency };
}

/** @deprecated Prefer parseBuildFile — kept for call-site clarity. */
export function parseBom(text: string, fileName?: string): BomPart[] {
  const result = parseBuildFile(text, fileName);
  if (result.issues.some((i) => i.severity === 'error') && !result.parts.length) {
    throw new Error(result.issues.map((i) => i.message).join('; '));
  }
  return result.parts;
}
