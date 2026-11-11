import { test } from 'node:test';
import { deepEqual, equal, throws } from 'node:assert/strict';
import { isLearningHistory, learningStatus, learningFields, learningDecision, learningEdit } from '../src/utils/learnings.js';

const at = '2026-10-28T19:00:00.000Z';
const request = { characterName: 'Malachie Roux', clan: 'Brujah', type: 'Discipline', action: 'Domination', currentLevel: 2, levels: [3], mentor: 'Le Baron', xp: 7, notes: 'Vérifier le mentor', status: 'pending' };

test('les anciennes lignes restent consultables dans l’historique sans être réécrites', () => {
  equal(learningStatus({}), 'legacy');
  equal(learningStatus({ status: 'ancien-import' }), 'legacy');
  equal(isLearningHistory({}), true);
  equal(isLearningHistory(request), false);
  equal(isLearningHistory({ status: 'approved' }), true);
});

test('les niveaux saisis sont normalisés', () => {
  const fields = learningFields({ ...request, levels: [3, '2', 3], currentLevel: '' });
  deepEqual(fields.levels, [2, 3]);
  equal(fields.currentLevel, null);
});

test('les niveaux négatifs et non numériques sont refusés', () => {
  throws(() => learningFields({ ...request, currentLevel: -1 }), /niveau/);
  throws(() => learningFields({ ...request, currentLevel: 'inconnu' }), /niveau/);
  throws(() => learningFields({ ...request, levels: [2.5] }), /entiers/);
});

test('valider une demande fixe son acquisition sur le même document et garde la trace de la décision', () => {
  const result = learningDecision(request, request, 'approved', 'conteur', at);
  equal(result.status, 'approved');
  equal(result.date, '2026-10-28');
  equal(result.decidedBy, 'conteur');
  equal(result.audit[0].event, 'approved');
  equal(result.audit[0].before.status, 'pending');
  equal(result.audit[0].after.status, 'approved');
  equal(request.status, 'pending');
});

test('une validation incomplète ne crée pas une acquisition', () => {
  throws(() => learningDecision({ ...request, action: '' }, { ...request, action: '' }, 'approved', 'conteur', at), /Renseignez/);
});

test('une deuxième décision est bloquée, y compris après un refus', () => {
  throws(() => learningDecision({ ...request, status: 'approved' }, request, 'approved', 'conteur', at), /déjà/);
  throws(() => learningDecision({ ...request, status: 'rejected' }, request, 'approved', 'conteur', at), /déjà/);
  throws(() => learningDecision({ ...request, status: undefined }, request, 'approved', 'conteur', at), /déjà/);
});

test('un refus exige un motif et conserve la demande', () => {
  throws(() => learningDecision(request, request, 'rejected', 'conteur', at), /motif/);
  const result = learningDecision(request, { ...request, decisionReason: 'Mentor à confirmer' }, 'rejected', 'conteur', at);
  equal(result.status, 'rejected');
  equal(result.decisionReason, 'Mentor à confirmer');
  equal(result.date || '', '');
});

test('les corrections d’acquisitions sont tracées sans changer leur état', () => {
  const approved = { ...request, status: 'approved', date: '2026-10-20' };
  const result = learningEdit(approved, { ...approved, mentor: 'Ilse Varga' }, 'conteur', at);
  equal(result.status, undefined);
  equal(result.mentor, 'Ilse Varga');
  equal(result.audit[0].before.mentor, 'Le Baron');
  equal(result.audit[0].after.mentor, 'Ilse Varga');
});

test('une correction concurrente du même champ est signalée', () => {
  throws(() => learningEdit({ ...request, mentor: 'Autre mentor' }, { ...request, mentor: 'Ilse Varga' }, 'conteur', at, request), /modifiée/);
});

test('une modification parallèle d’un autre champ reste conservée', () => {
  const current = { ...request, mentor: 'Autre mentor' };
  const result = learningDecision(current, { ...request, levels: [4] }, 'approved', 'conteur', at, request);
  deepEqual(result.levels, [4]);
  equal(result.mentor, undefined);
  equal({ ...current, ...result }.mentor, 'Autre mentor');
});


test('une correction ne peut pas effacer le motif d’un refus', () => {
  const rejected = { ...request, status: 'rejected', decisionReason: 'Mentor à préciser' };
  throws(() => learningEdit(rejected, { ...rejected, decisionReason: '' }, 'conteur', at), /motif/);
});


test('les anciens coûts XP restent intacts mais ne sont plus repris dans la saisie', () => {
  const fields = learningFields(request);
  equal(Object.hasOwn(fields, 'xp'), false);
  const patch = learningDecision(request, request, 'approved', 'conteur', at);
  equal(Object.hasOwn(patch, 'xp'), false);
  equal({ ...request, ...patch }.xp, 7);
});
