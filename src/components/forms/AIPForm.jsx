import { useState } from 'react';
import { ChevronLeft, Plus, Check, Cpu, FlaskConical, Gift } from 'lucide-react';
import ExpensesTable from '../ui/ExpensesTable';
import { expenseDrafts, normalizeExpenses } from '../../utils/expenses';
import ActionBlock from './ActionBlock';
import SubmitButton from '../ui/SubmitButton';
import ThemedSelect from '../ui/ThemedSelect';
import { emptySheet } from '../../utils/sheet';
import { feedingMissing } from '../../utils/feeding';
import useLists from '../../hooks/useLists';

const BONUS_KINDS = [
  { id: 'Informatique', title: 'Informatique', gain: '+1', once: true, icon: Cpu, color: '#5fa0f2',
    hint: "Une action normale, ou annuler / observer l'AIP d'un autre personnage. Une seule fois." },
  { id: 'Sciences', title: 'Sciences', gain: '+1 par champ', once: false, icon: FlaskConical, color: '#a995d8',
    hint: "Une action par champ d'étude, uniquement pour une activité liée à ce champ." },
  { id: 'Autre', title: 'Autre bonus', gain: 'à nommer', once: false, icon: Gift, color: '#d9b26a',
    hint: "Toute autre source d'AIP en plus : Homoncule (Tremere, +2), avantage de clan… Donne-lui un nom et indique combien d'AIP elle donne dans ton profil." },
];

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-grow" style={{ background: 'linear-gradient(to right, rgba(127,29,29,0.3), transparent)' }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400/80">{label}</span>
      <div className="h-px flex-grow" style={{ background: 'linear-gradient(to left, rgba(127,29,29,0.3), transparent)' }} />
    </div>
  );
}

// Actions bonus proposées d'office d'après le profil du joueur, pour un nouveau dépôt.
function bonusFromSheet(sheet, zone) {
  let n = 0;
  const make = (bonusType, subject) => ({ id: Date.now() + (n++), bonusType, subject, type: '', zone, description: '', response: '' });
  return [
    ...(sheet.informatique ? [make('Informatique', 'Informatique')] : []),
    ...sheet.sciences.map(sub => make('Sciences', sub)),
    ...sheet.bonuses.flatMap(b => Array.from({ length: b.count || 1 }, () => make('Autre', b.name))),
  ];
}

// Ce que le profil indique pour chaque type de bonus.
function profileHint(kind, sheet) {
  if (kind === 'Informatique') return sheet.informatique ? 'Informatique' : '';
  if (kind === 'Sciences') return sheet.sciences.join(', ');
  return sheet.bonuses.map(b => (b.count > 1 ? `${b.name} ×${b.count}` : b.name)).join(', ');
}

// Déclaration facultative d’un emprunt ; aucun rappel ni bilan de chasse avant diffusion.
function TroupeauBorrow({ borrowFrom, onBorrow, directory }) {
  const lenders = directory.filter(d => d.kind === 'pj').sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
  if (!lenders.length) return null;
  return <details className="rounded-xl px-4 py-3 text-[13px]" style={{ border: '1px solid var(--night-line)', color: 'var(--night-muted)' }}>
    <summary className="cursor-pointer font-serif italic">Emprunt de Troupeau{borrowFrom?.name ? ` · ${borrowFrom.name}` : ''}</summary>
    <div className="pt-3 space-y-2">
      <ThemedSelect value={borrowFrom?.id || ''} placeholder="Personne" ariaLabel="Personnage auprès duquel emprunter du Troupeau"
        options={[{ value: '', label: 'Personne' }, ...lenders.map(d => ({ value: d.id, label: d.name }))]}
        onChange={v => { const d = lenders.find(x => x.id === v); onBorrow(d ? { id: d.id, name: d.name } : null); }} />
      {borrowFrom && <p>Emprunt soumis à la validation d’un conteur.</p>}
    </div>
  </details>;
}

export default function AIPForm({ initialData, cycle, onSubmit, onCancel, directory = [], sheet = emptySheet(), clan = '' }) {
  const lists = useLists();
  const [actions, setActions] = useState(initialData?.actions || [1, 2, 3].map(id => (
    { id, type: '', zone: lists.zones[0], description: '', response: '' })));
  const [bonus, setBonus] = useState(() => initialData?.bonus || bonusFromSheet(sheet, lists.zones[0]));
  const [expenses, setExpenses] = useState(() => expenseDrafts(initialData?.expenses));
  const [expenseError, setExpenseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [borrowFrom, setBorrowFrom] = useState(initialData?.feeding?.borrowFrom || null);
  const all = [...actions, ...bonus];
  const described = all.filter(a => a.description?.trim()).length;
  const troupeau = Math.min(5, Math.max(0, parseInt(sheet.troupeau, 10) || 0));
  // Un emprunt n'a de sens que s'il manque de quoi se nourrir.
  const feeding = { troupeau, borrowFrom: feedingMissing({ clan, actions: all, feeding: { troupeau } }) ? borrowFrom : null };

  const addBonus = (type) => {
    if (type === 'Informatique' && bonus.some(b => b.bonusType === 'Informatique')) return;
    setBonus([...bonus, {
      id: Date.now(), bonusType: type,
      subject: type === 'Informatique' ? 'Informatique' : '',
      type: 'AIP Spécialisé', zone: lists.zones[0], description: '', response: ''
    }]);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400/80 mb-2">
            {cycle.label}
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#ece4e0] italic leading-none"
            style={{ textShadow: '0 0 30px rgba(139,38,53,0.15)' }}>
            Actions du Cycle
          </h2>
        </div>
        <button onClick={onCancel}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-all"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { setExpenseError(''); await onSubmit({ actions, bonus, feeding, expenses: normalizeExpenses(expenses) }); } catch (error) { setExpenseError(error.message); } finally { setSaving(false); } }} className="space-y-10">

        {/* Actions fondatrices */}
        <div className="space-y-5">
          <SectionDivider label="Actions Principales" />
          {actions.map((act, i) => (
            <ActionBlock key={act.id} num={i + 1} data={act} review={initialData?.learningReviews?.[`actions:${act.id}`]} type="base" directory={directory} sheet={sheet} lists={lists}
              onChange={(f, v) => setActions(actions.map(a => a.id === act.id ? { ...a, [f]: v } : a))}
            />
          ))}
        </div>

        {/* Actions bonus : deux cartes qui expliquent ce que chaque bonus permet */}
        <div className="space-y-5">
          <SectionDivider label="Actions Bonus" />
          <p className="text-center font-serif italic text-[14.5px] -mt-2" style={{ color: 'var(--night-muted)' }}>
            Si la fiche de ton personnage le permet, ajoute des actions en plus des trois de base.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BONUS_KINDS.map(k => {
              const count = bonus.filter(b => b.bonusType === k.id).length;
              const disabled = k.once && count > 0;
              return (
                <button key={k.id} type="button" onClick={() => addBonus(k.id)} disabled={disabled}
                  className="group text-left rounded-2xl overflow-hidden transition-colors duration-300 hover:bg-white/[0.015] disabled:cursor-default"
                  style={{ background: 'rgba(18,14,16,0.8)', border: `1px solid ${k.color}38` }}>
                  {/* Même en-tête que les cartes d'action du dessus */}
                  <span className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${k.color}1a`, border: `1px solid ${k.color}38`, color: k.color }}>
                        <k.icon size={14} />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest leading-snug" style={{ color: k.color }}>
                        {k.title} <span className="whitespace-nowrap" style={{ color: 'var(--night-faint)' }}>· {k.gain}</span>
                      </span>
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.09)', color: disabled ? 'var(--night-faint)' : 'var(--night-text)' }}>
                      {disabled ? <><Check size={11} /> Ajoutée</> : <><Plus size={11} className="transition-transform group-hover:rotate-90" /> Ajouter{count ? ` (${count})` : ''}</>}
                    </span>
                  </span>
                  <span className="block px-5 pb-4 -mt-1 text-[12px] leading-snug" style={{ color: 'var(--night-muted)' }}>
                    {k.hint}
                    {profileHint(k.id, sheet) && (
                      <span className="block mt-1.5 font-bold" style={{ color: k.color }}>Ton profil : {profileHint(k.id, sheet)}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {bonus.length > 0 && (
            <div className="space-y-4">
              {bonus.map(b => (
                <div key={b.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <ActionBlock data={b} review={initialData?.learningReviews?.[`bonus:${b.id}`]} type="bonus" directory={directory} sheet={sheet} lists={lists}
                    onChange={(f, v) => setBonus(bonus.map(x => x.id === b.id ? { ...x, [f]: v } : x))}
                    onRemove={initialData?.learningReviews?.[`bonus:${b.id}`] ? undefined : () => setBonus(bonus.filter(x => x.id !== b.id))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <section className={`rounded-2xl ${expenses.length ? 'space-y-4 p-5' : 'flex flex-wrap items-center justify-between gap-3 px-4 py-3'}`} style={{ background: 'var(--night-panel)', border: '1px solid var(--night-line)' }}>
          <h3 className={`font-serif italic font-bold text-zinc-200 ${expenses.length ? 'text-xl' : 'text-base'}`}>Dépenses du personnage</h3>
          {expenses.length > 0 && <p className="text-[13px] text-zinc-400">Indique les sommes dépensées pendant ce cycle et leur motif. Elles seront soumises à la validation d’un conteur et conservées avec tes AIP.</p>}
          <ExpensesTable rows={expenses} onChange={setExpenses} reviews={initialData?.expenseReviews} />
          {expenseError && <p role="alert" className="text-sm text-red-300">{expenseError}</p>}
        </section>

        <TroupeauBorrow borrowFrom={borrowFrom} onBorrow={setBorrowFrom} directory={directory} />

        {/* Envoi, en fin de formulaire */}
        <div className="pt-2 space-y-3">
          <p className="text-center text-[12.5px]" style={{ color: described < all.length ? '#e9c48a' : 'var(--night-faint)' }}>
            {described} / {all.length} actions décrites
            {described < all.length && ` — ${all.length - described} encore vide${all.length - described > 1 ? 's' : ''}`}
          </p>
          <SubmitButton saving={saving}>{initialData ? 'Mettre à jour mes AIP' : 'Consigner mes AIP'}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
