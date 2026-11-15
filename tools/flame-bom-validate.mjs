#!/usr/bin/env node
/** Lightweight Flame BOM validator (no AJV dependency). */
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node tools/flame-bom-validate.mjs <bom.json>');
  process.exit(2);
}

const ZONES = new Set(['cabin', 'eva-suit', 'propellant-bay']);
const raw = readFileSync(path, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error('JSON parse failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!Array.isArray(data)) {
  console.error('Flame BOM must be a JSON array');
  process.exit(1);
}

const errors = [];
data.forEach((row, i) => {
  if (!row || typeof row !== 'object') {
    errors.push(`[${i}] not an object`);
    return;
  }
  if (!String(row.material || '').trim()) errors.push(`[${i}] missing material`);
  if (row.zone != null && !ZONES.has(String(row.zone))) {
    errors.push(`[${i}] invalid zone “${row.zone}”`);
  }
  for (const n of ['mass', 'area', 'maxExpectedTempC']) {
    if (row[n] != null && !Number.isFinite(Number(row[n]))) {
      errors.push(`[${i}] ${n} must be numeric`);
    }
  }
});

if (errors.length) {
  console.error(`Invalid Flame BOM (${errors.length} issue(s)):`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log(`OK — ${data.length} part(s) in ${path}`);
