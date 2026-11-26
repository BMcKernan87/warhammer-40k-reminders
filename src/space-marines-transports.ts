import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {PHASES} from './engine';
import {SM_ALL_SHEETS} from './space-marines-data';
import {spaceMarineKeywords,spaceMarinePhysicalModels} from './space-marines-keywords';
import {spaceMarineFormations} from './space-marines-formations';
import {spaceMarineAttachmentRole} from './space-marines-attachments';
import {spaceMarineFormationHasDeepStrike} from './space-marines-datasheet-core';
import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {canFillTransports,minimumTransportAssignmentCost} from './transport-matching';
import {rosterCost2026,type RosterCost2026} from './datasheets-2026';
import {expandRoster,type RosterInstance} from './roster-instances';

export {spaceMarineFormations} from './space-marines-formations';
interface Capacity {spaces:number;dedicated:boolean;excluded:readonly string[];mounted?:boolean;deathwatch?:boolean}
export const spaceMarineCarrierCapacity:Readonly<Record<string,Capacity>>={
 'Land Raider':{spaces:14,dedicated:false,excluded:['JUMP PACK']},
 'Land Raider Crusader':{spaces:16,dedicated:false,excluded:['JUMP PACK']},
 'Land Raider Redeemer':{spaces:14,dedicated:false,excluded:['JUMP PACK']},
 'Drop Pod':{spaces:12,dedicated:true,excluded:['GRAVIS','JUMP PACK','TERMINATOR']},
 'Thunderhawk Gunship':{spaces:30,dedicated:false,excluded:[],mounted:true},
 'Corvus Blackstar':{spaces:12,dedicated:false,excluded:[],deathwatch:true},
 Impulsor:{spaces:7,dedicated:true,excluded:['JUMP PACK','TERMINATOR']},
 Repulsor:{spaces:14,dedicated:false,excluded:['JUMP PACK']},
 'Repulsor Executioner':{spaces:7,dedicated:false,excluded:['JUMP PACK']},
 Rhino:{spaces:12,dedicated:true,excluded:['GRAVIS','JUMP PACK','TERMINATOR']},
};
const sheets=new Map(SM_ALL_SHEETS.map(s=>[s.unit,s]));
const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';

function passengerGroups(army:ArmySelection,roster:readonly RosterInstance[]){
 const original=new Map(expandRoster(army).map(s=>[s.id,s]));
 return spaceMarineFormations(army,roster).flatMap(group=>{
  const start=original.get(group.root.id),former=group.root.attachedTo&&!roster.some(s=>s.id===group.root.attachedTo)&&start&&knightJoinedBodyguard(army,start);
  if(group.root.attachedTo&&!former||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  if(group.members.some(s=>spaceMarineAttachmentRole(s.unit,army)==='support'&&!s.attachedTo&&!former))return [];
  const physical=group.members.flatMap(s=>spaceMarinePhysicalModels(s).map(model=>({squad:s,model:model.model,keywords:spaceMarineKeywords(army,s,model.model,roster)})));
  return physical.length===group.models&&physical.length?[{...group,physical}]:[];
 });
}
export function spaceMarineCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=spaceMarineCarrierCapacity[carrier.unit];
 if(army.faction!=='Space Marines'||!capacity||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return passengerGroups(army,roster).flatMap(group=>{
  if(group.root.id===carrier.id)return [];
  const ordinary=group.physical.filter(p=>!BATTLELINE_INQUISITORS.has(p.squad.unit));
  if(!ordinary.length)return [];
  if(!group.physical.every(p=>{
   const k=p.keywords;
   if(capacity.excluded.some(tag=>k.has(tag)))return false;
   if(BATTLELINE_INQUISITORS.has(p.squad.unit)&&p.squad.id!==group.root.id)return k.has('INFANTRY');
   return k.has(capacity.deathwatch?'DEATHWATCH':'ADEPTUS ASTARTES')&&(k.has('INFANTRY')||!!capacity.mounted&&k.has('MOUNTED'));
  }))return [];
  const spaces=group.physical.reduce((n,p)=>n+(capacity.mounted&&p.keywords.has('MOUNTED')?4:['GRAVIS','TERMINATOR','JUMP PACK'].some(k=>p.keywords.has(k))?2:1),0);
  return spaces<=capacity.spaces?[{...group,spaces}]:[];
 });
}
export function spaceMarineCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=spaceMarineCarrierCapacity[carrier.unit];if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const groups=spaceMarineCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 return groups.length===ids.length&&groups.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces;
}
export function spaceMarineDedicatedSatisfied(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Space Marines')return true;
 const carriers=roster.filter(s=>spaceMarineCarrierCapacity[s.unit]?.dedicated),passengers=passengerGroups(army,roster);
 const accepts=new Map(carriers.map(c=>[c.id,new Set(spaceMarineCargoFormations(army,c,roster).map(g=>g.root.id))]));
 return canFillTransports(carriers,passengers,(c,g)=>accepts.get(c.id)!.has(g.root.id));
}
/** All Dedicated Transports need distinct occupants. Only the formations put
 * aboard compulsory-reserve Drop Pods add unavoidable passenger reserve cost.
 * Prices are original roster entries, including attachments, equipment and
 * upgrades. Unknown candidate prices cannot establish an exact lower bound. */
export function spaceMarineMinimumPodPassengerPoints(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army),entries?:RosterCost2026['entries']):number|null{
 if(army.faction!=='Space Marines')return 0;
 const carriers=roster.filter(s=>spaceMarineCarrierCapacity[s.unit]?.dedicated),passengers=passengerGroups(army,roster);
 const accepts=new Map(carriers.map(c=>[c.id,new Set(spaceMarineCargoFormations(army,c,roster).map(g=>g.root.id))]));
 const podCandidates=new Set(carriers.filter(c=>c.unit==='Drop Pod').flatMap(c=>[...accepts.get(c.id)!]));
 const prices=new Map((podCandidates.size?(entries??rosterCost2026(army).entries):[]).map(e=>[e.id,e.points]));
 const weights=new Map<string,number>();
 for(const group of passengers){
  if(!podCandidates.has(group.root.id))continue;
  if(group.members.some(s=>prices.get(s.id)==null))return null;
  weights.set(group.root.id,group.members.reduce((n,s)=>n+prices.get(s.id)!,0));
 }
 return minimumTransportAssignmentCost(carriers,passengers,(c,g)=>accepts.get(c.id)!.has(g.root.id),(c,g)=>c.unit==='Drop Pod'?weights.get(g.root.id)!:0);
}
export function spaceMarineTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Space Marines')return [];
 const rows:GeneratedReminder[]=[];
 for(const carrier of roster){
  const capacity=spaceMarineCarrierCapacity[carrier.unit];if(!capacity)continue;
  const groups=spaceMarineCargoFormations(army,carrier,roster),source=sheets.get(carrier.unit)!.source;
  const candidates=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.models+' models, '+g.spaces+' spaces)').join(', ')+'.':'No eligible whole formation fits.';
  const emit=(key:string,title:string,window:ReminderWindow,summary:string,turn:GeneratedReminder['turn']='own',timing:GeneratedReminder['timing']='during',units=[carrier.id])=>rows.push({id:'11e-sm-'+key+'-'+carrier.id+'-'+window,title:carrier.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:key==='embark'||key==='disembark'||key==='emergency'?core:source});
  const limits=capacity.spaces+' '+(capacity.deathwatch?'Deathwatch Infantry':'Adeptus Astartes Infantry'+(capacity.mounted?' or Mounted':''))+' spaces. '+(capacity.excluded.length?'Cannot carry '+capacity.excluded.join(', ')+' models. ':'')+'Each '+(capacity.mounted||capacity.deathwatch?'Jump Pack, Gravis or Terminator':'Gravis or Terminator')+' model uses 2 spaces'+(capacity.mounted?'; each Mounted model uses 4': '')+'.';
  emit('cargo','Declare passengers','Pre-battle',limits+' Count every physical model, including all Leaders and Supports. Printed model keywords determine eligibility.'+(capacity.dedicated?' Start with at least one eligible unit aboard or this Dedicated Transport is destroyed.':'')+' '+candidates,'either');
  if(carrier.unit==='Drop Pod'){
   emit('drop-pod-reserves','Drop Pod Assault','Pre-battle','This Drop Pod must start in Strategic Reserves. Count it and all embarked passengers in the starting reserves allowance. It can make an ingress move in your first Movement phase. '+candidates,'either');
   emit('drop-pod-assault','Drop Pod Assault','Movement','When this Drop Pod is set up, every embarked unit must immediately make a disembark or assault disembark move. Set up all passenger models more than 8″ from every enemy. Assault disembark wholly within 3″, if eligible and placement is possible, retains charge eligibility. After all passengers disembark, Deployment Complete prevents any unit embarking in this Drop Pod again. '+candidates);
   if(groups.length)emit('drop-pod-charge','Drop Pod Assault · charge eligibility','Charge','Only passengers that used an assault disembark move when this Drop Pod arrived retain charge eligibility from that disembarkation. Ordinary rapid/combat disembarkation prevents charging this turn. Follow the more-than-8″ enemy separation required at setup.', 'own','during',groups.flatMap(g=>g.members.map(s=>s.id)));
  }
  if(groups.length){
   if(carrier.unit!=='Drop Pod')emit('embark','Embarkation','Movement','After an eligible formation makes a Normal, Advance or Fall Back move, it can embark if every model is within 3″, it was not set up on the battlefield this turn, and every model fits the remaining capacity. Count all passengers already aboard. Embarked models are not on the battlefield, so abilities requiring battlefield visibility or distance cannot be used from inside. '+candidates);
   emit('disembark','Disembarkation','Movement','An embarked formation can disembark if it did not embark this phase. Normally the transport cannot have Advanced or Fallen Back this phase. After a Normal or ingress move, Rapid Disembark wholly within 3″ and do not charge this turn; ingress placement restrictions also apply. If the transport remained stationary or has not moved, Tactical Disembark wholly within 3″ and unengaged, then select the passengers to make a Normal or Advance move. If Tactical placement is impossible, Combat Disembark wholly within 6″ with a hazard roll per model; engage only enemies already engaging the transport, become Battle-shocked and do not charge this turn. A model physically too large to fit wholly within 3″ can place its base within 1″ of the transport’s base or hull, unengaged. '+candidates);
   if(carrier.unit.startsWith('Land Raider')){
    emit('assault-ramp','Assault Ramp','Movement','When this transport ends a Normal move in your Movement phase, its embarked formations may immediately make an assault disembark move: every model wholly within 3″; passengers must not have embarked this phase and the transport must not have Advanced or Fallen Back this phase. This move has no disembarkation charge prohibition. '+candidates);
    emit('assault-ramp-charge','Assault Ramp · charge eligibility','Charge','Passengers that used this Land Raider’s assault disembark move this turn retain charge eligibility from disembarkation; other charge restrictions still apply.','own','during',groups.flatMap(g=>g.members.map(s=>s.id)));
   }
   if(carrier.unit==='Impulsor')emit('rapid-disembarkation','Rapid Disembarkation','Movement','When this Impulsor ends an Advance move in your Movement phase, embarked formations may immediately make a shock disembark move: every model wholly within 3″, provided the unit did not embark this phase. A unit using shock disembark cannot declare a charge this turn. '+candidates);
   if(carrier.unit==='Repulsor')emit('combat-embarkation','Combat Embarkation','Charge','After an enemy selects charge targets in the opponent’s Charge phase, select one friendly unengaged Adeptus Astartes target of that charge that can embark in this Repulsor. If every model is within 3″ and the whole formation fits the remaining capacity, it can embark. The enemy can then select new charge targets for that charge. '+candidates,'opponent');
   if(carrier.unit==='Thunderhawk Gunship'){
    const deepStrike=groups.filter(g=>spaceMarineFormationHasDeepStrike(army,g,roster));
    if(deepStrike.length)emit('aerial-assault','Aerial Assault','Movement','When this Thunderhawk ends a Normal move in your Movement phase, a formation embarked within it may make an assault disembark move only if every model in that formation has Deep Strike. Place every model wholly within 3″; it must not have embarked this phase and this transport must not have Advanced or Fallen Back. The assault disembark move has no charge prohibition. Eligible complete formations: '+deepStrike.map(g=>g.root.id).join(', ')+'.');
   }
  }
  for(const window of PHASES)emit('emergency','Emergency disembarkation',window,'If this transport is destroyed with passengers aboard, before removing it and before Deadly Demise, make a hazard roll for every embarked model. Set every model wholly within 6″ and as close as possible to the transport, unengaged if possible; only if that is impossible may it be set up engaged. Destroy any model that still cannot be placed. Every disembarked unit becomes Battle-shocked and cannot declare a charge until the end of the turn.','either');
 }
 return rows;
}
