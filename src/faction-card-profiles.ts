import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {equippedWeaponText,type KnightCardStats} from './knight-card-rules';
import type {RosterInstance} from './roster-instances';

export type ProfileStage=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const deploy:ProfileStage=['Pre-battle','either','during'],shoot:ProfileStage=['Shooting','own','during'],fight:ProfileStage=['Fight','either','during'];
const snap:ProfileStage=['Movement','opponent','end'],enemyShooting:ProfileStage=['Shooting','opponent','during'],enemySnap:ProfileStage=['Movement','own','end'];
type Emit=(title:string,stage:ProfileStage,summary:string,units?:string[])=>void;
type ModelLoadouts=(s:RosterInstance)=>readonly {model:string;items:readonly string[]}[];

export function printCombatProfiles(squad:RosterInstance,stats:KnightCardStats,titanic:boolean,count:(s:RosterInstance,name:string)=>number,emit:Emit){
  for(const stage of [shoot,snap,fight]){
   if(stage===snap&&titanic)continue;
   const melee=stage===fight,text=equippedWeaponText(squad,stats,melee?'Fight':'Shooting',stage===snap,count);
   if(text)emit(melee?'Melee weapon profiles':'Ranged weapon profiles',stage,(stage===snap?'When firing Overwatch, use snap shooting. ':'')+text);
  }
  if(stats.save)for(const stage of [enemyShooting,enemySnap,fight])emit('Invulnerable save',stage,'When an attack is allocated to a model from '+squad.id+', that model can use its '+stats.save+'+ invulnerable save.');
  const fnp=stats.core?.find(c=>c.startsWith('Feel No Pain '));
  if(fnp)for(const phase of PHASES)emit(fnp,[phase,'either','during'],'Each time a model from '+squad.id+' would lose a wound, roll a D6. On a '+fnp.slice('Feel No Pain '.length)+', it keeps that wound.');
  if(stats.demise)for(const phase of PHASES)emit('Deadly Demise '+stats.demise,[phase,'either','during'],'When a model in this unit is destroyed, after any emergency disembarkation roll one D6. On a 6, each unit within 6″ suffers '+stats.demise+' mortal wound'+(stats.demise==='1'?'':'s')+'.'+(stats.demise.includes('D')?' Roll the number separately for each affected unit.':''));
  if(stats.damage){
   const {threshold,oc,slaughterAttacks}=stats.damage,low='While this model has 1–'+threshold+' wounds remaining, ';
   if(slaughterAttacks)emit('Damaged',fight,low+'add '+slaughterAttacks+' to the Attacks characteristic of its melee weapons, whichever profile it selects.');
   else for(const stage of [shoot,fight])if(stage!==shoot||stats.weapons.some(w=>w.phase==='Shooting'&&count(squad,w.name)))emit('Damaged',stage,low+'subtract 1 from its attack Hit rolls.');
   if(oc)for(const phase of PHASES)emit('Damaged · Objective Control',[phase,'either','end'],low+'subtract '+oc+' from its Objective Control when comparing control of an objective.');
  }
  if(stats.core?.includes('Hover'))emit('Hover',['Movement','own','during'],'Each time this model takes to the skies, it uses its full maximum movement distance without the usual 2″ reduction.');
}

const weaponKey=(s:string)=>s.split(/\s+[-–—]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
function firingDeckWeapons(s:RosterInstance,cards:Readonly<Record<string,KnightCardStats>>,models:ModelLoadouts):string[]{
 const guns=cards[s.unit]?.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot'))??[];
 const bearers=new Map<string,number>();
 for(const model of models(s)){
  const items=new Set(model.items.map(weaponKey)),selected=guns.filter(w=>items.has(weaponKey(w.name)));
  if(!selected.length)continue;
  const role=model.model.replace(/#\d+$/,''),gunList=selected.map(w=>w.name+(w.abilities.length?' ['+w.abilities.join(', ')+']':''));
  const label=role+' — '+gunList.join(' / ');
  bearers.set(label,(bearers.get(label)??0)+1);
 }
 return [...bearers].map(([label,count])=>s.id+' ('+count+' × '+label+')');
}

export function printFiringDeck(squad:RosterInstance,deck:number,passengers:readonly {members:RosterInstance[]}[],cards:Readonly<Record<string,KnightCardStats>>,models:ModelLoadouts,emit:Emit){
  const groups=passengers.map(g=>({g,guns:g.members.flatMap(member=>firingDeckWeapons(member,cards,models))})).filter(g=>g.guns.length);
  if(groups.length)emit('Firing Deck '+deck,shoot,'When selected to shoot, choose up to '+deck+' embarked models whose units have not been selected to shoot this phase. Choose one ranged weapon other than One Shot per selected model. The transport has those weapons until it finishes attacking, and all units aboard are ineligible to shoot for the rest of the turn. Equipped passenger guns: '+groups.flatMap(g=>g.guns).join('. ')+'.',[squad.id,...groups.flatMap(({g})=>g.members.map(s=>s.id))]);
}

export function printFormationDeployment(ids:string[],deepStrike:boolean,range:number,infiltrators:boolean,emit:Emit){
 if(deepStrike){
  emit('Deep Strike',deploy,'You may put this formation into Strategic Reserves. When it arrives by ingress, every model qualifies for Deep Strike.',ids);
  emit('Deep Strike',['Movement','own','during'],'When making an ingress move from Strategic Reserves, normally from battle round two, this entire formation can set up anywhere more than 8″ horizontally from all enemy units, including inside their deployment zone.',ids);
  emit('Deep Strike · Rapid Ingress',snap,'When using Rapid Ingress at the end of the enemy Movement phase in battle round two or later, set up the formation more than 8″ horizontally from every enemy unit, including inside the enemy deployment zone.',ids);
 }
 if(range)emit('Scouts '+range+'″',deploy,'During Resolve Pre-battle Abilities, if wholly in your deployment zone, make a scout move up to '+range+'″ and finish more than 8″ horizontally from all enemies. From Strategic Reserves, you may instead set up wholly within your deployment zone.',ids);
 if(infiltrators)emit('Infiltrators',deploy,'During deployment this formation can set up anywhere more than 8″ horizontally from the enemy deployment zone and all enemy models.',ids);
}
