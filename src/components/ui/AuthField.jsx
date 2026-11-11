import { useId } from 'react';

export default function AuthField({ label, icon, type = 'text', value, onChange, placeholder = '' }) {
  const id = useId();
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="text-[10px] font-bold text-zinc-200 uppercase tracking-[0.2em]">{label}</label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 text-zinc-400 group-focus-within:text-zinc-200">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className="w-full outline-none transition-all duration-200 font-serif"
          style={{
            background: 'rgba(18,14,16,0.4)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '0.75rem',
            padding: `0.65rem ${icon ? '0.875rem' : '0.875rem'} 0.65rem ${icon ? '2.375rem' : '0.875rem'}`,
            fontSize: '13px',
            color: '#ece4e0',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
        />
      </div>
    </div>
  );
}
