import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import type {GeneratedReminder} from './generated-reminders';
import {ORK_REVISION} from './ork-data.generated';
import {ORK_SHEETS} from './ork-data';
import {orkCargoGroups,orkMandatoryReservePoints,orkTransportCapacity} from './ork-muster';
import {expandRoster,type RosterInstance} from './roster-instances';
import {transportMovementReminders} from './transport-movement';

export {eligibleOrkPassengers} from './ork-muster';
const sheets=new Map(ORK_SHEETS.map(s=>[s.unit,s]));
export function orkTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Orks')return [];
 const carriers=roster.filter(s=>orkTransportCapacity(s)>0);
 if(!carriers.length)return [];
 const rows:GeneratedReminder[]=[];
 const roots=new Set<string>(),occupied:string[]=[];
 const cost=rosterCost2026(army);
 const prices=new Map(cost.entries.map(e=>[e.id,e.points]));
 const reserveLimit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points/2-orkMandatoryReservePoints(army,cost.entries);
 for(const carrier of carriers){
  const groups=orkCargoGroups(army,carrier,roster),cap=orkTransportCapacity(carrier),trukk=carrier.unit==='Trukk';
  if(!trukk&&!groups.length)continue;
  const notes=['Declare whole formations with no more than '+cap+' transport spaces between them.'];
  if(trukk)notes.push('Each Trukk must start with a separate eligible formation aboard. An empty Trukk is destroyed at the end of Declare Battle Formations without triggering destruction rules.');
  if(groups.length){
   occupied.push(carrier.id);
   for(const group of groups)roots.add(group.root.id);
   notes.push('Eligible formations and spaces: '+groups.map(g=>g.members.map(s=>s.id).join(' + ')+' ('+g.spaces+')').join(', ')+'.');
   if(groups.some(g=>g.root.unit==='Gretchin'))notes.push('Downtrodden counts each pair of Gretchin, rounding up, as one space. Attached characters use their own spaces.');
   const price=prices.get(carrier.id);
   if(price!=null&&!sheets.get(carrier.unit)?.keywords?.includes('FORTIFICATION')){
    const available=reserveLimit-price;
    const tooLarge=groups.filter(g=>g.members.every(s=>prices.get(s.id)!=null)&&g.members.reduce((p,s)=>p+prices.get(s.id)!,0)>available);
    if(available<0)notes.push('This transport exceeds the remaining starting Strategic Reserves allowance and must deploy on the battlefield.');
    else if(tooLarge.length)notes.push('In starting Strategic Reserves this transport leaves '+available+' points for cargo and other optional reserves. These formations cannot start aboard it there: '+tooLarge.map(g=>g.root.id).join(', ')+'.');
   }
  }else notes.push('This roster has no eligible passengers for this Trukk.');
  const source=carrier.unit==='Gargantuan Squiggoth'?ORK_REVISION.forgeWorldPack+'#page=23':sheets.get(carrier.unit)!.source;
  rows.push({id:'11e-ork-cargo-'+carrier.id,title:carrier.id+' · starting passengers',window:'Pre-battle',timing:'start',turn:'either',summary:notes.join(' '),units:[carrier.id,...groups.map(g=>g.root.id)],source,origin:'unit'});
 }
 return [...rows,...transportMovementReminders('11e-ork-',[...roots],occupied)];
}
