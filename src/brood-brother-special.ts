import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {gscAlliedKeywords,gscAllyFaction,gscAlliedMusterUnits} from './gsc-allies';
import {gscFormations} from './gsc-transports';
import {knightWeaponCount} from './knight-loadouts';
import type {RosterInstance} from './roster-instances';

const guardSource='https://wahapedia.ru/wh40k11ed/factions/astra-militarum/';
const gscPack='https://assets.warhammer-community.com/eng_22-07_warhammer_40,000_faction_pack_genestealer_cults-vmkwgeydbr-sh7picbeqo.pdf';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
type Turn=NonNullable<GeneratedReminder['turn']>;
export function broodBrotherSpecialReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Genestealer Cults')return [];
 const legal=new Set(gscAlliedMusterUnits(army));
 const guards=roster.filter(s=>legal.has(s.unit)&&gscAllyFaction(s.unit)==='Astra Militarum');
 if(!guards.length)return [];
 const rows:GeneratedReminder[]=[];
 const groups=gscFormations(army,guards);
 const officers=guards.filter(s=>gscAlliedKeywords(s).has('OFFICER'));
 const walls=guards.filter(s=>s.unit==='Aegis Defence Line');
 function add(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,bearers:readonly RosterInstance[],source=guardSource){
  if(bearers.length)rows.push({id:'11e-brood-gear-'+key+'-'+window,sourceRuleId:key,title,window,turn,timing,summary,source,units:bearers.map(s=>s.id),origin:'unit'});
 }
 for(const {body,members} of groups){
  const fitted=(gear:string)=>members.filter(s=>knightWeaponCount(s,gear)>0);
  const fittedCount=(gear:string)=>members.reduce((n,s)=>n+knightWeaponCount(s,gear),0);
  const issue=(key:string,label:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,actor=body,source=guardSource)=>
   add(key+'-'+body.id,label+' · '+body.id,window,turn,timing,text,[actor],source);
  const vox=fittedCount('Vox-caster');
  if(vox){
   const bonus=officers.length?' Add 1 to the result if a friendly Officer model is within 6″ of the formation.':'';
   const limit=vox>1?' The formation rolls just once even when multiple bearers survive.':'';
   for(const phase of phases)issue('vox','Vox-caster',phase,'either','during','When you target this formation with a Stratagem and a vox-caster bearer remains, roll one D6. On 5+ gain 1CP.'+bonus+limit);
  }
  if(fittedCount('Regimental standard'))issue('standard','Regimental Standard','Command','either','during','While the standard bearer remains, add 1 to the Objective Control of each model in its formation.');
  if(fittedCount('Medi-pack'))issue('medic','Medi-pack','Command','own','start','While the medic remains, if this formation is below its Starting Strength, restore up to D3 destroyed Platoon models. Character models are ineligible.');
  const packs=fittedCount('Death Korps medi-pack');
  if(packs)issue('krieg-medic','Death Korps Medi-pack','Command','own','start','If the formation is below its Starting Strength and a medi-pack bearer remains, return up to D3 destroyed Death Korps Troopers.'+(packs>1?' With two surviving medi-pack bearers, return up to D3+1 instead.':''));
  if(fittedCount('Alchemyk Counteragents'))for(const phase of phases)issue('counteragents','Alchemyk Counteragents',phase,'either','during','While its counteragent bearer remains, models in this formation have Feel No Pain 6+ against mortal wounds.');
  for(const s of fitted('Melta mine'))for(const phase of phases)issue('melta-'+s.id,'Melta Mine',phase,'either','start','Once per battle, choose an enemy within 3″ of the model carrying the mine. On a D6 roll of 2+, deal D3 mortal wounds, or 2D3 against a Vehicle.',s);
  for(const s of fitted('Remote mine'))issue('remote-'+s.id,'Remote Mine','Shooting','own','start','Once per battle, choose a visible enemy within 9″ of the mine bearer. Roll a D6. On 3+ deal D3 mortal wounds, or 2D3 against a Vehicle or Fortification.',s);
  if(members.some(s=>s.unit==='Kasrkin')){
   const options=' Move! Move! Move! adds 3″ Move. Fix Bayonets! improves Weapon Skill by 1. Take Aim! improves Ballistic Skill by 1. First Rank, Fire! Second Rank, Fire! adds 1 Attack to Rapid Fire weapons. Take Cover! improves Save by 1 to a maximum of 3+. Duty and Honour! improves Leadership and Objective Control by 1.';
   for(const phase of phases)issue('warrior-elite','Warrior Elite',phase,'either','start','Once per battle round, Kasrkin may select one Order for their own unit. The Cult FAQ permits this in a Brood Brothers army. The Order lasts until the start of your next Command phase and ends early if the unit becomes battle-shocked.'+options,body,gscPack);
  }
 }
 if(walls.length){
  const wallIds=walls.map(s=>s.id).join(', '),wallSource=guardSource+'Aegis-Defence-Line';
  const infantry=guards.filter(s=>gscAlliedKeywords(s).has('INFANTRY'));
  for(const phase of ['Pre-battle','Movement','Charge','Fight'] as const)add('platform','Emplacement Platform',phase,phase==='Pre-battle'||phase==='Fight'?'either':'own','during','Friendly Astra Militarum Infantry models may deploy on the platform or end any move on top of it. Available defences include '+wallIds+'.',infantry,wallSource);
  add('cover','Reinforced Cover','Shooting','either','during','When allocating a ranged attack to a model, it gains cover if at least one attacking model cannot fully see it because of this wall. This applies to models on either side. An opposing Astra Militarum Infantry model that gains this cover also has a 4+ invulnerable save.',walls,wallSource);
  add('invulnerable','Defence Line','Shooting','opponent','during','If this wall grants an Astra Militarum Infantry model cover, that individual model also has a 4+ invulnerable save. Available defences include '+wallIds+'.',infantry,wallSource);
  add('engaged','Fortification · shooting','Shooting','own','during','You may shoot an enemy engaged exclusively with your Fortifications. Ranged attacks against that enemy suffer −1 to Hit unless made with a Pistol.',walls,wallSource);
  add('fall-back','Fortification · Fall Back','Movement','opponent','during','An enemy engaged exclusively with your Fortifications can Fall Back while battle-shocked without Desperate Escape tests for that reason. Models moving over enemy models still test.',walls,wallSource);
 }
 return rows;
}
