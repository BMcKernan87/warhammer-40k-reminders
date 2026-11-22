import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {DATASHEETS_2026,verifiedUnitSizes2026,rosterCost2026} from '../src/datasheets-2026';
import {setInstanceEquipment} from '../src/roster-instances';
describe('official 11e Necron datasheet integration',()=>{
 it('loads Macrocytes as a five-model unit with attributed points',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Canoptek Macrocytes');
  expect(verifiedUnitSizes2026(army,'Canoptek Macrocytes')).toEqual([5]);
  expect(rosterCost2026(army).total).toBe(70);
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-macrocytes-accelerator')).toBe(true);
 });
 it('filters Geomancer and Nekrosor abilities by actual roster',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Geomancer');
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-geomancer-tectonic'&&x.window==='Movement')).toBe(true);
  expect(generate11thReminders(army).some(x=>x.id==='11e-necron-nekrosor-ranged-aura')).toBe(false);
  const withNekrosor=addSelectionUnit(army,'Nekrosor Ammentar');
  expect(generate11thReminders(withNekrosor).some(x=>x.id==='11e-necron-nekrosor-ranged-aura')).toBe(true);
 });
 it('accepts only the two official Tomb Crawler loadout patterns',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Canoptek Tomb Crawlers');
  const configured=setInstanceEquipment(army,'Canoptek Tomb Crawlers#1','One twin gauss reaper and one transdimensional isolator');
  expect(configured.instances?.[0].equipment).toContain('transdimensional isolator');
  expect(()=>setInstanceEquipment(army,'Canoptek Tomb Crawlers#1','Two transdimensional isolators')).toThrow();
 });
 it('has faction-pack statlines for eight Necron units',()=>{
  const profiles=DATASHEETS_2026.filter(x=>x.faction==='Necrons'&&x.profile);
  expect(profiles).toHaveLength(8);
  expect(profiles.find(x=>x.unit==='C’tan Shard of the Void Dragon')?.profile).toMatchObject({move:'10"',toughness:11,wounds:16,objectiveControl:4});
  expect(profiles.find(x=>x.unit==='Canoptek Tomb Crawlers')?.profile).toMatchObject({move:'5"',toughness:4,wounds:3});
 });
 it('applies official 8-inch Transcendent Ctan displacement errata',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Transcendent C’tan');
  const reminder=generate11thReminders(army).find(x=>x.id==='11e-necron-transcendent-displacement');
  expect(reminder?.summary).toContain('8 inches');
  expect(reminder?.summary).not.toContain('9 inches');
 });
});
