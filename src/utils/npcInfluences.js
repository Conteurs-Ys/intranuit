// Ajout d'une influence par un conteur (PNJ de la liste ou entité libre).
// Fonctions pures : la fenêtre construit l'action, puis on décide s'il faut
// compléter le dossier PNJ existant du mois ou en créer un.
import { GOTHA_ACTIONS_GLOBALES, PEGRE_ACTIONS_GLOBALES } from '../constants/index.js';
import { isObstruction, obstructionFields } from './obstruction.js';

export const MAX_INFLUENCE_LEVEL = 10;

const clampLevel = (value) => Math.min(MAX_INFLUENCE_LEVEL, Math.max(1, parseInt(value, 10) || 1));

// Niveau, spécialités et réseaux d'un PNJ pour une catégorie (fiche PNJ, champs facultatifs).
export function npcInfluence(antag, category) {
  const own = antag?.influences?.[category];
  return { level: own?.level ? clampLevel(own.level) : null, specs: Array.isArray(own?.specs) ? own.specs.filter(s => s?.spec) : [] };
}

// Actions globales proposées : niveau atteint, plus celle du niveau au-dessus (spécialité +1).
export function globalActionChoices(category, level) {
  const list = category === 'gotha' ? GOTHA_ACTIONS_GLOBALES : PEGRE_ACTIONS_GLOBALES;
  const lvl = clampLevel(level);
  return list.filter(a => a.level <= lvl + 1).map(a => ({ ...a, reach: a.level === lvl + 1 }));
}

export function buildInfluenceAction(form) {
  const action = {
    id: Date.now() + Math.random(),
    category: form.category,
    actionType: form.actionType,
    actionName: form.actionName || '',
    level: clampLevel(form.level),
    actionsSpent: Math.max(1, parseInt(form.actionsSpent, 10) || 1),
    specialization: form.specialization || '',
    influenceName: (form.network || '').trim(),
    description: (form.description || '').trim(),
    assignedTo: form.assignedTo || '',
    response: '',
    rumorTable: [],
  };
  return isObstruction(action) ? { ...action, ...obstructionFields({ ...form, category: form.category }) } : action;
}

// Où écrire : le dossier PNJ du même mois s'il existe (même PNJ, ou même nom libre),
// sinon un nouveau dossier au statut « npc ».
export function planNpcInfluenceWrite({ influences = [], form, antag, month, year, monthName }) {
  const action = buildInfluenceAction(form);
  const name = antag ? antag.name : (form.name || '').trim();
  const sameEntity = (inf) => inf.status === 'npc' && inf.monthLabel === month && (
    antag ? inf.antagonistId === antag.id : !inf.antagonistId && (inf.characterName || '').trim().toLowerCase() === name.toLowerCase()
  );
  const existing = influences.find(sameEntity);
  if (existing) {
    return { id: existing.id, update: { actions: [...(existing.actions || []), action], updatedAt: new Date().toISOString() } };
  }
  return {
    id: null,
    create: {
      characterName: name,
      clan: antag?.clan || '—',
      sect: antag?.sect || 'Antagoniste',
      ...(antag ? { antagonistId: antag.id } : {}),
      monthLabel: month,
      year,
      month: monthName,
      status: 'npc',
      actions: [action],
      createdAt: new Date().toISOString(),
    },
  };
}
