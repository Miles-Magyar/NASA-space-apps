import type { MetricValue, MissionRow } from '../mission-types';

export type PlotMetric = 'flashPointC' | 'autoignitionC' | 'oxygenFractionPercent' | 'pressurePsia' | 'loiOrLocPercent';

export const PLOT_DEFS: { key: PlotMetric; title: string; unitHint: string }[] = [
  { key: 'flashPointC', title: 'Flash point', unitHint: '°C' },
  { key: 'autoignitionC', title: 'Autoignition', unitHint: '°C' },
  { key: 'oxygenFractionPercent', title: 'Test / reference oxygen', unitHint: '% O₂' },
  { key: 'pressurePsia', title: 'Test / reference pressure', unitHint: 'psia' },
  { key: 'loiOrLocPercent', title: 'Published LOI / LOC', unitHint: '% O₂' },
];

interface PlotPoint {
  row: MissionRow;
  metric: MetricValue;
  mid: number;
  isRange: boolean;
}

function midOf(m: MetricValue): number | null {
  if (m.value != null) return m.value;
  if (m.min != null && m.max != null) return (m.min + m.max) / 2;
  if (m.min != null) return m.min;
  if (m.max != null) return m.max;
  return null;
}

function pointsFor(rows: MissionRow[], key: PlotMetric): PlotPoint[] {
  const out: PlotPoint[] = [];
  for (const row of rows) {
    const metric = row[key];
    if (!metric) continue;
    const mid = midOf(metric);
    if (mid == null) continue;
    out.push({
      row,
      metric,
      mid,
      isRange: metric.min != null && metric.max != null && metric.value == null,
    });
  }
  return out.sort((a, b) => a.mid - b.mid);
}

function formatMetric(m: MetricValue): string {
  if (m.value != null) return `${m.value} ${m.unit}`;
  if (m.min != null && m.max != null) return `${m.min}–${m.max} ${m.unit}`;
  if (m.min != null) return `≥ ${m.min} ${m.unit}`;
  if (m.max != null) return `≤ ${m.max} ${m.unit}`;
  return '—';
}

export function renderPlots(container: HTMLElement, rows: MissionRow[]): void {
  container.innerHTML = '';
  container.className = 'plots-grid';

  for (const def of PLOT_DEFS) {
    const card = document.createElement('section');
    card.className = 'plot-card';
    card.innerHTML = `<h3>${def.title}</h3>`;
    const pts = pointsFor(rows, def.key);

    if (!pts.length) {
      const empty = document.createElement('p');
      empty.className = 'plot-empty';
      empty.textContent = 'No reported values for the current selection.';
      card.appendChild(empty);
      container.appendChild(card);
      continue;
    }

    const min = Math.min(...pts.map((p) => p.metric.min ?? p.mid));
    const max = Math.max(...pts.map((p) => p.metric.max ?? p.mid));
    const span = Math.max(max - min, 1e-6);

    const list = document.createElement('ul');
    list.className = 'plot-list';
    list.setAttribute('role', 'list');

    for (const pt of pts) {
      const li = document.createElement('li');
      li.className = 'plot-row';
      li.tabIndex = 0;
      const left = ((pt.metric.min ?? pt.mid) - min) / span;
      const right = ((pt.metric.max ?? pt.mid) - min) / span;
      const isPmma = pt.row.id === 'pmma' && def.key === 'loiOrLocPercent';
      li.innerHTML = `
        <span class="plot-label">${pt.row.name}</span>
        <span class="plot-track" aria-hidden="true">
          <span class="plot-mark ${pt.isRange ? 'is-range' : 'is-dot'} ${isPmma ? 'is-pmma' : ''}"
            style="left:${(left * 100).toFixed(2)}%;width:${pt.isRange ? ((right - left) * 100).toFixed(2) : 0}%"></span>
        </span>
        <span class="plot-value">${formatMetric(pt.metric)}</span>
      `;
      const tip = [formatMetric(pt.metric), pt.metric.note, pt.row.summary].filter(Boolean).join(' — ');
      li.title = tip;
      li.setAttribute('aria-label', `${pt.row.name}: ${tip}`);
      list.appendChild(li);
    }

    card.appendChild(list);
    container.appendChild(card);
  }
}
