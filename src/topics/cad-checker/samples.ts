import type { BomPart } from './types';
import { SAMPLE_HABITAT_COVER_DXF } from './sample-dxf';
import { SAMPLE_SW_HABITAT_ASSY_STEP } from './sample-step';

export interface DemoScenario {
  id: string;
  title: string;
  blurb: string;
  atmosphereId: 'iss' | 'emu' | 'lunar' | 'mars';
  whatToNotice: string[];
  parts: BomPart[];
  adjacencyCsv?: string;
  /** When set, demo loads native CAD text (e.g. DXF) instead of BOM JSON. */
  nativeCad?: { fileName: string; text: string };
  /** Fetch CAD/glTF from public URL (for large mesh samples). */
  nativeCadUrl?: { fileName: string; url: string };
}

/** Guided demo BOMs for the CAD Checker application tab. */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'lunar-acrylic',
    title: 'Lunar habitat acrylic cover',
    blurb:
      'A clear PMMA cover over avionics in a 34% O₂ lunar cabin — classic BASS/SoFIE solid surrogate next to a warm electronics bay.',
    atmosphereId: 'lunar',
    whatToNotice: [
      'PMMA LOI band sits below lunar 34% O₂ → high-concern',
      '60°C expected surface temp still below melt, but continuous-use / softening bands get reviewed',
      'Nearby n-heptane flash is far below cabin temps if a liquid surrogate is present',
    ],
    parts: [
      { id: 'cover-1', material: 'PMMA', nearbyFuel: 'n-heptane', zone: 'cabin', heaterId: 'avionics-bay' },
      { material: 'Nomex', maxExpectedTempC: 40, zone: 'cabin' },
      { id: 'avionics', material: 'Aluminum', maxExpectedTempC: 80, zone: 'cabin', heaterId: 'avionics-bay' },
      { material: 'Epoxy', heaterId: 'power-electronics', zone: 'cabin' },
      { material: 'mystery-foam', maxExpectedTempC: 50, zone: 'cabin' },
    ],
    adjacencyCsv: `partA,partB,clearanceMm,relation
avionics,cover-1,30,near-heat
avionics,PMMA,30,near-heat`,
  },
  {
    id: 'emu-softgoods',
    title: 'EMU soft-goods mix',
    blurb:
      'Pure-oxygen EVA reference (100% O₂ / 4.3 psi). Compare PTFE (prefer) vs Buna-N (high-concern) and Nomex under suit rules.',
    atmosphereId: 'emu',
    whatToNotice: [
      'PTFE stays prefer-class but still needs impact qualification notes',
      'Buna-N and silicone elastomers escalate under EMU oxygen rules',
      'Cabin LOI alone is not enough — oxygen-compatibility flags dominate',
    ],
    parts: [
      { material: 'PTFE', zone: 'eva-suit', maxExpectedTempC: 40 },
      { material: 'Viton', zone: 'eva-suit', maxExpectedTempC: 40 },
      { material: 'Buna-N', zone: 'eva-suit', maxExpectedTempC: 40 },
      { material: 'Silicone', zone: 'eva-suit', maxExpectedTempC: 50 },
      { material: 'Nomex', zone: 'eva-suit' },
      { material: 'Stainless steel', zone: 'eva-suit' },
    ],
  },
  {
    id: 'rover-cabin',
    title: 'Pressurized rover cabin BOM',
    blurb:
      'Mixed plastics and metals for a pressurized rover under an illustrative Mars habitat mix — includes ABS near a heater and an unknown foam.',
    atmosphereId: 'mars',
    whatToNotice: [
      'ABS / polyethylene trip high-concern on LOI vs elevated O₂',
      '120°C heater proximity hits ABS softening and continuous-use bands',
      'Unknown foam is captured for the materials-library feedback JSON',
    ],
    parts: [
      { id: 'dash-abs', material: 'ABS', nearbyFuel: 'methanol', zone: 'cabin', heaterId: 'cabin-heater' },
      { material: 'Polyethylene', maxExpectedTempC: 70, zone: 'cabin' },
      { material: 'Polycarbonate', maxExpectedTempC: 55, zone: 'cabin' },
      { material: 'Nomex', zone: 'cabin' },
      { id: 'heater', material: 'Stainless steel', zone: 'cabin', heaterId: 'cabin-heater' },
      { material: 'Kapton', maxExpectedTempC: 90, zone: 'cabin' },
      { material: 'aerogel-blanket-x', zone: 'cabin' },
    ],
    adjacencyCsv: `partA,partB,clearanceMm,relation
heater,dash-abs,15,near-heat
heater,Polyethylene,40,above`,
  },
  {
    id: 'propellant-bay',
    title: 'Propellant-bay adjacency',
    blurb:
      'Structural metals and soft goods tagged propellant-bay — cabin LOI ranking is caveated; fuel flash/AIT still screen against local temperature.',
    atmosphereId: 'iss',
    whatToNotice: [
      'Zone flag pushes review even when metals would otherwise pass',
      'Hydrogen / methane rows are nearbyFuel references, not structure',
      'Keep propulsion caveats separate from PSI cabin-fire core',
    ],
    parts: [
      { material: 'Aluminum', nearbyFuel: 'hydrogen', maxExpectedTempC: 30, zone: 'propellant-bay' },
      { material: 'Titanium', nearbyFuel: 'methane', maxExpectedTempC: 40, zone: 'propellant-bay' },
      { material: 'PTFE', zone: 'propellant-bay' },
      { material: 'Stainless steel', zone: 'propellant-bay' },
    ],
  },
];

/** Extra guided demos that exercise native CAD importers (appended for UI). */
export const NATIVE_CAD_DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'dxf-habitat-cover',
    title: 'DXF acrylic panel (native CAD)',
    blurb:
      'ASCII AutoCAD DXF with MATERIAL_PMMA / Aluminum / Nomex layers — extracted in-page with no download.',
    atmosphereId: 'lunar',
    whatToNotice: [
      'DXF layers become BomPart rows automatically',
      'PMMA still high-concern under lunar 34% O₂',
      'Proprietary DWG/SLDPRT/… show conversion guidance when uploaded',
      'Upload sample-habitat-cover.fixture.dwg to exercise Phase 1 DWG→DXF unwrap',
    ],
    parts: [],
    nativeCad: { fileName: 'sample-habitat-cover.dxf', text: SAMPLE_HABITAT_COVER_DXF },
    adjacencyCsv: `partA,partB,clearanceMm,relation
Aluminum,PMMA,30,near-heat`,
  },
  {
    id: 'step-sw-habitat-assy',
    title: 'STEP assembly (SolidWorks→STEP hub)',
    blurb:
      'Phase 2 interchange: PRODUCT + NEXT_ASSEMBLY_USAGE_OCCURRENCE tree → parts with parentId and inferred near-heat adjacency. No download.',
    atmosphereId: 'lunar',
    whatToNotice: [
      'STEP PRODUCT nodes become BomPart rows with stable ids',
      'NAUO parent/child links fill parentId and adjacency CSV automatically',
      'PMMA near Avionics_Heater flags under lunar 34% O₂',
      'Prefer this STEP (or Flame BOM JSON) path over proprietary .sldasm in-browser',
    ],
    parts: [],
    nativeCad: { fileName: 'sample-sw-habitat-assy.step', text: SAMPLE_SW_HABITAT_ASSY_STEP },
  },
  {
    id: 'gltf-habitat-panel',
    title: 'glTF panel mesh preview',
    blurb:
      'Habitat cover as glTF meshes (PMMA / Aluminum / Nomex) — 3D preview in-page plus materials → checkBom. No download.',
    atmosphereId: 'lunar',
    whatToNotice: [
      'Mesh preview renders the uploaded glTF geometry',
      'Material names still drive flammability (PMMA high-concern in lunar O₂)',
      'Use this path when CAD exports glTF alongside or instead of STEP',
    ],
    parts: [],
    nativeCadUrl: {
      fileName: 'sample-habitat-panel.gltf',
      url: './samples/sample-habitat-panel.gltf',
    },
  },
];

export const ALL_DEMO_SCENARIOS: DemoScenario[] = [...DEMO_SCENARIOS, ...NATIVE_CAD_DEMO_SCENARIOS];

export function sampleBomJson(parts: BomPart[]): string {
  return JSON.stringify(parts, null, 2);
}
