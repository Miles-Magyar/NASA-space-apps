import type { MissionDataset, MissionRow, ScenarioId } from './mission-types';
import { SCENARIOS, scenarioById } from './mission-scenarios';
import { renderPlots } from './fuels/plots';
import { rankRows, rankingDisclaimer } from '../ranking';
import { requestSummary } from '../si-client';

type SortKey = 'name' | 'flash' | 'ait' | 'o2' | 'pressure' | 'loi';

function metricNum(row: MissionRow, key: SortKey): number {
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

function fmtMetric(
  m: { value?: number; min?: number; max?: number; unit: string } | undefined,
): string {
  if (!m) return '—';
  if (m.value != null) return `${m.value} ${m.unit}`;
  if (m.min != null && m.max != null) return `${m.min}–${m.max} ${m.unit}`;
  if (m.min != null) return `≥ ${m.min} ${m.unit}`;
  if (m.max != null) return `≤ ${m.max} ${m.unit}`;
  return '—';
}

function sourcesHtml(row: MissionRow): string {
  return row.sources
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
    .join('; ');
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
    <section class="ranking-panel">
      <h2>Evidence ranking</h2>
      <p class="ranking-disclaimer"></p>
      <ol class="ranking-list"></ol>
    </section>
    <section class="table-wrap ${data.sharpPanels ? 'sharp fuels-table' : ''}">
      <table class="evidence-table">
        <thead>
          <tr>
            <th data-sort="name">Name</th>
            <th>Evidence</th>
            <th data-sort="flash">Flash point</th>
            <th data-sort="ait">Autoignition</th>
            <th data-sort="o2">O₂ fraction</th>
            <th data-sort="pressure">Pressure</th>
            <th data-sort="loi">LOI / LOC</th>
            <th>Scenario</th>
            <th>Sources</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
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
    .map((s) => `<option value="${s.id}">${s.label} (${s.oxygenPercent}% O₂, ${s.pressurePsia} psia, ${s.gravityLabel})</option>`)
    .join('');
  scenarioSelect.value = scenarioId;

  const plotsHost = container.querySelector<HTMLElement>('.plots-host')!;
  if (data.topicId === 'fuels') {
    plotsHost.hidden = false;
  }

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
        const blob = `${r.name} ${r.summary} ${r.tags.join(' ')} ${r.evidenceType}`.toLowerCase();
        return blob.includes(q);
      })
      .sort((a, b) => {
        if (sortKey === 'name') {
          return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        const av = metricNum(a, sortKey);
        const bv = metricNum(b, sortKey);
        return sortAsc ? av - bv : bv - av;
      });
  }

  function render() {
    const scenario = scenarioById(scenarioId)!;
    container.querySelector('.scenario-notes')!.textContent = scenario.notes;
    container.querySelector('.ranking-disclaimer')!.textContent = rankingDisclaimer();

    const rows = visibleRows();
    const tbody = container.querySelector('tbody')!;
    tbody.innerHTML = rows
      .map((r) => {
        const note = r.scenarioNotes[scenarioId] ?? '—';
        return `<tr>
          <td>${r.name}</td>
          <td>${r.evidenceType}</td>
          <td>${fmtMetric(r.flashPointC)}</td>
          <td>${fmtMetric(r.autoignitionC)}</td>
          <td>${fmtMetric(r.oxygenFractionPercent)}</td>
          <td>${fmtMetric(r.pressurePsia)}</td>
          <td>${fmtMetric(r.loiOrLocPercent)}</td>
          <td>${note}</td>
          <td class="sources-cell">${sourcesHtml(r)}</td>
        </tr>`;
      })
      .join('');

    const ranked = rankRows(rows, scenario).slice(0, 8);
    container.querySelector('.ranking-list')!.innerHTML = ranked
      .map(
        (r, i) => `<li>
          <strong>${i + 1}. ${r.row.name}</strong>
          <span class="rank-score">heuristic ${r.score}</span>
          <ul>${r.reasons.map((x) => `<li>${x}</li>`).join('')}</ul>
        </li>`,
      )
      .join('');

    if (data.topicId === 'fuels') {
      renderPlots(plotsHost, rows);
    }

    container.querySelector('.study-grid')!.innerHTML = data.studies
      .map(
        (s) => `<article class="study-card" id="study-${s.id}">
          <h3>${s.title}</h3>
          <p class="study-facility">${s.facility ?? s.investigation}</p>
          <p>${s.summary}</p>
          <p><strong>Key finding:</strong> ${s.keyFinding}</p>
          ${s.openQuestion ? `<p><strong>Open question:</strong> ${s.openQuestion}</p>` : ''}
          <p class="sources-cell">${s.sources.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${x.label}</a>`).join(' · ')}</p>
        </article>`,
      )
      .join('');

    container.querySelector('.record-grid')!.innerHTML = data.records
      .map(
        (r) => `<article class="record-card">
          <h3>${r.title}</h3>
          <p>${r.body}</p>
          <p class="sources-cell">${r.sources.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${x.label}</a>`).join(' · ')}</p>
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
    const ranked = rankRows(visibleRows(), scenario).slice(0, 5);
    const text = await requestSummary({
      topicId: data.topicId,
      topicTitle: data.title,
      scenarioLabel: scenario.label,
      scenarioNotes: scenario.notes,
      topRows: ranked.map((r) => ({
        name: r.row.name,
        summary: r.row.summary,
        reasons: r.reasons,
        sources: r.row.sources,
      })),
    });
    siBody.innerHTML = text;
    siBtn.disabled = false;
  };
  siBtn.addEventListener('click', onSi);
  destroyFns.push(() => siBtn.removeEventListener('click', onSi));

  render();

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
