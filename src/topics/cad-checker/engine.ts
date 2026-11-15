import type { ScenarioPreset } from '../mission-types';
import {
  findMaterial,
  MATERIALS_LIBRARY_UPDATED_AT,
  MATERIALS_LIBRARY_VERSION,
} from '../materials-library';
import { applyHeaterPresets } from './heater-catalog';
import { applyAdjacencyFlags } from './adjacency';
import type { AdjacencyEdge, BomPart, CheckResult, ConcernLevel } from './types';

export function checkBom(parts: BomPart[], scenario: ScenarioPreset): CheckResult[] {
  const withHeaters = applyHeaterPresets(parts);

  return withHeaters.map((part) => {
    const mat = findMaterial(part.material);
    const fuel = part.nearbyFuel ? findMaterial(part.nearbyFuel) : undefined;
    const flags: string[] = [];
    let level: ConcernLevel = 'pass';
    const sources = [...(mat?.sources ?? []), ...(fuel?.sources ?? [])];

    if (part.heaterId && part.maxExpectedTempC != null) {
      flags.push(`Heater preset applied → expected temp ${part.maxExpectedTempC}°C (${part.heaterId})`);
    }

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

    if (part.maxExpectedTempC != null) {
      const soft =
        mat.softeningC?.value ?? mat.softeningC?.min ?? mat.glassTransitionC?.value ?? mat.glassTransitionC?.min;
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

export function runFullCheck(
  parts: BomPart[],
  scenario: ScenarioPreset,
  edges: AdjacencyEdge[] = [],
): CheckResult[] {
  return applyAdjacencyFlags(checkBom(parts, scenario), edges);
}

export function buildReportPayload(
  results: CheckResult[],
  scenario: ScenarioPreset,
  meta: { format?: string; adjacencyCount?: number } = {},
) {
  return {
    purpose: 'Flame in Freefall CAD/BOM flammability triage report',
    disclaimer:
      'Engineering triage aid only — not NASA-STD-6001 certification or oxygen-system flight qualification.',
    generatedAt: new Date().toISOString(),
    materialsLibraryVersion: MATERIALS_LIBRARY_VERSION,
    materialsLibraryUpdatedAt: MATERIALS_LIBRARY_UPDATED_AT,
    atmosphere: {
      id: scenario.id,
      label: scenario.label,
      oxygenPercent: scenario.oxygenPercent,
      pressurePsia: scenario.pressurePsia,
      gravityLabel: scenario.gravityLabel,
    },
    inputFormat: meta.format,
    adjacencyEdges: meta.adjacencyCount ?? 0,
    results: results.map((r) => ({
      id: r.part.id,
      material: r.part.material,
      matchedMaterial: r.matchedMaterial,
      matchedFuel: r.matchedFuel,
      mass: r.part.mass,
      area: r.part.area,
      zone: r.part.zone,
      heaterId: r.part.heaterId,
      maxExpectedTempC: r.part.maxExpectedTempC,
      level: r.level,
      flags: r.flags,
      sources: r.sources,
    })),
  };
}

export function reportToCsv(results: CheckResult[]): string {
  const header = ['id', 'material', 'matched', 'level', 'zone', 'mass', 'area', 'tempC', 'heaterId', 'flags', 'sources'];
  const rows = results.map((r) =>
    [
      r.part.id ?? '',
      r.part.material,
      r.matchedMaterial ?? '',
      r.level,
      r.part.zone ?? '',
      r.part.mass ?? '',
      r.part.area ?? '',
      r.part.maxExpectedTempC ?? '',
      r.part.heaterId ?? '',
      r.flags.join(' | '),
      r.sources.map((s) => s.url).join(' '),
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}
