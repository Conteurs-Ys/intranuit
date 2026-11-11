import { dossierState } from '../../utils/dossierState';

// Pastille d'état d'un dossier : « À déposer », « Modifiable », « Réponse disponible »…
export default function StatePill({ dossier, state = dossierState(dossier), className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] leading-none whitespace-nowrap ${className}`}
      style={{ color: state.color, background: state.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: state.color, boxShadow: `0 0 6px ${state.color}` }} />
      {state.label}
    </span>
  );
}
