/**
 * CAD Checker regression smoke (Playwright).
 * Usage:
 *   npx vite preview --host 127.0.0.1 --port 4173
 *   npm i -D playwright@1.51.0   # once
 *   node scripts/smoke-cad.mjs
 */
import { chromium } from 'playwright';

const base = process.env.SMOKE_BASE || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(`${base}/#cad-checker`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const demos = await page.locator('.cad-demo-card').count();
const rows = await page.locator('.cad-table tbody tr').count();
const formatsNote = await page.locator('.schema-note').textContent();
const exportJson = page.locator('.cad-export-json');
await expectEnabled(exportJson, 'export JSON enabled after auto-run');

await page.click('.cad-demo-card[data-demo="rover-cabin"]');
await page.waitForTimeout(1000);
const roverRows = await page.locator('.cad-table tbody tr').count();
const adjFlags = await page.locator('.cad-table li', { hasText: 'Adjacency' }).count();

await page.setInputFiles('.cad-file', 'public/samples/sample-bom.csv');
await page.waitForTimeout(200);
await page.click('.cad-run');
await page.waitForTimeout(800);
const csvRows = await page.locator('.cad-table tbody tr').count();
const formatLabel = await page.locator('.cad-results .muted').first().textContent();

console.log({ demos, rows, roverRows, adjFlags, csvRows, formatLabel, formatsNote });

if (demos !== 4 || rows < 4 || roverRows < 5 || csvRows < 4 || !/csv/i.test(formatLabel || '')) {
  console.error('FAIL');
  process.exit(1);
}
console.log('PASS');
await browser.close();

async function expectEnabled(locator, label) {
  const disabled = await locator.isDisabled();
  if (disabled) throw new Error(`${label}: control disabled`);
}
