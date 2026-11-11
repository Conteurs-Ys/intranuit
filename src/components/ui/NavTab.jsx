// Onglet de la barre de navigation : libellé en petites capitales, souligné rouge quand il est actif.
export default function NavTab({ active, onClick, icon, label, light }) {
  const idle = light ? 'text-stone-500 hover:text-stone-900' : 'text-zinc-400 hover:text-zinc-100';
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`group relative flex shrink-0 items-center gap-2 h-full min-h-[60px] px-1 outline-none focus-visible:text-white text-[11px] font-bold uppercase tracking-[0.1em] lg:tracking-[0.16em] whitespace-nowrap transition-colors duration-300 ${active ? (light ? 'text-red-800' : 'text-[#f58b90]') : idle}`}>
      <span className={`hidden lg:inline transition-transform duration-300 ${active ? '' : 'group-hover:-translate-y-px'}`}>{icon}</span>
      {label}
      <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full origin-center transition-transform duration-500"
        style={{
          transform: active ? 'scaleX(1)' : 'scaleX(0)',
          background: 'linear-gradient(90deg, transparent, #e5484f 20%, #e5484f 80%, transparent)',
          boxShadow: active ? '0 0 12px rgba(229,72,79,0.6)' : 'none',
          transitionTimingFunction: 'cubic-bezier(0.22, 0.8, 0.24, 1)',
        }} />
    </button>
  );
}
