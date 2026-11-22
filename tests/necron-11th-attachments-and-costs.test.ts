import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {attachLeader} from '../src/attachments';
import {generate11thReminders} from '../src/reminders-11th';
import {rosterCost2026} from '../src/datasheets-2026';
describe('11e Necron verified-cost and attachment reminders',()=>{
 it('calculates sourced units while using minimum Warriors squad size',()=>{
  const army=addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Canoptek Macrocytes'),'Canoptek Tomb Crawlers');
  expect(rosterCost2026(army).total).toBe(130);
  expect(rosterCost2026(addSelectionUnit(army,'Necron Warriors')).total).toBe(215);
 });
 it('shows Reanimation Protocols only for a Necron roster',()=>{
  expect(generate11thReminders(newSelection('Necrons')).some(x=>x.id==='11e-necron-reanimation')).toBe(false);
  const army=addSelectionUnit(newSelection('Necrons'),'Immortals');
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-reanimation'&&x.window==='Command')).toBe(true);
 });
 it('requires an actual Technomancer Wraith attachment',()=>{
  let army=addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Technomancer'),'Canoptek Wraiths');
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-technomancer-wraiths')).toBe(false);
  army=attachLeader(army,'Technomancer','Canoptek Wraiths');
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-technomancer-wraiths')).toBe(true);
 });
 it('requires an actual Plasmancer Immortals attachment',()=>{
  let army=addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Plasmancer'),'Immortals');
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-plasmancer-immortals')).toBe(false);
  army=attachLeader(army,'Plasmancer','Immortals');
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-plasmancer-immortals')).toBe(true);
 });
});
