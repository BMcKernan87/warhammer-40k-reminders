import type {ArmySelection} from './catalog';
import {ASSIGNED_AGENT_SHEETS,ASSIGNED_AGENT_UNITS} from './assigned-agent-data';
import type {RosterFinding} from './roster-findings';
import {knightJoinedBodyguard} from './leader-eligibility';
import {agentLoadout} from './assigned-agent-loadouts';
import {knightWeaponCount} from './knight-loadouts';
import {expandRoster,type RosterInstance} from './roster-instances';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
export {assignedAgentReminders} from './assigned-agent-reminders';

export {ASSIGNED_AGENT_SHEETS,ASSIGNED_AGENT_UNITS} from './assigned-agent-data';
export const isAssignedAgent=(unit:string)=>ASSIGNED_AGENT_UNITS.includes(unit);
export function assignedAgentHasRanged(squad:RosterInstance):boolean {
 const card=ASSIGNED_AGENT_DATA.find(row=>row.sheet.unit===squad.unit);
 if(!card)return false;
 const kit=agentLoadout(squad.unit,squad.models);
 return card.weapons.some(w=>w.type==='Ranged'&&(!kit||knightWeaponCount(squad,w.name)>0));
}

export function assignedAgentFindings(army:ArmySelection):RosterFinding[]{
 if(!['Imperial Knights','Adeptus Custodes'].includes(army.faction))return [];
 const agents=expandRoster(army).filter(s=>isAssignedAgent(s.unit));
 if(!agents.length)return [];
 const findings:RosterFinding[]=[];
 const limits={Incursion:[1,1,1],'Strike Force':[2,2,1],Onslaught:[3,3,2]}[army.battleSize2026??'Strike Force'];
 const has=(unit:string,keyword:string)=>{
  const sheet=ASSIGNED_AGENT_SHEETS.find(d=>d.unit===unit);
  return sheet?.keywords?.includes(keyword)||Object.values(sheet?.modelKeywords??{}).some(keys=>keys.includes(keyword));
 };
 const count=(keyword:string)=>agents.filter(s=>has(s.unit,keyword)).length;
 for(const agent of agents){
  if(agent.unit==='Ministorum Priest'&&!agent.attachedTo)findings.push({severity:'error',code:'mandatory-support',unit:agent.unit,message:agent.id+' must join an eligible Bodyguard.'});
  if(agent.attachedTo&&!knightJoinedBodyguard(army,agent))findings.push({severity:'error',code:'invalid-attachment',unit:agent.unit,message:agent.id+' requires an eligible Bodyguard with an available Leader slot.'});
 }
 const excess=(keyword:string,total:number,limit:number)=>{
  if(total>limit)findings.push({severity:'error',code:'assigned-agents-'+keyword.toLowerCase(),message:'This battle size permits '+limit+' allied '+keyword.toLowerCase()+' units. Your roster includes '+total+'.'});
 };
 excess('Character',count('CHARACTER'),limits[0]);
 const exemptHenchmen=Math.min(agents.filter(s=>s.unit==='Inquisitorial Agents').length,count('INQUISITOR'));
 const voidfarerCharacters=agents.filter(s=>has(s.unit,'VOIDFARERS')&&has(s.unit,'CHARACTER')).length;
 const exemptVoidsmen=Math.min(agents.filter(s=>s.unit==='Voidsmen-at-arms').length,voidfarerCharacters);
 excess('Retinue',count('RETINUE')-exemptHenchmen-exemptVoidsmen,limits[1]);
 excess('Requisitioned',count('REQUISITIONED'),limits[2]);
 return findings;
}
