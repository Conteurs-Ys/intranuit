export default function ProfileData({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.02] text-left">
      <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-widest">{label}</span>
      <span className="text-[13px] font-serif italic text-zinc-200">{value || '—'}</span>
    </div>
  );
}