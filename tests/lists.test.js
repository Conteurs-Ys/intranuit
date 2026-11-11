import test from 'node:test';
import assert from 'node:assert/strict';
import { addItem, DEFAULT_LISTS, moveItem, normalizeLists, optionsWith, removeItem, renameItem } from '../src/utils/lists.js';

test('sans document : listes du code', () => {
  assert.deepEqual(normalizeLists(undefined), { zones: DEFAULT_LISTS.zones, actionTypes: DEFAULT_LISTS.actionTypes });
});

test('nettoyage, et types protégés toujours présents', () => {
  const l = normalizeLists({ zones: [' Port ', 'Port', ''], actionTypes: ['Enquête'] });
  assert.deepEqual(l.zones, ['Port']);
  assert.deepEqual(l.actionTypes, ['Enquête', 'Se nourrir', 'Apprentissage']);
});

test('édition : renommer, retirer, déplacer, ajouter', () => {
  const list = ['Se nourrir', 'Enquête', 'Artisanat'];
  assert.deepEqual(renameItem(list, 1, 'Investigation'), ['Se nourrir', 'Investigation', 'Artisanat']);
  assert.equal(renameItem(list, 0, 'Chasser'), list, 'type protégé');
  assert.equal(renameItem(list, 1, 'Artisanat'), list, 'doublon');
  assert.deepEqual(removeItem(list, 2), ['Se nourrir', 'Enquête']);
  assert.equal(removeItem(list, 0), list, 'type protégé');
  assert.deepEqual(moveItem(list, 2, -1), ['Se nourrir', 'Artisanat', 'Enquête']);
  assert.equal(moveItem(list, 0, -1), list);
  assert.deepEqual(addItem(list, ' Patrouiller '), [...list, 'Patrouiller']);
  assert.equal(addItem(list, 'Enquête'), list);
});

test('valeur retirée de la liste : encore proposée sur l\'ancien dossier', () => {
  assert.deepEqual(optionsWith(['A', 'B'], 'Z'), ['Z', 'A', 'B']);
  assert.deepEqual(optionsWith(['A', 'B'], 'A'), ['A', 'B']);
  assert.deepEqual(optionsWith(['A'], ''), ['A']);
});
