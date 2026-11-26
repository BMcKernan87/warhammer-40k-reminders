import {describe,it,expect} from 'vitest';
import {newSelection,validateSelection} from '../src/catalog';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
const CHAOS_FACTIONS=['Chaos Space Marines','World Eaters','Emperor’s Children','Death Guard','Thousand Sons','Chaos Knights','Chaos Daemons'] as const;
const COUNTS=[17,8,10,9,9,8,9];
describe('official June 2026 Chaos detachment imports',()=>{
 it('imports all 70 Chaos detachments without duplicates',()=>{
  CHAOS_FACTIONS.forEach((faction,index)=>{
   const detachments=DETACHMENTS_2026[faction]!;
   expect(detachments).toHaveLength(COUNTS[index]);
   expect(new Set(detachments.map(d=>d.name)).size).toBe(detachments.length);
   expect(detachments.every(d=>d.dp>=1&&d.dp<=3&&d.disposition.length>0)).toBe(true);
  });
 });
 it('validates mixed Chaos detachment budgets at Incursion and Strike Force',()=>{
  expect(detachmentBudget('Chaos Space Marines',['Cabal of Chaos','Dread Talons'],'Strike Force')).toMatchObject({valid:true,spent:3,limit:3});
  expect(detachmentBudget('Chaos Space Marines',['Cabal of Chaos','Dread Talons'],'Incursion').valid).toBe(false);
  expect(detachmentBudget('Death Guard',['Paragons of Putrescence','Contagion Engines'],'Incursion').valid).toBe(true);
  expect(detachmentBudget('Thousand Sons',['Grand Coven'],'Strike Force').valid).toBe(true);
  expect(detachmentBudget('Chaos Knights',['Infernal Lance','Houndpack Lance'],'Strike Force').valid).toBe(false);
 });
 it('preserves a 2026-only Chaos army selection through validation',()=>{
  const army={...newSelection('Chaos Daemons'),battleSize2026:'Strike Force' as const,detachments2026:['Warptide','Plague Legion']};
  expect(validateSelection(army)).toBe(true);
 });
});
