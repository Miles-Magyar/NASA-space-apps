#!/usr/bin/env node
/**
 * Local DWG→DXF upstream for CAD_CONVERT_UPSTREAM.
 *
 * Contract (same as /api/cad-convert → upstream):
 *   POST JSON { fileName, contentBase64 } → { dxf, fileName? }
 *
 * Strategies:
 *   1. Flame fixture unwrap (AC10xx + FLAME_DXF_V1)
 *   2. Optional shell: CAD_CONVERT_BIN (e.g. path to dwg2dxf) with temp files
 *   3. Otherwise 501 — plug ODA / LibreDWG here
 *
 * Usage:
 *   node tools/cad-convert-upstream/server.mjs
 *   # then set CAD_CONVERT_UPSTREAM=http://127.0.0.1:8787/convert
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.CAD_CONVERT_UPSTREAM_PORT || 8787);
const FIXTURE_MARKER = 'FLAME_DXF_V1\n';
const MAX = 3 * 1024 * 1024;

function unwrapFixture(buf) {
  const head = buf.subarray(0, 6).toString('ascii');
  if (!/^AC10\d\d/.test(head)) return null;
  const text = buf.toString('utf8');
  const idx = text.indexOf(FIXTURE_MARKER);
  if (idx < 0) return null;
  const dxf = text.slice(idx + FIXTURE_MARKER.length);
  return /^\s*0\s*\r?\nSECTION/im.test(dxf) ? dxf : null;
}

async function convertWithBin(fileName, buf) {
  const bin = process.env.CAD_CONVERT_BIN?.trim();
  if (!bin) return null;
  const dir = await mkdtemp(join(tmpdir(), 'flame-cad-'));
  const inPath = join(dir, fileName || 'in.dwg');
  const outPath = join(dir, 'out.dxf');
  try {
    await writeFile(inPath, buf);
    await new Promise((resolve, reject) => {
      const child = spawn(bin, [inPath, outPath], { stdio: 'inherit', shell: true });
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    });
    return await readFile(outPath, 'utf8');
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function handleConvert(body) {
  const fileName = String(body.fileName || 'upload.dwg');
  const b64 = String(body.contentBase64 || '');
  if (!b64) {
    return { status: 400, json: { error: 'contentBase64 required' } };
  }
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > MAX) {
    return { status: 413, json: { error: 'too large' } };
  }

  const fixture = unwrapFixture(buf);
  if (fixture) {
    return {
      status: 200,
      json: { dxf: fixture, fileName: fileName.replace(/\.dwg$/i, '.dxf'), converter: 'fixture' },
    };
  }

  try {
    const fromBin = await convertWithBin(fileName, buf);
    if (fromBin) {
      return {
        status: 200,
        json: { dxf: fromBin, fileName: fileName.replace(/\.dwg$/i, '.dxf'), converter: 'bin' },
      };
    }
  } catch (err) {
    return {
      status: 502,
      json: { error: `CAD_CONVERT_BIN failed: ${err instanceof Error ? err.message : err}` },
    };
  }

  return {
    status: 501,
    json: {
      error: 'No converter available',
      recommend:
        'Set CAD_CONVERT_BIN to a dwg2dxf (LibreDWG) or ODA CLI, or export ASCII DXF from AutoCAD.',
    },
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, bin: Boolean(process.env.CAD_CONVERT_BIN) }));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/convert') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST /convert only' }));
    return;
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid JSON' }));
    return;
  }

  const result = await handleConvert(body);
  res.writeHead(result.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result.json));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`CAD convert upstream on http://127.0.0.1:${PORT}/convert`);
  console.log(`Set CAD_CONVERT_UPSTREAM=http://127.0.0.1:${PORT}/convert`);
  if (!process.env.CAD_CONVERT_BIN) {
    console.log('Optional: CAD_CONVERT_BIN=/path/to/dwg2dxf for real DWG files');
  }
});
