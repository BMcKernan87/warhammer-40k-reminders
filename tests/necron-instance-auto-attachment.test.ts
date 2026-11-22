import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {expandRoster,autoAttachUnambiguousInstances} from '../src/roster-instances';
describe('automatic Necron per-squad attachments',()=>{
 it('assigns a unique Bodyguard to a Support and a Leader',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['Immortals','Plasmancer','Overlord'])army=addSelectionUnit(army,unit);
  army={...army,instances:expandRoster(army)};
  army=autoAttachUnambiguousInstances(army);
  expect(army.instances?.find(x=>x.unit==='Plasmancer')?.attachedTo).toBe('Immortals#1');
  expect(army.instances?.find(x=>x.unit==='Overlord')?.attachedTo).toBe('Immortals#1');
 });
 it('leaves two eligible Immortal squads unassigned',()=>{
  let army=addSelectionUnit(newSelection('Necrons'),'Immortals',2);
  army=addSelectionUnit(army,'Plasmancer');
  army={...army,instances:expandRoster(army)};
  expect(autoAttachUnambiguousInstances(army).instances?.find(x=>x.unit==='Plasmancer')?.attachedTo).toBeUndefined();
 });
 it('does not assign a second Support to an occupied slot',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['Immortals','Plasmancer','Chronomancer'])army=addSelectionUnit(army,unit);
  army={...army,instances:expandRoster(army)};
  army=autoAttachUnambiguousInstances(army);
  expect(army.instances?.filter(x=>x.attachedTo==='Immortals#1')).toHaveLength(1);
 });
});
