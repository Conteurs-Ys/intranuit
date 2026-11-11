import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, currentAppId } from '../lib/firebase';
import { INSTANCE } from '../lib/instance';

const InstanceContext = createContext(INSTANCE);
export const useInstance = () => useContext(InstanceContext);
export function InstanceProvider({ children }) {
  const [identity, setIdentity] = useState(INSTANCE);
  useEffect(() => onSnapshot(doc(db, 'artifacts', currentAppId, 'public', 'data', 'instance_settings', 'identity'), snapshot => {
    const saved = snapshot.data() || {};
    setIdentity({ city: typeof saved.city === 'string' ? saved.city : INSTANCE.city, chronicle: typeof saved.chronicle === 'string' ? saved.chronicle : INSTANCE.chronicle });
  }, error => console.error('Identité de la chronique indisponible', error)), []);
  useEffect(() => { document.title = identity.city ? `Intranuit · ${identity.city}` : 'Intranuit'; }, [identity]);
  return <InstanceContext.Provider value={identity}>{children}</InstanceContext.Provider>;
}
