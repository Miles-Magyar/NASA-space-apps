import type { BomPart } from '../cabin-fire-safety/cad-checker';

export interface DemoScenario {
  id: string;
  title: string;
  blurb: string;
  atmosphereId: 'iss' | 'emu' | 'lunar' | 'mars';
  whatToNotice: string[];
  parts: BomPart[];
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
      { material: 'PMMA', nearbyFuel: 'n-heptane', maxExpectedTempC: 60, zone: 'cabin' },
      { material: 'Nomex', maxExpectedTempC: 40, zone: 'cabin' },
      { material: 'Aluminum', maxExpectedTempC: 80, zone: 'cabin' },
      { material: 'Epoxy', maxExpectedTempC: 95, zone: 'cabin' },
      { material: 'mystery-foam', maxExpectedTempC: 50, zone: 'cabin' },
    ],
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
      { material: 'ABS', nearbyFuel: 'methanol', maxExpectedTempC: 120, zone: 'cabin' },
      { material: 'Polyethylene', maxExpectedTempC: 70, zone: 'cabin' },
      { material: 'Polycarbonate', maxExpectedTempC: 55, zone: 'cabin' },
      { material: 'Nomex', zone: 'cabin' },
      { material: 'Stainless steel', zone: 'cabin' },
      { material: 'Kapton', maxExpectedTempC: 90, zone: 'cabin' },
      { material: 'aerogel-blanket-x', zone: 'cabin' },
    ],
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

export function sampleBomJson(parts: BomPart[]): string {
  return JSON.stringify(parts, null, 2);
}
