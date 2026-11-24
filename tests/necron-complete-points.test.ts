import {describe,it,expect} from 'vitest';
import {DATASHEETS_2026,rosterCost2026} from '../src/datasheets-2026';
import {CATALOG,addSelectionUnit,newSelection} from '../src/catalog';
import {setInstanceModelCount} from '../src/roster-instances';
describe('complete Necron 11e point schedules',()=>{
 it('has a unique, priced 11e record for every imported Necron unit',()=>{
  const units=DATASHEETS_2026.filter(d=>d.faction==='Necrons');
  expect(units.map(d=>d.unit).sort()).toEqual([...CATALOG.Necrons.units].sort());
  expect(new Set(units.map(d=>d.unit)).size).toBe(units.length);
  for(const d of units){
   expect(d.verified).toBe('sizes-and-points');
   expect(d.pointsSource).toMatch(/^https:\/\//);
   for(const size of d.sizes)expect(d.pointsBySize?.[size]).toBeGreaterThan(0);
  }
 });
 it('uses updated late-2026 repricing for previously missing characters',()=>{
  for(const [unit,points] of [['Nekrosor Ammentar',195],['Psychomancer',65],['Skorpekh Lord',95],['Trazyn the Infinite',60],['Lokhust Lord',80],['Royal Warden',50]] as const){
   const army=addSelectionUnit(newSelection('Necrons'),unit);
   expect(rosterCost2026(army).total).toBe(points);
  }
 });
 it('prices Chronomancer first and later copies and imports its profile',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Chronomancer',3);
  expect(rosterCost2026(army).entries.map(e=>e.points)).toEqual([70,80,80]);
  expect(rosterCost2026(army).total).toBe(230);
  expect(DATASHEETS_2026.find(d=>d.unit==='Chronomancer')?.profile).toEqual({move:'5"',toughness:4,save:'4+',wounds:4,leadership:'6+',objectiveControl:1});
 });
 it('prices all three Convergence of Dominion sizes',()=>{
  for(const [size,points] of [[1,60],[2,120],[3,180]]){
   const army=setInstanceModelCount(addSelectionUnit(newSelection('Necrons'),'Convergence Of Dominion'),'Convergence Of Dominion#1',size);
   expect(rosterCost2026(army).total).toBe(points);
  }
 });
});
