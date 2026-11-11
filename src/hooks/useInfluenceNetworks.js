import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';

// Catalogue des réseaux d'influence (conteurs uniquement, voir firestore.rules).
const networksCol = () => collection(db, 'artifacts', currentAppId, 'public', 'data', 'influence_networks');

export default function useInfluenceNetworks() {
  const [networks, setNetworks] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(networksCol(), (snap) => {
      setNetworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    }, (e) => { console.error(e); setLoaded(true); });
    return () => unsub();
  }, []);

  const addNetwork = ({ category, specialization, name, notes = '' }) =>
    addDoc(networksCol(), { category, specialization, name: name.trim(), notes, createdAt: new Date().toISOString() });

  const updateNetwork = (id, fields) =>
    updateDoc(doc(networksCol(), id), { ...fields, updatedAt: new Date().toISOString() });

  const removeNetwork = (id) => deleteDoc(doc(networksCol(), id));

  // Ajout groupé (exemples) : une seule écriture.
  const addNetworks = async (list) => {
    const batch = writeBatch(db);
    const stamp = new Date().toISOString();
    list.forEach(n => batch.set(doc(networksCol()), { ...n, createdAt: stamp }));
    await batch.commit();
  };

  return { networks, loaded, addNetwork, addNetworks, updateNetwork, removeNetwork };
}
