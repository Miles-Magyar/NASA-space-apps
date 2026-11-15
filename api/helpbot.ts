import {
  HELPBOT_HISTORY_LIMIT,
  HELPBOT_MESSAGE_LIMIT,
  type HelpbotTurn,
} from '../src/helpbot-contract';
import { findHelpbotEvidence } from './lib/helpbot-evidence';
import { reserveHelpbotQuota } from './lib/helpbot-quota';
import { HELPBOT_SYSTEM_PROMPT } from './lib/helpbot-prompt';
import { SCENARIOS } from '../src/topics/mission-scenarios';

const MODEL = 'gemini-3.5-flash-lite';
const MAX_BODY_BYTES = 24_000;
const NO_MATCH = 'I couldn’t find a matching research record. Try a study, material, or atmosphere name, such as Saffire, Nomex, or EMU, or browse [Investigations](#investigations).';
const UNAVAILABLE = 'Live Helpbot is temporarily unavailable.';

interface HelpbotRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

function isTurn(value: unknown): value is HelpbotTurn {
  if (!value || typeof value !== 'object') return false;
  const turn = value as Partial<HelpbotTurn>;
  return (turn.role === 'user' || turn.role === 'assistant')
    && typeof turn.content === 'string' && turn.content.length <= HELPBOT_MESSAGE_LIMIT;
}

function parseRequest(raw: unknown): { message: string; history: HelpbotTurn[] } | null {
  try {
    const json = typeof raw === 'string' ? raw : JSON.stringify(raw ?? null);
    if (Buffer.byteLength(json) > MAX_BODY_BYTES) return null;
    const body = JSON.parse(json) as { message?: unknown; history?: unknown } | null;
    if (!body || typeof body.message !== 'string' || body.message.length > HELPBOT_MESSAGE_LIMIT) return null;
    const message = body.message.trim();
    const history = body.history ?? [];
    if (!message || !Array.isArray(history) || history.length > HELPBOT_HISTORY_LIMIT || !history.every(isTurn)) return null;
    return { message, history };
  } catch {
    return null;
  }
}

export default async function handler(req: HelpbotRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  if (req.headers?.['sec-fetch-site'] === 'cross-site') {
    res.status(403).json({ error: 'Open the Helpbot from the app.' });
    return;
  }
  const request = parseRequest(req.body);
  if (!request) {
    res.status(400).json({ error: 'Invalid message or conversation history.' });
    return;
  }

  const recentQuestion = [...request.history].reverse().find((turn) => turn.role === 'user')?.content;
  const matched = findHelpbotEvidence(request.message);
  const records = matched.length || !recentQuestion ? matched : findHelpbotEvidence(recentQuestion);
  if (!records.length) {
    res.status(200).json({ reply: NO_MATCH, sources: [] });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(503).json({ error: UNAVAILABLE });
    return;
  }

  try {
    const retryAfter = await reserveHelpbotQuota(process.env.VERCEL ? req.headers?.['x-vercel-forwarded-for'] : undefined);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Live answers are temporarily at their usage limit.' });
      return;
    }

    const sources: Array<{ url: string; label: string }> = [];
    const contextRecords = records.map(({ title, evidence, context, sources: links }) => ({
      title, evidence, context,
      references: links.slice(0, 3).map(({ url, label }) => {
        const number = sources.length + 1;
        sources.push({ url, label: `[${number}] ${label}` });
        return { number, label };
      }),
    }));
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: HELPBOT_SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [{ text: JSON.stringify({
            records: contextRecords,
            atmospherePresets: SCENARIOS,
            history: request.history,
            question: request.message,
          }) }],
        }],
        generationConfig: { maxOutputTokens: 400, thinkingConfig: { thinkingLevel: 'MINIMAL' } },
      }),
    });
    if (!upstream.ok) throw new Error('Gemini request failed');
    const data = await upstream.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
    };
    const reply = data.candidates?.[0]?.content?.parts?.filter((part) => !part.thought)
      .map((part) => part.text ?? '').join('\n').trim();
    if (!reply) throw new Error('Empty Gemini reply');

    const references = new Set([...reply.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
    res.status(200).json({ reply, sources: sources.filter((_, i) => references.has(i + 1)) });
  } catch {
    res.status(503).json({ error: UNAVAILABLE });
  }
}
