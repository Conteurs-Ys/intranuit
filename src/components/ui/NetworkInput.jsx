import { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, Network } from 'lucide-react';
import FloatingList from './FloatingList';
import { useTheme } from '../../context/ThemeContext';
import { isInCatalog, networkOptions } from '../../utils/influenceNetworks';

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Réseau d'une action d'influence (outil conteur) : suggestions du catalogue
// (même catégorie, spécialité en tête) ou saisie libre, que l'on peut ensuite
// ajouter au catalogue en un clic.
export default function NetworkInput({
  value = '', onChange, networks = [], category, specialization, onAddToCatalog,
  placeholder = 'Réseau…', dense = false, color, textColor, inputStyle, ariaLabel = 'Réseau',
}) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { setDraft(value); }, [value]);

  const suggestions = useMemo(() => {
    const q = norm(draft.trim());
    const all = networkOptions(networks, category, specialization);
    const matching = q && norm(draft) !== norm(value) ? all.filter(n => norm(n.name).includes(q)) : all;
    return matching.slice(0, 12);
  }, [networks, category, specialization, draft, value]);

  const commit = (name) => {
    const clean = name.trim();
    setDraft(clean);
    setOpen(false);
    if (clean !== value) onChange(clean);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(suggestions.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); commit(open && suggestions[highlight] ? suggestions[highlight].name : draft); inputRef.current?.blur(); }
    else if (e.key === 'Escape') { setDraft(value); setOpen(false); }
  };

  const showAdd = onAddToCatalog && value && category && !isInCatalog(networks, category, value);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <Network size={dense ? 11 : 13} className="shrink-0" style={{ color: color || 'currentColor', opacity: 0.7 }} />
        <input ref={inputRef} value={draft} aria-label={ariaLabel} placeholder={placeholder}
          onChange={e => { setDraft(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => commit(inputRef.current?.value ?? draft), 120)}
          onKeyDown={onKeyDown}
          className={`w-full min-w-0 bg-transparent outline-none placeholder:opacity-50 ${dense ? 'text-[12.5px]' : 'text-[13.5px]'}`}
          style={{ color: textColor, fontFamily: 'Georgia, serif', fontStyle: 'italic', ...inputStyle }} />
      </div>
      {showAdd && (
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onAddToCatalog(value)}
          className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-80 hover:opacity-100"
          style={{ color: color || 'currentColor' }}>
          <BookmarkPlus size={11} /> Ajouter au catalogue
        </button>
      )}
      {open && suggestions.length > 0 && (
        <FloatingList anchorRef={inputRef} minWidth={260} role="listbox" aria-label="Réseaux du catalogue"
          style={light ? { background: '#ffffff', border: `1px solid ${theme.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } : undefined}>
          {suggestions.map((n, i) => (
            <li key={n.id} role="option" aria-selected={i === highlight}
              onMouseDown={e => { e.preventDefault(); commit(n.name); }}
              onMouseEnter={() => setHighlight(i)}
              className="flex items-baseline justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer"
              style={{ background: i === highlight ? (light ? 'rgba(165,34,42,0.08)' : 'rgba(229,72,79,0.1)') : 'transparent' }}>
              <span className="font-serif text-[14px]" style={{ color: theme.textPrimary }}>{n.name}</span>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: n.specialization === specialization ? (color || '#e5484f') : theme.textMuted }}>
                {n.specialization}
              </span>
            </li>
          ))}
        </FloatingList>
      )}
    </div>
  );
}
