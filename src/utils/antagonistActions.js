// Tout PNJ actif est dans le tableau AIP (un PNJ sans statut est actif) ;
// en sommeil, mort ou disparu, il en sort mais garde ses actions et son historique.
export const isAntagonistInAips = (antag) => (antag?.status || 'actif') === 'actif';

// Bonus d'AIP d'un PNJ, comme pour un joueur (règles MET) :
// - Informatique : +1 AIP, action normale OU annuler / observer l'AIP d'un autre personnage ;
// - Sciences : +1 AIP par champ d'étude, réservée à une activité liée à ce champ ;
// - autres bonus nommés (Homoncule +2…).
export const IT_USES = [
  { value: 'normale', label: 'Action normale' },
  { value: 'annuler', label: 'Annuler une AIP' },
  { value: 'observer', label: 'Observer une AIP' },
];

// Champs d'étude : liste `sciences`, ou anciens champs `scienceCount` + `scienceTitle`.
export function npcSciences(antag) {
  if (Array.isArray(antag?.sciences)) return antag.sciences.map(s => (s || '').trim());
  const count = Math.max(0, parseInt(antag?.scienceCount || 0, 10) || 0);
  return Array.from({ length: count }, () => (antag?.scienceTitle || '').trim());
}

export function npcBonuses(antag) {
  return (Array.isArray(antag?.bonuses) ? antag.bonuses : [])
    .filter(b => (b?.name || '').trim())
    .map(b => ({ name: b.name.trim(), count: Math.max(1, parseInt(b.count, 10) || 1) }));
}

function createDefaultIntrigueAction() {
  return {
    type: 'Intrigue PNJ',
    zone: 'Elyséum / Atrium',
    description: '',
    response: '',
  };
}

const bonusAction = (bonusType, subject, extra = {}) => ({
  type: bonusType === 'Informatique' ? 'AIP Espionnage/Attaque' : bonusType === 'Sciences' ? 'Apprentissage' : 'Autre',
  subject, zone: 'Autre', description: '', response: '', bonusType, ...extra,
});

// Reprend une action existante du même type et du même sujet (sinon la suivante libre),
// pour ne jamais perdre un texte ou une sentence quand les bonus changent.
function pickExisting(pool, subject) {
  const i = pool.findIndex(a => (a.subject || '') === subject);
  const at = i >= 0 ? i : pool.findIndex(a => !a.subject);
  return at >= 0 ? pool.splice(at, 1)[0] : null;
}

export function buildAntagonistActions(existingActions = [], antagData) {
  const regularActions = existingActions.filter(action => !action?.bonusType);
  const baseActions = Array.from({ length: 3 }, (_, index) => (
    regularActions[index] ? { ...regularActions[index] } : createDefaultIntrigueAction()
  ));
  const extraRegularActions = regularActions.slice(3).map((action) => ({ ...action }));
  const existingITAction = existingActions.find((action) => action?.bonusType === 'Informatique');
  const sciencePool = existingActions.filter((action) => action?.bonusType === 'Sciences').map(a => ({ ...a }));
  const otherPool = existingActions.filter((action) => action?.bonusType === 'Autre').map(a => ({ ...a }));

  const actions = [...baseActions];

  if (antagData.hasIT) {
    actions.push(existingITAction ? { ...existingITAction } : bonusAction('Informatique', 'Informatique', { itUse: 'normale', target: '' }));
  }

  npcSciences(antagData).forEach(field => {
    const kept = pickExisting(sciencePool, field);
    actions.push(kept ? { ...kept, subject: field } : bonusAction('Sciences', field));
  });

  npcBonuses(antagData).forEach(({ name, count }) => {
    for (let n = 0; n < count; n++) {
      const kept = pickExisting(otherPool, name);
      actions.push(kept ? { ...kept, subject: name } : bonusAction('Autre', name));
    }
  });

  return actions.concat(extraRegularActions);
}

// Changer la présence, la visibilité ou l'identité ne reconstruit pas les actions.
// On préserve notamment les textes et les anciens bonus sans paramètres associés.
export function actionsForAntagonistUpdate(existing, next) {
  const bonusesKey = (a) => JSON.stringify([Boolean(a.hasIT), npcSciences(a), npcBonuses(a)]);
  const changed = bonusesKey(existing) !== bonusesKey(next);
  if (!changed && existing.actions?.length) return existing.actions;
  return buildAntagonistActions(existing.actions || [], next);
}

// Actions à afficher et à remplir : celles du PNJ, ou ses AIP par défaut s'il n'en a pas encore.
export const antagonistActionsOrDefault = (antag) => (antag.actions?.length ? antag.actions : buildAntagonistActions([], antag));

// Un ancien PNJ peut ne pas encore avoir d'actions enregistrées. À la diffusion,
// archiver les mêmes actions par défaut que le tableau, puis vider les textes.
export function nextAntagonistCycle(antag, month) {
  const actions = antagonistActionsOrDefault(antag);
  return {
    history: [...(antag.history || []), { month, actions }],
    actions: actions.map(action => ({ ...action, description: '', response: '' })),
  };
}

export function flattenAntagonistActions(antagonists) {
  return antagonists.filter(isAntagonistInAips).flatMap(antag => antagonistActionsOrDefault(antag).map((act, idx) => ({
    ...act,
    assignedTo: act.assignedTo ?? antag.assignedTo ?? '',
    aipId: antag.id,
    characterName: antag.name,
    sect: antag.sect,
    status: 'npc',
    actionIdx: idx,
    isBonus: Boolean(act.bonusType),
    isPlayer: false,
  })));
}
