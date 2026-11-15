export type BomZone = 'cabin' | 'eva-suit' | 'propellant-bay';

export interface BomPart {
  id?: string;
  material: string;
  mass?: number;
  area?: number;
  nearbyFuel?: string;
  maxExpectedTempC?: number;
  zone?: BomZone;
  /** Optional heater catalog id used to fill/confirm expected temperature. */
  heaterId?: string;
  /** Assembly parent part id (STEP NAUO / Flame BOM tree). */
  parentId?: string;
}

export type ConcernLevel = 'pass' | 'review' | 'high-concern' | 'unknown';

export interface CheckResult {
  part: BomPart;
  matchedMaterial?: string;
  matchedFuel?: string;
  level: ConcernLevel;
  flags: string[];
  sources: Array<{ label: string; url: string }>;
}

export type AdjacencyRelation = 'near-heat' | 'above' | 'same-bay' | 'unknown';

export interface AdjacencyEdge {
  partA: string;
  partB: string;
  clearanceMm?: number;
  relation?: AdjacencyRelation;
}

export interface ParseIssue {
  severity: 'error' | 'warning';
  message: string;
  row?: number;
}

export interface ParseBomResult {
  format: string;
  parts: BomPart[];
  issues: ParseIssue[];
  /** Inferred from STEP assembly trees / parentId when available. */
  adjacency?: AdjacencyEdge[];
}

export interface UnknownMaterialCapture {
  material: string;
  zone?: BomZone;
  nearbyFuel?: string;
  firstSeenAt: string;
  scenarioLabel: string;
}

export const BOM_ZONES: BomZone[] = ['cabin', 'eva-suit', 'propellant-bay'];
