// Règles d'influence FCF (« Action Ciblée », « 4.03 Gestion des Influences ») — fonctions pures.
// Aides au calcul : le conteur valide toujours le résultat.
//
// ATTAQUE   : 2 actions par niveau retiré dans la même catégorie, 3 dans la catégorie opposée.
//             Il faut avoir vu ou pisté l'influence visée ; connaître son propriétaire n'est pas nécessaire.
//             Les niveaux perdus le restent 2 sessions ou 1 mois (le plus long), puis reviennent.
// DÉFENSE   : chaque action de défense réduit d'1 niveau CHAQUE attaque du mois sur la catégorie défendue.
// SOUTIEN   : passer de N à N+1 coûte N actions, jusqu'à 10 ; même catégorie ; pas sur soi-même ;
//             dure jusqu'à la fin du mois ; seule action ciblée possible hors de sa praxis, avec un
//             malus de 0 à -3 fixé par la praxis qui reçoit.
// NIVEAU    : une action globale demande un niveau ≤ niveau effectif (base, +1 si une spécialité pertinente,
//             + soutiens reçus) ; les niveaux perdus par attaque sont retirés.
// ORDRE     : Défense → Attaque → Obstruction → autres.
import { GOTHA_ACTIONS_GLOBALES, PEGRE_ACTIONS_GLOBALES } from '../constants/index.js';

export const MAX_LEVEL = 10;
export const MAX_NATURAL_LEVEL = 5;
const num = (v, d = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
const spentOf = (a) => Math.max(1, num(a.actionsSpent, 1));

// ── Attaque ───────────────────────────────────────────────────────
// Atout Ravnos « Transactions louches » (`dealer`) : 1 action par niveau au lieu de 2 dans la même catégorie ;
// le texte ne dit rien de la catégorie opposée, qui reste à 3.
export const attackRate = (attackerCategory, attackedCategory, dealer = false) =>
  (attackerCategory === attackedCategory ? (dealer ? 1 : 2) : 3);
export const attackCost = (levels, attackerCategory, attackedCategory, dealer = false) =>
  Math.max(0, num(levels)) * attackRate(attackerCategory, attackedCategory, dealer);
// Niveaux réellement achetés avec les actions dépensées.
export const attackLevelsFor = (spent, attackerCategory, attackedCategory, dealer = false) =>
  Math.floor(Math.max(0, num(spent)) / attackRate(attackerCategory, attackedCategory, dealer));

// ── Identité d'un acteur (dossier) ────────────────────────────────
// PJ : compte + personnage. Les anciennes références sans characterId désignent c1,
// comme les dossiers historiques ; elles ne suivent jamais un nouveau personnage.
export function actorOf(dossier) {
  if (dossier.userId && !String(dossier.userId).startsWith('historical_')) return { kind: 'pj', id: dossier.userId, characterId: dossier.characterId || 'c1' };
  if (dossier.antagonistId) return { kind: 'pnj', id: dossier.antagonistId };
  return null;
}
export const sameActor = (a, b) => Boolean(a && b && a.kind === b.kind && a.id === b.id
  && (a.kind !== 'pj' || (a.characterId || 'c1') === (b.characterId || 'c1')));
export const actorKey = a => a ? `${a.kind}:${a.id}${a.kind === 'pj' ? `:${a.characterId || 'c1'}` : ''}` : '';

const monthDossiers = (dossiers, month) => dossiers.filter(d => d.monthLabel === month);
const actionsOf = (dossiers, pred) => dossiers.flatMap(d => (d.actions || []).map((a, idx) => ({ a, d, idx }))).filter(({ a, d }) => pred(a, d));

// ── Défense ───────────────────────────────────────────────────────
// Points de défense d'un personnage sur une catégorie, pour le mois.
export function defenseOf(target, category, dossiers, month) {
  return actionsOf(monthDossiers(dossiers, month), (a, d) =>
    a.actionType === 'ciblée' && a.actionName === 'Défense' && a.category === category && sameActor(actorOf(d), target))
    .reduce((s, { a }) => s + spentOf(a), 0);
}

// ── Résolution des attaques du mois ───────────────────────────────
// Chaque attaque dont la cible est confirmée par le conteur (`targetResolved`) donne :
// niveaux achetés, défense de la cible sur la catégorie visée, niveaux perdus.
export function resolveAttacks(dossiers, month) {
  const docs = monthDossiers(dossiers, month);
  return actionsOf(docs, a => a.actionType === 'ciblée' && a.actionName === 'Attaque').map(({ a, d, idx }) => {
    const attacked = a.attackedCategory || a.category;
    const dealer = Boolean(a.transactionsLouches);
    const bought = attackLevelsFor(spentOf(a), a.category, attacked, dealer);
    const target = a.targetResolved || null;
    const defense = target ? defenseOf(target, attacked, dossiers, month) : 0;
    return {
      dossierId: d.id, actionIdx: idx, attacker: d.characterName, attackerCategory: a.category,
      attackedCategory: attacked, spent: spentOf(a), bought, cost: attackCost(bought, a.category, attacked, dealer),
      wasted: spentOf(a) - attackCost(bought, a.category, attacked, dealer), dealer,
      target, defense, levelsLost: target ? Math.max(0, bought - defense) : null,
    };
  });
}

// ── Soutien ───────────────────────────────────────────────────────
// Niveaux gagnés à partir d'un niveau de base avec un total de points (N → N+1 coûte N), plafonné à 10.
export function supportLevels(base, points) {
  let level = Math.max(0, num(base));
  let pool = Math.max(0, num(points));
  if (level === 0) return { level: 0, gained: 0, rest: pool }; // on ne soutient qu'une influence existante
  const start = level;
  while (level < MAX_LEVEL && pool >= level) { pool -= level; level += 1; }
  return { level, gained: level - start, rest: pool };
}

// Points de soutien reçus par un personnage dans une catégorie pour le mois.
// Le soutien venu d'une autre praxis (`fromOutside`) subit le malus de notre praxis (0 à -3).
export function supportReceived(target, category, dossiers, month, outsideMalus = 0) {
  return actionsOf(monthDossiers(dossiers, month), (a, d) =>
    a.actionType === 'ciblée' && a.actionName === 'Soutien' && a.category === category
    && !a.supportOutside
    && sameActor(a.targetResolved, target) && !sameActor(actorOf(d), target))
    .reduce((s, { a }) => s + Math.max(0, spentOf(a) - (a.fromOutside ? Math.abs(num(outsideMalus)) : 0)), 0);
}

// ── Pertes d'influence (attaques validées) ────────────────────────
// Une perte : { target: { kind, id }, category, levels, fromMonth, untilMonth } (mois inclus).
// Sans `onDate`, une perte compte pour tout mois qu'elle touche, même en partie : un cycle résolu
// après la fin de la perte voit encore le niveau perdu pendant ce mois.
export function activeLossLevels(losses, target, category, month, monthIndex, onDate = null) {
  const m = monthIndex(month);
  const latest = onDate || monthEnd(month);
  const earliest = onDate || monthStart(month);
  return losses.filter(l => sameActor(l.target, target) && l.category === category
    // Les actions déjà entreprises dans le cycle de l'attaque ne sont pas annulées.
    && l.source?.month !== month
    && (l.fromDate ? l.fromDate <= latest : monthIndex(l.fromMonth) <= m)
    && (l.untilDate ? earliest <= l.untilDate : l.sessionsPending || m <= monthIndex(l.untilMonth)))
    .reduce((s, l) => s + Math.max(0, num(l.levels)), 0);
}

// ── Contrôle de niveau d'une action globale ───────────────────────
// Les anciens intitulés (tableur 2025) portent le niveau en puces : « ••• Erreurs Administratives ».
const bareActionName = (name) => String(name || '').replace(/^[\s•·]+/, '').trim().toLowerCase();
export function requiredLevel(action) {
  const list = action.category === 'gotha' ? GOTHA_ACTIONS_GLOBALES : PEGRE_ACTIONS_GLOBALES;
  const name = bareActionName(action.actionName);
  return list.find(a => a.name.toLowerCase() === name)?.level ?? null;
}

// Niveau de base déclaré (fiche) − pertes + soutien, +1 si une spécialité est indiquée
// (sa pertinence reste au jugement du conteur).
// Le joueur indique son niveau de base (fiche) et, s'il est soutenu, le niveau qu'il pense atteindre
// (`supportedLevel`) : on calcule à partir de la base et des soutiens réellement reçus, et on signale l'écart.
// Le niveau naturel va de 1 à 5 ; au-delà, seulement par soutien : une base supérieure est ramenée à 5 et signalée.
export function levelCheck(action, { baseLevel, lossLevels = 0, supportPoints = 0 }) {
  const required = requiredLevel(action);
  if (required === null || action.actionType !== 'globale') return null;
  const baseTooHigh = num(baseLevel) > MAX_NATURAL_LEVEL;
  const supported = supportAfterLosses(Math.min(num(baseLevel), MAX_NATURAL_LEVEL), lossLevels, supportPoints).level;
  const specialty = action.specialization ? 1 : 0;
  const effective = supported + specialty;
  const declaredSupported = num(action.supportedLevel) > num(baseLevel) ? num(action.supportedLevel) : null;
  return {
    required, base: num(baseLevel), baseTooHigh, lossLevels, supported, specialty, effective, ok: effective >= required,
    declaredSupported, supportMismatch: declaredSupported !== null && declaredSupported !== supported,
  };
}

// Même calcul dans le résumé des soutiens et le contrôle de chaque action.
export function supportAfterLosses(baseLevel, lossLevels, supportPoints) {
  return supportLevels(Math.max(0, num(baseLevel) - Math.max(0, num(lossLevels))), supportPoints);
}

// ── Durée d'une perte : « deux sessions ou un mois, selon la plus longue » ──
// Deux sessions de jeu ET au moins un mois. Un cycle n'est pas une session.
// Sans deuxième session connue, aucune fin automatique n'est inventée.
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const monthIndex = (label) => { const [m, y] = (label || '').split(' '); return num(y) * 12 + MONTHS.indexOf(m); };
const labelOf = (index) => `${MONTHS[((index % 12) + 12) % 12]} ${Math.floor(index / 12)}`;
const labelOfDate = (iso) => { const d = new Date(`${iso}T12:00:00`); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export const localDate = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
// Premier et dernier jour d'un mois (« Novembre 2026 » → 2026-11-01, 2026-11-30).
const isoDay = (y, m, d) => new Date(Date.UTC(y, m, d, 12)).toISOString().slice(0, 10);
export const monthStart = (month) => { const i = monthIndex(month); return isoDay(Math.floor(i / 12), i % 12, 1); };
export const monthEnd = (month) => { const i = monthIndex(month); return isoDay(Math.floor(i / 12), (i % 12) + 1, 0); };

export function lossPeriod({ resolutionMonth, resolvedOn, partyDates = [] }) {
  const day = resolvedOn;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day) {
    throw new Error('Indique la date réelle de résolution pour calculer la durée de la perte.');
  }
  const next = [...new Set(partyDates.filter(Boolean))].sort().filter(d => d > day);
  const oneMonth = (() => {
    const d = new Date(`${day}T12:00:00Z`);
    const originalDay = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(originalDay, lastDay));
    return d.toISOString().slice(0, 10);
  })();
  const untilDate = next[1] ? (next[1] > oneMonth ? next[1] : oneMonth) : null;
  return {
    fromMonth: labelOfDate(day), fromDate: day, resolvedOn: day,
    minimumUntilDate: oneMonth, untilMonth: untilDate ? labelOfDate(untilDate) : null,
    untilDate, sessionsPending: !untilDate, expiryRule: 'two-sessions-or-month',
  };
}

// Une modification du calendrier recalcule les fins réglementaires ; les corrections
// explicites du conteur et les anciennes pertes restent inchangées.
export function refreshLossPeriod(loss, partyDates) {
  if (loss.expiryRule !== 'two-sessions-or-month' || loss.periodOverride) return loss;
  return { ...loss, ...lossPeriod({ resolutionMonth: loss.source?.month || loss.fromMonth, resolvedOn: loss.resolvedOn, partyDates }) };
}

// Mois proposés pour régler à la main la fin d'une perte : à partir d'un mois, sur `count` mois.
export function monthLabelsFrom(label, count = 12) {
  const start = monthIndex(label);
  return Array.from({ length: count }, (_, i) => labelOf(start + i));
}
export const monthOfDate = (iso) => labelOfDate(iso);
