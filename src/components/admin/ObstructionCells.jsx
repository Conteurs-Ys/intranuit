import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import ThemedSelect from '../ui/ThemedSelect';
import { INFLUENCE_SPECIALIZATIONS } from '../../constants';
import { ALL_SPECIALTIES, OBSTRUCTION_TARGETS, obstructionFields, obstructionTarget, SITE_OBSTRUCTION_ACTIONS } from '../../utils/obstruction';

const CAT_LABEL = { gotha: 'Gotha', pegre: 'Pègre' };

// Texte court de la cible : « Pègre · rumeurs · Police », « Gotha · Erreurs Administratives »…
export function obstructionLabel(act) {
  const t = obstructionTarget(act);
  const what = t.target === 'rumeurs'
    ? `rumeurs · ${t.scope === ALL_SPECIALTIES ? '15 spécialités' : t.scope}`
    : t.text || (t.target === 'action' ? `${t.action || 'Ancienne activité'} · à préciser et relier` : 'activité à décrire et relier');
  return `${CAT_LABEL[t.category] || '?'} · ${what}`;
}

// Champs de la cible (catégorie obstruée, activité, spécialité ou action) — partagés console / ajout guidé.
export function ObstructionFields({ value, onChange, light, Label, box }) {
  const t = obstructionTarget(value);
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div><Label>Catégorie obstruée</Label>
        <ThemedSelect light={light} value={t.category} ariaLabel="Catégorie obstruée" onChange={v => onChange({ obstructedCategory: v, obstructedAction: '' })}
          options={[{ value: 'gotha', label: 'Gotha' }, { value: 'pegre', label: 'Pègre' }]} /></div>
      <div><Label>Activité obstruée</Label>
        <ThemedSelect light={light} value={t.target === 'rumeurs' ? 'rumeurs' : 'autre'} ariaLabel="Activité obstruée" onChange={v => onChange({ obstructionTarget: v })} options={OBSTRUCTION_TARGETS} /></div>
      {t.target === 'rumeurs' && <div className="sm:col-span-2"><Label>Spécialité des rumeurs visées</Label>
        <ThemedSelect light={light} value={t.scope} ariaLabel="Spécialité visée" onChange={v => onChange({ obstructionTarget: 'rumeurs', obstructionScope: v })}
          options={[{ value: ALL_SPECIALTIES, label: 'Les 15 spécialités à la fois' }, ...INFLUENCE_SPECIALIZATIONS]} /></div>}
      {t.target !== 'rumeurs' && <div className="sm:col-span-2"><Label>Activité visée</Label>
        <input value={t.text} onChange={e => onChange({ obstructionTarget: 'autre', obstructionText: e.target.value })} aria-label="Activité visée" placeholder="Ex. acquérir des armes au marché noir"
          className="w-full rounded-xl px-3 py-2 text-[13.5px] outline-none placeholder:opacity-50" style={box} />
        <p className="mt-2 text-xs" style={{ color: box.color }}>Les actions concernées se relient dans Supervision → Résolution → Obstructions.</p></div>}
    </div>
  );
}

export const cleanTarget = obstructionFields;

// Cellule d'une ligne « Obstruction » : la cible en clair, modifiable dans une petite fenêtre.
export function ObstructionTargetCell({ item, onSave }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item);
  useEffect(() => { if (!open) setDraft(item); }, [item, open]);
  const blue = light ? '#245b9f' : '#5fa0f2';
  const legacy = obstructionTarget(item).legacy;
  const box = { background: light ? '#faf8f5' : 'var(--night-input)', border: `1px solid ${theme.borderStrong}`, color: theme.textPrimary };
  const Label = ({ children }) => <span className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: theme.textSecondary }}>{children}</span>;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Préciser ce que l’obstruction gêne"
        className="mt-1.5 flex items-start gap-1.5 text-left text-[11.5px] leading-snug rounded-md px-1.5 py-1 max-w-full"
        style={{ color: blue, background: `${blue}10`, border: `1px solid ${legacy ? (light ? '#7a5a14' : '#d9b26a') + '88' : blue + '33'}` }}>
        <ShieldAlert size={12} className="shrink-0 mt-px" />
        <span><span className="font-bold">Obstrue</span> {obstructionLabel(item)}{legacy && <span className="block text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: light ? '#7a5a14' : '#d9b26a' }}>Ancienne saisie · à préciser</span>}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Cible de l'obstruction" className="w-full max-w-lg rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: light ? '#faf8f5' : 'var(--night-panel)', border: `1px solid ${blue}44` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: blue }}>Obstruction · {item.characterName}</div>
                <h3 className="font-serif italic font-bold text-[20px]" style={{ color: theme.textPrimary }}>Ce que l’obstruction gêne</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="p-1.5" style={{ color: theme.textSecondary }}><X size={16} /></button>
            </div>
            <ObstructionFields value={draft} onChange={patch => setDraft(d => ({ ...d, ...patch }))} light={light} Label={Label} box={box} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>Annuler</button>
              <button type="button" disabled={obstructionTarget(draft).target !== 'rumeurs' && !obstructionTarget(draft).text.trim()} onClick={async () => { await onSave(cleanTarget({ ...draft, obstructionTarget: obstructionTarget(draft).target === 'rumeurs' ? 'rumeurs' : 'autre' })); setOpen(false); }}
                className="disabled:opacity-40 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ background: 'linear-gradient(135deg, rgba(139,38,53,.75), rgba(86,26,36,.92))', color: '#ecbcc6' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Repère sur une action globale : obstruée (et combien d'actions il faut), ou obstruction 5 créée par l'action.
export function ObstructionBadge({ item, result }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const gold = light ? '#7a5a14' : '#d9b26a';
  if (SITE_OBSTRUCTION_ACTIONS.includes(item.actionName)) {
    return <div className="mt-1.5 text-[11px] leading-snug" style={{ color: gold }} title="Règles : quiconque cause des problèmes sur le lieu par l'influence subit une obstruction 5 pendant 24 h">
      ⚑ Obstruction 5 sur le lieu, 24 h — à appliquer par le conteur</div>;
  }
  if (!result?.level) return null;
  const spent = Math.max(1, parseInt(item.actionsSpent, 10) || 1);
  const passes = spent >= result.needed;
  const red = light ? '#a5222a' : '#e5484f';
  const color = passes ? (light ? '#276344' : '#9fd8b8') : red;
  return (
    <div className="mt-1.5 text-[11px] leading-snug" style={{ color }}
      title={result.sources.map(s => `${s.characterName} : ${s.points}${s.legacy ? ' (ancienne saisie)' : ''}`).join('\n')}>
      <span className="font-bold">Obstruée {result.level}</span> · il faut {result.needed} action{result.needed > 1 ? 's' : ''} ({spent} dépensée{spent > 1 ? 's' : ''}) — {passes ? 'passe' : 'bloquée'}
    </div>
  );
}
