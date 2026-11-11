import { test } from 'node:test';
import { equal, deepEqual, ok } from 'node:assert/strict';
import { staffAIPEntries } from '../src/utils/staffAIPExport.js';
import { buildAIPWorkbook } from '../src/utils/exportWorkbooks.js';
import * as XLSX from 'xlsx';

test('export conteur courant : PJ et PNJ actifs, AIP par défaut et bonus avec réponse', () => {
  const entries = staffAIPEntries([
    { characterName: 'PJ', monthLabel: 'Octobre 2026', actions: [{ description: 'Enquête PJ' }] },
    { userId: 'historical_old', monthLabel: 'Octobre 2026' },
  ], [
    { id: 'baron', name: 'Le Baron', actions: [{ description: 'Enquête PNJ' }, { bonusType: 'Sciences', subject: 'Chimie', response: 'Résultat PNJ' }] },
    { id: 'ombre', name: 'Ombre' },
    { id: 'mort', name: 'Mort', status: 'mort' },
  ], 'Octobre 2026', 'Octobre 2026');
  deepEqual(entries.map(d => d.characterName), ['PJ', 'Le Baron', 'Ombre']);
  equal(entries[2].actions.length, 3);
  const wb = buildAIPWorkbook(entries, { staff: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Octobre 2026']);
  ok(rows.some(r => r.Personnage === 'Le Baron' && r['Réponse du conteur'] === 'Résultat PNJ' && r['AIP n°'].includes('Chimie')));
});

test('export conteur archivé : actions du mois choisi, même pour un PNJ retiré ; aucun texte courant', () => {
  const npcs = [{ id: 'baron', name: 'Le Baron', status: 'mort', actions: [{ description: 'Texte courant' }], history: [
    { month: 'Septembre 2026', actions: [{ description: 'Texte septembre' }] },
    { month: 'Octobre 2026', actions: [{ description: 'Texte octobre' }] },
  ] }];
  const entries = staffAIPEntries([], npcs, 'Septembre 2026', 'Novembre 2026');
  equal(entries[0].actions[0].description, 'Texte septembre');
  deepEqual(staffAIPEntries([], npcs, 'Juillet 2026', 'Novembre 2026'), []);
});
