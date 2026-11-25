import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {orkMusterFindings,orkUnitLimit,orkTransportCanCarry,orkWarlordCandidates,resolvedOrkWarlord,selectOrkWarlord} from '../src/ork-muster';
import {orkKeywords} from '../src/ork-data';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {autoAttachUnambiguousInstances,expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {initialStore,validateStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterAttachmentRole} from '../src/leader-eligibility';
import {setKnightGear} from '../src/knight-loadouts';
import {ORK_MANUAL} from './fixtures/ork-manual';

const build=(units:string[],det='War Horde'):ArmySelection=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),{...newSelection('Orks'),detachments2026:[det]} as ArmySelection));
const issues=(a:ArmySelection)=>orkMusterFindings(a).map(f=>f.code);
describe('current Ork army muster',()=>{
 it.each(ORK_MANUAL)('%s charges actual October strengths and requisition thresholds and accepts printed attachments',(unit,sizes,bands,bodies,role)=>{
  const copies=Math.max(3,bands.at(-1)![0]),a=build(Array(copies).fill(unit));
  expect(verifiedUnitSizes2026(a,unit)).toEqual(sizes);
  expect(rosterAttachmentRole('Orks',unit)).toBe(role);
  for(const models of sizes){
   const resized=expandRoster(a).reduce((prev,s)=>setInstanceModelCount(prev,s.id,models),a);
   expect(rosterCost2026(resized).entries.map(e=>e.points)).toEqual(Array.from({length:copies},(_,i)=>bands.filter(([tier])=>tier<=i+1).at(-1)![1].find(([n])=>n>=models)![1]));
  }
  for(const body of bodies){
   const joined=autoAttachUnambiguousInstances(build([unit,body]));
   expect(expandRoster(joined)[0].attachedTo).toBe(body+'#1');
   expect(validateStore(JSON.parse(JSON.stringify(initialStore(joined))))).toBe(true);
  }
 });
 it('keeps discrete Mob groups separate from flexible unit strengths',()=>{
  for(const [unit,strong] of [['Boyz',[10,20]],['Beast Snagga Boyz',[10,20]],['Squighog Boyz',[4,8]],['Gretchin',[10,20]]] as const){
   const a=build([unit]);
   expect(verifiedUnitSizes2026(a,unit)).toEqual(strong);
   expect(()=>setInstanceModelCount(a,unit+'#1',strong[0]+1)).toThrow();
  }
  expect(verifiedUnitSizes2026(build(['Warbikers']),'Warbikers')).toEqual([3,4,5,6]);
 });
 it('grants Battleline and Character using actual selected detachments and upgrades',()=>{
  for(const [unit,det] of [['Warbikers','Kult of Speed'],['Gretchin','Runt Swarm'],['Stormboyz','Taktikal Brigade']]){
   const a=build([unit]);
   expect(orkUnitLimit(a,unit)).toBe(3);
   expect(orkUnitLimit({...a,detachments2026:[det]},unit)).toBe(6);
  }
  const plane=selectUpgrade2026(build(['Dakkajet'],'Flyboyz'),'Dakkajet#1','Flyboss');
  expect(resolvedOrkWarlord(plane)?.unit).toBe('Dakkajet');
  expect(rosterCost2026(plane).entries[0].enhancementPoints).toBeGreaterThan(0);
  expect(orkWarlordCandidates(addSelectionUnit(plane,'Ghazghkull Thraka')).map(s=>s.unit)).toEqual(['Ghazghkull Thraka']);
 });
 it('allows the bearer’s new Bodyguard only while its matching paid enhancement is present',()=>{
  for(const [det,enhancement,body] of [['Wreckas',"Kaptin's Hat",'Flash Gitz'],['Taktikal Brigade','Kill Kommanda','Kommandos']]){
   const a=build(['Warboss In Mega Armour',body],det);
   expect(()=>setInstanceAttachment(a,'Warboss In Mega Armour#1',body+'#1')).toThrow();
   const upgraded=selectUpgrade2026(a,'Warboss In Mega Armour#1',enhancement);
   const attached=setInstanceAttachment(upgraded,'Warboss In Mega Armour#1',body+'#1');
   expect(validateSelection(attached)).toBe(true);
   expect(expandRoster(selectUpgrade2026(attached,'Warboss In Mega Armour#1',null))[0].attachedTo).toBeUndefined();
  }
  expect(orkKeywords(build(['Big Mek']),{id:'Big Mek#1',unit:'Big Mek'}).has('BIG MEK')).toBe(true);
 });
 it('uses entire formations, the printed Ghaz weights and available Trukk passengers',()=>{
  const a=build(['Ghazghkull Thraka','Meganobz','Trukk','Gunwagon','Gargantuan Squiggoth','Warboss In Mega Armour']);
  const linked=setInstanceAttachment(a,'Warboss In Mega Armour#1','Meganobz#1');
  let current=setInstanceModelCount(linked,'Meganobz#1',6);
  const [ghaz,meganobz,trukk,gunwagon,squiggoth]=expandRoster(current);
  expect(orkTransportCanCarry(current,trukk,ghaz)).toBe(false);
  expect(orkTransportCanCarry(current,gunwagon,ghaz)).toBe(true);
  expect(orkTransportCanCarry(current,squiggoth,ghaz)).toBe(true);
  expect(orkTransportCanCarry(current,trukk,meganobz)).toBe(false);
  expect(orkTransportCanCarry(current,squiggoth,meganobz)).toBe(true);
  expect(issues(current)).toContain('dedicated-transport-passengers');
  current=addSelectionUnit(current,'Boyz');
  expect(issues(current)).not.toContain('dedicated-transport-passengers');
  expect(issues(addSelectionUnit(current,'Trukk'))).toContain('dedicated-transport-passengers');
 });
 it.each(['Kill Rig','Hunta Rig'])('%s admits Beast Snagga Infantry and excludes ordinary Boyz',transport=>{
  const a=build([transport,'Beast Snagga Boyz','Boyz']);
  const [rig,beasts,boyz]=expandRoster(a);
  expect(orkTransportCanCarry(a,rig,beasts)).toBe(true);
  expect(orkTransportCanCarry(a,rig,boyz)).toBe(false);
 });
 it('charges each purchased melee kit or gun and removes Smoke only on the equipped aircraft',()=>{
  let a=build(['Meganobz','Nobz','Gunwagon','Wazbom Blastajet','Wazbom Blastajet']);
  a=setKnightGear(a,'Meganobz#1','Meganob 1 · Weapons','Twin Killsaws');
  a=setKnightGear(a,'Meganobz#1','Meganob 2 · Weapons','Kombi-weapon + Killsaw');
  a=setKnightGear(a,'Nobz#1','Nob 1 · Weapons','Kustom Krumpa + Paired Krumpas');
  a=setKnightGear(a,'Gunwagon#1','Turret','Zzap Gun');
  a=setKnightGear(a,'Wazbom Blastajet#1','Force field','Blastajet Force Field');
  expect(rosterCost2026(a).entries.map(row=>row.wargearPoints??0)).toEqual([10,5,10,0,0]);
  const [, , ,shielded,unshielded]=expandRoster(a);
  expect(orkKeywords(a,shielded).has('SMOKE')).toBe(false);
  expect(orkKeywords(a,unshielded).has('SMOKE')).toBe(true);
 });
 it('requires all Support units to join a compatible Bodyguard and honors separate Leader and Support slots',()=>{
  const a=build(['Warboss','Painboy','Boyz']);
  expect(issues(a)).toContain('mandatory-support');
  const linked=setInstanceAttachment(setInstanceAttachment(a,'Warboss#1','Boyz#1'),'Painboy#1','Boyz#1');
  expect(issues(selectOrkWarlord(linked,'Warboss#1'))).toEqual([]);
  expect(()=>setInstanceAttachment(addSelectionUnit(linked,'Mek'),'Mek#1','Boyz#1')).toThrow();
 });
 it('restores prior Ork army names, keeps associations, and migrates old Boyz weapons to compulsory kits',()=>{
  const a=build(['Warboss In Mega Armour','Boyz']);
  const raw=JSON.parse(JSON.stringify(initialStore(a)).replaceAll('Warboss In Mega Armour','Warboss in Mega Armour'));
  raw.profiles[0].army.equipment={Boyz:'Shoota'};
  raw.profiles[0].army.instances[1].weaponCounts={Shoota:4,'Slugga and choppa':6};
  const restored=openSavedArmies(raw);
  expect(restored.retained).toEqual([]);
  const squads=expandRoster(restored.store.profiles[0].army);
  expect(squads[0]).toMatchObject({unit:'Warboss In Mega Armour',id:'Warboss in Mega Armour#1'});
  expect(squads[1].equipment).toBeUndefined();
  expect(squads[1].weaponCounts).toBeUndefined();
 });
});
