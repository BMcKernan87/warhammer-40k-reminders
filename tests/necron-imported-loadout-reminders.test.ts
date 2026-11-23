import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {setInstanceEquipment,individualArmy,setInstanceAttachment} from '../src/roster-instances';

describe('imported Necron reminders respect actual roster loadouts',()=>{
 it('shows only the selected Lokhust Heavy Destroyer weapon effect',()=>{
  const base=individualArmy(addSelectionUnit(newSelection('Necrons'),'Lokhust Heavy Destroyers'));
  const id=base.instances![0].id;
  const gauss=generate11thReminders(setInstanceEquipment(base,id,'Gauss destructor')).find(r=>r.id==='11e-necron-optimised');
  const enmitic=generate11thReminders(setInstanceEquipment(base,id,'Enmitic exterminator')).find(r=>r.id==='11e-necron-optimised');
  expect(gauss?.summary).toContain('Gauss destructor');
  expect(gauss?.summary).not.toContain('Enmitic exterminator');
  expect(enmitic?.summary).toContain('Enmitic exterminator');
  expect(enmitic?.summary).not.toContain('Gauss destructor');
 });
 it('only imports Lychguard Guardian Protocols when an eligible Noble is attached',()=>{
  const base=individualArmy(addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Lychguard'),'Overlord'));
  const reminder=()=>generate11thReminders(base).some(r=>r.id==='11e-necron-guardian');
  expect(reminder()).toBe(false);
  const l=base.instances!.find(s=>s.unit==='Overlord')!;
  const b=base.instances!.find(s=>s.unit==='Lychguard')!;
  const attached=setInstanceAttachment(base,l.id,b.id);
  expect(generate11thReminders(attached).some(r=>r.id==='11e-necron-guardian')).toBe(true);
 });
});
