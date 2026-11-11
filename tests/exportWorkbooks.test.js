import { test } from 'node:test';
import { equal, deepEqual, ok } from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { buildAIPWorkbook, buildInfluenceWorkbook } from '../src/utils/exportWorkbooks.js';

const dossier = { id: 'd', characterName: 'Ilse', year: 2026, monthLabel: 'Octobre 2026', status: 'completed' };
const values = (wb, name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
const serialized = wb => JSON.stringify(wb.Sheets);

test('AIP : un onglet par mois avec année écrite, conservation des bonus et des dépenses', () => {
  const wb = buildAIPWorkbook([
    { ...dossier, actions: [{ type: 'Enquête', response: 'Réponse visible' }], bonus: [{ bonusType: 'Autre', subject: 'Homoncule', description: 'Bonus' }], expenses: [{ amountCents: 1250, description: 'Transport' }] },
    { ...dossier, monthLabel: 'Octobre 2025', year: 2025, actions: [{ type: 'Patrouiller' }] },
  ]);
  deepEqual(wb.SheetNames, ['Octobre 2026', 'Dépenses Octobre 2026', 'Octobre 2025']);
  const rows = values(wb, 'Octobre 2026');
  equal(rows[1][0], 'Octobre 2026');
  equal(rows[1][1], 2026);
  ok(rows[2][5].includes('Homoncule'));
  equal(values(wb, 'Dépenses Octobre 2026')[1][4], 12.5);
  equal(rows[1].at(-1), 'Réponse visible');
});

test('export joueur : aucune réponse ni rumeur avant diffusion ; export conteur conservé', () => {
  const entries = [{ ...dossier, status: 'submitted', actions: [{ type: 'Enquête', response: 'SENTENCE PRIVÉE', actionName: 'La Rumeur', category: 'pegre', rumorTable: [{ trace: 'RUMEUR PRIVÉE' }], rumorNarrative: 'COMPLÉMENT PRIVÉ' }] }];
  ok(!serialized(buildAIPWorkbook(entries)).includes('SENTENCE PRIVÉE'));
  const player = buildInfluenceWorkbook(entries);
  deepEqual(player.SheetNames, ['Octobre 2026']);
  for (const hidden of ['SENTENCE PRIVÉE', 'RUMEUR PRIVÉE', 'COMPLÉMENT PRIVÉ']) ok(!serialized(player).includes(hidden));
  ok(serialized(buildInfluenceWorkbook(entries, { staff: true })).includes('SENTENCE PRIVÉE'));
});

test('rumeurs : export du tableau publié et du narratif, sans sources ni auteur responsable', () => {
  const wb = buildInfluenceWorkbook([{ ...dossier, actions: [{ category: 'pegre', actionType: 'globale', actionName: 'La Rumeur',
    rumorFrozenAt: '2026-10-30', rumorCoveredSpecs: ['Police', 'Rue'], rumorNarrative: 'Complément diffusé',
    rumorTable: [{ institution: 'Commissariat', specialization: 'Police', trace: 'Une enquête a été classée.' }],
    rumorEdits: { secret: { actor: 'AUTEUR SECRET', trace: 'TRACE INTERNE' } }, rumorExtra: [{ text: 'AJOUT NON DIFFUSÉ' }],
  }] }]);
  const rows = values(wb, 'Rumeurs Octobre 2026');
  deepEqual(rows[1].slice(6, 10), ['Commissariat', 'Police', 'Une enquête a été classée.', 'Complément diffusé']);
  equal(rows[1][5], 'Police, Rue');
  for (const hidden of ['AUTEUR SECRET', 'TRACE INTERNE', 'AJOUT NON DIFFUSÉ']) ok(!serialized(wb).includes(hidden));
});

test('influences : ciblée/globale, accents et portée d’obstruction conservés', () => {
  const wb = buildInfluenceWorkbook([{ ...dossier, actions: [{ actionName: 'Obstruction', actionType: 'ciblée', category: 'gotha',
    obstructedCategory: 'pegre', obstructionTarget: 'rumeurs', obstructionScope: 'all', actionsSpent: 2 }] }]);
  const rows = values(wb, 'Octobre 2026');
  equal(rows[1][7], 'Ciblée');
  equal(rows[1][12], 'Pègre · Rumeurs · 15 spécialités');
  ok(!serialized(wb).includes('Ã'));
});

test('rumeur obstruée sans information : bilan explicite ; fichier XLSX relisible', () => {
  const wb = buildInfluenceWorkbook([{ ...dossier, actions: [{ actionName: 'La Rumeur', category: 'pegre', rumorFrozenAt: '2026-10-30', rumorObstructed: true, rumorTable: [] }] }]);
  const reread = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
  equal(values(reread, 'Rumeurs Octobre 2026')[1].at(-1), 'Rumeur entièrement obstruée');
});


test('dépenses : statut conteur exporté, modification après validation de nouveau en attente', () => {
  const e = { id: 'e', description: 'Transport', amountCents: 1250 };
  const wb = buildAIPWorkbook([{ ...dossier, expenses: [e], expenseReviews: { e: { ...e, status: 'approved' } } }]);
  equal(values(wb, 'Dépenses Octobre 2026')[1][5], 'Validée');
  const changed = buildAIPWorkbook([{ ...dossier, expenses: [{ ...e, amountCents: 2000 }], expenseReviews: { e: { ...e, status: 'approved' } } }]);
  equal(values(changed, 'Dépenses Octobre 2026')[1][5], 'À valider');
});
