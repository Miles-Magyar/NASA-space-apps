export interface HeaterPreset {
  id: string;
  label: string;
  typicalSurfaceTempC: number;
  notes: string;
}

/** Curated default surface temperatures for CAD/BOM triage (order-of-magnitude). */
export const HEATER_CATALOG: HeaterPreset[] = [
  {
    id: 'avionics-bay',
    label: 'Avionics bay (idle/cruise)',
    typicalSurfaceTempC: 60,
    notes: 'Typical warm electronics bay skin — below most polymer melts; still relevant to continuous-use.',
  },
  {
    id: 'power-electronics',
    label: 'Power electronics / converters',
    typicalSurfaceTempC: 95,
    notes: 'Higher local hotspots near converters and battery interfaces.',
  },
  {
    id: 'cabin-heater',
    label: 'Cabin heater / duct outlet',
    typicalSurfaceTempC: 120,
    notes: 'Can approach softening bands for ABS/PMMA-class plastics nearby.',
  },
  {
    id: 'battery-fault',
    label: 'Battery thermal fault (illustrative)',
    typicalSurfaceTempC: 180,
    notes: 'Illustrative off-nominal case for triage — not a certified failure model.',
  },
  {
    id: 'eva-suit-ambient',
    label: 'EVA suit soft-goods ambient',
    typicalSurfaceTempC: 40,
    notes: 'Low structural temp; oxygen-compatibility dominates over melt.',
  },
];

export function heaterById(id: string): HeaterPreset | undefined {
  return HEATER_CATALOG.find((h) => h.id === id || h.id === id.trim());
}

/** Apply heater catalog temps when part.heaterId is set and temp missing (or always fill if force). */
export function applyHeaterPresets<T extends { heaterId?: string; maxExpectedTempC?: number }>(
  parts: T[],
  force = false,
): T[] {
  return parts.map((p) => {
    if (!p.heaterId) return p;
    const h = heaterById(p.heaterId);
    if (!h) return p;
    if (p.maxExpectedTempC != null && !force) return p;
    return { ...p, maxExpectedTempC: h.typicalSurfaceTempC };
  });
}
