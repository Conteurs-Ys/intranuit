import { doc, runTransaction } from 'firebase/firestore';
import { patchUsage } from './rumors.js';

export function saveRumorUsage(db, appId, key, patch) {
  const id = key.slice(0, key.indexOf(':'));
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', id);
  return runTransaction(db, async tx => {
    const snapshot = await tx.get(ref);
    const actions = snapshot.exists() ? patchUsage(snapshot.data(), key, patch) : null;
    if (!actions) throw new Error('Cet usage n’existe plus. Actualise le tableau.');
    tx.update(ref, { actions, updatedAt: new Date().toISOString() });
  });
}
