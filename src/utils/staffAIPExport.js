import { antagonistActionsOrDefault, isAntagonistInAips } from './antagonistActions.js';

// Les AIP courantes des PNJ sont dans leur fiche ; les cycles diffusés dans history.
export function staffAIPEntries(aips, antagonists, monthLabel, currentCycle) {
  const players = aips.filter(a => a.monthLabel === monthLabel && !a.userId?.startsWith('historical_'));
  const npcs = antagonists.flatMap(npc => {
    const archived = (npc.history || []).find(entry => entry.month === monthLabel);
    const actions = monthLabel === currentCycle
      ? (isAntagonistInAips(npc) ? antagonistActionsOrDefault(npc) : null)
      : archived?.actions;
    if (!actions) return [];
    return [{
      antagonistId: npc.id, characterName: npc.name, clan: npc.clan || '', sect: npc.sect || '',
      monthLabel, status: 'npc',
      actions: actions.filter(a => !a.bonusType), bonus: actions.filter(a => a.bonusType),
    }];
  });
  return [...players, ...npcs];
}
