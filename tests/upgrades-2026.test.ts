import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {eligibleUpgrades2026,selectUpgrade2026,validateUpgrades2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';
describe('11e squad upgrades in army builder',()=>{
 it('offers only upgrades from selected detachments to eligible squads',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Immortals');
  expect(eligibleUpgrades2026(base,'Immortals')).toEqual([]);
  const army={...base,detachments2026:['Hand of the Dynasty']};
  expect(eligibleUpgrades2026(army,'Immortals').map(x=>x.name)).toEqual(['Tools of Dominion']);
  expect(()=>selectUpgrade2026(army,'Immortals','Enlivened Sentinels')).toThrow();
  const selected=selectUpgrade2026(army,'Immortals','Tools of Dominion');
  expect(validateUpgrades2026(selected)).toBe(true);
  expect(generate11thReminders(selected).some(x=>x.id==='11e-necron-hod-tools')).toBe(true);
  expect(validateUpgrades2026({...selected,detachments2026:[]})).toBe(false);
 });
 it('supports instance-specific upgrades and clearing a choice',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Necron Warriors');
  const army={...base,detachments2026:['Hand of the Dynasty'],instances:[{id:'warriors-1',unit:'Necron Warriors'}]};
  const selected=selectUpgrade2026(army,'warriors-1','Enlivened Sentinels');
  expect(generate11thReminders(selected).some(x=>x.id==='11e-necron-hod-enlivened')).toBe(true);
  expect(selectUpgrade2026(selected,'warriors-1',null).upgrades2026).toEqual({});
 });
});
