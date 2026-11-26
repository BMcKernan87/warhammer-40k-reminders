import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const has=(unit:string,detachment:string,id:string)=>generate11thReminders({...addSelectionUnit(newSelection('Necrons'),unit),detachments2026:[detachment]}).some(r=>r.id===id);
describe('Necron detachment rules require eligible datasheet keywords',()=>{
 it('Canoptek Court Power Matrix needs a Cryptek or Canoptek unit',()=>{
  expect(has('Necron Warriors','Canoptek Court','11e-necron-canoptek-power-matrix')).toBe(false);
  expect(has('Canoptek Doomstalker','Canoptek Court','11e-necron-canoptek-power-matrix')).toBe(true);
  expect(has('Technomancer','Canoptek Court','11e-necron-canoptek-power-matrix')).toBe(true);
 });
 it('Cryptek Conclave augmentation requires a Cryptek',()=>{
  expect(has('Immortals','Cryptek Conclave','11e-necron-cryconclave-augmentations')).toBe(false);
  expect(has('Plasmancer','Cryptek Conclave','11e-necron-cryconclave-augmentations')).toBe(true);
 });
 it('Cursed Legion Cold Fervour requires Destroyer Cult',()=>{
  expect(has('Immortals','Cursed Legion','11e-necron-cursed-cold-fervour')).toBe(false);
  expect(has('Skorpekh Destroyers','Cursed Legion','11e-necron-cursed-cold-fervour')).toBe(true);
 });
});
