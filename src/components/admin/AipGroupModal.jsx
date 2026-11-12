import { useEffect, useMemo, useState } from 'react';
import { Layers, X, Users, Gauge, MapPin, Unlink, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDialogs } from '../../context/DialogContext';
import { aipTypeLabel } from '../../utils/aipLabel';
import { rowKey } from '../../utils/aipGroups';

// Vue d'un groupe : toutes les AIP côte à côte, une sentence commune à appliquer
// et/ou une sentence par AIP. Les sentences sont écrites dans le dossier de chaque
// joueur ; le groupe lui-même reste invisible des joueurs.
export default function AipGroupModal({ group, rows, color, onClose, onUpdateGroup, onRemoveMember, onDissolve, onWriteResponses }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const { confirmAction } = useDialogs();
  const [title, setTitle] = useState(group.title || '');
  const [shared, setShared] = useState(group.sharedResponse || '');
  const [drafts, setDrafts] = useState(() => Object.fromEntries(rows.map(r => [rowKey(r), r.response || ''])));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Une sentence modifiée ailleurs (tableau) remonte ici si elle n'est pas en cours d'édition.
  useEffect(() => {
    setDrafts(d => Object.fromEntries(rows.map(r => [rowKey(r), d[rowKey(r)] ?? r.response ?? ''])));
  }, [rows]);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const changed = useMemo(() => rows.filter(r => (drafts[rowKey(r)] ?? '') !== (r.response || '')), [rows, drafts]);
  const box = { background: light ? '#faf8f5' : 'var(--night-input)', border: `1px solid ${theme.borderStrong}`, color: theme.textPrimary };
  const red = light ? '#a5222a' : '#e5484f';

  const applyShared = async () => {
    const text = shared.trim();
    if (!text) return;
    const filled = rows.filter(r => (drafts[rowKey(r)] || '').trim() && drafts[rowKey(r)].trim() !== text);
    if (filled.length && !await confirmAction({ title: 'Appliquer la sentence commune', message: `${filled.length} AIP ont déjà une sentence. La remplacer par la sentence commune ?` })) return;
    setDrafts(Object.fromEntries(rows.map(r => [rowKey(r), text])));
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const fields = {};
      if (title.trim() !== (group.title || '')) fields.title = title.trim() || 'Groupe sans titre';
      if (shared !== (group.sharedResponse || '')) fields.sharedResponse = shared;
      if (Object.keys(fields).length) await onUpdateGroup(fields);
      if (changed.length) await onWriteResponses(changed.map(r => ({ row: r, response: drafts[rowKey(r)] })));
      setSaved(true);
    } finally { setSaving(false); }
  };

  const dissolve = async () => {
    if (await confirmAction({ title: 'Défaire le groupe', message: 'Les AIP restent dans le tableau avec leurs sentences ; seul le regroupement disparaît.', danger: true })) onDissolve();
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={`Groupe ${group.title}`}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ background: light ? '#faf8f5' : 'var(--night-panel)', border: `1px solid ${color}44`, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <header className="flex items-start gap-3 px-5 sm:px-7 pt-5 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}44`, color }}><Layers size={16} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>Groupe · {rows.length} AIP · {group.monthLabel}</div>
            <input value={title} onChange={e => setTitle(e.target.value)} aria-label="Titre du groupe"
              className="w-full bg-transparent outline-none font-serif text-[24px] italic font-bold" style={{ color: theme.textPrimary }} />
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg" style={{ color: theme.textSecondary }}><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
          <section className="rounded-2xl p-4 space-y-2" style={{ background: `${color}0a`, border: `1px solid ${color}33` }}>
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color }} htmlFor="shared-response">Sentence commune</label>
            <textarea id="shared-response" value={shared} onChange={e => setShared(e.target.value)} rows={3}
              placeholder="Ce que tous découvrent ensemble… (puis « Appliquer à toutes », et ajustez chaque AIP si besoin)"
              className="w-full rounded-xl px-3.5 py-3 font-serif text-[15px] leading-relaxed outline-none resize-y placeholder:opacity-50" style={box} />
            <button type="button" onClick={applyShared} disabled={!shared.trim()}
              className="px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-40" style={{ color, border: `1px solid ${color}55` }}>
              Appliquer à toutes les AIP
            </button>
          </section>

          <ol className="grid gap-3 lg:grid-cols-2">
            {rows.map(r => {
              const key = rowKey(r);
              return (
                <li key={key} className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-serif italic font-bold text-[17px]" style={{ color: theme.textPrimary }}>{r.characterName}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] mt-0.5" style={{ color: r.isPlayer ? theme.textSecondary : red }}>
                        {r.isPlayer ? 'Joueur' : 'PNJ'} · {aipTypeLabel(r) || 'Sans type'}
                      </div>
                    </div>
                    <button type="button" onClick={() => onRemoveMember(key)} title="Retirer du groupe" aria-label={`Retirer l'AIP de ${r.characterName} du groupe`}
                      className="p-1.5 rounded-md shrink-0" style={{ color: theme.textSecondary }}><Unlink size={13} /></button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: theme.textSecondary }}>
                    {r.zone && <span className="flex items-center gap-1"><MapPin size={11} /> {r.zone}</span>}
                    {r.people?.length > 0 && <span className="flex items-center gap-1"><Users size={11} /> {r.people.join(', ')}</span>}
                    {r.score && <span className="flex items-center gap-1"><Gauge size={11} /> {r.score}</span>}
                  </div>
                  <p className="font-serif text-[14.5px] leading-relaxed" style={{ color: r.description ? theme.textPrimary : theme.textMuted }}>{r.description || 'Pas de description.'}</p>
                  {r.intention && <p className="font-serif italic text-[13.5px]" style={{ color: theme.textSecondary }}>Intention : {r.intention}</p>}
                  <textarea value={drafts[key] ?? ''} onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))} rows={3}
                    aria-label={`Sentence pour ${r.characterName}`} placeholder="Sentence pour cette AIP…"
                    className="mt-auto w-full rounded-xl px-3 py-2.5 font-serif text-[14.5px] leading-relaxed outline-none resize-y placeholder:opacity-50" style={box} />
                </li>
              );
            })}
          </ol>
          {rows.length === 0 && <p className="text-center font-serif italic" style={{ color: theme.textMuted }}>Ce groupe ne contient plus d’AIP de ce cycle.</p>}
        </div>

        <footer className="flex flex-wrap items-center gap-3 px-5 sm:px-7 py-4" style={{ borderTop: `1px solid ${theme.border}` }}>
          <button type="button" onClick={dissolve} className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>Défaire le groupe</button>
          {saved && !changed.length && <span role="status" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: light ? '#276344' : '#9fd8b8' }}><Check size={13} /> Enregistré</span>}
          <button type="button" onClick={save} disabled={saving}
            className="ml-auto px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, rgba(139,38,53,.75), rgba(86,26,36,.92))', color: '#ecbcc6' }}>
            {saving ? 'Enregistrement…' : changed.length ? `Enregistrer (${changed.length} sentence${changed.length > 1 ? 's' : ''})` : 'Enregistrer'}
          </button>
        </footer>
      </div>
    </div>
  );
}
