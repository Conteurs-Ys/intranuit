import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useTheme } from './ThemeContext';

const DialogContext = createContext(null);

function ThemedDialog({ dialog, onClose }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const { title, message, danger, notice, confirmLabel } = dialog.options;
  const color = light ? '#a5222a' : '#e5484f';
  const Icon = danger ? AlertTriangle : Info;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('[data-initial-focus]')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(false); }
      if (event.key !== 'Tab') return;
      const buttons = [...(ref.current?.querySelectorAll('button:not(:disabled)') || [])];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => { if (dialog.returnFocus?.isConnected) dialog.returnFocus.focus(); });
    };
  }, [dialog, onClose]);

  return createPortal(<div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose(false); }}>
    <section ref={ref} role={danger ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      className="w-full max-w-md rounded-2xl p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-200"
      style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${danger ? `${color}55` : theme.borderStrong}`, boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
      <header className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(229,72,79,0.1)', color }}><Icon size={15} /></span>
        <h2 id={titleId} className="flex-1 min-w-0 font-serif font-bold italic text-[24px] leading-tight" style={{ color: theme.textPrimary }}>{title}</h2>
        <button type="button" onClick={() => onClose(false)} aria-label="Fermer la fenêtre" className="p-1 rounded-lg" style={{ color: theme.textMuted }}><X size={16} /></button>
      </header>
      <p id={descriptionId} className="mt-4 text-[14px] leading-relaxed whitespace-pre-line break-words" style={{ color: theme.textSecondary }}>{message}</p>
      <footer className="mt-6 pt-4 flex flex-wrap justify-end gap-3" style={{ borderTop: `1px solid ${theme.border}` }}>
        {!notice && <button type="button" data-initial-focus onClick={() => onClose(false)} className="px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary, border: `1px solid ${theme.borderStrong}` }}>Annuler</button>}
        <button type="button" data-initial-focus={notice ? '' : undefined} onClick={() => onClose(true)}
          className="px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: light ? '#a5222a' : '#fca5a5', background: 'rgba(153,27,27,0.14)', border: '1px solid rgba(185,28,28,0.5)' }}>{confirmLabel || (notice ? 'Fermer' : danger ? 'Supprimer' : 'Confirmer')}</button>
      </footer>
    </section>
  </div>, document.body);
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const active = useRef(null);
  const queue = useRef([]);
  const nextId = useRef(0);
  const showNext = useCallback(() => {
    if (active.current || !queue.current.length) return;
    const next = queue.current.shift();
    next.returnFocus = document.activeElement;
    active.current = next;
    setDialog(next);
  }, []);
  const open = useCallback(options => new Promise(resolve => {
    queue.current.push({ id: ++nextId.current, options, resolve });
    showNext();
  }), [showNext]);
  const close = useCallback(result => {
    const current = active.current;
    if (!current) return;
    active.current = null;
    setDialog(null);
    current.resolve(Boolean(result));
    showNext();
  }, [showNext]);
  useEffect(() => () => {
    active.current?.resolve(false);
    queue.current.forEach(item => item.resolve(false));
    active.current = null;
    queue.current = [];
  }, []);
  const confirmAction = useCallback(options => open({ title: 'Confirmation', ...options }), [open]);
  const showNotice = useCallback((message, title = 'Information') => open({ title, message, notice: true }), [open]);
  const api = useMemo(() => ({ confirmAction, showNotice }), [confirmAction, showNotice]);
  return <DialogContext.Provider value={api}>
    <div inert={Boolean(dialog)} aria-hidden={dialog ? true : undefined}>{children}</div>
    {dialog && <ThemedDialog key={dialog.id} dialog={dialog} onClose={close} />}
  </DialogContext.Provider>;
}

export function useDialogs() {
  const dialogs = useContext(DialogContext);
  if (!dialogs) throw new Error('Les fenêtres de dialogue nécessitent DialogProvider.');
  return dialogs;
}
