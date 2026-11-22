import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {DATASHEETS_2026,rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
describe('11th edition datasheet and points registry',()=>{
 it('uses the verified minimum size for sourced datasheets',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Immortals');
  const cost=rosterCost2026(army);
  expect(cost.total).toBe(65);
  expect(cost.knownPoints).toBe(65);
  expect(cost.unknownUnits).toEqual([]);
  expect(verifiedUnitSizes2026(army,'Immortals')).toEqual([5,10]);
 });
 it('uses separately attributed point values only for sourced Ctan units',()=>{
  const army={...newSelection('Necrons'),units:{'C’tan Shard of the Nightbringer':1,'C’tan Shard of the Void Dragon':1}};
  const cost=rosterCost2026(army);
  expect(cost.total).toBe(705);
  expect(cost.unknownUnits).toEqual([]);
  expect(verifiedUnitSizes2026(army,'C’tan Shard of the Void Dragon')).toEqual([1]);
 });
 it('requires a verifiable source and explicitly supported sizes for imported entries',()=>{
  for(const sheet of DATASHEETS_2026){
   expect(sheet.source).toMatch(/^https:\/\//);
   expect(sheet.sizes.length).toBeGreaterThan(0);
   expect(sheet.sizes.every(x=>Number.isInteger(x)&&x>0)).toBe(true);
   if(sheet.verified==='sizes-and-points')expect(sheet.sizes.every(size=>Number.isFinite(sheet.pointsBySize?.[size]))).toBe(true);
  }
 });
});
