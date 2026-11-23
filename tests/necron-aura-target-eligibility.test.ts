import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceWargear} from '../src/roster-instances';
const has=(army:ReturnType<typeof newSelection>,name:string)=>generate11thReminders(army).some(r=>r.title.includes(name));
describe('imported Necron aura target eligibility',()=>{
 it('Mechanical Augmentation needs Necron Battleline',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Illuminor Szeras');
  expect(has(base,'Mechanical Augmentation')).toBe(false);
  expect(has(addSelectionUnit(base,'Immortals'),'Mechanical Augmentation')).toBe(true);
 });
 it('Fabricator Claw Array needs another friendly Vehicle',()=>{
  const base=individualArmy(addSelectionUnit(newSelection('Necrons'),'Canoptek Spyders'));
  const equipped=setInstanceWargear(base,base.instances![0].id,'Fabricator claw array',1);
  expect(has(equipped,'Fabricator Claw Array')).toBe(false);
  expect(has(addSelectionUnit(equipped,'Doomsday Ark'),'Fabricator Claw Array')).toBe(true);
 });
 it('Reanimation Nodes needs friendly Infantry',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Convergence Of Dominion');
  expect(has(base,'Reanimation Nodes')).toBe(false);
  expect(has(addSelectionUnit(base,'Necron Warriors'),'Reanimation Nodes')).toBe(true);
 });
});
