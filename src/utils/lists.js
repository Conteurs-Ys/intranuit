// Listes de lieux et de types d'AIP, modifiables par les conteurs (`game_state/lists`) — fonctions pures.
// Sans document, les listes du code servent de valeurs par défaut.
import { ACTION_TYPES, ZONES } from '../constants/index.js';
import { FEEDING_ACTION } from './feeding.js';

// Types dont l'appli se sert (Troupeau et réserve de sang, circuit des apprentissages) : ni renommés ni retirés.
export const PROTECTED_TYPES = [FEEDING_ACTION, 'Apprentissage'];

export const DEFAULT_LISTS = { zones: ZONES, actionTypes: ACTION_TYPES };

const clean = (list) => [...new Set((Array.isArray(list) ? list : []).map(v => String(v || '').trim()).filter(Boolean))];

// Listes lues du document : nettoyées (vides et doublons retirés), types protégés toujours présents.
export function normalizeLists(data) {
  const zones = clean(data?.zones);
  const actionTypes = clean(data?.actionTypes);
  return {
    zones: zones.length ? zones : [...DEFAULT_LISTS.zones],
    actionTypes: actionTypes.length
      ? [...actionTypes, ...PROTECTED_TYPES.filter(t => !actionTypes.includes(t))]
      : [...DEFAULT_LISTS.actionTypes],
  };
}

// Choix proposés pour un champ : la liste, plus la valeur actuelle si elle en a été retirée depuis (ancien dossier).
export const optionsWith = (list, current) => (current && !list.includes(current) ? [current, ...list] : list);

// Opérations d'édition (l'interface les applique puis enregistre la liste entière).
export function renameItem(list, index, value) {
  const v = String(value || '').trim();
  if (!v || PROTECTED_TYPES.includes(list[index]) || list.some((x, i) => i !== index && x === v)) return list;
  return list.map((x, i) => (i === index ? v : x));
}
export const removeItem = (list, index) => (PROTECTED_TYPES.includes(list[index]) ? list : list.filter((_, i) => i !== index));
export function moveItem(list, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
export function addItem(list, value) {
  const v = String(value || '').trim();
  return !v || list.includes(v) ? list : [...list, v];
}
