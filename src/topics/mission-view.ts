import type { MetricValue, MissionDataset, MissionRow, ScenarioId } from './mission-types';
import { SCENARIOS, scenarioById } from './mission-scenarios';
import { renderPlots } from './fuels/plots';
import {
  bestSafetyRegulationFit,
  rankRows,
  rankingDisclaimer,
  type RankingSortMode,
} from '../ranking';
import { requestSummary } from '../si-client';

const METRIC_COLUMNS = [
  { field: 'flashPointC', label: 'Flash point' },
  { field: 'autoignitionC', label: 'Autoignition' },
  { field: 'oxygenFractionPercent', label: 'Test / ref O₂' },
  { field: 'pressurePsia', label: 'Test / ref pressure' },
  { field: 'loiOrLocPercent', label: 'LOI / LOC' },
] as const;

type MetricField = (typeof METRIC_COLUMNS)[number]['field'];
type SortKey = 'name' | 'group' | MetricField;

const EVIDENCE_LABELS: Record<MissionRow['evidenceType'], string> = {
  'cabin-surrogate': 'Cabin fuel or surrogate',
  'solid-material': 'Solid material',
  'propulsion-reference': 'Propulsion reference',
  'oxygen-compatibility': 'Oxygen compatibility',
  'rover-habitat': 'Rover habitat',
  detection: 'Detection',
  suppression: 'Suppression',
  facility: 'Test facility',
  atmosphere: 'Atmosphere',
  cryogenic: 'Cryogenic storage',
};

function metricNum(m: MetricValue | undefined): number | undefined {
  return m?.value ?? m?.min ?? m?.max;
}

function fmtMetric(m: MetricValue | undefined): string {
  if (!m) return '—';
  if (m.value != null) return `${m.value} ${m.unit}`;
  if (m.min != null && m.max != null) return `${m.min}–${m.max} ${m.unit}`;
  if (m.min != null) return `≥ ${m.min} ${m.unit}`;
  if (m.max != null) return `≤ ${m.max} ${m.unit}`;
  return '—';
}

function groupLabel(group: MissionRow['group']): string {
  switch (group) {
    case 'cabin':
      return 'Cabin / surrogate';
    case 'propulsion':
      return 'Propulsion reference';
    case 'materials':
      return 'Materials';
    case 'detection':
      return 'Detection';
    case 'suppression':
      return 'Suppression';
    case 'systems':
      return 'Systems';
    default:
      return group;
  }
}

function sourcesHtml(row: MissionRow): string {
  return row.sources
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
    .join('; ');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface MissionViewState {
  destroy: () => void;
}

export function renderMissionView(container: HTMLElement, data: MissionDataset): MissionViewState {
  const destroyFns: Array<() => void> = [];
  let scenarioId: ScenarioId = data.defaultScenario ?? (data.showEarthScenario ? 'earth' : 'iss');
  let filter = '';
  let groupFilter: string = 'all';
  let sortKey: SortKey = 'name';
  let sortAsc = true;
  let rankingSort: RankingSortMode = 'triage';
  let summaryRequestId = 0;
  const isFuels = data.topicId === 'fuels';
  const groups = [...new Set(data.rows.map((row) => row.group))].sort((a, b) =>
    groupLabel(a).localeCompare(groupLabel(b)),
  );
  const columns = METRIC_COLUMNS.filter(({ field }) => isFuels || data.rows.some((row) => row[field]));

  container.innerHTML = `
    <header class="topic-header">
      <p class="eyebrow">Study topic</p>
      <h1>${data.title}</h1>
      <p class="lede">${data.intro}</p>
    </header>
    <div class="mission-controls" role="group" aria-label="Atmosphere and filters">
      <label><span id="mission-atmosphere-label">Atmosphere</span>
        <select class="scenario-select" aria-labelledby="mission-atmosphere-label"></select>
      </label>
      <label>Filter rows
        <input type="search" class="row-filter" placeholder="Name, tag, or group" />
      </label>
      <label><span id="mission-group-label">Group</span>
        <select class="group-filter" aria-labelledby="mission-group-label">
          <option value="all">All groups</option>
          ${groups.map((group) => `<option value="${group}">${groupLabel(group)}</option>`).join('')}
        </select>
      </label>
      <p class="scenario-notes"></p>
    </div>
    <section class="safety-fit-panel" aria-labelledby="evidence-match-title">
      <div class="safety-fit-head">
        <h2 id="evidence-match-title">Top match in the evidence</h2>
        <button type="button" class="btn si-refresh" aria-controls="si-summary">Generate Super Intelligence summary</button>
      </div>
      <div class="safety-fit-body" aria-live="polite"></div>
      <div id="si-summary" class="si-body" role="status" hidden></div>
    </section>
    <section class="fuels-data-panel">
      <header class="fuels-data-head">
        <h2 id="mission-evidence-title">${isFuels ? 'Comprehensive fuels data' : 'Evidence data table'}</h2>
        <p class="fuels-data-lede">
          ${
            isFuels
              ? 'Compare cabin and propulsion entries with their published test conditions and sources.'
              : 'Compare measurements against the selected atmosphere and open the cited sources.'
          }
        </p>
      </header>
      <p class="evidence-empty" role="status" hidden>No records match these filters. <button type="button" class="btn clear-evidence-filters">Clear filters</button></p>
      <div class="table-wrap comprehensive-table${isFuels ? ' fuels-table' : ''}" role="region" aria-labelledby="mission-evidence-title" tabindex="0">
        <table class="evidence-table comprehensive-fuels-table">
          <thead>
            <tr>
              <th scope="col" class="col-name" data-sort="name">Name</th>
              <th scope="col" data-sort="group">Group</th>
              <th>Evidence</th>
              <th class="col-summary">Summary</th>
              ${columns.map(({ field, label }) => `<th scope="col" data-sort="${field}">${label}</th>`).join('')}
              <th>Scenario comparison</th>
              <th>Investigations</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="table-footnote">Dashes indicate values that the source did not report or that do not apply.${columns.some(({ field }) => field === 'loiOrLocPercent') ? ' Droplet LOI, gas-vessel LOC, and solid-material oxygen limits are not interchangeable.' : ''}</p>
    </section>
    <section class="plots-host" hidden></section>
    <section class="ranking-panel">
      <div class="ranking-head">
        <h2>Fire safety evidence ranking</h2>
        <label class="ranking-sort-label">Sort by
          <select class="ranking-sort">
            <option value="triage">Overall score</option>
            <option value="evidence">Evidence strength</option>
            <option value="atmosphere">Atmosphere relevance</option>
            <option value="category">Material category</option>
          </select>
        </label>
      </div>
      <p class="ranking-disclaimer"></p>
      <ol class="ranking-list"></ol>
    </section>
    <section class="studies-panel">
      <h2>Linked studies</h2>
      <div class="study-grid"></div>
    </section>
    <section class="records-panel">
      <h2>Evidence notes</h2>
      <div class="record-grid"></div>
    </section>
  `;

  if (data.sharpPanels) container.classList.add('fuels-theme');
  else container.classList.remove('fuels-theme');

  const scenarioSelect = container.querySelector<HTMLSelectElement>('.scenario-select')!;
  const scenarios = SCENARIOS.filter((s) => data.showEarthScenario || !s.fuelsOnly);
  scenarioSelect.innerHTML = scenarios
    .map(
      (s) =>
        `<option value="${s.id}">${s.label} (${s.oxygenPercent}% O₂, ${s.pressurePsia} psia, ${s.gravityLabel})</option>`,
    )
    .join('');
  scenarioSelect.value = scenarioId;

  const plotsHost = container.querySelector<HTMLElement>('.plots-host')!;
  if (isFuels) {
    plotsHost.hidden = false;
  }

  const materialsHost =
    data.topicId === 'viable-materials'
      ? (() => {
          const wrap = document.createElement('div');
          wrap.className = 'materials-extra';
          const tableHost = document.createElement('div');
          tableHost.className = 'materials-compilation-host';
          const planHost = document.createElement('div');
          planHost.className = 'cad-plan-host';
          wrap.append(tableHost, planHost);
          // Place compilation before the evidence table for materials-first reading.
          container.querySelector('.fuels-data-panel')?.before(wrap);
          return { tableHost, planHost };
        })()
      : null;

  if (data.topicId === 'cabin-fire-safety') {
    const el = document.createElement('section');
    el.className = 'cad-teaser';
    el.innerHTML = `
      <p class="eyebrow">Application</p>
      <h2>CAD / BOM flammability checker</h2>
      <p>
        Load a habitat, spacesuit, or rover sample. See which parts the checker flags under the selected atmosphere and download the results.
      </p>
      <p><a class="btn" href="#cad-checker">Open CAD Checker demo</a></p>
    `;
    container.appendChild(el);
  }

  function visibleRows(): MissionRow[] {
    const q = filter.trim().toLowerCase();
    return data.rows
      .filter((r) => (groupFilter === 'all' ? true : r.group === groupFilter))
      .filter((r) => {
        if (!q) return true;
        const blob = `${r.name} ${r.summary} ${r.tags.join(' ')} ${r.evidenceType} ${r.group}`.toLowerCase();
        return blob.includes(q);
      })
      .sort((a, b) => {
        if (sortKey === 'name') {
          return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        if (sortKey === 'group') {
          const cmp = groupLabel(a.group).localeCompare(groupLabel(b.group)) || a.name.localeCompare(b.name);
          return sortAsc ? cmp : -cmp;
        }
        const av = metricNum(a[sortKey]);
        const bv = metricNum(b[sortKey]);
        if (av == null || bv == null) return Number(av == null) - Number(bv == null);
        return sortAsc ? av - bv : bv - av;
      });
  }

  function renderSafetyFit(rows: MissionRow[], scenarioIdNow: ScenarioId) {
    const scenario = scenarioById(scenarioIdNow)!;
    const fit = bestSafetyRegulationFit(rows, scenario);
    const host = container.querySelector('.safety-fit-body')!;
    if (!fit) {
      host.innerHTML = `<p>No cabin/material candidates in the current filter set.</p>`;
      return;
    }
    const band = fit.row.loiOrLocPercent;
    host.innerHTML = `
      <article class="safety-fit-card">
        <p class="safety-fit-name">${escapeHtml(fit.row.name)}</p>
        <p class="safety-fit-meta">${escapeHtml(EVIDENCE_LABELS[fit.row.evidenceType])} · ${escapeHtml(scenario.label)}</p>
        <p>${escapeHtml(fit.row.scenarioNotes[scenarioIdNow] ?? fit.reasons[0] ?? '')}</p>
        <p>${escapeHtml(fit.row.summary)}</p>
        <details class="safety-fit-detail">
          <summary>Why this ranked first</summary>
          <p>Comparison score: ${fit.score} points. The ranking combines oxygen-limit evidence, source coverage, and relevance to the selected atmosphere.</p>
          <p><strong>Published LOI / LOC:</strong> ${escapeHtml(fmtMetric(band))}</p>
          <ul class="safety-fit-reasons">
            ${fit.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
          </ul>
          <p class="sources-cell">${sourcesHtml(fit.row)}</p>
          <p class="si-caveat">Use this comparison for initial oxygen-limit screening. Confirm the specimen, airflow, pressure, and applicable standards before making design decisions.</p>
        </details>
      </article>
    `;
  }

  function render() {
    const scenario = scenarioById(scenarioId)!;
    container.querySelector('.scenario-notes')!.textContent = scenario.notes;
    container.querySelector('.ranking-disclaimer')!.textContent = rankingDisclaimer();

    const rows = visibleRows();
    renderSafetyFit(rows, scenarioId);
    container.querySelector<HTMLElement>('.evidence-empty')!.hidden = rows.length > 0;
    container.querySelector<HTMLElement>('.comprehensive-table')!.hidden = rows.length === 0;
    container.querySelector<HTMLElement>('.table-footnote')!.hidden = rows.length === 0;
    container.querySelector<HTMLElement>('.ranking-panel')!.hidden = rows.length === 0;
    siBtn.disabled = rows.length === 0 || siBtn.disabled;

    const tbody = container.querySelector('tbody')!;
    tbody.innerHTML = rows
      .map((r) => {
        const note = r.scenarioNotes[scenarioId] ?? '—';
        const investigations = r.investigationIds?.join(', ') || '—';
        return `<tr id="evidence-${escapeHtml(r.id)}" tabindex="-1" data-group="${r.group}">
          <th scope="row" class="col-name">${escapeHtml(r.name)}</th>
          <td class="col-group">${escapeHtml(groupLabel(r.group))}</td>
          <td>${escapeHtml(EVIDENCE_LABELS[r.evidenceType])}</td>
          <td class="col-summary">${escapeHtml(r.summary)}</td>
          ${columns.map(({ field }) => {
            const metric = r[field];
            const value = escapeHtml(fmtMetric(metric));
            return `<td>${value}${metric?.note
              ? `<details class="measurement-note"><summary>Test note</summary><p>${escapeHtml(metric.note)}</p></details>`
              : ''}</td>`;
          }).join('')}
          <td class="col-scenario">${escapeHtml(note)}</td>
          <td>${escapeHtml(investigations)}</td>
          <td class="sources-cell">${sourcesHtml(r)}</td>
        </tr>`;
      })
      .join('');

    const ranked = rankRows(rows, scenario, rankingSort).slice(0, 8);
    container.querySelector('.ranking-list')!.innerHTML = ranked
      .map((r, i) => {
        const sortLabel =
          rankingSort === 'evidence'
            ? `${r.evidenceStrength} evidence points`
            : rankingSort === 'atmosphere'
              ? `${r.atmosphereRelevance} atmosphere points`
              : rankingSort === 'category'
                ? `${r.materialCategory} category points`
                : `${r.score} points`;
        return `<li>
          <strong>${i + 1}. ${escapeHtml(r.row.name)}</strong>
          <span class="rank-score">${sortLabel}</span>
          <ul>${r.reasons.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
        </li>`;
      })
      .join('');

    if (isFuels) {
      plotsHost.hidden = rows.length === 0;
      if (rows.length) renderPlots(plotsHost, rows);
    }

    container.querySelector('.study-grid')!.innerHTML = data.studies
      .map(
        (s) => `<article class="study-card" id="study-${s.id}">
          <h3>${escapeHtml(s.title)}</h3>
          <p class="study-facility">${escapeHtml(s.facility ?? s.investigation)}</p>
          <p>${escapeHtml(s.summary)}</p>
          <p><strong>Key finding:</strong> ${escapeHtml(s.keyFinding)}</p>
          ${s.openQuestion ? `<p><strong>Open question:</strong> ${escapeHtml(s.openQuestion)}</p>` : ''}
          <p class="sources-cell">${s.sources.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${escapeHtml(x.label)}</a>`).join(' · ')}</p>
        </article>`,
      )
      .join('');

    container.querySelector('.record-grid')!.innerHTML = data.records
      .map(
        (r) => `<article class="record-card">
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.body)}</p>
          <p class="sources-cell">${r.sources.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${escapeHtml(x.label)}</a>`).join(' · ')}</p>
        </article>`,
      )
      .join('');
  }

  const siBtn = container.querySelector<HTMLButtonElement>('.si-refresh')!;
  const siBody = container.querySelector<HTMLElement>('.si-body')!;
  const clearSummary = () => {
    summaryRequestId++;
    siBody.hidden = true;
    siBody.replaceChildren();
    siBtn.disabled = false;
  };

  const onScenario = () => {
    scenarioId = scenarioSelect.value as ScenarioId;
    clearSummary();
    render();
  };
  scenarioSelect.addEventListener('change', onScenario);
  destroyFns.push(() => scenarioSelect.removeEventListener('change', onScenario));

  const filterInput = container.querySelector<HTMLInputElement>('.row-filter')!;
  const onFilter = () => {
    filter = filterInput.value;
    clearSummary();
    render();
  };
  filterInput.addEventListener('input', onFilter);
  destroyFns.push(() => filterInput.removeEventListener('input', onFilter));

  const groupSelect = container.querySelector<HTMLSelectElement>('.group-filter')!;
  const onGroup = () => {
    groupFilter = groupSelect.value;
    clearSummary();
    render();
  };
  groupSelect.addEventListener('change', onGroup);
  destroyFns.push(() => groupSelect.removeEventListener('change', onGroup));

  const clearFilters = container.querySelector<HTMLButtonElement>('.clear-evidence-filters')!;
  const resetFilters = () => {
    filterInput.value = filter = '';
    groupSelect.value = groupFilter = 'all';
    clearSummary();
    render();
    filterInput.focus();
  };
  clearFilters.addEventListener('click', resetFilters);
  destroyFns.push(() => clearFilters.removeEventListener('click', resetFilters));

  const rankingSortSelect = container.querySelector<HTMLSelectElement>('.ranking-sort')!;
  rankingSortSelect.value = rankingSort;
  const onRankingSort = () => {
    rankingSort = rankingSortSelect.value as RankingSortMode;
    render();
  };
  rankingSortSelect.addEventListener('change', onRankingSort);
  destroyFns.push(() => rankingSortSelect.removeEventListener('change', onRankingSort));

  container.querySelectorAll<HTMLElement>('th[data-sort]').forEach((th) => {
    const handler = () => {
      const key = th.dataset.sort as SortKey;
      if (sortKey === key) sortAsc = !sortAsc;
      else {
        sortKey = key;
        sortAsc = true;
      }
      render();
    };
    th.addEventListener('click', handler);
    destroyFns.push(() => th.removeEventListener('click', handler));
  });

  const onSi = async () => {
    const requestId = ++summaryRequestId;
    siBtn.disabled = true;
    siBody.hidden = false;
    siBody.textContent = 'Summarizing…';
    const scenario = scenarioById(scenarioId)!;
    const rows = visibleRows();
    const fit = bestSafetyRegulationFit(rows, scenario);
    const ranked = rankRows(rows, scenario).slice(0, 5);
    const topRows = [
      ...(fit
        ? [
            {
              name: `Top match in the evidence: ${fit.row.name}`,
              summary: fit.row.summary,
              reasons: fit.reasons,
              sources: fit.row.sources,
            },
          ]
        : []),
      ...ranked.map((r) => ({
        name: r.row.name,
        summary: r.row.summary,
        reasons: r.reasons,
        sources: r.row.sources,
      })),
    ];
    const text = await requestSummary({
      topicId: data.topicId,
      topicTitle: data.title,
      scenarioLabel: scenario.label,
      scenarioNotes: scenario.notes,
      topRows,
    });
    if (requestId === summaryRequestId) {
      siBody.innerHTML = text;
      siBtn.disabled = false;
    }
  };
  siBtn.addEventListener('click', onSi);
  destroyFns.push(() => siBtn.removeEventListener('click', onSi));
  destroyFns.push(clearSummary);

  render();

  if (materialsHost) {
    import('./viable-materials/materials-panel').then(({ renderMaterialsCompilation, renderCadVulnerabilityPlan }) => {
      renderMaterialsCompilation(materialsHost.tableHost);
      renderCadVulnerabilityPlan(materialsHost.planHost);
    });
  }


  return {
    destroy: () => destroyFns.forEach((fn) => fn()),
  };
}
