import { SCENARIOS, scenarioById } from '../mission-scenarios';
import type { ScenarioId } from '../mission-types';
import { mountCadChecker } from './mount';
import { ALL_DEMO_SCENARIOS, sampleBomJson } from './samples';
import { ACCEPTED_BUILD_EXTENSIONS } from './parse-bom';
import { importCadText, NATIVE_CAD_EXTENSIONS } from './importers/registry';
import { escapeHtml } from './escape';
import type { CheckResult, ConcernLevel } from './types';

const RESULT_LABELS: Record<ConcernLevel, string> = {
  'high-concern': 'High concern',
  review: 'Needs review',
  unknown: 'Unknown material',
  pass: 'Pass',
};

export interface CadDemoState {
  destroy: () => void;
}

/** Dedicated CAD Checker application tab with guided demos. */
export function renderCadCheckerDemo(container: HTMLElement): CadDemoState {
  let scenarioId: ScenarioId = 'lunar';
  let demoRequestId = 0;
  const atmospheres = SCENARIOS.filter((s) => !s.fuelsOnly);
  const formats = [...ACCEPTED_BUILD_EXTENSIONS, ...NATIVE_CAD_EXTENSIONS].join(' ');

  container.innerHTML = `
    <article class="cad-demo-root">
      <header class="cad-demo-hero">
        <p class="eyebrow">Tool</p>
        <h1>CAD / BOM Flammability Checker</h1>
        <p class="lede">
          Choose a mission atmosphere and check which parts need fire-safety review.
          Start with a sample or load your own CAD file or parts list.
        </p>
      </header>

      <section class="cad-demo-scenarios" aria-label="Guided demo scenarios">
        <h2>Guided demos</h2>
        <p class="cad-demo-hint">Choose a sample to run a check with its mission atmosphere.</p>
        <div class="cad-demo-workspace">
          <div class="cad-demo-grid">
          ${ALL_DEMO_SCENARIOS.map(
            (d) => `
            <button type="button" class="cad-demo-card" data-demo="${d.id}" aria-pressed="false">
              <span class="cad-demo-card-kicker">${
                d.nativeCadUrl?.fileName.toLowerCase().endsWith('.gltf') ||
                d.nativeCadUrl?.fileName.toLowerCase().endsWith('.glb')
                  ? 'GLTF'
                  : d.nativeCad?.fileName.toLowerCase().endsWith('.step') ||
                      d.nativeCad?.fileName.toLowerCase().endsWith('.stp')
                    ? 'STEP'
                    : d.nativeCad
                      ? 'DXF'
                      : d.atmosphereId.toUpperCase()
              }</span>
              <strong>${d.title}</strong>
              <span>${d.blurb}</span>
            </button>`,
          ).join('')}
          </div>
          <section class="cad-demo-preview" aria-label="Check preview">
            <h3>Results at a glance</h3>
            <div class="cad-demo-result" role="status"></div>
            <button type="button" class="btn cad-demo-view-results" disabled>View full results</button>
            <details class="cad-demo-notice" hidden>
              <summary>What to look for in this sample</summary>
              <ul></ul>
            </details>
          </section>
        </div>
      </section>

      <section class="cad-demo-atmosphere">
        <h2>Mission atmosphere</h2>
        <label class="scenario-label">Atmosphere
          <select class="cad-demo-scenario-select">
            ${atmospheres
              .map(
                (s) =>
                  `<option value="${s.id}" ${s.id === scenarioId ? 'selected' : ''}>${s.label} (${s.oxygenPercent}% O₂, ${s.pressurePsia} psia)</option>`,
              )
              .join('')}
          </select>
        </label>
        <p class="scenario-notes"></p>
      </section>

      <div class="cad-demo-checker-host"></div>

      <details class="cad-demo-advanced">
        <summary>Formats, samples &amp; analysis plan</summary>
        <p class="schema-note">
          Accepted types: <code>${formats}</code>.
          Native CAD: <strong>DXF</strong> + <strong>STEP</strong> + <strong>glTF/GLB mesh preview</strong>. <strong>DWG→DXF</strong> via fixture/<code>/api/cad-convert</code> (optional upstream worker). SLDPRT / IPT / CATPART / PRT / … → STEP/BOM export guidance.
          Flame BOM schema: <code>id</code>, <code>material</code>, <code>parentId</code>, <code>zone</code>, <code>heaterId</code>, <code>maxExpectedTempC</code>, …
        </p>
        <p class="cad-demo-links">
          <a href="#viable-materials">Materials temperature table</a>
          ·
          <a href="#cabin-fire-safety">Cabin fire evidence</a>
          ·
          <a href="/sample-bom-lunar-habitat.json" download>Sample JSON</a>
          ·
          <a href="/samples/sample-bom.csv" download>Sample CSV</a>
          ·
          <a href="/samples/sample-habitat-cover.dxf" download>Sample DXF</a>
          ·
          <a href="/samples/sample-habitat-panel.gltf" download>Sample glTF</a>
          ·
          <a href="/samples/sample-habitat-panel.glb" download>Sample GLB</a>
        </p>
        <p class="muted">See <code>docs/CAD_NATIVE_PARTS_PLAN.md</code> and <code>docs/FLAME_BOM_EXPORT.md</code> for CAD export guidance.</p>
      </details>
    </article>
  `;

  const select = container.querySelector<HTMLSelectElement>('.cad-demo-scenario-select')!;
  const notes = container.querySelector<HTMLElement>('.scenario-notes')!;
  const notice = container.querySelector<HTMLElement>('.cad-demo-notice')!;
  const preview = container.querySelector<HTMLElement>('.cad-demo-result')!;
  const viewResults = container.querySelector<HTMLButtonElement>('.cad-demo-view-results')!;
  const checkerHost = container.querySelector<HTMLElement>('.cad-demo-checker-host')!;

  const syncNotes = () => {
    const s = scenarioById(scenarioId)!;
    notes.textContent = s.notes;
  };
  syncNotes();

  const first = ALL_DEMO_SCENARIOS[0];
  const selectDemoCard = (demo: typeof first) => {
    container.querySelectorAll<HTMLButtonElement>('.cad-demo-card').forEach((button) => {
      const active = button.dataset.demo === demo.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    notice.querySelector('ul')!.innerHTML = demo.whatToNotice.map((note) => `<li>${escapeHtml(note)}</li>`).join('');
    notice.hidden = !demo.whatToNotice.length;
  };
  selectDemoCard(first);

  const showPreview = (results: CheckResult[], atmosphere: string) => {
    viewResults.disabled = results.length === 0;
    const levels = Object.entries(RESULT_LABELS) as [ConcernLevel, string][];
    preview.innerHTML = results.length
      ? `<p><strong>${results.length} ${results.length === 1 ? 'part' : 'parts'}</strong> · ${escapeHtml(atmosphere)}</p>
        <dl class="cad-demo-counts">${levels.map(([level, label]) =>
          `<div><dt>${label}</dt><dd>${results.filter((result) => result.level === level).length}</dd></div>`,
        ).join('')}</dl>`
      : '<p>No parts could be checked. Review the file or part list below.</p>';
  };

  viewResults.addEventListener('click', () => {
    const fullResults = checkerHost.querySelector<HTMLElement>('.table-wrap');
    if (!fullResults) return;
    fullResults.scrollIntoView({ block: 'start' });
    fullResults.focus({ preventScroll: true });
  });

  const handle = mountCadChecker(
    checkerHost,
    () => scenarioById(scenarioId)!,
    {
      title: 'Live checker',
      lead: 'Edit the BOM, upload DXF/BOM/CAD files, or use a guided demo. Optional adjacency + heater presets. Flags cite the materials library.',
      initialBom: sampleBomJson(first.parts),
      initialAdjacency: first.adjacencyCsv ?? '',
      hideDefaultSample: true,
      autoRun: true,
      topicId: 'cad-checker',
      onResults: (results, scenario) => showPreview(results, scenario.label),
    },
  );

  const applyDemo = async (id: string) => {
    const demo = ALL_DEMO_SCENARIOS.find((d) => d.id === id);
    if (!demo) return;
    const requestId = ++demoRequestId;
    selectDemoCard(demo);
    preview.textContent = `Checking ${demo.title}…`;
    viewResults.disabled = true;
    scenarioId = demo.atmosphereId;
    select.value = scenarioId;
    syncNotes();
    handle.setAdjacency('');
    if (demo.nativeCadUrl) {
      try {
        const res = await fetch(demo.nativeCadUrl.url);
        if (!res.ok) throw new Error('CAD sample unavailable');
        const text = await res.text();
        if (requestId !== demoRequestId) return;
        const imported = importCadText(text, demo.nativeCadUrl.fileName);
        handle.setCadImport(imported, demo.nativeCadUrl.fileName, {
          gltfText: demo.nativeCadUrl.fileName.toLowerCase().endsWith('.gltf') ? text : undefined,
        });
      } catch {
        if (requestId !== demoRequestId) return;
        handle.setBom(sampleBomJson(demo.parts));
      }
    } else if (demo.nativeCad) {
      const imported = importCadText(demo.nativeCad.text, demo.nativeCad.fileName);
      handle.setCadImport(imported, demo.nativeCad.fileName);
    } else {
      handle.setBom(sampleBomJson(demo.parts));
    }
    if (demo.adjacencyCsv) handle.setAdjacency(demo.adjacencyCsv);
    await handle.run();
  };

  container.querySelectorAll('.cad-demo-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-demo');
      if (id) void applyDemo(id);
    });
  });

  select.addEventListener('change', () => {
    scenarioId = select.value as ScenarioId;
    syncNotes();
    void handle.run();
  });

  return {
    destroy: () => {
      demoRequestId++;
      handle.destroy();
      container.innerHTML = '';
    },
  };
}
