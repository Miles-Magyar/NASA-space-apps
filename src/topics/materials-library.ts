import type { SourceLink } from './mission-types';

export interface MaterialLibraryEntry {
  id: string;
  name: string;
  aliases: string[];
  category: 'fabric' | 'plastic' | 'metal' | 'composite' | 'fuel' | 'other';
  loiPercent?: { min: number; max: number };
  flashPointC?: number;
  autoignitionC?: number;
  oxygenCompatibility: 'prefer' | 'review' | 'high-concern' | 'unknown';
  notes: string;
  sources: SourceLink[];
}

/** Curated lookup for CAD/BOM checker and ranking. */
export const MATERIALS_LIBRARY: MaterialLibraryEntry[] = [
  {
    id: 'pmma',
    name: 'PMMA',
    aliases: ['acrylic', 'plexiglas', 'plexiglass', 'perspex', 'polymethyl methacrylate'],
    category: 'plastic',
    loiPercent: { min: 16.5, max: 18.5 },
    autoignitionC: 280,
    oxygenCompatibility: 'high-concern',
    notes: 'BASS/SoFIE solid surrogate; burns near 17% O₂ in documented µg tests.',
    sources: [
      { label: 'BASS-II', url: 'https://ntrs.nasa.gov/citations/20210011385' },
      { label: 'PMMA extinction', url: 'https://ntrs.nasa.gov/citations/20240007628' },
    ],
  },
  {
    id: 'nomex',
    name: 'Nomex',
    aliases: ['aramid', 'meta-aramid'],
    category: 'fabric',
    loiPercent: { min: 26, max: 32 },
    oxygenCompatibility: 'review',
    notes: 'Higher LOI than commodity plastics; still review under ≥30% O₂ habitats and 100% O₂ suits.',
    sources: [{ label: 'NASA Nomex O₂ limits', url: 'https://ntrs.nasa.gov/citations/20080034883' }],
  },
  {
    id: 'sibal',
    name: 'SIBAL cotton–fiberglass',
    aliases: ['cotton', 'cotton-fiberglass', 'sibal', 'fiberglass fabric'],
    category: 'fabric',
    loiPercent: { min: 15, max: 21 },
    oxygenCompatibility: 'high-concern',
    notes: 'Cabin textile surrogate; elevated O₂ can push borderline LOI fabrics into flammable regimes.',
    sources: [{ label: 'BASS-II', url: 'https://ntrs.nasa.gov/citations/20210011385' }],
  },
  {
    id: 'aluminum',
    name: 'Aluminum',
    aliases: ['al', 'aluminium', '6061', '7075'],
    category: 'metal',
    oxygenCompatibility: 'review',
    notes: 'Structural metal; oxygen-system particulate/impact ignition is the usual concern, not LOI.',
    sources: [{ label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' }],
  },
  {
    id: 'stainless-steel',
    name: 'Stainless steel',
    aliases: ['ss304', 'ss316', '304ss', '316ss', 'steel'],
    category: 'metal',
    oxygenCompatibility: 'prefer',
    notes: 'Preferred for many oxygen-service components when designed to oxygen-compatibility standards.',
    sources: [{ label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' }],
  },
  {
    id: 'ptfe',
    name: 'PTFE',
    aliases: ['teflon', 'fluoropolymer'],
    category: 'plastic',
    loiPercent: { min: 95, max: 100 },
    oxygenCompatibility: 'prefer',
    notes: 'Very high oxygen index; still verify mechanical/impact compatibility in O₂ systems.',
    sources: [{ label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' }],
  },
  {
    id: 'abs',
    name: 'ABS',
    aliases: ['abs plastic', 'acrylonitrile butadiene styrene'],
    category: 'plastic',
    loiPercent: { min: 18, max: 19 },
    autoignitionC: 466,
    oxygenCompatibility: 'high-concern',
    notes: 'Commodity plastic with LOI near air; poor candidate for elevated-O₂ habitats without justification.',
    sources: [{ label: 'Exploration atmosphere', url: 'https://ntrs.nasa.gov/citations/20240003211' }],
  },
  {
    id: 'polyethylene',
    name: 'Polyethylene',
    aliases: ['pe', 'hdpe', 'ldpe'],
    category: 'plastic',
    loiPercent: { min: 17, max: 18 },
    flashPointC: 341,
    oxygenCompatibility: 'high-concern',
    notes: 'Common packaging plastic; LOI near or below exploration O₂ targets.',
    sources: [{ label: 'FM2 program', url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/' }],
  },
  {
    id: 'n-heptane',
    name: 'n-Heptane',
    aliases: ['heptane'],
    category: 'fuel',
    flashPointC: -4,
    autoignitionC: 204,
    oxygenCompatibility: 'high-concern',
    notes: 'FLEX droplet surrogate; low flash point.',
    sources: [{ label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' }],
  },
  {
    id: 'methanol',
    name: 'Methanol',
    aliases: ['methyl alcohol', 'meoh'],
    category: 'fuel',
    flashPointC: 11,
    autoignitionC: 385,
    oxygenCompatibility: 'high-concern',
    notes: 'FLEX alcohol surrogate.',
    sources: [{ label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' }],
  },
  {
    id: 'methane',
    name: 'Methane',
    aliases: ['ch4', 'lng', 'liquid methane'],
    category: 'fuel',
    autoignitionC: 537,
    oxygenCompatibility: 'high-concern',
    notes: 'Gas LOC ~12% O₂ order; cryogenic liquid methane is a separate storage hazard.',
    sources: [{ label: 'SLICE', url: 'https://ntrs.nasa.gov/citations/20140017780' }],
  },
  {
    id: 'hydrogen',
    name: 'Hydrogen',
    aliases: ['h2', 'lh2', 'liquid hydrogen'],
    category: 'fuel',
    autoignitionC: 500,
    oxygenCompatibility: 'high-concern',
    notes: 'Wide vapor flammability envelope once boiled off.',
    sources: [{ label: 'ILO hydrogen', url: 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0001&p_lang=en' }],
  },
];

export function findMaterial(query: string): MaterialLibraryEntry | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return MATERIALS_LIBRARY.find(
    (m) =>
      m.name.toLowerCase() === q ||
      m.id === q ||
      m.aliases.some((a) => a.toLowerCase() === q || q.includes(a.toLowerCase()) || a.toLowerCase().includes(q)),
  );
}
