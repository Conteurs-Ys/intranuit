import { doc, runTransaction } from 'firebase/firestore';
import { actionReference, activitySignature, isObstruction, obstructionActorKey, obstructionTarget } from './obstruction.js';
import { RUMEUR_ACTIONS } from '../constants/index.js';

export function saveObstructionLinks(db, appId, source, action, index, candidates, checked) {
  if (!candidates.length) return Promise.resolve();
  const sourceRef = actionReference(action, index);
  const ref = id => doc(db, 'artifacts', appId, 'public', 'data', 'global_influences', id);
  return runTransaction(db, async tx => {
    const currentSource = await tx.get(ref(source.id));
    const ids = [...new Set(candidates.map(c => c.d.id))];
    const snapshots = await Promise.all(ids.map(id => tx.get(ref(id))));
    const targets = new Map(snapshots.map(s => [s.id, s.data()]));
    const s = currentSource.data();
    const a = s?.actions?.find((x, i) => actionReference(x, i) === sourceRef);
    if (!a || !isObstruction(a) || activitySignature(a) !== activitySignature(action)
      || s.monthLabel !== source.monthLabel || obstructionTarget(a).target === 'rumeurs') {
      throw new Error('L’obstruction a changé. Actualise avant de relier les actions.');
    }
    let links = s.obstructionLinks || [];
    for (const c of candidates) {
      const t = targets.get(c.d.id);
      const targetRef = actionReference(c.a, c.i);
      const target = t?.actions?.find((x, i) => actionReference(x, i) === targetRef);
      if (!target || activitySignature(target) !== activitySignature(c.a) || s.monthLabel !== t.monthLabel
        || obstructionActorKey(s) === obstructionActorKey(t) || target.category !== obstructionTarget(a).category
        || target.actionType !== 'globale' || RUMEUR_ACTIONS.includes(target.actionName)) {
        throw new Error('Une activité a changé. Actualise avant de relier les actions.');
      }
      links = links.filter(l => !(l.source === sourceRef && l.dossierId === c.d.id && l.target === targetRef));
      if (checked) links.push({ source: sourceRef, sourceSignature: activitySignature(a), dossierId: c.d.id,
        target: targetRef, targetSignature: activitySignature(target) });
    }
    tx.update(ref(source.id), { obstructionLinks: links });
  });
}
