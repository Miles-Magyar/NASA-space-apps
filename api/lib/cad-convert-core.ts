/**
 * DWG → DXF conversion core (Phase 1).
 * Never invents materials — only emits DXF text for the existing DXF importer.
 */

export const CAD_CONVERT_MAX_BYTES = 3 * 1024 * 1024; // 3 MiB raw
export const FIXTURE_MARKER = 'FLAME_DXF_V1\n';

export type ConvertCode =
  | 'OK'
  | 'TOO_LARGE'
  | 'BAD_REQUEST'
  | 'UNSUPPORTED'
  | 'NO_CONVERTER'
  | 'UPSTREAM_FAILED'
  | 'NOT_DXF';

export interface ConvertSuccess {
  ok: true;
  formatIn: string;
  formatOut: 'dxf';
  dxf: string;
  fileName: string;
  converter: 'passthrough' | 'fixture' | 'upstream';
}

export interface ConvertFailure {
  ok: false;
  code: ConvertCode;
  error: string;
  recommend?: string;
}

export type ConvertResult = ConvertSuccess | ConvertFailure;

export function looksLikeDwgBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false;
  const ascii = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!, bytes[5]!);
  return /^AC10\d\d/.test(ascii);
}

export function looksLikeAsciiDxf(text: string): boolean {
  return /^\s*0\s*\r?\nSECTION/im.test(text) || /^\s*999\s*\r?\n/m.test(text);
}

/** Build a CI/dev fixture that looks like DWG but unwraps to ASCII DXF. */
export function wrapDxfAsFixtureDwg(dxf: string): Uint8Array {
  const header = new TextEncoder().encode('AC1032\0');
  const marker = new TextEncoder().encode(FIXTURE_MARKER);
  const body = new TextEncoder().encode(dxf);
  const out = new Uint8Array(header.length + marker.length + body.length);
  out.set(header, 0);
  out.set(marker, header.length);
  out.set(body, header.length + marker.length);
  return out;
}

/** Unwrap Flame fixture DWG → DXF text, or null if not a fixture. */
export function unwrapFixtureDwg(bytes: Uint8Array): string | null {
  if (!looksLikeDwgBytes(bytes)) return null;
  const text = new TextDecoder().decode(bytes);
  const idx = text.indexOf(FIXTURE_MARKER);
  if (idx < 0) return null;
  const dxf = text.slice(idx + FIXTURE_MARKER.length);
  return looksLikeAsciiDxf(dxf) ? dxf : null;
}

export function extensionOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return m?.[1] ?? '';
}

export function replaceExtension(fileName: string, ext: string): string {
  return fileName.replace(/(\.[^.]+)?$/i, ext);
}

const DWG_RECOMMEND =
  'Export ASCII DXF from AutoCAD (or set CAD_CONVERT_UPSTREAM to a DWG→DXF service), then re-upload.';

/**
 * Local conversion strategies (no network).
 * - DXF passthrough
 * - Flame fixture DWG unwrap
 * - Real DWG without upstream → NO_CONVERTER
 */
export function convertLocally(
  fileName: string,
  bytes: Uint8Array,
): ConvertResult {
  if (bytes.byteLength > CAD_CONVERT_MAX_BYTES) {
    return {
      ok: false,
      code: 'TOO_LARGE',
      error: `File exceeds ${CAD_CONVERT_MAX_BYTES} byte limit.`,
      recommend: 'Upload a smaller drawing or export a materials-tagged BOM/DXF.',
    };
  }

  const ext = extensionOf(fileName);
  const asText = new TextDecoder().decode(bytes);

  // DWG first (fixtures embed ASCII DXF — must not hit passthrough early)
  if (ext === '.dwg' || looksLikeDwgBytes(bytes)) {
    const fixture = unwrapFixtureDwg(bytes);
    if (fixture) {
      return {
        ok: true,
        formatIn: 'dwg',
        formatOut: 'dxf',
        dxf: fixture,
        fileName: replaceExtension(fileName, '.dxf'),
        converter: 'fixture',
      };
    }
    return {
      ok: false,
      code: 'NO_CONVERTER',
      error: 'Real DWG binary requires an upstream converter (ODA / LibreDWG service).',
      recommend: DWG_RECOMMEND,
    };
  }

  if (ext === '.dxf' || looksLikeAsciiDxf(asText)) {
    if (!looksLikeAsciiDxf(asText)) {
      return {
        ok: false,
        code: 'NOT_DXF',
        error: 'File does not look like ASCII DXF.',
        recommend: 'Use ASCII DXF (not binary DXF).',
      };
    }
    return {
      ok: true,
      formatIn: 'dxf',
      formatOut: 'dxf',
      dxf: asText,
      fileName: replaceExtension(fileName, '.dxf'),
      converter: 'passthrough',
    };
  }

  return {
    ok: false,
    code: 'UNSUPPORTED',
    error: `Unsupported conversion input: ${ext || 'unknown'} (${fileName}). Phase 1 converts DWG→DXF only.`,
    recommend: 'Export STEP or a materials-tagged BOM for SOLIDWORKS / Inventor / CATIA / NX / Creo.',
  };
}
