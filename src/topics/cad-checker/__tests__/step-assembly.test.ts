import { describe, expect, it } from 'vitest';
import {
  adjacencyFromParentHints,
  importStepAssembly,
  parseStepAssembly,
} from '../importers/step-assembly';
import { SAMPLE_SW_HABITAT_ASSY_STEP } from '../sample-step';
import { parseBuildFile } from '../parse-bom';
import { checkBom } from '../engine';
import { scenarioById } from '../../mission-scenarios';
import { applyAdjacencyFlags } from '../adjacency';
import type { BomPart } from '../types';

describe('STEP assembly Phase 2', () => {
  it('extracts PRODUCT tree with parentId from NAUO', () => {
    const r = parseStepAssembly(SAMPLE_SW_HABITAT_ASSY_STEP, 'sample-sw-habitat-assy.step');
    expect(r.parts.length).toBeGreaterThanOrEqual(4);
    const pmma = r.parts.find((p) => /pmma/i.test(p.material));
    expect(pmma?.parentId).toBeTruthy();
    expect(r.adjacency.length).toBeGreaterThan(0);
    expect(r.adjacency.some((e) => e.relation === 'near-heat')).toBe(true);
  });

  it('importStepAssembly marks nativeCad and feeds checkBom', () => {
    const imported = importStepAssembly(SAMPLE_SW_HABITAT_ASSY_STEP);
    expect(imported.nativeCad).toBe(true);
    expect(imported.format).toBe('step');
    const lunar = scenarioById('lunar')!;
    let checked = checkBom(imported.parts, lunar);
    checked = applyAdjacencyFlags(checked, imported.adjacency ?? []);
    const pmma = checked.find((c) => /pmma/i.test(c.part.material));
    expect(pmma?.level).toBe('high-concern');
    expect(pmma?.flags.some((f) => /near|heat|adjacency|avionics/i.test(f))).toBe(true);
  });

  it('parseBuildFile returns adjacency for STEP', () => {
    const r = parseBuildFile(SAMPLE_SW_HABITAT_ASSY_STEP, 'assy.step');
    expect(r.format).toBe('step');
    expect(r.adjacency?.length).toBeGreaterThan(0);
  });

  it('infers adjacency from Flame BOM parentId fields', () => {
    const bom: BomPart[] = [
      { id: 'assy', material: 'Assembly', zone: 'cabin' },
      { id: 'cover', material: 'PMMA', zone: 'cabin', parentId: 'assy' },
      {
        id: 'heat',
        material: 'Avionics_Heater',
        zone: 'cabin',
        parentId: 'assy',
        heaterId: 'avionics-bay',
      },
    ];
    const edges = adjacencyFromParentHints(bom);
    expect(edges.some((e) => e.relation === 'near-heat')).toBe(true);
    const r = parseBuildFile(JSON.stringify(bom), 'sample-sw-habitat-assy.bom.json');
    expect(r.adjacency?.length).toBeGreaterThan(0);
  });
});
