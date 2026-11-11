// Helpers communs pour manipuler les libellés de mois ("Avril 2026") utilisés
// par la console de régence (AIP, influences, antagonistes).

export const MONTHS_ORDER = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function monthLabelToDate(label) {
  const [month, year] = (label || '').split(' ');
  return new Date(parseInt(year), MONTHS_ORDER.indexOf(month), 1);
}

export function isLiveEntry(entry) {
  return !(entry?.userId || '').startsWith('historical_');
}

export function sortMonthLabelsDesc(labels) {
  return [...labels].sort((a, b) => monthLabelToDate(b) - monthLabelToDate(a));
}

// `items` doit déjà être filtré (entrées vivantes uniquement) par l'appelant.
export function getAvailableYears(items, extraYears = []) {
  return [...new Set([...items.map(i => i.year), ...extraYears].filter(Boolean))].sort((a, b) => b - a);
}

export function getMonthsForYear(items, year, extraLabels = []) {
  return sortMonthLabelsDesc([...new Set([
    ...items.filter(i => i.year === year).map(i => i.monthLabel),
    ...extraLabels,
  ].filter(Boolean))]);
}

export function getAllMonthLabels(items) {
  return sortMonthLabelsDesc([...new Set(items.map(i => i.monthLabel))]);
}

// Mois le plus récent réellement disponible parmi `monthsForYear` (déjà trié
// desc), avec repli sur le cycle courant puis sur une chaîne vide.
export function pickEffectiveMonth(monthsForYear, selectedMonth, cycleLabel) {
  if (monthsForYear.includes(selectedMonth)) return selectedMonth;
  return monthsForYear[0] || cycleLabel || '';
}
