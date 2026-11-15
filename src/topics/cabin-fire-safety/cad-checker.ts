import type { ScenarioPreset } from '../mission-types';
import { findMaterial, MATERIALS_LIBRARY } from '../materials-library';
import { requestSummary } from '../../si-client';

export interface BomPart {
  material: string;
  mass?: number;
  area?: number;
  nearbyFuel?: string;
  maxExpectedTempC?: number;
  zone?: 'cabin' | 'eva-suit' | 'propellant-bay';
}

export type ConcernLevel = 'pass' | 'review' | 'high-concern' | 'unknown';

export interface CheckResult {
  part: BomPart;
  matchedMaterial?: string;
  matchedFuel?: string;
  level: ConcernLevel;
  flags: string[];
  sources: Array<{ label: string; url: string }>;
}

function parseBom(text: string): BomPart[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as BomPart[] | { parts: BomPart[] };
    return Array.isArray(parsed) ? parsed : parsed.parts;
  }
  // CSV: material,mass,area,nearbyFuel,maxExpectedTempC,zone
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const start = lines[0]?.toLowerCase().includes('material') ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [material, mass, area, nearbyFuel, maxExpectedTempC, zone] = line.split(',').map((c) => c.trim());
    return {
      material: material || '',
      mass: mass ? Number(mass) : undefined,
      area: area ? Number(area) : undefined,
      nearbyFuel: nearbyFuel || undefined,
      maxExpectedTempC: maxExpectedTempC ? Number(maxExpectedTempC) : undefined,
      zone: (zone as BomPart['zone']) || undefined,
    };
  });
}

export function checkBom(parts: BomPart[], scenario: ScenarioPreset): CheckResult[] {
  return parts.map((part) => {
    const mat = findMaterial(part.material);
    const fuel = part.nearbyFuel ? findMaterial(part.nearbyFuel) : undefined;
    const flags: string[] = [];
    let level: ConcernLevel = 'pass';
    const sources = [...(mat?.sources ?? []), ...(fuel?.sources ?? [])];

    if (!mat) {
      return {
        part,
        level: 'unknown' as const,
        flags: [`Unknown material “${part.material}” — capture for next library pass`],
        sources: [],
      };
    }

    if (mat.loiPercent) {
      if (scenario.oxygenPercent > mat.loiPercent.max) {
        flags.push(
          `Habitat O₂ ${scenario.oxygenPercent}% exceeds LOI band ${mat.loiPercent.min}–${mat.loiPercent.max}%`,
        );
        level = 'high-concern';
      } else if (scenario.oxygenPercent > mat.loiPercent.min) {
        flags.push(
          `Habitat O₂ ${scenario.oxygenPercent}% overlaps LOI band ${mat.loiPercent.min}–${mat.loiPercent.max}%`,
        );
        level = level === 'pass' ? 'review' : level;
      }
    }

    if (mat.oxygenCompatibility === 'high-concern') {
      flags.push(`Library marks ${mat.name} high-concern for oxygen-enriched service`);
      level = 'high-concern';
    } else if (mat.oxygenCompatibility === 'review' && level === 'pass') {
      flags.push(`Library marks ${mat.name} for review under ${scenario.label}`);
      level = 'review';
    }

    if (scenario.id === 'emu' && mat.oxygenCompatibility !== 'prefer') {
      flags.push('EMU 100% O₂ reference — require oxygen-compatibility qualification');
      if (level === 'pass') level = 'review';
      if (mat.oxygenCompatibility === 'high-concern') level = 'high-concern';
    }

    if (mat && part.maxExpectedTempC != null) {
      const soft = mat.softeningC?.value ?? mat.softeningC?.min ?? mat.glassTransitionC?.value ?? mat.glassTransitionC?.min;
      const melt = mat.meltingC?.value ?? mat.meltingC?.min;
      const use = mat.continuousUseC?.value ?? mat.continuousUseC?.min;
      if (use != null && part.maxExpectedTempC >= use) {
        flags.push(
          `Expected temp ${part.maxExpectedTempC}°C reaches/exceeds continuous-use band ~${use}°C for ${mat.name}`,
        );
        if (level === 'pass') level = 'review';
      }
      if (soft != null && part.maxExpectedTempC >= soft) {
        flags.push(
          `Expected temp ${part.maxExpectedTempC}°C reaches softening/Tg band ~${soft}°C for ${mat.name}`,
        );
        level = level === 'high-concern' ? level : 'review';
      }
      if (melt != null && part.maxExpectedTempC >= melt) {
        flags.push(
          `Expected temp ${part.maxExpectedTempC}°C reaches melt/flow onset ~${melt}°C for ${mat.name}`,
        );
        level = 'high-concern';
      }
      if (mat.autoignitionC != null && part.maxExpectedTempC >= mat.autoignitionC * 0.8) {
        flags.push(
          `Expected temp ${part.maxExpectedTempC}°C within 20% of ${mat.name} autoignition ${mat.autoignitionC}°C`,
        );
        if (level !== 'high-concern') level = 'review';
      }
    }

    if (fuel && part.maxExpectedTempC != null) {
      if (fuel.flashPointC != null && part.maxExpectedTempC >= fuel.flashPointC) {
        flags.push(
          `Expected temp ${part.maxExpectedTempC}°C ≥ ${fuel.name} flash point ${fuel.flashPointC}°C`,
        );
        level = 'high-concern';
      }
      if (fuel.autoignitionC != null && part.maxExpectedTempC >= fuel.autoignitionC * 0.8) {
        flags.push(
          `Expected temp ${part.maxExpectedTempC}°C within 20% of ${fuel.name} autoignition ${fuel.autoignitionC}°C`,
        );
        if (level !== 'high-concern') level = 'review';
      }
    }

    if (part.zone === 'propellant-bay') {
      flags.push('Propellant-bay zone: cabin LOI ranking may not apply; use propulsion caveats');
      if (level === 'pass') level = 'review';
    }

    if (!flags.length) flags.push('No LOI/temperature mismatch against curated library for this atmosphere');

    return {
      part,
      matchedMaterial: mat.name,
      matchedFuel: fuel?.name,
      level,
      flags,
      sources,
    };
  });
}

export interface UnknownMaterialCapture {
  material: string;
  zone?: BomPart['zone'];
  nearbyFuel?: string;
  firstSeenAt: string;
  scenarioLabel: string;
}

export function mountCadChecker(
  host: HTMLElement,
  getScenario: () => ScenarioPreset,
): { destroy: () => void } {
  /** Session list of unknown materials for the next materials-library pass. */
  const unknownSession: UnknownMaterialCapture[] = [];

  host.innerHTML = `
    <div class="cad-checker">
      <h2>CAD / BOM flammability checker</h2>
      <p>Upload a CSV/JSON BOM with <code>material</code>, optional <code>nearbyFuel</code>, <code>maxExpectedTempC</code>, and <code>zone</code> (cabin | eva-suit | propellant-bay). Maps to the curated materials library — not a SolidWorks kernel.</p>
      <div class="cad-actions">
        <input type="file" accept=".csv,.json,text/csv,application/json" class="cad-file" />
        <button type="button" class="btn cad-sample">Load sample BOM</button>
        <button type="button" class="btn cad-run">Check against atmosphere</button>
      </div>
      <textarea class="cad-input" rows="8" spellcheck="false" placeholder='[{"material":"PMMA","nearbyFuel":"n-heptane","maxExpectedTempC":50,"zone":"cabin"}]'></textarea>
      <div class="cad-results" aria-live="polite"></div>
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
  const results = host.querySelector<HTMLElement>('.cad-results')!;
  const si = host.querySelector<HTMLElement>('.cad-si')!;
  const file = host.querySelector<HTMLInputElement>('.cad-file')!;
  const unknownList = host.querySelector<HTMLElement>('.cad-unknown-list')!;
  const copyBtn = host.querySelector<HTMLButtonElement>('.cad-copy-unknowns')!;
  const downloadBtn = host.querySelector<HTMLButtonElement>('.cad-download-unknowns')!;
  const clearBtn = host.querySelector<HTMLButtonElement>('.cad-clear-unknowns')!;

  const unknownsPayload = () =>
    JSON.stringify(
      {
        purpose: 'Flame in Freefall materials-library feedback',
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
          `<li><strong>${u.material}</strong>${u.zone ? ` · zone ${u.zone}` : ''}${
            u.nearbyFuel ? ` · near ${u.nearbyFuel}` : ''
          } <span class="muted">(${u.scenarioLabel})</span></li>`,
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

  const sample = () => {
    input.value = JSON.stringify(
      [
        { material: 'PMMA', nearbyFuel: 'n-heptane', maxExpectedTempC: 60, zone: 'cabin' },
        { material: 'Nomex', zone: 'cabin' },
        { material: 'Stainless steel', zone: 'cabin' },
        { material: 'mystery-foam', zone: 'cabin' },
        { material: 'ABS', nearbyFuel: 'methanol', maxExpectedTempC: 20, zone: 'cabin' },
        { material: 'PTFE', zone: 'eva-suit' },
      ],
      null,
      2,
    );
  };

  const run = async () => {
    let parts: BomPart[] = [];
    try {
      parts = parseBom(input.value);
    } catch {
      results.innerHTML = `<p class="cad-error">Could not parse BOM. Use JSON array or CSV with a material column.</p>`;
      return;
    }
    if (!parts.length) {
      results.innerHTML = `<p class="cad-error">No parts found.</p>`;
      return;
    }
    const scenario = getScenario();
    const checked = checkBom(parts, scenario);
    captureUnknowns(checked, scenario);
    results.innerHTML = `
      <table class="cad-table">
        <thead><tr><th>Material</th><th>Match</th><th>Level</th><th>Flags</th><th>Sources</th></tr></thead>
        <tbody>
          ${checked
            .map(
              (c) => `<tr class="level-${c.level}">
                <td>${c.part.material}</td>
                <td>${c.matchedMaterial ?? '—'}${c.matchedFuel ? ` / fuel ${c.matchedFuel}` : ''}</td>
                <td>${c.level}</td>
                <td><ul>${c.flags.map((f) => `<li>${f}</li>`).join('')}</ul></td>
                <td>${c.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join('; ') || '—'}</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p class="muted">Library size: ${MATERIALS_LIBRARY.length} materials/fuels. Unknown materials are appended to the session list below for the next data pass.</p>
    `;

    const concerns = checked.filter((c) => c.level === 'high-concern' || c.level === 'review' || c.level === 'unknown');
    si.textContent = 'Generating SI note…';
    si.innerHTML = await requestSummary({
      topicId: 'cabin-fire-safety',
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
  };

  const onSample = () => sample();
  const onRun = () => void run();
  const onFile = async () => {
    const f = file.files?.[0];
    if (!f) return;
    input.value = await f.text();
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(unknownsPayload());
      copyBtn.textContent = 'Copied';
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy unknowns JSON';
      }, 1500);
    } catch {
      copyBtn.textContent = 'Copy failed';
    }
  };
  const onDownload = () => {
    const blob = new Blob([unknownsPayload()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flame-in-freefall-unknown-materials.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const onClear = () => {
    unknownSession.length = 0;
    renderUnknowns();
  };

  host.querySelector('.cad-sample')!.addEventListener('click', onSample);
  host.querySelector('.cad-run')!.addEventListener('click', onRun);
  file.addEventListener('change', onFile);
  copyBtn.addEventListener('click', () => void onCopy());
  downloadBtn.addEventListener('click', onDownload);
  clearBtn.addEventListener('click', onClear);
  sample();
  renderUnknowns();

  return {
    destroy: () => {
      host.innerHTML = '';
    },
  };
}
