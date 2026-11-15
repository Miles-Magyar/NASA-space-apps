#!/usr/bin/env node
import http from 'node:http';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const host = process.env.CAD_CONVERT_UPSTREAM_HOST || '127.0.0.1';
const port = Number(process.env.CAD_CONVERT_UPSTREAM_PORT || 8787);
const token = process.env.CAD_CONVERT_UPSTREAM_TOKEN;
const converter = process.env.CAD_CONVERT_BIN?.trim();
const fixtureMarker = Buffer.from('AC1032\0FLAME_DXF_V1\n');
const maxFileBytes = 3 * 1024 * 1024;
const maxDxfBytes = 3 * 1024 * 1024;
const maxBodyBytes = Math.ceil(maxFileBytes * 4 / 3) + 1024;
const asciiDxf = /^\s*0[ \t]*\r?\nSECTION[ \t]*\r?$/im;
let converting = false;

if (!['127.0.0.1', '::1', 'localhost'].includes(host) && !token) {
  throw new Error('Set CAD_CONVERT_UPSTREAM_TOKEN before binding the converter to a non-loopback address.');
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  if (!token) return true;
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(req.headers.authorization ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function convertWithBin(bytes) {
  const dir = await mkdtemp(join(tmpdir(), 'flame-cad-'));
  const input = join(dir, 'input.dwg');
  const output = join(dir, 'output.dxf');
  try {
    await writeFile(input, bytes);
    await new Promise((resolve, reject) => {
      const child = spawn(converter, ['-o', output, input], {
        cwd: dir, shell: false, stdio: 'ignore', windowsHide: true,
      });
      const timeout = setTimeout(() => child.kill('SIGKILL'), 12_000);
      child.once('error', reject);
      child.once('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error('DWG conversion failed'));
      });
    });
    if ((await stat(output)).size > maxDxfBytes) throw new Error('DXF exceeds output limit');
    const dxf = await readFile(output, 'utf8');
    if (!asciiDxf.test(dxf)) throw new Error('Converter did not produce ASCII DXF');
    return dxf;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const server = http.createServer({ requestTimeout: 16_000 }, async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    send(res, 200, { ok: true, bin: Boolean(converter) });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/convert') {
    send(res, 404, { error: 'POST /convert only' });
    return;
  }
  if (!authorized(req)) {
    send(res, 401, { error: 'Unauthorized' });
    return;
  }

  let body;
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > maxBodyBytes) {
        send(res, 413, { error: 'DWG request exceeds the upload limit' });
        req.resume();
        return;
      }
      chunks.push(chunk);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    if (!res.destroyed) send(res, 400, { error: 'Invalid JSON request' });
    return;
  }

  const b64 = body?.contentBase64;
  if (typeof b64 !== 'string' || !b64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) {
    send(res, 400, { error: 'A base64 DWG upload is required' });
    return;
  }
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length > maxFileBytes) {
    send(res, 413, { error: 'DWG exceeds the upload limit' });
    return;
  }
  if (!/^AC10\d{2}$/.test(bytes.toString('ascii', 0, 6))) {
    send(res, 400, { error: 'Upload a valid DWG drawing' });
    return;
  }

  if (bytes.subarray(0, fixtureMarker.length).equals(fixtureMarker)) {
    const dxf = bytes.toString('utf8', fixtureMarker.length);
    if (asciiDxf.test(dxf)) {
      send(res, 200, { dxf, converter: 'fixture' });
      return;
    }
    send(res, 400, { error: 'Invalid DWG fixture' });
    return;
  }
  if (!converter) {
    send(res, 501, { error: 'No native DWG converter is configured' });
    return;
  }
  if (converting) {
    res.setHeader('Retry-After', '5');
    send(res, 503, { error: 'The converter is busy. Try again shortly.' });
    return;
  }

  converting = true;
  try {
    const dxf = await convertWithBin(bytes);
    send(res, 200, { dxf, converter: 'bin' });
  } catch {
    send(res, 502, { error: 'DWG conversion failed. Try exporting ASCII DXF from your CAD tool.' });
  } finally {
    converting = false;
  }
});

server.listen(port, host, () => {
  console.log(`CAD convert upstream listening on ${host}:${server.address().port}`);
});
