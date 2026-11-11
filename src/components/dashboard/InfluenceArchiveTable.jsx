import { Fragment, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Answer, CATEGORY_COLOR } from './DossierDetail';
import RumorTable from '../ui/RumorTable';

function InfluenceRow({ row }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const cell = 'px-3 py-3 align-top text-[12.5px]';
  const color = CATEGORY_COLOR[row.kind];
  return <Fragment>
    <tr style={{ borderTop: '1px solid var(--night-line)' }}>
      <td className={`${cell} font-bold whitespace-nowrap`} style={{ color }}>{row.kind === 'gotha' ? 'Gotha' : 'Pègre'}</td>
      <td className={cell}><span className="block font-bold" style={{ color: 'var(--night-text)' }}>{row.type || 'Action'}</span><span className="text-[11px]" style={{ color: 'var(--night-muted)' }}>{row.actionType === 'ciblée' ? 'Ciblée' : 'Globale'}</span></td>
      <td className={cell}>{row.specialization || '—'}</td>
      <td className={`${cell} break-words`}>{row.target || '—'}</td>
      <td className={`${cell} text-right tabular-nums`}>{row.spent}</td>
      <td className={cell}><span className="line-clamp-2" style={{ color: row.answered ? '#f0a3a6' : 'var(--night-faint)' }}>{row.answered ? row.response || (row.rumorTable?.length ? 'Tableau de rumeurs disponible' : 'Réponse diffusée') : 'En attente de diffusion'}</span></td>
      <td className={`${cell} sticky right-0`} style={{ background: 'var(--night-panel)' }}><button type="button" aria-expanded={open} aria-controls={detailsId} aria-label={`${open ? 'Fermer' : 'Lire'} ${row.type || 'l’action'} · ${row.target || row.specialization || row.kind}`}
        onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold whitespace-nowrap" style={{ color: 'var(--night-text)', border: '1px solid var(--night-line-strong)' }}>
        {open ? 'Fermer' : 'Lire'}<ChevronDown size={13} className={open ? 'rotate-180' : ''} />
      </button></td>
    </tr>
    {open && <tr id={detailsId}><td colSpan={7} className="px-4 pb-4" style={{ background: 'var(--night-panel-2)' }}>
      <div className="pt-3"><p className="text-[10px] uppercase font-bold tracking-widest mb-2" style={{ color }}>Action déclarée</p>
        <p className="font-serif text-[14.5px] whitespace-pre-wrap break-words" style={{ color: 'var(--night-text)' }}>{row.text || 'Aucune description.'}</p>
        <Answer visible={row.answered} text={row.response} />
        {row.answered && (row.rumorTable?.length > 0 || row.rumorCoveredSpecs?.length > 0) && <div className="mt-3"><RumorTable rows={row.rumorTable} specs={row.rumorCoveredSpecs} /></div>}
        {row.answered && row.rumorNarrative && <p className="mt-3 font-serif italic whitespace-pre-wrap" style={{ color }}>{row.rumorNarrative}</p>}
      </div>
    </td></tr>}
  </Fragment>;
}

export default function InfluenceArchiveTable({ rows, month }) {
  return <div role="region" aria-label={`Tableau des influences de ${month}`} tabIndex={0} className="rounded-xl overflow-x-auto" style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)', color: 'var(--night-muted)' }}>
    <table className="w-full text-left border-collapse table-fixed" style={{ minWidth: 880 }}>
      <caption className="sr-only">Influences de {month}</caption>
      <colgroup><col style={{ width: 90 }} /><col style={{ width: '21%' }} /><col style={{ width: '13%' }} /><col style={{ width: '17%' }} /><col style={{ width: 65 }} /><col /><col style={{ width: 88 }} /></colgroup>
      <thead><tr>{['Catégorie', 'Action', 'Spécialité', 'Réseau / cible', 'Points', 'Résultat', 'Détails'].map(label => <th key={label} scope="col" className={`px-3 py-3 text-[10px] uppercase font-bold tracking-wider ${label === 'Points' ? 'text-right' : label === 'Détails' ? 'sticky right-0' : ''}`} style={label === 'Détails' ? { background: 'var(--night-panel)' } : undefined}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <InfluenceRow key={row.id} row={row} />)}</tbody>
    </table>
  </div>;
}
