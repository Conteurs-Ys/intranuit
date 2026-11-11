import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleStep, isCycleOpen, nextCycle, shiftCycle, upcomingCycles } from '../src/utils/cycle.js';

const oct = { label: 'Octobre 2026', month: 'Octobre', year: 2026 };

test('ouvert par défaut, rythme mensuel par défaut', () => {
  assert.equal(isCycleOpen(oct), true);
  assert.equal(isCycleOpen({ ...oct, open: false }), false);
  assert.equal(cycleStep(oct), 1);
  assert.equal(cycleStep({ ...oct, step: 2 }), 2);
});

test('cycle suivant : un ou deux mois plus tard, passage d\'année compris, rouvert', () => {
  assert.equal(nextCycle(oct).label, 'Novembre 2026');
  assert.equal(nextCycle({ ...oct, step: 2 }).label, 'Décembre 2026');
  const dec = { label: 'Décembre 2026', month: 'Décembre', year: 2026, step: 2, open: false, deadline: '2026-12-10' };
  assert.deepEqual(nextCycle(dec), { label: 'Février 2027', month: 'Février', year: 2027, open: true, deadline: null });
});

test('mois au choix : on peut sauter l\'été', () => {
  const juin = { label: 'Juin 2027', month: 'Juin', year: 2027 };
  assert.equal(shiftCycle(juin, 3).label, 'Septembre 2027');
  assert.deepEqual(upcomingCycles(oct, 3).map(c => c.label), ['Novembre 2026', 'Décembre 2026', 'Janvier 2027']);
});
