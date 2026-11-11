import { useState } from 'react';
import { MapPin, ListChecks, ArrowUp, ArrowDown, Trash2, Plus, Lock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useLists from '../../hooks/useLists';
import { addItem, moveItem, PROTECTED_TYPES, removeItem, renameItem } from '../../utils/lists';

// Une liste éditable : renommer (à la sortie du champ), déplacer, retirer, ajouter.
function ListEditor({ icon: Icon, title, hint, color, items, onSave }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const [draft, setDraft] = useState('');
  const box = { background: light ? theme.bgCard : 'var(--night-input)', border: `1px solid ${theme.border}`, color: theme.textPrimary };
  const iconBtn = 'w-7 h-7 flex items-center justify-center rounded-md disabled:opacity-25 transition-opacity';
  const save = (next) => next !== items && onSave(next);
  const add = (e) => { e.preventDefault(); const next = addItem(items, draft); if (next !== items) { onSave(next); setDraft(''); } };
  return (
    <section className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}` }}>
      <h3 className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, border: `1px solid ${color}40`, color }}><Icon size={14} /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>{title}</span>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: theme.textMuted }}>{items.length}</span>
      </h3>
      <p className="text-[12.5px]" style={{ color: theme.textSecondary }}>{hint}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => {
          const locked = PROTECTED_TYPES.includes(item);
          return (
            <li key={item} className="flex items-center gap-1.5">
              {locked ? (
                <span className="flex-1 min-w-0 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]" style={box} title="Utilisé par l'appli : ni renommé ni retiré">
                  {item} <Lock size={11} style={{ color: theme.textMuted }} />
                </span>
              ) : (
                <input defaultValue={item} aria-label={`Renommer ${item}`} onBlur={e => save(renameItem(items, i, e.target.value))}
                  className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-[13px] outline-none" style={box} />
              )}
              <button type="button" className={iconBtn} disabled={i === 0} onClick={() => save(moveItem(items, i, -1))} aria-label={`Monter ${item}`} style={{ color: theme.textSecondary }}><ArrowUp size={13} /></button>
              <button type="button" className={iconBtn} disabled={i === items.length - 1} onClick={() => save(moveItem(items, i, 1))} aria-label={`Descendre ${item}`} style={{ color: theme.textSecondary }}><ArrowDown size={13} /></button>
              <button type="button" className={iconBtn} disabled={locked} onClick={() => save(removeItem(items, i))} aria-label={`Retirer ${item}`} style={{ color: theme.textMuted }}><Trash2 size={13} /></button>
            </li>
          );
        })}
      </ul>
      <form onSubmit={add} className="flex items-center gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ajouter…" aria-label={`Ajouter à ${title}`}
          className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-[13px] outline-none" style={box} />
        <button type="submit" disabled={!draft.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-30" style={{ color, border: `1px solid ${color}55` }}>
          <Plus size={12} /> Ajouter
        </button>
      </form>
    </section>
  );
}

// Régence › Listes : lieux et types d'AIP proposés aux joueurs et aux conteurs.
export default function ListsPanel() {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const { zones, actionTypes, saveList } = useLists();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-300">
      <ListEditor icon={MapPin} title="Lieux" color={light ? '#665088' : '#a995d8'} items={zones} onSave={v => saveList('zones', v)}
        hint="Proposés dans les AIP. Le premier est la valeur par défaut. Un lieu retiré reste affiché sur les anciens dossiers." />
      <ListEditor icon={ListChecks} title="Types d'AIP" color={light ? '#245b9f' : '#5fa0f2'} items={actionTypes} onSave={v => saveList('actionTypes', v)}
        hint="« Se nourrir » et « Apprentissage » servent à l'appli : ils ne peuvent être ni renommés ni retirés. Un type retiré reste affiché sur les anciens dossiers." />
    </div>
  );
}
