import { useEffect, useMemo, useState } from 'react';
import { refreshLossPeriod } from '../utils/influenceRules';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';

// État des influences côté conteurs :
// - pertes d'influence validées (influence_losses) : { target: { kind, id }, targetUid?, targetName,
//   category, levels, fromMonth, untilMonth, untilDate?, source, createdAt } ;
// - réglages (settings/influence) : durée des pertes en cycles ou en parties, malus de soutien extérieur.
const dataCol = (name) => collection(db, 'artifacts', currentAppId, 'public', 'data', name);
export const DEFAULT_INFLUENCE_SETTINGS = { outsideSupportMalus: 0 };

export default function useInfluenceState() {
  const [losses, setLosses] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_INFLUENCE_SETTINGS);
  const [parties, setParties] = useState([]);

  useEffect(() => {
    const onError = (e) => console.error(e);
    const unsubs = [
      onSnapshot(dataCol('influence_losses'), s => setLosses(s.docs.map(d => ({ id: d.id, ...d.data() }))), onError),
      onSnapshot(doc(dataCol('settings'), 'influence'), d => setSettings({ ...DEFAULT_INFLUENCE_SETTINGS, ...(d.exists() ? d.data() : {}) }), onError),
      onSnapshot(dataCol('parties'), s => setParties(s.docs.map(d => d.data().date).filter(Boolean)), onError),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const saveSettings = (patch) => setDoc(doc(dataCol('settings'), 'influence'), { ...settings, ...patch }, { merge: true });
  const addLoss = (loss) => addDoc(dataCol('influence_losses'), { ...loss, createdAt: new Date().toISOString() });
  const removeLoss = (id) => deleteDoc(doc(dataCol('influence_losses'), id));
  // Fin réglée à la main par un conteur (mois, ou date précise).
  const updateLoss = (id, fields) => updateDoc(doc(dataCol('influence_losses'), id), {
    ...fields, periodOverride: true,
    ...('untilDate' in fields || 'untilMonth' in fields ? { sessionsPending: false } : {}),
    editedAt: new Date().toISOString(),
  });

  const currentLosses = useMemo(() => losses.map(loss => refreshLossPeriod(loss, parties)), [losses, parties]);
  return { losses: currentLosses, settings, partyDates: parties, saveSettings, addLoss, removeLoss, updateLoss };
}
