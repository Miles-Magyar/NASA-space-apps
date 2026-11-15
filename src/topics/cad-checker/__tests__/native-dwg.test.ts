import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { expect, it } from 'vitest';
import cadConvert from '../../../../api/cad-convert.js';
import { looksLikeDwgBytes, unwrapFixtureDwg, type ConvertResult } from '../../../../api/lib/cad-convert-core.js';
import { scenarioById } from '../../mission-scenarios';
import { checkBom } from '../engine';
import { importDxf } from '../importers/dxf';

const drawingPath = process.env.CAD_SMOKE_DWG;
const deployment = process.env.CAD_SMOKE_API_URL;

async function convert(fileName: string, bytes: Buffer) {
  const body = { fileName, contentBase64: bytes.toString('base64') };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiToken = process.env.CAD_CONVERT_TOKEN;
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  if (deployment) {
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) headers['x-vercel-protection-bypass'] = bypass;
    const response = await fetch(deployment, {
      method: 'POST', headers, body: JSON.stringify(body),
      redirect: 'manual', signal: AbortSignal.timeout(25_000),
    });
    expect(response.headers.get('content-type'), `Expected CAD API JSON, received HTTP ${response.status}`).toContain('application/json');
    return { status: response.status, result: await response.json() as ConvertResult };
  }

  expect(process.env.CAD_CONVERT_UPSTREAM, 'Set the worker URL or CAD_SMOKE_API_URL').toBeTruthy();
  let status = 0;
  let result: ConvertResult | undefined;
  await cadConvert({ method: 'POST', body, headers }, {
    status(code) {
      status = code;
      return { json(value) { result = value as ConvertResult; } };
    },
  });
  return { status, result };
}

it.skipIf(!drawingPath)('checks a native DWG through the CAD API, worker, DXF importer, and materials library', async () => {
  const bytes = await readFile(drawingPath!);
  expect(looksLikeDwgBytes(bytes), 'Use a native DWG drawing').toBe(true);
  expect(unwrapFixtureDwg(bytes), 'The wrapped fixture bypasses the native converter').toBeNull();

  const { status, result } = await convert(basename(drawingPath!), bytes);
  expect(status, result?.ok === false ? `${result.code}: ${result.error}` : 'CAD conversion').toBe(200);
  expect(result?.ok).toBe(true);
  if (!result?.ok) throw new Error('No converted drawing was returned');
  expect(result.converter).toBe('upstream');

  const imported = importDxf(result.dxf, result.fileName);
  expect(imported.parts.length, 'The converted drawing should contain importable candidates').toBeGreaterThan(0);
  const checked = checkBom(imported.parts, scenarioById('lunar')!);
  expect(checked).toHaveLength(imported.parts.length);
  const expectedMaterials = (process.env.CAD_SMOKE_MATERIALS ?? '').split(',').map((name) => name.trim().toLowerCase()).filter(Boolean);
  if (expectedMaterials.length) {
    expect(checked.flatMap((row) => row.matchedMaterial?.toLowerCase() ?? [])).toEqual(expect.arrayContaining(expectedMaterials));
  }
}, 30_000);
