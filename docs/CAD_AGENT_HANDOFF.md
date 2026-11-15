# CAD agent handoff

**Date:** 2026-11-15  
**Repo:** `Miles-Magyar/NASA-space-apps`  
**Default branch:** `main` (CAD work through PR #6 is **merged**)

## Do this now (human / ops)

Nothing blocking from the CAD agent side. Optional:

1. Confirm Vercel deploy of `main` includes CAD Checker mesh preview.
2. If you have LibreDWG/ODA: set staging env and point convert upstream (see below).

## Scope for the next CAD agent

**In scope:** CAD Checker, importers, convert API/worker, Flame BOM export path, mesh preview.  
**Out of scope:** Start-page / hero / Helpbot welcome / mobile intro — Codex owns that (often under `.ui-worktree/`; do not edit that tree for CAD work).  
**Hard rules:** Never invent flammability materials/temps; converters and previews only surface interchange data; ranking stays in `checkBom` + materials library.

## Already done (do not redo)

| Area | Where |
| --- | --- |
| DXF material/layer → BOM | `src/topics/cad-checker/importers/dxf.ts` |
| Proprietary detect + guidance | `importers/proprietary.ts` |
| DWG fixture + `/api/cad-convert` + rate limit | `api/cad-convert.ts`, `api/lib/*` |
| Local upstream worker | `tools/cad-convert-upstream/` (`npm run cad-convert:upstream`) |
| STEP PRODUCT/NAUO/AP214 → `parentId` + adjacency | `importers/step-assembly.ts` |
| Assembly tree preview | `assembly-tree.ts` + mount |
| glTF/GLB mesh preview (three.js) | `part-preview.ts`, `glb.ts` |
| CAD Checker panels chrome | `mount.ts`, CAD sections in `src/styles.css` |
| Flame BOM schema + validator | `docs/FLAME_BOM_EXPORT.md`, `schemas/flame-bom.schema.json`, `npm run flame-bom:validate` |
| Plans | `docs/CAD_NATIVE_PARTS_PLAN.md` |

Merged PRs: #2 (Phase 0), #3 (Phase 1), #4 (CodeQL), #5 (Phase 2), #6 (preview/GLB/export scaffold).

## Next steps (priority order)

### 1. Real DWG in staging (ops + light code)

- Install LibreDWG (`dwg2dxf`) or ODA File Converter CLI on a host reachable from Vercel (or run worker as a long-lived service).
- Env:
  - `CAD_CONVERT_UPSTREAM=https://…/convert`
  - `CAD_CONVERT_UPSTREAM_TOKEN` (if used)
  - On the worker: `CAD_CONVERT_BIN=…`
- Smoke: upload a real `.dwg` in CAD Checker → DXF → `checkBom`.
- Optional: add a CI job that hits the upstream with the fixture DWG only (not a full ODA install in GH Actions unless you containerize it).

### 2. Mesh preview UX polish (CAD-only UI)

- Add `OrbitControls` (or drag-to-orbit) in `part-preview.ts`.
- Better empty/error states when WebGL fails.
- Optional: section/cutaway later — not required for handoff.

### 3. Real vendor STEP fixtures

- Drop anonymized SolidWorks/Inventor/CATIA/NX STEP exports under `public/samples/`.
- Extend tests in `__tests__/step-assembly.test.ts` if NAUO/PD chains differ.
- Keep PII/IP out of the repo.

### 4. Phase 3 exporter prototype

- Follow `docs/FLAME_BOM_EXPORT.md`.
- Smallest useful deliverable: a script or SW macro that writes Flame BOM JSON (`material`, `id`, `parentId`, `zone`, `heaterId`, …) and passes `npm run flame-bom:validate -- path/to/out.json`.
- Full licensed PDM/add-in can wait until the JSON path is proven.

### 5. Nice-to-haves

- Richer CAD Checker chrome (still tool-first; don’t restyle the landing hero).
- Document Vercel env vars in README deploy section if missing.
- Dependabot / pin `three` if bundle size becomes an issue (already dynamically imported).

## How to start a new CAD branch

```bash
git fetch origin main
git checkout -B cursor/cad-<short-topic>-a5a3 origin/main
# work only under src/topics/cad-checker, api/, tools/, docs/CAD_*, schemas/, public/samples/
npm test && npm run check && npm run build
```

Ignore / do not commit: `.ui-worktree/`, `.env` secrets.

## Verify

```bash
npm test
npm run check
npm run build
npm run flame-bom:validate -- public/samples/sample-sw-habitat-assy.bom.json
# optional local DWG upstream:
npm run cad-convert:upstream
# CAD_CONVERT_UPSTREAM=http://127.0.0.1:8787/convert
```

## Key entry points

- UI mount: `src/topics/cad-checker/mount.ts`
- Demos: `src/topics/cad-checker/demo.ts`, `samples.ts`
- Import registry: `src/topics/cad-checker/importers/registry.ts`
- Convert API: `api/cad-convert.ts`
- Plans: `docs/CAD_NATIVE_PARTS_PLAN.md`, this file

## Suggested first ticket for the next agent

**“Wire staging DWG convert + OrbitControls on part preview”** — branch from `main`, no start-page changes, PR with test/check/build green.
