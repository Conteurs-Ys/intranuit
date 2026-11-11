// Obstruction (règles FCF, « Action Ciblée ») — fonctions pures.
// - On choisit la catégorie obstruée (pas forcément celle utilisée) et UNE activité ;
//   seule la récolte de rumeurs et potins peut couvrir les 15 spécialités à la fois.
// - Chaque point oblige à dépenser une action de plus pour accomplir l'activité via cette catégorie.
// - Seules les actions globales sont obstruées, jamais les ciblées.
// - Provenances différentes : la plus forte, les autres comptent comme des soutiens (N → N+1 coûte N).
// - Durée non écrite : les actions d'influence valent pour le mois, donc l'obstruction vaut pour son cycle.
// - Elle gêne les AUTRES personnages (« empêcher les autres d'accomplir certaines actions »).
import { RUMEUR_ACTIONS } from '../constants/index.js';
import { actorOf, actorKey } from './influenceRules.js';

export const OBSTRUCTION_TARGETS = [
  { value: 'rumeurs', label: 'Rumeurs et potins' },
  { value: 'autre', label: 'Une activité à décrire' },
];
export const ALL_SPECIALTIES = 'all';

// Actions globales qui créent d'elles-mêmes une obstruction 5 sur un lieu pendant 24 h.
export const SITE_OBSTRUCTION_ACTIONS = ['Pas de pique-assiettes', "État d'urgence"];

export const isObstruction = (act) => act?.actionType === 'ciblée' && act?.actionName === 'Obstruction';
const isRumor = (act) => RUMEUR_ACTIONS.includes(act?.actionName);

// Cible d'une obstruction. Les anciennes obstructions (sans cible) sont lues comme
// visant les rumeurs de leur catégorie et de leur spécialité, avec un repère « à préciser ».
export function obstructionTarget(act) {
  const legacy = !act.obstructionTarget;
  return {
    category: act.obstructedCategory || act.category,
    target: act.obstructionTarget || 'rumeurs',
    action: act.obstructedAction || '',
    scope: act.obstructionScope || act.specialization || ALL_SPECIALTIES,
    text: act.obstructionText || '',
    legacy,
  };
}

// Une obstruction gêne-t-elle cette action globale ?
export function obstructs(obstruction, act) {
  if (!act || act.actionType !== 'globale') return false;
  const t = obstructionTarget(obstruction);
  if (t.category !== act.category) return false;
  if (t.target === 'rumeurs') return isRumor(act) && (t.scope === ALL_SPECIALTIES || t.scope === act.specialization);
  return false; // Activités : correspondances confirmées par le conteur, jamais par intitulé seul.
}

export const obstructionActorKey = d => actorKey(actorOf(d)) || `nom:${(d.characterName || '').trim().toLowerCase()}`;
export const actionReference = (a, index) => a.id != null ? `id:${a.id}` : `index:${index}`;
// Les changements de sens rendent un lien caduc ; réponse et dépense ne changent pas l'activité.
export const activitySignature = a => {
  const text = JSON.stringify([a.actionType || '', a.actionName || '', a.category || '', a.specialization || '', a.influenceName || '', a.description || '', a.obstructionTarget || '', a.obstructedCategory || '', a.obstructedAction || '', a.obstructionText || '']);
  // Empreinte de comparaison uniquement : ne pas copier les descriptions d'autres PJ dans ce dossier.
  const hash = [2166136261, 3335557771, 1234567891, 987654319];
  for (let i = 0; i < text.length; i++) hash.forEach((h, n) => { hash[n] = Math.imul(h ^ text.charCodeAt(i), 16777619 + 2 * n) >>> 0; });
  return hash.map(h => h.toString(16).padStart(8, '0')).join('');
};
export function obstructionApplies(o, source, sourceIndex, act, owner, targetIndex) {
  const t = obstructionTarget(o);
  if (source.monthLabel !== owner.monthLabel || obstructionActorKey(source) === obstructionActorKey(owner)) return false;
  if (act.actionType !== 'globale' || act.category !== t.category) return false;
  if (t.target === 'rumeurs') return obstructs(o, act);
  // Les récoltes de rumeurs gardent exclusivement leur portée structurée.
  if (isRumor(act)) return false;
  return (source.obstructionLinks || []).some(link => link.source === actionReference(o, sourceIndex)
    && link.sourceSignature === activitySignature(o) && link.dossierId === owner.id
    && link.target === actionReference(act, targetIndex) && link.targetSignature === activitySignature(act));
}
export const missingObstructionActivity = a => isObstruction(a) && obstructionTarget(a).target !== 'rumeurs'
  && !(obstructionTarget(a).text || '').trim();

// Cumul façon soutien : la plus forte, puis N → N+1 coûte N.
export function stackObstructions(values) {
  const list = values.filter(v => v > 0).sort((a, b) => b - a);
  if (!list.length) return 0;
  let total = list[0];
  let pool = list.slice(1).reduce((s, v) => s + v, 0);
  while (pool >= total) { pool -= total; total += 1; }
  return total;
}

// Niveau d'obstruction subi par une action, d'après les dossiers d'influence du même cycle.
// `dossiers` : [{ id, userId, characterName, monthLabel, actions: [...] }] ; `owner` : le dossier de l'action.
export function obstructionFor(act, owner, dossiers = [], actionIndex) {
  const byProvenance = new Map();
  const sources = [];
  dossiers.forEach(d => {
    if (d.monthLabel !== owner.monthLabel) return;
    const provenance = obstructionActorKey(d);
    const ownProvenance = obstructionActorKey(owner);
    if (provenance === ownProvenance) return; // on n'obstrue pas ses propres actions
    (d.actions || []).forEach((o, index) => {
      if (!isObstruction(o) || !obstructionApplies(o, d, index, act, owner, actionIndex)) return;
      const points = Math.max(1, parseInt(o.actionsSpent, 10) || 1);
      byProvenance.set(provenance, (byProvenance.get(provenance) || 0) + points);
      sources.push({ characterName: d.characterName, points, legacy: obstructionTarget(o).legacy });
    });
  });
  const level = stackObstructions([...byProvenance.values()]);
  return { level, needed: level + 1, sources };
}

// Champs à enregistrer pour une obstruction : seule l'information utile à la cible choisie.
export function obstructionFields(act) {
  const t = obstructionTarget(act);
  return {
    obstructedCategory: t.category,
    obstructionTarget: t.target,
    obstructionScope: t.target === 'rumeurs' ? t.scope : '',
    obstructedAction: t.target === 'action' ? t.action : '',
    obstructionText: t.target === 'autre' ? t.text : '',
  };
}
