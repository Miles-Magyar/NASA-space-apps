import { INVESTIGATIONS } from '../evidence/registry';
import type { StudyCard } from '../mission-types';
import { RESEARCH_VISUALS, renderResearchVisual, type ResearchVisual } from '../research-visuals';

const CATALOG_VISUALS: Partial<Record<string, ResearchVisual>> = {
  acme: RESEARCH_VISUALS.combustionLab,
  fm2: RESEARCH_VISUALS.lunarGravity,
  saffire: RESEARCH_VISUALS.saffire,
};

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
        Explore the findings, methods, and source records behind NASA’s microgravity combustion experiments.
      </p>
    </header>
    <section class="investigations-catalog">
      <div class="study-grid catalog-grid">
        ${cards
          .map((s) => {
            const visual = CATALOG_VISUALS[s.id];
            return `<article class="study-card catalog-card" id="study-${s.id}">
              <h2>${s.title}</h2>
              <p class="study-facility">${s.facility ?? s.investigation}</p>
              <p><strong>Key finding</strong><br />${s.keyFinding}</p>
              ${visual ? renderResearchVisual(visual) : ''}
              <p><strong>What was measured:</strong> ${s.summary}</p>
              ${s.openQuestion ? `<p><strong>Open question:</strong> ${s.openQuestion}</p>` : ''}
              <p class="catalog-tags">${s.tags.map((t) => `<span>${t}</span>`).join('')}</p>
              <p class="sources-cell">${s.sources
                .map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${x.label}</a>`)
                .join(' · ')}</p>
            </article>`;
          })
          .join('')}
      </div>
    </section>
  `;
}
