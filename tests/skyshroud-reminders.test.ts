import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026} from '../src/upgrades-2026';
const army=(unit:string)=>({...addSelectionUnit(newSelection('Necrons'),unit),detachments2026:['Skysword Spearhead']});
describe('Skyshroud Spearhead official faction pack reminders',()=>{
 it('generates all three stratagem reminders for Mounted units',()=>{
  const r=generate11thReminders(army('Tomb Blades'));
  for(const [id,phase] of [['omnilocked','Movement'],['swift','Movement'],['evasive','Shooting']])expect(r.some(x=>x.id==='11e-necron-skyshroud-'+id&&x.window===phase)).toBe(true);
  expect(generate11thReminders(army('Immortals')).some(x=>x.id==='11e-necron-skyshroud-swift')).toBe(false);
 });
 it('generates only selected eligible upgrades',()=>{
  const a=army('Tomb Blades');
  expect(generate11thReminders(a).some(x=>x.id==='11e-necron-skyshroud-recursive')).toBe(false);
  expect(generate11thReminders(selectUpgrade2026(a,'Tomb Blades','Recursive Reanimation')).some(x=>x.id==='11e-necron-skyshroud-recursive')).toBe(true);
  expect(generate11thReminders(selectUpgrade2026(army('Lokhust Destroyers'),'Lokhust Destroyers','Deepening Madness')).some(x=>x.id==='11e-necron-skyshroud-deepening'&&x.window==='Shooting')).toBe(true);
 });
});
