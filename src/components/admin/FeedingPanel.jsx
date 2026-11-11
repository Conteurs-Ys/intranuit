import { Droplet, HandHeart } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { isLiveEntry } from '../../utils/monthLabels';
import { feedingStatus, troupeauLoans } from '../../utils/feeding';

function Section({ icon: Icon, title, color, count, hint, children }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  return (
    <section className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}` }}>
      <h3 className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, border: `1px solid ${color}40`, color }}><Icon size={14} /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>{title}</span>
        {count !== undefined && <span className="text-[11px] font-bold tabular-nums" style={{ color: theme.textMuted }}>{count}</span>}
      </h3>
      {hint && <p className="text-[12.5px]" style={{ color: theme.textSecondary }}>{hint}</p>}
      {children}
    </section>
  );
}

// Supervision › Sang : de quoi chaque personnage se nourrit ce cycle (AIP de chasse, Troupeau, Troupeau emprunté),
// emprunts à valider, et réserve de sang annoncée au joueur à la diffusion.
export default function FeedingPanel({ appId, aips = [], month }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const red = light ? '#a5222a' : '#e5484f';
  const green = light ? '#276344' : '#7fcf9f';
  const amber = light ? '#7a5a14' : '#d9b26a';
  const dossiers = aips.filter(a => a.monthLabel === month && isLiveEntry(a));
  const review = (d, patch) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_aips', d.id), {
    feedingReview: { ...(d.feedingReview || {}), ...patch },
  });
  const chip = (on, color) => ({ color: on ? color : theme.textSecondary, background: on ? `${color}14` : 'transparent', border: `1px solid ${on ? color + '66' : theme.border}` });
  const rows = dossiers.map(d => ({ d, s: feedingStatus(d) })).sort((a, b) => (a.d.characterName || '').localeCompare(b.d.characterName || '', 'fr'));
  const half = rows.filter(r => r.s.blood === 'half').length;
  const pending = rows.filter(r => r.s.missing && r.s.borrow === 'pending').length;

  return (
    <div className="space-y-4">
      <Section icon={Droplet} title="Réserve de sang à la prochaine partie" color={red} count={rows.length}
        hint="Besoin : 1 AIP de chasse, 2 pour les Ventrue, moins le Troupeau. La réserve est annoncée au joueur à la diffusion.">
        {rows.length > 0 && <p className="text-[12px]" style={{ color: theme.textMuted }}>
          {half ? `${half} réserve${half > 1 ? 's' : ''} à moitié` : 'Toutes les réserves sont pleines'}
          {pending > 0 && ` · ${pending} emprunt${pending > 1 ? 's' : ''} à valider`}
        </p>}
        <div className="space-y-2.5">{rows.length ? rows.map(({ d, s }) => {
          const lender = d.feeding?.borrowFrom;
          const loans = lender && s.missing ? troupeauLoans(dossiers, lender.id) : null;
          return (
            <article key={d.id} aria-label={`Nourriture de ${d.characterName}`} className="rounded-xl px-4 py-3 text-[13px]" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <h4 className="font-serif italic font-bold text-[17px] leading-snug break-words">{d.characterName}</h4>
                  <p className="mt-1 text-[12px] leading-relaxed" style={{ color: theme.textSecondary }}>
                    Besoin {s.need}{d.clan === 'Ventrue' ? ' (Ventrue)' : ''} · Chasse {s.actions} · Troupeau {d.feeding ? s.troupeau : 'inconnu'}
                  </p>
                  {!d.feeding && <p className="mt-0.5 text-[12px]" style={{ color: theme.textMuted }}>Dossier déposé avant le suivi du Troupeau.</p>}
                </div>
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-3 gap-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>Réserve</span>
                  <div role="group" aria-label={`Réserve de ${d.characterName}`} className="flex items-center gap-1.5">
                    {[['full', 'Pleine', green], ['half', 'Moitié', red]].map(([v, label, color]) => (
                      <button key={v} type="button" aria-pressed={s.blood === v} title={v === s.auto ? 'Résultat calculé' : 'Corriger le résultat calculé'}
                        onClick={() => review(d, { blood: v === s.auto ? null : v })}
                        className="min-h-9 sm:min-h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] transition-colors" style={chip(s.blood === v, color)}>{label}</button>
                    ))}
                  </div>
                  {s.overridden && <span className="text-[12px]" style={{ color: amber }}>corrigée</span>}
                </div>
              </div>
              {lender && s.missing > 0 && (
                <div className="mt-3 pt-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="min-w-0">
                    <p className="flex items-start gap-2 leading-relaxed">
                      <HandHeart size={14} className="shrink-0 mt-0.5" style={{ color: amber }} />
                      <span>Emprunt à <b className="font-semibold break-words">{lender.name}</b> · {s.missing} pt{s.missing > 1 ? 's' : ''}</span>
                    </p>
                    <p className="mt-1 sm:pl-[22px] text-[12px] leading-relaxed" style={{ color: loans.over ? red : theme.textMuted }}>
                      {loans.surplus === null ? 'Troupeau du prêteur inconnu : aucun dossier ce cycle.' : `Capacité de prêt : ${loans.surplus} pt${loans.surplus > 1 ? 's' : ''} · ${loans.accepted} accordé${loans.accepted > 1 ? 's' : ''}`}
                      {loans.over && ' · Capacité dépassée'}
                    </p>
                  </div>
                  <div role="group" aria-label={`Emprunt de ${d.characterName}`} className="flex items-center gap-1.5 sm:justify-end">
                    {['accepted', 'refused'].map(v => (
                      <button key={v} type="button" aria-pressed={s.borrow === v} onClick={() => review(d, { borrowFrom: lender.id, borrow: v })}
                        className="min-h-9 sm:min-h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] transition-colors" style={chip(s.borrow === v, v === 'accepted' ? green : red)}>
                        {v === 'accepted' ? 'Accepter' : 'Refuser'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        }) : <p className="text-[12.5px] italic" style={{ color: theme.textMuted }}>Aucun dossier d’AIP ce cycle.</p>}</div>
      </Section>
    </div>
  );
}
