import type { BomPart } from './types';
import { escapeHtml } from './escape';

export interface AssemblyTreeNode {
  part: BomPart;
  children: AssemblyTreeNode[];
}

/** Build a forest of assembly nodes from parentId links. */
export function buildAssemblyForest(parts: BomPart[]): AssemblyTreeNode[] {
  const byId = new Map<string, AssemblyTreeNode>();
  const roots: AssemblyTreeNode[] = [];

  for (const part of parts) {
    const key = part.id ?? `anon-${part.material}-${byId.size}`;
    byId.set(key, { part: { ...part, id: part.id ?? key }, children: [] });
  }

  for (const node of byId.values()) {
    const parentId = node.part.parentId;
    if (parentId && byId.has(parentId) && parentId !== node.part.id) {
      byId.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function renderNode(node: AssemblyTreeNode): string {
  const id = node.part.id ? `<code>${escapeHtml(node.part.id)}</code>` : '';
  const parent = node.part.parentId
    ? ` <span class="muted">← ${escapeHtml(node.part.parentId)}</span>`
    : '';
  const heater = node.part.heaterId
    ? ` <span class="cad-tree-tag">heater:${escapeHtml(node.part.heaterId)}</span>`
    : '';
  const kids =
    node.children.length > 0
      ? `<ul>${node.children.map(renderNode).join('')}</ul>`
      : '';
  return `<li><strong>${escapeHtml(node.part.material)}</strong> ${id}${parent}${heater}${kids}</li>`;
}

/**
 * HTML panel showing what was imported (assembly tree or flat list).
 * Analysis source of truth remains the BOM — this is visibility only.
 */
export function renderImportedPartsPreview(
  parts: BomPart[],
  meta?: { format?: string; fileName?: string },
): string {
  if (!parts.length) {
    return `<section class="cad-import-preview" hidden></section>`;
  }

  const forest = buildAssemblyForest(parts);
  const hasTree = parts.some((p) => p.parentId);
  const label = meta?.fileName
    ? `Imported: ${escapeHtml(meta.fileName)}`
    : 'Imported parts';
  const format = meta?.format ? ` · ${escapeHtml(meta.format)}` : '';

  const body = hasTree
    ? `<ul class="cad-assembly-tree">${forest.map(renderNode).join('')}</ul>`
    : `<ul class="cad-assembly-tree cad-assembly-flat">${parts
        .map(
          (p) =>
            `<li><strong>${escapeHtml(p.material)}</strong>${
              p.id ? ` <code>${escapeHtml(p.id)}</code>` : ''
            }</li>`,
        )
        .join('')}</ul>`;

  return `
    <section class="cad-import-preview" aria-label="Imported parts preview">
      <h3>${label}<span class="muted">${format} · ${parts.length} part(s)</span></h3>
      <p class="muted">Structure preview only — flammability still comes from the materials library check below.</p>
      ${body}
    </section>
  `;
}
