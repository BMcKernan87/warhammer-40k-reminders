import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
describe('11e Necron conditional reminders',()=>{
 it('shows Deathmarks reaction only with Deathmarks',()=>{
  const empty=newSelection('Necrons');
  expect(necronDatasheetReminders2026(empty).some(r=>r.id==='11e-necron-deathmarks-hunters')).toBe(false);
  expect(necronDatasheetReminders2026(addSelectionUnit(empty,'Deathmarks')).some(r=>r.id==='11e-necron-deathmarks-hunters'&&r.window==='Movement')).toBe(true);
 });
 it('does not show Cryptothrall melee retaliation for other units',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Flayed Ones');
  expect(necronDatasheetReminders2026(army).some(r=>r.id==='11e-necron-flayed-flesh')).toBe(true);
  expect(necronDatasheetReminders2026(army).some(r=>r.id==='11e-necron-cryptothralls-vigour')).toBe(false);
 });
 it('only shows Hypercrypt reminder with the selected 11e detachment',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Immortals');
  expect(generate11thReminders(army).some(r=>r.id==='11e-necron-hypercrypt-hyperphasing')).toBe(false);
  const selected={...army,detachments2026:['Hypercrypt Legion']};
  expect(generate11thReminders(selected).some(r=>r.id==='11e-necron-hypercrypt-hyperphasing'&&r.window==='End of opponent turn')).toBe(true);
 });
});
