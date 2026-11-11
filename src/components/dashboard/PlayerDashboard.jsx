import { useMemo, useState } from 'react';
import { Feather, Eye, ChevronRight, ArrowRight, Download, BookOpen, History, Moon, Check, Users, Shield, Skull, Archive, Landmark, Flag, Compass } from 'lucide-react';
import StatePill from '../ui/StatePill';
import { dossierState } from '../../utils/dossierState';
import { aipTypeLabel } from '../../utils/aipLabel';
import { clanStyle } from '../../constants/clans';
import { deadlineText, isCycleOpen } from '../../utils/cycle';
import { CATEGORY_COLOR } from './DossierDetail';

const MONTHS_ORDER = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const allAIPActions = (aip) => [...(aip?.actions || []), ...(aip?.bonus || [])];
const spent = (inf, cat) => (inf?.actions || []).filter(a => a.category === cat).reduce((n, a) => n + (Number(a.actionsSpent) || 1), 0);

const RECENT = 4;
const SECT_ICONS = { Camarilla: Landmark, Anarch: Flag, Sabbat: Skull, 'Indépendant': Compass };
const PANEL = { background: 'var(--night-panel)', border: '1px solid var(--night-line)' };

// Bouton principal (rouge sombre, comme la connexion) ou secondaire (contour discret).
export function RedButton({ children, onClick, variant = 'primary', disabled, type = 'button', className = '' }) {
  const primary = variant === 'primary';
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`group inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-[11px] font-bold uppercase tracking-[0.16em] transition-[filter,background-color,border-color] duration-200 hover:brightness-125 disabled:opacity-40 disabled:pointer-events-none ${className}`}
      style={primary
        ? { background: 'linear-gradient(135deg, rgba(153,27,27,0.75), rgba(100,10,10,0.92))', border: '1px solid rgba(185,28,28,0.45)', color: '#fca5a5' }
        : { background: 'transparent', border: '1px solid var(--night-line-strong)', color: 'var(--night-text)' }}>
      {children}
    </button>
  );
}

// Carte du personnage, aux couleurs de son clan.
function CharacterCard({ character, cycle }) {
  const hour = new Date().getHours();
  const greeting = hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';
  const clan = clanStyle(character?.clan);
  const ClanIcon = clan.icon;
  const c = clan.color;
  const SectIcon = SECT_ICONS[character?.sect] || Landmark;
  const plates = [
    { label: 'Secte', value: character?.sect || '—', icon: SectIcon },
    { label: 'Cycle', value: cycle?.label, icon: Moon },
  ];
  return (
    <section className="group/banner relative overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{
        '--clan-glow': `${c}55`,
        background: `radial-gradient(55% 120% at 9% 50%, ${c}26, transparent 70%), linear-gradient(180deg, rgba(255,240,235,0.025), transparent), var(--night-panel)`,
        border: '1px solid var(--night-line)',
      }}>
      {/* Reflet qui balaie la carte à l'arrivée */}
      <div className="banner-sheen absolute inset-y-0 left-0 w-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,240,235,0.06), transparent)' }} />
      {/* Filet de la couleur du clan en bas de carte */}
      <div className="absolute inset-x-8 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c}aa, transparent)` }} />

      <div className="relative flex items-center gap-5 sm:gap-7 px-5 py-6 sm:px-8 sm:py-7">
        {/* Blason : losange qui respire, halos qui tournent lentement, braises */}
        <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0 flex items-center justify-center">
          <span className="crest-spin absolute inset-0 rounded-2xl" style={{ border: `1px dashed ${c}30` }} />
          <span className="crest-spin-rev absolute inset-[11%] rounded-xl" style={{ border: `1px solid ${c}45` }} />
          <span className="crest-breathe absolute inset-[23%] rotate-45 rounded-lg"
            style={{ background: `linear-gradient(135deg, ${c}45, ${c}12)`, border: `1px solid ${c}a0` }} />
          {[[-14, 0, -4], [6, 1.6, 5], [14, 3.1, -6], [-4, 2.3, 8]].map(([x, delay, dx], i) => (
            <span key={i} className="ember absolute bottom-[30%] w-1 h-1 rounded-full pointer-events-none"
              style={{ left: `calc(50% + ${x}px)`, '--dx': `${dx}px`, animationDelay: `${delay}s`, background: c, boxShadow: `0 0 6px ${c}` }} />
          ))}
          <ClanIcon size={24} strokeWidth={1.7} className="relative transition-transform duration-500 group-hover/banner:scale-110"
            style={{ color: '#fff3f1', filter: `drop-shadow(0 0 6px ${c})` }} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ color: c }}>
            {character?.clan ? `Clan ${character.clan}` : 'Sans clan'}
          </p>
          <h1 className="font-serif italic font-bold text-[28px] sm:text-[36px] leading-[1.1] mt-1 truncate" style={{ color: 'var(--night-text)' }}>
            {character?.name || character?.pseudo}
          </h1>
          <p className="font-serif italic text-[15px] mt-1.5" style={{ color: 'var(--night-muted)' }}>
            {greeting}{character?.pseudo ? `, ${character.pseudo}` : ''}
            {character?.sect && <span className="md:hidden"> · {character.sect}</span>}
          </p>
        </div>

        <dl className="hidden md:block shrink-0 relative rounded-2xl px-5 py-1 animate-in fade-in slide-in-from-right-3 fill-mode-both duration-700"
          style={{
            animationDelay: '250ms',
            background: `linear-gradient(160deg, ${c}14, rgba(255,240,235,0.015) 60%)`,
            boxShadow: `inset 0 0 0 1px ${c}26, 0 10px 30px -18px ${c}80`,
          }}>
          {plates.map(({ label, value, icon: Icon }, i) => (
            <div key={label} className="relative flex items-center gap-3.5 py-3">
              {i > 0 && <span className="absolute -top-px left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c}55, transparent)` }} />}
              <span className="relative w-7 h-7 flex items-center justify-center shrink-0">
                <span className="absolute inset-0.5 rotate-45 rounded-[5px]" style={{ background: `${c}1f`, border: `1px solid ${c}70` }} />
                <Icon size={13} className="relative" style={{ color: '#fff0ee' }} />
              </span>
              <span className="leading-tight min-w-[7.5rem]">
                <dt className="text-[9px] font-bold uppercase tracking-[0.24em]" style={{ color: c }}>{label}</dt>
                <dd className="font-serif italic text-[17px] whitespace-nowrap mt-0.5" style={{ color: 'var(--night-text)' }}>{value}</dd>
              </span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// Contenu du bloc AIP : un emplacement par action, coché quand il est décrit.
function AIPSlots({ aip }) {
  const actions = aip ? allAIPActions(aip) : [{}, {}, {}];
  return (
    <ul className="space-y-1.5">
      {actions.map((a, i) => {
        const done = Boolean(a.description?.trim());
        return (
          <li key={a.id ?? i} className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={done
              ? { background: 'rgba(255,240,235,0.035)', border: '1px solid var(--night-line)' }
              : { border: '1px dashed var(--night-line-strong)' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={done ? { background: 'rgba(110,190,150,0.16)', color: '#9fd8b8' } : { border: '1px solid var(--night-line-strong)', color: 'var(--night-faint)' }}>
              {done ? <Check size={12} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
            </span>
            <span className="min-w-0 flex-1 text-[13px] truncate" style={{ color: done ? 'var(--night-text)' : 'var(--night-faint)' }}>
              {done ? <><span className="font-bold">{aipTypeLabel(a)}</span>{a.zone && <span style={{ color: 'var(--night-muted)' }}> · {a.zone}</span>}</> : 'À décrire'}
            </span>
            {done && a.people?.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] shrink-0" style={{ color: '#f7c4c6' }}><Users size={12} /> {a.people.length}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Contenu du bloc Influences : une jauge par réseau, puis les actions.
function InfluenceSummary({ influence }) {
  const g = spent(influence, 'gotha');
  const p = spent(influence, 'pegre');
  const max = Math.max(g + p, 1);
  const names = (influence?.actions || []).map(a => ({ name: a.actionName, cat: a.category }));
  return (
    <div className="space-y-3">
      {[['Gotha', g, CATEGORY_COLOR.gotha, Shield], ['Pègre', p, CATEGORY_COLOR.pegre, Skull]].map(([label, value, color, Icon]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-[12px] mb-1.5">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[10.5px]" style={{ color }}><Icon size={12} /> {label}</span>
            <span style={{ color: value ? 'var(--night-text)' : 'var(--night-faint)' }}>{value} point{value > 1 ? 's' : ''}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,240,235,0.06)' }}>
            <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(value / max) * 100}%`, background: color, boxShadow: `0 0 10px ${color}80` }} />
          </div>
        </div>
      ))}
      {names.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {names.slice(0, 4).map((n, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: `${CATEGORY_COLOR[n.cat] || CATEGORY_COLOR.gotha}1f`, color: CATEGORY_COLOR[n.cat] || CATEGORY_COLOR.gotha }}>{n.name}</span>
          ))}
          {names.length > 4 && <span className="text-[11px] self-center" style={{ color: 'var(--night-faint)' }}>+{names.length - 4}</span>}
        </div>
      ) : (
        <p className="text-[12.5px] pt-1" style={{ color: 'var(--night-faint)' }}>Aucune action : 1 point d’influence = 1 action.</p>
      )}
    </div>
  );
}

function DossierCard({ kind, dossier, onOpen, onView, delay, locked = false }) {
  const isAIP = kind === 'aip';
  const state = dossierState(dossier);
  // Cycle en pause : on consulte, on ne modifie plus.
  const editable = state.editable && !locked;
  const accent = isAIP ? '#e5484f' : '#ec9440';
  const Icon = isAIP ? Feather : Eye;
  const actions = allAIPActions(dossier);
  const described = actions.filter(a => a.description?.trim()).length;
  const cta = !dossier ? 'Consigner' : editable ? 'Modifier' : 'Consulter';

  return (
    <article className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 flex flex-col transition-all duration-300 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
      style={{
        animationDelay: `${delay}ms`,
        background: `linear-gradient(160deg, ${accent}14, var(--night-panel) 45%)`,
        border: `1px solid ${dossier ? 'var(--night-line)' : accent + '45'}`,
      }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}45`, color: accent }}>
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif italic font-bold text-[20px] leading-tight" style={{ color: 'var(--night-text)' }}>
            {isAIP ? 'Mes AIP' : 'Mes influences'}
          </h2>
          <p className="text-[11.5px]" style={{ color: 'var(--night-faint)' }}>
            {isAIP ? (dossier ? `${described} / ${actions.length} actions décrites` : 'Actions entre deux parties') : 'Gotha et Pègre'}
          </p>
        </div>
        <StatePill state={state} />
      </div>

      <div className="flex-1">{isAIP ? <AIPSlots aip={dossier} /> : <InfluenceSummary influence={dossier} />}</div>

      <div className="mt-5 pt-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--night-line)' }}>
        <span className="text-[11.5px]" style={{ color: 'var(--night-faint)' }}>
          {locked ? 'Cycle en pause' : state.editable ? 'Modifiable jusqu’au verrouillage du cycle' : state.key === 'answered' ? 'Les conteurs ont répondu' : 'Les conteurs traitent ton dossier'}
        </span>
        <RedButton variant={!dossier ? 'primary' : 'secondary'} onClick={editable ? onOpen : onView}>
          {cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </RedButton>
      </div>
    </article>
  );
}

function HistoryRow({ monthLabel, aip, influence, onOpen, index }) {
  const [month, year] = monthLabel.split(' ');
  const count = allAIPActions(aip).length;
  const influenceCount = (influence?.actions || []).length;
  const answered = [aip, influence].some(d => d?.status === 'completed');
  return (
    <button type="button" onClick={onOpen}
      className="group w-full grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[6rem_1fr_auto_auto] items-center gap-4 px-4 sm:px-5 py-4 text-left transition-colors duration-300 hover:bg-[rgba(224,82,90,0.05)] animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
      style={{ borderTop: index ? '1px solid var(--night-line)' : 'none', animationDelay: `${index * 50}ms` }}>
      <span className="leading-tight">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--night-red)' }}>{month}</span>
        <span className="block text-[12px] mt-0.5" style={{ color: 'var(--night-faint)' }}>{year}</span>
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          {aip && (
            <span className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg text-[12px] font-bold"
              style={{ background: 'rgba(229,72,79,0.1)', border: '1px solid rgba(229,72,79,0.25)', color: '#f7c4c6' }}>
              <Feather size={12} style={{ color: '#e5484f' }} /> {count} AIP
            </span>
          )}
          {influence && (
            <span className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg text-[12px] font-bold"
              style={{ background: 'rgba(236,148,64,0.1)', border: '1px solid rgba(236,148,64,0.25)', color: '#f5d2ad' }}>
              <Eye size={12} style={{ color: '#ec9440' }} /> {influenceCount} influence{influenceCount > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] mt-1.5" style={{ color: answered ? '#9fd8b8' : 'var(--night-faint)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: answered ? '#9fd8b8' : 'var(--night-faint)' }} />
          {answered ? 'Les conteurs ont répondu' : 'En attente de réponse'}
        </span>
      </span>
      <span className="hidden sm:block">
        <StatePill state={answered ? dossierState({ status: 'completed' }) : dossierState(aip || influence)} />
      </span>
      <span className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5"
        style={{ border: '1px solid var(--night-line-strong)', color: 'var(--night-red)' }}>
        <ChevronRight size={15} />
      </span>
    </button>
  );
}

export default function PlayerDashboard({
  character, cycle, currentAIP, currentInfluence, myAIPs, myInfluences,
  onEditAIP, onEditInfluence, onOpenDetail, onOpenArchives, onOpenRequests, onExportAIP, onExportInfluences,
}) {
  // Les cycles les plus récents, toutes années confondues (le filtre par année est dans les Archives).
  const months = useMemo(() => {
    const key = (d) => (d.year || 0) * 100 + MONTHS_ORDER.indexOf((d.monthLabel || '').split(' ')[0]);
    const byLabel = new Map();
    for (const d of [...myAIPs, ...myInfluences]) if (d.monthLabel) byLabel.set(d.monthLabel, key(d));
    return [...byLabel.entries()].sort((x, y) => y[1] - x[1]).map(([label]) => label);
  }, [myAIPs, myInfluences]);

  const open = isCycleOpen(cycle);

  return (
    <div className="space-y-8">
      <CharacterCard character={character} cycle={cycle} />

      <section>
        {!open && (
          <p className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl text-[14px] font-serif italic"
            style={{ background: 'rgba(255,240,235,0.04)', border: '1px solid var(--night-line-strong)', color: 'var(--night-muted)' }}>
            <Moon size={15} className="shrink-0" style={{ color: 'var(--night-red)' }} />
            Pas d’actions ce cycle : les conteurs ont mis les inter-parties en pause.
          </p>
        )}
        {(open || currentAIP || currentInfluence) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(open || currentAIP) && <DossierCard kind="aip" dossier={currentAIP} delay={80} locked={!open}
              onOpen={onEditAIP} onView={() => onOpenDetail(currentAIP, currentInfluence, 'aip')} />}
            {(open || currentInfluence) && <DossierCard kind="influence" dossier={currentInfluence} delay={160} locked={!open}
              onOpen={onEditInfluence} onView={() => onOpenDetail(currentAIP, currentInfluence, 'influence')} />}
          </div>
        )}
        {open && cycle?.deadline && (
          <p className="mt-3 text-center text-[12.5px]" style={{ color: 'var(--night-muted)' }}>
            À déposer avant le <b style={{ color: 'var(--night-text)' }}>{deadlineText(cycle.deadline)}</b>.
          </p>
        )}

      </section>

      <button type="button" onClick={onOpenRequests}
        className="group w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-[rgba(229,72,79,0.04)]"
        style={{ ...PANEL, color: 'var(--night-text)' }}>
        <BookOpen size={20} className="shrink-0" style={{ color: 'var(--night-red)' }} />
        <span className="flex-1 min-w-0">
          <span className="block font-serif italic font-bold text-lg">Demandes diverses</span>
          <span className="block text-[12.5px] mt-1" style={{ color: 'var(--night-muted)' }}>Progressions, dépenses d’XP et suivi des apprentissages</span>
        </span>
        <ChevronRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
      </button>

      <section className="pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--night-red)' }}>
              <History size={13} /> Registre
            </p>
            <h2 className="font-serif italic font-bold text-2xl mt-1" style={{ color: 'var(--night-text)' }}>Chronique des cycles</h2>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(myAIPs.length > 0 || myInfluences.length > 0) && (
              <>
                <button onClick={onExportAIP} title="Exporter mes AIP en Excel"
                  className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[rgba(255,240,235,0.04)]"
                  style={{ border: '1px solid var(--night-line)', color: 'var(--night-muted)' }}>
                  <Download size={12} /> AIP
                </button>
                <button onClick={onExportInfluences} title="Exporter mes influences en Excel"
                  className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[rgba(255,240,235,0.04)]"
                  style={{ border: '1px solid var(--night-line)', color: 'var(--night-muted)' }}>
                  <Download size={12} /> Influences
                </button>
              </>
            )}
          </div>
        </div>
        {months.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-14 text-center" style={{ borderColor: 'var(--night-line-strong)' }}>
            <BookOpen size={26} className="mx-auto mb-3" style={{ color: 'var(--night-faint)' }} />
            <p className="font-serif italic" style={{ color: 'var(--night-text)' }}>Le registre est encore vide.</p>
            <p className="text-[12.5px] mt-1" style={{ color: 'var(--night-faint)' }}>Tes dossiers apparaîtront ici dès ton premier dépôt.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={PANEL}>
            {months.slice(0, RECENT).map((m, i) => {
              const aip = myAIPs.find(a => a.monthLabel === m);
              const inf = myInfluences.find(x => x.monthLabel === m);
              return <HistoryRow key={m} index={i} monthLabel={m} aip={aip} influence={inf}
                onOpen={() => onOpenDetail(aip, inf, aip ? 'aip' : 'influence')} />;
            })}
          </div>
        )}
        <button onClick={onOpenArchives}
          className="group mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-2xl text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-[rgba(229,72,79,0.06)]"
          style={{ border: '1px solid var(--night-line)', color: 'var(--night-text)' }}>
          <Archive size={14} style={{ color: 'var(--night-red)' }} />
          {months.length > RECENT ? `Voir les ${months.length - RECENT} autres cycles et chercher dans les archives` : 'Chercher dans les archives'}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </section>
    </div>
  );
}
