import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './cad-convert.js';
import { resetRateLimitBuckets } from './lib/rate-limit.js';

const nativeDwg = Buffer.from('AC1015\0test drawing').toString('base64');
const asciiDxf = '0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\n';

function response() {
  const json = vi.fn();
  return { json, status: vi.fn(() => ({ json })) };
}

describe('CAD upstream conversion', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    resetRateLimitBuckets();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CAD_CONVERT_TOKEN', '');
    vi.stubEnv('CAD_CONVERT_UPSTREAM', 'https://worker.example.invalid/convert');
    vi.stubEnv('CAD_CONVERT_UPSTREAM_TOKEN', 'test-worker-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('passes the server-side token and accepts ASCII DXF from the worker', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ dxf: asciiDxf }));
    const res = response();
    await handler({ method: 'POST', body: { fileName: 'drawing.DWG', contentBase64: nativeDwg } }, res);
    expect(fetchMock).toHaveBeenCalledWith('https://worker.example.invalid/convert', expect.objectContaining({
      redirect: 'error', headers: expect.objectContaining({ Authorization: 'Bearer test-worker-token' }),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      converter: 'upstream', dxf: asciiDxf, fileName: 'drawing.dxf',
    }));
  });

  it('reports malformed converter output as an upstream failure', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ dxf: 'not an ASCII DXF' }));
    const res = response();
    await handler({ method: 'POST', body: { contentBase64: nativeDwg } }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UPSTREAM_FAILED' }));
  });

  it('reports an unavailable worker without exposing connection details', async () => {
    fetchMock.mockRejectedValueOnce(new Error('private connection details'));
    const res = response();
    await handler({ method: 'POST', body: { contentBase64: nativeDwg } }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('private connection details');
  });
});
