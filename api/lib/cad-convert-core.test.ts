import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  convertLocally,
  unwrapFixtureDwg,
  wrapDxfAsFixtureDwg,
  CAD_CONVERT_MAX_BYTES,
} from './cad-convert-core';

const sampleDxf = readFileSync(
  resolve(__dirname, '../../public/samples/sample-habitat-cover.dxf'),
  'utf8',
);

describe('cad-convert-core', () => {
  it('passthroughs ASCII DXF', () => {
    const bytes = new TextEncoder().encode(sampleDxf);
    const r = convertLocally('panel.dxf', bytes);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.converter).toBe('passthrough');
      expect(r.dxf).toContain('MATERIAL_PMMA');
    }
  });

  it('unwraps Flame fixture DWG → DXF (CI round-trip)', () => {
    const wrapped = wrapDxfAsFixtureDwg(sampleDxf);
    expect(unwrapFixtureDwg(wrapped)).toContain('MATERIAL_PMMA');
    const r = convertLocally('sample-habitat-cover.fixture.dwg', wrapped);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.converter).toBe('fixture');
      expect(r.formatOut).toBe('dxf');
      expect(r.fileName.endsWith('.dxf')).toBe(true);
      expect(r.dxf).toContain('MATERIAL_Aluminum');
    }
  });

  it('refuses real-looking DWG without upstream', () => {
    const fake = new TextEncoder().encode('AC1027\0BINARY_NOT_A_FIXTURE');
    const r = convertLocally('ship.dwg', fake);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('NO_CONVERTER');
  });

  it('enforces size limit', () => {
    const big = new Uint8Array(CAD_CONVERT_MAX_BYTES + 1);
    big.set(new TextEncoder().encode('AC1032'));
    const r = convertLocally('huge.dwg', big);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('TOO_LARGE');
  });

  it('rejects unsupported proprietary extensions', () => {
    const r = convertLocally('part.sldprt', new TextEncoder().encode('solid'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('UNSUPPORTED');
  });
});
