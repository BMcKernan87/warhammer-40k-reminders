import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
import {generate11thReminders,grouped11thReminders,armySetup11th} from '../src/reminders-11th';
describe('11th-edition-only application pipeline',()=>{
 it('uses the October Space Marines and Deathwatch detachments',()=>{
  expect(DETACHMENTS_2026['Space Marines']).toHaveLength(23);
  expect(detachmentBudget('Space Marines',['Spearpoint Task Force','Gauntlet Task Force'],'Strike Force')).toMatchObject({valid:true,spent:3});
  expect(detachmentBudget('Space Marines',['Gladius Task Force','Phobos Shadow Force'],'Strike Force').valid).toBe(false);
 });
 it('does not leak legacy 10th-edition datasheet or stratagem reminders',()=>{
  for(const faction of ['Necrons','Orks','Tyranids','Space Marines'] as const){
   const unit=faction==='Necrons'?'Immortals':faction==='Orks'?'Boyz':faction==='Tyranids'?'Termagants':'Aggressor Squad';
   const army=addSelectionUnit(newSelection(faction),unit);
   expect(generate11thReminders(army).map(r=>r.id)).toEqual(expect.arrayContaining(['11e-core-cp','11e-battle-shock','11e-move-every-unit','11e-shoot','11e-charge','11e-fight']));
   expect(grouped11thReminders(army).reduce((sum,g)=>sum+g.reminders.length,0)).toBe(generate11thReminders(army).length);
  }
 });
 it('adds 11th-edition Orks rules only for an Orks roster and Meganobz only when selected',()=>{
  const orks=addSelectionUnit(newSelection('Orks'),'Boyz');
  expect(generate11thReminders(orks).some(r=>r.id==='11e-orks-war-cry')).toBe(true);
  expect(generate11thReminders(orks).some(r=>r.id==='11e-orks-meganobz-krumpin')).toBe(false);
  const withMeganobz=addSelectionUnit(orks,'Meganobz');
  expect(generate11thReminders(withMeganobz).some(r=>r.id==='11e-orks-meganobz-krumpin')).toBe(true);
  expect(generate11thReminders(addSelectionUnit(newSelection('Necrons'),'Immortals')).some(r=>r.id.startsWith('11e-orks'))).toBe(false);
 });
 it('generates 11e Necron Hand of the Dynasty rules only with the selected detachment and eligible units',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Immortals');
  expect(generate11thReminders(base).some(r=>r.id==='11e-necron-hod-dominance')).toBe(false);
  const selected={...base,detachments2026:['Hand of the Dynasty']};
  const ids=generate11thReminders(selected).map(r=>r.id);
  expect(ids).toEqual(expect.arrayContaining(['11e-necron-hod-dominance','11e-necron-hod-will','11e-necron-hod-nanosaturation']));
  const warriors={...addSelectionUnit(newSelection('Necrons'),'Necron Warriors'),detachments2026:['Hand of the Dynasty']};
  expect(generate11thReminders(warriors).some(r=>r.id==='11e-necron-hod-dominance')).toBe(false);
  expect(generate11thReminders(warriors).some(r=>r.id==='11e-necron-hod-will')).toBe(true);
 });
 it('preserves an 11th-edition Space Marine detachment selection in validated armies',()=>{
  const army={...newSelection('Space Marines'),detachments2026:['Spearpoint Task Force','Gauntlet Task Force'],battleSize2026:'Strike Force' as const};
  expect(validateSelection(army)).toBe(true);
  expect(armySetup11th(army).some(item=>item.label==='Force Dispositions'&&item.description.includes('Reconnaissance'))).toBe(true);
 });
});
