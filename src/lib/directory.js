// Annuaire des personnages que les joueurs peuvent citer dans « Avec qui » :
// chaque personnage joueur s'y inscrit lui-même, et seuls les PNJ que les
// conteurs ont marqués « connus des joueurs » y figurent.
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { activeCharacterId } from '../utils/characters';
import { db, currentAppId } from './firebase';

export const directoryCollection = (appId = currentAppId) =>
  collection(db, 'artifacts', appId, 'public', 'data', 'directory');

const entryRef = (appId, id) => doc(db, 'artifacts', appId, 'public', 'data', 'directory', id);

// Le personnage du joueur connecté (document = son uid).
export function upsertOwnCharacter(uid, character) {
  if (!character?.name) return Promise.resolve();
  return setDoc(entryRef(currentAppId, uid), {
    kind: 'pj', uid, characterId: activeCharacterId(character), name: character.name, clan: character.clan || '', updatedAt: new Date().toISOString(),
  });
}

// Un PNJ n'apparaît que s'il est connu des joueurs ; sinon on le retire.
export function syncAntagonist(appId, antagId, antag) {
  const ref = entryRef(appId, `pnj_${antagId}`);
  if (!antag?.knownToPlayers || !antag.name) return deleteDoc(ref).catch(() => {});
  return setDoc(ref, { kind: 'pnj', name: antag.name, updatedAt: new Date().toISOString() });
}

export const removeAntagonist = (appId, antagId) => deleteDoc(entryRef(appId, `pnj_${antagId}`)).catch(() => {});
