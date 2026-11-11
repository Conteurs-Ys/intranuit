import { test } from 'node:test';
import { equal, deepEqual } from 'node:assert/strict';
import { aipLearningRequests, learningQueue, publicLearningReview, sameLearningSource } from '../src/utils/learningRequests.js';
const action = { id: 1, type: 'Apprentissage', description: 'Entraînement', learning: { type: 'Discipline', action: 'Domination', levels: [2] } };
const aip = { id: 'a1', userId: 'alice', characterId: 'c2', characterName: 'Alice', actions: [action], monthLabel: 'Octobre 2026' };
test('une AIP et une AIP bonus créent des demandes distinctes, identiques au réenvoi', () => {
  const requests = aipLearningRequests({ ...aip, bonus: [action] });
  equal(requests.length, 2);
  equal(new Set(requests.map(r => r.id)).size, 2);
  deepEqual(aipLearningRequests(aip), aipLearningRequests({ ...aip }));
  equal(requests[0].characterId, 'c2');
  equal(aipLearningRequests({ ...aip, actions: [{ ...action, learning: {} }] }).length, 0);
});
test('un réenvoi ne duplique ni ne réinitialise une acquisition validée', () => {
  const request = aipLearningRequests(aip)[0];
  const saved = { ...request, status: 'approved', notes: 'Interne' };
  const queue = learningQueue([{ ...aip, actions: [{ ...action, learning: { ...action.learning, action: 'Force' } }] }], [], [saved]);
  equal(queue.length, 1);
  equal(queue[0].status, 'approved');
  equal(queue[0].action, 'Domination');
  equal(learningQueue([], [], [saved]).length, 1);
});
test('une demande retirée ne reste pas en attente et les historiques manuels restent présents', () => {
  const request = aipLearningRequests(aip)[0];
  equal(learningQueue([], [], [request]).length, 0);
  equal(learningQueue([], [], [{ id: 'ancien', action: 'Force' }]).length, 1);
});
test('la décision visible par le joueur ne contient jamais les notes ni l’audit interne', () => {
  const review = publicLearningReview({ status: 'approved', notes: 'Secret', audit: ['secret'], action: 'Force' });
  equal('notes' in review, false);
  equal('audit' in review, false);
  equal(review.action, 'Force');
});
test('la modification concurrente de la source est détectée', () => {
  const request = aipLearningRequests(aip)[0];
  equal(sameLearningSource(request, { ...request, sourceDescription: 'Modifié' }), false);
  equal(sameLearningSource(request, { ...request, mentor: 'Nouveau' }), false);
});

test('une modification de l’AIP en attente actualise la demande sans effacer les notes internes', () => {
  const old = learningQueue([aip], [], [])[0];
  const changed = { ...aip, actions: [{ ...action, learning: { ...action.learning, action: 'Force' } }] };
  const [next] = learningQueue([changed], [], [{ ...old, notes: 'Privé' }]);
  equal(next.action, 'Force');
  equal(next.notes, 'Privé');
  equal(next.sourceRevision === old.sourceRevision, false);
});
