import {expect,it} from 'vitest';
import {generate11thReminders} from '../src/reminders-11th';
import {setKnightGear} from '../src/knight-loadouts';
import {rosterCost2026} from '../src/datasheets-2026';
import {rosterFindings} from '../src/roster-findings';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {custodesCargoFits,eligibleCustodesPassengers} from '../src/custodes-transports';
import {custodesRhinoPassengers} from '../src/custodes-muster';
import {instanceBodyguards} from '../src/leader-eligibility';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';

const build=(units:string[],detachment='Guardians of the Throne')=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),{...newSelection('Adeptus Custodes'),detachments2026:[detachment]} as ArmySelection));
const id=(unit:string)=>unit+'#1';
const withLeader=(army:ArmySelection,leader:string,body:string)=>setInstanceAttachment(army,id(leader),id(body));

it('resolves Orion mixed cargo and Coronus Jump Pack exclusions from unsplit legal formations',()=>{
 const orion='Orion Assault Dropship',coronus='Coronus Grav-Carrier',dread='Telemon Heavy Dreadnought',second='Contemptor-Galatus Dreadnought',body='Custodian Wardens',jump='Venatari with Kinetic Destroyers';
 const army=setInstanceModelCount(withLeader(build([orion,coronus,dread,second,'Trajann Valoris',body,jump,'Witchseeker Squad']),'Trajann Valoris',body),id(body),3);
 const [ship,grav]=expandRoster(army);
 expect(eligibleCustodesPassengers(army,ship).map(s=>s.id)).toEqual([dread,second,body,jump].map(id));
 expect(eligibleCustodesPassengers(army,grav).map(s=>s.id)).toEqual([id(body)]);
 for(const passenger of [body,jump])expect(custodesCargoFits(army,ship,[id(dread),id(passenger)])).toBe(true);
 expect(custodesCargoFits(army,ship,[id(dread),id(body),id(jump)])).toBe(false);
 expect(custodesCargoFits(army,ship,[id(body),id(jump)])).toBe(true);
 for(const ids of [[dread,second],[body,body],[body,'Trajann Valoris'],[dread,'Witchseeker Squad']])expect(custodesCargoFits(army,ship,ids.map(id))).toBe(false);
});

it('uses granted Battleline and Authority of the Inquisition only for legal led Bodyguards',()=>{
 const inquisitor='Inquisitor Draxus',coronus='Coronus Grav-Carrier',rhino='Anathema Psykana Rhino',guard='Sentinel Guard Sodality',sisters='Prosecutor Squad';
 let a=build([coronus,rhino,guard,sisters,inquisitor,'Inquisitor Kroyle']);
 const [grav,carrier,,,draxus,kroyle]=expandRoster(a);
 expect(instanceBodyguards(a,draxus)).toContain(guard);
 expect(instanceBodyguards(a,draxus)).not.toContain(sisters);
 expect(instanceBodyguards(a,kroyle)).not.toContain(guard);
 expect(eligibleCustodesPassengers(a,grav).map(s=>s.unit)).toEqual([guard]);
 a=withLeader(a,inquisitor,guard);
 expect(eligibleCustodesPassengers(a,grav).map(s=>s.unit)).toEqual([guard]);
 expect(custodesCargoFits(a,carrier,[id(guard)])).toBe(false);
 a=withLeader({...a,detachments2026:['Null Maiden Vigil']},inquisitor,sisters);
 a=setInstanceModelCount(a,id(sisters),10);
 expect(custodesRhinoPassengers(a).map(group=>group.map(s=>s.unit))).toEqual([[sisters,inquisitor]]);
 expect(custodesCargoFits(a,carrier,[id(sisters)])).toBe(true);
 expect(custodesCargoFits(a,grav,[id(sisters)])).toBe(false);
});


it('prints whole formations and reserve costs for a legal 2,000-point Orion army',()=>{
 let army=build(['Orion Assault Dropship','Telemon Heavy Dreadnought','Trajann Valoris','Custodian Wardens','Venatari with Kinetic Destroyers','Anathema Psykana Rhino','Knight-Centura','Vigilator Squad'],'Null Maiden Vigil');
 army=withLeader(withLeader(army,'Trajann Valoris','Custodian Wardens'),'Knight-Centura','Vigilator Squad');
 army=setInstanceModelCount(setInstanceModelCount(army,id('Custodian Wardens'),3),id('Vigilator Squad'),9);
 expect(rosterCost2026(army).total).toBe(2000);
 expect(rosterFindings(army).filter(f=>f.severity==='error')).toEqual([]);
 const rows=generate11thReminders(army);
 const ship=rows.find(r=>r.title==='Orion Assault Dropship#1 · starting passengers')!;
 expect(ship.units).toEqual(['Orion Assault Dropship','Telemon Heavy Dreadnought','Custodian Wardens','Venatari with Kinetic Destroyers'].map(id));
 expect(ship.summary).toContain('at most one of Custodian Wardens#1 and Venatari with Kinetic Destroyers#1');
 expect(ship.summary).toContain('only 30 points remain. No eligible Infantry formation can start aboard with that Dreadnought.');
 expect(ship.summary).toContain('These formations cannot start aboard it in reserve: Custodian Wardens#1.');
 expect(rows.find(r=>r.title==='Anathema Psykana Rhino#1 · starting passengers')?.summary).toContain('Vigilator Squad#1 + Knight-Centura#1 (10)');
 expect(rows.find(r=>r.title==='Choose disembark mode')?.units).not.toContain(id('Trajann Valoris'));
 expect(rows.filter(r=>r.title==='Destroyed transport · emergency disembark')).toHaveLength(5);
});

it('distinguishes the Sentinel formation shield from the Captain’s bearer-only damage reduction during allocation',()=>{
 const army=withLeader(build(['Sentinel Guard Sodality','Shield-Captain']),'Shield-Captain','Sentinel Guard Sodality');
 const cues=(a:ArmySelection)=>generate11thReminders(a).filter(r=>r.title==='Saving throws for attached formations');
 expect(cues(army).map(r=>r.window)).toEqual(['Movement','Shooting','Fight']);
 for(const r of cues(army)){
  expect(r.units).toEqual([id('Sentinel Guard Sodality')]);
  expect(r.summary).toMatch(/Precision.+visible Character group/);
  expect(r.summary).toMatch(/−1 Damage only to attacks allocated to the Captain/);
 }
 const axe=setKnightGear(army,id('Shield-Captain'),'Weapons','Castellan Axe');
 expect(cues(axe).every(r=>!r.summary.includes('−1 Damage'))).toBe(true);
 expect(cues(setInstanceAttachment(army,id('Shield-Captain'),null))).toEqual([]);
});

it('transfers Scouts to the Dedicated Rhino only with an entire eligible passenger formation',()=>{
 const units=['Anathema Psykana Rhino','Knight-Centura','Witchseeker Squad','Vigilator Squad'];
 const start=build(units), title='Anathema Psykana Rhino#1 · Scouts 7″';
 const mixed=withLeader(start,'Knight-Centura','Vigilator Squad');
 const onlyMixed={...mixed,instances:mixed.instances!.filter(s=>s.unit!=='Witchseeker Squad'),units:{'Anathema Psykana Rhino':1,'Knight-Centura':1,'Vigilator Squad':1}};
 expect(generate11thReminders(onlyMixed).some(r=>r.title===title)).toBe(false);
 expect(generate11thReminders(mixed).find(r=>r.title===title)?.units).toEqual([id('Anathema Psykana Rhino'),id('Witchseeker Squad')]);
 const allScouts=withLeader(start,'Knight-Centura','Witchseeker Squad');
 const scout=generate11thReminders(allScouts).find(r=>r.title===title);
 expect(scout?.units).toEqual([id('Anathema Psykana Rhino'),id('Witchseeker Squad')]);
 expect(scout?.summary).toContain('every model aboard');
});

it('enforces the initial compulsory Aircraft reserve allowance without treating the Orion as an Aircraft',()=>{
 const incursion={...build(['Blade Champion','Ares Gunship']),battleSize2026:'Incursion' as const};
 const problem=(a:ArmySelection)=>rosterFindings(a).find(f=>f.code==='compulsory-reserves');
 expect(problem(incursion)?.message).toContain('580 points and exceed the 500-point');
 expect(problem({...incursion,battleSize2026:'Strike Force'})).toBeUndefined();
 expect(problem({...build(['Blade Champion','Orion Assault Dropship']),battleSize2026:'Incursion'})).toBeUndefined();
 expect(problem(build(['Blade Champion','Ares Gunship','Ares Gunship']))?.message).toContain('1190 points');
});
