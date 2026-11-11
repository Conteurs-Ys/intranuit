export function expenseCents(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Le montant doit être positif, avec deux décimales au maximum.');
  const [euros, cents = ''] = text.split('.');
  const total = Number(euros) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('Le montant doit être supérieur à zéro et rester dans une plage valide.');
  return total;
}

export function normalizeExpenses(rows = []) {
  return rows.flatMap(row => {
    const description = (row.description || '').trim();
    if (!description && !String(row.amount ?? '').trim()) return [];
    if (!description) throw new Error('Précise le motif de chaque dépense.');
    return [{ id: row.id, description, amountCents: expenseCents(row.amount) }];
  });
}

export const expenseDrafts = (rows = []) => rows.map(row => ({
  id: row.id, description: row.description || '', amount: (row.amountCents / 100).toFixed(2),
}));
export const euroAmount = cents => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const expenseTotal = (rows = []) => rows.reduce((total, row) => total + (Number.isSafeInteger(row.amountCents) ? row.amountCents : 0), 0);

// A decision applies only to the amount and reason actually reviewed.
// Editing either field makes the submitted expense pending again.
export function expenseStatus(row, review) {
  let cents = row.amountCents;
  if (row.amount !== undefined) { try { cents = expenseCents(row.amount); } catch { return 'pending'; } }
  return review && review.amountCents === cents && review.description === (row.description || '').trim()
    && ['approved', 'rejected'].includes(review.status) ? review.status : 'pending';
}

export function expenseDecision(dossier, baseline, status, reason, actor, at) {
  const current = (dossier.expenses || []).find(row => row.id === baseline.id);
  if (!current || current.amountCents !== baseline.amountCents || current.description !== baseline.description) {
    throw new Error('Cette dépense a été modifiée ou retirée. Actualise avant de la traiter.');
  }
  if (expenseStatus(current, dossier.expenseReviews?.[current.id]) !== 'pending') throw new Error('Cette dépense a déjà été traitée.');
  if (!['approved', 'rejected'].includes(status)) throw new Error('Décision inconnue.');
  if (status === 'rejected' && !reason.trim()) throw new Error('Indique le motif du refus.');
  return { ...(dossier.expenseReviews || {}), [current.id]: {
    amountCents: current.amountCents, description: current.description, status,
    reason: reason.trim(), decidedBy: actor, decidedAt: at,
  } };
}
