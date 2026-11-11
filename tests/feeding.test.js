import test from 'node:test';
import assert from 'node:assert/strict';
import { borrowState, feedingNeed, feedingStatus, troupeauLoans, troupeauSurplus } from '../src/utils/feeding.js';

const hunt = { type: 'Se nourrir', description: 'Chasse au port' };
const other = { type: 'Enquête', description: '' };

test('besoin : 1 AIP, Ventrue 2', () => {
  assert.equal(feedingNeed('Brujah'), 1);
  assert.equal(feedingNeed('Ventrue'), 2);
});

test('sans chasse ni Troupeau : moitié de la réserve', () => {
  assert.equal(feedingStatus({ clan: 'Brujah', actions: [other] }).blood, 'half');
  // « Se nourrir » est le type par défaut des actions vides : seule une chasse décrite compte.
  assert.equal(feedingStatus({ clan: 'Brujah', actions: [{ type: 'Se nourrir', description: ' ' }] }).blood, 'half');
  assert.equal(feedingStatus({ clan: 'Brujah', actions: [hunt] }).blood, 'full');
  // Une AIP de chasse bonus compte aussi.
  assert.equal(feedingStatus({ clan: 'Brujah', actions: [other], bonus: [hunt] }).blood, 'full');
});

test('Troupeau : dispense de chasse, réduit le besoin du Ventrue', () => {
  assert.equal(feedingStatus({ clan: 'Brujah', feeding: { troupeau: 1 } }).blood, 'full');
  assert.equal(feedingStatus({ clan: 'Ventrue', feeding: { troupeau: 1 } }).blood, 'half');
  assert.equal(feedingStatus({ clan: 'Ventrue', feeding: { troupeau: 1 }, actions: [hunt] }).blood, 'full');
  assert.equal(feedingStatus({ clan: 'Ventrue', feeding: { troupeau: 2 } }).blood, 'full');
});

test('prêt : seulement au-delà du besoin du prêteur', () => {
  assert.equal(troupeauSurplus({ clan: 'Brujah', feeding: { troupeau: 1 } }), 0);
  assert.equal(troupeauSurplus({ clan: 'Brujah', feeding: { troupeau: 3 } }), 2);
  assert.equal(troupeauSurplus({ clan: 'Ventrue', feeding: { troupeau: 3 } }), 1);
});

test('emprunt : compte une fois accepté pour ce prêteur, le conteur peut corriger', () => {
  const borrower = { clan: 'Brujah', feeding: { troupeau: 0, borrowFrom: { id: 'a', name: 'Alma' } } };
  assert.equal(borrowState(borrower), 'pending');
  assert.equal(feedingStatus(borrower).blood, 'half');
  const accepted = { ...borrower, feedingReview: { borrowFrom: 'a', borrow: 'accepted' } };
  assert.equal(feedingStatus(accepted).blood, 'full');
  // Le joueur change de prêteur : la décision ne vaut plus.
  assert.equal(borrowState({ ...accepted, feeding: { borrowFrom: { id: 'b', name: 'Basile' } } }), 'pending');
  // Correction du conteur.
  const forced = feedingStatus({ ...accepted, feedingReview: { ...accepted.feedingReview, blood: 'half' } });
  assert.equal(forced.blood, 'half');
  assert.equal(forced.overridden, true);
});

test('prêts d\'un Troupeau : dépassement signalé', () => {
  const owner = { userId: 'a', clan: 'Brujah', feeding: { troupeau: 2 } };
  const b1 = { userId: 'b', clan: 'Brujah', feeding: { borrowFrom: { id: 'a' } }, feedingReview: { borrowFrom: 'a', borrow: 'accepted' } };
  const b2 = { userId: 'c', clan: 'Ventrue', feeding: { borrowFrom: { id: 'a' } }, feedingReview: { borrowFrom: 'a', borrow: 'accepted' } };
  const loans = troupeauLoans([owner, b1, b2], 'a');
  assert.equal(loans.surplus, 1);
  assert.equal(loans.accepted, 3);
  assert.equal(loans.over, true);
  // Prêteur sans dossier : capacité inconnue, pas d'alerte.
  assert.equal(troupeauLoans([b1], 'a').surplus, null);
  assert.equal(troupeauLoans([b1], 'a').over, false);
});
