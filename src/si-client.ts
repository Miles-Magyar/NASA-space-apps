import type { SourceLink } from './topics/mission-types';
import { buildLocalHelpbotReply, buildLocalSummary } from './si-local';
import type { HelpbotSource, HelpbotTurn } from './helpbot-contract';

export interface SummaryRequest {
  topicId: string;
  topicTitle: string;
  scenarioLabel: string;
  scenarioNotes: string;
  topRows: Array<{
    name: string;
    summary: string;
    reasons: string[];
    sources: SourceLink[];
  }>;
}

export async function requestSummary(payload: SummaryRequest): Promise<string> {
  return buildLocalSummary(payload);
}

export async function requestHelpbot(message: string, history: HelpbotTurn[], signal: AbortSignal): Promise<{
  content: string;
  localHtml: boolean;
  sources?: HelpbotSource[];
  notice?: string;
}> {
  const fallback = (notice: string) => ({ content: buildLocalHelpbotReply(message), localHtml: true, notice });
  try {
    const res = await fetch('/api/helpbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(13_000)]),
    });
    if (res.status === 429) return fallback('Live answers are at their usage limit. Showing local research results.');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { reply?: unknown; sources?: unknown };
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Empty reply');
    const sources = Array.isArray(data.sources) ? data.sources.filter((source): source is HelpbotSource =>
      source && typeof source.label === 'string' && typeof source.url === 'string' && /^https:\/\//i.test(source.url),
    ).slice(0, 5) : [];
    return { content: data.reply, localHtml: false, sources };
  } catch {
    return fallback('Live answers are unavailable. Showing local research results.');
  }
}
