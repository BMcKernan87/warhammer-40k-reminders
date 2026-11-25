import type {ArmySelection} from './catalog';
import {DATASHEETS_2026} from './datasheets-2026';
import type {GeneratedReminder} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const rhino='Imperial Rhino',chimera='Inquisitorial Chimera',immolator='Sisters of Battle Immolator',corvus='Corvus Blackstar';
const capacity:Record<string,number>={[rhino]:12,[chimera]:13,[immolator]:6,[corvus]:12};
const authority=new Set(['Inquisitor','Inquisitor Coteaz','Inquisitor Draxus','Inquisitor Greyfax']);
const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
interface Passenger {body:RosterInstance; members:RosterInstance[]}
interface Transport {id:string;unit:string}

export function agentTransports(army:ArmySelection){
  const roster=expandRoster(army);
  const vehicles=roster.filter(s=>Object.hasOwn(capacity,s.unit));
  if(!vehicles.length)return {cues:[] as GeneratedReminder[],eligible:new Map<string,string[]>(),dedicatedSatisfied:true,required:[] as string[]};
  const required=vehicles.filter(s=>s.unit!==corvus);
  const sheets=new Map(DATASHEETS_2026.filter(s=>s.faction===army.faction).map(s=>[s.unit,s]));
  const sizes=(s:RosterInstance)=>s.models??sheets.get(s.unit)?.sizes[0]??1;
  const space=(s:RosterInstance)=>sizes(s)+(sheets.get(s.unit)?.compositionBySize?.[sizes(s)]?.['Gravis Veteran']??0);
  const bodyIds=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
  const parties:Passenger[]=roster.filter(s=>!bodyIds.get(s.id)&&!Object.hasOwn(capacity,s.unit)).map(body=>({
    body,members:roster.filter(member=>bodyIds.get(member.id)===body.id)
  }));
  function accepts(vehicle:string,model:RosterInstance){
    const tags=sheets.get(model.unit)?.keywords??[];
    if(vehicle===chimera)return !tags.includes('TERMINATOR')&&(model.unit==='Inquisitorial Agents'||tags.includes('INQUISITOR')&&tags.includes('INFANTRY'));
    if(!tags.includes('INFANTRY'))return false;
    if(vehicle===rhino)return tags.includes('AGENTS OF THE IMPERIUM')&&!tags.includes('TERMINATOR')&&!tags.includes('OFFICIO ASSASSINORUM');
    if(vehicle===corvus)return tags.includes('DEATHWATCH');
    return vehicle===immolator&&tags.includes('ORDO HERETICUS');
  }
  function fits(vehicle:string,p:Passenger,bodySize=space(p.body),members=p.members){
    if(!accepts(vehicle,p.body))return false;
    return members.every(s=>authority.has(s.unit)||accepts(vehicle,s))&&bodySize+members.reduce((n,s)=>n+space(s),0)<=capacity[vehicle];
  }

  const cues:GeneratedReminder[]=[];
  const canSplit=vehicles.some(s=>s.unit===immolator);
  const sisters=canSplit?parties.filter(p=>p.body.unit==='Sisters of Battle Squad'):[];
  const eligible=new Map<string,string[]>();
  for(const v of vehicles){
    const names=parties.filter(p=>fits(v.unit,p)).map(p=>p.body.id);
    const split=sisters.filter(p=>fits(v.unit,p,Math.ceil(sizes(p.body)/2),[])).map(p=>p.body.id);
    eligible.set(v.id,names);
    if(!names.length&&!split.length)continue;
    const source=sheets.get(v.unit)?.source??core;
    const options=[names.length?'Whole formations that fit: '+names.join(', ')+'.':'',
      split.length?'With an Immolator splitting a Sisters squad, that squad may provide a half-strength passenger unit: '+split.join(', ')+'. Match attached models to the seats in each transport.':''].filter(Boolean).join(' ');
    cues.push({id:'11e-agents-transport-'+v.id,title:v.id+' · embarkation',window:'Pre-battle',timing:'during',turn:'either',origin:'unit',source,units:[v.id],
      summary:'Capacity '+capacity[v.unit]+' models. '+options+(v.unit===immolator?' At the start of Declare Battle Formations, divide one Sisters squad as evenly as possible. One half must start aboard this Immolator. The other can deploy separately or embark in another eligible transport.':'')});
    cues.push({id:'11e-agents-disembark-'+v.id,title:v.id+' · disembarkation',window:'Movement',timing:'during',turn:'own',origin:'unit',source:core,units:[v.id],
      summary:'An embarked unit can disembark if it did not embark this phase and the transport did not Advance or Fall Back. From a transport that moved normally or made ingress, disembark within 3″ and forgo charging this turn. Before it moves, use Tactical or Combat disembarkation, observing the placement and Hazard rules.'});
  }
  // Each compulsory transport needs one distinct passenger. Splitting a Sisters unit
  // uses one Immolator and yields one further half. Try both halves with every legal
  // distribution of attached characters, then match remaining whole formations.
  const failed=new Set<string>();
  function canFill(transports:Transport[],remaining:Passenger[],halves:{party:Passenger;size:number;members:RosterInstance[]}[]):boolean{
    if(transports.length>remaining.length+halves.length+Math.min(remaining.filter(p=>sisters.includes(p)).length,transports.filter(t=>t.unit===immolator).length))return false;
    const state=JSON.stringify([transports.map(t=>t.unit),remaining.map(p=>[p.body.unit,space(p.body),p.members.map(m=>m.unit).sort()]).sort(),halves.map(h=>[h.size,h.members.map(s=>s.unit).sort()]).sort()]);
    if(failed.has(state))return false;
    const options=remaining.map(p=>(t:Transport)=>fits(t.unit,p)).concat(halves.map(h=>(t:Transport)=>fits(t.unit,h.party,h.size,h.members)));
    const taken=new Map<number,number>();
    function seat(t:number,seen:Set<number>):boolean{
      for(let i=0;i<options.length;i++){
        if(seen.has(i)||!options[i](transports[t]))continue;
        seen.add(i);
        const prior=taken.get(i);
        if(prior===undefined||seat(prior,seen)){taken.set(i,t);return true;}
      }
      return false;
    }
    if(transports.every((_,t)=>seat(t,new Set())))return true;
    const anchor=transports.find(t=>t.unit===immolator);
    if(!anchor)return false;
    for(const p of remaining.filter(p=>sisters.includes(p))){
      const small=Math.floor(sizes(p.body)/2),large=sizes(p.body)-small;
      for(const n of new Set([small,large])){
        const groups:RosterInstance[][]=[[]];
        for(const m of p.members)groups.push(...groups.map(g=>[...g,m]));
        for(const aboard of groups){
          if(!fits(immolator,p,n,aboard))continue;
          const other={party:p,size:sizes(p.body)-n,members:p.members.filter(s=>!aboard.includes(s))};
          if(canFill(transports.filter(t=>t!==anchor),remaining.filter(g=>g!==p),[...halves,other]))return true;
        }
      }
    }
    failed.add(state);
    return false;
  }
  return {cues,eligible,dedicatedSatisfied:canFill(required,parties,[]),required:required.map(v=>v.id)};
}
