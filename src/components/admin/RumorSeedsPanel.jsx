import { saveRumorUsage } from '../../utils/saveRumorUsage';
import { Fragment, useMemo, useState } from 'react';
import { Megaphone, Ear, Plus, Trash2, Shield, Skull, ListChecks, Check, RotateCcw } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useDialogs } from '../../context/DialogContext';
import ThemedSelect from '../ui/ThemedSelect';
import useRumorSeeds from '../../hooks/useRumorSeeds';
import RumorEditor, { RumorSummary, TraceField } from './RumorEditor';
import { INFLUENCE_SPECIALIZATIONS } from '../../constants';
import { buildRumorTable, isRumorAction, monthBounds, usagesToReview } from '../../utils/rumors';

const CAT = { gotha: 'Gotha', pegre: 'Pègre' };
const EMPTY = { category: 'pegre', specs: [], institution: '', from: '', to: '', text: '' };
const frDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Section({ icon: Icon, title, color, count, hint, children }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  return (
    <section className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}` }}>
      <h3 className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, border: `1px solid ${color}40`, color }}><Icon size={14} /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>{title}</span>
        {count !== undefined && <span className="text-[11px] font-bold tabular-nums" style={{ color: theme.textMuted }}>{count}</span>}
      </h3>
      {hint && <p className="text-[12.5px]" style={{ color: theme.textSecondary }}>{hint}</p>}
      {children}
    </section>
  );
}

function SpecPicker({ value, onChange, color }) {
  const { theme } = useTheme();
  return (
    <div className="flex flex-wrap gap-1.5">
      {INFLUENCE_SPECIALIZATIONS.map(spec => {
        const on = value.includes(spec);
        return (
          <button key={spec} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter(s => s !== spec) : [...value, spec])}
            className="px-2 py-0.5 rounded-md text-[12px] transition-colors"
            style={{ color: on ? color : theme.textSecondary, background: on ? `${color}14` : 'transparent', border: `1px solid ${on ? color + '66' : theme.border}` }}>{spec}</button>
        );
      })}
    </div>
  );
}

// Supervision › Rumeurs : rumeurs de conteur (scénarios locaux) et suivi des rumeurs du cycle.
export default function RumorSeedsPanel({ appId, influences = [], antagonists = [], month }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const { confirmAction, showNotice } = useDialogs();
  const { seeds, addSeed, updateSeed, removeSeed } = useRumorSeeds();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [onlyTodo, setOnlyTodo] = useState(true);
  const catColor = (c) => (c === 'gotha' ? (light ? '#975012' : '#ec9440') : (light ? '#665088' : '#a995d8'));
  const red = light ? '#a5222a' : '#e5484f';
  const field = { background: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary };

  const ctx = useMemo(() => ({ dossiers: influences, seeds, antagonists }), [influences, seeds, antagonists]);
  const rumors = useMemo(() => influences.filter(d => d.monthLabel === month && !(d.userId || '').startsWith('historical_'))
    .flatMap(d => (d.actions || []).map((a, idx) => ({ a, d, idx })).filter(({ a }) => isRumorAction(a)))
    .map(r => ({ ...r, preview: buildRumorTable({ rumor: r.a, dossier: r.d, ...ctx }) })), [influences, month, ctx]);

  // Traces à relire : chaque usage une fois, sur l'ensemble des rumeurs du cycle.
  const traces = useMemo(() => usagesToReview(rumors.map(r => ({ preview: r.preview, dossier: r.d }))), [rumors]);
  const shownTraces = onlyTodo ? traces.filter(u => !u.reviewed) : traces;

  const { start, end } = monthBounds(month);
  const seedState = (s) => (s.to && s.to < start ? 'passée' : s.from && s.from > end ? 'à venir' : 'en cours');
  const sortedSeeds = [...seeds].sort((x, y) => (y.from || '').localeCompare(x.from || '') || (x.text || '').localeCompare(y.text || '', 'fr'));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.text.trim() || busy) return;
    if (form.from && form.to && form.to < form.from) { showNotice('La fin de validité précède le début.', 'Dates incohérentes'); return; }
    setBusy(true);
    try { await addSeed({ ...form, institution: form.institution.trim(), text: form.text.trim() }); setForm({ ...EMPTY, category: form.category }); }
    catch { showNotice('La rumeur n’a pas été enregistrée. Réessayez.', 'Enregistrement impossible'); }
    finally { setBusy(false); }
  };
  const remove = async (s) => {
    if (await confirmAction({ title: 'Retirer la rumeur', message: `Retirer « ${s.text.slice(0, 80)} » ? Les tableaux déjà figés ne changent pas.`, confirmLabel: 'Retirer' })) removeSeed(s.id);
  };
  const saveRumor = async (d, idx, patch) => {
    const list = [...(d.actions || [])];
    list[idx] = { ...list[idx], ...patch };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', d.id), { actions: list, updatedAt: new Date().toISOString() });
  };
  // Trace commune d'un usage : écrite sur l'action d'origine (clé « dossier:action »).
  const saveUsage = (key, patch) => saveRumorUsage(db, appId, key, patch);
  const current = open && rumors.find(r => r.d.id === open.id && r.idx === open.idx);

  return (
    <div className="space-y-4">
      <Section icon={Ear} title={`Rumeurs du cycle · ${month}`} color={light ? '#245b9f' : '#5fa0f2'} count={rumors.length}
        hint="Aperçu en direct des actions La Rumeur et Potins. Les traces sont à relire avant la diffusion, qui fige les tableaux.">
        {rumors.length === 0 ? <p className="text-[12.5px] italic" style={{ color: theme.textMuted }}>Aucune rumeur ce cycle.</p> : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {rumors.map(({ a, d, idx, preview }) => (
              <div key={`${d.id}:${idx}`} className="space-y-1.5">
                <div className="flex items-center gap-2 text-[13px]" style={{ color: theme.textPrimary }}>
                  {a.category === 'gotha' ? <Shield size={13} style={{ color: catColor('gotha') }} /> : <Skull size={13} style={{ color: catColor('pegre') }} />}
                  <b className="font-serif italic text-[14.5px] truncate">{d.characterName}</b>
                  <span className="text-[12px] truncate" style={{ color: theme.textSecondary }}>{preview.specs.join(', ') || 'aucune spécialité'}</span>
                </div>
                <RumorSummary preview={preview} frozen={Boolean(a.rumorFrozenAt)} color={catColor(a.category)} onOpen={() => setOpen({ id: d.id, idx })} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={ListChecks} title="Traces à relire" color={light ? '#975012' : '#ec9440'} count={traces.filter(u => !u.reviewed).length}
        hint="Chaque usage n'est relu qu'une fois : la trace validée vaut pour tous les tableaux où il apparaît. Pour un joueur en particulier, réécrivez-la depuis son tableau.">
        <div className="flex gap-1.5">
          {[[true, 'À relire'], [false, 'Toutes']].map(([v, l]) => (
            <button key={l} type="button" aria-pressed={onlyTodo === v} onClick={() => setOnlyTodo(v)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: theme.textPrimary, border: `1px solid ${onlyTodo === v ? '#e5484f' : theme.border}` }}>{l}</button>
          ))}
        </div>
        {shownTraces.length === 0 ? <p className="text-[12.5px] italic" style={{ color: theme.textMuted }}>{traces.length ? 'Toutes les traces sont relues.' : 'Aucun usage à diffuser ce cycle.'}</p> : (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${theme.border}` }}>
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead style={{ background: theme.bgTableHead }}>
                <tr>{[['Institution ou individu impliqué', 'w-52'], ['Manière dont l’influence a été utilisée', ''], ['Origine', 'w-44'], ['Tableaux', 'w-40'], ['', 'w-28']].map(([h, w], i) => (
                  <th key={i} className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] ${w}`} style={{ color: theme.textSecondary }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {['gotha', 'pegre'].map(cat => shownTraces.some(u => u.category === cat) && (
                  <Fragment key={cat}>
                    <tr style={{ borderTop: `1px solid ${theme.borderStrong}`, background: theme.bgCard }}>
                      <td colSpan={5} className="px-3 pt-2 pb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: catColor(cat) }}>
                          {cat === 'gotha' ? <Shield size={12} /> : <Skull size={12} />}{CAT[cat]}
                        </span>
                      </td>
                    </tr>
                {shownTraces.filter(u => u.category === cat).map(u => (
                  <tr key={u.key} className="align-top" style={{ borderTop: `1px solid ${theme.borderCell}` }}>
                    <td className="px-3 py-2.5">
                      <div className="text-[14px] font-semibold" style={{ color: theme.textPrimary }}>{u.institution || <span className="italic font-normal" style={{ color: theme.textMuted }}>non renseignée</span>}</div>
                      <div className="text-[12px] mt-0.5" style={{ color: theme.textSecondary }}>{u.specialization || 'Sans spécialité'} · {u.month}</div>
                    </td>
                    <td className="px-3 py-2.5"><TraceField theme={theme} value={u.trace} onCommit={v => saveUsage(u.key, { rumorTrace: v })} /></td>
                    <td className="px-3 py-2.5 text-[12.5px]">
                      <div style={{ color: theme.textPrimary }}>{u.actionName}</div>
                      <div style={{ color: theme.textMuted }}>par {u.actor} (jamais diffusé)</div>
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px]" style={{ color: theme.textSecondary }}>
                      {u.readers.length} tableau{u.readers.length > 1 ? 'x' : ''}
                      <div className="text-[12px]" style={{ color: theme.textMuted }}>{u.readers.join(', ')}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.reviewed ? (
                        <button type="button" onClick={() => saveUsage(u.key, { rumorTrace: null })} title="Revenir à la trace préremplie"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}><RotateCcw size={12} /> Rétablir</button>
                      ) : (
                        <button type="button" onClick={() => saveUsage(u.key, { rumorTrace: u.trace })} title="Valider cette trace pour tous les tableaux"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: light ? '#276344' : '#9fd8b8', border: `1px solid ${light ? '#276344' : '#9fd8b8'}55` }}><Check size={12} /> Valider</button>
                      )}
                    </td>
                  </tr>
                ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section icon={Megaphone} title="Rumeurs de conteur" color={red} count={seeds.length}
        hint="Scénarios locaux ou événements inhabituels, ajoutés aux tableaux de la catégorie. Sans spécialité, elles valent pour toute la catégorie ; elles apparaissent aux rumeurs des mois couverts par leur période.">
        <form onSubmit={submit} className="space-y-3 rounded-xl p-3.5" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_10rem_10rem]">
            <ThemedSelect light={light} value={form.category} color={catColor(form.category)} ariaLabel="Catégorie" onChange={v => setForm({ ...form, category: v })}
              options={[{ value: 'pegre', label: 'Pègre' }, { value: 'gotha', label: 'Gotha' }]} />
            <input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} placeholder="Institution ou individu (facultatif)" aria-label="Institution"
              className="rounded-lg px-2.5 py-2 text-[13px] outline-none placeholder:opacity-60" style={field} />
            <label className="flex items-center gap-2 text-[12px]" style={{ color: theme.textSecondary }}>Du
              <input type="date" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[13px] outline-none" style={{ ...field, colorScheme: light ? 'light' : 'dark' }} /></label>
            <label className="flex items-center gap-2 text-[12px]" style={{ color: theme.textSecondary }}>au
              <input type="date" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[13px] outline-none" style={{ ...field, colorScheme: light ? 'light' : 'dark' }} /></label>
          </div>
          <SpecPicker value={form.specs} onChange={specs => setForm({ ...form, specs })} color={catColor(form.category)} />
          <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={2} placeholder="Ce qui se dit… (jamais le nom d'un personnage)" aria-label="Texte de la rumeur"
            className="w-full rounded-lg px-3 py-2 text-[14.5px] font-serif outline-none resize-y placeholder:opacity-60" style={field} />
          <div className="flex justify-end">
            <button type="submit" disabled={!form.text.trim() || busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
              style={{ color: red, border: `1px solid ${red}66` }}><Plus size={12} /> Ajouter la rumeur</button>
          </div>
        </form>

        {sortedSeeds.length === 0 ? <p className="text-[12.5px] italic" style={{ color: theme.textMuted }}>Aucune rumeur de conteur.</p> : (
          <ul className="space-y-2">
            {sortedSeeds.map(s => {
              const state = seedState(s);
              return (
                <li key={s.id} className="group/seed flex items-start gap-3 rounded-xl px-3.5 py-2.5" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, opacity: state === 'passée' ? 0.6 : 1 }}>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" style={{ color: theme.textSecondary }}>
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: catColor(s.category) }}>{CAT[s.category]}</span>
                      <span>{(s.specs || []).length ? s.specs.join(', ') : 'toutes spécialités'}</span>
                      <span>· {s.from || s.to ? `${s.from ? `du ${frDate(s.from)}` : ''} ${s.to ? `au ${frDate(s.to)}` : '(sans fin)'}` : 'sans limite'}</span>
                      <span style={{ color: state === 'en cours' ? (light ? '#276344' : '#9fd8b8') : theme.textMuted }}>· {state} en {month}</span>
                    </div>
                    <input defaultValue={s.institution || ''} placeholder="Institution…" aria-label="Institution"
                      onBlur={e => e.target.value.trim() !== (s.institution || '') && updateSeed(s.id, { institution: e.target.value.trim() })}
                      className="w-full bg-transparent outline-none text-[13px] font-semibold placeholder:font-normal placeholder:opacity-60" style={{ color: theme.textPrimary }} />
                    <textarea defaultValue={s.text} rows={1} aria-label="Texte de la rumeur"
                      onBlur={e => { const v = e.target.value.trim(); if (v && v !== s.text) updateSeed(s.id, { text: v }); else e.target.value = s.text; }}
                      className="w-full bg-transparent outline-none resize-none font-serif text-[14.5px] leading-snug" style={{ color: theme.textResponse, fieldSizing: 'content' }} />
                  </div>
                  <button type="button" onClick={() => remove(s)} title="Retirer cette rumeur" aria-label="Retirer cette rumeur"
                    className="p-1 rounded-md opacity-40 group-hover/seed:opacity-100 focus-visible:opacity-100 transition-opacity" style={{ color: theme.textSecondary }}><Trash2 size={13} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {current && <RumorEditor item={current.a} dossier={current.d} ctx={ctx} onSave={patch => saveRumor(current.d, current.idx, patch)} onSaveUsage={saveUsage} onClose={() => setOpen(null)} />}
    </div>
  );
}
