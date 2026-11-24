import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const cues=(unit:string)=>generate11thReminders({...addSelectionUnit(newSelection('Necrons'),unit),detachments2026:['Starshatter Arsenal']}).filter(r=>r.id.startsWith('11e-necron-starshatter-')&&!r.id.includes('onslaught'));
describe('Starshatter stratagems',()=>{
 it('shows eight phase cues for eligible vehicles',()=>expect(cues('Doomsday Ark')).toHaveLength(8));
 it('excludes vehicle-only effects for infantry',()=>expect(cues('Immortals')).toHaveLength(4));
 it.each(['Monolith','C’tan Shard of the Nightbringer'])('excludes %s from all six stratagems',unit=>expect(cues(unit)).toHaveLength(0));
 it('places reactive reposition in Shooting and servitude at end of Fight',()=>{
  expect(cues('Immortals').find(r=>r.id.endsWith('reactive'))?.window).toBe('Shooting');
  expect(cues('Immortals').find(r=>r.id.endsWith('servitude'))?.timing).toBe('end');
 });
});
