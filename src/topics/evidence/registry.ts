import type { StudyCard } from '../mission-types';

/** Shared investigation cards reused across topics and Cabin Fire Safety. */
export const INVESTIGATIONS: Record<string, StudyCard> = {
  flex: {
    id: 'flex',
    title: 'Flame Extinguishment Experiment (FLEX)',
    investigation: 'FLEX / FLEX-2',
    summary:
      'Burned heptane and methanol droplets in oxygen–nitrogen mixtures diluted with inert suppressants inside the Combustion Integrated Rack Multi-user Droplet Combustion Apparatus.',
    keyFinding:
      'Reduced-gravity flammability limits were lower than expected from terrestrial inerting standards; radiative and diffusive extinction, cool flames after visible extinction, and suppressant effects were documented.',
    openQuestion:
      'How should inert-gas suppressant margins be revised for lunar/Mars cabin atmospheres with elevated oxygen?',
    facility: 'CIR / MDCA',
    sources: [
      { label: 'NASA PSI FLEX (PSI-69)', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' },
      { label: 'FLEX run table (NTRS)', url: 'https://ntrs.nasa.gov/citations/20150023456' },
      { label: 'Droplet LOI study', url: 'https://doi.org/10.1007/s12217-014-9372-2' },
    ],
    tags: ['suppression', 'droplet', 'heptane', 'methanol', 'CIR'],
  },
  bass: {
    id: 'bass',
    title: 'Burning and Suppression of Solids (BASS / BASS-II)',
    investigation: 'BASS / BASS-II',
    summary:
      'Burned solid samples including acrylic and fabrics in the Microgravity Science Glovebox flow duct to quantify flame spread, extinction, and suppression under controlled oxygen and flow.',
    keyFinding:
      'Microgravity solid flames become spherical or flat diffusion-limited structures; oxygen concentration and forced flow strongly control spread and extinction, informing material selection for spacecraft.',
    openQuestion:
      'How do BASS oxygen/flow maps transfer to partial lunar gravity where weak buoyancy returns?',
    facility: 'MSG / SPICE flow duct',
    sources: [
      { label: 'BASS-II summary (NTRS)', url: 'https://ntrs.nasa.gov/citations/20210011385' },
      { label: 'NASA combustion science overview', url: 'https://www.nasa.gov/missions/station/studying-combustion-and-fire-safety/' },
    ],
    tags: ['materials', 'PMMA', 'suppression', 'MSG'],
  },
  saffire: {
    id: 'saffire',
    title: 'Spacecraft Fire Safety Demonstration (Saffire)',
    investigation: 'Saffire-I / II / III / IV / V',
    summary:
      'Large-scale flame-spread experiments on Cygnus vehicles after departure from ISS, bridging sample-scale MSG tests and cabin-relevant lengths.',
    keyFinding:
      'Flame spread on spacecraft-relevant materials depends on oxygen, pressure, and sample geometry at lengths impractical inside crew-tended facilities.',
    openQuestion:
      'Which Saffire regimes best bound elevated-oxygen lunar habitat materials screening?',
    facility: 'Cygnus / Orbital ATK vehicle',
    sources: [
      { label: 'NASA PSI Saffire-I (PSI-98)', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-98' },
      { label: 'Saffire IV/V flame-spread (NTRS)', url: 'https://ntrs.nasa.gov/citations/20210011521' },
    ],
    tags: ['spacecraft', 'flame-spread', 'materials'],
  },
  same: {
    id: 'same',
    title: 'Smoke and Aerosol Measurement Experiment (SAME / SAME-R)',
    investigation: 'SAME / SAME-R',
    summary:
      'Characterized smoke particle size and detection signatures from overheated materials in microgravity to improve spacecraft smoke detector design.',
    keyFinding:
      'Microgravity smoke aerosols differ from buoyant terrestrial plumes; detector placement and alarm thresholds must account for diffusion-dominated transport.',
    openQuestion:
      'How should SAME aerosol signatures inform sensor layout in lunar habitats with partial gravity and elevated oxygen?',
    facility: 'MSG',
    sources: [
      { label: 'NASA studying combustion and fire safety', url: 'https://www.nasa.gov/missions/station/studying-combustion-and-fire-safety/' },
      { label: 'Researcher’s Guide to Combustion Science', url: 'https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/' },
    ],
    tags: ['detection', 'smoke', 'aerosol'],
  },
  acme: {
    id: 'acme',
    title: 'Advanced Combustion via Microgravity Experiments (ACME)',
    investigation: 'ACME suite',
    summary:
      'Modular CIR campaign including Burning Rate Emulator, Flame Design, CLD Flame, E-FIELD Flames, and s-Flame, targeting soot, stability, extinction, and materials-flammability emulation.',
    keyFinding:
      'Shared ACME hardware produced laminar diffusion-flame datasets spanning soot, electric-field effects, and BRE material-property emulation without condensed fuel samples.',
    openQuestion:
      'Which ACME BRE property matches best predict solid flammability under exploration atmospheres?',
    facility: 'CIR / ACME',
    sources: [
      { label: 'NASA CIR facility', url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/science-facilities-on-the-iss/fluids-combustion-facility/' },
      { label: 'SoFIE / combustion research summary', url: 'https://svs.gsfc.nasa.gov/31394/' },
    ],
    tags: ['ACME', 'BRE', 'soot', 'CIR'],
  },
  sofie: {
    id: 'sofie',
    title: 'Solid Fuel Ignition and Extinction (SoFIE)',
    investigation: 'SoFIE / SoFIE-MIST',
    summary:
      'ISS CIR solid-fuel ignition and extinction research, including mist suppression (SoFIE-MIST), extending BASS-scale materials work into longer-duration, controlled ambient conditions.',
    keyFinding:
      'Solid ignition/extinction maps under controlled oxygen, pressure, and flow support material down-select and suppression concept evaluation for exploration vehicles.',
    openQuestion:
      'How do mist suppressants interact with elevated-oxygen lunar cabin mixtures?',
    facility: 'CIR',
    sources: [
      { label: 'SoFIE visualization', url: 'https://svs.gsfc.nasa.gov/31394/' },
      { label: 'SoFIE-MIST', url: 'https://science.nasa.gov/biological-physical/investigations/sofie-mist/' },
    ],
    tags: ['materials', 'suppression', 'SoFIE', 'CIR'],
  },
  spice: {
    id: 'spice',
    title: 'Smoke Point In Coflow Experiment (SPICE)',
    investigation: 'SPICE',
    summary:
      'Gas-jet diffusion flames in the MSG flow duct studying the transition from non-sooting to smoking tips as a soot propensity indicator.',
    keyFinding:
      'Smoke-point behavior under microgravity coflow informs soot emission predictions used in combustor and fire-safety modeling.',
    facility: 'MSG',
    sources: [
      { label: 'NASA PSI SPICE (PSI-107)', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-107' },
    ],
    tags: ['soot', 'gas-jet', 'MSG'],
  },
  slice: {
    id: 'slice',
    title: 'Structure & Liftoff In Combustion Experiment (SLICE)',
    investigation: 'SLICE',
    summary:
      'Used SPICE hardware to study lifted methane and other gas-jet flames, linking flame structure to efficiency and pollutant models.',
    keyFinding:
      'Lifted-flame structure datasets improve combustion models relevant to both engines and understanding flame attachment under forced flow.',
    facility: 'MSG',
    sources: [
      { label: 'SLICE methane jet study (NTRS)', url: 'https://ntrs.nasa.gov/citations/20140017780' },
    ],
    tags: ['methane', 'lifted-flame', 'engines'],
  },
  fm2: {
    id: 'fm2',
    title: 'Flammability of Materials on the Moon (FM2)',
    investigation: 'FM2',
    summary:
      'Planned/ongoing lunar-relevant materials flammability program addressing partial gravity and exploration atmospheres not yet densely populated in PSI.',
    keyFinding:
      'PSI currently lacks substantial partial-g combustion archives; FM2 and related lunar-g work are the bridge for Moon Base materials screening.',
    openQuestion:
      'When FM2 datasets land in PSI, how should dashboards re-rank habitat material evidence?',
    facility: 'Lunar / reduced-g facilities',
    sources: [
      {
        label: 'NASA FM2 program',
        url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/',
      },
    ],
    tags: ['lunar', 'materials', 'partial-g'],
  },
};

export function studiesByIds(ids: string[]): StudyCard[] {
  return ids.map((id) => INVESTIGATIONS[id]).filter(Boolean);
}
