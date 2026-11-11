import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { euroAmount, expenseCents, expenseTotal, expenseStatus } from '../../utils/expenses';

const STATUS = { pending: 'À valider', approved: 'Validée', rejected: 'Refusée' };
function DecisionButtons({ row, onDecision, inputStyle }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const decide = async status => {
    if (busy) return;
    setBusy(true); setError('');
    try { await onDecision(row, status, reason); } catch (e) { setError(e.message || 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  return <div className="w-full sm:min-w-48 space-y-2">
    <button type="button" disabled={busy} onClick={() => decide('approved')} className="min-h-10 rounded-lg border px-3 py-2 text-xs disabled:opacity-50" style={{ color: '#70b78d', borderColor: '#70b78d66' }}>Valider</button>
    <input aria-label={`Motif du refus : ${row.description}`} placeholder="Motif du refus…" value={reason} onChange={e => setReason(e.target.value)} disabled={busy} className="block w-full rounded-lg p-2 text-xs outline-none" style={inputStyle} />
    <button type="button" disabled={busy} onClick={() => decide('rejected')} className="min-h-10 rounded-lg border px-3 py-2 text-xs disabled:opacity-50" style={{ color: '#e5484f', borderColor: '#e5484f66' }}>Refuser</button>
    {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
  </div>;
}

export default function ExpensesTable({ rows = [], onChange, history = false, light = false, reviews = {}, onDecision }) {
  const editable = Boolean(onChange);
  const color = light ? '#39302e' : 'var(--night-text)';
  const muted = light ? '#746866' : 'var(--night-muted)';
  const border = light ? 'rgba(30,20,20,.14)' : 'var(--night-line-strong)';
  const inputStyle = { background: light ? '#faf8f5' : 'var(--night-input)', border: `1px solid ${border}`, color };
  const set = (id, field, value) => onChange(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  const total = editable ? rows.reduce((sum, row) => { try { return sum + expenseCents(row.amount); } catch { return sum; } }, 0) : expenseTotal(rows);
  const approvedTotal = rows.reduce((sum, row) => {
    if (expenseStatus(row, history ? row.review : reviews[row.id]) !== 'approved') return sum;
    try { return sum + (editable ? expenseCents(row.amount) : row.amountCents); } catch { return sum; }
  }, 0);
  return <div className="space-y-3" style={{ color }}>
    {rows.length > 0 && <>
    {onDecision && <div className="space-y-3 sm:hidden" aria-label="Validation des dépenses">
      {rows.map(row => {
        const review = reviews[row.id];
        const status = expenseStatus(row, review);
        return <section key={row.id} className="min-w-0 rounded-xl p-3 space-y-3" style={{ border: `1px solid ${border}` }}>
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 whitespace-pre-wrap break-words font-bold">{row.description}</p>
            <strong className="shrink-0 whitespace-nowrap">{euroAmount(row.amountCents)}</strong>
          </div>
          <p className="text-xs font-bold" style={{ color: status === 'approved' ? (light ? '#276344' : '#9fd8b8') : status === 'rejected' ? (light ? '#a5222a' : '#f0a3a6') : muted }}>{STATUS[status]}</p>
          {status !== 'pending' && review.reason && <p className="text-xs whitespace-pre-wrap break-words">{review.reason}</p>}
          {status === 'pending' && <DecisionButtons row={row} onDecision={onDecision} inputStyle={inputStyle} />}
        </section>;
      })}
      <p className="text-xs flex justify-between gap-3"><span>Total déclaré du cycle</span><strong className="whitespace-nowrap">{euroAmount(total)}</strong></p>
    </div>}
    <div className={`${onDecision ? 'hidden sm:block ' : ''}overflow-x-auto rounded-xl`} style={{ border: `1px solid ${border}` }}>
      <table className="w-full text-left text-[13px] border-collapse" aria-label={history ? 'Historique des dépenses' : 'Dépenses du cycle'}>
        <thead><tr style={{ borderBottom: `1px solid ${border}`, color: muted }}>
          {history && <th className="p-3 font-bold">Cycle</th>}
          <th className="p-3 font-bold">Motif</th><th className="p-3 w-36 font-bold text-right">Montant (€)</th><th className="p-3 font-bold">Validation conteur</th>{editable && <th className="w-10"><span className="sr-only">Retirer</span></th>}
        </tr></thead>
        <tbody>{rows.map((row, index) => {
          const review = history ? row.review : reviews[row.id];
          const status = expenseStatus(row, review);
          return <tr key={row.id} style={{ borderBottom: `1px solid ${border}` }}>
          {history && <td className="p-3 align-top whitespace-nowrap">{row.monthLabel}</td>}
          <td className="p-2 align-top">{editable ? <input aria-label={`Motif de la dépense ${index + 1}`} value={row.description} onChange={e => set(row.id, 'description', e.target.value)} placeholder="Achat, transport, rémunération…"
            className="w-full min-w-32 rounded-lg p-2 outline-none" style={inputStyle} /> : <span className="block px-1 whitespace-pre-wrap break-words">{row.description}</span>}</td>
          <td className="p-2 align-top text-right">{editable ? <input aria-label={`Montant de la dépense ${index + 1}`} inputMode="decimal" value={row.amount} onChange={e => set(row.id, 'amount', e.target.value)} placeholder="0,00"
            className="w-full min-w-20 rounded-lg p-2 text-right outline-none" style={inputStyle} /> : <span className="block px-1 whitespace-nowrap">{euroAmount(row.amountCents)}</span>}</td>
          <td className="p-3 align-top"><span className="text-xs font-bold" style={{ color: status === 'approved' ? (light ? '#276344' : '#9fd8b8') : status === 'rejected' ? (light ? '#a5222a' : '#f0a3a6') : muted }}>{STATUS[status]}</span>
            {status !== 'pending' && review.reason && <p className="mt-1 text-xs whitespace-pre-wrap">{review.reason}</p>}
            {onDecision && status === 'pending' && <div className="mt-2"><DecisionButtons row={row} onDecision={onDecision} inputStyle={inputStyle} /></div>}
          </td>
          {editable && <td className="p-2 align-top"><button type="button" aria-label={`Retirer la dépense ${index + 1}`} onClick={() => onChange(rows.filter(r => r.id !== row.id))} className="p-2 rounded-lg" style={{ color: muted }}><X size={14} /></button></td>}
        </tr>; })}</tbody>
        <tfoot><tr><th colSpan={history ? 2 : 1} className="p-3 text-[12px]">Total déclaré{history ? ' des cycles affichés' : ' du cycle'}</th><td className="p-3 text-right font-bold whitespace-nowrap">{euroAmount(total)}</td><td />{editable && <td />}</tr></tfoot>
      </table>
    </div>
    <p className="text-xs" style={{ color: muted }}>Total validé par les conteurs : <strong style={{ color }}>{euroAmount(approvedTotal)}</strong></p></>}
    {editable && <button type="button" onClick={() => onChange([...rows, { id: crypto.randomUUID(), amount: '', description: '' }])}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold" style={{ border: `1px solid ${border}`, color }}><Plus size={13} /> Ajouter une dépense</button>}
  </div>;
}
