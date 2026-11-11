import { Fragment } from 'react';
import { groupRumorRows } from '../../utils/rumors';

// Tableau de rumeurs tel que le joueur le reçoit, dans les termes des règles, classé par spécialité :
// l'institution ou l'individu impliqué et la manière dont l'influence a été utilisée (pas de date).
// Jamais l'identité d'un personnage. `specs` : spécialités couvertes (affichées même sans rumeur).
// Sans `theme` : palette joueur (variables --night-*). Sur téléphone, une fiche par ligne.
const HEADERS = ['Institution ou individu impliqué', 'Manière dont l’influence a été utilisée'];
const groupLabel = (spec) => spec || 'Toute la catégorie';

export default function RumorTable({ rows = [], specs = [], theme }) {
  const c = theme
    ? { line: theme.border, cell: theme.borderCell, head: theme.bgTableHead, text: theme.textPrimary, muted: theme.textSecondary, faint: theme.textMuted, body: theme.textResponse, band: theme.bgCard }
    : { line: 'var(--night-line)', cell: 'var(--night-line)', head: 'rgba(255,240,235,0.03)', text: 'var(--night-text)', muted: 'var(--night-muted)', faint: 'var(--night-faint)', body: 'var(--night-text)', band: 'rgba(255,240,235,0.02)' };
  const groups = groupRumorRows(rows, specs);
  // Anciens tableaux : `actionName` tenait lieu de manière.
  const manner = (r) => r.trace || r.actionName || '—';
  const label = (spec) => <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: c.text }}>{groupLabel(spec)}</span>;
  const nothing = <span className="text-[13px] italic" style={{ color: c.faint }}>Rien ne filtre.</span>;
  if (!groups.length) return <p className="px-3 py-5 text-center text-[13px] italic rounded-xl" style={{ color: c.faint, border: `1px solid ${c.line}` }}>Aucune rumeur ne vous parvient.</p>;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.line}` }}>
      <table className="hidden sm:table w-full text-left border-collapse">
        <thead style={{ background: c.head }}>
          <tr>{HEADERS.map((h, i) => (
            <th key={h} className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] ${i === 0 ? 'w-64' : ''}`} style={{ color: c.muted }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <Fragment key={g.spec || 'toutes'}>
              <tr style={{ borderTop: `1px solid ${c.line}`, background: c.band }}>
                <td colSpan={2} className="px-3 pt-2 pb-1.5">{label(g.spec)}</td>
              </tr>
              {g.rows.length === 0 && <tr><td colSpan={2} className="px-3 py-2">{nothing}</td></tr>}
              {g.rows.map((r, j) => (
                <tr key={j} className="align-top" style={{ borderTop: `1px solid ${c.cell}` }}>
                  <td className="px-3 py-2.5 text-[14px] font-semibold" style={{ color: c.text }}>{r.institution || '—'}</td>
                  <td className="px-3 py-2.5 font-serif text-[15px] leading-relaxed" style={{ color: c.body }}>{manner(r)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="sm:hidden">
        {groups.map((g, gi) => (
          <section key={g.spec || 'toutes'} style={{ borderTop: gi ? `1px solid ${c.line}` : 'none' }}>
            <div className="px-3.5 pt-2.5 pb-1" style={{ background: c.band }}>{label(g.spec)}</div>
            {g.rows.length === 0 && <div className="px-3.5 py-2.5">{nothing}</div>}
            {g.rows.map((r, j) => (
              <div key={j} className="px-3.5 py-3 space-y-1" style={{ borderTop: `1px solid ${c.cell}` }}>
                <div className="text-[14px] font-semibold" style={{ color: c.text }}>{r.institution || '—'}</div>
                <p className="font-serif text-[15px] leading-relaxed" style={{ color: c.body }}>{manner(r)}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
