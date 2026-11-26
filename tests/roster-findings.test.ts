import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {rosterFindings} from '../src/roster-findings';
describe('army-wide roster findings',()=>{
 it('defaults verified Warriors points without fabricating missing data',()=>{
  const findings=rosterFindings(addSelectionUnit(newSelection('Necrons'),'Necron Warriors'));
  expect(findings.some(x=>x.code==='points-unavailable'&&x.severity==='info')).toBe(false);
  expect(findings.some(x=>x.code==='size-unverified')).toBe(false);
 });
 it('flags more than three copies of a non-Battleline datasheet',()=>{
  const findings=rosterFindings(addSelectionUnit(newSelection('Space Marines'),'Aggressor Squad',4));
  expect(findings.some(x=>x.code==='rule-of-three'&&x.unit==='Aggressor Squad')).toBe(true);
 });
 it('does not flag four Battleline squads under the ordinary three-copy check',()=>{
  const findings=rosterFindings(addSelectionUnit(newSelection('Tyranids'),'Termagants',4));
  expect(findings.some(x=>x.code==='rule-of-three')).toBe(false);
 });
 it('distinguishes a missing detachment choice from verified chapter unit sizes',()=>{
  const findings=rosterFindings(addSelectionUnit({...newSelection('Dark Angels'),detachments2026:[]},'Azrael'));
  expect(findings.some(x=>x.code==='no-11e-detachment')).toBe(true);
  expect(findings.some(x=>x.code==='size-unverified'&&x.unit==='Azrael')).toBe(false);
 });
});
