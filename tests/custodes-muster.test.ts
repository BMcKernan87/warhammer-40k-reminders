import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {custodesMusterFindings,custodesRhinoPassengers,custodesUnitLimit,custodesWarlordCandidates,resolvedCustodesWarlord,selectCustodesWarlord} from '../src/custodes-muster';
import {rosterFindings} from '../src/roster-findings';
import {custodesKeywords} from '../src/adeptus-custodes-data';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {autoAttachUnambiguousInstances,expandRoster,individualArmy,setInstanceModelCount} from '../src/roster-instances';
import {initialStore,validateStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {setKnightGear} from '../src/knight-loadouts';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {CUSTODES_MANUAL} from './fixtures/custodes-manual';

const build=(names:string[],detachment='Emissaries Imperatus'):ArmySelection=>individualArmy(names.reduce((a,u)=>addSelectionUnit(a,u),{...newSelection('Adeptus Custodes'),detachments2026:[detachment]} as ArmySelection));
const issues=(army:ArmySelection)=>custodesMusterFindings(army).map(f=>f.code);
describe('Adeptus Custodes muster',()=>{
 it.each(CUSTODES_MANUAL)('costs %s at every legal strength and repeat-copy threshold and honors legal bodyguards',(unit,bands,bodies)=>{
  const copies=Math.max(3,bands.at(-1)![0]);
  const army=build(Array(copies).fill(unit));
  const sizes=verifiedUnitSizes2026(army,unit)!;
  const min=bands[0][1][0][0],max=bands[0][1].at(-1)![0];
  expect(sizes).toEqual(Array.from({length:max-min+1},(_,i)=>min+i));
  for(const models of sizes){
   const a=expandRoster(army).reduce((prev,s)=>setInstanceModelCount(prev,s.id,models),army);
   expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual(Array.from({length:copies},(_,i)=>(unit==='Shield-Captain'?25:0)+bands.filter(([tier])=>tier<=i+1).at(-1)![1].find(([count])=>count>=models)![1]));
  }
  for(const body of bodies){
   const a=autoAttachUnambiguousInstances(build([unit,body]));
   expect(expandRoster(a)[0].attachedTo).toBe(body+'#1');
   expect(validateStore(JSON.parse(JSON.stringify(initialStore(a))))).toBe(true);
  }
 });
 it('uses printed Sisterhood faction keywords and Null Maiden Vigil Warlord and Battleline exceptions',()=>{
  const ordinary=build(['Knight-Centura','Shield-Captain','Prosecutor Squad']);
  const sister=expandRoster(ordinary)[0];
  expect(custodesKeywords(ordinary,sister).has('ADEPTUS CUSTODES')).toBe(false);
  expect(custodesKeywords(ordinary,sister).has('ANATHEMA PSYKANA')).toBe(true);
  expect(custodesWarlordCandidates(ordinary).map(s=>s.unit)).toEqual(['Shield-Captain']);
  expect(custodesUnitLimit(ordinary,'Prosecutor Squad')).toBe(3);
  const vigil={...ordinary,detachments2026:['Null Maiden Vigil']};
  expect(custodesUnitLimit(vigil,'Prosecutor Squad')).toBe(6);
  expect(issues(selectCustodesWarlord(autoAttachUnambiguousInstances(vigil),sister.id))).toEqual([]);
  expect(resolvedCustodesWarlord(addSelectionUnit(vigil,'Trajann Valoris'))?.unit).toBe('Trajann Valoris');
 });
 it('requires distinct eligible Infantry formations to fill the dedicated Rhinos',()=>{
  let a=build(['Anathema Psykana Rhino','Anathema Psykana Rhino','Knight-Centura','Vigilator Squad','Shield-Captain'],'Null Maiden Vigil');
  expect(custodesRhinoPassengers(a)).toHaveLength(1); // The unattached mandatory Support cannot fill a second Rhino.
  a=autoAttachUnambiguousInstances(a);
  expect(custodesRhinoPassengers(a)).toHaveLength(1);
  expect(issues(a)).toContain('dedicated-transport-passengers');
  a=addSelectionUnit(a,'Prosecutor Squad');
  expect(issues(a)).not.toContain('dedicated-transport-passengers');
 });
 it('bounds Imperial agents and Freeblades independently and excludes allied Warlords',()=>{
  const a={...build(['Shield-Captain','Knight Gallant','Callidus Assassin','Eversor Assassin']),battleSize2026:'Incursion' as const};
  expect(custodesWarlordCandidates(a).map(s=>s.unit)).toEqual(['Shield-Captain']);
  expect(issues(a)).toContain('assigned-agents-character');
  expect(issues(addSelectionUnit(a,'Armiger Warglaive'))).toContain('freeblade-allowance');
 });
 it('includes actual native and allied shooters and requires eligible passengers for an allied Rhino',()=>{
  const army=build(['Vigilator Squad','Vindicare Assassin','Imperial Rhino','Armiger Helverin'],'Null Maiden Vigil');
  const overwatch=generate11thReminders(army).find(rule=>rule.id==='11e-core-overwatch');
  expect(overwatch?.units).toEqual(expect.arrayContaining(['Vindicare Assassin#1','Imperial Rhino#1','Armiger Helverin#1']));
  expect(overwatch?.units).not.toContain('Vigilator Squad#1');
  expect(rosterFindings(army).map(f=>f.code)).toContain('agent-transport-passengers');
  expect(rosterFindings(addSelectionUnit(army,'Imperial Navy Breachers')).map(f=>f.code)).not.toContain('agent-transport-passengers');
  expect(generate11thReminders(army).some(rule=>rule.origin==='unit'&&rule.units?.includes('Vindicare Assassin#1')&&rule.title.includes('Vindicare'))).toBe(true);
 });
 it('charges the Captain’s shield per equipped copy in addition to eligible enhancements',()=>{
  let army=build(['Shield-Captain','Shield-Captain']);
  expect(rosterCost2026(army).entries.map(e=>e.points)).toEqual([205,225]);
  army=setKnightGear(army,'Shield-Captain#2','Weapons','Guardian Spear');
  army=selectUpgrade2026(army,'Shield-Captain#1','Edge of the Blade');
  expect(rosterCost2026(army).entries.map(e=>e.points)).toEqual([220,200]);
  expect(generate11thReminders(army).some(r=>r.title.includes('Edge of the Blade'))).toBe(true);
 });
 it('keeps older Custodian Guard profiles editable while retaining instance-specific references',()=>{
  const army=autoAttachUnambiguousInstances(build(['Custodian Guard Sodality','Shield-Captain']));
  const raw=JSON.parse(JSON.stringify(initialStore(army)).replaceAll('Custodian Guard Sodality','Custodian Guard'));
  const reopened=openSavedArmies(raw);
  expect(reopened.retained).toEqual([]);
  const updated=reopened.store.profiles[0].army;
  expect(validateSelection(updated)).toBe(true);
  expect(updated.units).toEqual({'Custodian Guard Sodality':1,'Shield-Captain':1});
  expect(expandRoster(updated)[1].attachedTo).toBe('Custodian Guard#1');
  expect(rosterCost2026(updated).total).toBe(445);
 });
});
