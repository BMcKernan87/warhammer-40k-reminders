import {describe,it,expect} from 'vitest';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
const COUNTS={'Astra Militarum':11,'Adepta Sororitas':8,'Adeptus Mechanicus':10,'Imperial Knights':8,'Adeptus Custodes':9,'Imperial Agents':5} as const;
describe('2026 Imperial Faction Pack detachments',()=>{
 it('contains 51 unique official Imperial detachments with DP and dispositions',()=>{
  for(const [faction,count] of Object.entries(COUNTS)){
   const entries=DETACHMENTS_2026[faction as keyof typeof DETACHMENTS_2026]!;
   expect(entries).toHaveLength(count);
   expect(new Set(entries.map(d=>d.name)).size).toBe(count);
   expect(entries.every(d=>[1,2,3].includes(d.dp))).toBe(true);
  }
 });
 it('supports 1DP plus 2DP combinations and rejects over-budget choices',()=>{
  expect(detachmentBudget('Astra Militarum',['Abhuman Auxiliaries','Armoured Infantry'],'Strike Force').valid).toBe(true);
  expect(detachmentBudget('Astra Militarum',['Abhuman Auxiliaries','Armoured Infantry'],'Incursion').valid).toBe(false);
  expect(detachmentBudget('Imperial Agents',['Imperialis Fleet'],'Strike Force').valid).toBe(true);
  expect(detachmentBudget('Imperial Agents',['Imperialis Fleet'],'Incursion').valid).toBe(false);
 });
 it('uses the official Skysword Spearhead spelling',()=>{
  expect(DETACHMENTS_2026.Necrons?.some(d=>d.name==='Skysword Spearhead')).toBe(true);
 });
});
