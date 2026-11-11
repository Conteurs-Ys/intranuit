import * as XLSX from 'xlsx';
import { expenseStatus } from './expenses.js';
import { hasAnswers } from './dossierState.js';
import { aipTypeLabel } from './aipLabel.js';
import { isRumorAction } from './rumors.js';
import { isObstruction, obstructionTarget, ALL_SPECIALTIES } from './obstruction.js';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const category = value => ({ gotha: 'Gotha', pegre: 'Pègre' }[value] || value || '');
const cycle = entry => entry.monthLabel || [entry.month, entry.year].filter(Boolean).join(' ') || 'Sans cycle';
const year = entry => entry.year || Number(cycle(entry).match(/\d{4}$/)?.[0]) || '';
const visible = (entry, options) => options.staff || hasAnswers(entry);
const reply = (entry, action, options) => visible(entry, options) ? action.response || '' : 'En attente de diffusion';

function months(entries) {
  const groups = new Map();
  entries.forEach(entry => { const label = cycle(entry); groups.set(label, [...(groups.get(label) || []), entry]); });
  const key = entry => Number(year(entry)) * 12 + MONTHS.indexOf(entry.month || cycle(entry).split(' ')[0]);
  return [...groups.entries()].sort((a, b) => key(b[1][0]) - key(a[1][0]));
}

function append(wb, name, headers, rows) {
  let title = name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Export';
  const base = title;
  let suffix = 1;
  while (wb.SheetNames.includes(title)) { const n = ` ${++suffix}`; title = base.slice(0, 31 - n.length) + n; }
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Long narratives remain readable without generating columns thousands of characters wide.
  sheet['!cols'] = headers.map((h, index) => ({ wch: Math.min(65, rows.reduce((width, row) => Math.max(width, Math.min(65, String(row[index] ?? '').length + 2)), h.length + 2)) }));
  sheet['!autofilter'] = { ref: sheet['!ref'] };
  XLSX.utils.book_append_sheet(wb, sheet, title);
}

function obstructionLabel(action) {
  if (!isObstruction(action)) return '';
  const target = obstructionTarget(action);
  const activity = target.target === 'rumeurs' ? `Rumeurs · ${target.scope === ALL_SPECIALTIES ? '15 spécialités' : target.scope}`
    : target.target === 'action' ? target.action : target.text;
  return `${category(target.category)} · ${activity || 'À préciser'}`;
}

export function buildAIPWorkbook(entries = [], options = {}) {
  const wb = XLSX.utils.book_new();
  months(entries).forEach(([label, dossiers]) => {
    const rows = dossiers.flatMap(d => [...(d.actions || []).map((action, i) => ({ action, number: i + 1 })),
      ...(d.bonus || []).map(action => ({ action, number: `Bonus · ${action.bonusType || 'Autre'}${action.subject ? ` · ${action.subject}` : ''}` }))]
      .map(({ action: a, number }) => [cycle(d), year(d), d.sect || '', d.characterName || '', d.clan || '', number,
        aipTypeLabel(a), a.zone || '', (a.people || []).join(', '), a.description || '', reply(d, a, options)]));
    append(wb, label, ['Cycle', 'Année', 'Secte', 'Personnage', 'Clan', 'AIP n°', 'Type d’action', 'Lieu', 'Avec qui', 'Description', 'Réponse du conteur'], rows);
    const expenses = dossiers.flatMap(d => (d.expenses || []).map(e => [cycle(d), year(d), d.characterName || '', e.description || '', e.amountCents / 100, ({ pending: 'À valider', approved: 'Validée', rejected: 'Refusée' })[expenseStatus(e, d.expenseReviews?.[e.id])], expenseStatus(e, d.expenseReviews?.[e.id]) !== 'pending' ? d.expenseReviews[e.id].reason || '' : '']));
    if (expenses.length) append(wb, `Dépenses ${label}`, ['Cycle', 'Année', 'Personnage', 'Motif', 'Montant (€)', 'Validation conteur', 'Motif du refus'], expenses);
  });
  return wb;
}

export function buildInfluenceWorkbook(entries = [], options = {}) {
  const wb = XLSX.utils.book_new();
  months(entries).forEach(([label, dossiers]) => {
    const rows = dossiers.flatMap(d => (d.actions || []).map((a, i) => [cycle(d), year(d), d.status === 'npc' || d.antagonistId ? 'PNJ' : 'Joueur',
      d.characterName || '', i + 1, category(a.category), a.level ?? '', a.actionType === 'ciblée' ? 'Ciblée' : 'Globale', a.actionName || '',
      a.actionsSpent || 1, a.specialization || '', a.influenceName || '', obstructionLabel(a), a.description || '', reply(d, a, options)]));
    append(wb, label, ['Cycle', 'Année', 'Type de personnage', 'Personnage', 'Action n°', 'Catégorie', 'Niveau', 'Type d’action', 'Action', 'Actions dépensées', 'Spécialité', 'Réseau / cible', 'Cible de l’obstruction', 'Description', 'Résultat'], rows);
    const rumors = [];
    dossiers.forEach(d => (d.actions || []).forEach((a, i) => {
      if (!isRumorAction(a) || !visible(d, options)) return;
      const common = [cycle(d), year(d), d.characterName || '', i + 1, category(a.category), (a.rumorCoveredSpecs || []).join(', ')];
      const result = a.rumorObstructed ? 'Rumeur entièrement obstruée' : a.rumorFrozenAt ? 'Résultat diffusé' : hasAnswers(d) ? 'Résultat archivé' : 'Tableau non figé';
      const narrative = a.rumorNarrative || '';
      // Only the published snapshot: never export raw sources, edits or author identities.
      if (a.rumorTable?.length) a.rumorTable.forEach(r => rumors.push([...common, r.institution || '', r.specialization || '', r.trace || '', narrative, result]));
      else rumors.push([...common, '', '', a.rumorFrozenAt ? 'Aucune information obtenue' : '', narrative, result]);
    }));
    if (rumors.length) append(wb, `Rumeurs ${label}`, ['Cycle de réception', 'Année', 'Destinataire', 'Action n°', 'Catégorie', 'Spécialités couvertes', 'Institution / individu mortel', 'Spécialité', 'Information reçue', 'Complément narratif', 'Bilan'], rumors);
  });
  return wb;
}
