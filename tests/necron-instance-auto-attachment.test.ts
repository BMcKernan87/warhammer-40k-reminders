import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {expandRoster,autoAttachUnambiguousInstances,setInstanceAttachment} from '../src/roster-instances';
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
 it('leaves the choice open when two Supports compete for one slot',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['Immortals','Plasmancer','Chronomancer'])army=addSelectionUnit(army,unit);
  army={...army,instances:expandRoster(army)};
  army=autoAttachUnambiguousInstances(army);
  expect(army.instances?.filter(x=>x.attachedTo==='Immortals#1')).toHaveLength(0);
  army=setInstanceAttachment(army,'Chronomancer#1','Immortals#1');
  army=autoAttachUnambiguousInstances(army);
  expect(army.instances?.filter(x=>x.attachedTo==='Immortals#1').map(s=>s.unit)).toEqual(['Chronomancer']);
 });
 it('preserves an explicitly independent Leader when adding another squad and reopening the army',()=>{
  let a=newSelection();
  for(const name of ['Immortals','Overlord'])a=addSelectionUnit(a,name);
  a=autoAttachUnambiguousInstances({...a,instances:expandRoster(a)});
  expect(a.instances?.find(s=>s.unit==='Overlord')?.attachedTo).toBe('Immortals#1');
  a=setInstanceAttachment(a,'Overlord#1',null);
  a=autoAttachUnambiguousInstances(addSelectionUnit(JSON.parse(JSON.stringify(a)),'Doomsday Ark'));
  expect(validateSelection(a)).toBe(true);
  expect(a.instances?.find(s=>s.unit==='Overlord')?.attachedTo).toBeUndefined();
  a=setInstanceAttachment(a,'Overlord#1','Immortals#1');
  expect(a.instances?.find(s=>s.unit==='Overlord')?.keepUnattached).toBeUndefined();
 });
 it('resolves the same forced chain regardless of roster order',()=>{
  for(const order of [['Technomancer','Plasmancer'],['Plasmancer','Technomancer']]){
   let a=newSelection();
   for(const name of [...order,'Canoptek Wraiths','Immortals'])a=addSelectionUnit(a,name);
   a=autoAttachUnambiguousInstances({...a,instances:expandRoster(a)});
   expect(a.instances?.find(s=>s.unit==='Technomancer')?.attachedTo).toBe('Canoptek Wraiths#1');
   expect(a.instances?.find(s=>s.unit==='Plasmancer')?.attachedTo).toBe('Immortals#1');
  }
 });
});
