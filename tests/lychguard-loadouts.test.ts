import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster,setInstanceAttachment,setInstanceEquipment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('Lychguard weapon and Noble rules',()=>{
 it('generates independent sword/shield and warscythe reminders',()=>{
  let a=addSelectionUnit(newSelection(),'Lychguard',2);
  a={...a,instances:expandRoster(a)};
  a=setInstanceEquipment(a,'Lychguard#2','Hyperphase sword and dispersion shield');
  const reminders=generateReminders(a);
  const scythe=reminders.find(r=>r.id==='equipment-Lychguard#1-Warscythe');
  const shield=reminders.find(r=>r.id==='equipment-Lychguard#2-Hyperphase sword and dispersion shield');
  expect(scythe?.summary).toContain('DEVASTATING WOUNDS');
  expect(shield?.summary).toContain('4+ invulnerable');
  expect(shield?.window).toBe('Fight');
 });
 it('only shows Guardian Protocols for Noble-led Lychguard',()=>{
  let a=addSelectionUnit(newSelection(),'Lychguard',2);
  a=addSelectionUnit(a,'Overlord');
  a={...a,instances:expandRoster(a)};
  expect(generateReminders(a).some(r=>r.id.startsWith('lychguard-guardian-'))).toBe(false);
  a=setInstanceAttachment(a,'Overlord#1','Lychguard#2');
  const reminders=generateReminders(a).filter(r=>r.id.startsWith('lychguard-guardian-'));
  expect(reminders.map(r=>r.units?.[0])).toEqual(['Lychguard#2']);
 });
});
