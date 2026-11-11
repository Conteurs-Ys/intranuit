// Se nourrir entre deux parties (règles MET, « Actions Inter-Partie » et historique Troupeau) — fonctions pures.
//
// BESOIN    : 1 AIP pour se nourrir ; Ventrue : 1 de plus (désavantage de clan). Le conteur peut corriger.
// TROUPEAU  : réduit le besoin de son niveau ; un Troupeau qui couvre le besoin dispense de l'AIP de chasse.
// PRÊT      : les points au-delà du besoin peuvent nourrir d'autres personnages (prêt validé par un conteur).
// SANS RIEN : arrivée en jeu avec la moitié de la réserve de sang.
//
// Sur le dossier d'AIP :
// - `feeding: { troupeau, borrowFrom: { id, name } | null }` écrit par le joueur à l'envoi (Troupeau copié du profil,
//   le conteur ne lisant pas les profils) ;
// - `feedingReview: { borrowFrom, borrow: 'accepted' | 'refused', blood: 'full' | 'half' }` écrit par le conteur.

export const FEEDING_ACTION = 'Se nourrir';
const num = (v) => Math.max(0, parseInt(v, 10) || 0);

export const feedingNeed = (clan) => (clan === 'Ventrue' ? 2 : 1);
export const troupeauOf = (dossier) => Math.min(5, num(dossier?.feeding?.troupeau));
// Une AIP de chasse ne compte que si elle est décrite.
export const feedingActions = (dossier) =>
  [...(dossier?.actions || []), ...(dossier?.bonus || [])].filter(a => a.type === FEEDING_ACTION && a.description?.trim()).length;

// Points de Troupeau que ce personnage peut prêter : ce qui dépasse son propre besoin.
export const troupeauSurplus = (dossier) => Math.max(0, troupeauOf(dossier) - feedingNeed(dossier?.clan));

// Ce qu'il manque pour se nourrir avec ses propres moyens (AIP de chasse + Troupeau).
export const feedingMissing = (dossier) =>
  Math.max(0, feedingNeed(dossier?.clan) - troupeauOf(dossier) - feedingActions(dossier));

// Emprunt déclaré : null (aucun), 'pending', 'accepted' ou 'refused'.
// Une décision du conteur ne vaut que pour le prêteur qu'il a jugé.
export function borrowState(dossier) {
  const from = dossier?.feeding?.borrowFrom?.id;
  if (!from) return null;
  const review = dossier.feedingReview;
  return review?.borrowFrom === from && review.borrow ? review.borrow : 'pending';
}

// Bilan du dossier : réserve de sang à la prochaine partie, calculée puis corrigée au besoin par le conteur.
export function feedingStatus(dossier) {
  const need = feedingNeed(dossier?.clan);
  const troupeau = troupeauOf(dossier);
  const actions = feedingActions(dossier);
  const missing = feedingMissing(dossier);
  const borrow = borrowState(dossier);
  const borrowed = missing && borrow === 'accepted' ? missing : 0;
  const auto = missing - borrowed > 0 ? 'half' : 'full';
  const override = dossier?.feedingReview?.blood || null;
  return { need, troupeau, actions, missing, borrow, borrowed, auto, blood: override || auto, overridden: Boolean(override && override !== auto) };
}

// Prêts demandés sur le Troupeau d'un personnage pour le cycle : qui emprunte, combien, et ce qu'il peut prêter
// (inconnu si le prêteur n'a pas déposé ses AIP, son Troupeau n'étant connu que par son dossier).
export function troupeauLoans(dossiers, ownerId) {
  const owner = dossiers.find(d => d.userId === ownerId);
  const borrowers = dossiers.filter(d => d.userId !== ownerId && d.feeding?.borrowFrom?.id === ownerId && feedingMissing(d) > 0)
    .map(d => ({ dossier: d, points: feedingMissing(d), state: borrowState(d) }));
  const sum = (list) => list.reduce((s, b) => s + b.points, 0);
  const surplus = owner ? troupeauSurplus(owner) : null;
  const accepted = sum(borrowers.filter(b => b.state === 'accepted'));
  return { owner, surplus, borrowers, requested: sum(borrowers.filter(b => b.state !== 'refused')), accepted, over: surplus !== null && accepted > surplus };
}

export const bloodLabel = (blood) => (blood === 'half' ? 'Moitié de la réserve de sang' : 'Réserve de sang pleine');
