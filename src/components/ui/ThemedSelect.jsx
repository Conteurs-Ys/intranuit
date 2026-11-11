import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import FloatingList from './FloatingList';

const toOption = (o) => (typeof o === 'object' ? o : { value: o, label: o });

// Menu déroulant aux couleurs du site (remplace le <select> natif, blanc sous Windows).
// Clavier : flèches, Entrée/Espace, Échap, Début/Fin, et première lettre pour sauter.
export default function ThemedSelect({ value, onChange, options, placeholder = 'Choisir…', ariaLabel, compact = false, dense = false, active, color, light = false }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();
  const items = options.map(toOption);
  const selectedIndex = items.findIndex(o => String(o.value) === String(value));
  const selected = items[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!rootRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open && highlight >= 0) listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const openList = () => { setHighlight(selectedIndex >= 0 ? selectedIndex : 0); setOpen(true); };
  const choose = (i) => { if (items[i]) onChange(items[i].value); setOpen(false); };

  const onKeyDown = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); return; }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(items.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setHighlight(0); }
    else if (e.key === 'End') { e.preventDefault(); setHighlight(items.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(highlight); }
    else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1) {
      const start = highlight + 1;
      const k = e.key.toLowerCase();
      const found = [...items.slice(start), ...items.slice(0, start)].find(o => String(o.text ?? o.label).toLowerCase().startsWith(k));
      if (found) setHighlight(items.indexOf(found));
    }
  };

  const height = dense ? 'h-8 text-[11px]' : compact ? 'h-9 text-[12px]' : 'h-11 text-[13.5px]';
  const isActive = active ?? Boolean(selected);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKeyDown}
        className={`w-full ${height} ${dense ? 'rounded-lg pl-2.5 pr-7' : compact ? 'rounded-full pl-3.5 pr-9' : 'rounded-xl pl-3.5 pr-9'} flex items-center text-left font-bold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500/40`}
        style={{
          background: light ? (open ? '#f0ede8' : '#faf8f5') : open ? 'var(--night-panel-2)' : 'var(--night-input)',
          border: `1px solid ${open ? 'rgba(229,72,79,0.55)' : compact && isActive ? 'rgba(229,72,79,0.45)' : light ? 'rgba(50,30,30,0.18)' : 'var(--night-line-strong)'}`,
          color: light ? '#39302e' : selected ? (color || 'var(--night-text)') : 'var(--night-faint)',
          boxShadow: open ? '0 0 0 3px rgba(229,72,79,0.12)' : 'none',
        }}>
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={dense ? 13 : 15} className={`absolute ${dense ? 'right-2' : 'right-3'} top-1/2 -translate-y-1/2 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          style={{ color: light ? '#8e1c24' : open ? '#f58b90' : 'var(--night-faint)' }} />
      </button>

      {open && (
        <FloatingList ref={listRef} anchorRef={rootRef} minWidth={dense ? 200 : 0} id={id} role="listbox" tabIndex={-1} style={light ? { background: '#faf8f5', borderColor: 'rgba(50,30,30,0.18)', boxShadow: '0 12px 32px rgba(50,30,30,0.15)' } : undefined}>
          {items.map((o, i) => {
            const isSel = i === selectedIndex;
            const isHi = i === highlight;
            return (
              <li key={String(o.value)} role="option" aria-selected={isSel}
                onMouseEnter={() => setHighlight(i)} onMouseDown={e => e.preventDefault()} onClick={() => choose(i)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-colors duration-150"
                style={{
                  background: isHi ? 'rgba(229,72,79,0.14)' : 'transparent',
                  color: light ? (isSel ? '#8e1c24' : '#39302e') : isSel ? '#fff2f0' : isHi ? 'var(--night-text)' : 'var(--night-muted)',
                  fontWeight: isSel ? 700 : 500,
                }}>
                <span className="w-4 shrink-0 flex justify-center" style={{ color: light ? '#8e1c24' : '#f58b90' }}>{isSel && <Check size={14} strokeWidth={2.6} />}</span>
                <span className="truncate">{o.label}</span>
              </li>
            );
          })}
        </FloatingList>
      )}
    </div>
  );
}
