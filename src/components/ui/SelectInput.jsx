import ThemedSelect from './ThemedSelect';

export default function SelectInput({ label, value, options, onChange }) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[10px] font-bold text-zinc-200 uppercase tracking-[0.2em]">{label}</label>
      <ThemedSelect value={value} options={options} onChange={onChange} ariaLabel={label} />
    </div>
  );
}
