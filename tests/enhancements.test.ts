import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,removeSelectionUnit,validateSelection} from '../src/catalog';
import {assignEnhancement} from '../src/enhancements';
import {generateReminders} from '../src/generated-reminders';
describe('Necron enhancement assignment',()=>{
 const base=()=>addSelectionUnit(addSelectionUnit(addSelectionUnit(newSelection(),'Technomancer'),'Plasmancer'),'Imotekh the Stormlord');
 it('adds selected bearer-specific effects',()=>{
  const a=assignEnhancement(base(),'Technomancer','Veil of Darkness');
  expect(generateReminders(a).some(r=>r.id==='enhancement-Technomancer-Veil of Darkness')).toBe(true);
  expect(validateSelection(a)).toBe(true);
 });
 it('rejects epic heroes and duplicate enhancements',()=>{
  expect(()=>assignEnhancement(base(),'Imotekh the Stormlord','Veil of Darkness')).toThrow();
  const a=assignEnhancement(base(),'Technomancer','Veil of Darkness');
  expect(()=>assignEnhancement(a,'Plasmancer','Veil of Darkness')).toThrow();
 });
 it('removes enhancements when a bearer leaves the roster',()=>{
  const a=assignEnhancement(base(),'Technomancer','Enaegic Dermal Bond');
  expect(removeSelectionUnit(a,'Technomancer').enhancements).toEqual({});
 });
 it('clears enhancements from other detachments',()=>{
  const a=assignEnhancement(base(),'Technomancer','Veil of Darkness');
  expect(validateSelection({...a,detachment:'Canoptek Court'})).toBe(false);
 });
});
