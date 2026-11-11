import { collection, deleteField, doc, getDocs, runTransaction, writeBatch } from 'firebase/firestore';

// Supprimer le profil et l'accès, conserver l'historique de jeu pour les conteurs.
// Les dossiers gardent leurs identifiants et liens ; le rôle deleted en interdit
// l'accès au joueur, même avec une session Firebase Auth encore ouverte.
export async function deleteAccountData(db, currentAppId, uid, currentUid) {
  if (!uid || uid === currentUid) throw new Error('Impossible de supprimer le compte connecté.');
  const profile = doc(db, 'artifacts', currentAppId, 'users', uid, 'profile', 'info');
  const dataRef = (name, id) => doc(db, 'artifacts', currentAppId, 'public', 'data', name, id);
  const mirror = dataRef('user_profiles', uid);
  const directory = dataRef('directory', uid);

  // Bloquer avant le nettoyage ; une interruption ne redonne jamais l'accès.
  await runTransaction(db, async tx => {
    const snapshot = await tx.get(profile);
    const deletedAt = snapshot.data()?.deletedAt || new Date().toISOString();
    tx.set(profile, { role: 'deleted', deletedAt, cleanupPending: true });
    tx.set(mirror, { uid, role: 'deleted', deletedAt, cleanupPending: true });
    tx.delete(directory);
  });

  const privateProfiles = await getDocs(collection(db, 'artifacts', currentAppId, 'users', uid, 'profile'));
  const refs = privateProfiles.docs.filter(d => d.id !== 'info').map(d => d.ref);
  refs.push(doc(db, 'artifacts', currentAppId, 'users', uid));

  for (let offset = 0; offset < refs.length; offset += 400) {
    const batch = writeBatch(db);
    refs.slice(offset, offset + 400).forEach(ref => batch.delete(ref));
    await batch.commit();
  }

  const finish = writeBatch(db);
  finish.delete(mirror);
  finish.delete(directory);
  finish.update(profile, { cleanupPending: deleteField() });
  await finish.commit();
}
