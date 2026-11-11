import { useMemo, useRef, useState } from 'react';
import { Gauge, X } from 'lucide-react';
import FloatingList from './FloatingList';
import { Dots } from './ScoreField';
import { SCORE_SUGGESTIONS } from '../../constants';
import { scoreLabel } from '../../utils/sheet';

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const COLOR = '#5fa0f2';

// « Score utilisé » d'une AIP : recherche au clavier parmi les scores du profil
// (avec leurs points), puis les compétences connues ; un texte libre reste possible.
export default function ScoreUsedInput({ value, onChange, scores = [] }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const options = useMemo(() => {
    const q = norm(value);
    const mine = scores.filter(s => s.name && (!q || norm(scoreLabel(s)).includes(q) || norm(s.name).includes(q)))
      .map(s => ({ key: `p:${s.name}`, value: scoreLabel(s), name: s.name, dots: s.value, group: 'Mon profil' }));
    const known = Object.entries(SCORE_SUGGESTIONS).flatMap(([group, names]) => names
      .filter(n => q && norm(n).includes(q) && !scores.some(s => norm(s.name) === norm(n)))
      .map(n => ({ key: `s:${n}`, value: n, name: n, group })));
    return [...mine, ...known].filter(o => norm(o.value) !== q).slice(0, 8);
  }, [value, scores]);

  const pick = (o) => { onChange(o.value); setOpen(false); inputRef.current?.blur(); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(options.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && options[highlight]) pick(options[highlight]); else setOpen(false); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative flex items-center h-11 rounded-xl transition-[border-color,box-shadow] duration-200"
      style={{ background: 'var(--night-input)', border: `1px solid ${open ? 'rgba(95,160,242,0.5)' : 'var(--night-line-strong)'}`, boxShadow: open ? '0 0 0 3px rgba(95,160,242,0.1)' : 'none' }}>
      <Gauge size={14} className="ml-3.5 shrink-0" style={{ color: COLOR }} />
      <input ref={inputRef} value={value || ''} role="combobox" aria-expanded={open} aria-autocomplete="list"
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => { setOpen(true); setHighlight(0); }} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown}
        placeholder={scores.length ? 'Chercher un de tes scores, ou taper librement' : 'Ex. Investigation 3'}
        className="flex-1 min-w-0 h-full bg-transparent outline-none px-2.5 text-[13.5px] text-zinc-200 placeholder:text-zinc-500" />
      {value && (
        <button type="button" onClick={() => { onChange(''); inputRef.current?.focus(); }} aria-label="Effacer le score"
          className="w-7 h-7 mr-2 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5"><X size={13} /></button>
      )}
      {open && options.length > 0 && (
        <FloatingList anchorRef={boxRef} role="listbox">
          {options.map((o, i) => (
            <li key={o.key} role="option" aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-colors"
              style={{ background: i === highlight ? 'rgba(95,160,242,0.14)' : 'transparent', color: i === highlight ? 'var(--night-text)' : 'var(--night-muted)' }}>
              <span className="font-bold truncate">{o.name}</span>
              {o.dots !== undefined && <Dots value={o.dots} size={7} color={COLOR} />}
              <span className="ml-auto text-[10px] uppercase tracking-[0.12em] shrink-0" style={{ color: o.dots !== undefined ? '#9cc3f5' : 'var(--night-faint)' }}>{o.group}</span>
            </li>
          ))}
        </FloatingList>
      )}
    </div>
  );
}
