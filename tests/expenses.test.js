import { test } from 'node:test';
import { deepEqual, equal, throws } from 'node:assert/strict';
import { expenseCents, normalizeExpenses, expenseDrafts, expenseTotal, expenseStatus, expenseDecision } from '../src/utils/expenses.js';

test('les euros sont conservés en centimes sans erreur d’arrondi, avec point ou virgule', () => {
  equal(expenseCents('12,50'), 1250);
  equal(expenseCents('0.29'), 29);
  equal(expenseCents('10'), 1000);
  equal(expenseTotal([{ amountCents: 10 }, { amountCents: 20 }]), 30);
});
test('les lignes vides sont ignorées, les lignes incomplètes et montants invalides refusés', () => {
  deepEqual(normalizeExpenses([{ amount: '', description: ' ' }]), []);
  throws(() => normalizeExpenses([{ amount: '10', description: '' }]), /motif/);
  for (const amount of ['', '-1', '0', '1.234', 'abc', 'Infinity', '99999999999999999']) {
    throws(() => normalizeExpenses([{ id: 'a', amount, description: 'Transport' }]));
  }
});
test('réouvrir puis réenregistrer les dépenses conserve identifiants, motifs et centimes', () => {
  const entries = [{ id: 'a', description: 'Transport', amountCents: 1250 }, { id: 'b', description: 'Achat', amountCents: 29 }];
  deepEqual(normalizeExpenses(expenseDrafts(entries)), entries);
});


test('seul un avis correspondant au montant et au motif valide la dépense', () => {
  const row = { id: 'e', description: 'Transport', amountCents: 1250 };
  const review = { ...row, status: 'approved' };
  equal(expenseStatus(row), 'pending');
  equal(expenseStatus(row, review), 'approved');
  equal(expenseStatus({ ...row, amountCents: 2000 }, review), 'pending');
  equal(expenseStatus({ ...row, description: 'Achat' }, review), 'pending');
  equal(expenseStatus({ ...row, status: 'approved' }), 'pending');
  equal(expenseStatus({ ...row, amount: '12,50' }, review), 'approved');
});

test('décision : refus motivé, concurrence contrôlée, avis des autres lignes conservés', () => {
  const row = { id: 'e', description: 'Transport', amountCents: 1250 };
  const dossier = { expenses: [row], expenseReviews: { autre: { status: 'approved' } } };
  throws(() => expenseDecision(dossier, row, 'rejected', '', 'c', 'date'), /motif/);
  throws(() => expenseDecision({ expenses: [{ ...row, amountCents: 500 }] }, row, 'approved', '', 'c', 'date'), /modifiée/);
  const reviews = expenseDecision(dossier, row, 'rejected', 'À justifier', 'c', 'date');
  equal(reviews.autre.status, 'approved');
  equal(reviews.e.reason, 'À justifier');
  equal(expenseStatus(row, reviews.e), 'rejected');
  throws(() => expenseDecision({ ...dossier, expenseReviews: reviews }, row, 'approved', '', 'c', 'date'), /déjà/);
  const changed = { ...row, amountCents: 500 };
  const resubmitted = expenseDecision({ ...dossier, expenses: [changed], expenseReviews: reviews }, changed, 'approved', '', 'c', 'date');
  equal(expenseStatus(changed, resubmitted.e), 'approved');
});
