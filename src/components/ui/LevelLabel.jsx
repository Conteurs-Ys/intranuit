import { Sparkles } from 'lucide-react';

// Libellé d'une action globale avec son niveau en chiffre et en petits points
// (« 2 ●● La Rumeur »). `reach` marque l'action du niveau au-dessus, accessible
// avec la bonne spécialité (+1 niveau) : dernier point en contour et pastille.
export default function LevelLabel({ level, name, reach = false, color = '#f58b90' }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
      <span className="tabular-nums font-bold w-4 text-right shrink-0">{level}</span>
      <span className="flex items-center gap-[3px] shrink-0" aria-hidden>
        {Array.from({ length: level }, (_, i) => (
          <span key={i} className="w-[5px] h-[5px] rounded-full"
            style={i === level - 1 && reach
              ? { border: `1px solid ${color}`, background: 'transparent' }
              : { background: color }} />
        ))}
      </span>
      <span className="truncate">{name}</span>
      {reach && (
        <span title="Accessible si l'action correspond à une de tes spécialités"
          className="inline-flex items-center gap-1 shrink-0 px-1.5 py-[3px] rounded-md text-[9.5px] font-bold uppercase tracking-[0.08em] leading-none"
          style={{ background: `${color}1f`, border: `1px solid ${color}45`, color }}>
          <Sparkles size={9} /> +1 spécialité
        </span>
      )}
    </span>
  );
}

// Texte brut équivalent, pour la recherche au clavier dans les menus.
export const levelText = (level, name) => `${level} ${name}`;
