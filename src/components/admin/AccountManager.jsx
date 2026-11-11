import { useDialogs } from '../../context/DialogContext';
// AccountManager.jsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, currentAppId } from '../../lib/firebase';
import {
  User,
  Shield,
  Crown,
  Search,
  RefreshCw,
  CheckCircle,
  X,
  Clock,
  Check,
  Trash2,
} from 'lucide-react';
import { activeCharacterId, charactersOf, reactivate, STATUSES } from '../../utils/characters';
import InstanceSettings from './InstanceSettings';
import { deleteAccountData } from '../../lib/deleteAccount';

// Personnages d'un compte joueur (lus dans son profil privé, réservé aux admins) ; réactiver un ancien personnage.
// L'annuaire « Avec qui » suit à la prochaine connexion du joueur (il n'y écrit que lui-même).
function AccountCharacters({ uid, onChanged }) {
  const { confirmAction } = useDialogs();
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = doc(db, 'artifacts', currentAppId, 'users', uid, 'profile', 'info');
  const load = async () => { const snap = await getDoc(ref); setProfile(snap.exists() ? snap.data() : null); };
  const toggle = async () => { if (!open) await load().catch(e => console.error(e)); setOpen(o => !o); };
  const doReactivate = async (c) => {
    if (!await confirmAction({ title: 'Réactiver un personnage', message: `Rendre ${c.name} actif ? Le personnage actif actuel passera « retiré ».`, confirmLabel: 'Réactiver' })) return;
    const next = reactivate(profile, c.id);
    try {
      await setDoc(ref, next);
      await updateDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', uid), { name: next.name || '', clan: next.clan || '', sect: next.sect || '', activeCharacterId: activeCharacterId(next) });
      setProfile(next);
      onChanged?.(uid, next);
    } catch (e) { console.error(e); }
  };
  const characters = profile ? charactersOf(profile) : [];
  const activeId = profile ? activeCharacterId(profile) : null;
  return (
    <div className="pt-1">
      <button type="button" onClick={toggle} className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
        {open ? 'Masquer les personnages' : 'Personnages'}
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {characters.map(c => (
            <li key={c.id} className="flex items-center gap-3 text-[11px] text-zinc-400">
              <span className="font-serif italic text-zinc-200">{c.name || '—'}</span>
              <span className="uppercase tracking-widest text-[9px]">{STATUSES[c.status] || c.status}</span>
              {c.id !== activeId && (
                <button type="button" onClick={() => doReactivate(c)} className="text-[9px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-300">Réactiver</button>
              )}
            </li>
          ))}
          {!characters.length && <li className="text-[11px] text-zinc-500">Profil introuvable.</li>}
        </ul>
      )}
    </div>
  );
}

const ROLE_CONFIG = {
  pending: {
    label: 'En attente',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.1)',
    border: 'rgba(217,119,6,0.2)',
    icon: Clock,
  },
  player: {
    label: 'Joueur',
    color: '#71717a',
    bg: 'rgba(113,113,122,0.1)',
    border: 'rgba(113,113,122,0.2)',
    icon: User,
  },
  storyteller: {
    label: 'Conteur',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.2)',
    icon: Shield,
  },
  admin: {
    label: 'Admin',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.1)',
    border: 'rgba(217,119,6,0.2)',
    icon: Crown,
  },
};

function DeleteModal({ user, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-3xl p-8 animate-in zoom-in-95 duration-200"
        style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <Trash2 size={18} className="text-red-500" />
          </div>
          <h3 className="font-serif text-lg font-bold text-zinc-100 italic">Supprimer un compte</h3>
        </div>

        <p className="text-[11px] text-zinc-500 font-serif italic leading-relaxed mb-2">
          Tu es sur le point de supprimer{' '}
          le compte de <strong className="text-zinc-300">{user?.pseudo || user?.name || user?.uid}</strong> et son profil.
        </p>
        <p className="text-xs text-zinc-400 mb-3">L’accès sera bloqué et le personnage retiré de l’annuaire. Ses AIP, influences, réponses, dépenses et progressions resteront conservées dans les archives accessibles aux conteurs. Le compte de connexion Firebase et son e-mail resteront présents, avec un marqueur de blocage dans l’application.</p>
        <p className="text-[10px] text-red-700 font-black uppercase tracking-widest mb-6">
          ⚠ Action irréversible.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#52525b',
            }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
            }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountManager({ currentUserId }) {
  const { showNotice, confirmAction } = useDialogs();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);

  // NEW: delete state
  const [deleting, setDeleting] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sortUsers = (arr) =>
    arr.sort((a, b) => {
      // Pending en premier
      if (a.role === 'pending' && b.role !== 'pending') return -1;
      if (b.role === 'pending' && a.role !== 'pending') return 1;
      return (a.pseudo || '').localeCompare(b.pseudo || '');
    });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        collection(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles')
      );
      const allUsers = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setUsers(sortUsers(allUsers));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const [aipsSnap, infSnap] = await Promise.all([
        getDocs(collection(db, 'artifacts', currentAppId, 'public', 'data', 'global_aips')),
        getDocs(collection(db, 'artifacts', currentAppId, 'public', 'data', 'global_influences')),
      ]);
      const uids = [
        ...new Set(
          [
            ...aipsSnap.docs.map((d) => d.data().userId),
            ...infSnap.docs.map((d) => d.data().userId),
          ].filter(Boolean)
        ),
      ];

      let count = 0;
      for (const uid of uids) {
        try {
          const profileSnap = await getDoc(
            doc(db, 'artifacts', currentAppId, 'users', uid, 'profile', 'info')
          );
          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.role === 'deleted') continue;
            await setDoc(
              doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', uid),
              {
                uid,
                pseudo: data.pseudo || '',
                name: data.name || '',
                clan: data.clan || '',
                sect: data.sect || '',
                role: data.role || 'player',
              },
              { merge: true }
            );
            count++;
          }
        } catch (e) {
          /* skip */
        }
      }
      await fetchUsers();
      await showNotice(`${count} compte${count > 1 ? 's' : ''} synchronisé${count > 1 ? 's' : ''}.`);
    } catch (e) {
      console.error(e);
      await showNotice('Erreur lors de la synchronisation.');
    }
    setSyncing(false);
  };

  const handleValidate = async (uid) => {
    setUpdating(uid);
    try {
      await changeAccess(uid, 'pending', 'player');
      setUsers(
        sortUsers(
          users.map((u) => (u.uid === uid ? { ...u, role: 'player' } : u))
        )
      );
    } catch (e) {
      console.error(e);
      await showNotice('Validation impossible. Actualise la liste et réessaie.');
    }
    setUpdating(null);
  };

  const changeAccess = (uid, expectedRole, role) => runTransaction(db, async tx => {
    const ref = doc(db, 'artifacts', currentAppId, 'users', uid, 'profile', 'info');
    const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().role !== expectedRole) throw new Error('La demande a déjà été traitée.');
    const patch = { role, accessReviewedAt: new Date().toISOString() };
    tx.update(ref, patch);
    tx.set(doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', uid), patch, { merge: true });
    tx.delete(doc(db, 'artifacts', currentAppId, 'public', 'data', 'directory', uid));
  });

  const handleRefuse = async u => {
    if (!await confirmAction({ title: 'Refuser la demande', message: `Refuser l’accès de ${u.pseudo || u.name || 'ce compte'} ? Le compte sera conservé uniquement dans la liste des refus.`, confirmLabel: 'Refuser' })) return;
    setUpdating(u.uid);
    try {
      await changeAccess(u.uid, 'pending', 'rejected');
      await fetchUsers();
    } catch (e) { console.error(e); await showNotice('Refus impossible. Actualise la liste et réessaie.'); }
    finally { setUpdating(null); }
  };

  const handleReexamine = async uid => {
    setUpdating(uid);
    try { await changeAccess(uid, 'rejected', 'pending'); await fetchUsers(); }
    catch (e) { console.error(e); await showNotice('Impossible de remettre la demande en attente.'); }
    finally { setUpdating(null); }
  };

  const handlePasswordReset = async u => {
    setUpdating(u.uid);
    try {
      const snapshot = await getDoc(doc(db, 'artifacts', currentAppId, 'users', u.uid, 'profile', 'info'));
      const email = snapshot.data()?.email;
      if (!email) { await showNotice('Ce profil ne contient pas d’adresse e-mail. La personne peut utiliser « Mot de passe oublié » sur l’écran de connexion.'); return; }
      if (!await confirmAction({ title: 'Réinitialiser le mot de passe', message: `Envoyer un lien de réinitialisation à ${email} ?`, confirmLabel: 'Envoyer le lien' })) return;
      auth.languageCode = 'fr';
      await sendPasswordResetEmail(auth, email);
      await showNotice('Lien de réinitialisation envoyé.');
    } catch (e) { console.error(e); await showNotice('Impossible d’envoyer le lien. Réessaie plus tard.'); }
    finally { setUpdating(null); }
  };

  const handleRoleChange = async (uid, newRole) => {
    if (uid === currentUserId) return;
    setUpdating(uid);
    try {
      await updateDoc(doc(db, 'artifacts', currentAppId, 'users', uid, 'profile', 'info'), {
        role: newRole,
      });
      await updateDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', uid), {
        role: newRole,
      });
      // Un conteur ou un admin n'est pas un personnage : on le retire de l'annuaire « Avec qui ».
      // (Repassé joueur, il s'y réinscrit à sa prochaine connexion.)
      if (newRole === 'storyteller' || newRole === 'admin') {
        await deleteDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'directory', uid)).catch(() => {});
      }
      setUsers(users.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
    } catch (e) {
      console.error(e);
    }
    setUpdating(null);
  };

  const handleDeleteAccount = async uid => {
    if (!uid || uid === currentUserId) return;
    setDeleting(uid);
    try {
      await deleteAccountData(uid);
      await fetchUsers();
      await showNotice('Profil supprimé et accès bloqué. Les dossiers de jeu sont conservés pour les conteurs. Le compte de connexion reste dans Firebase Authentication.');
    } catch (error) {
      console.error(error);
      await fetchUsers();
      await showNotice('Le nettoyage n’a pas pu se terminer. Actualise puis utilise « Terminer la suppression » pour reprendre.');
    } finally { setDeleting(null); }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const pendingUsers = users.filter((u) => u.role === 'pending');
  const rejectedUsers = users.filter((u) => u.role === 'rejected');
  const unfinishedDeletions = users.filter(u => u.role === 'deleted' && u.cleanupPending);
  const activeUsers = users.filter((u) => ['player', 'storyteller', 'admin'].includes(u.role || 'player'));

  const filtered = activeUsers.filter(
    (u) =>
      (u.pseudo || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.clan || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {showDeleteModal && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          onConfirm={() => {
            const uid = deleteTarget?.uid;
            setShowDeleteModal(false);
            setDeleteTarget(null);
            handleDeleteAccount(uid);
          }}
        />
      )}

      {/* Header */}
      <div className="border-b border-white/5 pb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-black text-zinc-100 italic">Gestion des Comptes</h1>
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] mt-2">
            {users.length} compte{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
            {pendingUsers.length > 0 && <span className="ml-3 text-amber-700">· {pendingUsers.length} en attente</span>}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-3 bg-amber-900/20 border border-amber-900/40 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-900/30 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sync...' : 'Synchroniser'}
        </button>
      </div>

      <InstanceSettings />
      {/* Comptes en attente */}
      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-amber-700" />
            <span className="text-[8px] font-black uppercase tracking-[0.35em] text-amber-800">
              En attente de validation — {pendingUsers.length}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(217,119,6,0.2)' }}>
            {pendingUsers.map((u, i) => (
              <div
                key={u.uid}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-all hover:bg-amber-900/5"
                style={{
                  background: 'rgba(217,119,6,0.04)',
                  borderBottom: i < pendingUsers.length - 1 ? '1px solid rgba(217,119,6,0.08)' : 'none',
                  borderLeft: '3px solid rgba(217,119,6,0.4)',
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}
                  >
                    <Clock size={14} className="text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-200 font-serif italic">{u.pseudo || '—'}</p>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-700 uppercase tracking-widest font-bold mt-0.5">
                      <span>{u.name || '—'}</span>
                      {u.clan && (
                        <>
                          <span className="text-zinc-800">·</span>
                          <span>{u.clan}</span>
                        </>
                      )}
                      {u.sect && (
                        <>
                          <span className="text-zinc-800">·</span>
                          <span>{u.sect}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                <button
                  type="button" disabled={updating === u.uid} onClick={() => handleRefuse(u)}
                  className="px-4 py-2 rounded-xl text-[10px] font-bold text-red-400 border border-red-900/40 disabled:opacity-40">Refuser</button>
                <button
                  disabled={updating === u.uid}
                  onClick={() => handleValidate(u.uid)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-40 flex-shrink-0"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#10b981',
                  }}
                >
                  {updating === u.uid ? '...' : (
                    <>
                      <Check size={11} /> Valider
                    </>
                  )}
                </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectedUsers.length > 0 && <details className="rounded-2xl border border-white/10 px-5 py-4">
        <summary className="cursor-pointer text-sm font-bold text-zinc-400">Demandes refusées ({rejectedUsers.length})</summary>
        <div className="mt-3 space-y-3">{rejectedUsers.map(u => <div key={u.uid} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
          <div><p className="text-sm text-zinc-300">{u.pseudo || '—'} · {u.name || '—'}</p>
            {u.accessReviewedAt && <p className="text-xs text-zinc-500">Refus du {new Date(u.accessReviewedAt).toLocaleDateString('fr-FR')}</p>}</div>
          <button type="button" disabled={updating === u.uid} onClick={() => handleReexamine(u.uid)} className="text-xs text-amber-500 disabled:opacity-40">Réexaminer</button>
        </div>)}</div>
      </details>}

      {unfinishedDeletions.length > 0 && <section className="rounded-2xl border border-red-900/40 p-4 space-y-3">
        <h2 className="text-sm font-bold text-red-300">Suppressions à terminer ({unfinishedDeletions.length})</h2>
        {unfinishedDeletions.map(u => <div key={u.uid} className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <span>Compte bloqué · {u.uid}</span>
          <button type="button" disabled={deleting === u.uid} onClick={() => { setDeleteTarget(u); setShowDeleteModal(true); }} className="text-red-300 disabled:opacity-40">Terminer la suppression</button>
        </div>)}
      </section>}

      {/* Séparateur si pending + actifs */}
      {pendingUsers.length > 0 && activeUsers.length > 0 && <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />}

      {/* Recherche */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={14} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl py-3 pl-9 text-sm text-white outline-none focus:border-red-900"
          placeholder="Chercher un joueur..."
        />
      </div>

      {/* Comptes actifs */}
      {loading ? (
        <div className="text-center py-20 text-zinc-700 font-serif italic animate-pulse">Chargement...</div>
      ) : filtered.length === 0 && pendingUsers.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-zinc-700 font-serif italic">Aucun compte trouvé.</p>
          <p className="text-zinc-800 text-[10px] uppercase tracking-widest font-black">
            Clique sur &quot;Synchroniser&quot; pour importer les comptes existants.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((u) => {
            const role = u.role || 'player';
            const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.player;
            const Icon = cfg.icon;
            const isSelf = u.uid === currentUserId;

            return (
              <div
                key={u.uid}
                className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-6 transition-all"
                style={{ borderLeft: `3px solid ${cfg.color}40` }}
              >
                <div className="flex items-center gap-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-zinc-100 font-serif italic">{u.pseudo || '—'}</span>
                      {isSelf && (
                        <span
                          className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                          style={{
                            background: 'rgba(217,119,6,0.1)',
                            color: '#d97706',
                            border: '1px solid rgba(217,119,6,0.2)',
                          }}
                        >
                          Vous
                        </span>
                      )}
                    </div>
                    {!['storyteller', 'admin'].includes(u.role) && (
                    <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                      <span>{u.name || '—'}</span>
                      {u.clan && (
                        <>
                          <span className="text-zinc-800">·</span>
                          <span>{u.clan}</span>
                        </>
                      )}
                      {u.sect && (
                        <>
                          <span className="text-zinc-800">·</span>
                          <span>{u.sect}</span>
                        </>
                      )}
                    </div>
                    )}
                    {(u.role || 'player') === 'player' && (
                      <AccountCharacters uid={u.uid} onChanged={(uid, next) => setUsers(list => list.map(x => (x.uid === uid ? { ...x, name: next.name, clan: next.clan, sect: next.sect } : x)))} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" disabled={updating === u.uid} onClick={() => handlePasswordReset(u)} className="text-[10px] text-zinc-400 hover:text-zinc-200 disabled:opacity-40">Réinitialiser le mot de passe</button>
                  <div
                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                  >
                    {cfg.label}
                  </div>

                  {!isSelf && (
                    <div className="flex gap-2 items-center">
                      {['player', 'storyteller']
                        .filter((r) => r !== role)
                        .map((r) => {
                          const c = ROLE_CONFIG[r];
                          return (
                            <button
                              key={r}
                              disabled={updating === u.uid || deleting === u.uid}
                              onClick={() => handleRoleChange(u.uid, r)}
                              className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-30"
                              style={{
                                background: 'transparent',
                                color: '#52525b',
                                border: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              {updating === u.uid ? '...' : `→ ${c.label}`}
                            </button>
                          );
                        })}

                      <button
                        disabled={updating === u.uid || deleting === u.uid}
                        onClick={() => {
                          setDeleteTarget(u);
                          setShowDeleteModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-30"
                        style={{
                          background: 'rgba(239,68,68,0.08)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.2)',
                        }}
                        title="Supprimer le compte"
                      >
                        {deleting === u.uid ? '...' : (
                          <span className="inline-flex items-center gap-1.5">
                            <Trash2 size={12} /> Suppr.
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
