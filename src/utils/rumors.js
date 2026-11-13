// Tableaux de rumeurs (« La Rumeur » en Pègre, « Potins et délit d'initié » en Gotha) — fonctions pures.
// Règles suivies (voir docs/ANALYSE-RUMEURS-INFLUENCES.md, §1, §5 et §6) :
// - période : le mois de la rumeur et les 2 mois joués précédents ; un mois sans cycle (aucun dossier
//   d'influence) ne compte pas (décision du propriétaire, 3 novembre 2026) ;
// - spécialités : toutes celles du personnage dans la catégorie, déclarées par le joueur sur l'action
//   (préremplies depuis son profil), ajustables par le conteur ;
// - usages révélés : tout usage de la catégorie (globales, ciblées, rumeurs des autres comprises),
//   sauf les actions du personnage lui-même ; jamais l'identité d'un personnage ;
// - ligne : institution impliquée, mois, manière dont l'influence a été utilisée (trace relue par le conteur) ;
// - rumeurs de conteur : catégorie, spécialités facultatives (vide = toute la catégorie), période, texte ;
// - obstruction : celle du cycle de la rumeur (voir obstruction.js), spécialité par spécialité.
import { INFLUENCE_SPECIALIZATIONS, RUMEUR_ACTIONS } from '../constants/index.js';
import { ALL_SPECIALTIES, obstructionFor, obstructionTarget } from './obstruction.js';
import { monthIndex } from './influenceRules.js';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const labelOf = (index) => `${MONTHS[((index % 12) + 12) % 12]} ${Math.floor(index / 12)}`;
const pad = (n) => String(n).padStart(2, '0');

export const isRumorAction = (act) => RUMEUR_ACTIONS.includes(act?.actionName);
export const rumorActionName = (category) => (category === 'gotha' ? "Potins et délit d'initié" : 'La Rumeur');
export const UNREVIEWED_FALLBACK = 'Usage de l’influence';

// Les 3 mois du calendrier de la période, du plus ancien au plus récent (passage d'année compris).
export function rumorPeriod(monthLabel) {
  const end = monthIndex(monthLabel);
  return [end - 2, end - 1, end].map(labelOf);
}

// Mois couverts par une rumeur : le sien et les 2 mois joués avant lui, du plus ancien au plus récent.
// Un mois est joué s'il a au moins un dossier d'influence ; sans dossiers connus, 3 mois du calendrier.
export function rumorMonths(monthLabel, dossiers = []) {
  if (!dossiers.length) return rumorPeriod(monthLabel);
  const end = monthIndex(monthLabel);
  const played = [...new Set(dossiers.map(d => d.monthLabel)
    .filter(l => MONTHS.includes(String(l || '').split(' ')[0]))
    .map(monthIndex).filter(i => i < end))];
  return [...played.sort((a, b) => b - a).slice(0, 2).reverse(), end].map(labelOf);
}

// Premier et dernier jour d'un mois « Mois Année », au format AAAA-MM-JJ.
export function monthBounds(monthLabel) {
  const i = monthIndex(monthLabel);
  const year = Math.floor(i / 12), month = (i % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}` };
}

// Provenance d'un dossier : uid du joueur, fiche PNJ, sinon nom (comme pour l'obstruction).
const provenanceOf = (d) => d?.userId || d?.antagonistId || `nom:${(d?.characterName || '').trim().toLowerCase()}`;

const bySpecOrder = (a, b) => {
  const ia = INFLUENCE_SPECIALIZATIONS.indexOf(a), ib = INFLUENCE_SPECIALIZATIONS.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'fr');
};

// Spécialités proposées quand rien n'est déclaré sur l'action : celle de la rumeur, celles des actions du dossier
// dans la catégorie (le conteur ne lit pas les profils joueurs) et, pour un PNJ, celles de sa fiche.
export function defaultRumorSpecs(rumor, dossier, antagonists = []) {
  const set = new Set();
  if (rumor?.specialization) set.add(rumor.specialization);
  (dossier?.actions || []).forEach(a => { if (a.category === rumor?.category && a.specialization) set.add(a.specialization); });
  const antag = dossier?.antagonistId && antagonists.find(x => x.id === dossier.antagonistId);
  (antag?.influences?.[rumor?.category]?.specs || []).forEach(s => { if (s?.spec) set.add(s.spec); });
  return [...set].sort(bySpecOrder);
}

// Spécialités déclarées dans le profil du joueur pour une catégorie (`specs` : [{ spec, name }]).
export const profileRumorSpecs = (specs = []) => [...new Set(specs.map(s => (s?.spec || '').trim()).filter(Boolean))].sort(bySpecOrder);

export const rumorsMissingSpecs = (actions, sheet) => [...new Set(actions.filter(isRumorAction)
  .filter(a => profileRumorSpecs(sheet?.[a.category]?.specs).length === 0).map(a => a.category))];

// À l'envoi du formulaire joueur : chaque rumeur reprend les spécialités du profil dans sa catégorie
// (le conteur ne lit pas les profils ; il les retrouve ainsi sur l'action et peut les ajuster).
export const withProfileRumorSpecs = (actions, sheet) => actions.map(a => (isRumorAction(a)
  ? { ...a, rumorSpecs: profileRumorSpecs(sheet?.[a.category]?.specs), monopoliste: Boolean(sheet?.monopoliste) }
  : a));

// Spécialités retenues :celles déclarées sur l'action (joueur, puis conteur) si la liste existe, sinon celles par défaut.
export const rumorSpecs = (rumor, dossier, antagonists = []) =>
  (Array.isArray(rumor?.rumorSpecs) ? [...rumor.rumorSpecs].sort(bySpecOrder) : defaultRumorSpecs(rumor, dossier, antagonists));

// Masque les noms de personnages dans un texte (prénoms et noms de 3 lettres ou plus, sans tenir compte de la casse).
export function anonymize(text, names = []) {
  const parts = [...new Set(names.flatMap(n => [n, ...String(n || '').split(/[\s'’-]+/)])
    .map(p => String(p || '').trim()).filter(p => p.length >= 3))]
    .sort((a, b) => b.length - a.length);
  return parts.reduce((out, p) => {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), '[…]');
  }, String(text || '')).replace(/\[…\](?:[\s'’-]+\[…\])+/g, '[…]');
}

// Trace par défaut, sans nom ni nom d'action : le nom d'une action du catalogue trahit le niveau
// de l'influence, que la règle ne révèle pas. Une action ciblée dit ce qu'elle a visé (la « manière »),
// jamais qui l'a faite ni quel personnage elle visait.
const NEUTRAL_TRACE = 'Usage de l’influence';
const CATEGORY_NAME = { gotha: 'Gotha', pegre: 'Pègre' };
const clip = (text, max = 220) => (text.length > max ? `${text.slice(0, max - 3).trimEnd()}…` : text);
const clean = (text, names) => anonymize(text, names).replace(/\s+/g, ' ').trim();

// `names` absent : version diffusable sans relecture, faite des seuls champs structurés (aucun texte libre du joueur).
function targetedTrace(act, names) {
  const free = (text) => (names ? clean(text, names) : '');
  const cat = (c) => CATEGORY_NAME[c] || CATEGORY_NAME[act.category] || '';
  switch (act.actionName) {
    case 'Obstruction': {
      const t = obstructionTarget(act);
      if (t.target === 'rumeurs') {
        return `Obstruction des rumeurs ${cat(t.category)} : ${t.scope === ALL_SPECIALTIES ? 'les 15 domaines' : t.scope}`;
      }
      const activity = free(t.text);
      return activity ? `Obstruction ${cat(t.category)} : ${clip(activity, 160)}` : `Obstruction d’une activité ${cat(t.category)}`;
    }
    case 'Soutien': {
      const supported = free(act.supportedInfluence);
      return supported ? `Soutien à l’influence ${clip(supported, 120)}` : `Soutien à une influence ${cat()}`;
    }
    case 'Attaque': {
      const target = free(act.targetDescription);
      return target ? `Attaque contre ${clip(target, 160)}` : `Attaque contre une influence ${cat(act.attackedCategory)}`;
    }
    case 'Défense': return `Défense d’une influence ${cat()}`;
    default: return NEUTRAL_TRACE;
  }
}

export function defaultTrace(act) {
  return act?.actionType === 'ciblée' ? targetedTrace(act) : NEUTRAL_TRACE;
}

// Trace préremplie à relire : pour une action ciblée, ce qu'elle a visé, puis la description (la manière),
// noms de personnages masqués, tronquée.
export function traceDraft(act, names = []) {
  const desc = clip(clean(act?.description, names));
  const head = act?.actionType === 'ciblée' ? targetedTrace(act, names) : '';
  if (!desc) return head || NEUTRAL_TRACE;
  return head ? `${head} — ${desc}` : desc;
}

// Une rumeur de conteur vaut comme un usage normal : même catégorie, spécialités (vide = toutes),
// période de validité qui recoupe un des mois de la rumeur (bornes facultatives).
// Renvoie le mois où elle apparaît (le plus récent de la période où elle est valable), sinon null.
export function seedMonth(seed, { category, specs, monthLabel, months = rumorPeriod(monthLabel) }) {
  if (!seed || seed.category !== category || !(seed.text || '').trim()) return null;
  const seedSpecs = seed.specs || [];
  if (seedSpecs.length && !seedSpecs.some(s => specs.includes(s))) return null;
  return [...months].reverse().find(m => {
    const { start, end } = monthBounds(m);
    return (!seed.from || seed.from <= end) && (!seed.to || seed.to >= start);
  }) || null;
}
export const seedApplies = (seed, ctx) => seedMonth(seed, ctx) !== null;

// Aperçu du tableau d'une action de rumeur.
// `rumor` : l'action (avec éventuellement rumorSpecs, rumorEdits, rumorExtra) ; `dossier` : son dossier ;
// `dossiers` : tous les dossiers d'influence ; `seeds` : rumeurs de conteur ; `names` : noms à masquer.
export function buildRumorTable({ rumor, dossier, dossiers = [], seeds = [], antagonists = [], names = [] }) {
  const category = rumor.category;
  const monthLabel = dossier.monthLabel;
  const months = rumorMonths(monthLabel, [...dossiers, dossier]);
  const specs = rumorSpecs(rumor, dossier, antagonists);
  const spent = Math.max(1, parseInt(rumor.actionsSpent, 10) || 1);
  const edits = rumor.rumorEdits || {};

  // Obstruction du cycle, spécialité par spécialité (une obstruction peut viser les 15 à la fois).
  const obstruction = Object.fromEntries(specs.map(spec => {
    const o = obstructionFor({ actionType: 'globale', actionName: rumorActionName(category), category, specialization: spec }, dossier, dossiers);
    return [spec, { level: o.level, needed: o.needed, sources: o.sources, blocked: spent <= o.level }];
  }));
  const blockedSpecs = specs.filter(s => obstruction[s].blocked);
  const openSpecs = specs.filter(s => !obstruction[s].blocked);

  // Noms à masquer : personnages, PNJ et lieutenants (atout Parangon).
  const allNames = [...names, ...dossiers.map(d => d.characterName), ...antagonists.map(a => a.name),
    ...dossiers.flatMap(d => [d.lieutenant?.name, ...(d.actions || []).map(a => a.lieutenantName)])].filter(Boolean);
  const rows = [];
  const own = provenanceOf(dossier);
  const inPeriod = new Set(months);
  dossiers.forEach(d => {
    if (!inPeriod.has(d.monthLabel) || provenanceOf(d) === own) return;
    (d.actions || []).forEach((act, idx) => {
      if (act.category !== category || !act.actionName) return;
      // « En lien avec vos spécialisations » : sans spécialité déclarée, le lien est laissé au conteur
      // (ligne proposée mais masquée tant qu'il ne l'affiche pas).
      const noSpec = !act.specialization;
      if (!noSpec && !specs.includes(act.specialization)) return;
      const key = `${d.id}:${act.id ?? idx}`;
      const edit = edits[key] || {};
      const draft = traceDraft(act, [...allNames, act.targetCharacter].filter(Boolean));
      // Trace relue une fois pour tous les tableaux (`rumorTrace` sur l'action d'origine),
      // sauf réécriture propre à ce joueur (`rumorEdits` de sa rumeur).
      const shared = act.rumorTrace ?? null;
      rows.push({
        key, source: 'usage', institution: (act.influenceName || '').trim(), month: d.monthLabel,
        category, specialization: act.specialization || '', actionName: act.actionName, actionType: act.actionType, actor: d.characterName,
        draft, fallback: defaultTrace(act), shared, override: edit.trace != null,
        trace: edit.trace ?? shared ?? draft, reviewed: edit.trace != null || shared != null,
        hidden: edit.hidden ?? noSpec, noSpec,
        obstructed: noSpec ? specs.length > 0 && openSpecs.length === 0 : obstruction[act.specialization].blocked,
      });
    });
  });

  seeds.forEach(seed => {
    const month = seedMonth(seed, { category, specs, monthLabel, months });
    if (!month) return;
    const key = `seed:${seed.id}`;
    const edit = edits[key] || {};
    const seedSpecs = (seed.specs || []).filter(s => specs.includes(s));
    const reachable = seedSpecs.length ? seedSpecs.some(s => openSpecs.includes(s)) : openSpecs.length > 0;
    rows.push({
      key, source: 'seed', institution: (seed.institution || '').trim(), month,
      specialization: seedSpecs.join(', '), draft: seed.text, fallback: seed.text,
      trace: edit.trace ?? seed.text, reviewed: true, hidden: Boolean(edit.hidden), obstructed: !reachable,
    });
  });

  (rumor.rumorExtra || []).forEach(x => {
    rows.push({
      key: `ajout:${x.id}`, source: 'ajout', institution: (x.institution || '').trim(), month: x.month || monthLabel,
      specialization: x.specialization || '', draft: x.trace || '', fallback: x.trace || '',
      trace: x.trace || '', reviewed: true, hidden: false, obstructed: false,
    });
  });

  rows.sort((a, b) => monthIndex(b.month) - monthIndex(a.month)
    || ({ ajout: 0, seed: 1, usage: 2 }[a.source] - { ajout: 0, seed: 1, usage: 2 }[b.source])
    || a.institution.localeCompare(b.institution, 'fr'));

  // Pas plus de spécialisations que le niveau dans la catégorie (règle de gestion des influences) ;
  // deux par point avec l'atout Monopoliste.
  const allowed = (parseInt(rumor.level, 10) || 0) * (rumor.monopoliste ? 2 : 1);
  return {
    months, specs, spent, obstruction, blockedSpecs,
    tooManySpecs: allowed > 0 && specs.length > allowed ? allowed : 0,
    blocked: specs.length > 0 && openSpecs.length === 0,
    rows,
    toReview: rows.filter(r => !r.hidden && !r.obstructed && !r.reviewed).length,
  };
}

// Tableau figé, tel que le joueur le verra : sans les lignes masquées ni obstruées, sans le mois
// (la règle ne révèle que les institutions ou individus impliqués et la manière) ;
// une trace non relue est remplacée par sa version neutre (jamais la description brute).
export function publishedRumorTable(preview) {
  return preview.rows.filter(r => !r.hidden && !r.obstructed && (r.reviewed ? r.trace : r.fallback).trim()).map(r => ({
    institution: r.institution || '—',
    specialization: r.specialization || '',
    trace: (r.reviewed ? r.trace : r.fallback).trim(),
  }));
}

// Champs à écrire sur l'action de rumeur au moment où le tableau est figé.
export function freezeRumor(args, frozenAt = new Date().toISOString()) {
  const preview = buildRumorTable(args);
  return { rumorTable: publishedRumorTable(preview), rumorCoveredSpecs: preview.specs, rumorFrozenAt: frozenAt, rumorObstructed: preview.blocked };
}

// Fige les rumeurs d'un dossier (diffusion) : renvoie la nouvelle liste d'actions.
// `keepFrozen` : garde tel quel un tableau déjà figé par un conteur.
export function freezeDossierRumors(dossier, ctx, frozenAt, { keepFrozen = false } = {}) {
  return (dossier.actions || []).map(act => (isRumorAction(act) && !(keepFrozen && act.rumorFrozenAt)
    ? { ...act, ...freezeRumor({ ...ctx, rumor: act, dossier }, frozenAt) }
    : act));
}

// Clé d'un usage (« dossier:action ») → nouvelle liste d'actions du dossier avec `patch` appliqué ;
// une valeur null retire le champ. Renvoie null si l'action n'existe plus.
export function patchUsage(dossier, key, patch) {
  const ref = key.slice(key.indexOf(':') + 1);
  const idx = (dossier?.actions || []).findIndex((a, i) => String(a.id ?? i) === ref);
  if (idx < 0) return null;
  const next = { ...dossier.actions[idx], ...patch };
  Object.keys(patch).forEach(k => { if (patch[k] == null) delete next[k]; });
  return dossier.actions.map((a, i) => (i === idx ? next : a));
}

// Traces à relire sur l'ensemble des rumeurs d'un cycle : chaque usage une seule fois, avec les tableaux
// où il sera diffusé, Gotha puis Pègre. `rumors` : [{ preview, dossier }] (dossier = celui de la rumeur).
export function usagesToReview(rumors = []) {
  const map = new Map();
  rumors.forEach(({ preview, dossier }) => preview.rows.forEach(r => {
    if (r.source !== 'usage') return;
    const u = map.get(r.key) || { ...r, readers: [] };
    if (!r.hidden && !r.obstructed && !r.override) u.readers.push(dossier.characterName);
    map.set(r.key, u);
  }));
  return [...map.values()].filter(u => u.readers.length)
    .map(u => ({ ...u, trace: u.shared ?? u.draft, reviewed: u.shared != null }))
    .sort((a, b) => a.category.localeCompare(b.category) || (a.reviewed - b.reviewed) || bySpecOrder(a.specialization || '~', b.specialization || '~')
      || monthIndex(b.month) - monthIndex(a.month) || a.institution.localeCompare(b.institution, 'fr'));
}

// Lignes regroupées par spécialité (ordre officiel), les spécialités couvertes sans ligne comprises ;
// une ligne sur plusieurs spécialités va sous la première, une ligne sans spécialité à la fin (« toute la catégorie »).
export function groupRumorRows(rows = [], specs = []) {
  const keyOf = (r) => (r.specialization || '').split(',')[0].trim();
  const keys = [...new Set([...specs, ...rows.map(keyOf)])].sort((a, b) => (a === '') - (b === '') || bySpecOrder(a, b));
  return keys.map(spec => ({ spec, rows: rows.filter(r => keyOf(r) === spec) }));
}
