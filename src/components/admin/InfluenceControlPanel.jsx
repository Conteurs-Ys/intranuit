import { saveRumorUsage } from '../../utils/saveRumorUsage';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Maximize2, X } from 'lucide-react';
import { doc, updateDoc, addDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Answer } from '../dashboard/DossierDetail';
import StatusBadge from '../ui/StatusBadge';
import useStorytellers from '../../hooks/useStorytellers';
import RumorEditor, { RumorSummary, useRumorPreview } from './RumorEditor';
import useRumorSeeds from '../../hooks/useRumorSeeds';
import FilterBar from './FilterBar';
import { useTheme } from '../../context/ThemeContext';
import { INFLUENCE_SPECIALIZATIONS, GOTHA_ACTIONS_GLOBALES, PEGRE_ACTIONS_GLOBALES, ACTIONS_CIBLEES } from '../../constants';
import { isLiveEntry } from '../../utils/monthLabels';
import ThemedSelect from '../ui/ThemedSelect';
import LevelLabel, { levelText } from '../ui/LevelLabel';
import NetworkInput from '../ui/NetworkInput';
import AddInfluenceModal from './AddInfluenceModal';
import useInfluenceNetworks from '../../hooks/useInfluenceNetworks';
import { planNpcInfluenceWrite } from '../../utils/npcInfluences';
import { countOptions } from '../../utils/filterOptions';
import { isObstruction, obstructionFor } from '../../utils/obstruction';
import { ObstructionBadge, ObstructionTargetCell } from './ObstructionCells';
import useInfluenceState from '../../hooks/useInfluenceState';
import { activeLossLevels, actorOf, levelCheck, monthIndex, supportReceived } from '../../utils/influenceRules';

function IntentionModal({ value, onSave, onClose, assignedST, characterName, accentColor, theme }) {
  const [draft, setDraft] = useState(value || '');
  const isLight = theme.name === 'light';
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        style={{
          background: isLight ? '#faf8f5' : 'var(--night-panel)',
          border: assignedST ? `1px solid ${assignedST.color}30` : `1px solid ${theme.border}`,
          boxShadow: isLight ? '0 32px 80px rgba(0,0,0,0.2)' : '0 32px 80px rgba(0,0,0,0.95)',
          maxHeight: '80vh',
        }}>
        <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textSecondary }}>Description de l’action</div>
            <div className="font-serif text-base font-black italic" style={{ color: theme.textPrimary }}>{characterName}</div>
          </div>
          <div className="flex items-center gap-2">
            {assignedST && (
              <div className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ background: assignedST.color + '15', color: assignedST.color, border: `1px solid ${assignedST.color}30` }}>
                {assignedST.pseudo}
              </div>
            )}
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-xl transition-colors hover:opacity-60"
              style={{ color: theme.textMuted, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full h-full min-h-[320px] rounded-2xl p-5 text-[15px] font-serif leading-relaxed outline-none resize-none transition-all"
            style={{
              background: isLight ? '#ffffff' : 'rgba(0,0,0,0.4)',
              border: assignedST ? `1px solid ${assignedST.color}25` : `1px solid ${theme.border}`,
              color: theme.textResponse,
              borderLeft: assignedST ? `3px solid ${assignedST.color}` : `3px solid ${accentColor}30`,
            }}
            placeholder="Décrire l’action…"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
          <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{draft.length} caractères</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-colors"
              style={{ color: theme.textMuted }}>Annuler</button>
            <button onClick={() => { onSave(draft); onClose(); }}
              className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:opacity-80"
              style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}35` }}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntentionCellPopover({ item, onSave, rows = 3, accentColor = '#d97706', assignedST }) {
  const { theme } = useTheme();
  const [localVal, setLocalVal] = useState(item.description || '');
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, below: true });
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setLocalVal(item.description || ''); }, [item.description]);
  const handleBlur = () => { if (localVal !== (item.description || '')) onSave(localVal); };
  const computePos = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const below = spaceBelow > 220;
    setPos({ top: below ? rect.bottom + 6 : rect.top - 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)), below });
  };
  const handleMouseEnter = () => { if (!localVal || localVal.length < 80) return; computePos(); setShow(true); };
  return (
    <>
      <div ref={ref} className="relative w-full min-w-[260px] group/intent" onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
        <textarea value={localVal} onChange={e => setLocalVal(e.target.value)} onBlur={handleBlur} rows={rows}
          className="w-full rounded-xl p-2.5 text-[14.5px] font-serif leading-relaxed outline-none transition-all placeholder:text-current placeholder:opacity-60"
          style={{ background: theme.bgResponse, borderLeft: assignedST ? `2px solid ${assignedST.color}` : `2px solid ${accentColor}20`, border: assignedST ? `1px solid ${assignedST.color}20` : `1px solid ${theme.border}`, color: theme.textResponse, resize: 'vertical', minHeight: '76px' }}
          placeholder="Description…" />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="absolute top-1.5 right-1.5 opacity-100 sm:opacity-0 sm:group-hover/intent:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-lg"
          style={{ background: accentColor + '15', border: `1px solid ${accentColor}25`, color: accentColor }}
          title="Ouvrir en plein écran">
          <Maximize2 size={10} />
        </button>
        {localVal && localVal.length >= 80 && <div className="absolute bottom-1 right-6 text-[10px] font-black uppercase tracking-[0.14em] opacity-30 pointer-events-none" style={{ color: theme.textSecondary }}>···</div>}
        {show && <div className="fixed z-[9999] w-80 rounded-2xl p-4 shadow-2xl pointer-events-none" style={{ top: pos.below ? pos.top : undefined, bottom: pos.below ? undefined : window.innerHeight - pos.top, left: pos.left, background: theme.name === 'light' ? '#ffffff' : 'var(--night-panel-2)', border: `1px solid ${theme.border}` }}><p className="text-[14.5px] font-serif leading-relaxed whitespace-pre-wrap" style={{ color: theme.textPrimary }}>{localVal}</p></div>}
      </div>
      {modalOpen && (
        <IntentionModal
          value={localVal}
          onSave={val => { setLocalVal(val); onSave(val); }}
          onClose={() => setModalOpen(false)}
          assignedST={assignedST}
          characterName={item.characterName}
          accentColor={accentColor}
          theme={theme}
        />
      )}
    </>
  );
}

function ResponseModal({ value, onSave, onClose, assignedST, characterName, accentColor, theme, rumorContent }) {
  const [draft, setDraft] = useState(value || '');
  const [preview, setPreview] = useState(false);
  const isLight = theme.name === 'light';
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" style={{ background: isLight ? '#faf8f5' : 'var(--night-panel)', border: assignedST ? `1px solid ${assignedST.color}30` : `1px solid ${theme.border}`, boxShadow: isLight ? '0 32px 80px rgba(0,0,0,0.2)' : '0 32px 80px rgba(0,0,0,0.95)', maxHeight: '85vh' }}>
        <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textSecondary }}>Retour Conteur</div><div className="font-serif text-base font-black italic" style={{ color: theme.textPrimary }}>{characterName}</div></div>
          <div className="flex items-center gap-2">
            {assignedST && <div className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em]" style={{ background: assignedST.color + '15', color: assignedST.color, border: `1px solid ${assignedST.color}30` }}>{assignedST.pseudo}</div>}
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-xl transition-colors hover:opacity-60" style={{ color: theme.textMuted, background: theme.bgCard, border: `1px solid ${theme.border}` }}><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex gap-2">
            {['Rédiger', 'Aperçu joueur'].map((label, i) => <button key={label} type="button" aria-pressed={preview === Boolean(i)} onClick={() => setPreview(Boolean(i))}
              className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: theme.textPrimary, border: `1px solid ${preview === Boolean(i) ? '#e5484f' : theme.border}` }}>{label}</button>)}
          </div>
          {preview ? <Answer visible text={draft} light={isLight} /> : <textarea value={draft} onChange={e => setDraft(e.target.value)} className="w-full min-h-[280px] rounded-2xl p-5 text-[15px] font-serif leading-relaxed outline-none resize-none placeholder:text-current placeholder:opacity-60" style={{ background: isLight ? '#ffffff' : 'rgba(0,0,0,0.4)', border: assignedST ? `1px solid ${assignedST.color}25` : `1px solid ${theme.border}`, borderLeft: assignedST ? `3px solid ${assignedST.color}` : `3px solid ${accentColor}30`, color: theme.textResponse }} placeholder="Retour conteur..." aria-label="Retour du conteur" autoFocus />}
          {rumorContent}
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
          <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{draft.length} caracteres</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-colors" style={{ color: theme.textMuted }}>Annuler</button>
            <button onClick={() => { onSave(draft); onClose(); }} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:opacity-80" style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}35` }}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// `rumor` (actions de rumeur) : { dossier, ctx, onSave } pour l'aperçu en direct et la relecture.
function ResponseCell({ item, onSave, assignedST, accentColor, isRumeur, rumor }) {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [rumorOpen, setRumorOpen] = useState(false);
  const preview = useRumorPreview(isRumeur ? item : null, rumor?.dossier, rumor?.ctx);
  const [localVal, setLocalVal] = useState(item.response || '');
  useEffect(() => { setLocalVal(item.response || ''); }, [item.response]);
  const handleBlur = () => { if (localVal !== (item.response || '')) onSave(localVal); };
  const rumorContent = isRumeur && preview ? (
    <RumorSummary preview={preview} frozen={Boolean(item.rumorFrozenAt)} color={accentColor} onOpen={() => { setModalOpen(false); setRumorOpen(true); }} />
  ) : null;
  return (
    <>
      <div className="relative group/resp min-w-[320px] max-w-[480px] space-y-2">
        <div className="relative">
          <textarea value={localVal} onChange={e => setLocalVal(e.target.value)} onBlur={handleBlur} className="w-full rounded-xl p-2.5 text-[14.5px] font-serif leading-relaxed outline-none transition-all placeholder:text-current placeholder:opacity-60" style={{ background: theme.bgResponse, borderLeft: assignedST ? `2px solid ${assignedST.color}` : `2px solid ${accentColor}20`, border: assignedST ? `1px solid ${assignedST.color}20` : `1px solid ${theme.border}`, color: theme.textResponse, resize: 'vertical', minHeight: '76px' }} rows={3} placeholder="Retour conteur..." />
          <button onClick={() => setModalOpen(true)} className="absolute top-1.5 right-1.5 opacity-100 sm:opacity-0 sm:group-hover/resp:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-lg" style={{ background: accentColor + '15', border: `1px solid ${accentColor}25`, color: accentColor }} title="Ouvrir en plein écran"><Maximize2 size={10} /></button>
        </div>
        {rumorContent}
      </div>
      {modalOpen && <ResponseModal value={localVal} onSave={val => { setLocalVal(val); onSave(val); }} onClose={() => setModalOpen(false)} assignedST={assignedST} characterName={item.characterName} accentColor={accentColor} theme={theme} rumorContent={rumorContent} />}
      {rumorOpen && preview && <RumorEditor item={item} dossier={rumor.dossier} ctx={rumor.ctx} onSave={rumor.onSave} onSaveUsage={rumor.onSaveUsage} onClose={() => setRumorOpen(false)} />}
    </>
  );
}

function SortableHeader({ label, field, sortBy, onSort, className = '' }) {
  const { theme } = useTheme();
  const isActive = sortBy.field === field;
  return <th className={`px-3 py-3 cursor-pointer select-none group ${className}`} onClick={() => onSort(field)}><div className="flex items-center gap-1"><span className="transition-colors text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: isActive ? theme.textPrimary : theme.textMuted }}>{label}</span><span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: isActive ? theme.textPrimary : theme.textSecondary }}>{isActive ? (sortBy.direction === 'asc' ? <ArrowUp size={9} /> : <ArrowDown size={9} />) : <ArrowUpDown size={9} />}</span></div></th>;
}
function EditCell({ children, className = '' }) { const { theme } = useTheme(); return <td className={`px-3 py-2.5 align-top ${className}`} style={{ borderRight: `1px solid ${theme.borderCell}` }}>{children}</td>; }

export default function InfluenceControlPanel({ influences, antagonists = [], cycle, appId, availableYears, selectedYear, onSelectYear, monthsForYear, effectiveMonth, onSelectMonth }) {
  const { theme } = useTheme();
  const isLight = theme.name === 'light';
  const accent = isLight ? '#975012' : '#ec9440';
  const { storytellers } = useStorytellers();
  const { networks, addNetwork } = useInfluenceNetworks();
  const { losses, settings: influenceSettings } = useInfluenceState();
  const [addOpen, setAddOpen] = useState(false);
  const [filterEntity, setFilterEntity] = useState([]);
  const [filterNetwork, setFilterNetwork] = useState([]);
  const realInfluences = useMemo(() => influences.filter(isLiveEntry), [influences]);
  // Rumeurs : aperçu en direct sur tous les dossiers (anciens compris), rumeurs de conteur, fiches PNJ.
  const { seeds: rumorSeeds } = useRumorSeeds();
  const rumorCtx = useMemo(() => ({ dossiers: influences, seeds: rumorSeeds, antagonists }), [influences, rumorSeeds, antagonists]);
  // Trace commune d'un usage : écrite sur l'action d'origine (clé « dossier:action »).
  const saveUsage = (key, patch) => saveRumorUsage(db, appId, key, patch);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterActionType, setFilterActionType] = useState([]);
  const [filterSpec, setFilterSpec] = useState([]);
  const [filterST, setFilterST] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterCharacter, setFilterCharacter] = useState([]);
  const [filterActionName, setFilterActionName] = useState([]);
  const [filterResponse, setFilterResponse] = useState([]);
  const [sortBy, setSortBy] = useState({ field: 'characterName', direction: 'asc' });
  const handleSort = (field) => setSortBy(s => ({ field, direction: s.field === field && s.direction === 'asc' ? 'desc' : 'asc' }));
  const flattenedActions = useMemo(() => {
    const list = [];
    realInfluences.filter(i => i.monthLabel === effectiveMonth).forEach(inf => {
      inf.actions?.forEach((act, idx) => list.push({ ...act, infId: inf.id, userId: inf.userId, characterName: inf.characterName, clan: inf.clan, sect: inf.sect, status: inf.status, actionIdx: idx }));
    });
    return list;
  }, [realInfluences, effectiveMonth]);


  const filteredActions = useMemo(() => flattenedActions.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || (a.characterName || '').toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q) || (a.influenceName || '').toLowerCase().includes(q) || (a.actionName || '').toLowerCase().includes(q) || (a.specialization || '').toLowerCase().includes(q) || (a.response || '').toLowerCase().includes(q);
    const matchCat = !filterCategory.length || filterCategory.includes(a.category);
    const matchType = !filterActionType.length || filterActionType.includes(a.actionType);
    const matchSpec = !filterSpec.length || filterSpec.includes(a.specialization);
    const matchST = !filterST.length || filterST.includes(a.assignedTo || '');
    // Le statut est celui du dossier d'un joueur : un filtre de statut écarte les PNJ.
    const matchStatus = !filterStatus.length || (a.status !== 'npc' && filterStatus.includes(a.status));
    const matchEntity = !filterEntity.length || filterEntity.includes(a.status === 'npc' ? 'npc' : 'pj');
    const matchNetwork = !filterNetwork.length || filterNetwork.includes(a.influenceName || '');
    const matchCharacter = !filterCharacter.length || filterCharacter.includes(a.characterName);
    const matchActionName = !filterActionName.length || filterActionName.includes(a.actionName);
    const matchResponse = !filterResponse.length || filterResponse.some(v =>
      (v === 'filled' && (a.response || '').trim()) ||
      (v === 'empty' && !(a.response || '').trim())
    );
    return matchSearch && matchCat && matchType && matchSpec && matchST && matchStatus && matchEntity && matchNetwork && matchCharacter && matchActionName && matchResponse;
  }).sort((a, b) => {
    const va = (a[sortBy.field] ?? '').toString().toLowerCase();
    const vb = (b[sortBy.field] ?? '').toString().toLowerCase();
    return sortBy.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  }), [flattenedActions, search, filterCategory, filterActionType, filterSpec, filterST, filterStatus, filterEntity, filterNetwork, filterCharacter, filterActionName, filterResponse, sortBy]);
  const handleSaveActionField = async (item, field, value) => {
    const infDoc = realInfluences.find(i => i.id === item.infId);
    if (!infDoc) return;
    const updatedActions = [...(infDoc.actions || [])];
    updatedActions[item.actionIdx] = { ...updatedActions[item.actionIdx], [field]: value };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', item.infId), { actions: updatedActions, updatedAt: new Date().toISOString() });
  };
  // Plusieurs champs d'une action en une écriture (cible d'une obstruction).
  const handleSaveActionFields = async (item, patch) => {
    const infDoc = realInfluences.find(i => i.id === item.infId);
    if (!infDoc) return;
    const updatedActions = [...(infDoc.actions || [])];
    updatedActions[item.actionIdx] = { ...updatedActions[item.actionIdx], ...patch };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', item.infId), { actions: updatedActions, updatedAt: new Date().toISOString() });
  };
  // Obstruction subie par chaque action globale du cycle (règles FCF).
  const obstructionByRow = useMemo(() => {
    const map = new Map();
    const docs = influences.filter(i => i.monthLabel === effectiveMonth);
    flattenedActions.forEach(a => {
      if (a.actionType !== 'globale') return;
      const owner = docs.find(d => d.id === a.infId);
      if (owner) map.set(`${a.infId}-${a.actionIdx}`, obstructionFor(a, owner, docs, a.actionIdx));
    });
    return map;
  }, [flattenedActions, influences, effectiveMonth]);
  // Contrôle de niveau des actions globales : déclaré − pertes en cours + soutien reçu, +1 spécialité.
  const levelByRow = useMemo(() => {
    const map = new Map();
    const docs = influences.filter(i => i.monthLabel === effectiveMonth);
    flattenedActions.forEach(a => {
      if (a.actionType !== 'globale') return;
      const owner = docs.find(d => d.id === a.infId);
      const actor = owner && actorOf(owner);
      const check = levelCheck(a, {
        baseLevel: a.level,
        lossLevels: actor ? activeLossLevels(losses, actor, a.category, effectiveMonth, monthIndex) : 0,
        supportPoints: actor ? supportReceived(actor, a.category, influences, effectiveMonth, influenceSettings.outsideSupportMalus) : 0,
      });
      if (check) map.set(`${a.infId}-${a.actionIdx}`, check);
    });
    return map;
  }, [flattenedActions, influences, effectiveMonth, losses, influenceSettings]);
  const handleSaveRootField = async (item, field, value) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', item.infId), { [field]: value, updatedAt: new Date().toISOString() }); };
  const handleDeleteAction = async (item) => {
    if (item.status !== 'npc') return;
    const infDoc = realInfluences.find(i => i.id === item.infId);
    if (!infDoc) return;
    const updatedActions = (infDoc.actions || []).filter((_, idx) => idx !== item.actionIdx);
    if (updatedActions.length === 0) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', item.infId));
    else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', item.infId), { actions: updatedActions, updatedAt: new Date().toISOString() });
  };
  // Ajout guidé : complète le dossier PNJ du mois ou en crée un, relié à la fiche PNJ.
  const handleAddInfluence = async ({ form, antag }) => {
    const month = effectiveMonth || cycle.label;
    const plan = planNpcInfluenceWrite({ influences: realInfluences, form, antag, month, year: parseInt(month.split(' ')[1], 10) || selectedYear, monthName: month.split(' ')[0] });
    if (plan.id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', plan.id), plan.update);
    else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'global_influences'), plan.create);
  };
  // Filtres dans l'ordre de lecture : qui → quoi → avec quoi → suivi. Seules les valeurs
  // présentes ce cycle sont proposées, avec leur nombre ; Action, Spécialité et Réseau
  // suivent la catégorie et le type déjà choisis.
  const entityOf = (a) => (a.status === 'npc' ? 'npc' : 'pj');
  const narrowed = flattenedActions.filter(a =>
    (!filterCategory.length || filterCategory.includes(a.category)) && (!filterActionType.length || filterActionType.includes(a.actionType)));
  const actionOrder = [...GOTHA_ACTIONS_GLOBALES, ...PEGRE_ACTIONS_GLOBALES].map(a => a.name).concat(ACTIONS_CIBLEES);
  const filterGroups = [
    { key: 'entity', label: 'Entité', selected: filterEntity, onChange: setFilterEntity, accentColor: isLight ? '#a5222a' : '#e5484f',
      options: countOptions(flattenedActions, entityOf, { order: ['pj', 'npc'], labelOf: v => (v === 'pj' ? 'Joueurs' : 'PNJ et mouvements') }) },
    { key: 'character', label: 'Personnage', selected: filterCharacter, onChange: setFilterCharacter, accentColor: isLight ? '#a5222a' : '#e5484f',
      options: countOptions(flattenedActions.filter(a => !filterEntity.length || filterEntity.includes(entityOf(a))), a => a.characterName || undefined) },
    { key: 'category', label: 'Catégorie', selected: filterCategory, onChange: setFilterCategory, accentColor: accent,
      options: countOptions(flattenedActions, a => a.category || undefined, { order: ['gotha', 'pegre'], labelOf: v => ({ gotha: 'Gotha', pegre: 'Pègre' }[v] || v) }) },
    { key: 'actionType', label: 'Type', selected: filterActionType, onChange: setFilterActionType, accentColor: isLight ? '#245b9f' : '#5fa0f2',
      options: countOptions(flattenedActions.filter(a => !filterCategory.length || filterCategory.includes(a.category)), a => a.actionType || undefined, { order: ['globale', 'ciblée'], labelOf: v => ({ globale: 'Globale', ciblée: 'Ciblée' }[v] || v) }) },
    { key: 'actionName', label: 'Action', selected: filterActionName, onChange: setFilterActionName, accentColor: accent,
      options: countOptions(narrowed, a => a.actionName || undefined, { order: actionOrder }) },
    { key: 'specialization', label: 'Spécialité', selected: filterSpec, onChange: setFilterSpec, accentColor: isLight ? '#665088' : '#a995d8',
      options: countOptions(narrowed, a => a.specialization || '', { order: [...INFLUENCE_SPECIALIZATIONS, ''], labelOf: v => v || 'Sans spécialité' }) },
    { key: 'network', label: 'Réseau', selected: filterNetwork, onChange: setFilterNetwork, accentColor: accent,
      options: countOptions(narrowed, a => a.influenceName || '', { labelOf: v => v || 'Sans réseau' }) },
    { key: 'st', label: 'Conteur', selected: filterST, onChange: setFilterST, accentColor: isLight ? '#a5222a' : '#e5484f',
      options: [{ value: '', label: 'Libre', count: flattenedActions.filter(a => !a.assignedTo).length },
        ...storytellers.map(st => ({ value: st.id, label: st.pseudo, count: flattenedActions.filter(a => a.assignedTo === st.id).length }))] },
    { key: 'response', label: 'Retour', selected: filterResponse, onChange: setFilterResponse, accentColor: isLight ? '#276344' : '#9fd8b8', exclusive: true,
      options: [{ value: 'empty', label: 'À rédiger', count: flattenedActions.filter(a => !(a.response || '').trim()).length },
        { value: 'filled', label: 'Rédigé', count: flattenedActions.filter(a => (a.response || '').trim()).length }] },
    { key: 'status', label: 'Dossier joueur', selected: filterStatus, onChange: setFilterStatus, accentColor: isLight ? '#276344' : '#9fd8b8', exclusive: true,
      options: countOptions(flattenedActions.filter(a => a.status !== 'npc'), a => a.status || undefined, { order: ['submitted', 'assigned', 'completed'], labelOf: v => ({ submitted: 'Modifiable', assigned: 'Verrouillé', completed: 'Diffusé' }[v] || v) }) },
  ];
  const inputBase = { background: 'transparent', outline: 'none', width: '100%', fontFamily: 'Georgia, serif', color: theme.textSecondary };
  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 flex-wrap">
        {availableYears.map(y => <button key={y} onClick={() => onSelectYear(y)} className="px-3 py-1 rounded-lg text-[10px] font-black tracking-[0.14em] border transition-all duration-200" style={{ background: selectedYear === y ? 'rgba(217,119,6,0.12)' : 'transparent', borderColor: selectedYear === y ? 'rgba(217,119,6,0.35)' : theme.border, color: selectedYear === y ? accent : theme.textSecondary }}>{y}</button>)}
        {monthsForYear.length > 0 && <div className="w-px h-3" style={{ background: theme.border }} />}
        {monthsForYear.map(m => <button key={m} onClick={() => onSelectMonth(m)} className="px-3 py-1 rounded-lg text-[10px] font-black tracking-[0.14em] border transition-all duration-200" style={{ background: effectiveMonth === m ? 'rgba(217,119,6,0.08)' : 'transparent', borderColor: effectiveMonth === m ? 'rgba(217,119,6,0.25)' : theme.border, color: effectiveMonth === m ? accent : theme.textMuted }}>{m.split(' ')[0]}</button>)}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 basis-full sm:basis-0 min-w-[240px] p-3 rounded-xl" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}><FilterBar search={search} onSearch={setSearch} filterGroups={filterGroups} onClearAll={() => { setSearch(''); setFilterCategory([]); setFilterActionType([]); setFilterSpec([]); setFilterST([]); setFilterStatus([]); setFilterCharacter([]); setFilterActionName([]); setFilterResponse([]); setFilterEntity([]); setFilterNetwork([]); }} accentColor={accent} /></div>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:opacity-80 flex-shrink-0" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', color: accent }}><Plus size={12} /> Nouvelle influence</button>
      </div>
      <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{filteredActions.length} action{filteredActions.length > 1 ? 's' : ''}</span>{filteredActions.length !== flattenedActions.length && <span className="text-[10px]" style={{ color: theme.textSecondary }}>/ {flattenedActions.length} total</span>}</div>
      <div role="region" aria-label="Tableau des influences, défilement horizontal" tabIndex={0} className="rounded-2xl overflow-hidden" style={{ background: theme.bgTable, border: `1px solid ${theme.border}`, maxHeight: '70vh', overflowY: 'auto', overflowX: 'auto' }}>
        <table className="w-full text-left border-collapse" style={{ minWidth: '1600px' }}>
          <thead className="sticky top-0 z-20" style={{ background: theme.bgTableHead, borderBottom: `1px solid ${theme.borderStrong}` }}>
            <tr>
              <SortableHeader label="Entité" field="characterName" sortBy={sortBy} onSort={handleSort} className="w-36" />
              <SortableHeader label="Catég." field="category" sortBy={sortBy} onSort={handleSort} className="w-20" />
              <th className="px-3 py-3 w-16 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Niv. base</th>
              <th className="px-3 py-3 w-16 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Actions</th>
              <SortableHeader label="Type" field="actionType" sortBy={sortBy} onSort={handleSort} className="w-20" />
              <SortableHeader label="Action" field="actionName" sortBy={sortBy} onSort={handleSort} className="w-40" />
              <SortableHeader label="Spéc." field="specialization" sortBy={sortBy} onSort={handleSort} className="w-32" />
              <th className="px-3 py-3 w-56 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Réseau</th>
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Description</th>
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Retour / Rumeurs</th>
              <th className="px-3 py-3 w-28 text-center text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Conteur</th>
            </tr>
          </thead>
          <tbody>
            {filteredActions.length === 0 && <tr><td colSpan={11} className="text-center py-20 font-serif italic" style={{ color: theme.textSecondary }}>{flattenedActions.length === 0 ? 'Aucune influence soumise ce cycle.' : 'Aucun résultat pour ces filtres.'}</td></tr>}
            {filteredActions.map((item) => {
              const assignedST = storytellers.find(s => s.id === item.assignedTo);
              const isGotha = item.category === 'gotha';
              const accentColor = isGotha ? (isLight ? '#975012' : '#ec9440') : (isLight ? '#665088' : '#a995d8');
              const isRumeur = item.actionName === 'La Rumeur' || item.actionName === "Potins et délit d'initié";
              const globalActions = isGotha ? GOTHA_ACTIONS_GLOBALES : PEGRE_ACTIONS_GLOBALES;
              const isNPC = item.status === 'npc';
              return (
                <tr key={`${item.infId}-${item.actionIdx}`} className="transition-colors duration-150 group/row" style={{ backgroundColor: assignedST ? `${assignedST.color}07` : theme.bgTableRow, borderLeft: `2px solid ${assignedST ? assignedST.color + '50' : accentColor + '18'}`, borderBottom: `1px solid ${theme.borderCell}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = assignedST ? `${assignedST.color}12` : theme.bgTableRowHover} onMouseLeave={e => e.currentTarget.style.backgroundColor = assignedST ? `${assignedST.color}07` : theme.bgTableRow}>
                  <EditCell><div className="flex items-start justify-between gap-1"><div className="flex-1 min-w-0"><input defaultValue={item.characterName} onBlur={e => handleSaveRootField(item, 'characterName', e.target.value)} className="w-full bg-transparent text-[14.5px] font-serif font-black outline-none italic leading-none mb-1.5" style={{ color: theme.textPrimary }} /><StatusBadge status={item.status} />{item.byLieutenant && <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#5b8ff0' }} title="Action du lieutenant (atout Parangon)">Lieutenant · {item.lieutenantName || '—'}</div>}</div>{isNPC && <button onClick={() => handleDeleteAction(item)} className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded-lg flex-shrink-0 mt-0.5" title="Supprimer cette action" style={{ color: '#7f1d1d' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(127,29,29,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Trash2 size={11} /></button>}</div></EditCell>
                  <EditCell><ThemedSelect light={isLight} dense value={item.category} color={accentColor} onChange={v => handleSaveActionField(item, 'category', v)} options={[{ value: 'gotha', label: 'Gotha' }, { value: 'pegre', label: 'Pègre' }]} /></EditCell>
                  <EditCell><input type="number" min={1} max={10} defaultValue={item.level || 1} title="Niveau de base (fiche, sans soutien)" onBlur={e => handleSaveActionField(item, 'level', parseInt(e.target.value) || 1)} style={{ ...inputBase, fontSize: '12px', fontWeight: 900, color: theme.textSecondary, textAlign: 'center' }} />{parseInt(item.supportedLevel, 10) > (parseInt(item.level, 10) || 1) && <div className="mt-1 text-center text-[10.5px] font-bold" title="Niveau avec soutiens indiqué par le joueur" style={{ color: isLight ? '#7a5a14' : '#d9b26a' }}>→ {item.supportedLevel} soutenu</div>}</EditCell>
                  <EditCell><input type="number" min={1} defaultValue={item.actionsSpent || 1} onBlur={e => handleSaveActionField(item, 'actionsSpent', parseInt(e.target.value) || 1)} style={{ ...inputBase, fontSize: '12px', fontWeight: 900, color: theme.textSecondary, textAlign: 'center' }} /></EditCell>
                  <EditCell><ThemedSelect light={isLight} dense value={item.actionType} color={isLight ? undefined : item.actionType === 'ciblée' ? '#5fa0f2' : '#9fd8b8'} onChange={v => handleSaveActionField(item, 'actionType', v)} options={[{ value: 'globale', label: 'Globale' }, { value: 'ciblée', label: 'Ciblée' }]} /></EditCell>
                  <EditCell><ThemedSelect light={isLight} dense value={item.actionName} onChange={v => handleSaveActionField(item, 'actionName', v)} placeholder="—" options={[{ value: '', label: '—' }, ...(item.actionType === 'ciblée' ? ACTIONS_CIBLEES.map(a => ({ value: a, label: a })) : globalActions.map(a => ({ value: a.name, text: levelText(a.level, a.name), label: <LevelLabel level={a.level} name={a.name} color={accentColor} /> })))]} />{isRumeur && <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: accentColor }}>✦ rumeur</div>}{isObstruction(item) && <ObstructionTargetCell item={item} onSave={patch => handleSaveActionFields(item, patch)} />}<ObstructionBadge item={item} result={obstructionByRow.get(`${item.infId}-${item.actionIdx}`)} />{(() => { const c = levelByRow.get(`${item.infId}-${item.actionIdx}`); return c && (!c.ok || c.supportMismatch || c.baseTooHigh) ? <>{c.baseTooHigh && <div className="mt-1.5 text-[11px] leading-snug" style={{ color: isLight ? '#7a5a14' : '#d9b26a' }} title="Le niveau naturel va de 1 à 5 ; au-delà, seulement par soutien"><span className="font-bold">Base {c.base}</span> · comptée 5, le reste par soutien</div>}{c.supportMismatch && <div className="mt-1.5 text-[11px] leading-snug" style={{ color: isLight ? '#7a5a14' : '#d9b26a' }} title="Le joueur compte sur des soutiens qui ne correspondent pas à ceux déposés ce cycle"><span className="font-bold">Soutien</span> · annoncé {c.declaredSupported}, calculé {c.supported}</div>}{!c.ok && <div className="mt-1.5 text-[11px] leading-snug" style={{ color: isLight ? '#a5222a' : '#f7a8ac' }} title="Niveau déclaré − pertes en cours + soutien reçu, +1 si une spécialité est indiquée"><span className="font-bold">Niveau insuffisant</span> · requis {c.required}, effectif {c.effective}</div>}</> : null; })()}</EditCell>
                  <EditCell><ThemedSelect light={isLight} dense value={item.specialization} onChange={v => handleSaveActionField(item, 'specialization', v)} options={INFLUENCE_SPECIALIZATIONS} /></EditCell>
                  <EditCell><NetworkInput dense value={item.influenceName || ''} onChange={v => handleSaveActionField(item, 'influenceName', v)} placeholder={isNPC ? 'Réseau…' : 'Réseau du joueur…'} networks={isNPC ? networks : []} category={item.category} specialization={item.specialization} color={accentColor} textColor={theme.textSecondary} onAddToCatalog={isNPC ? (name => addNetwork({ category: item.category, specialization: item.specialization || '', name })) : undefined} /></EditCell>
                  <EditCell><IntentionCellPopover item={item} rows={3} assignedST={assignedST} accentColor={accentColor} onSave={(val) => handleSaveActionField(item, 'description', val)} /></EditCell>
                  <EditCell><ResponseCell item={item} onSave={val => handleSaveActionField(item, 'response', val)} assignedST={assignedST} accentColor={accentColor} isRumeur={isRumeur} rumor={isRumeur ? { dossier: realInfluences.find(d => d.id === item.infId), ctx: rumorCtx, onSave: patch => handleSaveActionFields(item, patch), onSaveUsage: saveUsage } : null} /></EditCell>
                  <td className="px-3 py-2.5 align-top text-center" style={{ borderRight: `1px solid ${theme.borderCell}` }}><ThemedSelect light={isLight} dense value={item.assignedTo || ''} color={assignedST?.color} onChange={v => handleSaveActionField(item, 'assignedTo', v)} options={[{ value: '', label: 'Libre' }, ...storytellers.map(st => ({ value: st.id, label: st.pseudo }))]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {addOpen && (
        <AddInfluenceModal antagonists={antagonists} storytellers={storytellers} networks={networks} month={effectiveMonth || cycle.label}
          onAddToCatalog={addNetwork} onSubmit={handleAddInfluence} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
