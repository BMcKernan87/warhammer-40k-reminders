import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const ids=(army:ReturnType<typeof newSelection>)=>generate11thReminders(army).map(x=>x.id);
describe('remaining Necron detachment reminders follow the selected roster',()=>{
 it('does not show Hypercrypt activation for an empty army',()=>{
  const base={...newSelection('Necrons'),detachments2026:['Hypercrypt Legion']};
  expect(ids(base)).not.toContain('11e-necron-hypercrypt-hyperphasing');
  expect(ids(addSelectionUnit(base,'Immortals'))).toContain('11e-necron-hypercrypt-hyperphasing');
 });
 it('does not show Starshatter when only monsters are rostered',()=>{
  const base={...newSelection('Necrons'),detachments2026:['Starshatter Arsenal']};
  expect(ids(base)).not.toContain('11e-necron-starshatter-onslaught');
  expect(ids(addSelectionUnit(base,'C’tan Shard of the Nightbringer'))).not.toContain('11e-necron-starshatter-onslaught');
  expect(ids(addSelectionUnit(base,'Lokhust Heavy Destroyers'))).toContain('11e-necron-starshatter-onslaught');
 });
});
