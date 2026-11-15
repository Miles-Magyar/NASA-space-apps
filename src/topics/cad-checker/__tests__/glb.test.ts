import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeGlb, parseGlbFile } from '../glb';

const glb = readFileSync(
  resolve(__dirname, '../../../../public/samples/sample-habitat-panel.glb'),
);

describe('GLB support', () => {
  it('decodes JSON chunk from sample-habitat-panel.glb', () => {
    const decoded = decodeGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength));
    expect(decoded.json.asset).toBeTruthy();
    const mats = decoded.json.materials as Array<{ name?: string }>;
    expect(mats.some((m) => /pmma/i.test(m.name || ''))).toBe(true);
  });

  it('parseGlbFile yields BomPart materials', () => {
    const copy = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);
    const r = parseGlbFile(copy, 'sample-habitat-panel.glb');
    expect(r.format).toBe('glb');
    expect(r.parts.some((p) => /pmma/i.test(p.material))).toBe(true);
    expect(r.issues.some((i) => i.severity === 'error')).toBe(false);
  });
});
