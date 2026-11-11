import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const currentAppId = (import.meta.env.VITE_APP_ID || 'intranuit').replace(/\//g, '_');

// Mode local (npm run dev:local) : tout passe par les émulateurs, jamais par la vraie base.
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Déconnexion : on recharge la page ensuite. Sinon, les écoutes en direct de la console
// (réservées aux conteurs) échouent en même temps que la session tombe, et Firestore 12
// s'arrête net (« INTERNAL ASSERTION FAILED ») en laissant une page blanche.
export async function logout() {
  try { await signOut(auth); } finally { window.location.reload(); }
}
