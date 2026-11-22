import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
import {generate11thReminders,grouped11thReminders,armySetup11th} from '../src/reminders-11th';
describe('11th-edition-only application pipeline',()=>{
 it('includes every official Space Marine detachment from the June 2026 table',()=>{
  expect(DETACHMENTS_2026['Space Marines']).toHaveLength(22);
  expect(detachmentBudget('Space Marines',['Fulguris Task Force','Vanguard Spearhead'],'Strike Force')).toMatchObject({valid:true,spent:3});
  expect(detachmentBudget('Space Marines',['Gladius Task Force','Vanguard Spearhead'],'Strike Force').valid).toBe(false);
 });
 it('does not leak legacy 10th-edition datasheet or stratagem reminders',()=>{
  for(const faction of ['Necrons','Orks','Tyranids','Space Marines'] as const){
   const unit=faction==='Necrons'?'Immortals':faction==='Orks'?'Boyz':faction==='Tyranids'?'Termagants':'Aggressor Squad';
   const army=addSelectionUnit(newSelection(faction),unit);
   expect(generate11thReminders(army).map(r=>r.id)).toEqual(expect.arrayContaining(['11e-core-cp','11e-battle-shock','11e-move-every-unit','11e-shoot','11e-charge','11e-fight']));
   expect(grouped11thReminders(army).reduce((sum,g)=>sum+g.reminders.length,0)).toBe(generate11thReminders(army).length);
  }
 });
 it('preserves an 11th-edition Space Marine detachment selection in validated armies',()=>{
  const army={...newSelection('Space Marines'),detachments2026:['Fulguris Task Force','Vanguard Spearhead'],battleSize2026:'Strike Force' as const};
  expect(validateSelection(army)).toBe(true);
  expect(armySetup11th(army).some(item=>item.label==='Force Dispositions'&&item.description.includes('Reconnaissance'))).toBe(true);
 });
});
