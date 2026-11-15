import { RESEARCH_VISUALS, renderResearchVisual } from '../research-visuals';

export interface OverviewSection {
  id: string;
  heading: string;
  /** Compact label for the ChatGPT-style scroll rail */
  shortTitle?: string;
  paragraphs: string[];
  /** HTML snippets with bold linked terms already escaped carefully */
  html?: string;
}

export const OVERVIEW_SECTIONS: OverviewSection[] = [
  {
    id: 'purpose',
    heading: 'What this project is for',
    shortTitle: 'Purpose',
    paragraphs: [],
    html: `<p class="purpose-lede">On Earth, hot air rises and pulls a flame into a teardrop. In freefall it doesn’t — flames become quiet spheres, smoke may not rush to the ceiling, and ordinary materials can burn differently when the air is richer in oxygen.</p>
<p class="purpose-lede">Flame in Freefall turns NASA’s orbit experiments into plain, atmosphere-aware fire-safety guidance for habitats, suits, vehicles, and build materials — with citations you can open, not a black-box risk score.</p>
<p><strong>How to use it</strong></p>
<ol class="purpose-steps">
  <li>Open <strong>Study Topics</strong> (menu, top left) to browse investigations and mission themes.</li>
  <li>Pick a habitat atmosphere, then read the heuristic “best fit” and the evidence table.</li>
  <li>Run the <strong>CAD Checker</strong> on a sample or your own BOM to flag flammability and temperature concerns.</li>
  <li>Ask the <strong>Helpbot</strong> where to find a finding — answers stay grounded in the curated corpus.</li>
</ol>
<div class="purpose-ctas" role="group" aria-label="Start here">
  <a class="cta-btn cta-primary" href="#cad-checker">Open CAD Checker</a>
  <a class="cta-btn" href="#cabin-fire-safety">Cabin Fire Safety</a>
  <a class="cta-btn" href="#investigations">Investigations</a>
  <a class="cta-btn" href="#fuels">Fuels data</a>
</div>
<p class="purpose-note">Scroll onward for the freefall story — Earth flames, orbital labs, and Moon/Mars transfer — or jump straight into a topic above.</p>`,
  },
  {
    id: 'baseline',
    heading: 'The baseline rules of combustion',
    shortTitle: 'Earth flames',
    paragraphs: [
      'On Earth, hot gases rise. Buoyancy stretches a candle into a flickering teardrop, feeds fresh oxygen into the flame base, and carries soot and smoke upward — the same cues firefighters and smoke detectors still rely on.',
      'Combustion itself is chemistry: fuel and oxygen react to release heat. What changes in freefall is not the chemistry, but the transport. Without buoyancy, diffusion and any forced ventilation decide whether a flame lives, spreads, or dies.',
    ],
    html: `<p>On Earth, hot gases rise. Buoyancy stretches a candle into a flickering teardrop, feeds fresh oxygen into the flame base, and carries soot and smoke upward — the same cues firefighters and smoke detectors still rely on.</p>
<p>Combustion itself is chemistry: fuel and oxygen react to release heat. What changes in freefall is not the chemistry, but the transport. Without buoyancy, diffusion and any forced ventilation decide whether a flame lives, spreads, or dies. NASA’s <a href="https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/" target="_blank" rel="noopener">Researcher’s Guide to Combustion Science</a> frames why bench-scale Earth flames often hide the physics that matter for spacecraft.</p>`,
  },
  {
    id: 'microgravity',
    heading: 'When hot air stops rising',
    shortTitle: 'Freefall',
    paragraphs: [],
    html: `<p>In microgravity a candle flame becomes a quiet blue sphere. Oxygen reaches the reaction zone by diffusion; soot may linger inside the flame instead of streaming into a buoyant plume. Extinguishment can look different too — <strong>radiative</strong> and <strong>diffusive</strong> extinction pathways appear in droplet tests such as <a href="#investigations" data-study="flex"><strong>FLEX</strong></a>.</p>
${renderResearchVisual(RESEARCH_VISUALS.candleComparison)}
<p>That shift rewrites fire safety assumptions. Smoke may not race to the ceiling. Materials that barely burn in air on Earth can sustain flames when oxygen rises for lunar habitats or when flow supplies oxidizer in a duct. Spacesuits push the extreme: about <strong>100% O₂ at 4.3 psi</strong>.</p>`,
  },
  {
    id: 'orbit-lab',
    heading: 'A combustion lab in orbit',
    shortTitle: 'Orbit lab',
    paragraphs: [],
    html: `<p>The ISS hosts dedicated combustion facilities: the <a href="https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/science-facilities-on-the-iss/fluids-combustion-facility/" target="_blank" rel="noopener"><strong>Combustion Integrated Rack (CIR)</strong></a> and the Microgravity Science Glovebox. Campaigns include droplet extinguishment (<a href="#investigations" data-study="flex"><strong>FLEX</strong></a>), solid burning and suppression (<a href="#investigations" data-study="bass"><strong>BASS</strong></a>, <a href="#investigations" data-study="sofie"><strong>SoFIE</strong></a>), large-scale spread on Cygnus (<a href="#investigations" data-study="saffire"><strong>Saffire</strong></a>), smoke characterization (<a href="#investigations" data-study="same"><strong>SAME</strong></a>), soot and lifted gas flames (<a href="#investigations" data-study="spice"><strong>SPICE</strong></a>, <a href="#investigations" data-study="slice"><strong>SLICE</strong></a>), and the <a href="#investigations" data-study="acme"><strong>ACME</strong></a> gas-flame suite.</p>
${renderResearchVisual(RESEARCH_VISUALS.combustionLab)}
<p>Browse first-class cards for each campaign in the <a href="#investigations"><strong>Investigations</strong></a> catalog. Results are archived in NASA’s <a href="https://psi.nasa.gov/" target="_blank" rel="noopener">Physical Sciences Informatics (PSI)</a> repository — powerful, but hard to compare across oxygen, pressure, flow, and geometry without a curated layer.</p>`,
  },
  {
    id: 'mission-safety',
    heading: 'Turning physics into mission fire safety',
    shortTitle: 'Mission safety',
    paragraphs: [],
    html: `<p>Exploration atmospheres trade EVA pre-breathe time against flammability: lunar habitat references near <strong>34% O₂ and 8.2 psia</strong> sit between ISS air and EMU pure oxygen. Partial-gravity combustion data remain sparse in PSI — programs like <a href="#investigations" data-study="fm2"><strong>FM2</strong></a> aim to close that gap.</p>
${renderResearchVisual(RESEARCH_VISUALS.lunarGravity)}
<p>This dashboard ranks sourced evidence for the atmosphere you select, summarizes it with SI grounded in the curated corpus, and checks build materials against flash/autoignition and oxygen limits. Start with <a href="#cabin-fire-safety"><strong>Cabin Fire Safety</strong></a> for the end-to-end path, try the <a href="#cad-checker"><strong>CAD Checker</strong></a> demo on sample BOMs, or open <a href="#fuels"><strong>Fuels</strong></a> for the full measurement matrix.</p>`,
  },
  {
    id: 'earth-benefits',
    heading: 'Earth benefits from freefall flames',
    shortTitle: 'Earth benefits',
    paragraphs: [],
    html: `<p>Microgravity fire research feeds terrestrial safety too. Fine-<strong>water-mist</strong> extinguishers matured for the ISS have Earth applications; NASA work has improved <strong>smoke detection</strong> and firefighter gear, including protective clothing and air tanks — pathways called out in the <a href="https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/" target="_blank" rel="noopener">Space Apps challenge brief</a>.</p>
<p>When you read <a href="#investigations" data-study="sofie"><strong>SoFIE-MIST</strong></a> or <a href="#investigations" data-study="same"><strong>SAME</strong></a> on this site, you are also looking at the evidence base behind those spin-offs. Cabin Fire Safety keeps an Earth-benefits evidence row beside the Moon/Mars transfer caveats.</p>`,
  },
];

export const SOFIE_FEATURE = {
  title: 'Featured: Solid Fuel Ignition and Extinction (SoFIE)',
  body: 'SoFIE extends solid-fuel ignition and extinction research in the CIR, including mist suppression (SoFIE-MIST). Pair it with BASS sample-scale burns and Saffire vehicle-scale spread when screening cabin materials.',
  links: [
    { label: 'SoFIE visualization', url: 'https://svs.gsfc.nasa.gov/31394/' },
    { label: 'SoFIE-MIST', url: 'https://science.nasa.gov/biological-physical/investigations/sofie-mist/' },
    { label: 'Investigations catalog', url: '#investigations' },
    { label: 'NASA PSI', url: 'https://psi.nasa.gov/' },
  ],
};
