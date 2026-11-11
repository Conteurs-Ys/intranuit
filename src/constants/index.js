export const CLANS = ["Brujah","Gangrel","Malkavian","Nosferatu","Toréador","Tremere","Ventrue","Assamite","Lasombra","Giovanni","Ravnos","Sethite","Caïtiff","Autre"];
export const SECTES = ["Camarilla","Anarch","Sabbat","Indépendant","Autre"];
export const ACTION_TYPES = ["Se nourrir","Patrouiller","Enquête","Artisanat","Déplacement","Apprentissage","Au-delà de vos moyens","AIP Espionnage/Attaque","Intrigue PNJ","Emplacement d'intérêt","Autre"];
export const ZONES = ["Centre-ville", "Périphérie", "Elyséum", "Hors de la ville", "Autre"];
export const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export const BONUS_ACTION_TYPES = ["Se nourrir", "Patrouiller", "Enquête", "Artisanat", "Déplacement", "Apprentissage", "Au-delà de vos moyens", "AIP Espionnage/Attaque", "Intrigue PNJ", "Autre"];

/* export const STORYTELLERS = [
  { id: 'st_alpha', name: 'Conteur Alpha', color: '#b91c1c' },
  { id: 'st_beta',  name: 'Conteur Beta',  color: '#1d4ed8' },
  { id: 'st_gamma', name: 'Conteur Gamma', color: '#047857' },
  { id: 'st_delta', name: 'Conteur Delta', color: '#7e22ce' },
]; */

export const INFLUENCE_SPECIALIZATIONS = [
  "Bureaucratie", "Crime", "Éducation", "Finances", "Haute Société",
  "Industrie", "Loi", "Média", "Occulte", "Police", "Politique",
  "Religion", "Rue", "Santé", "Transport"
];

export const INFLUENCE_CATEGORIES = ["Gotha", "Pègre"];

export const GOTHA_ACTIONS_GLOBALES = [
  { level: 1, name: "Un ami dans le besoin" },
  { level: 2, name: "Potins et délit d'initié" },
  { level: 3, name: "Erreurs Administratives" },
  { level: 4, name: "Désamorcer les problèmes" },
  { level: 5, name: "Pas de pique-assiettes" },
  { level: 6, name: "Tout a un prix" },
  { level: 7, name: "Collection privée" },
  { level: 8, name: "La débâcle d'une vedette" },
  { level: 9, name: "Le pouvoir derrière le Trône" },
  { level: 10, name: "Influence Régionale" },
];

export const PEGRE_ACTIONS_GLOBALES = [
  { level: 1, name: "Course gratuite" },
  { level: 2, name: "La Rumeur" },
  { level: 3, name: "Faveurs illégales" },
  { level: 4, name: "Déballer son linge sale en public" },
  { level: 5, name: "État d'urgence" },
  { level: 6, name: "Tirer les ficelles" },
  { level: 7, name: "Détourner le regard" },
  { level: 8, name: "Ce dont tu t'empares est tien" },
  { level: 9, name: "Une offre que vous ne pouvez refuser" },
  { level: 10, name: "Influence Régionale" },
];

export const ACTIONS_CIBLEES = [
  "Attaque", "Défense", "Obstruction", "Soutien"
];

export const RUMEUR_ACTIONS = ["La Rumeur", "Potins et délit d'initié"];
// Suggestions pour les scores utiles du profil (compétences MET, historiques, disciplines).
export const SCORE_SUGGESTIONS = {
  'Compétences': [
    'Animaux', 'Athlétisme', 'Bagarre', 'Commandement', 'Conduite', 'Empathie', 'Érudition', 'Esquive',
    'Expression', 'Furtivité', 'Informatique', 'Intimidation', 'Investigation', 'Linguistique', 'Médecine',
    'Mêlée', 'Armes à feu', 'Occultisme', 'Artisanat', 'Sciences', 'Sécurité', 'Subterfuge', 'Survie',
    'Vigilance', 'Connaissance de la rue',
  ],
  'Historiques': ['Alliés', 'Contacts', 'Mentor', 'Ressources', 'Serviteurs', 'Statut', 'Troupeau', 'Génération'],
  'Disciplines': [
    'Aliénation', 'Animalisme', 'Auspex', 'Célérité', 'Chimérie', 'Domination', 'Force d’âme', 'Nécromancie',
    'Obténébration', 'Occultation', 'Présence', 'Protéisme', 'Puissance', 'Quietus', 'Serpentis', 'Thaumaturgie',
  ],
};

// Ajouts rapides proposés dans le profil.
export const QUICK_SCORES = ['Investigation', 'Ressources', 'Occultisme', 'Furtivité', 'Intimidation', 'Troupeau'];
