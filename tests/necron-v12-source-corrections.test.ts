import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
const army=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const id=(a:ReturnType<typeof army>,unit:string)=>expandRoster(a).find(s=>s.unit===unit)!.id;
const named=(a:ReturnType<typeof army>,name:string)=>generate11thReminders(a).filter(r=>r.title.includes(name));
describe('11e v1.2 source corrections',()=>{
 it('includes Ancient Collector only for Trazyn leading a legal formation',()=>{
  const a=army('Trazyn the Infinite','Immortals');
  const l=id(a,'Trazyn the Infinite'),b=id(a,'Immortals');
  const unled=setInstanceAttachment(a,l,null);
  expect(named(unled,'Ancient Collector')).toEqual([]);
  const joined=setInstanceAttachment(unled,l,b);
  expect(named(joined,'Ancient Collector')).toHaveLength(1);
  expect(named(joined,'Ancient Collector')[0]).toMatchObject({window:'Command',timing:'end',units:[l,b]});
  expect(named(joined,'Ancient Collector')[0].summary).toContain('at the end of a phase');
 });
 it('clarifies both Mechanical Augmentation effects rather than implying a choice',()=>{
  const a=army('Illuminor Szeras','Immortals');
  const cues=named(a,'Mechanical Augmentation').filter(r=>r.title.includes('Illuminor Szeras'));
  expect(cues.length).toBeGreaterThan(0);
  expect(cues.every(r=>r.summary.includes('and worsen AP')&&r.summary.includes('both effects'))).toBe(true);
  expect(named(army('Illuminor Szeras'),'Mechanical Augmentation')).toHaveLength(0);
 });
});
