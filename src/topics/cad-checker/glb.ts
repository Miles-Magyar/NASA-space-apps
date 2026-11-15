import { normalizePart } from './schema';
import type { BomPart, ParseIssue, ParseBomResult } from './types';

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'
const CHUNK_BIN = 0x004e4942; // 'BIN\0'

export interface GlbParseResult {
  jsonText: string;
  json: Record<string, unknown>;
  bin?: ArrayBuffer;
}

/** Decode a GLB container into JSON (+ optional BIN chunk). */
export function decodeGlb(buffer: ArrayBuffer): GlbParseResult {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12) throw new Error('GLB too short');
  const magic = view.getUint32(0, true);
  if (magic !== GLB_MAGIC) throw new Error('Not a GLB file (missing glTF magic)');
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`Unsupported GLB version ${version} (need 2)`);
  const length = view.getUint32(8, true);
  if (length > buffer.byteLength) throw new Error('GLB length exceeds buffer');

  let offset = 12;
  let jsonText = '';
  let bin: ArrayBuffer | undefined;

  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + chunkLength > buffer.byteLength) throw new Error('GLB chunk truncated');
    const chunk = buffer.slice(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === CHUNK_JSON) {
      jsonText = new TextDecoder().decode(chunk).replace(/\0+$/, '');
    } else if (chunkType === CHUNK_BIN) {
      bin = chunk;
    }
  }

  if (!jsonText) throw new Error('GLB missing JSON chunk');
  const json = JSON.parse(jsonText) as Record<string, unknown>;
  return { jsonText, json, bin };
}

function partsFromGltfJson(json: Record<string, unknown>, issues: ParseIssue[]): BomPart[] {
  const mats = (json.materials as Array<{ name?: string }> | undefined) ?? [];
  const nodes = (json.nodes as Array<{ name?: string }> | undefined) ?? [];
  const parts: BomPart[] = [];

  mats.forEach((mat, i) => {
    const name = mat.name?.trim();
    if (!name) {
      issues.push({ severity: 'warning', message: `glTF/GLB materials[${i}] has no name`, row: i });
      return;
    }
    const part = normalizePart({ id: `gltf-mat-${i}`, material: name, zone: 'cabin' }, i + 1, issues);
    if (part) parts.push(part);
  });

  if (!parts.length && nodes.length) {
    nodes.forEach((n, i) => {
      if (!n.name) return;
      const part = normalizePart({ id: `gltf-node-${i}`, material: n.name, zone: 'cabin' }, i + 1, issues);
      if (part) parts.push(part);
    });
    if (parts.length) {
      issues.push({
        severity: 'warning',
        message: 'Used glTF/GLB node names as material candidates — verify against the materials library',
      });
    }
  }

  return parts;
}

/** Parse binary .glb into BomPart[] (materials/nodes) for checkBom. */
export function parseGlbFile(buffer: ArrayBuffer, fileName = 'model.glb'): ParseBomResult {
  const issues: ParseIssue[] = [];
  try {
    const decoded = decodeGlb(buffer);
    const parts = partsFromGltfJson(decoded.json, issues);
    if (!parts.length) {
      issues.push({
        severity: 'error',
        message: 'GLB has no named materials/nodes to map into the BOM.',
      });
    } else {
      issues.push({
        severity: 'warning',
        message: `GLB import (${fileName}): material/node names only — enrich with BOM fields for temperatures/zones.`,
      });
    }
    return { format: 'glb', parts, issues };
  } catch (err) {
    return {
      format: 'glb',
      parts: [],
      issues: [
        {
          severity: 'error',
          message: `GLB parse failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }
}
