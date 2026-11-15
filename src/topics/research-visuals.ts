import candleGravityUrl from '../assets/candle-gravity.webp';
import lunarGravityUrl from '../assets/lunar-gravity-candles.webp';
import combustionLabUrl from '../assets/orbital-combustion-lab.webp';
import saffireUrl from '../assets/saffire-flame-spread.webp';

export const RESEARCH_VISUALS = {
  candleComparison: {
    url: candleGravityUrl,
    width: 812,
    height: 650,
    alt: 'A tall yellow candle flame on the left and a round blue flame on the right.',
    caption: 'Candle flames on Earth (left) and in microgravity (right).',
    source: 'https://science.nasa.gov/image-detail/amf-grc-1998-c-00485/',
  },
  combustionLab: {
    url: combustionLabUrl,
    width: 900,
    height: 600,
    alt: 'Astronaut Raja Chari works beside exposed instruments and wiring aboard the ISS.',
    caption: 'Raja Chari replaces ACME hardware in the Combustion Integrated Rack.',
    source: 'https://www.nasa.gov/image-article/astronaut-raja-chari-replaces-combustion-research-hardware/',
  },
  lunarGravity: {
    url: lunarGravityUrl,
    width: 387,
    height: 412,
    alt: 'Three candle flames progress from a round blue flame to taller flames with bright tips.',
    caption: 'Candle flames in microgravity, simulated lunar gravity, and Earth gravity (left to right).',
    source: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/',
  },
  saffire: {
    url: saffireUrl,
    width: 900,
    height: 614,
    alt: 'An edge-on view of a bright flame spreading along a flat sample in the Saffire experiment.',
    caption: 'A flame spreads over an acrylic-like sample aboard Cygnus during Saffire IV.',
    source: 'https://www.nasa.gov/humans-in-space/the-flame-of-discovery-grows-as-saffire-sets-new-fires-in-space/',
  },
} as const;

export type ResearchVisual = (typeof RESEARCH_VISUALS)[keyof typeof RESEARCH_VISUALS];

export function renderResearchVisual(visual: ResearchVisual): string {
  return `<figure class="research-visual">
    <img src="${visual.url}" width="${visual.width}" height="${visual.height}" alt="${visual.alt}" loading="lazy" decoding="async" />
    <figcaption>${visual.caption} <a href="${visual.source}" target="_blank" rel="noopener">NASA image source</a></figcaption>
  </figure>`;
}
