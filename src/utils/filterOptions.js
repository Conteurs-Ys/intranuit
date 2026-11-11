// Options d'un filtre construites à partir des lignes affichées : seules les valeurs
// présentes sont proposées, avec leur nombre, dans l'ordre métier quand il existe.
export function countOptions(items, keyOf, { order = [], labelOf = (v) => v } = {}) {
  const counts = new Map();
  items.forEach(item => {
    const key = keyOf(item);
    if (key === undefined || key === null) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const rank = (v) => { const i = order.indexOf(v); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  return [...counts.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || String(labelOf(a)).localeCompare(String(labelOf(b)), 'fr'))
    .map(([value, count]) => ({ value, label: labelOf(value), count }));
}
