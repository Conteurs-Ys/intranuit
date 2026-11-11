import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInfluenceAction, globalActionChoices, npcInfluence, planNpcInfluenceWrite } from '../src/utils/npcInfluences.js';

const form = {
  category: 'pegre', actionType: 'globale', actionName: 'La Rumeur', level: 3, actionsSpent: '2',
  specialization: 'Police', network: '  Agents de patrouille de nuit ', description: ' Écoute ', assignedTo: 'st1',
};

test('action construite proprement', () => {
  const a = buildInfluenceAction(form);
  assert.equal(a.influenceName, 'Agents de patrouille de nuit');
  assert.equal(a.description, 'Écoute');
  assert.equal(a.actionsSpent, 2);
  assert.equal(a.level, 3);
  assert.equal(buildInfluenceAction({ ...form, level: 42, actionsSpent: 0 }).level, 10);
  assert.equal(buildInfluenceAction({ ...form, actionsSpent: 0 }).actionsSpent, 1);
});

test('actions globales : niveau atteint plus celle du niveau au-dessus', () => {
  const list = globalActionChoices('gotha', 2);
  assert.deepEqual(list.map(a => a.level), [1, 2, 3]);
  assert.equal(list.find(a => a.level === 3).reach, true);
  assert.equal(list.find(a => a.level === 2).reach, false);
});

test('fiche PNJ : niveau et spécialités facultatifs', () => {
  assert.deepEqual(npcInfluence({}, 'gotha'), { level: null, specs: [] });
  const antag = { influences: { pegre: { level: 4, specs: [{ spec: 'Rue', network: 'Gamins' }, { spec: '' }] } } };
  assert.deepEqual(npcInfluence(antag, 'pegre'), { level: 4, specs: [{ spec: 'Rue', network: 'Gamins' }] });
});

test('nouveau dossier PNJ relié à sa fiche', () => {
  const antag = { id: 'pnj1', name: 'Le Baron', sect: 'Anarch', clan: 'Brujah' };
  const plan = planNpcInfluenceWrite({ influences: [], form, antag, month: 'Octobre 2026', year: 2026, monthName: 'Octobre' });
  assert.equal(plan.id, null);
  assert.equal(plan.create.antagonistId, 'pnj1');
  assert.equal(plan.create.status, 'npc');
  assert.equal(plan.create.characterName, 'Le Baron');
  assert.equal(plan.create.actions.length, 1);
});

test('le dossier du mois du même PNJ est complété, pas dupliqué', () => {
  const antag = { id: 'pnj1', name: 'Le Baron' };
  const influences = [
    { id: 'autre-mois', status: 'npc', antagonistId: 'pnj1', monthLabel: 'Septembre 2026', actions: [] },
    { id: 'ok', status: 'npc', antagonistId: 'pnj1', monthLabel: 'Octobre 2026', actions: [{ id: 1 }] },
    { id: 'joueur', status: 'submitted', userId: 'pnj1', monthLabel: 'Octobre 2026', actions: [] },
  ];
  const plan = planNpcInfluenceWrite({ influences, form, antag, month: 'Octobre 2026', year: 2026, monthName: 'Octobre' });
  assert.equal(plan.id, 'ok');
  assert.equal(plan.update.actions.length, 2);
});

test('entité libre : regroupée par nom, sans lien PNJ', () => {
  const influences = [{ id: 'libre', status: 'npc', characterName: 'Entité inconnue', monthLabel: 'Octobre 2026', actions: [] }];
  const plan = planNpcInfluenceWrite({ influences, form: { ...form, name: ' entité inconnue ' }, antag: null, month: 'Octobre 2026' });
  assert.equal(plan.id, 'libre');
  const fresh = planNpcInfluenceWrite({ influences, form: { ...form, name: 'Autre' }, antag: null, month: 'Octobre 2026' });
  assert.equal(fresh.id, null);
  assert.equal(fresh.create.antagonistId, undefined);
});
