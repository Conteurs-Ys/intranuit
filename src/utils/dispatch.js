// Vérification avant diffusion : seuls les dossiers joueurs à diffuser comptent.
// Les emplacements vides et les PNJ n'exigent pas de réponse.
export function unansweredPlayerActions(aips = [], influences = []) {
  const player = dossier => Boolean(dossier.userId)
    && !dossier.userId.startsWith('historical_') && !dossier.antagonistId
    && ['submitted', 'assigned'].includes(dossier.status);
  const missing = action => Boolean(action.description?.trim()) && !action.response?.trim();
  return {
    aips: aips.filter(player).reduce((count, dossier) => count + [...(dossier.actions || []), ...(dossier.bonus || [])].filter(missing).length, 0),
    influences: influences.filter(player).reduce((count, dossier) => count + (dossier.actions || []).filter(missing).length, 0),
  };
}
