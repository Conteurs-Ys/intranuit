import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';

// Rumeurs de conteur (scénarios locaux, événements inhabituels), réservées aux conteurs (voir firestore.rules).
// { category: 'gotha'|'pegre', specs: string[] (vide = toute la catégorie), institution, text, from, to (AAAA-MM-JJ) }
const seedsCol = () => collection(db, 'artifacts', currentAppId, 'public', 'data', 'rumor_seeds');

export default function useRumorSeeds() {
  const [seeds, setSeeds] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(seedsCol(), (snap) => {
      setSeeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoaded(true);
    }, (e) => { console.error(e); setLoaded(true); });
    return () => unsub();
  }, []);

  const addSeed = (seed) => addDoc(seedsCol(), { ...seed, createdAt: new Date().toISOString() });
  const updateSeed = (id, fields) => updateDoc(doc(seedsCol(), id), { ...fields, updatedAt: new Date().toISOString() });
  const removeSeed = (id) => deleteDoc(doc(seedsCol(), id));

  return { seeds, loaded, addSeed, updateSeed, removeSeed };
}
