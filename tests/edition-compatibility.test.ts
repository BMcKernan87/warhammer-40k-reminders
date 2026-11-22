import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {rosterFindings} from '../src/roster-findings';
describe('2026 edition compatibility disclosure',()=>{
 it.each(['Necrons','Orks','Tyranids','Space Marines'] as const)('does not claim current-edition legality for %s',(faction)=>{
  const findings=rosterFindings(addSelectionUnit(newSelection(faction),faction==='Necrons'?'Immortals':faction==='Orks'?'Boyz':faction==='Tyranids'?'Termagants':'Intercessor Squad'));
  expect(findings.some(f=>f.code==='edition-mismatch'&&f.severity==='error'&&f.message.includes('2026'))).toBe(true);
  expect(findings.some(f=>f.code==='points-unavailable'&&f.message.includes('Detachment Points'))).toBe(true);
 });
});
