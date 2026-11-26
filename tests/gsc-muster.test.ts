import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {gscMusterUnits,gscWarlordCandidates,identifySavedAcolytes,selectGscWarlord,gscUnitLimit} from '../src/gsc-muster';
import {gscFiringDeckModelSlots,gscGuardModelSpaces,gscMissingPassengers,gscTransportOptions} from '../src/gsc-army-transports';
import {knightJoinedBodyguard} from '../src/leader-eligibility';
import {generate11thReminders} from '../src/reminders-11th';
import {rosterFindings} from '../src/roster-findings';
import {autoAttachUnambiguousInstances,expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {initialStore,validateStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {GSC_LEADERS} from './fixtures/gsc-leaders';

const guard='Brood Brothers Auxilia',vanguard='Final Day',troops='Cadian Shock Troops',neophytes='Neophyte Hybrids',gunner='Achilles Ridgerunners';
const build=(names:string[],detachment=guard)=>individualArmy(names.reduce((a,n)=>addSelectionUnit(a,n),{...newSelection('Genestealer Cults'),detachments2026:[detachment]} as ArmySelection));
const first=(army:ArmySelection,unit:string)=>expandRoster(army).find(s=>s.unit===unit)!;
const findings=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
const passengers=(a:ArmySelection,unit:string)=>gscTransportOptions(a).find(o=>o.transport.unit===unit)?.passengers;
const cost=(a:ArmySelection)=>rosterCost2026(a).knownPoints;

describe('Genestealer Cults native and conditional allied muster',()=>{
 it.each(GSC_LEADERS)('joins %s to every printed native bodyguard and rejects a foreign one',(leader,bodies)=>{
  for(const body of bodies){
   const a=autoAttachUnambiguousInstances(build([leader,body]));
   expect(knightJoinedBodyguard(a,first(a,leader))?.unit).toBe(body);
   expect(validateSelection(a)).toBe(true);
  }
  const wrong=build([leader,troops]);
  expect(()=>setInstanceAttachment(wrong,leader+'#1',troops+'#1')).toThrow();
 });
 it('places a Support and a Leader in separate roles and detects unfilled or overbooked slots',()=>{
  const a=autoAttachUnambiguousInstances(build(['Nexos','Primus',neophytes]));
  expect([first(a,'Nexos').attachedTo,first(a,'Primus').attachedTo]).toEqual([neophytes+'#1',neophytes+'#1']);
  const extra=addSelectionUnit(a,'Clamavus');
  expect(findings(extra)).toContain('mandatory-support');
  expect(()=>setInstanceAttachment(extra,'Clamavus#1',neophytes+'#1')).toThrow();
  const both=addSelectionUnit(extra,'Hybrid Metamorphs');
  expect(findings(setInstanceAttachment(both,'Clamavus#1','Hybrid Metamorphs#1'))).not.toContain('mandatory-support');
 });
 it('requires a single Patriarch to be Warlord and never offers a foreign Character',()=>{
  const a=build(['Magus','Nexos','Cadian Castellan',neophytes]);
  expect(gscWarlordCandidates(a).map(s=>s.unit)).toEqual(['Magus','Nexos']);
  expect(()=>selectGscWarlord(a,'Cadian Castellan#1')).toThrow();
  expect(findings(a)).toContain('warlord-required');
  const patriarch=addSelectionUnit(selectGscWarlord(a,'Magus#1'),'Patriarch');
  expect(gscWarlordCandidates(patriarch).map(s=>s.id)).toEqual(['Patriarch#1']);
  expect(gscUnitLimit(patriarch,'Patriarch')).toBe(1);
  expect(findings(addSelectionUnit(patriarch,'Patriarch'))).toContain('rule-of-three');
 });
 it('gates allied options, costs paid native guns per model, and prices eligible Final Day upgrades in the ally cap',()=>{
  const bare=build([gunner,'Patriarch'],'Biosanctic Broodsurge');
  expect(gscMusterUnits(bare)).toHaveLength(24);
  for(const foreign of ['Ogryn Squad','Genestealers','Broodlord']){
   const illegal={...bare,units:{...bare.units,[foreign]:1},instances:[...expandRoster(bare),{id:foreign+'#1',unit:foreign}]};
   expect(findings(illegal)).toContain('gsc-ineligible');
  }
  expect(gscMusterUnits({...bare,detachments2026:[guard]})).toHaveLength(76);
  expect(gscMusterUnits({...bare,detachments2026:[vanguard]})).toHaveLength(38);
  expect(findings(addSelectionUnit(bare,'Winged Hive Tyrant'))).toContain('gsc-allied-detachment');
  const two=setInstanceModelCount(bare,gunner+'#1',2);
  expect(rosterCost2026(two).entries.find(s=>s.unit===gunner)).toMatchObject({basePoints:160,wargearPoints:20,points:180});
  const mixed=setKnightGear(two,gunner+'#1','Ridgerunner 1 main gun','Heavy mortar');
  expect(cost(mixed)).toBe(cost(two)-10);
  const army={...build(['Magus','Winged Hive Tyrant','Winged Hive Tyrant','The Red Terror'],vanguard),battleSize2026:'Incursion' as const};
  expect(findings(army)).not.toContain('gsc-allied-points');
  const upgraded=selectUpgrade2026(army,'Winged Hive Tyrant#1','Vanguard Tyrant');
  expect(cost(upgraded)).toBe(cost(army)+25);
  expect(findings(upgraded)).toContain('gsc-allied-points');
  expect(()=>selectUpgrade2026(army,'Magus#1','Vanguard Tyrant')).toThrow();
 });
 it('counts whole Cult formations, with every attached Character occupying one space',()=>{
  const a=autoAttachUnambiguousInstances(build(['Primus','Nexos',neophytes,'Goliath Truck','Goliath Rockgrinder','Cadian Castellan']));
  expect(passengers(a,'Goliath Truck')).toEqual([neophytes+'#1']);
  expect(passengers(a,'Goliath Rockgrinder')).toEqual([]);
  expect(gscMissingPassengers(a)).toBe(false);
  expect(gscMissingPassengers(addSelectionUnit(a,'Goliath Truck'))).toBe(true);
  expect(gscMissingPassengers(setInstanceModelCount(a,neophytes+'#1',11))).toBe(true);
 });
 it('preserves Command Squad model restrictions and assigns different cargo to two dedicated Guard hulls',()=>{
  const a=build(['Chimera','Taurox Prime','Cadian Castellan',troops,'Cadian Command Squad','Cyclops Demolition Vehicle']);
  expect(passengers(a,'Taurox Prime')).toEqual(['Cadian Castellan#1']);
  expect(passengers(a,'Chimera')).toContain('Cyclops Demolition Vehicle#1');
  expect(passengers(a,'Chimera')).toContain('Cadian Command Squad#1');
  expect(gscMissingPassengers(a)).toBe(false);
  const joined=setInstanceAttachment(a,'Cadian Castellan#1',troops+'#1');
  expect(passengers(joined,'Taurox Prime')).toEqual([]);
  expect(gscMissingPassengers(joined)).toBe(true);
  expect(gscFiringDeckModelSlots('Cadian Heavy Weapons Squad','Heavy Weapon Team')).toBe(2);
  expect(gscFiringDeckModelSlots('Catachan Heavy Weapons Squad','Heavy Weapons Team')).toBe(2);
  expect(gscFiringDeckModelSlots('Krieg Heavy Weapons Squad','Heavy Weapons Gunner')).toBe(2);
  expect(gscFiringDeckModelSlots('Krieg Heavy Weapons Squad','Fire Coordinator')).toBe(1);
  expect(gscGuardModelSpaces('Cyclops Demolition Vehicle','Cyclops Demolition Vehicle')).toBe(7);
 });
 it('fits a single Monster or 20 Tyranid infantry places and rejects multi-wound formations over that allowance',()=>{
  const a=autoAttachUnambiguousInstances(build(['Tyrannocyte','Winged Hive Tyrant','Winged Tyranid Prime','Gargoyles','Hyperadapted Raveners','Raveners','Kelermorph'],vanguard));
  expect(passengers(a,'Tyrannocyte')).toEqual(['Winged Hive Tyrant#1','Gargoyles#1']);
  const detached=setInstanceAttachment(a,'Hyperadapted Raveners#1',null);
  expect(passengers(detached,'Tyrannocyte')).toContain('Raveners#1');
  const oversized=setInstanceModelCount(a,'Gargoyles#1',20);
  expect(passengers(oversized,'Tyrannocyte')).not.toContain('Gargoyles#1');
  expect(gscMissingPassengers(build(['Tyrannocyte','Tyrannocyte'],vanguard))).toBe(true);
  expect(generate11thReminders(a).map(r=>r.id)).not.toContain('11e-gsc-disembark-Tyrannocyte#1');
 });
 it('keeps old saved squads independently editable, with ID references, and restores the canonical detachment',()=>{
  const old={...newSelection('Genestealer Cults'),units:{'Acolyte Hybrids':2},detachments2026:['Brood Brothers Auxillia']};
  const store=openSavedArmies(initialStore(old));
  expect(store.retained).toEqual([]);
  expect(store.store.profiles[0].army.detachments2026).toEqual([guard]);
  let a=individualArmy(store.store.profiles[0].army);
  const ids=expandRoster(a).map(s=>s.id);
  expect(findings(a)).toContain('gsc-acolyte-variant');
  a=identifySavedAcolytes(a,ids[0],'Acolyte Hybrids With Autopistols');
  a=identifySavedAcolytes(a,ids[1],'Acolyte Hybrids With Hand Flamers');
  expect(expandRoster(a).map(s=>s.id)).toEqual(ids);
  expect(cost(a)).toBe(140);
  expect(findings(a)).not.toContain('gsc-acolyte-variant');
  expect(validateStore(initialStore(a))).toBe(true);
  expect(gscMusterUnits(a)).not.toContain('Acolyte Hybrids');
 });
});
