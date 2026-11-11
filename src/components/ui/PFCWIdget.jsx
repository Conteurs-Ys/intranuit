import React, { useState, useRef, useEffect } from 'react';
import { Swords, X, RotateCcw } from 'lucide-react';

const OUTCOMES = ['victoire', 'égalité', 'défaite'];
const OUTCOME_CONFIG = {
  victoire: { label: 'Victoire', short: 'V', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', glow: '0 0 12px rgba(16,185,129,0.3)' },
  égalité:  { label: 'Égalité',  short: 'É', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  glow: '0 0 12px rgba(245,158,11,0.3)'  },
  défaite:  { label: 'Défaite',  short: 'D', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   glow: '0 0 12px rgba(239,68,68,0.3)'   },
};

function roll() {
  return OUTCOMES[Math.floor(Math.random() * 3)];
}

export default function PFCWidget() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(3);
  const [results, setResults] = useState([]);
  const [rolling, setRolling] = useState(false);
  const panelRef = useRef(null);

  // Fermer si clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const simulate = async () => {
    setRolling(true);
    setResults([]);
    const n = Math.max(1, Math.min(20, count));

    // Animation séquentielle
    for (let i = 0; i < n; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 0 : 120));
      setResults(prev => [...prev, { outcome: roll(), id: i }]);
    }
    setRolling(false);
  };

  const reset = () => setResults([]);

  const stats = results.reduce((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: open ? 'rgba(239,68,68,0.2)' : 'rgba(18,14,16,0.95)',
          border: open ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: open ? '0 0 20px rgba(239,68,68,0.2)' : '0 4px 24px rgba(18,14,16,0.6)',
          backdropFilter: 'blur(12px)',
        }}
        title="Simulateur Pierre-Feuille-Ciseaux"
      >
        <Swords size={16} style={{ color: open ? '#ef4444' : '#71717a' }} />
      </button>

      {/* Panel */}
      {open && (
        <div ref={panelRef}
          className="fixed bottom-40 md:bottom-20 right-4 md:right-6 z-50 w-72 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200"
          style={{ background: '#0b0809', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 20px 60px rgba(18,14,16,0.8)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <Swords size={13} className="text-red-700" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-200">Simulateur PFC</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-400 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Controls */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-200 flex-shrink-0">
                Occurrences
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setCount(c => Math.max(1, c - 1))}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors text-sm font-black"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  −
                </button>
                <span className="w-8 text-center text-sm font-black text-zinc-200">{count}</span>
                <button
                  onClick={() => setCount(c => Math.min(20, c + 1))}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-colors text-sm font-black"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  +
                </button>
              </div>
            </div>

            <button
              onClick={simulate}
              disabled={rolling}
              className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.18em] transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              {rolling ? 'Tirage...' : 'Simuler'}
            </button>
          </div>

          {/* Résultats */}
          {results.length > 0 && (
            <div className="px-4 pb-4 space-y-3">

              {/* Séquence */}
              <div className="flex flex-wrap gap-1.5">
                {results.map((r, i) => {
                  const cfg = OUTCOME_CONFIG[r.outcome];
                  return (
                    <div key={r.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black transition-all animate-in zoom-in-50 duration-150"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, boxShadow: cfg.glow }}>
                      {cfg.short}
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {OUTCOMES.map(outcome => {
                  const cfg = OUTCOME_CONFIG[outcome];
                  const n = stats[outcome] || 0;
                  const pct = results.length > 0 ? Math.round((n / results.length) * 100) : 0;
                  return (
                    <div key={outcome} className="rounded-xl p-2 text-center"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <div className="text-lg font-black" style={{ color: cfg.color }}>{n}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.color + '99' }}>{cfg.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{pct}%</div>
                    </div>
                  );
                })}
              </div>

              {/* Reset */}
              <button onClick={reset}
                className="w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-80 flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#8b8b94' }}>
                <RotateCcw size={10} /> Réinitialiser
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}