import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
const ids=(instances:{id:string;unit:string;attachedTo?:string}[])=>necronDatasheetReminders2026({...newSelection('Necrons'),instances}).map(r=>r.id);
describe('Cryptothralls Bound Creation attachment eligibility',()=>{
 it('does not claim the benefit without an attached Cryptek',()=>{
  expect(ids([{id:'thralls-1',unit:'Cryptothralls'}])).not.toContain('11e-necron-cryptothralls-bound-thralls-1');
  expect(ids([{id:'thralls-1',unit:'Cryptothralls'},{id:'tech-1',unit:'Technomancer'}])).not.toContain('11e-necron-cryptothralls-bound-thralls-1');
 });
 it('shows the benefit when Cryptek and Cryptothralls share an attached unit',()=>{
  expect(ids([{id:'warriors-1',unit:'Necron Warriors'},{id:'thralls-1',unit:'Cryptothralls',attachedTo:'warriors-1'},{id:'tech-1',unit:'Technomancer',attachedTo:'warriors-1'}])).toContain('11e-necron-cryptothralls-bound-thralls-1');
 });
});
