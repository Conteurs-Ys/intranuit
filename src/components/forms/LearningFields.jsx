import { useId } from 'react';
import ThemedSelect from '../ui/ThemedSelect';
import { LEARNING_TYPES } from '../../utils/learnings';

export default function LearningFields({ value = {}, onChange, directory = [], disabled = false }) {
  const listId = useId();
  const set = (key, val) => onChange({ ...value, [key]: val });
  const style = { background: 'var(--night-input)', border: '1px solid var(--night-line-strong)', color: 'var(--night-text)' };
  const input = (key, title, extra = {}) => <label className="block space-y-1.5 text-[12px] text-zinc-300">{title}<input
    aria-label={title} value={value[key] ?? ''} onChange={e => set(key, e.target.value)}
    className="block w-full rounded-xl px-3 py-2.5 outline-none" style={style} {...extra} /></label>;
  return <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-3 disabled:opacity-60">
    <label className="block space-y-1.5 text-[12px] text-zinc-300">Nature
      <ThemedSelect ariaLabel="Nature de l’apprentissage" value={value.type || 'Discipline'} options={LEARNING_TYPES} onChange={v => { if (!disabled) set('type', v); }} />
    </label>
    {input('action', 'Intitulé de la progression', { required: true, placeholder: 'Domination, Investigation, Force…' })}
    {input('currentLevel', 'Niveau actuel', { type: 'number', min: 0, step: 1 })}
    <label className="block space-y-1.5 text-[12px] text-zinc-300">Niveau visé (si applicable)<input aria-label="Niveau visé" type="number" min="1" step="1"
      value={value.levels?.[0] ?? ''} onChange={e => set('levels', e.target.value ? [Number(e.target.value)] : [])}
      className="block w-full rounded-xl px-3 py-2.5 outline-none" style={style} /></label>
    <div className="sm:col-span-2">{input('mentor', 'Mentor', { list: listId, placeholder: 'Nom du personnage ou Sans mentor' })}
      <datalist id={listId}>{directory.map(d => <option key={d.id} value={d.name} />)}<option value="Sans mentor" /></datalist></div>
  </fieldset>;
}
