import { TOPICS } from './topics';
import { OVERVIEW_SECTIONS } from './topics/general/overview';
import { missions } from './topics/mission-data';
import { INVESTIGATIONS } from './topics/evidence/registry';
import { MATERIALS_LIBRARY } from './topics/materials-library';

export interface SearchHit {
  score: number;
  title: string;
  snippet: string;
  href: string;
  kind: string;
}

function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9%/+.-]+/)
    .filter((t) => t.length > 1);
}

function scoreText(hay: string, toks: string[]): number {
  const h = hay.toLowerCase();
  let s = 0;
  for (const t of toks) {
    if (h === t) s += 12;
    else if (h.includes(t)) s += 6;
    else if (t.length > 3 && h.includes(t.slice(0, Math.ceil(t.length * 0.75)))) s += 2;
  }
  return s;
}

/** Client-side heuristic search over curated corpus. */
export function searchCorpus(query: string, limit = 12): SearchHit[] {
  const toks = tokens(query);
  if (!toks.length) return [];
  const hits: SearchHit[] = [];

  for (const topic of TOPICS) {
    const s =
      scoreText(topic.title, toks) * 2 +
      scoreText(topic.description, toks) +
      scoreText(topic.id, toks) * 2;
    if (s > 0) {
      hits.push({
        score: s + 5,
        title: topic.title,
        snippet: topic.description,
        href: `#${topic.id}`,
        kind: 'Topic',
      });
    }
  }

  for (const section of OVERVIEW_SECTIONS) {
    const s = scoreText(section.heading, toks) * 2 + scoreText(section.paragraphs.join(' '), toks);
    if (s > 0) {
      hits.push({
        score: s,
        title: section.heading,
        snippet: 'General overview section',
        href: `#general`,
        kind: 'Overview',
      });
    }
  }

  for (const inv of Object.values(INVESTIGATIONS)) {
    const s =
      scoreText(inv.title, toks) * 3 +
      scoreText(inv.investigation, toks) * 3 +
      scoreText(inv.id, toks) * 4 +
      scoreText(inv.summary + ' ' + inv.keyFinding, toks) +
      scoreText(inv.tags.join(' '), toks);
    // Prefer catalog cards when the query names an investigation directly.
    const exactName = toks.some(
      (t) =>
        inv.id === t ||
        inv.investigation.toLowerCase().includes(t) ||
        inv.title.toLowerCase().includes(t),
    );
    if (s > 0) {
      hits.push({
        score: s + 8 + (exactName ? 20 : 0),
        title: inv.investigation,
        snippet: inv.keyFinding,
        href: `#investigations`,
        kind: 'Investigation',
      });
    }
  }

  for (const [topicId, mission] of Object.entries(missions)) {
    for (const row of mission.rows) {
      const s =
        scoreText(row.name, toks) * 3 +
        scoreText(row.summary, toks) +
        scoreText(row.tags.join(' '), toks) * 2;
      if (s > 0) {
        hits.push({
          score: s + 4,
          title: row.name,
          snippet: row.summary,
          href: `#${topicId}`,
          kind: 'Evidence row',
        });
      }
    }
    for (const study of mission.studies) {
      const s = scoreText(study.title, toks) * 2 + scoreText(study.keyFinding, toks);
      if (s > 0) {
        hits.push({
          score: s + 3,
          title: study.title,
          snippet: study.keyFinding,
          href: `#${topicId}`,
          kind: 'Study',
        });
      }
    }
  }

  for (const mat of MATERIALS_LIBRARY) {
    const s =
      scoreText(mat.name, toks) * 3 +
      scoreText(mat.aliases.join(' '), toks) * 2 +
      scoreText(mat.notes, toks) +
      scoreText(mat.flammabilityNotes, toks) +
      scoreText(mat.temperatureDegradationNotes, toks) +
      scoreText(mat.cadUse, toks);
    if (s > 0) {
      hits.push({
        score: s + 2,
        title: mat.name,
        snippet: mat.flammabilityNotes || mat.notes,
        href: '#viable-materials',
        kind: 'Material',
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const deduped: SearchHit[] = [];
  for (const h of hits) {
    const key = `${h.href}|${h.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(h);
    if (deduped.length >= limit) break;
  }
  return deduped;
}
