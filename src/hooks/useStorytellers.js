import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';

export default function useStorytellers() {
  const [storytellers, setStorytellers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'artifacts', currentAppId, 'public', 'data', 'storytellers'),
      (snap) => setStorytellers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  const addStoryteller = async ({ pseudo, color }) => {
    await addDoc(collection(db, 'artifacts', currentAppId, 'public', 'data', 'storytellers'), {
      pseudo, color, createdAt: new Date().toISOString()
    });
  };

  const removeStoryteller = async (id) => {
    await deleteDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'storytellers', id));
  };

  const updateColor = async (id, color) => {
    await updateDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'storytellers', id), { color });
  };

  return { storytellers, addStoryteller, removeStoryteller, updateColor };
}