import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {spaceMarineCard} from './space-marines-card-data';
import {spaceMarineWeaponCount} from './space-marines-loadouts';
import {spaceMarineKeywords} from './space-marines-keywords';
import {spaceMarineFormations} from './space-marines-formations';
import {spaceMarineFormationHasDeepStrike} from './space-marines-datasheet-core';
import {spaceMarineAgentName} from './space-marines-data';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightWeaponCount} from './knight-loadouts';
import {isSpaceMarineChapterArmy,chapterSelectedDetachments,selectedChapterUpgrade} from './space-marine-chapters-upgrades';
import {chapterSplitPlans,chapterPartRoster,type ChapterSplitPart} from './space-marine-chapters-splits';
import {CHAPTER_STRATAGEMS} from './space-marine-chapters-detachments.generated';
export {CHAPTER_DETACHMENTS,CHAPTER_TRAITS,CHAPTER_STRATAGEMS,CHAPTER_UPGRADES} from './space-marine-chapters-detachments.generated';
export {currentChapterDetachment,eligibleChapterUpgrades,selectedChapterUpgrade} from './space-marine-chapters-upgrades';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Form={root:RosterInstance;members:readonly RosterInstance[];models:number;part?:ChapterSplitPart;partRoster?:readonly RosterInstance[]};
const source='https://wahapedia.ru/wh40k11ed/factions/space-marines/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const incoming=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const agentProfiles=new Map<string,{name:string;phase:string;abilities:string[]}[]>(ASSIGNED_AGENT_DATA.map(d=>[d.sheet.unit,d.weapons.map(w=>({name:w.name,phase:w.type==='Ranged'?'Shooting':'Fight',abilities:w.abilities.split(',').map(a=>a.trim()).filter(Boolean)}))]));
const stealth='Until phase end, this formation has Stealth, giving the Benefit of Cover against ranged attacks. Cover changes Ballistic Skill, not the Hit roll, and does not change fixed snap-shot Hit rolls.';
const obscured=stealth+' Its detection range is also reduced by 3″ until phase end.';
const doctrine='Select one Combat Doctrine for this formation until the start of your next Command phase. Unless an explicit rule permits multiple doctrines, it replaces its previous doctrine; this does not spend an army-wide doctrine use.';
const mobile='It gains Mobile until phase end: its models can move horizontally through dense terrain. This does not permit vertical movement through floors or ending inside solid terrain; apply the other requirements of that move.';
const effects:Record<typeof CHAPTER_STRATAGEMS[number]['id'],string>={
 '000011076002':'Before this Sword Brethren formation fights, its melee attacks gain +2 Strength against Monster or Vehicle targets until phase end.',
 '000011076003':'When an enemy engaged with this Sword Brethren formation is selected to Fall Back in the opponent’s Movement phase, force that enemy to use desperate escape. Until phase end, enemies engaged with this formation must use desperate escape when selected to Fall Back, with −1 to their hazard rolls if battle-shocked.',
 '000011076004':'After this Sword Brethren formation ends a Charge move in your Charge phase, choose one enemy engaged with it. Roll one D6 for each actual model in this formation engaged with that chosen enemy; each 4+ inflicts one mortal wound, to a maximum of 6.',
 '000011173003':'Before this Astartes Infantry formation fights, its melee attacks gain Precision until phase end.',
 '000011173006':'Before this Chaplain or Judiciar formation fights, its melee attacks may re-roll Hit rolls of 1 until phase end. Against Monster or Vehicle targets, they may also re-roll Wound rolls of 1.',
 '000011173007':'When this Astartes Infantry formation is selected to Pile In or Consolidate, that particular move may be up to D3+3″. Retain the normal requirements of the selected move; this does not increase both moves automatically.',
 '000011173004':'When an enemy ends a move within 8″ of this Astartes Infantry formation in the opponent’s Movement phase, this formation may make a Surge move up to D6″. Apply normal Surge restrictions and ending requirements.',
 '000011173002':'After an enemy selects this Astartes Infantry formation as a Charge target in the opponent’s Charge phase, that enemy takes a Battle-shock roll with −1 to the roll.',
 '000011173005':'Before this Astartes formation shoots in your Shooting phase or fights, it may ignore modifiers to its Ballistic Skill, Weapon Skill and Hit rolls until phase end. This does not ignore Wound-roll modifiers or override snap shooting’s fixed Hit rolls.',
 '000011177002':'In your Command phase, target this Crusader formation. '+doctrine,
 '000011177004':'Before this Crusader formation fights, choose Lethal Hits or Sustained Hits 1 for its melee attacks until phase end. Apply only the chosen option.',
 '000011177003':'After enemy target selection in the opponent’s Shooting phase or either Fight phase, attacks targeting this Crusader formation suffer −1 to Wound if their Strength exceeds its Toughness. The protection lasts until phase end.',
 '000009836007':'After an enemy targets this Astartes Character formation in the opponent’s Shooting phase, '+obscured,
 '000009836004':'In your Command phase, give this Astartes Infantry formation the Character keyword until the start of your next Command phase. Record the chosen formation; this explicit unit grant applies to its models while it lasts. It does not reopen the pre-battle enhancement selection step.',
 '000009836003':'Before this Astartes formation shoots in your Shooting phase, its ranged attacks gain Sustained Hits 1 until phase end.',
 '000009836006':'At the end of the opponent’s Fight phase, place The Sanguinor, or one unengaged Astartes Jump Pack formation, in Strategic Reserves. The Sanguinor is a separate eligible alternative and need not be unengaged. Move the whole actual formation.',
 '000009836005':'In your Command phase, target this Astartes Character formation. '+doctrine,
 '000009836002':'Before this Astartes formation fights, its melee attacks gain Lethal Hits until phase end. If the formation actually has Character, those attacks also gain Lance, giving +1 to Wound if it charged this turn.',
 '000011084003':'When an enemy that was engaged with this Sanguinary Guard formation ends a Fall Back move in the opponent’s Movement phase, if this formation is now unengaged, it may make a Normal move up to D3+3″. Apply normal movement restrictions.',
 '000011084002':'After this Sanguinary Guard formation ends a Charge move in your Charge phase, choose one enemy engaged with it. Roll one D6 for each actual model in this formation engaged with that chosen enemy; each 3+ inflicts one mortal wound. This rule has no six-wound cap.',
 '000011084004':'After an enemy targets this Sanguinary Guard formation in the opponent’s Shooting phase, '+obscured,
 '000011088002':'When an enemy destroys an actual Death Company unit, target that enemy unit with this Stratagem. That enemy becomes hated until the end of the battle: friendly Death Company attacks targeting it gain +1 to Wound. Check destruction of the whole actual unit, not merely loss of an attached component; preserve the hated marker after the triggering source is gone.',
 '000011088003':'When this Death Company Dreadnought is selected to make a Normal or Advance move in your Movement phase, or a Charge move in your Charge phase, '+mobile,
 '000011088004':'After an enemy finishes shooting at this unengaged Death Company formation in the opponent’s Shooting phase, it may make a Surge move up to D6″. Apply normal Surge restrictions and ending requirements.',
 '000008775004':'After this Deathwing formation ends a Charge move in your Charge phase, choose one enemy engaged with it. Roll one D6 for each actual model in this formation engaged with that chosen enemy; each 3+ inflicts one mortal wound, to a maximum of 6.',
 '000008775002':'After enemy Fight target selection, when a model in this Deathwing formation is destroyed before the formation has been selected to fight this phase, roll a D6. Add 1 if the formation is engaged with an enemy within range of your vowed objective. On 4+, retain that model until the formation has fought or the phase ends, whichever happens first. It does not interrupt to fight immediately after the attacker.',
 '000008775003':'When this Deathwing formation with Deep Strike is selected to ingress in your Movement phase, it may set up more than 6″ horizontally from all enemies instead of more than 8″. It cannot declare a charge until the end of the turn. This does not independently grant first-round arrival or Deep Strike to an ineligible model.',
 '000010161002':'When an actual Deathwing or Ravenwing unit is destroyed while within range of an objective, you may target that destroyed unit. Secure one objective it controlled at the end of the previous phase, provided no enemy units other than Aircraft are currently within range of that objective. Check the actual whole-unit destruction trigger and the previous-phase control record.',
 '000010161003':'In either Command phase, target this Astartes formation only if it is within range of an objective. Its models gain +1 Objective Control until the end of that turn.',
 '000010161004':'Before this Astartes formation fights, its melee attacks gain Precision until phase end.',
 '000010161005':'In your Command phase, target this Deathwing or Ravenwing formation. '+doctrine,
 '000010161006':'When this Ravenwing formation is selected to move in your Movement phase or declares a charge in your Charge phase, '+mobile,
 '000010161007':'Before this Astartes Infantry or Mounted formation shoots in your Shooting phase, its ranged attacks gain +2 Strength until phase end.',
 '000011096004':'After an enemy targets this Ravenwing Fly or Mounted formation in the opponent’s Shooting phase, '+stealth,
 '000011096002':'After this Ravenwing Fly formation shoots in your Shooting phase, visible enemy units within 6″ of it gain +3″ detection range until phase end. Apply the actual visibility and distance conditions; this does not automatically reveal every enemy on the battlefield.',
 '000011096003':'After an enemy finishes shooting at this unengaged Ravenwing Fly formation in the opponent’s Shooting phase, it may make a Normal move up to D3+3″. Apply normal movement restrictions.',
 '000009852004':'In your Command phase, give this Astartes formation, excluding Monsters and Vehicles, the Character keyword until the start of your next Command phase. Record the chosen formation; this explicit unit grant applies to its models while it lasts.',
 '000009852003':'After an enemy targets this Astartes Character formation in the opponent’s Shooting phase or either Fight phase, incoming attacks have −1 Damage only until that attacking enemy has finished its attacks. The reduction does not protect against later attacking units in the phase.',
 '000009852002':'Before this Astartes Character formation fights, its melee attacks may re-roll Hit rolls of 1 and Wound rolls of 1 until phase end.',
 '000010270002':'Before this Blood Claws, Thunderwolf Cavalry or Wulfen formation fights, its melee attacks gain Lance until phase end, giving +1 to Wound if it charged this turn.',
 '000010270003':'At the end of the opponent’s Fight phase, place this Blood Claws, Thunderwolf Cavalry or Wulfen formation in Strategic Reserves only if it is unengaged and within 9″ of a battlefield edge. Move the whole actual formation.',
 '000010270004':'After an enemy finishes shooting at this unengaged Blood Claws, Thunderwolf Cavalry or Wulfen formation in the opponent’s Shooting phase, it may make a Surge move up to D6″. Apply normal Surge restrictions and ending requirements.',
 '000010661007':'After an enemy finishes shooting at this unengaged Astartes Infantry or Mounted formation in the opponent’s Shooting phase, it may make a Normal move up to D3+3″. Apply normal movement restrictions.',
 '000010661006':'In your Command phase, target this Astartes formation, excluding Monsters and Vehicles. '+doctrine,
 '000010661005':'When this Astartes Mounted or Walker formation is selected to move in your Movement phase or declares a charge in your Charge phase, '+mobile,
 '000010661004':'Before this Astartes Infantry or Mounted formation fights, its melee attacks gain Precision until phase end.',
 '000010661003':'When this Astartes Infantry or Mounted formation suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds until phase end.',
 '000010661002':'Before this Astartes Infantry formation shoots in your Shooting phase or fights, its attacks may re-roll Wound rolls of 1 and 2 until phase end.',
};

function context(army:ArmySelection,roster:readonly RosterInstance[]){
 const selected=chapterSelectedDetachments(army),has=(name:string)=>selected.includes(name),original=expandRoster(army);
 const splitEnabled=army.faction==='Space Wolves'&&original.some(s=>s.knightGear?.['Battle formation']==='Split unit');
 const battleForms=(present:readonly RosterInstance[]):Form[]=>{
  const plans=splitEnabled?chapterSplitPlans(army,present):[];
  return spaceMarineFormations(army,present).flatMap<Form>(group=>{
   const plan=plans.find(p=>p.rootId===group.root.id||p.parts.some(part=>part.members.some(s=>group.members.some(m=>m.id===s.id))));
   if(!plan)return [group];
   if(!plan.valid)return [];
   return plan.parts.filter(part=>part.models>0).map(part=>({...part,part,partRoster:chapterPartRoster(part,present)}));
  });
 };
 const forms=battleForms(roster),originalForms=battleForms(original),active=[...new Map(forms.flatMap(f=>f.members).map(s=>[s.id,s])).values()],current={...army,instances:[...active]};
 // Each part keeps its datasheet-name keyword, but mixed model keywords come
 // only from its actual assigned models and its own attached sources.
 const keywords=(f:Form,k:string,present:readonly RosterInstance[])=>f.part?
  f.members.some(s=>s.unit.toUpperCase()===k)||f.part.physical.some(m=>spaceMarineKeywords(army,m.squad,m.model,f.partRoster).has(k)):
  f.members.some(s=>spaceMarineKeywords(army,s,undefined,present).has(k));
 const kw=(f:Form,k:string)=>keywords(f,k,active),originalKw=(f:Form,k:string)=>keywords(f,k,original);
 const named=(f:Form,...names:string[])=>f.members.some(s=>names.includes(s.unit));
 const weaponKey=(name:string)=>name.split(/\s+[-–—]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
 const weapons=(f:Form,phase:'Shooting'|'Fight')=>f.members.flatMap(s=>{
  const native=spaceMarineCard(s.unit,army.faction),profiles=native?.weapons??agentProfiles.get(spaceMarineAgentName(s.unit)??'')??[];
  return profiles.filter(w=>w.phase===phase&&(f.part?f.part.physical.some(m=>m.squad.id===s.id&&m.items.some(item=>weaponKey(item)===weaponKey(w.name))):(native?spaceMarineWeaponCount(s,w.name,army.faction):knightWeaponCount(s,w.name))>0));
 });
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0,melee=(f:Form)=>weapons(f,'Fight').length>0;
 const astartes=forms.filter(f=>kw(f,'ADEPTUS ASTARTES')),infantry=astartes.filter(f=>kw(f,'INFANTRY')),characters=astartes.filter(f=>kw(f,'CHARACTER'));
 const foot=astartes.filter(f=>!kw(f,'MONSTER')&&!kw(f,'VEHICLE')),infantryMounted=astartes.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED'));
 const deathwing=astartes.filter(f=>kw(f,'DEATHWING')),ravenwing=astartes.filter(f=>kw(f,'RAVENWING')),wings=astartes.filter(f=>kw(f,'DEATHWING')||kw(f,'RAVENWING'));
 const wingFly=ravenwing.filter(f=>kw(f,'FLY')),wingSwift=ravenwing.filter(f=>kw(f,'FLY')||kw(f,'MOUNTED'));
 const deathCompany=astartes.filter(f=>kw(f,'DEATH COMPANY')),sanguinary=astartes.filter(f=>kw(f,'SANGUINARY GUARD'));
 const swords=astartes.filter(f=>kw(f,'SWORD BRETHREN SQUAD')),crusaders=astartes.filter(f=>kw(f,'CRUSADER SQUAD'));
 const beastslayers=astartes.filter(f=>kw(f,'BLOOD CLAWS')||kw(f,'THUNDERWOLF CAVALRY')||kw(f,'WULFEN'));
 const names=(fs:readonly Form[])=>fs.map(f=>f.root.id).join(', '),rows:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],rule:string)=>{
  if(units.length)rows.push({id:'11e-sm-chapter-'+id+'-'+window+'-'+turn+'-'+timing,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source,sourceRuleId:rule,origin:'detachment'});
 };
 const card=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:readonly Form[],rule:string)=>{
  emit(id,title,window,turn,timing,summary,fs.filter(f=>!f.part).map(f=>f.root),rule);
  for(const f of fs.filter(f=>f.part))emit(id+'-part-'+f.part!.originalRootId+'-'+f.part!.key,title+' · '+f.root.id,window,turn,timing,summary+' This entry concerns only the '+f.models+' actual models assigned to '+f.root.id+'; the other declared part is a separate unit.',f.members,rule);
 };
 const snap=(id:string,title:string,summary:string,fs:readonly Form[],rule:string)=>card(id,title,'Movement','opponent','end',summary,fs.filter(f=>ranged(f)&&!kw(f,'TITANIC')),rule);
 const surviving=(former:readonly Form[])=>forms.filter(f=>former.some(g=>f.part&&g.part?f.part.originalRootId===g.part.originalRootId&&f.part.key===g.part.key:f.members.some(s=>g.members.some(m=>m.id===s.id))));
 return {has,original,originalForms,forms,active,current,kw,originalKw,named,weapons,ranged,melee,astartes,infantry,characters,foot,infantryMounted,deathwing,ravenwing,wings,wingFly,wingSwift,deathCompany,sanguinary,swords,crusaders,beastslayers,names,rows,emit,card,snap,surviving};
}

export function chapterDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(!isSpaceMarineChapterArmy(army))return [];
 const {has,original,originalForms,forms,active,kw,originalKw,named,ranged,melee,astartes,infantry,characters,foot,infantryMounted,deathwing,ravenwing,wings,wingFly,wingSwift,deathCompany,sanguinary,swords,crusaders,beastslayers,rows,emit,card,snap,surviving}=context(army,roster);
 if(has('Marshal’s Household'))card('faith','Faith-fuelled Resolve','Fight','either','during','While this Sword Brethren formation is within range of an objective, its melee attacks gain +1 Attacks.',swords.filter(melee),'000011074');
 if(has('Vow-sworn Crusaders')){
  card('vows-select','Templar Vows · choose one Vow','Start of battle round','either','start','At the start of the first battle round, choose one Vow for friendly Astartes units until the end of the battle: Abhor the Witch gives melee Precision and Lance against Psykers; Accept Any Challenge gives +1 to Wound when the target’s Toughness exceeds the melee attack’s Strength; Uphold the Honour lets Infantry secure objectives at the end of your Movement phase and preserves action eligibility after its qualifying Advance. Only the selected Vow is active.',astartes,'000011171');
  card('vows-fight','Templar Vows · selected combat Vow','Fight','either','during','Apply only your selected Vow. Abhor the Witch gives melee Precision and Lance against Psyker units; Lance gives +1 to Wound only if this formation charged this turn. Accept Any Challenge gives +1 to Wound against a target whose Toughness exceeds that melee attack’s Strength. Neither benefit is active if Uphold the Honour was selected.',astartes.filter(melee),'000011171');
  card('vows-advance','Uphold the Honour · Advance','Movement','own','during','Only if Uphold the Honour is the active Vow, when this Astartes Infantry formation is selected to Advance, that particular Advance does not prevent it from starting an action.',infantry,'000011171');
  card('vows-secure','Uphold the Honour · secure objective','Movement','own','end','Only if Uphold the Honour is the active Vow, at the end of your Movement phase an objective controlled by this Astartes Infantry formation becomes secured. A secured objective follows the normal control rules after the formation moves away or is destroyed.',infantry,'000011171');
  card('vows-action','Uphold the Honour · action','Shooting','own','during','If Uphold the Honour preserved this Infantry formation’s action eligibility when it Advanced, it may start an otherwise legal action. Other action restrictions still apply; this Vow does not grant shooting while performing the action.',infantry,'000011171');
 }
 if(has('Fist of the God-Emperor'))for(const phase of phases)card('purge','Purge and Sanctify',phase,'either','during','Whenever this Crusader formation makes an otherwise permitted Surge move, it may choose the closest objective instead of a Surge target. If it does, every model must finish as close as possible to that objective. This changes the Surge destination and does not itself grant a Surge move.',crusaders,'000011175');
 if(has('Angelic Inheritors')){
  const eligible=characters.filter(f=>kw(f,'BLOOD ANGELS'));
  for(const phase of ['Shooting','Fight'] as const)card('legacy','Legacy of the Angel',phase,'either','during','This actual Blood Angels Character formation may re-roll Hit rolls of 1 and Wound rolls of 1. During snap shooting, Hit-roll re-rolls are prohibited but Wound-roll re-rolls remain available.',eligible.filter(phase==='Fight'?melee:ranged),'000009834');
  snap('legacy-snap','Legacy of the Angel · snap shooting','This Blood Angels Character formation retains re-rolls of Wound rolls of 1 during snap shooting. It cannot re-roll fixed snap-shot Hit rolls.',eligible,'000009834');
 }
 if(has('Encarmine Speartip'))for(const phase of ['Command','Movement','Shooting','Charge'] as const)card('wrath-angels','Wrath of Angels',phase,'own',phase==='Command'?'start':'during','Tactical Doctrine is active for this Sanguinary Guard formation in addition to any other Combat Doctrine. When it is selected to Fall Back while Tactical Doctrine is active, that particular Fall Back does not prevent shooting or declaring a charge. This does not spend an army-wide doctrine selection.',sanguinary,'000011082');
 if(has('Wrath of the Doomed')){
  for(const phase of phases)card('sanguinius','Sanguinius’ Fury',phase,'either','start','At the start of this phase, Assault Doctrine is active for this Death Company formation. Devastator and Tactical Doctrine cannot be active for it, regardless of other rules. Do not apply their benefits to this unit.',deathCompany,'000011086');
  card('sanguinius-advance','Sanguinius’ Fury · Assault Doctrine','Movement','own','during','When this Death Company formation is selected to Advance with Assault Doctrine active, that Advance does not prevent it from declaring a charge this turn.',deathCompany,'000011086');
  for(const phase of ['Shooting','Fight'] as const)card('hated-attacks','DEATH BEGETS VENGEANCE · previously hated enemy',phase,'either','during','Only against an enemy previously marked hated by Death Begets Vengeance, this Death Company formation’s attacks gain +1 to Wound. The hated marker lasts until battle end even after the triggering friendly unit is destroyed; it does not mark every enemy.',deathCompany.filter(phase==='Fight'?melee:ranged),'000011088002');
  snap('hated-snap','DEATH BEGETS VENGEANCE · snap shooting','Snap shots retain +1 to Wound against an enemy actually marked hated earlier by Death Begets Vengeance. That marker lasts until battle end.',deathCompany,'000011088002');
 }
 if(has('Inner Circle Task Force')){
  card('vowed-select','Vowed Target · select objective','Command','own','during','Choose one objective as your vowed objective until the start of your next Command phase. Record the chosen objective before applying the detachment’s conditional attack bonuses.',deathwing,'000008773');
  const eligible=deathwing.filter(f=>kw(f,'INFANTRY'));
  for(const phase of ['Shooting','Fight'] as const)card('vowed-attacks','Vowed Target',phase,'either','during','This Deathwing Infantry formation’s attacks gain +1 to Wound only against an enemy within range of the objective chosen in your last Command phase. The vowed objective lasts until your next Command phase starts.',eligible.filter(phase==='Fight'?melee:ranged),'000008773');
  snap('vowed-snap','Vowed Target · snap shooting','This Deathwing Infantry formation retains +1 to Wound during snap shooting against an enemy within range of the actual vowed objective, until your next Command phase starts.',eligible,'000008773');
 }
 if(has('Wrath of the Rock'))for(const [phase,turn] of incoming)card('tenacity','Dutiful Tenacity',phase,turn,'during','Attacks targeting this Astartes Infantry or Mounted formation suffer −1 to Wound only if their Strength exceeds its Toughness.',infantryMounted,'000010154');
 if(has('Darkflight Pursuit')){
  card('black-winged','Black-winged Vigilance','Shooting','either','during','This Ravenwing Fly formation’s ranged attacks have Ignores Cover, including during otherwise permitted reactive shooting.',wingFly.filter(ranged),'000011094');
  snap('black-winged-snap','Black-winged Vigilance · snap shooting','This Ravenwing Fly formation’s ranged attacks retain Ignores Cover when firing permitted snap shots.',wingFly,'000011094');
  card('black-winged-battleline','Black-winged Vigilance · Outriders','Pre-battle','either','during','Outrider Squad units gain Battleline while this detachment is selected.',astartes.filter(f=>kw(f,'OUTRIDER SQUAD')),'000011094');
 }
 if(has('Champions of Fenris'))card('countercharge','The Great Wolf Watches · Countercharge','Charge','opponent','end','Once per battle round for this Astartes Character formation, reduce the cost of targeting it with Heroic Intervention by 1 CP. The discount does not permit an extra use of the Stratagem in the phase or remove its target and charge requirements.',characters,'000009850');
 if(has('Saga of the Beastslayer'))for(const phase of ['Shooting','Fight'] as const)card('slayers','Legendary Slayers',phase,'either','during','This Blood Claws, Thunderwolf Cavalry or Wulfen formation’s attacks have Lethal Hits only against Character, Monster or Vehicle targets. Snap shooting cannot activate Lethal Hits because it cannot score Critical Hits.',beastslayers.filter(phase==='Fight'?melee:ranged),'000010268');
 if(has('Saga of the Great Wolf')){
  const vehicles=astartes.filter(f=>kw(f,'MONSTER')||kw(f,'VEHICLE')),logan=astartes.filter(f=>named(f,'Logan Grimnar'));
  const master=(suffix:string,targets:readonly Form[],condition:string)=>{
   card('wolves-advance'+suffix,'Master of Wolves · Encircling Jaws','Movement','own','during',condition+'If Assault Doctrine is active for this formation, add 1 to its Advance rolls.',targets,'000010657');
   card('wolves-charge'+suffix,'Master of Wolves · Encircling Jaws','Charge','either','during',condition+'If Assault Doctrine is active for this formation, add 1 to its Charge rolls, including otherwise permitted reactive charges.',targets,'000010657');
   card('wolves-eye'+suffix,'Master of Wolves · Hunter’s Eye','Shooting','either','during',condition+'If Devastator Doctrine is active for this formation, its ranged attacks may re-roll Hit rolls of 1. This does not apply to snap shooting, which prohibits Hit-roll re-rolls.',targets.filter(ranged),'000010657');
   for(const phase of ['Shooting','Fight'] as const)card('wolves-strike'+suffix,'Master of Wolves · Ferocious Strike',phase,'either','during',condition+'If Tactical Doctrine is active for this formation, its attacks gain Sustained Hits 1 against enemies within 9″ of it. Snap shooting cannot activate Sustained Hits.',targets.filter(phase==='Fight'?melee:ranged),'000010657');
  };
  master('',foot,'');
  card('howling-activate','Howling Onslaught','Command','own','during','Once per battle, per army, a surviving Logan Grimnar formation can use this ability in your Command phase. If used, friendly Astartes Monster and Vehicle units benefit from Master of Wolves until the start of your next Command phase. This army-wide rule requires no external visibility or distance, so Logan may use it while embarked or in Strategic Reserves.',logan,'000010657');
  if(original.some(s=>s.unit==='Logan Grimnar'))master('-howling',vehicles,'Only if Howling Onslaught was used in your last Command phase, and until your next Command phase starts, this Monster or Vehicle receives Master of Wolves. The timed effect persists if Logan Grimnar is later destroyed. ');
 }
 for(const strat of CHAPTER_STRATAGEMS){
  if(!has(strat.detachment)||strat.faction!==army.faction)continue;
  for(const {phase,turn} of strat.windows){
   const attack=(fs:readonly Form[])=>fs.filter(phase==='Fight'?melee:ranged);
   let targets:readonly Form[]=[];
   switch(strat.id){
    case '000011076002':targets=swords.filter(melee);break;
    case '000011076003':case '000011076004':targets=swords;break;
    case '000011173003':targets=infantry.filter(melee);break;
    case '000011173006':targets=astartes.filter(f=>kw(f,'CHAPLAIN')||kw(f,'JUDICIAR')).filter(melee);break;
    case '000011173007':case '000011173004':case '000011173002':case '000009836004':targets=infantry;break;
    case '000011173005':targets=attack(astartes);break;
    case '000011177002':case '000011177003':targets=crusaders;break;
    case '000011177004':targets=crusaders.filter(melee);break;
    case '000009836007':case '000009836005':case '000009852003':targets=characters;break;
    case '000009836003':targets=astartes.filter(ranged);break;
    case '000009836006':targets=astartes.filter(f=>named(f,'The Sanguinor')||kw(f,'JUMP PACK'));break;
    case '000009836002':case '000010161004':targets=astartes.filter(melee);break;
    case '000011084003':case '000011084002':case '000011084004':targets=sanguinary;break;
    case '000011088002':targets=originalForms.filter(f=>originalKw(f,'DEATH COMPANY'));break;
    case '000011088003':targets=deathCompany.filter(f=>kw(f,'DEATH COMPANY DREADNOUGHT'));break;
    case '000011088004':targets=deathCompany;break;
    case '000008775004':case '000008775002':targets=deathwing;break;
    case '000008775003':targets=deathwing.filter(f=>spaceMarineFormationHasDeepStrike(army,f,active));break;
    case '000010161002':targets=originalForms.filter(f=>originalKw(f,'DEATHWING')||originalKw(f,'RAVENWING'));break;
    case '000010161003':targets=astartes;break;
    case '000010161005':targets=wings;break;
    case '000010161006':targets=ravenwing;break;
    case '000010161007':targets=infantryMounted.filter(ranged);break;
    case '000011096004':targets=wingSwift;break;
    case '000011096002':targets=wingFly.filter(ranged);break;
    case '000011096003':targets=wingFly;break;
    case '000009852004':case '000010661006':targets=foot;break;
    case '000009852002':targets=characters.filter(melee);break;
    case '000010270002':targets=beastslayers.filter(melee);break;
    case '000010270003':case '000010270004':targets=beastslayers;break;
    case '000010661007':case '000010661003':targets=infantryMounted;break;
    case '000010661005':targets=astartes.filter(f=>kw(f,'MOUNTED')||kw(f,'WALKER'));break;
    case '000010661004':targets=infantryMounted.filter(melee);break;
    case '000010661002':targets=attack(infantry);break;
   }
   card('strat-'+strat.id,strat.name+' · '+strat.cp+' CP',phase,turn,strat.timing,effects[strat.id],targets,strat.id);
  }
 }
 // These reminders describe recorded earlier selections, never an automatic
 // keyword grant or an additional use of the originating Stratagem.
 for(const [det,id,name,predicate] of [
  ['Fist of the God-Emperor','000011177002','DOCTRINAL FLEXIBILITY',(f:Form)=>originalKw(f,'CRUSADER SQUAD')],
  ['Angelic Inheritors','000009836005','MEASURED STRATEGIST',(f:Form)=>originalKw(f,'ADEPTUS ASTARTES')&&(originalKw(f,'CHARACTER')||originalKw(f,'INFANTRY'))],
  ['Wrath of the Rock','000010161005','TACTICAL MASTERY',(f:Form)=>originalKw(f,'DEATHWING')||originalKw(f,'RAVENWING')],
  ['Saga of the Great Wolf','000010661006','GRIMNAR’S COMMAND',(f:Form)=>originalKw(f,'ADEPTUS ASTARTES')&&!originalKw(f,'MONSTER')&&!originalKw(f,'VEHICLE')],
 ] as const)if(has(det))for(const phase of ['Movement','Shooting','Charge'] as const)card('lasting-'+id,name+' · selected doctrine',phase,phase==='Movement'?'own':'either','during','Only the formation actually targeted in your last Command phase retains its chosen doctrine until your next Command phase starts. Devastator grants ranged Assault; Assault preserves charge eligibility after its qualifying Advance; Tactical preserves shooting and charge eligibility after its qualifying Fall Back. This is not another Stratagem use. Apply explicit prohibitions such as Sanguinius’ Fury.',surviving(originalForms.filter(predicate)),id);
 if(has('Wrath of the Rock'))for(const phase of ['Movement','Shooting','Charge','Fight'] as const)card('lasting-lion','LION’S WILL · selected formation',phase,'either','during','Only the Astartes formation actually targeted while within range of an objective in this turn’s Command phase retains +1 Objective Control until the end of the turn. Moving away later does not cancel that timed effect.',surviving(originalForms.filter(f=>originalKw(f,'ADEPTUS ASTARTES'))),'000010161003');
 for(const [det,id,name,eligible] of [
  ['Angelic Inheritors','000009836004','INSTANT OF GRACE',surviving(originalForms.filter(f=>originalKw(f,'ADEPTUS ASTARTES')&&originalKw(f,'INFANTRY')))],
  ['Champions of Fenris','000009852004','BIRTH OF A SAGA',surviving(originalForms.filter(f=>originalKw(f,'ADEPTUS ASTARTES')&&!originalKw(f,'MONSTER')&&!originalKw(f,'VEHICLE')))],
 ] as const)if(has(det))for(const phase of phases)card('lasting-character-'+id,name+' · selected Character unit',phase,'either','during','Only the formation actually chosen in your last Command phase retains Character until your next Command phase starts, even if its original Character models are later destroyed. This explicit unit grant applies to its surviving models while it lasts. Do not assume an unselected formation received it.'+(det==='Champions of Fenris'?' The selected formation can use Countercharge’s once-per-round Heroic Intervention discount and can be targeted by Heroic Resolve or Champion’s Guidance when their other conditions are met.':' Legacy of the Angel also requires the actual Blood Angels keyword; the temporary Character grant alone does not add a Chapter keyword. It can satisfy the Character requirement of In the Shadow of Great Wings, Measured Strategist and Focused Fury.'),eligible,id);
 return rows;
}

export function chapterUpgradeReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(!isSpaceMarineChapterArmy(army))return [];
 const {original,originalForms,forms,active,current,kw,weapons,ranged,melee,astartes,beastslayers,names,rows,emit,card,surviving}=context(army,roster);
 for(const bearer of original){
  const upgrade=selectedChapterUpgrade(army,bearer);if(!upgrade)continue;
  const former=originalForms.filter(f=>f.members.some(s=>s.id===bearer.id)),recipients=surviving(former);
  const lasting=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets:readonly Form[]=recipients)=>card('upgrade-lasting-'+upgrade.id+'-'+bearer.id+'-'+suffix,upgrade.name+' · previously selected effect',window,turn,timing,summary,targets,upgrade.id);
  if(upgrade.id==='000009835004')for(const phase of phases)emit('upgrade-revive-'+bearer.id,upgrade.name+' · '+bearer.id,phase,'either','end','Once per battle, per army, at the end of a phase in which the actual '+upgrade.bearerModels.join(' / ')+' enhancement bearer was destroyed, roll a D6. On 2+, return that model unengaged, as close as possible to where it was destroyed, with 3 wounds. It remains in its original Attached unit and returns in coherency if possible; this does not create a separate unit or reset Starting Strength.',[bearer],upgrade.id);
  if(upgrade.id==='000009835005'){
   lasting('advance','Movement','own','during','Only if '+bearer.id+' used Unto Death in this turn’s Command phase, its original surviving formation may re-roll Advance rolls until turn end. That timed effect remains if the bearer is subsequently destroyed. This is not another use of the once-per-battle, per-army ability.');
   lasting('charge','Charge','own','during','Only if '+bearer.id+' used Unto Death in this turn’s Command phase, its original surviving formation may re-roll Charge rolls until turn end, including after the bearer is destroyed. This does not grant a charge or waive its normal restrictions.');
  }
  if(upgrade.id==='000011172002')lasting('cover','Shooting','own','during','An enemy actually selected earlier this Shooting phase by '+bearer.id+' cannot receive the Benefit of Cover until phase end. The already applied effect persists if the bearer is subsequently destroyed; it does not affect an enemy that was never selected.',forms.filter(ranged));
  if(upgrade.id==='000011083003'&&!active.some(s=>s.id===bearer.id))lasting('attacks','Fight','either','during','Only if this original formation already selected Lethal Hits or Sustained Hits 1 through Angelic Executioner when selected to fight earlier this phase, retain that chosen melee effect until phase end after the bearer is destroyed. Losing the bearer before activation grants neither option.',recipients.filter(melee));
 }
 for(const bearer of active){
  const upgrade=selectedChapterUpgrade(current,bearer);if(!upgrade)continue;
  const f=forms.find(g=>g.members.some(s=>s.id===bearer.id));if(!f)continue;
  const prefix='upgrade-'+upgrade.id+'-'+bearer.id,title=upgrade.name+' · '+bearer.id;
  const row=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets:readonly Form[]=[f])=>card(prefix+'-'+suffix,title,window,turn,timing,summary,targets,upgrade.id);
  const own=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string)=>emit(prefix+'-'+suffix,title+(f.part?' · '+f.root.id:''),window,turn,timing,summary+(f.part?' The actual bearer is assigned to '+f.root.id+'; the other declared part does not contain that model.':''),[bearer],upgrade.id);
  const model=upgrade.bearerModels.length?'the actual '+upgrade.bearerModels.join(' / ')+' enhancement bearer':'the actual enhancement bearer';
  const defences=(summary:string)=>{for(const [phase,turn] of incoming)row('defence',phase,turn,'during',summary);};
  switch(upgrade.id){
   case '000011075002':
    row('charge','Charge','either','during','This upgraded Sword Brethren formation adds 1 to Charge rolls, including otherwise permitted reactive charges. This does not itself grant a charge.');break;
   case '000011075003':
    row('fight-first','Fight','either','start','While the upgraded Sword Brethren unit survives, this whole actual formation has Fights First, including its attached models. Once the last model in the upgraded source unit is destroyed, attached survivors lose this grant.');break;
   case '000011172002':
    row('select-enemy','Shooting','own','during','In your Shooting phase, select one visible enemy unit within 18″ of this bearer’s actual formation. The selected enemy cannot receive the Benefit of Cover until phase end; record the selected enemy.');break;
   case '000011172003':
    defences('While '+model+' survives, models in its whole actual formation have a 5+ invulnerable save. This is a unit benefit, including attached models, rather than a personal save for only the bearer.');break;
   case '000011172004':
    if(melee(f))row('melee','Fight','either','during','While the eligible Chaplain or Judiciar enhancement bearer survives, this whole formation’s melee attacks gain +1 Strength.');break;
   case '000011172005':case '000009835002':
    row('scouts','Pre-battle','either','during','While '+model+' remains in the unit, its whole actual formation has Scouts 6″. Apply the normal Scout deployment and move requirements to the formation; this grant does not depend on every model having Scouts printed on its datasheet.');break;
   case '000011176002':
    row('advance','Movement','own','during','This upgraded Crusader formation may re-roll Advance rolls. The grant applies to the whole actual formation while the upgraded Crusader source unit survives.');break;
   case '000011176003':
    row('action-move','Movement','own','during','When this Infantry bearer’s formation is selected to Advance or Fall Back, that particular move does not prevent it from starting an action.');
    row('action','Shooting','own','during','A qualifying Advance or Fall Back by this formation does not prevent it from starting an otherwise legal action. Other action restrictions still apply; this enhancement does not grant shooting while performing the action.');break;
   case '000009835003':
    for(const phase of phases)row('snap-protection',phase,'either','during','While '+model+' survives, enemy units cannot target its whole actual formation with snap shooting attacks. This does not prevent attacks made using normal shooting.');break;
   case '000009835004':break; // Original-bearer destruction trigger is emitted above.
   case '000009835005':
    row('activate','Command','own','during','Once per battle, per army, use Unto Death in your Command phase. If used, this bearer’s formation may re-roll Advance rolls and Charge rolls until the end of the turn. Record the use and the actual recipient formation.');break;
   case '000011083002':
    own('melee','Fight','either','during','Once per battle, per army, when this formation is selected to fight, you may use this ability. Only '+model+' gains +1 Damage on melee attacks until phase end; attached Bodyguards and other models do not gain the personal bonus.');break;
   case '000011083003':
    if(melee(f))row('choice','Fight','either','during','When this formation is selected to fight, choose Lethal Hits or Sustained Hits 1 for its melee attacks until phase end. Apply only the selected option to the whole actual formation; the eligible Jump Pack bearer must be present when the ability is used.');break;
   case '000011087002':
    row('intervention','Charge','opponent','end','When you target this actual Death Company bearer’s formation with an otherwise legal Heroic Intervention, reduce that use by 1 CP. The discount does not permit an extra use in the phase or remove the Stratagem’s target and charge requirements.');break;
   case '000011087003':
    own('melee','Fight','either','during','Only '+model+' gains +2 Attacks on melee attacks. Other Death Company models and attached Bodyguards do not gain this personal bonus.');break;
   case '000008774002':
    row('consolidate','Fight','either','during','When this bearer’s formation is selected to Consolidate, it may move up to D3+3″ instead of its normal Consolidation distance. Apply the normal Consolidation requirements. This does not increase its Pile In distance.');break;
   case '000008774003':
    for(const phase of ['Shooting','Fight'] as const)if((phase==='Fight'?melee:ranged)(f))row('attacks',phase,'either','during','While '+model+' survives, this formation’s attacks gain Sustained Hits 1 against an enemy within range of your actual vowed objective. Use the objective selected in your last Command phase, only until your next Command phase starts. Snap shooting cannot activate Sustained Hits.');break;
   case '000010155002':
    for(const phase of phases)row('aura',phase,'either','during','Friendly Astartes formations within 6″ of '+model+' may re-roll Leadership rolls, including applicable Battle-shock rolls. Measure from the actual bearer model and check that it survives when the roll is made.',astartes);break;
   case '000010155003':case '000009851002':
    row('charge','Charge','either','during','While '+model+' survives, this whole formation may re-roll Charge rolls, including otherwise permitted reactive charges. This does not grant a charge by itself.');break;
   case '000010155004':case '000011095002':
    row('first-ingress','Movement','own','during','In your first Movement phase, this upgraded formation may make an ingress move from Strategic Reserves. Apply the normal placement requirements for its actual ingress mode. This permission does not grant Deep Strike to any model; a Deep Strike ingress still requires the whole formation to qualify.');break;
   case '000010155005':
    own('melee','Fight','either','during','Only '+model+' gains +2 Strength and +1 AP on melee attacks. Other models in the formation retain their own weapon characteristics.');break;
   case '000011095003':{
    const random=(phase:'Shooting'|'Fight')=>weapons(f,phase).some(w=>'attacks' in w&&/D\d/i.test(String(w.attacks)));
    for(const phase of ['Shooting','Fight'] as const)if(random(phase))row('attack-count',phase,'either','during','This upgraded Land Speeder Vengeance formation may re-roll rolls determining an equipped weapon’s Attacks characteristic. Apply only actual variable-Attacks weapons; this is not a Hit-roll re-roll.');
    if(random('Shooting'))row('snap-count','Movement','opponent','end','During otherwise permitted snap shooting, this upgraded Land Speeder Vengeance may still re-roll the rolls determining an equipped weapon’s Attacks characteristic. Snap shooting’s prohibition on Hit-roll re-rolls does not prohibit attack-count re-rolls.');
    for(const phase of phases)row('hazards',phase,'either','during','This upgraded Land Speeder Vengeance formation may re-roll its hazard rolls, including weapon hazard rolls after otherwise permitted normal or snap shooting. Re-roll a die only once.');break;
   }
   case '000009851003':
    own('wounds','Pre-battle','either','during','Only '+model+' has +2 Wounds. Other models in this mixed or Attached unit retain their own Wounds characteristics.');
    own('melee','Fight','either','during','Only '+model+' gains +1 Strength on melee attacks. Attached Bodyguards and other models do not inherit the personal bonus.');break;
   case '000010269002':
    row('redeploy','Pre-battle','either','during','After both players deploy, redeploy up to three friendly Blood Claws, Thunderwolf Cavalry or Wulfen formations. You may place them in Strategic Reserves regardless of how many units are already there. Redeploy each whole actual Attached formation and retain any separate reserve points and setup restrictions. Eligible formations: '+names(beastslayers)+'.',beastslayers);break;
   case '000010269003':
    row('wulfen','Pre-battle','either','during','Every actual model in this bearer’s formation gains Wulfen and +2″ Move while the enhancement bearer survives. An actual Leader-capable bearer also gains the printed Leader permission for Wulfen and Wulfen with Storm Shields; this does not turn a roleless or Support-only unit into a Leader.');
    for(const phase of ['Movement','Shooting','Charge','Fight'] as const)row('move',phase,'either','during','While '+model+' survives, every actual model in this formation has Wulfen and +2″ Move. Use the modified Move characteristic for a permitted move that uses it; do not add 2″ to a separately fixed Surge, reactive move, Pile In or Consolidation limit.');break;
   case '000010660002':
    own('howl','Fight','either','start','Once per turn for this unit, at the start of the Fight phase, choose one enemy unit within 6″ of the actual Wolf Priest enhancement bearer. That enemy makes a Battle-shock roll with −1 to the roll. Measure from the bearer model, not another model in its formation.');break;
   case '000010660003':
    row('ingress','Movement','opponent','end','Once per battle round, per army, you may target this Terminator Captain’s actual formation with Rapid Ingress regardless of other uses of that Stratagem this phase, at −1 CP. This use does not prevent uses on other units this phase. This is one combined allowance shared with the enhancement’s Heroic Intervention option; retain all normal timing, reserve-arrival and placement requirements.');
    row('intervention','Charge','opponent','end','Once per battle round, per army, you may target this Terminator Captain’s actual formation with Heroic Intervention regardless of other uses of that Stratagem this phase, at −1 CP. This use does not prevent uses on other units this phase. This is the same combined allowance as its Rapid Ingress option; retain normal target and charge requirements.');break;
   case '000010660004':
    row('redeploy','Pre-battle','either','during','After both players deploy, redeploy up to three friendly Astartes formations. You may place them in Strategic Reserves regardless of how many units are already there. Redeploy each whole actual Attached formation and retain any separate reserve points and setup restrictions. Eligible formations: '+names(astartes)+'.',astartes);break;
   case '000010660005':
    if(melee(f))row('lance','Fight','either','during','While the actual Wolf Guard Battle Leader enhancement bearer survives, this formation’s melee attacks have Lance, giving +1 to Wound if it charged this turn.');break;
  }
 }
 return rows;
}
