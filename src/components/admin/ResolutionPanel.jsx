import { useEffect, useMemo, useState } from 'react';
import { Shield, Swords, ShieldAlert, HandHeart, Gauge, Hourglass, Settings2, Plus, Check, X } from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useDialogs } from '../../context/DialogContext';
import ThemedSelect from '../ui/ThemedSelect';
import useInfluenceState from '../../hooks/useInfluenceState';
import { obstructionLabel } from './ObstructionCells';
import { isObstruction, obstructionApplies, obstructionTarget } from '../../utils/obstruction';
import ObstructionLinks from './ObstructionLinks';
import { isRumorAction, rumorSpecs } from '../../utils/rumors';
import {
  MAX_NATURAL_LEVEL, activeLossLevels, actorOf, actorKey, monthStart, localDate, levelCheck, monthLabelsFrom, monthOfDate, requiredLevel, lossPeriod, monthIndex, resolveAttacks, sameActor, supportAfterLosses, supportReceived,
} from '../../utils/influenceRules';

const CAT = { gotha: 'Gotha', pegre: 'Pègre' };
// Mois précédent d'un libellé « Mois Année » (pour rendre une perte dès le cycle affiché).
const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const prevMonth = (label) => { const [m, y] = label.split(' '); const i = MONTH_NAMES.indexOf(m); return i > 0 ? `${MONTH_NAMES[i - 1]} ${y}` : `Décembre ${Number(y) - 1}`; };

// Petits blocs d'affichage, hors du composant pour ne pas être recréés à chaque saisie.
function Section({ icon: Icon, title, color, count, children, hint }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  return (
    <section className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: light ? theme.bgPanel : 'var(--night-panel)', border: `1px solid ${theme.border}` }}>
      <h3 className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, border: `1px solid ${color}40`, color }}><Icon size={14} /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>{title}</span>
        {count !== undefined && <span className="text-[11px] font-bold tabular-nums" style={{ color: theme.textMuted }}>{count}</span>}
      </h3>
      {hint && <p className="text-[12.5px]" style={{ color: theme.textSecondary }}>{hint}</p>}
      {children}
    </section>
  );
}
function Line({ children }) {
  const { theme } = useTheme();
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-2.5 text-[13px]" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}>{children}</div>;
}
function Empty({ children }) {
  const { theme } = useTheme();
  return <p className="text-[12.5px] italic" style={{ color: theme.textMuted }}>{children}</p>;
}
const Who = ({ children }) => <b className="font-serif italic text-[14.5px]">{children}</b>;

// Panneau de résolution du cycle, dans l'ordre des règles : Défense → Attaque → Obstruction → autres.
// Tout est calculé ; le conteur confirme les cibles et valide les pertes.
export default function ResolutionPanel({ appId, influences = [], antagonists = [], month }) {
  const { theme } = useTheme();
  const light = theme.name === 'light';
  const { confirmAction } = useDialogs();
  const { losses, settings, partyDates, saveSettings, addLoss, removeLoss, updateLoss } = useInfluenceState();
  const [profiles, setProfiles] = useState([]);
  const [outsideForm, setOutsideForm] = useState(null);
  const [resolutionDates, setResolutionDates] = useState({});
  const resolvedOn = resolutionDates[month] ?? (monthOfDate(localDate()) === month ? localDate() : '');

  useEffect(() => onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'user_profiles'),
    s => setProfiles(s.docs.map(d => ({ uid: d.id, ...d.data() }))), e => console.error(e)), [appId]);

  const dossiers = useMemo(() => influences.filter(i => !(i.userId || '').startsWith('historical_')), [influences]);
  const monthDocs = useMemo(() => dossiers.filter(d => d.monthLabel === month), [dossiers, month]);
  const actions = useMemo(() => monthDocs.flatMap(d => (d.actions || []).map((a, idx) => ({ a, d, idx }))), [monthDocs]);

  // Les dossiers du cycle gardent les personnages de ce cycle, même si le compte a changé depuis.
  const targets = useMemo(() => {
    const players = profiles.filter(p => (p.role || 'player') === 'player' && p.name).map(p => ({
      kind: 'pj', id: p.uid, name: p.name,
      characterId: p.activeCharacterId || dossiers.find(d => d.userId === p.uid && d.characterName === p.name)?.characterId || 'c1',
    }));
    const cycleActors = monthDocs.map(d => { const actor = actorOf(d); return actor ? { ...actor, name: d.characterName } : null; }).filter(Boolean);
    const all = [...players, ...cycleActors, ...antagonists.map(a => ({ kind: 'pnj', id: a.id, name: a.name }))];
    return [...new Map(all.map(t => [actorKey(t), t])).values()].sort((x, y) => (x.name || '').localeCompare(y.name || '', 'fr'));
  }, [profiles, dossiers, monthDocs, antagonists]);
  const targetOptions = [{ value: '', label: 'À confirmer…' }, ...targets.map(t => ({ value: actorKey(t), label: `${t.name}${t.kind === 'pnj' ? ' (PNJ)' : ''}` }))];
  const findTarget = (key) => targets.find(t => actorKey(t) === key) || null;

  const saveOnAction = async (d, idx, patch) => {
    const list = [...(d.actions || [])];
    list[idx] = { ...list[idx], ...patch };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', d.id), { actions: list, updatedAt: new Date().toISOString() });
  };

  const sourceKey = (d, idx) => `${d.id}:${idx}`;
  const influencesOf = (target, category) => monthDocs.filter(x => sameActor(actorOf(x), target))
    .flatMap(x => (x.actions || []).map((act, i) => ({ act, d: x, i })))
    .filter(({ act }) => act.category === category && act.actionType === 'globale');
  const influenceKey = (ref) => (ref ? `${ref.dossierId}:${ref.actionIdx}` : '');
  const lossBySource = new Map(losses.filter(l => l.source).map(l => [`${l.source.dossierId}:${l.source.actionIdx}`, l]));

  const defenses = actions.filter(({ a }) => a.actionType === 'ciblée' && a.actionName === 'Défense');
  const attacks = resolveAttacks(dossiers, month);
  const obstructions = actions.filter(({ a }) => isObstruction(a));
  const supports = actions.filter(({ a }) => a.actionType === 'ciblée' && a.actionName === 'Soutien');

  // Niveau de base d'un personnage dans une catégorie : fiche PNJ, sinon niveau déclaré dans ses actions du cycle.
  const baseLevel = (target, category) => {
    if (target?.kind === 'pnj') return antagonists.find(a => a.id === target.id)?.influences?.[category]?.level || 0;
    const own = monthDocs.find(d => sameActor(actorOf(d), target));
    return Math.max(0, ...((own?.actions || []).filter(x => x.category === category).map(x => parseInt(x.level, 10) || 0)));
  };

  // Soutiens reçus par personnage et catégorie.
  const supportRows = useMemo(() => {
    const map = new Map();
    supports.forEach(({ a }) => {
      if (!a.targetResolved || a.supportOutside) return;
      const key = `${actorKey(a.targetResolved)}|${a.category}`;
      if (!map.has(key)) map.set(key, { target: a.targetResolved, category: a.category });
    });
    return [...map.values()].map(r => {
      const points = supportReceived(r.target, r.category, dossiers, month, settings.outsideSupportMalus);
      const base = baseLevel(r.target, r.category);
      const lossLevels = activeLossLevels(losses, r.target, r.category, month, monthIndex);
      return { ...r, points, base, lossLevels, result: supportAfterLosses(base, lossLevels, points) };
    });
  }, [supports, dossiers, month, settings.outsideSupportMalus, losses, antagonists]); // eslint-disable-line react-hooks/exhaustive-deps

  // Contrôle de niveau des actions globales du cycle.
  const levelIssues = actions.filter(({ a }) => a.actionType === 'globale').map(({ a, d, idx }) => {
    const actor = actorOf(d);
    const lossLevels = actor ? activeLossLevels(losses, actor, a.category, month, monthIndex) : 0;
    const supportPoints = actor ? supportReceived(actor, a.category, dossiers, month, settings.outsideSupportMalus) : 0;
    const check = levelCheck(a, { baseLevel: a.level, lossLevels, supportPoints });
    return check && (!check.ok || check.supportMismatch || check.baseTooHigh) ? { a, d, idx, check } : null;
  }).filter(Boolean);

  const activeLosses = losses.filter(l => l.sessionsPending || (l.untilDate ? l.untilDate >= monthStart(month) : monthIndex(l.untilMonth) >= monthIndex(month)))
    .sort((x, y) => (x.untilDate || x.untilMonth || 'zzz').localeCompare(y.untilDate || y.untilMonth || 'zzz'));

  const validateLoss = async (r, d) => {
    const period = lossPeriod({ resolutionMonth: month, resolvedOn, partyDates });
    await addLoss({
      target: { ...r.target, ...(r.target.kind === 'pj' ? { characterId: r.target.characterId || 'c1' } : {}) }, ...(r.target.kind === 'pj' ? { targetUid: r.target.id } : {}), targetName: r.target.name,
      category: r.attackedCategory, levels: r.levelsLost, ...period,
      source: { dossierId: r.dossierId, actionIdx: r.actionIdx, attacker: d?.characterName || r.attacker, month },
    });
  };

  const addOutsideSupport = async () => {
    const f = outsideForm;
    const target = findTarget(f.target);
    if (!target || !f.name.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'global_influences'), {
      characterName: `${f.name.trim()}${f.city.trim() ? ` (${f.city.trim()})` : ''}`, clan: '—', sect: 'Hors praxis',
      monthLabel: month, year: parseInt(month.split(' ')[1], 10) || null, month: month.split(' ')[0], status: 'npc',
      actions: [{ id: Date.now(), category: f.category, actionType: 'ciblée', actionName: 'Soutien', level: 1,
        actionsSpent: Math.max(1, parseInt(f.points, 10) || 1), fromOutside: true, supportCity: f.city.trim(),
        targetCharacter: target.name, targetResolved: target, description: '', response: '' }],
      createdAt: new Date().toISOString(),
    });
    setOutsideForm(null);
  };

  const red = light ? '#a5222a' : '#e5484f';
  const green = light ? '#276344' : '#9fd8b8';
  const box = { background: light ? '#faf8f5' : 'var(--night-input)', border: `1px solid ${theme.borderStrong}`, color: theme.textPrimary };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <header>
        <h2 className="font-serif text-[24px] italic font-bold" style={{ color: theme.textPrimary }}>Résolution des influences · {month}</h2>
        <p className="text-[13px] mt-1" style={{ color: theme.textSecondary }}>Dans l’ordre des règles : défenses, attaques, obstructions, puis le reste. Les calculs sont des aides : tu confirmes les cibles et tu valides.</p>
      </header>

      <Section icon={Settings2} title="Réglages" color={theme.textSecondary}>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: theme.textSecondary }}>Date de résolution des attaques</span>
            <input type="date" value={resolvedOn} onChange={e => setResolutionDates(d => ({ ...d, [month]: e.target.value }))}
              className="w-full min-w-0 rounded-lg px-3 py-2 text-[13px] outline-none" style={box} />
            <span className="block mt-2 text-[12px]" style={{ color: theme.textSecondary }}>Pertes : deux sessions de jeu ou un mois, la durée la plus longue. Sans deuxième soirée au calendrier, la fin reste à déterminer.</span></label>
          <label className="block"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: theme.textSecondary }}>Malus des soutiens venus d’autres villes</span>
            <ThemedSelect light={light} value={String(settings.outsideSupportMalus || 0)} ariaLabel="Malus de soutien extérieur" onChange={v => saveSettings({ outsideSupportMalus: parseInt(v, 10) })}
              options={['0', '-1', '-2', '-3']} /></label>
        </div>
      </Section>

      <Section icon={Shield} title="1 · Défenses" color={green} count={defenses.length} hint="Chaque action réduit d’1 niveau chaque attaque du cycle sur la catégorie défendue.">
        {defenses.length ? defenses.map(({ a, d, idx }) => <Line key={sourceKey(d, idx)}><Who>{d.characterName}</Who> défend son influence {CAT[a.category]} : <b>{a.actionsSpent || 1}</b></Line>) : <Empty>Aucune défense ce cycle.</Empty>}
      </Section>

      <Section icon={Swords} title="2 · Attaques" color={red} count={attacks.length} hint="2 actions par niveau (même catégorie), 3 (catégorie opposée). Confirme la cible, puis valide la perte : elle est notée sur la fiche et revient seule à la fin de la période.">
        {attacks.length ? attacks.map(r => {
          const d = monthDocs.find(x => x.id === r.dossierId);
          const a = d?.actions?.[r.actionIdx] || {};
          const loss = lossBySource.get(`${r.dossierId}:${r.actionIdx}`);
          return (
            <div key={`${r.dossierId}:${r.actionIdx}`} className="rounded-xl px-3.5 py-3 space-y-2" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}>
              <div className="text-[13px]"><Who>{r.attacker}</Who> attaque une influence <b>{CAT[r.attackedCategory]}</b> avec {r.spent} action{r.spent > 1 ? 's' : ''} ({CAT[r.attackerCategory]}) → <b>{r.bought} niveau{r.bought > 1 ? 'x' : ''}</b>{r.dealer && r.attackedCategory === r.attackerCategory && <span style={{ color: theme.textMuted }}> · Transactions louches (1 action par niveau)</span>}{r.wasted > 0 && <span style={{ color: theme.textMuted }}> · {r.wasted} action{r.wasted > 1 ? 's' : ''} en trop</span>}</div>
              <div className="text-[12.5px]" style={{ color: theme.textSecondary }}>
                Visée : {a.targetDescription || a.influenceName || '—'}{a.targetCharacter && ` · selon le joueur : ${a.targetCharacter}`}{a.attackGround && ` · ${{ temoin: 'vue agir', enquete: 'pistée', riposte: 'riposte' }[a.attackGround]}`}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-64 max-w-full"><ThemedSelect light={light} dense value={actorKey(r.target)} ariaLabel="Cible confirmée" options={targetOptions}
                  onChange={v => saveOnAction(d, r.actionIdx, { targetResolved: findTarget(v) })} /></div>
                {r.target && <span className="text-[12.5px]">Défense {CAT[r.attackedCategory]} de {r.target.name} : <b>{r.defense}</b> → perte : <b style={{ color: r.levelsLost ? red : green }}>{r.levelsLost} niveau{r.levelsLost > 1 ? 'x' : ''}</b></span>}
                {loss ? (
                  <span className="ml-auto flex flex-wrap items-center gap-2 text-[12px] font-bold" style={{ color: green }}><Check size={13} /> {loss.sessionsPending ? 'Perte notée · fin à déterminer (deuxième session inconnue)' : `Perte notée jusqu’à ${loss.untilDate ? new Date(`${loss.untilDate}T12:00:00`).toLocaleDateString('fr-FR') : loss.untilMonth}`}
                    <button type="button" onClick={async () => { if (await confirmAction({ title: 'Annuler la perte', message: 'Retirer cette perte d’influence ?' })) removeLoss(loss.id); }} aria-label="Annuler la perte" style={{ color: theme.textMuted }}><X size={13} /></button></span>
                ) : r.target && r.levelsLost > 0 && (
                  <button type="button" disabled={!resolvedOn} title={!resolvedOn ? 'Renseigne la date de résolution dans les réglages.' : undefined} onClick={() => validateLoss(r, d)} className="ml-auto px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-40" style={{ color: red, border: `1px solid ${red}55` }}>Valider la perte</button>
                )}
              </div>
            </div>
          );
        }) : <Empty>Aucune attaque ce cycle.</Empty>}
      </Section>

      <Section icon={ShieldAlert} title="3 · Obstructions" color={light ? '#245b9f' : '#5fa0f2'} count={obstructions.length} hint="Elles gênent les actions globales des autres personnages, sur la catégorie et l’activité visées.">
        {obstructions.length ? obstructions.map(({ a, d, idx }) => {
          const hit = actions.filter(x => x.a.actionType === 'globale' && x.d.id !== d.id &&
            (isRumorAction(x.a) ? rumorSpecs(x.a, x.d, antagonists) : [x.a.specialization]).some(specialization =>
              obstructionApplies(a, d, idx, { ...x.a, specialization }, x.d, x.idx)));
          return <Line key={sourceKey(d, idx)}><Who>{d.characterName}</Who> obstrue {obstructionLabel(a)} : <b>{a.actionsSpent || 1}</b><span style={{ color: theme.textMuted }}>· {hit.length} action{hit.length > 1 ? 's' : ''} gênée{hit.length > 1 ? 's' : ''}</span>
            {obstructionTarget(a).target !== 'rumeurs' && <ObstructionLinks source={d} action={a} index={idx} dossiers={monthDocs} appId={appId} />}
          </Line>;
        }) : <Empty>Aucune obstruction ce cycle.</Empty>}
      </Section>

      <Section icon={HandHeart} title="4 · Soutiens" color={light ? '#7a5a14' : '#d9b26a'} count={supports.length} hint="N → N+1 coûte N actions, jusqu’à 10, même catégorie, pas sur soi-même. Les soutiens venus d’autres villes subissent notre malus.">
        {supports.map(({ a, d, idx }) => (
          <div key={sourceKey(d, idx)} className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px]" style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textPrimary }}>
            <span><Who>{d.characterName}</Who> soutient en {CAT[a.category]} : <b>{a.actionsSpent || 1}</b>{a.fromOutside && <span style={{ color: theme.textMuted }}> (autre ville, malus {settings.outsideSupportMalus || 0})</span>}
              {a.supportOutside ? <span style={{ color: theme.textSecondary }}> → {a.targetCharacter || '?'} à {a.supportCity || '?'} (à transmettre à cette praxis)</span> : a.targetCharacter && <span style={{ color: theme.textSecondary }}> → {a.targetCharacter}</span>}</span>
            {!a.supportOutside && <div className="flex flex-wrap gap-2 ml-auto">
              <div className="w-52"><ThemedSelect light={light} dense value={actorKey(a.targetResolved)} ariaLabel="Personnage soutenu" options={targetOptions}
                onChange={v => saveOnAction(d, idx, { targetResolved: findTarget(v), supportedAction: null })} /></div>
              {a.targetResolved && (() => {
                const own = influencesOf(a.targetResolved, a.category);
                return <div className="w-72"><ThemedSelect light={light} dense value={influenceKey(a.supportedAction)} ariaLabel="Influence soutenue"
                  placeholder={own.length ? 'Influence soutenue…' : `Aucune influence ${CAT[a.category]} ce cycle`}
                  options={own.map(({ act, d: x, i }) => ({ value: `${x.id}:${i}`, label: `${act.actionName || 'Action'}${requiredLevel(act) ? ` (niv. ${requiredLevel(act)})` : ''}${act.specialization ? ` · ${act.specialization}` : ''}` }))}
                  onChange={v => { const hit = own.find(({ d: x, i }) => `${x.id}:${i}` === v); if (hit) saveOnAction(d, idx, { supportedAction: { dossierId: hit.d.id, actionIdx: hit.i, actionName: hit.act.actionName || '', required: requiredLevel(hit.act) } }); }} /></div>;
              })()}
            </div>}
          </div>
        ))}
        {supportRows.map(r => {
          const targeted = [...new Map(supports.filter(({ a }) => a.supportedAction && sameActor(a.targetResolved, r.target) && a.category === r.category)
            .map(({ a }) => [influenceKey(a.supportedAction), a.supportedAction])).values()];
          return (
          <Line key={`${actorKey(r.target)}|${r.category}`}><Who>{r.target.name}</Who> {CAT[r.category]} : base {r.base}{r.lossLevels > 0 && ` − ${r.lossLevels} perdu${r.lossLevels > 1 ? 's' : ''}`} + {r.points} point{r.points > 1 ? 's' : ''} → <b style={{ color: green }}>niveau {r.result.level}</b> ce cycle
            {targeted.map(t => {
              const act = monthDocs.find(x => x.id === t.dossierId)?.actions?.[t.actionIdx];
              const needed = t.required ?? (act ? requiredLevel(act) : null);
              const ok = needed === null || r.result.level + (act?.specialization ? 1 : 0) >= needed;
              return <span key={influenceKey(t)} className="text-[12px]" style={{ color: ok ? green : red }}>· pour « {t.actionName || 'action'} »{needed ? ` (niv. ${needed}${act?.specialization ? ', spé +1' : ''})` : ''} : {ok ? 'atteint' : 'insuffisant'}</span>;
            })}
            {r.result.rest > 0 && <span style={{ color: theme.textMuted }}> · {r.result.rest} point{r.result.rest > 1 ? 's' : ''} sans effet</span>}</Line>
          );
        })}
        {!supports.length && <Empty>Aucun soutien ce cycle.</Empty>}
        {outsideForm ? (
          <div className="rounded-xl p-3.5 grid sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end" style={{ background: theme.bgCard, border: `1px dashed ${theme.border}` }}>
            <input value={outsideForm.name} onChange={e => setOutsideForm(f => ({ ...f, name: e.target.value }))} placeholder="Personnage qui soutient" aria-label="Personnage qui soutient" className="rounded-lg px-3 py-2 text-[13px] outline-none" style={box} />
            <input value={outsideForm.city} onChange={e => setOutsideForm(f => ({ ...f, city: e.target.value }))} placeholder="Sa ville" aria-label="Ville d'origine" className="rounded-lg px-3 py-2 text-[13px] outline-none" style={box} />
            <ThemedSelect light={light} dense value={outsideForm.target} ariaLabel="Personnage soutenu" options={targetOptions} onChange={v => setOutsideForm(f => ({ ...f, target: v }))} />
            <ThemedSelect light={light} dense value={outsideForm.category} ariaLabel="Catégorie" options={[{ value: 'gotha', label: 'Gotha' }, { value: 'pegre', label: 'Pègre' }]} onChange={v => setOutsideForm(f => ({ ...f, category: v }))} />
            <div className="flex gap-2">
              <input type="number" min={1} value={outsideForm.points} onChange={e => setOutsideForm(f => ({ ...f, points: e.target.value }))} aria-label="Points de soutien" className="w-20 rounded-lg px-3 py-2 text-[13px] outline-none" style={box} />
              <button type="button" onClick={addOutsideSupport} className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: green, border: `1px solid ${green}55` }}>Ajouter</button>
              <button type="button" onClick={() => setOutsideForm(null)} aria-label="Annuler" style={{ color: theme.textMuted }}><X size={14} /></button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setOutsideForm({ name: '', city: '', target: '', category: 'gotha', points: 1 })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: light ? '#7a5a14' : '#d9b26a', border: `1px solid ${light ? '#7a5a1455' : '#d9b26a55'}` }}>
            <Plus size={12} /> Soutien venu d’une autre ville
          </button>
        )}
      </Section>

      <Section icon={Gauge} title="5 · Contrôle de niveau" color={red} count={levelIssues.length} hint="Actions globales au-dessus du niveau effectif (niveau de base − pertes + soutiens reçus, +1 si une spécialité est indiquée), ou dont le niveau avec soutiens annoncé par le joueur ne correspond pas aux soutiens déposés. Une base au-dessus de 5 est comptée 5 : au-delà, seulement par soutien.">
        {levelIssues.length ? levelIssues.map(({ a, d, idx, check }) => (
          <Line key={sourceKey(d, idx)}><Who>{d.characterName}</Who> {a.actionName} ({CAT[a.category]}) demande le niveau <b>{check.required}</b> — effectif <b style={{ color: check.ok ? green : red }}>{check.effective}</b>{check.supportMismatch && <span style={{ color: light ? '#7a5a14' : '#d9b26a' }}> · soutien annoncé {check.declaredSupported}, calculé {check.supported}</span>}{check.baseTooHigh && <span style={{ color: light ? '#7a5a14' : '#d9b26a' }}> · base {check.base} au-dessus de 5, comptée 5 (au-delà, seulement par soutien)</span>}
            <span style={{ color: theme.textMuted }}>(déclaré {check.base}{check.lossLevels ? ` − ${check.lossLevels} perdu${check.lossLevels > 1 ? 's' : ''}` : ''}{check.supported !== Math.max(0, Math.min(check.base, MAX_NATURAL_LEVEL) - check.lossLevels) ? ` → ${check.supported} avec soutien` : ''}{check.specialty ? ' + 1 spécialité' : ''})</span></Line>
        )) : <Empty>Toutes les actions globales sont à portée.</Empty>}
      </Section>

      <Section icon={Hourglass} title="Pertes en cours" color={theme.textSecondary} count={activeLosses.length}>
        {activeLosses.length ? activeLosses.map(l => (
          <Line key={l.id}>
            <span className="flex flex-wrap items-center gap-2">
              <Who>{l.targetName}</Who> −{l.levels} {CAT[l.category]}
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>Perdus dès</span>
              <div className="w-40"><ThemedSelect light={light} dense value={l.fromMonth} ariaLabel={`Début de la perte de ${l.targetName}`}
                options={monthLabelsFrom(prevMonth(prevMonth(l.source?.month || month)), 14)}
                onChange={v => updateLoss(l.id, { fromMonth: v, fromDate: null, ...(l.untilMonth && monthIndex(v) > monthIndex(l.untilMonth) ? { untilMonth: v, untilDate: null } : {}) })} /></div>
              {l.sessionsPending && <span className="text-[12px]" style={{ color: red }}>Fin à déterminer : deuxième session inconnue (au moins jusqu’au {l.minimumUntilDate}).</span>}
              {!l.expiryRule && <span className="text-[12px]" style={{ color: red }}>Ancienne période : vérifier les deux sessions de jeu et le minimum d’un mois.</span>}
            </span>
            <span className="flex flex-wrap items-center gap-2 ml-auto">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>Regagnés après</span>
              <div className="w-44"><ThemedSelect light={light} dense value={l.untilMonth || ''} ariaLabel={`Fin de la perte de ${l.targetName}`}
                placeholder="Fin à déterminer…" options={monthLabelsFrom(l.fromMonth, 13)} onChange={v => updateLoss(l.id, { untilMonth: v, untilDate: null })} /></div>
              <input type="date" value={l.untilDate || ''} aria-label={`Date précise de fin pour ${l.targetName}`} title="Date précise (facultatif)"
                onChange={e => e.target.value && updateLoss(l.id, { untilDate: e.target.value, untilMonth: monthOfDate(e.target.value) })}
                className="rounded-lg px-2 py-1 text-[12px] outline-none" style={box} />
              <button type="button" onClick={() => updateLoss(l.id, { untilMonth: prevMonth(month), untilDate: null, endedEarly: true })}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: green, border: `1px solid ${green}55` }}>Rendre dès ce cycle</button>
              <span className="text-[11px]" style={{ color: theme.textMuted }}>(attaque de {l.source?.attacker || '?'}, {l.source?.month})</span>
            </span>
          </Line>
)) : <Empty>Aucune perte en cours.</Empty>}
      </Section>
    </div>
  );
}

