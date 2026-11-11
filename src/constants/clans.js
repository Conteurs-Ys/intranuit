// Identité visuelle de chaque clan : couleur et emblème.
import {
  Flame, PawPrint, Brain, Rat, Drama, Sparkles, Crown, Sword, MoonStar, Hourglass,
  VenetianMask, Pyramid, Circle, Moon,
} from 'lucide-react';

export const CLAN_STYLES = {
  Brujah: { color: '#e5484f', icon: Flame },
  Gangrel: { color: '#5fb36f', icon: PawPrint },
  Malkavian: { color: '#e6c84a', icon: Brain },
  // « Noir » : un gris cendre très sombre reste lisible sur le fond de nuit.
  Nosferatu: { color: '#7d777b', icon: Rat },
  'Toréador': { color: '#e98bb3', icon: Drama },
  Tremere: { color: '#9a6cf0', icon: Sparkles },
  Ventrue: { color: '#5b8ff0', icon: Crown },
  Assamite: { color: '#c88f3c', icon: Sword },
  Lasombra: { color: '#8f95c9', icon: MoonStar },
  Giovanni: { color: '#6fae9f', icon: Hourglass },
  Ravnos: { color: '#3fb7c6', icon: VenetianMask },
  Sethite: { color: '#c9a23a', icon: Pyramid },
  'Caïtiff': { color: '#9a9295', icon: Circle },
  Autre: { color: '#b9b0b3', icon: Moon },
};

const DEFAULT_STYLE = CLAN_STYLES.Autre;

export function clanStyle(clan) {
  if (!clan) return DEFAULT_STYLE;
  const key = Object.keys(CLAN_STYLES).find(k => k.localeCompare(clan, 'fr', { sensitivity: 'base' }) === 0);
  return key ? CLAN_STYLES[key] : DEFAULT_STYLE;
}
