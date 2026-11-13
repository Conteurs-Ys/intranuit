// Atout Ventrue Parangon — fonctions pures.
// Règles (MET, atout Parangon) : +1 action d'influence par Influence contrôlée (Gotha et/ou Pègre) ;
// un lieutenant PNJ a 3 historiques parmi Ressources, Havre, Troupeau et Influence (Gotha ou Pègre), à 3, 2 et 1 points.
// Le joueur déclare les actions d'influence de son lieutenant dans son propre formulaire.

export const emptyLieutenant = () => ({ name: '', category: '', level: 0, specs: [], ressources: 0, havre: 0, troupeau: 0 });

const points = (v) => Math.min(3, Math.max(0, parseInt(v, 10) || 0));

export function lieutenantOf(sheet) {
  const saved = sheet?.lieutenant || {};
  return {
    ...emptyLieutenant(),
    name: String(saved.name || ''),
    category: ['gotha', 'pegre'].includes(saved.category) ? saved.category : '',
    level: points(saved.level),
    specs: Array.isArray(saved.specs) ? saved.specs : [],
    ressources: points(saved.ressources),
    havre: points(saved.havre),
    troupeau: points(saved.troupeau),
  };
}

// Parangon n'existe que pour un Ventrue.
export const hasParangon = (character, sheet) => character?.clan === 'Ventrue' && Boolean(sheet?.parangon);

// Lieutenant qui peut agir en influence : Parangon, une catégorie et au moins 1 point.
// Une spécialité par point d'influence (règle de base, pas de Monopoliste) : les premières renseignées comptent.
export function actingLieutenant(character, sheet) {
  if (!hasParangon(character, sheet)) return null;
  const lt = lieutenantOf(sheet);
  if (!lt.category || lt.level < 1) return null;
  return { ...lt, specs: lt.specs.filter(s => (s?.spec || '').trim()).slice(0, lt.level) };
}

// Actions d'influence en plus par catégorie : +1 dans chaque Influence du personnage (niveau 1 ou plus).
export function parangonBonus(character, sheet) {
  const on = hasParangon(character, sheet);
  return {
    gotha: on && (parseInt(sheet?.gotha?.level, 10) || 0) > 0 ? 1 : 0,
    pegre: on && (parseInt(sheet?.pegre?.level, 10) || 0) > 0 ? 1 : 0,
  };
}

// Fiche « comme un profil » pour les spécialités des rumeurs du lieutenant.
export const lieutenantSheet = (lt) => ({ [lt.category]: { level: lt.level, specs: lt.specs }, monopoliste: false });

// Ce que le conteur voit sur le dossier (il ne lit pas les profils).
export const lieutenantSummary = (lt) => ({
  name: lt.name.trim() || 'Lieutenant', category: lt.category, level: lt.level,
  specs: [...new Set(lt.specs.map(s => (s?.spec || '').trim()).filter(Boolean))],
  ressources: lt.ressources, havre: lt.havre, troupeau: lt.troupeau,
});
