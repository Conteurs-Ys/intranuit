import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Check, Plus, Trash2, ShieldAlert, Snowflake, RotateCcw, Pencil } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import ThemedSelect from '../ui/ThemedSelect';
import RumorTable from '../ui/RumorTable';
import { INFLUENCE_SPECIALIZATIONS } from '../../constants';
import { buildRumorTable, freezeRumor, groupRumorRows, publishedRumorTable } from '../../utils/rumors';

const CAT = { gotha: 'Gotha', pegre: 'Pègre' };
const SOURCE = { usage: 'Usage', seed: 'Rumeur de conteur', ajout: 'Ajout' };

// Aperçu d'une rumeur, calculé en direct. `ctx` : { dossiers, seeds, antagonists }.
export function useRumorPreview(rumor, dossier, ctx) {
  return useMemo(() => (rumor && dossier ? buildRumorTable({ rumor, dossier, ...ctx }) : null), [rumor, dossier, ctx]);
}

// Résumé dans la cellule « Retour / Rumeurs » du tableau des influences.
export function RumorSummary({ preview, frozen, onOpen, color }) {
  const { theme } = useTheme();
  if (!preview) return null;
  const published = publishedRumorTable(preview).length;
  return (
    <button type="button" onClick={onOpen} className="w-full text-left rounded-xl px-3 py-2 transition-opacity hover:opacity-80"
      style={{ background: theme.bgCard, border: `1px solid ${color}40` }}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}>Tableau de rumeurs</div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[12px]" style={{ color: theme.textSecondary }}>
        <span>{published} ligne{published > 1 ? 's' : ''} diffusée{published > 1 ? 's' : ''}</span>
        {preview.toReview > 0 && <span style={{ color: theme.name === 'light' ? '#975012' : '#ec9440' }}>· {preview.toReview} à relire</span>}
        {preview.blockedSpecs.length > 0 && <span style={{ color: theme.name === 'light' ? '#a5222a' : '#f7a8ac' }}>· obstruée{preview.blocked ? ' : aucun résultat' : ''}</span>}
        {!preview.specs.length && <span style={{ color: theme.name === 'light' ? '#a5222a' : '#f7a8ac' }}>· aucune spécialité</span>}
        {frozen && <span>· figé</span>}
      </div>
    </button>
  );
}

function Pill({ children, color }) {
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color, border: `1px solid ${color}55` }}>{children}</span>;
}

export function TraceField({ value, onCommit, onDraft, theme, disabled }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <textarea value={draft} disabled={disabled} rows={2} aria-label="Trace diffusée au joueur"
      onChange={e => { setDraft(e.target.value); onDraft?.(e.target.value); }} onBlur={() => { if (draft !== value) onCommit(draft); }}
      className="w-full rounded-lg px-2.5 py-1.5 text-[14px] font-serif leading-snug outline-none resize-y disabled:opacity-50"
      style={{ background: theme.bgResponse, border: `1px solid ${theme.border}`, color: theme.textResponse, fieldSizing: 'content', minHeight: '2.6rem' }} />
  );
}

// Fenêtre de relecture : spécialités couvertes, obstruction, lignes à relire, masquer, réécrire, ajouter, figer.
// La trace d'un usage est commune à tous les tableaux (`onSaveUsage` l'écrit sur l'action d'origine),
// sauf si le conteur la réécrit pour ce joueur seulement (`rumorEdits` de cette rumeur).
export default function RumorEditor({ item, dossier, ctx, onSave, onSaveUsage, onClose }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const color = item.category === 'gotha' ? (light ? '#975012' : '#ec9440') : (light ? '#665088' : '#a995d8');
  const red = light ? '#a5222a' : '#f7a8ac';
  const green = light ? '#276344' : '#9fd8b8';
  const preview = useRumorPreview(item, dossier, ctx);
  const [extra, setExtra] = useState({ institution: '', month: dossier.monthLabel, trace: '' });
  const [playerView, setPlayerView] = useState(false);
  const drafts = useRef({});
  const currentTrace = row => drafts.current[row.key] ?? row.trace;
  const pendingTraces = useRef(0);
  const [savingTrace, setSavingTrace] = useState(false);
  const [saveError, setSaveError] = useState('');
  const edits = item.rumorEdits || {};
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setEdit = (key, patch) => onSave({ rumorEdits: { ...edits, [key]: { ...(edits[key] || {}), ...patch } } });
  const setSpecs = (specs) => onSave({ rumorSpecs: specs });
  const commitTrace = async (r, v) => {
    pendingTraces.current++; setSavingTrace(true); setSaveError('');
    try { await (r.source === 'usage' && !r.override ? onSaveUsage(r.key, { rumorTrace: v }) : setEdit(r.key, { trace: v })); }
    catch (error) { setSaveError(error.message || 'Enregistrement de la trace impossible.'); }
    finally { pendingTraces.current--; setSavingTrace(pendingTraces.current > 0); }
  };
  const extras = item.rumorExtra || [];
  const addExtra = (e) => {
    e.preventDefault();
    if (!extra.trace.trim()) return;
    onSave({ rumorExtra: [...extras, { id: `${Date.now()}`, institution: extra.institution.trim(), month: extra.month, trace: extra.trace.trim() }] });
    setExtra({ institution: '', month: dossier.monthLabel, trace: '' });
  };
  const updateExtra = (id, patch) => onSave({ rumorExtra: extras.map(x => (x.id === id ? { ...x, ...patch } : x)) });
  const removeExtra = (id) => onSave({ rumorExtra: extras.filter(x => x.id !== id) });
  const freeze = () => { if (!pendingTraces.current) onSave(freezeRumor({ rumor: item, dossier, ...ctx })); };

  if (!preview) return null;
  const published = publishedRumorTable(preview);
  const frozen = Boolean(item.rumorFrozenAt);
  const outdated = frozen && JSON.stringify(item.rumorTable || []) !== JSON.stringify(published);
  const addable = INFLUENCE_SPECIALIZATIONS.filter(s => !preview.specs.includes(s));
  const field = { background: theme.bgInput, border: `1px solid ${theme.border}`, color: theme.textPrimary };

  // Portail : la fenêtre ne doit pas dépendre d'un parent animé ou défilant (tableau des influences).
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Tableau de rumeurs" className="w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        style={{ background: light ? '#faf8f5' : 'var(--night-panel)', border: `1px solid ${color}40`, boxShadow: light ? '0 32px 80px rgba(0,0,0,0.2)' : '0 32px 80px rgba(0,0,0,0.95)', maxHeight: '90vh' }}>
        <header className="flex flex-wrap gap-3 items-start justify-between px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>{item.actionName} · {CAT[item.category]}</div>
            <div className="font-serif text-lg font-bold italic" style={{ color: theme.textPrimary }}>{dossier.characterName}</div>
            <div className="text-[12.5px]" style={{ color: theme.textSecondary }}>
              Période : {preview.months[0]} → {preview.months[2]} · {preview.spent} action{preview.spent > 1 ? 's' : ''} dépensée{preview.spent > 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-xl transition-colors hover:opacity-60" style={{ color: theme.textMuted, background: theme.bgCard, border: `1px solid ${theme.border}` }}><X size={14} /></button>
        </header>

        <div className="flex-1 overflow-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Spécialités couvertes */}
          <section className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textPrimary }}>
              Spécialités couvertes {Array.isArray(item.rumorSpecs) ? '' : '(profil non transmis : déduites du dossier)'}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {preview.specs.map(spec => {
                const o = preview.obstruction[spec];
                return (
                  <span key={spec} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-[12.5px]"
                    style={{ color: o.blocked ? red : theme.textPrimary, border: `1px solid ${o.blocked ? red + '66' : color + '55'}`, background: `${color}10` }}>
                    {spec}{o.level > 0 && <span className="text-[11px]">· obstruée {o.level}</span>}
                    <button type="button" onClick={() => setSpecs(preview.specs.filter(s => s !== spec))} aria-label={`Retirer ${spec}`} className="p-0.5 rounded hover:opacity-60"><X size={11} /></button>
                  </span>
                );
              })}
              {addable.length > 0 && (
                <div className="w-44"><ThemedSelect light={light} compact value="" ariaLabel="Ajouter une spécialité couverte" placeholder="+ Spécialité" onChange={v => v && setSpecs([...preview.specs, v])} options={addable} /></div>
              )}
            </div>
            {preview.tooManySpecs > 0 && <p className="text-[12.5px]" style={{ color: red }}>Plus de spécialités que permis ({preview.tooManySpecs}) : les règles en limitent le nombre au niveau dans la catégorie{item.monopoliste ? ', doublé par Monopoliste' : ''}.</p>}
            {!preview.specs.length && <p className="text-[12.5px]" style={{ color: red }}>Aucune spécialité : la rumeur ne révèle aucun usage. Ajoutez celles du personnage ou des lignes à la main.</p>}
          </section>

          {/* Obstruction */}
          {preview.blockedSpecs.length > 0 && (
            <div className="flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]" style={{ border: `1px solid ${red}55`, background: `${red}0d`, color: theme.textPrimary }}>
              <ShieldAlert size={16} className="shrink-0 mt-0.5" style={{ color: red }} />
              <div className="space-y-1">
                <b>{preview.blocked ? 'Aucun résultat : la rumeur est entièrement obstruée.' : 'Rumeur en partie obstruée.'}</b>
                {preview.blockedSpecs.map(spec => {
                  const o = preview.obstruction[spec];
                  return <div key={spec}>{spec} : obstruction {o.level} ({o.sources.map(s => s.characterName).join(', ')}), il faut {o.needed} actions, {preview.spent} dépensée{preview.spent > 1 ? 's' : ''}.</div>;
                })}
                <div style={{ color: theme.textSecondary }}>Les lignes de ces spécialités ne seront pas diffusées. Les lignes ajoutées à la main restent sous votre responsabilité.</div>
              </div>
            </div>
          )}

          {/* Lignes */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textPrimary }}>
                {preview.rows.length} ligne{preview.rows.length > 1 ? 's' : ''} · {published.length} diffusée{published.length > 1 ? 's' : ''}
                {preview.toReview > 0 && <span style={{ color: light ? '#975012' : '#ec9440' }}> · {preview.toReview} à relire</span>}
              </div>
              <div className="flex gap-1.5">
                {['Relecture', 'Vue joueur'].map((label, i) => (
                  <button key={label} type="button" aria-pressed={playerView === Boolean(i)} onClick={() => setPlayerView(Boolean(i))}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: theme.textPrimary, border: `1px solid ${playerView === Boolean(i) ? '#e5484f' : theme.border}` }}>{label}</button>
                ))}
              </div>
            </div>
            {preview.toReview > 0 && !playerView && (
              <p className="text-[12.5px]" style={{ color: theme.textSecondary }}>
                Une trace « à relire » est préremplie depuis l'action, noms de personnages masqués. Une fois relue, elle vaut pour tous les tableaux où l'usage apparaît (« Ce joueur » pour la réécrire ici seulement). Sans relecture, seule une formule neutre est diffusée (« Usage de l’influence »), jamais le nom de l’action, qui trahirait le niveau.
              </p>
            )}

            {playerView ? (
              <RumorTable rows={published} specs={preview.specs} theme={theme} />
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${theme.border}` }}>
                <table className="w-full min-w-[860px] text-left border-collapse">
                  <thead style={{ background: theme.bgTableHead }}>
                    <tr>
                      {[['Mois', 'w-28'], ['Institution ou individu impliqué', 'w-52'], ['Manière dont l’influence a été utilisée', ''], ['Origine', 'w-44'], ['Diffusion', 'w-28']].map(([h, w]) => (
                        <th key={h} className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] ${w}`} style={{ color: theme.textSecondary, borderBottom: `1px solid ${theme.borderStrong}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[13px] italic" style={{ color: theme.textMuted }}>Aucun usage ni rumeur de conteur sur la période.</td></tr>}
                    {groupRumorRows(preview.rows, preview.specs).map(g => (
                      <Fragment key={g.spec || 'toutes'}>
                        <tr style={{ borderTop: `1px solid ${theme.borderStrong}`, background: theme.bgCard }}>
                          <td colSpan={5} className="px-3 pt-2 pb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textPrimary }}>{g.spec || 'Toute la catégorie ou sans spécialité'}</span>
                            {preview.obstruction[g.spec]?.blocked && <span className="ml-2 text-[11px]" style={{ color: red }}>obstruée : rien n’est diffusé</span>}
                          </td>
                        </tr>
                        {g.rows.length === 0 && <tr><td colSpan={5} className="px-3 py-2 text-[13px] italic" style={{ color: theme.textMuted }}>Aucun usage sur la période : le joueur verra « Rien ne filtre ».</td></tr>}
                    {g.rows.map(r => {
                      const x = r.source === 'ajout' ? extras.find(e => `ajout:${e.id}` === r.key) : null;
                      const actor = r.source === 'usage' ? r.actor : null;
                      const off = r.hidden || r.obstructed;
                      return (
                        <tr key={r.key} className="align-top transition-opacity" style={{ borderTop: `1px solid ${theme.borderCell}`, opacity: off ? 0.5 : 1 }}>
                          <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: theme.textSecondary }}>{r.month}</td>
                          <td className="px-3 py-2.5">
                            {x ? (
                              <input defaultValue={x.institution} placeholder="Institution…" aria-label="Institution" onBlur={e => e.target.value !== x.institution && updateExtra(x.id, { institution: e.target.value.trim() })}
                                className="w-full rounded-lg px-2 py-1 text-[13.5px] outline-none" style={field} />
                            ) : (
                              <div className="text-[14px] font-semibold" style={{ color: theme.textPrimary }}>{r.institution || <span className="italic font-normal" style={{ color: theme.textMuted }}>non renseignée</span>}</div>
                            )}
                            {r.specialization.includes(',') && <div className="text-[12px] mt-0.5" style={{ color: theme.textSecondary }}>{r.specialization}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            <TraceField theme={theme} value={r.trace} disabled={r.obstructed}
                              onDraft={value => { drafts.current[r.key] = value; }}
                              onCommit={v => (x ? updateExtra(x.id, { trace: v }) : commitTrace(r, v))} />
                          </td>
                          <td className="px-3 py-2.5 space-y-1">
                            <div className="text-[12.5px]" style={{ color: theme.textPrimary }}>{r.source === 'usage' ? r.actionName : SOURCE[r.source]}</div>
                            {actor && <div className="text-[12px]" style={{ color: theme.textMuted }}>par {actor} (jamais diffusé)</div>}
                            <div className="flex flex-wrap gap-1">
                              {r.obstructed && <Pill color={red}>Obstruée</Pill>}
                              {r.noSpec && !r.obstructed && <Pill color={theme.textMuted}>Lien à juger</Pill>}
                              {!r.reviewed && !off && <Pill color={light ? '#975012' : '#ec9440'}>À relire</Pill>}
                              {r.source === 'usage' && r.reviewed && <Pill color={r.override ? color : green}>{r.override ? 'Ce joueur seul' : 'Commune'}</Pill>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1.5">
                              {!r.reviewed && !off && (
                                <button type="button" disabled={savingTrace} onClick={() => commitTrace(r, currentTrace(r))} title="Valider cette trace pour tous les tableaux"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: green, border: `1px solid ${green}55` }}><Check size={12} /> Valider</button>
                              )}
                              {r.source === 'usage' && !r.override && !off && (
                                <button type="button" onClick={() => setEdit(r.key, { trace: currentTrace(r) })} title="Réécrire cette trace pour ce joueur seulement"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color, border: `1px solid ${color}55` }}><Pencil size={12} /> Ce joueur</button>
                              )}
                              {r.source === 'usage' && (r.override || r.shared != null) && (
                                <button type="button" onClick={() => (r.override ? setEdit(r.key, { trace: null }) : onSaveUsage(r.key, { rumorTrace: null }))}
                                  title={r.override ? 'Reprendre la trace commune' : 'Revenir à la trace préremplie, pour tous les tableaux'}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}><RotateCcw size={12} /> {r.override ? 'Commune' : 'Rétablir'}</button>
                              )}
                              {x ? (
                                <button type="button" onClick={() => removeExtra(x.id)} title="Retirer cette ligne"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: red, border: `1px solid ${red}44` }}><Trash2 size={12} /> Retirer</button>
                              ) : !r.obstructed && (
                                <button type="button" onClick={() => setEdit(r.key, { hidden: !r.hidden })} title={r.hidden ? 'Diffuser cette ligne' : 'Ne pas diffuser cette ligne'}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                                  {r.hidden ? <><Eye size={12} /> Afficher</> : <><EyeOff size={12} /> Masquer</>}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Ajout d'une ligne */}
          {!playerView && (
            <form onSubmit={addExtra} className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_10rem_minmax(0,1fr)_auto] items-start rounded-xl p-3" style={{ border: `1px dashed ${color}55` }}>
              <input value={extra.institution} onChange={e => setExtra({ ...extra, institution: e.target.value })} placeholder="Institution ou individu impliqué…" aria-label="Institution de la nouvelle ligne"
                className="rounded-lg px-2.5 py-1.5 text-[13px] outline-none placeholder:opacity-60" style={field} />
              <ThemedSelect light={light} compact value={extra.month} onChange={v => setExtra({ ...extra, month: v })} options={[...preview.months].reverse()} ariaLabel="Mois" />
              <input value={extra.trace} onChange={e => setExtra({ ...extra, trace: e.target.value })} placeholder="Manière dont l’influence a été utilisée…" aria-label="Manière de la nouvelle ligne"
                className="rounded-lg px-2.5 py-1.5 text-[13px] outline-none placeholder:opacity-60" style={field} />
              <button type="submit" disabled={!extra.trace.trim()} className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
                style={{ color, border: `1px solid ${color}55` }}><Plus size={12} /> Ajouter</button>
            </form>
          )}
        </div>

        <footer className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
          {saveError && <p role="alert" className="w-full text-sm text-red-400">{saveError}</p>}
          {savingTrace && <p role="status" className="w-full text-xs" style={{ color: theme.textSecondary }}>Enregistrement de la trace…</p>}
          <span className="text-[12px]" style={{ color: theme.textSecondary }}>
            {frozen
              ? <>Figé le {new Date(item.rumorFrozenAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}{outdated ? ' · l’aperçu a changé depuis' : ''}</>
              : 'Aperçu en direct : le tableau est figé à la diffusion.'}
          </span>
          <button type="button" disabled={savingTrace || Boolean(saveError)} onClick={freeze} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ color, border: `1px solid ${color}55` }}>
            <Snowflake size={12} /> {frozen ? 'Mettre à jour le tableau figé' : 'Figer maintenant'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
