/**
 * Vercel serverless SI summary endpoint.
 * Set GEMINI_API_KEY in the Vercel project environment.
 */

async function geminiSummary(payload: Record<string, unknown>): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_KEY');

  const prompt = `You are Flame in Freefall SI. Interpret the ranked evidence for mission fire safety.
Rules: cite only URLs present in the payload; no fabricated numeric risk score; state Moon/Mars transfer caveats when atmosphere differs from tests; HTML <p>/<ol>/<li>/<a> only; under 200 words.

PAYLOAD:
${JSON.stringify(payload).slice(0, 14000)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
  if (!text) throw new Error('empty gemini');
  return text;
}

export default async function handler(
  req: { method?: string; body?: unknown },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
  },
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as Record<string, unknown>)
        : ((req.body || {}) as Record<string, unknown>);
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      return;
    }
    const html = await geminiSummary(body);
    res.status(200).json({ html });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'failed' });
  }
}
