// Regroupement d'AIP côté conteur (CDC §10.3). Un groupe réunit des AIP de plusieurs
// dossiers (joueurs et PNJ) pour les traiter ensemble ; chaque joueur reçoit sa
// sentence dans son propre dossier et ne voit jamais le groupe.
// Fonctions pures : clés stables, suggestions automatiques, couleurs.

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Clé stable d'une ligne du tableau AIP : l'identifiant de l'action quand il existe
// (formulaire joueur), sinon sa position (PNJ, anciennes données).
export function rowKey(row) {
  if (!row.isPlayer) return `npc:${row.aipId}:${row.actionIdx}`;
  const list = row.isBonus ? 'bonus' : 'actions';
  return `${row.aipId}:${list}:${row.id !== undefined && row.id !== null ? row.id : `i${row.actionIdx}`}`;
}

// Personnes présentes dans une AIP : « Avec qui », plus les noms connus cités dans le texte.
export function mentionsOf(row, knownNames = []) {
  const found = new Map();
  (row.people || []).forEach(p => { if (norm(p)) found.set(norm(p), p.trim()); });
  const text = ` ${norm(`${row.description || ''} ${row.intention || ''}`).replace(/[^a-z0-9]+/g, ' ')} `;
  knownNames.forEach(name => {
    const n = norm(name);
    if (n.length < 4 || found.has(n)) return;
    const pattern = ` ${n.replace(/[^a-z0-9]+/g, ' ').trim()} `;
    if (text.includes(pattern)) found.set(n, name);
  });
  // On ne se « mentionne » pas soi-même.
  found.delete(norm(row.characterName));
  return [...found.entries()].map(([key, name]) => ({ key, name }));
}

// Acteurs d'une AIP : son auteur et les personnes impliquées (Avec qui, noms cités).
export function actorsOf(row, knownNames = []) {
  const actors = new Map([[norm(row.characterName), (row.characterName || '').trim()]]);
  mentionsOf(row, knownNames).forEach(({ key, name }) => actors.set(key, name));
  actors.delete('');
  return actors;
}

// Suggestions : des AIP qui ont exactement les mêmes acteurs (au moins deux), par exemple
// une action commune déclarée par chacun, ou le PNJ qui piste le joueur qui enquête sur lui.
// Une AIP sans personne impliquée n'est jamais suggérée. Les AIP déjà groupées sont écartées.
export function suggestGroups(rows, { exclude = new Set(), knownNames = [] } = {}) {
  const bySet = new Map();
  rows.filter(r => !exclude.has(rowKey(r))).forEach(row => {
    const actors = actorsOf(row, knownNames);
    if (actors.size < 2) return;
    const signature = [...actors.keys()].sort().join('|');
    if (!bySet.has(signature)) bySet.set(signature, { actors: [...actors.values()], rows: [] });
    bySet.get(signature).rows.push(row);
  });
  return [...bySet.values()]
    .filter(g => g.rows.length >= 2)
    .map(({ actors, rows: list }) => ({
      actors: [...actors].sort((x, y) => x.localeCompare(y, 'fr')),
      keys: list.map(rowKey).sort(),
      characters: [...new Set(list.map(r => r.characterName))],
    }))
    .sort((x, y) => y.keys.length - x.keys.length || x.actors.join().localeCompare(y.actors.join(), 'fr'));
}

// Une AIP n'appartient qu'à un groupe : index clé → groupe.
export function groupIndex(groups = []) {
  const index = new Map();
  groups.forEach(g => (g.members || []).forEach(k => { if (!index.has(k)) index.set(k, g); }));
  return index;
}

const PALETTE = ['#e5484f', '#5fa0f2', '#9fd8b8', '#d9b26a', '#c2b3e6', '#ec9440', '#f7a8ac', '#7fd1d8'];
export const groupColor = (group, groups = []) => PALETTE[Math.max(0, groups.findIndex(g => g.id === group.id)) % PALETTE.length];
