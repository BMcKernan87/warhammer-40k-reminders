import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {daemonKeywords,daemonMusterUnits} from '../src/chaos-daemons-data';
import {daemonMusterFindings,daemonUnitLimit,daemonWarlordCandidates,resolvedDaemonWarlord,selectDaemonWarlord} from '../src/chaos-daemon-muster';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {detachmentBudget} from '../src/edition-2026';
import {DAEMON_MANUAL} from './fixtures/daemonic-pact-manual';
import {initialStore,validateStore} from '../src/profiles';
import {autoAttachUnambiguousInstances,expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';

const build=(units:string[],detachment='Daemonic Incursion'):ArmySelection=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),{...newSelection('Chaos Daemons'),detachments2026:[detachment]} as ArmySelection));
const errors=(a:ArmySelection)=>daemonMusterFindings(a).map(r=>r.code);
describe('native Chaos Daemons muster',()=>{
 it.each(DAEMON_MANUAL)('%s keeps native prices and profiles distinct from allied restrictions',(unit,bands,bodies)=>{
  const a=build([unit,unit,unit]);
  const sizes=verifiedUnitSizes2026(a,unit)!;
  for(const models of sizes){
   let current=a;
   for(const squad of expandRoster(a))current=setInstanceModelCount(current,squad.id,models);
   expect(rosterCost2026(current).entries.map(e=>e.points)).toEqual([1,2,3].map(copy=>bands.filter(b=>b[0]<=copy).at(-1)![1].find(b=>b[0]>=models)![1]));
  }
  if(!bodies.length)return;
  for(const body of bodies){
   const joined=autoAttachUnambiguousInstances(build([unit,body]));
   expect(expandRoster(joined)[0].attachedTo).toBe(body+'#1');
  }
 });
 it('permits native Daemons independently of Daemonic Pact god ratios and follows mandatory Warlords',()=>{
  const solo=build(['Exalted Flamer']);
  expect(errors(solo)).toContain('warlord-required');
  const a=build(['Bloodthirster','The Changeling','Exalted Flamer']);
  expect(daemonWarlordCandidates(a).map(s=>s.unit)).toEqual(['Bloodthirster','The Changeling']);
  expect(errors(selectDaemonWarlord(a,'The Changeling#1'))).toEqual([]);
  expect(()=>selectDaemonWarlord(a,'Exalted Flamer#1')).toThrow();
  const withBel=addSelectionUnit(a,'Be’lakor');
  expect(resolvedDaemonWarlord(withBel)?.unit).toBe('Be’lakor');
  expect(()=>selectDaemonWarlord(withBel,'Bloodthirster#1')).toThrow();
 });
 it('gates Shadow Legion allies, excludes forbidden Epic Heroes and both Princes, and requires a Legiones Daemonica Warlord',()=>{
  const shadow=build(['Chaos Lord','Legionaries','Chosen','Dark Apostle','Accursed Cultists','Bloodmaster'],'Shadow Legion');
  expect(daemonMusterUnits(newSelection('Chaos Daemons'))).not.toContain('Chaos Lord');
  for(const name of ['Daemon Prince of Chaos','Daemon Prince Of Chaos With Wings','Skulltaker']){
   expect(daemonUnitLimit(shadow,name)).toBe(0);
   expect(errors(addSelectionUnit(shadow,name))).toContain('daemon-ineligible');
  }
  expect(daemonMusterUnits(shadow)).toContain('Be’lakor');
  const joined=setInstanceAttachment(setInstanceAttachment(shadow,'Chaos Lord#1','Chosen#1'),'Dark Apostle#1','Accursed Cultists#1');
  expect(daemonWarlordCandidates(joined).map(s=>s.unit)).toEqual(['Bloodmaster']);
  expect(()=>selectDaemonWarlord(joined,'Dark Apostle#1')).toThrow();
  expect(errors(joined)).toEqual([]);
  expect([...daemonKeywords(joined,expandRoster(joined)[0])]).toEqual(expect.arrayContaining(['HERETIC ASTARTES','SHADOW LEGION','UNDIVIDED']));
  expect(validateSelection(joined)).toBe(true);
  expect(errors({...joined,detachments2026:['Warptide']})).toContain('daemon-ineligible');
 });
 it('separates the Shadow Legion allied points cap from the full army budget',()=>{
  const a=selectDaemonWarlord(build(['Chaos Lord','Havocs','Chosen','Possessed','Poxbringer','Plaguebearers'],'Shadow Legion'),'Poxbringer#1');
  // 95 + 135 + 140 + 130 = 500 points of Heretic Astartes.
  expect(errors({...a,battleSize2026:'Incursion'})).toEqual([]);
  const more=addSelectionUnit(a,'Cultist Mob');
  expect(errors({...more,battleSize2026:'Incursion'})).toContain('shadow-legion-points');
  expect(errors({...more,battleSize2026:'Strike Force'})).toEqual([]);
  expect(validateStore(JSON.parse(JSON.stringify(initialStore(a))))).toBe(true);
 });
 it('offers either one Titanic Dreadblade or up to three War Dogs without admitting a Knight Warlord',()=>{
  const a=build(['Bloodmaster','War Dog Stalker','War Dog Huntsman','War Dog Karnivore']);
  expect(daemonMusterUnits(a)).toContain('Knight Despoiler');
  expect(errors(a)).toEqual([]);
  expect(errors(addSelectionUnit(a,'War Dog Moirax'))).toContain('dreadblade-allowance');
  expect(errors(addSelectionUnit(a,'Knight Abominant'))).toContain('dreadblade-allowance');
  const b=setKnightGear(build(['Bloodmaster','Knight Despoiler']),'Knight Despoiler#1','Claw arm','Despoiler battle cannon + Diabolus heavy stubber');
  expect(rosterCost2026(b).entries[1].points).toBe(370);
  expect(daemonWarlordCandidates(b).map(s=>s.unit)).toEqual(['Bloodmaster']);
  expect(errors(b)).toEqual([]);
 });
 it('charges eligible native enhancements and generates their printed reminders through the normal sheet',()=>{
  const a=build(['Bloodthirster','Bloodletters'],'Blood Legion');
  const upgraded=selectUpgrade2026(a,'Bloodthirster#1','Fury’s Cage');
  expect(rosterCost2026(upgraded).entries[0]).toMatchObject({basePoints:320,points:340,enhancementPoints:20});
  expect(generate11thReminders(upgraded).filter(row=>row.title.includes('Fury’s Cage')).length).toBeGreaterThan(0);
  expect(()=>selectUpgrade2026(a,'Bloodletters#1','Fury’s Cage')).toThrow();
  expect(detachmentBudget('Chaos Daemons',['Daemonic Incursion'],'Strike Force').dispositions).toEqual(['Take and Hold','Disruption']);
  expect(detachmentBudget('Chaos Daemons',['Lords of the Warp'],'Incursion').dispositions).toEqual(['Take and Hold']);
 });
 it('prices and reopens complete 1,000- and 2,000-point native rosters with their legal wargear and Leaders',()=>{
  const inc=build(['Bloodmaster','Bloodletters','Daemon Prince of Chaos','Plaguebearers','Exalted Flamer','Flamers','Bloodcrushers','Bloodthirster']);
  const large=build(['Be’lakor','Poxbringer','Plaguebearers','Horticulous Slimux','Beasts Of Nurgle','Daemonettes','Blue Horrors','Contorted Epitome','Keeper Of Secrets','Bloodletters','Daemon Prince Of Chaos With Wings','Skarbrand']);
  for(const [a,size,total,warlord,unit] of [[inc,'Incursion',1000,'Bloodmaster','Daemon Prince of Chaos'],[large,'Strike Force',2000,'Be’lakor','Daemon Prince Of Chaos With Wings']] as const){
   const army=setKnightGear(selectDaemonWarlord(autoAttachUnambiguousInstances({...a,battleSize2026:size}),warlord+'#1'),unit+'#1','Daemonic allegiance','Tzeentch');
   expect(rosterCost2026(army).total).toBe(total);
   expect(errors(army)).toEqual([]);
   expect(daemonKeywords(army,expandRoster(army).find(s=>s.unit===unit)!).has('TZEENTCH')).toBe(true);
   expect(validateStore(JSON.parse(JSON.stringify(initialStore(army))))).toBe(true);
  }
 });
});
