import { SCENARIOS, scenarioById } from '../mission-scenarios';
import type { ScenarioId } from '../mission-types';
import { mountCadChecker } from './mount';
import { DEMO_SCENARIOS, sampleBomJson } from './samples';
import { ACCEPTED_BUILD_EXTENSIONS } from './parse-bom';

export interface CadDemoState {
  destroy: () => void;
}

/** Dedicated CAD Checker application tab with guided demos. */
export function renderCadCheckerDemo(container: HTMLElement): CadDemoState {
  let scenarioId: ScenarioId = 'lunar';
  const atmospheres = SCENARIOS.filter((s) => !s.fuelsOnly);
  const formats = ACCEPTED_BUILD_EXTENSIONS.join(' ');

  container.innerHTML = `
    <article class="cad-demo-root">
      <header class="cad-demo-hero">
        <p class="eyebrow">Tool</p>
        <h1>CAD / BOM Flammability Checker</h1>
        <p class="lede">
          Load a guided demo or your own build file, pick an atmosphere, and get cited
          pass / review / high-concern / unknown flags from the NASA materials library.
        </p>
      </header>

      <section class="cad-demo-scenarios" aria-label="Guided demo scenarios">
        <h2>1 · Guided demos</h2>
        <p class="cad-demo-hint">Click a card to load parts, set the atmosphere, and run the check.</p>
        <div class="cad-demo-grid">
          ${DEMO_SCENARIOS.map(
            (d) => `
            <button type="button" class="cad-demo-card" data-demo="${d.id}">
              <span class="cad-demo-card-kicker">${d.atmosphereId.toUpperCase()}</span>
              <strong>${d.title}</strong>
              <span>${d.blurb}</span>
            </button>`,
          ).join('')}
        </div>
        <div class="cad-demo-notice" aria-live="polite"></div>
      </section>

      <section class="cad-demo-atmosphere">
        <h2>2 · Mission atmosphere</h2>
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
          Accepted build types: <code>${formats}</code> (plus NDJSON/JSONL). Binary <code>.glb</code> is not supported — use <code>.gltf</code> or a BOM export.
          Schema: <code>id</code>, <code>material</code>, <code>mass</code>, <code>area</code>,
          <code>nearbyFuel</code>, <code>maxExpectedTempC</code>, <code>zone</code>, <code>heaterId</code>.
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
          <a href="/samples/sample-bom.tsv" download>Sample TSV</a>
          ·
          <a href="/samples/sample-bom.xml" download>Sample XML</a>
          ·
          <a href="/samples/sample-materials.gltf" download>Sample glTF</a>
        </p>
        <p class="muted">Engineering triage aid — see the CAD vulnerability plan in the repo docs for the analysis pipeline.</p>
      </details>
    </article>
  `;

  const select = container.querySelector<HTMLSelectElement>('.cad-demo-scenario-select')!;
  const notes = container.querySelector<HTMLElement>('.scenario-notes')!;
  const notice = container.querySelector<HTMLElement>('.cad-demo-notice')!;
  const checkerHost = container.querySelector<HTMLElement>('.cad-demo-checker-host')!;

  const syncNotes = () => {
    const s = scenarioById(scenarioId)!;
    notes.textContent = s.notes;
  };
  syncNotes();

  const first = DEMO_SCENARIOS[0];
  const handle = mountCadChecker(
    checkerHost,
    () => scenarioById(scenarioId)!,
    {
      title: '3 · Live checker',
      lead: 'Edit the BOM, upload a file, or use a guided demo. Optional adjacency + heater presets. Flags cite the materials library.',
      initialBom: sampleBomJson(first.parts),
      initialAdjacency: first.adjacencyCsv ?? '',
      hideDefaultSample: true,
      autoRun: true,
      topicId: 'cad-checker',
    },
  );

  const applyDemo = (id: string) => {
    const demo = DEMO_SCENARIOS.find((d) => d.id === id);
    if (!demo) return;
    scenarioId = demo.atmosphereId;
    select.value = scenarioId;
    syncNotes();
    handle.setBom(sampleBomJson(demo.parts));
    handle.setAdjacency(demo.adjacencyCsv ?? '');
    notice.innerHTML = `
      <p class="cad-demo-loaded"><strong>Loaded:</strong> ${demo.title}</p>
      <ul>${demo.whatToNotice.map((n) => `<li>${n}</li>`).join('')}</ul>
    `;
    void handle.run().then(() => {
      checkerHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    container.querySelectorAll('.cad-demo-card').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-demo') === id);
    });
  };

  container.querySelectorAll('.cad-demo-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-demo');
      if (id) applyDemo(id);
    });
  });

  select.addEventListener('change', () => {
    scenarioId = select.value as ScenarioId;
    syncNotes();
    void handle.run();
  });

  container.querySelector(`.cad-demo-card[data-demo="${first.id}"]`)?.classList.add('is-active');
  notice.innerHTML = `
    <p class="cad-demo-loaded"><strong>Loaded:</strong> ${first.title}</p>
    <ul>${first.whatToNotice.map((n) => `<li>${n}</li>`).join('')}</ul>
  `;

  return {
    destroy: () => {
      handle.destroy();
      container.innerHTML = '';
    },
  };
}
