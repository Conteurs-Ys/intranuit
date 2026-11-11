import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// Écoute dès le chargement du module, même si l'accueil n'est pas encore monté.
let installPrompt = null;
let installed = false;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('appinstalled', () => { installed = true; installPrompt = null; });

export default function InstallApp() {
  const [visible, setVisible] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const mobile = window.matchMedia('(max-width: 767px)');
    const update = () => setVisible(mobile.matches && !standalone.matches && !navigator.standalone && !installed);
    update();
    standalone.addEventListener('change', update);
    mobile.addEventListener('change', update);
    window.addEventListener('appinstalled', update);
    return () => { standalone.removeEventListener('change', update); mobile.removeEventListener('change', update); window.removeEventListener('appinstalled', update); };
  }, []);
  const install = async () => {
    if (!installPrompt) { setHelp(value => !value); return; }
    const prompt = installPrompt;
    installPrompt = null; setBusy(true); setHelp(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setVisible(false);
    } catch { setHelp(true); }
    finally { setBusy(false); }
  };
  if (!visible) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return <aside className="mb-6 rounded-2xl px-4 py-3" style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
    <button type="button" onClick={install} disabled={busy} aria-expanded={help} className="flex w-full items-center gap-3 text-left text-sm font-bold" style={{ color: 'var(--night-text)' }}>
      <Download size={17} style={{ color: 'var(--night-red)' }} /> Installer Intranuit sur mon téléphone
    </button>
    {help && <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--night-muted)' }}>
      {ios ? 'Dans le menu Partager du navigateur, choisis « Sur l’écran d’accueil », puis « Ajouter ». Si cette option est absente, ouvre le site dans Safari.' : 'Ouvre le menu de ton navigateur, puis choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ». Si cette option est absente, ouvre le site dans Chrome ou Edge.'}
    </p>}
  </aside>;
}
