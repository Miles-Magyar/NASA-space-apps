# Flame in Freefall

SI-powered fire safety insights from NASA microgravity combustion data — NASA Space Apps Challenge 2026.

Interactive dashboard that organizes PSI/NTRS combustion evidence by mission use (cabin materials, fuels, suits, spacecraft, engines, storage, rovers), ranks findings for selected atmospheres, and checks build BOMs against curated flammability limits.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173/`).

```bash
npm run check   # TypeScript
npm run build   # production → dist/
npm run preview # preview dist/
```

## Deploy (Vercel)

1. Import this repo into Vercel.
2. Set environment variable `GEMINI_API_KEY` (server-only; never `VITE_`).
3. Build command: `npm run build`. Output: `dist`.
4. Serverless routes: `api/helpbot.ts`, `api/summarize.ts`.

Without `GEMINI_API_KEY`, Helpbot and SI summary panels use a **local corpus-grounded fallback** so demos still cite PSI/NTRS links.

Static-only hosting (e.g. Porkbun): upload the contents of `dist/`. Hash routes (`#fuels`, `#cabin-fire-safety`) need no rewrite rules. Live Gemini Helpbot requires the Vercel API routes.

## How SI is used

- **Helpbot** (`POST /api/helpbot`): Gemini answers only from curated mission rows, studies, and overview excerpts passed as context; must cite PSI/NTRS/NASA URLs; refuses speculation; states Moon/Mars transfer caveats.
- **Topic SI summary** (`POST /api/summarize`): interprets the transparent heuristic ranking for the selected atmosphere — not a fabricated numeric risk score.
- **Client search**: keyword heuristics only (no LLM).
- **Evidence ranking**: oxygen-limit proximity, citation depth, cabin vs propulsion scope, scenario tags.

## Topics

General · **Investigations** · Cabin Fire Safety · Viable Materials · Fuels · Spacesuits · Spacecraft · Engines · Fuel Storage · Rovers

**CAD Checker** (`#cad-checker`) is a dedicated application tab with guided demos and multi-format build intake (`JSON`, `CSV`, `TSV`, `NDJSON`, `XML`, `glTF`, `STEP`), native CAD intake (live **DXF**; **STEP assemblies**; **glTF mesh preview**; **DWG→DXF** via `/api/cad-convert` + optional `npm run cad-convert:upstream`; detect + export guidance for SOLIDWORKS, Inventor, CATIA, NX/Creo), heater presets, adjacency flags, and cited report export. See `docs/CAD_NATIVE_PARTS_PLAN.md` and `docs/CAD_FIRE_VULNERABILITY_PLAN.md`. **Viable Materials** hosts the temperature-degradation compilation and analysis plan.

```bash
npm test    # Vitest: parse + checkBom + adjacency
npm run check && npm run build
```

## Submission kit

See [`SUBMISSION.md`](SUBMISSION.md) for the demo script, SI-usage statement, provenance blurb, live-URL placeholder, and judging checklist.

## Data provenance

Curated from NASA’s *Researcher’s Guide to Combustion Science* (ISS booklet in `reference-inputs/`), PSI investigations (FLEX, Saffire, SPICE, …), NTRS reports (BASS, Nomex, exploration atmospheres), and linked NOAA/NIOSH/NIST property references. Numbers stay tied to test methods; unreported values show as em dashes.

## Demo script

1. General scroll: Earth → microgravity → orbital lab (incl. SPICE/SLICE) → mission safety → Earth benefits  
2. Investigations catalog: FLEX / BASS / Saffire / SAME cards  
3. Cabin Fire Safety: ISS vs lunar ranking + SI summary + playbooks  
4. Fuels: atmosphere selector, comprehensive table, plots  
5. Helpbot: ask “Saffire” or “Nomex oxygen limit”  
6. BOM checker: load sample, flag PMMA vs lunar O₂, export unknowns JSON  

## License

MIT — see `LICENSE`.
