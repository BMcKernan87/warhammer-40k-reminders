import type {ArmySelection} from './catalog';
import {DAEMONIC_PACT_SHEETS} from './daemonic-pact-data.generated';
import type {RosterCost2026} from './datasheets-2026';
import type {RosterFinding} from './roster-findings';
import type {RosterInstance} from './roster-instances';

export const DAEMONIC_ALLEGIANCES=['Khorne','Tzeentch','Nurgle','Slaanesh'] as const;
type Allegiance=typeof DAEMONIC_ALLEGIANCES[number];
const pact=new Map(DAEMONIC_PACT_SHEETS.map(sheet=>[sheet.unit,sheet]));
const variable=new Set(['Daemon Prince of Chaos','Daemon Prince Of Chaos With Wings','Soul Grinder']);
const caps={Incursion:250,'Strike Force':500,Onslaught:750} as const;

export function isDaemonicPactUnit(unit:string):boolean {
 return pact.has(unit);
}

export function daemonicPactAllegiance(squad:RosterInstance):Allegiance|undefined {
 if(variable.has(squad.unit)){
  const chosen=squad.knightGear?.['Daemonic allegiance']??'Khorne';
  return DAEMONIC_ALLEGIANCES.find(god=>god===chosen);
 }
 const keywords=pact.get(squad.unit)?.keywords;
 return DAEMONIC_ALLEGIANCES.find(god=>keywords?.includes(god.toUpperCase()));
}

export function daemonicPactFindings(army:ArmySelection,roster:readonly RosterInstance[],costs:RosterCost2026):RosterFinding[] {
 const allies=roster.filter(squad=>pact.has(squad.unit));
 if(!allies.length)return [];
 const findings:RosterFinding[]=[];
 const entries=costs.entries.filter(entry=>pact.has(entry.unit));
 const subtotal=entries.reduce((total,entry)=>total+(entry.points??0),0);
 const cap=caps[army.battleSize2026??'Strike Force'];
 if(subtotal>cap)findings.push({code:'daemonic-pact-points',severity:'error',message:'Daemonic Pact allies cost '+subtotal+' points, exceeding the '+cap+'-point allowance.'});
 else if(entries.some(entry=>entry.points===null))findings.push({code:'daemonic-pact-cost-unknown',severity:'error',message:'Complete the allied selections to verify the '+cap+'-point Daemonic Pact allowance.'});
 for(const god of DAEMONIC_ALLEGIANCES){
  const followers=allies.filter(squad=>daemonicPactAllegiance(squad)===god);
  const battleline=followers.filter(squad=>pact.get(squad.unit)?.keywords?.includes('BATTLELINE')).length;
  const others=followers.length-battleline;
  if(others>battleline)findings.push({code:'daemonic-pact-battleline',severity:'error',message:god+' has '+others+' non-Battleline allied '+(others===1?'unit':'units')+' and '+battleline+' Battleline. Include at least one '+god+' Battleline unit per non-Battleline unit.'});
 }
 for(const squad of allies){
  if(variable.has(squad.unit)&&!daemonicPactAllegiance(squad))findings.push({code:'daemonic-allegiance',unit:squad.unit,severity:'error',message:'Choose a Daemonic Allegiance for '+squad.id+'.'});
  if(squad.id===army.warlordId)findings.push({code:'daemonic-pact-warlord',unit:squad.unit,severity:'error',message:squad.id+' cannot be the Warlord when taken through Daemonic Pact.'});
  if(squad.enhancement||army.enhancements?.[squad.unit]||army.upgrades2026?.[squad.id]||army.upgrades2026?.[squad.unit])findings.push({code:'daemonic-pact-enhancement',unit:squad.unit,severity:'error',message:squad.id+' cannot receive an enhancement when taken through Daemonic Pact.'});
 }
 return findings;
}
