import { useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import FloatingList from './FloatingList';
import { SCORE_SUGGESTIONS } from '../../constants';

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Points façon fiche de personnage : cliquer le n-ième point met le score à n,
// recliquer sur le point courant redescend d'un cran.
export function Dots({ value = 0, onChange, max = 5, color = '#5fa0f2', size = 11, label }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="inline-flex items-center gap-1" role={onChange ? 'radiogroup' : undefined} aria-label={label}
      onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = n <= shown;
        const dot = (
          <span className="block rounded-full transition-all duration-200"
            style={{
              width: size, height: size,
              background: filled ? color : 'transparent',
              border: `1.5px solid ${filled ? color : color + '66'}`,
              boxShadow: filled && n <= value ? `0 0 6px ${color}80` : 'none',
              transform: hover === n ? 'scale(1.2)' : 'none',
            }} />
        );
        if (!onChange) return <span key={n}>{dot}</span>;
        return (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`}
            onMouseEnter={() => setHover(n)} onClick={() => onChange(value === n ? n - 1 : n)}
            className="p-0.5 rounded-full outline-none focus-visible:ring-1 focus-visible:ring-blue-400/60">
            {dot}
          </button>
        );
      })}
    </span>
  );
}

// Un score du profil : nom (avec suggestions) et points.
export default function ScoreField({ score, onChange, onRemove, color = '#5fa0f2', taken = [] }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  const suggestions = useMemo(() => {
    const q = norm(score.name.trim());
    return Object.entries(SCORE_SUGGESTIONS).flatMap(([group, names]) =>
      names.filter(n => (!q || norm(n).includes(q)) && norm(n) !== q && !taken.some(t => norm(t) === norm(n)))
        .map(n => ({ group, name: n })))
      .slice(0, 8);
  }, [score.name, taken]);

  const pick = (name) => { onChange({ ...score, name }); setOpen(false); };
  const onKeyDown = (e) => {
    if (!open || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(suggestions.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(suggestions[highlight].name); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="group flex items-center gap-3 pl-3.5 pr-1.5 py-1.5 rounded-xl transition-colors animate-in fade-in duration-200 focus-within:border-blue-400/40"
      style={{ background: 'var(--night-input)', border: '1px solid var(--night-line-strong)' }}>
      <div ref={boxRef} className="relative flex-1 min-w-0">
        <input value={score.name} placeholder="Compétence, historique, discipline…"
          onChange={e => { onChange({ ...score, name: e.target.value }); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown}
          className="w-full h-9 bg-transparent outline-none text-[14px] font-serif italic text-zinc-100 placeholder:text-zinc-500 placeholder:not-italic placeholder:font-sans placeholder:text-[13px]" />
        {open && suggestions.length > 0 && (
          <FloatingList anchorRef={boxRef} minWidth={240} role="listbox">
            {suggestions.map((s, i) => (
              <li key={s.name} role="option" aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(s.name)}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-colors"
                style={{ background: i === highlight ? `${color}22` : 'transparent', color: i === highlight ? 'var(--night-text)' : 'var(--night-muted)' }}>
                <span className="font-bold truncate">{s.name}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] shrink-0" style={{ color: 'var(--night-faint)' }}>{s.group}</span>
              </li>
            ))}
          </FloatingList>
        )}
      </div>
      <Dots value={score.value} onChange={value => onChange({ ...score, value })} color={color} label={`Score ${score.name}`} />
      <button type="button" onClick={onRemove} aria-label="Retirer ce score"
        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
