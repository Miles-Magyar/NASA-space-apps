import { importDxf } from './dxf';
import { importProprietary, PROPRIETARY_CAD_SPECS, looksLikeDwg } from './proprietary';
import type { CadImportResult, CadNativeFormat } from './types';
import { parseBuildFile } from '../parse-bom';

const EXT_TO_FORMAT: Record<string, CadNativeFormat> = {};
for (const spec of PROPRIETARY_CAD_SPECS) {
  for (const ext of spec.extensions) {
    EXT_TO_FORMAT[ext] = spec.format;
  }
}
EXT_TO_FORMAT['.dxf'] = 'dxf';

export const NATIVE_CAD_EXTENSIONS = ['.dxf', ...PROPRIETARY_CAD_SPECS.flatMap((s) => s.extensions)] as const;

export const NATIVE_CAD_ACCEPT = NATIVE_CAD_EXTENSIONS.join(',');

export function extensionOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return m?.[1] ?? '';
}

export function detectNativeCadFormat(fileName: string, buffer?: ArrayBuffer): CadNativeFormat | null {
  const ext = extensionOf(fileName);
  if (ext === '.dxf') return 'dxf';
  if (ext === '.dwg' || (buffer && looksLikeDwg(buffer))) return 'dwg';
  return EXT_TO_FORMAT[ext] ?? null;
}

export function isNativeCadFileName(fileName: string): boolean {
  return detectNativeCadFormat(fileName) != null;
}

/**
 * Import a browser File (BOM text formats still go through parseBuildFile).
 * Native CAD: DXF parsed; proprietary formats return conversion guidance + stem candidate.
 */
export async function importCadUpload(file: File): Promise<CadImportResult> {
  const name = file.name;
  const format = detectNativeCadFormat(name);

  if (format === 'dxf') {
    const text = await file.text();
    return importDxf(text, name);
  }

  if (format) {
    const buffer = await file.arrayBuffer();
    return importProprietary(format, name, buffer);
  }

  // Fall through: treat as BOM/build text
  const text = await file.text();
  const parsed = parseBuildFile(text, name);
  return {
    format: parsed.format,
    nativeCad: false,
    parts: parsed.parts,
    issues: parsed.issues,
  };
}

/** Text/DXF paste path used by tests and textarea DXF pastes. */
export function importCadText(text: string, fileName = 'paste.dxf'): CadImportResult {
  if (fileName.toLowerCase().endsWith('.dxf') || /^\s*0\s*\nSECTION/im.test(text)) {
    return importDxf(text, fileName);
  }
  const parsed = parseBuildFile(text, fileName);
  return {
    format: parsed.format,
    nativeCad: false,
    parts: parsed.parts,
    issues: parsed.issues,
  };
}
