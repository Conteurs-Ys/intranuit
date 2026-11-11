import { test } from 'node:test';
import { deepEqual } from 'node:assert/strict';
import { unansweredPlayerActions } from '../src/utils/dispatch.js';

test('diffusion : compte les actions et bonus joueurs décrits sans réponse, blancs compris', () => {
  const actions = [{ description: 'Enquête' }, { description: 'Chasse', response: '  ' }, { description: 'Veille', response: 'Terminé' }, { description: ' ' }];
  deepEqual(unansweredPlayerActions([{ userId: 'u', status: 'submitted', actions, bonus: [{ description: 'Bonus' }] }], [{ userId: 'u', status: 'assigned', actions }]), { aips: 3, influences: 2 });
});

test('diffusion : les PNJ sans réponse, imports et dossiers déjà diffusés ne comptent pas', () => {
  const action = { description: 'Action sans réponse' };
  const dossiers = [
    { userId: '', status: 'submitted', actions: [action] },
    { userId: 'npc', antagonistId: 'baron', status: 'assigned', actions: [action] },
    { userId: 'npc', status: 'npc', actions: [action] },
    { userId: 'historical_joueur', status: 'submitted', actions: [action] },
    { userId: 'u', status: 'completed', actions: [action] },
  ];
  deepEqual(unansweredPlayerActions(dossiers, dossiers), { aips: 0, influences: 0 });
  deepEqual(unansweredPlayerActions(), { aips: 0, influences: 0 });
});
