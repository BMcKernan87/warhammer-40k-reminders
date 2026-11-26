import {describe,it,expect} from 'vitest';
import {DATASHEETS_2026,rosterCost2026} from '../src/datasheets-2026';
import {CATALOG,addSelectionUnit,newSelection} from '../src/catalog';
import {setInstanceModelCount} from '../src/roster-instances';
const source='https://wahapedia.ru/wh40k11ed/factions/necrons/';
describe('Necron 11e expanded Wahapedia import',()=>{
 it('imports a priced datasheet for every selectable Necron',()=>{
  expect(DATASHEETS_2026.find(d=>d.unit==='Royal Warden')?.pointsBySize?.[1]).toBe(50);
  const imported=DATASHEETS_2026.filter(d=>d.faction==='Necrons'&&d.pointsBySize);
  expect(imported.map(d=>d.unit).sort()).toEqual([...CATALOG.Necrons.units].sort());
  expect(imported.every(d=>d.pointsSource?.startsWith(source))).toBe(true);
  expect(new Set(imported.map(d=>d.pointsSource)).size).toBe(imported.length);
 });
 it('uses third-copy Destroyer pricing, not second-copy pricing',()=>{
  let army=addSelectionUnit(newSelection('Necrons'),'Skorpekh Destroyers',3);
  for(const id of ['Skorpekh Destroyers#1','Skorpekh Destroyers#2','Skorpekh Destroyers#3'])army=setInstanceModelCount(army,id,3);
  expect(rosterCost2026(army).entries.map(x=>x.points)).toEqual([85,85,95]);
 });
 it('uses second-copy Monolith pricing',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Monolith',2);
  expect(rosterCost2026(army).entries.map(x=>x.points)).toEqual([420,440]);
 });
});
