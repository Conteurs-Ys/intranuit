import { useState } from 'react';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { actionReference, obstructionApplies, obstructionActorKey, obstructionTarget } from '../../utils/obstruction';
import { isRumorAction } from '../../utils/rumors';
import { saveObstructionLinks } from '../../utils/saveObstructionLinks';
import ThemedSelect from '../ui/ThemedSelect';

function ActionDescription({ text }) {
  if (!text) return <p className="mt-1 text-xs">Sans description</p>;
  if (text.length <= 240 && text.split('\n').length <= 3) {
    return <p className="mt-1 text-xs whitespace-pre-wrap break-words">{text}</p>;
  }
  return <details className="group mt-1 text-xs">
    <summary className="cursor-pointer list-none">
      <span className="block whitespace-pre-wrap break-words line-clamp-3 group-open:hidden">{text}</span>
      <span className="inline-block mt-1 underline group-open:hidden">Lire la description complète</span>
      <span className="hidden group-open:inline-block underline">Réduire la description</span>
    </summary>
    <p className="mt-2 whitespace-pre-wrap break-words">{text}</p>
  </details>;
}

export default function ObstructionLinks({ source, action, index, dossiers, appId }) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [person, setPerson] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [actionType, setActionType] = useState('');
  const scope = obstructionTarget(action);
  const candidates = dossiers.filter(d => d.monthLabel === source.monthLabel && obstructionActorKey(d) !== obstructionActorKey(source))
    .flatMap(d => (d.actions || []).map((a, i) => ({ d, a, i })))
    .filter(({ a }) => a.actionType === 'globale' && a.category === scope.category && !isRumorAction(a));
  const selectedCount = candidates.filter(({ a, d, i }) => obstructionApplies(action, source, index, a, d, i)).length;
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const displayed = candidates.filter(c => (!linkedOnly || obstructionApplies(action, source, index, c.a, c.d, c.i))
    && (!person || obstructionActorKey(c.d) === person)
    && (!specialty || (c.a.specialization || '__none') === specialty)
    && (!actionType || c.a.actionName === actionType)
    && terms.every(term => normalize([c.d.characterName, c.a.actionName, c.a.specialization || 'Sans spécialité', c.a.influenceName, c.a.description].join(' ')).includes(term)));
  const unlinked = displayed.filter(c => !obstructionApplies(action, source, index, c.a, c.d, c.i));
  const personOptions = [...new Map(candidates.map(c => [obstructionActorKey(c.d), { value: obstructionActorKey(c.d), label: c.d.characterName }])).values()];
  const specialtyOptions = [...new Set(candidates.map(c => c.a.specialization || '__none'))].map(value => ({ value, label: value === '__none' ? 'Sans spécialité' : value }));
  const actionOptions = [...new Set(candidates.map(c => c.a.actionName))].map(value => ({ value, label: value }));
  const save = async (selection, checked) => {
    if (busy || !selection.length) return;
    setBusy(true); setError('');
    try {
      await saveObstructionLinks(db, appId, source, action, index, selection, checked);
    } catch (e) { setError(e.message || 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  return <details className="w-full rounded-lg p-3 space-y-3" style={{ border: `1px solid ${theme.border}` }}>
    <summary className="cursor-pointer font-bold text-xs">Actions concernées · {selectedCount} liée{selectedCount > 1 ? 's' : ''}</summary>
    <p className="text-xs" style={{ color: theme.textSecondary }}>Relie toutes les tentatives qui correspondent à l’activité décrite. Un changement de leur contenu demande une nouvelle confirmation.</p>
    <p className="text-xs" style={{ color: theme.textSecondary }}>Catégorie : {scope.category === 'gotha' ? 'Gotha' : 'Pègre'} · toutes spécialités, selon l’activité visée.</p>
    {candidates.length > 0 && <>
      <input type="search" aria-label="Rechercher une action à relier" placeholder="Personnage, activité, spécialité, réseau…" value={search} onChange={e => setSearch(e.target.value)}
        className="w-full min-w-0 rounded-lg px-3 py-2 text-xs outline-none" style={{ color: theme.textPrimary, background: theme.bgPanel, border: `1px solid ${theme.border}` }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ThemedSelect light={theme.name === 'light'} dense ariaLabel="Filtrer par personnage" value={person} onChange={setPerson} options={[{ value: '', label: 'Tous les personnages' }, ...personOptions]} />
        <ThemedSelect light={theme.name === 'light'} dense ariaLabel="Filtrer par spécialité" value={specialty} onChange={setSpecialty} options={[{ value: '', label: 'Toutes les spécialités' }, ...specialtyOptions]} />
        <ThemedSelect light={theme.name === 'light'} dense ariaLabel="Filtrer par type d’action" value={actionType} onChange={setActionType} options={[{ value: '', label: 'Tous les types d’action' }, ...actionOptions]} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: theme.textSecondary }}>
        <span>{displayed.length} / {candidates.length} actions affichées · {selectedCount} liées au total</span>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={linkedOnly} onChange={e => setLinkedOnly(e.target.checked)} />Liées uniquement</label>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" disabled={busy || !unlinked.length} onClick={() => save(unlinked, true)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ color: theme.textPrimary, borderColor: theme.border }}>Relier les résultats affichés ({unlinked.length})</button>
        <button type="button" onClick={() => { setSearch(''); setPerson(''); setSpecialty(''); setActionType(''); setLinkedOnly(false); }} className="px-2 py-2 text-xs underline" style={{ color: theme.textSecondary }}>Effacer les filtres</button>
      </div>
    </>}
    <div className="max-h-80 overflow-y-auto overscroll-contain space-y-2" role="group" aria-label="Tentatives à relier">
    {displayed.map(c => <div key={`${c.d.id}:${actionReference(c.a, c.i)}`} className="rounded-lg p-2" style={{ background: theme.bgPanel }}>
      <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" className="mt-1 shrink-0" disabled={busy} checked={obstructionApplies(action, source, index, c.a, c.d, c.i)} onChange={e => save([c], e.target.checked)} />
      <span className="min-w-0 text-xs whitespace-pre-wrap break-words"><strong>{c.d.characterName} · {c.a.actionName}</strong><span className="block mt-1" style={{ color: theme.textSecondary }}>{c.a.specialization || 'Sans spécialité'}{c.a.influenceName && ` · ${c.a.influenceName}`}</span></span>
      </label>
      <div className="min-w-0 ml-6"><ActionDescription text={c.a.description} /></div>
    </div>)}
    {!displayed.length && <p className="text-xs italic">{candidates.length ? 'Aucune action ne correspond aux filtres.' : 'Aucune action globale à relier dans cette catégorie ce cycle.'}</p>}
    </div>
    {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
  </details>;
}
