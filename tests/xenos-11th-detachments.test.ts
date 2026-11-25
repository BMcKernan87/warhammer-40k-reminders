import {describe,it,expect} from 'vitest';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
import {newSelection,validateSelection} from '../src/catalog';
const COUNTS={'Aeldari':15,'Drukhari':9,'Genestealer Cults':9,'Leagues of Votann':10,'T’au Empire':7} as const;
describe('11th edition Xenos detachment imports',()=>{
 it('imports 50 unique source-backed detachments with valid costs',()=>{
  for(const [faction,count] of Object.entries(COUNTS)){
   const entries=DETACHMENTS_2026[faction as keyof typeof DETACHMENTS_2026]!;
   expect(entries).toHaveLength(count);
   expect(new Set(entries.map(x=>x.name)).size).toBe(count);
   expect(entries.every(x=>[1,2,3].includes(x.dp)&&x.disposition.length>0)).toBe(true);
  }
 });
 it('enforces Incursion and Strike Force detachment budgets',()=>{
  expect(detachmentBudget('Aeldari',['Armoured Warhost','Aspect Host'],'Strike Force').valid).toBe(false);
  expect(detachmentBudget('Aeldari',['Armoured Warhost','Fateful Performance'],'Incursion').valid).toBe(true);
  expect(detachmentBudget('Leagues of Votann',['Hearthguard Covenant','Mercenary Oathband'],'Strike Force').valid).toBe(true);
  expect(detachmentBudget('T’au Empire',['Mont\'ka'],'Incursion').valid).toBe(true);
 });
 it('accepts a selected 11th-edition Drukhari detachment',()=>{
  const army={...newSelection('Drukhari'),battleSize2026:'Strike Force' as const,detachments2026:['Tools of Torment','Covenite Coterie']};
  expect(validateSelection(army)).toBe(true);
 });
});
