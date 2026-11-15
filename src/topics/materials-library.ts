import type { SourceLink } from './mission-types.js';

/** Bump when library rows or schema fields change in a material way. */
export const MATERIALS_LIBRARY_VERSION = '2026.11.14-cad-2';
export const MATERIALS_LIBRARY_UPDATED_AT = '2026-11-14';

/** Primary citation host patterns accepted for CAD library provenance. */
export const PROVENANCE_HOST_RE =
  /ntrs\.nasa\.gov|nasa\.gov|psi\.nasa\.gov|pnnl\.gov|chemicalsafety\.ilo\.org/i;

export interface TempBand {
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
  note?: string;
}

export interface MaterialLibraryEntry {
  id: string;
  name: string;
  aliases: string[];
  category: 'fabric' | 'plastic' | 'metal' | 'composite' | 'elastomer' | 'fuel' | 'other';
  /** Typical CAD / BOM use */
  cadUse: string;
  loiPercent?: { min: number; max: number };
  flashPointC?: number;
  autoignitionC?: number;
  /** Softening / glass transition */
  glassTransitionC?: TempBand;
  /** Heat deflection / Vicat-style softening when distinct from Tg */
  softeningC?: TempBand;
  /** Melting / melt onset (metals: solidus; polymers: melt or flow onset) */
  meltingC?: TempBand;
  /** Onset of significant thermal decomposition / charring */
  decompositionC?: TempBand;
  /** Continuous service temperature (order-of-magnitude) */
  continuousUseC?: TempBand;
  oxygenCompatibility: 'prefer' | 'review' | 'high-concern' | 'unknown';
  /** Whether LOI/O₂ class is backed by a primary study link (vs handbook-only temps). */
  provenance: 'sourced' | 'partial';
  flammabilityNotes: string;
  temperatureDegradationNotes: string;
  notes: string;
  sources: SourceLink[];
}

function band(value: number, note?: string, unit = '°C'): TempBand {
  return { value, unit, note };
}

function bandRange(min: number, max: number, note?: string, unit = '°C'): TempBand {
  return { min, max, unit, note };
}

/** Curated CAD/BOM materials with temperature degradation + flammability from cited sources. */
export const MATERIALS_LIBRARY: MaterialLibraryEntry[] = [
  {
    id: 'pmma',
    name: 'PMMA (acrylic)',
    aliases: ['acrylic', 'plexiglas', 'plexiglass', 'perspex', 'polymethyl methacrylate'],
    category: 'plastic',
    cadUse: 'Windows, covers, fixtures, clear enclosures',
    loiPercent: { min: 16.5, max: 18.5 },
    autoignitionC: 280,
    glassTransitionC: band(105, 'Typical cast/extruded PMMA Tg order'),
    softeningC: band(90, 'Vicat softening order'),
    meltingC: band(180, 'Melt / flow onset order (amorph. polymer)'),
    decompositionC: band(360, 'Thermal decomposition order'),
    continuousUseC: band(70, 'Typical continuous-use ceiling well below Tg'),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes:
      'LOI ~17%; BASS burned acrylic spheres near 17% O₂ with forced flow. High concern for exploration O₂ habitats.',
    temperatureDegradationNotes:
      'Softens near 90–110°C long before flaming; drips/transfer of burning debris is a NASA-STD-6001 concern for plastics.',
    notes: 'Primary µg solid surrogate in BASS/SoFIE literature.',
    sources: [
      { label: 'BASS-II (NTRS)', url: 'https://ntrs.nasa.gov/citations/20210011385' },
      { label: 'PMMA sphere extinction (NTRS)', url: 'https://ntrs.nasa.gov/citations/20240007628' },
      { label: 'PNNL PMMA ignition', url: 'https://www.pnnl.gov/main/publications/external/technical_reports/PNNL-21490.pdf' },
    ],
  },
  {
    id: 'abs',
    name: 'ABS',
    aliases: ['abs plastic', 'acrylonitrile butadiene styrene'],
    category: 'plastic',
    cadUse: 'Housings, brackets, consumer-grade 3D-print parts',
    loiPercent: { min: 18, max: 19 },
    autoignitionC: 466,
    glassTransitionC: bandRange(95, 110, 'Grade-dependent Tg'),
    softeningC: band(90, 'Softens near 100°C order'),
    meltingC: band(200, 'Processing / flow temperature order — not a sharp melt'),
    decompositionC: band(350, 'Oxidative degradation onset order'),
    continuousUseC: band(70),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'LOI near air; NASA aircraft-interior thermoplastics assessments flag ABS-class flammability/smoke.',
    temperatureDegradationNotes: 'Loses structural integrity well below autoignition; soft parts near heaters are ignition precursors.',
    notes: 'Poor candidate for elevated-O₂ habitats without justification.',
    sources: [
      { label: 'NASA thermoplastics flammability (NTRS)', url: 'https://ntrs.nasa.gov/citations/19780065784' },
      { label: 'Exploration atmosphere', url: 'https://ntrs.nasa.gov/citations/20240003211' },
    ],
  },
  {
    id: 'polyethylene',
    name: 'Polyethylene (PE/HDPE)',
    aliases: ['pe', 'hdpe', 'ldpe', 'polythene'],
    category: 'plastic',
    cadUse: 'Packaging, tubing, low-load covers',
    loiPercent: { min: 17, max: 18 },
    flashPointC: 341,
    meltingC: bandRange(105, 135, 'HDPE melt range order; LDPE lower'),
    softeningC: band(80, 'Softens approaching melt'),
    decompositionC: band(350, 'Thermal degradation order'),
    continuousUseC: band(60),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'LOI near or below exploration O₂ targets; melts and drips when burning.',
    temperatureDegradationNotes: 'Melts early (~110–130°C HDPE); melted polymer can pool or transfer flame.',
    notes: 'Common packaging plastic in BOMs.',
    sources: [
      {
        label: 'NASA FM2 program',
        url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/',
      },
      { label: 'NASA thermoplastics flammability (NTRS)', url: 'https://ntrs.nasa.gov/citations/19780065784' },
    ],
  },
  {
    id: 'polycarbonate',
    name: 'Polycarbonate (PC)',
    aliases: ['pc', 'lexan', 'makrolon'],
    category: 'plastic',
    cadUse: 'Transparent covers, electronics housings',
    loiPercent: { min: 24, max: 28 },
    glassTransitionC: band(145, 'Bisphenol-A PC Tg order'),
    softeningC: band(130, 'HDT order under load'),
    meltingC: band(225, 'Processing melt order'),
    decompositionC: band(400, 'Degradation order'),
    continuousUseC: band(115),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes:
      'Better LOI than PMMA/ABS but still far below PTFE; included in NASA thermoplastic flammability surveys for interiors.',
    temperatureDegradationNotes: 'Softens under load well below melt; char/smoke behavior matters for SAME-style detection.',
    notes: 'Review specimen-specific NASA-STD-6001 results before cabin use.',
    sources: [
      { label: 'NASA thermoplastics flammability (NTRS)', url: 'https://ntrs.nasa.gov/citations/19780065784' },
      { label: 'Exploration atmosphere', url: 'https://ntrs.nasa.gov/citations/20240003211' },
    ],
  },
  {
    id: 'nylon',
    name: 'Nylon (polyamide)',
    aliases: ['pa6', 'pa66', 'polyamide', 'zytel'],
    category: 'plastic',
    cadUse: 'Fasteners, gears, cable ties, 3D-print structural parts',
    loiPercent: { min: 20, max: 25 },
    meltingC: bandRange(215, 265, 'PA6 ~220°C; PA66 ~260°C order'),
    glassTransitionC: bandRange(40, 70, 'Dry vs conditioned Tg'),
    decompositionC: band(350),
    continuousUseC: band(80),
    autoignitionC: 420,
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes:
      'Zytel-class polyamides show strong AIT drop with rising O₂ in NASA White Sands enriched-oxygen ignition studies.',
    temperatureDegradationNotes: 'Melts and drips; moisture plasticizes and lowers use temperature.',
    notes: 'Treat as high-concern near heaters and in ≥30% O₂ cabins.',
    sources: [
      { label: 'NASA O₂ concentration ignition study (NTRS)', url: 'https://ntrs.nasa.gov/citations/20090001157' },
      { label: 'ASTM G63 context in NASA O₂ paper', url: 'https://ntrs.nasa.gov/citations/20090001157' },
    ],
  },
  {
    id: 'ptfe',
    name: 'PTFE (Teflon)',
    aliases: ['teflon', 'fluoropolymer'],
    category: 'plastic',
    cadUse: 'Seals, insulation, oxygen-system soft goods',
    loiPercent: { min: 95, max: 100 },
    meltingC: band(327, 'ASTM melt temperature'),
    continuousUseC: band(260, 'Typical max continuous service'),
    softeningC: bandRange(50, 60, 'HDT @ high load is low despite high melt'),
    decompositionC: band(400, 'Significant decomposition well above continuous use'),
    oxygenCompatibility: 'prefer',
    provenance: 'sourced',
    flammabilityNotes:
      'LOI >95%; preferred oxygen-service polymer class per ASTM G63 guidance cited by NASA — still ignitable by pneumatic impact in 100% O₂ at high pressure.',
    temperatureDegradationNotes:
      'High melt (~327°C) and continuous use (~260°C), but impact/compression ignition dominates O₂-system risk over LOI.',
    notes: 'Prefer only when impact-qualified for the O₂ service.',
    sources: [
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
      { label: 'NASA O₂ concentration ignition study', url: 'https://ntrs.nasa.gov/citations/20090001157' },
      { label: 'NASA textile O₂ flammability chart', url: 'https://ntrs.nasa.gov/citations/20170008880' },
    ],
  },
  {
    id: 'vespel',
    name: 'Vespel (polyimide)',
    aliases: ['sp-21', 'polyimide stock'],
    category: 'plastic',
    cadUse: 'High-temp bushings, O₂-system wear parts',
    loiPercent: { min: 40, max: 55 },
    continuousUseC: band(260, 'Typical continuous dry use order'),
    glassTransitionC: band(360, 'Very high Tg order for polyimides'),
    decompositionC: band(500, 'Char-forming high-temp polymer'),
    oxygenCompatibility: 'review',
    provenance: 'sourced',
    flammabilityNotes:
      'Included in NASA White Sands nonmetallic O₂ ignition matrix; better than commodity plastics but not automatic pass at 100% O₂.',
    temperatureDegradationNotes: 'Maintains strength far above cabin heater temps; still qualify for pneumatic impact in enriched O₂.',
    notes: 'Review grade-specific AIT / impact data.',
    sources: [
      { label: 'NASA O₂ concentration ignition study', url: 'https://ntrs.nasa.gov/citations/20090001157' },
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
    ],
  },
  {
    id: 'kapton',
    name: 'Kapton (polyimide film)',
    aliases: ['polyimide film', 'pi film'],
    category: 'plastic',
    cadUse: 'Wire insulation, flexible circuits, MLI layers',
    loiPercent: { min: 35, max: 45 },
    continuousUseC: band(400, 'Film continuous-use order (grade-dependent)'),
    glassTransitionC: band(360),
    decompositionC: band(500),
    oxygenCompatibility: 'review',
    provenance: 'sourced',
    flammabilityNotes: 'Better than commodity films; still requires NASA-STD-6001 screening for the specific layup.',
    temperatureDegradationNotes: 'Excellent thermal stability vs PE/PVC films; degradation is char-forming rather than low-temp melt drip.',
    notes: 'Common in spacecraft harness BOMs.',
    sources: [
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
      { label: 'NASA thermoplastics / polymer surveys', url: 'https://ntrs.nasa.gov/citations/19780065784' },
    ],
  },
  {
    id: 'epoxy',
    name: 'Epoxy resin / FR-4 matrix',
    aliases: ['epoxy', 'fr4', 'fr-4', 'pcb', 'circuit board'],
    category: 'composite',
    cadUse: 'Circuit boards, bonded joints, composite matrices',
    loiPercent: { min: 20, max: 30 },
    glassTransitionC: bandRange(120, 180, 'Cured epoxy Tg strongly cure/grade dependent'),
    decompositionC: band(300, 'Onset of significant pyrolysis order'),
    continuousUseC: band(105),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'Organic matrix boards can ignite and produce smoke; treat electronics overheat as SAME-relevant smoke source.',
    temperatureDegradationNotes: 'Above Tg the laminate softens; char/pyrolysis gases drive detection and toxicity concerns.',
    notes: 'Map PCB materials explicitly in CAD/BOM exports.',
    sources: [
      { label: 'SAME / fire safety overview', url: 'https://www.nasa.gov/missions/station/studying-combustion-and-fire-safety/' },
      { label: 'NASA thermoplastics flammability (NTRS)', url: 'https://ntrs.nasa.gov/citations/19780065784' },
    ],
  },
  {
    id: 'silicone',
    name: 'Silicone elastomer',
    aliases: ['silicone rubber', 'vmq'],
    category: 'elastomer',
    cadUse: 'Gaskets, soft seals, vibration mounts',
    loiPercent: { min: 20, max: 30 },
    continuousUseC: band(200, 'Typical silicone continuous use'),
    decompositionC: band(350),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes:
      'NASA White Sands tested silicone among nonmetallics — AIT and pneumatic impact worsen as O₂ rises toward 100%.',
    temperatureDegradationNotes: 'Flexible at cabin temps; degradation produces silica ash and volatiles rather than a sharp melt pool.',
    notes: 'Do not assume “rubber = oxygen safe.”',
    sources: [
      { label: 'NASA O₂ concentration ignition study', url: 'https://ntrs.nasa.gov/citations/20090001157' },
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
    ],
  },
  {
    id: 'viton',
    name: 'Viton (FKM)',
    aliases: ['fkm', 'fluoroelastomer'],
    category: 'elastomer',
    cadUse: 'O-rings, fuel/oxidizer seals',
    loiPercent: { min: 40, max: 60 },
    continuousUseC: band(200),
    decompositionC: band(400),
    oxygenCompatibility: 'review',
    provenance: 'sourced',
    flammabilityNotes: 'Better oxygen-service candidate than Buna-N/silicone in NASA ignition matrices; still impact-test for the duty.',
    temperatureDegradationNotes: 'Holds sealing force at elevated temp better than commodity rubbers; chemical attack can precede thermal failure.',
    notes: 'Grade-specific oxygen-service data required.',
    sources: [
      { label: 'NASA O₂ concentration ignition study', url: 'https://ntrs.nasa.gov/citations/20090001157' },
      { label: 'ASTM G63 via NASA study', url: 'https://ntrs.nasa.gov/citations/20090001157' },
    ],
  },
  {
    id: 'buna-n',
    name: 'Buna-N (NBR)',
    aliases: ['nbr', 'nitrile', 'nitrile rubber'],
    category: 'elastomer',
    cadUse: 'General-purpose O-rings (often unsuitable for O₂)',
    loiPercent: { min: 18, max: 22 },
    continuousUseC: band(100),
    decompositionC: band(250),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'Among the poorer nonmetallics in NASA enriched-O₂ AIT / impact testing.',
    temperatureDegradationNotes: 'Hardens/cracks with heat and age; not for oxygen service.',
    notes: 'Flag immediately in CAD O₂-wetted zones.',
    sources: [
      { label: 'NASA O₂ concentration ignition study', url: 'https://ntrs.nasa.gov/citations/20090001157' },
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
    ],
  },
  {
    id: 'nomex',
    name: 'Nomex',
    aliases: ['aramid', 'meta-aramid'],
    category: 'fabric',
    cadUse: 'Crew garments, barriers, soft insulation',
    loiPercent: { min: 26, max: 32 },
    softeningC: band(350, 'Does not melt like thermoplastics; softens/chars at high T'),
    decompositionC: band(400, 'Char-forming aramid'),
    continuousUseC: band(200),
    oxygenCompatibility: 'review',
    provenance: 'sourced',
    flammabilityNotes:
      'LOI ~31% — passes Earth and ~30% O₂ clothing charts but may fail future >34% O₂ spacecraft atmospheres (NASA textile O₂ chart).',
    temperatureDegradationNotes: 'Chars rather than melt-drips; still verify finish/weave under NASA-STD-6001 Test 1.',
    notes: 'Preferred over untreated cotton for IVA clothing at ISS-like O₂.',
    sources: [
      { label: 'NASA Nomex O₂ limits', url: 'https://ntrs.nasa.gov/citations/20080034883' },
      { label: 'NASA textile O₂ flammability chart', url: 'https://ntrs.nasa.gov/citations/20170008880' },
    ],
  },
  {
    id: 'sibal',
    name: 'SIBAL cotton–fiberglass',
    aliases: ['cotton', 'cotton-fiberglass', 'sibal', 'fiberglass fabric'],
    category: 'fabric',
    cadUse: 'Textile surrogates / composite fabrics in flammability tests',
    loiPercent: { min: 15, max: 21 },
    decompositionC: band(300, 'Cotton fraction chars/pyrolyzes'),
    continuousUseC: band(80),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'Cotton LOI ~19% fails enriched-O₂ clothing charts; BASS used related fabric systems.',
    temperatureDegradationNotes: 'Cellulosic fraction degrades and can smolder; glass fraction does not melt at cabin-relevant temps.',
    notes: 'Borderline under exploration O₂.',
    sources: [
      { label: 'BASS-II', url: 'https://ntrs.nasa.gov/citations/20210011385' },
      { label: 'NASA textile O₂ flammability chart', url: 'https://ntrs.nasa.gov/citations/20170008880' },
    ],
  },
  {
    id: 'fiberglass',
    name: 'Fiberglass (E-glass)',
    aliases: ['glass fiber', 'e-glass', 'glass cloth'],
    category: 'composite',
    cadUse: 'Insulation, composite reinforcement',
    loiPercent: { min: 95, max: 100 },
    meltingC: bandRange(1100, 1200, 'E-glass softening/melt order'),
    continuousUseC: band(400),
    oxygenCompatibility: 'prefer',
    provenance: 'sourced',
    flammabilityNotes: 'LOI ~100% on NASA textile chart; binders/resins dominate flammability of finished cloth.',
    temperatureDegradationNotes: 'Glass itself is thermally stable at cabin temps; sizing/resin is the weak link.',
    notes: 'Always specify binder/resin in the BOM.',
    sources: [
      { label: 'NASA textile O₂ flammability chart', url: 'https://ntrs.nasa.gov/citations/20170008880' },
    ],
  },
  {
    id: 'aluminum',
    name: 'Aluminum (6061/7075 class)',
    aliases: ['al', 'aluminium', '6061', '7075'],
    category: 'metal',
    cadUse: 'Structure, panels, heat sinks',
    meltingC: band(660, 'Pure Al melt; alloys near 500–650°C solidus'),
    continuousUseC: band(150, 'Structural allowables often limit use far below melt'),
    oxygenCompatibility: 'review',
    provenance: 'sourced',
    flammabilityNotes:
      'Not ranked by LOI; oxygen-system risk is particulate/impact promoted ignition, not melting in cabin air.',
    temperatureDegradationNotes: 'Strength drops with temperature long before melt; molten Al is an extreme fault, not a normal heater scenario.',
    notes: 'Control chips/debris in O₂ systems.',
    sources: [
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
    ],
  },
  {
    id: 'stainless-steel',
    name: 'Stainless steel (304/316)',
    aliases: ['ss304', 'ss316', '304ss', '316ss', 'steel'],
    category: 'metal',
    cadUse: 'Oxygen lines, fasteners, structure',
    meltingC: bandRange(1375, 1450, '304/316 solidus–liquidus order'),
    continuousUseC: band(500, 'Depends on grade and load'),
    oxygenCompatibility: 'prefer',
    provenance: 'sourced',
    flammabilityNotes: 'Preferred for many oxygen-service components when designed to oxygen-compatibility standards.',
    temperatureDegradationNotes: 'No cabin-relevant melt risk; oxidation and ignition of contaminants on surfaces matter more.',
    notes: 'Still design against particle impact in high-pressure O₂.',
    sources: [
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
    ],
  },
  {
    id: 'titanium',
    name: 'Titanium',
    aliases: ['ti', 'ti-6al-4v', 'titanium alloy'],
    category: 'metal',
    cadUse: 'Lightweight structure, fasteners',
    meltingC: bandRange(1600, 1660, 'Alloy solidus order'),
    continuousUseC: band(400),
    oxygenCompatibility: 'review',
    provenance: 'sourced',
    flammabilityNotes: 'Can sustain metal fire in high-pressure oxygen under promoted ignition — specialist O₂-system review required.',
    temperatureDegradationNotes: 'High melt point; ignition risk is oxygen-system specific, not cabin heater melt.',
    notes: 'Do not treat as automatically safer than steel in O₂ service.',
    sources: [
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
    ],
  },
  {
    id: 'copper',
    name: 'Copper',
    aliases: ['cu', 'copper alloy'],
    category: 'metal',
    cadUse: 'Electrical bus bars, heat conductors',
    meltingC: band(1085),
    continuousUseC: band(200),
    oxygenCompatibility: 'review',
    provenance: 'sourced',
    flammabilityNotes: 'Electrical fault energy can ignite nearby nonmetallics even when copper itself does not “burn” in cabin air.',
    temperatureDegradationNotes: 'Softens and oxidizes with heat; insulation on copper wires is usually the flammability driver.',
    notes: 'Pair with wire-insulation material rows in BOMs. Melting point is handbook-order; O₂ class remains review pending system-specific testing.',
    sources: [
      { label: 'NASA oxygen compatibility', url: 'https://ntrs.nasa.gov/citations/20070016582' },
      { label: 'SAME / fire safety overview', url: 'https://www.nasa.gov/missions/station/studying-combustion-and-fire-safety/' },
    ],
  },
  {
    id: 'n-heptane',
    name: 'n-Heptane',
    aliases: ['heptane'],
    category: 'fuel',
    cadUse: 'Not a structure material — FLEX liquid surrogate near heat sources',
    flashPointC: -4,
    autoignitionC: 204,
    meltingC: band(-91, 'Freezing point order'),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'FLEX droplet surrogate; low flash point.',
    temperatureDegradationNotes: 'Volatile liquid — vapor flammability dominates over solid degradation.',
    notes: 'Use for nearbyFuel CAD checks.',
    sources: [{ label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' }],
  },
  {
    id: 'methanol',
    name: 'Methanol',
    aliases: ['methyl alcohol', 'meoh'],
    category: 'fuel',
    cadUse: 'FLEX alcohol surrogate',
    flashPointC: 11,
    autoignitionC: 385,
    meltingC: band(-98),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'FLEX alcohol surrogate.',
    temperatureDegradationNotes: 'Volatile; flash hazard near warm surfaces.',
    notes: 'Use for nearbyFuel CAD checks.',
    sources: [{ label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' }],
  },
  {
    id: 'methane',
    name: 'Methane',
    aliases: ['ch4', 'lng', 'liquid methane'],
    category: 'fuel',
    cadUse: 'Propellant / leak scenario reference',
    autoignitionC: 537,
    meltingC: band(-182, 'Cryogenic melt/freeze'),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'Gas LOC ~12% O₂ order; cryogenic liquid methane is a separate storage hazard.',
    temperatureDegradationNotes: 'Boil-off creates flammable vapor clouds — CFM/leak framing.',
    notes: 'Keep gas vs liquid rows distinct in analysis.',
    sources: [{ label: 'SLICE', url: 'https://ntrs.nasa.gov/citations/20140017780' }],
  },
  {
    id: 'hydrogen',
    name: 'Hydrogen',
    aliases: ['h2', 'lh2', 'liquid hydrogen'],
    category: 'fuel',
    cadUse: 'Cryogenic propellant leak/boil-off',
    autoignitionC: 500,
    meltingC: band(-259),
    oxygenCompatibility: 'high-concern',
    provenance: 'sourced',
    flammabilityNotes: 'Wide vapor flammability envelope once boiled off.',
    temperatureDegradationNotes: 'Extreme cryogen — warming to ambient creates large flammable volumes.',
    notes: 'Storage fire thinking, not cabin LOI.',
    sources: [
      { label: 'ILO hydrogen', url: 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0001&p_lang=en' },
    ],
  },
];

export function formatTempBand(t?: TempBand): string {
  if (!t) return '—';
  const unit = t.unit ?? '°C';
  if (t.value != null) return `${t.value} ${unit}`;
  if (t.min != null && t.max != null) return `${t.min}–${t.max} ${unit}`;
  if (t.min != null) return `≥ ${t.min} ${unit}`;
  if (t.max != null) return `≤ ${t.max} ${unit}`;
  return '—';
}

/** Structural / soft CAD materials (excludes pure fuel rows by default). */
export function cadMaterialsLibrary(): MaterialLibraryEntry[] {
  return MATERIALS_LIBRARY.filter((m) => m.category !== 'fuel');
}

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
