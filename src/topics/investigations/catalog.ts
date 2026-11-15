import { INVESTIGATIONS } from '../evidence/registry';
import type { StudyCard } from '../mission-types';

/** Stable display order for the Investigations catalog. */
export const CATALOG_ORDER = [
  'flex',
  'bass',
  'saffire',
  'same',
  'acme',
  'sofie',
  'spice',
  'slice',
  'fm2',
] as const;

export function catalogInvestigations(): StudyCard[] {
  return CATALOG_ORDER.map((id) => INVESTIGATIONS[id]).filter(Boolean);
}

export function renderInvestigationsCatalog(container: HTMLElement): void {
  const cards = catalogInvestigations();
  container.innerHTML = `
    <header class="topic-header">
      <p class="eyebrow">Study topic</p>
      <h1>Investigations</h1>
      <p class="lede">
        First-class cards for the headline NASA microgravity combustion campaigns cited across this dashboard.
        Each card lists what was measured, the key finding, an open question, and PSI/NTRS links — the same shared registry used by topic pages and Cabin Fire Safety.
      </p>
    </header>
    <section class="investigations-catalog">
      <div class="study-grid catalog-grid">
        ${cards
          .map(
            (s) => `<article class="study-card catalog-card" id="study-${s.id}">
              <h2>${s.title}</h2>
              <p class="study-facility">${s.facility ?? s.investigation}</p>
              <p><strong>What was measured:</strong> ${s.summary}</p>
              <p><strong>Key finding:</strong> ${s.keyFinding}</p>
              ${s.openQuestion ? `<p><strong>Open question:</strong> ${s.openQuestion}</p>` : ''}
              <p class="catalog-tags">${s.tags.map((t) => `<span>${t}</span>`).join('')}</p>
              <p class="sources-cell">${s.sources
                .map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${x.label}</a>`)
                .join(' · ')}</p>
            </article>`,
          )
          .join('')}
      </div>
    </section>
  `;
}
