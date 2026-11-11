import { test } from 'node:test';
import { deepEqual, equal, notEqual } from 'node:assert/strict';
import { actionsForAntagonistUpdate, buildAntagonistActions, flattenAntagonistActions, isAntagonistInAips, npcBonuses, npcSciences, nextAntagonistCycle } from '../src/utils/antagonistActions.js';

const action = { type: 'Enquête', description: 'Observer les docks', response: 'Un signe de piste', people: ['Ilse'], score: 'Investigation 3' };

test('diffusion : PNJ sans actions initialisées accepté, historique conservé et seuls les textes du cycle suivant vidés', () => {
  const empty = nextAntagonistCycle({ name: 'Ombre' }, 'Octobre 2026');
  equal(empty.actions.length, 3);
  equal(empty.history[0].actions.length, 3);
  const npc = { actions: [{ ...action, assignedTo: 'st1' }], history: [{ month: 'Septembre 2026', actions: [action] }] };
  const next = nextAntagonistCycle(npc, 'Octobre 2026');
  equal(next.history.length, 2);
  deepEqual(next.history[1].actions, npc.actions);
  deepEqual(next.actions[0], { ...action, assignedTo: 'st1', description: '', response: '' });
  equal(npc.actions[0].description, 'Observer les docks');
});

test('tout PNJ actif est dans le tableau AIP, quel que soit l’ancien réglage', () => {
  equal(isAntagonistInAips({}), true);
  equal(isAntagonistInAips({ showInAips: false }), true);
  equal(isAntagonistInAips({ status: 'sommeil' }), false);
  equal(isAntagonistInAips({ status: 'mort', showInAips: true }), false);
});

test('la visibilité des joueurs ne décide pas de la présence AIP ; un PNJ actif sans AIP a ses 3 lignes à remplir', () => {
  const rows = flattenAntagonistActions([
    { id: 'secret', name: 'Ombre', knownToPlayers: false, actions: [action] },
    { id: 'dort', name: 'Dormeur', status: 'sommeil', knownToPlayers: true, actions: [action] },
    { id: 'neuf', name: 'Baron', knownToPlayers: true },
  ]);
  deepEqual(rows.map(r => r.aipId), ['secret', 'neuf', 'neuf', 'neuf']);
  equal(rows[0].description, action.description);
  equal(rows[1].description, '');
});

test('mettre en sommeil puis réactiver conserve textes, bonus anciens et tableaux d’origine', () => {
  const bonus = { ...action, bonusType: 'Sciences', subject: 'Médecine' };
  const existing = { scienceCount: 1, scienceTitle: 'Médecine', actions: [action, bonus] };
  const asleep = { ...existing, status: 'sommeil', knownToPlayers: true, name: 'Nouveau nom' };
  equal(actionsForAntagonistUpdate(existing, asleep), existing.actions);
  equal(actionsForAntagonistUpdate(asleep, { ...asleep, status: 'actif' }), existing.actions);
  deepEqual(existing.actions, [action, bonus]);
});

test('le conteur responsable sert de défaut sans écraser une attribution explicite', () => {
  const rows = flattenAntagonistActions([{ id: 'pnj', name: 'Baron', assignedTo: 'st1', actions: [action, { ...action, assignedTo: '' }, { ...action, assignedTo: 'st2', bonusType: 'Informatique' }] }]);
  deepEqual(rows.map(row => row.assignedTo), ['st1', '', 'st2']);
  equal(rows[2].isBonus, true);
  equal(rows[2].actionIdx, 2);
  equal(rows[2].isPlayer, false);
});

test('un PNJ sans action en reçoit trois au premier enregistrement, sans modifier la source', () => {
  const source = { actions: [] };
  const result = actionsForAntagonistUpdate(source, { ...source, knownToPlayers: true });
  equal(result.length, 3);
  equal(result[0].zone, 'Elyséum / Atrium');
  deepEqual(source.actions, []);
});

test('modifier les bonus conserve les trois actions de base et les actions supplémentaires', () => {
  const original = [action, { ...action }, { ...action }, { ...action, description: 'Quatrième action' }];
  const result = buildAntagonistActions(original, { hasIT: true, scienceCount: 1, scienceTitle: 'Médecine' });
  equal(result.length, 6);
  equal(result[3].bonusType, 'Informatique');
  equal(result[4].subject, 'Médecine');
  equal(result[5].description, 'Quatrième action');
  deepEqual(result[0], action);
  notEqual(result[0], action);
  equal(original.length, 4);
});

test('Sciences : une AIP par champ d’étude, texte conservé pour son champ', () => {
  const old = [action, { ...action }, { ...action },
    { ...action, bonusType: 'Sciences', subject: 'Chimie', description: 'Analyse du poison' },
    { ...action, bonusType: 'Sciences', subject: 'Médecine', description: 'Autopsie' }];
  const result = buildAntagonistActions(old, { sciences: ['Médecine', 'Chimie', 'Géologie'] });
  deepEqual(result.slice(3).map(a => [a.subject, a.description]), [['Médecine', 'Autopsie'], ['Chimie', 'Analyse du poison'], ['Géologie', '']]);
  equal(result[5].bonusType, 'Sciences');
});

test('anciens PNJ : scienceCount et scienceTitle deviennent des champs d’étude', () => {
  deepEqual(npcSciences({ scienceCount: 2, scienceTitle: 'Médecine' }), ['Médecine', 'Médecine']);
  deepEqual(npcSciences({ sciences: [' Chimie '], scienceCount: 5 }), ['Chimie']);
});

test('Informatique : une seule AIP, utilisation normale par défaut ; bonus nommés multipliés', () => {
  const result = buildAntagonistActions([], { hasIT: true, bonuses: [{ name: 'Homoncule', count: 2 }, { name: '  ' }] });
  equal(result.length, 6);
  equal(result[3].bonusType, 'Informatique');
  equal(result[3].itUse, 'normale');
  deepEqual(result.slice(4).map(a => [a.bonusType, a.subject]), [['Autre', 'Homoncule'], ['Autre', 'Homoncule']]);
  deepEqual(npcBonuses({ bonuses: [{ name: 'Homoncule', count: '0' }] }), [{ name: 'Homoncule', count: 1 }]);
});

test('changer un champ d’étude reconstruit les actions, changer le nom non', () => {
  const existing = { showInAips: true, sciences: ['Médecine'], actions: [action] };
  equal(actionsForAntagonistUpdate(existing, { ...existing, name: 'Autre nom' }), existing.actions);
  notEqual(actionsForAntagonistUpdate(existing, { ...existing, sciences: ['Chimie'] }), existing.actions);
});
