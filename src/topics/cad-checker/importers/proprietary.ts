import { normalizePart } from '../schema';
import type { CadImportResult, CadNativeFormat } from './types';

export interface ProprietarySpec {
  format: CadNativeFormat;
  label: string;
  extensions: string[];
  preferredExports: string[];
  recommend: string;
}

export const PROPRIETARY_CAD_SPECS: ProprietarySpec[] = [
  {
    format: 'dwg',
    label: 'AutoCAD DWG',
    extensions: ['.dwg'],
    preferredExports: ['.dxf', '.step', '.stp', '.json'],
    recommend:
      'DWG is a proprietary binary. Export ASCII DXF (or STEP/BOM JSON) from AutoCAD, or use the planned DWG→DXF conversion worker.',
  },
  {
    format: 'sldprt',
    label: 'SOLIDWORKS part',
    extensions: ['.sldprt'],
    preferredExports: ['.step', '.stp', '.gltf', '.json', '.csv'],
    recommend:
      'SOLIDWORKS parts need an export or API worker. Save As STEP/glTF or export a materials-tagged BOM CSV/JSON for the checker.',
  },
  {
    format: 'sldasm',
    label: 'SOLIDWORKS assembly',
    extensions: ['.sldasm'],
    preferredExports: ['.step', '.stp', '.json', '.csv'],
    recommend:
      'SOLIDWORKS assemblies are not parsed in-browser. Export a flattened BOM or STEP assembly, then re-import here.',
  },
  {
    format: 'ipt',
    label: 'Inventor part',
    extensions: ['.ipt'],
    preferredExports: ['.step', '.stp', '.json', '.csv'],
    recommend: 'Inventor .ipt requires Inventor Server / AnyCAD or a BOM/STEP export.',
  },
  {
    format: 'iam',
    label: 'Inventor assembly',
    extensions: ['.iam'],
    preferredExports: ['.step', '.stp', '.json', '.csv'],
    recommend: 'Inventor .iam requires a BOM or STEP export (or Autodesk Platform Services later).',
  },
  {
    format: 'catpart',
    label: 'CATIA part',
    extensions: ['.catpart'],
    preferredExports: ['.step', '.stp', '.json', '.csv'],
    recommend: 'CATIA .CATPart needs 3DEXPERIENCE/CATIA batch export to STEP or a Flame BOM JSON.',
  },
  {
    format: 'catproduct',
    label: 'CATIA product',
    extensions: ['.catproduct'],
    preferredExports: ['.step', '.stp', '.json', '.csv'],
    recommend: 'CATIA .CATProduct needs a STEP or BOM export for flammability triage.',
  },
  {
    format: 'prt',
    label: 'NX / Creo part',
    extensions: ['.prt'],
    preferredExports: ['.step', '.stp', '.json', '.csv'],
    recommend:
      '.prt is ambiguous (Siemens NX or Creo/Pro-E). Export STEP from the originating CAD, or provide a BOM CSV/JSON.',
  },
  {
    format: 'asm',
    label: 'NX / Creo assembly',
    extensions: ['.asm'],
    preferredExports: ['.step', '.stp', '.json', '.csv'],
    recommend:
      '.asm is ambiguous (NX or Creo). Export STEP or a materials-tagged BOM for analysis.',
  },
];

function stemName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  return base.replace(/\.[^.]+$/i, '').replace(/[_-]+/g, ' ').trim();
}

/** Detect DWG magic (AC10xx) in the first bytes. */
export function looksLikeDwg(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 6));
  const ascii = String.fromCharCode(...bytes);
  return /^AC10\d\d/.test(ascii);
}

/**
 * Proprietary CAD path: never invent geometry — return conversion guidance
 * and optionally a single filename-stem part candidate for library lookup.
 */
export function importProprietary(
  format: CadNativeFormat,
  fileName: string,
  buffer?: ArrayBuffer,
): CadImportResult {
  const spec = PROPRIETARY_CAD_SPECS.find((s) => s.format === format);
  const label = spec?.label ?? format;
  const issues = [
    {
      severity: 'error' as const,
      message: `${label} (${fileName}) cannot be fully parsed in the browser yet.`,
    },
    {
      severity: 'warning' as const,
      message: spec?.recommend ?? 'Export STEP, DXF, or a materials-tagged BOM and re-upload.',
    },
  ];

  if (format === 'dwg' && buffer && looksLikeDwg(buffer)) {
    issues.push({
      severity: 'warning',
      message: 'DWG signature (AC10xx) detected. Phase 1 will convert DWG→DXF server-side; today export DXF manually.',
    });
  }

  const stem = stemName(fileName);
  const parts = [];
  if (stem) {
    const part = normalizePart({ id: 'cad-stem-1', material: stem, zone: 'cabin' });
    if (part) {
      parts.push(part);
      issues.push({
        severity: 'warning',
        message: `Added filename stem “${stem}” as a single candidate part for library lookup — replace with a real BOM/STEP/DXF export for production triage.`,
      });
    }
  }

  return {
    format,
    nativeCad: true,
    parts,
    issues,
    conversion: {
      needed: true,
      recommend: spec?.recommend ?? 'Export STEP or BOM.',
      preferredExports: spec?.preferredExports ?? ['.step', '.json'],
    },
  };
}
