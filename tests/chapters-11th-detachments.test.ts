import {describe,it,expect} from 'vitest';
import {CATALOG,newSelection,validateSelection} from '../src/catalog';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
const EXPECTED={'Dark Angels':19,'Blood Angels':19,'Space Wolves':19,'Black Templars':18,'Grey Knights':9} as const;
describe('11th edition Space Marine divergent chapters',()=>{
 it('imports each chapter’s current permitted shared and chapter-specific detachments',()=>{
  for(const [faction,count] of Object.entries(EXPECTED)){
   const entries=DETACHMENTS_2026[faction as keyof typeof DETACHMENTS_2026]!;
   expect(entries).toHaveLength(count);
   expect(new Set(entries.map(d=>d.name)).size).toBe(count);
   expect(entries.every(d=>[1,2,3].includes(d.dp))).toBe(true);
  }
  expect(DETACHMENTS_2026['Dark Angels']!.some(d=>['Dark Age Arsenal','Company of Hunters'].includes(d.name))).toBe(false);
 });
 it('enforces DP combinations in divergent chapters',()=>{
  expect(detachmentBudget('Dark Angels',['Wrath of the Rock','Darkflight Pursuit'],'Strike Force').valid).toBe(true);
  expect(detachmentBudget('Dark Angels',['Wrath of the Rock','Darkflight Pursuit'],'Incursion').valid).toBe(false);
  expect(detachmentBudget('Grey Knights',['Argent Assault','Fires of Purgation'],'Incursion').valid).toBe(true);
  expect(detachmentBudget('Blood Angels',['Angelic Inheritors','Encarmine Speartip'],'Strike Force').valid).toBe(false);
 });
 it('covers every existing faction with an 11e detachment catalog',()=>{
  for(const faction of Object.keys(CATALOG) as (keyof typeof CATALOG)[]){
   expect(DETACHMENTS_2026[faction]?.length,faction).toBeGreaterThan(0);
  }
 });
 it('accepts a chapter-specific army with its 11e detachment',()=>{
  expect(validateSelection({...newSelection('Space Wolves'),detachments2026:['Champions of Fenris']})).toBe(true);
 });
});
