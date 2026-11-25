import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {isDreadblade} from './dreadblade-allies';
import {emperorsChildrenKeywords,emperorsChildrenMusterUnits,isLegionsOfExcess} from './emperors-children-data';
import {emperorsChildrenCargoFormations} from './emperors-children-transports';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {isWarhound} from './titan-support-data';

const budget=(a:ArmySelection)=>BATTLE_SIZES_2026[a.battleSize2026??'Strike Force'];
const copyLimit=(army:ArmySelection,tags:ReadonlySet<string>)=>budget(army).unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
export function emperorsChildrenUnitLimit(army:ArmySelection,unit:string):number{
 if(!emperorsChildrenMusterUnits(army).includes(unit))return 0;
 const tags=emperorsChildrenKeywords(army,{unit,id:''});
 if(tags.has('EPIC HERO')||isWarhound(unit))return 1;
 const baseline=copyLimit(army,tags);
 if(!isDreadblade(unit))return baseline;
 const others=expandRoster(army).filter(s=>s.unit!==unit&&isDreadblade(s.unit));
 if(tags.has('TITANIC'))return others.length?0:1;
 if(others.some(s=>emperorsChildrenKeywords(army,s).has('TITANIC')))return 0;
 return Math.min(baseline,Math.max(0,3-others.length));
}
export function emperorsChildrenWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Emperor’s Children')return [];
 const candidates=expandRoster(army).filter(s=>{
  const tags=emperorsChildrenKeywords(army,s);
  return tags.has('CHARACTER')&&tags.has('EMPEROR’S CHILDREN');
 });
 const primarch=candidates.filter(s=>s.unit==='Fulgrim');
 return primarch.length?primarch:candidates;
}
export function resolvedEmperorsChildrenWarlord(army:ArmySelection){
 const candidates=emperorsChildrenWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectEmperorsChildrenWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!emperorsChildrenWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Emperor’s Children Character.');
 return {...army,warlordId:id??undefined};
}
export function emperorsChildrenMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);
 if(army.faction!=='Emperor’s Children'||!roster.length)return [];
 const findings:RosterFinding[]=[];
 const available=new Set(emperorsChildrenMusterUnits(army));
 const costs=rosterCost2026(army),limit=budget(army).points;
 for(const [unit,count] of Object.entries(army.units)){
  if(!available.has(unit)){findings.push({code:'ec-ineligible',severity:'error',unit,message:unit+' is unavailable for this Emperor’s Children detachment or battle size.'});continue;}
  const tags=emperorsChildrenKeywords(army,{id:'',unit}),max=tags.has('EPIC HERO')||isWarhound(unit)?1:copyLimit(army,tags);
  if(count>max)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds the '+max+'-copy limit.'});
 }
 const knights=roster.filter(s=>isDreadblade(s.unit));
 if(knights.length>(knights.some(s=>emperorsChildrenKeywords(army,s).has('TITANIC'))?1:3))findings.push({code:'dreadblade-allowance',severity:'error',message:'Select one Titanic Dreadblade or up to three War Dog models.'});
 for(const s of roster){
  if(s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' requires an eligible Bodyguard with an available slot.'});
  if(isDreadblade(s.unit)&&(army.upgrades2026?.[s.id]||army.upgrades2026?.[s.unit]||s.enhancement))findings.push({code:'dreadblade-enhancement',severity:'error',unit:s.unit,message:s.id+' cannot take an enhancement as a Dreadblade.'});
 }
 const warlord=roster.find(s=>s.id===army.warlordId);
 if(warlord&&!emperorsChildrenKeywords(army,warlord).has('EMPEROR’S CHILDREN'))findings.push({code:'ec-warlord-ineligible',severity:'error',unit:warlord.unit,message:warlord.id+' cannot be your Emperor’s Children Warlord.'});
 if(!resolvedEmperorsChildrenWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Emperor’s Children Character as Warlord. Fulgrim must lead when present.'});
 const allies=costs.entries.filter(e=>isLegionsOfExcess(e.unit)).reduce((sum,e)=>sum+(e.points??0),0);
 if(allies>limit/2)findings.push({code:'legions-of-excess-allowance',severity:'error',message:'Legions of Excess cost '+allies+' points. Carnival of Excess permits up to '+limit/2+' points at this battle size.'});
 const rhinos=roster.filter(s=>s.unit==='Chaos Rhino');
 if(rhinos.length&&emperorsChildrenCargoFormations(army,rhinos[0],roster).length<rhinos.length)findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Chaos Rhino must begin with a separate eligible whole formation embarked.'});
 if(costs.knownPoints>limit)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+limit+' points.'});
 return findings;
}
