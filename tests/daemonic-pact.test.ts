import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {chaosKnightMusterUnits} from '../src/chaos-knights-data';
import {chaosKnightMusterFindings,chaosKnightWarlordCandidates,selectChaosKnightWarlord} from '../src/chaos-knight-muster';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {DAEMONIC_ALLEGIANCES,daemonicPactAllegiance} from '../src/daemonic-pact';
import {knightJoinedBodyguard} from '../src/leader-eligibility';
import {autoAttachUnambiguousInstances,expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {DAEMON_MANUAL} from './fixtures/daemonic-pact-manual';
import {initialStore,validateStore} from '../src/profiles';

const base=():ArmySelection=>({...newSelection('Chaos Knights'),detachments2026:['Traitoris Lance']});
const build=(units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),base()));
const findings=(army:ArmySelection)=>chaosKnightMusterFindings(army).map(f=>f.code);

describe('Daemonic Pact allied muster',()=>{
 it.each(DAEMON_MANUAL)('%s uses every matched-play copy and strength price and accepts its printed Bodyguards',(unit,bands,bodies)=>{
  const army=build([unit,unit,unit]);
  const sizes=verifiedUnitSizes2026(army,unit)!;
  const initialBands=bands[0][1];
  const min=initialBands[0][0],max=initialBands.at(-1)![0];
  expect(sizes).toEqual(Array.from({length:max-min+1},(_,i)=>min+i));
  for(const models of sizes){
   let resized=army;
   for(const squad of expandRoster(army))resized=setInstanceModelCount(resized,squad.id,models);
   expect(rosterCost2026(resized).entries.map(c=>c.points)).toEqual([1,2,3].map(copy=>{
    const [,prices]=bands.filter(([threshold])=>threshold<=copy).at(-1)!;
    return prices.find(([size])=>size>=models)![1];
   }));
  }
  for(const body of bodies){
   const attached=autoAttachUnambiguousInstances(build([unit,body]));
   const leader=expandRoster(attached).find(m=>m.unit===unit)!;
   expect(knightJoinedBodyguard(attached,leader)?.unit).toBe(body);
   expect(validateStore(JSON.parse(JSON.stringify(initialStore(attached))))).toBe(true);
  }
 });
 it('excludes Legends and the battlefield-only Horror forms and supports all matched-play options',()=>{
  expect(chaosKnightMusterUnits(base())).toEqual(expect.arrayContaining(DAEMON_MANUAL.map(([name])=>name)));
  for(const invalid of ['Brimstone Horrors','Plague Toads'])expect(()=>addSelectionUnit(base(),invalid)).toThrow();
  expect(chaosKnightMusterUnits(base())).not.toContain('Cultist Mob');
  for(const unit of ['Pink Horrors','Blue Horrors'])expect(verifiedUnitSizes2026(base(),unit)).toEqual([10]);
 });
 it('counts units separately by god, including different allegiances on two Princes',()=>{
  const a=build(['Knight Ruinator','Nurglings','Daemonettes','Daemon Prince of Chaos','Daemon Prince of Chaos']);
  const change=(values:string[])=>({...a,instances:a.instances!.map(s=>s.unit==='Daemon Prince of Chaos'?{...s,knightGear:{'Daemonic allegiance':values[Number(s.id.slice(-1))-1]}}:s)});
  expect(findings(change(['Nurgle','Slaanesh']))).not.toContain('daemonic-pact-battleline');
  expect(chaosKnightMusterFindings(change(['Nurgle','Nurgle'])).filter(f=>f.code==='daemonic-pact-battleline').map(f=>f.message)).toEqual([expect.stringMatching(/^Nurgle has 2/)]);
  expect(findings(change(['Khorne','Tzeentch'])).filter(code=>code==='daemonic-pact-battleline')).toHaveLength(2);
  for(const unit of ['Soul Grinder','Daemon Prince of Chaos','Daemon Prince Of Chaos With Wings']){
   expect(daemonicPactAllegiance({id:'1',unit})).toBe('Khorne');
   for(const god of DAEMONIC_ALLEGIANCES)expect(daemonicPactAllegiance({id:'1',unit,knightGear:{'Daemonic allegiance':god}})).toBe(god);
  }
 });
 it('checks both matched-play battle-size caps independently of the Iconoclast allowance',()=>{
  const a=build(['Knight Ruinator','Blue Horrors','Blue Horrors']);
  expect(findings({...a,battleSize2026:'Incursion'})).toEqual([]);
  expect(findings({...addSelectionUnit(a,'Nurglings'),battleSize2026:'Incursion'})).toContain('daemonic-pact-points');
  const belakor=build(['Knight Ruinator','Be’lakor','Bloodletters']);
  expect(findings({...belakor,battleSize2026:'Strike Force'})).toEqual([]);
  const overFive=addSelectionUnit(belakor,'Bloodmaster');
  expect(findings({...overFive,battleSize2026:'Strike Force'})).toContain('daemonic-pact-points');
  const force={...addSelectionUnit(belakor,'Cultist Mob'),battleSize2026:'Strike Force' as const,detachments2026:['Iconoclast Fiefdom']};
  expect(findings(force)).toEqual([]);
  expect(findings(addSelectionUnit(force,'Nurglings'))).toContain('daemonic-pact-points');
 });
 it('denies an allied Warlord, illegal enhancement and cross-faction or occupied attachment slot',()=>{
  let a=build(['Knight Ruinator','Be’lakor','Bloodletters','Bloodmaster','Skulltaker','Daemonettes']);
  expect(chaosKnightWarlordCandidates(a).map(s=>s.unit)).toEqual(['Knight Ruinator']);
  expect(()=>selectChaosKnightWarlord(a,'Be’lakor#1')).toThrow();
  expect(findings({...a,warlordId:'Be’lakor#1'})).toContain('daemonic-pact-warlord');
  expect(findings({...a,upgrades2026:{'Bloodmaster#1':'Night’s Shroud'}})).toContain('daemonic-pact-enhancement');
  expect(()=>setInstanceAttachment(a,'Bloodmaster#1','Daemonettes#1')).toThrow();
  a=setInstanceAttachment(a,'Bloodmaster#1','Bloodletters#1');
  expect(()=>setInstanceAttachment(a,'Skulltaker#1','Bloodletters#1')).toThrow();
  expect(findings({...a,instances:a.instances!.map(s=>s.unit==='Skulltaker'?{...s,attachedTo:'Bloodletters#1'}:s)})).toContain('invalid-attachment');
 });
 it('prices, validates and reopens complete 1,000- and 2,000-point armies with attached or independent daemons',()=>{
  const small=autoAttachUnambiguousInstances(build(['Chaos Cerastus Knight Acheron','Knight Ruinator','War Dog Executioner','Bloodmaster','Bloodletters']));
  const large=build(['Chaos Cerastus Knight Acheron','Chaos Cerastus Knight Atrapos','Knight Ruinator','War Dog Brigand','War Dog Huntsman','War Dog Moirax','Be’lakor','Bloodletters']);
  for(const [army,size,points] of [[small,'Incursion',1000],[large,'Strike Force',2000]] as const){
   const complete=selectChaosKnightWarlord({...army,battleSize2026:size},'Knight Ruinator#1');
   expect(rosterCost2026(complete).total).toBe(points);
   expect(findings(complete)).toEqual([]);
   expect(validateSelection(complete)).toBe(true);
   expect(validateStore(JSON.parse(JSON.stringify(initialStore(complete))))).toBe(true);
  }
 });
});
