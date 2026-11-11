// Cycle d'inter-parties (`game_state/cycle`) — fonctions pures.
// { label: 'Octobre 2026', month, year, open?: boolean, step?: 1 | 2, deadline?: 'AAAA-MM-JJ' }
// - open : false = pas de cycle (l'été, par exemple) ; les joueurs ne déposent rien.
// - step : un cycle tous les 1 ou 2 mois ; donne le mois proposé pour le cycle suivant.
// - deadline : date limite affichée aux joueurs (le verrouillage reste manuel).
export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const isCycleOpen = (cycle) => cycle?.open !== false;
export const cycleStep = (cycle) => (Number(cycle?.step) === 2 ? 2 : 1);

export function cycleAt(month, year) {
  return { label: `${month} ${year}`, month, year };
}

// Mois décalé de `delta` à partir du cycle (passage d'année compris).
export function shiftCycle(cycle, delta) {
  const index = Number(cycle.year) * 12 + MONTHS.indexOf(cycle.month) + delta;
  return cycleAt(MONTHS[((index % 12) + 12) % 12], Math.floor(index / 12));
}

// Cycle proposé après celui-ci : selon le rythme réglé, rouvert, sans date limite.
export const nextCycle = (cycle) => ({ ...shiftCycle(cycle, cycleStep(cycle)), open: true, deadline: null });

// Mois proposés pour choisir le prochain cycle à la main (les 12 suivants).
export const upcomingCycles = (cycle, count = 12) => Array.from({ length: count }, (_, i) => shiftCycle(cycle, i + 1));

export const deadlineText = (iso) => (iso
  ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  : '');
