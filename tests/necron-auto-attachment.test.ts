import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {autoAttachUnambiguousNecrons} from '../src/attachments';
describe('automatic 11e Necron attachments',()=>{
 it('attaches a Support to the only legal Bodyguard',()=>{
  let army=addSelectionUnit(newSelection('Necrons'),'Immortals');
  army=autoAttachUnambiguousNecrons(addSelectionUnit(army,'Plasmancer'));
  expect(army.attachments?.Plasmancer).toBe('Immortals');
 });
 it('allows one Leader and one Support to attach automatically',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['Immortals','Plasmancer','Overlord'])army=autoAttachUnambiguousNecrons(addSelectionUnit(army,unit));
  expect(army.attachments?.Plasmancer).toBe('Immortals');
  expect(army.attachments?.Overlord).toBe('Immortals');
 });
 it('leaves ambiguous choices and conflicting Support slots untouched',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['Immortals','Necron Warriors','Plasmancer'])army=addSelectionUnit(army,unit);
  expect(autoAttachUnambiguousNecrons(army).attachments?.Plasmancer).toBeUndefined();
  army=newSelection('Necrons');
  for(const unit of ['Immortals','Plasmancer','Chronomancer'])army=autoAttachUnambiguousNecrons(addSelectionUnit(army,unit));
  expect(army.attachments?.Plasmancer).toBe('Immortals');
  expect(army.attachments?.Chronomancer).toBeUndefined();
 });
});
