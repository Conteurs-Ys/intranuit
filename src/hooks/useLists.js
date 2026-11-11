import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';
import { normalizeLists } from '../utils/lists';

// Listes de lieux et de types d'AIP (`game_state/lists`) : lues par tous les membres, écrites par les conteurs
// (même règle que le cycle). Sans document, les listes du code servent.
const listsRef = () => doc(db, 'artifacts', currentAppId, 'public', 'data', 'game_state', 'lists');

export default function useLists() {
  const [lists, setLists] = useState(() => normalizeLists(null));

  useEffect(() => onSnapshot(listsRef(),
    (snap) => setLists(normalizeLists(snap.exists() ? snap.data() : null)),
    (e) => console.error(e)), []);

  const saveList = (key, values) => setDoc(listsRef(), { [key]: values, updatedAt: new Date().toISOString() }, { merge: true });

  return { ...lists, saveList };
}
