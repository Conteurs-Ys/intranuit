import { useMemo, useState } from 'react';
import { Network, Plus, Search, Shield, Skull, Sparkles, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDialogs } from '../../context/DialogContext';
import useInfluenceNetworks from '../../hooks/useInfluenceNetworks';
import { examplesToAdd, groupNetworks } from '../../utils/influenceNetworks';

// Couleurs de catégorie, alignées sur la palette joueur (Gotha orange, Pègre lavande).
function categoryStyle(category, light) {
  return category === 'gotha'
    ? { label: 'Gotha', color: light ? '#975012' : '#ec9440', Icon: Shield }
    : { label: 'Pègre', color: light ? '#665088' : '#a995d8', Icon: Skull };
}

function NetworkLine({ network, color, onRename, onNotes, onRemove }) {
  const { theme } = useTheme();
  return (
    <li className="group/net flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors" style={{ background: theme.bgCard }}>
      <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <textarea rows={1} defaultValue={network.name} aria-label="Nom du réseau"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
          onBlur={e => { const v = e.target.value.trim(); if (v && v !== network.name) onRename(v); else e.target.value = network.name; }}
          className="w-full bg-transparent outline-none resize-none font-serif text-[14.5px] leading-snug"
          style={{ color: theme.textPrimary, fieldSizing: 'content' }} />
        <input defaultValue={network.notes || ''} placeholder="Précisions locales…" aria-label="Précisions sur le réseau"
          onBlur={e => { if (e.target.value !== (network.notes || '')) onNotes(e.target.value); }}
          className="w-full bg-transparent outline-none text-[12px] mt-0.5 placeholder:opacity-60" style={{ color: theme.textSecondary }} />
      </div>
      <button type="button" onClick={onRemove} title="Retirer ce réseau" aria-label={`Retirer ${network.name}`}
        className="p-1 rounded-md opacity-40 group-hover/net:opacity-100 focus-visible:opacity-100 transition-opacity hover:text-red-500" style={{ color: theme.textSecondary }}>
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function AddLine({ color, onAdd }) {
  const { theme } = useTheme();
  const [value, setValue] = useState('');
  const submit = e => { e.preventDefault(); const v = value.trim(); if (!v) return; onAdd(v); setValue(''); };
  return (
    <form onSubmit={submit} className="flex items-center gap-2 mt-1.5">
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="Ajouter une institution…" aria-label="Nouvelle institution"
        className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-[13px] outline-none placeholder:opacity-60"
        style={{ background: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.border}` }} />
      <button type="submit" disabled={!value.trim()} aria-label="Ajouter" className="p-1.5 rounded-lg transition-opacity disabled:opacity-30"
        style={{ color, border: `1px solid ${color}44` }}><Plus size={13} /></button>
    </form>
  );
}

// `inWindow` : affiché dans une demi-fenêtre (Supervision), une seule colonne de spécialités.
export default function NetworkCatalog({ inWindow = false }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const { confirmAction, showNotice } = useDialogs();
  const { networks, loaded, addNetwork, addNetworks, updateNetwork, removeNetwork } = useInfluenceNetworks();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState(false);

  const missingExamples = useMemo(() => examplesToAdd(networks), [networks]);
  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    const match = n => !q || [n.name, n.notes, n.specialization].some(v => (v || '').toLocaleLowerCase('fr').includes(q));
    return groupNetworks(networks.filter(match))
      .filter(g => !q || g.count > 0 || g.specialization.toLocaleLowerCase('fr').includes(q));
  }, [networks, query]);
  const shownCategories = category === 'all' ? ['gotha', 'pegre'] : [category];
  const red = light ? '#a5222a' : '#e5484f';

  const loadExamples = async () => {
    if (busy || !missingExamples.length) return;
    if (!await confirmAction({ title: 'Charger des exemples', message: `Ajouter ${missingExamples.length} institutions génériques (deux par spécialité et par catégorie) ? Vous pourrez les renommer pour votre ville ou les retirer.` })) return;
    setBusy(true);
    try { await addNetworks(missingExamples); }
    catch { showNotice('Les exemples n’ont pas été ajoutés. Réessayez.', 'Ajout impossible'); }
    finally { setBusy(false); }
  };

  const remove = async n => {
    if (await confirmAction({ title: 'Retirer le réseau', message: `Retirer « ${n.name} » du catalogue ? Les actions qui le citent gardent ce nom.`, danger: true })) await removeNetwork(n.id);
  };

  const pill = (value, label, color) => (
    <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}
      className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] border transition-colors"
      style={{ color: category === value ? color : theme.textSecondary, borderColor: category === value ? `${color}66` : theme.border, background: category === value ? `${color}12` : 'transparent' }}>
      {label}
    </button>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2.5 font-serif text-[22px] italic font-bold" style={{ color: theme.textPrimary }}>
            <Network size={19} style={{ color: red }} /> Réseaux d’influence
          </h3>
          <p className="mt-1 text-[13px] max-w-2xl" style={{ color: theme.textSecondary }}>
            Les institutions mortelles de la ville, par spécialité. Le joueur choisit sa spécialité ; vous rattachez ici le réseau précis.
            Réservé aux conteurs.
          </p>
        </div>
        {missingExamples.length > 0 && (
          <button type="button" onClick={loadExamples} disabled={busy}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-50"
            style={{ color: red, border: `1px solid ${red}55`, background: 'rgba(229,72,79,0.06)' }}>
            <Sparkles size={13} /> Charger des exemples ({missingExamples.length})
          </button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <label className="flex items-center gap-2 flex-1 min-w-[200px] rounded-lg px-3 py-2" style={{ background: theme.bgInput, border: `1px solid ${theme.border}` }}>
          <Search size={14} style={{ color: theme.textSecondary }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Chercher une institution, une spécialité…" aria-label="Chercher dans le catalogue"
            className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:opacity-60" style={{ color: theme.textPrimary }} />
        </label>
        <div className="flex gap-1.5">
          {pill('all', 'Tout', red)}
          {pill('gotha', 'Gotha', categoryStyle('gotha', light).color)}
          {pill('pegre', 'Pègre', categoryStyle('pegre', light).color)}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] ml-auto" style={{ color: theme.textSecondary }}>
          {networks.length} réseau{networks.length > 1 ? 'x' : ''}
        </span>
      </div>

      {loaded && networks.length === 0 && (
        <p className="rounded-2xl border border-dashed py-10 px-6 text-center font-serif italic text-[15px]" style={{ borderColor: theme.border, color: theme.textSecondary }}>
          Le catalogue est vide. Chargez des exemples pour démarrer, puis adaptez-les à votre ville.
        </p>
      )}

      <div className={`grid gap-3 ${inWindow ? '' : 'lg:grid-cols-2'}`}>
        {groups.map(g => (
          <section key={g.specialization} className="rounded-2xl p-4" style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}` }}>
            <h4 className="flex items-baseline justify-between gap-2 mb-3">
              <span className="font-serif italic font-bold text-[17px]" style={{ color: theme.textPrimary }}>{g.specialization}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{g.count || 'aucun'}</span>
            </h4>
            <div className={`grid gap-3 ${shownCategories.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {shownCategories.map(cat => {
                const { label, color, Icon } = categoryStyle(cat, light);
                return (
                  <div key={cat} className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
                      <Icon size={12} /> {label}
                    </div>
                    <ul className="space-y-1">
                      {g[cat].map(n => (
                        <NetworkLine key={n.id} network={n} color={color}
                          onRename={name => updateNetwork(n.id, { name })}
                          onNotes={notes => updateNetwork(n.id, { notes })}
                          onRemove={() => remove(n)} />
                      ))}
                    </ul>
                    <AddLine color={color} onAdd={name => addNetwork({ category: cat, specialization: g.specialization, name })} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
