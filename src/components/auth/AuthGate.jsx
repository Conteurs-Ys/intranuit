import { useState, useMemo } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Moon, Mail, Key, User, IdCard } from 'lucide-react';
import { auth, db, currentAppId } from '../../lib/firebase';
import { instanceSubtitle } from '../../lib/instance';
import { useInstance } from '../../context/InstanceContext';
import AuthField from '../ui/AuthField';
import SelectInput from '../ui/SelectInput';
import { CLANS, SECTES } from '../../constants';

const CITATIONS = [
  { texte: "Je suis une Bête, de peur de le devenir.", source: "The Riddle", clan: null },
  { texte: "Tu ne révéleras pas ta vraie nature à ceux qui ne sont pas du Sang.", source: "Les Traditions", clan: null },
  { texte: "Ton domaine est ton affaire.", source: "Les Traditions", clan: null },
  { texte: "Sans parole d'acceptation, tu n'es rien.", source: "Les Traditions", clan: null },
  { texte: "Il t'est interdit de détruire un autre des tiens.", source: "Les Traditions", clan: null },
  { texte: "De la cendre de notre grande guerre, que cette paix règne à jamais.", source: "Code de Milan", clan: null },
  { texte: "Le bien de la secte avant les besoins personnels.", source: "Code de Milan", clan: null },
  { texte: "Œil pour œil : la Lex Talionis guide la justice immortelle.", source: "Code de Milan", clan: null },
  { texte: "La Monomacie tranchera les conflits.", source: "Code de Milan", clan: null },
  { texte: "Je désire aussi. Que peut-on faire ?", source: "Livre de Nod", clan: null },
  { texte: "…et reviens demain : je te dirai la sagesse de la Lune.", source: "La Crone — Livre de Nod", clan: null },
  { texte: "Même aujourd'hui, une voie de Miséricorde existe : Golconda.", source: "Livre de Nod", clan: null },
  { texte: "Que l'honneur soit ton bouclier, ton épée et ton manteau.", source: "Caïn — Livre de Nod", clan: null },
  { texte: "Pour te défaire d'un ennemi… survis-lui.", source: "Caïn — Livre de Nod", clan: null },
  { texte: "La vengeance est meilleure quand le sang est encore chaud.", source: "Caïn — Livre de Nod", clan: null },
  { texte: "Monte la Bête — ne la laisse pas te monter.", source: "Auctoritas Ritae", clan: null },
  { texte: "Ne marchande pas avec les Ténèbres : avec le temps, elles nous prendront tous.", source: "Auctoritas Ritae", clan: null },
  { texte: "Les Fondateurs se lèveront… et nous consumeront tout entiers.", source: "Auctoritas Ritae", clan: null },
  { texte: "Écoute leurs paroles : elles portent la sagesse.", source: "Caïn Législateur — Livre de Nod", clan: null },
  { texte: "N'écoute pas leurs chants : cette voie mène à l'oubli.", source: "Caïn Législateur — Livre de Nod", clan: null },
  { texte: "Tu ne tueras pas ton Sire, ni ne boiras le sang de son cœur.", source: "Commandements de Caïn", clan: null },
  { texte: "Tiens le plus ancien pour Seigneur.", source: "Commandements de Caïn", clan: null },
  { texte: "Honore le Domaine de chacun.", source: "Commandements de Caïn", clan: null },
  { texte: "Enseigne à ta progéniture les voies des Kindred.", source: "Commandements de Caïn", clan: null },
  { texte: "À tes Frères et Sœurs, donne toujours l'hospitalité.", source: "Commandements de Caïn", clan: null },
  { texte: "Rejette les chaînes des Anciens dans ton esprit.", source: "Livre de Nod", clan: "Brujah" },
  { texte: "Connais qui tu es, d'abord — et sois fidèle à toi-même.", source: "Livre de Nod", clan: "Brujah" },
  { texte: "Marche la tête haute.", source: "Livre de Nod", clan: "Gangrel" },
  { texte: "N'accepte jamais la faiblesse.", source: "Livre de Nod", clan: "Gangrel" },
  { texte: "Marque ton territoire de chasse, pour que les tiens n'empiètent pas.", source: "Livre de Nod", clan: "Gangrel" },
  { texte: "Cherche l'endroit le plus sombre.", source: "Livre de Nod", clan: "Nosferatu" },
  { texte: "Nourris-toi des âmes laides.", source: "Livre de Nod", clan: "Nosferatu" },
  { texte: "Dans le silence, tu connaîtras la beauté.", source: "Livre de Nod", clan: "Toreador" },
  { texte: "Regarde et écoute… écoute et regarde.", source: "Livre de Nod", clan: "Toreador" },
  { texte: "Nous régnons, non par la force, mais par le droit.", source: "Livre de Nod", clan: "Ventrue" },
  { texte: "Garde toujours des épées solides près de toi, et des yeux aiguisés dans ton dos.", source: "Livre de Nod", clan: "Ventrue" },
  { texte: "Ne recule pas devant le Soleil.", source: "Livre de Nod", clan: "Ventrue" },
  { texte: "Nous sommes les Seigneurs de la Terre.", source: "Livre de Nod", clan: "Ventrue" },
  { texte: "L'esprit de liberté est le principe fondamental de la Secte.", source: "Code de Milan", clan: null },
  { texte: "Agis contre ceux qui abusent du pouvoir pour leur gain personnel.", source: "Code de Milan", clan: null },
  { texte: "Ne laisse ni prêtre, ni poète, ni paysan te voir te nourrir.", source: "Caïn — Livre de Nod", clan: null },
  { texte: "Honore le domaine d'autrui.", source: "Les Traditions", clan: null },
  { texte: "Leurs fautes sont à toi de les endurer.", source: "Les Traditions", clan: null },
  { texte: "Protège toujours ceux-qui-servent.", source: "Commandements de Caïn", clan: null },
  { texte: "Bois mon sang cette nuit, Caïn, Père des Kindred.", source: "La Crone — Livre de Nod", clan: null },
];

export default function AuthGate() {
  const identity = useInstance();
  const [isRegister, setIsRegister] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm]             = useState({
    email: '', password: '', pseudo: '', charName: '',
    clan: CLANS[0], sect: SECTES[0]
  });

  // Citation aléatoire fixée au mount (ne change pas au re-render)
  const citation = useMemo(() => CITATIONS[Math.floor(Math.random() * CITATIONS.length)], []);

  const handleAction = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setNotice('');
    try {
      if (isReset) {
        auth.languageCode = 'fr';
        try { await sendPasswordResetEmail(auth, form.email.trim()); }
        catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
        setNotice('Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé. Vérifie aussi tes courriers indésirables.');
      } else if (isRegister) {
        if (!form.pseudo || !form.charName) throw new Error("Profil incomplet.");
        const uc = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await setDoc(doc(db, 'artifacts', currentAppId, 'users', uc.user.uid, 'profile', 'info'), {
          uid: uc.user.uid, email: form.email, pseudo: form.pseudo, name: form.charName,
          clan: form.clan, sect: form.sect,
          role: 'pending',
          createdAt: new Date().toISOString()
        }, { merge: true });
        // Annuaire lu par les admins pour valider les comptes en attente.
        await setDoc(doc(db, 'artifacts', currentAppId, 'public', 'data', 'user_profiles', uc.user.uid), {
          uid: uc.user.uid, pseudo: form.pseudo, name: form.charName,
          clan: form.clan, sect: form.sect, role: 'pending',
        }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      }
    } catch (err) { setError(isReset ? 'Envoi impossible. Vérifie l’adresse e-mail ou réessaie plus tard.' : "Accès refusé — " + (err.code || err.message)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0b0809' }}>

      {/* ── Panneau gauche ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-14"
        style={{
          background: 'linear-gradient(150deg, #0d0303 0%, #020202 60%, #04000a 100%)',
          borderRight: '1px solid rgba(255,255,255,0.025)',
        }}>

        {/* Lueurs d'ambiance */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #991b1b, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #4c1d95, transparent 70%)' }} />
        </div>

        {/* Lignes décoratives */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-16 w-px h-full opacity-[0.06]"
            style={{ background: 'linear-gradient(to bottom, transparent, #991b1b, transparent)' }} />
          <div className="absolute top-0 right-24 w-px h-full opacity-[0.04]"
            style={{ background: 'linear-gradient(to bottom, transparent, #ffffff, transparent)' }} />
          <div className="absolute left-0 top-32 w-full h-px opacity-[0.04]"
            style={{ background: 'linear-gradient(to right, transparent, #991b1b, transparent)' }} />
          <div className="absolute left-0 bottom-40 w-full h-px opacity-[0.03]"
            style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }} />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b0a0a, #1a0505)', border: '1px solid rgba(139,38,53,0.3)', boxShadow: '0 0 15px rgba(139,38,53,0.2)' }}>
            <Moon size={15} className="text-red-700" />
          </div>
          <div>
            <div className="font-serif text-sm font-bold text-zinc-300 italic">Intranuit</div>
            <div className="text-[10px] text-zinc-200 uppercase tracking-[0.22em] font-bold">{instanceSubtitle(identity)}</div>
          </div>
        </div>

        {/* Citation aléatoire */}
        <div className="relative">
          <div className="w-8 h-px mb-8" style={{ background: 'rgba(139,38,53,0.5)' }} />

          {/* Guillemet décoratif */}
          <div className="font-serif text-red-400/80 leading-none mb-3 select-none"
            style={{ fontSize: '5rem', lineHeight: 1, fontWeight: 900 }}>
            "
          </div>

          <p className="font-serif italic leading-relaxed text-zinc-200"
            style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.4, textShadow: '0 0 40px rgba(139,38,53,0.15)' }}>
            {citation.texte}
          </p>

          <div className="mt-6 space-y-0.5">
            <div className="w-6 h-px" style={{ background: 'rgba(139,38,53,0.4)' }} />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-200 pt-2">
              {citation.source}
            </p>
            {citation.clan && (
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: 'rgba(139,38,53,0.6)' }}>
                Clan {citation.clan}
              </p>
            )}
          </div>
        </div>

        {/* Pied */}
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-200">
            Registre des Actions
          </div>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #991b1b, transparent 70%)' }} />
        </div>

        <div className="relative w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b0a0a, #1a0505)', border: '1px solid rgba(139,38,53,0.3)' }}>
              <Moon size={15} className="text-red-700" />
            </div>
            <span className="font-serif text-lg font-bold text-zinc-200 italic">Intranuit{identity.city && <span className="text-red-400"> · {identity.city}</span>}</span>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-[#ece4e0] italic leading-none"
              style={{ textShadow: '0 0 30px rgba(139,38,53,0.12)' }}>
              {isReset ? 'Réinitialiser le mot de passe' : isRegister ? "Rejoindre le Cercle" : "Ouvrir les Archives"}
            </h1>
          </div>

          <form onSubmit={handleAction} className="space-y-4">
            <AuthField label="Adresse e-mail" icon={<Mail size={13}/>} type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
            {!isReset && <AuthField label="Mot de passe" icon={<Key size={13}/>} type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} />}

            {isRegister && (
              <div className="space-y-4 pt-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="h-px" style={{ background: 'linear-gradient(to right, rgba(139,38,53,0.2), transparent)' }} />
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-200 pt-1">Identité vampirique</div>
                <div className="grid grid-cols-2 gap-3">
                  <AuthField label="Pseudo joueur" icon={<User size={13}/>} value={form.pseudo} onChange={v => setForm({ ...form, pseudo: v })} />
                  <AuthField label="Nom du personnage" icon={<IdCard size={13}/>} value={form.charName} onChange={v => setForm({ ...form, charName: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectInput label="Lignée" value={form.clan} options={CLANS} onChange={v => setForm({ ...form, clan: v })} />
                  <SelectInput label="Allégeance" value={form.sect} options={SECTES} onChange={v => setForm({ ...form, sect: v })} />
                </div>
                <div className="px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-1">Validation requise</p>
                  <p className="text-[11px] text-zinc-400 font-serif italic leading-relaxed">
                    Ton compte sera activé par un conteur avant que tu puisses accéder aux archives.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-red-400 animate-in fade-in duration-200"
                style={{ background: 'rgba(139,38,53,0.08)', border: '1px solid rgba(139,38,53,0.2)' }}>
                {error}
              </div>
            )}
            {notice && <p role="status" className="rounded-xl border border-emerald-900/40 bg-emerald-900/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>}

            <div className="space-y-3 pt-3">
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.22em] transition-all disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: loading ? 'rgba(139,38,53,0.3)' : 'linear-gradient(135deg, rgba(139,38,53,0.7), rgba(86,26,36,0.9))',
                  border: '1px solid rgba(139,38,53,0.3)', color: '#ecbcc6',
                  boxShadow: '0 4px 24px rgba(139,38,53,0.12)',
                }}>
                {loading ? "En cours…" : isReset ? 'Envoyer le lien' : isRegister ? "Sceller le Pacte" : "Entrer dans les Ombres"}
              </button>
              {!isRegister && !isReset && <button type="button" onClick={() => { setIsReset(true); setError(''); setNotice(''); }} className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200">Mot de passe oublié ?</button>}
              <button type="button" onClick={() => { if (isReset) setIsReset(false); else setIsRegister(!isRegister); setError(''); setNotice(''); }}
                className="w-full py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-200 hover:text-zinc-200 transition-colors">
                {isReset ? 'Retour à la connexion' : isRegister ? "J'ai déjà un compte" : "Rejoindre le Cercle"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
