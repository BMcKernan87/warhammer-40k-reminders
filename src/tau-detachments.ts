import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {TAU_SHEETS} from './tau-data';
import {TAU_CARDS} from './tau-card-profiles.generated';
import {tauKeywords} from './tau-keywords';
import {tauFormations,tauCargoFormations} from './tau-transports';
import {tauModelLoadouts,tauWeaponCount} from './tau-loadouts';
import {tauObserverFormations,tauGuidedFormations} from './tau-greater-good';
import {tauReactionShooting} from './tau-reactions';
import {eligibleTauUpgrades,tauSelectedDetachments} from './tau-detachment-data';
import {TAU_STRATAGEMS} from './tau-detachments.generated';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Form={root:RosterInstance;members:readonly RosterInstance[]};
const source='https://wahapedia.ru/wh40k11ed/factions/t-au-empire/';
const pack='https://assets.warhammer-community.com/eng_wh40k_faction_pack_tau_empire-sxhzmfrlud-mpzjzuhupn.pdf';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const incoming=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const native=new Set(TAU_SHEETS.map(s=>s.unit));
const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const effects:Record<typeof TAU_STRATAGEMS[number]['id'],string>={
 '000010897003':'When this Pathfinder Team or Stealth Battlesuits formation starts an action in your Shooting phase, that action does not prevent it from shooting.',
 '000010897004':'After an enemy targets this hidden Pathfinder Team or Stealth Battlesuits formation in the opponent’s Shooting phase, improve its models’ Save by 1 until the phase ends.',
 '000010897002':'At the end of your Movement phase, select one objective controlled by this Pathfinder Team or Stealth Battlesuits formation. That objective is secured.',
 '000009840003':'When this Kroot or Vespid Stingwings formation is selected to Advance, that move does not prevent it from declaring a charge this turn.',
 '000009840002':'When this Kroot or Vespid Stingwings formation is selected to shoot in your Shooting phase or fight in either Fight phase, its attacks improve AP by 1 until that phase ends.',
 '000009840004':'Before this T’au formation shoots in your Shooting phase, its ranged attacks against enemies within 9″ of a friendly Kroot or Vespid Stingwings formation gain Lethal Hits until phase end. This does not require Observer or Guided status.',
 '000009984002':'Before this Battlesuit Character formation shoots, all of its models’ ranged attacks gain +1 Strength, or +1 Strength, +1 AP and Hazardous, until this Shooting phase ends. This includes its attached Bodyguard models.',
 '000008443003':'In battle rounds 3–5 only, before this formation shoots, its ranged attacks against enemies within 9″ improve AP by 1 until your Shooting phase ends.',
 '000008443002':'In battle rounds 3–5 only, before this formation shoots, its ranged attacks against enemies within range of your Trap objective gain +1 to Wound until phase end. On the first use, choose one objective outside the opponent’s deployment zone as your Trap objective for the rest of the battle.',
 '000008443007':'At the end of the opponent’s Fight phase, place this unengaged Stealth Battlesuits, Ghostkeel or Commander Shadowsun formation in Strategic Reserves.',
 '000008443004':'Just after this formation is selected as an Observer at the start of your Shooting phase, give its attacks against its own Spotted unit +1 Ballistic Skill and, while it has Markerlight, Ignores Cover until phase end. It remains an Observer, not a Guided unit.',
 '000008443005':'Just after an enemy declares a charge targeting this T’au Infantry formation, it can embark in a friendly Transport. Every actual model must be within 3″ and the entire formation must fit the remaining capacity. The opponent can then select new charge targets.',
 '000008443006':'Just after an enemy selects this unengaged T’au Grenades formation as a charge target, that enemy immediately takes a Battle-shock test and suffers −2 to its Charge rolls until this Charge phase ends.',
 '000008822002':'Once per battle, just after this Kroot Infantry or Kroot Hounds formation is destroyed, add a new identical unit at Starting Strength in Strategic Reserves. For an Attached unit, this triggers only when the last model that started the battle in that formation is destroyed; losing only its Bodyguard or a Character does not trigger it. This cannot return destroyed Characters to Attached units. A Kroot War Shaper cannot use War Leader to discount this Stratagem when it targets its own just-destroyed Bodyguard.',
 '000008822003':'Before this Kroot formation shoots in your Shooting phase or fights, give it this effect until phase end: after its attacks, select one enemy hit by them. Further KROOT models’ attacks against that enemy improve AP by 1 until phase end, unless their attacking formation is Battle-shocked.',
 '000008822007':'After enemy shooting target selection, this Kroot formation can be targeted by ranged attacks only from models within 18″ until phase end. If this leaves the enemy with no eligible attacks, it does not trigger Krootox Riders’ Kroot Packmates return fire.',
 '000008822005':'After this Kroot formation destroys an enemy unit in a Fight phase, in the opponent’s next Command phase each enemy within 6″ of it must take a Battle-shock test, at −1 if Below Half-strength. Affected enemies need not take other Battle-shock tests that phase.',
 '000008822006':'Just after this Kroot formation Falls Back in your Movement phase, it can shoot and declare a charge for the rest of that turn.',
 '000008822004':'Just after an enemy Vehicle is selected to shoot in the opponent’s Shooting phase or fight in either Fight phase, select this Kroot Grenades formation within 8″ of it. Worsen that enemy’s weapons’ Ballistic Skill and Weapon Skill by 1 until phase end.',
 '000008812004':'At the start of your Shooting phase in battle rounds 1–3 only, choose two distinct T’au formations not yet selected to shoot and one enemy. Until phase end, their attacks improve AP by 1 but may target only that enemy, if it is an eligible target.',
 '000008812002':'Just after this non-Kroot T’au formation is destroyed, mark the enemy that destroyed it for the rest of the battle. For an Attached unit, this triggers only when the last model that started the battle in that formation is destroyed; losing only its Bodyguard or a Character does not trigger it. Non-Kroot T’au formations can re-roll Hit rolls against that enemy. This does not grant Hit re-rolls during snap shooting.',
 '000008812003':'Before this formation moves in your Movement phase, if it Advances, use +6″ Move instead of an Advance roll until phase end.',
 '000008812005':'Select this T’au Infantry formation only if it disembarked this turn. Its attacks against the closest enemy re-roll Wound rolls until your Shooting phase ends.',
 '000008812006':'After this non-Kroot T’au Infantry formation shoots, select one enemy hit by its attacks, excluding Monsters and Vehicles. That enemy is shaken until the end of the opponent’s next turn: −2″ Move and −2 to Advance and Charge rolls.',
 '000008812007':'After enemy shooting target selection, attacks allocated to this formation reduce Damage by 1 until the opponent’s Shooting phase ends, to the normal minimum of 1.',
 '000008816005':'Before this Battlesuit formation shoots in your Shooting phase, its attacks have Sustained Hits 1 against enemies containing at least 6 models, or Sustained Hits 2 against enemies containing at least 11 models, until phase end.',
 '000008816002':'Just after an actual T’au Battlesuit model is destroyed, before removing it, choose its Deadly Demise result as 1 or 6 if it has that ability. Otherwise roll one D6 for each unit within 6″; on 4+, that unit suffers D3 mortal wounds. This affects the destroyed Battlesuit model, not every model in its formation.',
 '000008816006':'After this flying Battlesuit formation resolves its attacks in your Shooting phase, if it is unengaged, it can make a Normal move. If it does, it cannot declare a charge this turn.',
 '000008816004':'When this Battlesuit formation arrives using Deep Strike in your Movement phase, set it up more than 6″ horizontally from every enemy model. It cannot declare a charge that turn. Every model in the formation must have Deep Strike; this cannot be activated with Rapid Ingress in the opponent’s turn.',
 '000008816007':'Just after an enemy declares a charge targeting this Battlesuit formation, that enemy immediately takes a Battle-shock test. Roll one D6 per model in that enemy unit; each 6 causes it 1 mortal wound.',
 '000008816003':'After enemy target selection in the opponent’s Shooting phase or either Fight phase, all models in this Battlesuit formation gain Feel No Pain 6+ until phase end.',
};

export function tauDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='T’au Empire')return [];
 const current={...army,instances:[...roster]},active=roster.filter(s=>native.has(s.unit));
 const forms:Form[]=tauFormations(army,active),originalForms=tauFormations(army,expandRoster(army).filter(s=>native.has(s.unit))),detachments=tauSelectedDetachments(current);
 const has=(name:string)=>detachments.includes(name);
 const tag=(s:RosterInstance,k:string)=>tauKeywords(current,s).has(k);
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const named=(f:Form,...names:string[])=>f.members.some(s=>names.includes(s.unit));
 const weapons=(f:Form,phase:'Shooting'|'Fight',keyword?:string)=>f.members.flatMap(s=>
  (TAU_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase===phase&&tauWeaponCount(s,w.name)>0&&(!keyword||tauModelLoadouts(s).some(b=>tauKeywords(current,s,b.model).has(keyword)&&b.items.some(i=>key(i)===key(w.name))))).map(w=>({s,...w})));
 // Firing Deck equips the carrier only for its own Shooting phase. A gunless
 // Shieldline can use attack effects when actual legal passengers supply guns.
 const deckWeapons=(f:Form)=>f.members.flatMap(carrier=>TAU_CARDS[carrier.unit]?.core?.some(c=>/^Firing Deck\b/.test(c))?
  tauCargoFormations(army,carrier,active).flatMap(g=>g.members.flatMap(s=>(TAU_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase==='Shooting'&&tauWeaponCount(s,w.name)>0).map(w=>({s:carrier,...w})))):[]);
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0||deckWeapons(f).length>0;
 const hits=(f:Form)=>[...weapons(f,'Shooting'),...deckWeapons(f)].some(w=>!w.abilities.includes('torrent'));
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const selected=(s:RosterInstance)=>current.upgrades2026?.[s.id]??current.upgrades2026?.[s.unit]??s.enhancement;
 const chosen=(s:RosterInstance,name:string)=>selected(s)===name&&eligibleTauUpgrades(current,s.unit,s.id).some(u=>u.name===name);
 const tau=forms.filter(f=>kw(f,'T’AU EMPIRE'));
 const kroot=tau.filter(f=>kw(f,'KROOT')),aux=tau.filter(f=>kw(f,'KROOT')||kw(f,'VESPID STINGWINGS'));
 const suits=tau.filter(f=>kw(f,'BATTLESUIT')),commanders=suits.filter(f=>kw(f,'CHARACTER'));
 const infantry=tau.filter(f=>kw(f,'INFANTRY')),transports=tau.filter(f=>kw(f,'TRANSPORT'));
 const scouts=tau.filter(f=>named(f,'Pathfinder Team','Stealth Battlesuits'));
 const stealth=tau.filter(f=>named(f,'Ghostkeel Battlesuit','Stealth Battlesuits'));
 const cargo=(f:Form)=>tauCargoFormations(army,f.root,active);
 const carriers=(f:Form)=>transports.filter(t=>cargo(t).some(g=>g.root.id===f.root.id));
 const observers=new Set(tauObserverFormations(army,active).map(f=>f.root.id));
 const guided=new Set(tauGuidedFormations(army,active).map(f=>f.root.id));
 const reaction=(f:Form)=>tauReactionShooting(army,f.root,active);
 const reactions=tau.filter(f=>ranged(f)&&reaction(f).length>0);
 const rows:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],rule?:string,reference=source)=>{
  if(units.length)rows.push({id:'11e-tau-det-'+id+'-'+window+'-'+turn+'-'+timing,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source:reference,sourceRuleId:rule,origin:'detachment'});
 };
 const card=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:readonly Form[],rule?:string,reference=source)=>emit(id,title,window,turn,timing,summary,roots(fs),rule,reference);
 const snap=(id:string,title:string,body:string,fs:readonly Form[],rule?:string)=>card(id,title,'Movement','opponent','end',body,fs.filter(f=>weapons(f,'Shooting').length>0&&!kw(f,'TITANIC')),rule);
 if(has('Kauyon')){
  card('patient','Patient Hunter','Shooting','own','during','In battle rounds 3–5, only T’AU EMPIRE models’ ranged weapons gain Sustained Hits 1. Guided formations may ignore any or all Ballistic Skill and Hit-roll modifiers only for attacks against Spotted enemies. This does not grant extra Sustained Hits to Guided formations.',tau.filter(hits),'000008441',pack);
  for(const f of reactions)card('patient-react-'+f.root.id,'Patient Hunter · reaction shooting','Shooting','opponent','during','In battle rounds 3–5, if surviving models shoot through '+reaction(f).join('; ')+', their T’AU EMPIRE models’ ranged weapons retain Sustained Hits 1. For the Greater Good and its Guided modifier protection are inactive outside your Shooting phase.',[f],'000008441',pack);
 }
 if(has('Mont’ka')){
  card('killing-assault','Killing Blow · Assault','Movement','own','during','In battle rounds 1–3, T’AU EMPIRE models’ ranged weapons have Assault, including Kroot and Vespid weapons. A formation with an Assault weapon can remain eligible to shoot after Advancing.',tau.filter(ranged),'000008810',pack);
  card('killing','Killing Blow','Shooting','own','during','In battle rounds 1–3, T’AU EMPIRE models’ ranged weapons have Assault. Only formations actually Guided under For the Greater Good have Lethal Hits on their ranged weapons while Guided; an Observer cannot be Guided.',tau.filter(ranged),'000008810',pack);
 }
 if(has('Retaliation Cadre')){
  const body='Only T’AU EMPIRE BATTLESUIT models’ ranged attacks gain +1 Strength against enemies within 12″ and also +1 AP against enemies within 8″. Other models do not inherit these model-specific bonuses.';
  const eligible=suits.filter(f=>weapons(f,'Shooting','BATTLESUIT').length>0);
  card('bonded','Bonded Heroes','Shooting','own','during',body,eligible,'000008814',pack);
  snap('bonded-snap','Bonded Heroes · snap shooting','If this formation uses Fire Overwatch, '+body,eligible,'000008814');
  for(const f of reactions.filter(f=>eligible.includes(f)))card('bonded-react-'+f.root.id,'Bonded Heroes · reaction shooting','Shooting','opponent','during','If surviving models shoot through '+reaction(f).join('; ')+': '+body,[f],'000008814',pack);
 }
 if(has('Kroot Hunting Pack')){
  for(const phase of ['Shooting','Fight'] as const)card('instincts','Hunter’s Instincts',phase,phase==='Fight'?'either':'own','during','Only KROOT models gain +1 to Hit against enemies below Starting Strength, and also +1 to Wound against enemies Below Half-strength.',kroot.filter(f=>phase==='Fight'||weapons(f,phase,'KROOT').length>0),'000008818');
  snap('instincts-snap','Hunter’s Instincts · snap shooting','If this formation uses Fire Overwatch, only its KROOT models retain +1 to Wound against enemies Below Half-strength. Snap shooting ignores Hit modifiers and re-rolls and cannot score Critical Hits.',kroot,'000008818');
  for(const f of reactions.filter(f=>kroot.includes(f)))card('instincts-react-'+f.root.id,'Hunter’s Instincts · reaction shooting','Shooting','opponent','during','If surviving models shoot through '+reaction(f).join('; ')+', only their KROOT models gain +1 to Hit against enemies below Starting Strength and also +1 to Wound against enemies Below Half-strength.',[f],'000008818');
  for(const [p,t] of incoming)card('skirmish','Skirmish Fighters',p,t,'during','Only KROOT models have a 5+ invulnerable save against ranged attacks and a 6+ invulnerable save against melee attacks.',kroot,'000008819');
  card('kroot-battleline','Kroot Hunting Pack · Battleline','Pre-battle','either','during','Kroot Carnivore units have Battleline while this detachment is selected. Apply the Battleline copy limit and rules to those units.',kroot.filter(f=>named(f,'Kroot Carnivores')),'000008820');
 }
 if(has('Auxiliary Cadre')){
  card('prey','Harnessed Alien Instincts','Shooting','own','during','Each Kroot or Vespid Stingwings formation may select one visible enemy within 12″. That enemy is prey-marked with +3″ detection range until this Shooting phase ends. This does not require the source formation to have ranged weapons.',aux,'000009838',pack);
  if(stealth.length){
   const body='When this Kroot or Vespid Stingwings formation has shot while within 6″ of a friendly Ghostkeel or Stealth Battlesuits formation, those attacks do not prevent it from being hidden. Eligible surviving projector sources: '+names(stealth)+'.';
   card('projectors','Localised Stealth Projectors','Shooting','own','during',body,aux.filter(ranged),'000009838',pack);
   snap('projectors-snap','Localised Stealth Projectors · snap shooting','If this formation uses Fire Overwatch: '+body,aux,'000009838');
   for(const f of reactions.filter(f=>aux.includes(f)))card('projectors-react-'+f.root.id,'Localised Stealth Projectors · reaction shooting','Shooting','opponent','during','If surviving models shoot through '+reaction(f).join('; ')+': '+body,[f],'000009838',pack);
  }
 }
 if(has('Experimental Prototype Cadre')){
  const body='This Battlesuit Character formation’s ranged attacks gain +6″ Range, including attacks made by attached Bodyguard models. This unit-level benefit ends for surviving Bodyguards if no Character remains in their formation.';
  card('craft','Superior Craftsmanship','Shooting','own','during',body,commanders.filter(ranged),'000009982',pack);
  snap('craft-snap','Superior Craftsmanship · snap shooting','If this formation uses Fire Overwatch, '+body+' Snap shooting still targets only one visible enemy within 24″.',commanders,'000009982');
 }
 if(has('Advanced Acquisition Cadre'))card('fieldcraft','Expert Fieldcraft','Shooting','own','during','When this Pathfinder Team or Stealth Battlesuits formation is selected to shoot in your Shooting phase, those ranged attacks do not prevent it from being hidden. This phase-specific ability does not apply to Fire Overwatch or other reaction shooting.',scouts.filter(ranged),'000010895',pack);

 for(const strat of TAU_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=tau,body=effects[strat.id],actors:RosterInstance[]|undefined,timing:Timing=strat.timing;
   switch(strat.id){
    case '000010897003':targets=scouts.filter(ranged);break;
    case '000010897004':case '000010897002':targets=scouts;break;
    case '000009840003':targets=aux.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000009840002':targets=aux.filter(f=>phase==='Fight'||ranged(f));break;
    case '000009840004':targets=aux.length?tau.filter(f=>!aux.includes(f)&&hits(f)):[];body+=' Auxiliary sources: '+names(aux)+'.';break;
    case '000009984002':targets=commanders.filter(ranged);break;
    case '000008443003':case '000008443002':targets=tau.filter(ranged);break;
    case '000008443007':targets=tau.filter(f=>named(f,'Stealth Battlesuits','Ghostkeel Battlesuit','Commander Shadowsun'));break;
    case '000008443004':targets=tau.filter(f=>observers.has(f.root.id)&&ranged(f));timing='start';break;
    case '000008443005':targets=infantry.filter(f=>carriers(f).length>0);body+=' Possible whole-formation transports: '+targets.map(f=>f.root.id+' → '+names(carriers(f))).join('; ')+'.';break;
    case '000008443006':targets=tau.filter(f=>kw(f,'GRENADES'));break;
    case '000008822002':targets=kroot.filter(f=>kw(f,'INFANTRY')||named(f,'Kroot Hounds'));break;
    case '000008822003':targets=kroot.filter(f=>phase==='Fight'||ranged(f));break;
    case '000008822007':case '000008822005':case '000008822006':targets=kroot;break;
    case '000008822004':targets=kroot.filter(f=>kw(f,'GRENADES'));break;
    case '000008812004':targets=tau.filter(ranged);if(targets.length<2)targets=[];break;
    case '000008812002':targets=tau.filter(f=>!kw(f,'KROOT'));break;
    case '000008812003':targets=tau.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000008812005':targets=infantry.filter(f=>ranged(f)&&carriers(f).length>0);body+=' Possible transports: '+targets.map(f=>f.root.id+' → '+names(carriers(f))).join('; ')+'.';break;
    case '000008812006':targets=infantry.filter(f=>!kw(f,'KROOT')&&ranged(f));break;
    case '000008816005':targets=suits.filter(hits);break;
    case '000008816002':actors=active.filter(s=>tag(s,'T’AU EMPIRE')&&tag(s,'BATTLESUIT'));break;
    case '000008816006':targets=suits.filter(f=>kw(f,'FLY')&&ranged(f));break;
    case '000008816004':targets=suits.filter(f=>f.members.every(s=>TAU_CARDS[s.unit]?.core?.some(c=>c==='Deep Strike')));break;
    case '000008816007':case '000008816003':targets=suits;break;
   }
   emit(strat.id,strat.name.toLowerCase().replace(/(^| )\p{L}/gu,c=>c.toUpperCase())+' · '+strat.cp+'CP',phase,turn,timing,body,actors??roots(targets),strat.id);
  }
 }

 for(const bearer of active){
  const upgrade=eligibleTauUpgrades(current,bearer.unit,bearer.id).find(u=>u.name===selected(bearer));
  if(!upgrade)continue;
  const f=forms.find(g=>g.members.some(s=>s.id===bearer.id));if(!f)continue;
  const original=originalForms.find(g=>g.members.some(s=>s.id===bearer.id));
  // Core 19.04 preserves a surviving Leader's own leading benefits after the
  // original Bodyguard dies, including the new root of two surviving Shapers.
  const leading=f.root.id!==bearer.id||!!original&&original.root.id!==bearer.id,title=bearer.id+' · '+upgrade.name;
  const add=(p:ReminderWindow,t:Turn,body:string,timing:Timing='during',units:readonly RosterInstance[]=[f.root],reference=source)=>emit(upgrade.id+'-'+bearer.id,title,p,t,timing,body,units,upgrade.id,reference);
  const personal:Form={root:bearer,members:[bearer]},guns=weapons(personal,'Shooting'),ownHits=guns.some(w=>!w.abilities.includes('torrent'));
  const normalFire=(body:string,units:readonly RosterInstance[]=[f.root])=>{
   if(ranged(f))add('Shooting','own',body,'during',units);
   if(reactions.some(r=>r.root.id===f.root.id))add('Shooting','opponent','Only if the bearer survives in the unit shooting through '+reaction(f).join('; ')+': '+body,'during',units);
  };
  switch(upgrade.id){
   case '000008811002':case '000008442005':{
    const receivers=tau.filter(g=>g.root.id!==f.root.id&&guided.has(g.root.id)&&hits(g));
    if(leading&&observers.has(f.root.id)&&receivers.length)add('Shooting','own','While the bearer survives and leads this formation, if it becomes an Observer at the start of your Shooting phase, Guided formations gain '+(upgrade.id==='000008811002'?'Sustained Hits 1':'Lethal Hits')+' on ranged attacks against this Observer’s Spotted enemy until phase end. This applies to every eligible Guided formation targeting that enemy, not a single paired unit. Eligible other formations: '+names(receivers)+'.','start',[f.root,...roots(receivers)],pack);
    break;
   }
   case '000009839002':{
    const recipients=kroot.filter(g=>named(g,'Kroot Carnivores','Kroot Farstalkers'));
    if(recipients.length)add('Pre-battle','either','In Declare Battle Formations, select up to three friendly Kroot Carnivores or Farstalkers formations to have Deep Strike, including the models attached to those selected units. Eligible formations: '+names(recipients)+'.','during',[bearer,...roots(recipients)],pack);
    break;
   }
   case '000010896002':for(const [p,t] of incoming.filter(([p])=>p!=='Fight'))add(p,t,'This Stealth Battlesuits formation has −3″ detection range.','during',[f.root],pack);break;
   case '000008442002':if(leading)add('Shooting','own','While the bearer survives and leads this formation, Patient Hunter applies to it from battle round 2: its T’AU EMPIRE models’ ranged weapons have Sustained Hits 1, and while Guided their attacks against Spotted enemies may ignore Ballistic Skill and Hit-roll modifiers.','during',[f.root],pack);break;
   case '000008821002':if(leading)add('Fight','either','While the Kroot Flesh Shaper survives and leads this formation, all its models’ melee attacks score Critical Hits on unmodified Hit rolls of 5+.');break;
   case '000008815002':{
    const body='Only the bearer gains Grenades. Each time that bearer ends a Normal move, it may select one enemy it moved over, roll six D6, and cause 1 mortal wound for each 4+. Measure the bearer’s actual path, not another model’s. Scout, Advance, Fall Back and ingress moves are not Normal moves.';
    add('Movement','own',body,'during',[bearer]);
    add('Shooting','own','If the bearer’s flying Battlesuit formation uses The Torchstar Gambit to make a Normal move after shooting: '+body,'during',[bearer]);
    break;
   }
   case '000009983002':case '000009983003':case '000009983004':{
    const weapon=upgrade.id==='000009983002'?'T’au flamer':upgrade.id==='000009983003'?'Plasma rifle':'Airbursting fragmentation projector';
    const bonus=upgrade.id==='000009983002'?'+2 Strength, +1 AP and +1 Damage':upgrade.id==='000009983003'?'+2 Strength, +1 Attack, +1 AP and +1 Damage':'+3 Strength, +1 AP and +1 Damage';
    const body='In Declare Battle Formations, select one physical '+weapon+' equipped by the bearer. Only that weapon’s attacks gain '+bonus+'; other copies and Bodyguard weapons receive no bonus. The bearer currently has '+tauWeaponCount(bearer,weapon)+' eligible '+weapon+' weapon(s).';
    add('Pre-battle','either',body,'during',[bearer],pack);
    add('Shooting','own',body,'during',[bearer],pack);
    if(!kw(f,'TITANIC'))add('Movement','opponent','If the bearer uses Fire Overwatch, the selected weapon retains its enhancement: '+body,'end',[bearer],pack);
    break;
   }
   case '000010896003':{
    const body='When this formation is selected to shoot, it may select one enemy within 24″. That enemy has +9″ detection range only until this formation finishes shooting; the effect is not shared with later shooters.';
    normalFire(body);
    if(ranged(f)&&!kw(f,'TITANIC'))add('Movement','opponent','If this formation uses Fire Overwatch: '+body,'end',[f.root],pack);
    break;
   }
   case '000008815003':if(ownHits)normalFire('Each time the bearer is selected to shoot, choose Lethal Hits or Sustained Hits 1 for only the bearer’s ranged weapons until those attacks are resolved. Attached Bodyguards do not gain the choice. Neither benefit can trigger during snap shooting.',[bearer]);break;
   case '000008821003':{
    normalFire('Only while this bearer survives, ranged weapons in its actual formation have Ignores Cover.');
    if(ranged(f)&&!kw(f,'TITANIC'))add('Movement','opponent','If this formation uses Fire Overwatch, its ranged weapons retain Ignores Cover while the bearer survives.','end');
    add('Movement','either','Enemy units entering as Reinforcements cannot be set up within 12″ horizontally of this surviving bearer, including when using a closer ingress permission. Measure from the bearer itself, not its Bodyguard.','during',[bearer]);break;
   }
   case '000008811003':if(leading){add('Movement','own','While the bearer survives and leads this formation, Killing Blow also applies in battle round 4: its T’AU EMPIRE models’ ranged weapons have Assault.','during',[f.root],pack);add('Shooting','own','While the bearer survives and leads this formation, Killing Blow also applies in battle round 4: its T’AU EMPIRE models’ ranged weapons have Assault, and while actually Guided its ranged weapons have Lethal Hits.','during',[f.root],pack);}break;
   case '000009839003':if(aux.length)add('Command','own','Select one friendly Kroot or Vespid Stingwings formation within 12″ of this bearer. Its models improve Leadership by 1 and gain +1 Objective Control until your next Command phase starts. This selected effect persists for its duration even if its source is subsequently destroyed. Eligible formations: '+names(aux)+'.','during',[bearer,...roots(aux)],pack);break;
   case '000008442003':{
    if(ownHits)normalFire('Only the bearer’s ranged attacks gain +1 to Hit; from battle round 3 onwards they also gain +1 to Wound.',[bearer]);
    else if(guns.length)normalFire('From battle round 3 onwards, only the bearer’s ranged attacks gain +1 to Wound; its Torrent weapons already hit automatically.',[bearer]);
    if(guns.length&&!kw(f,'TITANIC'))add('Movement','opponent','If the bearer uses Fire Overwatch, only its ranged attacks retain +1 to Wound from battle round 3 onwards. Snap shooting ignores the Hit modifier.','end',[bearer]);break;
   }
   case '000008442004':add('Pre-battle','either','After both players deploy, select up to three T’au formations and redeploy them. They may enter Strategic Reserves regardless of how many units are already there. Eligible formations: '+names(tau)+'.','during',[bearer,...roots(tau)]);break;
   case '000008821004':if(leading){add('Movement','own','While the Kroot Trail Shaper survives and leads this formation, all its models gain +3″ Move and its ranged weapons have Assault.');if(ranged(f))add('Shooting','own','While the Kroot Trail Shaper survives and leads this formation, its ranged weapons have Assault and can fire after Advancing.');}break;
   case '000008811004':
    add('Start of battle round','either','At the start of the first battle round, before the first turn, select one objective. While this bearer remains on the battlefield, friendly T’AU EMPIRE models within range of that objective gain +1 Objective Control.','start',[bearer,...roots(tau)]);
    for(const p of phases)add(p,'either','Only while this bearer remains on the battlefield, friendly T’AU EMPIRE models within range of the chosen Strategic Conqueror objective gain +1 Objective Control. The effect ends if the bearer is destroyed or leaves the battlefield.','during',[bearer,...roots(tau)]);
    break;
   case '000008815004':for(const p of phases)add(p,'either','Each time you target the bearer’s actual formation with a Stratagem while the bearer survives, roll one D6; on 4+, gain 1CP. This is a refund, not permission to reuse a Stratagem. The normal limit on gaining additional CP still applies.','during',[f.root],pack);break;
   case '000008815005':add('End of opponent turn','opponent','At the end of the opponent’s turn, if the bearer’s actual formation is unengaged, place it in Strategic Reserves. Move the entire attached formation together.','end');break;
   case '000008821005':{
    const body='Only weapons equipped by this Kroot War Shaper gain Precision and Devastating Wounds. At the Allocation Order step, Precision can select a visible Character’s allocation group; Devastating Wounds mortal wounds first apply to that selected group while it survives. Bodyguard weapons receive neither ability.';
    if(weapons(personal,'Fight').length)add('Fight','either',body,'during',[bearer]);
    if(guns.length){normalFire(body,[bearer]);if(!kw(f,'TITANIC'))add('Movement','opponent','If the bearer uses Fire Overwatch: '+body+' Critical Wounds can still trigger Devastating Wounds during snap shooting.','end',[bearer]);}break;
   }
   case '000008811005':{
    const recipients=tau.filter(g=>!g.members.every(s=>TAU_CARDS[s.unit]?.core?.some(c=>/^Scouts\b/.test(c))));
    if(recipients.length)add('Pre-battle','either','In Resolve Pre-battle Abilities, select up to two friendly T’au formations within 6″ of this bearer that do not have Scouts. All models in each selected formation gain Scouts 6″ until battle end, including attached models. Scout moves must start wholly within your deployment zone and finish more than 8″ horizontally from enemies. Eligible formations: '+names(recipients)+'.','during',[bearer,...roots(recipients)],pack);
    break;
   }
  }
 }
 return rows;
}
