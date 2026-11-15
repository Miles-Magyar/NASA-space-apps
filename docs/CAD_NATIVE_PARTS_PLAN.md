# Native CAD parts analysis — assembly plan

Status: **Mesh preview + GLB + Phase 3 export scaffold shipping.**

## Goal

Accept real engineering part/assembly files and produce the same materials-tagged BOM the CAD Checker already ranks — without claiming a full SolidWorks/CATIA kernel in the browser.

## Format matrix

| Format | Status |
| --- | --- |
| `.dxf` | Live material/layer extract |
| `.dwg` | Fixture + `/api/cad-convert` + upstream worker (`CAD_CONVERT_BIN`) |
| `.step` / `.stp` | PRODUCT/NAUO/AP214 → `parentId` + adjacency |
| `.gltf` / `.glb` | Materials → BOM + **mesh preview** |
| Proprietary SW/Inventor/CATIA/NX | Detect + export guidance → STEP/Flame BOM |

## Shipped recently

- Assembly tree preview; AP214 STEP; convert rate limit
- glTF mesh preview + procedural fallback; DWG upstream worker
- **GLB** binary parse + preview
- CAD Checker **chrome** (workflow strip + Inputs / Preview / Results panels)
- Phase 3 scaffold: `docs/FLAME_BOM_EXPORT.md`, `schemas/flame-bom.schema.json`, `npm run flame-bom:validate`

## Still open

- [ ] Staging LibreDWG/ODA binary (`CAD_CONVERT_BIN`)
- [ ] OrbitControls / richer mesh UI
- [ ] Licensed desktop add-in writing Flame BOM JSON

## Success criteria

- [x] DXF / STEP / DWG fixture / tree preview / glTF preview / GLB / Flame BOM schema
- [ ] Real DWG upstream in staging
- [ ] Vendor add-in prototype
