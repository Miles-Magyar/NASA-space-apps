import { normalizePart } from '../schema';
import type { AdjacencyEdge, BomPart, ParseIssue } from '../types';
import type { CadImportResult } from './types';

export interface StepAssemblyResult {
  parts: BomPart[];
  adjacency: AdjacencyEdge[];
  issues: ParseIssue[];
}

interface ProductNode {
  entityId: string;
  name: string;
  id: string;
}

function slugId(name: string, entityId: string): string {
  const base = name
    .toLowerCase()
    .replace(/^material[_-]/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `step-${entityId}`;
}

function looksLikeHeatName(name: string): boolean {
  const q = name.toLowerCase();
  return (
    q.includes('heater') ||
    q.includes('avionics') ||
    q.includes('battery') ||
    q.includes('power') ||
    q.includes('electronics')
  );
}

/** Build adjacency from parentId hints on parts (siblings share same-bay; heat → near-heat). */
export function adjacencyFromParentHints(parts: BomPart[]): AdjacencyEdge[] {
  const edges: AdjacencyEdge[] = [];
  const byParent = new Map<string, BomPart[]>();

  for (const p of parts) {
    if (!p.parentId || !p.id) continue;
    const list = byParent.get(p.parentId) ?? [];
    list.push(p);
    byParent.set(p.parentId, list);

    const parent = parts.find((x) => x.id === p.parentId);
    if (parent?.id) {
      const heat = looksLikeHeatName(p.material) || looksLikeHeatName(parent.material) || !!p.heaterId;
      edges.push({
        partA: parent.id,
        partB: p.id,
        relation: heat ? 'near-heat' : 'same-bay',
      });
    }
  }

  for (const siblings of byParent.values()) {
    const heat = siblings.find((s) => looksLikeHeatName(s.material) || !!s.heaterId);
    if (!heat?.id) continue;
    for (const s of siblings) {
      if (!s.id || s.id === heat.id) continue;
      edges.push({
        partA: heat.id,
        partB: s.id,
        relation: 'near-heat',
      });
    }
  }

  const seen = new Set<string>();
  return edges.filter((e) => {
    const key = [e.partA.toLowerCase(), e.partB.toLowerCase(), e.relation].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseProducts(text: string): Map<string, ProductNode> {
  const map = new Map<string, ProductNode>();
  const re = /#(\d+)\s*=\s*PRODUCT\s*\(\s*'([^']*)'/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const entityId = m[1]!;
    const name = m[2]!.trim();
    if (!name || name.length > 120 || /^[0-9.-]+$/.test(name)) continue;
    map.set(entityId, { entityId, name, id: slugId(name, entityId) });
  }
  return map;
}

/**
 * Resolve PRODUCT_DEFINITION → PRODUCT via PRODUCT_DEFINITION_FORMATION when present.
 * Falls back to treating entity ids as PRODUCT ids (Flame simplified fixtures).
 */
function resolveProductRef(
  refId: string,
  products: Map<string, ProductNode>,
  text: string,
): ProductNode | undefined {
  if (products.has(refId)) return products.get(refId);

  const pdRe = new RegExp(`#${refId}\\s*=\\s*PRODUCT_DEFINITION\\s*\\([^;]*?#(\\d+)`, 'i');
  const pd = pdRe.exec(text);
  if (pd) {
    const formationId = pd[1]!;
    const formRe = new RegExp(
      `#${formationId}\\s*=\\s*PRODUCT_DEFINITION_FORMATION\\s*\\([^;]*?#(\\d+)`,
      'i',
    );
    const form = formRe.exec(text);
    if (form && products.has(form[1]!)) return products.get(form[1]!);
  }

  const formDirect = new RegExp(
    `#${refId}\\s*=\\s*PRODUCT_DEFINITION_FORMATION\\s*\\([^;]*?#(\\d+)`,
    'i',
  ).exec(text);
  if (formDirect && products.has(formDirect[1]!)) return products.get(formDirect[1]!);

  return undefined;
}

function parseNauoPairs(text: string): Array<{ parentRef: string; childRef: string }> {
  const pairs: Array<{ parentRef: string; childRef: string }> = [];
  const re =
    /NEXT_ASSEMBLY_USAGE_OCCURRENCE\s*\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*#(\d+)\s*,\s*#(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    pairs.push({ parentRef: m[1]!, childRef: m[2]! });
  }
  return pairs;
}

/** Optional Flame tree hints: FLAME_TREE parent=<id> child=<id> inside block comments. */
function parseFlameTreeHints(text: string): Array<{ parentId: string; childId: string }> {
  const hints: Array<{ parentId: string; childId: string }> = [];
  const re = /\/\*\s*FLAME_TREE\s+parent=([^\s*]+)\s+child=([^\s*]+)\s*\*\//gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    hints.push({ parentId: m[1]!, childId: m[2]! });
  }
  return hints;
}

function extractMaterialNames(text: string): string[] {
  const names = new Set<string>();
  for (const re of [
    /MATERIAL\s*\(\s*'[^']*'\s*,\s*'([^']+)'/gi,
    /MATERIAL\s*\(\s*'([^']+)'/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const n = m[1]?.trim();
      if (n && n.length > 1 && n.length < 80) names.add(n);
    }
  }
  return [...names];
}

/**
 * Phase 2 STEP assembly importer: PRODUCT tree + NAUO → BomPart[] with parentId,
 * plus adjacency edges for the flammability checker.
 */
export function parseStepAssembly(text: string, fileName = 'assembly.step'): StepAssemblyResult {
  const issues: ParseIssue[] = [];
  const products = parseProducts(text);
  const parentByChildId = new Map<string, string>();

  for (const pair of parseNauoPairs(text)) {
    const parent = resolveProductRef(pair.parentRef, products, text);
    const child = resolveProductRef(pair.childRef, products, text);
    if (parent && child && parent.id !== child.id) {
      parentByChildId.set(child.id, parent.id);
    }
  }

  for (const hint of parseFlameTreeHints(text)) {
    parentByChildId.set(hint.childId, hint.parentId);
  }

  const parts: BomPart[] = [];
  const usedIds = new Set<string>();

  if (products.size) {
    let i = 0;
    for (const node of products.values()) {
      let id = node.id;
      if (usedIds.has(id)) id = `${id}-${node.entityId}`;
      usedIds.add(id);
      const parentId = parentByChildId.get(node.id) ?? parentByChildId.get(id);
      const part = normalizePart(
        {
          id,
          material: node.name.replace(/^MATERIAL[_-]/i, ''),
          zone: 'cabin',
          parentId,
        },
        ++i,
        issues,
      );
      if (part) {
        if (parentId) part.parentId = parentId;
        parts.push(part);
      }
    }
  }

  for (const mat of extractMaterialNames(text)) {
    if (parts.some((p) => p.material.toLowerCase() === mat.toLowerCase())) continue;
    const part = normalizePart(
      { id: slugId(mat, 'mat'), material: mat, zone: 'cabin' },
      parts.length + 1,
      issues,
    );
    if (part) parts.push(part);
  }

  for (const hint of parseFlameTreeHints(text)) {
    const child = parts.find((p) => p.id === hint.childId);
    if (child) child.parentId = hint.parentId;
  }

  const adjacency = adjacencyFromParentHints(parts);

  if (!parts.length) {
    issues.push({
      severity: 'error',
      message:
        'No MATERIAL/PRODUCT names extracted from STEP. Prefer exporting a materials-tagged BOM (CSV/JSON) from CAD.',
    });
  } else {
    issues.push({
      severity: 'warning',
      message: `STEP assembly import (${fileName}) extracted ${adjacency.length} relationship hint(s) from the part tree. Review them and provide measured clearances or temperatures where available.`,
    });
  }

  return { parts, adjacency, issues };
}

export function importStepAssembly(text: string, fileName = 'assembly.step'): CadImportResult {
  const r = parseStepAssembly(text, fileName);
  return {
    format: 'step',
    nativeCad: true,
    parts: r.parts,
    issues: r.issues,
    adjacency: r.adjacency,
  };
}

export function adjacencyToCsv(edges: AdjacencyEdge[]): string {
  if (!edges.length) return '';
  const lines = ['partA,partB,clearanceMm,relation'];
  for (const e of edges) {
    lines.push(`${e.partA},${e.partB},${e.clearanceMm ?? ''},${e.relation ?? 'unknown'}`);
  }
  return lines.join('\n');
}
