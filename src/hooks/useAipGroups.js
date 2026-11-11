import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';

// Groupes d'AIP (conteurs uniquement, voir firestore.rules) :
// { title, monthLabel, members: [clé de ligne], sharedResponse, createdAt, updatedAt }.
const groupsCol = () => collection(db, 'artifacts', currentAppId, 'public', 'data', 'aip_groups');

export default function useAipGroups(monthLabel) {
  const [all, setAll] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(groupsCol(), snap => setAll(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
    return () => unsub();
  }, []);

  const groups = all.filter(g => g.monthLabel === monthLabel)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  const createGroup = ({ title, members }) => addDoc(groupsCol(), {
    title: title.trim() || 'Groupe sans titre', monthLabel, members, sharedResponse: '',
    createdAt: new Date().toISOString(),
  });
  const updateGroup = (id, fields) => updateDoc(doc(groupsCol(), id), { ...fields, updatedAt: new Date().toISOString() });
  const deleteGroup = (id) => deleteDoc(doc(groupsCol(), id));

  return { groups, createGroup, updateGroup, deleteGroup };
}
