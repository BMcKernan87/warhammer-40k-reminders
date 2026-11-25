import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {chaosKnightMusterUnits} from '../src/chaos-knights-data';
import {setKnightGear} from '../src/imperial-knight-loadouts';
import {setInstanceModelCount} from '../src/roster-instances';
import {chaosKnightMusterFindings,chaosKnightUnitLimit,chaosKnightWarlordCandidates,selectChaosKnightWarlord} from '../src/chaos-knight-muster';
import {initialStore,validateStore} from '../src/profiles';

const army=()=>newSelection('Chaos Knights');
const roster=(units:[string,number][])=>units.reduce((a,[name,n])=>addSelectionUnit(a,name,n),army());
// Printed independent MFM 1.6 schedule, Oct 14: first, second and third selections.
const schedules:[string,number,number,number][]=[
 ['Chaos Acastus Knight Asterius',785,860,860],
 ['Chaos Acastus Knight Porphyrion',725,800,800],
 ['Chaos Cerastus Knight Acheron',370,385,385],
 ['Chaos Cerastus Knight Atrapos',385,415,415],
 ['Chaos Cerastus Knight Castigator',370,385,385],
 ['Chaos Cerastus Knight Lancer',385,415,415],
 ['Chaos Questoris Knight Magaera',375,390,390],
 ['Chaos Questoris Knight Styrix',365,380,380],
 ['Knight Abominant',350,350,370],
 ['Knight Desecrator',350,350,370],
 ['Knight Despoiler',360,390,390],
 ['Knight Rampager',350,350,370],
 ['Knight Ruinator',325,325,345],
 ['Knight Tyrant',390,410,410],
 ['War Dog Brigand',135,135,135],
 ['War Dog Executioner',130,130,130],
 ['War Dog Huntsman',135,135,135],
 ['War Dog Karnivore',145,145,145],
 ['War Dog Moirax',150,150,160],
 ['War Dog Stalker',135,135,135],
];
describe('Chaos Knight army costs',()=>{
 it.each(schedules)('%s charges every native muster threshold',(name,first,second,third)=>{
  const a=roster([[name,3]]);
  expect(verifiedUnitSizes2026(a,name)).toEqual([1]);
  expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual([first,second,third]);
 });
 it('charges the two Despoiler guns independently, per selected copy',()=>{
  let a=roster([['Knight Despoiler',2]]);
  for(const arm of ['Chainsword arm','Claw arm'])a=setKnightGear(a,'Knight Despoiler#2',arm,'Despoiler gatling cannon + Heavy darkflamer');
  expect(rosterCost2026(a).entries.map(e=>e.wargearPoints)).toEqual([undefined,50]);
  a=setKnightGear(a,'Knight Despoiler#2','Claw arm','Despoiler battle cannon + Diabolus heavy stubber');
  expect(rosterCost2026(a).entries.map(e=>e.wargearPoints)).toEqual([undefined,35]);
 });
 it('permits only current matched-play Damned with Iconoclast Fiefdom and prices real mixed strengths',()=>{
  const base=army(),iconoclast={...base,detachments2026:['Iconoclast Fiefdom']};
  const options=chaosKnightMusterUnits(iconoclast);
  expect(chaosKnightMusterUnits(base)).toHaveLength(20);
  expect(options.filter(n=>!chaosKnightMusterUnits(base).includes(n))).toEqual(['Accursed Cultists','Cultist Firebrand','Cultist Mob','Dark Commune','Fellgor Beastmen','Traitor Enforcer','Traitor Guardsmen Squad']);
  expect(options).not.toContain('Cultist Mob with Firearms');
  const a=setInstanceModelCount(addSelectionUnit(iconoclast,'Accursed Cultists',3),'Accursed Cultists#3',9);
  expect(rosterCost2026(a).entries.map(e=>[e.models,e.points])).toEqual([[8,90],[8,90],[9,205]]);
 });
 it('builds full 1,000 and 2,000 point armies from legal Knight and War Dog options',()=>{
  const incursion={...roster([['Knight Abominant',1],['Knight Desecrator',1],['War Dog Moirax',2]]),battleSize2026:'Incursion' as const,detachments2026:['Traitoris Lance']};
  const strike={...roster([['Chaos Cerastus Knight Acheron',1],['Chaos Cerastus Knight Atrapos',1],['Chaos Cerastus Knight Castigator',1],['Knight Ruinator',1],['War Dog Brigand',1],['War Dog Executioner',1],['War Dog Huntsman',1],['War Dog Moirax',1]]),battleSize2026:'Strike Force' as const,detachments2026:['Traitoris Lance']};
  for(const [a,total] of [[incursion,1000],[strike,2000]] as const){
   expect(validateSelection(a)).toBe(true);
   expect(rosterCost2026(a).total).toBe(total);
   const completed=selectChaosKnightWarlord(a,chaosKnightWarlordCandidates(a)[0].id);
   expect(chaosKnightMusterFindings(completed)).toEqual([]);
   expect(validateStore(JSON.parse(JSON.stringify(initialStore(a))))).toBe(true);
  }
 });
 it('doubles a Houndpack dog limit and grants Character only to the nominated individuals',()=>{
  const base=roster([['War Dog Brigand',3],['War Dog Huntsman',1]]);
  const houndpack={...base,detachments2026:['Houndpack Lance']};
  expect(chaosKnightUnitLimit(base,'War Dog Brigand')).toBe(3);
  expect(chaosKnightUnitLimit(houndpack,'War Dog Brigand')).toBe(6);
  expect(chaosKnightMusterFindings(houndpack).map(f=>f.code)).toContain('houndpack-characters');
  const promoted={...houndpack,chaosWarDogCharacterIds:['War Dog Brigand#1','War Dog Brigand#2','War Dog Huntsman#1']};
  expect(chaosKnightWarlordCandidates(promoted).map(x=>x.id)).toEqual(promoted.chaosWarDogCharacterIds);
  expect(()=>selectChaosKnightWarlord(promoted,'War Dog Brigand#3')).toThrow();
  expect(chaosKnightMusterFindings(selectChaosKnightWarlord(promoted,'War Dog Huntsman#1'))).toEqual([]);
  expect(chaosKnightMusterFindings({...roster([['War Dog Stalker',2]]),detachments2026:['Houndpack Lance']}).map(f=>f.code)).toContain('houndpack-minimum');
 });
 it('adds all allied cost brackets against 500 while forbidding allied Warlords',()=>{
  const base=roster([['Knight Rampager',1],['Dark Commune',1],['Accursed Cultists',3]]);
  expect(chaosKnightMusterFindings(base).some(f=>f.code==='chaos-knight-ineligible')).toBe(true);
  let permitted={...base,detachments2026:['Iconoclast Fiefdom']};
  expect(chaosKnightMusterFindings(permitted)).toEqual([]);
  expect(()=>selectChaosKnightWarlord(permitted,'Dark Commune#1')).toThrow();
  for(let n=1;n<=3;n++)permitted={...setInstanceModelCount(permitted,'Accursed Cultists#'+n,16),detachments2026:['Iconoclast Fiefdom']};
  expect(chaosKnightMusterFindings(permitted).map(f=>f.code)).toContain('iconoclast-points');
 });
 it('reports exact army point and per-datasheet limits',()=>{
  const oversized={...roster([['Chaos Acastus Knight Asterius',2],['War Dog Moirax',3]]),battleSize2026:'Incursion' as const};
  const codes=chaosKnightMusterFindings(oversized).map(f=>f.code);
  expect(codes).toContain('rule-of-three');expect(codes).toContain('points-limit');
 });
});
