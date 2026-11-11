import { useEffect, useMemo, useState } from 'react';
import { Shield, Skull, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import ThemedSelect from '../ui/ThemedSelect';
import NetworkInput from '../ui/NetworkInput';
import LevelLabel, { levelText } from '../ui/LevelLabel';
import SubmitButton from '../ui/SubmitButton';
import { ACTIONS_CIBLEES, INFLUENCE_SPECIALIZATIONS } from '../../constants';
import { globalActionChoices, npcInfluence } from '../../utils/npcInfluences';
import { ObstructionFields } from './ObstructionCells';
import { missingObstructionActivity } from '../../utils/obstruction';

const EMPTY = {
  who: 'pnj', antagonistId: '', name: '', category: 'gotha', level: 1, actionType: 'globale',
  actionName: '', specialization: '', network: '', actionsSpent: 1, description: '', assignedTo: '',
};

// Fenêtre guidée pour qu'un conteur ajoute une action d'influence (PNJ ou entité libre).
// Elle préremplit depuis la fiche du PNJ et ne propose que les actions accessibles.
export default function AddInfluenceModal({ antagonists = [], storytellers = [], networks = [], month, onAddToCatalog, onSubmit, onClose, initialAntagonistId = '' }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const [form, setForm] = useState({ ...EMPTY, antagonistId: initialAntagonistId });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const pnjs = useMemo(() => [...antagonists].filter(a => (a.status || 'actif') !== 'mort')
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')), [antagonists]);
  const antag = form.who === 'pnj' ? antagonists.find(a => a.id === form.antagonistId) : null;
  const sheet = npcInfluence(antag, form.category);

  // Nouveau PNJ choisi : on se place sur une catégorie où il a de l'influence.
  useEffect(() => {
    if (!antag) return;
    const has = (cat) => npcInfluence(antag, cat).level;
    if (!has(form.category) && has(form.category === 'gotha' ? 'pegre' : 'gotha')) set({ category: form.category === 'gotha' ? 'pegre' : 'gotha', actionName: '' });
  }, [form.antagonistId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le PNJ ou la catégorie change : on reprend son niveau, son conteur et sa première spécialité.
  useEffect(() => {
    if (!antag) return;
    const first = sheet.specs[0];
    set({
      level: sheet.level || 1,
      assignedTo: antag.assignedTo || '',
      specialization: first?.spec || '',
      network: first?.network || '',
    });
  }, [form.antagonistId, form.category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isGotha = form.category === 'gotha';
  const accent = isGotha ? (light ? '#975012' : '#ec9440') : (light ? '#665088' : '#a995d8');
  const red = light ? '#a5222a' : '#e5484f';
  const actionOptions = form.actionType === 'ciblée'
    ? ACTIONS_CIBLEES.map(a => ({ value: a, label: a }))
    : globalActionChoices(form.category, form.level).map(a => ({
      value: a.name, text: levelText(a.level, a.name),
      label: <LevelLabel level={a.level} name={a.name} color={accent} reach={a.reach} />,
    }));
  const specOptions = [
    { value: '', label: 'Aucune' },
    ...sheet.specs.map(s => ({ value: s.spec, label: `${s.spec} · fiche du PNJ` })),
    ...INFLUENCE_SPECIALIZATIONS.filter(s => !sheet.specs.some(m => m.spec === s)),
  ];
  const valid = (form.who === 'pnj' ? Boolean(antag) : form.name.trim()) && form.actionName && !missingObstructionActivity(form);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try { await onSubmit({ form, antag }); onClose(); }
    catch { setError('Ajout impossible. Vos choix sont conservés, réessayez.'); }
    finally { setSaving(false); }
  };

  const label = (text) => <span className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: theme.textSecondary }}>{text}</span>;
  const box = { background: light ? '#faf8f5' : 'var(--night-input)', border: `1px solid ${theme.borderStrong}`, color: theme.textPrimary };
  const toggle = (field, value, text, color, Icon) => (
    <button type="button" aria-pressed={form[field] === value} onClick={() => set({ [field]: value, ...(field === 'actionType' || field === 'category' ? { actionName: '' } : {}) })}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.14em] transition-colors"
      style={{ color: form[field] === value ? color : theme.textSecondary, background: form[field] === value ? `${color}14` : 'transparent', border: `1px solid ${form[field] === value ? `${color}66` : theme.border}` }}>
      {Icon && <Icon size={13} />} {text}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Nouvelle influence"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: light ? '#faf8f5' : 'var(--night-panel)', border: `1px solid ${accent}33`, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <header className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>{month}</div>
            <h3 className="font-serif text-[24px] italic font-bold" style={{ color: theme.textPrimary }}>Nouvelle influence</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg" style={{ color: theme.textSecondary }}><X size={16} /></button>
        </header>

        <div className="px-5 sm:px-7 py-5 space-y-5">
          <fieldset className="space-y-2">
            <legend>{label('Qui agit')}</legend>
            <div className="flex gap-2">
              {toggle('who', 'pnj', 'Un PNJ', red)}
              {toggle('who', 'libre', 'Mouvement humain / autre', red)}
            </div>
            {form.who === 'pnj' ? (
              pnjs.length
                ? <ThemedSelect light={light} value={form.antagonistId} ariaLabel="PNJ" placeholder="Choisir un PNJ…" onChange={v => set({ antagonistId: v })}
                    options={pnjs.map(a => ({ value: a.id, text: a.name, label: <span><span className="font-serif">{a.name}</span>{a.sect ? <span className="ml-2 text-[11px] opacity-60">{a.sect}</span> : null}</span> }))} />
                : <p className="text-[13px]" style={{ color: theme.textSecondary }}>Aucun PNJ : créez-le dans l’onglet PNJ, ou choisissez « Mouvement humain / autre ».</p>
            ) : (
              <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Ex. Syndicat des dockers, Collectif de riverains, Entité inconnue…" aria-label="Nom de l'entité"
                className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none placeholder:opacity-50" style={box} />
            )}
          </fieldset>

          <div className="grid sm:grid-cols-[1fr_auto] gap-4">
            <div>
              {label('Catégorie')}
              <div className="flex gap-2">
                {toggle('category', 'gotha', antag && npcInfluence(antag, 'gotha').level ? `Gotha · ${npcInfluence(antag, 'gotha').level}` : 'Gotha', light ? '#975012' : '#ec9440', Shield)}
                {toggle('category', 'pegre', antag && npcInfluence(antag, 'pegre').level ? `Pègre · ${npcInfluence(antag, 'pegre').level}` : 'Pègre', light ? '#665088' : '#a995d8', Skull)}
              </div>
            </div>
            <label className="block">
              {label(sheet.level ? `Niveau (fiche : ${sheet.level})` : 'Niveau')}
              <input type="number" min={1} max={10} value={form.level} onChange={e => set({ level: e.target.value, actionName: '' })}
                className="w-24 rounded-xl px-3 py-2.5 text-[14px] font-bold text-center outline-none" style={box} />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {label('Type')}
              <div className="flex gap-2">
                {toggle('actionType', 'globale', 'Globale', light ? '#276344' : '#9fd8b8')}
                {toggle('actionType', 'ciblée', 'Ciblée', light ? '#245b9f' : '#5fa0f2')}
              </div>
            </div>
            <div>
              {label(form.actionType === 'ciblée' ? 'Action ciblée' : 'Action globale')}
              <ThemedSelect light={light} value={form.actionName} ariaLabel="Action" placeholder="Choisir…" color={accent} onChange={v => set({ actionName: v })} options={actionOptions} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {label('Spécialité')}
              <ThemedSelect light={light} value={form.specialization} ariaLabel="Spécialité"
                onChange={v => set({ specialization: v, network: sheet.specs.find(s => s.spec === v)?.network || form.network })} options={specOptions} />
            </div>
            <div>
              {label('Réseau (catalogue ou libre)')}
              <div className="rounded-xl px-3.5 py-2.5" style={box}>
                <NetworkInput value={form.network} onChange={v => set({ network: v })} networks={networks} category={form.category}
                  specialization={form.specialization} onAddToCatalog={onAddToCatalog && (name => onAddToCatalog({ category: form.category, specialization: form.specialization, name }))}
                  color={accent} textColor={theme.textPrimary} />
              </div>
            </div>
          </div>

          {form.actionType === 'ciblée' && form.actionName === 'Obstruction' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(95,160,242,0.05)', border: '1px solid rgba(95,160,242,0.22)' }}>
              <p className="text-[12.5px]" style={{ color: theme.textSecondary }}>Gêne tous les autres personnages qui tentent cette activité via la catégorie obstruée, pendant ce cycle : chaque action dépensée leur coûte une action de plus.</p>
              <ObstructionFields value={form} onChange={patch => set(patch)} light={light} box={box}
                Label={({ children }) => label(children)} />
            </div>
          )}

          <div className="grid sm:grid-cols-[auto_1fr] gap-4">
            <label className="block">
              {label('Actions dépensées')}
              <input type="number" min={1} value={form.actionsSpent} onChange={e => set({ actionsSpent: e.target.value })}
                className="w-24 rounded-xl px-3 py-2.5 text-[14px] font-bold text-center outline-none" style={box} />
            </label>
            <div>
              {label('Conteur')}
              <ThemedSelect light={light} value={form.assignedTo} ariaLabel="Conteur" onChange={v => set({ assignedTo: v })}
                options={[{ value: '', label: 'Libre' }, ...storytellers.map(st => ({ value: st.id, label: st.pseudo }))]} />
            </div>
          </div>

          <label className="block">
            {label('Description')}
            <textarea value={form.description} onChange={e => set({ description: e.target.value })} rows={3} placeholder="Ce que fait l’influence, qui elle vise…"
              className="w-full rounded-xl px-3.5 py-3 font-serif text-[15px] leading-relaxed outline-none resize-y placeholder:opacity-50" style={box} />
          </label>

          {error && <p role="alert" className="text-[13px]" style={{ color: red }}>{error}</p>}
          <SubmitButton saving={saving} disabled={!valid} light={light}>Ajouter l’influence</SubmitButton>
        </div>
      </form>
    </div>
  );
}
