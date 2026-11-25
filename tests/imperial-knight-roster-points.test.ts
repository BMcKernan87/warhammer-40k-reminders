import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {knightMusterUnits} from '../src/imperial-knights-data';
import {setKnightGear} from '../src/imperial-knight-loadouts';
import {initialStore,validateStore} from '../src/profiles';

const army=()=>newSelection('Imperial Knights');
const roster=(units:[string,number][])=>units.reduce((a,[name,n])=>addSelectionUnit(a,name,n),army());
// MFM 1.6, Oct 14, source snapshot 6eed7b1. First / second / third Knight costs.
const schedules:[string,number,number,number][]=[
 ['Armiger Helverin',140,140,140],['Armiger Moirax',150,150,160],['Armiger Warglaive',140,140,140],
 ['Acastus Knight Asterius',785,860,860],['Acastus Knight Porphyrion',725,800,800],
 ['Cerastus Knight Acheron',380,395,395],['Cerastus Knight Atrapos',420,440,440],
 ['Cerastus Knight Castigator',380,395,395],['Cerastus Knight Lancer',415,435,435],
 ['Knight Castellan',425,450,450],['Knight Crusader',395,415,415],['Knight Defender',385,405,405],
 ['Knight Destrier',265,265,280],['Knight Errant',355,355,370],['Knight Gallant',355,355,370],
 ['Knight Paladin',375,375,390],['Knight Preceptor',365,365,380],['Knight Valiant',390,390,405],
 ['Knight Warden',365,365,380],['Questoris Knight Magaera',385,400,400],['Questoris Knight Styrix',375,390,390]
];
describe('Imperial Knights roster pricing',()=>{
 it.each(schedules)('%s charges each requisition bracket independently',(name,first,second,third)=>{
  const a=roster([[name,3]]);
  expect(verifiedUnitSizes2026(a,name)).toEqual([1]);
  expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual([first,second,third]);
 });

 it('musters Canis Rex once without separately purchasing Sir Hekhtur',()=>{
  const a=roster([['Canis Rex',1]]);
  expect(knightMusterUnits(a)).toContain('Canis Rex');
  expect(knightMusterUnits(a)).not.toContain('Sir Hekhtur');
  expect(rosterCost2026(a).total).toBe(415);
 });

 it('adds the Crusader cannon only to the equipped copy and preserves it on reopen',()=>{
  const a=setKnightGear(roster([['Knight Crusader',2]]),'Knight Crusader#2','Cannon','Rapid-fire battle cannon + Questoris heavy stubber');
  const saved=JSON.parse(JSON.stringify(initialStore(a)));
  expect(validateStore(saved)).toBe(true);
  expect(rosterCost2026(saved.profiles[0].army).entries.map(e=>[e.points,e.wargearPoints])).toEqual([[395,undefined],[430,15]]);
 });

 it('prices a selected enhancement on its actual Knight',()=>{
  const a={...roster([['Knight Castellan',1]]),detachments2026:['Dominus Foebreakers'],upgrades2026:{'Knight Castellan#1':'Archeotech Autoloaders'}};
  expect(rosterCost2026(a).entries[0]).toMatchObject({basePoints:425,enhancementPoints:25,points:450});
 });

 it('offers five priced Adeptus Mechanicus entries only with Forgepact',()=>{
  const forge={...army(),detachments2026:['Questor Forgepact']};
  expect(knightMusterUnits(army())).toEqual(expect.arrayContaining([...schedules.map(row=>row[0]),'Canis Rex']));
  const allies=knightMusterUnits(forge).filter(name=>!knightMusterUnits(army()).includes(name));
  expect(allies).toEqual(['Skitarii Marshal','Skitarii Rangers','Skitarii Vanguard','Tech-priest Dominus','Tech-priest Manipulus']);
  const a=allies.reduce((a,name)=>addSelectionUnit(a,name),forge);
  expect(rosterCost2026(a).entries.map(e=>[e.unit,e.models,e.points])).toEqual([
   ['Skitarii Marshal',1,35],['Skitarii Rangers',10,85],['Skitarii Vanguard',10,85],['Tech-priest Dominus',1,60],['Tech-priest Manipulus',1,60]
  ]);
 });

 it('builds and saves full Incursion and Strike Force rosters at 1,000 and 2,000 points',()=>{
  const incursion={...roster([['Knight Errant',1],['Knight Gallant',1],['Armiger Warglaive',1],['Armiger Moirax',1]]),battleSize2026:'Incursion' as const,detachments2026:['Valourstrike Lance']};
  const strike={...roster([['Knight Crusader',1],['Knight Errant',1],['Knight Valiant',1],['Armiger Warglaive',2],['Armiger Helverin',2],['Armiger Moirax',2]]),battleSize2026:'Strike Force' as const,detachments2026:['Valourstrike Lance']};
  for(const [a,target] of [[incursion,1000],[strike,2000]] as const){
   expect(validateSelection(a)).toBe(true);
   expect(rosterCost2026(a).total).toBe(target);
   expect(validateStore(JSON.parse(JSON.stringify(initialStore(a))))).toBe(true);
  }
 });
});
