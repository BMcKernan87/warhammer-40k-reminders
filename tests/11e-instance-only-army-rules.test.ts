import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const ids=(army:ReturnType<typeof newSelection>)=>generate11thReminders(army).map(r=>r.id);
describe('11th edition army rules use selected roster instances',()=>{
 it('shows Necron Reanimation for instance-only roster',()=>{
  expect(ids(newSelection('Necrons'))).not.toContain('11e-necron-reanimation');
  expect(ids({...newSelection('Necrons'),instances:[{id:'immortals-1',unit:'Immortals'}]})).toContain('11e-necron-reanimation');
 });
 it('does not show Ork Waaagh for a zero-count unit',()=>{
  expect(ids({...newSelection('Orks'),units:{Boyz:0}})).not.toContain('11e-orks-war-cry');
 });
 it('shows Ork Waaagh and Meganobz reminder for instance-only roster',()=>{
  const selected={...newSelection('Orks'),instances:[{id:'meganobz-1',unit:'Meganobz'}]};
  expect(ids(selected)).toContain('11e-orks-war-cry');
  expect(ids(selected)).toContain('11e-orks-meganobz-krumpin');
 });
});
