import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {aeldariCard,aeldariModelLoadouts,aeldariWeaponCount} from './aeldari-loadouts';
import {aeldariMusterUnits} from './aeldari-muster-data';
import {aeldariKeywords} from './aeldari-keywords';
import {equippedWeaponText} from './knight-card-rules';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(s:string)=>s.split(/\s+[–—-]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
type PhysicalModel={model:string;items:readonly string[]};
function countFor(squad:RosterInstance,model?:string|PhysicalModel){
 if(model===undefined)return aeldariWeaponCount;
 const physical=typeof model==='string'?aeldariModelLoadouts(squad).filter(m=>m.model===model):[model];
 return (_s:RosterInstance,name:string)=>physical.flatMap(m=>m.items).filter(item=>key(item)===key(name)).length;
}

/** Printed current profiles for the actual equipped weapons. Temporary effects
 * and personal bearer bonuses are separate, scoped reminders; Firing Deck must
 * never import a passenger's personal buffs into its transport's profiles. */
export function aeldariFullWeaponProfiles(army:ArmySelection,squad:RosterInstance,model?:string|PhysicalModel){
 if(army.faction!=='Aeldari'||!aeldariMusterUnits(army).includes(squad.unit))return [];
 const card=aeldariCard(squad),count=countFor(squad,model);
 return (card?.weapons??[]).filter(w=>count(squad,w.name)>0).map(w=>({...w,count:count(squad,w.name)}));
}

export function aeldariWeaponText(army:ArmySelection,squad:RosterInstance,phase:'Shooting'|'Fight',snap=false,model?:string|PhysicalModel):string{
 const card=aeldariCard(squad);if(!card)return '';
 const count=countFor(squad,model);
 return aeldariFullWeaponProfiles(army,squad,model).filter(w=>w.phase===phase).map(w=>{
  const stats=(phase==='Shooting'?w.range+'″; ':'')+'A '+w.attacks+'; '+(snap?'':(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')+'; ')+'D '+w.damage;
  let text=equippedWeaponText(squad,{...card,weapons:[w]},phase,snap,count).replace(' — ',' — '+stats+'; ');
  text=text.replace('Devastating Wounds: Non-Monster/vehicle','Devastating Wounds (against targets with neither Monster nor Vehicle, a critical wound inflicts this weapon’s Damage as mortal wounds on one model after normal damage)');
  text=text.replace(/Anti-Non-Monster\/vehicle 3\+ \([^)]*\)/g,'Anti: non-Monster/Vehicle 3+ (an unmodified Wound roll of 3+ scores a critical wound against a target with neither Monster nor Vehicle)');
  return snap?text:text.replace('Psychic (these attacks are psychic attacks for rules that affect them)','Psychic (these are psychic attacks; you may ignore any or all modifiers to their Ballistic Skill or Weapon Skill and Hit roll)');
 }).join(' ');
}

export function aeldariWeaponReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari')return [];
 const legal=new Set(aeldariMusterUnits(army)),result:GeneratedReminder[]=[];
 for(const squad of roster){
  const card=aeldariCard(squad);if(!card||!legal.has(squad.unit))continue;
  for(const [window,turn,phase,snap] of [['Shooting','own','Shooting',false],['Movement','opponent','Shooting',true],['Fight','either','Fight',false]] as const){
   if(snap&&aeldariKeywords(army,squad,undefined,roster).has('TITANIC'))continue;
   const text=aeldariWeaponText(army,squad,phase,snap);if(!text)continue;
   result.push({id:['11e-aeldari-weapons',squad.id,window,turn].join(':'),title:squad.id+' · '+(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles'),window,turn,timing:snap?'end':'during',
    summary:(snap?'Only when firing permitted Overwatch: use snap shooting with its fixed Hit rolls. ':phase==='Fight'?'Each model selects one melee weapon, plus any weapons with Extra Attacks. ':'')+text,
    source:card.source,origin:'unit',units:[squad.id]});
  }
 }
 return result;
}
