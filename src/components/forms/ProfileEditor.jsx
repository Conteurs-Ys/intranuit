import { useState } from 'react';
import { ChevronLeft, User, IdCard, Fingerprint, Shield, Skull, Plus, Trash2, Minus, Cpu, FlaskConical, Gift, Gauge, X, Droplet, Sparkles, Layers, Handshake, Users } from 'lucide-react';
import AuthField from '../ui/AuthField';
import SelectInput from '../ui/SelectInput';
import ThemedSelect from '../ui/ThemedSelect';
import SubmitButton from '../ui/SubmitButton';
import ProfilePrivacy from './ProfilePrivacy';
import ScoreField from '../ui/ScoreField';
import { CLANS, SECTES, INFLUENCE_SPECIALIZATIONS, QUICK_SCORES } from '../../constants';
import { sheetOf } from '../../utils/sheet';
import { activeCharacterId, charactersOf, STATUSES } from '../../utils/characters';

const INPUT = 'w-full h-11 px-3.5 rounded-xl text-[13.5px] text-zinc-200 outline-none transition-[border-color,box-shadow] duration-200 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(229,72,79,0.1)] placeholder:text-zinc-500';
const INPUT_STYLE = { background: 'var(--night-input)', border: '1px solid var(--night-line-strong)' };
const LABEL = 'block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200 mb-1.5';

// Bloc de section, même en-tête que les cartes d'action.
function Section({ icon: Icon, title, color, hint, children, aside }) {
  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: 'rgba(18,14,16,0.8)', border: `1px solid ${color}33` }}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5" style={{ borderBottom: `1px solid ${color}1f` }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1a`, border: `1px solid ${color}38`, color }}>
            <Icon size={14} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>{title}</span>
        </div>
        {aside}
      </div>
      <div className="px-5 py-4 space-y-4">
        {hint && <p className="text-[12.5px] leading-snug" style={{ color: 'var(--night-muted)' }}>{hint}</p>}
        {children}
      </div>
    </section>
  );
}

function Stepper({ value, onChange, min = 0, max = 5, color }) {
  const v = Number(value) || 0;
  return (
    <div className="inline-flex items-center rounded-full" style={{ background: 'var(--night-input)', border: '1px solid var(--night-line-strong)' }}>
      <button type="button" onClick={() => onChange(Math.max(min, v - 1))} disabled={v <= min} aria-label="Moins"
        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30"><Minus size={13} /></button>
      <span className="min-w-[2.75rem] flex items-center justify-center gap-[3px]">
        <span className="font-bold text-[13px] text-zinc-100 mr-1 tabular-nums">{v}</span>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="w-[5px] h-[5px] rounded-full" style={i < v ? { background: color } : { border: `1px solid ${color}55` }} />
        ))}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, v + 1))} disabled={v >= max} aria-label="Plus"
        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30"><Plus size={13} /></button>
    </div>
  );
}

// Interrupteur aux couleurs du site (`color` : « r,g,b »).
function Toggle({ icon: Icon, color, title, hint, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]"
      style={{ border: `1px solid ${checked ? `rgba(${color},0.45)` : 'var(--night-line-strong)'}` }}>
      <span className="flex items-center gap-3">
        <Icon size={16} style={{ color: `rgb(${color})` }} />
        <span>
          <span className="block text-[13px] font-bold text-zinc-100">{title}</span>
          <span className="block text-[12px]" style={{ color: 'var(--night-faint)' }}>{hint}</span>
        </span>
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <span aria-hidden className="relative w-10 h-6 shrink-0 rounded-full transition-colors duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400/50"
        style={{ background: checked ? `rgba(${color},0.35)` : 'rgba(255,240,235,0.08)', border: `1px solid ${checked ? `rgba(${color},0.7)` : 'var(--night-line-strong)'}` }}>
        <span className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full transition-transform duration-300"
          style={{ transform: checked ? 'translateX(16px)' : 'none', background: checked ? `rgb(${color})` : '#8f8485', boxShadow: checked ? `0 0 8px rgba(${color},0.7)` : 'none' }} />
      </span>
    </label>
  );
}

function RemoveButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

function AddButton({ onClick, children, color }) {
  return (
    <button type="button" onClick={onClick}
      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-widest transition-colors hover:bg-white/[0.03]"
      style={{ border: '1px solid rgba(255,255,255,0.09)', color: color || 'var(--night-text)' }}>
      <Plus size={12} className="transition-transform group-hover:rotate-90" /> {children}
    </button>
  );
}

// Une catégorie d'influence : niveau (indicatif) et spécialités nommées, sans limite de nombre.
function InfluenceBlock({ category, value, onChange }) {
  const isGotha = category === 'gotha';
  const color = isGotha ? '#ec9440' : '#a995d8';
  const specs = value.specs || [];
  const setSpecs = (next) => onChange({ ...value, specs: next });
  return (
    <Section icon={isGotha ? Shield : Skull} title={isGotha ? 'Influence Gotha' : 'Influence Pègre'} color={color}
      aside={<Stepper value={value.level} onChange={level => onChange({ ...value, level })} color={color} />}
      hint={isGotha ? 'Haute société, institutions, finances…' : 'Rue, crime, trafics, bureaucratie corrompue…'}>
      {specs.length === 0 ? (
        <p className="text-[12.5px] italic" style={{ color: 'var(--night-faint)' }}>Aucune spécialité renseignée.</p>
      ) : (
        <div className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[13rem_1fr_auto] gap-2 items-center animate-in fade-in duration-200">
              <ThemedSelect value={s.spec} placeholder="Spécialité" options={INFLUENCE_SPECIALIZATIONS}
                onChange={spec => setSpecs(specs.map((x, j) => j === i ? { ...x, spec } : x))} />
              <div className="order-3 sm:order-none col-span-2 sm:col-span-1">
                <input value={s.name || ''} onChange={e => setSpecs(specs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Nom du réseau, ex. Commissariat central" className={INPUT} style={INPUT_STYLE} />
              </div>
              <RemoveButton onClick={() => setSpecs(specs.filter((_, j) => j !== i))} label="Retirer cette spécialité" />
            </div>
          ))}
        </div>
      )}
      <AddButton color={color} onClick={() => setSpecs([...specs, { spec: '', name: '' }])}>Ajouter une spécialité</AddButton>
    </Section>
  );
}

// Liste d'étiquettes libres (champs de Sciences).
function TagList({ values, onChange, placeholder, color }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[46px] px-2.5 py-2 rounded-xl" style={INPUT_STYLE}>
      {values.map(v => (
        <span key={v} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[12px] font-bold"
          style={{ background: `${color}22`, border: `1px solid ${color}55`, color: '#ece4e0' }}>
          {v}
          <button type="button" onClick={() => onChange(values.filter(x => x !== v))} aria-label={`Retirer ${v}`}
            className="w-4 h-4 rounded-full flex items-center justify-center opacity-70 hover:opacity-100"><X size={11} /></button>
        </span>
      ))}
      <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={add}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1)); }}
        placeholder={values.length ? 'Ajouter…' : placeholder}
        className="flex-1 min-w-[9rem] bg-transparent outline-none text-[13px] text-zinc-200 placeholder:text-zinc-500 py-1" />
    </div>
  );
}

// Mes personnages : l'actif, les anciens (retirés ou morts), et la création d'un nouveau personnage.
// Pas de formulaire imbriqué : ce bloc vit dans le formulaire du profil.
function CharactersBlock({ profile, onNewCharacter }) {
  const characters = charactersOf(profile);
  const activeId = activeCharacterId(profile);
  const active = characters.find(c => c.id === activeId);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const ready = draft && draft.name.trim() && draft.clan && draft.endStatus;
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try { await onNewCharacter({ name: draft.name.trim(), clan: draft.clan, sect: draft.sect }, draft.endStatus); } finally { setBusy(false); }
  };
  const chip = (on) => ({ color: on ? '#f58b90' : 'var(--night-muted)', background: on ? 'rgba(229,72,79,0.12)' : 'transparent', border: `1px solid ${on ? 'rgba(229,72,79,0.5)' : 'var(--night-line-strong)'}` });
  return (
    <Section icon={Users} title="Mes personnages" color="#e5484f"
      hint="Un seul personnage actif à la fois. Les archives d'un ancien personnage restent consultables dans les Archives.">
      <ul className="space-y-2">
        {characters.map(c => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl"
            style={{ border: `1px solid ${c.id === activeId ? 'rgba(229,72,79,0.4)' : 'var(--night-line-strong)'}` }}>
            <span className="font-serif italic text-[15px] text-zinc-100">{c.name || 'Sans nom'} <span className="not-italic font-sans text-[12px]" style={{ color: 'var(--night-faint)' }}>{c.clan}</span></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: c.id === activeId ? '#f58b90' : 'var(--night-faint)' }}>
              {STATUSES[c.status] || c.status}{c.endedAt ? ` · ${new Date(c.endedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {!draft ? (
        <AddButton color="#e5484f" onClick={() => setDraft({ name: '', clan: '', sect: profile?.sect || '', endStatus: '' })}>Nouveau personnage</AddButton>
      ) : (
        <div className="rounded-xl p-4 space-y-4" style={{ border: '1px solid rgba(229,72,79,0.3)', background: 'rgba(229,72,79,0.04)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AuthField label="Nom du nouveau personnage" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} icon={<IdCard size={13} />} />
            <SelectInput label="Clan" value={draft.clan} options={CLANS} onChange={v => setDraft({ ...draft, clan: v })} />
            <SelectInput label="Allégeance" value={draft.sect} options={SECTES} onChange={v => setDraft({ ...draft, sect: v })} />
          </div>
          <div>
            <span className={LABEL}>Que devient {active?.name || 'ton personnage actuel'} ?</span>
            <div className="flex flex-wrap gap-2">
              {['retiré', 'mort'].map(s => (
                <button key={s} type="button" aria-pressed={draft.endStatus === s} onClick={() => setDraft({ ...draft, endStatus: s })}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.12em]" style={chip(draft.endStatus === s)}>{STATUSES[s]}</button>
              ))}
            </div>
          </div>
          <p className="text-[12.5px]" style={{ color: 'var(--night-muted)' }}>
            Le nouveau personnage part d'un profil vide (influences, bonus, Troupeau, scores). Un dossier déjà déposé ce cycle reste à {active?.name || "l'ancien personnage"}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!ready || busy} onClick={submit}
              className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
              style={{ color: '#f7c4c6', background: 'rgba(229,72,79,0.14)', border: '1px solid rgba(229,72,79,0.5)' }}>Créer et rendre actif</button>
            <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400"
              style={{ border: '1px solid var(--night-line-strong)' }}>Annuler</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// Les conteurs et admins n'ont que l'identité : influences, bonus et scores sont des infos de joueur.
export default function ProfileEditor({ data, onSave, onCancel, onNewCharacter, isStaff = false }) {
  const [form, setForm] = useState({ ...data });
  const [sheet, setSheet] = useState(() => sheetOf(data));
  const [saving, setSaving] = useState(false);
  const set = (patch) => setSheet(s => ({ ...s, ...patch }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const clean = {
      ...sheet,
      gotha: { ...sheet.gotha, specs: sheet.gotha.specs.filter(s => s.spec) },
      pegre: { ...sheet.pegre, specs: sheet.pegre.specs.filter(s => s.spec) },
      bonuses: sheet.bonuses.filter(b => b.name.trim()),
      scores: sheet.scores.filter(s => s.name.trim()),
    };
    try { await onSave({ ...form, sheet: clean }); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400/80 mb-2">Compte</div>
          <h2 className="font-serif text-3xl font-bold text-[#ece4e0] italic leading-none">Mon profil</h2>
          <p className="font-serif italic text-[15px] mt-2" style={{ color: 'var(--night-muted)' }}>
            Ces informations préremplissent tes formulaires d’AIP et d’influences.
          </p>
        </div>
        <button type="button" onClick={onCancel}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Identité */}
      <Section icon={Fingerprint} title="Identité" color="#e5484f">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthField label="Pseudo joueur" value={form.pseudo} onChange={v => setForm({ ...form, pseudo: v })} icon={<User size={13} />} />
          {!isStaff && <>
          <AuthField label="Nom du personnage" value={form.name} onChange={v => setForm({ ...form, name: v })} icon={<IdCard size={13} />} />
          <SelectInput label="Clan" value={form.clan} options={CLANS} onChange={v => setForm({ ...form, clan: v })} />
          <SelectInput label="Allégeance" value={form.sect} options={SECTES} onChange={v => setForm({ ...form, sect: v })} />
          </>}
        </div>
      </Section>

      {!isStaff && <>
      <CharactersBlock profile={data} onNewCharacter={onNewCharacter} />

      {/* Influences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfluenceBlock category="gotha" value={sheet.gotha} onChange={gotha => set({ gotha })} />
        <InfluenceBlock category="pegre" value={sheet.pegre} onChange={pegre => set({ pegre })} />
      </div>

      {/* Atouts qui changent les règles d'influence (copiés sur les actions à l'envoi, le conteur ne lisant pas les profils) */}
      <Section icon={Sparkles} title="Atouts d'influence" color="#ec9440">
        <Toggle icon={Layers} color="236,148,64" title="Monopoliste" hint="Deux spécialisations par point d'influence"
          checked={sheet.monopoliste} onChange={monopoliste => set({ monopoliste })} />
        {form.clan === 'Ravnos' && (
          <Toggle icon={Handshake} color="236,148,64" title="Transactions louches (Ravnos)" hint="Attaque : 1 action par niveau retiré au lieu de 2, dans la même catégorie"
            checked={sheet.transactionsLouches} onChange={transactionsLouches => set({ transactionsLouches })} />
        )}
      </Section>

      {/* Actions bonus */}
      <Section icon={Gift} title="Actions bonus" color="#d9b26a"
        hint="Ce que ta fiche te donne en plus des 3 AIP de base. Le formulaire d’AIP te les proposera directement.">
        <Toggle icon={Cpu} color="95,160,242" title="Informatique" hint="+1 AIP, une seule fois"
          checked={sheet.informatique} onChange={informatique => set({ informatique })} />

        <div>
          <span className={LABEL}><FlaskConical size={11} className="inline -mt-0.5 mr-1.5" style={{ color: '#a995d8' }} />Champs de Sciences</span>
          <TagList values={sheet.sciences} onChange={sciences => set({ sciences })} color="#a995d8"
            placeholder="Ex. Médecine, puis Entrée — un champ = +1 AIP" />
        </div>

        <div>
          <span className={LABEL}>Autres bonus</span>
          <div className="space-y-2">
            {sheet.bonuses.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center animate-in fade-in duration-200">
                <input value={b.name} onChange={e => set({ bonuses: sheet.bonuses.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })}
                  placeholder="Ex. Homoncule (Tremere) : 2" className={INPUT} style={INPUT_STYLE} />
                <Stepper value={b.count} min={1} max={5} color="#d9b26a"
                  onChange={count => set({ bonuses: sheet.bonuses.map((x, j) => j === i ? { ...x, count } : x) })} />
                <RemoveButton onClick={() => set({ bonuses: sheet.bonuses.filter((_, j) => j !== i) })} label="Retirer ce bonus" />
              </div>
            ))}
          </div>
          <div className="mt-2"><AddButton color="#d9b26a" onClick={() => set({ bonuses: [...sheet.bonuses, { name: '', count: 1 }] })}>Ajouter un bonus</AddButton></div>
        </div>
      </Section>

      {/* Valeur déclarée du Troupeau. */}
      <Section icon={Droplet} title="Troupeau" color="#e5484f"
        aside={<Stepper value={sheet.troupeau} onChange={troupeau => set({ troupeau })} color="#e5484f" />}
        />

      {/* Scores utiles */}
      <Section icon={Gauge} title="Scores utiles" color="#5fa0f2"
        hint="Les scores de ta fiche utiles pour tes AIP (Investigation, Ressources, Domination…). Tu pourras indiquer celui que tu utilises dans chaque AIP.">
        {sheet.scores.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sheet.scores.map((s, i) => (
              <ScoreField key={i} score={s} taken={sheet.scores.map(x => x.name)}
                onChange={next => set({ scores: sheet.scores.map((x, j) => j === i ? next : x) })}
                onRemove={() => set({ scores: sheet.scores.filter((_, j) => j !== i) })} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <AddButton color="#5fa0f2" onClick={() => set({ scores: [...sheet.scores, { name: '', value: 1 }] })}>Ajouter un score</AddButton>
          {QUICK_SCORES.filter(q => !sheet.scores.some(s => s.name === q)).map(q => (
            <button key={q} type="button" onClick={() => set({ scores: [...sheet.scores, { name: q, value: 1 }] })}
              className="px-2.5 py-1 rounded-full text-[11.5px] transition-colors hover:bg-[rgba(95,160,242,0.12)]"
              style={{ border: '1px dashed rgba(95,160,242,0.35)', color: '#9cc3f5' }}>
              + {q}
            </button>
          ))}
        </div>
      </Section>
      </>}

      <SubmitButton saving={saving}>Enregistrer mon profil</SubmitButton>
      <ProfilePrivacy />
    </form>
  );
}
