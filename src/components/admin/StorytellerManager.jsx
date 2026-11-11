import React, { useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import useStorytellers from '../../hooks/useStorytellers';
import { useTheme } from '../../context/ThemeContext';

const PRESET_COLORS = [
  '#b91c1c', '#1d4ed8', '#047857', '#7e22ce',
  '#b45309', '#0e7490', '#be185d', '#15803d',
  '#ea580c', '#4f46e5', '#0284c7', '#65a30d',
];

export default function StorytellerManager() {
  const { theme } = useTheme();
  const { storytellers, addStoryteller, removeStoryteller, updateColor } = useStorytellers();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ pseudo: '', color: PRESET_COLORS[0] });
  const isLight = theme.name === 'light';

  const handleAdd = async () => {
    if (!form.pseudo) return;
    await addStoryteller(form);
    setForm({ pseudo: '', color: PRESET_COLORS[0] });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-black italic flex items-center gap-3" style={{ color: theme.textPrimary }}>
          <Shield size={18} className="text-red-900" /> Conteurs
        </h2>
        <button onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
          style={{ background: isLight ? '#1c1917' : '#f4f4f5', color: isLight ? '#f4f4f5' : '#000' }}>
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {isAdding && (
        <div className="p-6 rounded-2xl space-y-6 animate-in zoom-in-95"
          style={{ background: theme.bgPanel, border: `1px solid ${theme.border}` }}>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.textMuted }}>Pseudo du conteur</label>
            <input value={form.pseudo} onChange={e => setForm({ ...form, pseudo: e.target.value })}
              className="w-full rounded-xl py-3 px-4 text-sm outline-none font-serif italic transition-colors"
              style={{
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
              }}
              placeholder="Nom du conteur..." />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.textMuted }}>Couleur</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className="w-8 h-8 rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? (isLight ? '#000' : '#fff') : 'transparent',
                    transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                  }} />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-6 h-6 rounded-md" style={{ backgroundColor: form.color }} />
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                className="bg-transparent border-none outline-none cursor-pointer h-8" />
              <span className="text-[10px] font-mono" style={{ color: theme.textMuted }}>{form.color}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
            <button onClick={handleAdd}
              className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80"
              style={{ background: 'rgba(127,29,29,0.15)', color: '#f87171', border: '1px solid rgba(127,29,29,0.3)' }}>
              Ajouter
            </button>
            <button onClick={() => setIsAdding(false)}
              className="px-6 py-2 text-[9px] font-black uppercase tracking-widest transition-colors hover:text-zinc-400"
              style={{ color: theme.textMuted }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {storytellers.length === 0 && (
          <p className="text-center py-10 font-serif italic text-sm rounded-2xl border-dashed border-2"
            style={{ color: theme.textDim, borderColor: theme.border }}>
            Aucun conteur enregistré.
          </p>
        )}
        {storytellers.map(st => (
          <div key={st.id}
            className="flex items-center justify-between rounded-xl px-5 py-4 group transition-all"
            style={{ background: theme.bgPanel, border: `1px solid ${theme.border}` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}>
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: st.color, boxShadow: `0 0 8px ${st.color}` }} />
              <span className="font-serif italic font-black" style={{ color: theme.textPrimary }}>{st.pseudo}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => updateColor(st.id, c)}
                    className="w-4 h-4 rounded-sm opacity-0 group-hover:opacity-100 transition-all"
                    style={{
                      backgroundColor: c,
                      outline: st.color === c ? `2px solid ${isLight ? '#000' : '#fff'}` : 'none',
                      outlineOffset: '1px',
                    }} />
                ))}
              </div>
              <button onClick={() => removeStoryteller(st.id)}
                className="transition-colors opacity-0 group-hover:opacity-100 ml-2 hover:text-red-600"
                style={{ color: theme.textDim }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}