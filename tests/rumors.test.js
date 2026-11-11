import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rumorsMissingSpecs, rumorPeriod, monthBounds, defaultRumorSpecs, rumorSpecs, anonymize, traceDraft, defaultTrace,
  seedApplies, buildRumorTable, publishedRumorTable, freezeDossierRumors, withProfileRumorSpecs, groupRumorRows, seedMonth, patchUsage, usagesToReview,
} from '../src/utils/rumors.js';

const rumeur = { id: 'r', actionType: 'globale', actionName: 'La Rumeur', category: 'pegre', specialization: 'Police', level: 2, actionsSpent: 1 };
const ilse = { id: 'd-ilse', userId: 'ilse', characterName: 'Ilse Varga', monthLabel: 'Octobre 2026', actions: [rumeur] };
const usage = (extra) => ({ id: Math.random(), actionType: 'globale', actionName: 'Faveurs illégales', category: 'pegre', specialization: 'Police', influenceName: 'Commissariat central', description: '', ...extra });
const dossier = (id, userId, monthLabel, actions, extra = {}) => ({ id, userId, characterName: id, monthLabel, actions, ...extra });

test('période : les 3 mois du calendrier finissant au mois de la rumeur', () => {
  assert.deepEqual(rumorPeriod('Octobre 2026'), ['Août 2026', 'Septembre 2026', 'Octobre 2026']);
});

test("période : passage d'année", () => {
  assert.deepEqual(rumorPeriod('Janvier 2027'), ['Novembre 2026', 'Décembre 2026', 'Janvier 2027']);
  assert.deepEqual(rumorPeriod('Février 2027'), ['Décembre 2026', 'Janvier 2027', 'Février 2027']);
  assert.deepEqual(monthBounds('Février 2028'), { start: '2028-02-01', end: '2028-02-29' });
});

test('période : les mois joués, un mois sans dossier est sauté', () => {
  // Aucun dossier en septembre : la rumeur d'octobre remonte à août et juillet ; novembre est postérieur.
  const dossiers = [ilse,
    dossier('juillet', 'a', 'Juillet 2026', [usage({ influenceName: 'Juillet' })]),
    dossier('aout', 'a', 'Août 2026', [usage({ influenceName: 'Août' })]),
    dossier('novembre', 'a', 'Novembre 2026', [usage({ influenceName: 'Novembre' })])];
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers });
  assert.deepEqual(t.rows.map(r => r.institution), ['Août', 'Juillet']);
});

test('ancien bug : une rumeur du mois le plus récent lit aussi les 2 mois précédents', () => {
  const dossiers = [ilse, dossier('a', 'a', 'Août 2026', [usage()]), dossier('s', 'b', 'Septembre 2026', [usage()]), dossier('o', 'c', 'Octobre 2026', [usage()])];
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers });
  assert.deepEqual(t.rows.map(r => r.month), ['Octobre 2026', 'Septembre 2026', 'Août 2026']);
});

test('exclusion : les actions du joueur lui-même ; les rumeurs des autres sont des usages', () => {
  const autreMois = dossier('ilse-sept', 'ilse', 'Septembre 2026', [usage({ influenceName: 'À moi' })]);
  const autre = dossier('b', 'bob', 'Octobre 2026', [usage({ influenceName: 'Bob' }), { ...rumeur, id: 'r2' }]);
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers: [ilse, autreMois, autre] });
  assert.deepEqual(t.rows.map(r => r.actionName).sort(), ['Faveurs illégales', 'La Rumeur']);
  assert.ok(!t.rows.some(r => r.institution === 'À moi'));
});

test('PNJ : exclu par sa fiche, ses spécialités viennent de la fiche', () => {
  const antag = { id: 'p1', name: 'Le Baron', influences: { pegre: { level: 3, specs: [{ spec: 'Rue' }, { spec: 'Crime' }] } } };
  const npc = dossier('n', undefined, 'Octobre 2026', [{ ...rumeur, specialization: '' }], { antagonistId: 'p1', status: 'npc' });
  assert.deepEqual(defaultRumorSpecs(npc.actions[0], npc, [antag]), ['Crime', 'Rue']);
  const autreNpc = dossier('n2', undefined, 'Octobre 2026', [usage({ specialization: 'Rue', influenceName: 'Gang' })], { antagonistId: 'p1', status: 'npc' });
  const t = buildRumorTable({ rumor: npc.actions[0], dossier: npc, dossiers: [npc, autreNpc], antagonists: [antag] });
  assert.equal(t.rows.length, 0);
});

test('catégories : seule la catégorie de la rumeur, actions globales et ciblées', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [
    usage({ influenceName: 'Gotha', category: 'gotha' }),
    usage({ influenceName: 'Attaque', actionType: 'ciblée', actionName: 'Attaque', targetCharacter: 'Ilse Varga' }),
    usage({ influenceName: 'Faveurs' }),
  ]);
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers: [ilse, b] });
  assert.deepEqual(t.rows.map(r => r.institution).sort(), ['Attaque', 'Faveurs']);
});

test('spécialités : toutes celles déclarées dans la catégorie, ajustables par le conteur', () => {
  const d = { ...ilse, actions: [rumeur, usage({ specialization: 'Rue' }), usage({ specialization: 'Finances', category: 'gotha' })] };
  assert.deepEqual(defaultRumorSpecs(rumeur, d), ['Police', 'Rue']);
  assert.deepEqual(rumorSpecs({ ...rumeur, rumorSpecs: ['Transport'] }, d), ['Transport']);
  const b = dossier('b', 'bob', 'Octobre 2026', [usage({ specialization: 'Rue', influenceName: 'Rue' }), usage({ specialization: 'Transport', influenceName: 'Port' })]);
  assert.deepEqual(buildRumorTable({ rumor: rumeur, dossier: d, dossiers: [d, b] }).rows.map(r => r.institution), ['Rue']);
  assert.equal(buildRumorTable({ rumor: { ...rumeur, level: 1 }, dossier: d, dossiers: [d] }).tooManySpecs, 1);
  // Monopoliste : deux spécialisations par point.
  assert.equal(buildRumorTable({ rumor: { ...rumeur, level: 1, monopoliste: true }, dossier: d, dossiers: [d] }).tooManySpecs, 0);
  assert.equal(withProfileRumorSpecs([rumeur], { monopoliste: true })[0].monopoliste, true);
});

test('sans spécialité déclarée : proposé mais masqué, au conteur de juger', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage({ specialization: '', influenceName: 'Docks' })]);
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers: [ilse, b] });
  assert.equal(t.rows[0].hidden, true);
  assert.equal(publishedRumorTable(t).length, 0);
  const shown = buildRumorTable({ rumor: { ...rumeur, rumorEdits: { [t.rows[0].key]: { hidden: false } } }, dossier: ilse, dossiers: [ilse, b] });
  assert.equal(publishedRumorTable(shown).length, 1);
});

const obst = (extra) => ({ actionType: 'ciblée', actionName: 'Obstruction', category: 'gotha', actionsSpent: 1, obstructedCategory: 'pegre', obstructionTarget: 'rumeurs', ...extra });

test('obstruction : du cycle, par spécialité ; sans résultat si les actions ne la dépassent pas', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage({ influenceName: 'Police' }), usage({ specialization: 'Rue', influenceName: 'Rue' })]);
  const d = { ...ilse, actions: [{ ...rumeur, rumorSpecs: ['Police', 'Rue'] }] };
  const o = dossier('o', 'olga', 'Octobre 2026', [obst({ obstructionScope: 'Police' })]);
  const t = buildRumorTable({ rumor: d.actions[0], dossier: d, dossiers: [d, b, o] });
  assert.deepEqual(t.blockedSpecs, ['Police']);
  assert.equal(t.blocked, false);
  assert.deepEqual(publishedRumorTable(t).map(r => r.institution), ['Rue']);
  // 2 actions dépensées dépassent une obstruction de 1.
  const t2 = buildRumorTable({ rumor: { ...d.actions[0], actionsSpent: 2 }, dossier: d, dossiers: [d, b, o] });
  assert.equal(publishedRumorTable(t2).length, 2);
});

test('obstruction : les 15 spécialités, cumul façon soutien, mois précédent ignoré', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage()]);
  const o1 = dossier('o1', 'olga', 'Octobre 2026', [obst({ obstructionScope: 'all', actionsSpent: 1 })]);
  const o2 = dossier('o2', 'oscar', 'Octobre 2026', [obst({ obstructionScope: 'all', actionsSpent: 1 })]);
  const t = buildRumorTable({ rumor: { ...rumeur, actionsSpent: 2 }, dossier: ilse, dossiers: [ilse, b, o1, o2] });
  assert.equal(t.obstruction.Police.level, 2);
  assert.equal(t.blocked, true);
  assert.equal(publishedRumorTable(t).length, 0);
  const vieux = dossier('o3', 'olga', 'Septembre 2026', [obst({ obstructionScope: 'all', actionsSpent: 3 })]);
  assert.equal(buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers: [ilse, b, vieux] }).blocked, false);
  // Sa propre obstruction ne le gêne pas.
  const sienne = { ...ilse, actions: [rumeur, obst({ obstructionScope: 'all', actionsSpent: 3 })] };
  assert.equal(buildRumorTable({ rumor: rumeur, dossier: sienne, dossiers: [sienne, b] }).blocked, false);
});

test('rumeurs de conteur : comme des usages normaux (catégorie, spécialités facultatives, 3 mois)', () => {
  const ctx = { category: 'pegre', specs: ['Police'], monthLabel: 'Octobre 2026' };
  const seed = { id: 's', category: 'pegre', specs: [], from: '2026-10-01', to: '2026-12-31', text: 'Des camions quittent le port la nuit' };
  assert.equal(seedApplies(seed, ctx), true);
  assert.equal(seedApplies({ ...seed, category: 'gotha' }, ctx), false);
  assert.equal(seedApplies({ ...seed, specs: ['Transport'] }, ctx), false);
  assert.equal(seedApplies({ ...seed, specs: ['Transport', 'Police'] }, ctx), true);
  assert.equal(seedApplies({ ...seed, from: '2026-11-01' }, ctx), false);
  // Comme un usage normal : les 3 mois de la rumeur (août à octobre), au mois le plus récent où elle vaut.
  assert.equal(seedMonth({ ...seed, from: '', to: '2026-09-30' }, ctx), 'Septembre 2026');
  assert.equal(seedMonth({ ...seed, from: '2026-08-10', to: '2026-08-20' }, ctx), 'Août 2026');
  assert.equal(seedApplies({ ...seed, from: '2026-06-01', to: '2026-07-31' }, ctx), false);
  assert.equal(seedApplies({ ...seed, from: '', to: '' }, ctx), true);
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers: [ilse], seeds: [seed] });
  assert.deepEqual(publishedRumorTable(t), [{ institution: '—', specialization: '', trace: seed.text }]);
});

test('anonymisation : noms et prénoms masqués, sans toucher aux mots qui les contiennent', () => {
  assert.equal(anonymize('Ilse Varga a payé Bob et ilse est partie', ['Ilse Varga', 'Bob']), '[…] a payé […] et […] est partie');
  assert.equal(anonymize('Le Bobinard ferme', ['Bob']), 'Le Bobinard ferme');
  assert.equal(anonymize('Élodie passe', ['élodie']), '[…] passe');
});

test("trace : préremplie sans nom ni nom d’action, à relire ; non relue, seule la formule neutre est diffusée", () => {
  const act = usage({ description: 'Bob fait relâcher Karl, son goule', targetCharacter: '' });
  assert.equal(traceDraft(act, ['Bob', 'Karl']), '[…] fait relâcher […], son goule');
  assert.equal(traceDraft({ actionType: 'ciblée', actionName: 'Attaque', description: 'Ruiner Bob' }, ['Bob']), 'Une influence a été attaquée — Ruiner […]');
  assert.equal(traceDraft({ actionType: 'globale', actionName: 'Faveurs illégales', description: '' }), 'Usage de l’influence');
  assert.equal(defaultTrace({ actionType: 'ciblée', actionName: 'Attaque' }), 'Une influence a été attaquée');
  const b = dossier('Bob', 'bob', 'Octobre 2026', [act]);
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers: [ilse, b], names: ['Karl'] });
  assert.equal(t.toReview, 1);
  assert.equal(publishedRumorTable(t)[0].trace, 'Usage de l’influence');
  assert.ok(!JSON.stringify(publishedRumorTable(t)).includes('Faveurs illégales'), 'le nom de l’action ne sort jamais');
  assert.ok(!t.rows[0].draft.includes('Faveurs illégales'));
  const key = t.rows[0].key;
  const relu = buildRumorTable({ rumor: { ...rumeur, rumorEdits: { [key]: { trace: 'Un détenu relâché en pleine nuit' } } }, dossier: ilse, dossiers: [ilse, b] });
  assert.equal(relu.toReview, 0);
  assert.equal(publishedRumorTable(relu)[0].trace, 'Un détenu relâché en pleine nuit');
});

test('le conteur masque, ajoute ; le tableau est figé à la diffusion', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage()]);
  const t = buildRumorTable({ rumor: rumeur, dossier: ilse, dossiers: [ilse, b] });
  const edited = { ...rumeur, rumorEdits: { [t.rows[0].key]: { hidden: true } }, rumorExtra: [{ id: 'x', institution: 'Port', trace: 'Un cargo sans pavillon' }] };
  const d = { ...ilse, actions: [edited, usage()] };
  const [frozen, other] = freezeDossierRumors(d, { dossiers: [d, b] }, '2026-10-31T20:00:00Z');
  assert.deepEqual(frozen.rumorTable, [{ institution: 'Port', specialization: '', trace: 'Un cargo sans pavillon' }]);
  assert.equal(frozen.rumorFrozenAt, '2026-10-31T20:00:00Z');
  assert.equal(other.rumorTable, undefined);
});

test('spécialités du profil reprises sur les rumeurs à l’envoi du formulaire joueur', () => {
  const sheet = { pegre: { level: 2, specs: [{ spec: 'Rue', name: 'Gang' }, { spec: 'Police' }] }, gotha: { level: 1, specs: [{ spec: 'Finances' }] } };
  const [r, autre, g] = withProfileRumorSpecs([{ ...rumeur, rumorSpecs: ['Transport'] }, usage(), { ...rumeur, category: 'gotha', actionName: "Potins et délit d'initié" }], sheet);
  assert.deepEqual(r.rumorSpecs, ['Police', 'Rue']);
  assert.equal(autre.rumorSpecs, undefined);
  assert.deepEqual(g.rumorSpecs, ['Finances']);
  assert.deepEqual(withProfileRumorSpecs([rumeur], {})[0].rumorSpecs, []);
});

test('à la diffusion, un tableau déjà figé par un conteur est conservé', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage()]);
  const deja = { ...rumeur, rumorTable: [{ institution: 'Gardé', month: 'Octobre 2026', specialization: '', trace: 'x' }], rumorFrozenAt: '2026-10-20T00:00:00Z' };
  const d = { ...ilse, actions: [deja] };
  assert.equal(freezeDossierRumors(d, { dossiers: [d, b] }, 'plus tard', { keepFrozen: true })[0].rumorTable[0].institution, 'Gardé');
  assert.equal(freezeDossierRumors(d, { dossiers: [d, b] }, 'plus tard')[0].rumorTable[0].institution, 'Commissariat central');
});

test('tableau classé par spécialité, spécialités couvertes sans ligne comprises', () => {
  const rows = [{ specialization: 'Rue', institution: 'A' }, { specialization: '', institution: 'Port' }, { specialization: 'Police, Rue', institution: 'B' }, { specialization: 'Crime', institution: 'C' }];
  const g = groupRumorRows(rows, ['Rue', 'Transport']);
  assert.deepEqual(g.map(x => x.spec), ['Crime', 'Police', 'Rue', 'Transport', '']);
  assert.deepEqual(g.find(x => x.spec === 'Transport').rows, []);
  assert.deepEqual(g.find(x => x.spec === 'Police').rows.map(r => r.institution), ['B']);
});

test('trace commune : relue une fois sur l’action d’origine, valable pour tous les tableaux', () => {
  const act = usage({ id: 'u1', description: 'Bob fait relâcher Karl' });
  const b = dossier('b', 'bob', 'Octobre 2026', [{ ...act, rumorTrace: 'Un détenu relâché en pleine nuit' }]);
  const r2 = { ...rumeur, id: 'r2' };
  const autre = dossier('d-olga', 'olga', 'Octobre 2026', [r2]);
  for (const [rumor, d] of [[rumeur, ilse], [r2, autre]]) {
    const t = buildRumorTable({ rumor, dossier: d, dossiers: [ilse, autre, b] });
    const row = t.rows.find(r => r.key === 'b:u1');
    assert.equal(row.reviewed, true);
    assert.equal(publishedRumorTable(t).find(r => r.institution === 'Commissariat central').trace, 'Un détenu relâché en pleine nuit');
  }
});

test('trace propre à un joueur : prime sur la commune, pour son tableau seulement', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage({ id: 'u1', rumorTrace: 'Commune' })]);
  const perso = { ...rumeur, rumorEdits: { 'b:u1': { trace: 'Pour Ilse' } } };
  const t = buildRumorTable({ rumor: perso, dossier: { ...ilse, actions: [perso] }, dossiers: [b] });
  assert.equal(t.rows[0].trace, 'Pour Ilse');
  assert.equal(t.rows[0].override, true);
  assert.equal(t.rows[0].shared, 'Commune');
});

test('patchUsage : écrit ou retire un champ sur l’action d’origine', () => {
  const d = dossier('b', 'bob', 'Octobre 2026', [usage({ id: 'u1' }), { actionName: 'Sans id' }]);
  assert.equal(patchUsage(d, 'b:u1', { rumorTrace: 'X' })[0].rumorTrace, 'X');
  assert.equal(patchUsage(d, 'b:1', { rumorTrace: 'Y' })[1].rumorTrace, 'Y');
  assert.equal('rumorTrace' in patchUsage({ ...d, actions: [{ ...d.actions[0], rumorTrace: 'X' }] }, 'b:u1', { rumorTrace: null })[0], false);
  assert.equal(patchUsage(d, 'b:zz', { rumorTrace: 'X' }), null);
});

test('traces à relire : chaque usage une fois, avec les joueurs qui le recevront', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage({ id: 'u1' }), usage({ id: 'u2', specialization: 'Rue', influenceName: 'Docks', rumorTrace: 'Relu' })]);
  const r2 = { ...rumeur, id: 'r2', rumorSpecs: ['Police', 'Rue'] };
  const olga = dossier('d-olga', 'olga', 'Octobre 2026', [r2], { characterName: 'Olga' });
  const ilseN = { ...ilse, characterName: 'Ilse Varga' };
  const all = [ilseN, olga, b];
  const list = usagesToReview([
    { preview: buildRumorTable({ rumor: rumeur, dossier: ilseN, dossiers: all }), dossier: ilseN },
    { preview: buildRumorTable({ rumor: r2, dossier: olga, dossiers: all }), dossier: olga },
  ]);
  // Les rumeurs d'Ilse et d'Olga sont aussi des usages (vus l'une par l'autre).
  assert.deepEqual(list.filter(u => u.key.startsWith('b:')).map(u => [u.key, u.reviewed, u.readers]), [['b:u1', false, ['Ilse Varga', 'Olga']], ['b:u2', true, ['Olga']]]);
});

test('traces à relire : Gotha et Pègre restent séparés', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage({ id: 'p1' }), usage({ id: 'g1', category: 'gotha', actionName: 'Tout a un prix' })]);
  const potins = { ...rumeur, id: 'pg', category: 'gotha', actionName: "Potins et délit d'initié" };
  const d = { ...ilse, actions: [rumeur, potins] };
  const pegre = buildRumorTable({ rumor: rumeur, dossier: d, dossiers: [d, b] });
  const gotha = buildRumorTable({ rumor: potins, dossier: d, dossiers: [d, b] });
  assert.deepEqual(pegre.rows.map(r => r.key), ['b:p1']);
  assert.deepEqual(gotha.rows.map(r => r.key), ['b:g1']);
  const list = usagesToReview([{ preview: pegre, dossier: d }, { preview: gotha, dossier: d }]);
  assert.deepEqual(list.map(x => [x.key, x.category]), [['b:g1', 'gotha'], ['b:p1', 'pegre']]);
});

test('plusieurs obstructions : même auteur additionné, auteurs différents cumulés façon soutien, « toutes » + une spécialité', () => {
  const b = dossier('b', 'bob', 'Octobre 2026', [usage()]);
  // Olga : 2 obstructions de 1 sur Police (même provenance → 2) ; Oscar : 2 sur les 15 ; Paul : 1 sur Rue (ne compte pas pour Police).
  const olga = dossier('o1', 'olga', 'Octobre 2026', [obst({ obstructionScope: 'Police' }), obst({ obstructionScope: 'Police' })]);
  const oscar = dossier('o2', 'oscar', 'Octobre 2026', [obst({ obstructionScope: 'all', actionsSpent: 2 })]);
  const paul = dossier('o3', 'paul', 'Octobre 2026', [obst({ obstructionScope: 'Rue', actionsSpent: 3 })]);
  const t = (spent) => buildRumorTable({ rumor: { ...rumeur, actionsSpent: spent }, dossier: ilse, dossiers: [ilse, b, olga, oscar, paul] });
  // 2 et 2 : la plus forte (2) + 2 en soutien → 3. Il faut 4 actions.
  assert.equal(t(1).obstruction.Police.level, 3);
  assert.equal(t(3).blocked, true);
  assert.equal(t(4).blocked, false);
  assert.equal(publishedRumorTable(t(4)).length, 1);
});


test('dépôt : rumeur interdite sans spécialités de la catégorie, indépendamment de la spécialité de l’action', () => {
  const actions = [{ category: 'pegre', actionType: 'globale', actionName: 'La Rumeur', specialization: 'Rue' }];
  assert.deepEqual(rumorsMissingSpecs(actions, {}), ['pegre']);
  assert.deepEqual(rumorsMissingSpecs(actions, { pegre: { specs: [{ spec: '' }, { spec: '  ' }] } }), ['pegre']);
  assert.deepEqual(rumorsMissingSpecs(actions, { gotha: { specs: [{ spec: 'Police' }] } }), ['pegre']);
  assert.deepEqual(rumorsMissingSpecs(actions, { pegre: { specs: [{ spec: 'Rue' }] } }), []);
});

test('dépôt : chaque catégorie de rumeurs doit avoir ses spécialités ; les autres actions restent autorisées', () => {
  const actions = [{ category: 'pegre', actionName: 'La Rumeur' }, { category: 'gotha', actionName: "Potins et délit d'initié" }];
  assert.deepEqual(rumorsMissingSpecs(actions, {}), ['pegre', 'gotha']);
  assert.deepEqual(rumorsMissingSpecs(actions, { pegre: { specs: [{ spec: 'Rue' }] } }), ['gotha']);
  assert.deepEqual(rumorsMissingSpecs([{ category: 'pegre', actionName: 'Défense' }], {}), []);
});

test('période d’une rumeur : un mois sans cycle ne compte pas', async () => {
  const { rumorMonths } = await import('../src/utils/rumors.js');
  const d = (monthLabel) => ({ monthLabel });
  // Octobre sauté : Novembre remonte à Septembre et Août.
  assert.deepEqual(rumorMonths('Novembre 2026', [d('Juillet 2026'), d('Août 2026'), d('Septembre 2026'), d('Novembre 2026')]), ['Août 2026', 'Septembre 2026', 'Novembre 2026']);
  // Sans mois sauté : les 3 mois consécutifs, passage d'année compris ; les mois postérieurs sont ignorés.
  assert.deepEqual(rumorMonths('Janvier 2027', [d('Novembre 2026'), d('Décembre 2026'), d('Janvier 2027'), d('Février 2027')]), ['Novembre 2026', 'Décembre 2026', 'Janvier 2027']);
  // Début de chronique : seulement les mois existants ; aucun dossier connu : calendrier.
  assert.deepEqual(rumorMonths('Septembre 2025', [d('Septembre 2025')]), ['Septembre 2025']);
  assert.deepEqual(rumorMonths('Octobre 2026', []), ['Août 2026', 'Septembre 2026', 'Octobre 2026']);
});

test('tableau de rumeur : les usages d’avant le mois sauté remontent, ceux du mois trop ancien non', () => {
  const act = (category, name, spec, institution) => ({ id: 1, category, actionType: 'globale', actionName: name, specialization: spec, influenceName: institution, description: 'x' });
  const rumor = { id: 9, category: 'pegre', actionName: 'La Rumeur', actionsSpent: 1, level: 3, rumorSpecs: ['Rue'] };
  const dossier = { id: 'moi', userId: 'u-moi', monthLabel: 'Novembre 2026', actions: [rumor] };
  const others = [
    { id: 'juil', userId: 'u2', monthLabel: 'Juillet 2026', actions: [act('pegre', 'Faveurs illégales', 'Rue', 'Trop ancien')] },
    { id: 'aout', userId: 'u2', monthLabel: 'Août 2026', actions: [act('pegre', 'Faveurs illégales', 'Rue', 'Gang d’août')] },
    { id: 'sept', userId: 'u2', monthLabel: 'Septembre 2026', actions: [act('pegre', 'Faveurs illégales', 'Rue', 'Gang de septembre')] },
  ];
  const t = buildRumorTable({ rumor, dossier, dossiers: [...others, dossier] });
  assert.deepEqual(t.months, ['Août 2026', 'Septembre 2026', 'Novembre 2026']);
  assert.deepEqual(new Set(t.rows.map(r => r.institution)), new Set(['Gang d’août', 'Gang de septembre']));
  const seed = { id: 's', category: 'pegre', specs: [], text: 'Rumeur d’octobre', from: '2026-10-01', to: '2026-10-31' };
  assert.equal(seedMonth(seed, { category: 'pegre', specs: ['Rue'], monthLabel: 'Novembre 2026', months: t.months }), null, 'le mois sauté n’existe pas pour les rumeurs de conteur');
  assert.equal(seedMonth({ ...seed, from: '2026-08-15', to: '2026-10-31' }, { category: 'pegre', specs: ['Rue'], monthLabel: 'Novembre 2026', months: t.months }), 'Septembre 2026');
});
