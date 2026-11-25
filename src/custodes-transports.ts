import {CUSTODES_ARMY_SHEETS,custodesKeywords} from './adeptus-custodes-data';
import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import type {ArmySelection} from './catalog';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(CUSTODES_ARMY_SHEETS.map(s=>[s.unit,s]));
export const SISTERS_RHINO='Anathema Psykana Rhino';
const CORONUS='Coronus Grav-Carrier', ORION='Orion Assault Dropship';
export const CUSTODES_CARRIERS=[SISTERS_RHINO,CORONUS,ORION] as const;

export function custodesPassengerCount(members:readonly RosterInstance[]):number {
 return members.reduce((total,s)=>total+(s.models??sheets.get(s.unit)?.sizes[0]??1),0);
}

export function custodesPassengerFormations(army:ArmySelection,carrier:string,roster:readonly RosterInstance[]=expandRoster(army)):RosterInstance[][] {
 if(army.faction!=='Adeptus Custodes'||!CUSTODES_CARRIERS.some(name=>name===carrier))return [];
 const all=roster.filter(s=>!s.attachedTo&&!s.retinueTo&&sheets.get(s.unit)?.attachmentRole!=='support');
 const joined=new Map(roster.filter(s=>s.attachedTo).map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 return all.flatMap(root=>{
  const escorts=roster.filter(s=>s.attachedTo===root.id);
  if(escorts.some(s=>joined.get(s.id)!==root.id))return [];
  const group=[root,...escorts];
  // The October codex grants the Orion a Dreadnought berth, including a Telemon.
  // The Coronus excludes Jump Pack models, while the Orion's infantry berth does not.
  const fits=group.every(s=>{
   const keywords=custodesKeywords(army,s);
   if(s!==root&&BATTLELINE_INQUISITORS.has(s.unit))return true;
   if(carrier===ORION&&keywords.has('DREADNOUGHT'))return group.length===1;
   const faction=carrier===SISTERS_RHINO?'ANATHEMA PSYKANA':'ADEPTUS CUSTODES';
   return keywords.has(faction)&&keywords.has('INFANTRY')&&(carrier!==CORONUS||!keywords.has('JUMP PACK'));
  });
  return fits&&custodesPassengerCount(group)<=(carrier===CORONUS?8:12)?[group]:[];
 });
}

export function eligibleCustodesPassengers(army:ArmySelection,transport:RosterInstance,roster?:readonly RosterInstance[]):RosterInstance[] {
 return custodesPassengerFormations(army,transport.unit,roster).map(([root])=>root);
}

export function custodesCargoFits(army:ArmySelection,transport:RosterInstance,ids:readonly string[],roster?:readonly RosterInstance[]):boolean {
 if(!ids.length||new Set(ids).size!==ids.length)return false;
 const selected=custodesPassengerFormations(army,transport.unit,roster).filter(([root])=>ids.includes(root.id));
 if(selected.length!==ids.length)return false;
 const dreadnoughts=selected.filter(([root])=>custodesKeywords(army,root).has('DREADNOUGHT'));
 const infantry=custodesPassengerCount(selected.filter(group=>!dreadnoughts.includes(group)).flat());
 return dreadnoughts.length<=1&&infantry<=(dreadnoughts.length?6:transport.unit===CORONUS?8:12);
}
