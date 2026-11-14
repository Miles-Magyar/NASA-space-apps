import type { MissionRow, ScenarioId, ScenarioPreset } from './topics/mission-types';

export interface RankedRow {
  row: MissionRow;
  score: number;
  reasons: string[];
}

function loiConcern(row: MissionRow, scenario: ScenarioPreset): number {
  const loi = row.loiOrLocPercent;
  if (!loi) return 0;
  const lo = loi.min ?? loi.value;
  if (lo == null) return 0;
  if (scenario.oxygenPercent > lo + 5) return 35;
  if (scenario.oxygenPercent > lo) return 22;
  if (scenario.oxygenPercent > lo - 3) return 10;
  return 2;
}

function evidenceBoost(row: MissionRow): number {
  let s = 0;
  if (row.investigationIds?.length) s += 12 * Math.min(row.investigationIds.length, 3);
  if (row.sources.length) s += 6;
  if (row.evidenceType === 'solid-material' || row.evidenceType === 'detection' || row.evidenceType === 'suppression') {
    s += 8;
  }
  if (row.group === 'propulsion') s -= 15; // cabin-fire ranking de-prioritizes propulsion refs
  return s;
}

function scenarioTagBoost(row: MissionRow, scenarioId: ScenarioId): number {
  const note = row.scenarioNotes[scenarioId];
  if (!note) return 0;
  const lower = note.toLowerCase();
  let s = 5;
  if (lower.includes('high concern') || lower.includes('elevated')) s += 8;
  if (lower.includes('prefer')) s += 2;
  return s;
}

/** Transparent heuristic ranking — not a validated quantitative risk model. */
export function rankRows(rows: MissionRow[], scenario: ScenarioPreset): RankedRow[] {
  return rows
    .map((row) => {
      const reasons: string[] = [];
      let score = 10;
      const loi = loiConcern(row, scenario);
      if (loi) {
        score += loi;
        reasons.push(
          `Atmosphere O₂ (${scenario.oxygenPercent}%) vs reported oxygen limit band for ${row.name}`,
        );
      }
      const eb = evidenceBoost(row);
      score += eb;
      if (row.investigationIds?.length) {
        reasons.push(`Linked investigations: ${row.investigationIds.join(', ')}`);
      }
      if (row.group === 'propulsion') {
        reasons.push('Propulsion-reference row (de-prioritized for cabin ranking)');
      }
      const sb = scenarioTagBoost(row, scenario.id);
      score += sb;
      if (row.scenarioNotes[scenario.id]) {
        reasons.push(`Scenario note available for ${scenario.label}`);
      }
      if (scenario.id === 'emu' && row.evidenceType === 'oxygen-compatibility') {
        score += 20;
        reasons.push('Oxygen-compatibility evidence prioritized for EMU');
      }
      if ((scenario.id === 'lunar' || scenario.id === 'mars') && row.tags.some((t) => /FM2|lunar|partial/i.test(t))) {
        score += 12;
        reasons.push('Partial-g / lunar pathway relevance');
      }
      if (!reasons.length) reasons.push('Baseline topical relevance');
      return { row, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

function loiBand(row: MissionRow): { lo: number; hi: number } | null {
  const loi = row.loiOrLocPercent;
  if (!loi) return null;
  const lo = loi.min ?? loi.value;
  const hi = loi.max ?? loi.value;
  if (lo == null || hi == null) return null;
  return { lo, hi };
}

/**
 * Best heuristic fit for safety-regulation screening under the selected atmosphere:
 * cabin/material rows whose published LOI/LOC sits above habitat O₂, with citation depth.
 * Falls back to the largest LOI margin (least shortfall) when nothing clears the O₂ target.
 */
export function bestSafetyRegulationFit(
  rows: MissionRow[],
  scenario: ScenarioPreset,
): RankedRow | undefined {
  const candidates = rows.filter(
    (r) =>
      r.group === 'cabin' ||
      r.group === 'materials' ||
      r.evidenceType === 'solid-material' ||
      r.evidenceType === 'cabin-surrogate' ||
      r.evidenceType === 'oxygen-compatibility',
  );
  if (!candidates.length) return undefined;

  const scored = candidates.map((row) => {
    const reasons: string[] = [];
    let score = 0;
    const band = loiBand(row);
    if (band) {
      const margin = band.lo - scenario.oxygenPercent;
      if (margin >= 5) {
        score += 80 + Math.min(margin, 20);
        reasons.push(
          `Published LOI/LOC band (${band.lo}–${band.hi}% O₂) clears ${scenario.label} (${scenario.oxygenPercent}% O₂) with ~${margin.toFixed(0)} pt margin`,
        );
      } else if (margin >= 0) {
        score += 55 + margin * 4;
        reasons.push(
          `LOI/LOC band (${band.lo}–${band.hi}% O₂) meets or barely clears habitat O₂ — specimen verification still required`,
        );
      } else {
        score += 20 + Math.max(margin, -20);
        reasons.push(
          `LOI/LOC band (${band.lo}–${band.hi}% O₂) is below ${scenario.oxygenPercent}% O₂ — does not clear this atmosphere alone`,
        );
      }
    } else {
      score += 8;
      reasons.push('No published LOI/LOC on this row — cannot clear oxygen-limit screening from this record alone');
    }

    if (row.sources.length >= 2) {
      score += 12;
      reasons.push(`Sourced (${row.sources.length} citations)`);
    } else if (row.sources.length === 1) {
      score += 6;
      reasons.push('Single primary citation');
    }

    if (row.investigationIds?.length) {
      score += 10;
      reasons.push(`Tied to ${row.investigationIds.join(', ')}`);
    }

    if (row.group === 'propulsion') {
      score -= 40;
      reasons.push('Propulsion reference — outside cabin safety-regulation core');
    }

    if (scenario.id === 'emu' && row.evidenceType === 'oxygen-compatibility') {
      score += 25;
      reasons.push('Oxygen-compatibility evidence aligns with EMU pure-O₂ service rules');
    }

    const note = row.scenarioNotes[scenario.id];
    if (note) {
      score += 5;
      reasons.push(note);
    }

    return { row, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

export function rankingDisclaimer(): string {
  return 'Triage scores highlight concern and citation depth. The safety-regulation suggestion prefers cabin/material rows whose LOI/LOC clears the selected atmosphere. Neither is a validated quantitative risk model.';
}
