// Older app bundles can use their local summary when this route returns 503.
export default function handler(
  req: { method?: string },
  res: { status(code: number): { json(body: unknown): void } },
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  res.status(503).json({ error: 'Live summaries are unavailable.' });
}
