# Native CAD parts analysis — assembly plan

Status: **Phase 2 done; mesh preview + upstream worker in progress.**

## Goal

Accept real engineering part/assembly files and produce the same materials-tagged BOM the CAD Checker already ranks — without claiming a full SolidWorks/CATIA kernel in the browser.

## Format matrix

| Format | Vendor | Browser-native today | Near-term path | Later / licensed |
| --- | --- | --- | --- | --- |
| `.dxf` | AutoCAD exchange | **Yes** — ASCII layer/block/text extract | Enrich with `MATERIAL` attributes | — |
| `.dwg` | AutoCAD | Fixture + `/api/cad-convert`; upstream worker scaffold | Point `CAD_CONVERT_UPSTREAM` at LibreDWG/ODA CLI worker | ODA Drawings SDK |
| `.step` / `.stp` | Interchange hub | **Yes** — PRODUCT + NAUO + AP214 definition chains | Real vendor dumps | — |
| `.gltf` | Interchange / viz | Materials → BOM + **mesh preview** (three.js) | `.glb` binary support | — |
| `.sldprt` / `.sldasm` | SOLIDWORKS | Detect + stem fallback | Export STEP/glTF/BOM | Full SW API |
| `.ipt` / `.iam` | Inventor | Detect + stem fallback | STEP/BOM export | Autodesk Platform Services |
| `.catpart` / `.catproduct` | CATIA | Detect + stem fallback | STEP/BOM export | Dassault APIs |
| `.prt` / `.asm` | NX or Creo | Detect + stem fallback | STEP/BOM export | Licensed toolkits |

**Non-goal:** inventing materials. Preview and converters never invent flammability data.

## Phased delivery

### Phase 0–2 — done

- DXF, proprietary detect, DWG convert API + fixture, STEP assemblies + AP214, tree preview, convert rate limit

### This change — mesh preview + DWG upstream worker

- **glTF mesh preview** in CAD Checker (`part-preview.ts` + three.js); procedural boxes when no mesh
- Sample `public/samples/sample-habitat-panel.gltf` + guided demo
- **Upstream worker**: `tools/cad-convert-upstream/` (`npm run cad-convert:upstream`) for `CAD_CONVERT_UPSTREAM`, optional `CAD_CONVERT_BIN=dwg2dxf`

### Still open

- [ ] Install/wire real LibreDWG or ODA binary in staging (`CAD_CONVERT_BIN`)
- [ ] Binary `.glb` support
- [ ] CAD Checker visual chrome pass (tool UI polish)
- [ ] Phase 3 licensed exporters (Flame BOM JSON from SW/Inventor/CATIA/NX)

## Future UX

1. CAD Checker chrome polish (not start-page — keep separate from Codex)
2. Orbit controls / section views on mesh preview
3. Phase 3 desktop add-ins

## Success criteria

- [x] DXF / proprietary detect / DWG fixture / STEP parentId+adjacency / tree preview
- [x] glTF mesh preview when meshes present; procedural fallback otherwise
- [x] Documented local upstream worker for real DWG
- [ ] Staging DWG round-trip with LibreDWG/ODA
- [ ] Phase 3 exporter prototype
