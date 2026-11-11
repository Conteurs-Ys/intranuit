// Traduit le statut technique d'un dossier (AIP ou influences) en ce que le
// joueur doit comprendre : peut-il encore modifier, et y a-t-il une réponse ?

const STATES = {
  todo: { label: 'À déposer', color: '#f58b90', bg: 'rgba(229,72,79,0.16)', editable: true },
  open: { label: 'Modifiable', color: '#8dbcf6', bg: 'rgba(95,160,242,0.14)', editable: true },
  processing: { label: 'En traitement', color: '#f3b26e', bg: 'rgba(236,148,64,0.14)', editable: false },
  answered: { label: 'Réponse disponible', color: '#9fd8b8', bg: 'rgba(110,190,150,0.13)', editable: false },
  locked: { label: 'Verrouillé', color: '#cfc5c3', bg: 'rgba(255,240,235,0.06)', editable: false },
};

export function dossierState(dossier) {
  if (!dossier) return { key: 'todo', ...STATES.todo };
  const key = { submitted: 'open', assigned: 'processing', completed: 'answered' }[dossier.status] || 'locked';
  return { key, ...STATES[key] };
}

// Les réponses ne sont montrées qu'une fois le dossier traité et diffusé.
export const hasAnswers = (dossier) => dossier?.status === 'completed';
