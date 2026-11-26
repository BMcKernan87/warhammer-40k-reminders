import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
describe('Necron support rules require eligible roster targets',()=>{
 it('only includes Canoptek Swarm when Scarabs are present',()=>{
  const spyder=addSelectionUnit(newSelection('Necrons'),'Canoptek Spyders');
  expect(generate11thReminders(spyder).some(r=>r.title.includes('Canoptek Swarm'))).toBe(false);
  const supported=addSelectionUnit(spyder,'Canoptek Scarab Swarms');
  expect(generate11thReminders(supported).some(r=>r.title.includes('Canoptek Swarm'))).toBe(true);
 });
 it('only includes Trazyn Surrogate Hosts with an eligible replacement Character',()=>{
  const trazyn=addSelectionUnit(newSelection('Necrons'),'Trazyn the Infinite');
  expect(generate11thReminders(trazyn).some(r=>r.title.includes('Surrogate Hosts'))).toBe(false);
  const supported=addSelectionUnit(trazyn,'Technomancer');
  expect(generate11thReminders(supported).some(r=>r.title.includes('Surrogate Hosts'))).toBe(true);
 });
});
