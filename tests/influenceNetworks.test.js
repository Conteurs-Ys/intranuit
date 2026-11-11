import test from 'node:test';
import assert from 'node:assert/strict';
import { examplesToAdd, groupNetworks, isInCatalog, networkOptions, NETWORK_EXAMPLES } from '../src/utils/influenceNetworks.js';
import { INFLUENCE_SPECIALIZATIONS } from '../src/constants/index.js';

test('chaque spécialité officielle a des exemples Gotha et Pègre', () => {
  INFLUENCE_SPECIALIZATIONS.forEach(spec => {
    assert.ok(NETWORK_EXAMPLES[spec]?.gotha?.length, `Gotha manquant : ${spec}`);
    assert.ok(NETWORK_EXAMPLES[spec]?.pegre?.length, `Pègre manquant : ${spec}`);
  });
});

test('les exemples déjà présents ne sont pas ajoutés deux fois', () => {
  const all = examplesToAdd([]);
  assert.equal(all.length, INFLUENCE_SPECIALIZATIONS.length * 4);
  const existing = [{ category: 'pegre', specialization: 'Police', name: '  agents de patrouille de nuit ' }];
  const rest = examplesToAdd(existing);
  assert.equal(rest.length, all.length - 1);
  assert.ok(!rest.some(n => n.name === 'Agents de patrouille de nuit'));
});

test('le même nom dans une autre catégorie reste ajoutable', () => {
  const existing = [{ category: 'gotha', specialization: 'Police', name: 'Agents de patrouille de nuit' }];
  assert.equal(examplesToAdd(existing).length, INFLUENCE_SPECIALIZATIONS.length * 4);
});

test('les réseaux proposés : catégorie filtrée, spécialité en tête', () => {
  const networks = [
    { id: 'a', category: 'pegre', specialization: 'Rue', name: 'Zèbres' },
    { id: 'b', category: 'pegre', specialization: 'Police', name: 'Agents' },
    { id: 'c', category: 'gotha', specialization: 'Police', name: 'Commissaire' },
    { id: 'd', category: 'pegre', specialization: 'Police', name: 'Brigade' },
  ];
  assert.deepEqual(networkOptions(networks, 'pegre', 'Police').map(n => n.id), ['b', 'd', 'a']);
  assert.deepEqual(networkOptions(networks, 'pegre', '').map(n => n.id), ['b', 'd', 'a']);
});

test('regroupement par spécialité dans l’ordre officiel', () => {
  const groups = groupNetworks([
    { category: 'gotha', specialization: 'Transport', name: 'Gare' },
    { category: 'pegre', specialization: 'Bureaucratie', name: 'Guichets' },
  ]);
  assert.equal(groups[0].specialization, INFLUENCE_SPECIALIZATIONS[0]);
  assert.equal(groups.find(g => g.specialization === 'Transport').gotha[0].name, 'Gare');
  assert.equal(groups.find(g => g.specialization === 'Bureaucratie').count, 1);
});

test('présence dans le catalogue, sans tenir compte de la casse', () => {
  const networks = [{ category: 'pegre', specialization: 'Rue', name: 'Gamins des cités' }];
  assert.ok(isInCatalog(networks, 'pegre', ' gamins des CITÉS'));
  assert.ok(!isInCatalog(networks, 'gotha', 'Gamins des cités'));
  assert.ok(!isInCatalog(networks, 'pegre', ''));
});
