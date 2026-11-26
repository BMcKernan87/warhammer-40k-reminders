import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {MECHANICUS_REVISION} from './mechanicus-data.generated';
import {MECHANICUS_ARMY_SHEETS,mechanicusAgentName,mechanicusMusterUnits} from './mechanicus-army-data';
import {mechanicusKeywords} from './mechanicus-keywords';
import {mechanicusFormations,mechanicusCargoFormations} from './mechanicus-transports';
import {mechanicusWeaponCount} from './mechanicus-loadouts';
import {MECHANICUS_CARDS} from './mechanicus-card-profiles.generated';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightWeaponCount} from './knight-loadouts';
import {currentMechanicusDetachment,eligibleMechanicusUpgrades} from './mechanicus-detachment-data';
import {MECHANICUS_STRATAGEMS,MECHANICUS_TL49} from './mechanicus-detachments.generated';
import {mechanicusReactionShooting} from './mechanicus-reactions';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Attack='Shooting'|'Fight';
const source='https://wahapedia.ru/wh40k11ed/factions/adeptus-mechanicus/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const incoming=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const agents=new Map<string,typeof ASSIGNED_AGENT_DATA[number]>(ASSIGNED_AGENT_DATA.map(a=>[a.sheet.unit,a]));
const sheets=new Map(MECHANICUS_ARMY_SHEETS.map(s=>[s.unit,s]));
const effects:Record<typeof MECHANICUS_STRATAGEMS[number]['id'],string>={
 '000010872003':'At the start of the opponent’s Movement phase, choose this unengaged Recon Augury formation. It has −3″ detection range until turn end.',
 '000010872002':'When this formation is selected to shoot, select an enemy visible to and within 12″ of a friendly Recon Augury formation. Its ranged attacks against that enemy have Ignores Cover until this phase ends.',
 '000010872004':'At the end of the opponent’s Fight phase, place this unengaged Infiltrators or Pteraxii formation in Strategic Reserves.',
 '000008573002':'Select this Adeptus Mechanicus Vehicle formation. Until your next Command phase starts, its models gain +3″ Move and the formation gains +1 to Advance and Charge rolls.',
 '000008573003':'Select this formation and one objective. Until your next Command phase starts, its ranged weapons have BS 3+ and Ignores Cover, but may target only units within range of that objective. Apply the fixed BS first, then any modifiers: Protector Imperative improves it to BS 2+ before other modifiers.',
 '000008573007':'Until your next Command phase starts, this formation’s models gain Feel No Pain 6+, improved to 5+ against mortal wounds.',
 '000008573004':'Select this formation only while below Starting Strength. Until your next Command phase starts, it can re-roll Hit rolls; while Below Half-strength it can also re-roll Wound rolls. Hit re-rolls do not apply to snap shooting.',
 '000008573005':'Until turn end, this formation can shoot after Falling Back and can ignore any or all modifiers to its characteristics and rolls or tests, except saving-throw modifiers.',
 '000008573006':'Until your next Command phase starts, Protector Imperative and Conqueror Imperative are both active for this formation.',
 '000008565003':'Before this Cult Mechanicus formation fights, only its CULT MECHANICUS models gain +1 to melee Wound rolls through phase end.',
 '000008565007':'After enemy target selection, only this formation’s CULT MECHANICUS models gain a 4+ invulnerable save through phase end.',
 '000008565002':'Just after a CULT MECHANICUS model is allocated a mortal wound, that model’s formation’s CULT MECHANICUS models gain Feel No Pain 4+ against mortal wounds through phase end.',
 '000008565004':'After enemy target selection, each CULT MECHANICUS model in this formation destroyed before fighting this phase rolls a D6. On 4+, it fights after the attacking unit finishes, then is removed. This lasts through phase end and does not apply to other models.',
 '000008565005':'At the start of your Movement phase, choose an enemy within 18″ of this Cult Mechanicus formation to take a Battle-shock test. If it fails, its attacks suffer −1 to Hit until your next Command phase starts.',
 '000008565006':'Roll one D6 for each enemy within 6″ of one or more CULT MECHANICUS models in this formation. Add 1 if an applicable source model is an ELECTRO-PRIEST. Each 5+ causes D3 mortal wounds to that enemy.',
 '000010748006':'Just after this Sicarian formation declares a charge, give it the following effect until phase end: after its Charge move, select an enemy in Engagement Range, roll one D6 for each model in this formation within Engagement Range of that enemy, and cause 1 mortal wound for each 4+.',
 '000010748007':'After an enemy finishes shooting, if this formation lost models to those attacks, still has Skitarii and Infantry when targeted after destroyed sources’ effects expire, and has surviving models able to shoot, it can shoot only that enemy, if eligible. This is normal shooting, not snap shooting; use only surviving models and their weapons.',
 '000010748003':'Just after this formation Falls Back, it can shoot this turn. If it is a Skitarii formation, it can also declare a charge this turn.',
 '000010748005':'Before this Skitarii Vehicle formation shoots, let its ranged attacks re-roll Damage rolls when allocated to Monster or Vehicle models, through phase end.',
 '000010748002':'Before this formation fights, its melee weapons gain Lance through phase end: +1 to Wound if the attacking unit charged this turn.',
 '000010748004':'Before this Skitarii formation shoots, give its ranged weapons either Sustained Hits 1 or Lethal Hits through phase end. Alternatively, give them both abilities and Hazardous through phase end.',
 '000008569003':'Just before this formation Consolidates, if it is more than 3″ from every enemy, it may Consolidate up to 6″ through phase end, but must finish within range of an Acquisition objective.',
 '000008569005':'Before this formation shoots, if it disembarked this turn, its ranged attacks gain +1 to Wound against enemies within range of an Acquisition objective, through phase end.',
 '000008569002':'When this entire formation is destroyed while within range of an objective you control, that objective stays yours until the enemy has a greater Level of Control over it at the end of a phase.',
 '000008569007':'After an enemy declares a charge targeting this Infantry formation, if it is within range of an Acquisition objective, it can embark in a friendly Adeptus Mechanicus Transport. Every actual model must be within 3″ and the entire formation must fit its remaining capacity.',
 '000008569006':'After an enemy selects this Infantry formation as a shooting target, select a friendly Adeptus Mechanicus Smoke formation within 6″. Both have Stealth and Benefit of Cover through phase end. Stealth grants cover under the current core rules; these do not stack into a second cover bonus.',
 '000008569004':'Select this Tech-Priest model and one objective within 24″, excluding your current Acquisition objective. The selected objective also counts as an Acquisition objective until your next Command phase starts.',
 '000009746003':'Before this formation shoots or fights, its attacks score Critical Hits on successful unmodified Hit rolls of 5+ through phase end.',
 '000009746002':'Before this formation shoots or fights, its attacks re-roll Wound rolls of 1 through phase end. If it has Halo Override, they also re-roll Hit rolls of 1.',
 '000009746004':'Select one Override ability for this formation, active until your next Command phase starts. If it already has Halo Override, it suffers D3 mortal wounds and can benefit from multiple Overrides. Otherwise it gains only the selected ability, without gaining the Halo Override keyword.',
 '000009746005':'Before this Skorpius Dunerider moves, allow Adeptus Mechanicus units disembarking from it after its Normal move to make an assault disembark move (Core Rules 18.06) until turn end.',
 '000009746006':'When this formation is selected to Fall Back, that move does not prevent it from shooting or declaring a charge. If it has Halo Override, it may re-roll hazard rolls for that move.',
 '000009746007':'After an enemy finishes a Normal, Advance or Fall Back move within 8″, this unengaged Infantry formation, excluding Kataphrons, can make a Normal move up to D6″, or up to 6″ if it has Halo Override.',
 '000010876002':'When an enemy targets this Tech-Priest formation while it is within range of an objective, worsen the Armour Penetration of attacks against it by 1, only until that enemy finishes attacking.',
 '000010876003':'When this Tech-Priest formation is selected to Fall Back, that move does not prevent it from shooting or declaring a charge.',
 '000010876004':'When this Tech-Priest formation starts an action in your Shooting phase, that action does not prevent it from shooting.',
 '000010880002':'When this Electro-Priests formation is selected to shoot or fight, its attacks against enemies within range of an objective can re-roll Hit rolls of 1 and Wound rolls of 1 through phase end.',
 '000010880003':'When this Electro-Priests formation is selected to Advance, that move does not prevent it from declaring a charge.',
 '000010880004':'After an enemy that targeted this unengaged Electro-Priests formation finishes shooting, this formation can make a Surge move up to D6″.',
 '000008386004':'Before this Skitarii formation moves, its Advances use +6″ Move instead of an Advance roll through phase end.',
 '000008386002':'After an enemy selects this non-Vehicle formation as a melee target, attacks targeting it suffer −1 to Wound through phase end.',
 '000008386005':'Before this formation shoots, its ranged attacks against enemies within the opponent’s deployment zone can re-roll Hit rolls through phase end.',
 '000008386007':'After an enemy selects this Skitarii formation as a shooting target, its models gain a 4+ invulnerable save through phase end.',
 '000008386003':'Select this Tech-Priest model and one objective within 24″. Roll one D6 for each enemy within range of that objective; on 4+, it suffers 1 mortal wound and must take a Battle-shock test.',
 '000008386006':'Before this formation shoots, its ranged weapons gain Lethal Hits through phase end.',
 '000008561004':'This Skitarii formation can declare a charge after Advancing this turn, until this Charge phase ends.',
 '000008561006':'After enemy target selection, this Skitarii Infantry formation can be selected as a ranged target only by attacking models within 18″, through phase end.',
 '000008561007':'At the end of the opponent’s Fight phase, put up to two Sicarian formations, or one Skitarii Infantry or Skitarii Mounted formation, in Strategic Reserves. Each selected formation must be more than 3″ from every enemy.',
 '000008561003':'At the start of your Shooting phase or either Fight phase, choose two distinct Skitarii formations not yet selected to shoot or fight and one enemy unit. Through phase end, their weapons improve AP by 1, but their attacks may target only that enemy if it is eligible.',
 '000008561005':'Before this formation shoots, its attacks gain +1 to Wound against a target with no other enemy units within 6″, through phase end.',
 '000008561002':'After enemy target selection, this Sicarian, Pteraxii or Sydonian formation gains Feel No Pain 5+ through phase end.'
};

export function mechanicusDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adeptus Mechanicus')return [];
 const has=(det:string)=>army.detachments2026?.some(d=>currentMechanicusDetachment(d)===det);
 const allowed=new Set(mechanicusMusterUnits(army)),active=roster.filter(s=>allowed.has(s.unit));
 const forms=mechanicusFormations(army,active);
 type Form=typeof forms[number];
 const tag=(s:RosterInstance,k:string)=>mechanicusKeywords(army,s).has(k);
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const selected=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 const validUpgrade=(s:RosterInstance,name:string)=>selected(s)===name&&eligibleMechanicusUpgrades(army,s.unit,s.id).some(u=>u.name===name);
 const weapons=(f:Form,phase:Attack,modelKeyword?:string):{s:RosterInstance;name:string;abilities:readonly string[];damage:string}[]=>f.members.flatMap(s=>{
  if(modelKeyword&&!tag(s,modelKeyword))return [];
  const card=MECHANICUS_CARDS[s.unit];
  if(card)return [...card.weapons.filter(w=>w.phase===phase&&mechanicusWeaponCount(s,w.name)>0),...(phase==='Shooting'&&validUpgrade(s,'TL-4Ø9')?[MECHANICUS_TL49]:[])].map(w=>({s,name:w.name,abilities:w.abilities,damage:w.damage}));
  const alias=mechanicusAgentName(s.unit),agent=alias&&agents.get(alias);
  return agent?agent.weapons.filter(w=>(w.type==='Ranged'?'Shooting':'Fight')===phase&&knightWeaponCount({...s,unit:alias},w.name)>0).map(w=>({s,name:w.name,abilities:w.abilities.split(', '),damage:''})):[];
 });
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0;
 const hits=(f:Form)=>weapons(f,'Shooting').some(w=>!w.abilities.includes('torrent'));
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const modelNames=(fs:readonly Form[],k:string)=>fs.flatMap(f=>f.members.filter(s=>tag(s,k)).map(s=>s.id)).join(', ');
 const modelLabels=(fs:readonly Form[],k:string)=>fs.flatMap(f=>f.members.flatMap(s=>{
  const sheet=sheets.get(s.unit),composition=sheet?.compositionBySize?.[s.models??sheet.sizes[0]];
  return composition?Object.keys(composition).filter(m=>composition[m]>0&&mechanicusKeywords(army,s,m).has(k)).map(m=>s.id+' · '+m):tag(s,k)?[s.id]:[];
 })).join(', ');
 const mech=forms.filter(f=>kw(f,'ADEPTUS MECHANICUS'));
 const filter=(key:string)=>mech.filter(f=>kw(f,key));
 const infantry=filter('INFANTRY'),skitarii=filter('SKITARII'),cult=filter('CULT MECHANICUS'),vehicles=filter('VEHICLE'),legio=filter('LEGIO CYBERNETICA'),priests=filter('TECH-PRIEST'),electro=filter('ELECTRO-PRIESTS');
 const battleline=filter('BATTLELINE'),transports=filter('TRANSPORT');
 const recon=mech.filter(f=>kw(f,'RECON AUGURY')||['PTERAXII','INFILTRATORS','RANGERS','SERBERYS RAIDERS','SERBERYS SULPHURHOUNDS'].some(k=>kw(f,k)));
 const cargo=(f:Form)=>mechanicusCargoFormations(army,f.root,active);
 const carriers=(f:Form)=>transports.filter(t=>cargo(t).some(g=>g.root.id===f.root.id));
 const reaction=(f:Form)=>mechanicusReactionShooting(army,f.root,active);
 const reactions=mech.filter(f=>ranged(f)&&reaction(f).length>0);
 const rows:GeneratedReminder[]=[];
 const emit=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],sourceRuleId?:string,reference=source)=>{
  if(units.length)rows.push({id:'11e-mechanicus-det-'+key+'-'+window+'-'+turn+'-'+timing,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source:reference,sourceRuleId,origin:'detachment'});
 };
 const card=(key:string,title:string,p:ReminderWindow,turn:Turn,timing:Timing,body:string,fs:readonly Form[],reference=source)=>emit(key,title,p,turn,timing,body,roots(fs),undefined,reference);
 const defensive=(key:string,title:string,body:string,fs:readonly Form[],reference=source)=>{for(const [p,turn] of incoming)card(key,title,p,turn,'during',body,fs,reference);};
 const snap=(key:string,title:string,body:string,fs:readonly Form[],reference=source)=>card(key,title,'Movement','opponent','end',body,fs.filter(f=>ranged(f)&&!kw(f,'TITANIC')),reference);
 if(has('Rad-Zone Corps')){
  card('rad-bombard','Rad-bombardment','Start of battle round','either','start','At the start of the first battle round, for each enemy within its deployment zone, the opponent chooses to stand firm or take cover. Roll a D6 for each: standing firm suffers D3 mortal wounds on 3+; taking cover becomes Battle-shocked and also suffers D3 mortal wounds on 5+.',mech);
  card('rad-fallout','Rad-bombardment · Fallout','Command','own','start','During battle rounds 2–5, roll one D6 for each enemy within its deployment zone. Each 3+ causes 1 mortal wound and requires that unit to take a Battle-shock test.',mech);
 }
 if(has('Skitarii Hunter Cohort'))for(const [p,t] of incoming.filter(([p])=>p!=='Fight'))card('stealth','Stealth Optimisation',p,t,'during','This Skitarii Infantry, Skitarii Mounted or Ironstrider Ballistarii formation has Stealth: its models have Benefit of Cover against ranged attacks. Cover does not stack and this is not a Hit penalty.',skitarii.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED')||f.members.some(s=>s.unit==='Ironstrider Ballistarii')));
 if(has('Data-Psalm Conclave')){
  card('benediction','Benedictions of the Omnissiah','Start of battle round','either','start','At the start of the first battle round, choose one Benediction for the battle. Panegyric Procession improves AP by 1 for CULT MECHANICUS models’ ranged attacks within half range. Citation in Savagery gives all models in a Cult Mechanicus formation +1 melee Attack and Strength when it is selected to fight after charging, through phase end.',cult);
  card('panegyric','Panegyric Procession','Shooting','own','during','If this Benediction is active, only CULT MECHANICUS models’ ranged attacks against enemies within half range improve AP by 1. Applicable models: '+modelNames(cult,'CULT MECHANICUS')+'.',cult.filter(f=>weapons(f,'Shooting','CULT MECHANICUS').length>0));
  snap('panegyric-snap','Panegyric Procession · snap shooting','If this Benediction is active and this formation uses Fire Overwatch, only its CULT MECHANICUS models’ ranged attacks within half range retain +1 AP.',cult.filter(f=>weapons(f,'Shooting','CULT MECHANICUS').length>0));
  for(const f of reactions.filter(f=>cult.includes(f)))card('panegyric-react-'+f.root.id,'Panegyric Procession · reaction shooting','Shooting','opponent','during','If surviving models shoot through '+reaction(f).join('; ')+', only the surviving CULT MECHANICUS models’ ranged attacks within half range gain +1 AP while this Benediction is active.',[f]);
  card('citation','Citation in Savagery','Fight','either','during','If this Benediction is active, when this Cult Mechanicus formation is selected to fight after charging this turn, all its models’ melee weapons gain +1 Attack and +1 Strength through phase end, including attached models.',cult);
 }
 if(has('Explorator Maniple')){
  card('acquisition','Acquisition at Any Cost','Command','own','start','Select one objective as your Acquisition objective until your next Command phase starts.',mech);
  for(const p of ['Shooting','Fight'] as const)card('acquisition-attacks','Acquisition at Any Cost',p,p==='Fight'?'either':'own','during','Only ADEPTUS MECHANICUS models re-roll Wound rolls of 1 when their formation or their target is within range of an Acquisition objective. Attached models without the faction keyword gain no re-roll.',mech.filter(f=>p==='Fight'||weapons(f,p,'ADEPTUS MECHANICUS').length>0));
  snap('acquisition-snap','Acquisition at Any Cost · snap shooting','If this formation uses Fire Overwatch, its ADEPTUS MECHANICUS models retain re-rolls of Wound rolls of 1 when their formation or target is within range of an Acquisition objective.',mech.filter(f=>weapons(f,'Shooting','ADEPTUS MECHANICUS').length>0));
  for(const f of reactions)card('acquisition-react-'+f.root.id,'Acquisition at Any Cost · reaction shooting','Shooting','opponent','during','If surviving models shoot through '+reaction(f).join('; ')+', only their ADEPTUS MECHANICUS models re-roll Wound rolls of 1 when their formation or target is within range of an Acquisition objective.',[f]);
 }
 if(has('Cohort Cybernetica')){
  card('cyber-move','Cyber-Psalm Programming','Movement','own','during','Models in this Legio Cybernetica formation gain +2″ Move, including attached models.',legio);
  for(const p of phases)card('cyber-control','Cyber-Psalm Programming · control',p,'either','during','While this Legio Cybernetica formation is not Battle-shocked, all its models gain +1 Objective Control.',legio);
 }
 if(has('Eradication Cohort')){
  for(const p of ['Shooting','Fight'] as const)card('murder','Murderous Imperative',p,p==='Fight'?'either':'own','during','Models in this Skitarii formation re-roll Hit rolls of 1 while Protector Imperative is active, and Wound rolls of 1 while Conqueror Imperative is active. Both apply when both Imperatives are active; this includes attached models.',skitarii.filter(f=>p==='Fight'||ranged(f)));
  snap('murder-snap','Murderous Imperative · snap shooting','If this Skitarii formation uses Fire Overwatch while Conqueror Imperative is active, its models retain re-rolls of Wound rolls of 1. Snap shooting ignores Hit modifiers and re-rolls and cannot score Critical Hits.',skitarii);
  for(const f of reactions)card('murder-react-'+f.root.id,'Murderous Imperative · reaction shooting','Shooting','opponent','during','If surviving models shoot through '+reaction(f).join('; ')+', their attacks re-roll Hit rolls of 1 while Protector Imperative is active and Wound rolls of 1 while Conqueror Imperative is active.',[f]);
 }
 if(has('Haloscreed Battle Clade')){
  const quota=army.battleSize2026==='Incursion'?1:2;
  const permanent=mech.filter(f=>f.root.unit==='Kastelan Robots'&&f.members.some(s=>s.id!==f.root.id&&validUpgrade(s,'Transoracular Dyad Wafers')));
  card('halo','Noospheric Transference','Command','own','during','Select '+(quota===1?'one':'one or two')+' Adeptus Mechanicus formations, including embarked formations, to gain Halo Override until your next Command phase starts. Eligible new selections: '+(names(mech.filter(f=>!permanent.includes(f)))||'none')+'. Then choose one Override for every Halo Override formation until that time: +2″ Move; +1 Toughness; charge after Advancing; or Stealth (Benefit of Cover against ranged attacks).'+(permanent.length?' Transoracular Dyad Wafers formations already have Halo Override and cannot be chosen against this limit: '+names(permanent)+'.':''),mech,MECHANICUS_REVISION.pack);
  card('halo-move','Electromotive Energisation','Movement','own','during','While this formation has Halo Override and Electromotive Energisation is selected, its models gain +2″ Move until your next Command phase starts. A formation separately granted this Override by Neural Overload also receives it for that duration.',mech);
  card('halo-charge','Predation Protocols','Charge','own','during','If Predation Protocols is active for this formation, it can declare a charge after Advancing. This lasts until your next Command phase starts.',mech);
  defensive('halo-defense','Noospheric Transference · defence','If Microactuator Bracing is active for this formation, its models have +1 Toughness. If Muted Servomotors is active, its models have Stealth (Benefit of Cover against ranged attacks). Each selected Override lasts until your next Command phase starts.',mech);
 }
 if(has('Cohort Acquisitus'))card('recon','Enhanced Augurs','Shooting','own','during','This Recon Augury formation may select one visible enemy within 12″ to analyse. That enemy has +3″ detection range until this Shooting phase ends.',recon,MECHANICUS_REVISION.pack);
 if(has('Lords of the Forge')){
  for(const p of phases)emit('warform','War-Form Mantles',p,'either','during','Only TECH-PRIEST models gain a 4+ invulnerable save and Feel No Pain 5+. Attached Bodyguards and other models do not gain either benefit. Actual recipients: '+modelLabels(priests,'TECH-PRIEST')+'.',priests.flatMap(f=>f.members.filter(s=>tag(s,'TECH-PRIEST'))),undefined,MECHANICUS_REVISION.pack);
  card('screed','Baffling Data Screed','Shooting','own','during','While a TECH-PRIEST model supplies this ability, when its formation is selected to shoot, if it is not Battle-shocked, roll one D6. On 2+, either select an enemy Vehicle within 12″ to make a Battle-shock roll at −1, or let these ranged attacks leave the formation hidden. An enemy unit cannot be selected for this ability more than once per turn. Actual source models: '+modelLabels(priests.filter(ranged),'TECH-PRIEST')+'.',priests.filter(ranged),MECHANICUS_REVISION.pack);
 }
 if(has('Luminen Auto-choir')){
  const corpus=mech.filter(f=>kw(f,'CORPUSCARII')||f.root.unit==='Corpuscarii Electro-Priests');
  card('cyberstatic-ranged','Cyber-Static Canticles','Shooting','own','during','This Corpuscarii formation’s ranged attacks have Lethal Hits, including attacks made by attached models. This cannot trigger during snap shooting.',corpus.filter(hits),MECHANICUS_REVISION.pack);
  for(const f of reactions.filter(f=>corpus.includes(f)&&hits(f)))card('cyberstatic-react-'+f.root.id,'Cyber-Static Canticles · reaction shooting','Shooting','opponent','during','If surviving models shoot through '+reaction(f).join('; ')+', their ranged attacks have Lethal Hits.',[f],MECHANICUS_REVISION.pack);
  card('cyberstatic-heal','Cyber-Static Canticles · healing','Fight','either','during','After this Fulgurite formation fights, it heals D3 wounds.',mech.filter(f=>kw(f,'FULGURITE')||f.root.unit==='Fulgurite Electro-Priests'),MECHANICUS_REVISION.pack);
 }
 for(const strat of MECHANICUS_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=mech,body=effects[strat.id],actors:RosterInstance[]|undefined;
   switch(strat.id){
    case '000010872003':targets=recon;break;
    case '000010872002':targets=recon.length?mech.filter(ranged):[];body+=' Recon Augury sources: '+names(recon)+'.';break;
    case '000010872004':targets=mech.filter(f=>kw(f,'INFILTRATORS')||kw(f,'PTERAXII'));break;
    case '000008573002':targets=vehicles;break;
    case '000008573003':targets=mech.filter(f=>(kw(f,'LEGIO CYBERNETICA')||kw(f,'VEHICLE'))&&ranged(f));break;
    case '000008573007':case '000008573004':case '000008573005':case '000008573006':targets=mech.filter(f=>kw(f,'LEGIO CYBERNETICA')||kw(f,'VEHICLE'));break;
    case '000008565003':case '000008565007':case '000008565002':case '000008565004':case '000008565005':case '000008565006':targets=cult;break;
    case '000010748006':targets=filter('SICARIAN');break;
    case '000010748007':targets=reactions;break;
    case '000010748005':targets=skitarii.filter(f=>kw(f,'VEHICLE')&&weapons(f,'Shooting').some(w=>/[dD]\d/.test(w.damage)));break;
    case '000010748004':targets=skitarii.filter(hits);break;
    case '000008569005':targets=mech.filter(f=>ranged(f)&&carriers(f).length>0);break;
    case '000008569007':targets=infantry.filter(f=>carriers(f).length>0);body+=' Possible whole-formation transports: '+targets.map(f=>f.root.id+' → '+names(carriers(f))).join('; ')+'.';break;
    case '000008569006':{const smoke=filter('SMOKE');targets=smoke.length?infantry:[];body+=' Smoke sources: '+names(smoke)+'.';break;}
    case '000008569004':case '000008386003':targets=priests;actors=priests.flatMap(f=>f.members.filter(s=>tag(s,'TECH-PRIEST')));break;
    case '000009746003':targets=mech.filter(f=>phase==='Fight'||hits(f));break;
    case '000009746002':targets=mech.filter(f=>phase==='Fight'||ranged(f));break;
    case '000009746005':targets=transports.filter(f=>f.root.unit==='Skorpius Dunerider'&&cargo(f).length>0);body+=' Formations that fit: '+targets.map(f=>f.root.id+' → '+names(cargo(f))).join('; ')+'.';break;
    case '000009746007':targets=infantry.filter(f=>!kw(f,'KATAPHRON'));break;
    case '000010876002':case '000010876003':targets=priests;break;
    case '000010876004':targets=priests.filter(ranged);break;
    case '000010880002':targets=electro.filter(f=>phase==='Fight'||ranged(f));break;
    case '000010880003':case '000010880004':targets=electro;break;
    case '000008386004':case '000008386007':targets=skitarii;break;
    case '000008386002':targets=mech.filter(f=>!kw(f,'VEHICLE'));break;
    case '000008386005':targets=mech.filter(hits);break;
    case '000008386006':targets=mech.filter(hits);break;
    case '000008561004':targets=skitarii;break;
    case '000008561006':targets=skitarii.filter(f=>kw(f,'INFANTRY'));break;
    case '000008561007':targets=mech.filter(f=>kw(f,'SICARIAN')||kw(f,'SKITARII')&&(kw(f,'INFANTRY')||kw(f,'MOUNTED')));break;
    case '000008561003':{const pairs=skitarii.filter(f=>phase==='Fight'||ranged(f));targets=pairs.length>=2?pairs:[];break;}
    case '000008561005':targets=mech.filter(f=>['SICARIAN','PTERAXII','SYDONIAN','IRONSTRIDER BALLISTARII'].some(k=>kw(f,k))||kw(f,'SKITARII')&&kw(f,'MOUNTED')).filter(ranged);break;
    case '000008561002':targets=mech.filter(f=>['SICARIAN','PTERAXII','SYDONIAN'].some(k=>kw(f,k)));break;
   }
   if(['000008386004','000008386002','000008386005','000008386007'].includes(strat.id)){
    const extras=skitarii.filter(f=>!kw(f,'BATTLELINE'));
    if(targets.some(f=>battleline.includes(f))&&extras.length)body+=' If the first target is Battleline, you may also select one non-Battleline Skitarii formation within 6″: '+names(extras)+'.';
   }
   emit(strat.id,strat.name.toLowerCase().replace(/(^| )\p{L}/gu,c=>c.toUpperCase())+' · '+strat.cp+'CP',phase,turn,strat.timing,body,actors??roots(targets),strat.id);
  }
 }
 // Enhancement reminders below are conditional on the selected bearer and
 // legal attached formation, never every unit sharing its datasheet name.
 for(const bearer of active){
  const upgrade=eligibleMechanicusUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===selected(bearer));
  if(!upgrade)continue;
  const f=forms.find(x=>x.members.some(s=>s.id===bearer.id));
  if(!f)continue;
  const leading=f.root.id!==bearer.id;
  const title=bearer.id+' · '+upgrade.name;
  const add=(p:ReminderWindow,turn:Turn,body:string,timing:Timing='during',targets:readonly RosterInstance[]=[f.root],reference=source)=>emit(upgrade.id+'-'+bearer.id,title,p,turn,timing,body,targets,upgrade.id,reference);
  const own=weapons({root:bearer,members:[bearer]},'Shooting');
  const gun=own.length>0,formationGuns=ranged(f),criticalGuns=hits(f);
  const react=reactions.includes(f);
  const defender=(body:string,targets:readonly RosterInstance[]=[f.root])=>{for(const [p,t] of incoming)add(p,t,body,'during',targets);};
  const fire=(body:string,snapBody?:string,targets:readonly RosterInstance[]=[f.root])=>{
   if(formationGuns)add('Shooting','own',body,'during',targets);
   if(react)add('Shooting','opponent','Only if surviving models shoot through '+reaction(f).join('; ')+', and the bearer is still in that shooting unit: '+body,'during',targets);
   if(snapBody&&formationGuns&&!kw(f,'TITANIC'))add('Movement','opponent','If this formation uses Fire Overwatch, '+snapBody,'end',targets);
  };
  switch(upgrade.id){
   case '000008568002':add('Command','own','At the end of your Command phase, if the bearer is within range of an Acquisition objective, roll one D6; on 4+, gain 1CP.','end',[bearer]);break;
   case '000008572002':{
    const eligible=mech.flatMap(x=>x.members.filter(s=>tag(s,'LEGIO CYBERNETICA')||tag(s,'ADEPTUS MECHANICUS')&&tag(s,'VEHICLE')));
    if(eligible.length)defender('Once per battle round, when a friendly LEGIO CYBERNETICA or ADEPTUS MECHANICUS VEHICLE model within 12″ of the bearer fails a saving throw, change that attack’s Damage to 0. Eligible actual models: '+eligible.map(s=>s.id).join(', ')+'.',[bearer,...eligible]);break;
   }
   case '000010747002':case '000009745003':add('Start of battle round','either','Protector Imperative and Conqueror Imperative are both active for the bearer’s actual formation. Apply their respective effects in the relevant phases; this does not improve snap shooting Hit rolls.','start');break;
   case '000010871002':add('Pre-battle','either','This formation has Infiltrators. Deploy it more than 8″ horizontally from the enemy deployment zone and all enemy models.');break;
   case '000010875002':if(leading){add('Start of battle round','either','At the start of the first battle round, this attached formation gains MOBILE until the end of the battle.','start',[f.root],MECHANICUS_REVISION.pack);add('Movement','own','After gaining MOBILE at the start of the first battle round, models in this formation can move horizontally through dense terrain. MOBILE alone does not allow vertical movement through it.','during',[f.root],MECHANICUS_REVISION.pack);}break;
   case '000010879002':add('Movement','own','Enemy units cannot target the bearer’s actual formation with snap shooting attacks. This does not prevent normal reaction shooting.');break;
   case '000008385002':add('Command','own','From battle round 2 onwards, while the bearer is on the battlefield, Fallout also rolls for enemies within 6″ of the opponent’s deployment zone, as well as those inside it.','start',[bearer]);break;
   case '000008560002':if(skitarii.length)add('Start of battle round','either','Select one friendly Skitarii formation within 12″ of the bearer. Both Imperatives are active for it until the next battle round starts. Eligible formations: '+names(skitarii)+'.','start',[bearer,...roots(skitarii)]);break;
   case '000009745002':if(leading&&f.root.unit==='Kastelan Robots')add('Pre-battle','either','Because the Datasmith is attached to these Kastelan Robots, models in this formation gain Halo Override until battle end. They cannot be selected against the Noospheric Transference selection limit; they still receive its chosen Override.','during',[f.root],MECHANICUS_REVISION.pack);break;
   case '000008564002':
    add('Command','either','Only the bearer has Leadership 6+.','during',[bearer]);
    for(const p of phases)if(cult.length)add(p,'either','Once per battle, at the start of a phase, select a friendly Battle-shocked Cult Mechanicus formation within 12″ of the bearer; it is no longer Battle-shocked. Eligible formations: '+names(cult)+'.','start',[bearer,...roots(cult)]);
    break;
   case '000010879003':for(const [p,t] of incoming.filter(([p])=>p!=='Fight'))add(p,t,'The bearer’s actual formation has Stealth: its models have Benefit of Cover against ranged attacks.');break;
   case '000010871003':for(const [p,t] of incoming.filter(([p])=>p!=='Fight'))add(p,t,'This Serberys Raiders formation has Lone Operative 15″: unless it is part of an Attached unit, it is not visible to enemy models outside 15″ and cannot be targeted by Indirect Fire unless the attacking model is within 15″.');break;
   case '000008572003':add('Shooting','opponent','Once per turn, at the start of the opponent’s Shooting phase, select one visible enemy Vehicle within 12″ of the bearer to take a Leadership test. If it passes, its attacks suffer −1 to Hit through phase end; if it fails, it cannot shoot this phase.','start',[bearer]);break;
   case '000008560003':add('Pre-battle','either','The bearer and all models in its actual attached formation, including another attached Leader or Support, have Infiltrators and Scouts 6″. Infiltrators deploy more than 8″ horizontally from the enemy deployment zone and enemies. In Resolve Pre-battle Abilities, a Scout move must start wholly within your deployment zone and finish more than 8″ horizontally from enemies.');break;
   case '000010875003':{
    const w=MECHANICUS_TL49;
    const profile='Only the bearer has '+w.name+' — '+w.range+'″; A '+w.attacks+'; BS '+w.skill+'+; S'+w.strength+'; AP '+w.ap+'; D '+w.damage+'. Devastating Wounds and Hazardous. After attacking, take the required Hazardous test for this weapon.';
    add('Shooting','own',profile,'during',[bearer],MECHANICUS_REVISION.pack);
    if(react)add('Shooting','opponent','Only if the bearer survives in the formation shooting through '+reaction(f).join('; ')+': '+profile,'during',[bearer],MECHANICUS_REVISION.pack);
    add('Movement','opponent','If the bearer uses Fire Overwatch, '+profile+' Snap shooting ignores BS and cannot score Critical Hits; Devastating Wounds can still trigger on Critical Wounds.','end',[bearer],MECHANICUS_REVISION.pack);break;
   }
   case '000008385003':if(leading)for(const [p,t] of incoming.filter(([p])=>p!=='Fight'))add(p,t,'While this bearer survives and is leading, its formation’s models have Stealth: Benefit of Cover against ranged attacks.');break;
   case '000008568003':if(leading)defender('While the bearer survives and leads this formation within range of an Acquisition objective, all models in the formation have a 4+ invulnerable save.');break;
   case '000008564003':defender('When an attack is allocated to the bearer itself, change its Damage characteristic to 1. Attached Bodyguards do not gain this protection.',[bearer]);break;
   case '000010747003':add('Pre-battle','either','Models in the bearer’s actual formation gain SKITARII while this enhancement applies. This grants access to Skitarii-targeted rules, but does not grant a faction keyword or a new attachment permission.');break;
   case '000008572004':{
    const eligible=mech.flatMap(x=>x.members.filter(s=>(tag(s,'LEGIO CYBERNETICA')||tag(s,'ADEPTUS MECHANICUS')&&tag(s,'VEHICLE'))&&MECHANICUS_CARDS[s.unit]?.demise));
    if(eligible.length)for(const p of phases)add(p,'either','Once per turn, when a friendly LEGIO CYBERNETICA or ADEPTUS MECHANICUS VEHICLE model with Deadly Demise is destroyed within 12″ of the bearer, its Deadly Demise automatically causes mortal wounds; do not roll to trigger it. Eligible models: '+eligible.map(s=>s.id).join(', ')+'.','during',[bearer,...eligible]);break;
   }
   case '000008568004':if(leading){
    if(criticalGuns)fire('While the bearer survives and leads this formation, its attacks against enemies within range of an Acquisition objective gain +1 to Hit.');
    add('Fight','either','While the bearer survives and leads this formation, its melee attacks against enemies within range of an Acquisition objective gain +1 to Hit.');break;
   }break;
   case '000008564004':add('Command','own','Once per battle, at the start of your Command phase, activate the Benediction you did not choose for the army for this bearer’s formation as well. Both apply until your next Command phase starts.','start');break;
   case '000009745004':fire('The bearer’s formation adds 6″ to the Range of its equipped ranged weapons and can re-roll Hazardous tests.','its equipped ranged weapons retain +6″ Range and its Hazardous tests can be re-rolled.');if(weapons(f,'Fight').some(w=>w.abilities.includes('hazardous')))add('Fight','either','This bearer’s formation may re-roll Hazardous tests, including those caused by equipped melee weapons.');break;
   case '000008385004':if(leading&&criticalGuns)fire('While the bearer survives and leads this formation, its equipped ranged weapons have Sustained Hits 1. This cannot trigger during snap shooting.');break;
   case '000010747004':fire('The bearer’s formation adds 6″ to the Range and 1 to the Strength of its equipped ranged weapons.','its equipped ranged weapons retain +6″ Range and +1 Strength.');break;
   case '000008560004':{const targets=skitarii.filter(x=>kw(x,'INFANTRY'));if(targets.length)add('Pre-battle','either','After both armies deploy, redeploy up to three Skitarii Infantry formations, including into Strategic Reserves beyond the normal allowance. Eligible formations: '+names(targets)+'.','during',[bearer,...roots(targets)]);break;}
   case '000008564005':add('Fight','either','The bearer’s actual formation has Fights First.','start');break;
   case '000010747005':add('Fight','either','Only the bearer’s own melee weapons gain +2 Attacks, +1 Armour Penetration and +1 Damage.','during',[bearer]);break;
   case '000009745005':add('Fight','either','Only the bearer’s own melee weapons gain +3 Attacks and +1 Damage.','during',[bearer]);break;
   case '000008560005':if(formationGuns)add('Shooting','own','After this formation shoots, if it is outside Engagement Range, it can make a Normal move up to 6″. If it does, it cannot declare a charge this turn.');break;
   case '000008572005':case '000008385005':if(gun){
    const anti=upgrade.id==='000008572005'?'Anti-Vehicle 4+':'Anti-Infantry 2+ and Anti-Monster 4+';
    fire('Only the bearer’s own equipped ranged weapons gain '+anti+'. These abilities cause Critical Wounds against the matching target on successful unmodified Wound rolls meeting their threshold.','only the bearer’s own equipped ranged weapons retain '+anti+'; Critical Wounds remain possible.',[bearer]);break;
   }break;
   case '000008568005':if(leading){
    for(const [p,t] of incoming)add(p,t,'While the bearer survives and leads this formation within range of an Acquisition objective, once per phase change one Hit roll, one Wound roll or one saving throw made for the formation to an unmodified 6. This is one changed roll total per phase.');
    add('Movement','opponent','If this formation uses Fire Overwatch while its surviving bearer leads it within range of an Acquisition objective, once per phase change one Hit roll, Wound roll or saving throw to an unmodified 6. This sets an unmodified result rather than adding a modifier; snap shooting still cannot score Critical Hits.','end');break;
   }break;
  }
 }
 return rows;
}
