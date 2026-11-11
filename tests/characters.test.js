import test from 'node:test';
import assert from 'node:assert/strict';
import { activeCharacterId, belongsTo, charactersOf, dossierCharacterId, reactivate, startNewCharacter, syncActive } from '../src/utils/characters.js';

const old = { uid: 'u', role: 'player', name: 'Ilse', clan: 'Toréador', sect: 'Camarilla', sheet: { troupeau: 2 } };
const NOW = '2026-10-30T10:00:00.000Z';

test('ancien profil : un seul personnage actif, ses dossiers lui appartiennent', () => {
  assert.deepEqual(charactersOf(old), [{ id: 'c1', name: 'Ilse', clan: 'Toréador', sect: 'Camarilla', sheet: { troupeau: 2 }, status: 'actif' }]);
  assert.equal(activeCharacterId(old), 'c1');
  assert.equal(dossierCharacterId({ monthLabel: 'Mai 2025' }, old), 'c1');
});

test('nouveau personnage : l\'ancien est retiré ou mort, le nouveau actif avec une fiche vide', () => {
  const p = startNewCharacter(old, { name: 'Basile', clan: 'Brujah', sect: 'Anarch' }, 'mort', NOW);
  assert.equal(p.name, 'Basile');
  assert.equal(p.activeCharacterId, 'c2');
  assert.equal(p.sheet.troupeau, 0);
  assert.deepEqual(p.characters.map(c => [c.id, c.name, c.status]), [['c1', 'Ilse', 'mort'], ['c2', 'Basile', 'actif']]);
  assert.equal(p.characters[0].sheet.troupeau, 2, 'la fiche de l\'ancien est conservée');
  assert.equal(p.characters[0].endedAt, NOW);
  // Les anciens dossiers restent à Ilse ; les nouveaux portent l'identifiant de Basile.
  assert.equal(belongsTo({ monthLabel: 'Mai 2025' }, 'c1', p), true);
  assert.equal(belongsTo({ characterId: 'c2' }, 'c1', p), false);
  assert.throws(() => startNewCharacter(old, { name: 'X' }, 'actif'));
});

test('modifier le profil met à jour le personnage actif', () => {
  const p = startNewCharacter(old, { name: 'Basile', clan: 'Brujah', sect: 'Anarch' }, 'retiré', NOW);
  const edited = syncActive({ ...p, name: 'Basile Roux' });
  assert.equal(edited.characters.find(c => c.id === 'c2').name, 'Basile Roux');
  assert.equal(edited.characters.find(c => c.id === 'c1').name, 'Ilse');
});

test('réactiver un ancien personnage : l\'actif passe retiré', () => {
  const p = startNewCharacter(old, { name: 'Basile', clan: 'Brujah', sect: 'Anarch' }, 'retiré', NOW);
  const back = reactivate(p, 'c1', NOW);
  assert.equal(back.name, 'Ilse');
  assert.equal(back.sheet.troupeau, 2);
  assert.deepEqual(back.characters.map(c => [c.id, c.status]), [['c1', 'actif'], ['c2', 'retiré']]);
  assert.equal(back.characters[0].endedAt, undefined);
});
