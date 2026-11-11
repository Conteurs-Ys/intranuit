import test from 'node:test';
import assert from 'node:assert/strict';
import { groupIndex, mentionsOf, rowKey, suggestGroups } from '../src/utils/aipGroups.js';

const pj = (aipId, characterName, idx, extra = {}) => ({ aipId, characterName, actionIdx: idx, isPlayer: true, isBonus: false, ...extra });
const npc = (aipId, characterName, idx, extra = {}) => ({ aipId, characterName, actionIdx: idx, isPlayer: false, ...extra });

test('clé stable : identifiant d’action si présent, sinon position', () => {
  assert.equal(rowKey(pj('d1', 'Ilse', 0, { id: 2 })), 'd1:actions:2');
  assert.equal(rowKey(pj('d1', 'Ilse', 1, { isBonus: true })), 'd1:bonus:i1');
  assert.equal(rowKey(npc('pnj1', 'Le Baron', 3)), 'npc:pnj1:3');
});

test('personnes citées : Avec qui et noms connus dans le texte, sans accents ni soi-même', () => {
  const row = pj('d1', 'Ilse Varga', 0, { people: ['Malachie Roux'], description: "Je file le baron jusqu'au port, avec ilse varga en couverture" });
  const names = mentionsOf(row, ['Le Baron', 'Ilse Varga', 'Malachie Roux', 'Ana']).map(m => m.name);
  assert.deepEqual(names.sort(), ['Le Baron', 'Malachie Roux']);
});

test('pas de faux positif sur un morceau de mot', () => {
  const row = pj('d1', 'Ilse', 0, { description: 'Les baronnies du nord' });
  assert.deepEqual(mentionsOf(row, ['Le Baron', 'Baron']), []);
});

test('suggestion seulement si tous les acteurs sont les mêmes (auteur compris)', () => {
  const names = ['Le Baron', 'Ilse Varga', 'Malachie Roux'];
  const rows = [
    pj('d2', 'Malachie Roux', 0, { id: 1, people: ['Le Baron', 'Ilse Varga'] }),
    pj('d2', 'Malachie Roux', 1, { id: 2, description: 'Surveiller le bar où Le Baron reçoit.' }),
    npc('pnj1', 'Le Baron', 0, { description: 'Faire suivre Malachie Roux.' }),
    pj('d1', 'Ilse Varga', 0, { id: 1, people: ['Le Baron'] }),
    pj('d1', 'Ilse Varga', 1, { id: 2, people: ['Malachie Roux', 'Le Baron'] }),
  ];
  const suggestions = suggestGroups(rows, { knownNames: names });
  assert.deepEqual(suggestions.map(s => [s.actors, s.keys]), [
    [['Ilse Varga', 'Le Baron', 'Malachie Roux'], ['d1:actions:2', 'd2:actions:1']],
    [['Le Baron', 'Malachie Roux'], ['d2:actions:2', 'npc:pnj1:0']],
  ]);
});

test('AIP sans personne impliquée jamais suggérées ; AIP déjà groupées écartées', () => {
  const rows = [
    pj('d1', 'Ilse', 0, { id: 1, description: 'Se nourrir.' }),
    pj('d1', 'Ilse', 1, { id: 2, description: 'Patrouiller.' }),
    pj('d1', 'Ilse', 2, { id: 3, people: ['Le Baron'] }),
    pj('d1', 'Ilse', 3, { id: 4, people: ['le baron'] }),
  ];
  assert.deepEqual(suggestGroups(rows).map(s => s.keys), [['d1:actions:3', 'd1:actions:4']]);
  assert.equal(suggestGroups(rows, { exclude: new Set(['d1:actions:4']) }).length, 0);
});

test('une AIP n’appartient qu’au premier groupe qui la contient', () => {
  const index = groupIndex([{ id: 'g1', members: ['a', 'b'] }, { id: 'g2', members: ['b', 'c'] }]);
  assert.equal(index.get('b').id, 'g1');
  assert.equal(index.get('c').id, 'g2');
});
