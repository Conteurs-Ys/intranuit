import { useMemo, useState } from 'react';
import {
  Search, X, Download, Archive, Shield, Skull, Feather, MessageSquareQuote, SlidersHorizontal, ChevronDown, MapPin, Users, Target, Hourglass, Eye, Gauge,
} from 'lucide-react';
import { Answer, People, CATEGORY_COLOR } from './DossierDetail';
import useExport from '../../hooks/useExport';
import InfluenceArchiveTable from './InfluenceArchiveTable';
import ExpensesTable from '../ui/ExpensesTable';
import ThemedSelect from '../ui/ThemedSelect';
import { hasAnswers } from '../../utils/dossierState';
import { aipTypeLabel } from '../../utils/aipLabel';
import { activeCharacterId, belongsTo, charactersOf, STATUSES } from '../../utils/characters';

const MONTHS_ORDER = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const PAGE = 25;
const AIP_COLOR = '#e5484f';
const KIND = {
  aip: { color: AIP_COLOR, icon: Feather, label: 'AIP' },
  gotha: { color: CATEGORY_COLOR.gotha, icon: Shield, label: 'Gotha' },
  pegre: { color: CATEGORY_COLOR.pegre, icon: Skull, label: 'Pègre' },
};

const cycleKey = (d) => (d.year || 0) * 100 + MONTHS_ORDER.indexOf((d.monthLabel || '').split(' ')[0]);
const normalize = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Toutes les actions (AIP et influences) du joueur, à plat, une ligne par action.
function flatten(aips, influences) {
  const rows = [];
  for (const aip of aips) {
    const answered = hasAnswers(aip);
    const all = [
      ...(aip.actions || []).map((a, i) => ({ a, label: `Action ${i + 1}` })),
      ...(aip.bonus || []).map(b => ({ a: b, label: 'Action bonus' })),
    ];
    all.forEach(({ a, label }, i) => rows.push({
      id: `${aip.id}-a${i}`, kind: 'aip', dossier: aip, key: cycleKey(aip), label, answered,
      type: aipTypeLabel(a), zone: a.zone, score: a.score, people: a.people || [], text: a.description, response: a.response,
    }));
  }
  for (const inf of influences) {
    const answered = hasAnswers(inf);
    (inf.actions || []).forEach((a, i) => rows.push({
      id: `${inf.id}-i${i}`, kind: a.category === 'pegre' ? 'pegre' : 'gotha', dossier: inf, key: cycleKey(inf), answered,
      label: a.actionName || 'Action', type: a.actionName, actionType: a.actionType, spent: a.actionsSpent || 1,
      specialization: a.specialization, target: a.influenceName || a.targetCharacter, rumorTable: a.rumorTable, rumorCoveredSpecs: a.rumorCoveredSpecs, rumorNarrative: a.rumorNarrative, people: [], text: a.description, response: a.response,
    }));
  }
  return rows.sort((x, y) => y.key - x.key);
}

function Chip({ active, onClick, children, color = AIP_COLOR }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em] transition-all duration-200"
      style={active
        ? { background: `${color}26`, border: `1px solid ${color}70`, color: '#fff2f0' }
        : { background: 'transparent', border: '1px solid var(--night-line-strong)', color: 'var(--night-muted)' }}>
      {children}
    </button>
  );
}

// Une action archivée : ligne compacte (type, lieu, personnes, début de l'action
// et de la réponse) qui se déplie pour tout lire.
function ArchiveRow({ row, index }) {
  const [open, setOpen] = useState(false);
  const k = KIND[row.kind];
  const isAIP = row.kind === 'aip';
  return (
    <article className="relative rounded-xl overflow-hidden transition-colors duration-300 animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, background: open ? 'var(--night-panel-2)' : 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: k.color }} />
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full text-left pl-5 pr-4 py-3.5 flex gap-3 outline-none focus-visible:bg-[rgba(229,72,79,0.06)] hover:bg-[rgba(255,240,235,0.02)] transition-colors">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${k.color}1a`, border: `1px solid ${k.color}45`, color: k.color }}>
          <k.icon size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-bold text-[13.5px]" style={{ color: 'var(--night-text)' }}>{row.type || row.label}</span>
            {isAIP && row.zone && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--night-muted)' }}><MapPin size={12} />{row.zone}</span>
            )}
            {!isAIP && (
              <span className="text-[12px]" style={{ color: 'var(--night-muted)' }}>
                {row.actionType === 'ciblée' ? 'Ciblée' : 'Globale'} · {row.spent} pt{row.spent > 1 ? 's' : ''}{row.target ? ` · ${row.target}` : ''}
              </span>
            )}
            {isAIP && row.score && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: '#9cc3f5' }}><Gauge size={12} />{row.score}</span>
            )}
            {isAIP && row.people.length > 0 && (
              <span className="flex items-center gap-1 text-[12px]" style={{ color: '#f7c4c6' }}><Users size={12} />{row.people.join(', ')}</span>
            )}
          </span>
          <span className={`block font-serif text-[14.5px] mt-1 ${open ? '' : 'line-clamp-2'}`} style={{ color: row.text ? 'var(--night-text)' : 'var(--night-faint)' }}>
            {row.text || 'Aucune description.'}
          </span>
          {!open && (
            row.answered
              ? <span className="flex items-start gap-1.5 mt-1.5 text-[12.5px] italic" style={{ color: '#f0a3a6' }}>
                  <Feather size={12} className="shrink-0 mt-[3px]" />
                  <span className="line-clamp-2">{row.response || 'Réponse diffusée'}</span>
                </span>
              : <span className="flex items-center gap-1.5 mt-1.5 text-[12px]" style={{ color: 'var(--night-faint)' }}><Hourglass size={12} /> En attente de réponse</span>
          )}
          {!open && (row.text?.length > 140 || row.response?.length > 140) && (
            <span className="inline-block mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--night-muted)' }}>Lire la suite</span>
          )}
        </span>
        <ChevronDown size={17} className={`shrink-0 mt-1.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--night-faint)' }} />
      </button>

      {open && (
        <div className="pl-5 pr-4 pb-4 -mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="ml-11 space-y-2.5">
            {isAIP && (
              <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--night-muted)' }}>
                <Users size={13} className="shrink-0" /> <People people={row.people} />
              </div>
            )}
            {!isAIP && row.target && (
              <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--night-muted)' }}>
                <Target size={13} /> {row.actionType === 'ciblée' ? 'Cible' : 'Réseau'} : <span className="font-bold" style={{ color: 'var(--night-text)' }}>{row.target}</span>
                {row.specialization && <span>· {row.specialization}</span>}
              </div>
            )}
            <Answer visible={row.answered} text={row.response} />
          </div>
        </div>
      )}
    </article>
  );
}

const sumPoints = (rows, kind) => rows.filter(r => r.kind === kind).reduce((n, r) => n + (Number(r.spent) || 1), 0);

// `myAIPs` / `myInfluences` : tous les dossiers du compte. Par défaut, seul le personnage actif est affiché ;
// les archives d'un ancien personnage s'ouvrent explicitement avec le sélecteur.
export default function Archives({ myAIPs, myInfluences, profile, onOpenDetail }) {
  const { exportAIP, exportInfluences } = useExport();
  const characters = charactersOf(profile);
  const [characterId, setCharacterId] = useState(() => activeCharacterId(profile));
  const rows = useMemo(() => flatten(
    myAIPs.filter(d => belongsTo(d, characterId, profile)),
    myInfluences.filter(d => belongsTo(d, characterId, profile)),
  ), [myAIPs, myInfluences, characterId, profile]);

  const [tab, setTab] = useState('aip');
  const [direction, setDirection] = useState(1);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(null); // null : l'année la plus récente, '' : toutes
  const [zone, setZone] = useState('');
  const [person, setPerson] = useState('');
  const [answeredOnly, setAnsweredOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  const isAIP = tab === 'aip';
  const tabRows = useMemo(() => rows.filter(r => (isAIP ? r.kind === 'aip' : r.kind !== 'aip')), [rows, isAIP]);
  const counts = useMemo(() => ({ aip: rows.filter(r => r.kind === 'aip').length, influences: rows.filter(r => r.kind !== 'aip').length }), [rows]);

  const options = useMemo(() => ({
    years: [...new Set(rows.map(r => r.dossier.year).filter(Boolean))].sort((a, b) => b - a).map(String),
    zones: [...new Set(tabRows.map(r => r.zone).filter(Boolean))].sort(),
    people: [...new Set(tabRows.flatMap(r => r.people))].sort((a, b) => a.localeCompare(b)),
  }), [rows, tabRows]);
  const effectiveYear = year === null ? (options.years[0] || '') : year;

  const expenseHistory = useMemo(() => myAIPs.filter(d => belongsTo(d, characterId, profile) && (!effectiveYear || String(d.year) === effectiveYear))
    .sort((a, b) => cycleKey(b) - cycleKey(a)).flatMap(d => (d.expenses || []).map(e => ({ ...e, id: `${d.id}:${e.id}`, monthLabel: d.monthLabel, review: d.expenseReviews?.[e.id] }))), [myAIPs, characterId, profile, effectiveYear]);

  const switchTab = (next) => {
    if (next === tab) return;
    setDirection(next === 'influences' ? 1 : -1);
    setTab(next);
    setZone(''); setPerson(''); setCategory('all'); setLimit(PAGE);
  };

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return tabRows.filter(r =>
      (isAIP || category === 'all' || r.kind === category)
      && (!effectiveYear || String(r.dossier.year) === effectiveYear)
      && (!zone || r.zone === zone)
      && (!person || r.people.includes(person))
      && (!answeredOnly || r.answered)
      && (!q || normalize([r.text, r.answered ? r.response : '', r.type, r.zone, r.target, r.specialization, ...r.people, r.dossier.monthLabel].join(' ')).includes(q)));
  }, [tabRows, isAIP, category, query, effectiveYear, zone, person, answeredOnly]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of filtered.slice(0, limit)) {
      const label = r.dossier.monthLabel;
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(r);
    }
    return [...map.entries()];
  }, [filtered, limit]);

  const activeFilters = [zone, person].filter(Boolean).length + (answeredOnly ? 1 : 0) + (category !== 'all' ? 1 : 0);
  const reset = () => { setQuery(''); setCategory('all'); setYear(null); setZone(''); setPerson(''); setAnsweredOnly(false); setLimit(PAGE); };
  const select = (value, set, list, label) => (
    <ThemedSelect compact value={value} onChange={set} ariaLabel={label} active={Boolean(value)}
      options={[{ value: '', label }, ...list.map(o => ({ value: o, label: o }))]} />
  );

  return (
    <div className="space-y-6">
      <header className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--night-red)' }}>
          <Archive size={13} /> Registre
        </p>
        <h1 className="font-serif italic font-bold text-[34px] sm:text-[40px] leading-tight mt-1" style={{ color: 'var(--night-text)' }}>Archives</h1>
        <p className="font-serif italic text-[16px] mt-1" style={{ color: 'var(--night-muted)' }}>
          Tout ce que ton personnage a tenté, et ce que les conteurs lui ont répondu.
        </p>
        {characters.length > 1 && (
          <div className="mt-3 w-full sm:w-72">
            <ThemedSelect compact value={characterId} ariaLabel="Personnage" active
              onChange={v => { setCharacterId(v); setYear(null); setLimit(PAGE); }}
              options={characters.map(c => ({ value: c.id, label: `${c.name || 'Sans nom'}${c.status === 'actif' ? '' : ` · ${STATUSES[c.status] || c.status}`}` }))} />
          </div>
        )}
      </header>

      {/* AIP ou influences : deux registres distincts */}
      <div className="relative grid grid-cols-2 p-1 rounded-2xl" style={{ background: 'var(--night-input)', border: '1px solid var(--night-line)' }}>
        <span aria-hidden className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-500"
          style={{
            transform: isAIP ? 'translateX(0)' : 'translateX(100%)',
            transitionTimingFunction: 'cubic-bezier(0.22, 0.8, 0.24, 1)',
            background: isAIP ? 'linear-gradient(135deg, rgba(153,27,27,0.55), rgba(100,10,10,0.7))' : 'linear-gradient(135deg, rgba(180,100,30,0.45), rgba(110,55,10,0.6))',
            border: `1px solid ${isAIP ? 'rgba(229,72,79,0.4)' : 'rgba(236,148,64,0.4)'}`,
          }} />
        {[{ id: 'aip', label: 'Mes AIP', icon: Feather, n: counts.aip }, { id: 'influences', label: 'Mes influences', icon: Eye, n: counts.influences }].map(t => (
          <button key={t.id} type="button" onClick={() => switchTab(t.id)} aria-pressed={tab === t.id}
            className="relative z-10 flex items-center justify-center gap-2 h-11 rounded-xl text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-300"
            style={{ color: tab === t.id ? '#fff2f0' : 'var(--night-muted)' }}>
            <t.icon size={14} /> {t.label}
            <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(255,240,235,0.08)' }}>{t.n}</span>
          </button>
        ))}
      </div>

      {/* Recherche et filtres, collés en haut au défilement */}
      <div className="sticky top-0 md:top-[60px] z-30 -mx-5 px-5 py-3 space-y-3" style={{ background: 'rgba(11,8,9,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--night-line)' }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--night-faint)' }} />
            <input value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
              placeholder={isAIP ? 'Chercher un nom, un lieu, un mot d’une réponse…' : 'Chercher une action, une cible, une spécialité…'}
              className="w-full h-11 rounded-full pl-10 pr-10 text-[14px] outline-none transition-colors focus:border-red-500/50"
              style={{ background: 'var(--night-input)', border: '1px solid var(--night-line-strong)', color: 'var(--night-text)' }} />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/5"
                style={{ color: 'var(--night-muted)' }}><X size={14} /></button>
            )}
          </div>
          <div className="w-36 sm:w-44 shrink-0">
            <ThemedSelect compact value={effectiveYear} onChange={v => { setYear(v); setLimit(PAGE); }} ariaLabel="Année" active
              options={[...options.years.map(y => ({ value: y, label: y })), { value: '', label: 'Toutes les années' }]} />
          </div>
          <button onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters}
            className="md:hidden relative h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95"
            style={showFilters
              ? { border: '1px solid rgba(229,72,79,0.55)', background: 'rgba(229,72,79,0.15)', color: '#fde2e0' }
              : { border: '1px solid var(--night-line-strong)', color: 'var(--night-text)' }}>
            <SlidersHorizontal size={17} className={`transition-transform duration-300 ${showFilters ? 'rotate-90' : ''}`} />
            {activeFilters > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-red-600 text-white">{activeFilters}</span>}
          </button>
        </div>

        {/* Sur téléphone, les filtres se déplient en douceur ; toujours visibles sur ordinateur */}
        <div className="grid [grid-template-rows:var(--filters-rows)] md:[grid-template-rows:1fr] transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{ '--filters-rows': showFilters ? '1fr' : '0fr' }}>
        <div className={`min-h-0 overflow-hidden md:overflow-visible transition-opacity duration-300 ${showFilters ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {isAIP ? (
            <>
              <div className="w-full sm:w-52">{select(zone, setZone, options.zones, 'Tous les lieux')}</div>
              <div className="w-full sm:w-56">{select(person, setPerson, options.people, 'Toutes les personnes')}</div>
            </>
          ) : (
            <>
              <Chip active={category === 'all'} onClick={() => setCategory('all')} color={CATEGORY_COLOR.gotha}>Gotha et Pègre</Chip>
              <Chip active={category === 'gotha'} onClick={() => setCategory('gotha')} color={CATEGORY_COLOR.gotha}><Shield size={12} /> Gotha</Chip>
              <Chip active={category === 'pegre'} onClick={() => setCategory('pegre')} color={CATEGORY_COLOR.pegre}><Skull size={12} /> Pègre</Chip>
            </>
          )}
          <Chip active={answeredOnly} onClick={() => setAnsweredOnly(v => !v)} color="#5fa0f2"><MessageSquareQuote size={12} /> Avec réponse</Chip>
        </div>
        </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--night-faint)' }}>
        <span>
          <span className="font-bold" style={{ color: 'var(--night-text)' }}>{filtered.length}</span> {isAIP ? 'AIP' : `action${filtered.length > 1 ? 's' : ''} d’influence`}
          {effectiveYear ? ` en ${effectiveYear}` : ''}
        </span>
        {(query || activeFilters > 0 || year !== null) && (
          <button onClick={reset} className="font-bold uppercase tracking-[0.12em] text-[10.5px] hover:underline" style={{ color: 'var(--night-red)' }}>Tout effacer</button>
        )}
      </div>

      <div key={tab} className={`animate-in fade-in duration-300 ${direction > 0 ? 'slide-in-from-right-6' : 'slide-in-from-left-6'}`}>
        {isAIP && expenseHistory.length > 0 && <details className="mb-5 rounded-2xl p-4 space-y-3" style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
          <summary className="cursor-pointer font-serif italic font-bold text-lg" style={{ color: 'var(--night-text)' }}>Historique des dépenses · {effectiveYear || 'Toutes les années'}</summary>
          <div className="pt-3"><ExpensesTable rows={expenseHistory} history /></div>
        </details>}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: 'var(--night-line-strong)' }}>
            <Archive size={26} className="mx-auto mb-3" style={{ color: 'var(--night-faint)' }} />
            <p className="font-serif italic" style={{ color: 'var(--night-text)' }}>{tabRows.length ? 'Rien ne correspond à ta recherche.' : isAIP ? 'Aucune AIP archivée.' : 'Aucune action d’influence archivée.'}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map(([label, items]) => {
              const answers = items.filter(r => r.answered).length;
              const g = sumPoints(items, 'gotha');
              const p = sumPoints(items, 'pegre');
              return (
                <section key={label}>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-1 mb-3 pb-3" style={{ borderBottom: '1px solid var(--night-line)' }}>
                    <h2 className="font-serif italic font-bold text-[24px] leading-none" style={{ color: 'var(--night-text)' }}>{label}</h2>
                    <p className="flex flex-wrap items-center gap-x-3 text-[11.5px] pb-0.5" style={{ color: 'var(--night-faint)' }}>
                      {isAIP
                        ? <span>{items.length} AIP</span>
                        : <>
                            {g > 0 && <span style={{ color: CATEGORY_COLOR.gotha }}>Gotha {g} pt{g > 1 ? 's' : ''}</span>}
                            {p > 0 && <span style={{ color: CATEGORY_COLOR.pegre }}>Pègre {p} pt{p > 1 ? 's' : ''}</span>}
                          </>}
                      <span>{answers ? `${answers} réponse${answers > 1 ? 's' : ''}` : 'en attente de réponse'}</span>
                    </p>
                    <button type="button" onClick={() => {
                      const dossiers = (isAIP ? myAIPs : myInfluences).filter(d => d.monthLabel === label && belongsTo(d, characterId, profile));
                      (isAIP ? exportAIP : exportInfluences)(dossiers, label, { staff: false });
                    }} className="ml-auto flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] hover:underline pb-0.5" style={{ color: 'var(--night-muted)' }} aria-label={`Exporter ${isAIP ? 'les AIP' : 'les influences'} de ${label}`}><Download size={12} /> Excel · {label}</button>
                    <button onClick={() => onOpenDetail(
                        myAIPs.find(a => a.monthLabel === label && belongsTo(a, characterId, profile)), myInfluences.find(i => i.monthLabel === label && belongsTo(i, characterId, profile)), isAIP ? 'aip' : 'influence')}
                      className="text-[10.5px] font-bold uppercase tracking-[0.12em] hover:underline pb-0.5" style={{ color: 'var(--night-muted)' }}>
                      Voir le dossier
                    </button>
                  </div>
                  {isAIP ? (
                    <div className="space-y-2">{items.map((r, i) => <ArchiveRow key={r.id} row={r} index={i} />)}</div>
                  ) : (
                    <InfluenceArchiveTable rows={items} month={label} />
                  )}
                </section>
              );
            })}
            {filtered.length > limit && (
              <div className="text-center">
                <button onClick={() => setLimit(l => l + PAGE)}
                  className="h-10 px-5 rounded-lg text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-white/5"
                  style={{ border: '1px solid var(--night-line-strong)', color: 'var(--night-text)' }}>
                  Afficher plus ({filtered.length - limit} restantes)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
