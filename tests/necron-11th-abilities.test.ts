import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const ids=(army:Parameters<typeof generate11thReminders>[0])=>generate11thReminders(army).map(r=>r.id);
describe('11e Necron source-backed rules',()=>{
 it('shows Ctan datasheet triggers only when their models are present',()=>{
  const base=newSelection('Necrons');
  expect(ids(base)).not.toContain('11e-necron-nightbringer-drain');
  expect(ids(addSelectionUnit(base,'C’tan Shard of the Nightbringer'))).toContain('11e-necron-nightbringer-drain');
  expect(ids(addSelectionUnit(base,'C’tan Shard of the Void Dragon'))).toContain('11e-necron-void-dragon-absorption');
 });
 it('filters Skyshroud Tomb Blade rules by detachment and squad',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Tomb Blades');
  expect(ids(base)).not.toContain('11e-necron-skyshroud-ingress');
  const selected={...base,detachments2026:['Skysword Spearhead']};
  expect(ids(selected)).toEqual(expect.arrayContaining(['11e-necron-skyshroud-deepstrike','11e-necron-skyshroud-ingress']));
  expect(ids({...selected,units:{}})).not.toContain('11e-necron-skyshroud-ingress');
 });
 it('only shows enhancement reminders when the upgrade is actually selected',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Immortals');
  const selected={...base,detachments2026:['Hand of the Dynasty']};
  expect(ids(selected)).not.toContain('11e-necron-hod-tools');
  expect(ids({...selected,upgrades2026:{Immortals:'Tools of Dominion'}})).toContain('11e-necron-hod-tools');
  expect(ids({...selected,enhancements:{Immortals:'Enlivened Sentinels'}})).not.toContain('11e-necron-hod-tools');
 });
});
