import { describe, expect, it } from 'vitest';
import { importDxf } from '../importers/dxf';
import { detectNativeCadFormat, importCadText } from '../importers/registry';
import { importProprietary } from '../importers/proprietary';
import { SAMPLE_HABITAT_COVER_DXF } from '../sample-dxf';
import { checkBom } from '../engine';
import { scenarioById } from '../../mission-scenarios';

describe('native CAD detection', () => {
  it('maps the requested engineering extensions', () => {
    expect(detectNativeCadFormat('panel.dxf')).toBe('dxf');
    expect(detectNativeCadFormat('ship.dwg')).toBe('dwg');
    expect(detectNativeCadFormat('bracket.sldprt')).toBe('sldprt');
    expect(detectNativeCadFormat('wing.sldasm')).toBe('sldasm');
    expect(detectNativeCadFormat('cover.ipt')).toBe('ipt');
    expect(detectNativeCadFormat('rover.iam')).toBe('iam');
    expect(detectNativeCadFormat('skin.CATPart')).toBe('catpart');
    expect(detectNativeCadFormat('assy.CATProduct')).toBe('catproduct');
    expect(detectNativeCadFormat('tank.prt')).toBe('prt');
    expect(detectNativeCadFormat('stack.asm')).toBe('asm');
  });
});

describe('DXF importer', () => {
  it('extracts MATERIAL_ layers from the sample DXF', () => {
    const r = importDxf(SAMPLE_HABITAT_COVER_DXF, 'sample-habitat-cover.dxf');
    expect(r.nativeCad).toBe(true);
    expect(r.format).toBe('dxf');
    const names = r.parts.map((p) => p.material.toLowerCase());
    expect(names.some((n) => n.includes('pmma'))).toBe(true);
    expect(names.some((n) => n.includes('aluminum') || n.includes('aluminium'))).toBe(true);
  });

  it('feeds extracted DXF parts into checkBom', () => {
    const r = importCadText(SAMPLE_HABITAT_COVER_DXF, 'sample-habitat-cover.dxf');
    const lunar = scenarioById('lunar')!;
    const checked = checkBom(r.parts, lunar);
    const pmma = checked.find((c) => /pmma/i.test(c.part.material));
    expect(pmma?.level).toBe('high-concern');
  });
});

describe('proprietary stubs', () => {
  it('returns conversion guidance for SOLIDWORKS parts', () => {
    const r = importProprietary('sldprt', 'Acrylic_Cover.sldprt');
    expect(r.conversion?.needed).toBe(true);
    expect(r.issues.some((i) => i.severity === 'error')).toBe(true);
    expect(r.parts[0]?.material.toLowerCase()).toContain('acrylic');
  });
});
