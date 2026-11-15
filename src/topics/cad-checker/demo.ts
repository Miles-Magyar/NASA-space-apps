import { SCENARIOS, scenarioById } from '../mission-scenarios';
import type { ScenarioId } from '../mission-types';
import { mountCadChecker } from '../cabin-fire-safety/cad-checker';
import { DEMO_SCENARIOS, sampleBomJson } from './samples';

export interface CadDemoState {
  destroy: () => void;
}

/** Dedicated CAD Checker application tab with guided demos. */
export function renderCadCheckerDemo(container: HTMLElement): CadDemoState {
  let scenarioId: ScenarioId = 'lunar';
  const atmospheres = SCENARIOS.filter((s) => !s.fuelsOnly);

  container.innerHTML = `
    <article class="cad-demo-root">
      <header class="cad-demo-hero">
        <p class="eyebrow">Application demo</p>
        <h1>CAD / BOM Flammability Checker</h1>
        <p class="lede">
          Paste or load a materials-tagged bill of materials, pick a mission atmosphere, and get
          pass / review / high-concern / unknown flags grounded in the curated NASA materials library —
          LOI vs habitat O₂, softening/melt bands, oxygen-compatibility, and nearby-fuel flash/AIT.
        </p>
        <p class="cad-demo-links">
          <a href="#viable-materials">Materials temperature table</a>
          ·
          <a href="#cabin-fire-safety">Cabin fire evidence</a>
          ·
          <a href="/sample-bom-lunar-habitat.json" download>Download sample BOM JSON</a>
          ·
          <span class="muted">Plan: <code>docs/CAD_FIRE_VULNERABILITY_PLAN.md</code></span>
        </p>
      </header>

      <section class="cad-demo-howto">
        <h2>How the demo works</h2>
        <ol>
          <li>Pick a <strong>guided scenario</strong> below (or upload your own CSV/JSON).</li>
          <li>Confirm the <strong>mission atmosphere</strong> — lunar and EMU change the flags.</li>
          <li>Press <strong>Check against atmosphere</strong> (scenarios auto-run).</li>
          <li>Read the results table, then <strong>copy/download unknowns</strong> for the next library pass.</li>
        </ol>
        <p class="schema-note">
          Schema: <code>material</code>, optional <code>mass</code>, <code>area</code>,
          <code>nearbyFuel</code>, <code>maxExpectedTempC</code>,
          <code>zone</code> (<code>cabin</code> | <code>eva-suit</code> | <code>propellant-bay</code>).
        </p>
      </section>

      <section class="cad-demo-scenarios" aria-label="Guided demo scenarios">
        <h2>Guided demos</h2>
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
      title: 'Live checker',
      lead: 'Edit the BOM JSON, upload a file, or use a guided demo above. Flags cite the materials library — SI notes stay corpus-grounded.',
      initialBom: sampleBomJson(first.parts),
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

  // Highlight first demo card without re-running (autoRun already fired).
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
