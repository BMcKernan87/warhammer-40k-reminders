import type {ArmySelection} from './catalog';
import {astraSheets,loyalProtectors} from './astra-army-data';
import {expandRoster,type RosterInstance} from './roster-instances';

export function astraProtectorHosts(army:ArmySelection,id:string,roster=expandRoster(army)):RosterInstance[]{
 if(army.faction!=='Astra Militarum'||!roster.some(s=>s.id===id&&loyalProtectors.has(s.unit)&&!s.attachedTo))return [];
 return roster.filter(host=>astraSheets.get(host.unit)?.keywords?.includes('COMMAND SQUAD')&&!host.retinueTo&&
  !roster.some(s=>s.id!==id&&loyalProtectors.has(s.unit)&&s.retinueTo===host.id));
}
export function astraJoinedCommand(army:ArmySelection,s:RosterInstance){
 return s.retinueTo?astraProtectorHosts(army,s.id).find(host=>host.id===s.retinueTo):undefined;
}
export function setAstraProtector(army:ArmySelection,id:string,commandId:string|null):ArmySelection{
 const roster=expandRoster(army);
 if(army.faction!=='Astra Militarum'||!roster.some(s=>s.id===id&&loyalProtectors.has(s.unit))||
  commandId!==null&&!astraProtectorHosts(army,id,roster).some(s=>s.id===commandId))throw Error('Select one Command Squad without another Loyal Protector.');
 return {...army,instances:roster.map(s=>s.id===id?{...s,retinueTo:commandId??undefined}:s)};
}
export function reconcileAstraProtectors(army:ArmySelection):ArmySelection{
 if(!army.instances)return army;
 const instances=army.instances.map(s=>s.retinueTo&&!astraJoinedCommand(army,s)?{...s,retinueTo:undefined}:s);
 return {...army,instances};
}
export function autoAstraProtector(army:ArmySelection):ArmySelection{
 if(army.faction!=='Astra Militarum'||!army.instances)return army;
 const pending=army.instances.filter(s=>loyalProtectors.has(s.unit)&&!s.retinueTo);
 if(pending.length!==1)return army;
 const [protector]=pending,hosts=astraProtectorHosts(army,protector.id);
 return hosts.length===1?setAstraProtector(army,protector.id,hosts[0].id):army;
}
