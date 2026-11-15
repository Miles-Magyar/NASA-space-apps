import type { SummaryRequest } from './si-client';
import { searchCorpus } from './search';
import { INVESTIGATIONS } from './topics/evidence/registry';

function linkifySources(sources: Array<{ label: string; url: string }>): string {
  return sources
    .slice(0, 4)
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
    .join(' · ');
}

/** Corpus-grounded summary used when Gemini API is unreachable. */
export function buildLocalSummary(payload: SummaryRequest): string {
  if (!payload.topRows.length) {
    return `<p>No ranked rows for <strong>${payload.scenarioLabel}</strong>. Adjust filters or atmosphere.</p>
<p class="si-caveat">Moon/Mars transfer: partial-g data remain sparse in PSI — treat µg and 1-g as bounds.</p>`;
  }
  const items = payload.topRows
    .map(
      (r, i) => `<li><strong>${i + 1}. ${r.name}</strong> — ${r.summary}
        <br/><em>${r.reasons[0] ?? ''}</em>
        <br/>${linkifySources(r.sources)}</li>`,
    )
    .join('');
  return `<p>For <strong>${payload.topicTitle}</strong> under <strong>${payload.scenarioLabel}</strong>, the highest-ranked curated evidence is:</p>
<ol>${items}</ol>
<p>${payload.scenarioNotes}</p>
<p class="si-caveat">Local SI fallback (API offline). Citations only from the curated corpus — not a validated quantitative risk score. When gravity/O₂/pressure differ from the cited test, transfer carefully.</p>`;
}

export function buildLocalHelpbotReply(message: string): string {
  const hits = searchCorpus(message, 5);
  const lower = message.toLowerCase();

  // Prefer direct investigation hits
  for (const inv of Object.values(INVESTIGATIONS)) {
    if (
      lower.includes(inv.id) ||
      lower.includes(inv.investigation.toLowerCase().split(' ')[0]!) ||
      inv.tags.some((t) => lower.includes(t.toLowerCase()))
    ) {
      const src = inv.sources[0];
      return `From the curated corpus: <strong>${inv.title}</strong> — ${inv.keyFinding} ${
        src ? `See <a href="${src.url}" target="_blank" rel="noopener">${src.label}</a>.` : ''
      } Open related topics via search (e.g. Saffire → Spacecraft, Nomex → Materials/Fuels). (Local SI fallback — Gemini API unreachable.)`;
    }
  }

  if (!hits.length) {
    return 'Sorry, we are having trouble communicating with our helpbot servers right now! Try keywords like Saffire, FLEX, Nomex, EMU, or SAME — or browse Cabin Fire Safety.';
  }

  const top = hits[0]!;
  const extras = hits
    .slice(0, 3)
    .map((h) => `• <a href="${h.href}">${h.title}</a> (${h.kind})`)
    .join('<br/>');
  return `I found curated fire-safety evidence for “${message.trim()}”.<br/>
<strong>${top.title}</strong>: ${top.snippet}<br/>
${extras}<br/>
<span class="si-caveat">Local SI fallback grounded in the on-page corpus (Gemini API unreachable). Answers refuse speculation beyond these sources.</span>`;
}
