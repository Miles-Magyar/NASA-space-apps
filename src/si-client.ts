import type { SourceLink } from './topics/mission-types';
import { buildLocalHelpbotReply, buildLocalSummary } from './si-local';

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
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { html?: string; text?: string };
    return data.html ?? data.text ?? buildLocalSummary(payload);
  } catch {
    return buildLocalSummary(payload);
  }
}

export async function requestHelpbot(message: string, history: Array<{ role: string; content: string }>) {
  try {
    const res = await fetch('/api/helpbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (!data.reply) throw new Error('empty');
    return { content: data.reply, localHtml: false };
  } catch {
    return { content: buildLocalHelpbotReply(message), localHtml: true };
  }
}
