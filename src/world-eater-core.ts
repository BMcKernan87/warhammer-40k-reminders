import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {equippedWeaponText} from './knight-card-rules';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterInstance} from './roster-instances';
import {WORLD_EATER_CARDS} from './world-eater-profiles.generated';
import {worldEaterModelLoadouts,worldEaterWeaponCount} from './world-eater-loadouts';
import {worldEatersKeywords,worldEatersMusterUnits} from './world-eaters-data';
import {eligibleWorldEatersUpgrades} from './world-eaters-detachment-data';
import {worldEatersCargoFormations} from './world-eaters-muster';

type Stage=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const deploy:Stage=['Pre-battle','either','during'],shoot:Stage=['Shooting','own','during'],fight:Stage=['Fight','either','during'];
const snap:Stage=['Movement','opponent','end'],enemyShooting:Stage=['Shooting','opponent','during'],enemySnap:Stage=['Movement','own','end'];
const has=(s:RosterInstance,ability:string)=>WORLD_EATER_CARDS[s.unit]?.core?.includes(ability)??false;
function carries(army:ArmySelection,s:RosterInstance,name:string):boolean{
 const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 return upgrade===name&&eligibleWorldEatersUpgrades(army,s.unit,s.id).some(u=>u.name===name);
}
function lordOfTheEightbound(army:ArmySelection,s:RosterInstance):boolean{
 if(s.unit!=='Slaughterbound')return false;
 const body=knightJoinedBodyguard(army,s);
 return !!body&&worldEatersKeywords(army,body).has('POSSESSED')&&worldEatersKeywords(army,body).has('WORLD EATERS');
}
export function worldEaterFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[]):boolean{
 if(!members.length||army.faction!=='World Eaters')return false;
 const legal=worldEatersMusterUnits(army);
 if(!members.every(s=>legal.includes(s.unit)&&WORLD_EATER_CARDS[s.unit]))return false;
 const invocatus=members.find(s=>s.unit==='Lord Invocatus');
 const led=invocatus&&knightJoinedBodyguard(army,invocatus);
 if(led&&members.some(s=>s.id===led.id))return true;
 return members.every(s=>has(s,'Deep Strike')||lordOfTheEightbound(army,s)||carries(army,s,'Disciple of Khorne'));
}
function scoutRange(army:ArmySelection,members:readonly RosterInstance[]):number{
 return Math.min(...members.map(s=>lordOfTheEightbound(army,s)?6:Number(WORLD_EATER_CARDS[s.unit]?.core?.find(c=>c.startsWith('Scouts '))?.match(/\d+/)?.[0]??0)));
}
const weaponKey=(s:string)=>s.split(/\s+[-–—]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
function firingDeckWeapons(s:RosterInstance):string[]{
 const guns=WORLD_EATER_CARDS[s.unit]?.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot'))??[];
 const bearers=new Map<string,number>();
 for(const model of worldEaterModelLoadouts(s)){
  const items=new Set(model.items.map(weaponKey)),selected=guns.filter(w=>items.has(weaponKey(w.name)));
  if(!selected.length)continue;
  const role=model.model.replace(/#\d+$/,''),gunList=selected.map(w=>w.name+(w.abilities.length?' ['+w.abilities.join(', ')+']':''));
  const label=role+' — '+gunList.join(' / ');
  bearers.set(label,(bearers.get(label)??0)+1);
 }
 return [...bearers].map(([label,count])=>s.id+' ('+count+' × '+label+')');
}

export function worldEaterProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='World Eaters')return [];
 const legal=new Set(worldEatersMusterUnits(army)),native=roster.filter(s=>legal.has(s.unit)&&Object.hasOwn(WORLD_EATER_CARDS,s.unit));
 const parent=new Map(native.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 const result:GeneratedReminder[]=[];
 for(const squad of native){
  const stats=WORLD_EATER_CARDS[squad.unit],tags=worldEatersKeywords(army,squad);
  function emit(title:string,[window,turn,timing]:Stage,summary:string,units=[squad.id]){
   result.push({id:['11e-world-eater-core',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:stats.source});
  }
  for(const stage of [shoot,snap,fight]){
   if(stage===snap&&tags.has('TITANIC'))continue;
   const melee=stage===fight,text=equippedWeaponText(squad,stats,melee?'Fight':'Shooting',stage===snap,worldEaterWeaponCount);
   if(text)emit(melee?'Melee weapon profiles':'Ranged weapon profiles',stage,(stage===snap?'When firing Overwatch, use snap shooting. ':'')+text);
  }
  if(stats.save)for(const stage of [enemyShooting,enemySnap,fight])emit('Invulnerable save',stage,'When an attack is allocated to a model from '+squad.id+', that model can use its '+stats.save+'+ invulnerable save.');
  const fnp=stats.core?.find(c=>c.startsWith('Feel No Pain '));
  if(fnp)for(const phase of PHASES)emit(fnp,[phase,'either','during'],'Each time a model from '+squad.id+' would lose a wound, roll a D6. On a '+fnp.slice('Feel No Pain '.length)+', it keeps that wound.');
  if(stats.demise)for(const phase of PHASES)emit('Deadly Demise '+stats.demise,[phase,'either','during'],'When a model in this unit is destroyed, after any emergency disembarkation roll one D6. On a 6, each unit within 6″ suffers '+stats.demise+' mortal wound'+(stats.demise==='1'?'':'s')+'.'+(stats.demise.includes('D')?' Roll the number separately for each affected unit.':''));
  if(stats.damage){
   const {threshold,oc,slaughterAttacks}=stats.damage,low='While this model has 1–'+threshold+' wounds remaining, ';
   if(slaughterAttacks)emit('Damaged',fight,low+'add '+slaughterAttacks+' to the Attacks characteristic of its melee weapons, whichever profile it selects.');
   else for(const stage of [shoot,fight])if(stage!==shoot||stats.weapons.some(w=>w.phase==='Shooting'&&worldEaterWeaponCount(squad,w.name)))emit('Damaged',stage,low+'subtract 1 from its attack Hit rolls.');
   if(oc)for(const phase of PHASES)emit('Damaged · Objective Control',[phase,'either','end'],low+'subtract '+oc+' from its Objective Control when comparing control of an objective.');
  }
  if(has(squad,'Hover'))emit('Hover',['Movement','own','during'],'Each time this model takes to the skies, it uses its full maximum movement distance without the usual 2″ reduction.');
  if(!parent.get(squad.id)){
   const members=[squad,...native.filter(s=>parent.get(s.id)===squad.id)],ids=members.map(s=>s.id);
   if(worldEaterFormationHasDeepStrike(army,members)){
    emit('Deep Strike',deploy,'You may put this formation into Strategic Reserves. When it arrives by ingress, every model qualifies for Deep Strike.',ids);
    emit('Deep Strike',['Movement','own','during'],'When making an ingress move from Strategic Reserves, normally from battle round two, this entire formation can set up anywhere more than 8″ horizontally from all enemy units, including inside their deployment zone.',ids);
    emit('Deep Strike · Rapid Ingress',snap,'When using Rapid Ingress at the end of the enemy Movement phase in battle round two or later, set up the formation more than 8″ horizontally from every enemy unit, including inside the enemy deployment zone.',ids);
   }
   const range=scoutRange(army,members);
   if(range)emit('Scouts '+range+'″',deploy,'During Resolve Pre-battle Abilities, if wholly in your deployment zone, make a scout move up to '+range+'″ and finish more than 8″ horizontally from all enemies. From Strategic Reserves, you may instead set up wholly within your deployment zone.',ids);
   if(members.every(s=>has(s,'Infiltrators')||carries(army,s,'Butcher Lord')))emit('Infiltrators',deploy,'During deployment this formation can set up anywhere more than 8″ horizontally from the enemy deployment zone and all enemy models.',ids);
  }
  const deck=Number(stats.core?.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(!deck)continue;
  const passengers=worldEatersCargoFormations(army,squad,roster);
  const groups=passengers.map(g=>({g,guns:g.members.flatMap(firingDeckWeapons)})).filter(g=>g.guns.length);
  if(groups.length)emit('Firing Deck '+deck,shoot,'When selected to shoot, choose up to '+deck+' embarked models whose units have not been selected to shoot this phase. Choose one ranged weapon other than One Shot per selected model. The transport has those weapons until it finishes attacking, and all units aboard are ineligible to shoot for the rest of the turn. Equipped passenger guns: '+groups.flatMap(g=>g.guns).join('. ')+'.',[squad.id,...groups.flatMap(({g})=>g.members.map(s=>s.id))]);
 }
 return result;
}
