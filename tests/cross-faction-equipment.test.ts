import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {equipmentOption,setEquipment} from '../src/equipment';
import {expandRoster,setInstanceEquipment} from '../src/roster-instances';
describe('prepopulated cross-faction equipment choices',()=>{
 it.each([
  ['Space Marines','Aggressor Squad','Auto boltstorm gauntlets and fragstorm grenade launcher'],
  ['Space Marines','Inceptor Squad','Plasma exterminators'],
  ['Tyranids','Tyrannofex','Acid spray'],
  ['Tyranids','Termagants','Spinefists']
 ] as const)('%s %s supports %s',(faction,unit,choice)=>{
  let army=addSelectionUnit(newSelection(faction),unit);
  expect(equipmentOption(army,unit)?.choices).toContain(choice);
  army=setEquipment(army,unit,choice);
  expect(validateSelection(army)).toBe(true);
  army={...army,instances:expandRoster(army)};
  army=setInstanceEquipment(army,unit+'#1',choice);
  expect(validateSelection(army)).toBe(true);
  expect(army.instances?.[0].equipment).toBe(choice);
 });
 it('rejects cross-faction and nonexistent loadouts',()=>{
  const army=addSelectionUnit(newSelection('Orks'),'Boyz');
  expect(()=>setEquipment(army,'Boyz','Plasma exterminators')).toThrow();
  expect(()=>setEquipment(army,'Tyrannofex','Acid spray')).toThrow();
 });
 it('does not model squad-wide Eradicator multi-melta as a uniform weapon',()=>{
  const army=addSelectionUnit(newSelection('Space Marines'),'Eradicator Squad');
  expect(equipmentOption(army,'Eradicator Squad')).toBeUndefined();
 });
});
