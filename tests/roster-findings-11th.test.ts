import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,removeSelectionUnit} from '../src/catalog';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026} from '../src/upgrades-2026';
const codes=(army:Parameters<typeof rosterFindings>[0])=>rosterFindings(army).map(x=>x.code);
describe('11th edition roster diagnostics',()=>{
 it('never reports a blanket 10e mismatch',()=>{
  const army={...newSelection('Necrons'),detachments2026:['Hand of the Dynasty']};
  expect(codes(army)).not.toContain('edition-mismatch');
  expect(codes(army)).not.toContain('no-11e-detachment');
  expect(codes(newSelection('Necrons'))).toContain('no-11e-detachment');
 });
 it('flags stale upgrades and cleans them when removing a unit',()=>{
  const base={...addSelectionUnit(newSelection('Necrons'),'Immortals'),detachments2026:['Hand of the Dynasty']};
  const selected=selectUpgrade2026(base,'Immortals','Tools of Dominion');
  expect(codes(selected)).not.toContain('invalid-11e-upgrade');
  expect(codes({...selected,detachments2026:[]})).toContain('invalid-11e-upgrade');
  const removed=removeSelectionUnit(selected,'Immortals');
  expect(removed.upgrades2026).toEqual({});
  expect(codes(removed)).not.toContain('invalid-11e-upgrade');
 });
 it('does not treat another faction battleline as battleline',()=>{
  const army={...newSelection('Space Marines'),units:{'Necron Warriors':5},detachments2026:['Gladius Task Force']};
  expect(codes(army)).toContain('space-marines-ineligible');
 });
});
