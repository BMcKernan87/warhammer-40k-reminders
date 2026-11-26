import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {drukhariCard,drukhariModelLoadouts,drukhariWeaponCount} from './drukhari-loadouts';
import {drukhariMusterUnits} from './drukhari-muster-data';
import {drukhariKeywords} from './drukhari-keywords';
import {equippedWeaponText} from './knight-card-rules';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(s:string)=>s.split(/\s+[–—-]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
type PhysicalModel={model:string;items:readonly string[]};
function countFor(squad:RosterInstance,model?:string|PhysicalModel){
 if(model===undefined)return drukhariWeaponCount;
 const physical=typeof model==='string'?drukhariModelLoadouts(squad).filter(m=>m.model===model):[model];
 return (_s:RosterInstance,name:string)=>physical.flatMap(m=>m.items).filter(item=>key(item)===key(name)).length;
}

/** Printed current profiles for the actual equipped weapons. Temporary effects
 * and personal bearer bonuses are separate, scoped reminders; Firing Deck must
 * never import a passenger's personal buffs into its transport's profiles. */
export function drukhariFullWeaponProfiles(army:ArmySelection,squad:RosterInstance,model?:string|PhysicalModel){
 if(army.faction!=='Drukhari'||!drukhariMusterUnits(army).includes(squad.unit))return [];
 const card=drukhariCard(squad),count=countFor(squad,model);
 return (card?.weapons??[]).filter(w=>count(squad,w.name)>0).map(w=>({...w,count:count(squad,w.name)}));
}

export function drukhariWeaponText(army:ArmySelection,squad:RosterInstance,phase:'Shooting'|'Fight',snap=false,model?:string|PhysicalModel):string{
 const card=drukhariCard(squad);if(!card)return '';
 const count=countFor(squad,model);
 return drukhariFullWeaponProfiles(army,squad,model).filter(w=>w.phase===phase).map(w=>{
  const stats=(phase==='Shooting'?w.range+'″; ':'')+'A '+w.attacks+'; '+(snap?'':(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')+'; ')+'D '+w.damage;
  const text=equippedWeaponText(squad,{...card,weapons:[w]},phase,snap,count).replace(' — ',' — '+stats+'; ');
  return text;
 }).join(' ');
}

export function drukhariWeaponReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Drukhari')return [];
 const legal=new Set(drukhariMusterUnits(army)),result:GeneratedReminder[]=[];
 for(const squad of roster){
  const card=drukhariCard(squad);if(!card||!legal.has(squad.unit))continue;
  for(const [window,turn,phase,snap] of [['Shooting','own','Shooting',false],['Movement','opponent','Shooting',true],['Fight','either','Fight',false]] as const){
   if(snap&&drukhariKeywords(army,squad,undefined,roster).has('TITANIC'))continue;
   const text=drukhariWeaponText(army,squad,phase,snap);if(!text)continue;
   result.push({id:['11e-drukhari-weapons',squad.id,window,turn].join(':'),title:squad.id+' · '+(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles'),window,turn,timing:snap?'end':'during',
    summary:(snap?'Only when firing permitted Overwatch: use snap shooting with its fixed Hit rolls. ':phase==='Fight'?'Each model selects one melee weapon, plus any weapons with Extra Attacks. ':'')+text,
    source:card.source,origin:'unit',units:[squad.id]});
  }
 }
 return result;
}
