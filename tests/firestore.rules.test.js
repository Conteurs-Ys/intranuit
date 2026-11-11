// Tests des règles Firestore (firestore.rules) contre l'émulateur local.
// Lancer : npm run test:rules  (aucune donnée réelle n'est touchée : projet « demo-… »).

import { deepEqual, equal, rejects } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { deleteAccountData } from '../src/utils/deleteAccountData.js';
import { saveRumorUsage } from '../src/utils/saveRumorUsage.js';
import { saveObstructionLinks } from '../src/utils/saveObstructionLinks.js';
import { staffAIPEntries } from '../src/utils/staffAIPExport.js';
import { buildAIPWorkbook } from '../src/utils/exportWorkbooks.js';
import * as XLSX from 'xlsx';

const APP = 'intranuit';
const PROFILES = {
  alice: { pseudo: 'Alice', name: 'Ilse', role: 'player' },
  bob: { pseudo: 'Bob', name: 'Malachie', role: 'player' },
  pete: { pseudo: 'Pete', name: 'Nouveau', role: 'pending' },
  carol: { pseudo: 'Carol', role: 'storyteller' },
  dan: { pseudo: 'Dan', role: 'admin' },
};

let env;

const profile = (db, uid) => doc(db, 'artifacts', APP, 'users', uid, 'profile', 'info');
const mirror = (db, uid) => doc(db, 'artifacts', APP, 'public', 'data', 'user_profiles', uid);
const data = (db, name, id) => doc(db, 'artifacts', APP, 'public', 'data', name, id);
const dataCol = (db, name) => collection(db, 'artifacts', APP, 'public', 'data', name);
const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const dossier = (userId, status = 'submitted') => ({
  userId, status, characterName: userId, monthLabel: 'Octobre 2026', actions: [],
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-intranuit',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

after(() => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, p] of Object.entries(PROFILES)) {
      await setDoc(profile(db, uid), { uid, ...p });
      await setDoc(mirror(db, uid), { uid, ...p });
    }
    for (const name of ['global_aips', 'global_influences']) {
      await setDoc(data(db, name, 'alice1'), dossier('alice'));
      await setDoc(data(db, name, 'aliceLocked'), dossier('alice', 'locked'));
      await setDoc(data(db, name, 'bob1'), dossier('bob'));
    }
    await setDoc(data(db, 'game_state', 'cycle'), { label: 'Octobre 2026', year: 2026, month: 'Octobre' });
    await setDoc(data(db, 'antagonists', 'pnj1'), { name: 'Le Prince' });
    await setDoc(data(db, 'learnings', 'l1'), { student: 'alice' });
    await setDoc(data(db, 'annonces', 'a1'), { titre: 'GN 4', publie: true });
    await setDoc(data(db, 'parties', 'p1'), { titre: 'Soirée', publie: true });
  });
});

describe('Inscription et rôles', () => {
  test('relecture concurrente : deux traces du même dossier sont conservées', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(data(ctx.firestore(), 'global_influences', 'usage'), { ...dossier('alice'), actions: [{ id: 'a', response: 'Conserver' }, { id: 'b' }] });
    });
    const db = as('carol');
    await Promise.all([saveRumorUsage(db, APP, 'usage:a', { rumorTrace: 'Trace A' }), saveRumorUsage(db, APP, 'usage:b', { rumorTrace: 'Trace B' })]);
    deepEqual((await getDoc(data(db, 'global_influences', 'usage'))).data().actions,
      [{ id: 'a', response: 'Conserver', rumorTrace: 'Trace A' }, { id: 'b', rumorTrace: 'Trace B' }]);
    await assertFails(saveRumorUsage(as('bob'), APP, 'usage:a', { rumorTrace: 'Autre joueur' }));
  });

  test('suppression du profil : archives de tous les personnages conservées, exports conteur et accès joueur bloqué, reprise sans perte', async () => {
    const archives = [
      ['global_aips', 'bob-septembre', { ...dossier('bob', 'completed'), characterId: 'c1', characterName: 'Ancien personnage', monthLabel: 'Septembre 2026', year: 2026,
        actions: [{ description: 'Enquête archivée', response: 'Réponse conservée' }], bonus: [{ description: 'Action bonus', response: 'Bonus conservé' }],
        expenses: [{ id: 'e1', amountCents: 1250, reason: 'Transport' }], expenseReviews: { e1: { status: 'approved' } } }],
      ['global_aips', 'bob-juillet', { ...dossier('bob', 'completed'), characterId: 'c2', monthLabel: 'Juillet 2026', year: 2026, actions: [{ description: 'Autre personnage', response: 'Autre réponse' }] }],
      ['global_influences', 'bob-septembre', { ...dossier('bob', 'completed'), characterId: 'c1', monthLabel: 'Septembre 2026', actions: [{ description: 'Influence archivée', response: 'Retour conservé' }], rumorTables: { pegre: { rows: [{ trace: 'Rumeur figée' }] } }, obstructionLinks: [{ source: 'id:a', dossierId: 'alice1', target: 'id:b' }] }],
      ['global_influences', 'bob-locked', { ...dossier('bob', 'locked'), characterId: 'c2', actions: [{ description: 'Influence en traitement' }] }],
      ['learning_requests', 'bob-r', { userId: 'bob', review: { status: 'approved', reason: 'Acquis' } }],
      ['learnings', 'bob-l', { userId: 'bob', notes: 'Note privée' }],
      ['learnings', 'bob-old', { sourceCollection: 'global_aips', sourceId: 'bob1' }],
      ['aip_groups', 'shared', { members: ['bob1:actions:1', 'alice1:actions:1'], sharedResponse: 'Réponse du groupe' }],
      ['aip_groups', 'bob-only', { members: ['bob1:actions:2'] }],
      ['influence_losses', 'bob-loss', { targetUid: 'bob' }],
    ];
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(data(db, 'directory', 'bob'), { kind: 'pj', uid: 'bob', name: 'Malachie' });
      await setDoc(doc(db, 'artifacts', APP, 'users', 'bob', 'profile', 'contact'), { email: 'test@example.invalid' });
      await setDoc(data(db, 'learnings', 'alice-l'), { userId: 'alice', characterName: 'Malachie' });
      for (const [name, id, value] of archives) await setDoc(data(db, name, id), value);
    });
    await assertFails(deleteAccountData(as('carol'), APP, 'bob', 'carol'));
    await assertFails(deleteAccountData(as('bob'), APP, 'alice', 'bob'));
    await assertSucceeds(deleteAccountData(as('dan'), APP, 'bob', 'dan'));
    const db = as('dan');
    const marker = (await getDoc(profile(db, 'bob'))).data();
    equal(marker.role, 'deleted');
    deepEqual(Object.keys(marker).sort(), ['deletedAt', 'role']);
    for (const [name, id] of [['user_profiles', 'bob'], ['directory', 'bob']]) {
      equal((await getDoc(data(db, name, id))).exists(), false, `${name}/${id}`);
    }
    equal((await getDoc(doc(db, 'artifacts', APP, 'users', 'bob', 'profile', 'contact'))).exists(), false);
    for (const name of ['global_aips', 'global_influences']) {
      deepEqual((await getDoc(data(db, name, 'bob1'))).data(), dossier('bob'));
    }
    const storyteller = as('carol');
    for (const [name, id, value] of archives) {
      deepEqual((await getDoc(data(storyteller, name, id))).data(), value, `${name}/${id}`);
      await assertFails(getDoc(data(as('bob'), name, id)));
      await assertFails(getDoc(data(as('alice'), name, id)));
    }
    const aips = (await getDocs(dataCol(storyteller, 'global_aips'))).docs.map(s => ({ id: s.id, ...s.data() }));
    const exported = staffAIPEntries(aips, [], 'Septembre 2026', 'Octobre 2026');
    const workbook = buildAIPWorkbook(exported, { staff: true });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Septembre 2026']);
    equal(rows.some(row => row.Personnage === 'Ancien personnage' && row['Réponse du conteur'] === 'Réponse conservée'), true);
    equal(rows.some(row => row['Réponse du conteur'] === 'Bonus conservé'), true);
    equal((await getDoc(data(db, 'learnings', 'alice-l'))).exists(), true);
    await assertSucceeds(deleteAccountData(db, APP, 'bob', 'dan'));
    for (const [name, id, value] of archives) deepEqual((await getDoc(data(storyteller, name, id))).data(), value);
    const blocked = as('bob');
    await assertFails(getDoc(data(blocked, 'global_aips', 'bob1')));
    await assertFails(getDoc(data(blocked, 'global_influences', 'bob1')));
    await assertFails(getDocs(query(dataCol(blocked, 'global_aips'), where('userId', '==', 'bob'))));
    await assertFails(updateDoc(data(blocked, 'global_aips', 'bob1'), { actions: [] }));
    await assertFails(deleteDoc(data(blocked, 'global_influences', 'bob1')));
    await assertFails(setDoc(profile(blocked, 'bob'), { role: 'pending' }));
    await assertFails(updateDoc(profile(blocked, 'bob'), { role: 'player' }));
    await assertFails(setDoc(mirror(blocked, 'bob'), { role: 'deleted', uid: 'bob' }));
    await assertFails(getDocs(dataCol(blocked, 'directory')));
    await assertFails(setDoc(data(blocked, 'global_aips', 'new'), dossier('bob')));
    await assertFails(setDoc(doc(blocked, 'artifacts', APP, 'users', 'bob', 'other', 'private'), { value: 'recréé' }));
  });

  test('refus atomique : profil et miroir refusés, retrait de l’annuaire, accès fermé', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(data(ctx.firestore(), 'directory', 'pete'), { kind: 'pj', uid: 'pete', name: 'Nouveau' });
    });
    const db = as('dan');
    const batch = writeBatch(db);
    batch.update(profile(db, 'pete'), { role: 'rejected' });
    batch.update(mirror(db, 'pete'), { role: 'rejected' });
    batch.delete(data(db, 'directory', 'pete'));
    await assertSucceeds(batch.commit());
    const refused = as('pete');
    await assertSucceeds(getDoc(profile(refused, 'pete')));
    await assertFails(getDocs(dataCol(refused, 'directory')));
    await assertFails(getDoc(data(refused, 'game_state', 'cycle')));
    await assertFails(setDoc(data(refused, 'global_aips', 'pete1'), dossier('pete')));
    await assertFails(setDoc(data(refused, 'directory', 'pete'), { kind: 'pj', uid: 'pete', name: 'Nouveau' }));
    await assertFails(updateDoc(profile(refused, 'pete'), { role: 'pending' }));
    await assertFails(updateDoc(profile(refused, 'pete'), { name: 'Autre identité' }));
    await assertFails(updateDoc(mirror(refused, 'pete'), { role: 'player' }));
    await assertFails(updateDoc(profile(as('carol'), 'pete'), { role: 'player' }));
    await assertSucceeds(updateDoc(profile(db, 'pete'), { role: 'pending' }));
  });

  test('identité publique limitée aux deux champs, modifiable seulement par un admin', async () => {
    const ref = data(as('dan'), 'instance_settings', 'identity');
    await assertSucceeds(setDoc(ref, { city: 'Melun', chronicle: 'Le Cercle' }));
    await assertSucceeds(getDoc(data(anon(), 'instance_settings', 'identity')));
    await assertFails(setDoc(data(as('carol'), 'instance_settings', 'identity'), { city: 'Autre', chronicle: '' }));
    await assertFails(setDoc(data(as('alice'), 'instance_settings', 'identity'), { city: 'Autre', chronicle: '' }));
    await assertFails(setDoc(ref, { city: 'Melun', chronicle: '', aiEnabled: true }));
    await assertFails(setDoc(ref, { city: 'X'.repeat(101), chronicle: '' }));
    await assertFails(setDoc(data(as('carol'), 'instance_settings', 'other'), { city: '', chronicle: '' }));
  });

  test('un nouveau compte naît « pending »', async () => {
    const db = as('newbie');
    await assertSucceeds(setDoc(profile(db, 'newbie'), { pseudo: 'N', role: 'pending' }, { merge: true }));
    await assertSucceeds(setDoc(mirror(db, 'newbie'), { uid: 'newbie', role: 'pending' }, { merge: true }));
  });

  test('un nouveau compte ne peut pas se créer joueur ou admin', async () => {
    const db = as('newbie');
    await assertFails(setDoc(profile(db, 'newbie'), { role: 'player' }));
    await assertFails(setDoc(profile(db, 'newbie'), { role: 'admin' }));
    await assertFails(setDoc(profile(db, 'newbie'), { pseudo: 'sans rôle' }));
  });

  test("on ne crée pas le profil de quelqu'un d'autre", async () => {
    await assertFails(setDoc(profile(as('newbie'), 'other'), { role: 'pending' }));
  });

  test('un joueur modifie son profil sans toucher à son rôle', async () => {
    const db = as('alice');
    await assertSucceeds(setDoc(profile(db, 'alice'), { ...PROFILES.alice, uid: 'alice', clan: 'Brujah' }));
    await assertSucceeds(setDoc(mirror(db, 'alice'), { uid: 'alice', clan: 'Brujah', role: 'player' }));
  });

  test('un joueur ne peut pas changer ni effacer son rôle', async () => {
    const db = as('alice');
    await assertFails(updateDoc(profile(db, 'alice'), { role: 'admin' }));
    await assertFails(updateDoc(profile(db, 'alice'), { role: 'storyteller' }));
    await assertFails(setDoc(profile(db, 'alice'), { pseudo: 'Alice' }));
    await assertFails(updateDoc(mirror(db, 'alice'), { role: 'admin' }));
  });

  test('un compte en attente ne peut pas se valider lui-même', async () => {
    await assertFails(updateDoc(profile(as('pete'), 'pete'), { role: 'player' }));
  });

  test('un conteur ne change pas les rôles, un admin si', async () => {
    await assertFails(updateDoc(profile(as('carol'), 'pete'), { role: 'player' }));
    await assertSucceeds(updateDoc(profile(as('dan'), 'pete'), { role: 'player' }));
    await assertSucceeds(updateDoc(mirror(as('dan'), 'pete'), { role: 'player' }));
  });

  test('un conteur ne modifie pas l\'annuaire des profils', async () => {
    await assertFails(updateDoc(mirror(as('carol'), 'pete'), { role: 'admin' }));
  });

  test("un joueur ne lit pas le profil d'un autre", async () => {
    await assertFails(getDoc(profile(as('alice'), 'bob')));
    await assertFails(getDoc(mirror(as('alice'), 'bob')));
    await assertFails(getDocs(dataCol(as('alice'), 'user_profiles')));
    await assertFails(getDoc(profile(anon(), 'alice')));
  });

  test('chacun lit son profil, le staff lit l\'annuaire, l\'admin lit les profils', async () => {
    await assertSucceeds(getDoc(profile(as('alice'), 'alice')));
    await assertSucceeds(getDoc(profile(as('pete'), 'pete')));
    await assertSucceeds(getDocs(dataCol(as('carol'), 'user_profiles')));
    await assertSucceeds(getDoc(profile(as('dan'), 'bob')));
    await assertFails(getDoc(profile(as('carol'), 'bob')));
  });

  test('un admin supprime un compte', async () => {
    const db = as('dan');
    await assertSucceeds(getDocs(collection(db, 'artifacts', APP, 'users', 'bob', 'profile')));
    await assertSucceeds(deleteDoc(profile(db, 'bob')));
    await assertSucceeds(deleteDoc(mirror(db, 'bob')));
    await assertSucceeds(deleteDoc(doc(db, 'artifacts', APP, 'users', 'bob')));
    await assertFails(deleteDoc(profile(as('carol'), 'alice')));
  });
});

for (const name of ['global_aips', 'global_influences']) {
  describe(`Dossiers (${name})`, () => {
    test('un joueur lit ses dossiers, pas ceux des autres', async () => {
      const db = as('alice');
      await assertSucceeds(getDoc(data(db, name, 'alice1')));
      await assertFails(getDoc(data(db, name, 'bob1')));
    });

    test("un joueur liste ses dossiers mais pas la collection entière", async () => {
      const db = as('alice');
      await assertSucceeds(getDocs(query(dataCol(db, name), where('userId', '==', 'alice'))));
      await assertFails(getDocs(dataCol(db, name)));
      await assertFails(getDocs(query(dataCol(db, name), where('userId', '==', 'bob'))));
    });

    test('un joueur dépose un dossier à son nom, « submitted » uniquement', async () => {
      const db = as('alice');
      await assertSucceeds(setDoc(data(db, name, 'new'), dossier('alice')));
      await assertFails(setDoc(data(db, name, 'new2'), dossier('bob')));
      await assertFails(setDoc(data(db, name, 'new3'), dossier('alice', 'locked')));
    });

    test('un joueur modifie son dossier tant qu\'il est « submitted »', async () => {
      const db = as('alice');
      await assertSucceeds(setDoc(data(db, name, 'alice1'), { ...dossier('alice'), actions: [{ type: 'Enquête' }] }));
      await assertFails(updateDoc(data(db, name, 'aliceLocked'), { actions: [] }));
      await assertFails(updateDoc(data(db, name, 'alice1'), { status: 'locked' }));
      await assertFails(updateDoc(data(db, name, 'alice1'), { userId: 'bob' }));
      await assertFails(updateDoc(data(db, name, 'bob1'), { actions: [] }));
    });

    if (name === 'global_aips') {
      test('la décision du conteur sur la nourriture n\'est écrite que par le staff, et conservée au réenvoi', async () => {
        const review = { borrowFrom: 'bob', borrow: 'accepted' };
        await assertFails(setDoc(data(as('alice'), name, 'new'), { ...dossier('alice'), feedingReview: review }));
        await assertFails(updateDoc(data(as('alice'), name, 'alice1'), { feedingReview: review }));
        await assertSucceeds(updateDoc(data(as('carol'), name, 'alice1'), { feedingReview: review }));
        await assertSucceeds(setDoc(data(as('alice'), name, 'alice1'), { ...dossier('alice'), feeding: { troupeau: 0, borrowFrom: { id: 'bob', name: 'Malachie' } }, feedingReview: review }));
        await assertFails(updateDoc(data(as('alice'), name, 'alice1'), { 'feedingReview.borrow': 'refused' }));
      });
    }

    test('un joueur ne supprime pas ses dossiers', async () => {
      await assertFails(deleteDoc(data(as('alice'), name, 'alice1')));
    });

    test('un compte en attente ou anonyme ne lit ni ne dépose rien', async () => {
      await assertFails(setDoc(data(as('pete'), name, 'p'), dossier('pete')));
      await assertFails(getDocs(query(dataCol(as('pete'), name), where('userId', '==', 'pete'))));
      await assertFails(getDocs(dataCol(anon(), name)));
    });

    test('le staff lit, modifie et supprime tous les dossiers', async () => {
      for (const uid of ['carol', 'dan']) {
        const db = as(uid);
        await assertSucceeds(getDocs(dataCol(db, name)));
        await assertSucceeds(updateDoc(data(db, name, 'bob1'), { status: 'locked', sentence: 'Réponse' }));
      }
      await assertSucceeds(deleteDoc(data(as('carol'), name, 'bob1')));
    });
  });
}

describe('Chronique', () => {
  test('un joueur lit le cycle mais ne le modifie pas', async () => {
    await assertSucceeds(getDoc(data(as('alice'), 'game_state', 'cycle')));
    await assertFails(setDoc(data(as('alice'), 'game_state', 'cycle'), { label: 'Triche' }));
    await assertFails(getDoc(data(as('pete'), 'game_state', 'cycle')));
    await assertSucceeds(setDoc(data(as('carol'), 'game_state', 'cycle'), { label: 'Novembre 2026' }));
  });

  test('listes de lieux et d\'actions : lues par les membres, écrites par les conteurs', async () => {
    await assertSucceeds(setDoc(data(as('carol'), 'game_state', 'lists'), { zones: ['Port'] }));
    await assertSucceeds(getDoc(data(as('alice'), 'game_state', 'lists')));
    await assertFails(setDoc(data(as('alice'), 'game_state', 'lists'), { zones: ['Triche'] }));
  });

  test('cycle en pause : un joueur ne dépose ni ne modifie de dossier', async () => {
    await assertSucceeds(updateDoc(data(as('carol'), 'game_state', 'cycle'), { open: false }));
    for (const name of ['global_aips', 'global_influences']) {
      await assertFails(setDoc(data(as('alice'), name, 'pause'), dossier('alice')));
      await assertFails(updateDoc(data(as('alice'), name, 'alice1'), { actions: [{ type: 'Enquête' }] }));
      await assertSucceeds(getDoc(data(as('alice'), name, 'alice1')));
    }
    await assertSucceeds(updateDoc(data(as('carol'), 'game_state', 'cycle'), { open: true }));
    await assertSucceeds(setDoc(data(as('alice'), 'global_aips', 'reprise'), dossier('alice')));
  });

  test('PNJ, apprentissages, plots, catalogue des réseaux, rumeurs de conteur… réservés au staff', async () => {
    for (const name of ['antagonists', 'learnings', 'plots', 'timeline', 'storytellers', 'influence_networks', 'aip_groups', 'settings', 'rumor_seeds', 'oracle_briefings', 'oracle_memory', 'oracle_proposals']) {
      await assertFails(getDocs(dataCol(as('alice'), name)));
      await assertFails(setDoc(data(as('alice'), name, 'x'), { a: 1 }));
      await assertSucceeds(getDocs(dataCol(as('carol'), name)));
      await assertSucceeds(setDoc(data(as('carol'), name, 'x'), { a: 1 }));
    }
  });

  test("pertes d'influence : le joueur lit les siennes seulement, le staff écrit", async () => {
    await assertSucceeds(setDoc(data(as('carol'), 'influence_losses', 'l1'), { targetUid: 'alice', category: 'gotha', levels: 1 }));
    await assertSucceeds(setDoc(data(as('carol'), 'influence_losses', 'l2'), { targetUid: 'bob', category: 'pegre', levels: 1 }));
    await assertSucceeds(getDoc(data(as('alice'), 'influence_losses', 'l1')));
    await assertFails(getDoc(data(as('alice'), 'influence_losses', 'l2')));
    await assertSucceeds(getDocs(query(dataCol(as('alice'), 'influence_losses'), where('targetUid', '==', 'alice'))));
    await assertFails(getDocs(dataCol(as('alice'), 'influence_losses')));
    await assertFails(setDoc(data(as('alice'), 'influence_losses', 'l3'), { targetUid: 'alice', levels: 0 }));
    await assertFails(getDoc(data(as('pete'), 'influence_losses', 'l1')));
  });

  test('annonces et soirées : lecture publique, écriture par le staff', async () => {
    for (const name of ['annonces', 'parties']) {
      await assertSucceeds(getDocs(query(dataCol(anon(), name), where('publie', '==', true))));
      await assertFails(setDoc(data(anon(), name, 'x'), { publie: true }));
      await assertFails(setDoc(data(as('alice'), name, 'x'), { publie: true }));
      await assertSucceeds(setDoc(data(as('carol'), name, 'x'), { publie: true }));
    }
  });

  test("annuaire : lu par les membres, chaque joueur n'écrit que sa fiche", async () => {
    const entry = (db, id) => data(db, 'directory', id);
    await assertSucceeds(setDoc(entry(as('alice'), 'alice'), { kind: 'pj', uid: 'alice', name: 'Ilse' }));
    await assertSucceeds(getDocs(dataCol(as('bob'), 'directory')));
    await assertFails(setDoc(entry(as('alice'), 'bob'), { kind: 'pj', uid: 'bob', name: 'Faux' }));
    await assertFails(setDoc(entry(as('alice'), 'pnj_x'), { kind: 'pnj', name: 'PNJ inventé' }));
    await assertFails(setDoc(entry(as('alice'), 'alice'), { kind: 'pnj', uid: 'alice', name: 'Ilse' }));
    await assertFails(deleteDoc(entry(as('bob'), 'alice')));
    await assertFails(getDocs(dataCol(as('pete'), 'directory')));
    await assertFails(getDocs(dataCol(anon(), 'directory')));
    await assertSucceeds(setDoc(entry(as('carol'), 'pnj_baron'), { kind: 'pnj', name: 'Le Baron' }));
  });

  test('PNJ : présence AIP et annuaire indépendants, fiche privée', async () => {
    const staff = as('carol');
    const player = as('alice');
    for (const showInAips of [false, true]) {
      for (const knownToPlayers of [false, true]) {
        const id = `pnj_${showInAips}_${knownToPlayers}`;
        const batch = writeBatch(staff);
        batch.set(data(staff, 'antagonists', id), { name: 'Le Veilleur', showInAips, knownToPlayers, actions: [] });
        const entry = data(staff, 'directory', `pnj_${id}`);
        if (knownToPlayers) batch.set(entry, { kind: 'pnj', name: 'Le Veilleur' });
        else batch.delete(entry);
        await assertSucceeds(batch.commit());
        await assertFails(getDoc(data(player, 'antagonists', id)));
        equal((await assertSucceeds(getDoc(data(player, 'directory', `pnj_${id}`)))).exists(), knownToPlayers);
      }
    }
  });

  test('PNJ : masquer et rendre confidentiel conserve actions et historique', async () => {
    const staff = as('carol');
    const actions = [{ type: 'Enquête', description: 'Texte à conserver', response: 'Réponse à conserver' }];
    const history = [{ month: 'Septembre 2026', actions }];
    await assertSucceeds(setDoc(data(staff, 'antagonists', 'veilleur'), { name: 'Le Veilleur', showInAips: true, knownToPlayers: true, actions, history }));
    await assertSucceeds(setDoc(data(staff, 'directory', 'pnj_veilleur'), { kind: 'pnj', name: 'Le Veilleur' }));
    const batch = writeBatch(staff);
    batch.update(data(staff, 'antagonists', 'veilleur'), { showInAips: false, knownToPlayers: false });
    batch.delete(data(staff, 'directory', 'pnj_veilleur'));
    await assertSucceeds(batch.commit());
    const saved = (await getDoc(data(staff, 'antagonists', 'veilleur'))).data();
    deepEqual(saved.actions, actions);
    deepEqual(saved.history, history);
    equal((await getDoc(data(as('alice'), 'directory', 'pnj_veilleur'))).exists(), false);
  });

  test('PNJ : un joueur ne peut changer aucun des deux choix ni publier le PNJ', async () => {
    const player = as('alice');
    await assertFails(updateDoc(data(player, 'antagonists', 'pnj1'), { showInAips: true, knownToPlayers: true }));
    const batch = writeBatch(player);
    batch.update(data(player, 'antagonists', 'pnj1'), { knownToPlayers: true });
    batch.set(data(player, 'directory', 'pnj_pnj1'), { kind: 'pnj', name: 'Le Prince' });
    await assertFails(batch.commit());
    equal((await getDoc(data(as('carol'), 'antagonists', 'pnj1'))).data().knownToPlayers, undefined);
  });

  test('apprentissages : demandes et décisions restent réservées au staff', async () => {
    const staff = as('carol');
    for (const status of ['pending', 'approved', 'rejected']) {
      const id = `learning_${status}`;
      await assertSucceeds(setDoc(data(staff, 'learnings', id), { userId: 'alice', characterName: 'Ilse', status, type: 'Discipline', action: 'Domination', levels: [3] }));
      await assertFails(getDoc(data(as('alice'), 'learnings', id)));
      await assertFails(updateDoc(data(as('alice'), 'learnings', id), { status: 'approved' }));
      await assertFails(setDoc(data(as('alice'), 'learnings', `fake_${id}`), { userId: 'alice', status: 'approved' }));
      await assertSucceeds(updateDoc(data(as('dan'), 'learnings', id), { mentor: 'Le Baron' }));
    }
  });

  test('données privées d\'un compte (hors profil)', async () => {
    const own = doc(as('alice'), 'artifacts', APP, 'users', 'alice', 'drafts', 'd1');
    await assertSucceeds(setDoc(own, { text: 'brouillon' }));
    await assertFails(getDoc(doc(as('bob'), 'artifacts', APP, 'users', 'alice', 'drafts', 'd1')));
  });
});


describe('Demandes de progression', () => {
  const request = { characterName: 'Ilse', clan: 'Brujah', type: 'Compétence', action: 'Investigation', currentLevel: 1, levels: [2], mentor: '', date: '', notes: '', decisionReason: '', userId: 'alice', characterId: 'c1', explanation: 'Entraînement en jeu', monthLabel: 'Octobre 2026', createdAt: '2026-10-30' };
  test('dépôt personnel autorisé, usurpation et auto-validation interdites', async () => {
    await assertSucceeds(setDoc(data(as('alice'), 'learning_requests', 'r1'), request));
    await assertFails(setDoc(data(as('bob'), 'learning_requests', 'r2'), request));
    await assertFails(setDoc(data(as('alice'), 'learning_requests', 'r3'), { ...request, review: { status: 'approved' } }));
    await assertFails(updateDoc(data(as('alice'), 'learning_requests', 'r1'), { review: { status: 'approved' } }));
  });
  test('seul le propriétaire et les conteurs lisent la demande ; notes internes séparées', async () => {
    await assertSucceeds(setDoc(data(as('alice'), 'learning_requests', 'r1'), request));
    await assertSucceeds(getDoc(data(as('alice'), 'learning_requests', 'r1')));
    await assertFails(getDoc(data(as('bob'), 'learning_requests', 'r1')));
    await assertSucceeds(updateDoc(data(as('carol'), 'learning_requests', 'r1'), { review: { status: 'approved' } }));
    await assertSucceeds(setDoc(data(as('carol'), 'learnings', 'diverse_r1'), { notes: 'Secret' }));
    await assertFails(getDoc(data(as('alice'), 'learnings', 'diverse_r1')));
  });
  test('le joueur ne peut ni créer ni modifier sa décision d’apprentissage dans les AIP', async () => {
    await assertFails(setDoc(data(as('alice'), 'global_aips', 'fraude'), { ...dossier('alice'), learningReviews: {} }));
    await assertSucceeds(updateDoc(data(as('carol'), 'global_aips', 'alice1'), { learningReviews: { 'actions:1': { status: 'approved' } } }));
    await assertFails(updateDoc(data(as('alice'), 'global_aips', 'alice1'), { learningReviews: {} }));
    await assertSucceeds(updateDoc(data(as('alice'), 'global_aips', 'alice1'), { updatedAt: 'maintenant' }));
  });
});


test('liaison groupée atomique, conservation hors sélection et refus des activités modifiées', async () => {
  const db = as('carol');
  const action = { id: 'obst', actionType: 'ciblée', actionName: 'Obstruction', category: 'gotha', obstructedCategory: 'pegre', obstructionTarget: 'autre', obstructionText: 'Acquisition d’armes', actionsSpent: 2 };
  const a = { id: 'arme', actionType: 'globale', category: 'pegre', actionName: 'Faveurs illégales', description: 'Armes' };
  const source = { ...dossier('alice'), id: 'bulk-source', actions: [action] };
  const t1 = { ...dossier('bob'), id: 'bulk-one', actions: [a] };
  const t2 = { ...dossier('pnj'), antagonistId: 'pnj', id: 'bulk-two', actions: [a] };
  await setDoc(data(db, 'global_influences', source.id), source);
  await setDoc(data(db, 'global_influences', t1.id), t1);
  await setDoc(data(db, 'global_influences', t2.id), t2);
  const c1 = { d: t1, a, i: 0 }; const c2 = { d: t2, a, i: 0 };
  await saveObstructionLinks(db, APP, source, action, 0, [c1, c2], true);
  const readLinks = async () => (await getDoc(data(db, 'global_influences', source.id))).data().obstructionLinks;
  equal((await readLinks()).length, 2);
  await saveObstructionLinks(db, APP, source, action, 0, [c1], false);
  equal((await readLinks()).length, 1);
  equal((await readLinks())[0].dossierId, t2.id);
  await updateDoc(data(db, 'global_influences', t2.id), { actions: [{ ...a, description: 'Activité modifiée' }] });
  await rejects(saveObstructionLinks(db, APP, source, action, 0, [c1, c2], true), /activité a changé/);
  equal((await readLinks()).length, 1);
});

test('liens d’obstruction réservés aux conteurs, préservés lors des modifications joueur', async () => {
  const links = [{ source: 'id:o', dossierId: 'autre', target: 'id:a', sourceSignature: 'opaque', targetSignature: 'opaque' }];
  await assertFails(setDoc(data(as('alice'), 'global_influences', 'fraude-liens'), { ...dossier('alice'), obstructionLinks: links }));
  await assertSucceeds(setDoc(data(as('alice'), 'global_influences', 'liens'), dossier('alice')));
  await assertFails(updateDoc(data(as('alice'), 'global_influences', 'liens'), { obstructionLinks: links }));
  await assertSucceeds(updateDoc(data(as('carol'), 'global_influences', 'liens'), { obstructionLinks: links }));
  await assertFails(updateDoc(data(as('alice'), 'global_influences', 'liens'), { obstructionLinks: [] }));
  await assertSucceeds(updateDoc(data(as('alice'), 'global_influences', 'liens'), { actions: [{ description: 'Activité modifiée' }] }));
  deepEqual((await getDoc(data(as('alice'), 'global_influences', 'liens'))).data().obstructionLinks, links);
  await assertFails(getDoc(data(as('bob'), 'global_influences', 'liens')));
});

test('validation des dépenses réservée au conteur et conservée au réenvoi du joueur', async () => {
  const expense = { id: 'e', description: 'Transport', amountCents: 1250 };
  const reviews = { e: { ...expense, status: 'approved', decidedBy: 'carol' } };
  await assertFails(setDoc(data(as('alice'), 'global_aips', 'fraude-depense'), { ...dossier('alice'), expenseReviews: reviews }));
  await assertSucceeds(updateDoc(data(as('alice'), 'global_aips', 'alice1'), { expenses: [expense] }));
  await assertFails(updateDoc(data(as('alice'), 'global_aips', 'alice1'), { expenseReviews: reviews }));
  await assertSucceeds(updateDoc(data(as('carol'), 'global_aips', 'alice1'), { expenseReviews: reviews }));
  await assertFails(updateDoc(data(as('alice'), 'global_aips', 'alice1'), { expenseReviews: {} }));
  await assertSucceeds(updateDoc(data(as('alice'), 'global_aips', 'alice1'), { expenses: [{ ...expense, amountCents: 2000 }] }));
  deepEqual((await getDoc(data(as('alice'), 'global_aips', 'alice1'))).data().expenseReviews, reviews);
  await assertFails(getDoc(data(as('bob'), 'global_aips', 'alice1')));
});
