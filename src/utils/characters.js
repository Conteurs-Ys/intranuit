// Plusieurs personnages par compte, un seul actif à la fois — fonctions pures.
//
// Le profil privé garde à son niveau `name`, `clan`, `sect`, `sheet` : ce sont ceux du personnage ACTIF (tout le code
// existant les lit). `characters` liste tous les personnages ; `activeCharacterId` désigne l'actif.
// Un profil sans `characters` vaut un seul personnage actif ('c1') ; un dossier sans `characterId` appartient
// au premier personnage du compte. Rien n'est réécrit dans la base pour les anciens comptes.
import { emptySheet } from './sheet.js';

export const STATUSES = { actif: 'Actif', retiré: 'Retiré', mort: 'Mort' };
const FIELDS = ['name', 'clan', 'sect', 'sheet'];
const pick = (src) => Object.fromEntries(FIELDS.filter(k => src?.[k] !== undefined).map(k => [k, src[k]]));

export function charactersOf(profile) {
  if (Array.isArray(profile?.characters) && profile.characters.length) return profile.characters;
  return [{ id: 'c1', ...pick(profile), status: 'actif' }];
}

export const activeCharacterId = (profile) =>
  profile?.activeCharacterId || charactersOf(profile).find(c => c.status === 'actif')?.id || charactersOf(profile)[0].id;

// Personnage d'un dossier (les anciens dossiers, sans identifiant, vont au premier personnage).
export const dossierCharacterId = (dossier, profile) => dossier?.characterId || charactersOf(profile)[0].id;
export const belongsTo = (dossier, characterId, profile) => dossierCharacterId(dossier, profile) === characterId;

// Le profil après une modification des champs du personnage actif : la liste suit.
export function syncActive(profile) {
  const id = activeCharacterId(profile);
  return {
    ...profile,
    activeCharacterId: id,
    characters: charactersOf(profile).map(c => (c.id === id ? { ...c, ...pick(profile), status: 'actif' } : c)),
  };
}

// Nouveau personnage : l'actuel devient « retiré » ou « mort », le nouveau devient actif (fiche vide).
export function startNewCharacter(profile, { name, clan, sect }, endStatus, now = new Date().toISOString()) {
  if (!['retiré', 'mort'].includes(endStatus)) throw new Error('Statut de fin inconnu');
  const synced = syncActive(profile);
  const ids = synced.characters.map(c => Number(String(c.id).replace(/\D/g, '')) || 0);
  const id = `c${Math.max(0, ...ids) + 1}`;
  const fresh = { id, name: String(name || '').trim(), clan: clan || '', sect: sect || '', sheet: emptySheet(), status: 'actif', createdAt: now };
  return {
    ...synced,
    ...pick(fresh),
    activeCharacterId: id,
    characters: [
      ...synced.characters.map(c => (c.id === synced.activeCharacterId ? { ...c, status: endStatus, endedAt: now } : c)),
      fresh,
    ],
  };
}

// Réactiver un ancien personnage (conteur ou admin) : l'actif actuel passe « retiré ».
export function reactivate(profile, id, now = new Date().toISOString()) {
  const synced = syncActive(profile);
  const target = synced.characters.find(c => c.id === id);
  if (!target || id === synced.activeCharacterId) return synced;
  return {
    ...synced,
    ...pick(target),
    sheet: target.sheet || emptySheet(),
    activeCharacterId: id,
    characters: synced.characters.map(c => {
      if (c.id === id) { const { endedAt, ...rest } = c; return { ...rest, status: 'actif' }; }
      return c.id === synced.activeCharacterId ? { ...c, status: 'retiré', endedAt: now } : c;
    }),
  };
}
