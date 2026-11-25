import type {ArmySelection} from './catalog';
import type {Datasheet2026} from './datasheets-2026';
import type {GeneratedReminder} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

interface LegionCargo {
 faction:'Emperor’s Children'|'Thousand Sons';
 idPrefix:string;
 sheets:readonly Datasheet2026[];
 keywords:(army:ArmySelection,squad:RosterInstance)=>ReadonlySet<string>;
 doubleSpace:readonly string[];
 heavyModels:string;
}
export function legionTransports(config:LegionCargo){
 const sheets=new Map(config.sheets.map(s=>[s.unit,s])),factionTag=config.faction.toUpperCase();
 function formations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
  if(army.faction!==config.faction)return [];
  const snapshot={...army,instances:[...roster]};
  const roots=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(snapshot,s)?.id]));
  return roster.filter(s=>!roots.get(s.id)).map(root=>({root,members:[root,...roster.filter(s=>roots.get(s.id)===root.id)]}));
 }
 function cargo(army:ArmySelection,transport:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
  const rhino=transport.unit==='Chaos Rhino',capacity=rhino?12:14;
  if((!rhino&&transport.unit!=='Chaos Land Raider')||!roster.some(s=>s.id===transport.id&&s.unit===transport.unit))return [];
  return formations(army,roster).flatMap(group=>{
   if(group.root.attachedTo||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
   let spaces=0;
   for(const member of group.members){
    const tags=config.keywords(army,member);
    if(!tags.has(factionTag)||!tags.has('INFANTRY'))return [];
    const heavy=config.doubleSpace.some(tag=>tags.has(tag));
    if(rhino&&heavy)return [];
    spaces+=(member.models??sheets.get(member.unit)!.sizes[0])*(heavy?2:1);
   }
   return spaces<=capacity?[{...group,spaces}]:[];
  });
 }
 function reminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
  if(army.faction!==config.faction)return [];
  const result:GeneratedReminder[]=[];
  for(const transport of roster.filter(s=>s.unit==='Chaos Rhino'||s.unit==='Chaos Land Raider')){
   const rhino=transport.unit==='Chaos Rhino',groups=cargo(army,transport,roster);
   if(!groups.length&&!rhino)continue;
   const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.spaces+' spaces)').join(', ')+'.':'No eligible formation fits.';
   const summary=rhino?'Start this Dedicated Transport with an eligible unit embarked or it is destroyed. Capacity 12.':'Capacity 14. '+config.heavyModels+' take two spaces per model.';
   result.push({id:config.idPrefix+'cargo-'+transport.id,title:transport.id+' · Declare passengers',window:'Pre-battle',timing:'during',turn:'either',origin:'unit',source:sheets.get(transport.unit)!.source,units:[transport.id],summary:summary+' '+targets});
   if(groups.length)result.push({id:config.idPrefix+'disembark-'+transport.id,title:transport.id+' · Disembarkation',window:'Movement',timing:'during',turn:'own',origin:'unit',source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',units:[transport.id],summary:'A unit that has not embarked this phase can disembark before the transport moves. After a Normal or ingress move, set it up wholly within 3″. '+(rhino?'It cannot normally charge after that rapid disembarkation. ':'Use Assault Ramp for the printed charge exception. ')+targets});
  }
  return result;
 }
 return {formations,cargo,reminders};
}
