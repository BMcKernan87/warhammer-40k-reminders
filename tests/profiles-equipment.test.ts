import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {setEquipment} from '../src/equipment';
import {generateReminders} from '../src/generated-reminders';
import {initialStore,createProfile,updateProfile,deleteProfile,validateStore} from '../src/profiles';
describe('equipment and saved army isolation',()=>{
 it('changes reminders when Immortal weapons change',()=>{
  const base=addSelectionUnit(newSelection(),'Immortals');
  const gauss=generateReminders(base).map(x=>x.id);
  const tesla=generateReminders(setEquipment(base,'Immortals','Tesla carbine')).map(x=>x.id);
  expect(gauss).toContain('equipment-Immortals-Gauss blaster');
  expect(tesla).toContain('equipment-Immortals-Tesla carbine');
  expect(tesla).not.toContain('equipment-Immortals-Gauss blaster');
 });
 it('rejects equipment for absent units',()=>expect(()=>setEquipment(newSelection(),'Immortals','Tesla carbine')).toThrow());
 it('isolates roster, battle state and completion per profile',()=>{
  const a=initialStore();
  const b=createProfile(a,'second','Orks army');
  const changed=updateProfile(b,'second',{army:newSelection('Orks'),completed:['orks-waaagh']});
  expect(changed.profiles[0].army.faction).toBe('Necrons');
  expect(changed.profiles[0].completed).toEqual([]);
  expect(changed.profiles[1].army.faction).toBe('Orks');
  expect(validateStore(changed)).toBe(true);
  expect(deleteProfile(changed,'second').activeId).toBe('default');
 });
});
