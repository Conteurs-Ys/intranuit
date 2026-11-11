// Catalogue des réseaux d'influence : les institutions mortelles que les conteurs
// rattachent aux actions d'influence (le joueur, lui, n'indique que sa spécialité).
// Fonctions pures, sans Firestore, pour pouvoir les tester.
import { INFLUENCE_SPECIALIZATIONS } from '../constants/index.js';

export const NETWORK_CATEGORIES = [
  { value: 'gotha', label: 'Gotha' },
  { value: 'pegre', label: 'Pègre' },
];

// Exemples génériques à adapter à la ville : deux par spécialité et par catégorie.
export const NETWORK_EXAMPLES = {
  'Bureaucratie': {
    gotha: ['Préfecture — cabinet du préfet', 'Direction régionale des finances publiques'],
    pegre: ['Guichetiers de la mairie', 'Agents du service des cartes grises'],
  },
  'Crime': {
    gotha: ['Cabinet d’avocats pénalistes réputé', 'Sociétés écrans de la holding locale'],
    pegre: ['Gang du quartier de la gare', 'Réseau de recel des puces'],
  },
  'Éducation': {
    gotha: ['Présidence de l’université', 'Conseil d’administration du lycée privé'],
    pegre: ['Surveillants de l’internat', 'Fournisseurs de faux diplômes'],
  },
  'Finances': {
    gotha: ['Direction régionale d’une banque privée', 'Cabinet de gestion de patrimoine'],
    pegre: ['Bureaux de change douteux', 'Prêteurs sur gages'],
  },
  'Haute Société': {
    gotha: ['Cercle privé des notables', 'Comité du gala de charité'],
    pegre: ['Personnel de maison des grandes familles', 'Chauffeurs et voituriers des soirées'],
  },
  'Industrie': {
    gotha: ['Direction de l’usine principale', 'Chambre de commerce et d’industrie'],
    pegre: ['Contremaîtres de la zone industrielle', 'Dockers et manutentionnaires'],
  },
  'Loi': {
    gotha: ['Tribunal judiciaire — présidence', 'Barreau — bâtonnier'],
    pegre: ['Greffiers et huissiers', 'Avocats commis d’office'],
  },
  'Média': {
    gotha: ['Rédaction du quotidien régional', 'Direction de la chaîne de télévision locale'],
    pegre: ['Blogueurs et comptes anonymes', 'Pigistes et photographes de faits divers'],
  },
  'Occulte': {
    gotha: ['Société savante d’ésotérisme', 'Antiquaires et collectionneurs'],
    pegre: ['Voyants et médiums de quartier', 'Librairie occulte de l’arrière-boutique'],
  },
  'Police': {
    gotha: ['Direction départementale de la sécurité publique', 'Commissaire central'],
    pegre: ['Agents de patrouille de nuit', 'Gardien de la salle des scellés'],
  },
  'Politique': {
    gotha: ['Cabinet du maire', 'Conseil départemental'],
    pegre: ['Militants et colleurs d’affiches', 'Assistants parlementaires'],
  },
  'Religion': {
    gotha: ['Évêché', 'Associations caritatives confessionnelles'],
    pegre: ['Sacristains et bedeaux', 'Petites communautés de prière'],
  },
  'Rue': {
    gotha: ['Associations de quartier subventionnées', 'Organisateurs d’événements de rue'],
    pegre: ['SDF du centre-ville', 'Gamins des cités'],
  },
  'Santé': {
    gotha: ['Direction du centre hospitalier', 'Ordre des médecins'],
    pegre: ['Infirmiers de nuit des urgences', 'Pharmacien peu regardant'],
  },
  'Transport': {
    gotha: ['Direction de la gare', 'Compagnie de transport régionale'],
    pegre: ['Chauffeurs de taxi de nuit', 'Routiers de l’aire d’autoroute'],
  },
};

const norm = (value) => (value || '').trim().toLocaleLowerCase('fr');

// Exemples à ajouter, sans doublon avec ce qui existe déjà (même catégorie, spécialité et nom).
export function examplesToAdd(existing = []) {
  const known = new Set(existing.map(n => `${n.category}|${n.specialization}|${norm(n.name)}`));
  const list = [];
  INFLUENCE_SPECIALIZATIONS.forEach(specialization => {
    NETWORK_CATEGORIES.forEach(({ value: category }) => {
      (NETWORK_EXAMPLES[specialization]?.[category] || []).forEach(name => {
        if (!known.has(`${category}|${specialization}|${norm(name)}`)) list.push({ category, specialization, name, notes: '' });
      });
    });
  });
  return list;
}

// Réseaux proposés pour une action : même catégorie, la spécialité d'abord.
export function networkOptions(networks = [], category, specialization) {
  const inCategory = networks.filter(n => !category || n.category === category);
  const sorted = [...inCategory].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
  const first = sorted.filter(n => specialization && n.specialization === specialization);
  const rest = sorted.filter(n => !specialization || n.specialization !== specialization);
  return [...first, ...rest];
}

// Regroupe le catalogue par spécialité (ordre officiel), puis par catégorie.
export function groupNetworks(networks = []) {
  return INFLUENCE_SPECIALIZATIONS.map(specialization => {
    const own = networks.filter(n => n.specialization === specialization);
    const byCategory = Object.fromEntries(NETWORK_CATEGORIES.map(({ value }) => [
      value,
      own.filter(n => n.category === value).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')),
    ]));
    return { specialization, count: own.length, ...byCategory };
  });
}

export const isInCatalog = (networks = [], category, name) =>
  Boolean(name) && networks.some(n => n.category === category && norm(n.name) === norm(name));
