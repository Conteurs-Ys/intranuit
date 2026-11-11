import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function ProfilePrivacy() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const resetPassword = async () => {
    if (!auth.currentUser?.email || busy) return;
    setBusy(true); setMessage('');
    try {
      auth.languageCode = 'fr';
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setMessage('Lien de réinitialisation envoyé à ton adresse e-mail. Vérifie aussi tes courriers indésirables.');
    } catch (error) { console.error(error); setMessage('Envoi impossible. Réessaie plus tard.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl px-5 py-4" style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
    <details>
      <summary className="cursor-pointer text-sm font-bold" style={{ color: 'var(--night-text)' }}>Compte et confidentialité</summary>
      <div className="mt-4 space-y-4 text-[13px] leading-relaxed" style={{ color: 'var(--night-muted)' }}>
        <div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--night-text)' }}>Mot de passe</h3>
          <p>Un lien envoyé à ton adresse e-mail te permet de choisir un nouveau mot de passe.</p>
          <button type="button" disabled={busy || !auth.currentUser?.email} onClick={resetPassword} className="mt-2 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ borderColor: 'var(--night-line-strong)', color: 'var(--night-text)' }}>
            {busy ? 'Envoi…' : 'Recevoir un lien de réinitialisation'}
          </button>
          {message && <p role="status" className="mt-2">{message}</p>}
        </div>
        <div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--night-text)' }}>Confidentialité</h3>
          <p>Ton adresse e-mail sert à la connexion et à la récupération du compte. Ton profil, tes AIP, tes influences et tes demandes servent à la gestion de la chronique. L’authentification et les données sont hébergées avec Firebase (Google).</p>
          <p className="mt-2">Les conteurs accèdent aux dossiers pour les traiter ; les administrateurs gèrent les comptes. Les autres joueurs n’ont pas accès à tes dossiers. Le nom et le clan de ton personnage figurent dans l’annuaire, et les informations prévues par les règles peuvent apparaître dans les rumeurs diffusées.</p>
          <p className="mt-2">Pour une question sur tes données, une correction ou une demande de suppression, contacte l’administration de ta chronique.</p>
          <p className="mt-2">La suppression du compte dans l’application bloque l’accès et retire le profil et l’entrée d’annuaire. Les dossiers de jeu et leurs résultats restent conservés pour les archives des conteurs ; le compte de connexion Firebase et son e-mail restent présents.</p>
        </div>
      </div>
    </details>
    <p className="mt-3 text-[11px]" style={{ color: 'var(--night-faint)' }}>© {new Date().getFullYear()} Swiiptz · Intranuit</p>
  </section>;
}
