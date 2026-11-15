import { describe, expect, it } from 'vitest';
import { parseBuildFile, splitDelimitedLine } from '../parse-bom';
import { checkBom, runFullCheck } from '../engine';
import { parseAdjacency } from '../adjacency';
import { scenarioById } from '../../mission-scenarios';
import { MATERIALS_LIBRARY, PROVENANCE_HOST_RE } from '../../materials-library';

describe('splitDelimitedLine', () => {
  it('respects quoted commas', () => {
    expect(splitDelimitedLine('PMMA,"note, with comma",60,cabin', ',')).toEqual([
      'PMMA',
      'note, with comma',
      '60',
      'cabin',
    ]);
  });
});

describe('parseBuildFile', () => {
  it('parses JSON array', () => {
    const r = parseBuildFile('[{"material":"PMMA","zone":"cabin","maxExpectedTempC":60}]');
    expect(r.format).toBe('json');
    expect(r.parts).toHaveLength(1);
    expect(r.parts[0].material).toBe('PMMA');
  });

  it('parses CSV with headers and quoted fields', () => {
    const r = parseBuildFile(
      'material,zone,maxExpectedTempC\n"PMMA",cabin,60\nNomex,cabin,40',
      'bom.csv',
    );
    expect(r.format).toBe('csv');
    expect(r.parts.map((p) => p.material)).toEqual(['PMMA', 'Nomex']);
  });

  it('parses TSV', () => {
    const r = parseBuildFile('material\tzone\nPTFE\teva-suit', 'bom.tsv');
    expect(r.format).toBe('tsv');
    expect(r.parts[0].zone).toBe('eva-suit');
  });

  it('parses NDJSON', () => {
    const r = parseBuildFile('{"material":"ABS","zone":"cabin"}\n{"material":"Nomex"}\n', 'x.ndjson');
    expect(r.format).toBe('ndjson');
    expect(r.parts).toHaveLength(2);
  });

  it('parses XML part attributes', () => {
    const r = parseBuildFile(
      '<bom><part material="PMMA" zone="cabin" maxExpectedTempC="60" /></bom>',
      'bom.xml',
    );
    expect(r.format).toBe('xml');
    expect(r.parts[0].material).toBe('PMMA');
  });

  it('extracts glTF material names', () => {
    const r = parseBuildFile(
      JSON.stringify({ asset: { version: '2.0' }, materials: [{ name: 'PMMA' }, { name: 'Nomex' }] }),
      'cabin.gltf',
    );
    expect(r.format).toBe('gltf');
    expect(r.parts.map((p) => p.material)).toEqual(['PMMA', 'Nomex']);
    expect(r.issues.some((i) => i.severity === 'warning')).toBe(true);
  });

  it('extracts STEP MATERIAL names', () => {
    const r = parseBuildFile(
      "ISO-10303-21;\nDATA;\n#1=MATERIAL('mat','PMMA');\n#2=PRODUCT('Aluminum','','',(#3));\nENDSEC;",
      'part.step',
    );
    expect(r.format).toBe('step');
    expect(r.parts.some((p) => p.material === 'PMMA')).toBe(true);
  });

  it('rejects invalid zone', () => {
    const r = parseBuildFile('[{"material":"PMMA","zone":"garage"}]');
    expect(r.issues.some((i) => i.severity === 'error' && /zone/i.test(i.message))).toBe(true);
  });

  it('rejects empty material rows', () => {
    const r = parseBuildFile('[{"zone":"cabin"}]');
    expect(r.parts).toHaveLength(0);
    expect(r.issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('reports typed JSON parse errors', () => {
    const r = parseBuildFile('{not-json');
    expect(r.parts).toHaveLength(0);
    expect(r.issues.some((i) => i.severity === 'error' && /JSON parse failed/i.test(i.message))).toBe(true);
  });

  it('rejects non-numeric temperatures with typed errors', () => {
    const r = parseBuildFile('[{"material":"PMMA","maxExpectedTempC":"hot","zone":"cabin"}]');
    expect(r.issues.some((i) => i.severity === 'error' && /maxExpectedTempC/i.test(i.message))).toBe(true);
  });
});

describe('checkBom', () => {
  const lunar = scenarioById('lunar')!;
  const emu = scenarioById('emu')!;

  it('flags PMMA under lunar O₂ as high-concern', () => {
    const [r] = checkBom([{ material: 'PMMA', zone: 'cabin' }], lunar);
    expect(r.level).toBe('high-concern');
  });

  it('flags Buna-N under EMU as high-concern', () => {
    const [r] = checkBom([{ material: 'Buna-N', zone: 'eva-suit' }], emu);
    expect(r.level).toBe('high-concern');
  });

  it('flags melt-band temperature', () => {
    const [r] = checkBom([{ material: 'Polyethylene', maxExpectedTempC: 140, zone: 'cabin' }], lunar);
    expect(r.level).toBe('high-concern');
    expect(r.flags.some((f) => /melt/i.test(f))).toBe(true);
  });

  it('marks unknown materials', () => {
    const [r] = checkBom([{ material: 'unobtanium-foam', zone: 'cabin' }], lunar);
    expect(r.level).toBe('unknown');
  });

  it('applies heater preset temperatures', () => {
    const [r] = checkBom([{ material: 'ABS', zone: 'cabin', heaterId: 'cabin-heater' }], lunar);
    expect(r.part.maxExpectedTempC).toBe(120);
  });
});

describe('materials library provenance', () => {
  it('requires a primary citation host on every row', () => {
    for (const m of MATERIALS_LIBRARY) {
      expect(m.sources.length).toBeGreaterThan(0);
      expect(m.sources.some((s) => PROVENANCE_HOST_RE.test(s.url))).toBe(true);
      expect(['sourced', 'partial']).toContain(m.provenance);
    }
  });
});

describe('adjacency', () => {
  it('adds near-heat flags', () => {
    const lunar = scenarioById('lunar')!;
    const { edges } = parseAdjacency('partA,partB,clearanceMm,relation\nheater,PMMA,20,near-heat');
    const results = runFullCheck(
      [
        { id: 'heater', material: 'Stainless steel', zone: 'cabin', heaterId: 'cabin-heater' },
        { material: 'PMMA', zone: 'cabin' },
      ],
      lunar,
      edges,
    );
    const pmma = results.find((r) => r.part.material === 'PMMA')!;
    expect(pmma.flags.some((f) => /Adjacency/i.test(f))).toBe(true);
  });
});
