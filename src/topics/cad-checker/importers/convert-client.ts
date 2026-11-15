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
  code: string;
  error: string;
  recommend?: string;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Call POST /api/cad-convert for DWG→DXF (and DXF passthrough).
 * Returns null when the API is unreachable (plain vite without serverless).
 */
export async function requestCadConvert(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<ConvertSuccess | ConvertFailure | null> {
  try {
    const res = await fetch('/api/cad-convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        contentBase64: bufferToBase64(buffer),
      }),
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return (await res.json()) as ConvertSuccess | ConvertFailure;
  } catch {
    return null;
  }
}
