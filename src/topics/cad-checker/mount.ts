import type { ScenarioPreset } from '../mission-types';
import { MATERIALS_LIBRARY_VERSION } from '../materials-library';
import { requestSummary } from '../../si-client';
import { ACCEPTED_BUILD_ACCEPT, parseBuildFile } from './parse-bom';
import { parseAdjacency } from './adjacency';
import { HEATER_CATALOG } from './heater-catalog';
import { buildReportPayload, reportToCsv, runFullCheck } from './engine';
import { escapeHtml } from './escape';
import type { AdjacencyEdge, BomPart, CheckResult, UnknownMaterialCapture } from './types';
import { sampleBomJson } from './samples';
import { importCadText, importCadUpload, NATIVE_CAD_ACCEPT, isNativeCadFileName } from './importers/registry';
import { adjacencyToCsv } from './importers/step-assembly';
import { renderImportedPartsPreview } from './assembly-tree';
import { mountPartPreview, type PartPreviewHandle } from './part-preview';
import { parseGlbFile } from './glb';
import type { CadImportResult } from './importers/types';

export interface CadCheckerOptions {
  title?: string;
  lead?: string;
  initialBom?: string;
  initialAdjacency?: string;
  autoRun?: boolean;
  hideDefaultSample?: boolean;
  topicId?: string;
  onResults?: (results: CheckResult[], scenario: ScenarioPreset) => void;
}

export interface CadCheckerHandle {
  destroy: () => void;
  run: () => Promise<void>;
  setBom: (text: string) => void;
  setAdjacency: (text: string) => void;
  setCadImport: (
    imported: CadImportResult,
    fileName: string,
    opts?: { gltfText?: string; glbBuffer?: ArrayBuffer },
  ) => void;
}

export function mountCadChecker(
  host: HTMLElement,
  getScenario: () => ScenarioPreset,
  options: CadCheckerOptions = {},
): CadCheckerHandle {
  const unknownSession: UnknownMaterialCapture[] = [];
  let lastResults: CheckResult[] = [];
  let lastCheckedBom: BomPart[] = [];
  let runId = 0;
  let lastFormat = 'json';
  let lastEdges: AdjacencyEdge[] = [];
  let lastFileName: string | undefined;
  /** Cached result from native CAD upload (especially proprietary binaries). */
  let lastCadImport: CadImportResult | null = null;
  let lastGltfText: string | undefined;
  let lastGlbBuffer: ArrayBuffer | undefined;
  let meshPreview: PartPreviewHandle | null = null;

  const title = options.title ?? 'CAD / BOM flammability checker';
  const lead =
    options.lead ??
    'Upload a BOM or CAD file (<code>DXF</code>, <code>STEP</code>, <code>glTF</code>/<code>GLB</code> with preview; <code>DWG</code> via convert). Proprietary CAD is detected with an export path. Maps to the curated materials library.';

  host.innerHTML = `
    <div class="cad-checker">
      <h2>${escapeHtml(title)}</h2>
      <p>${lead}</p>
      <p class="cad-disclaimer" role="note">
        Use these results for preliminary screening. Flight qualification requires separate testing under the applicable standards.
        Results depend on the material grade and test method. Open the sources next to each flag for the original conditions.
      </p>
      <ol class="cad-flow" aria-label="Checker workflow">
        <li>Upload or paste a build / CAD file</li>
        <li>Review the imported tree / mesh preview</li>
        <li>Confirm atmosphere, then check</li>
      </ol>
      <div class="cad-panel cad-panel-inputs">
        <h3 class="cad-panel-title">Inputs</h3>
        <div class="cad-actions">
          <label class="cad-file-label">Build / CAD / BOM file
            <input type="file" accept="${ACCEPTED_BUILD_ACCEPT},${NATIVE_CAD_ACCEPT}" class="cad-file" />
          </label>
          <a class="btn" href="/samples/iss-avionics-panel-sample.dwg" download>Download sample DWG</a>
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
      </div>
      <div class="cad-panel cad-panel-preview">
        <h3 class="cad-panel-title">Import preview</h3>
        <div class="cad-import-preview-host" aria-live="polite"></div>
      </div>
      <div class="cad-panel cad-panel-results">
        <h3 class="cad-panel-title">Flammability results</h3>
        <div class="cad-results" aria-live="polite"></div>
        <div class="cad-actions cad-export-actions">
          <button type="button" class="btn cad-export-bom" disabled>Download Flame BOM JSON</button>
          <button type="button" class="btn cad-export-json" disabled>Download results JSON</button>
          <button type="button" class="btn cad-export-csv" disabled>Download results CSV</button>
        </div>
        <div class="cad-si"></div>
      </div>
      <section class="cad-unknowns cad-panel">
        <h3 class="cad-panel-title">Unlisted materials</h3>
        <p class="muted">Materials without a match in this app’s library appear here. Export the list as JSON to share with the project team.</p>
        <ul class="cad-unknown-list"></ul>
        <div class="cad-actions">
          <button type="button" class="btn cad-copy-unknowns" disabled>Copy list</button>
          <button type="button" class="btn cad-download-unknowns" disabled>Download list (JSON)</button>
          <button type="button" class="btn cad-clear-unknowns" disabled>Clear list</button>
        </div>
      </section>
    </div>
  `;

  const input = host.querySelector<HTMLTextAreaElement>('.cad-input')!;
  const adjInput = host.querySelector<HTMLTextAreaElement>('.cad-adjacency')!;
  const results = host.querySelector<HTMLElement>('.cad-results')!;
  const previewHost = host.querySelector<HTMLElement>('.cad-import-preview-host')!;
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
  const exportBomBtn = host.querySelector<HTMLButtonElement>('.cad-export-bom')!;

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

  const applyImportAdjacency = (imported: CadImportResult) => {
    if (imported.adjacency?.length) {
      adjInput.value = adjacencyToCsv(imported.adjacency);
    }
  };

  const showPartsPreview = (
    parts: BomPart[],
    meta?: { format?: string; fileName?: string; gltfText?: string; glbBuffer?: ArrayBuffer },
  ) => {
    meshPreview?.destroy();
    meshPreview = null;
    previewHost.innerHTML =
      renderImportedPartsPreview(parts, meta) + `<div class="cad-mesh-preview-host"></div>`;
    const meshHost = previewHost.querySelector<HTMLElement>('.cad-mesh-preview-host');
    if (meshHost && parts.length) {
      void mountPartPreview(meshHost, {
        parts,
        gltfText: meta?.gltfText ?? lastGltfText,
        glbBuffer: meta?.glbBuffer ?? lastGlbBuffer,
        fileName: meta?.fileName,
      }).then((handle) => {
        if (host.contains(meshHost)) meshPreview = handle;
        else handle.destroy();
      }).catch(() => {
        if (host.contains(meshHost)) meshHost.textContent = 'The 3D preview could not load. The part list and flammability results are still available.';
      });
    }
  };

  const resolveImport = (): CadImportResult => {
    const lower = lastFileName?.toLowerCase() ?? '';
    if (lastCadImport) return lastCadImport;
    if (/^\s*0\s*\r?\nSECTION/im.test(input.value) || lower.endsWith('.dxf')) {
      return importCadText(input.value, lastFileName ?? 'paste.dxf');
    }
    if (/^\s*ISO-10303/im.test(input.value) || lower.endsWith('.step') || lower.endsWith('.stp')) {
      return importCadText(input.value, lastFileName ?? 'paste.step');
    }
    const parsed = parseBuildFile(input.value, lastFileName);
    return {
      format: parsed.format,
      nativeCad: parsed.format === 'step',
      parts: parsed.parts,
      issues: parsed.issues,
      adjacency: parsed.adjacency,
    };
  };

  const run = async () => {
    const currentRun = ++runId;
    const scenario = getScenario();
    const imported = resolveImport();
    lastFormat = imported.format;
    renderIssues(imported.issues);

    if (!imported.parts.length) {
      lastResults = [];
      lastCheckedBom = [];
      showPartsPreview([], { format: imported.format, fileName: lastFileName });
      options.onResults?.([], scenario);
      si.replaceChildren();
      const conv = imported.conversion
        ? `<p class="muted">Recommended export: ${imported.conversion.preferredExports.map(escapeHtml).join(', ')}. ${escapeHtml(imported.conversion.recommend)}</p>`
        : '';
      results.innerHTML = `<p class="cad-error">No parts found. Fix parse issues above or try another build/CAD file type.</p>${conv}`;
      exportJsonBtn.disabled = true;
      exportCsvBtn.disabled = true;
      exportBomBtn.disabled = true;
      return;
    }

    let parts = imported.parts;
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
      renderIssues([...imported.issues, ...adj.issues]);
    }
    lastEdges = adj.edges;

    const checked = runFullCheck(parts, scenario, lastEdges);
    lastResults = checked;
    lastCheckedBom = imported.parts;
    captureUnknowns(checked, scenario);
    exportJsonBtn.disabled = false;
    exportCsvBtn.disabled = false;
    exportBomBtn.disabled = false;

    showPartsPreview(parts, { format: imported.format, fileName: lastFileName });

    const nativeNote = imported.nativeCad ? ' · native CAD import' : '';
    results.innerHTML = `
      <p class="muted">Detected format: <strong>${escapeHtml(imported.format)}</strong>${nativeNote} · ${checked.length} ${checked.length === 1 ? 'part' : 'parts'}</p>
      <div class="table-wrap" role="region" aria-label="Flammability check results" tabindex="0">
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
      </div>
    `;
    options.onResults?.(checked, scenario);

    const concerns = checked.filter(
      (c) => c.level === 'high-concern' || c.level === 'review' || c.level === 'unknown',
    );
    si.textContent = 'Generating a Super Intelligence summary…';
    const summary = await requestSummary({
      topicId: options.topicId ?? 'cad-checker',
      topicTitle: 'BOM flammability check',
      scenarioLabel: scenario.label,
      scenarioNotes: scenario.notes,
      topRows: concerns.slice(0, 5).map((c) => ({
        name: c.part.material,
        summary: c.flags.join('; '),
        reasons: [c.level],
        sources: c.sources,
      })),
    });
    if (currentRun === runId) si.innerHTML = summary;
  };

  host.querySelector('.cad-sample')?.addEventListener('click', () => {
    lastFileName = undefined;
    lastCadImport = null;
    lastGltfText = undefined;
    lastGlbBuffer = undefined;
    defaultSample();
  });
  host.querySelector('.cad-run')!.addEventListener('click', () => void run());

  input.addEventListener('input', () => {
    if (!lastCadImport) return;
    lastCadImport = null;
    lastFileName = undefined;
    lastGltfText = undefined;
    lastGlbBuffer = undefined;
  });

  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    lastFileName = f.name;
    lastCadImport = null;
    lastGltfText = undefined;
    lastGlbBuffer = undefined;
    if (f.name.toLowerCase().endsWith('.glb')) {
      const buffer = await f.arrayBuffer();
      lastGlbBuffer = buffer;
      const parsed = parseGlbFile(buffer, f.name);
      lastCadImport = {
        format: 'glb',
        nativeCad: true,
        parts: parsed.parts,
        issues: parsed.issues,
      };
      input.value = JSON.stringify(parsed.parts, null, 2);
      void run();
      return;
    }
    if (isNativeCadFileName(f.name) || /\.(step|stp)$/i.test(f.name)) {
      const imported = await importCadUpload(f);
      lastCadImport = imported;
      // Preview extracted parts (or empty) as JSON so Check can run / user can edit
      input.value = JSON.stringify(imported.parts, null, 2);
      applyImportAdjacency(imported);
      void run();
      return;
    }
    input.value = await f.text();
    if (f.name.toLowerCase().endsWith('.gltf')) {
      lastGltfText = input.value;
    }
    const parsed = parseBuildFile(input.value, f.name);
    if (parsed.adjacency?.length) {
      adjInput.value = adjacencyToCsv(parsed.adjacency);
    }
    void run();
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
  exportBomBtn.addEventListener('click', () => {
    downloadText('flame-in-freefall.bom.json', sampleBomJson(lastCheckedBom), 'application/json');
  });

  defaultSample();
  renderUnknowns();
  if (options.autoRun) void run();

  return {
    destroy: () => {
      runId++;
      meshPreview?.destroy();
      meshPreview = null;
      host.innerHTML = '';
    },
    run,
    setBom: (text: string) => {
      lastFileName = undefined;
      lastCadImport = null;
      lastGltfText = undefined;
      lastGlbBuffer = undefined;
      input.value = text;
    },
    setCadImport: (
      imported: CadImportResult,
      fileName: string,
      opts?: { gltfText?: string; glbBuffer?: ArrayBuffer },
    ) => {
      lastFileName = fileName;
      lastCadImport = imported;
      lastGltfText = opts?.gltfText;
      lastGlbBuffer = opts?.glbBuffer;
      input.value = JSON.stringify(imported.parts, null, 2);
      applyImportAdjacency(imported);
    },
    setAdjacency: (text: string) => {
      adjInput.value = text;
    },
  };
}
