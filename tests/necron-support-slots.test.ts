import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {attachLeader,necronAttachmentRole} from '../src/attachments';
import {setInstanceAttachment} from '../src/roster-instances';
describe('Necron 11e Leader and Support slots',()=>{
 it('classifies Crypteks as Support and Nobles as Leaders',()=>{
  expect(necronAttachmentRole('Plasmancer')).toBe('support');
  expect(necronAttachmentRole('Overlord')).toBe('leader');
 });
 it('permits one Leader plus one Support but rejects two Supports',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['Immortals','Overlord','Plasmancer','Chronomancer'])army=addSelectionUnit(army,unit);
  army=attachLeader(attachLeader(army,'Overlord','Immortals'),'Plasmancer','Immortals');
  expect(()=>attachLeader(army,'Chronomancer','Immortals')).toThrow();
 });
 it('applies the same slot rules to per-instance attachments',()=>{
  let army=newSelection('Necrons');
  for(const unit of ['Immortals','Overlord','Plasmancer','Chronomancer'])army=addSelectionUnit(army,unit);
  army=setInstanceAttachment(army,'Overlord#1','Immortals#1');
  army=setInstanceAttachment(army,'Plasmancer#1','Immortals#1');
  expect(()=>setInstanceAttachment(army,'Chronomancer#1','Immortals#1')).toThrow();
 });
});
