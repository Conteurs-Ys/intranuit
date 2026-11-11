import { doc, runTransaction } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { expenseDecision } from '../../utils/expenses';
import ExpensesTable from '../ui/ExpensesTable';

export default function ExpenseReviewPanel({ dossier, appId, light }) {
  const decide = async (row, status, reason) => {
    if (!auth.currentUser) throw new Error('Reconnectez-vous avant de poursuivre.');
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'global_aips', dossier.id);
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Ce dossier n’existe plus.');
      tx.update(ref, { expenseReviews: expenseDecision(snap.data(), row, status, reason, auth.currentUser.uid, new Date().toISOString()) });
    });
  };
  return <ExpensesTable rows={dossier.expenses} reviews={dossier.expenseReviews} light={light} onDecision={decide} />;
}
