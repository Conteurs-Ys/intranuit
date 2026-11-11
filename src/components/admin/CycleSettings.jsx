import { CalendarClock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useDialogs } from '../../context/DialogContext';
import ThemedSelect from '../ui/ThemedSelect';
import { cycleStep, isCycleOpen, nextCycle, upcomingCycles } from '../../utils/cycle';

// Régence › Réglages : cycle ouvert ou en pause, rythme (tous les 1 ou 2 mois), date limite, mois du cycle.
export default function CycleSettings({ appId, cycle }) {
  const { theme } = useTheme();
  const { confirmAction } = useDialogs();
  const light = theme.name === 'light';
  const color = light ? '#a5222a' : '#e5484f';
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'game_state', 'cycle');
  const save = (fields) => updateDoc(ref, fields).catch(e => console.error(e));
  const open = isCycleOpen(cycle);
  const step = cycleStep(cycle);
  const chip = (on) => ({ color: on ? color : theme.textSecondary, background: on ? `${color}14` : 'transparent', border: `1px solid ${on ? color + '66' : theme.border}` });
  const label = 'block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5';
  const changeMonth = async (value) => {
    const target = upcomingCycles(cycle).find(c => c.label === value);
    if (!target || !await confirmAction({
      title: 'Changer le cycle',
      message: `Passer directement à ${target.label} ? Les dossiers de ${cycle.label} ne sont pas diffusés par ce changement.`,
      confirmLabel: 'Changer',
    })) return;
    save({ ...target, open: true, deadline: null });
  };
  return (
    <section className="rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}` }}>
      <h3 className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, border: `1px solid ${color}40`, color }}><CalendarClock size={14} /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>Cycle · {cycle.label}</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <span className={label} style={{ color: theme.textSecondary }}>Ce cycle</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={open} onClick={() => save({ open: true })} className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.1em]" style={chip(open)}>Ouvert</button>
            <button type="button" aria-pressed={!open} onClick={() => save({ open: false })} className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.1em]" style={chip(!open)}>Pas de cycle</button>
          </div>
          <span className="block mt-1.5 text-[12px]" style={{ color: theme.textMuted }}>{open ? 'Les joueurs déposent leurs actions.' : 'Les joueurs voient « Pas d’actions ce cycle » et ne déposent rien.'}</span>
        </div>
        <div>
          <span className={label} style={{ color: theme.textSecondary }}>Rythme</span>
          <div className="flex flex-wrap gap-1.5">
            {[[1, 'Tous les mois'], [2, 'Tous les deux mois']].map(([v, text]) => (
              <button key={v} type="button" aria-pressed={step === v} onClick={() => save({ step: v })} className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.1em]" style={chip(step === v)}>{text}</button>
            ))}
          </div>
          <span className="block mt-1.5 text-[12px]" style={{ color: theme.textMuted }}>À la diffusion : passage à {nextCycle(cycle).label}.</span>
        </div>
        <label className="block">
          <span className={label} style={{ color: theme.textSecondary }}>Date limite (facultative)</span>
          <input type="date" value={cycle.deadline || ''} onChange={e => save({ deadline: e.target.value || null })}
            className="w-full min-w-0 rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }} />
          <span className="block mt-1.5 text-[12px]" style={{ color: theme.textMuted }}>Affichée aux joueurs ; le verrouillage reste manuel.</span>
        </label>
        <div>
          <span className={label} style={{ color: theme.textSecondary }}>Changer de mois</span>
          <ThemedSelect light={light} value="" placeholder="Choisir un mois…" ariaLabel="Changer le mois du cycle"
            options={upcomingCycles(cycle).map(c => c.label)} onChange={changeMonth} />
          <span className="block mt-1.5 text-[12px]" style={{ color: theme.textMuted }}>Pour sauter des mois (l'été) sans attendre la diffusion.</span>
        </div>
      </div>
    </section>
  );
}
