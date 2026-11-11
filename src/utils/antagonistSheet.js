import { npcBonuses, npcSciences } from './antagonistActions.js';

// Fiche PNJ : statut, résumé d'influence et normalisation du formulaire.
// Tous les champs sont facultatifs en base : un ancien PNJ s'affiche comme « actif ».

export const NPC_STATUSES = [
  { value: 'actif', label: 'Actif' },
  { value: 'sommeil', label: 'En sommeil' },
  { value: 'mort', label: 'Mort' },
  { value: 'disparu', label: 'Disparu' },
];

export const npcStatus = (antag) => antag?.status || 'actif';
export const isNpcGone = (antag) => ['mort', 'disparu'].includes(npcStatus(antag));

const clamp = (v, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || 0));

function cleanInfluence(inf) {
  const level = clamp(inf?.level, 0, 5);
  const specs = (inf?.specs || [])
    .filter(s => s?.spec)
    .map(s => ({ spec: s.spec, network: (s.network || '').trim() }))
    .slice(0, Math.max(level, 0));
  return { level, specs };
}

// Champs de la fiche prêts à enregistrer (les actions et l'historique sont gérés à part).
export function sheetPayload(form) {
  return {
    name: (form.name || '').trim(),
    clan: form.clan || '',
    sect: form.sect || 'Antagoniste',
    status: form.status || 'actif',
    concept: (form.concept || '').trim(),
    notes: form.notes || '',
    assignedTo: form.assignedTo || '',
    knownToPlayers: Boolean(form.knownToPlayers),
    hasIT: Boolean(form.hasIT),
    // Sciences : un champ d'étude = une AIP. scienceCount/scienceTitle restent écrits pour les anciens écrans.
    sciences: npcSciences(form).filter(Boolean),
    scienceCount: npcSciences(form).filter(Boolean).length,
    scienceTitle: npcSciences(form).filter(Boolean)[0] || '',
    bonuses: npcBonuses(form),
    influences: { gotha: cleanInfluence(form.influences?.gotha), pegre: cleanInfluence(form.influences?.pegre) },
  };
}

// Nombre d'AIP du PNJ par cycle : 3 de base + Informatique + un par champ de Sciences + bonus nommés.
export const npcAipCount = (antag) => 3 + (antag?.hasIT ? 1 : 0) + npcSciences(antag).length
  + npcBonuses(antag).reduce((n, b) => n + b.count, 0);

// « Gotha 3 · Pègre 2 », ou chaîne vide si aucune influence.
export function influenceSummary(antag) {
  const parts = [];
  const g = clamp(antag?.influences?.gotha?.level, 0, 5);
  const p = clamp(antag?.influences?.pegre?.level, 0, 5);
  if (g) parts.push(`Gotha ${g}`);
  if (p) parts.push(`Pègre ${p}`);
  return parts.join(' · ');
}

// Influences du PNJ pour un mois : reliées par antagonistId, ou anciennes lignes à son nom.
export function npcInfluencesForMonth(influences = [], antag, month) {
  const name = (antag?.name || '').trim().toLowerCase();
  return influences.filter(inf => inf.status === 'npc' && inf.monthLabel === month && (
    inf.antagonistId ? inf.antagonistId === antag.id : (inf.characterName || '').trim().toLowerCase() === name
  ));
}
