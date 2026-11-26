import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {setInstanceModelCount} from '../src/roster-instances';
import {DATASHEETS_2026,rosterCost2026} from '../src/datasheets-2026';
describe('Wahapedia Necron 11e unit import',()=>{
 it('attributes the six newly imported units to their 11e datasheet pages',()=>{
  for(const unit of ['Immortals','Necron Warriors','Canoptek Wraiths','Lokhust Heavy Destroyers','Technomancer','Plasmancer']){
   const sheet=DATASHEETS_2026.find(x=>x.unit===unit);
   expect(sheet?.source).toMatch(/^https:\/\/wahapedia\.ru\/wh40k11ed\/factions\/necrons\//);
  }
 });
 it('uses Wraith first-copy and subsequent-copy costs',()=>{
  let army=addSelectionUnit(newSelection('Necrons'),'Canoptek Wraiths',2);
  army=setInstanceModelCount(army,'Canoptek Wraiths#1',3);
  army=setInstanceModelCount(army,'Canoptek Wraiths#2',6);
  expect(rosterCost2026(army).entries.map(x=>x.points)).toEqual([95,240]);
  expect(rosterCost2026(army).total).toBe(335);
 });
 it('applies heavy destroyer increased prices starting at third copy',()=>{
  let army=addSelectionUnit(newSelection('Necrons'),'Lokhust Heavy Destroyers',3);
  for(const id of ['Lokhust Heavy Destroyers#1','Lokhust Heavy Destroyers#2','Lokhust Heavy Destroyers#3'])army=setInstanceModelCount(army,id,1);
  expect(rosterCost2026(army).entries.map(x=>x.points)).toEqual([50,50,60]);
 });
});
