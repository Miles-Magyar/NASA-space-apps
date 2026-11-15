import { INVESTIGATIONS } from '../../src/topics/evidence/registry';
import { missions } from '../../src/topics/mission-data';
import { MATERIALS_LIBRARY } from '../../src/topics/materials-library';
import type { SourceLink } from '../../src/topics/mission-types';

const records: Array<{ title: string; terms: string; evidence: string; context: object; sources: SourceLink[] }> = [
  ...Object.values(INVESTIGATIONS).map((study) => ({
    title: study.title,
    terms: [study.id, study.investigation, ...study.tags].join(' '),
    evidence: study.keyFinding,
    context: { method: study.summary, facility: study.facility, openQuestion: study.openQuestion },
    sources: study.sources,
  })),
  ...Object.values(missions).flatMap((mission) => mission.rows.map((row) => ({
    title: row.name,
    terms: [mission.title, ...row.tags].join(' '),
    evidence: row.summary,
    context: {
      topic: mission.title, evidenceType: row.evidenceType, investigations: row.investigationIds,
      flashPoint: row.flashPointC, autoignition: row.autoignitionC, testOxygen: row.oxygenFractionPercent,
      testPressure: row.pressurePsia, loiOrLoc: row.loiOrLocPercent, scenarioNotes: row.scenarioNotes,
    },
    sources: row.sources,
  }))),
  ...MATERIALS_LIBRARY.map((material) => ({
    title: material.name,
    terms: [material.id, ...material.aliases, material.category, 'cad materials'].join(' '),
    evidence: [material.flammabilityNotes, material.temperatureDegradationNotes, material.notes].join(' '),
    context: {
      cadUse: material.cadUse, provenance: material.provenance, oxygenCompatibility: material.oxygenCompatibility,
      loiPercent: material.loiPercent, flashPointC: material.flashPointC, autoignitionC: material.autoignitionC,
      glassTransitionC: material.glassTransitionC, softeningC: material.softeningC, meltingC: material.meltingC,
      decompositionC: material.decompositionC, continuousUseC: material.continuousUseC,
    },
    sources: material.sources,
  })),
];

const commonWords = new Set('the this that what when which where how why can could would should about does did find show tell want need please have was were are and for with from into your you more there some them information'.split(' '));
const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const index = records.map((record) => ({
  record,
  title: new Set(words(record.title)),
  terms: new Set(words(record.terms)),
  evidence: new Set(words(record.evidence)),
}));

export function findHelpbotEvidence(question: string) {
  const query = [...new Set(words(question))].filter((word) => word.length > 1 && !commonWords.has(word));
  return index
    .map(({ record, title, terms, evidence }) => ({
      record,
      score: query.reduce((score, word) => score
        + (title.has(word) ? 4 : 0) + (terms.has(word) ? 3 : 0) + (evidence.has(word) ? 1 : 0), 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ record }) => record);
}
