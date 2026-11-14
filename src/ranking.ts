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

export function rankingDisclaimer(): string {
  return 'Scores are transparent heuristics for triage (oxygen-limit proximity, citation depth, cabin vs propulsion scope). They are not a validated SI risk model.';
}
