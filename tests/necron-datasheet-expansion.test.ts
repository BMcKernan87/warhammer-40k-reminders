import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('additional sourced Necron abilities',()=>{
 const units=['Doomsday Ark','Canoptek Doomstalker','Lokhust Heavy Destroyers'];
 const ids=['doomsday-ark-overwhelming-obliteration','doomstalker-sentinel-construct','lokhust-heavy-optimised-slaughter'];
 it('includes each rule only for its selected datasheet',()=>{
  for(let i=0;i<units.length;i++){
   const a=addSelectionUnit(newSelection(),units[i]);
   expect(generateReminders(a).some(r=>r.id===ids[i])).toBe(true);
   expect(generateReminders(newSelection()).some(r=>r.id===ids[i])).toBe(false);
  }
 });
 it('creates distinct rule reminders for duplicated squads',()=>{
  const a=addSelectionUnit(newSelection(),'Lokhust Heavy Destroyers',2);
  const b={...a,instances:expandRoster(a)};
  expect(generateReminders(b).filter(r=>r.id.startsWith('lokhust-heavy-optimised-slaughter-')).map(r=>r.units?.[0])).toEqual(['Lokhust Heavy Destroyers#1','Lokhust Heavy Destroyers#2']);
 });
});
