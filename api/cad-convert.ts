/**
 * POST /api/cad-convert — Phase 1 DWG→DXF worker.
 *
 * Body JSON: { fileName: string, contentBase64: string }
 * Optional: Authorization: Bearer <CAD_CONVERT_TOKEN> when that env is set.
 * Optional upstream: CAD_CONVERT_UPSTREAM (URL expecting same JSON, returning { dxf }).
 *
 * Never invents materials — only returns DXF text for the client DXF importer.
 */

import {
  CAD_CONVERT_MAX_BYTES,
  convertLocally,
  type ConvertResult,
} from './lib/cad-convert-core';

type Res = {
  status: (code: number) => { json: (body: unknown) => void };
};

function decodeBase64(b64: string): Uint8Array {
  const buf = Buffer.from(b64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function authorize(req: { headers?: Record<string, string | string[] | undefined> }): boolean {
  const token = process.env.CAD_CONVERT_TOKEN;
  if (!token) return true;
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return false;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return Boolean(m && m[1] === token);
}

async function convertViaUpstream(
  fileName: string,
  contentBase64: string,
): Promise<ConvertResult | null> {
  const upstream = process.env.CAD_CONVERT_UPSTREAM?.trim();
  if (!upstream) return null;

  const res = await fetch(upstream, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.CAD_CONVERT_UPSTREAM_TOKEN
        ? { Authorization: `Bearer ${process.env.CAD_CONVERT_UPSTREAM_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ fileName, contentBase64 }),
  });

  if (!res.ok) {
    return {
      ok: false,
      code: 'UPSTREAM_FAILED',
      error: `Upstream converter returned HTTP ${res.status}.`,
      recommend: 'Export ASCII DXF manually, or check CAD_CONVERT_UPSTREAM.',
    };
  }

  const data = (await res.json()) as { dxf?: string; fileName?: string };
  if (!data.dxf || typeof data.dxf !== 'string') {
    return {
      ok: false,
      code: 'UPSTREAM_FAILED',
      error: 'Upstream converter response missing dxf text.',
      recommend: 'Export ASCII DXF manually.',
    };
  }

  return {
    ok: true,
    formatIn: 'dwg',
    formatOut: 'dxf',
    dxf: data.dxf,
    fileName: data.fileName ?? fileName.replace(/\.dwg$/i, '.dxf'),
    converter: 'upstream',
  };
}

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: Res,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'BAD_REQUEST', error: 'Method not allowed' });
    return;
  }

  if (!authorize(req)) {
    res.status(401).json({ ok: false, code: 'BAD_REQUEST', error: 'Unauthorized' });
    return;
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
    const fileName = String(body?.fileName || 'upload.dwg');
    const contentBase64 = String(body?.contentBase64 || '');

    if (!contentBase64) {
      res.status(400).json({
        ok: false,
        code: 'BAD_REQUEST',
        error: 'contentBase64 required',
      } satisfies ConvertResult);
      return;
    }

    // Rough size gate before decode (base64 ~4/3 raw)
    if (contentBase64.length > (CAD_CONVERT_MAX_BYTES * 4) / 3 + 64) {
      res.status(413).json({
        ok: false,
        code: 'TOO_LARGE',
        error: `File exceeds ${CAD_CONVERT_MAX_BYTES} byte limit.`,
      } satisfies ConvertResult);
      return;
    }

    const bytes = decodeBase64(contentBase64);
    let result = convertLocally(fileName, bytes);

    // Real DWG: try upstream when local path cannot convert
    if (!result.ok && result.code === 'NO_CONVERTER') {
      const upstream = await convertViaUpstream(fileName, contentBase64);
      if (upstream) result = upstream;
    }

    const status = result.ok
      ? 200
      : result.code === 'TOO_LARGE'
        ? 413
        : result.code === 'NO_CONVERTER' || result.code === 'UNSUPPORTED'
          ? 501
          : result.code === 'UPSTREAM_FAILED'
            ? 502
            : 400;

    res.status(status).json(result);
  } catch (err) {
    res.status(500).json({
      ok: false,
      code: 'BAD_REQUEST',
      error: err instanceof Error ? err.message : 'failed',
    } satisfies ConvertResult);
  }
}
