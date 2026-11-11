import test from 'node:test';
import assert from 'node:assert/strict';
import { obstructionFor, obstructs, stackObstructions } from '../src/utils/obstruction.js';

const obst = (extra) => ({ actionType: 'ciblée', actionName: 'Obstruction', category: 'gotha', actionsSpent: 1, ...extra });
const rumeur = { actionType: 'globale', actionName: 'La Rumeur', category: 'pegre', specialization: 'Police', actionsSpent: 1 };
const owner = { userId: 'ilse', characterName: 'Ilse', monthLabel: 'Octobre 2026' };

test('cumul façon soutien (exemples des règles)', () => {
  assert.equal(stackObstructions([1, 1, 1, 1, 1]), 3);
  assert.equal(stackObstructions([3, 3]), 4);
  assert.equal(stackObstructions([2, 2, 2]), 3);
  assert.equal(stackObstructions([]), 0);
});

test('catégorie obstruée choisie, même si l’obstruction vient de l’autre catégorie', () => {
  assert.equal(obstructs(obst({ obstructedCategory: 'pegre', obstructionTarget: 'rumeurs', obstructionScope: 'Police' }), rumeur), true);
  assert.equal(obstructs(obst({ obstructedCategory: 'gotha', obstructionTarget: 'rumeurs', obstructionScope: 'all' }), rumeur), false);
});

test('rumeurs : une spécialité ou les 15 à la fois', () => {
  assert.equal(obstructs(obst({ obstructedCategory: 'pegre', obstructionTarget: 'rumeurs', obstructionScope: 'all' }), rumeur), true);
  assert.equal(obstructs(obst({ obstructedCategory: 'pegre', obstructionTarget: 'rumeurs', obstructionScope: 'Rue' }), rumeur), false);
});

test('une action globale précise ; jamais les ciblées ; « autre » laissé au conteur', () => {
  const faveurs = { actionType: 'globale', actionName: 'Faveurs illégales', category: 'pegre' };
  assert.equal(obstructs(obst({ obstructedCategory: 'pegre', obstructionTarget: 'action', obstructedAction: 'Faveurs illégales' }), faveurs), false);
  assert.equal(obstructs(obst({ obstructedCategory: 'pegre', obstructionTarget: 'action', obstructedAction: 'La Rumeur' }), faveurs), false);
  assert.equal(obstructs(obst({ obstructedCategory: 'pegre', obstructionTarget: 'autre', obstructionText: 'armes' }), faveurs), false);
  assert.equal(obstructs(obst({ obstructedCategory: 'pegre', obstructionTarget: 'action', obstructedAction: 'Attaque' }), { actionType: 'ciblée', actionName: 'Attaque', category: 'pegre' }), false);
});

test('ancienne obstruction sans cible : rumeurs de sa catégorie et de sa spécialité', () => {
  assert.equal(obstructs({ actionType: 'ciblée', actionName: 'Obstruction', category: 'pegre', specialization: 'Police' }, rumeur), true);
  assert.equal(obstructs({ actionType: 'ciblée', actionName: 'Obstruction', category: 'pegre', specialization: 'Rue' }, rumeur), false);
});

test('niveau subi : même cycle, autres personnages, cumul par provenance', () => {
  const target = { obstructedCategory: 'pegre', obstructionTarget: 'rumeurs', obstructionScope: 'all' };
  const dossiers = [
    { userId: 'bob', characterName: 'Bob', monthLabel: 'Octobre 2026', actions: [obst({ ...target, actionsSpent: 1 }), obst({ ...target, actionsSpent: 1 })] },
    { antagonistId: 'pnj1', characterName: 'Le Baron', monthLabel: 'Octobre 2026', actions: [obst({ ...target, actionsSpent: 1 })] },
    { userId: 'ilse', characterName: 'Ilse', monthLabel: 'Octobre 2026', actions: [obst({ ...target, actionsSpent: 4 })] },
    { userId: 'carl', characterName: 'Carl', monthLabel: 'Septembre 2026', actions: [obst({ ...target, actionsSpent: 4 })] },
  ];
  const res = obstructionFor(rumeur, owner, dossiers);
  // Bob : 2 points (une provenance), le Baron : 1 → 2 puis +1 insuffisant (il faut 2) → 2
  assert.equal(res.level, 2);
  assert.equal(res.needed, 3);
  assert.equal(res.sources.length, 3);
});
