// Bouton d'envoi des formulaires, dans le style d'origine : contour rouge,
// fond transparent, capitales espacées encadrées de deux petits traits.
export default function SubmitButton({ children, saving, disabled, type = 'submit', onClick, light = false }) {
  return (
    <button type={type} onClick={onClick} disabled={saving || disabled}
      className="group w-full py-3.5 rounded-xl flex items-center justify-center gap-3 font-bold text-[11px] uppercase tracking-[0.25em] transition-colors duration-300 hover:bg-[rgba(153,27,27,0.12)] active:scale-[0.995] disabled:opacity-50 disabled:pointer-events-none"
      style={{ background: 'transparent', border: '1px solid rgba(185,28,28,0.5)', color: light ? '#a5222a' : '#f87171' }}>
      <span className="w-4 h-px bg-red-800 transition-all duration-300 group-hover:w-6" />
      {saving ? 'Enregistrement…' : children}
      <span className="w-4 h-px bg-red-800 transition-all duration-300 group-hover:w-6" />
    </button>
  );
}
