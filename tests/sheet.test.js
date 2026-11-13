import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sheetOf } from '../src/utils/sheet.js';

test('complète les fiches historiques partielles sans perdre les niveaux déclarés', () => {
  const profile = { sheet: { gotha: { level: 3 }, pegre: { level: 2 }, troupeau: 1 } };
  const result = sheetOf(profile);
  assert.deepEqual(result.gotha, { level: 3, specs: [] });
  assert.deepEqual(result.pegre, { level: 2, specs: [] });
  assert.deepEqual(result.bonuses, []);
  assert.equal(result.troupeau, 1);
  assert.equal(profile.sheet.gotha.specs, undefined);
});

test('normalise les listes nulles tout en conservant les spécialités et atouts existants', () => {
  const result = sheetOf({ sheet: { gotha: null, pegre: { specs: [{ spec: 'Police', name: 'Commissariat' }] }, sciences: null, bonuses: null, scores: null, transactionsLouches: true } });
  assert.deepEqual(result.gotha, { level: 0, specs: [] });
  assert.equal(result.pegre.specs[0].spec, 'Police');
  assert.equal(result.transactionsLouches, true);
  assert.deepEqual(result.scores, []);
  assert.deepEqual(sheetOf().pegre.specs, []);
});

test('Parangon : bonus par influence, lieutenant actif et résumé pour le conteur', async () => {
  const { parangonBonus, actingLieutenant, lieutenantSummary, lieutenantSheet } = await import('../src/utils/lieutenant.js');
  const ventrue = { clan: 'Ventrue' };
  const sheet = sheetOf({ sheet: { parangon: true, gotha: { level: 2 }, lieutenant: { name: ' Octave ', category: 'pegre', level: 7, specs: [{ spec: 'Police' }, { spec: '' }] } } });
  assert.deepEqual(parangonBonus(ventrue, sheet), { gotha: 1, pegre: 0 });
  assert.deepEqual(parangonBonus({ clan: 'Brujah' }, sheet), { gotha: 0, pegre: 0 });
  const lt = actingLieutenant(ventrue, sheet);
  assert.equal(lt.level, 3);
  assert.equal(actingLieutenant({ clan: 'Brujah' }, sheet), null);
  const two = actingLieutenant(ventrue, sheetOf({ sheet: { parangon: true, lieutenant: { category: 'gotha', level: 2, specs: [{ spec: 'Police' }, { spec: '' }, { spec: 'Rue' }, { spec: 'Finance' }] } } }));
  assert.deepEqual(two.specs.map(s => s.spec), ['Police', 'Rue']);
  assert.equal(actingLieutenant(ventrue, sheetOf({ sheet: { parangon: true, lieutenant: { category: 'gotha', level: 0 } } })), null);
  assert.deepEqual(lieutenantSummary(lt), { name: 'Octave', category: 'pegre', level: 3, specs: ['Police'], ressources: 0, havre: 0, troupeau: 0 });
  assert.deepEqual(lieutenantSheet(lt).pegre.specs, lt.specs);
  assert.deepEqual(sheetOf({}).lieutenant.category, '');
});
