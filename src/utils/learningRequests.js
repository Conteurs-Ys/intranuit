import { learningFields, learningStatus } from './learnings.js';

export function aipLearningRequests(dossier) {
  return ['actions', 'bonus'].flatMap(section => (dossier[section] || []).flatMap(action => {
    if (action.type !== 'Apprentissage' || !action.learning?.action?.trim()) return [];
    const sourceKey = `${section}:${action.id}`;
    return [{ ...learningFields({ ...action.learning, characterName: dossier.characterName, clan: dossier.clan }),
      id: `aip_${dossier.id}_${section}_${action.id}`, status: 'pending', source: 'aip',
      sourceCollection: 'global_aips', sourceId: dossier.id, sourceKey,
      sourceDescription: action.description || '', userId: dossier.userId,
      characterId: dossier.characterId || 'c1', monthLabel: dossier.monthLabel || '',
    }];
  }));
}

export function learningQueue(aips, requests, saved) {
  const sources = [...aips.flatMap(aipLearningRequests), ...requests.map(r => ({
    ...learningFields(r), id: `diverse_${r.id}`, status: 'pending', source: 'diverse',
    sourceCollection: 'learning_requests', sourceId: r.id, sourceKey: 'request',
    sourceDescription: r.explanation || '', userId: r.userId, characterId: r.characterId,
    monthLabel: r.monthLabel || '',
  }))];
  sources.forEach(source => { source.sourceRevision = JSON.stringify([source.type, source.action, source.currentLevel, source.levels, source.mentor, source.sourceDescription]); });
  const entries = new Map(sources.map(source => [source.id, source]));
  saved.forEach(entry => {
    const source = entries.get(entry.id);
    // A pending request follows its AIP; storyteller corrections stay in the saved row.
    // A decision is permanent: editing an AIP never creates a second acquisition.
    if (source && learningStatus(entry) === 'pending' && entry.sourceRevision !== source.sourceRevision) {
      entries.set(entry.id, { ...entry, ...source, notes: entry.notes || '', decisionReason: entry.decisionReason || '' });
    } else if (source || learningStatus(entry) !== 'pending' || !entry.sourceCollection) entries.set(entry.id, { ...source, ...entry });
  });
  return [...entries.values()];
}

export function publicLearningReview(entry) {
  return Object.fromEntries(['status', 'type', 'action', 'currentLevel', 'levels', 'mentor', 'date', 'decisionReason', 'decidedAt']
    .map(key => [key, entry[key] ?? null]));
}

export function sameLearningSource(a, b) {
  return JSON.stringify([a.type, a.action, a.currentLevel, a.levels, a.mentor, a.sourceDescription])
    === JSON.stringify([b.type, b.action, b.currentLevel, b.levels, b.mentor, b.sourceDescription]);
}
