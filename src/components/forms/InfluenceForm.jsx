import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Plus, Shield, Skull } from 'lucide-react';
import SelectInput from '../ui/SelectInput';
import ThemedSelect from '../ui/ThemedSelect';
import LevelLabel, { levelText } from '../ui/LevelLabel';
import { sheetOf } from '../../utils/sheet';
import { OBSTRUCTION_TARGETS, ALL_SPECIALTIES, missingObstructionActivity } from '../../utils/obstruction';
import { attackCost, attackRate } from '../../utils/influenceRules';

const CAT_NAME = { gotha: 'Gotha', pegre: 'Pègre' };
const ATTACK_GROUNDS = [
  { value: 'temoin', label: "J'ai vu la cible utiliser cette influence" },
  { value: 'enquete', label: "Je l'ai pistée par une enquête (rumeur…)" },
  { value: 'riposte', label: "Cette influence m'a attaqué" },
];
import {
  INFLUENCE_SPECIALIZATIONS,
  GOTHA_ACTIONS_GLOBALES,
  PEGRE_ACTIONS_GLOBALES,
  ACTIONS_CIBLEES,
} from '../../constants';
import { profileRumorSpecs, withProfileRumorSpecs, rumorsMissingSpecs } from '../../utils/rumors';

const EMPTY_ACTION = (category, sheet) => ({
  id: Date.now() + Math.random(),
  category,
  actionType: 'globale',
  actionName: '',
  level: sheet?.[category]?.level || 1,
  actionsSpent: 1,
  specialization: '',
  influenceName: '',
  description: '',
  response: '',
  rumorTable: [],
  rumorNarrative: '',
});

function FieldLabel({ children }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200 mb-1.5 ml-0.5">
      {children}
    </label>
  );
}

function StyledInput({ value, onChange, placeholder, type = 'text', min, max }) {
  const [localVal, setLocalVal] = useState(value);
  useEffect(() => { setLocalVal(value); }, [value]);

  if (type === 'number') {
    return (
      <input
        type="number" min={min} max={max}
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={e => {
          const parsed = parseInt(e.target.value);
          const clamped = isNaN(parsed) ? (min || 1) : (min !== undefined ? Math.max(min, parsed) : parsed);
          setLocalVal(clamped);
          onChange(clamped);
          e.target.style.borderColor = 'rgba(255,255,255,0.1)';
          e.target.style.background = 'rgba(255,255,255,0.06)';
        }}
        className="w-full py-3 px-4 rounded-xl text-sm text-[#ece4e0] font-serif italic outline-none transition-all"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        placeholder={placeholder}
        onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
      />
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full py-3 px-4 rounded-xl text-sm text-[#ece4e0] font-serif italic outline-none transition-all"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      placeholder={placeholder}
      onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
    />
  );
}

function StyledSelect({ value, onChange, options, placeholder }) {
  return <ThemedSelect value={value} onChange={onChange} options={options} placeholder={placeholder} />;
}

function ActionInfluenceBlock({ data, onChange, onRemove, mySpecs = [], directory = [], dealer = false }) {
  const [open, setOpen] = useState(true);

  const isGotha = data.category === 'gotha';
  const isCiblee = data.actionType === 'ciblée';
  const isDefense = data.actionName === 'Défense';
  const isRumeur = data.actionName === 'La Rumeur' || data.actionName === "Potins et délit d'initié";
  const globalActions = isGotha ? GOTHA_ACTIONS_GLOBALES : PEGRE_ACTIONS_GLOBALES;
  // Niveau utilisé pour proposer les actions : avec soutiens s'il est indiqué, sinon le niveau de base.
  const reachLevel = Math.max(parseInt(data.level, 10) || 1, parseInt(data.supportedLevel, 10) || 0);
  const availableGlobalActions = globalActions.filter(a => a.level <= reachLevel);
  const nextLevelAction = globalActions.find(a => a.level === reachLevel + 1);
  const accentColor = isGotha ? '#d97706' : '#a995d8';
  const accentLight = isGotha ? '#fbbf24' : '#c2b3e6';
  const levelColor = isGotha ? '#ec9440' : '#a995d8';

  // Résumé replié
  const summary = [
    data.actionName || (isCiblee ? 'Action ciblée' : 'Action globale'),
    data.specialization,
    data.influenceName,
  ].filter(Boolean).join(' · ');

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: `linear-gradient(135deg, ${accentColor}06, rgba(18,14,16,0.9))`, border: `1px solid ${accentColor}18` }}>

      {/* Header cliquable */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/[0.01] transition-all group">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}25` }}>
            {isGotha ? <Shield size={13} style={{ color: accentColor }} /> : <Skull size={13} style={{ color: accentColor }} />}
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accentColor + 'cc' }}>
              {isGotha ? 'Gotha' : 'Pègre'} · {isCiblee ? 'Ciblée' : 'Globale'}
            </div>
            {!open && (
              <div className="text-[12px] font-serif italic mt-0.5 animate-in fade-in duration-200" style={{ color: accentLight + '99' }}>
                {summary || 'Non configurée'}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onRemove && (
            <span role="button"
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-200 hover:text-red-500 transition-colors px-2.5 py-1 rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
              Retirer
            </span>
          )}
          <ChevronDown size={13} className="text-zinc-400 transition-transform duration-300"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: accentColor + '60' }} />
        </div>
      </button>

      {/* Contenu */}
      {open && (
        <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ borderTop: `1px solid ${accentColor}12` }}>

          {/* Niveaux et actions sur une ligne (3 colonnes), puis type et spécialisation. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
            <div>
              <FieldLabel>Niveau de base</FieldLabel>
              <StyledInput type="number" min={1} max={5} value={data.level} onChange={v => onChange('level', v)} />
              <p className="mt-1 text-[11px] text-zinc-400">Celui de ta fiche.</p>
            </div>
            <div>
              <FieldLabel>Niveau avec soutiens</FieldLabel>
              <StyledInput type="number" min={0} max={10} value={data.supportedLevel || ''} onChange={v => onChange('supportedLevel', v > (parseInt(data.level, 10) || 1) ? v : '')} placeholder="Si on te soutient" />
              <p className="mt-1 text-[11px] text-zinc-400">Si on te soutient ce cycle.</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel>Actions dépensées</FieldLabel>
              <StyledInput type="number" min={1} value={data.actionsSpent} onChange={v => onChange('actionsSpent', v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Type d'action</FieldLabel>
              <StyledSelect value={data.actionType}
                onChange={v => onChange('actionType', v)}
                options={[{ value: 'globale', label: 'Globale' }, { value: 'ciblée', label: 'Ciblée' }]} />
            </div>
            <div>
              <FieldLabel>Spécialisation</FieldLabel>
              <StyledSelect value={data.specialization} placeholder="Aucune"
                onChange={v => {
                  onChange('specialization', v);
                  // Spécialité du profil : on remplit le nom du réseau s'il est vide ou venait d'une autre spécialité.
                  const mine = mySpecs.find(m => m.spec === v);
                  const previous = mySpecs.find(m => m.name === data.influenceName);
                  if (mine?.name && (!data.influenceName || previous)) onChange('influenceName', mine.name);
                }}
                options={specOptions(mySpecs)} />
            </div>
            <div className={isCiblee ? '' : 'col-span-2'}>
              {isCiblee ? (
                <>
                  <FieldLabel>Action ciblée</FieldLabel>
                  <StyledSelect value={data.actionName} options={ACTIONS_CIBLEES} onChange={v => {
                    onChange('actionName', v);
                    // Obstruction : cible enregistrée d'office (rumeurs des 15 spécialités, même catégorie), modifiable ensuite.
                    // Attaque : 1 niveau visé sur la même catégorie, actions alignées sur le coût.
                    if (v === 'Attaque') {
                      const attacked = data.attackedCategory || data.category;
                      const levels = Math.max(1, parseInt(data.attackLevels, 10) || 1);
                      onChange('attackedCategory', attacked);
                      onChange('attackLevels', levels);
                      onChange('actionsSpent', attackCost(levels, data.category, attacked, dealer));
                    }
                    if (v === 'Obstruction' && !data.obstructionTarget) {
                      onChange('obstructionTarget', 'rumeurs');
                      onChange('obstructedCategory', data.category);
                      onChange('obstructionScope', ALL_SPECIALTIES);
                    }
                  }} />
                </>
              ) : (
                <>
                  <FieldLabel>Action globale (niv. ≤ {reachLevel})</FieldLabel>
                  <StyledSelect value={data.actionName} onChange={v => onChange('actionName', v)}
                    placeholder={availableGlobalActions.length ? 'Choisir une action' : 'Augmente ton niveau'}
                    options={[
                      ...availableGlobalActions.map(a => ({ value: a.name, text: levelText(a.level, a.name), label: <LevelLabel level={a.level} name={a.name} color={levelColor} /> })),
                      ...(nextLevelAction ? [{ value: nextLevelAction.name, text: levelText(nextLevelAction.level, nextLevelAction.name), label: <LevelLabel level={nextLevelAction.level} name={nextLevelAction.name} reach color={levelColor} /> }] : []),
                    ]} />
                </>
              )}
            </div>
            {isCiblee && !['Obstruction', 'Attaque', 'Défense', 'Soutien'].includes(data.actionName) && (
              <div>
                <FieldLabel>Influence ciblée</FieldLabel>
                <StyledInput value={data.influenceName || ''} onChange={v => onChange('influenceName', v)} placeholder="Nom du personnage / influence..." />
              </div>
            )}
          </div>

          {!isCiblee && isRumeur && (() => {
            // Spécialités couvertes : celles du profil dans la catégorie, reprises à l'envoi du formulaire.
            const covered = profileRumorSpecs(mySpecs);
            return (
              <div className="rounded-xl p-4 space-y-3" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}30` }}>
                <p className="text-[12.5px] leading-relaxed text-zinc-300">
                  Tu apprends les usages de l'influence {CAT_NAME[data.category]} des 3 derniers mois joués (mois en cours compris ; un mois sans cycle ne compte pas)
                  en lien avec tes spécialisations {CAT_NAME[data.category]}. Le nom des personnages responsables n'est jamais révélé.
                </p>
                <div>
                  <FieldLabel>Spécialités couvertes (ton profil)</FieldLabel>
                  {covered.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {covered.map(spec => (
                        <span key={spec} className="px-2.5 py-1 rounded-lg text-[12px]"
                          style={{ color: accentLight, background: `${accentColor}18`, border: `1px solid ${accentColor}66` }}>{spec}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px]" style={{ color: '#f7a8ac' }}>Aucune spécialité {CAT_NAME[data.category]} dans ton profil : ajoute-les pour recevoir des rumeurs.</p>
                  )}
                </div>
              </div>
            );
          })()}

          {isCiblee && data.actionName === 'Attaque' && (() => {
            const attacked = data.attackedCategory || data.category;
            const levels = Math.max(1, parseInt(data.attackLevels, 10) || 1);
            const cost = attackCost(levels, data.category, attacked, dealer);
            const spent = Math.max(1, parseInt(data.actionsSpent, 10) || 1);
            return (
              <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(229,72,79,0.05)', border: '1px solid rgba(229,72,79,0.22)' }}>
                <p className="text-[12.5px] leading-relaxed text-zinc-300">
                  Tu attaques une influence pour en réduire le niveau. Tu dois l'avoir vue agir, l'avoir pistée, ou avoir été attaqué par elle ;
                  savoir à qui elle appartient n'est pas nécessaire. Coût : {attackRate(data.category, attacked, dealer)} action{attackRate(data.category, attacked, dealer) > 1 ? 's' : ''} par niveau retiré{dealer && attacked === data.category ? ' (Transactions louches)' : ''}
                  ({attacked === data.category ? 'même catégorie' : 'catégorie opposée'}). La défense de la cible réduit ton attaque.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Influence attaquée</FieldLabel>
                    <StyledSelect value={attacked} onChange={v => { onChange('attackedCategory', v); onChange('actionsSpent', attackCost(levels, data.category, v, dealer)); }} options={[{ value: 'gotha', label: 'Gotha' }, { value: 'pegre', label: 'Pègre' }]} />
                  </div>
                  <div>
                    <FieldLabel>Niveaux à retirer</FieldLabel>
                    <StyledInput type="number" min={1} max={10} value={levels} onChange={v => { onChange('attackLevels', v); onChange('actionsSpent', attackCost(v, data.category, attacked, dealer)); }} />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Influence visée</FieldLabel>
                    <StyledInput value={data.targetDescription || ''} onChange={v => onChange('targetDescription', v)} placeholder="Ex. le réseau Police de la Pègre qui a couvert l'incendie" />
                  </div>
                  <div>
                    <FieldLabel>Personnage (si tu le connais)</FieldLabel>
                    <StyledSelect value={data.targetCharacter || ''} onChange={v => onChange('targetCharacter', v)} placeholder="Inconnu"
                      options={[{ value: '', label: 'Inconnu' }, ...directory.map(d => ({ value: d.name, label: d.name }))]} />
                  </div>
                  <div>
                    <FieldLabel>Comment tu la connais</FieldLabel>
                    <StyledSelect value={data.attackGround || ''} onChange={v => onChange('attackGround', v)} placeholder="Choisir" options={ATTACK_GROUNDS} />
                  </div>
                </div>
                <p className="text-[12.5px] font-bold" style={{ color: spent >= cost ? '#9fd8b8' : '#f7a8ac' }}>
                  Coût : {cost} action{cost > 1 ? 's' : ''} pour {levels} niveau{levels > 1 ? 'x' : ''} — {spent} dépensée{spent > 1 ? 's' : ''}{spent < cost ? ' : pas assez' : ''}
                </p>
              </div>
            );
          })()}

          {isCiblee && data.actionName === 'Défense' && (
            <p className="rounded-xl p-4 text-[12.5px] leading-relaxed text-zinc-300" style={{ background: 'rgba(159,216,184,0.05)', border: '1px solid rgba(159,216,184,0.22)' }}>
              Chaque action de défense réduit d'1 niveau <b>chaque</b> attaque de ce cycle contre ton influence {CAT_NAME[data.category]}.
              Elle ne protège pas ton influence {data.category === 'gotha' ? 'Pègre' : 'Gotha'}.
            </p>
          )}

          {isCiblee && data.actionName === 'Soutien' && (
            <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(95,160,242,0.05)', border: '1px solid rgba(95,160,242,0.2)' }}>
              <p className="text-[12.5px] leading-relaxed text-zinc-300">
                Tu prêtes tes actions pour monter temporairement l'influence {CAT_NAME[data.category]} d'un autre personnage (jusqu'à la fin du cycle) :
                passer de N à N+1 coûte N actions, jusqu'au niveau 10. Pas de soutien entre catégories, ni sur toi-même.
                C'est la seule action ciblée possible vers un personnage d'une autre ville.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex gap-2">
                  {[{ v: false, l: 'Dans notre ville' }, { v: true, l: 'Dans une autre ville' }].map(o => (
                    <button key={String(o.v)} type="button" onClick={() => onChange('supportOutside', o.v)}
                      className="flex-1 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: Boolean(data.supportOutside) === o.v ? '#5fa0f2' : '#b5aaa8', border: `1px solid ${Boolean(data.supportOutside) === o.v ? 'rgba(95,160,242,0.5)' : 'rgba(255,255,255,0.08)'}` }}>{o.l}</button>
                  ))}
                </div>
                {data.supportOutside ? (
                  <>
                    <div><FieldLabel>Ville</FieldLabel><StyledInput value={data.supportCity || ''} onChange={v => onChange('supportCity', v)} placeholder="Ex. Bordeaux" /></div>
                    <div><FieldLabel>Personnage soutenu</FieldLabel><StyledInput value={data.targetCharacter || ''} onChange={v => onChange('targetCharacter', v)} placeholder="Nom du personnage" /></div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <FieldLabel>Personnage soutenu</FieldLabel>
                    <StyledSelect value={data.targetCharacter || ''} onChange={v => onChange('targetCharacter', v)} placeholder="Choisir"
                      options={directory.map(d => ({ value: d.name, label: d.name }))} />
                  </div>
                )}
              </div>
            </div>
          )}

          {isCiblee && data.actionName === 'Obstruction' && (() => {
            const obstructedCategory = data.obstructedCategory || data.category;
            const target = data.obstructionTarget || 'rumeurs';
            return (
              <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(95,160,242,0.05)', border: '1px solid rgba(95,160,242,0.2)' }}>
                <p className="text-[12.5px] leading-relaxed text-zinc-300">
                  Ton obstruction gêne tous les autres personnages qui tentent cette activité via la catégorie choisie, pendant ce cycle :
                  chaque action dépensée leur coûte une action de plus. Elle ne gêne que les actions globales.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Catégorie obstruée</FieldLabel>
                    <StyledSelect value={obstructedCategory} onChange={v => { onChange('obstructedCategory', v); onChange('obstructedAction', ''); }}
                      options={[{ value: 'gotha', label: 'Gotha' }, { value: 'pegre', label: 'Pègre' }]} />
                  </div>
                  <div>
                    <FieldLabel>Activité obstruée</FieldLabel>
                    <StyledSelect value={target === 'rumeurs' ? 'rumeurs' : 'autre'} onChange={v => onChange('obstructionTarget', v)} options={OBSTRUCTION_TARGETS} />
                  </div>
                  {target === 'rumeurs' && (
                    <div className="col-span-2">
                      <FieldLabel>Spécialité des rumeurs visées</FieldLabel>
                      <StyledSelect value={data.obstructionScope || ALL_SPECIALTIES} onChange={v => onChange('obstructionScope', v)}
                        options={[{ value: ALL_SPECIALTIES, label: 'Les 15 spécialités à la fois' }, ...INFLUENCE_SPECIALIZATIONS]} />
                    </div>
                  )}
                  {target !== 'rumeurs' && (
                    <div className="col-span-2">
                      <FieldLabel>Activité visée</FieldLabel>
                      <StyledInput value={data.obstructionText || ''} onChange={v => onChange('obstructionText', v)} placeholder="Ex. acquérir des armes au marché noir, dissimuler un crime…" />
                      <p className="mt-2 text-xs text-zinc-400">Décris précisément ce que tu veux empêcher. Le conteur déterminera toutes les actions concernées.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {!isCiblee && (
            <div>
              <FieldLabel>Nom de l'influence utilisée</FieldLabel>
              <StyledInput value={data.influenceName || ''} onChange={v => onChange('influenceName', v)} placeholder="Ex: Réseau Police, Contacts Média..." />
            </div>
          )}

          <div>
            <FieldLabel>Intentions Narratives</FieldLabel>
            <textarea
              value={data.description}
              onChange={e => onChange('description', e.target.value)}
              rows={3}
              className="w-full py-3 px-4 rounded-xl text-[13px] font-serif leading-relaxed text-zinc-300 outline-none resize-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              placeholder="Décrivez votre action..."
              onFocus={e => {
                e.target.style.borderColor = accentColor + '33';
                e.target.style.background = 'rgba(255,255,255,0.08)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.09)';
                e.target.style.background = 'rgba(255,255,255,0.05)';
              }}
            />
          </div>

        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, accentColor, onAdd, addLabel }) {
  return (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: `1px solid ${accentColor}15` }}>
      <div className="flex items-center gap-2.5">
        <Icon size={13} style={{ color: accentColor + '80' }} />
        <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: accentColor + '80' }}>
          {label}
        </span>
      </div>
      <button type="button" onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all"
        style={{
          background: `${accentColor}08`,
          border: `1px solid ${accentColor}20`,
          color: accentColor + 'cc',
        }}>
        <Plus size={11} /> {addLabel}
      </button>
    </div>
  );
}

// Spécialités du profil en tête (avec le nom du réseau), puis les autres.
function specOptions(mySpecs) {
  const mine = [...new Map(mySpecs.filter(m => m.spec).map(m => [m.spec, m])).values()];
  return [
    { value: '', label: 'Aucune' },
    ...mine.map(m => ({ value: m.spec, text: m.spec, label: <span>{m.spec}{m.name && <span className="font-normal opacity-60"> — {m.name}</span>}</span> })),
    ...INFLUENCE_SPECIALIZATIONS.filter(sp => !mine.some(m => m.spec === sp)).map(sp => ({ value: sp, label: sp })),
  ];
}

export default function InfluenceForm({ initialData, cycle, character, onSubmit, onCancel, directory = [] }) {
  const sheet = sheetOf(character);
  const [gothaActions, setGothaActions] = useState(
    initialData?.actions?.filter(a => a.category === 'gotha') || []
  );
  const [pegreActions, setPegreActions] = useState(
    initialData?.actions?.filter(a => a.category === 'pegre') || []
  );

  const updateAction = (list, setList, id, field, value) => {
    setList(current => current.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const missingSpecs = rumorsMissingSpecs([...gothaActions, ...pegreActions], sheet);
  const missingActivity = [...gothaActions, ...pegreActions].some(missingObstructionActivity);

  // Atouts du profil copiés sur les actions concernées (le conteur ne lit pas les profils).
  const dealer = character?.clan === 'Ravnos' && Boolean(sheet.transactionsLouches);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (missingSpecs.length || missingActivity) return;
    const actions = withProfileRumorSpecs([...gothaActions, ...pegreActions], sheet).map(a => (
      a.actionType === 'ciblée' && a.actionName === 'Attaque' ? { ...a, transactionsLouches: dealer } : a));
    onSubmit({ actions });
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-500 mb-2">
            {cycle.label}
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#ece4e0] italic leading-none"
            style={{ textShadow: '0 0 30px rgba(180,83,9,0.1)' }}>
            Influences du Cycle
          </h2>
        </div>
        <button onClick={onCancel}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-300 transition-all"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* Gotha */}
        <div className="space-y-4">
          <SectionHeader
            icon={Shield} label="Gotha" accentColor="#d97706"
            onAdd={() => setGothaActions([...gothaActions, EMPTY_ACTION('gotha', sheet)])}
            addLabel="Ajouter"
          />
          {gothaActions.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed"
              style={{ borderColor: 'rgba(217,119,6,0.1)' }}>
              <p className="font-serif italic text-zinc-400 text-sm">Aucune action Gotha ce mois-ci.</p>
            </div>
          ) : gothaActions.map(act => (
            <ActionInfluenceBlock key={act.id} data={act} directory={directory} mySpecs={sheet.gotha.specs} dealer={dealer}
              onChange={(f, v) => updateAction(gothaActions, setGothaActions, act.id, f, v)}
              onRemove={() => setGothaActions(gothaActions.filter(a => a.id !== act.id))}
            />
          ))}
        </div>

        {/* Pègre */}
        <div className="space-y-4">
          <SectionHeader
            icon={Skull} label="Pègre" accentColor="#a995d8"
            onAdd={() => setPegreActions([...pegreActions, EMPTY_ACTION('pegre', sheet)])}
            addLabel="Ajouter"
          />
          {pegreActions.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed"
              style={{ borderColor: 'rgba(169,149,216,0.1)' }}>
              <p className="font-serif italic text-zinc-400 text-sm">Aucune action Pègre ce mois-ci.</p>
            </div>
          ) : pegreActions.map(act => (
            <ActionInfluenceBlock key={act.id} data={act} directory={directory} mySpecs={sheet.pegre.specs} dealer={dealer}
              onChange={(f, v) => updateAction(pegreActions, setPegreActions, act.id, f, v)}
              onRemove={() => setPegreActions(pegreActions.filter(a => a.id !== act.id))}
            />
          ))}
        </div>

        {/* Submit */}
        {missingActivity && <p role="alert" className="text-sm text-red-300">Décris l’activité visée par chaque obstruction avant de soumettre.</p>}
        {missingSpecs.length > 0 && <p id="rumor-specs-required" role="alert" className="text-sm text-red-300">
          Pour soumettre une rumeur, renseigne d’abord tes spécialités {missingSpecs.map(c => CAT_NAME[c]).join(' et ')} dans ton profil.
        </p>}
        <button type="submit" disabled={missingSpecs.length > 0 || missingActivity} aria-describedby={missingSpecs.length ? 'rumor-specs-required' : undefined}
          className="disabled:opacity-40 disabled:cursor-not-allowed w-full py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-[0.25em] transition-all hover:opacity-80 active:scale-[0.99] flex items-center justify-center gap-3"
          style={{
            background: 'transparent',
            border: '1px solid rgba(180,83,9,0.4)',
            color: '#d97706',
          }}>
          <span className="w-4 h-px bg-amber-800" />
          Soumettre les Influences
          <span className="w-4 h-px bg-amber-800" />
        </button>
      </form>
    </div>
  );
}
