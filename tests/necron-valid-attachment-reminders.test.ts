import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
const cues=(unit:string,body?:string)=>necronDatasheetReminders2026({...newSelection('Necrons'),instances:[{id:'leader',unit,attachedTo:'body'},...(body?[{id:'body',unit:body}]:[])]});
describe('Necron attachment-dependent reminder targets',()=>{
 it('suppresses dangling and incompatible Plasmancer attachments',()=>{
  expect(cues('Plasmancer').some(r=>r.title.includes('Harbinger of Destruction'))).toBe(false);
  expect(cues('Plasmancer','Doomsday Ark').some(r=>r.title.includes('Harbinger of Destruction'))).toBe(false);
 });
 it('identifies both leader and eligible bodyguard',()=>{
  const cue=cues('Plasmancer','Immortals').find(r=>r.title.includes('Harbinger of Destruction'));
  expect(cue?.units).toEqual(['leader','body']);
 });
 it('identifies the actual Chronomancer and Royal Warden formations',()=>{
  expect(cues('Chronomancer','Immortals').find(r=>r.title.includes('Chronometron'))?.units).toEqual(['leader','body']);
  expect(cues('Royal Warden','Immortals').find(r=>r.title.includes('Adaptive Strategy'))?.units).toEqual(['leader','body']);
 });
});
