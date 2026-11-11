import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, setDoc, doc } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';

export default function useInfluences(userId = null) {
  const [influences, setInfluences] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'artifacts', currentAppId, 'public', 'data', 'global_influences'),
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setInfluences(userId ? all.filter(i => i.userId === userId) : all);
      }
    );
    return () => unsub();
  }, [userId]);

  const submitInfluence = async (payload) => {
    const ref = payload.id
      ? doc(db, 'artifacts', currentAppId, 'public', 'data', 'global_influences', payload.id)
      : doc(collection(db, 'artifacts', currentAppId, 'public', 'data', 'global_influences'));
    await setDoc(ref, { ...payload, id: ref.id });
    return ref.id;
  };

  return { influences, submitInfluence };
}