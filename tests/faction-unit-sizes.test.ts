import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceModelCount} from '../src/roster-instances';
import {defaultUnitSize,legalUnitSizes} from '../src/unit-sizes';
describe('shared four-faction squad size catalog',()=>{
 it.each([
  ['Necrons','Necron Warriors',20],
  ['Orks','Boyz',20],
  ['Tyranids','Termagants',20],
  ['Space Marines','Aggressor Squad',6]
 ] as const)('supports %s %s model count %i',(faction,unit,size)=>{
  let army=addSelectionUnit(newSelection(faction),unit);
  army={...army,instances:expandRoster(army)};
  expect(legalUnitSizes(faction,unit)).toContain(size);
  expect(defaultUnitSize(faction,unit)).toBeGreaterThan(0);
  army=setInstanceModelCount(army,unit+'#1',size);
  expect(validateSelection(army)).toBe(true);
  expect(army.instances?.[0].models).toBe(size);
  expect(()=>setInstanceModelCount(army,unit+'#1',999)).toThrow();
  expect(validateSelection({...army,instances:[{...army.instances![0],models:999}]})).toBe(false);
 });
 it('does not invent a model-size choice for unmodeled datasheets',()=>{
  expect(legalUnitSizes('Tyranids','Norn Emissary')).toBeUndefined();
 });
});
