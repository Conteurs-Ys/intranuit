import { useEffect, useState } from 'react';
import { X, Feather, Eye, MapPin, Shield, Skull, Hourglass, Users, ScrollText, Target, Gauge, Droplet } from 'lucide-react';
import { feedingStatus } from '../../utils/feeding';
import StatePill from '../ui/StatePill';
import { dossierState, hasAnswers } from '../../utils/dossierState';
import { aipTypeLabel } from '../../utils/aipLabel';
import ExpensesTable from '../ui/ExpensesTable';
import { requiredLevel } from '../../utils/influenceRules';
import { Dots } from '../ui/ScoreField';
import RumorTable from '../ui/RumorTable';

const RUMOR_ACTIONS = ['La Rumeur', "Potins et délit d'initié"];
const pad = (n) => String(n).padStart(2, '0');

export function Tag({ children, icon: Icon, color = 'var(--night-text)' }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em]"
      style={{ background: 'rgba(255,240,235,0.05)', border: '1px solid var(--night-line)', color }}>
      {Icon && <Icon size={12} />}{children}
    </span>
  );
}

// Réponse du conteur, présentée comme une lettre scellée ; tant qu'elle n'est
// pas diffusée, une simple mention « en attente ».
export function Answer({ visible, text, light = false }) {
  if (!visible) {
    return (
      <div className="mt-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[12.5px]"
        style={{ border: '1px dashed var(--night-line-strong)', color: 'var(--night-faint)' }}>
        <Hourglass size={14} className="shrink-0" /> En attente de la réponse des conteurs.
      </div>
    );
  }
  return (
    <figure className="relative mt-4 rounded-2xl pl-5 pr-4 sm:pr-5 pt-5 pb-4 overflow-hidden"
      style={{
        background: light ? 'linear-gradient(135deg, rgba(229,72,79,0.08), transparent 60%), #faf8f5' : 'linear-gradient(135deg, rgba(229,72,79,0.13), rgba(229,72,79,0.03) 60%), var(--night-panel)',
        border: '1px solid rgba(229,72,79,0.28)',
        boxShadow: 'inset 0 1px 0 rgba(255,240,235,0.04)',
      }}>
      <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(to bottom, #e5484f, rgba(229,72,79,0.2))' }} />
      <figcaption className="flex items-center gap-2.5 mb-2.5">
        {/* Sceau du conteur */}
        <span className="relative w-7 h-7 flex items-center justify-center shrink-0">
          <span className="absolute inset-0.5 rotate-45 rounded-md" style={{ background: 'rgba(229,72,79,0.22)', border: '1px solid rgba(229,72,79,0.6)' }} />
          <Feather size={13} className="relative" style={{ color: light ? '#8e1c24' : '#ffd9d6' }} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: light ? '#8e1c24' : '#f58b90' }}>Réponse du conteur</span>
      </figcaption>
      <blockquote className="font-serif text-[15.5px] leading-[1.6] whitespace-pre-line" style={{ color: light ? '#39302e' : '#f3ebe7' }}>
        {text || "Les ombres n'ont rien révélé cette fois."}
      </blockquote>
    </figure>
  );
}

// Une rubrique de l'action : Où, Avec qui, L'action…
function Row({ icon: Icon, label, children }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[7.5rem_1fr] gap-3 items-baseline py-2.5" style={{ borderTop: '1px solid var(--night-line)' }}>
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--night-faint)' }}>
        {Icon && <Icon size={12} />} {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function People({ people, light = false }) {
  if (!people?.length) return <span className="text-[13px]" style={{ color: 'var(--night-faint)' }}>Personne d'autre</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {people.map(p => (
        <span key={p} className="px-2.5 py-0.5 rounded-full text-[12px] font-bold"
          style={{ background: 'rgba(229,72,79,0.14)', border: '1px solid rgba(229,72,79,0.3)', color: light ? '#8e1c24' : '#f7c4c6' }}>{p}</span>
      ))}
    </div>
  );
}

// Carte d'une action : en-tête, puis Où / Avec qui / L'action, puis la réponse.
export function ActionEntry({ number, label, tags, where, people, text, extraRows, children, index = 0 }) {
  return (
    <article className="rounded-2xl p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
      style={{ background: 'var(--night-panel-2)', border: '1px solid var(--night-line)', animationDelay: `${index * 60}ms` }}>
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <span className="font-serif italic text-[22px] leading-none mr-1" style={{ color: 'rgba(229,72,79,0.6)' }}>{number}</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] mr-1" style={{ color: 'var(--night-red)' }}>{label}</span>
        {tags}
      </div>
      {where !== undefined && (
        <Row icon={MapPin} label="Où">
          <span className="text-[14px] font-bold" style={{ color: 'var(--night-text)' }}>{where || '—'}</span>
        </Row>
      )}
      {people !== undefined && <Row icon={Users} label="Avec qui"><People people={people} /></Row>}
      {extraRows}
      <Row icon={ScrollText} label="L'action">
        <p className="font-serif text-[15px] leading-relaxed whitespace-pre-line" style={{ color: text ? 'var(--night-text)' : 'var(--night-faint)' }}>
          {text || 'Aucune description.'}
        </p>
      </Row>
      {children}
    </article>
  );
}

function AIPList({ aip, showAnswer }) {
  const base = (aip.actions || []).map((a, i) => ({ a, label: `Action ${i + 1}` }));
  const bonus = (aip.bonus || []).map(b => ({
    a: b,
    label: 'Action bonus',
  }));
  return (
    <div className="space-y-3 pt-5">
      {[...base, ...bonus].map(({ a, label }, i) => (
        <ActionEntry key={a.id ?? i} index={i} number={pad(i + 1)} label={label}
          tags={aipTypeLabel(a) && <Tag>{aipTypeLabel(a)}</Tag>} where={a.zone} people={a.people || []} text={a.description}
          extraRows={a.score && <Row icon={Gauge} label="Score"><span className="text-[14px] font-bold" style={{ color: "var(--night-text)" }}>{a.score}</span></Row>}>
          <Answer visible={showAnswer} text={a.response} />
        </ActionEntry>
      ))}
      {aip.expenses?.length > 0 && <section className="rounded-2xl p-4 space-y-3" style={{ border: '1px solid var(--night-line)' }}>
        <h3 className="font-serif italic font-bold text-lg" style={{ color: 'var(--night-text)' }}>Dépenses du personnage</h3>
        <ExpensesTable rows={aip.expenses} reviews={aip.expenseReviews} />
      </section>}
      {/* Anciens dossiers (avant le suivi du Troupeau) : pas de bilan, faute de données. */}
      {showAnswer && aip.feeding && (() => {
        const { blood } = feedingStatus(aip);
        return (
          <p className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[14px] font-serif italic"
            style={blood === 'half'
              ? { background: 'rgba(236,148,64,0.08)', border: '1px solid rgba(236,148,64,0.25)', color: '#e9c48a' }
              : { background: 'rgba(95,180,130,0.07)', border: '1px solid rgba(95,180,130,0.28)', color: '#a8dcbc' }}>
            <Droplet size={15} className="shrink-0" style={{ color: 'var(--night-red)' }} />
            {blood === 'half' ? 'Prochaine partie : moitié de ta réserve de sang (arrondie au supérieur).' : 'Prochaine partie : réserve de sang pleine.'}
          </p>
        );
      })()}
    </div>
  );
}

export const CATEGORY_COLOR = { gotha: '#ec9440', pegre: '#a995d8' };

function InfluenceList({ influence, showAnswer }) {
  let index = 0;
  return <div className="space-y-7 pt-5">{['gotha', 'pegre'].map(category => {
    const actions = (influence.actions || []).filter(a => category === 'gotha' ? a.category === 'gotha' : a.category !== 'gotha');
    if (!actions.length) return null;
    const Icon = category === 'gotha' ? Shield : Skull;
    return <section key={category} aria-label={`Influences ${category === 'gotha' ? 'Gotha' : 'Pègre'}`} className="space-y-3">
      <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] pb-2" style={{ color: CATEGORY_COLOR[category], borderBottom: '1px solid var(--night-line)' }}>
        <Icon size={14} />{category === 'gotha' ? 'Gotha' : 'Pègre'}
      </h3>
      {actions.map(a => {
    const i = index++;
    const level = a.actionType === 'globale' ? requiredLevel(a) : null;
    const name = level ? a.actionName.replace(/^[\s•·]+/, '').trim() : a.actionName || 'Action';
    const gotha = a.category === 'gotha';
    const color = CATEGORY_COLOR[a.category] || CATEGORY_COLOR.gotha;
    const isRumor = RUMOR_ACTIONS.includes(a.actionName);
    return (
      <ActionEntry key={a.id ?? i} index={i} number={pad(i + 1)} label={<span className="inline-flex items-center gap-2">
        {level && <span role="img" aria-label={`Niveau requis : ${level}`} title={`Niveau requis : ${level}`} className="inline-flex shrink-0"><Dots value={level} max={level} size={5} color={color} /></span>}
        <span>{name}</span>
      </span>} text={a.description}
        tags={<>
          <Tag icon={gotha ? Shield : Skull} color={color}>{gotha ? 'Gotha' : 'Pègre'}</Tag>
          <Tag color="var(--night-muted)">{a.actionType === 'ciblée' ? 'Ciblée' : 'Globale'}</Tag>
          <Tag color="var(--night-muted)">{a.actionsSpent || 1} pt{(a.actionsSpent || 1) > 1 ? 's' : ''}{a.specialization ? ` · ${a.specialization}` : ''}</Tag>
        </>}
        extraRows={a.influenceName && (
          <Row icon={Target} label={a.actionType === 'ciblée' ? 'Cible' : 'Réseau'}>
            <span className="text-[14px] font-bold" style={{ color: 'var(--night-text)' }}>{a.influenceName}</span>
          </Row>
        )}>
        <Answer visible={showAnswer} text={a.response} />
        {showAnswer && isRumor && (a.rumorTable?.length > 0 || a.rumorCoveredSpecs?.length > 0) && (
          <div className="mt-3"><RumorTable rows={a.rumorTable} specs={a.rumorCoveredSpecs} /></div>
        )}
        {showAnswer && a.rumorNarrative && (
          <p className="mt-3 font-serif italic text-[15px]" style={{ color }}>{a.rumorNarrative}</p>
        )}
      </ActionEntry>
    );
  })}
    </section>;
  })}</div>;
}

const TABS = [{ id: 'aip', label: 'AIP', icon: Feather }, { id: 'influence', label: 'Influences', icon: Eye }];

export default function DossierDetail({ aip, influence, defaultView = 'aip', onClose }) {
  const [view, setView] = useState(defaultView);
  const [direction, setDirection] = useState(1);
  const switchTo = (next) => {
    if (next === view) return;
    setDirection(next === 'influence' ? 1 : -1);
    setView(next);
  };
  const current = view === 'aip' ? aip : influence;
  const showAnswer = hasAnswers(current);
  const meta = current || aip || influence;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-in fade-in duration-200" style={{ background: 'rgba(12,8,10,0.72)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <section className="sheet-up relative w-full sm:max-w-2xl max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl sm:animate-in sm:fade-in sm:zoom-in-95 sm:duration-300"
        style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line-strong)', boxShadow: '0 30px 90px rgba(0,0,0,0.45)' }}>
        <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ background: 'var(--night-line-strong)' }} />

        <header className="px-6 sm:px-8 pt-7 pb-5" style={{ borderBottom: '1px solid var(--night-line)' }}>
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--night-red)' }}>{meta?.monthLabel}</p>
              <h2 className="font-serif italic font-bold text-[28px] leading-tight mt-1" style={{ color: 'var(--night-text)' }}>{meta?.characterName}</h2>
              {current && <div className="mt-2.5"><StatePill dossier={current} /></div>}
            </div>
            <button onClick={onClose} aria-label="Fermer"
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(255,240,235,0.06)]"
              style={{ border: '1px solid var(--night-line-strong)', color: 'var(--night-muted)' }}>
              <X size={17} />
            </button>
          </div>
          {/* Bascule AIP / Influences : la pastille glisse d'un onglet à l'autre */}
          <div className="relative grid grid-cols-2 p-1 mt-5 rounded-full w-full sm:w-72" style={{ background: 'var(--night-input)', border: '1px solid var(--night-line)' }}>
            <span aria-hidden className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-500"
              style={{
                transform: view === 'aip' ? 'translateX(0)' : 'translateX(100%)',
                transitionTimingFunction: 'cubic-bezier(0.22, 0.8, 0.24, 1)',
                background: 'linear-gradient(180deg, #c8474e, #861c23)',
                boxShadow: '0 6px 18px -8px rgba(200,71,78,0.8)',
              }} />
            {TABS.map(t => (
              <button key={t.id} onClick={() => switchTo(t.id)} aria-pressed={view === t.id}
                className="relative z-10 flex items-center justify-center gap-1.5 h-9 rounded-full text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-300"
                style={{ color: view === t.id ? '#fff4f2' : 'var(--night-muted)' }}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
        </header>

        <div key={view}
          className={`flex-1 overflow-y-auto overflow-x-hidden px-6 sm:px-8 pb-6 animate-in fade-in duration-300 ${direction > 0 ? 'slide-in-from-right-6' : 'slide-in-from-left-6'}`}
          style={{ animationTimingFunction: 'cubic-bezier(0.22, 0.8, 0.24, 1)' }}>
          {view === 'aip' && (aip
            ? <AIPList aip={aip} showAnswer={showAnswer} />
            : <p className="py-14 text-center font-serif italic" style={{ color: 'var(--night-faint)' }}>Aucune AIP pour ce cycle.</p>)}
          {view === 'influence' && (influence?.actions?.length
            ? <InfluenceList influence={influence} showAnswer={showAnswer} />
            : <p className="py-14 text-center font-serif italic" style={{ color: 'var(--night-faint)' }}>Aucune influence pour ce cycle.</p>)}
        </div>
      </section>
    </div>
  );
}

