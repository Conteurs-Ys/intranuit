import { useDialogs } from '../../context/DialogContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Save, Check, X, ArrowUpDown, ArrowUp, ArrowDown, Hourglass, History, Ban } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, runTransaction } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import FilterBar from './FilterBar';
import { CLANS } from '../../constants';
import ThemedSelect from '../ui/ThemedSelect';
import SubmitButton from '../ui/SubmitButton';
import ConsoleTabs from '../ui/ConsoleTabs';
import { useTheme } from '../../context/ThemeContext';
import { learningQueue, publicLearningReview, sameLearningSource } from '../../utils/learningRequests';
import { LEARNING_TYPES, isLearningHistory, learningStatus, learningFields, validateLearning, learningEdit, learningDecision } from '../../utils/learnings';

const LEVELS = [1, 2, 3, 4, 5];
const EMPTY = { characterName: '', clan: '', type: 'Discipline', action: '', currentLevel: '', levels: [], mentor: '', notes: '', date: '', decisionReason: '' };
const STATUS = { pending: 'À valider', approved: 'Validé', rejected: 'Refusé', legacy: 'Historique' };

function LevelCell({ value, onChange }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const selected = Array.isArray(value) ? value.map(Number) : value ? [Number(value)] : [];
  const options = [...new Set([...LEVELS, ...selected])].sort((a, b) => a - b);
  const color = light ? '#665088' : '#a995d8';
  return <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Niveaux visés">
    {options.map(level => <button key={level} type="button" aria-pressed={selected.includes(level)} aria-label={`Niveau ${level}`}
      onClick={() => onChange(selected.includes(level) ? selected.filter(v => v !== level) : [...selected, level].sort((a, b) => a - b))}
      className="w-7 h-7 rounded-md text-[12px] font-bold transition-colors"
      style={{ background: selected.includes(level) ? `${color}20` : 'transparent', border: `1px solid ${selected.includes(level) ? `${color}80` : theme.borderStrong}`, color: selected.includes(level) ? color : theme.textSecondary }}>{level}</button>)}
  </div>;
}

function SortableHeader({ label, field, sortBy, onSort, className = '' }) {
  const { theme } = useTheme();
  const active = sortBy.field === field;
  return <th className={`px-3 py-3 ${className}`} aria-sort={active ? (sortBy.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" onClick={() => onSort(field)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: active ? theme.textPrimary : theme.textSecondary }}>
      {label}{active ? (sortBy.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
    </button>
  </th>;
}

function Field({ label, children }) {
  const { theme } = useTheme();
  return <label className="block min-w-0 space-y-1.5"><span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{label}</span>{children}</label>;
}

function LearningRow({ entry, onSave, onDecision, onDelete }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const [data, setData] = useState({ ...entry });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const baseline = useRef(entry);
  useEffect(() => { if (!dirty) { baseline.current = entry; setData({ ...entry }); } }, [entry, dirty]);
  const status = learningStatus(entry);
  const color = status === 'rejected' ? (light ? '#a5222a' : '#e5484f') : status === 'pending' ? (light ? '#975012' : '#ec9440') : (light ? '#276344' : '#9fd8b8');
  const set = (field, value) => { if (busy) return; setData(v => ({ ...v, [field]: value })); setDirty(true); setError(''); };
  const act = async operation => {
    if (busy) return;
    setBusy(true); setError('');
    try { const result = await operation(); if (result !== false) setDirty(false); } catch (e) { setError(e.message || 'Enregistrement impossible. Réessayez.'); }
    finally { setBusy(false); }
  };
  const inputClass = 'w-full min-w-0 bg-transparent rounded-md py-1 text-[12px] outline-none placeholder:text-current placeholder:opacity-50';
  const cellStyle = { borderRight: `1px solid ${theme.borderCell}` };
  const inputStyle = { color: theme.textPrimary };
  const input = (field, label, extra = {}) => <input value={data[field] ?? ''} onChange={e => set(field, e.target.value)} aria-label={label} className={inputClass} style={inputStyle} disabled={busy} {...extra} />;
  const select = (field, options, label) => <ThemedSelect dense light={light} ariaLabel={label} value={data[field] || ''} onChange={value => set(field, value)} options={options} />;
  const actionButton = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] disabled:opacity-50';
  return <tr style={{ background: dirty ? 'rgba(229,72,79,0.025)' : 'transparent', borderBottom: `1px solid ${theme.borderCell}` }}>
    <td className="px-3 py-3 align-top" style={cellStyle}>{input('characterName', 'Personnage', { className: `${inputClass} font-serif italic font-bold text-[14.5px]` })}<span className="block text-[10px] font-bold uppercase tracking-[0.12em] mt-2" style={{ color }}>{STATUS[status] || status}</span></td>
    <td className="px-3 py-3 align-top" style={cellStyle}>{select('clan', [{ value: '', label: '—' }, ...CLANS], 'Clan')}</td>
    <td className="px-3 py-3 align-top" style={cellStyle}>{select('type', [{ value: '', label: '—' }, ...LEARNING_TYPES, ...(!LEARNING_TYPES.includes(data.type) && data.type ? [data.type] : [])], 'Type d’apprentissage')}</td>
    <td className="px-3 py-3 align-top" style={cellStyle}>{input('action', 'Intitulé de la progression', { placeholder: 'Ex. Domination', className: `${inputClass} font-serif italic text-[14.5px]` })}{entry.sourceCollection && <details className="mt-2 text-[12px]" style={{ color: theme.textSecondary }}><summary className="cursor-pointer">{entry.source === 'aip' ? 'AIP Apprentissage' : 'Demande diverse'} · {entry.monthLabel}</summary><p className="mt-2 whitespace-pre-wrap">{entry.sourceDescription || 'Sans précision'}</p></details>}</td>
    <td className="px-3 py-3 align-top space-y-2" style={cellStyle}><label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.textSecondary }}>Actuel{input('currentLevel', 'Niveau actuel', { type: 'number', min: 0, step: 1, className: `${inputClass} w-14 px-2`, style: { ...inputStyle, border: `1px solid ${theme.border}` } })}</label><LevelCell value={data.levels} onChange={value => set('levels', value)} /></td>
    <td className="px-3 py-3 align-top" style={cellStyle}>{input('mentor', 'Mentor', { placeholder: 'Sans mentor précisé' })}</td>
    <td className="px-3 py-3 align-top" style={cellStyle}>{input('date', 'Date d’acquisition', { type: 'date' })}</td>
    <td className="px-3 py-3 align-top" style={cellStyle}><textarea value={data.notes || ''} onChange={e => set('notes', e.target.value)} aria-label="Notes internes" rows={3} className={`${inputClass} resize-y`} style={{ color: theme.textSecondary }} placeholder="Notes internes…" disabled={busy} /></td>
    <td className="px-3 py-3 align-top">
      <div className="space-y-2">
        {status === 'pending' && <>
          <button type="button" disabled={busy} onClick={() => act(() => onDecision(entry.id, data, 'approved', baseline.current))} className={actionButton} style={{ color: light ? '#276344' : '#9fd8b8', border: `1px solid ${light ? '#27634455' : '#9fd8b855'}` }}><Check size={12} /> Valider</button>
          {input('decisionReason', 'Motif du refus', { placeholder: 'Motif du refus…', className: `${inputClass} px-2`, style: { ...inputStyle, border: `1px solid ${theme.border}` } })}
          <button type="button" disabled={busy} onClick={() => act(() => onDecision(entry.id, data, 'rejected', baseline.current))} className={actionButton} style={{ color: light ? '#a5222a' : '#e5484f', border: `1px solid ${theme.border}` }}><X size={12} /> Refuser</button>
        </>}
        {status === 'rejected' && input('decisionReason', 'Motif du refus', { placeholder: 'Motif du refus…' })}
        {entry.decidedAt && <p className="text-[12px]" style={{ color: theme.textMuted }}>{new Date(entry.decidedAt).toLocaleDateString('fr-FR')}</p>}
        <div className="flex items-center gap-2">
          {dirty && <button type="button" disabled={busy} onClick={() => act(() => onSave(entry.id, data, baseline.current))} className={actionButton} style={{ color: theme.textPrimary, border: `1px solid ${theme.border}` }}><Save size={12} /> Enregistrer</button>}
          {!entry.sourceCollection && <button type="button" disabled={busy} onClick={() => act(() => onDelete(entry.id))} className="p-2 rounded-lg disabled:opacity-50" style={{ color: theme.textMuted }} aria-label={`Supprimer l’apprentissage ${entry.action || 'sans intitulé'}`}><Trash2 size={13} /></button>}
        </div>
        {error && <p role="alert" className="text-[12px] leading-relaxed" style={{ color: light ? '#a5222a' : '#e5484f' }}>{error}</p>}
      </div>
    </td>
  </tr>;
}

export default function LearningPanel({ appId, learnings = [], aips = [], requests = [], cycle }) {
  const { confirmAction } = useDialogs();
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const color = light ? '#665088' : '#a995d8';
  const [tab, setTab] = useState('pending');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState([]);
  const [filterClan, setFilterClan] = useState([]);
  const [filterLevel, setFilterLevel] = useState([]);
  const [sortBy, setSortBy] = useState({ field: 'characterName', direction: 'asc' });
  const handleSort = field => setSortBy(v => ({ field, direction: v.field === field && v.direction === 'asc' ? 'desc' : 'asc' }));
  const set = (field, value) => setDraft(v => ({ ...v, [field]: value }));
  const queue = useMemo(() => learningQueue(aips, requests, learnings), [aips, requests, learnings]);
  const filtered = useMemo(() => queue.filter(entry => {
    if (tab === 'history' ? !isLearningHistory(entry) : learningStatus(entry) !== tab) return false;
    const q = search.trim().toLocaleLowerCase('fr');
    return (!q || [entry.characterName, entry.action, entry.mentor, entry.decisionReason].some(v => (v || '').toLocaleLowerCase('fr').includes(q)))
      && (!filterType.length || filterType.includes(entry.type)) && (!filterClan.length || filterClan.includes(entry.clan))
      && (!filterLevel.length || filterLevel.some(level => (Array.isArray(entry.levels) ? entry.levels : [entry.levels]).map(Number).includes(Number(level))));
  }).sort((a, b) => {
    const comparison = String(a[sortBy.field] || '').localeCompare(String(b[sortBy.field] || ''), 'fr');
    return sortBy.direction === 'asc' ? comparison : -comparison;
  }), [queue, tab, search, filterType, filterClan, filterLevel, sortBy]);

  const mutate = async (id, data, baseline, status) => {
    if (!auth.currentUser) throw new Error('Reconnectez-vous avant de poursuivre.');
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'learnings', id);
    await runTransaction(db, async transaction => {
      const snap = await transaction.get(ref);
      const baselineSource = queue.find(entry => entry.id === id);
      let current = snap.exists() ? { ...baselineSource, ...snap.data() } : baselineSource;
      if (!current) throw new Error('Cette demande n’existe plus.');
      let sourceRef, sourceSnap;
      if (current.sourceCollection) {
        sourceRef = doc(db, 'artifacts', appId, 'public', 'data', current.sourceCollection, current.sourceId);
        sourceSnap = await transaction.get(sourceRef);
        if (!sourceSnap.exists()) throw new Error('La source de cette demande a été supprimée.');
        const sourceData = { ...sourceSnap.data(), id: sourceSnap.id };
        const fresh = learningQueue(current.source === 'aip' ? [sourceData] : [], current.source === 'aip' ? [] : [sourceData], []).find(r => r.id === id);
        const expected = learningQueue(aips, requests, []).find(r => r.id === id);
        if (!fresh || !expected || !sameLearningSource(fresh, expected) || (baseline.sourceRevision && baseline.sourceRevision !== fresh.sourceRevision && current.status === 'pending')) throw new Error('La demande a été modifiée par le joueur. Actualisez avant de poursuivre.');
        if (!snap.exists()) current = fresh;
      }
      const at = new Date().toISOString();
      const patch = status ? learningDecision(current, data, status, auth.currentUser.uid, at, baseline)
        : learningEdit(current, data, auth.currentUser.uid, at, baseline);
      if (patch) {
        const next = { ...current, ...patch };
        transaction.set(ref, next);
        if (sourceRef && ['approved', 'rejected'].includes(next.status)) {
          const review = publicLearningReview(next);
          transaction.update(sourceRef, next.source === 'aip'
            ? { learningReviews: { ...(sourceSnap.data().learningReviews || {}), [next.sourceKey]: review } }
            : { review });
        }
      }
    });
  };
  const add = async event => {
    event.preventDefault();
    if (creating) return;
    setCreating(true); setError('');
    try {
      const fields = learningFields(draft);
      validateLearning(fields);
      if (!auth.currentUser) throw new Error('Reconnectez-vous avant de poursuivre.');
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'learnings'), { ...fields, status: 'pending', source: 'manual', createdBy: auth.currentUser.uid, createdAt: new Date().toISOString(), monthLabel: cycle?.label || '', year: cycle?.year || new Date().getFullYear() });
      setAdding(false); setDraft({ ...EMPTY }); setTab('pending');
    } catch (e) { setError(e.message || 'Création impossible. Réessayez.'); }
    finally { setCreating(false); }
  };
  const remove = async id => {
    if (!await confirmAction({ title: 'Supprimer l’apprentissage', message: 'Cet apprentissage et son suivi seront supprimés.', danger: true })) return false;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'learnings', id));
  };
  const filterGroups = [
    { key: 'type', label: 'Type', selected: filterType, onChange: setFilterType, accentColor: color, options: LEARNING_TYPES },
    { key: 'clan', label: 'Clan', selected: filterClan, onChange: setFilterClan, accentColor: light ? '#245b9f' : '#5fa0f2', options: CLANS },
    { key: 'level', label: 'Niveau', selected: filterLevel, onChange: setFilterLevel, accentColor: color, options: LEVELS.map(level => ({ value: String(level), label: `Niveau ${level}` })) },
  ];
  const inputClass = 'w-full min-w-0 rounded-xl px-3.5 py-2.5 text-[13px] outline-none placeholder:text-current placeholder:opacity-50';
  const inputStyle = { color: theme.textPrimary, background: light ? theme.bgPanel : 'var(--night-input)', border: `1px solid ${theme.borderStrong}` };
  const input = (field, label, extra = {}) => <input value={draft[field] ?? ''} onChange={e => set(field, e.target.value)} aria-label={label} className={inputClass} style={inputStyle} {...extra} />;
  return <div className="space-y-4 animate-in fade-in duration-300">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ConsoleTabs value={tab} onChange={setTab} label="Suivi des apprentissages" variant="underline" itemWidth="8rem" options={[{ value: 'pending', label: 'À valider', icon: Hourglass }, { value: 'history', label: 'Historique', icon: History }, { value: 'rejected', label: 'Refusés', icon: Ban }]} />
      <button type="button" onClick={() => { setAdding(true); setError(''); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color, border: `1px solid ${color}55` }}><Plus size={13} /> Ajouter une demande</button>
    </div>
    {adding && <form onSubmit={add} aria-label="Nouvelle demande d’apprentissage" className="rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}` }}>
      <fieldset disabled={creating} className="space-y-4">
        <legend className="font-serif italic font-bold text-[22px] mb-3" style={{ color: theme.textPrimary }}>Nouvelle demande</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Personnage">{input('characterName', 'Personnage', { required: true, autoFocus: true })}</Field>
          <Field label="Clan"><ThemedSelect light={light} ariaLabel="Clan" value={draft.clan} onChange={v => set('clan', v)} options={[{ value: '', label: '—' }, ...CLANS]} /></Field>
          <Field label="Type"><ThemedSelect light={light} ariaLabel="Type d’apprentissage" value={draft.type} onChange={v => set('type', v)} options={LEARNING_TYPES} /></Field>
          <Field label="Progression demandée">{input('action', 'Intitulé de la progression', { required: true, placeholder: 'Ex. Domination, Investigation, Force' })}</Field>
          <Field label="Niveau actuel">{input('currentLevel', 'Niveau actuel', { type: 'number', min: 0, step: 1, placeholder: 'Facultatif' })}</Field>
          <Field label="Niveau(x) visé(s)"><LevelCell value={draft.levels} onChange={v => set('levels', v)} /></Field>
          <Field label="Mentor">{input('mentor', 'Mentor', { placeholder: 'Sans mentor précisé' })}</Field>
        </div>
        <Field label="Notes internes"><textarea value={draft.notes} onChange={e => set('notes', e.target.value)} aria-label="Notes internes" rows={2} className={inputClass} style={inputStyle} /></Field>
        <p className="text-[12px]" style={{ color: theme.textSecondary }}>La demande reste en attente jusqu’à la décision d’un conteur.</p>
        {error && <p role="alert" className="text-[12px]" style={{ color: light ? '#a5222a' : '#e5484f' }}>{error}</p>}
        <div className="flex flex-wrap items-center gap-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}><div className="w-full sm:w-72"><SubmitButton light={light} saving={creating}>Créer la demande</SubmitButton></div><button type="button" onClick={() => { setAdding(false); setDraft({ ...EMPTY }); }} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>Annuler</button></div>
      </fieldset>
    </form>}
    <div className="rounded-xl p-3" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}><FilterBar search={search} onSearch={setSearch} filterGroups={filterGroups} onClearAll={() => { setSearch(''); setFilterType([]); setFilterClan([]); setFilterLevel([]); }} accentColor={color} /></div>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{filtered.length} {tab === 'history' ? 'acquisition' : 'demande'}{filtered.length > 1 ? 's' : ''}</p>
    <div role="region" aria-label="Tableau des apprentissages, défilement horizontal" tabIndex={0} className="rounded-2xl overflow-auto" style={{ background: theme.bgTable, border: `1px solid ${theme.border}`, maxHeight: '70vh' }}>
      <table className="w-full text-left border-collapse" style={{ minWidth: 1550 }}>
        <thead className="sticky top-0 z-20" style={{ background: theme.bgTableHead, borderBottom: `1px solid ${theme.borderStrong}` }}><tr>
          <SortableHeader label="Personnage" field="characterName" sortBy={sortBy} onSort={handleSort} className="w-40" />
          <SortableHeader label="Clan" field="clan" sortBy={sortBy} onSort={handleSort} className="w-32" />
          <SortableHeader label="Type" field="type" sortBy={sortBy} onSort={handleSort} className="w-36" />
          <SortableHeader label="Progression" field="action" sortBy={sortBy} onSort={handleSort} className="w-44" />
          <th className="px-3 py-3 w-48 text-[10px] uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>Niveaux visés</th>
          <SortableHeader label="Mentor" field="mentor" sortBy={sortBy} onSort={handleSort} className="w-36" />
          <SortableHeader label="Acquis le" field="date" sortBy={sortBy} onSort={handleSort} className="w-36" />
          <th className="px-3 py-3 w-52 text-[10px] uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>Notes internes</th>
          <th className="px-3 py-3 w-60 text-[10px] uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{tab === 'pending' ? 'Décision' : 'Suivi'}</th>
        </tr></thead>
        <tbody>{filtered.length ? filtered.map(entry => <LearningRow key={entry.id} entry={entry} onSave={(id, data, baseline) => mutate(id, data, baseline)} onDecision={(id, data, status, baseline) => mutate(id, data, baseline, status)} onDelete={remove} />)
          : <tr><td colSpan={9} className="py-12 text-center font-serif italic text-[15px]" style={{ color: theme.textMuted }}>{search || filterType.length || filterClan.length || filterLevel.length ? 'Aucun résultat pour ces filtres.' : tab === 'history' ? 'Aucune acquisition enregistrée.' : tab === 'rejected' ? 'Aucune demande refusée.' : 'Aucune demande en attente.'}</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}
