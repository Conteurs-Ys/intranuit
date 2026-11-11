import { X, History, Scroll, Terminal } from 'lucide-react';

export default function PNJHistoryModal({ pnj, onClose }) {
  const sorted = [...(pnj.history || [])].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        style={{ background: 'rgba(5,5,5,0.98)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 0 80px rgba(0,0,0,0.9)' }}>

        {/* Ligne accent */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <History size={16} className="text-red-900" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold text-zinc-100 italic leading-none">{pnj.name}</div>
              <div className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-700 mt-1">Archives · {sorted.length} cycle{sorted.length > 1 ? 's' : ''}</div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-grow overflow-y-auto p-6">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Scroll size={32} className="text-zinc-800" />
              <p className="text-zinc-800 font-serif italic">Le silence des âges entoure cette ombre.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sorted.map((h, i) => (
                <div key={i} className="space-y-4">
                  {/* Mois */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: 'rgba(239,68,68,0.1)' }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] px-3 py-1.5 rounded-lg"
                      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      {h.month}
                    </span>
                    <div className="h-px flex-1" style={{ background: 'rgba(239,68,68,0.1)' }} />
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {h.actions.map((act, j) => (
                      <div key={j} className="rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(8,8,8,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        {/* Méta */}
                        <div className="px-4 py-2.5 flex items-center gap-2"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.2)' }}>
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">{act.type}</span>
                          {act.zone && <><span className="text-zinc-800">·</span><span className="text-[8px] text-zinc-700 font-serif italic">{act.zone}</span></>}
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Intention */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Scroll size={9} className="text-zinc-700" />
                              <span className="text-[7px] font-black uppercase tracking-widest text-zinc-700">Intention</span>
                            </div>
                            <p className="text-[12px] text-zinc-500 font-serif italic leading-relaxed"
                              style={{ borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '0.75rem' }}>
                              {act.description || 'Intrigue muette.'}
                            </p>
                          </div>

                          {/* Sentence */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Terminal size={9} className="text-emerald-900" />
                              <span className="text-[7px] font-black uppercase tracking-widest text-emerald-900">Sentence</span>
                            </div>
                            <p className="text-[12px] text-emerald-200/40 font-serif leading-relaxed"
                              style={{ borderLeft: '2px solid rgba(16,185,129,0.15)', paddingLeft: '0.75rem' }}>
                              {act.response || 'Inconnue.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}