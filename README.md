# Flame in Freefall

SI-powered fire safety insights from NASA microgravity combustion data — NASA Space Apps Challenge 2026. site - https://www.starindex.health

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
2. Set `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` in the Vercel server environment. Use the read/write REST token from a shared Upstash Redis database. Keep these values out of `VITE_` variables.
3. Build command: `npm run build`. Output: `dist`.
4. Redeploy after adding the variables. Open Helpbot and ask about Saffire or Nomex to verify a live answer.

Helpbot uses Gemini 3.5 Flash-Lite with up to four previous messages, five server-selected research records, and a 400-token output limit. Shared Redis limits allow six model calls per IP per minute and 250 calls per UTC day across the site. Missing Redis credentials, unavailable quota storage, and exhausted quotas all switch Helpbot to local research results. SI summaries use the local corpus.

Static-only hosting (e.g. Porkbun): upload the contents of `dist/`. Hash routes (`#fuels`, `#cabin-fire-safety`) need no rewrite rules. Live Gemini Helpbot requires the Vercel API routes.

## How SI is used

- **Helpbot** (`POST /api/helpbot`) selects cited mission rows and investigations on the server, then sends those records and the question to Gemini.
- **Topic SI summary** explains the highest-ranked evidence for the selected atmosphere using the local corpus.
- **Client search**: keyword heuristics only (no LLM).
- **Evidence ranking**: oxygen-limit proximity, citation depth, cabin vs propulsion scope, scenario tags.

## Topics

General · **Investigations** · Cabin Fire Safety · Viable Materials · Fuels · Spacesuits · Spacecraft · Engines · Fuel Storage · Rovers

**CAD Checker** (`#cad-checker`) is a dedicated application tab with guided demos and multi-format build intake (`JSON`, `CSV`, `TSV`, `NDJSON`, `XML`, `glTF`/`GLB`, `STEP`), native CAD intake (live **DXF**; **STEP assemblies**; **glTF/GLB mesh preview**; **DWG→DXF** via `/api/cad-convert` + optional `npm run cad-convert:upstream`; detect + export guidance for SOLIDWORKS, Inventor, CATIA, NX/Creo), heater presets, adjacency flags, and cited report export. See `docs/CAD_NATIVE_PARTS_PLAN.md`, `docs/FLAME_BOM_EXPORT.md`, and `docs/CAD_FIRE_VULNERABILITY_PLAN.md`. **Viable Materials** hosts the temperature-degradation compilation and analysis plan.

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
