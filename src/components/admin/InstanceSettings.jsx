import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, currentAppId } from '../../lib/firebase';
import { useInstance } from '../../context/InstanceContext';

export default function InstanceSettings() {
  const identity = useInstance();
  const [form, setForm] = useState(identity);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setForm(identity), [identity]);
  const save = async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'instance_settings', 'identity'), { city: form.city.trim(), chronicle: form.chronicle.trim() });
      setMessage('Identité enregistrée.');
    } catch (error) { console.error(error); setMessage('Enregistrement impossible. Réessaie.'); }
    finally { setBusy(false); }
  };
  return <details className="rounded-2xl border border-white/10 px-5 py-4">
    <summary className="cursor-pointer font-serif italic font-bold text-lg text-zinc-200">Identité de la chronique</summary>
    <form onSubmit={save} className="mt-4 space-y-4 max-w-xl">
      {[['city', 'Ville'], ['chronicle', 'Nom de la chronique']].map(([key, label]) => <label key={key} className="block text-sm text-zinc-400">{label}
        <input value={form[key]} maxLength={100} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-200" />
      </label>)}
      <button disabled={busy} className="rounded-lg border border-red-900/50 px-4 py-2 text-xs text-red-300 disabled:opacity-40">{busy ? 'Enregistrement…' : 'Enregistrer l’identité'}</button>
      {message && <p role="status" className="text-sm text-zinc-400">{message}</p>}
    </form>
  </details>;
}
