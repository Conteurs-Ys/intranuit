import { useDialogs } from '../../context/DialogContext';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Lock, Check, ArrowUpDown, ArrowUp, ArrowDown, Download, Sun, Moon, Maximize2, X, Expand, Pencil, Layers, Sparkles, Scale, Ear, Network, Droplet } from 'lucide-react';
import useAipGroups from '../../hooks/useAipGroups';
import AipGroupModal from './AipGroupModal';
import { groupColor, groupIndex, rowKey, suggestGroups } from '../../utils/aipGroups';
import { doc, updateDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Answer, People } from '../dashboard/DossierDetail';
import { Dots } from '../ui/ScoreField';
import { antagonistActionsOrDefault, flattenAntagonistActions, nextAntagonistCycle } from '../../utils/antagonistActions';
import { staffAIPEntries } from '../../utils/staffAIPExport';
import { aipTypeLabel, aipTypeKey, AIP_BONUS_FAMILIES } from '../../utils/aipLabel';
import { countOptions } from '../../utils/filterOptions';
import StatusBadge from '../ui/StatusBadge';
import AntagonistManager from './AntagonistManager';
import PNJHistoryModal from './PNJHistoryModal';
import StorytellerManager from './StorytellerManager';
import InfluenceControlPanel from './InfluenceControlPanel';
import NetworkCatalog from './NetworkCatalog';
import ResolutionPanel from './ResolutionPanel';
import RumorSeedsPanel from './RumorSeedsPanel';
import FeedingPanel from './FeedingPanel';
import useRumorSeeds from '../../hooks/useRumorSeeds';
import { freezeDossierRumors, isRumorAction } from '../../utils/rumors';
import ExpenseReviewPanel from './ExpenseReviewPanel';
import LearningPanel from './LearningPanel';
import FilterBar from './FilterBar';
import useExport from '../../hooks/useExport';
import { SECTES } from '../../constants';
import useLists from '../../hooks/useLists';
import { optionsWith } from '../../utils/lists';
import ListsPanel from './ListsPanel';
import CycleSettings from './CycleSettings';
import { nextCycle } from '../../utils/cycle';
import { unansweredPlayerActions } from '../../utils/dispatch';
import useStorytellers from '../../hooks/useStorytellers';
// Les modules Oracle, intrigues et chronologie sont exclus.
import ThemedSelect from '../ui/ThemedSelect';
import ConsoleTabs from '../ui/ConsoleTabs';
import { useTheme } from '../../context/ThemeContext';
import { isLiveEntry, getAvailableYears as getAvailableYearsFromItems, getMonthsForYear as getMonthsForYearFromItems, pickEffectiveMonth } from '../../utils/monthLabels';

function isDispatchableStatus(status) {
  return status === 'submitted' || status === 'assigned';
}

function getAvailableYears(aips, antagonists, influences = []) {
  return getAvailableYearsFromItems([
    ...aips.filter(isLiveEntry),
    ...(influences || []).filter(isLiveEntry),
    ...antagonists,
  ]);
}
function getMonthsForYear(aips, antagonists, influences, year) {
  return getMonthsForYearFromItems([
    ...aips.filter(isLiveEntry),
    ...(influences || []).filter(isLiveEntry),
    ...antagonists,
  ], year);
}

// ── Popover hover pour texte long ─────────────────────────────────────────────
function TextPopover({ text, rows = 3 }) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const isLight = theme.name === 'light';

  const handleMouseEnter = () => {
    if (!text || text.length < 80) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const below = spaceBelow > 200;
    setPos({
      top: below ? rect.bottom + 4 : rect.top - 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)),
      below,
    });
    setShow(true);
  };

  return (
    <div ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)} className="relative w-full">
      <textarea
        readOnly
        value={text || ''}
        rows={rows}
        className="w-full rounded-lg p-1 text-[14.5px] font-serif leading-relaxed resize-none cursor-default"
        style={{ background: 'transparent', border: 'none', outline: 'none', color: theme.textSecondary }}
      />
      {text && text.length >= 80 && (
        <div className="absolute bottom-1 right-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-30 pointer-events-none"
          style={{ color: theme.textMuted }}>···</div>
      )}
      {show && (
        <div className="fixed z-[9999] w-80 rounded-2xl p-4 shadow-2xl"
          style={{
            top: pos.below ? pos.top : undefined,
            bottom: pos.below ? undefined : window.innerHeight - pos.top,
            left: pos.left,
            background: isLight ? '#ffffff' : 'var(--night-panel-2)',
            border: `1px solid ${theme.border}`,
            boxShadow: isLight ? '0 8px 32px rgba(0,0,0,0.15)' : '0 16px 48px rgba(0,0,0,0.9)',
          }}>
          <p className="text-[14.5px] font-serif leading-relaxed whitespace-pre-wrap" style={{ color: theme.textPrimary }}>
            {text}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Modal plein écran pour édition Sentence ────────────────────────────────────
function SentenceModal({ value, onSave, onClose, assignedST, characterName, accentColor, theme }) {
  const [draft, setDraft] = useState(value || '');
  const [preview, setPreview] = useState(false);
  const isLight = theme.name === 'light';

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

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
        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
              Sentence
            </div>
            <div className="font-serif text-base font-black italic" style={{ color: theme.textPrimary }}>
              {characterName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {assignedST && (
              <div className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ background: assignedST.color + '15', color: assignedST.color, border: `1px solid ${assignedST.color}30` }}>
                {assignedST.pseudo}
              </div>
            )}
            <button onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:opacity-60"
              style={{ color: theme.textMuted, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-4 flex gap-2">
          {['Rédiger', 'Aperçu joueur'].map((label, i) => <button key={label} type="button" aria-pressed={preview === Boolean(i)} onClick={() => setPreview(Boolean(i))}
            className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: theme.textPrimary, border: `1px solid ${preview === Boolean(i) ? '#e5484f' : theme.border}`, background: preview === Boolean(i) ? 'rgba(229,72,79,0.1)' : 'transparent' }}>{label}</button>)}
        </div>
        <div className="flex-1 overflow-auto p-6">
          {preview ? <Answer visible text={draft} light={isLight} /> : <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full h-full min-h-[320px] rounded-2xl p-5 text-[15px] font-serif leading-relaxed outline-none resize-none transition-all placeholder:text-current placeholder:opacity-60"
            style={{
              background: isLight ? '#ffffff' : 'rgba(0,0,0,0.4)',
              border: assignedST ? `1px solid ${assignedST.color}25` : `1px solid ${theme.border}`,
              color: theme.textResponse,
              borderLeft: assignedST ? `3px solid ${assignedST.color}` : `3px solid ${accentColor}30`,
            }}
            placeholder="Rédigez la sentence ici..."
            aria-label="Sentence du conteur"
            autoFocus
          />}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${theme.border}` }}>
          <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
            {draft.length} caractères
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-colors"
              style={{ color: theme.textMuted }}>
              Annuler
            </button>
            <button onClick={handleSave}
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

// Case de sélection d'une ligne, dans le style du site : carré au contour rouge qui se
// remplit d'une coche. Discrète : visible au survol de la ligne, au clavier, ou dès
// qu'une sélection est en cours.
function SelectBox({ checked, onToggle, selecting, light, label }) {
  const red = light ? '#a5222a' : '#e5484f';
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onToggle}
      className={`mt-0.5 w-4 h-4 shrink-0 rounded-[5px] flex items-center justify-center transition-all duration-200 focus-visible:opacity-100 ${checked || selecting ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-70 hover:!opacity-100'}`}
      style={{
        background: checked ? red : 'transparent',
        border: `1.5px solid ${checked ? red : light ? 'rgba(165,34,42,0.45)' : 'rgba(229,72,79,0.5)'}`,
        boxShadow: checked ? `0 0 8px ${red}55` : 'none',
      }}>
      {checked && <Check size={11} strokeWidth={3} color={light ? '#fff' : '#120e10'} className="animate-in zoom-in-50 duration-150" />}
    </button>
  );
}

// Pastille du groupe d'une AIP dans le tableau ; un clic ouvre le groupe.
function GroupChip({ group, groups, onOpen }) {
  if (!group) return null;
  const c = groupColor(group, groups);
  return (
    <button type="button" onClick={() => onOpen(group.id)} title="Ouvrir le groupe"
      className="mt-1.5 flex items-center gap-1 max-w-full px-1.5 py-[3px] rounded-md text-[10px] font-bold leading-none"
      style={{ color: c, background: `${c}14`, border: `1px solid ${c}44` }}>
      <Layers size={10} className="shrink-0" /><span className="truncate">{group.title}</span>
    </button>
  );
}

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
            <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: theme.textSecondary }}>Action</div>
            <div className="font-serif text-base font-black italic" style={{ color: theme.textPrimary }}>{characterName}</div>
          </div>
          <div className="flex items-center gap-2">
            {assignedST && (
              <div className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ background: assignedST.color + '15', color: assignedST.color, border: `1px solid ${assignedST.color}30` }}>
                {assignedST.pseudo}
              </div>
            )}
            <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:opacity-60"
              style={{ color: theme.textMuted, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full h-full min-h-[320px] rounded-2xl p-5 text-[15px] font-serif leading-relaxed outline-none resize-none transition-all placeholder:text-current placeholder:opacity-60"
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
          <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>{draft.length} caractères</span>
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

function IntentionCellPopover({ item, onSave, rows = 3, accentColor = '#e5484f', assignedST }) {
  const { theme } = useTheme();
  const [localVal, setLocalVal] = useState(item.description || '');
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, below: true });
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setLocalVal(item.description || '');
  }, [item.description]);

  const handleBlur = () => {
    if (localVal !== (item.description || '')) onSave(localVal);
  };

  const computePos = () => {
  const rect = ref.current?.getBoundingClientRect();
  if (!rect) return;

  // position RELATIVE à la cellule
  // on met le popover juste sous la cellule
  setPos({
    top: rect.height + 8,
    left: 0,
  });
};

  const handleMouseEnter = () => {
    if (!localVal || localVal.length < 80) return;
    computePos();
    setShow(true);
  };

  return (
    <>
      <div
        ref={ref}
        className="relative w-full group/intent"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
      >
        <textarea
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          rows={rows}
          className="w-full rounded-xl p-2.5 text-[14.5px] font-serif leading-relaxed outline-none transition-all placeholder:text-current placeholder:opacity-60"
          style={{
            background: theme.bgResponse,
            borderLeft: assignedST ? `2px solid ${assignedST.color}` : `2px solid ${accentColor}20`,
            border: assignedST ? `1px solid ${assignedST.color}20` : `1px solid ${theme.border}`,
            color: theme.textResponse,
            resize: 'vertical',
            minHeight: '76px',
          }}
          placeholder="Action…"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="absolute top-1.5 right-1.5 opacity-100 sm:opacity-0 sm:group-hover/intent:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-lg"
          style={{ background: accentColor + '15', border: `1px solid ${accentColor}25`, color: accentColor }}
          title="Ouvrir en plein écran">
          <Maximize2 size={10} />
        </button>

        {localVal && localVal.length >= 80 && (
          <div
            className="absolute bottom-1 right-6 text-[10px] font-black uppercase tracking-[0.14em] opacity-30 pointer-events-none"
            style={{ color: theme.textMuted }}
          >
            ···
          </div>
        )}

        {show && (
          <div
            className="absolute z-[50] w-80 rounded-2xl p-4 shadow-2xl pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              background: theme.name === 'light' ? '#ffffff' : 'var(--night-panel-2)',
              border: `1px solid ${theme.border}`,
              boxShadow: theme.name === 'light'
                ? '0 8px 32px rgba(0,0,0,0.15)'
                : '0 16px 48px rgba(0,0,0,0.9)',
            }}
          >
            <p className="text-[14.5px] font-serif leading-relaxed whitespace-pre-wrap" style={{ color: theme.textPrimary }}>
              {localVal}
            </p>
          </div>
        )}
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

// ── Cellule Sentence avec resize + bouton modal ────────────────────────────────
function SentenceCell({ item, onSave, assignedST, accentColor = '#e5484f' }) {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [localVal, setLocalVal] = useState(item.response || '');

  useEffect(() => { setLocalVal(item.response || ''); }, [item.response]);

  const handleBlur = () => {
    if (localVal !== (item.response || '')) onSave(item, 'response', localVal);
  };

  const handleModalSave = (val) => {
    setLocalVal(val);
    onSave(item, 'response', val);
  };

  return (
    <>
      <div className="relative group/sentence">
        <textarea
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          className="w-full rounded-xl p-2.5 text-[14.5px] font-serif leading-relaxed outline-none transition-all placeholder:text-current placeholder:opacity-60"
          style={{
            background: theme.bgResponse,
            borderLeft: assignedST ? `2px solid ${assignedST.color}` : `2px solid ${accentColor}20`,
            border: assignedST ? `1px solid ${assignedST.color}20` : `1px solid ${theme.border}`,
            color: theme.textResponse,
            resize: 'vertical',
            minHeight: '76px',
          }}
          rows={3}
          placeholder="Sentence..."
        />
        {/* Bouton modal — apparaît au hover */}
        <button
          onClick={() => setModalOpen(true)}
          className="absolute top-1.5 right-1.5 opacity-100 sm:opacity-0 sm:group-hover/sentence:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-lg"
          style={{ background: accentColor + '15', border: `1px solid ${accentColor}25`, color: accentColor }}
          title="Ouvrir en plein écran">
          <Maximize2 size={10} />
        </button>
      </div>

      {modalOpen && (
        <SentenceModal
          value={localVal}
          onSave={handleModalSave}
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


function SortableHeader({ label, field, sortBy, onSort, className = '' }) {
  const { theme } = useTheme();
  const isActive = sortBy.field === field;
  return (
    <th className={`px-3 py-3 cursor-pointer select-none group ${className}`} onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        <span className="transition-colors duration-150" style={{ color: isActive ? theme.textPrimary : theme.textSecondary }}>{label}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: isActive ? theme.textPrimary : theme.textDim }}>
          {isActive ? (sortBy.direction === 'asc' ? <ArrowUp size={9}/> : <ArrowDown size={9}/>) : <ArrowUpDown size={9}/>}
        </span>
      </div>
    </th>
  );
}

// Un seul intitulé en lecture ; les champs techniques restent accessibles au conteur.
function ActionTypeCell({ item, onSave, light, actionTypes }) {
  const { theme } = useTheme();
  const options = optionsWith(actionTypes, item.type);
  const typeField = <ThemedSelect light={light} dense value={item.type} ariaLabel={`Type d'action de ${item.characterName}`}
    onChange={v => onSave(item, 'type', v)} options={options} />;
  const subjectField = <input defaultValue={item.subject || ''} onBlur={e => { if (e.target.value !== (item.subject || '')) onSave(item, 'subject', e.target.value); }}
    aria-label={`Intitulé de l'action de ${item.characterName}`}
    className="w-full bg-transparent text-[12px] font-serif italic outline-none placeholder:text-current placeholder:opacity-70"
    style={{ color: theme.textSecondary }} placeholder="Intitulé…" />;

  if (!item.isBonus) return typeField;
  const color = item.bonusType === 'Autre' ? (light ? '#815c20' : '#d9b26a')
    : item.bonusType === 'Sciences' ? (light ? '#665088' : '#a995d8') : (light ? '#245b9f' : '#5fa0f2');
  return <details className="group/bonus">
    <summary className="flex items-start justify-between gap-2 cursor-pointer rounded-lg py-1 text-[12px] font-bold leading-relaxed list-none [&::-webkit-details-marker]:hidden"
      style={{ color }} title="Modifier le type ou l'intitulé du bonus">
      <span>{aipTypeLabel(item) || 'AIP bonus'}</span>
      <Pencil size={12} className="shrink-0 mt-1 opacity-60" aria-hidden="true" />
    </summary>
    <div className="mt-2 space-y-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>Type d'action</span>
        {typeField}
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>Intitulé du bonus</span>
        {subjectField}
      </label>
    </div>
  </details>;
}

function ActionScore({ score, light }) {
  // Les saisies libres restent entières ; seule une valeur terminale de 0 à 5 devient des points.
  const parsed = /^(.+?)\s+([0-5])$/.exec(String(score).trim());
  const color = light ? '#245b9f' : '#7fb2f5';
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" style={{ color }} title={`Score utilisé : ${score}`}>
    <span>{parsed ? parsed[1] : score}</span>
    {parsed && <><span className="sr-only">{parsed[2]} sur 5</span><span aria-hidden="true"><Dots value={Number(parsed[2])} size={7} color={color} /></span></>}
  </div>;
}

function EditCell({ children, className = '' }) {
  const { theme } = useTheme();
  return (
    <td className={`px-3 py-2.5 align-top ${className}`} style={{ borderRight: `1px solid ${theme.borderCell}` }}>
      {children}
    </td>
  );
}

export default function StorytellerControlPanel({ aips, antagonists, influences, learnings = [], learningRequests = [], cycle, appId, viewer }) {
  const { confirmAction, showNotice } = useDialogs();
  const { theme, toggleTheme } = useTheme();
  const { storytellers } = useStorytellers();
  const { zones, actionTypes } = useLists();
  const { exportAIP, exportInfluences } = useExport();
  const [tab, setTab] = useState('regence');
  const [regenceTab, setRegenceTab] = useState('actions');
  const [supervisionTab, setSupervisionTab] = useState('resolution');
  const { seeds: rumorSeeds } = useRumorSeeds();
  const [processing, setProcessing] = useState(false);
  const [selectedPNJHistory, setSelectedPNJHistory] = useState(null);
  const isLight = theme.name === 'light';

  const availableYears = useMemo(() => getAvailableYears(aips, antagonists, influences), [aips, antagonists, influences]);
  const [selectedYear, setSelectedYear] = useState(null);
  // Année la plus récente réellement disponible tant que l'utilisateur n'a pas choisi explicitement une année.
  const effectiveYear = useMemo(() => {
    if (selectedYear != null && availableYears.includes(selectedYear)) return selectedYear;
    return availableYears[0] || cycle?.year || new Date().getFullYear();
  }, [availableYears, selectedYear, cycle]);
  const monthsForYear = useMemo(() => getMonthsForYear(aips, antagonists, influences, effectiveYear), [aips, antagonists, influences, effectiveYear]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const effectiveMonth = useMemo(() => pickEffectiveMonth(monthsForYear, selectedMonth, cycle?.label), [monthsForYear, selectedMonth, cycle]);
  const dispatchMonthLabel = effectiveMonth || cycle?.label || '';
  const isCurrentCycleSelection = dispatchMonthLabel === cycle?.label;

  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState([]);
  const [filterSect, setFilterSect] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterZone, setFilterZone] = useState([]);
  const [filterST, setFilterST] = useState([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [filterGroup, setFilterGroup] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [assigning, setAssigning] = useState(false);
  const assigningRef = useRef(false);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [openGroupId, setOpenGroupId] = useState(null);
  const [ignoredSuggestions, setIgnoredSuggestions] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('intranuit:groupes-ignores') || '[]')); } catch { return new Set(); }
  });
  const [chosenST, setChosenST] = useState(() => {
    try { return localStorage.getItem(`intranuit:conteur:${viewer?.id}`) || ''; } catch { return ''; }
  });
  // Les anciens conteurs n'ont pas de lien de compte : choix local explicite,
  // ou correspondance unique du pseudo. Cela sert uniquement au filtre.
  const matchingST = viewer?.pseudo ? storytellers.filter(st => st.pseudo?.trim().toLocaleLowerCase('fr') === viewer.pseudo.trim().toLocaleLowerCase('fr')) : [];
  const myST = storytellers.find(st => st.id === chosenST) || (matchingST.length === 1 ? matchingST[0] : null);
  const chooseMyST = (id) => {
    setChosenST(id);
    try { localStorage.setItem(`intranuit:conteur:${viewer?.id}`, id); } catch { /* navigation privée */ }
  };
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterCharacter, setFilterCharacter] = useState([]);
  const [filterResponse, setFilterResponse] = useState([]);
  const [sortBy, setSortBy] = useState({ field: 'characterName', direction: 'asc' });
  const handleSort = (field) => setSortBy(s => ({ field, direction: s.field === field && s.direction === 'asc' ? 'desc' : 'asc' }));

  const flattenedActions = useMemo(() => {
    let list = [];
    aips
      .filter(a => a.monthLabel === effectiveMonth && !a.userId?.startsWith('historical_'))
      .forEach(aip => {
        aip.actions?.forEach((act, idx) => list.push({ ...act, aipId: aip.id, userId: aip.userId, characterName: aip.characterName, sect: aip.sect, status: aip.status, actionIdx: idx, isBonus: false, isPlayer: true }));
        aip.bonus?.forEach((b, idx) => list.push({ ...b, aipId: aip.id, userId: aip.userId, characterName: aip.characterName, sect: aip.sect, status: aip.status, actionIdx: idx, isBonus: true, isPlayer: true }));
      });
    list.push(...flattenAntagonistActions(antagonists));
    return list;
  }, [aips, antagonists, effectiveMonth]);

  const characterOptions = useMemo(() =>
    [...new Set(flattenedActions.map(a => a.characterName).filter(Boolean))].sort().map(n => ({ value: n, label: n })),
  [flattenedActions]);

  // ── Regroupement d'AIP (CDC §10.3) ─────────────────────────────
  const { groups: aipGroups, createGroup, updateGroup, deleteGroup } = useAipGroups(effectiveMonth);
  const groupByKey = useMemo(() => groupIndex(aipGroups), [aipGroups]);
  const rowsByKey = useMemo(() => new Map(flattenedActions.map(r => [rowKey(r), r])), [flattenedActions]);
  useEffect(() => {
    setSelectedKeys(new Set());
    setAssignmentMessage('');
  }, [effectiveMonth]);
  useEffect(() => {
    setSelectedKeys(previous => {
      const valid = new Set([...previous].filter(key => rowsByKey.has(key)));
      return valid.size === previous.size ? previous : valid;
    });
  }, [rowsByKey]);
  // Relire les dossiers dans une transaction : une attribution ne doit pas écraser
  // une sentence enregistrée entre-temps par un autre conteur.
  const assignSelection = async (assignedTo) => {
    if (assigningRef.current || !selectedKeys.size) return;
    if (assignedTo && !storytellers.some(st => st.id === assignedTo)) return;
    const selected = [...selectedKeys].map(key => rowsByKey.get(key)).filter(Boolean);
    if (!selected.length) return;
    const documents = new Map();
    selected.forEach(row => {
      const key = `${row.isPlayer ? 'pj' : 'pnj'}:${row.aipId}`;
      if (!documents.has(key)) documents.set(key, {
        ref: doc(db, 'artifacts', appId, 'public', 'data', row.isPlayer ? 'global_aips' : 'antagonists', row.aipId), rows: [],
      });
      documents.get(key).rows.push(row);
    });
    assigningRef.current = true;
    setAssigning(true);
    setAssignmentMessage('');
    try {
      await runTransaction(db, async transaction => {
        const entries = [...documents.values()];
        const snapshots = await Promise.all(entries.map(entry => transaction.get(entry.ref)));
        entries.forEach((entry, index) => {
          if (!snapshots[index].exists()) throw new Error('Un dossier a été supprimé. Recharge le tableau.');
          const data = snapshots[index].data();
          const actions = entry.rows[0].isPlayer ? [...(data.actions || [])] : antagonistActionsOrDefault(data).map(a => ({ ...a }));
          const bonus = [...(data.bonus || [])];
          entry.rows.forEach(row => {
            const list = row.isPlayer && row.isBonus ? bonus : actions;
            const current = list[row.actionIdx];
            if (!current || (row.id != null && current.id !== row.id)) throw new Error('Une action a changé. Recharge le tableau.');
            list[row.actionIdx] = { ...current, assignedTo };
          });
          transaction.update(entry.ref, entry.rows[0].isPlayer
            ? { actions, bonus, updatedAt: new Date().toISOString() }
            : { actions });
        });
      });
      setSelectedKeys(new Set());
      const name = storytellers.find(st => st.id === assignedTo)?.pseudo;
      setAssignmentMessage(`${selected.length} AIP ${assignedTo ? `attribuée${selected.length > 1 ? 's' : ''} à ${name}` : `remise${selected.length > 1 ? 's' : ''} en libre`}.`);
    } catch (error) {
      console.error(error);
      await showNotice("L’attribution n’a pas pu être enregistrée. La sélection est conservée ; réessaie après avoir vérifié les dossiers.", 'Attribution impossible');
    } finally {
      assigningRef.current = false;
      setAssigning(false);
    }
  };
  const knownNames = useMemo(() => [...new Set([...flattenedActions.map(r => r.characterName), ...antagonists.map(a => a.name)].filter(Boolean))], [flattenedActions, antagonists]);
  const groupSuggestions = useMemo(() => suggestGroups(flattenedActions, { exclude: new Set(groupByKey.keys()), knownNames })
    .filter(s => !ignoredSuggestions.has(`${effectiveMonth}|${s.keys.join('|')}`)).slice(0, 6), [flattenedActions, groupByKey, knownNames, ignoredSuggestions, effectiveMonth]);
  const toggleSelected = (key) => setSelectedKeys(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const ignoreSuggestion = (sug) => setIgnoredSuggestions(prev => {
    const next = new Set(prev); next.add(`${effectiveMonth}|${sug.keys.join('|')}`);
    try { localStorage.setItem('intranuit:groupes-ignores', JSON.stringify([...next].slice(-200))); } catch { /* navigation privée */ }
    return next;
  });
  const groupSelection = async (title, keys = [...selectedKeys]) => {
    // Une AIP n'appartient qu'à un groupe : on la retire de son ancien groupe.
    for (const g of aipGroups) {
      const rest = (g.members || []).filter(k => !keys.includes(k));
      if (rest.length !== (g.members || []).length) await updateGroup(g.id, { members: rest });
    }
    const ref = await createGroup({ title, members: keys });
    setSelectedKeys(new Set());
    setOpenGroupId(ref.id);
  };
  // Écrit plusieurs sentences d'un coup, un seul enregistrement par dossier.
  const writeResponses = async (updates) => {
    const byDoc = new Map();
    updates.forEach(u => { const id = `${u.row.isPlayer ? 'pj' : 'pnj'}:${u.row.aipId}`; if (!byDoc.has(id)) byDoc.set(id, []); byDoc.get(id).push(u); });
    for (const list of byDoc.values()) {
      const { row } = list[0];
      if (row.isPlayer) {
        const aipDoc = aips.find(a => a.id === row.aipId);
        if (!aipDoc) continue;
        const ua = [...(aipDoc.actions || [])], ub = [...(aipDoc.bonus || [])];
        list.forEach(({ row: r, response }) => { const arr = r.isBonus ? ub : ua; arr[r.actionIdx] = { ...arr[r.actionIdx], response }; });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_aips', row.aipId), { actions: ua, bonus: ub, updatedAt: new Date().toISOString() });
      } else {
        const antag = antagonists.find(an => an.id === row.aipId);
        if (!antag) continue;
        const ua = antagonistActionsOrDefault(antag).map(a => ({ ...a }));
        list.forEach(({ row: r, response }) => { ua[r.actionIdx] = { ...ua[r.actionIdx], response }; });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'antagonists', row.aipId), { actions: ua });
      }
    }
  };
  const addSelectionToGroup = async (id) => {
    const target = aipGroups.find(g => g.id === id);
    if (!target) return;
    const keys = [...selectedKeys];
    for (const g of aipGroups) {
      if (g.id === id) continue;
      const rest = (g.members || []).filter(k => !keys.includes(k));
      if (rest.length !== (g.members || []).length) await updateGroup(g.id, { members: rest });
    }
    await updateGroup(id, { members: [...new Set([...(target.members || []), ...keys])] });
    setSelectedKeys(new Set());
  };
  const openGroup = aipGroups.find(g => g.id === openGroupId);


  const filteredActions = useMemo(() => {
    return flattenedActions.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !q || [a.characterName, a.description, a.response, aipTypeLabel(a), a.zone, a.score, ...(a.people || [])].some(v => String(v || '').toLocaleLowerCase('fr').includes(q));
      const matchSect = !filterSect.length || filterSect.includes(a.sect);
      const matchEntity = !filterEntity.length || filterEntity.includes(a.isPlayer ? 'pj' : 'pnj');
      const matchGroup = !filterGroup.length || filterGroup.includes(groupByKey.get(rowKey(a))?.id || '');
      const matchType = !filterType.length || filterType.includes(aipTypeKey(a));
      const matchZone = !filterZone.length || filterZone.includes(a.zone);
      const matchST = (!filterST.length || filterST.some(id => id === '__unknown' ? a.assignedTo && !storytellers.some(st => st.id === a.assignedTo) : id === (a.assignedTo || ''))) && (!onlyMine || (myST && a.assignedTo === myST.id));
      // Le statut est celui du dossier d'un joueur : un filtre de statut écarte les PNJ.
      const matchStatus = !filterStatus.length || (a.isPlayer && filterStatus.includes(a.status));
      const matchCharacter = !filterCharacter.length || filterCharacter.includes(a.characterName);
      const matchResponse = !filterResponse.length || filterResponse.some(v =>
        (v === 'filled' && (a.response || '').trim()) ||
        (v === 'empty' && !(a.response || '').trim())
      );
      return matchSearch && matchEntity && matchGroup && matchSect && matchType && matchZone && matchST && matchStatus && matchCharacter && matchResponse;
    }).sort((a, b) => {
      const va = ((sortBy.field === 'type' ? aipTypeLabel(a) : a[sortBy.field]) ?? '').toString().toLowerCase();
      const vb = ((sortBy.field === 'type' ? aipTypeLabel(b) : b[sortBy.field]) ?? '').toString().toLowerCase();
      return sortBy.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [flattenedActions, search, filterEntity, filterGroup, groupByKey, filterSect, filterType, filterZone, filterST, filterStatus, filterCharacter, filterResponse, sortBy, onlyMine, myST, storytellers]);

  const handleSaveField = async (item, field, value) => {
    if (item.isPlayer) {
      const aipDoc = aips.find(a => a.id === item.aipId);
      if (!aipDoc) return;
      let updates = {};
      if (field === 'characterName' || field === 'sect') { updates[field] = value; }
      else {
        let ua = [...(aipDoc.actions || [])], ub = [...(aipDoc.bonus || [])];
        if (item.isBonus) ub[item.actionIdx] = { ...ub[item.actionIdx], [field]: value };
        else ua[item.actionIdx] = { ...ua[item.actionIdx], [field]: value };
        updates = { actions: ua, bonus: ub };
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_aips', item.aipId), { ...updates, updatedAt: new Date().toISOString() });
    } else {
      const antag = antagonists.find(an => an.id === item.aipId);
      if (!antag) return;
      let updates = {};
      if (field === 'characterName') updates['name'] = value;
      else if (field === 'sect') updates['sect'] = value;
      else {
        let ua = antagonistActionsOrDefault(antag).map(a => ({ ...a }));
        ua[item.actionIdx] = { ...ua[item.actionIdx], [field]: value };
        updates = { actions: ua };
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'antagonists', item.aipId), updates);
    }
  };

  const cycleAIPs = useMemo(() => aips.filter(a => a.monthLabel === dispatchMonthLabel && isLiveEntry(a)), [aips, dispatchMonthLabel]);
  const cycleInfluences = useMemo(() => (influences || []).filter(i => i.monthLabel === dispatchMonthLabel && isLiveEntry(i)), [influences, dispatchMonthLabel]);
  const isCycleLocked = useMemo(() => {
    const lockables = [...cycleAIPs, ...cycleInfluences].filter(x => isDispatchableStatus(x.status));
    return lockables.length > 0 && lockables.every(x => x.status === 'assigned');
  }, [cycleAIPs, cycleInfluences]);

  const handleToggleLockAll = async () => {
    const targetStatus = isCycleLocked ? 'submitted' : 'assigned';
    const fromStatus = isCycleLocked ? 'assigned' : 'submitted';
    const aipsToToggle = cycleAIPs.filter(a => a.status === fromStatus);
    const influencesToToggle = cycleInfluences.filter(i => i.status === fromStatus);
    if (!aipsToToggle.length && !influencesToToggle.length) return;
    setProcessing(true);
    const batch = writeBatch(db);
    aipsToToggle.forEach(aip => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'global_aips', aip.id), { status: targetStatus }));
    influencesToToggle.forEach(inf => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', inf.id), { status: targetStatus }));
    await batch.commit();
    setProcessing(false);
  };

  const handleDispatchAndNextMonth = async () => {
    const targetMonth = dispatchMonthLabel || cycle.label;
    const toFinishAIPs = aips.filter(a => isDispatchableStatus(a.status) && a.monthLabel === targetMonth && isLiveEntry(a));
    const toFinishInfluences = (influences || []).filter(i => isDispatchableStatus(i.status) && i.monthLabel === targetMonth && isLiveEntry(i));
    const msg = (toFinishAIPs.length || toFinishInfluences.length)
      ? `Diffuser ${toFinishAIPs.length} dossier(s) et ${toFinishInfluences.length} influence(s), puis passer au cycle suivant (${nextCycle(cycle).label}) ?`
      : `Aucun dossier à diffuser — passer tout de même au cycle suivant (${nextCycle(cycle).label}) ?`;
    let confirmMessage = (toFinishAIPs.length || toFinishInfluences.length)
      ? (isCurrentCycleSelection
          ? msg
          : `Diffuser ${toFinishAIPs.length} dossier(s) et ${toFinishInfluences.length} influence(s) pour ${targetMonth} ?`)
      : (isCurrentCycleSelection ? msg : `Aucun dossier à diffuser pour ${targetMonth}.`);
    const missing = unansweredPlayerActions(toFinishAIPs, toFinishInfluences);
    const warnings = [
      missing.aips ? `${missing.aips} AIP de joueur${missing.aips > 1 ? 's' : ''}` : '',
      missing.influences ? `${missing.influences} action${missing.influences > 1 ? 's' : ''} d’influence de joueur${missing.influences > 1 ? 's' : ''}` : '',
    ].filter(Boolean);
    if (warnings.length) confirmMessage += `\n\nAttention : ${warnings.join(' et ')} sans réponse. Diffuser quand même ?`;
    if (!await confirmAction({ title: 'Diffuser les réponses', message: confirmMessage, confirmLabel: 'Diffuser' })) return;
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      toFinishAIPs.forEach(aip => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'global_aips', aip.id), { status: 'completed' }));
      // Rumeurs : le tableau est figé à la diffusion, sauf s'il l'a déjà été par un conteur.
      const frozenAt = new Date().toISOString();
      const rumorCtx = { dossiers: influences || [], seeds: rumorSeeds, antagonists };
      toFinishInfluences.forEach(inf => {
        const toFreeze = (inf.actions || []).some(a => isRumorAction(a) && !a.rumorFrozenAt);
        const actions = toFreeze ? freezeDossierRumors(inf, rumorCtx, frozenAt, { keepFrozen: true }) : null;
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', inf.id), actions ? { status: 'completed', actions } : { status: 'completed' });
      });
      if (isCurrentCycleSelection) {
        for (const antag of antagonists) {
          batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'antagonists', antag.id), nextAntagonistCycle(antag, cycle.label));
        }
        // Cycle suivant selon le rythme réglé (tous les 1 ou 2 mois), rouvert et sans date limite.
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'game_state', 'cycle'), nextCycle(cycle));
      }
      await batch.commit();
    } catch (e) {
      console.error(e);
      await showNotice('La diffusion a échoué. Aucun dossier ni changement de cycle de cette opération n’a été enregistré. Réessaie dans un instant.', 'Diffusion impossible');
    }
    setProcessing(false);
  };

  const clearAllFilters = () => { setSearch(''); setFilterGroup([]); setFilterEntity([]); setFilterSect([]); setFilterType([]); setFilterZone([]); setFilterST([]); setFilterStatus([]); setFilterCharacter([]); setFilterResponse([]); setOnlyMine(false); };

  // Filtres dans l'ordre de lecture : qui → quoi → où → suivi. Seules les valeurs
  // présentes ce cycle sont proposées, avec leur nombre.
  const unknownST = flattenedActions.some(a => a.assignedTo && !storytellers.some(st => st.id === a.assignedTo));
  const aipFilterGroups = [
    ...(aipGroups.length ? [{ key: 'group', label: 'Groupe', selected: filterGroup, onChange: setFilterGroup, accentColor: isLight ? '#245b9f' : '#5fa0f2',
      options: [...aipGroups.map(g => ({ value: g.id, label: g.title, count: (g.members || []).filter(k => rowsByKey.has(k)).length })),
        { value: '', label: 'Hors groupe', count: flattenedActions.filter(r => !groupByKey.has(rowKey(r))).length }] }] : []),
    { key: 'entity', label: 'Entité', selected: filterEntity, onChange: setFilterEntity, accentColor: isLight ? '#8e1c24' : '#e5484f',
      options: countOptions(flattenedActions, a => (a.isPlayer ? 'pj' : 'pnj'), { order: ['pj', 'pnj'], labelOf: v => (v === 'pj' ? 'Joueurs' : 'PNJ') }) },
    { key: 'character', label: 'Personnage', selected: filterCharacter, onChange: setFilterCharacter, accentColor: isLight ? '#8e1c24' : '#e5484f',
      options: countOptions(flattenedActions.filter(a => !filterEntity.length || filterEntity.includes(a.isPlayer ? 'pj' : 'pnj')), a => a.characterName || undefined) },
    { key: 'sect', label: 'Secte', selected: filterSect, onChange: setFilterSect, accentColor: isLight ? '#a5222a' : '#e5484f',
      options: countOptions(flattenedActions, a => a.sect || undefined, { order: [...SECTES, 'Antagoniste'] }) },
    { key: 'type', label: 'Type', selected: filterType, onChange: setFilterType, accentColor: isLight ? '#245b9f' : '#5fa0f2',
      options: countOptions(flattenedActions, aipTypeKey, { order: [...actionTypes, ...AIP_BONUS_FAMILIES] }) },
    { key: 'zone', label: 'Lieu', selected: filterZone, onChange: setFilterZone, accentColor: isLight ? '#665088' : '#a995d8',
      options: countOptions(flattenedActions, a => a.zone || undefined, { order: zones }) },
    { key: 'st', label: 'Conteur', selected: filterST, onChange: setFilterST, accentColor: isLight ? '#92400e' : '#ec9440',
      options: [{ value: '', label: 'Libre', count: flattenedActions.filter(a => !a.assignedTo).length },
        ...storytellers.map(st => ({ value: st.id, label: st.pseudo, count: flattenedActions.filter(a => a.assignedTo === st.id).length })),
        ...(unknownST ? [{ value: '__unknown', label: 'Ancien conteur' }] : [])] },
    { key: 'response', label: 'Sentence', selected: filterResponse, onChange: setFilterResponse, accentColor: isLight ? '#276344' : '#9fd8b8', exclusive: true,
      options: [{ value: 'empty', label: 'À rédiger', count: flattenedActions.filter(a => !(a.response || '').trim()).length },
        { value: 'filled', label: 'Rédigée', count: flattenedActions.filter(a => (a.response || '').trim()).length }] },
    { key: 'status', label: 'Dossier joueur', selected: filterStatus, onChange: setFilterStatus, accentColor: isLight ? '#276344' : '#9fd8b8', exclusive: true,
      options: countOptions(flattenedActions.filter(a => a.isPlayer), a => a.status || undefined, { order: ['submitted', 'assigned', 'completed'], labelOf: v => ({ submitted: 'Modifiable', assigned: 'Verrouillé', completed: 'Diffusé' }[v] || v) }) },
  ];

  return (
    <div className="animate-in fade-in duration-500 min-w-0 min-h-screen transition-colors duration-300"
      style={{ background: isLight ? theme.bg : 'transparent' }}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5" style={{ borderBottom: `1px solid ${theme.border}` }}>
        {/* Titre et onglets sur une même ligne (titre masqué sur téléphone) : ce sont les boutons du cycle qui passent dessous si la place manque. */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 max-w-full">
          <h1 className="hidden sm:block min-w-0 truncate text-[22px] lg:text-[28px] font-serif font-black italic tracking-tight" style={{ color: theme.textPrimary }}>
            Régence des Ombres
          </h1>
          <ConsoleTabs compact value={tab} onChange={setTab} label="Navigation de la console" options={[
            { value: 'regence', label: 'Régence' }, { value: 'antagonists', label: 'PNJ' },
            { value: 'conteurs', label: 'Conteurs' },
          ]} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={toggleTheme}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
            title={isLight ? 'Mode sombre' : 'Mode clair'}>
            {isLight ? <Moon size={13} /> : <Sun size={13} />}
          </button>

          {tab === 'regence' && (
            <>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1.5 rounded-lg"
                style={{ color: theme.textMuted, border: `1px solid ${theme.border}` }}>
                {cycle?.label}
              </span>
              <button disabled={processing} onClick={handleToggleLockAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:opacity-80 disabled:opacity-30"
                style={{ background: isCycleLocked ? 'rgba(16,185,129,0.08)' : 'rgba(180,83,9,0.08)', border: isCycleLocked ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(180,83,9,0.18)', color: isLight ? (isCycleLocked ? '#276344' : '#92400e') : (isCycleLocked ? '#9fd8b8' : '#ec9440') }}>
                <Lock size={10}/> {isCycleLocked ? 'Déverrouiller' : 'Verrouiller'}
              </button>
              <button disabled={processing} onClick={handleDispatchAndNextMonth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:opacity-80 disabled:opacity-30"
                style={{ background: 'rgba(6,78,59,0.12)', border: '1px solid rgba(16,185,129,0.18)', color: isLight ? '#276344' : '#9fd8b8' }}>
                <Check size={10}/> Diffuser
              </button>
            </>
          )}
        </div>
      </div>

      {/* Régence */}
      {tab === 'regence' && (
        <div className="space-y-4">
          <div className="sm:w-fit">
            <ConsoleTabs scrollable value={regenceTab} onChange={setRegenceTab} label="Dossiers de la régence" options={[
              { value: 'actions', label: 'AIP' }, { value: 'influences', label: 'Influences' },
              { value: 'resolution', label: 'Supervision' }, { value: 'learning', label: 'Apprentissage' }, { value: 'reglages', label: 'Réglages' },
            ]} />
          </div>

          {regenceTab === 'actions' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {availableYears.map(y => (
                    <button key={y} onClick={() => setSelectedYear(y)}
                      className="px-3 py-1 rounded-lg text-[10px] font-black tracking-[0.14em] border transition-all duration-200"
                      style={{
                        background: effectiveYear === y ? 'rgba(239,68,68,0.1)' : 'transparent',
                        borderColor: effectiveYear === y ? 'rgba(239,68,68,0.3)' : theme.border,
                        color: effectiveYear === y ? '#e5484f' : theme.textDim,
                      }}>
                      {y}
                    </button>
                  ))}
                  {monthsForYear.length > 0 && <div className="w-px h-3" style={{ background: theme.border }} />}
                  {monthsForYear.map(m => (
                    <button key={m} onClick={() => setSelectedMonth(m)}
                      className="px-3 py-1 rounded-lg text-[10px] font-black tracking-[0.14em] border transition-all duration-200"
                      style={{
                        background: effectiveMonth === m ? 'rgba(239,68,68,0.07)' : 'transparent',
                        borderColor: effectiveMonth === m ? 'rgba(239,68,68,0.22)' : theme.border,
                        color: effectiveMonth === m ? '#e5484f' : theme.textMuted,
                      }}>
                      {m.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => exportAIP(staffAIPEntries(aips, antagonists, effectiveMonth, cycle?.label), effectiveMonth)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:opacity-80 flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#e5484f' }}>
                  <Download size={11}/> Excel
                </button>
              </div>

              <div className="p-3 rounded-xl space-y-3" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" aria-pressed={onlyMine} disabled={!myST} onClick={() => { setOnlyMine(v => !v); setFilterST([]); }}
                    className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-50"
                    style={{ border: `1px solid ${onlyMine ? '#e5484f' : theme.border}`, background: onlyMine ? 'rgba(229,72,79,0.1)' : 'transparent', color: theme.textPrimary }}>
                    À moi
                  </button>
                  <div className="w-52 max-w-full">
                    <ThemedSelect dense light={isLight} ariaLabel="Mon identité conteur pour le filtre À moi" value={myST?.id || ''} onChange={chooseMyST}
                      placeholder="Mon identité conteur…" options={storytellers.map(st => ({ value: st.id, label: st.pseudo }))} />
                  </div>
                  {!myST && <span className="text-[12px]" style={{ color: theme.textMuted }}>Choisir un conteur pour utiliser « À moi ».</span>}
                </div>
                <FilterBar search={search} onSearch={setSearch} filterGroups={aipFilterGroups} onClearAll={clearAllFilters} accentColor="#e5484f" />
              </div>

              {(aipGroups.length > 0 || groupSuggestions.length > 0) && (
                <div className="p-3 rounded-xl space-y-2.5" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                  {aipGroups.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] mr-1" style={{ color: isLight ? '#245b9f' : '#5fa0f2' }}>
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(95,160,242,0.1)', border: '1px solid rgba(95,160,242,0.25)' }}><Layers size={12} /></span>
                        Groupes
                      </span>
                      {aipGroups.map(g => {
                        const c = groupColor(g, aipGroups);
                        const n = (g.members || []).filter(k => rowsByKey.has(k)).length;
                        const done = (g.members || []).filter(k => (rowsByKey.get(k)?.response || '').trim()).length;
                        return (
                          <button key={g.id} type="button" onClick={() => setOpenGroupId(g.id)} title="Ouvrir le groupe (sentences rédigées / AIP)"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors"
                            style={{ color: c, background: `${c}12`, border: `1px solid ${c}44` }}>
                            <span className="font-serif italic">{g.title}</span>
                            <span className="tabular-nums text-[10.5px] opacity-80">{done}/{n}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {groupSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: isLight ? '#7a5a14' : '#d9b26a' }}>
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(217,178,106,0.1)', border: '1px solid rgba(217,178,106,0.28)' }}><Sparkles size={12} /></span>
                        Suggestions de regroupement
                      </span>
                      {groupSuggestions.map(sug => (
                        <div key={sug.keys.join('|')} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3.5 py-2.5 animate-in fade-in duration-300" style={{ background: 'rgba(217,178,106,0.04)', border: '1px solid rgba(217,178,106,0.18)' }}>
                          <span className="text-[13px]" style={{ color: theme.textPrimary }}>
                            {sug.keys.length} AIP avec les mêmes acteurs : <b className="font-serif italic">{sug.actors.join(', ')}</b>
                          </span>
                          <span className="ml-auto flex gap-1.5">
                            <button type="button" onClick={() => setSelectedKeys(new Set(sug.keys))}
                              className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>Sélectionner</button>
                            <button type="button" onClick={() => groupSelection(sug.actors.join(' & '), sug.keys)}
                              className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#e5484f', border: '1px solid rgba(229,72,79,0.4)' }}>Grouper</button>
                            <button type="button" onClick={() => ignoreSuggestion(sug)} aria-label={`Ignorer la suggestion ${sug.actors.join(', ')}`}
                              className="p-1 rounded-md" style={{ color: theme.textMuted }}><X size={13} /></button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {selectedKeys.size > 0 && (
                  <fieldset disabled={assigning} className="flex flex-wrap items-center gap-2 mr-2 animate-in fade-in duration-200 disabled:opacity-60">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ color: theme.textPrimary, background: 'rgba(229,72,79,0.08)', border: '1px solid rgba(229,72,79,0.25)' }}><Check size={12} style={{ color: '#e5484f' }} /> {selectedKeys.size} AIP sélectionnée{selectedKeys.size > 1 ? 's' : ''}</span>
                    <button type="button" disabled={selectedKeys.size < 2} onClick={() => groupSelection('Nouveau groupe')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
                      style={{ color: '#e5484f', border: '1px solid rgba(229,72,79,0.45)', background: 'rgba(229,72,79,0.08)' }}><Layers size={12} /> Grouper</button>
                    {aipGroups.length > 0 && (
                      <div className="w-48"><ThemedSelect dense light={isLight} value="" placeholder="Ajouter au groupe…" ariaLabel="Ajouter la sélection à un groupe"
                        onChange={id => addSelectionToGroup(id)} options={aipGroups.map(g => ({ value: g.id, label: g.title }))} /></div>
                    )}
                    <div className={assigning ? 'hidden' : 'w-52 max-w-full'}>
                      <ThemedSelect dense light={isLight} value="__choose" placeholder="Attribuer à…" ariaLabel="Attribuer les AIP sélectionnées à un conteur"
                        onChange={assignSelection} options={[{ value: '', label: 'Libre (sans conteur)' }, ...storytellers.map(st => ({ value: st.id, label: st.pseudo }))]} />
                    </div>
                    {myST && <button type="button" onClick={() => assignSelection(myST.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: theme.textPrimary, border: `1px solid ${theme.borderStrong}` }}>M’attribuer</button>}
                    {assigning && <span role="status" className="text-[12px]" style={{ color: theme.textMuted }}>Attribution en cours…</span>}
                    <button type="button" onClick={() => setSelectedKeys(new Set())} className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Annuler</button>
                  </fieldset>
                )}
                <span role="status" className="text-[12px]" style={{ color: theme.textSecondary }}>{assignmentMessage}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
                  {filteredActions.length} action{filteredActions.length > 1 ? 's' : ''}
                </span>
                {filteredActions.length !== flattenedActions.length && (
                  <span className="text-[10px]" style={{ color: theme.textMuted }}>/ {flattenedActions.length} total</span>
                )}
              </div>

              <div role="region" aria-label="Tableau des AIP, défilement horizontal" tabIndex={0} className="rounded-2xl overflow-visible"
                style={{ background: theme.bgTable, border: `1px solid ${theme.border}`, maxHeight: '70vh', overflowY: 'auto', overflowX: 'auto' }}>
                <table className="w-full text-left border-collapse" style={{ minWidth: '1400px' }}>
                  <thead className="sticky top-0 z-20"
                    style={{ background: theme.bgTableHead, borderBottom: `1px solid ${theme.borderStrong}` }}>
                    <tr className="text-[10px] font-black uppercase tracking-[0.14em]">
                      <SortableHeader label="Entité" field="characterName" sortBy={sortBy} onSort={handleSort} className="w-40" />
                      <SortableHeader label="Secte" field="sect" sortBy={sortBy} onSort={handleSort} className="w-36" />
                      <SortableHeader label="Type" field="type" sortBy={sortBy} onSort={handleSort} className="w-40" />
                      <SortableHeader label="Territoire" field="zone" sortBy={sortBy} onSort={handleSort} className="w-40" />
                      <th className="px-3 py-3" style={{ color: theme.textSecondary }}>Action</th>
                      <th className="px-3 py-3" style={{ color: theme.textSecondary }}>Sentence</th>
                      <th className="px-3 py-3 w-36 text-center" style={{ color: theme.textSecondary }}>Conteur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActions.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-20 font-serif italic" style={{ color: theme.textMuted }}>
                        {flattenedActions.length === 0 ? 'Aucune action pour ce cycle.' : 'Aucun résultat pour ces filtres.'}
                      </td></tr>
                    )}
                    {filteredActions.map((item) => {
                      const assignedST = storytellers.find(s => s.id === item.assignedTo);
                      return (
                        <tr key={`${item.aipId}-${item.actionIdx}-${item.isBonus}`}
                          className="group/row transition-colors duration-150"
                          style={{
                            backgroundColor: assignedST ? `${assignedST.color}07` : theme.bgTableRow,
                            borderLeft: `2px solid ${assignedST ? assignedST.color + '50' : 'transparent'}`,
                            borderBottom: `1px solid ${theme.borderCell}`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = assignedST ? `${assignedST.color}12` : theme.bgTableRowHover}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = assignedST ? `${assignedST.color}07` : theme.bgTableRow}>

                          <EditCell>
                            <div className="flex items-start gap-2">
                              <SelectBox checked={selectedKeys.has(rowKey(item))} onToggle={() => toggleSelected(rowKey(item))}
                                selecting={selectedKeys.size > 0} light={isLight} label={`Sélectionner l'AIP de ${item.characterName}`} />
                              <div className="min-w-0 flex-1">
                                <input defaultValue={item.characterName} onBlur={e => handleSaveField(item, 'characterName', e.target.value)}
                                  className="w-full bg-transparent text-[14.5px] font-serif font-black outline-none italic leading-none mb-1.5"
                                  style={{ color: theme.textPrimary }} />
                                <StatusBadge status={item.status} />
                                <GroupChip group={groupByKey.get(rowKey(item))} groups={aipGroups} onOpen={setOpenGroupId} />
                              </div>
                            </div>
                          </EditCell>

                          <EditCell>
                            <ThemedSelect light={isLight} dense value={item.sect} onChange={v => handleSaveField(item, 'sect', v)} options={SECTES.concat(['Antagoniste'])} />
                          </EditCell>

                          <EditCell>
                            <ActionTypeCell item={item} onSave={handleSaveField} light={isLight} actionTypes={actionTypes} />
                          </EditCell>

                          <EditCell>
                            <ThemedSelect light={isLight} dense value={item.zone} onChange={v => handleSaveField(item, 'zone', v)} options={optionsWith(zones, item.zone)} />

                          </EditCell>

                          <EditCell>
                            <IntentionCellPopover
                              item={item}
                              rows={3}
                              assignedST={assignedST}
                              accentColor="#e5484f"
                              onSave={(val) => handleSaveField(item, 'description', val)}
                            />
                            {(item.people?.length > 0 || item.score) && (
                              <dl className="mt-2 grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 gap-y-2 pt-3 items-center"
                                style={{ borderTop: `1px solid ${theme.borderCell}` }}>
                                {item.people?.length > 0 && <>
                                  <dt className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.textSecondary }}>Avec qui</dt>
                                  <dd className="min-w-0"><People people={item.people} light={isLight} /></dd>
                                </>}
                                {item.score && <>
                                  <dt className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.textSecondary }}>Score</dt>
                                  <dd className="min-w-0"><ActionScore score={item.score} light={isLight} /></dd>
                                </>}
                              </dl>
                            )}
                          </EditCell>

                          {/* Sentence — resize + modal */}
                          <EditCell>
                            <SentenceCell
                              item={item}
                              onSave={handleSaveField}
                              assignedST={assignedST}
                              accentColor="#e5484f"
                            />
                          </EditCell>

                          <td className="px-3 py-2.5 align-top text-center" style={{ borderRight: `1px solid ${theme.borderCell}` }}>
                            <ThemedSelect light={isLight} dense value={item.assignedTo || ''} color={assignedST?.color} onChange={v => handleSaveField(item, 'assignedTo', v)} options={[{ value: '', label: 'Libre' }, ...storytellers.map(st => ({ value: st.id, label: st.pseudo }))]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {regenceTab === 'actions' && aips.some(a => a.monthLabel === effectiveMonth && a.expenses?.length) && (
            <details className="mt-4 rounded-xl p-4 space-y-4" style={{ background: theme.bgTable, border: `1px solid ${theme.border}` }}>
              <summary className="cursor-pointer font-serif italic font-bold text-lg" style={{ color: theme.textPrimary }}>Dépenses des personnages · {effectiveMonth}</summary>
              {aips.filter(a => a.monthLabel === effectiveMonth && a.expenses?.length).map(a => <section key={a.id} className="mt-4 space-y-2">
                <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>{a.characterName}</h3>
                <ExpenseReviewPanel dossier={a} appId={appId} light={isLight} />
              </section>)}
            </details>
          )}

          {openGroup && (
            <AipGroupModal key={openGroup.id} group={openGroup} color={groupColor(openGroup, aipGroups)}
              rows={(openGroup.members || []).map(k => rowsByKey.get(k)).filter(Boolean)}
              onClose={() => setOpenGroupId(null)}
              onUpdateGroup={fields => updateGroup(openGroup.id, fields)}
              onRemoveMember={key => updateGroup(openGroup.id, { members: (openGroup.members || []).filter(k => k !== key) })}
              onDissolve={async () => { await deleteGroup(openGroup.id); setOpenGroupId(null); }}
              onWriteResponses={writeResponses} />
          )}

          {regenceTab === 'influences' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => exportInfluences(influences.filter(i => i.monthLabel === effectiveMonth && !i.userId?.startsWith('historical_')), effectiveMonth)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:opacity-80"
                  style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.18)', color: '#d97706' }}>
                  <Download size={11}/> Excel
                </button>
              </div>
              <InfluenceControlPanel
                influences={influences || []}
                antagonists={antagonists}
                cycle={cycle}
                appId={appId}
                availableYears={availableYears}
                selectedYear={effectiveYear}
                onSelectYear={setSelectedYear}
                monthsForYear={monthsForYear}
                effectiveMonth={effectiveMonth}
                onSelectMonth={setSelectedMonth}
              />
            </div>
          )}

          {/* Supervision : trois sous-onglets, résolution du cycle, rumeurs et catalogue des réseaux. */}
          {regenceTab === 'resolution' && (
            <div className="space-y-4">
              <div>
                <ConsoleTabs value={supervisionTab} onChange={setSupervisionTab} label="Sections de la supervision" variant="underline" itemWidth="8rem" options={[
                  { value: 'resolution', label: 'Résolution', icon: Scale }, { value: 'rumeurs', label: 'Rumeurs', icon: Ear }, { value: 'reseaux', label: 'Réseaux', icon: Network }, { value: 'sang', label: 'Sang', icon: Droplet },
                ]} />
              </div>
              <div key={supervisionTab} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                {supervisionTab === 'resolution'
                  ? <ResolutionPanel appId={appId} influences={influences || []} antagonists={antagonists} month={effectiveMonth || cycle.label} />
                  : supervisionTab === 'rumeurs'
                    ? <RumorSeedsPanel appId={appId} influences={influences || []} antagonists={antagonists} month={effectiveMonth || cycle.label} />
                    : supervisionTab === 'sang'
                      ? <FeedingPanel appId={appId} aips={aips} month={effectiveMonth || cycle.label} />
                      : <NetworkCatalog />}
              </div>
            </div>
          )}

          {regenceTab === 'reglages' && (
            <div className="space-y-4">
              <CycleSettings appId={appId} cycle={cycle} />
              <ListsPanel />
            </div>
          )}

          {regenceTab === 'learning' && (
            <LearningPanel appId={appId} learnings={learnings} aips={aips} requests={learningRequests} cycle={cycle} />
          )}
        </div>
      )}

      {tab === 'antagonists' && <AntagonistManager appId={appId} antagonists={antagonists} influences={influences || []} cycle={cycle} onHistory={setSelectedPNJHistory} />}
      {tab === 'conteurs' && <StorytellerManager />}


      {selectedPNJHistory && <PNJHistoryModal pnj={selectedPNJHistory} onClose={() => setSelectedPNJHistory(null)} />}
    </div>
  );
}
