const CONFIGS = {
  submitted: { label: 'Soumis',   accent: '#3b82f6' },
  assigned:  { label: 'En cours', accent: '#f59e0b' },
  completed: { label: 'Traité',   accent: '#10b981' },
  npc:       { label: 'PNJ',      accent: '#71717a' },
};

export default function StatusBadge({ status }) {
  const c = CONFIGS[status] || CONFIGS.submitted;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] leading-none"
      style={{ color: c.accent + 'cc' }}
    >
      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: c.accent }} />
      {c.label}
    </span>
  );
}