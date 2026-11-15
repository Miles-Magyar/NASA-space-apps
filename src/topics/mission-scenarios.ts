import type { ScenarioPreset } from './mission-types.js';

/** Sourced atmosphere presets for mission comparison. */
export const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'iss',
    label: 'ISS nominal cabin',
    oxygenPercent: 21,
    pressurePsia: 14.7,
    gravityLabel: 'microgravity',
    notes:
      'Nominal ISS cabin air near Earth sea-level composition and pressure, without buoyancy-driven plume rise.',
  },
  {
    id: 'emu',
    label: 'EMU EVA reference',
    oxygenPercent: 100,
    pressurePsia: 4.3,
    gravityLabel: 'microgravity / EVA',
    notes:
      'Nominal Extravehicular Mobility Unit reference: pure oxygen at about 4.3 psi. Extremely oxygen-enriched relative to cabin air.',
  },
  {
    id: 'lunar',
    label: 'Lunar exploration habitat',
    oxygenPercent: 34,
    pressurePsia: 8.2,
    gravityLabel: '≈1/6 g',
    notes:
      'Exploration atmosphere reference near 34% O₂ and 8.2 psia, chosen to shorten pre-breathe while remaining between EMU and Earth air. Partial-g combustion data in PSI are still sparse.',
  },
  {
    id: 'mars',
    label: 'Illustrative Mars habitat',
    oxygenPercent: 26.5,
    pressurePsia: 10.2,
    gravityLabel: '≈3/8 g',
    notes:
      'Illustrative reduced-pressure, elevated-oxygen habitat mixture. Not a flight-certified Mars cabin standard; use for transfer discussion only.',
  },
  {
    id: 'earth',
    label: 'Earth sea-level reference',
    oxygenPercent: 20.9,
    pressurePsia: 14.7,
    gravityLabel: '1 g',
    notes:
      'Terrestrial sea-level air for comparing published ground flash/autoignition and LOI/LOC values to flight conditions.',
    fuelsOnly: true,
  },
];

export function scenarioById(id: string): ScenarioPreset | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
