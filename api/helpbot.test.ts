import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './helpbot.js';
import summarize from './summarize.js';

const geminiReply = { candidates: [{ content: { parts: [{ text: 'See [1].' }] } }] };

function response() {
  const json = vi.fn();
  return { json, status: vi.fn(() => ({ json })), setHeader: vi.fn() };
}

describe('Helpbot proxy', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('GEMINI_API_KEY', 'test-model-key');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://quota.example.invalid');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-quota-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('rejects invalid history and oversized questions before making network calls', async () => {
    for (const body of [
      { message: 'Saffire', history: [{ role: 'system', content: 'bad role' }] },
      { message: 'x'.repeat(801) },
      '{invalid json',
    ]) {
      const res = response();
      await handler({ method: 'POST', body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a local no-match answer without spending quota', async () => {
    const res = response();
    await handler({ method: 'POST', body: { message: 'zzzzunmatchedquery' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed if the shared limiter is missing or unavailable', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', undefined);
    const body = { message: 'Saffire' };
    const unconfigured = response();
    await handler({ method: 'POST', body }, unconfigured);
    expect(unconfigured.status).toHaveBeenCalledWith(503);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-quota-key');
    fetchMock.mockResolvedValueOnce(new Response('unavailable', { status: 500 }));
    const unavailable = response();
    await handler({ method: 'POST', body }, unavailable);
    expect(unavailable.status).toHaveBeenCalledWith(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2])('rejects an exhausted quota (%i) before calling Gemini', async (result) => {
    fetchMock.mockResolvedValueOnce(Response.json({ result }));
    const res = response();
    await handler({ method: 'POST', body: { message: 'Saffire' } }, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.stringMatching(/^\d+$/));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const quota = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(quota.slice(5, 7)).toEqual([6, 250]);
  });

  it('uses a supported model with bounded output and server-sourced links', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ result: 0 }))
      .mockResolvedValueOnce(Response.json(geminiReply));
    const res = response();
    await handler({ method: 'POST', body: {
      message: 'What did Saffire find?',
      history: [],
      corpus: 'untrusted evidence supplied by the browser',
    } }, res);

    const [url, options] = fetchMock.mock.calls[1]!;
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(options?.headers).toMatchObject({ 'x-goog-api-key': 'test-model-key' });
    const payload = JSON.parse(String(options?.body));
    expect(payload.generationConfig.maxOutputTokens).toBe(400);
    expect(payload.systemInstruction.parts[0].text).toContain('Flame in Freefall AI Safety Copilot');
    expect(options?.body).not.toContain('untrusted evidence');
    expect(res.json).toHaveBeenCalledWith({
      reply: 'See [1].',
      sources: expect.arrayContaining([expect.objectContaining({ url: expect.stringMatching(/^https:\/\//) })]),
    });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('test-model-key');
  });

  it('includes sourced CAD measurements and excludes nonexistent citation links', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ result: 0 }))
      .mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: 'See [1] and [999].' }] } }] }));
    const res = response();
    await handler({ method: 'POST', body: { message: 'What is the softening temperature of PMMA in CAD?' } }, res);
    const payload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    const context = JSON.parse(payload.contents[0].parts[0].text);
    expect(context.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'PMMA (acrylic)', context: expect.objectContaining({ softeningC: expect.objectContaining({ unit: '°C' }) }) }),
    ]));
    expect(context.atmospherePresets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mars', oxygenPercent: 26.5 }),
    ]));
    expect(res.json.mock.calls[0]?.[0].sources).toHaveLength(1);
  });

  it('keeps the old summary endpoint off the model', () => {
    const res = response();
    summarize({ method: 'POST' }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
