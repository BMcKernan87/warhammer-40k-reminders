import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {broodBrotherModelLoadouts} from './astra-militarum-loadouts';
import {GUARD_CARDS} from './brood-brother-cards.generated';
import type {BroodBrotherCard} from './brood-brother-reminders';
import {gscAlliedKeywords,gscAlliedMusterUnits} from './gsc-allies';
import {gscFiringDeckModelSlots,gscTransportOptions} from './gsc-army-transports';
import {gscFormations,type GscFormation} from './gsc-transports';
import {equippedWeaponText,type KnightCardStats} from './knight-card-rules';
import type {RosterInstance} from './roster-instances';

type Stage=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const pre:Stage=['Pre-battle','either','during'],shoot:Stage=['Shooting','own','during'],fight:Stage=['Fight','either','during'];
const enemyFire:Stage=['Shooting','opponent','during'],incomingSnap:Stage=['Movement','own','end'],outgoingSnap:Stage=['Movement','opponent','end'];
const sourceKey=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const baseName=(name:string)=>name.split(/\s+[-–—]\s+/)[0];

function scoutRange(group:GscFormation):number{
 const ranges=group.members.map(member=>Number(GUARD_CARDS[member.unit]?.core.find(a=>a.startsWith('Scouts '))?.match(/\d+/)?.[0]??0));
 return Math.min(...ranges);
}

function passengerGuns(group:GscFormation,deck:number):string[]{
 const result:string[]=[];
 for(const squad of group.members){
  const card=GUARD_CARDS[squad.unit];
  if(!card)continue;
  const profiles=card.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot'));
  const bearerCounts=new Map<string,number>();
  for(const bearer of broodBrotherModelLoadouts(squad)){
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
 const permitted=new Set(gscAlliedMusterUnits(army));
 const guard=roster.filter(s=>permitted.has(s.unit)&&Object.hasOwn(GUARD_CARDS,s.unit));
 if(!guard.length)return [];
 const formations=gscFormations(army,roster),byBody=new Map(formations.map(g=>[g.body.id,g]));
 const transports=new Map(gscTransportOptions(army,[...roster]).map(o=>[o.transport.id,o]));
 const result:GeneratedReminder[]=[];
 for(const squad of guard){
  const card=GUARD_CARDS[squad.unit],group=byBody.get(squad.id),cargo=transports.get(squad.id);
  function emit(title:string,[window,turn,timing]:Stage,summary:string,units=[squad.id],source=card.source){
   result.push({id:['11e-brood-profile',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,origin:'unit',units,summary,source});
  }
  const stats=shootingStats(card,squad.unit),titanic=gscAlliedKeywords(squad).has('TITANIC');
  for(const stage of [shoot,fight,outgoingSnap]){
   const snap=stage===outgoingSnap,melee=stage===fight;
   if(snap&&titanic)continue;
   const text=equippedWeaponText(squad,stats,melee?'Fight':'Shooting',snap);
   if(text)emit(melee?'Melee weapon profiles':'Ranged weapon profiles',stage,(snap?'When firing Overwatch, use snap shooting. ':'')+text);
  }
  for(const {model,save,restriction} of card.saves){
   for(const stage of [enemyFire,incomingSnap,fight])emit(model+' · Invulnerable save',stage,'When an attack is allocated to the '+model+' model, it may use its '+save+'+ invulnerable save'+(restriction?' '+restriction:'')+'.');
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
   const ids=group.members.map(m=>m.id),all=(ability:string)=>group.members.every(m=>GUARD_CARDS[m.unit]?.core.includes(ability));
   if(all('Infiltrators'))emit('Infiltrators',pre,'During deployment, set this formation up anywhere more than 8″ horizontally from all enemy models and the enemy deployment zone.',ids);
   if(all('Stealth'))for(const stage of [enemyFire,incomingSnap])emit('Stealth',stage,'This formation has the Benefit of Cover against ranged attacks while every model has Stealth.',ids);
   const distance=scoutRange(group);
   if(distance>0)emit('Scouts '+distance+'″',pre,'During Resolve Pre-battle Abilities, if wholly in your deployment zone, make a scout move up to '+distance+'″ and finish more than 8″ horizontally from every enemy unit. From Strategic Reserves, you can instead set up wholly within your deployment zone.',ids);
  }
  if(!cargo?.passengers.length)continue;
  const passengers=cargo.passengers.flatMap(id=>byBody.get(id)??[]);
  if(cargo.dedicated){
   const scouts=passengers.map(g=>({g,range:scoutRange(g)})).filter(s=>s.range>0);
   if(scouts.length)emit('Scouts · Dedicated Transport',pre,'During Resolve Pre-battle Abilities, if this transport is wholly within your deployment zone and every embarked model has Scouts, it may scout up to the shortest embarked Scouts distance and finish more than 8″ horizontally from every enemy unit. Eligible passengers include '+scouts.map(({g,range})=>g.body.id+' ('+range+'″)').join(', ')+'.',[squad.id,...scouts.flatMap(({g})=>g.members.map(s=>s.id))]);
  }
  const deck=Number(card.core.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(!deck)continue;
  const fireteams=passengers.map(g=>({g,rows:passengerGuns(g,deck)})).filter(team=>team.rows.length);
  if(fireteams.length)emit('Firing Deck '+deck,shoot,'When selected to shoot, choose up to '+deck+' embarked model slots from units that have not been selected to shoot this phase. Choose one ranged weapon other than One Shot per selected model. The transport gains those weapons until it finishes attacking. All units aboard become ineligible to shoot for the rest of the turn. Eligible passenger weapons: '+fireteams.flatMap(t=>t.rows).join('. ')+'.',[squad.id,...fireteams.flatMap(t=>t.g.members.map(m=>m.id))]);
 }
 return result;
}
