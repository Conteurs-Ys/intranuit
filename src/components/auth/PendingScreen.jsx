// Déconnexion via logout() (recharge la page).
import { logout } from '../../lib/firebase';
import { useInstance } from '../../context/InstanceContext';
import { Moon, Clock, LogOut } from 'lucide-react';

export default function PendingScreen({ user, rejected = false, deleted = false }) {
  const identity = useInstance();
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0b0809' }}>

      {/* Glow ambiant */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #92400e, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md text-center space-y-8">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b0a0a, #1a0505)', border: '1px solid rgba(139,38,53,0.3)', boxShadow: '0 0 20px rgba(139,38,53,0.15)' }}>
            <Moon size={18} className="text-red-700" />
          </div>
          <span className="font-serif text-xl font-bold text-zinc-300 italic">Intranuit{identity.city && <span className="text-red-400"> · {identity.city}</span>}</span>
        </div>

        {/* Card principale */}
        <div className="rounded-3xl p-8 space-y-6"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Icône horloge */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.18)' }}>
            <Clock size={28} className="text-amber-500" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-zinc-200 italic">
              {deleted ? 'Compte supprimé' : rejected ? 'Demande refusée' : 'Accès en attente'}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-500">
              {deleted || rejected ? 'Accès non autorisé' : 'Validation requise'}
            </p>
          </div>

          <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />

          <p className="text-sm text-zinc-400 font-serif italic leading-relaxed">
            {deleted ? 'Ton compte a été supprimé de la chronique. Son accès reste bloqué. Pour toute question, contacte l’administration de la chronique.' : rejected ? 'Ta demande d’accès à la chronique a été refusée. Contacte l’association si tu souhaites en discuter.' : 'Ton inscription a bien été reçue. Un conteur doit valider ton compte avant que tu puisses accéder aux archives de la chronique.'}
          </p>

          <div className="px-4 py-3 rounded-xl text-left"
            style={{ background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.1)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-200 mb-1">Connecté en tant que</p>
            <p className="text-[12px] text-zinc-400 font-serif italic">{user?.email}</p>
          </div>
        </div>

        {/* Se déconnecter */}
        <button
          onClick={logout}
          className="flex items-center gap-2 mx-auto text-[11px] font-bold uppercase tracking-widest text-zinc-200 hover:text-zinc-200 transition-colors">
          <LogOut size={12} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
