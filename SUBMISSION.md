# Flame in Freefall — Space Apps submission kit

## One-line pitch

An SI-powered dashboard that ranks and interprets NASA microgravity combustion evidence for Moon/Mars cabin fire safety — with cited PSI/NTRS sources, atmosphere-aware fuels data, and a BOM materials checker.

## Demo script (≈5 minutes)

1. **General** — Scroll the freefall narrative (Earth → µg → orbital lab including SPICE/SLICE → mission safety → Earth benefits). Note the SoFIE feature and Investigations link.
2. **Investigations** — Open FLEX / BASS / Saffire / SAME cards; show PSI links.
3. **Viable Materials** — Open the **temperature degradation & flammability** compilation (PMMA melt/LOI, Nomex, PTFE, metals) and the CAD vulnerability analysis plan.
4. **Cabin Fire Safety** — Switch ISS vs lunar atmosphere; show **Best fit for safety regulations**, triage ranking (try sort modes), and the link into the CAD Checker tab.
5. **CAD Checker** — Open the dedicated demo tab; run **Lunar habitat acrylic**, **EMU soft-goods**, and **Rover cabin** guided scenarios; show pass/review/high-concern/unknown + **Copy/Download unknowns JSON**.
6. **Fuels** — Atmosphere selector → comprehensive table → five plots; point out cabin vs propulsion groups.
7. **Helpbot** — Ask “Saffire flame spread” or “Nomex oxygen limit”; confirm a cited reply (Gemini if `GEMINI_API_KEY` is set; otherwise corpus fallback).

## How SI was used

- **Helpbot** (`POST /api/helpbot`): Gemini answers only from curated mission rows, studies, and overview excerpts; must cite PSI/NTRS/NASA URLs; refuses speculation; states Moon/Mars transfer caveats.
- **Topic SI summary** (`POST /api/summarize`): interprets ranked evidence for the selected atmosphere — not a fabricated numeric risk score.
- **Client search**: keyword heuristics only (no LLM).
- **Ranking / safety-fit**: transparent heuristics (oxygen-limit proximity, citation depth, category). Local corpus fallback keeps demos working without an API key.

## Data provenance

Curated from NASA’s *Researcher’s Guide to Combustion Science* (PDF in `reference-inputs/`), PSI investigations (FLEX PSI-69, Saffire PSI-98, SPICE PSI-107, …), NTRS reports (BASS, Nomex, exploration atmospheres, Saffire IV/V), and linked NOAA/NIOSH/NIST property references. Numbers stay tied to test methods; unreported values show as em dashes. Propulsion rows are labeled outside the PSI cabin-fire core.

## Live URL

- **Local:** `npm run dev` → Vite URL (usually `http://127.0.0.1:5173/`)
- **Production (Vercel):** _add URL after deploy_ — set `GEMINI_API_KEY` in project env

## Judging checklist

- [ ] Helpbot answers a cabin-fire question with a cited PSI/NTRS link
- [ ] Search finds Saffire / Nomex / EMU and navigates correctly
- [ ] Every sidebar topic has real content (no empty state)
- [ ] Cabin Fire Safety shows cross-topic ranked insight for ISS vs lunar
- [ ] CAD/BOM checker flags a material vs fuel-temperature mismatch
- [ ] Unknown materials can be copied/downloaded for the next library pass
- [ ] README + this file describe Gemini SI use and provenance
