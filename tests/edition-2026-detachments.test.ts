import {describe,it,expect} from 'vitest';
import {newSelection,validateSelection} from '../src/catalog';
import {BATTLE_SIZES_2026,DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
describe('2026 Detachment Points and Force Dispositions',()=>{
 it('matches published 2026 Incursion and Strike Force budgets',()=>{
  expect(BATTLE_SIZES_2026.Incursion).toMatchObject({points:1000,dp:2,enhancements:2,unitLimit:2});
  expect(BATTLE_SIZES_2026['Strike Force']).toMatchObject({points:2000,dp:3,enhancements:4,unitLimit:3});
 });
 it('supports 1DP + 2DP Necron detachments and identifies dispositions',()=>{
  const choice=['Hand of the Dynasty','Hypercrypt Legion'];
  const result=detachmentBudget('Necrons',choice,'Strike Force');
  expect(result).toMatchObject({supported:true,valid:true,spent:3,limit:3});
  expect(result.dispositions).toEqual(['Take and Hold','Reconnaissance']);
  expect(validateSelection({...newSelection('Necrons'),detachments2026:choice,battleSize2026:'Strike Force'})).toBe(true);
 });
 it('rejects overbudget, duplicate and unrecognized detachment choices',()=>{
  expect(detachmentBudget('Orks',['War Horde','Bully Boyz'],'Strike Force').valid).toBe(false);
  expect(detachmentBudget('Tyranids',['Invasion Fleet'],'Incursion').valid).toBe(true);
  expect(detachmentBudget('Necrons',['Hand of the Dynasty','Hand of the Dynasty'],'Strike Force').valid).toBe(false);
  expect(validateSelection({...newSelection('Necrons'),detachments2026:['Made Up']})).toBe(false);
 });
 it('includes new 2026 detachment choices for priority xenos',()=>{
  expect(DETACHMENTS_2026.Necrons?.some(d=>d.name==='Skyshroud Spearhead')).toBe(true);
  expect(DETACHMENTS_2026.Orks?.some(d=>d.name==='Taktikal Brigade')).toBe(true);
  expect(DETACHMENTS_2026.Tyranids?.some(d=>d.name==='Talons of the Norn Queen')).toBe(true);
 });
});
