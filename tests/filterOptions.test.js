import test from 'node:test';
import assert from 'node:assert/strict';
import { countOptions } from '../src/utils/filterOptions.js';
import { aipTypeKey } from '../src/utils/aipLabel.js';

test('les AIP de Sciences sont regroupées quel que soit le champ', () => {
  const rows = [
    { type: 'Enquête' }, { type: 'Enquête' },
    { bonusType: 'Sciences', subject: 'Médecine' }, { bonusType: 'Sciences', subject: 'Chimie' },
    { bonusType: 'Informatique', itUse: 'annuler' }, { bonusType: 'Autre', subject: 'Homoncule' }, {},
  ];
  const opts = countOptions(rows, aipTypeKey, { order: ['Enquête', 'AIP Informatique', 'AIP Sciences', 'AIP bonus'] });
  assert.deepEqual(opts.map(o => [o.value, o.count]), [
    ['Enquête', 2], ['AIP Informatique', 1], ['AIP Sciences', 2], ['AIP bonus', 1], ['Sans type', 1],
  ]);
});

test('seules les valeurs présentes sont proposées, avec un libellé au choix', () => {
  const opts = countOptions([{ s: 'npc' }, { s: 'pj' }, { s: 'pj' }, { s: null }], r => r.s, { labelOf: v => (v === 'pj' ? 'Joueurs' : 'PNJ') });
  assert.deepEqual(opts, [{ value: 'pj', label: 'Joueurs', count: 2 }, { value: 'npc', label: 'PNJ', count: 1 }]);
});
