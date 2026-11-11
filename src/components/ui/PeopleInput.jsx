import { useMemo, useRef, useState } from 'react';
import { X, Users, UserPlus, Skull, User } from 'lucide-react';
import FloatingList from './FloatingList';

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// « Avec qui » : on choisit dans l'annuaire (personnages joueurs et PNJ connus),
// ou on ajoute librement quelqu'un qui n'y figure pas (étiquette en pointillés).
export default function PeopleInput({ label = 'Avec qui', value = [], onChange, directory = [] }) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const people = Array.isArray(value) ? value : [];
  const known = useMemo(() => new Set(directory.map(d => norm(d.name))), [directory]);

  const suggestions = useMemo(() => {
    const q = norm(draft.trim());
    return directory
      .filter(d => !people.some(p => norm(p) === norm(d.name)))
      .filter(d => !q || norm(d.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .slice(0, 8);
  }, [directory, draft, people]);

  const typed = draft.trim().replace(/,$/, '').trim();
  const exactMatch = suggestions.find(s => norm(s.name) === norm(typed));
  const options = [...suggestions, ...(typed && !exactMatch ? [{ name: typed, free: true }] : [])];

  const add = (name) => {
    const clean = name.trim();
    if (clean && !people.some(p => norm(p) === norm(clean))) onChange([...people, clean]);
    setDraft('');
    setHighlight(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(options.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const pick = open && options[highlight] ? options[highlight].name : typed;
      if (pick) add(pick);
    }
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Backspace' && !draft && people.length) onChange(people.slice(0, -1));
  };

  return (
    <div className="space-y-1.5 text-left">
      <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">
        {label}
        <span className="normal-case tracking-normal font-normal text-zinc-500">facultatif</span>
      </label>
      <div className="relative">
        <div ref={boxRef} className="flex flex-wrap items-center gap-1.5 min-h-[46px] px-2.5 py-2 rounded-xl transition-all cursor-text"
          onClick={() => inputRef.current?.focus()}
          style={{ background: 'var(--night-input)', border: `1px solid ${open ? 'rgba(229,72,79,0.5)' : 'var(--night-line-strong)'}`, boxShadow: open ? '0 0 0 3px rgba(229,72,79,0.1)' : 'none' }}>
          <Users size={14} className="text-red-400/80 ml-1 mr-0.5 shrink-0" />
          {people.map(p => {
            const isKnown = known.has(norm(p));
            return (
              <span key={p} title={isKnown ? 'Dans l’annuaire' : 'Hors annuaire : le conteur fera le lien'}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[12px] font-bold animate-in fade-in zoom-in-95 duration-200"
                style={isKnown
                  ? { background: 'rgba(229,72,79,0.16)', border: '1px solid rgba(229,72,79,0.32)', color: '#fde2e0' }
                  : { background: 'transparent', border: '1px dashed var(--night-line-strong)', color: 'var(--night-muted)' }}>
                {p}
                <button type="button" onClick={e => { e.stopPropagation(); onChange(people.filter(x => x !== p)); }} aria-label={`Retirer ${p}`}
                  className="w-4 h-4 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-white/10 transition">
                  <X size={11} />
                </button>
              </span>
            );
          })}
          <input ref={inputRef} value={draft}
            onChange={e => { setDraft(e.target.value); setOpen(true); setHighlight(0); }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown}
            placeholder={people.length ? 'Ajouter…' : 'Chercher un personnage, ou taper un nom'}
            className="flex-1 min-w-[9rem] bg-transparent outline-none text-[13px] text-zinc-200 placeholder:text-zinc-500 py-1"
            role="combobox" aria-expanded={open} aria-autocomplete="list" />
        </div>

        {open && options.length > 0 && (
          <FloatingList anchorRef={boxRef} role="listbox">
            {options.map((o, i) => {
              const Icon = o.free ? UserPlus : o.kind === 'pnj' ? Skull : User;
              return (
                <li key={(o.free ? 'free:' : '') + o.name} role="option" aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)} onMouseDown={e => e.preventDefault()} onClick={() => add(o.name)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-colors"
                  style={{ background: i === highlight ? 'rgba(229,72,79,0.14)' : 'transparent', color: i === highlight ? 'var(--night-text)' : 'var(--night-muted)' }}>
                  <Icon size={14} className="shrink-0" style={{ color: o.free ? 'var(--night-faint)' : '#f58b90' }} />
                  <span className="truncate font-bold">{o.free ? `Ajouter « ${o.name} »` : o.name}</span>
                  <span className="ml-auto text-[10.5px] uppercase tracking-[0.12em] shrink-0" style={{ color: 'var(--night-faint)' }}>
                    {o.free ? 'hors liste' : o.kind === 'pnj' ? 'PNJ' : o.clan || 'Joueur'}
                  </span>
                </li>
              );
            })}
          </FloatingList>
        )}
      </div>
    </div>
  );
}
