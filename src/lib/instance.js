// Identité de l'instance : chaque association affiche sa ville ou sa chronique.
// Réglée pour l'instant dans .env ; passera dans les paramètres admin (lot 5).
const env = import.meta.env;

export const INSTANCE = {
  city: (env.VITE_INSTANCE_CITY || '').trim(),
  chronicle: (env.VITE_INSTANCE_CHRONICLE || '').trim(),
};

// Sous-titre affiché sous le logo : « Chronique de Lyon », le nom de la chronique, ou la mention par défaut.
export function instanceSubtitle(identity = INSTANCE) {
  if (identity.chronicle) return identity.chronicle;
  if (identity.city) return `Chronique de ${identity.city}`;
  return 'FCF · Moteur de chronique';
}

export const instanceTitle = INSTANCE.city ? `Intranuit · ${INSTANCE.city}` : 'Intranuit';
