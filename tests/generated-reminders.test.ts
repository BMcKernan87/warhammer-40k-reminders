import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generateReminders,remindersForWindow} from '../src/generated-reminders';
describe('roster-derived reminders',()=>{
 it('places Necron reanimation at the end of Command',()=>{const r=remindersForWindow(newSelection(),'Command').find(r=>r.id==='necron-reanimation');expect(r?.timing).toBe('end');expect(r?.summary).toContain('D3');});
 it('includes Hyperphasing only for Hypercrypt',()=>{const army={...newSelection(),detachment:'Hypercrypt Legion'};expect(remindersForWindow(army,'End of opponent turn').map(x=>x.id)).toContain('hypercrypt-hyperphasing');expect(remindersForWindow(newSelection(),'End of opponent turn')).toEqual([]);});
 it('includes Oath of Moment only for Marines',()=>{expect(remindersForWindow(newSelection('Space Marines'),'Command').map(x=>x.id)).toContain('marine-oath');expect(generateReminders(newSelection()).map(x=>x.id)).not.toContain('marine-oath');});
 it('only generates selected unit datasheet prompts',()=>{const army=addSelectionUnit(newSelection(),'Immortals',2);expect(generateReminders(army).filter(x=>x.origin==='unit').map(x=>x.title)).toContain('Immortals datasheet');expect(generateReminders(army).map(x=>x.id)).toContain('immortals-eradication');});
});
