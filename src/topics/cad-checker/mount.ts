import type { ScenarioPreset } from '../mission-types';
import { MATERIALS_LIBRARY, MATERIALS_LIBRARY_VERSION } from '../materials-library';
import { requestSummary } from '../../si-client';
import { ACCEPTED_BUILD_ACCEPT, parseBuildFile } from './parse-bom';
import { parseAdjacency } from './adjacency';
import { HEATER_CATALOG } from './heater-catalog';
import { buildReportPayload, reportToCsv, runFullCheck } from './engine';
import { escapeHtml } from './escape';
import type { AdjacencyEdge, CheckResult, UnknownMaterialCapture } from './types';
import { sampleBomJson } from './samples';

export interface CadCheckerOptions {
  title?: string;
  lead?: string;
  initialBom?: string;
  initialAdjacency?: string;
  autoRun?: boolean;
  hideDefaultSample?: boolean;
  topicId?: string;
}

export interface CadCheckerHandle {
  destroy: () => void;
  run: () => Promise<void>;
  setBom: (text: string) => void;
  setAdjacency: (text: string) => void;
}

export function mountCadChecker(
  host: HTMLElement,
  getScenario: () => ScenarioPreset,
  options: CadCheckerOptions = {},
): CadCheckerHandle {
  const unknownSession: UnknownMaterialCapture[] = [];
  let lastResults: CheckResult[] = [];
  let lastFormat = 'json';
  let lastEdges: AdjacencyEdge[] = [];
  let lastFileName: string | undefined;

  const title = options.title ?? 'CAD / BOM flammability checker';
  const lead =
    options.lead ??
    'Upload build/BOM files (<code>JSON</code>, <code>CSV</code>, <code>TSV</code>, <code>NDJSON</code>, <code>XML</code>, <code>glTF</code>, <code>STEP</code>) or paste text. Optional adjacency CSV flags plastics near heat sources. Maps to the curated materials library — not a SolidWorks kernel.';

  host.innerHTML = `
    <div class="cad-checker">
      <h2>${escapeHtml(title)}</h2>
      <p>${lead}</p>
      <p class="cad-disclaimer" role="note">
        Triage aid only — not NASA-STD-6001 certification or oxygen-system flight qualification.
        Library <code>${MATERIALS_LIBRARY_VERSION}</code> bands are method-/grade-dependent; open citations before design decisions.
        SI interprets flagged rows and must not invent uncited LOI/temps.
      </p>
      <div class="cad-actions">
        <label class="cad-file-label">Build / BOM file
          <input type="file" accept="${ACCEPTED_BUILD_ACCEPT}" class="cad-file" />
        </label>
        <label class="cad-file-label">Adjacency file
          <input type="file" accept=".csv,.tsv,.json,text/csv,application/json" class="cad-adj-file" />
        </label>
        ${
          options.hideDefaultSample
            ? ''
            : '<button type="button" class="btn cad-sample">Load sample BOM</button>'
        }
        <label class="cad-heater-label">Apply heater preset to all rows
          <select class="cad-heater-select">
            <option value="">— none —</option>
            ${HEATER_CATALOG.map(
              (h) =>
                `<option value="${h.id}">${escapeHtml(h.label)} (~${h.typicalSurfaceTempC}°C)</option>`,
            ).join('')}
          </select>
        </label>
        <button type="button" class="btn cad-run">Check against atmosphere</button>
      </div>
      <div class="cad-editors">
        <label class="cad-editor-label">BOM / build text
          <textarea class="cad-input" rows="10" spellcheck="false" placeholder='[{"material":"PMMA","maxExpectedTempC":50,"zone":"cabin"}]'></textarea>
        </label>
        <label class="cad-editor-label">Adjacency (optional)
          <textarea class="cad-adjacency" rows="10" spellcheck="false" placeholder="partA,partB,clearanceMm,relation&#10;avionics,PMMA,25,near-heat"></textarea>
        </label>
      </div>
      <div class="cad-parse-issues" aria-live="polite"></div>
      <div class="cad-results" aria-live="polite"></div>
      <div class="cad-actions cad-export-actions">
        <button type="button" class="btn cad-export-json" disabled>Download results JSON</button>
        <button type="button" class="btn cad-export-csv" disabled>Download results CSV</button>
      </div>
      <section class="cad-unknowns">
        <h3>Unknown materials (session)</h3>
        <p class="muted">Captured misses for the next <code>materials-library.ts</code> data pass. Nothing is uploaded — copy or download JSON locally.</p>
        <ul class="cad-unknown-list"></ul>
        <div class="cad-actions">
          <button type="button" class="btn cad-copy-unknowns" disabled>Copy unknowns JSON</button>
          <button type="button" class="btn cad-download-unknowns" disabled>Download unknowns JSON</button>
          <button type="button" class="btn cad-clear-unknowns" disabled>Clear session list</button>
        </div>
      </section>
      <div class="cad-si"></div>
    </div>
  `;

  const input = host.querySelector<HTMLTextAreaElement>('.cad-input')!;
  const adjInput = host.querySelector<HTMLTextAreaElement>('.cad-adjacency')!;
  const results = host.querySelector<HTMLElement>('.cad-results')!;
  const issuesEl = host.querySelector<HTMLElement>('.cad-parse-issues')!;
  const si = host.querySelector<HTMLElement>('.cad-si')!;
  const file = host.querySelector<HTMLInputElement>('.cad-file')!;
  const adjFile = host.querySelector<HTMLInputElement>('.cad-adj-file')!;
  const heaterSelect = host.querySelector<HTMLSelectElement>('.cad-heater-select')!;
  const unknownList = host.querySelector<HTMLElement>('.cad-unknown-list')!;
  const copyBtn = host.querySelector<HTMLButtonElement>('.cad-copy-unknowns')!;
  const downloadBtn = host.querySelector<HTMLButtonElement>('.cad-download-unknowns')!;
  const clearBtn = host.querySelector<HTMLButtonElement>('.cad-clear-unknowns')!;
  const exportJsonBtn = host.querySelector<HTMLButtonElement>('.cad-export-json')!;
  const exportCsvBtn = host.querySelector<HTMLButtonElement>('.cad-export-csv')!;

  const unknownsPayload = () =>
    JSON.stringify(
      {
        purpose: 'Flame in Freefall materials-library feedback',
        materialsLibraryVersion: MATERIALS_LIBRARY_VERSION,
        capturedAt: new Date().toISOString(),
        unknowns: unknownSession,
      },
      null,
      2,
    );

  const renderUnknowns = () => {
    const has = unknownSession.length > 0;
    copyBtn.disabled = !has;
    downloadBtn.disabled = !has;
    clearBtn.disabled = !has;
    if (!has) {
      unknownList.innerHTML = `<li class="muted">No unknown materials captured yet this session.</li>`;
      return;
    }
    unknownList.innerHTML = unknownSession
      .map(
        (u) =>
          `<li><strong>${escapeHtml(u.material)}</strong>${u.zone ? ` · zone ${escapeHtml(u.zone)}` : ''}${
            u.nearbyFuel ? ` · near ${escapeHtml(u.nearbyFuel)}` : ''
          } <span class="muted">(${escapeHtml(u.scenarioLabel)})</span></li>`,
      )
      .join('');
  };

  const captureUnknowns = (checked: CheckResult[], scenario: ScenarioPreset) => {
    for (const c of checked) {
      if (c.level !== 'unknown') continue;
      const key = c.part.material.trim().toLowerCase();
      if (!key) continue;
      if (unknownSession.some((u) => u.material.toLowerCase() === key)) continue;
      unknownSession.push({
        material: c.part.material.trim(),
        zone: c.part.zone,
        nearbyFuel: c.part.nearbyFuel,
        firstSeenAt: new Date().toISOString(),
        scenarioLabel: scenario.label,
      });
    }
    renderUnknowns();
  };

  const renderIssues = (issues: { severity: string; message: string; row?: number }[]) => {
    if (!issues.length) {
      issuesEl.innerHTML = '';
      return;
    }
    issuesEl.innerHTML = `<ul class="cad-issue-list">${issues
      .map(
        (i) =>
          `<li class="cad-issue-${i.severity}">${escapeHtml(i.severity)}${
            i.row != null ? ` · row ${i.row}` : ''
          }: ${escapeHtml(i.message)}</li>`,
      )
      .join('')}</ul>`;
  };

  const defaultSample = () => {
    input.value =
      options.initialBom ??
      sampleBomJson([
        { material: 'PMMA', nearbyFuel: 'n-heptane', maxExpectedTempC: 60, zone: 'cabin', heaterId: 'avionics-bay' },
        { material: 'Nomex', zone: 'cabin' },
        { material: 'Stainless steel', zone: 'cabin' },
        { material: 'mystery-foam', zone: 'cabin' },
        { material: 'ABS', nearbyFuel: 'methanol', maxExpectedTempC: 20, zone: 'cabin' },
        { material: 'PTFE', zone: 'eva-suit' },
      ]);
    adjInput.value =
      options.initialAdjacency ??
      `partA,partB,clearanceMm,relation
avionics-bay,PMMA,30,near-heat`;
  };

  const downloadText = (filename: string, body: string, type: string) => {
    const blob = new Blob([body], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = async () => {
    const parsed = parseBuildFile(input.value, lastFileName);
    lastFormat = parsed.format;
    renderIssues(parsed.issues);

    if (!parsed.parts.length) {
      results.innerHTML = `<p class="cad-error">No parts found. Fix parse issues above or try another build file type.</p>`;
      exportJsonBtn.disabled = true;
      exportCsvBtn.disabled = true;
      return;
    }

    let parts = parsed.parts;
    const heaterId = heaterSelect.value;
    if (heaterId) {
      parts = parts.map((p) => ({
        ...p,
        heaterId: p.heaterId ?? heaterId,
        maxExpectedTempC: p.maxExpectedTempC,
      }));
    }

    const adj = parseAdjacency(adjInput.value);
    if (adj.issues.length) {
      renderIssues([...parsed.issues, ...adj.issues]);
    }
    lastEdges = adj.edges;

    const scenario = getScenario();
    const checked = runFullCheck(parts, scenario, lastEdges);
    lastResults = checked;
    captureUnknowns(checked, scenario);
    exportJsonBtn.disabled = false;
    exportCsvBtn.disabled = false;

    results.innerHTML = `
      <p class="muted">Detected format: <strong>${escapeHtml(parsed.format)}</strong> · ${checked.length} parts · library ${MATERIALS_LIBRARY_VERSION}</p>
      <table class="cad-table">
        <caption class="sr-only">Flammability check results for ${escapeHtml(scenario.label)}</caption>
        <thead><tr><th>Material</th><th>Match</th><th>Level</th><th>Flags</th><th>Sources</th></tr></thead>
        <tbody>
          ${checked
            .map(
              (c) => `<tr class="level-${c.level}">
                <td>${escapeHtml(c.part.material)}${c.part.id ? ` <span class="muted">(${escapeHtml(c.part.id)})</span>` : ''}</td>
                <td>${escapeHtml(c.matchedMaterial ?? '—')}${c.matchedFuel ? ` / fuel ${escapeHtml(c.matchedFuel)}` : ''}</td>
                <td>${escapeHtml(c.level)}</td>
                <td><ul>${c.flags.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></td>
                <td>${
                  c.sources
                    .map(
                      (s) =>
                        `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`,
                    )
                    .join('; ') || '—'
                }</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p class="muted">Library size: ${MATERIALS_LIBRARY.length} materials/fuels (v${MATERIALS_LIBRARY_VERSION} — handbook-order bands; not ASTM certification). Unknown materials append to the session list below.</p>
    `;

    const concerns = checked.filter(
      (c) => c.level === 'high-concern' || c.level === 'review' || c.level === 'unknown',
    );
    si.textContent = 'Generating SI note…';
    si.innerHTML = await requestSummary({
      topicId: options.topicId ?? 'cad-checker',
      topicTitle: 'BOM flammability check',
      scenarioLabel: scenario.label,
      scenarioNotes: `${scenario.notes} Library ${MATERIALS_LIBRARY_VERSION}. Interpret flags only; do not invent LOI or temperatures.`,
      topRows: concerns.slice(0, 5).map((c) => ({
        name: c.part.material,
        summary: c.flags.join('; '),
        reasons: [c.level],
        sources: c.sources,
      })),
    });
  };

  host.querySelector('.cad-sample')?.addEventListener('click', () => {
    lastFileName = undefined;
    defaultSample();
  });
  host.querySelector('.cad-run')!.addEventListener('click', () => void run());

  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    lastFileName = f.name;
    if (f.name.toLowerCase().endsWith('.glb')) {
      input.value = '';
      renderIssues([
        {
          severity: 'error',
          message: 'Binary .glb is not supported — use .gltf JSON or export a materials-tagged BOM.',
        },
      ]);
      return;
    }
    input.value = await f.text();
  });

  adjFile.addEventListener('change', async () => {
    const f = adjFile.files?.[0];
    if (!f) return;
    adjInput.value = await f.text();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(unknownsPayload());
      copyBtn.textContent = 'Copied';
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy unknowns JSON';
      }, 1500);
    } catch {
      copyBtn.textContent = 'Copy failed';
    }
  });
  downloadBtn.addEventListener('click', () => {
    downloadText('flame-in-freefall-unknown-materials.json', unknownsPayload(), 'application/json');
  });
  clearBtn.addEventListener('click', () => {
    unknownSession.length = 0;
    renderUnknowns();
  });
  exportJsonBtn.addEventListener('click', () => {
    const payload = buildReportPayload(lastResults, getScenario(), {
      format: lastFormat,
      adjacencyCount: lastEdges.length,
    });
    downloadText('flame-in-freefall-cad-report.json', JSON.stringify(payload, null, 2), 'application/json');
  });
  exportCsvBtn.addEventListener('click', () => {
    downloadText('flame-in-freefall-cad-report.csv', reportToCsv(lastResults), 'text/csv');
  });

  defaultSample();
  renderUnknowns();
  if (options.autoRun) void run();

  return {
    destroy: () => {
      host.innerHTML = '';
    },
    run,
    setBom: (text: string) => {
      lastFileName = undefined;
      input.value = text;
    },
    setAdjacency: (text: string) => {
      adjInput.value = text;
    },
  };
}
