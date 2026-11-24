import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const cues=(unit:string,detachment:string)=>generate11thReminders({...addSelectionUnit(newSelection('Necrons'),unit),detachments2026:[detachment]}).filter(r=>r.window==='Movement').map(r=>r.id);
describe('Necron detachment advance reminders',()=>{
 it('shows Starshatter Assault before advancing eligible vehicles and mounted units',()=>{
  expect(cues('Doomsday Ark','Starshatter Arsenal')).toContain('11e-necron-starshatter-assault');
  expect(cues('Tomb Blades','Starshatter Arsenal')).toContain('11e-necron-starshatter-assault');
  expect(cues('Monolith','Starshatter Arsenal')).not.toContain('11e-necron-starshatter-assault');
  expect(cues('Immortals','Starshatter Arsenal')).not.toContain('11e-necron-starshatter-assault');
 });
 it('shows Cryptek Conclave Assault only for eligible rosters',()=>{
  expect(cues('Technomancer','Cryptek Conclave')).toContain('11e-necron-cryconclave-assault');
  expect(cues('Immortals','Cryptek Conclave')).not.toContain('11e-necron-cryconclave-assault');
 });
});
