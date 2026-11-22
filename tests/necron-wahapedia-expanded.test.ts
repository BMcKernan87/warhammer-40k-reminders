import {describe,it,expect} from 'vitest';
import {DATASHEETS_2026,rosterCost2026} from '../src/datasheets-2026';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {setInstanceModelCount} from '../src/roster-instances';
const source='https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html';
describe('Necron 11e expanded Wahapedia import',()=>{
 it('imports at least 35 priced datasheets with direct source attribution',()=>{
  const imported=DATASHEETS_2026.filter(d=>d.faction==='Necrons'&&d.pointsBySize);
  expect(imported.length).toBeGreaterThanOrEqual(35);
  expect(imported.filter(d=>d.pointsSource===source).length).toBeGreaterThanOrEqual(20);
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
