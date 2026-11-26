import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {initialStore,validateStore} from '../src/profiles';
import {setInstanceModelCount,setInstanceWeaponCounts} from '../src/roster-instances';
import {necronKeywords} from '../src/necron-wargear';
import {generate11thReminders} from '../src/reminders-11th';

// Independent of the CSV runtime import: matched-play unit composition and cost tables
// on https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html (November 25, 2026).
// All 98 cost cells were also compared with the October 14 MFM v1.6 scrape. Its
// introductory guidance permits an in-between strength at the upper cost. Direct
// publisher MFM retrieval returned 403 during reconciliation; the mirrored inputs are
// https://github.com/richardsolomou/wh40k-11e-mfm/tree/6eed7b100ae508c1faa76a42bf7b55ecabb59107/data .
// Columns: datasheet, minimum/maximum models, first cost schedule, later copy and its schedule.
type Table=Record<number,number>;
const schedule:[string,number,number,Table,number?,Table?][]=[
 ['Annihilation Barge',1,1,{1:100}],
 ['Canoptek Doomstalker',1,1,{1:130}],
 ['Canoptek Macrocytes',5,5,{5:70}],
 ['Canoptek Reanimator',1,1,{1:75}],
 ['Canoptek Scarab Swarms',3,6,{3:40, 6:80}],
 ['Canoptek Spyders',1,2,{1:65, 2:110}],
 ['Canoptek Tomb Crawlers',2,2,{2:60}],
 ['Canoptek Wraiths',3,6,{3:95, 6:220},2, {3:115, 6:240}],
 ['Catacomb Command Barge',1,1,{1:120}],
 ['Chronomancer',1,1,{1:70},2, {1:80}],
 ['Convergence Of Dominion',1,3,{1:60, 2:120, 3:180}],
 ['Cryptothralls',2,2,{2:60}],
 ['C’tan Shard of the Deceiver',1,1,{1:330}],
 ['C’tan Shard of the Nightbringer',1,1,{1:360}],
 ['C’tan Shard of the Void Dragon',1,1,{1:345}],
 ['Deathmarks',5,10,{5:60, 10:120},3, {5:70, 10:130}],
 ['Doom Scythe',1,1,{1:200}],
 ['Doomsday Ark',1,1,{1:200},3, {1:230}],
 ['Flayed Ones',5,10,{5:55, 10:100}],
 ['Geomancer',1,1,{1:75}],
 ['Ghost Ark',1,1,{1:100}],
 ['Hexmark Destroyer',1,1,{1:75}],
 ['Illuminor Szeras',1,1,{1:175}],
 ['Immortals',5,10,{5:65, 10:130}],
 ['Imotekh the Stormlord',1,1,{1:100}],
 ['Lokhust Destroyers',1,6,{1:40, 2:55, 3:80, 6:190},3, {1:70, 2:85, 3:110, 6:220}],
 ['Lokhust Heavy Destroyers',1,3,{1:50, 2:100, 3:165},3, {1:60, 2:110, 3:175}],
 ['Lokhust Lord',1,1,{1:80}],
 ['Lychguard',5,10,{5:80, 10:160}],
 ['Monolith',1,1,{1:420},2, {1:440}],
 ['Necron Warriors',10,20,{10:85, 20:190}],
 ['Nekrosor Ammentar',1,1,{1:195}],
 ['Night Scythe',1,1,{1:125}],
 ['Obelisk',1,1,{1:280},2, {1:310}],
 ['Ophydian Destroyers',3,6,{3:80, 6:150},3, {3:90, 6:160}],
 ['Orikan the Diviner',1,1,{1:90}],
 ['Overlord',1,1,{1:90}],
 ['Overlord with translocation shroud',1,1,{1:90}],
 ['Plasmancer',1,1,{1:60}],
 ['Psychomancer',1,1,{1:65}],
 ['Royal Warden',1,1,{1:50}],
 ['Seraptek Heavy Construct',1,1,{1:540},2, {1:570}],
 ['Skorpekh Destroyers',3,6,{3:85, 6:170},3, {3:95, 6:180}],
 ['Skorpekh Lord',1,1,{1:95},3, {1:105}],
 ['Technomancer',1,1,{1:80},2, {1:90}],
 ['Tesseract Vault',1,1,{1:465},2, {1:505}],
 ['The Silent King',3,3,{3:420}],
 ['Tomb Blades',3,6,{3:70, 6:140},3, {3:80, 6:150}],
 ['Transcendent C’tan',1,1,{1:340},2, {1:360}],
 ['Trazyn the Infinite',1,1,{1:60}],
 ['Triarch Praetorians',5,10,{5:80, 10:160}],
 ['Triarch Stalker',1,1,{1:110},3, {1:120}],
];

describe('November 11th-edition Necron muster',()=>{
 it.each(schedule)('%s allows every printed strength and charges each applicable copy bracket',(unit,min,max,base,cutoff,later)=>{
  const army=addSelectionUnit(newSelection('Necrons'),unit,cutoff??1);
  const expectedSizes=Array.from({length:max-min+1},(_,i)=>i+min);
  expect(verifiedUnitSizes2026(army,unit)).toEqual(expectedSizes);
  for(const size of expectedSizes){
   let configured=army;
   for(let copy=1;copy<=(cutoff??1);copy++){
    configured=setInstanceModelCount(configured,unit+'#'+copy,size);
   }
   const costs=rosterCost2026(configured);
   const upperBracket=Object.keys(base).map(Number).find(n=>n>=size)!;
   expect(costs.entries.map(e=>e.points)).toEqual(costs.entries.map((_,i)=>
    cutoff&&i+1>=cutoff?later![upperBracket]:base[upperBracket]));
   expect(validateSelection(configured)).toBe(true);
  }
  for(const invalid of [min-1,max+1,min+0.5]){
   expect(()=>setInstanceModelCount(army,unit+'#1',invalid)).toThrow();
  }
 });

 it('keeps actual bearer counts and a paid upper bracket when reopening fifteen Warriors',()=>{
  const army=setInstanceWeaponCounts(setInstanceModelCount(addSelectionUnit(newSelection(),'Necron Warriors'),'Necron Warriors#1',15),'Necron Warriors#1',{'Gauss flayer':6,'Gauss reaper':9});
  const saved=JSON.parse(JSON.stringify(initialStore(army)));
  expect(validateStore(saved)).toBe(true);
  const reopened=saved.profiles[0].army;
  expect(rosterCost2026(reopened).entries[0]).toMatchObject({models:15,points:190});
  expect(reopened.instances[0].weaponCounts).toEqual({'Gauss flayer':6,'Gauss reaper':9});
 });

 it('applies printed unit keywords to core Stratagem targets, including mixed-model units',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['The Silent King','Doom Scythe','Night Scythe','Seraptek Heavy Construct','Convergence Of Dominion'])army=addSelectionUnit(army,unit);
  const rules=generate11thReminders(army);
  expect(necronKeywords.FRAME.has('Seraptek Heavy Construct')).toBe(true);
  const challenge=rules.find(r=>r.id==='11e-core-epic-challenge');
  expect(challenge?.units).toEqual(['The Silent King#1']);
  expect(challenge?.summary).toContain('Szarekh while that model survives');
  const ingress=rules.find(r=>r.id==='11e-core-rapid-ingress')!.units;
  expect(ingress).toContain('Night Scythe#1');
  expect(ingress).not.toContain('Doom Scythe#1');
  expect(ingress).not.toContain('Convergence Of Dominion#1');
  expect(rules.find(r=>r.id==='11e-core-heroic-intervention')?.units).toContain('Seraptek Heavy Construct#1');
 });
});
