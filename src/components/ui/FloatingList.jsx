import { forwardRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 6;
const MAX_HEIGHT = 256;

// Liste déroulante rendue au niveau de la page (portail), pour ne jamais être
// coupée par une carte qui masque son contenu. Elle suit son ancre au défilement
// et s'ouvre vers le haut quand la place manque en dessous.
const FloatingList = forwardRef(function FloatingList({ anchorRef, children, className = '', style, minWidth = 0, ...props }, ref) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - GAP;
      const above = r.top - GAP;
      const up = below < Math.min(MAX_HEIGHT, 180) && above > below;
      const width = Math.max(r.width, minWidth);
      // Le portail sort de la fenêtre parente : reprendre son niveau de
      // superposition pour que les options restent devant les modales.
      let zIndex = 200;
      for (let parent = anchorRef.current; parent; parent = parent.parentElement) {
        const layer = Number.parseInt(window.getComputedStyle(parent).zIndex, 10);
        if (Number.isFinite(layer)) zIndex = Math.max(zIndex, layer + 1);
      }
      setPos({
        zIndex,
        left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
        width,
        maxHeight: Math.max(120, Math.min(MAX_HEIGHT, (up ? above : below) - 8)),
        ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
        up,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [anchorRef, minWidth]);

  if (!pos) return null;
  const { up, ...box } = pos;
  return createPortal(
    <ul ref={ref} {...props}
      className={`fixed z-[200] overflow-y-auto rounded-xl p-1.5 animate-in fade-in duration-200 ${up ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'} ${className}`}
      style={{
        ...box,
        background: 'rgba(24,18,21,0.98)',
        border: '1px solid var(--night-line-strong)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(229,72,79,0.06)',
        backdropFilter: 'blur(12px)',
        ...style,
      }}>
      {children}
    </ul>,
    document.body,
  );
});

export default FloatingList;
