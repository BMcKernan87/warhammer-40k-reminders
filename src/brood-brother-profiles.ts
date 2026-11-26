import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import {aircraftCoreReminders} from './aircraft-core';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {astraMilitarumModelLoadouts,astraMilitarumWeaponCount} from './astra-militarum-loadouts';
import {ASTRA_CARDS,ASTRA_SHEETS} from './astra-militarum-data';
import {eligibleAstraMilitarumUpgrades} from './astra-militarum-detachment-data';
import {guardCardContext} from './guard-card-context';
import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightWeaponCount} from './knight-loadouts';
import {GUARD_CARDS} from './brood-brother-cards.generated';
import type {BroodBrotherCard} from './brood-brother-reminders';
import {gscFiringDeckModelSlots} from './gsc-army-transports';
import type {GscFormation} from './gsc-transports';
import {equippedWeaponText,type KnightCardStats} from './knight-card-rules';
import type {RosterInstance} from './roster-instances';

type Stage=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const pre:Stage=['Pre-battle','either','during'],shoot:Stage=['Shooting','own','during'],fight:Stage=['Fight','either','during'];
const enemyFire:Stage=['Shooting','opponent','during'],incomingFire:Stage=['Movement','own','during'],outgoingSnap:Stage=['Movement','opponent','end'];
const enemyMovementFire:Stage=['Movement','opponent','during'];
const rangedDefences=[enemyFire,incomingFire,shoot,enemyMovementFire],defences=[enemyFire,incomingFire,fight,shoot,enemyMovementFire];
const defensiveContext=(stage:Stage)=>stage===incomingFire?' This protection applies throughout your Movement phase, including permitted normal enemy reactions and Fire Overwatch at phase end.':stage===enemyMovementFire?' Apply this during permitted enemy shooting in their Movement phase, including attacks after a Deep Strike arrival.':stage===shoot?' Apply this during permitted enemy return fire.':'';
const sourceKey=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const baseName=(name:string)=>name.split(/\s+[-–—]\s+/)[0];
const hasModels=(s:RosterInstance)=>(s.models??1)>0;

const nativeSizes=new Map(ASTRA_SHEETS.map(s=>[s.unit,s.sizes[0]]));
function carries(army:ArmySelection,s:RosterInstance,name:string):boolean{
 const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 return upgrade===name&&eligibleAstraMilitarumUpgrades(army,s.unit,s.id).some(u=>u.name===name);
}
function scoutRange(army:ArmySelection,group:GscFormation,tags:(s:RosterInstance)=>Set<string>):number{
 if(tags(group.body).has('REGIMENT')&&group.members.some(s=>s.attachedTo===group.body.id&&carries(army,s,'Eager Advance')))return 6;
 const ranges=group.members.map(member=>{
  const natural=Number(ASTRA_CARDS[member.unit]?.core.find(a=>a.startsWith('Scouts '))?.match(/\d+/)?.[0]??0);
  // Survival Gear is borne by one model, even in a multi-model Command Squad.
  return natural||((member.models??nativeSizes.get(member.unit))===1&&carries(army,member,'Survival Gear')?6:0);
 });
 return Math.min(...ranges);
}
function inquisitorGuns(squad:RosterInstance):string[]{
 if(!BATTLELINE_INQUISITORS.has(squad.unit))return [];
 const agent=ASSIGNED_AGENT_DATA.find(s=>s.sheet.unit===squad.unit);
 if(!agent)return [];
 const guns=agent.weapons.filter(w=>w.type==='Ranged'&&!w.abilities.toLowerCase().includes('one shot')&&(squad.unit!=='Inquisitor'||knightWeaponCount(squad,w.name)));
 return guns.length?[squad.id+' (1 × '+squad.unit+' — '+guns.map(w=>w.name+(w.abilities?' ['+w.abilities+']':'')).join(' / ')+')']:[];
}
function passengerGuns(group:GscFormation,deck:number):string[]{
 const result:string[]=[];
 for(const squad of group.members){
  const card=ASTRA_CARDS[squad.unit];
  if(!card){result.push(...inquisitorGuns(squad));continue;}
  const profiles=card.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot'));
  const bearerCounts=new Map<string,number>();
  for(const bearer of astraMilitarumModelLoadouts(squad)){
   const slots=gscFiringDeckModelSlots(squad.unit,bearer.model);
   if(slots>deck)continue;
   const equipped=new Set(bearer.items.map(sourceKey));
   const guns=profiles.filter(w=>equipped.has(sourceKey(baseName(w.name))));
   if(!guns.length)continue;
   const weapons=guns.map(w=>w.name+(w.abilities.length?' ['+w.abilities.join(', ')+']':''));
   const description=bearer.model+(slots>1?' ('+slots+' slots)':'')+' — '+weapons.join(' / ');
   bearerCounts.set(description,1+(bearerCounts.get(description)??0));
  }
  if(bearerCounts.size)result.push(squad.id+' ('+[...bearerCounts].map(([desc,count])=>count+' × '+desc).join('. ')+')');
 }
 return result;
}

function shootingStats(card:BroodBrotherCard,unit:string):KnightCardStats{
 // Deathstrike's missile is resolved by its own targeting and firing sequence.
 const weapons=unit==='Deathstrike'?card.weapons.filter(w=>!w.name.toLowerCase().startsWith('deathstrike missile')):card.weapons;
 return {source:card.source,weapons,save:null,rangedSave:false,demise:null,damage:null,conversion:null};
}

export function broodBrotherProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Genestealer Cults')return [];
 return guardProfiles(army,roster);
}
export function astraProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Astra Militarum')return [];
 return guardProfiles(army,roster);
}
function guardProfiles(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 const {guards,groups,tags,cargo}=guardCardContext(army,roster);
 if(!guards.length)return [];
 const native=army.faction==='Astra Militarum',cards=native?ASTRA_CARDS:GUARD_CARDS;
 const byBody=new Map(groups.map(g=>[g.body.id,g]));
 const result:GeneratedReminder[]=native?aircraftCoreReminders('11e-astra-',guards.filter(s=>tags(s).has('AIRCRAFT')).map(s=>s.id)):[];
 for(const squad of guards){
  const card=cards[squad.unit],group=byBody.get(squad.id),passengerIds=cargo.get(squad.id);
  function emit(title:string,[window,turn,timing]:Stage,summary:string,units=[squad.id],source=card.source){
   // Timing is deliberately absent from these IDs: broadening passive
   // Movement protection keeps existing checkmarks on the same reminder.
   result.push({id:[native?'11e-guard-profile':'11e-brood-profile',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,origin:'unit',units,summary,source});
  }
  const stats=shootingStats(card,squad.unit),titanic=tags(squad).has('TITANIC');
  for(const stage of [shoot,fight,outgoingSnap]){
   const snap=stage===outgoingSnap,melee=stage===fight;
   if(snap&&titanic)continue;
   const text=equippedWeaponText(squad,stats,melee?'Fight':'Shooting',snap,astraMilitarumWeaponCount);
   if(text)emit(melee?'Melee weapon profiles':'Ranged weapon profiles',stage,(snap?'When firing Overwatch, use snap shooting. ':'')+text);
  }
  for(const {model,save,restriction} of hasModels(squad)?card.saves:[]){
   const bearer=model.toUpperCase()===model?model.toLowerCase().replace(/\b\p{L}/gu,l=>l.toUpperCase()):model;
   const limit=restriction&&!restriction.toLowerCase().includes(bearer.toLowerCase()+' only')?' '+restriction.replace(/\.+$/,'')+'.':'';
   for(const stage of defences)emit(bearer+' · Invulnerable save',stage,'When an attack is allocated to the '+bearer+' model, it may use its '+save+'+ invulnerable save.'+limit+defensiveContext(stage));
  }
  const feel=card.core.find(c=>c.startsWith('Feel No Pain '));
  if(feel&&hasModels(squad))for(const phase of PHASES)emit(feel,[phase,'either','during'],'Each time a model from '+squad.id+' would lose a wound, roll a D6. On '+feel.slice('Feel No Pain '.length)+' it keeps that wound.');
  if(hasModels(squad)&&['Bullgryn Squad','Ogryn Bodyguard'].includes(squad.unit)){
   const bearers=astraMilitarumModelLoadouts(squad);
   for(const item of ['Brute Shield','Slabshield']){
    const count=bearers.filter(b=>b.items.some(i=>sourceKey(i)===sourceKey(item))).length;
    if(!count)continue;
    const effect=item==='Brute Shield'?'has a 4+ invulnerable save':'has a Wounds characteristic of '+(squad.unit==='Ogryn Bodyguard'?'7':'4');
    for(const stage of defences)emit(item,stage,'When allocating attacks, only the '+count+' '+item+' bearer'+(count===1?'':'s')+' in '+squad.id+' '+(count===1?effect:effect.replace('has','have'))+'.'+defensiveContext(stage));
   }
  }
  if(card.damage){
   const {threshold,oc,source}=card.damage,condition='While this model has 1–'+threshold+' wounds remaining, ';
   for(const stage of [shoot,fight])emit('Damaged',stage,condition+'subtract 1 from its attack Hit rolls.'+(oc?' Its Objective Control also falls by '+oc+'.':''),[squad.id],source);
   if(oc)for(const window of PHASES)emit('Damaged · Objective Control',[window,'either','end'],condition+'subtract '+oc+' from its Objective Control when comparing control of an objective.',[squad.id],source);
  }
  const demise=card.core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length);
  if(demise){
   const cyclops=squad.unit==='Cyclops Demolition Vehicle';
   const trigger=cyclops?'When this model is destroyed other than by Demolition Charges, roll one D6. On a 4+':'When a model in this unit is destroyed, after any emergency disembarkation roll one D6. On a 6';
   for(const window of PHASES)emit('Deadly Demise '+demise,[window,'either','during'],trigger+', each unit within 6″ suffers '+demise+' mortal wound'+(demise==='1'?'':'s')+'.'+(demise.includes('D')?' Roll the number separately for each affected unit.':''));
  }
  if(card.core.includes('Hover'))emit('Hover',['Movement','own','during'],'Each time this unit takes to the skies, use its full maximum movement distance without the usual 2″ reduction.');
  if(group){
   const ids=group.members.map(m=>m.id),all=(ability:string)=>group.members.every(m=>cards[m.unit]?.core.includes(ability));
   const surviving=group.members.filter(hasModels),defensiveIds=surviving.map(m=>m.id);
   const allDefensive=(ability:string)=>hasModels(squad)&&surviving.every(m=>cards[m.unit]?.core.includes(ability));
   if(all('Infiltrators')||group.members.length===1&&carries(army,squad,'Long-Range Scout'))emit('Infiltrators',pre,'During deployment, set this formation up anywhere more than 8″ horizontally from all enemy models and the enemy deployment zone.',ids);
   if(allDefensive('Stealth'))for(const stage of rangedDefences)emit(squad.unit==='Gaunt’s Ghosts'?'Stealth · Tanith Camo-cloaks':'Stealth',stage,'This formation has the Benefit of Cover against ranged attacks while every model has Stealth.'+(squad.unit==='Gaunt’s Ghosts'?' The Ghosts’ camo-cloaks also give their models the Benefit of Cover.':'')+defensiveContext(stage),defensiveIds);
   if(all('Fights First'))emit('Fights First',fight,'Resolve this formation in the Fights First step while every model has that ability.',ids);
   if(surviving.length===1&&allDefensive('Lone Operative'))for(const stage of rangedDefences)emit('Lone Operative',stage,'Unless part of an attached unit, this unit is invisible to enemies outside 12″, who cannot target it with Indirect Fire weapons either.'+defensiveContext(stage),defensiveIds);
   if(all('Deep Strike')){
    emit('Deep Strike',pre,'This formation can start in Strategic Reserves and deploy using Deep Strike on ingress.',ids);
    emit('Deep Strike',['Movement','own','during'],'On ingress from Strategic Reserves, normally from battle round two, set up anywhere more than 8″ horizontally away from every enemy unit, including inside the enemy deployment zone.',ids);
    emit('Deep Strike · Rapid Ingress',outgoingSnap,'When using Rapid Ingress at the end of the enemy Movement phase, from battle round two, the whole formation can set up anywhere more than 8″ horizontally from every enemy unit.',ids);
   }
   const distance=scoutRange(army,group,tags);
   if(distance>0)emit('Scouts '+distance+'″',pre,'During Resolve Pre-battle Abilities, if wholly in your deployment zone, make a scout move up to '+distance+'″ and finish more than 8″ horizontally from every enemy unit. From Strategic Reserves, you can instead set up wholly within your deployment zone.',ids);
  }
  if(!passengerIds?.length)continue;
  const passengers=passengerIds.flatMap(id=>byBody.get(id)??[]);
  if(tags(squad).has('DEDICATED TRANSPORT')){
   const scouts=passengers.map(g=>({g,range:scoutRange(army,g,tags)})).filter(s=>s.range>0);
   if(scouts.length)emit('Scouts · Dedicated Transport',pre,'During Resolve Pre-battle Abilities, if this transport is wholly within your deployment zone and every embarked model has Scouts, it may scout up to the shortest embarked Scouts distance and finish more than 8″ horizontally from every enemy unit. Eligible passengers include '+scouts.map(({g,range})=>g.body.id+' ('+range+'″)').join(', ')+'.',[squad.id,...scouts.flatMap(({g})=>g.members.map(s=>s.id))]);
  }
  const deck=Number(card.core.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(!deck)continue;
  const fireteams=passengers.map(g=>({g,rows:passengerGuns(g,deck)})).filter(team=>team.rows.length);
  if(fireteams.length)emit('Firing Deck '+deck,shoot,'When selected to shoot, choose up to '+deck+' embarked model slots from units that have not been selected to shoot this phase. Choose one ranged weapon other than One Shot per selected model. The transport gains those weapons until it finishes attacking. All units aboard become ineligible to shoot for the rest of the turn. Eligible passenger weapons: '+fireteams.flatMap(t=>t.rows).join('. ')+'.',[squad.id,...fireteams.flatMap(t=>t.g.members.map(m=>m.id))]);
 }
 return result;
}
