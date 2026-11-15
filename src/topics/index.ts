import type { TopicDefinition } from './mission-types';

export const TOPICS: TopicDefinition[] = [
  {
    id: 'general',
    title: 'General',
    shortTitle: 'General',
    description:
      'How Earth flames differ in freefall, what NASA measured on orbit, and how those findings inform mission fire safety. Includes SI summaries, search, and links into deeper topics.',
    kind: 'general',
  },
  {
    id: 'investigations',
    title: 'Investigations',
    shortTitle: 'Investigations',
    description:
      'First-class cards for FLEX, BASS, Saffire, SAME, ACME, SoFIE, SPICE, SLICE, and FM2 — what was measured, key findings, open questions, and PSI/NTRS links.',
    kind: 'catalog',
  },
  {
    id: 'cabin-fire-safety',
    title: 'Cabin Fire Safety',
    shortTitle: 'Cabin Fire',
    description:
      'Cross-topic synthesis: detection, materials, atmosphere, fuels, suppression, and Moon/Mars transfer — ranked for the selected habitat atmosphere.',
    kind: 'synthesis',
  },
  {
    id: 'cad-checker',
    title: 'CAD Checker',
    shortTitle: 'CAD Checker',
    description:
      'Interactive demo of the BOM flammability checker: load habitat/suit/rover sample parts, compare against mission atmospheres, and export unknown materials.',
    kind: 'tool',
  },
  {
    id: 'viable-materials',
    title: 'Viable Materials',
    shortTitle: 'Materials',
    description:
      'Solid materials flammability from BASS, SoFIE, Saffire, and lunar FM2 pathways — plus CAD temperature-degradation compilation.',
    kind: 'mission',
  },
  {
    id: 'fuels',
    title: 'Fuels',
    shortTitle: 'Fuels',
    description:
      'Cabin surrogates and propulsion-reference propellants with atmosphere-aware tables and plots.',
    kind: 'mission',
  },
  {
    id: 'spacesuits',
    title: 'Spacesuits',
    shortTitle: 'Spacesuits',
    description: 'EMU pure-oxygen atmospheres, oxygen compatibility, and suit material concerns.',
    kind: 'mission',
  },
  {
    id: 'spacecraft',
    title: 'Spacecraft',
    shortTitle: 'Spacecraft',
    description: 'Saffire, CIR/SoFIE, SAME detection, and suppression for vehicles and stations.',
    kind: 'mission',
  },
  {
    id: 'engines',
    title: 'Engines',
    shortTitle: 'Engines',
    description:
      'Fundamental combustion datasets with clear caveats for engine-bay versus chamber combustion.',
    kind: 'mission',
  },
  {
    id: 'fuel-storage',
    title: 'Fuel Storage',
    shortTitle: 'Storage',
    description: 'Cryogenics, boil-off envelopes, and oxygen-system ignition risks.',
    kind: 'mission',
  },
  {
    id: 'rovers',
    title: 'Rovers',
    shortTitle: 'Rovers',
    description: 'Pressurized versus unpressurized rover fire-safety framing under lunar gravity.',
    kind: 'mission',
  },
];

export function topicById(id: string): TopicDefinition | undefined {
  return TOPICS.find((t) => t.id === id);
}

export function topicIdFromHash(hash: string): string {
  const cleaned = hash.replace(/^#/, '').split('?')[0] || 'general';
  return TOPICS.some((t) => t.id === cleaned) ? cleaned : 'general';
}
