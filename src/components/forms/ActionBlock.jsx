import { useState } from 'react';
import { Scroll, Cpu, Beaker, ChevronDown, Gift } from 'lucide-react';
import { aipTypeLabel } from '../../utils/aipLabel';
import SelectInput from '../ui/SelectInput';
import PeopleInput from '../ui/PeopleInput';
import ThemedSelect from '../ui/ThemedSelect';
import ScoreUsedInput from '../ui/ScoreUsedInput';
import LearningFields from './LearningFields';
import { optionsWith } from '../../utils/lists';

// Champ d'étude ou origine d'un bonus : menu des choix du profil (avec « Autre… »), ou saisie libre.
function SubjectField({ value, onChange, choices, tint, placeholder }) {
  const known = choices.includes(value);
  const [free, setFree] = useState(Boolean(value) && !known);
  const inputStyle = { background: `rgba(${tint},0.08)`, border: `1px solid rgba(${tint},0.24)` };
  const input = (
    <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full py-3 px-4 rounded-xl text-sm font-serif italic text-zinc-200 outline-none transition-all focus:border-red-500/50"
      style={inputStyle} />
  );
  if (!choices.length) return input;
  return (
    <div className="space-y-2">
      <ThemedSelect value={free ? '__autre' : value || ''} placeholder="Choisir dans mon profil"
        onChange={v => { if (v === '__autre') { setFree(true); onChange(''); } else { setFree(false); onChange(v); } }}
        options={[...choices.map(c => ({ value: c, label: c })), { value: '__autre', label: 'Autre…' }]} />
      {free && input}
    </div>
  );
}

export default function ActionBlock({ num, data, type, onChange, onRemove, directory, sheet, lists, review }) {
  const [open, setOpen] = useState(true);

  const isBase = type === 'base';
  const isIT = data.bonusType === 'Informatique';
  const isSci = data.bonusType === 'Sciences';
  const isOther = data.bonusType === 'Autre';

  const accentColor = isBase ? '#ef4444' : isIT ? '#5fa0f2' : isOther ? '#d9b26a' : '#c2b3e6';
  const accentBg = isBase ? 'rgba(153,27,27,0.12)' : isIT ? 'rgba(95,160,242,0.1)' : isOther ? 'rgba(217,178,106,0.1)' : 'rgba(169,149,216,0.1)';
  const accentBorder = isBase ? 'rgba(153,27,27,0.2)' : isIT ? 'rgba(95,160,242,0.22)' : isOther ? 'rgba(217,178,106,0.24)' : 'rgba(169,149,216,0.22)';

  const icon = isBase ? <Scroll size={14}/> : isIT ? <Cpu size={14}/> : isOther ? <Gift size={14}/> : <Beaker size={14}/>;

  // Résumé affiché quand replié
  const summary = isBase
    ? (data.type ? `${data.type} · ${data.zone || '—'}` : 'Non configurée')
    : isSci || isOther
    ? (data.subject || (isSci ? 'Discipline non définie' : 'Bonus à nommer'))
    : 'Extension Informatique';

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'rgba(18,14,16,0.8)', border: `1px solid ${accentBorder}` }}>

      {/* Header — toujours visible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left group transition-all hover:bg-white/[0.01]"
      >
        <div className="flex items-center gap-3">
          {/* Icône */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}>
            {icon}
          </div>

          {/* Label */}
          <div className="leading-tight">
            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accentColor + 'cc' }}>
              {isBase ? `Action n°${num}` : aipTypeLabel(data)}
            </div>
            {!open && (
              <div className="text-[12px] font-serif italic text-zinc-400 mt-0.5 animate-in fade-in duration-200">
                {summary}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onRemove && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-200 hover:text-red-500 transition-colors px-2.5 py-1 rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
              Retirer
            </span>
          )}
          <ChevronDown
            size={14}
            className="text-zinc-400 transition-transform duration-300"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </button>

      {/* Contenu — collapsible */}
      {open && (
        <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ borderTop: `1px solid ${accentBorder}40` }}>

          {isOther && (
            <div className="space-y-1.5 pt-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">Origine du bonus</label>
              <SubjectField value={data.subject} onChange={v => onChange('subject', v)}
                choices={(sheet?.bonuses || []).map(b => b.name)} tint="217,178,106"
                placeholder="Ex. Homoncule (Tremere), avantage de clan…" />
            </div>
          )}

          {isSci && (
            <div className="space-y-1.5 pt-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">Champ d'étude</label>
              <SubjectField value={data.subject} onChange={v => onChange('subject', v)}
                choices={sheet?.sciences || []} tint="169,149,216" placeholder="Ex. Occultisme, Médecine…" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <SelectInput label="Type d'Action" value={data.type} options={optionsWith(lists.actionTypes, data.type)} onChange={v => { if (!review) onChange('type', v); }} />
            <SelectInput label="Lieu" value={data.zone} options={optionsWith(lists.zones, data.zone)} onChange={v => onChange('zone', v)} />
          </div>

          {data.type === 'Apprentissage' && <LearningFields value={review || data.learning || { type: 'Discipline' }} onChange={v => onChange('learning', v)} directory={directory} disabled={Boolean(review)} />}

          {review && <p className="text-xs text-zinc-400">Cette demande a déjà été traitée. Sa décision est consultable dans Demandes diverses.</p>}

          <PeopleInput value={data.people} onChange={v => onChange('people', v)} directory={directory} />

          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">
              Score utilisé
              <span className="normal-case tracking-normal font-normal text-zinc-500">facultatif</span>
            </label>
            <ScoreUsedInput value={data.score || ''} onChange={v => onChange('score', v)} scores={sheet?.scores || []} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">Ce que fait ton personnage</label>
            <textarea
              value={data.description}
              onChange={e => onChange('description', e.target.value)}
              rows={3}
              className="w-full py-3 px-4 rounded-xl text-[14px] font-serif leading-relaxed text-zinc-200 outline-none resize-y min-h-[96px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(229,72,79,0.1)]"
              style={{ background: 'var(--night-input)', border: '1px solid var(--night-line-strong)' }}
              placeholder="Ex. Je fouille les archives du port pour savoir qui a loué l'entrepôt incendié."
            />
          </div>
        </div>
      )}
    </div>
  );
}
