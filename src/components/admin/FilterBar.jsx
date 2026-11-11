import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Filter } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import FloatingList from '../ui/FloatingList';

function MultiSelect({ label, options, selected, onChange, accentColor = '#ef4444', exclusive = false }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val) => {
    if (exclusive) onChange(selected.includes(val) ? [] : [val]);
    else onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const hasActive = selected.length > 0;
  const isLight = theme.name === 'light';

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] transition-all whitespace-nowrap"
        style={{
          background: hasActive ? accentColor + '18' : theme.bgCard,
          border: hasActive ? `1px solid ${accentColor}35` : `1px solid ${theme.border}`,
          color: hasActive ? accentColor : theme.textSecondary,
        }}>
        {label}
        {hasActive && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black"
            style={{ background: accentColor + '20', color: accentColor }}>
            {selected.length}
          </span>
        )}
        <ChevronDown size={10} className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      {open && (
        <FloatingList anchorRef={ref} ref={listRef} minWidth={180}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } }}
          style={{
            background: isLight ? '#ffffff' : 'var(--night-panel-2)',
            border: `1px solid ${theme.border}`,
            boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.12)' : '0 16px 40px rgba(0,0,0,0.8)',
          }}>
          {options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            const count = typeof opt === 'string' ? undefined : opt.count;
            const isActive = selected.includes(val);
            return (
              <li key={val}><button type="button" aria-pressed={isActive} onClick={() => toggle(val)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-[12px] font-bold transition-colors"
                style={{
                  color: isActive ? accentColor : theme.textSecondary,
                  background: 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span>{lbl}</span>
                <span className="flex items-center gap-2 pl-3">
                  {count !== undefined && <span className="tabular-nums text-[11px] font-bold" style={{ color: theme.textMuted }}>{count}</span>}
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? accentColor : 'transparent' }} />
                </span>
              </button></li>
            );
          })}
          {selected.length > 0 && (
            <li><button type="button" onClick={() => onChange([])}
              className="w-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] hover:text-red-500 transition-colors"
              style={{ borderTop: `1px solid ${theme.border}`, color: theme.textSecondary }}>
              Effacer
            </button></li>
          )}
        </FloatingList>
      )}
    </div>
  );
}

function ActiveTag({ label, onRemove, accentColor }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.14em]"
      style={{ background: accentColor + '12', border: `1px solid ${accentColor}25`, color: accentColor }}>
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5 hover:opacity-60 transition-opacity">
        <X size={9} />
      </button>
    </div>
  );
}

export default function FilterBar({ search, onSearch, filterGroups, onClearAll, accentColor = '#ef4444' }) {
  const { theme } = useTheme();
  const hasAnyFilter = search || filterGroups.some(g => g.selected.length > 0);
  const isLight = theme.name === 'light';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={12} style={{ color: theme.textSecondary }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="rounded-lg py-1.5 pl-7 pr-3 text-[12px] outline-none w-44 focus:w-56"
            style={{
              background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.4)',
              border: `1px solid ${theme.border}`,
              color: theme.textPrimary,
              transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), border-color 0.2s',
            }}
            placeholder="Chercher..."
          />
        </div>

        <div className="w-px h-4" style={{ background: theme.border }} />

        {filterGroups.map(g => (
          <MultiSelect key={g.key} label={g.label} options={g.options} selected={g.selected}
            onChange={g.onChange} accentColor={g.accentColor || accentColor} exclusive={g.exclusive} />
        ))}

        {hasAnyFilter && (
          <button type="button" onClick={onClearAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] hover:text-red-500 transition-colors"
            style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}>
            <X size={9} /> Tout effacer
          </button>
        )}
      </div>

      {filterGroups.some(g => g.selected.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={9} style={{ color: theme.textSecondary }} />
          {filterGroups.map(g =>
            g.selected.map(val => {
              const opt = g.options.find(o => (typeof o === 'string' ? o : o.value) === val);
              const lbl = opt ? (typeof opt === 'string' ? opt : opt.label) : val;
              return (
                <ActiveTag key={`${g.key}-${val}`} label={`${g.label}: ${lbl}`}
                  accentColor={g.accentColor || accentColor}
                  onRemove={() => g.onChange(g.selected.filter(v => v !== val))} />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export { MultiSelect, ActiveTag };
