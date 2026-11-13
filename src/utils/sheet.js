// Informations de jeu que le joueur renseigne dans son profil (pas une fiche validée) :
// elles ne font que préremplir ses formulaires d'AIP et d'influences.
import { emptyLieutenant, lieutenantOf } from './lieutenant.js';

export const emptySheet = () => ({
  gotha: { level: 0, specs: [] },
  pegre: { level: 0, specs: [] },
  informatique: false,
  troupeau: 0,
  monopoliste: false,
  transactionsLouches: false,
  parangon: false,
  lieutenant: emptyLieutenant(),
  sciences: [],
  bonuses: [],
  scores: [],
});

export const sheetOf = character => {
  const saved = character?.sheet || {};
  const sheet = { ...emptySheet(), ...saved };
  for (const category of ['gotha', 'pegre']) {
    sheet[category] = { level: 0, ...(saved[category] || {}), specs: Array.isArray(saved[category]?.specs) ? saved[category].specs : [] };
  }
  for (const field of ['sciences', 'bonuses', 'scores']) sheet[field] = Array.isArray(saved[field]) ? saved[field] : [];
  sheet.lieutenant = lieutenantOf(saved);
  return sheet;
};

export const scoreLabel = (s) => `${s.name} ${s.value}`;
