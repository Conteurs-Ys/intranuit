import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actorOf, actorKey, sameActor, activeLossLevels, attackCost, attackLevelsFor, defenseOf, levelCheck, lossPeriod, monthIndex, refreshLossPeriod, resolveAttacks, supportAfterLosses, supportLevels, supportReceived,
} from '../src/utils/influenceRules.js';

const M = 'Octobre 2026';
const atk = (extra) => ({ actionType: 'ciblée', actionName: 'Attaque', category: 'gotha', actionsSpent: 2, ...extra });
const def = (extra) => ({ actionType: 'ciblée', actionName: 'Défense', category: 'gotha', actionsSpent: 1, ...extra });

test('attaque : exemples de Sariah (règles)', () => {
  assert.equal(attackCost(1, 'gotha', 'gotha'), 2);
  assert.equal(attackCost(1, 'gotha', 'pegre'), 3);
  assert.equal(attackCost(2, 'gotha', 'gotha'), 4);
  assert.equal(attackCost(2, 'gotha', 'pegre'), 6);
  assert.equal(attackLevelsFor(4, 'gotha', 'gotha'), 2);
  assert.equal(attackLevelsFor(5, 'gotha', 'pegre'), 1);
});

test('défense : réduit chaque attaque sur la catégorie défendue seulement', () => {
  const dossiers = [
    { id: 'a', userId: 'sariah', characterName: 'Sariah', monthLabel: M, actions: [atk({ actionsSpent: 4, attackedCategory: 'gotha', targetResolved: { kind: 'pj', id: 'perse' } })] },
    { id: 'b', userId: 'bob', characterName: 'Bob', monthLabel: M, actions: [atk({ category: 'pegre', actionsSpent: 2, attackedCategory: 'pegre', targetResolved: { kind: 'pj', id: 'perse' } })] },
    { id: 'c', userId: 'perse', characterName: 'Perséphone', monthLabel: M, actions: [def({ category: 'gotha', actionsSpent: 1 })] },
  ];
  assert.equal(defenseOf({ kind: 'pj', id: 'perse' }, 'gotha', dossiers, M), 1);
  assert.equal(defenseOf({ kind: 'pj', id: 'perse' }, 'pegre', dossiers, M), 0);
  const [r1, r2] = resolveAttacks(dossiers, M);
  assert.deepEqual([r1.bought, r1.defense, r1.levelsLost], [2, 1, 1]);
  assert.deepEqual([r2.bought, r2.defense, r2.levelsLost], [1, 0, 1]);
});

test('attaque sans cible confirmée : pas de résultat ; actions en trop signalées', () => {
  const [r] = resolveAttacks([{ id: 'a', userId: 'x', monthLabel: M, actions: [atk({ actionsSpent: 5, attackedCategory: 'gotha' })] }], M);
  assert.equal(r.levelsLost, null);
  assert.equal(r.bought, 2);
  assert.equal(r.wasted, 1);
});

test('soutien : N → N+1 coûte N, plafond 10 (exemple 5 → 10 = 35)', () => {
  assert.deepEqual(supportLevels(5, 5), { level: 6, gained: 1, rest: 0 });
  assert.equal(supportLevels(5, 35).level, 10);
  assert.equal(supportLevels(5, 34).level, 9);
  assert.equal(supportLevels(9, 100).level, 10);
  assert.equal(supportLevels(0, 10).level, 0);
});

test('soutien reçu : même catégorie, pas soi-même, malus hors praxis', () => {
  const target = { kind: 'pj', id: 'edward' };
  const sup = (extra) => ({ actionType: 'ciblée', actionName: 'Soutien', category: 'pegre', actionsSpent: 5, targetResolved: target, ...extra });
  const dossiers = [
    { userId: 'a', monthLabel: M, actions: [sup()] },
    { userId: 'b', monthLabel: M, actions: [sup({ category: 'gotha' })] },
    { userId: 'edward', monthLabel: M, actions: [sup()] },
    { characterName: 'Tania (Bordeaux)', monthLabel: M, actions: [sup({ fromOutside: true })] },
  ];
  assert.equal(supportReceived(target, 'pegre', dossiers, M, -2), 5 + 3);
});

test('pertes actives pendant leur période seulement', () => {
  const idx = (m) => ({ 'Septembre 2026': 9, 'Octobre 2026': 10, 'Novembre 2026': 11, 'Décembre 2026': 12 }[m]);
  const losses = [{ target: { kind: 'pj', id: 'p' }, category: 'gotha', levels: 1, fromMonth: 'Novembre 2026', untilMonth: 'Décembre 2026' }];
  assert.equal(activeLossLevels(losses, { kind: 'pj', id: 'p' }, 'gotha', 'Octobre 2026', idx), 0);
  assert.equal(activeLossLevels(losses, { kind: 'pj', id: 'p' }, 'gotha', 'Décembre 2026', idx), 1);
  assert.equal(activeLossLevels(losses, { kind: 'pj', id: 'p' }, 'pegre', 'Décembre 2026', idx), 0);
});

test('soutien après pertes : résumé et contrôle de niveau donnent le même résultat', () => {
  const action = { actionType: 'globale', category: 'gotha', actionName: 'Désamorcer les problèmes' };
  const result = supportAfterLosses(5, 2, 3);
  assert.deepEqual(result, { level: 4, gained: 1, rest: 0 });
  assert.equal(levelCheck(action, { baseLevel: 5, lossLevels: 2, supportPoints: 3 }).supported, result.level);
  assert.equal(supportAfterLosses(2, 3, 10).level, 0);
});

test('un soutien envoyé hors de la ville ne profite jamais à une ancienne cible locale', () => {
  const target = { kind: 'pj', id: 'p' };
  const dossiers = [{ userId: 'a', monthLabel: M, actions: [{
    actionType: 'ciblée', actionName: 'Soutien', category: 'gotha', actionsSpent: 5,
    targetResolved: target, supportOutside: true,
  }] }];
  assert.equal(supportReceived(target, 'gotha', dossiers, M), 0);
});

test('Transactions louches : 1 action par niveau dans la même catégorie, 3 contre l\'autre', () => {
  assert.equal(attackCost(2, 'pegre', 'pegre', true), 2);
  assert.equal(attackCost(2, 'pegre', 'gotha', true), 6);
  assert.equal(attackLevelsFor(3, 'gotha', 'gotha', true), 3);
  const [r] = resolveAttacks([{ id: 'd', monthLabel: M, userId: 'u', actions: [
    { actionType: 'ciblée', actionName: 'Attaque', category: 'pegre', actionsSpent: 3, transactionsLouches: true },
  ] }], M);
  assert.equal(r.bought, 3);
  assert.equal(r.wasted, 0);
});

test('contrôle de niveau : base − pertes, + soutien, +1 spécialité', () => {
  const action = { actionType: 'globale', category: 'gotha', actionName: 'Désamorcer les problèmes' }; // niveau 4
  assert.equal(levelCheck(action, { baseLevel: 3 }).ok, false);
  assert.equal(levelCheck({ ...action, specialization: 'Police' }, { baseLevel: 3 }).ok, true);
  assert.equal(levelCheck({ ...action, specialization: 'Police' }, { baseLevel: 3, lossLevels: 1 }).ok, false);
  assert.equal(levelCheck(action, { baseLevel: 3, supportPoints: 3 }).effective, 4);
  assert.equal(levelCheck({ actionType: 'ciblée', actionName: 'Attaque', category: 'gotha' }, { baseLevel: 1 }), null);
  // Niveau naturel de 1 à 5 : une base de 9 sans soutien est comptée 5 et signalée.
  const high = levelCheck(action, { baseLevel: 9 });
  assert.equal(high.baseTooHigh, true);
  assert.equal(high.supported, 5);
  assert.equal(levelCheck(action, { baseLevel: 5 }).baseTooHigh, false);
  // Anciens intitulés du tableur, niveau en puces.
  assert.equal(levelCheck({ ...action, actionName: `••• ${action.actionName}` }, { baseLevel: 3 })?.required, levelCheck(action, { baseLevel: 3 }).required);
});

test('durée réglementaire : deux sessions de jeu ou un mois, jamais deux cycles', () => {
  assert.throws(() => lossPeriod({ resolutionMonth: M }), /date réelle/);
  const pending = lossPeriod({ resolutionMonth: 'Octobre 2026', resolvedOn: '2026-10-30' });
  assert.equal(pending.sessionsPending, true);
  assert.equal(pending.untilDate, null);
  assert.equal(pending.untilMonth, null);
  assert.equal(pending.minimumUntilDate, '2026-11-30');
  // Deux parties en 3 semaines : on garde le mois (le plus long).
  const shortParties = lossPeriod({ resolutionMonth: 'Octobre 2026', mode: 'parties', resolvedOn: '2026-10-30', partyDates: ['2026-11-07', '2026-11-21'] });
  assert.equal(shortParties.untilDate, '2026-11-30');
  // Parties espacées : la 2e partie, plus tardive, l'emporte.
  const spaced = lossPeriod({ resolutionMonth: 'Octobre 2026', mode: 'parties', resolvedOn: '2026-10-30', partyDates: ['2026-10-01', '2026-11-28', '2027-01-16'] });
  assert.equal(spaced.untilDate, '2027-01-16');
  assert.equal(spaced.untilMonth, 'Janvier 2027');
});

test('perte sans deuxième session : reste active, même après un mois ; calendrier recalculé', () => {
  const target = { kind: 'pj', id: 'p' };
  const loss = { target, category: 'gotha', levels: 1, source: { month: M }, ...lossPeriod({ resolutionMonth: M, resolvedOn: '2026-10-30', partyDates: ['2026-11-07'] }) };
  assert.equal(activeLossLevels([loss], target, 'gotha', 'Décembre 2026', monthIndex, '2026-12-15'), 1);
  const updated = refreshLossPeriod(loss, ['2026-11-07', '2027-01-16']);
  assert.equal(updated.untilDate, '2027-01-16');
  assert.equal(activeLossLevels([updated], target, 'gotha', 'Janvier 2027', monthIndex, '2027-01-15'), 1);
  assert.equal(activeLossLevels([updated], target, 'gotha', 'Janvier 2027', monthIndex, '2027-01-17'), 0);
  assert.equal(refreshLossPeriod(updated, ['2026-11-07']).sessionsPending, true);
});

test('perte finie en cours de mois : comptée pour ce mois, même résolu après', () => {
  const target = { kind: 'pj', id: 'p' };
  const loss = { target, category: 'pegre', levels: 1, source: { month: M }, ...lossPeriod({ resolvedOn: '2026-10-28', partyDates: ['2026-11-07', '2026-11-21'] }) };
  assert.equal(loss.untilDate, '2026-11-28');
  assert.equal(activeLossLevels([loss], target, 'pegre', 'Novembre 2026', monthIndex), 1);
  assert.equal(activeLossLevels([loss], target, 'pegre', 'Décembre 2026', monthIndex), 0);
  assert.equal(activeLossLevels([loss], target, 'pegre', 'Novembre 2026', monthIndex, '2026-11-29'), 0);
});

test('les sessions dupliquées ne comptent pas deux fois ; les actions entreprises restent intactes', () => {
  const period = lossPeriod({ resolutionMonth: M, resolvedOn: '2026-10-30', partyDates: ['2026-11-07', '2026-11-07'] });
  assert.equal(period.sessionsPending, true);
  const target = { kind: 'pj', id: 'p' };
  const loss = { target, category: 'gotha', levels: 1, source: { month: M }, ...period };
  assert.equal(activeLossLevels([loss], target, 'gotha', M, monthIndex, '2026-10-31'), 0);
  assert.deepEqual(refreshLossPeriod({ ...loss, periodOverride: true }, ['2026-11-07', '2026-12-07']), { ...loss, periodOverride: true });
});

test('niveau avec soutiens déclaré : calculé depuis la base, écart signalé', () => {
  const action = { actionType: 'globale', category: 'gotha', actionName: 'Le pouvoir derrière le Trône', supportedLevel: 7 }; // niveau 9
  const ok = levelCheck(action, { baseLevel: 5, supportPoints: 5 + 6 });
  assert.equal(ok.supported, 7);
  assert.equal(ok.supportMismatch, false);
  const short = levelCheck(action, { baseLevel: 5, supportPoints: 5 });
  assert.equal(short.supported, 6);
  assert.equal(short.supportMismatch, true);
  assert.equal(short.declaredSupported, 7);
  assert.equal(levelCheck({ ...action, supportedLevel: '' }, { baseLevel: 5 }).declaredSupported, null);
});

test('perte en fin de mois : un mois après le 31 janvier finit en février', () => {
  assert.equal(lossPeriod({ resolutionMonth: 'Janvier 2027', mode: 'parties', resolvedOn: '2027-01-31', partyDates: ['2027-02-05', '2027-02-12'] }).untilDate, '2027-02-28');
  assert.equal(lossPeriod({ resolutionMonth: 'Janvier 2028', mode: 'parties', resolvedOn: '2028-01-31', partyDates: ['2028-02-05', '2028-02-12'] }).untilDate, '2028-02-29');
});


test('identité : deux personnages du même compte sont distincts, anciennes références sur c1', () => {
  const old = actorOf({ userId: 'alice' });
  const next = actorOf({ userId: 'alice', characterId: 'c2' });
  assert.equal(sameActor(old, next), false);
  assert.equal(sameActor(old, { kind: 'pj', id: 'alice' }), true);
  assert.equal(actorKey(old), actorKey({ kind: 'pj', id: 'alice' }));
  assert.notEqual(actorKey(old), actorKey(next));
  assert.equal(sameActor({ kind: 'pnj', id: 'baron' }, { kind: 'pnj', id: 'baron' }), true);
});

test('pertes : une ancienne perte ne suit pas un nouveau personnage, une perte explicite reste au sien', () => {
  const old = { kind: 'pj', id: 'alice' };
  const next = { ...old, characterId: 'c2' };
  const loss = { target: old, category: 'pegre', levels: 2, fromMonth: 'Octobre 2026', untilMonth: 'Décembre 2026' };
  assert.equal(activeLossLevels([loss], old, 'pegre', 'Novembre 2026', monthIndex), 2);
  assert.equal(activeLossLevels([loss], next, 'pegre', 'Novembre 2026', monthIndex), 0);
  assert.equal(activeLossLevels([{ ...loss, target: next }], next, 'pegre', 'Novembre 2026', monthIndex), 2);
  assert.equal(activeLossLevels([{ ...loss, target: next }], old, 'pegre', 'Novembre 2026', monthIndex), 0);
});

test('soutien et défense : aucun transfert entre les personnages d’un même compte', () => {
  const next = { kind: 'pj', id: 'alice', characterId: 'c2' };
  const old = { kind: 'pj', id: 'alice' };
  const month = 'Octobre 2026';
  const docs = [
    { userId: 'bob', monthLabel: month, actions: [{ actionType: 'ciblée', actionName: 'Soutien', category: 'pegre', actionsSpent: 3, targetResolved: old }] },
    { userId: 'alice', monthLabel: month, actions: [{ actionType: 'ciblée', actionName: 'Défense', category: 'pegre', actionsSpent: 2 }] },
  ];
  assert.equal(supportReceived(old, 'pegre', docs, month), 3);
  assert.equal(supportReceived(next, 'pegre', docs, month), 0);
  assert.equal(defenseOf(next, 'pegre', docs, month), 0);
  const explicit = [{ ...docs[0], actions: [{ ...docs[0].actions[0], targetResolved: next }] }];
  assert.equal(supportReceived(next, 'pegre', explicit, month), 3);
  assert.equal(supportReceived(old, 'pegre', explicit, month), 0);
});
