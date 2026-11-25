import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const reminders=(unit:string)=>generate11thReminders(addSelectionUnit(newSelection('Necrons'),unit));
describe('Necron phase reminder placement',()=>{
 it('places the stationary decision in Movement and the shooting consequence in Shooting',()=>{
  const found=reminders('Doomsday Ark').filter(r=>r.title.includes('Overwhelming Obliteration'));
  expect(found.map(r=>r.window)).toEqual(['Movement','Shooting']);
  expect(found[1].summary.toLowerCase()).toContain('stationary');
 });
 it('keeps genuine Movement shooting reactions',()=>{
  expect(reminders('Deathmarks').some(r=>r.window==='Movement'&&r.title.includes('Hyperspace Hunters'))).toBe(true);
  expect(reminders('Hexmark Destroyer').some(r=>r.window==='Movement'&&r.title.includes('Inescapable Death'))).toBe(true);
 });
 it('keeps ranged cover out of Fight',()=>{
  expect(reminders('Convergence Of Dominion').filter(r=>r.title.includes('Ancient Cover')).map(r=>r.window)).toEqual(['Shooting']);
 });
});
