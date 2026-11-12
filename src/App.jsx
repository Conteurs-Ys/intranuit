import React, { Suspense, lazy, useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where, runTransaction } from 'firebase/firestore';
import {
  Moon, User, Send, Shield, CheckCircle, Clock, ChevronRight,
  BookOpen, Lock, History, LogOut, LayoutDashboard, Sparkles,
  Fingerprint, Users, Feather, Eye, Newspaper, Download, AlertTriangle, Archive
} from 'lucide-react';

import { auth, db, currentAppId, logout } from './lib/firebase';
import { instanceSubtitle } from './lib/instance';
import { InstanceProvider, useInstance } from './context/InstanceContext';
import { directoryCollection, upsertOwnCharacter } from './lib/directory';
import { sheetOf } from './utils/sheet';
import { isCycleOpen } from './utils/cycle';
import { dossierState } from './utils/dossierState';
import { activeCharacterId, belongsTo, startNewCharacter, syncActive } from './utils/characters';


// « Octobre 2026 » → « Oct. 2026 » pour les petits écrans.
const shortCycle = (label = '') => {
  const [month, year] = label.split(' ');
  if (!year) return label;
  return `${month.length > 4 ? `${month.slice(0, 3)}.` : month} ${year}`;
};

import AuthGate from './components/auth/AuthGate';
import NavTab from './components/ui/NavTab';
import DossierDetail from './components/dashboard/DossierDetail';
import PlayerDashboard from './components/dashboard/PlayerDashboard';
import Archives from './components/dashboard/Archives';
import LearningRequests from './components/dashboard/LearningRequests';
import AIPForm from './components/forms/AIPForm';
import InfluenceForm from './components/forms/InfluenceForm';
import ProfileEditor from './components/forms/ProfileEditor';
const StorytellerControlPanel = lazy(() => import('./components/admin/StorytellerControlPanel'));
const AccountManager = lazy(() => import('./components/admin/AccountManager'));
// Le module vitrine ne fait pas partie de cette distribution.
import PFCWidget from './components/ui/PFCWIdget';
import PendingScreen from './components/auth/PendingScreen';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DialogProvider } from './context/DialogContext';
import useExport from './hooks/useExport';
import InstallApp from './components/ui/InstallApp';

const MONTHS_ORDER = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ── Contenu principal — lit le thème pour adapter le fond ──────────────────
function AppContent() {
  const identity = useInstance();
  const { theme } = useTheme();
  const isLight = theme.name === 'light';
  const { exportAIPByMonth, exportInfluencesByMonth } = useExport();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState('player');
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');

  const [globalAIPs, setGlobalAIPs] = useState([]);
  const [globalInfluences, setGlobalInfluences] = useState([]);
  const [antagonists, setAntagonists] = useState([]);
  const [learnings, setLearnings] = useState([]);
  const [learningRequests, setLearningRequests] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [cycle, setCycle] = useState(() => {
    const now = new Date();
    const month = MONTHS_ORDER[now.getMonth()];
    const year = now.getFullYear();
    return { label: `${month} ${year}`, year, month };
  });

  const [selectedArchive, setSelectedArchive] = useState(null);
  const [selectedInfluence, setSelectedInfluence] = useState(null);
  const [modalDefaultView, setModalDefaultView] = useState('aip');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const isStaff = role === 'storyteller' || role === 'admin';

  // Petit message de confirmation (ou d'erreur) en bas de l'écran.
  const notify = (message, tone = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const go = (next) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchProfile(u.uid);
      else { setCharacter(null); setLoading(false); }
    });
    return () => unsub();
  }, []);

  const fetchProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'artifacts', currentAppId, 'users', uid, 'profile', 'info'));
      if (snap.exists()) {
        const data = snap.data();
        const r = data.role || 'player';
        setRole(r);
        setCharacter(data);
        if (!['rejected', 'deleted'].includes(r)) await setDoc(
          doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', uid),
          { uid, activeCharacterId: activeCharacterId(data), pseudo: data.pseudo || '', name: data.name || '', clan: data.clan || '', sect: data.sect || '', role: data.role || 'player' },
          { merge: true }
        );
        if (r === 'player') upsertOwnCharacter(uid, data).catch(e => console.error(e));
        if (r === 'storyteller' || r === 'admin') setView('st_console');
        else setView('dashboard');
      } else {
        // Profil absent (compte supprimé par un admin, inscription interrompue) :
        // on repasse par une demande d'accès plutôt que d'afficher un tableau vide.
        // merge : ne jamais écraser le profil que l'inscription écrit peut-être en parallèle.
        const pending = { uid, email: auth.currentUser?.email || '', role: 'pending' };
        await setDoc(doc(db, 'artifacts', currentAppId, 'users', uid, 'profile', 'info'), pending, { merge: true });
        await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', uid), { uid, role: 'pending' }, { merge: true });
        setRole('pending');
        setCharacter(pending);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Compte en attente : l'écran s'ouvre tout seul dès qu'un admin le valide.
  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'artifacts', currentAppId, 'users', user.uid, 'profile', 'info'), (d) => {
      if (d.exists() && (d.data().role || 'pending') !== role) fetchProfile(user.uid);
    }, (e) => console.error(e));
  }, [user, role]);

  useEffect(() => {
    if (!user || !character || !['player', 'storyteller', 'admin'].includes(role)) return;
    const dataCol = (name) => collection(db, 'artifacts', currentAppId, 'public', 'data', name);
    const toList = (setter) => (s) => setter(s.docs.map(d => ({ id: d.id, ...d.data() })));
    const onError = (e) => console.error(e);

    const unsubCycle = onSnapshot(doc(db, 'artifacts', currentAppId, 'public', 'data', 'game_state', 'cycle'), (d) => {
      if (d.exists()) setCycle(d.data());
      else if (isStaff) {
        const now = new Date();
        const month = MONTHS_ORDER[now.getMonth()];
        const year = now.getFullYear();
        setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'game_state', 'cycle'), { label: `${month} ${year}`, year, month });
      }
    }, onError);

    // Les règles Firestore n'autorisent un joueur à lire que ses propres dossiers :
    // la requête doit donc être filtrée sur son uid.
    const mine = (name) => isStaff ? dataCol(name) : query(dataCol(name), where('userId', '==', user.uid));
    const unsubs = [
      unsubCycle,
      onSnapshot(mine('learning_requests'), toList(setLearningRequests), onError),
      onSnapshot(mine('global_aips'), toList(setGlobalAIPs), onError),
      onSnapshot(mine('global_influences'), toList(setGlobalInfluences), onError),
      onSnapshot(directoryCollection(), toList(setDirectory), onError),
    ];
    if (isStaff) {
      unsubs.push(
        onSnapshot(dataCol('learnings'), toList(setLearnings), onError),
        onSnapshot(dataCol('antagonists'), toList(setAntagonists), onError),
      );
    }
    return () => unsubs.forEach(u => u());
  }, [user, character, role]);

  // Tous les dossiers du compte (archives des anciens personnages comprises), puis ceux du personnage actif.
  const allMyAIPs = useMemo(() => globalAIPs.filter(a => a.userId === user?.uid), [globalAIPs, user]);
  const allMyInfluences = useMemo(() => globalInfluences.filter(i => i.userId === user?.uid), [globalInfluences, user]);
  const activeId = activeCharacterId(character);
  const myAIPs = useMemo(() => allMyAIPs.filter(a => belongsTo(a, activeId, character)), [allMyAIPs, activeId, character]);
  const myInfluences = useMemo(() => allMyInfluences.filter(i => belongsTo(i, activeId, character)), [allMyInfluences, activeId, character]);
  const currentMonthEntry = useMemo(() => myAIPs.find(a => a.monthLabel === cycle.label), [myAIPs, cycle]);
  const currentMonthInfluence = useMemo(() => myInfluences.find(i => i.monthLabel === cycle.label), [myInfluences, cycle]);
  const formEntry = view === 'form' ? currentMonthEntry : view === 'influence_form' ? currentMonthInfluence : null;
  const formReadOnly = Boolean(formEntry && !dossierState(formEntry).editable);

  // Enregistre le dossier du cycle (AIP ou influences) et confirme au joueur.
  const saveDossier = async (collectionName, existing, data, label) => {
    if (!user || !character) return;
    const id = existing?.id || doc(collection(db, 'temp')).id;
    try {
      const ref = doc(db, 'artifacts', currentAppId, 'public', 'data', collectionName, id);
      const write = (latest) => ({
        ...data, id, userId: user.uid,
        ...(latest?.expenseReviews ? { expenseReviews: latest.expenseReviews } : {}),
        ...(latest?.learningReviews ? { learningReviews: latest.learningReviews } : {}),
        ...(latest?.feedingReview ? { feedingReview: latest.feedingReview } : {}),
        ...(latest?.obstructionLinks ? { obstructionLinks: latest.obstructionLinks } : {}),
        characterId: activeId, characterName: character.name, clan: character.clan, sect: character.sect,
        monthLabel: cycle.label, year: cycle.year, month: cycle.month,
        status: latest?.status || 'submitted',
        createdAt: latest?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      if (!existing) await setDoc(ref, write(null));
      else await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const latest = snapshot.exists() ? snapshot.data() : existing;
        transaction.set(ref, write(latest));
      });
      notify(existing ? `${label} mises à jour` : `${label} consignées`);
      go('dashboard');
    } catch (e) {
      console.error(e);
      notify("L'enregistrement a échoué. Réessaie dans un instant.", 'error');
    }
  };

  const submitAIP = (aipData) => saveDossier('global_aips', currentMonthEntry, aipData, 'AIP');
  const submitInfluence = (influenceData) => saveDossier('global_influences', currentMonthInfluence, influenceData, 'Influences');

  const handleUpdateProfile = (profileData) => saveProfile(syncActive({ ...character, ...profileData }), 'Profil enregistré');

  // Nouveau personnage : l'actuel devient « retiré » ou « mort », le nouveau devient actif.
  const handleNewCharacter = (fields, endStatus) => saveProfile(startNewCharacter(character, fields, endStatus), `${fields.name} est ton personnage actif`);

  const saveProfile = async (updated, message) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', currentAppId, 'users', user.uid, 'profile', 'info'), updated);
      await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', user.uid), {
        uid: user.uid, activeCharacterId: activeCharacterId(updated), pseudo: updated.pseudo, name: updated.name, clan: updated.clan, sect: updated.sect, role: updated.role || 'player',
      });
      if (role === 'player') await upsertOwnCharacter(user.uid, updated);
      setCharacter(updated);
      notify(message);
      go(isStaff ? 'st_console' : 'dashboard');
    } catch (e) {
      console.error(e);
      notify("Le profil n'a pas pu être enregistré.", 'error');
    }
  };

  const openModal = (aip, influence, defaultView) => {
    setSelectedArchive(aip || null);
    setSelectedInfluence(influence || null);
    setModalDefaultView(defaultView);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6">
        <Moon size={36} className="text-red-400/80 animate-pulse" style={{ filter: 'drop-shadow(0 0 20px rgba(139,38,53,0.6))' }} />
        <span className="text-[11px] font-bold tracking-[0.25em] text-red-400/80 uppercase">Ouverture du Registre</span>
      </div>
    </div>
  );

  if (!user) return <AuthGate />;
  if (['pending', 'rejected', 'deleted'].includes(role)) return <PendingScreen user={user} rejected={role === 'rejected'} deleted={role === 'deleted'} />;

  // Fond global selon thème — sombre pour joueurs, adaptatif pour staff
  const appBg = isLight && isStaff
    ? theme.bg
    : 'radial-gradient(ellipse 70% 45% at 50% 0, rgba(139,38,53,0.30), transparent 75%), var(--night-bg)';

  const navBg = isLight && isStaff
    ? 'rgba(244,241,236,0.92)'
    : 'rgba(18,14,16,0.85)';

  const navBorder = isLight && isStaff
    ? 'rgba(18,14,16,0.08)'
    : 'rgba(255,255,255,0.04)';

  return (
    <div data-interface-theme={isLight && isStaff ? 'light' : 'dark'} className={`min-h-screen font-sans ${role === 'player' ? 'pb-28 md:pb-16' : 'pb-16'} text-left transition-colors duration-300`}
      style={{
        background: appBg,
        color: isLight && isStaff ? theme.textPrimary : '#a1a1aa',
      }}>

      {/* ── BARRE DU HAUT : logo, onglets, cycle, déconnexion (une seule ligne) ── */}
      <nav className="sticky top-0 z-50 transition-colors duration-300"
        style={{ background: navBg, backdropFilter: 'blur(18px)', borderBottom: `1px solid ${navBorder}` }}>
        <div className={`${view === 'st_console' ? 'max-w-[98%]' : 'max-w-6xl'} mx-auto px-3 sm:px-5 h-[60px] flex items-center gap-2 sm:gap-6`}>
          <button className="flex items-center gap-3 group text-left shrink-0" onClick={() => go(isStaff ? 'st_console' : 'dashboard')}>
            <span className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <span className="absolute inset-0.5 rotate-45 rounded-md transition-transform duration-500 group-hover:rotate-[135deg]"
                style={{ border: '1px solid rgba(229,72,79,0.55)', background: 'rgba(142,28,36,0.22)', boxShadow: '0 0 16px rgba(229,72,79,0.22)' }} />
              <Moon size={14} className="relative" style={{ color: '#f58b90' }} />
            </span>
            <span className="leading-none">
              <span className="block font-serif italic font-bold text-[19px] tracking-tight whitespace-nowrap"
                style={{ color: isLight && isStaff ? theme.textPrimary : '#ece4e0' }}>
                Intranuit
                {identity.city && <span className="hidden sm:inline not-italic font-sans text-[9.5px] font-bold uppercase tracking-[0.2em] ml-2 px-1.5 py-0.5 rounded align-middle" style={{ color: '#f58b90', background: 'rgba(229,72,79,0.12)' }}>{identity.city}</span>}
              </span>
              <span className="hidden xl:block whitespace-nowrap text-[9px] uppercase tracking-[0.22em] font-bold mt-1"
                style={{ color: isLight && isStaff ? theme.textDim : '#8f8485' }}>
                {instanceSubtitle(identity)}
              </span>
            </span>
          </button>

          {/* Onglets : joueurs sur téléphone → barre du bas */}
          <div className={`${isStaff ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 self-stretch items-stretch justify-center-safe gap-4 lg:gap-9 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain`} style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(229,72,79,.45) transparent' }}>
            {role === 'player' && (
              <>
                <NavTab active={view === 'dashboard'} onClick={() => go('dashboard')} icon={<LayoutDashboard size={15}/>} label="Tableau" />
                <NavTab active={view === 'form'} onClick={() => go('form')} icon={<Feather size={15}/>} label="Mes AIP" />
                <NavTab active={view === 'influence_form'} onClick={() => go('influence_form')} icon={<Eye size={15}/>} label="Influences" />
                <NavTab active={view === 'archives'} onClick={() => go('archives')} icon={<Archive size={15}/>} label="Archives" />
              </>
            )}
            {isStaff && <NavTab light={isLight} active={view === 'st_console'} onClick={() => go('st_console')} icon={<Shield size={15}/>} label="Régence" />}
            {role === 'admin' && <NavTab light={isLight} active={view === 'accounts'} onClick={() => go('accounts')} icon={<Users size={15}/>} label="Comptes" />}

            <NavTab light={isLight && isStaff} active={view === 'profile'} onClick={() => go('profile')} icon={<User size={15}/>} label="Profil" />
          </div>
          {!isStaff && <div className="flex-1 md:hidden" />}

          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-2 h-8 px-2.5 sm:px-3 rounded-full whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ background: 'rgba(229,72,79,0.1)', border: '1px solid rgba(229,72,79,0.28)', color: isLight && isStaff ? '#7f1d1d' : '#f7c4c6' }}>
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 8px #ef4444' }} />
              </span>
              <span className="sm:hidden">{shortCycle(cycle?.label)}</span>
              <span className="hidden sm:inline">{cycle?.label}</span>
            </span>
            <button onClick={logout} aria-label="Se déconnecter" title="Se déconnecter"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:text-red-400 hover:border-red-500/40"
              style={{ color: isLight && isStaff ? theme.textMuted : '#b5aaa8', border: `1px solid ${navBorder}` }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main key={view} className={`view-in ${view === 'st_console' ? 'max-w-[98%]' : 'max-w-6xl'} mx-auto px-5 py-10`}>

        {view === 'dashboard' && role === 'player' && (
          <><InstallApp /><PlayerDashboard
            character={character} cycle={cycle}
            currentAIP={currentMonthEntry} currentInfluence={currentMonthInfluence}
            myAIPs={myAIPs} myInfluences={myInfluences}
            onEditAIP={() => go('form')} onEditInfluence={() => go('influence_form')}
            onOpenDetail={openModal}
            onOpenArchives={() => go('archives')}
            onOpenRequests={() => go('requests')}
            onExportAIP={() => exportAIPByMonth(myAIPs, character?.name || character?.pseudo || 'joueur')}
            onExportInfluences={() => exportInfluencesByMonth(myInfluences, character?.name || character?.pseudo || 'joueur')}
          /></>
        )}

        {view === 'requests' && role === 'player' && <LearningRequests requests={learningRequests.filter(r => belongsTo(r, activeId, character))} aips={myAIPs} character={character} cycle={cycle} directory={directory} onEditAIP={() => go('form')} />}

        {view === 'archives' && role === 'player' && (
          <Archives myAIPs={allMyAIPs} myInfluences={allMyInfluences} profile={character} onOpenDetail={openModal} />
        )}

        {/* Cycle en pause : aucun dépôt (les règles Firestore le refusent aussi). */}
        {(view === 'form' || view === 'influence_form') && role === 'player' && !isCycleOpen(cycle) && (
          <p className="max-w-xl mx-auto mt-10 px-5 py-4 rounded-xl text-center text-[15px] font-serif italic"
            style={{ background: 'rgba(255,240,235,0.04)', border: '1px solid var(--night-line-strong)', color: 'var(--night-muted)' }}>
            Pas d’actions ce cycle : les conteurs ont mis les inter-parties en pause.
          </p>
        )}

        {formReadOnly && role === 'player' && isCycleOpen(cycle) && <section className="max-w-xl mx-auto rounded-2xl px-5 py-5 space-y-4" style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
          <p style={{ color: 'var(--night-text)' }}>Ce dossier est {formEntry.status === 'completed' ? 'diffusé' : 'verrouillé par les conteurs'} et ne peut plus être modifié.</p>
          <button type="button" onClick={() => openModal(currentMonthEntry, currentMonthInfluence, view === 'form' ? 'aip' : 'influence')} className="rounded-lg border px-4 py-2 text-sm" style={{ color: 'var(--night-text)', borderColor: 'var(--night-line-strong)' }}>Consulter le dossier</button>
        </section>}

        {view === 'form' && role === 'player' && isCycleOpen(cycle) && !formReadOnly && (
          <AIPForm initialData={currentMonthEntry} cycle={cycle} directory={directory.filter(d => d.id !== user?.uid)} sheet={sheetOf(character)} clan={character?.clan} onSubmit={submitAIP} onCancel={() => go('dashboard')} />
        )}

        {view === 'influence_form' && role === 'player' && isCycleOpen(cycle) && !formReadOnly && (
          <InfluenceForm initialData={currentMonthInfluence} cycle={cycle} character={character} directory={directory.filter(d => d.id !== user?.uid)} onSubmit={submitInfluence} onCancel={() => go('dashboard')} />
        )}

        <Suspense fallback={<p role="status" className="py-10 text-center text-sm">Chargement…</p>}>
        {view === 'st_console' && isStaff && (
          <StorytellerControlPanel
            viewer={{ id: user?.uid, pseudo: character?.pseudo }}
            aips={globalAIPs}
            antagonists={antagonists}
            influences={globalInfluences}
            learnings={learnings}
            learningRequests={learningRequests}
            cycle={cycle}
            appId={currentAppId}
          />
        )}

        {view === 'accounts' && role === 'admin' && (
          <AccountManager currentUserId={user?.uid} />
        )}


        </Suspense>

        {view === 'profile' && (
          <ProfileEditor data={character} isStaff={isStaff} onSave={handleUpdateProfile} onNewCharacter={handleNewCharacter} onCancel={() => go(isStaff ? 'st_console' : 'dashboard')} />
        )}
      </main>

      {(selectedArchive || selectedInfluence) && (
        <DossierDetail
          aip={selectedArchive}
          influence={selectedInfluence}
          defaultView={modalDefaultView}
          onClose={() => { setSelectedArchive(null); setSelectedInfluence(null); }}
        />
      )}

      {/* ── Barre du bas : joueurs sur téléphone ── */}
      {role === 'player' && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex px-2"
          style={{ background: 'rgba(18,14,16,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { id: 'dashboard', label: 'Tableau', icon: LayoutDashboard, pending: false },
            { id: 'form', label: 'AIP', icon: Feather, pending: !currentMonthEntry },
            { id: 'influence_form', label: 'Influences', icon: Eye, pending: !currentMonthInfluence },
            { id: 'archives', label: 'Archives', icon: Archive, pending: false },
            { id: 'profile', label: 'Profil', icon: User, pending: false },
          ].map(({ id, label, icon: Icon, pending }) => {
            const active = view === id;
            return (
              <button key={id} onClick={() => go(id)}
                className="relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 h-16 transition-colors"
                style={{ color: active ? '#ef4444' : '#8b8b94' }}>
                <span className="flex items-center justify-center w-12 h-7 rounded-full transition-all duration-300"
                  style={{ background: active ? 'rgba(139,38,53,0.22)' : 'transparent', boxShadow: active ? '0 0 14px rgba(139,38,53,0.25)' : 'none' }}>
                  <Icon size={18} />
                </span>
                <span className="max-w-full truncate px-0.5 text-[9.5px] min-[380px]:text-[10px] font-bold uppercase tracking-[0.04em]">{label}</span>
                {pending && <span className="absolute top-2.5 right-[calc(50%-1.3rem)] w-2 h-2 rounded-full bg-red-600" style={{ boxShadow: '0 0 6px #dc2626' }} />}
              </button>
            );
          })}
        </nav>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-20 md:bottom-6 z-[120] flex justify-center px-4 pointer-events-none">
          <div key={toast.id} role="status"
            className="toast-in flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-bold"
            style={{
              background: 'rgba(18,14,16,0.96)',
              border: `1px solid ${toast.tone === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.3)'}`,
              color: toast.tone === 'error' ? '#ecbcc6' : '#ece4e0',
              boxShadow: `0 10px 40px rgba(18,14,16,0.6), 0 0 24px ${toast.tone === 'error' ? 'rgba(139,38,53,0.2)' : 'rgba(16,185,129,0.12)'}`,
            }}>
            {toast.tone === 'error'
              ? <AlertTriangle size={16} className="text-red-500" />
              : <CheckCircle size={16} className="text-emerald-500" />}
            {toast.message}
          </div>
        </div>
      )}
      <PFCWidget />
    </div>
  );
}

// Export wrappé dans ThemeProvider global
export default function App() {
  return (
    <ThemeProvider>
      <InstanceProvider><DialogProvider><AppContent /></DialogProvider></InstanceProvider>
    </ThemeProvider>
  );
}
