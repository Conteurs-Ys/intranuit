import test from 'node:test';
import assert from 'node:assert/strict';
import { influenceSummary, isNpcGone, npcAipCount, npcInfluencesForMonth, npcStatus, sheetPayload } from '../src/utils/antagonistSheet.js';

test('un ancien PNJ sans statut est actif', () => {
  assert.equal(npcStatus({}), 'actif');
  assert.equal(isNpcGone({ status: 'mort' }), true);
  assert.equal(isNpcGone({ status: 'sommeil' }), false);
});

test('fiche nettoyée : niveaux bornés, spécialités limitées au niveau', () => {
  const p = sheetPayload({
    name: '  Le Baron ', sciences: ['Médecine', ' ', 'Chimie '], bonuses: [{ name: 'Homoncule', count: '2' }],
    influences: { gotha: { level: 9, specs: [{ spec: 'Police', network: ' Commissaire ' }] }, pegre: { level: 1, specs: [{ spec: 'Rue' }, { spec: 'Crime' }, { spec: '' }] } },
  });
  assert.equal(p.name, 'Le Baron');
  assert.deepEqual(p.sciences, ['Médecine', 'Chimie']);
  assert.equal(p.scienceCount, 2);
  assert.deepEqual(p.bonuses, [{ name: 'Homoncule', count: 2 }]);
  assert.equal(p.status, 'actif');
  assert.deepEqual(p.influences.gotha, { level: 5, specs: [{ spec: 'Police', network: 'Commissaire' }] });
  assert.deepEqual(p.influences.pegre, { level: 1, specs: [{ spec: 'Rue', network: '' }] });
});

test('nombre d’AIP et résumé d’influence', () => {
  assert.equal(npcAipCount({}), 3);
  assert.equal(npcAipCount({ hasIT: true, scienceCount: 2 }), 6);
  assert.equal(npcAipCount({ hasIT: true, sciences: ['Chimie'], bonuses: [{ name: 'Homoncule', count: 2 }] }), 7);
  assert.equal(influenceSummary({ influences: { gotha: { level: 3 }, pegre: { level: 2 } } }), 'Gotha 3 · Pègre 2');
  assert.equal(influenceSummary({}), '');
});

test('influences du mois : par lien, ou par nom pour les anciennes lignes', () => {
  const antag = { id: 'pnj1', name: 'Le Baron' };
  const influences = [
    { id: 'a', status: 'npc', antagonistId: 'pnj1', monthLabel: 'Octobre 2026' },
    { id: 'b', status: 'npc', characterName: 'le baron ', monthLabel: 'Octobre 2026' },
    { id: 'c', status: 'npc', antagonistId: 'autre', characterName: 'Le Baron', monthLabel: 'Octobre 2026' },
    { id: 'd', status: 'npc', antagonistId: 'pnj1', monthLabel: 'Septembre 2026' },
    { id: 'e', status: 'submitted', characterName: 'Le Baron', monthLabel: 'Octobre 2026' },
  ];
  assert.deepEqual(npcInfluencesForMonth(influences, antag, 'Octobre 2026').map(i => i.id), ['a', 'b']);
});
