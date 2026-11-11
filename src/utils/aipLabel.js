// Nom affiché d'une AIP : pour les actions supplémentaires, on montre leur origine
// (Informatique, Sciences et son champ d'étude, ou un bonus nommé comme l'Homoncule) plutôt que le type générique « AIP Spécialisé ».
export function aipTypeLabel(action) {
  if (action?.bonusType === 'Informatique') {
    // Informatique peut servir à annuler ou observer l'AIP d'un autre personnage.
    const use = { annuler: 'annule', observer: 'observe' }[action.itUse];
    return use ? `AIP Informatique · ${use}${action.target ? ` l’AIP de ${action.target}` : ' une AIP'}` : 'AIP Informatique';
  }
  if (action?.bonusType === 'Autre') return action.subject ? `AIP ${action.subject}` : 'AIP bonus';
  if (action?.bonusType === 'Sciences') return `AIP Sciences${action.subject ? ` · ${action.subject}` : ''}`;
  return action?.type || '';
}

// Famille d'une AIP pour les filtres : les bonus sont regroupés (toutes les AIP de Sciences
// dans « AIP Sciences », quel que soit le champ d'étude), les autres gardent leur type.
export const AIP_BONUS_FAMILIES = ['AIP Informatique', 'AIP Sciences', 'AIP bonus'];
export function aipTypeKey(action) {
  if (action?.bonusType === 'Informatique') return 'AIP Informatique';
  if (action?.bonusType === 'Sciences') return 'AIP Sciences';
  if (action?.bonusType) return 'AIP bonus';
  return action?.type || 'Sans type';
}
