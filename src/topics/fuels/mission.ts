import type { MissionDataset, MissionRow } from '../mission-types.js';
import { studiesByIds } from '../evidence/registry.js';

const cabinRows: MissionRow[] = [
  {
    id: 'n-heptane',
    name: 'n-Heptane',
    group: 'cabin',
    evidenceType: 'cabin-surrogate',
    summary:
      'Liquid droplet surrogate used extensively in FLEX/FLEX-2 to map extinction and inert-gas suppression in microgravity.',
    flashPointC: { value: -4, unit: '°C', note: 'Closed-cup terrestrial reference (NOAA CAMEO)', scenario: 'earth-ref' },
    autoignitionC: { value: 204, unit: '°C', note: 'Terrestrial autoignition reference', scenario: 'earth-ref' },
    oxygenFractionPercent: {
      min: 12,
      max: 21,
      unit: '% O₂',
      note: 'FLEX ambient mixtures with inert diluents; exact limit depends on diluent and droplet size',
      scenario: 'reduced-g',
    },
    pressurePsia: { min: 7.4, max: 29.4, unit: 'psia', note: 'CIR chamber pressures spanning sub- to super-atmospheric', scenario: 'reduced-g' },
    loiOrLocPercent: {
      value: 15,
      unit: '% O₂ LOI (droplet)',
      note: 'Illustrative droplet LOI order from published FLEX analyses; method-specific',
      scenario: 'reduced-g',
    },
    scenarioNotes: {
      iss: 'Relevant as a cabin liquid-fuel surrogate for suppressant effectiveness, not as a stored cabin fuel.',
      lunar: 'Transfer LOI with caution: elevated O₂ habitats may erode inerting margins demonstrated at ISS-like mixtures.',
      earth: 'Flash/AIT are ground references; droplet LOI is not interchangeable with vessel LOC.',
    },
    sources: [
      { label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' },
      { label: 'NOAA CAMEO n-heptane', url: 'https://cameochemicals.noaa.gov/report?key=CH831' },
      { label: 'Droplet LOI study', url: 'https://doi.org/10.1007/s12217-014-9372-2' },
    ],
    tags: ['FLEX', 'droplet', 'suppressant', 'heptane'],
    investigationIds: ['flex'],
  },
  {
    id: 'methanol',
    name: 'Methanol',
    group: 'cabin',
    evidenceType: 'cabin-surrogate',
    summary:
      'Alcohol droplet fuel in FLEX campaigns; lower sooting than heptane, used for extinction and cool-flame observations.',
    flashPointC: { value: 11, unit: '°C', note: 'Terrestrial closed-cup reference', scenario: 'earth-ref' },
    autoignitionC: { value: 385, unit: '°C', note: 'Terrestrial autoignition reference', scenario: 'earth-ref' },
    oxygenFractionPercent: {
      min: 12,
      max: 30,
      unit: '% O₂',
      note: 'FLEX ambient oxygen with N₂/CO₂/He/Xe diluents',
      scenario: 'reduced-g',
    },
    pressurePsia: { min: 7.4, max: 29.4, unit: 'psia', scenario: 'reduced-g' },
    loiOrLocPercent: {
      value: 14,
      unit: '% O₂ (order)',
      note: 'Published methanol vapor oxygen-limit studies differ from droplet LOI; cite method',
      scenario: 'earth-ref',
    },
    scenarioNotes: {
      iss: 'Useful suppressant-benchmark fuel with weaker soot than heptane.',
      emu: 'Not a suit atmosphere fuel; oxygen enrichment would radically change vapor flammability.',
    },
    sources: [
      { label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' },
      { label: 'NOAA CAMEO methanol', url: 'https://cameochemicals.noaa.gov/report?key=CH3874' },
      { label: 'Methanol vapor O₂-limit study', url: 'https://doi.org/10.1021/op500328f' },
    ],
    tags: ['FLEX', 'alcohol', 'droplet'],
    investigationIds: ['flex'],
  },
  {
    id: 'methane-gas',
    name: 'Methane (gas)',
    group: 'cabin',
    evidenceType: 'cabin-surrogate',
    summary:
      'Gaseous methane jet/diffusion-flame fuel used in SLICE and related microgravity gas-flame studies; distinct from liquid methane propellant rows.',
    autoignitionC: { value: 537, unit: '°C', note: 'ILO/WHO terrestrial reference', scenario: 'earth-ref' },
    oxygenFractionPercent: {
      value: 21,
      unit: '% O₂',
      note: 'Typical coflow/MSG air reference; specific SLICE runs vary',
      scenario: 'reduced-g',
    },
    pressurePsia: { value: 14.7, unit: 'psia', note: 'Near-cabin pressure MSG runs', scenario: 'reduced-g' },
    loiOrLocPercent: {
      value: 12,
      unit: '% O₂ LOC (gas)',
      note: 'NIOSH/gas-vessel order; not a solid LOI',
      scenario: 'earth-ref',
    },
    scenarioNotes: {
      iss: 'Models cabin gas-leak diffusion flames under forced ventilation, not buoyancy.',
      lunar: 'Elevated O₂ widens flammable envelopes relative to ISS air.',
    },
    sources: [
      { label: 'SLICE methane jet (NTRS)', url: 'https://ntrs.nasa.gov/citations/20140017780' },
      { label: 'ILO methane', url: 'https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=0291&p_lang=en' },
      { label: 'NIOSH gas oxygen limits', url: 'https://stacks.cdc.gov/view/cdc/9780/cdc_9780_DS1.pdf' },
    ],
    tags: ['SLICE', 'gas-jet', 'methane'],
    investigationIds: ['slice'],
  },
  {
    id: 'ethylene',
    name: 'Ethylene',
    group: 'cabin',
    evidenceType: 'cabin-surrogate',
    summary:
      'Classic microgravity diffusion-flame fuel (drop-tower spherical flames; SPICE/NIST soot studies).',
    autoignitionC: { value: 450, unit: '°C', note: 'Terrestrial reference', scenario: 'earth-ref' },
    oxygenFractionPercent: {
      min: 15,
      max: 40,
      unit: '% O₂',
      note: 'Non-buoyant ethylene/air laminar jet and spherical flame campaigns',
      scenario: 'reduced-g',
    },
    pressurePsia: { value: 14.7, unit: 'psia', scenario: 'reduced-g' },
    scenarioNotes: {
      iss: 'Sooting surrogate for diffusion flames without buoyancy.',
      earth: 'Compare to NIST non-buoyant ethylene jet structure studies.',
    },
    sources: [
      { label: 'NIST ethylene jet study', url: 'https://www.nist.gov/publications/structure-and-soot-properties-nonbuoyant-ethyleneair-laminar-jet-diffusion-flames' },
      { label: 'NOAA CAMEO ethylene', url: 'https://cameochemicals.noaa.gov/report?key=CH8655' },
      { label: 'PSI SPICE', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-107' },
    ],
    tags: ['soot', 'ethylene', 'SPICE'],
    investigationIds: ['spice'],
  },
  {
    id: 'sibal',
    name: 'Cotton–fiberglass (SIBAL)',
    group: 'cabin',
    evidenceType: 'solid-material',
    summary:
      'Composite fabric surrogate used in solid flammability and flame-spread research relevant to cabin textiles.',
    oxygenFractionPercent: {
      min: 16,
      max: 25,
      unit: '% O₂',
      note: 'Solid flammability maps vary with flow and orientation',
      scenario: 'reduced-g',
    },
    pressurePsia: { value: 14.7, unit: 'psia', scenario: 'reduced-g' },
    loiOrLocPercent: {
      min: 15,
      max: 21,
      unit: '% O₂ LOI',
      note: 'Method- and weave-dependent; cite specific specimen reports when screening',
      scenario: 'earth-ref',
    },
    scenarioNotes: {
      lunar: 'Elevated O₂ habitats can push fabrics that pass Earth LOI into flammable regimes.',
      iss: 'Compare against BASS/SoFIE solid burn maps before cabin use.',
    },
    sources: [
      { label: 'BASS-II summary', url: 'https://ntrs.nasa.gov/citations/20210011385' },
      { label: 'SoFIE-MIST', url: 'https://science.nasa.gov/biological-physical/investigations/sofie-mist/' },
    ],
    tags: ['fabric', 'SIBAL', 'materials'],
    investigationIds: ['bass', 'sofie'],
  },
  {
    id: 'pmma',
    name: 'PMMA (acrylic)',
    group: 'cabin',
    evidenceType: 'solid-material',
    summary:
      'Standard clear plastic used in BASS/SoFIE solid combustion; spherical and rod geometries documented in µg and 1-g.',
    autoignitionC: {
      value: 280,
      unit: '°C',
      note: 'Order-of-magnitude ignition temperature from ground PMMA studies (geometry-dependent)',
      scenario: 'earth-ref',
    },
    oxygenFractionPercent: {
      value: 17,
      unit: '% O₂',
      note: 'BASS acrylic sphere example at 17% O₂, 10 cm/s flow (NASA researcher’s guide)',
      scenario: 'reduced-g',
    },
    pressurePsia: { value: 14.7, unit: 'psia', scenario: 'reduced-g' },
    loiOrLocPercent: {
      min: 16.5,
      max: 18.5,
      unit: '% O₂ LOI',
      note: 'Earth/microgravity PMMA rod and sphere extinction bands; cool-blue range marker in plots',
      scenario: 'reduced-g',
    },
    scenarioNotes: {
      iss: 'Signature BASS solid: blue spherical flames with occasional soot streaks from vapor bubbles.',
      lunar: 'LOI near 17% means modest O₂ enrichment above air can sustain burning.',
      earth: 'PNNL/ground ignition tests differ from µg extinction; keep methods separate.',
    },
    sources: [
      { label: 'BASS-II summary', url: 'https://ntrs.nasa.gov/citations/20210011385' },
      { label: 'PMMA sphere extinction', url: 'https://ntrs.nasa.gov/citations/20240007628' },
      { label: 'Earth/µg PMMA rods', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5760683/' },
      { label: 'PNNL PMMA ignition', url: 'https://www.pnnl.gov/main/publications/external/technical_reports/PNNL-21490.pdf' },
    ],
    tags: ['PMMA', 'BASS', 'SoFIE', 'plastic'],
    investigationIds: ['bass', 'sofie'],
  },
  {
    id: 'nomex',
    name: 'Nomex',
    group: 'cabin',
    evidenceType: 'solid-material',
    summary:
      'Aramid fabric used in crew clothing and thermal barriers; NASA oxygen-limit testing informs cabin textile selection.',
    oxygenFractionPercent: {
      min: 21,
      max: 30,
      unit: '% O₂',
      note: 'Oxygen-limit specimen tests; exact LOI depends on weave and finish',
      scenario: 'earth-ref',
    },
    pressurePsia: { value: 14.7, unit: 'psia', scenario: 'earth-ref' },
    loiOrLocPercent: {
      min: 26,
      max: 32,
      unit: '% O₂ LOI',
      note: 'Higher LOI than commodity plastics; still review under lunar elevated-O₂ targets',
      scenario: 'earth-ref',
    },
    scenarioNotes: {
      lunar: '34% O₂ habitats can approach or exceed some Nomex LOI bands depending on specimen.',
      emu: 'Suit-adjacent textiles need separate oxygen-compatibility review at 100% O₂ / 4.3 psi.',
      iss: 'Often preferred over untreated cotton for cabin garments.',
    },
    sources: [
      { label: 'NASA Nomex oxygen-limit tests', url: 'https://ntrs.nasa.gov/citations/20080034883' },
      { label: 'Exploration atmosphere (NTRS)', url: 'https://ntrs.nasa.gov/citations/20240003211' },
    ],
    tags: ['Nomex', 'fabric', 'LOI'],
    investigationIds: ['bass', 'fm2'],
  },
];

const propulsionRows: MissionRow[] = [
  {
    id: 'hydrazine',
    name: 'Hydrazine',
    group: 'propulsion',
    evidenceType: 'propulsion-reference',
    summary:
      'Monopropellant reference. Outside core PSI cabin fire scope; retained for engine-bay / leak context with clear caveats.',
    flashPointC: { value: 38, unit: '°C', note: 'Terrestrial reference', scenario: 'earth-ref' },
    autoignitionC: { value: 270, unit: '°C', note: 'NIOSH/terrestrial order', scenario: 'earth-ref' },
    scenarioNotes: {
      iss: 'Not a cabin atmosphere fuel; toxic propellant handling rules dominate.',
      earth: 'Ground toxicology and flash data only — not µg flame maps.',
    },
    sources: [
      { label: 'NIOSH hydrazine', url: 'https://stacks.cdc.gov/view/cdc/175221/cdc_175221_DS1.pdf' },
      { label: 'Hydrazine reactor tests (NTRS)', url: 'https://ntrs.nasa.gov/citations/19730016759' },
    ],
    tags: ['propellant', 'hydrazine'],
  },
  {
    id: 'mmh',
    name: 'Monomethylhydrazine (MMH)',
    group: 'propulsion',
    evidenceType: 'propulsion-reference',
    summary: 'Bipropellant fuel reference paired with NTO in heritage thrusters; not a PSI cabin surrogate.',
    flashPointC: { value: -1, unit: '°C', note: 'NOAA CAMEO terrestrial', scenario: 'earth-ref' },
    autoignitionC: { value: 196, unit: '°C', note: 'NIOSH terrestrial', scenario: 'earth-ref' },
    scenarioNotes: {
      earth: 'Hypergolic handling and compatibility outweigh generic flash comparisons.',
    },
    sources: [
      { label: 'NOAA CAMEO MMH', url: 'https://cameochemicals.noaa.gov/report?key=CH1110' },
      { label: 'NIOSH MMH', url: 'https://www.cdc.gov/niosh/npg/npgd0419.html' },
      { label: 'JPL propellant compatibility', url: 'https://ntrs.nasa.gov/citations/19830016439' },
    ],
    tags: ['propellant', 'MMH'],
  },
  {
    id: 'rp-1',
    name: 'RP-1',
    group: 'propulsion',
    evidenceType: 'propulsion-reference',
    summary: 'Refined kerosene rocket propellant; high-velocity engine combustion is effectively gravity-independent.',
    flashPointC: { min: 43, max: 65, unit: '°C', note: 'Specification-dependent', scenario: 'earth-ref' },
    autoignitionC: { value: 210, unit: '°C', note: 'Order-of-magnitude hydrocarbon AIT', scenario: 'earth-ref' },
    scenarioNotes: {
      earth: 'NIST thermophysical measurements support engine modeling, not cabin fire ranking.',
    },
    sources: [
      { label: 'NIST RP-1 measurements', url: 'https://www.nist.gov/publications/thermophysical-properties-measurements-rocket-propellants-rp-1-and-rp-2' },
      { label: 'RP-1 specification', url: 'https://quicksearch.dla.mil/qsDocDetails.aspx?ident_number=18048' },
    ],
    tags: ['propellant', 'RP-1'],
  },
  {
    id: 'liquid-methane',
    name: 'Liquid methane',
    group: 'propulsion',
    evidenceType: 'propulsion-reference',
    summary:
      'Cryogenic propellant. Vaporized methane properties differ from the methane-gas cabin surrogate row; labeled separately.',
    flashPointC: { value: -188, unit: '°C', note: 'Cryogenic liquid; vapor flammability differs', scenario: 'earth-ref' },
    autoignitionC: {
      value: 537,
      unit: '°C',
      note: 'Autoignition of methane vapor (same terrestrial gas reference)',
      scenario: 'earth-ref',
    },
    scenarioNotes: {
      earth: 'Morpheus and CFM programs address boil-off and engine use, not ISS cabin flames.',
    },
    sources: [
      { label: 'Morpheus liquid methane (NTRS)', url: 'https://ntrs.nasa.gov/citations/20140009917' },
      { label: 'NASA cryogenic fluid management', url: 'https://www.nasa.gov/space-technology-mission-directorate/tdm/cryogenic-fluid-management-cfm/' },
    ],
    tags: ['cryogen', 'methane', 'propellant'],
  },
  {
    id: 'liquid-hydrogen',
    name: 'Liquid hydrogen',
    group: 'propulsion',
    evidenceType: 'propulsion-reference',
    summary: 'Cryogenic LH₂ propellant with wide vapor flammability limits once boiled off.',
    flashPointC: { value: -253, unit: '°C', note: 'Cryogenic liquid', scenario: 'earth-ref' },
    autoignitionC: { value: 500, unit: '°C', note: 'Hydrogen vapor terrestrial order (ILO)', scenario: 'earth-ref' },
    loiOrLocPercent: {
      min: 4,
      max: 75,
      unit: '% H₂ in air (flammability)',
      note: 'Gas flammability envelope in air — not a solid LOI',
      scenario: 'earth-ref',
    },
    scenarioNotes: {
      earth: 'Leak/boil-off scenarios dominate storage fire thinking.',
    },
    sources: [
      { label: 'ILO hydrogen', url: 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0001&p_lang=en' },
      { label: 'LH2/LOX tests (NTRS)', url: 'https://ntrs.nasa.gov/citations/19950009913' },
    ],
    tags: ['cryogen', 'hydrogen', 'propellant'],
  },
  {
    id: 'ascent',
    name: 'ASCENT / AF-M315E',
    group: 'propulsion',
    evidenceType: 'propulsion-reference',
    summary: 'Green monopropellant alternative to hydrazine; thruster test literature, not PSI cabin combustion.',
    scenarioNotes: {
      earth: 'Treat as propulsion-system evidence only.',
    },
    sources: [
      { label: 'AF-M315E thruster tests', url: 'https://ntrs.nasa.gov/citations/20140016838' },
    ],
    tags: ['propellant', 'ASCENT', 'AF-M315E'],
  },
];

const suppressionRows: MissionRow[] = [
  {
    id: 'flex-inert-diluents',
    name: 'FLEX inert diluents (CO₂ / He)',
    group: 'suppression',
    evidenceType: 'suppression',
    summary:
      'FLEX mapped how CO₂ and helium diluents change heptane/methanol droplet flammability limits in µg — terrestrial inerting margins can be non-conservative.',
    oxygenFractionPercent: {
      min: 12,
      max: 21,
      unit: '% O₂',
      note: 'Ambient mixtures with inert suppressants; limit depends on diluent and droplet size',
      scenario: 'reduced-g',
    },
    pressurePsia: { min: 7.4, max: 29.4, unit: 'psia', scenario: 'reduced-g' },
    scenarioNotes: {
      iss: 'Primary suppressant-margin evidence for cabin liquid-fuel surrogates.',
      lunar: 'Elevated habitat O₂ erodes the inerting headroom shown near air.',
    },
    sources: [
      { label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' },
      { label: 'FLEX run table', url: 'https://ntrs.nasa.gov/citations/20150023456' },
    ],
    tags: ['FLEX', 'suppression', 'CO2', 'helium'],
    investigationIds: ['flex'],
  },
  {
    id: 'acme-bre-surrogate',
    name: 'ACME BRE fuel-property surrogate',
    group: 'cabin',
    evidenceType: 'cabin-surrogate',
    summary:
      'Burning Rate Emulator uses gaseous fuels on a porous burner to emulate condensed-fuel burning rates — a suppression/materials triage aid, not a new LOI inventing row.',
    scenarioNotes: {
      iss: 'Property matching for paper/plastic/alcohol-like behavior without consuming solid samples.',
      earth: 'Do not treat BRE gas flow as a published flash/AIT for a named propellant.',
    },
    sources: [
      {
        label: 'NASA CIR / ACME',
        url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/science-facilities-on-the-iss/fluids-combustion-facility/',
      },
    ],
    tags: ['ACME', 'BRE', 'surrogate'],
    investigationIds: ['acme'],
  },
];

export const fuelsMission: MissionDataset = {
  topicId: 'fuels',
  title: 'Fuels',
  intro:
    'Cabin and surrogate fuels from NASA microgravity campaigns, plus propulsion-reference propellants kept clearly labeled outside the PSI cabin-fire core. Suppression-linked FLEX/ACME findings sit with cabin evidence. Atmosphere presets reshape scenario notes; numbers stay tied to their test methods.',
  rows: [...cabinRows, ...suppressionRows, ...propulsionRows],
  studies: studiesByIds(['flex', 'slice', 'spice', 'bass', 'sofie', 'acme', 'saffire', 'same']),
  records: [
    {
      id: 'fuels-groups',
      title: 'Two evidence groups',
      body: 'Group 1 (cabin/surrogate + suppression context): n-heptane, methanol, methane gas, ethylene, SIBAL, PMMA, Nomex, FLEX inert diluents, ACME BRE surrogate. Group 2 (propulsion reference): hydrazine, MMH, RP-1, liquid methane, liquid hydrogen, ASCENT/AF-M315E — outside core PSI cabin-fire scope.',
      sources: [{ label: 'Challenge scope note', url: 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/' }],
      tags: ['taxonomy'],
    },
    {
      id: 'fuels-saffire-same-caveat',
      title: 'Saffire / SAME context (not fuel LOI)',
      body: 'Saffire informs solid flame-spread lengths and SAME informs smoke detection — useful cabin context beside fuel rows, but neither replaces droplet LOI or gas LOC for the named fuels above.',
      sources: [
        { label: 'PSI Saffire-I', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-98' },
        { label: 'NASA fire safety', url: 'https://www.nasa.gov/missions/station/studying-combustion-and-fire-safety/' },
      ],
      tags: ['caveat', 'Saffire', 'SAME'],
    },
    {
      id: 'fuels-suppress-playbook',
      title: 'Suppressant margin checklist (FLEX)',
      body: 'Identify the surrogate fuel class; read FLEX diluent runs at comparable O₂/pressure; assume Earth inerting standards may be non-conservative in µg; re-check when cabin O₂ rises for lunar habitats.',
      sources: [
        { label: 'PSI FLEX', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69' },
        { label: 'Droplet LOI study', url: 'https://doi.org/10.1007/s12217-014-9372-2' },
      ],
      tags: ['playbook', 'suppression'],
    },
  ],
  showEarthScenario: true,
  sharpPanels: true,
};
