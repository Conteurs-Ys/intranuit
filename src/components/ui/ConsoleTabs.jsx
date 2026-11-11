import { useTheme } from '../../context/ThemeContext';
import { useLayoutEffect, useRef, useState } from 'react';

// Même repère glissant que dans les dossiers joueur, sans modifier les vues.
// `itemWidth` : largeur minimale d'un onglet, pour aligner une sous-barre sur la barre du dessus.
// `variant="underline"` : sous-onglets légers (texte et icône, trait rouge qui glisse), pour ne pas
// empiler deux barres encadrées identiques. Une option peut porter une `icon` (lucide).
// `compact` : barre encadrée à la largeur de son contenu, pour tenir sur la ligne d'un titre.
export default function ConsoleTabs({ value, onChange, options, label, itemWidth = '0', variant = 'box', compact = false, scrollable = false }) {
  const { theme } = useTheme();
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 4, width: 0 });
  const activeIndex = options.findIndex(o => o.value === value);
  const red = theme.name === 'light' ? '#a5222a' : '#e5484f';
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !scrollable) return;
    const selected = list.querySelector('[aria-pressed="true"]');
    if (!selected) return;
    const update = () => {
      setIndicator({ left: selected.offsetLeft, width: selected.offsetWidth });
      const viewport = list.parentElement;
      const item = selected.getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      if (item.left < bounds.left) viewport.scrollLeft -= bounds.left - item.left + 4;
      else if (item.right > bounds.right) viewport.scrollLeft += item.right - bounds.right + 4;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    observer.observe(selected);
    return () => observer.disconnect();
  }, [value, variant, scrollable, options.map(o => o.label).join('|')]);
  if (variant === 'underline') {
    return (
      // Largeur visée = n × itemWidth, sans jamais dépasser l'écran (téléphone).
      <div role="group" aria-label={label} className="relative grid"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, width: `min(100%, calc(${options.length} * ${itemWidth === '0' ? '9rem' : itemWidth}))`, borderBottom: `1px solid ${theme.border}` }}>
        <span aria-hidden="true" className="absolute -bottom-px h-[2px] rounded-full transition-transform duration-300"
          style={{ left: 0, width: `calc(100% / ${options.length})`, transform: `translateX(${activeIndex * 100}%)`, background: red, transitionTimingFunction: 'cubic-bezier(0.22, 0.8, 0.24, 1)' }} />
        {options.map(o => {
          const active = value === o.value;
          const Icon = o.icon;
          return (
            <button key={o.value} type="button" aria-pressed={active} onClick={() => onChange(o.value)}
              className="relative min-w-0 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 pt-1.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-300"
              style={{ color: active ? (theme.name === 'light' ? theme.textPrimary : '#ece4e0') : theme.textSecondary }}>
              {Icon && <Icon size={13} style={{ color: active ? red : 'currentColor' }} />}
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  const tabs = (
    <div ref={listRef} role="group" aria-label={label} className={`relative rounded-xl p-1 ${scrollable ? 'flex w-max min-w-full' : `grid ${compact ? 'w-auto shrink-0' : 'w-full sm:w-auto'}`}`}
      style={{ ...(!scrollable ? { gridTemplateColumns: `repeat(${options.length}, minmax(${itemWidth}, 1fr))` } : {}), background: theme.tabBg, border: `1px solid ${theme.tabBorder}` }}>
      <span aria-hidden="true" className={`absolute top-1 bottom-1 rounded-lg duration-300 ${scrollable ? 'transition-[left,width]' : 'transition-transform'}`}
        style={{ ...(scrollable ? { left: indicator.left, width: indicator.width } : { left: 4, width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${activeIndex * 100}%)` }), background: 'rgba(229,72,79,0.1)', borderBottom: '2px solid #e5484f' }} />
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={`relative ${scrollable ? 'flex-1 shrink-0 whitespace-nowrap rounded-lg' : 'min-w-0'} ${compact ? 'px-2.5 sm:px-3.5 py-2' : scrollable ? 'px-3 sm:px-4 py-2.5' : 'px-2 sm:px-4 py-2.5'} text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-300`}
          style={{ ...(scrollable ? { minWidth: 'max-content', flexBasis: itemWidth } : {}), color: value === o.value ? red : theme.textSecondary }}>
          {o.label}
        </button>
      ))}
    </div>
  );
  return scrollable ? <div className="min-w-0 max-w-full w-full sm:w-auto overflow-x-auto">{tabs}</div> : tabs;
}
