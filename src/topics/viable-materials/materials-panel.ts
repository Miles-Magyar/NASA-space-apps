import {
  cadMaterialsLibrary,
  formatTempBand,
  type MaterialLibraryEntry,
} from '../materials-library';

function sourcesHtml(m: MaterialLibraryEntry): string {
  return m.sources
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
    .join('; ');
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Temperature-degradation + flammability compilation for the Viable Materials topic. */
export function renderMaterialsCompilation(host: HTMLElement): void {
  const rows = cadMaterialsLibrary();
  host.innerHTML = `
    <section class="materials-compilation">
      <header>
        <p class="eyebrow">CAD materials compilation</p>
        <h2>Temperature degradation &amp; flammability</h2>
        <p class="fuels-data-lede">
          Handbook-order thermal landmarks (Tg / softening, melt, decomposition, continuous use) paired with
          LOI / oxygen-compatibility notes from NASA BASS, textile O₂ charts, White Sands enriched-oxygen ignition
          studies, and oxygen-compatibility guidance. Values are method- and grade-dependent — open the citations
          before design decisions.
        </p>
      </header>
      <div class="table-wrap comprehensive-table">
        <table class="evidence-table materials-temp-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Category</th>
              <th>CAD use</th>
              <th>Tg / glass</th>
              <th>Softening / HDT</th>
              <th>Melting</th>
              <th>Decomposition / char</th>
              <th>Continuous use</th>
              <th>LOI</th>
              <th>Flash / AIT</th>
              <th>O₂ compatibility</th>
              <th>Flammability</th>
              <th>Temp. degradation</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((m) => {
                const loi = m.loiPercent
                  ? `${m.loiPercent.min}–${m.loiPercent.max}%`
                  : '—';
                const flashAit = [
                  m.flashPointC != null ? `flash ${m.flashPointC}°C` : null,
                  m.autoignitionC != null ? `AIT ${m.autoignitionC}°C` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—';
                return `<tr data-category="${m.category}">
                  <td class="col-name">${escape(m.name)}</td>
                  <td>${escape(m.category)}</td>
                  <td class="col-summary">${escape(m.cadUse)}</td>
                  <td>${escape(formatTempBand(m.glassTransitionC))}</td>
                  <td>${escape(formatTempBand(m.softeningC))}</td>
                  <td>${escape(formatTempBand(m.meltingC))}</td>
                  <td>${escape(formatTempBand(m.decompositionC))}</td>
                  <td>${escape(formatTempBand(m.continuousUseC))}</td>
                  <td>${escape(loi)}</td>
                  <td>${escape(flashAit)}</td>
                  <td class="o2-${m.oxygenCompatibility}">${escape(m.oxygenCompatibility)}</td>
                  <td class="col-note">${escape(m.flammabilityNotes)}</td>
                  <td class="col-note">${escape(m.temperatureDegradationNotes)}</td>
                  <td class="sources-cell">${sourcesHtml(m)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="table-footnote">
        Polymers often soften or drip before they “melt” like metals. Oxygen-service ignition (impact / adiabatic
        compression) can dominate LOI for seals and metals — see NASA oxygen-compatibility citations.
      </p>
    </section>
  `;
}

/** Early planning surface for CAD fire-vulnerability analysis (Viable Materials). */
export function renderCadVulnerabilityPlan(host: HTMLElement): void {
  host.innerHTML = `
    <section class="cad-plan-panel">
      <header>
        <p class="eyebrow">Planning</p>
        <h2>Analyzing CAD designs for fire vulnerabilities</h2>
        <p class="fuels-data-lede">
          MVP today accepts BOM CSV/JSON on Cabin Fire Safety. The path below is the planned analysis pipeline
          from tagged CAD assemblies to atmosphere-aware vulnerability findings — without claiming a SolidWorks kernel.
        </p>
      </header>
      <ol class="cad-plan-steps">
        <li>
          <strong>Export a materials-tagged BOM</strong> —
          Each part needs <code>material</code>, optional <code>mass</code>/<code>area</code>,
          <code>maxExpectedTempC</code>, <code>nearbyFuel</code>, and <code>zone</code>
          (<em>(cabin | eva-suit | propellant-bay)</em>. Prefer STEP/glTF material tags later; BOM is the hackathon path.
        </li>
        <li>
          <strong>Map to the curated library</strong> —
          Resolve aliases (e.g. Lexan→PC, Teflon→PTFE). Unknowns enter the session export for the next
          <code>materials-library.ts</code> pass.
        </li>
        <li>
          <strong>Apply zone-specific rules</strong> —
          Cabin: LOI vs habitat O₂ + heater proximity vs softening/melt.
          EVA suit: 100% O₂ / 4.3 psi oxygen-compatibility (impact/compression), not cabin LOI alone.
          Propellant bay: flash/AIT and leak envelopes with PSI cabin caveats.
        </li>
        <li>
          <strong>Temperature-degradation screen</strong> —
          Flag parts where <code>maxExpectedTempC</code> approaches continuous-use, softening, melt, or AIT bands
          from the compilation table above (reliable NASA / ASTM-linked sources).
        </li>
        <li>
          <strong>Geometry / adjacency heuristics (next)</strong> —
          Cluster heat sources (avionics, heaters, batteries) within a clearance radius of high-concern plastics;
          note ceiling vs duct paths for SAME-informed detection placement.
        </li>
        <li>
          <strong>Rank &amp; explain</strong> —
          Emit pass / review / high-concern with citations; SI summary may interpret flags but cannot invent uncited numbers.
        </li>
      </ol>
      <div class="cad-plan-grid">
        <article class="record-card">
          <h3>Vulnerability classes to detect</h3>
          <ul>
            <li>LOI below selected habitat O₂ (PMMA/ABS/PE under lunar mixes)</li>
            <li>Softening/melt near documented heat sources</li>
            <li>Melt-drip plastics above soft barriers (NASA-STD-6001 debris concern)</li>
            <li>O₂-wetted Buna-N / commodity elastomers</li>
            <li>Unknown materials with no library row</li>
            <li>Fuel flash/AIT within expected local temperature</li>
          </ul>
        </article>
        <article class="record-card">
          <h3>Reliable study anchors</h3>
          <ul>
            <li><a href="https://ntrs.nasa.gov/citations/20210011385" target="_blank" rel="noopener">BASS-II solids</a></li>
            <li><a href="https://ntrs.nasa.gov/citations/20170008880" target="_blank" rel="noopener">Textile O₂ flammability chart</a></li>
            <li><a href="https://ntrs.nasa.gov/citations/20090001157" target="_blank" rel="noopener">Enriched-O₂ AIT / impact (WSTF)</a></li>
            <li><a href="https://ntrs.nasa.gov/citations/20070016582" target="_blank" rel="noopener">Oxygen compatibility</a></li>
            <li><a href="https://ntrs.nasa.gov/citations/19780065784" target="_blank" rel="noopener">Thermoplastics thermochemistry</a></li>
            <li><a href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-98" target="_blank" rel="noopener">Saffire length-scale</a></li>
          </ul>
        </article>
        <article class="record-card">
          <h3>Near-term build order</h3>
          <ul>
            <li>Done: library temps + multi-format BOM checker + unknown export</li>
            <li>Done: heater catalog presets + adjacency CSV/JSON flags</li>
            <li>Done: JSON/CSV/TSV/NDJSON/XML/glTF/STEP intake + cited report export</li>
            <li>Later: richer glTF/STEP geometry clearance; CAD plugin remains out of scope</li>
          </ul>
        </article>
      </div>
      <p class="table-footnote">
        Full write-up: <a href="./SUBMISSION.md">SUBMISSION.md</a> demo path and
        <code>docs/CAD_FIRE_VULNERABILITY_PLAN.md</code> in the repo.
      </p>
    </section>
  `;
}
