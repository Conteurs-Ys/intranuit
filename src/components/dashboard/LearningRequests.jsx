import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db, currentAppId } from '../../lib/firebase';
import { activeCharacterId } from '../../utils/characters';
import { learningFields, validateLearning } from '../../utils/learnings';
import { aipLearningRequests } from '../../utils/learningRequests';
import LearningFields from '../forms/LearningFields';
import SubmitButton from '../ui/SubmitButton';

const STATUS = { pending: 'En attente', approved: 'Validé', rejected: 'Refusé' };
export default function LearningRequests({ requests, aips, character, cycle, directory, onEditAIP }) {
  const [draft, setDraft] = useState({ type: 'Compétence' });
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const entries = [...requests.map(r => ({ ...r, origin: 'Demande diverse' })), ...aips.flatMap(d => {
    const sources = aipLearningRequests(d);
    const keys = new Set(sources.map(r => r.sourceKey));
    const orphaned = Object.entries(d.learningReviews || {}).filter(([key]) => !keys.has(key)).map(([key, review]) => ({ id: `review_${d.id}_${key}`, sourceKey: key, ...review }));
    return [...sources, ...orphaned].map(r => ({ ...r, origin: 'AIP Apprentissage', monthLabel: d.monthLabel, review: d.learningReviews?.[r.sourceKey] }));
  })];
  const submit = async e => {
    e.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try {
      const fields = learningFields({ ...draft, characterName: character.name, clan: character.clan });
      validateLearning(fields);
      await addDoc(collection(db, 'artifacts', currentAppId, 'public', 'data', 'learning_requests'), {
        ...fields, userId: auth.currentUser.uid, characterId: activeCharacterId(character),
        explanation: explanation.trim(), monthLabel: cycle.label, createdAt: new Date().toISOString(),
      });
      setDraft({ type: 'Compétence' }); setExplanation('');
    } catch (e) { setError(e.message || 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };
  return <div className="max-w-4xl mx-auto space-y-6">
    <h2 className="font-serif italic text-3xl text-zinc-200">Demandes diverses</h2>
    <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
      <h3 className="font-serif italic text-xl text-zinc-200">Progression / dépense d’XP</h3>
      <p className="text-sm text-zinc-400">Compétence, attribut, discipline ou autre acquisition : la demande sera vérifiée par un conteur.</p>
      <LearningFields value={draft} onChange={setDraft} directory={directory} disabled={saving} />
      <label className="block text-[12px] text-zinc-300 space-y-2">Explication
        <textarea aria-label="Explication de la demande" required value={explanation} onChange={e => setExplanation(e.target.value)} rows={3}
          className="block w-full rounded-xl p-3 outline-none" style={{ background: 'var(--night-input)', border: '1px solid var(--night-line-strong)' }}
          placeholder="Ce que tu souhaites acquérir et ce qui justifie cette progression…" />
      </label>
      <p className="text-xs text-zinc-400">La progression rejoint tes acquisitions après validation par un conteur.</p>
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      <SubmitButton saving={saving}>Envoyer la demande</SubmitButton>
    </form>
    <section className="space-y-3"><h3 className="font-serif italic text-2xl text-zinc-200">Mes demandes et acquisitions</h3>
      {!entries.length && <p className="text-sm text-zinc-400">Aucune demande pour ce personnage.</p>}
      {entries.map(entry => {
        const visible = entry.review || entry;
        return <article key={entry.id} className="rounded-xl p-4 space-y-2" style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
          <div className="flex justify-between gap-3"><strong className="text-zinc-200">{visible.type} · {visible.action}</strong><span className="text-xs text-zinc-300">{STATUS[entry.review?.status || 'pending']}</span></div>
          <p className="text-xs text-zinc-400">{entry.origin} · {entry.monthLabel}{visible.levels?.length ? ` · Niveau ${visible.levels.join(', ')}` : ''}{visible.mentor ? ` · Mentor : ${visible.mentor}` : ''}</p>
          {entry.explanation && <p className="text-sm whitespace-pre-wrap">{entry.explanation}</p>}
          {entry.review?.decisionReason && <p className="text-sm text-red-300">{entry.review.decisionReason}</p>}
          {entry.review?.date && <p className="text-xs text-zinc-400">Acquis le {entry.review.date}</p>}
          {entry.source === 'aip' && entry.monthLabel === cycle.label && <button type="button" onClick={onEditAIP} className="text-xs text-red-300">Ouvrir mes AIP</button>}
        </article>;
      })}
    </section>
  </div>;
}
