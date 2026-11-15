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

type SortKey = 'name' | 'group' | 'flash' | 'ait' | 'o2' | 'pressure' | 'loi';

function metricNum(row: MissionRow, key: SortKey): number {
  if (key === 'group') return 0;
  const m =
    key === 'flash'
      ? row.flashPointC
      : key === 'ait'
        ? row.autoignitionC
        : key === 'o2'
          ? row.oxygenFractionPercent
          : key === 'pressure'
            ? row.pressurePsia
            : key === 'loi'
              ? row.loiOrLocPercent
              : undefined;
  if (!m) return Number.POSITIVE_INFINITY;
  return m.value ?? m.min ?? m.max ?? Number.POSITIVE_INFINITY;
}

function fmtMetric(m: MetricValue | undefined): string {
  if (!m) return '—';
  if (m.value != null) return `${m.value} ${m.unit}`;
  if (m.min != null && m.max != null) return `${m.min}–${m.max} ${m.unit}`;
  if (m.min != null) return `≥ ${m.min} ${m.unit}`;
  if (m.max != null) return `≤ ${m.max} ${m.unit}`;
  return '—';
}

function metricNote(m: MetricValue | undefined): string {
  if (!m?.note) return '—';
  return m.note;
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
  let scenarioId: ScenarioId = data.showEarthScenario ? 'earth' : 'iss';
  let filter = '';
  let groupFilter: string = 'all';
  let sortKey: SortKey = 'name';
  let sortAsc = true;
  let rankingSort: RankingSortMode = 'triage';
  const isFuels = data.topicId === 'fuels';

  container.innerHTML = `
    <header class="topic-header">
      <p class="eyebrow">Study topic</p>
      <h1>${data.title}</h1>
      <p class="lede">${data.intro}</p>
    </header>
    <section class="si-panel" aria-live="polite">
      <div class="si-panel-head">
        <h2>SI summary</h2>
        <button type="button" class="btn si-refresh">Summarize for atmosphere</button>
      </div>
      <p class="si-body">Select an atmosphere and click summarize. Answers are grounded in this topic’s curated rows and citations.</p>
    </section>
    <section class="mission-controls">
      <label>Atmosphere
        <select class="scenario-select"></select>
      </label>
      <label>Filter rows
        <input type="search" class="row-filter" placeholder="Name, tag, investigation…" />
      </label>
      <label>Group
        <select class="group-filter">
          <option value="all">All groups</option>
          <option value="cabin">Cabin / surrogate</option>
          <option value="materials">Materials</option>
          <option value="propulsion">Propulsion reference</option>
          <option value="detection">Detection</option>
          <option value="suppression">Suppression</option>
          <option value="systems">Systems</option>
        </select>
      </label>
      <p class="scenario-notes"></p>
    </section>
    <section class="safety-fit-panel" aria-live="polite">
      <p class="eyebrow">Heuristic suggestion</p>
      <h2>Best fit for safety regulations</h2>
      <div class="safety-fit-body"></div>
    </section>
    <section class="ranking-panel">
      <div class="ranking-head">
        <h2>Evidence triage ranking</h2>
        <label class="ranking-sort-label">Sort by
          <select class="ranking-sort">
            <option value="triage">Overall triage</option>
            <option value="evidence">Evidence strength</option>
            <option value="atmosphere">Atmosphere relevance</option>
            <option value="category">Material category</option>
          </select>
        </label>
      </div>
      <p class="ranking-disclaimer"></p>
      <ol class="ranking-list"></ol>
    </section>
    <section class="fuels-data-panel">
      <header class="fuels-data-head">
        <h2>${isFuels ? 'Comprehensive fuels data' : 'Evidence data table'}</h2>
        <p class="fuels-data-lede">
          ${
            isFuels
              ? 'Full curated matrix for every cabin/surrogate and propulsion-reference entry. Read flash point, autoignition, test oxygen and pressure, LOI/LOC, method notes, and sources yourself — values stay tied to their test conditions.'
              : 'Curated evidence rows for this topic. Compare measurements against the selected atmosphere and open the cited sources.'
          }
        </p>
      </header>
      <div class="table-wrap ${data.sharpPanels ? 'sharp fuels-table' : ''} comprehensive-table">
        <table class="evidence-table comprehensive-fuels-table">
          <thead>
            <tr>
              <th data-sort="group">Group</th>
              <th data-sort="name">Name</th>
              <th>Evidence</th>
              <th class="col-summary">Summary</th>
              <th data-sort="flash">Flash point</th>
              <th>Flash note</th>
              <th data-sort="ait">Autoignition</th>
              <th>AIT note</th>
              <th data-sort="o2">Test / ref O₂</th>
              <th>O₂ note</th>
              <th data-sort="pressure">Test / ref pressure</th>
              <th>Pressure note</th>
              <th data-sort="loi">LOI / LOC</th>
              <th>LOI / LOC note</th>
              <th>Scenario comparison</th>
              <th>Investigations</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="table-footnote">Unreported or inapplicable figures appear as an em dash (—). Droplet LOI, gas-vessel LOC, and solid-material oxygen limits are not interchangeable.</p>
    </section>
    <section class="plots-host" hidden></section>
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
          const ranking = container.querySelector('.ranking-panel');
          ranking?.after(wrap);
          return { tableHost, planHost };
        })()
      : null;

  const cadHost =
    data.topicId === 'cabin-fire-safety'
      ? (() => {
          const el = document.createElement('section');
          el.className = 'cad-host';
          container.appendChild(el);
          return el;
        })()
      : null;

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
        const av = metricNum(a, sortKey);
        const bv = metricNum(b, sortKey);
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
        <p class="safety-fit-meta">${escapeHtml(groupLabel(fit.row.group))} · ${escapeHtml(fit.row.evidenceType)} · heuristic fit ${fit.score}</p>
        <p>${escapeHtml(fit.row.summary)}</p>
        <p><strong>Against ${escapeHtml(scenario.label)}:</strong> ${escapeHtml(scenario.oxygenPercent + '% O₂, ' + scenario.pressurePsia + ' psia, ' + scenario.gravityLabel)}</p>
        <p><strong>Published LOI / LOC:</strong> ${escapeHtml(fmtMetric(band))}</p>
        <ul class="safety-fit-reasons">
          ${fit.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
        <p class="sources-cell">${sourcesHtml(fit.row)}</p>
        <p class="si-caveat">Suggestion only for triage against oxygen-limit style screening. Confirm specimen, flow, pressure, and program standards before design decisions. Read the full table below for every fuel and material record.</p>
      </article>
    `;
  }

  function render() {
    const scenario = scenarioById(scenarioId)!;
    container.querySelector('.scenario-notes')!.textContent = scenario.notes;
    container.querySelector('.ranking-disclaimer')!.textContent = rankingDisclaimer();

    const rows = visibleRows();
    renderSafetyFit(rows, scenarioId);

    const tbody = container.querySelector('tbody')!;
    tbody.innerHTML = rows
      .map((r) => {
        const note = r.scenarioNotes[scenarioId] ?? '—';
        const investigations = r.investigationIds?.join(', ') || '—';
        return `<tr data-group="${r.group}">
          <td>${escapeHtml(groupLabel(r.group))}</td>
          <td class="col-name">${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.evidenceType)}</td>
          <td class="col-summary">${escapeHtml(r.summary)}</td>
          <td>${escapeHtml(fmtMetric(r.flashPointC))}</td>
          <td class="col-note">${escapeHtml(metricNote(r.flashPointC))}</td>
          <td>${escapeHtml(fmtMetric(r.autoignitionC))}</td>
          <td class="col-note">${escapeHtml(metricNote(r.autoignitionC))}</td>
          <td>${escapeHtml(fmtMetric(r.oxygenFractionPercent))}</td>
          <td class="col-note">${escapeHtml(metricNote(r.oxygenFractionPercent))}</td>
          <td>${escapeHtml(fmtMetric(r.pressurePsia))}</td>
          <td class="col-note">${escapeHtml(metricNote(r.pressurePsia))}</td>
          <td>${escapeHtml(fmtMetric(r.loiOrLocPercent))}</td>
          <td class="col-note">${escapeHtml(metricNote(r.loiOrLocPercent))}</td>
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
            ? `evidence ${r.evidenceStrength}`
            : rankingSort === 'atmosphere'
              ? `atmosphere ${r.atmosphereRelevance}`
              : rankingSort === 'category'
                ? `category ${r.materialCategory}`
                : `triage ${r.score}`;
        return `<li>
          <strong>${i + 1}. ${escapeHtml(r.row.name)}</strong>
          <span class="rank-score">${sortLabel}</span>
          <ul>${r.reasons.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
        </li>`;
      })
      .join('');

    if (isFuels) {
      renderPlots(plotsHost, rows);
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

  const onScenario = () => {
    scenarioId = scenarioSelect.value as ScenarioId;
    render();
  };
  scenarioSelect.addEventListener('change', onScenario);
  destroyFns.push(() => scenarioSelect.removeEventListener('change', onScenario));

  const filterInput = container.querySelector<HTMLInputElement>('.row-filter')!;
  const onFilter = () => {
    filter = filterInput.value;
    render();
  };
  filterInput.addEventListener('input', onFilter);
  destroyFns.push(() => filterInput.removeEventListener('input', onFilter));

  const groupSelect = container.querySelector<HTMLSelectElement>('.group-filter')!;
  const onGroup = () => {
    groupFilter = groupSelect.value;
    render();
  };
  groupSelect.addEventListener('change', onGroup);
  destroyFns.push(() => groupSelect.removeEventListener('change', onGroup));

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

  const siBtn = container.querySelector<HTMLButtonElement>('.si-refresh')!;
  const siBody = container.querySelector<HTMLElement>('.si-body')!;
  const onSi = async () => {
    siBtn.disabled = true;
    siBody.textContent = 'Summarizing…';
    const scenario = scenarioById(scenarioId)!;
    const rows = visibleRows();
    const fit = bestSafetyRegulationFit(rows, scenario);
    const ranked = rankRows(rows, scenario).slice(0, 5);
    const topRows = [
      ...(fit
        ? [
            {
              name: `Safety-regulation fit: ${fit.row.name}`,
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
    siBody.innerHTML = text;
    siBtn.disabled = false;
  };
  siBtn.addEventListener('click', onSi);
  destroyFns.push(() => siBtn.removeEventListener('click', onSi));

  render();

  if (materialsHost) {
    import('./viable-materials/materials-panel').then(({ renderMaterialsCompilation, renderCadVulnerabilityPlan }) => {
      renderMaterialsCompilation(materialsHost.tableHost);
      renderCadVulnerabilityPlan(materialsHost.planHost);
    });
  }

  if (cadHost) {
    import('./cabin-fire-safety/cad-checker').then(({ mountCadChecker }) => {
      const handle = mountCadChecker(cadHost, () => scenarioById(scenarioId)!);
      destroyFns.push(() => handle.destroy());
    });
  }

  return {
    destroy: () => destroyFns.forEach((fn) => fn()),
  };
}
