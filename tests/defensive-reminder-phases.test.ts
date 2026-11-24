import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
describe('Defensive reminder phase coverage',()=>{
 it('shows Bound Creation in both combat phases only with a Cryptek',()=>{
  const army={...newSelection('Necrons'),instances:[{id:'thralls',unit:'Cryptothralls',attachedTo:'body'},{id:'cryptek',unit:'Plasmancer',attachedTo:'body'},{id:'body',unit:'Immortals'}]};
  expect(generate11thReminders(army).filter(r=>r.title.includes('Bound Creation')).map(r=>r.window).sort()).toEqual(['Fight','Shooting']);
  expect(generate11thReminders({...army,instances:army.instances.filter(s=>s.id!=='cryptek')}).filter(r=>r.title.includes('Bound Creation'))).toHaveLength(0);
 });
 it('shows Ork riled-up protection in both combat phases',()=>{
  expect(generate11thReminders(addSelectionUnit(newSelection('Orks'),'Meganobz')).filter(r=>r.id.startsWith('11e-orks-riled-save')).map(r=>r.window).sort()).toEqual(['Fight','Shooting']);
 });
});
