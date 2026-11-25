import type {ArmySelection} from './catalog';
import {EMPERORS_CHILDREN_SHEETS,emperorsChildrenKeywords} from './emperors-children-data';
import type {GeneratedReminder} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(EMPERORS_CHILDREN_SHEETS.map(s=>[s.unit,s]));
export function emperorsChildrenFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Emperor’s Children')return [];
 const snapshot={...army,instances:[...roster]};
 const roots=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(snapshot,s)?.id]));
 return roster.filter(s=>!roots.get(s.id)).map(root=>({root,members:[root,...roster.filter(s=>roots.get(s.id)===root.id)]}));
}
export function emperorsChildrenCargoFormations(army:ArmySelection,transport:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const rhino=transport.unit==='Chaos Rhino',capacity=rhino?12:14;
 if((!rhino&&transport.unit!=='Chaos Land Raider')||!roster.some(s=>s.id===transport.id&&s.unit===transport.unit))return [];
 return emperorsChildrenFormations(army,roster).flatMap(group=>{
  if(group.root.attachedTo||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  let spaces=0;
  for(const member of group.members){
   const tags=emperorsChildrenKeywords(army,member);
   if(!tags.has('EMPEROR’S CHILDREN')||!tags.has('INFANTRY'))return [];
   const heavy=tags.has('TERMINATOR')||tags.has('FLAWLESS BLADES');
   if(rhino&&heavy)return [];
   spaces+=(member.models??sheets.get(member.unit)!.sizes[0])*(heavy?2:1);
  }
  return spaces<=capacity?[{...group,spaces}]:[];
 });
}
export function emperorsChildrenTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Emperor’s Children')return [];
 const reminders:GeneratedReminder[]=[];
 for(const transport of roster.filter(s=>s.unit==='Chaos Rhino'||s.unit==='Chaos Land Raider')){
  const rhino=transport.unit==='Chaos Rhino',groups=emperorsChildrenCargoFormations(army,transport,roster);
  if(!groups.length&&!rhino)continue;
  const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.spaces+' spaces)').join(', ')+'.':'No eligible formation fits.';
  const summary=rhino?'Start this Dedicated Transport with an eligible unit embarked or it is destroyed. Capacity 12.':'Capacity 14. Each Terminator or Flawless Blade costs two spaces.';
  reminders.push({id:'11e-ec-cargo-'+transport.id,title:transport.id+' · Declare passengers',window:'Pre-battle',timing:'during',turn:'either',origin:'unit',source:sheets.get(transport.unit)!.source,units:[transport.id],summary:summary+' '+targets});
  if(groups.length)reminders.push({id:'11e-ec-disembark-'+transport.id,title:transport.id+' · Disembarkation',window:'Movement',timing:'during',turn:'own',origin:'unit',source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',units:[transport.id],summary:'A unit that has not embarked this phase can disembark before the transport moves. After a Normal or ingress move, set it up wholly within 3″. '+(rhino?'It cannot normally charge after that rapid disembarkation. ':'Use Assault Ramp for the printed charge exception. ')+targets});
 }
 return reminders;
}
