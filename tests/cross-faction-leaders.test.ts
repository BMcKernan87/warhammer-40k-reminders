import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {leaderBodyguards} from '../src/leader-eligibility';
describe('cross-faction Leader attachments',()=>{
 it.each([
  ['Orks','Warboss','Boyz'],
  ['Tyranids','Broodlord','Genestealers'],
  ['Space Marines','Apothecary Biologis','Aggressor Squad'],
  ['Necrons','Overlord','Necron Warriors']
 ] as const)('%s %s can lead %s',(faction,leader,bodyguard)=>{
  let army=addSelectionUnit(addSelectionUnit(newSelection(faction),leader),bodyguard);
  army={...army,instances:expandRoster(army)};
  expect(leaderBodyguards(faction,leader)).toContain(bodyguard);
  army=setInstanceAttachment(army,leader+'#1',bodyguard+'#1');
  expect(validateSelection(army)).toBe(true);
  expect(army.instances?.find(x=>x.unit===leader)?.attachedTo).toBe(bodyguard+'#1');
  army=setInstanceAttachment(army,leader+'#1',null);
  expect(validateSelection(army)).toBe(true);
 });
 it('rejects cross-faction Bodyguard combinations',()=>{
  let army=addSelectionUnit(addSelectionUnit(newSelection('Orks'),'Warboss'),'Gretchin');
  army={...army,instances:expandRoster(army)};
  expect(()=>setInstanceAttachment(army,'Warboss#1','Gretchin#1')).toThrow();
 });
});
