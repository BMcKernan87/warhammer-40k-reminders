import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {changeHoundpackCharacter,reconcileHoundpack} from '../src/houndpack-selection';
import {resolvedWarDogCharacterIds} from '../src/chaos-knight-detachments';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,removeRosterInstance} from '../src/roster-instances';
import {selectUpgrade2026} from '../src/upgrades-2026';

describe('editing actual Houndpack squads',()=>{
 it('retains the three existing characters when adding a fourth, and moves Warlord and enhancement eligibility per instance',()=>{
  let a=individualArmy({...newSelection('Chaos Knights'),units:{'War Dog Brigand':3},detachments2026:['Houndpack Lance']});
  const [first,second,third]=resolvedWarDogCharacterIds(a);
  a=selectUpgrade2026({...a,warlordId:first},first,'Loping Predator');
  a=reconcileHoundpack(a,addSelectionUnit(a,'War Dog Brigand'));
  const fourth='War Dog Brigand#4';
  expect(resolvedWarDogCharacterIds(a)).toEqual([first,second,third]);
  expect(()=>changeHoundpackCharacter(a,fourth,true)).toThrow();
  a=changeHoundpackCharacter(a,first,false);
  a=changeHoundpackCharacter(a,fourth,true);
  expect(a.warlordId).toBeUndefined();
  expect(a.upgrades2026?.[first]).toBeUndefined();
  expect(()=>selectUpgrade2026(a,first,'Loping Predator')).toThrow();
  a=selectUpgrade2026({...a,warlordId:fourth},fourth,'Loping Predator');
  expect(validateSelection(JSON.parse(JSON.stringify(a)))).toBe(true);
  const sheet=generate11thReminders(a);
  expect(sheet.find(r=>r.id==='11e-core-epic-challenge')?.units).toEqual([second,third,fourth]);
  expect(sheet.filter(r=>r.title.includes('Loping Predator')).every(r=>r.units?.includes(fourth))).toBe(true);
  const smaller=reconcileHoundpack(a,removeRosterInstance(a,second));
  expect(resolvedWarDogCharacterIds(smaller)).toEqual([first,third,fourth]);
  expect(smaller.warlordId).toBe(fourth);
 });
});
