import type {ArmySelection} from './catalog';
import {ASSIGNED_AGENT_SHEETS,ASSIGNED_AGENT_UNITS} from './assigned-agent-data';
import type {RosterFinding} from './roster-findings';
import {expandRoster} from './roster-instances';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
export {assignedAgentReminders} from './assigned-agent-reminders';

export {ASSIGNED_AGENT_SHEETS,ASSIGNED_AGENT_UNITS} from './assigned-agent-data';
export const isAssignedAgent=(unit:string)=>ASSIGNED_AGENT_UNITS.includes(unit);
export const assignedAgentHasRanged=(unit:string)=>ASSIGNED_AGENT_DATA.some(r=>r.sheet.unit===unit&&r.weapons.some(w=>w.type==='Ranged'));

export function assignedAgentFindings(army:ArmySelection):RosterFinding[]{
 if(army.faction!=='Imperial Knights')return [];
 const agents=expandRoster(army).filter(s=>isAssignedAgent(s.unit));
 if(!agents.length)return [];
 const findings:RosterFinding[]=[];
 const limits={Incursion:[1,1,1],'Strike Force':[2,2,1],Onslaught:[3,3,2]}[army.battleSize2026??'Strike Force'];
 const count=(keyword:string)=>agents.filter(s=>ASSIGNED_AGENT_SHEETS.find(d=>d.unit===s.unit)?.keywords?.includes(keyword)).length;
 const excess=(keyword:string,total:number,limit:number)=>{
  if(total>limit)findings.push({severity:'error',code:'assigned-agents-'+keyword.toLowerCase(),message:'This battle size permits '+limit+' allied '+keyword.toLowerCase()+' units. Your roster includes '+total+'.'});
 };
 excess('Character',count('CHARACTER'),limits[0]);
 const exemptHenchmen=Math.min(agents.filter(s=>s.unit==='Inquisitorial Agents').length,count('INQUISITOR'));
 const voidfarerCharacters=agents.filter(s=>{const keywords=ASSIGNED_AGENT_SHEETS.find(d=>d.unit===s.unit)?.keywords;return keywords?.includes('VOIDFARERS')&&keywords.includes('CHARACTER');}).length;
 const exemptVoidsmen=Math.min(agents.filter(s=>s.unit==='Voidsmen-at-arms').length,voidfarerCharacters);
 excess('Retinue',count('RETINUE')-exemptHenchmen-exemptVoidsmen,limits[1]);
 excess('Requisitioned',count('REQUISITIONED'),limits[2]);
 return findings;
}
