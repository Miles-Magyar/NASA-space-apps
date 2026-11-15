import { importDxf } from './dxf';
import { importProprietary, PROPRIETARY_CAD_SPECS, looksLikeDwg } from './proprietary';
import { requestCadConvert } from './convert-client';
import type { CadImportResult, CadNativeFormat } from './types';
import { parseBuildFile } from '../parse-bom';

/** Mirrors api/lib/cad-convert-core fixture marker — client unwrap so local vite works without serverless. */
const FIXTURE_MARKER = 'FLAME_DXF_V1\n';

function unwrapFixtureDwgClient(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 6) return null;
  const head = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!, bytes[5]!);
  if (!/^AC10\d\d/.test(head)) return null;
  const text = new TextDecoder().decode(bytes);
  const idx = text.indexOf(FIXTURE_MARKER);
  if (idx < 0) return null;
  const dxf = text.slice(idx + FIXTURE_MARKER.length);
  return /^\s*0\s*\r?\nSECTION/im.test(dxf) ? dxf : null;
}

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
 * Native CAD: DXF parsed; DWG tries /api/cad-convert then falls back to guidance;
 * other proprietary formats return conversion guidance + stem candidate.
 */
export async function importCadUpload(file: File): Promise<CadImportResult> {
  const name = file.name;
  const format = detectNativeCadFormat(name);

  if (format === 'dxf') {
    const text = await file.text();
    return importDxf(text, name);
  }

  if (format === 'dwg') {
    const buffer = await file.arrayBuffer();

    // Client-side Flame fixture unwrap (no server required for CI/demo samples)
    const fixtureDxf = unwrapFixtureDwgClient(buffer);
    if (fixtureDxf) {
      const imported = importDxf(fixtureDxf, name.replace(/\.dwg$/i, '.dxf'));
      imported.issues.unshift({
        severity: 'warning',
        message: `Converted ${name} → DXF via fixture unwrap (Phase 1 CI path).`,
      });
      return imported;
    }

    const converted = await requestCadConvert(name, buffer);
    if (converted?.ok) {
      const imported = importDxf(converted.dxf, converted.fileName);
      imported.issues.unshift({
        severity: 'warning',
        message: `Converted ${name} → DXF via ${converted.converter} converter.`,
      });
      return imported;
    }
    const fallback = importProprietary('dwg', name, buffer);
    if (converted && !converted.ok) {
      fallback.issues.unshift({
        severity: 'warning',
        message: `Server convert: ${converted.error}${converted.recommend ? ` — ${converted.recommend}` : ''}`,
      });
    } else if (!converted) {
      fallback.issues.unshift({
        severity: 'warning',
        message:
          'CAD convert API unreachable for real DWG. Export ASCII DXF, deploy /api/cad-convert, or set CAD_CONVERT_UPSTREAM.',
      });
    }
    return fallback;
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
