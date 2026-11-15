/**
 * Vercel serverless Helpbot endpoint.
 * Set GEMINI_API_KEY in the Vercel project. Never expose the key to the client.
 */

type Msg = { role: string; content: string };

async function geminiReply(message: string, history: Msg[], corpusHint: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_KEY');

  const system = `You are the Flame in Freefall Helpbot for NASA Space Apps.
Answer ONLY using the curated corpus context provided.
Require citations (PSI/NTRS/NASA URLs from context).
Refuse speculation beyond provided evidence.
When gravity, oxygen, or pressure differ from the cited test (Moon/Mars transfer), state that caveat.
Be concise (under 180 words).`;

  const prompt = `${system}

CURATED CONTEXT:
${corpusHint}

CHAT:
${history.map((m) => `${m.role}: ${m.content}`).join('\n')}
user: ${message}
assistant:`;

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
    const message = String(body?.message || '');
    const history = (body?.history || []) as Msg[];
    const corpusHint = String(body?.corpus || '').slice(0, 12000);
    if (!message.trim()) {
      res.status(400).json({ error: 'message required' });
      return;
    }
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
      return;
    }
    const reply = await geminiReply(message, history, corpusHint);
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'failed' });
  }
}
