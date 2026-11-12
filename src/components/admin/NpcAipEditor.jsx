import { useEffect, useState } from 'react';
import { Feather, Plus, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import ThemedSelect from '../ui/ThemedSelect';
import useLists from '../../hooks/useLists';
import { optionsWith } from '../../utils/lists';
import { antagonistActionsOrDefault, isAntagonistInAips, IT_USES } from '../../utils/antagonistActions';
import { aipTypeLabel } from '../../utils/aipLabel';

const emptyAction = () => ({ type: 'Intrigue PNJ', zone: 'Elyséum / Atrium', description: '', response: '' });
const sameActions = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// AIP du PNJ pour le cycle, saisies depuis sa fiche. Enregistrer les place
// directement dans Régence › AIP (le PNJ y est affiché d'office).
export default function NpcAipEditor({ appId, antag, month }) {
  const { zones, actionTypes } = useLists();
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const initial = () => antagonistActionsOrDefault(antag).map(a => ({ ...a }));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => { setDraft(initial()); setStatus(''); }, [antag.id, antag.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const red = light ? '#a5222a' : '#e5484f';
  const blue = light ? '#245b9f' : '#5fa0f2';
  const dirty = !sameActions(draft, antag.actions || []);
  const update = (i, patch) => setDraft(d => d.map((a, j) => j === i ? { ...a, ...patch } : a));
  const box = { background: light ? '#faf8f5' : 'var(--night-input)', border: `1px solid ${theme.borderStrong}`, color: theme.textPrimary };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setStatus('');
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'antagonists', antag.id), {
        actions: draft, updatedAt: new Date().toISOString(),
      });
      setStatus('saved');
    } catch { setStatus('error'); }
    finally { setSaving(false); }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textPrimary }}>
          <Feather size={13} style={{ color: red }} /> AIP · {month}
        </h4>
        <span className="text-[11.5px]" style={{ color: theme.textSecondary }}>
          {isAntagonistInAips(antag) ? 'Aussi modifiables dans Régence › AIP' : 'PNJ inactif : hors du tableau AIP'}
        </span>
      </div>

      <ol className="space-y-2.5">
        {draft.map((a, i) => (
          <li key={i} className="rounded-xl p-3 space-y-2" style={{ background: theme.bgCard, border: `1px solid ${a.bonusType ? `${blue}40` : theme.border}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] w-5 shrink-0" style={{ color: theme.textMuted }}>{i + 1}</span>
              {a.bonusType
                ? <span className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: blue }}>{aipTypeLabel(a)}</span>
                : <div className="flex-1 min-w-0"><ThemedSelect light={light} dense value={a.type} ariaLabel={`Type de l'AIP ${i + 1}`} onChange={v => update(i, { type: v })} options={optionsWith(actionTypes, a.type)} /></div>}
              <div className="w-40 shrink-0"><ThemedSelect light={light} dense value={a.zone} ariaLabel={`Lieu de l'AIP ${i + 1}`} onChange={v => update(i, { zone: v })} options={optionsWith(zones, a.zone)} /></div>
              {!a.bonusType && i >= 3 && (
                <button type="button" onClick={() => setDraft(d => d.filter((_, j) => j !== i))} aria-label={`Retirer l'AIP ${i + 1}`} className="p-1 rounded-md" style={{ color: theme.textSecondary }}><X size={13} /></button>
              )}
            </div>
            {a.bonusType === 'Informatique' && (
              <div className="flex flex-wrap items-center gap-1.5 pl-7">
                {IT_USES.map(u => (
                  <button key={u.value} type="button" aria-pressed={(a.itUse || 'normale') === u.value} onClick={() => update(i, { itUse: u.value })}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] transition-colors"
                    style={{ color: (a.itUse || 'normale') === u.value ? blue : theme.textSecondary, background: (a.itUse || 'normale') === u.value ? `${blue}14` : 'transparent', border: `1px solid ${(a.itUse || 'normale') === u.value ? `${blue}66` : theme.border}` }}>
                    {u.label}
                  </button>
                ))}
                {(a.itUse === 'annuler' || a.itUse === 'observer') && (
                  <input value={a.target || ''} onChange={e => update(i, { target: e.target.value })} aria-label="Personnage visé" placeholder="Personnage visé…"
                    className="flex-1 min-w-[160px] rounded-lg px-2.5 py-1 text-[13px] outline-none placeholder:opacity-50" style={box} />
                )}
              </div>
            )}
            {a.bonusType === 'Sciences' && (
              <p className="pl-7 text-[11.5px]" style={{ color: theme.textMuted }}>Uniquement pour une activité liée à {a.subject || 'son champ d’étude'}.</p>
            )}
            <textarea value={a.description || ''} onChange={e => update(i, { description: e.target.value })} rows={2} aria-label={`Description de l'AIP ${i + 1}`}
              placeholder="Ce que fait le PNJ cette fois-ci…"
              className="w-full rounded-lg px-3 py-2 font-serif text-[14.5px] leading-relaxed outline-none resize-y placeholder:opacity-50" style={box} />
            {a.response && <p className="text-[12px] italic" style={{ color: theme.textSecondary }}>Sentence déjà rédigée — modifiable dans Régence › AIP.</p>}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setDraft(d => [...d, emptyAction()])}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1.5 rounded-lg" style={{ color: red, border: `1px solid ${red}44` }}>
          <Plus size={12} /> AIP supplémentaire
        </button>
        <button type="button" onClick={save} disabled={saving || !dirty}
          className="ml-auto px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, rgba(139,38,53,.75), rgba(86,26,36,.92))', color: '#ecbcc6' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer les AIP'}
        </button>
      </div>
      {status === 'saved' && !dirty && <p role="status" className="text-[12px] font-bold" style={{ color: light ? '#276344' : '#9fd8b8' }}>AIP enregistrées.</p>}
      {status === 'error' && <p role="alert" className="text-[12px]" style={{ color: red }}>Enregistrement impossible. Vos textes sont conservés, réessayez.</p>}
    </section>
  );
}
