export type EvidenceType =
  | 'cabin-surrogate'
  | 'solid-material'
  | 'propulsion-reference'
  | 'detection'
  | 'suppression'
  | 'facility'
  | 'atmosphere'
  | 'oxygen-compatibility'
  | 'cryogenic'
  | 'rover-habitat';

export type ScenarioId =
  | 'iss'
  | 'emu'
  | 'lunar'
  | 'mars'
  | 'earth';

export interface ScenarioPreset {
  id: ScenarioId;
  label: string;
  oxygenPercent: number;
  pressurePsia: number;
  gravityLabel: string;
  notes: string;
  fuelsOnly?: boolean;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface MetricValue {
  /** Single reported value */
  value?: number;
  /** Inclusive reported range */
  min?: number;
  max?: number;
  unit: string;
  note?: string;
  /** Which scenario the measurement belongs to when scenario-specific */
  scenario?: ScenarioId | 'reduced-g' | 'earth-ref';
}

export interface MissionRow {
  id: string;
  name: string;
  group: 'cabin' | 'propulsion' | 'materials' | 'detection' | 'suppression' | 'systems';
  evidenceType: EvidenceType;
  summary: string;
  flashPointC?: MetricValue;
  autoignitionC?: MetricValue;
  oxygenFractionPercent?: MetricValue;
  pressurePsia?: MetricValue;
  loiOrLocPercent?: MetricValue;
  scenarioNotes: Partial<Record<ScenarioId, string>>;
  sources: SourceLink[];
  tags: string[];
  investigationIds?: string[];
}

export interface StudyCard {
  id: string;
  title: string;
  investigation: string;
  summary: string;
  keyFinding: string;
  openQuestion?: string;
  facility?: string;
  sources: SourceLink[];
  tags: string[];
}

export interface EvidenceRecord {
  id: string;
  title: string;
  body: string;
  sources: SourceLink[];
  tags: string[];
}

export interface TopicDefinition {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  kind: 'general' | 'mission' | 'synthesis' | 'catalog' | 'tool';
}

export interface MissionDataset {
  topicId: string;
  title: string;
  intro: string;
  rows: MissionRow[];
  studies: StudyCard[];
  records: EvidenceRecord[];
  showEarthScenario?: boolean;
  defaultScenario?: ScenarioId;
  sharpPanels?: boolean;
}
