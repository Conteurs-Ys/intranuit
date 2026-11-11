import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionReference, activitySignature, missingObstructionActivity, obstructionFor } from '../src/utils/obstruction.js';
const monthLabel = 'Octobre 2026';
const weapon = { id: 'weapon', category: 'pegre', actionType: 'globale', actionName: 'Faveurs illégales', description: 'Acquérir une arme', actionsSpent: 1 };
const drug = { ...weapon, id: 'drug', description: 'Obtenir des drogues' };
const target = { id: 'target', userId: 'pj', characterId: 'c1', monthLabel, actions: [weapon, drug] };
const obstruction = { id: 'obst', category: 'gotha', actionType: 'ciblée', actionName: 'Obstruction', obstructedCategory: 'pegre', obstructionTarget: 'autre', obstructionText: 'Acquisition d’armes', actionsSpent: 2 };
const link = (act, index = 0) => ({ source: actionReference(obstruction, 0), sourceSignature: activitySignature(obstruction), dossierId: target.id, target: actionReference(act, index), targetSignature: activitySignature(act) });
const source = { id: 'source', antagonistId: 'baron', monthLabel, actions: [obstruction], obstructionLinks: [link(weapon)] };
test('seules les activités reliées sont obstruées ; aucun rapprochement par catalogue', () => {
  assert.equal(obstructionFor(weapon, target, [source], 0).level, 2);
  assert.equal(obstructionFor(drug, target, [source], 1).level, 0);
  assert.equal(obstructionFor(weapon, target, [{ ...source, obstructionLinks: [] }], 0).level, 0);
  assert.equal(obstructionFor(weapon, target, [{ ...source, monthLabel: 'Septembre 2026' }], 0).level, 0);
});
test('modification du sens invalide le lien ; dépense et réponse restent modifiables', () => {
  assert.equal(obstructionFor({ ...weapon, description: 'Obtenir des drogues' }, target, [source], 0).level, 0);
  assert.equal(obstructionFor(weapon, target, [{ ...source, actions: [{ ...obstruction, obstructionText: 'Autre activité' }] }], 0).level, 0);
  assert.equal(obstructionFor({ ...weapon, actionsSpent: 3, response: 'Réponse' }, target, [source], 0).needed, 3);
  assert.equal(activitySignature(weapon).includes('Acquérir'), false);
});
test('plusieurs liens, cumul et personnages distincts du même compte', () => {
  const multiple = { ...source, obstructionLinks: [link(weapon), link(drug, 1)] };
  assert.equal(obstructionFor(drug, target, [multiple], 1).level, 2);
  const otherCharacter = { ...source, antagonistId: undefined, userId: 'pj', characterId: 'c2' };
  assert.equal(obstructionFor(weapon, target, [otherCharacter], 0).level, 2);
  assert.equal(obstructionFor(weapon, target, [{ ...otherCharacter, characterId: 'c1' }], 0).level, 0);
  assert.equal(obstructionFor(weapon, target, [source, { ...source, antagonistId: 'second' }], 0).level, 3);
});
test('rumeurs structurées restent automatiques et ne sont pas visées par les liens narratifs', () => {
  const rumor = { ...weapon, actionName: 'La Rumeur', specialization: 'Police' };
  assert.equal(obstructionFor(rumor, target, [{ ...source, obstructionLinks: [link(rumor)] }], 0).level, 0);
  const structured = { ...source, actions: [{ ...obstruction, obstructionTarget: 'rumeurs', obstructionScope: 'Police' }], obstructionLinks: [] };
  assert.equal(obstructionFor(rumor, target, [structured], 0).level, 2);
  assert.equal(obstructionFor({ ...rumor, specialization: 'Rue' }, target, [structured], 0).level, 0);
});
test('activité à décrire obligatoire, ancien catalogue à préciser', () => {
  assert.equal(missingObstructionActivity({ ...obstruction, obstructionText: ' ' }), true);
  assert.equal(missingObstructionActivity({ ...obstruction, obstructionTarget: 'action', obstructionText: '' }), true);
  assert.equal(missingObstructionActivity(obstruction), false);
});
