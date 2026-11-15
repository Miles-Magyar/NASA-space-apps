import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { looksLikeGltfWithMesh } from '../part-preview';
import { parseBuildFile } from '../parse-bom';

const panelGltf = readFileSync(
  resolve(__dirname, '../../../../public/samples/sample-habitat-panel.gltf'),
  'utf8',
);

describe('glTF part preview helpers', () => {
  it('detects meshes in the habitat panel sample', () => {
    expect(looksLikeGltfWithMesh(panelGltf)).toBe(true);
  });

  it('rejects materials-only glTF as mesh-bearing', () => {
    expect(
      looksLikeGltfWithMesh(
        JSON.stringify({ asset: { version: '2.0' }, materials: [{ name: 'PMMA' }], nodes: [] }),
      ),
    ).toBe(false);
  });

  it('extracts PMMA/Aluminum/Nomex from the mesh sample for checkBom', () => {
    const r = parseBuildFile(panelGltf, 'sample-habitat-panel.gltf');
    expect(r.format).toBe('gltf');
    const names = r.parts.map((p) => p.material.toLowerCase());
    expect(names.some((n) => n.includes('pmma'))).toBe(true);
    expect(names.some((n) => n.includes('aluminum') || n.includes('aluminium'))).toBe(true);
  });
});
