import { BOM_ZONES, type BomPart, type BomZone, type ParseIssue } from './types';

function asZone(raw: unknown): BomZone | undefined {
  if (raw == null || raw === '') return undefined;
  const z = String(raw).trim().toLowerCase().replace(/_/g, '-');
  return BOM_ZONES.includes(z as BomZone) ? (z as BomZone) : undefined;
}

function asFiniteNumber(raw: unknown, field: string, issues: ParseIssue[], row?: number): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) {
    issues.push({ severity: 'error', message: `Invalid number for ${field}: ${String(raw)}`, row });
    return undefined;
  }
  return n;
}

/** Normalize and validate one part record. Returns null if material missing. */
export function normalizePart(raw: Record<string, unknown>, row?: number, issues: ParseIssue[] = []): BomPart | null {
  const material =
    (raw.material ?? raw.Material ?? raw.MATERIAL ?? raw.mat ?? raw.name ?? raw.Name) != null
      ? String(raw.material ?? raw.Material ?? raw.MATERIAL ?? raw.mat ?? raw.name ?? raw.Name).trim()
      : '';
  if (!material) {
    issues.push({ severity: 'error', message: 'Part missing required material field', row });
    return null;
  }

  const zoneRaw = raw.zone ?? raw.Zone ?? raw.ZONE;
  let zone = asZone(zoneRaw);
  if (zoneRaw != null && String(zoneRaw).trim() !== '' && !zone) {
    issues.push({
      severity: 'error',
      message: `Invalid zone “${String(zoneRaw)}” (use cabin | eva-suit | propellant-bay)`,
      row,
    });
  }

  const idRaw = raw.id ?? raw.Id ?? raw.ID ?? raw.partId ?? raw.part_id;
  const heaterRaw = raw.heaterId ?? raw.heater_id ?? raw.HeaterId ?? raw.heater;

  return {
    id: idRaw != null && String(idRaw).trim() ? String(idRaw).trim() : undefined,
    material,
    mass: asFiniteNumber(raw.mass ?? raw.Mass, 'mass', issues, row),
    area: asFiniteNumber(raw.area ?? raw.Area, 'area', issues, row),
    nearbyFuel:
      raw.nearbyFuel != null || raw.nearby_fuel != null || raw.NearbyFuel != null
        ? String(raw.nearbyFuel ?? raw.nearby_fuel ?? raw.NearbyFuel).trim() || undefined
        : undefined,
    maxExpectedTempC: asFiniteNumber(
      raw.maxExpectedTempC ?? raw.max_expected_temp_c ?? raw.tempC ?? raw.temp,
      'maxExpectedTempC',
      issues,
      row,
    ),
    zone,
    heaterId: heaterRaw != null && String(heaterRaw).trim() ? String(heaterRaw).trim() : undefined,
  };
}

export function validateParts(parts: BomPart[], issues: ParseIssue[]): BomPart[] {
  return parts.filter((p, i) => {
    if (!p.material.trim()) {
      issues.push({ severity: 'error', message: 'Empty material after normalize', row: i + 1 });
      return false;
    }
    return true;
  });
}
