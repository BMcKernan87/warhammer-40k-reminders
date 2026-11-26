import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {GREY_KNIGHTS_GATE_UNITS,GREY_KNIGHTS_REVISION} from './grey-knights-data.generated';
import {eligibleGreyKnightsUpgrades} from './grey-knights-detachment-data';
import {greyKnightsFormations} from './grey-knights-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

const gateUnits=new Set(GREY_KNIGHTS_GATE_UNITS);
const armyRule='https://wahapedia.ru/wh40k11ed/factions/grey-knights/#Gate-of-Infinity';

export function greyKnightsGateFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Grey Knights')return [];
 return greyKnightsFormations(army,roster).filter(group=>group.members.every(s=>gateUnits.has(s.unit)));
}

export function greyKnightsGateReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Grey Knights')return [];
 const groups=greyKnightsFormations(army,roster);
 const targets=groups.filter(group=>group.members.every(s=>gateUnits.has(s.unit))).map(g=>g.root.id);
 const mixed=groups.filter(group=>group.members.some(s=>gateUnits.has(s.unit))&&group.members.some(s=>!gateUnits.has(s.unit)));
 if(!targets.length&&!mixed.length)return [];
 const conditional=mixed.map(group=>{
  const outside=group.members.filter(s=>!gateUnits.has(s.unit)).map(s=>s.id);
  return group.root.id+' can use Gate only after '+outside.join(', ')+' no longer belongs to it and a Gate model remains';
 });
 const recipients=' Eligible intact formations: '+(targets.join(', ')||'none')+'.'+(conditional.length?' '+conditional.join('. ')+'.':'');
 const units=[...targets,...mixed.map(group=>group.root.id)];
 const tomes=roster.filter(s=>{
  const equipped=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
  return equipped==='Tome of Forbidden Ways'&&eligibleGreyKnightsUpgrades(army,s.unit,s.id).some(u=>u.name===equipped&&u.detachment==='Brotherhood Strike');
 });
 const cap=army.battleSize2026==='Incursion'?2:3;
 const extra=tomes.length?' If a Tome of Forbidden Ways bearer ('+tomes.map(s=>s.id).join(', ')+') is on the battlefield or in Strategic Reserves, the limit increases to '+(cap+1)+'.':'';
 return [
  {id:'11e-gk-gate-pickup',title:'Gate of Infinity · Enter Strategic Reserves',window:'Fight',timing:'end',turn:'opponent',units,origin:'army',source:armyRule,
   summary:'At the end of your opponent’s Fight phase, select up to '+cap+' unengaged formations on the battlefield and place them in Strategic Reserves. Every model in each formation must currently have Gate of Infinity.'+recipients+extra},
  {id:'11e-gk-gate-arrival',title:'Gate of Infinity · Ingress',window:'Movement',timing:'during',turn:'own',units,origin:'army',source:GREY_KNIGHTS_REVISION.pack,
   summary:'In your next Movement phase, formations removed using Gate of Infinity can make an ingress move, even on your first turn. Use normal ingress placement, or Deep Strike if every model in the arriving formation has that ability. Apply the chosen arrival method’s enemy separation.'+recipients}
 ];
}
