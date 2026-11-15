# Flame BOM export (Phase 3 scaffold)

Target interchange for SOLIDWORKS / Inventor / CATIA / NX / Creo: a materials-tagged JSON BOM the CAD Checker already understands — **not** a full proprietary kernel.

## Schema (JSON array)

Each part object:

| Field | Required | Notes |
| --- | --- | --- |
| `material` | **yes** | Library match key (e.g. `PMMA`, `Aluminum`) |
| `id` | recommended | Stable part id for adjacency / tree |
| `parentId` | assembly | Parent part `id` for STEP-like trees |
| `zone` | recommended | `cabin` \| `eva-suit` \| `propellant-bay` |
| `heaterId` | optional | Catalog id (`avionics-bay`, …) |
| `maxExpectedTempC` | optional | Expected surface temp (°C) |
| `nearbyFuel` | optional | Fuel name for flash/AIT checks |
| `mass` / `area` | optional | Numeric |

Machine-readable copy: `schemas/flame-bom.schema.json`.

## Export from CAD Checker

Import a STEP assembly, tagged drawing, glTF/GLB, or BOM. After a successful check, choose **Download Flame BOM JSON** to save the normalized input part list. The export preserves part IDs, parent IDs, and explicit material and thermal fields. The separate results downloads contain screening flags and citations. To reproduce a check, select the same atmosphere and reapply any custom adjacency file or session-wide heater preset.

## Vendor export recipes (manual today)

1. **SOLIDWORKS** — Save As STEP *or* export BOM table → CSV, then map columns to Flame JSON (see sample `public/samples/sample-sw-habitat-assy.bom.json`).
2. **Inventor / CATIA / NX / Creo** — Prefer STEP (PRODUCT/NAUO) or BOM CSV → same JSON schema.
3. **Visualization** — Optional glTF/GLB alongside the BOM for mesh preview (materials names should align).

## Validate locally

```bash
node tools/flame-bom-validate.mjs public/samples/sample-sw-habitat-assy.bom.json
```

## Later (licensed)

Desktop add-in or PDM hook that writes this schema directly (`material`, `zone`, `heaterId`, `parentId`, …).
