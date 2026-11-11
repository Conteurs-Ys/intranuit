import { auth, db, currentAppId } from './firebase';
import { deleteAccountData as cleanup } from '../utils/deleteAccountData';

export const deleteAccountData = uid => cleanup(db, currentAppId, uid, auth.currentUser?.uid);
