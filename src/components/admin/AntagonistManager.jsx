import { useDialogs } from '../../context/DialogContext';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Skull, History, Search, X, Eye, EyeOff, Table2, Shield } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ThemedSelect from '../ui/ThemedSelect';
import SubmitButton from '../ui/SubmitButton';
import ConsoleTabs from '../ui/ConsoleTabs';
import NetworkInput from '../ui/NetworkInput';
import LevelLabel from '../ui/LevelLabel';
import AddInfluenceModal from './AddInfluenceModal';
import NpcAipEditor from './NpcAipEditor';
import { CLANS, INFLUENCE_SPECIALIZATIONS, SECTES } from '../../constants';
import useStorytellers from '../../hooks/useStorytellers';
import useInfluenceNetworks from '../../hooks/useInfluenceNetworks';
import { useTheme } from '../../context/ThemeContext';
import { actionsForAntagonistUpdate, buildAntagonistActions, isAntagonistInAips, npcBonuses, npcSciences } from '../../utils/antagonistActions';
import { influenceSummary, isNpcGone, npcAipCount, npcInfluencesForMonth, npcStatus, NPC_STATUSES, sheetPayload } from '../../utils/antagonistSheet';
import { planNpcInfluenceWrite } from '../../utils/npcInfluences';

const EMPTY_ANTAG = {
  name: '', clan: '', sect: 'Antagoniste', status: 'actif', concept: '', notes: '',
  hasIT: false, sciences: [], bonuses: [], assignedTo: '', knownToPlayers: false,
  influences: { gotha: { level: 0, specs: [] }, pegre: { level: 0, specs: [] } },
};

const STATUS_COLORS = { actif: ['#9fd8b8', '#276344'], sommeil: ['#d9b26a', '#7a5a14'], mort: ['#e5484f', '#a5222a'], disparu: ['#b5aaa8', '#5c5354'] };
const CAT = { gotha: { label: 'Gotha', dark: '#ec9440', light: '#975012', Icon: Shield }, pegre: { label: 'Pègre', dark: '#a995d8', light: '#665088', Icon: Skull } };

function formFrom(antag) {
  if (!antag) return { ...EMPTY_ANTAG, influences: { gotha: { level: 0, specs: [] }, pegre: { level: 0, specs: [] } } };
  const inf = (cat) => ({ level: antag.influences?.[cat]?.level || 0, specs: (antag.influences?.[cat]?.specs || []).map(s => ({ ...s })) });
  return {
    name: antag.name || '', clan: antag.clan || '', sect: antag.sect || 'Antagoniste', status: npcStatus(antag),
    concept: antag.concept || '', notes: antag.notes || '', hasIT: Boolean(antag.hasIT),
    sciences: npcSciences(antag).filter(Boolean), bonuses: npcBonuses(antag), assignedTo: antag.assignedTo || '',
    knownToPlayers: Boolean(antag.knownToPlayers),
    influences: { gotha: inf('gotha'), pegre: inf('pegre') },
  };
}

function Field({ label, children, hint }) {
  const { theme } = useTheme();
  return <label className="block min-w-0 space-y-1.5">
    <span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{label}</span>
    {children}
    {hint && <span className="block text-[11.5px]" style={{ color: theme.textMuted }}>{hint}</span>}
  </label>;
}

function Toggle({ checked, onChange, label, children, icon: Icon }) {
  const { theme } = useTheme();
  return <label className="flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 transition-colors"
    style={{ background: checked ? 'rgba(229,72,79,0.06)' : theme.bgCard, border: `1px solid ${checked ? 'rgba(229,72,79,0.3)' : theme.border}` }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 shrink-0 mt-0.5 accent-red-700" />
    <span className="min-w-0">
      <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: theme.textPrimary }}>{Icon && <Icon size={13} />} {label}</span>
      <span className="block mt-1 text-[12px] leading-relaxed" style={{ color: theme.textSecondary }}>{children}</span>
    </span>
  </label>;
}

function Chip({ color, children, title }) {
  return <span title={title} className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10px] font-bold uppercase tracking-[0.1em] leading-none"
    style={{ color, background: `${color}14`, border: `1px solid ${color}40` }}>{children}</span>;
}

export default function AntagonistManager({ appId, antagonists, influences = [], cycle, onHistory }) {
  const { confirmAction } = useDialogs();
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const { storytellers } = useStorytellers();
  const { networks, addNetwork } = useInfluenceNetworks();
  const [openId, setOpenId] = useState(null); // id du PNJ ouvert, 'new' pour une création
  const [tab, setTab] = useState('fiche');
  const [form, setForm] = useState(formFrom(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('actif');
  const [visibility, setVisibility] = useState('all');
  const [stFilter, setStFilter] = useState('all');
  const [addInfluenceFor, setAddInfluenceFor] = useState(null);
  const red = light ? '#a5222a' : '#e5484f';
  const month = cycle?.label || '';

  const current = openId && openId !== 'new' ? antagonists.find(a => a.id === openId) : null;
  const set = (patch) => setForm(f => {
    const next = { ...f, ...patch };
    return next;
  });
  const setInf = (cat, patch) => setForm(f => ({ ...f, influences: { ...f.influences, [cat]: { ...f.influences[cat], ...patch } } }));

  const openSheet = (antag, startTab = 'fiche') => {
    setOpenId(antag ? antag.id : 'new');
    setForm(formFrom(antag));
    setTab(startTab);
    setError('');
  };
  const close = () => { setOpenId(null); setError(''); setSavedAt(0); };

  useEffect(() => {
    if (!openId) return undefined;
    const onKey = e => { if (e.key === 'Escape' && !addInfluenceFor) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, addInfluenceFor]);

  const save = async event => {
    event?.preventDefault();
    if (saving || !form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (openId !== 'new' && !current) throw new Error('Ce PNJ n’existe plus. Fermez la fiche et actualisez la liste.');
      const payload = sheetPayload(form);
      const ref = current ? doc(db, 'artifacts', appId, 'public', 'data', 'antagonists', current.id)
        : doc(collection(db, 'artifacts', appId, 'public', 'data', 'antagonists'));
      const batch = writeBatch(db);
      batch.set(ref, {
        ...payload,
        actions: current ? actionsForAntagonistUpdate(current, payload) : buildAntagonistActions([], payload),
        ...(current ? { updatedAt: new Date().toISOString() } : { history: [], createdAt: new Date().toISOString() }),
      }, { merge: Boolean(current) });
      // Même écriture atomique pour le PNJ privé et son éventuel nom public.
      const directoryRef = doc(db, 'artifacts', appId, 'public', 'data', 'directory', `pnj_${ref.id}`);
      if (payload.knownToPlayers) batch.set(directoryRef, { kind: 'pnj', name: payload.name, updatedAt: new Date().toISOString() });
      else batch.delete(directoryRef);
      await batch.commit();
      if (!current) setOpenId(ref.id);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e.message?.startsWith('Ce PNJ') ? e.message : 'Enregistrement impossible. Les modifications sont conservées. Réessayez.');
    } finally { setSaving(false); }
  };

  const remove = async antag => {
    if (saving || !await confirmAction({ title: 'Supprimer le PNJ', message: `Supprimer « ${antag.name} », ses actions et son historique ? Pour le garder en archive, passez plutôt son statut à « Mort » ou « Disparu ».`, danger: true })) return;
    setSaving(true);
    setError('');
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'antagonists', antag.id));
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'directory', `pnj_${antag.id}`));
      await batch.commit();
      if (openId === antag.id) close();
    } catch { setError('Suppression impossible. Le PNJ a été conservé. Réessayez.'); }
    finally { setSaving(false); }
  };

  const addInfluence = async ({ form: f, antag }) => {
    const plan = planNpcInfluenceWrite({ influences, form: f, antag, month, year: cycle?.year, monthName: cycle?.month });
    if (plan.id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', plan.id), plan.update);
    else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'global_influences'), plan.create);
  };

  const visible = useMemo(() => antagonists.filter(antag => {
    const st = storytellers.find(s => s.id === antag.assignedTo);
    const q = query.trim().toLocaleLowerCase('fr');
    const match = !q || [antag.name, antag.sect, antag.clan, antag.concept, st?.pseudo].some(v => (v || '').toLocaleLowerCase('fr').includes(q));
    const status = npcStatus(antag);
    const statusOk = statusFilter === 'all' || (statusFilter === 'vivants' ? !isNpcGone(antag) : status === statusFilter);
    const visOk = visibility === 'all' || (visibility === 'known' && antag.knownToPlayers) || (visibility === 'secret' && !antag.knownToPlayers);
    const stOk = stFilter === 'all' || (antag.assignedTo || '') === stFilter;
    return match && statusOk && visOk && stOk;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')), [antagonists, query, statusFilter, visibility, stFilter, storytellers]);

  const inputClass = 'w-full min-w-0 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none placeholder:text-current placeholder:opacity-50';
  const inputStyle = { background: light ? '#faf8f5' : 'var(--night-input)', color: theme.textPrimary, border: `1px solid ${theme.borderStrong}` };
  const input = (field, label, extra = {}) => <input value={form[field]} onChange={e => set({ [field]: e.target.value })} aria-label={label} className={inputClass} style={inputStyle} {...extra} />;
  const statusColor = (s) => STATUS_COLORS[s]?.[light ? 1 : 0] || theme.textSecondary;
  const catColor = (cat) => CAT[cat][light ? 'light' : 'dark'];

  const monthInfluences = current ? npcInfluencesForMonth(influences, current, month) : [];

  return <div className="space-y-5 text-left animate-in fade-in duration-300">
    <header className="flex flex-wrap justify-between items-center gap-4">
      <h2 className="flex items-center gap-3 font-serif text-[28px] italic font-bold" style={{ color: theme.textPrimary }}><Skull size={23} style={{ color: red }} /> Némésis & Cabales</h2>
      <button type="button" disabled={saving} onClick={() => openSheet(null)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-50"
        style={{ border: `1px solid ${red}55`, color: red, background: 'rgba(229,72,79,0.06)' }}><Plus size={14} /> Créer un PNJ</button>
    </header>

    {error && !openId && <p role="alert" className="rounded-xl p-3 text-[13px]" style={{ color: red, border: `1px solid ${red}55` }}>{error}</p>}

    <div className="flex flex-wrap gap-2 p-3 rounded-xl" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}>
      <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} /><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Rechercher un PNJ" placeholder="Nom, clan, secte, concept, conteur…" className={`${inputClass} pl-9`} style={inputStyle} /></div>
      <div className="w-full sm:w-44"><ThemedSelect light={light} compact value={statusFilter} ariaLabel="Statut" onChange={setStatusFilter} options={[{ value: 'vivants', label: 'Actifs et en sommeil' }, ...NPC_STATUSES, { value: 'all', label: 'Tous les statuts' }]} /></div>
      <div className="w-full sm:w-48"><ThemedSelect light={light} compact value={visibility} ariaLabel="Visibilité" onChange={setVisibility} options={[{ value: 'all', label: 'Toute visibilité' }, { value: 'known', label: 'Connus des joueurs' }, { value: 'secret', label: 'Confidentiels' }]} /></div>
      <div className="w-full sm:w-40"><ThemedSelect light={light} compact value={stFilter} ariaLabel="Conteur" onChange={setStFilter} options={[{ value: 'all', label: 'Tous conteurs' }, { value: '', label: 'Libre' }, ...storytellers.map(st => ({ value: st.id, label: st.pseudo }))]} /></div>
      <span className="self-center ml-auto text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{visible.length} / {antagonists.length} PNJ</span>
    </div>

    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {visible.map(antag => {
        const st = storytellers.find(s => s.id === antag.assignedTo);
        const status = npcStatus(antag);
        const summary = influenceSummary(antag);
        return <button type="button" key={antag.id} onClick={() => openSheet(antag)} aria-label={`Ouvrir la fiche de ${antag.name}`}
          className="text-left rounded-2xl p-4 flex flex-col gap-3 transition-colors hover:brightness-110"
          style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}`, borderLeft: `3px solid ${st?.color || theme.border}`, opacity: isNpcGone(antag) ? 0.65 : 1 }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-serif italic font-bold text-[20px] leading-tight break-words" style={{ color: theme.textPrimary }}>{antag.name}</h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{[antag.clan, antag.sect].filter(Boolean).join(' · ')}</p>
            </div>
            <Chip color={statusColor(status)}>{NPC_STATUSES.find(s => s.value === status)?.label}</Chip>
          </div>
          {antag.concept && <p className="font-serif italic text-[14px] leading-snug line-clamp-2" style={{ color: theme.textSecondary }}>{antag.concept}</p>}
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {isAntagonistInAips(antag) && <Chip color={light ? '#245b9f' : '#5fa0f2'} title="Ses actions apparaissent dans Régence › AIP"><Table2 size={10} /> Tableau AIP · {npcAipCount(antag)}</Chip>}
            {antag.knownToPlayers ? <Chip color={light ? '#276344' : '#9fd8b8'} title="Proposé dans « Avec qui » aux joueurs"><Eye size={10} /> Connu</Chip> : <Chip color={theme.textMuted} title="Invisible des joueurs"><EyeOff size={10} /> Confidentiel</Chip>}
            {summary && <Chip color={theme.textSecondary}>{summary}</Chip>}
            <span className="ml-auto self-center text-[11px] font-bold" style={{ color: st?.color || theme.textMuted }}>{st?.pseudo || 'Libre'}</span>
          </div>
        </button>;
      })}
    </div>
    {visible.length === 0 && <p className="py-8 text-center font-serif italic text-[15px]" style={{ color: theme.textMuted }}>{antagonists.length ? 'Aucun PNJ pour ces filtres.' : 'Aucun PNJ enregistré. Créez le premier.'}</p>}

    {openId && <div className="fixed inset-0 z-[250] flex justify-end" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <form onSubmit={save} role="dialog" aria-modal="true" aria-label={current ? `Fiche de ${current.name}` : 'Nouveau PNJ'}
        className="h-full w-full max-w-2xl flex flex-col animate-in slide-in-from-right-4 fade-in duration-300"
        style={{ background: light ? '#faf8f5' : 'var(--night-panel)', borderLeft: `1px solid ${theme.borderStrong}`, boxShadow: '-24px 0 60px rgba(0,0,0,0.5)' }}>
        <header className="px-5 sm:px-7 pt-5 pb-4 space-y-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: red }}>{current ? 'Fiche PNJ' : 'Nouveau PNJ'}</div>
              <h3 className="font-serif text-[26px] italic font-bold leading-tight break-words" style={{ color: theme.textPrimary }}>{form.name || 'Sans nom'}</h3>
            </div>
            <button type="button" onClick={close} aria-label="Fermer la fiche" className="p-2 rounded-lg" style={{ color: theme.textSecondary }}><X size={18} /></button>
          </div>
          <ConsoleTabs value={tab} onChange={setTab} label="Sections de la fiche PNJ" options={[
            { value: 'fiche', label: 'Fiche' }, { value: 'ressources', label: 'Ressources' },
            ...(current ? [{ value: 'cycle', label: 'Cycle' }, { value: 'historique', label: 'Historique' }] : []),
          ]} />
        </header>

        <fieldset disabled={saving} className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5 disabled:opacity-60">
          {tab === 'fiche' && <div key="fiche" className="space-y-5 animate-in fade-in duration-300">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom">{input('name', 'Nom du PNJ', { required: true, autoFocus: !current })}</Field>
              <Field label="Statut"><ThemedSelect light={light} value={form.status} ariaLabel="Statut" onChange={v => set({ status: v })} color={statusColor(form.status)} options={NPC_STATUSES} /></Field>
              <Field label="Clan"><ThemedSelect light={light} value={form.clan} ariaLabel="Clan" onChange={v => set({ clan: v })} options={[{ value: '', label: '—' }, ...CLANS]} /></Field>
              <Field label="Secte"><ThemedSelect light={light} value={form.sect} ariaLabel="Secte" onChange={v => set({ sect: v })} options={['Antagoniste', ...SECTES]} /></Field>
            </div>
            <Field label="Concept" hint="Une ligne : qui il est, ce qu’il veut.">{input('concept', 'Concept', { placeholder: 'Ex. Baron anarch qui veut le port pour lui seul' })}</Field>
            <Field label="Conteur responsable"><ThemedSelect light={light} value={form.assignedTo} ariaLabel="Conteur responsable" options={[{ value: '', label: 'Libre' }, ...storytellers.map(st => ({ value: st.id, label: st.pseudo }))]} onChange={v => set({ assignedTo: v })} /></Field>
            <div className="grid lg:grid-cols-2 gap-3">
              <p className="flex items-start gap-2 rounded-xl px-4 py-3 text-[12px] leading-relaxed" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textSecondary }}><Table2 size={14} className="shrink-0 mt-0.5" style={{ color: light ? '#245b9f' : '#5fa0f2' }} /><span><b style={{ color: theme.textPrimary }}>Statut actif = dans le tableau AIP.</b> En sommeil, mort ou disparu, il en sort en gardant ses actions et son historique.</span></p>
              <Toggle checked={form.knownToPlayers} onChange={v => set({ knownToPlayers: v })} label="Connu des joueurs" icon={Eye}>Son nom est proposé dans « Avec qui ». Sa fiche reste privée.</Toggle>
            </div>
            <Field label="Notes des conteurs" hint="Jamais visibles des joueurs.">
              <textarea value={form.notes} onChange={e => set({ notes: e.target.value })} rows={5} aria-label="Notes des conteurs" placeholder="Secrets, alliés, dettes, projets…"
                className="w-full rounded-xl px-3.5 py-3 font-serif text-[15px] leading-relaxed outline-none resize-y placeholder:opacity-50" style={inputStyle} />
            </Field>
          </div>}

          {tab === 'ressources' && <div key="ressources" className="space-y-6 animate-in fade-in duration-300">
            <section className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textPrimary }}>AIP par cycle : {npcAipCount(form)}</h4>
              <p className="text-[12.5px]" style={{ color: theme.textSecondary }}>Trois AIP de base, plus les bonus ci-dessous (mêmes règles que pour les joueurs).</p>
              <label className="flex items-start gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: theme.bgCard, border: `1px solid ${form.hasIT ? (light ? '#245b9f66' : '#5fa0f266') : theme.border}` }}>
                <input type="checkbox" checked={form.hasIT} onChange={e => set({ hasIT: e.target.checked })} className="w-4 h-4 mt-0.5 accent-blue-600" />
                <span><span className="block text-[13px] font-bold" style={{ color: theme.textPrimary }}>Informatique · +1 AIP</span><span className="block text-[12px] mt-0.5" style={{ color: theme.textSecondary }}>Une action normale, ou annuler / observer l’AIP d’un autre personnage.</span></span>
              </label>
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>Sciences · +1 AIP par champ d’étude</span>
                <div className="flex flex-wrap gap-1.5">{(form.sciences || []).map((f, i) => <span key={i} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[12.5px]" style={{ color: light ? '#665088' : '#c2b3e6', border: `1px solid ${light ? '#66508855' : '#a995d855'}` }}>{f}<button type="button" onClick={() => set({ sciences: form.sciences.filter((_, j) => j !== i) })} aria-label={`Retirer ${f}`} className="p-0.5 rounded-full"><X size={11} /></button></span>)}</div>
                <input onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value.trim(); if (v && !(form.sciences || []).includes(v)) set({ sciences: [...(form.sciences || []), v] }); e.currentTarget.value = ''; } }} aria-label="Ajouter un champ d’étude" placeholder="Ajouter un champ (Médecine, Chimie…) puis Entrée" className={inputClass} style={inputStyle} />
                <p className="text-[11.5px]" style={{ color: theme.textMuted }}>Chaque AIP de Sciences ne sert qu’à une activité liée à son champ.</p>
              </div>
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>Autres bonus (Homoncule…)</span>
                {(form.bonuses || []).map((b, i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 items-center">
                  <input value={b.name} onChange={e => set({ bonuses: form.bonuses.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} aria-label="Nom du bonus" placeholder="Ex. Homoncule" className={inputClass} style={inputStyle} />
                  <input type="number" min={1} max={9} value={b.count} onChange={e => set({ bonuses: form.bonuses.map((x, j) => j === i ? { ...x, count: e.target.value } : x) })} aria-label="AIP gagnées" className={inputClass} style={inputStyle} />
                  <button type="button" onClick={() => set({ bonuses: form.bonuses.filter((_, j) => j !== i) })} aria-label="Retirer le bonus" className="p-1.5 rounded-md" style={{ color: theme.textSecondary }}><X size={13} /></button>
                </div>)}
                <button type="button" onClick={() => set({ bonuses: [...(form.bonuses || []), { name: '', count: 1 }] })} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1.5 rounded-lg" style={{ color: light ? '#7a5a14' : '#d9b26a', border: `1px solid ${light ? '#7a5a1444' : '#d9b26a44'}` }}><Plus size={12} /> Ajouter un bonus</button>
              </div>
            </section>
            {['gotha', 'pegre'].map(cat => {
              const { label, Icon } = CAT[cat];
              const color = catColor(cat);
              const inf = form.influences[cat];
              const specs = inf.specs || [];
              const updateSpec = (i, patch) => setInf(cat, { specs: specs.map((s, j) => j === i ? { ...s, ...patch } : s) });
              return <section key={cat} className="rounded-2xl p-4 space-y-3" style={{ background: `${color}08`, border: `1px solid ${color}30` }}>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}><Icon size={13} /> Influence {label}</h4>
                  <div className="flex items-center gap-1" role="group" aria-label={`Niveau ${label}`}>
                    {[0, 1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-pressed={inf.level === n} onClick={() => setInf(cat, { level: n, specs: specs.slice(0, n) })}
                      title={n ? `Niveau ${n}` : 'Aucune'} className="w-7 h-7 rounded-full text-[11px] font-bold transition-colors"
                      style={{ color: inf.level >= n && n ? (light ? '#fff' : '#120e10') : theme.textSecondary, background: inf.level >= n && n ? color : 'transparent', border: `1px solid ${n ? color + '66' : theme.border}` }}>{n || '–'}</button>)}
                  </div>
                </div>
                {inf.level > 0 && <div className="space-y-2">
                  {specs.map((s, i) => <div key={i} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] gap-2 items-center">
                    <ThemedSelect light={light} dense value={s.spec} ariaLabel="Spécialité" onChange={v => updateSpec(i, { spec: v })} options={INFLUENCE_SPECIALIZATIONS} />
                    <div className="rounded-lg px-2.5 py-1.5" style={inputStyle}>
                      <NetworkInput dense value={s.network || ''} onChange={v => updateSpec(i, { network: v })} networks={networks} category={cat} specialization={s.spec}
                        color={color} textColor={theme.textPrimary} onAddToCatalog={name => addNetwork({ category: cat, specialization: s.spec, name })} />
                    </div>
                    <button type="button" onClick={() => setInf(cat, { specs: specs.filter((_, j) => j !== i) })} aria-label="Retirer la spécialité" className="p-1.5 rounded-md" style={{ color: theme.textSecondary }}><X size={13} /></button>
                  </div>)}
                  {specs.length < inf.level
                    ? <button type="button" onClick={() => setInf(cat, { specs: [...specs, { spec: INFLUENCE_SPECIALIZATIONS.find(x => !specs.some(s => s.spec === x)) || '', network: '' }] })}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1.5 rounded-lg" style={{ color, border: `1px solid ${color}44` }}><Plus size={12} /> Spécialité ({specs.length}/{inf.level})</button>
                    : <p className="text-[11.5px]" style={{ color: theme.textMuted }}>Au plus autant de spécialités que le niveau ({inf.level}).</p>}
                </div>}
              </section>;
            })}
          </div>}

          {tab === 'cycle' && current && <div key="cycle" className="space-y-6 animate-in fade-in duration-300">
            <NpcAipEditor appId={appId} antag={current} month={month} />
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textPrimary }}><Shield size={13} style={{ color: catColor('gotha') }} /> Influences · {month}</h4>
                <button type="button" onClick={() => setAddInfluenceFor(current.id)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1.5 rounded-lg" style={{ color: catColor('gotha'), border: `1px solid ${catColor('gotha')}44` }}><Plus size={12} /> Ajouter</button>
              </div>
              {monthInfluences.flatMap(inf => (inf.actions || []).map((a, i) => ({ ...a, key: `${inf.id}-${i}` }))).map(a => <div key={a.key} className="rounded-xl px-3.5 py-2.5" style={{ background: theme.bgCard, border: `1px solid ${catColor(a.category || 'gotha')}30` }}>
                <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: catColor(a.category || 'gotha') }}>
                  {a.actionType === 'ciblée' ? <span className="font-bold">{a.actionName || 'Action ciblée'}</span> : <LevelLabel level={Math.max(1, parseInt(a.level, 10) || 1)} name={a.actionName || '—'} color={catColor(a.category || 'gotha')} />}
                  {a.specialization && <span style={{ color: theme.textSecondary }}>· {a.specialization}</span>}
                  {a.influenceName && <span className="italic font-serif" style={{ color: theme.textSecondary }}>· {a.influenceName}</span>}
                </div>
                {a.description && <p className="mt-1 font-serif text-[14px]" style={{ color: theme.textPrimary }}>{a.description}</p>}
              </div>)}
              {!monthInfluences.length && <p className="text-[12.5px]" style={{ color: theme.textMuted }}>Aucune influence ce cycle.</p>}
            </section>
          </div>}

          {tab === 'historique' && current && <div key="historique" className="space-y-3 animate-in fade-in duration-300">
            <p className="text-[13px]" style={{ color: theme.textSecondary }}>{(current.history || []).length} cycle{(current.history || []).length > 1 ? 's' : ''} archivé{(current.history || []).length > 1 ? 's' : ''} pour ce PNJ.</p>
            <button type="button" onClick={() => onHistory(current)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textPrimary, border: `1px solid ${theme.border}` }}><History size={13} /> Ouvrir l’historique</button>
          </div>}

          {error && <p role="alert" className="rounded-xl p-3 text-[13px]" style={{ color: red, border: `1px solid ${red}55` }}>{error}</p>}
        </fieldset>

        {(tab === 'fiche' || tab === 'ressources') && <footer className="px-5 sm:px-7 py-4 flex flex-wrap items-center gap-3" style={{ borderTop: `1px solid ${theme.border}` }}>
          <div className="flex-1 min-w-[200px]"><SubmitButton light={light} saving={saving} disabled={!form.name.trim()}>{current ? 'Enregistrer la fiche' : 'Créer le PNJ'}</SubmitButton></div>
          {savedAt > 0 && !saving && <span key={savedAt} role="status" className="text-[11px] font-bold uppercase tracking-[0.14em] animate-in fade-in duration-300" style={{ color: light ? '#276344' : '#9fd8b8' }}>Fiche enregistrée</span>}
          {current && <button type="button" disabled={saving} onClick={() => remove(current)} aria-label={`Supprimer ${current.name}`} className="p-3 rounded-lg" style={{ color: red }} title="Supprimer le PNJ"><Trash2 size={16} /></button>}
        </footer>}
      </form>
    </div>}

    {addInfluenceFor && <AddInfluenceModal antagonists={antagonists} storytellers={storytellers} networks={networks} month={month} initialAntagonistId={addInfluenceFor}
      onAddToCatalog={addNetwork} onSubmit={addInfluence} onClose={() => setAddInfluenceFor(null)} />}
  </div>;
}
