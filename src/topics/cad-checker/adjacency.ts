import { findMaterial } from '../materials-library';
import type { AdjacencyEdge, AdjacencyRelation, CheckResult, ParseIssue } from './types';
import { splitDelimitedLine } from './parse-bom';

const RELATIONS: AdjacencyRelation[] = ['near-heat', 'above', 'same-bay', 'unknown'];

function asRelation(raw: string | undefined): AdjacencyRelation | undefined {
  if (!raw) return undefined;
  const r = raw.trim().toLowerCase().replace(/_/g, '-') as AdjacencyRelation;
  return RELATIONS.includes(r) ? r : undefined;
}

/** Parse adjacency CSV/TSV: partA,partB,clearanceMm,relation */
export function parseAdjacency(text: string): { edges: AdjacencyEdge[]; issues: ParseIssue[] } {
  const issues: ParseIssue[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { edges: [], issues };

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as AdjacencyEdge[];
      if (!Array.isArray(parsed)) {
        issues.push({ severity: 'error', message: 'Adjacency JSON must be an array' });
        return { edges: [], issues };
      }
      return {
        edges: parsed.map((e, i) => {
          if (!e.partA || !e.partB) {
            issues.push({ severity: 'error', message: 'Adjacency edge missing partA/partB', row: i + 1 });
          }
          return {
            partA: String(e.partA ?? '').trim(),
            partB: String(e.partB ?? '').trim(),
            clearanceMm: e.clearanceMm != null ? Number(e.clearanceMm) : undefined,
            relation: e.relation ?? 'unknown',
          };
        }).filter((e) => e.partA && e.partB),
        issues,
      };
    } catch (e) {
      issues.push({ severity: 'error', message: `Adjacency JSON parse failed: ${(e as Error).message}` });
      return { edges: [], issues };
    }
  }

  const delimiter = trimmed.split(/\r?\n/)[0]?.includes('\t') ? '\t' : ',';
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  const first = splitDelimitedLine(lines[0], delimiter).map((c) => c.toLowerCase());
  const hasHeader = first.some((c) => c.includes('parta') || c === 'part_a');
  const start = hasHeader ? 1 : 0;
  const edges: AdjacencyEdge[] = [];

  for (let i = start; i < lines.length; i++) {
    const [partA, partB, clearanceMm, relation] = splitDelimitedLine(lines[i], delimiter);
    if (!partA || !partB) {
      issues.push({ severity: 'error', message: 'Adjacency row needs partA and partB', row: i + 1 });
      continue;
    }
    const rel = asRelation(relation);
    if (relation && !rel) {
      issues.push({
        severity: 'warning',
        message: `Unknown relation “${relation}” — using unknown`,
        row: i + 1,
      });
    }
    const clearance = clearanceMm ? Number(clearanceMm) : undefined;
    if (clearanceMm && !Number.isFinite(clearance)) {
      issues.push({ severity: 'error', message: `Invalid clearanceMm: ${clearanceMm}`, row: i + 1 });
    }
    edges.push({
      partA: partA.trim(),
      partB: partB.trim(),
      clearanceMm: Number.isFinite(clearance) ? clearance : undefined,
      relation: rel ?? 'unknown',
    });
  }

  return { edges, issues };
}

function looksLikeHeatSource(idOrMaterial: string): boolean {
  const q = idOrMaterial.toLowerCase();
  return (
    q.includes('heater') ||
    q.includes('avionics') ||
    q.includes('battery') ||
    q.includes('power') ||
    q.includes('electronics')
  );
}

/**
 * Append assembly adjacency flags onto existing part check results.
 * Matches edges by part id or material name (case-insensitive).
 */
export function applyAdjacencyFlags(results: CheckResult[], edges: AdjacencyEdge[]): CheckResult[] {
  if (!edges.length) return results;

  const clone = results.map((r) => ({ ...r, flags: [...r.flags], sources: [...r.sources] }));
  const find = (key: string) => {
    const k = key.toLowerCase();
    return clone.find((r) => r.part.id?.toLowerCase() === k || r.part.material.toLowerCase() === k);
  };

  for (const edge of edges) {
    const a = find(edge.partA);
    const b = find(edge.partB);
    if (!a || !b) continue;

    const clearanceNote =
      edge.clearanceMm != null ? ` (${edge.clearanceMm} mm clearance)` : '';
    const relation = edge.relation ?? 'unknown';
    const aHeat = looksLikeHeatSource(edge.partA) || !!a.part.heaterId;
    const bHeat = looksLikeHeatSource(edge.partB) || !!b.part.heaterId;

    const flagPair = (plastic: CheckResult, heat: CheckResult) => {
      const mat = findMaterial(plastic.part.material);
      const soft = mat?.softeningC?.value ?? mat?.softeningC?.min ?? mat?.glassTransitionC?.value;
      const concern =
        plastic.level === 'high-concern' ||
        mat?.oxygenCompatibility === 'high-concern' ||
        (soft != null && (plastic.part.maxExpectedTempC ?? heat.part.maxExpectedTempC ?? 0) >= soft);

      const msg = `Adjacency ${relation}${clearanceNote}: “${plastic.part.material}” near heat-related “${heat.part.material}”${
        soft != null ? ` (softening band ~${soft}°C)` : ''
      }`;
      plastic.flags.push(msg);
      if (concern || relation === 'near-heat' || relation === 'above') {
        if (plastic.level === 'pass') plastic.level = 'review';
        if (relation === 'near-heat' && mat?.oxygenCompatibility === 'high-concern') {
          plastic.level = 'high-concern';
        }
      }
      if (mat?.sources) plastic.sources.push(...mat.sources);
    };

    if (aHeat && !bHeat) flagPair(b, a);
    else if (bHeat && !aHeat) flagPair(a, b);
    else if (relation === 'near-heat' || relation === 'above') {
      // Both or neither tagged — still note proximity for high-concern plastics
      for (const r of [a, b]) {
        if (r.level === 'high-concern' || findMaterial(r.part.material)?.category === 'plastic') {
          r.flags.push(
            `Adjacency ${relation}${clearanceNote}: ${edge.partA} ↔ ${edge.partB}`,
          );
          if (r.level === 'pass') r.level = 'review';
        }
      }
    } else if (relation === 'same-bay') {
      a.flags.push(`Same-bay adjacency with “${b.part.material}”${clearanceNote}`);
      b.flags.push(`Same-bay adjacency with “${a.part.material}”${clearanceNote}`);
      if (a.level === 'pass') a.level = 'review';
      if (b.level === 'pass') b.level = 'review';
    }
  }

  return clone;
}
