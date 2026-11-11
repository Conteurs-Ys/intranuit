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
