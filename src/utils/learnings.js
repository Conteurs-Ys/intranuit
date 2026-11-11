// Suivi manuel des acquisitions : aucun barème ni solde d'XP calculé ici.
export const LEARNING_TYPES = ['Discipline', 'Compétence', 'Attribut', 'Rituel', 'Voie', 'Connaissance', 'Technique', 'Autre'];
export const LEARNING_FIELDS = ['characterName', 'clan', 'type', 'action', 'levels', 'currentLevel', 'mentor', 'date', 'notes', 'decisionReason'];
export const learningStatus = entry => ['pending', 'approved', 'rejected'].includes(entry.status) ? entry.status : 'legacy';
export const isLearningHistory = entry => ['approved', 'legacy'].includes(learningStatus(entry));

function optionalNumber(value, label) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} doit être un nombre positif ou nul.`);
  return number;
}

export function learningFields(data) {
  const levels = Array.isArray(data.levels) ? data.levels : data.levels ? [data.levels] : [];
  if (levels.some(level => !Number.isInteger(Number(level)) || Number(level) < 1)) throw new Error('Les niveaux visés doivent être des entiers supérieurs à zéro.');
  return {
    characterName: (data.characterName || '').trim(), clan: data.clan || '', type: data.type || '',
    action: (data.action || '').trim(), levels: [...new Set(levels.map(Number))].sort((a, b) => a - b),
    currentLevel: optionalNumber(data.currentLevel, 'Le niveau actuel'),
    mentor: (data.mentor || '').trim(),
    date: data.date || '', notes: data.notes || '', decisionReason: (data.decisionReason || '').trim(),
  };
}

export function validateLearning(fields) {
  if (!fields.characterName || !fields.type || !fields.action) throw new Error('Renseignez le personnage, le type et l’intitulé de la progression.');
}

export function learningChanges(before, after) {
  return Object.fromEntries(LEARNING_FIELDS.filter(key => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)).map(key => [key, after[key] ?? null]));
}

function auditChange(current, changes, event, actor, at) {
  return [...(current.audit || []), { event, by: actor, at,
    before: Object.fromEntries(Object.keys(changes).map(key => [key, current[key] ?? null])), after: changes,
  }];
}

function mergeLearningDraft(current, draft, baseline) {
  const before = learningFields(baseline);
  const fields = learningFields(draft);
  const latest = learningFields(current);
  const intended = learningChanges(before, fields);
  for (const key of Object.keys(intended)) {
    if (JSON.stringify(latest[key]) !== JSON.stringify(before[key])) throw new Error('Cette ligne a été modifiée depuis son ouverture. Actualisez avant de poursuivre.');
  }
  return { ...latest, ...intended };
}

export function learningEdit(current, draft, actor, at, baseline = current) {
  const fields = mergeLearningDraft(current, draft, baseline);
  validateLearning(fields);
  if (learningStatus(current) === 'rejected' && !fields.decisionReason) throw new Error('Le motif du refus doit être conservé.');
  const changes = learningChanges(current, fields);
  if (!Object.keys(changes).length) return null;
  return { ...changes, updatedAt: at, audit: auditChange(current, changes, 'edited', actor, at) };
}

// Une décision met à jour la demande elle-même : pas de copie ni de double acquisition.
export function learningDecision(current, draft, status, actor, at, baseline = current) {
  if (learningStatus(current) !== 'pending') throw new Error('Cette demande a déjà été traitée. Consultez son état actuel.');
  if (!['approved', 'rejected'].includes(status)) throw new Error('Décision inconnue.');
  const fields = mergeLearningDraft(current, draft, baseline);
  if (status === 'approved') validateLearning(fields);
  if (status === 'rejected' && !fields.decisionReason) throw new Error('Un motif est nécessaire pour refuser la demande.');
  const changes = { ...learningChanges(current, fields), status, decidedBy: actor, decidedAt: at };
  if (status === 'approved') changes.date = fields.date || at.slice(0, 10);
  return { ...changes, updatedAt: at, audit: auditChange(current, changes, status, actor, at) };
}
