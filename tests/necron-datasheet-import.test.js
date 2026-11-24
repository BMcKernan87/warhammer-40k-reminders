// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateDatasheets,runImport} from '../scripts/import-datasheets.mjs';
import snapshot from '../data/necrons-11e-datasheets.json';
import {DATASHEETS_2026,rosterCost2026} from '../src/datasheets-2026';
import {CATALOG,newSelection,addSelectionUnit} from '../src/catalog';

describe('normalized 11e Necron datasheet ingestion',()=>{
 it('reproduces the checked-in registry and is independent of row order',()=>{
  const generated=generateDatasheets(snapshot);
  expect(generated).toBe(readFileSync('src/datasheets-2026.generated.ts','utf8'));
  expect(generateDatasheets({...snapshot,datasheets:[...snapshot.datasheets].reverse()})).toBe(generated);
  expect(snapshot.expectedUnits).toEqual([...CATALOG.Necrons.units].sort());
  expect(DATASHEETS_2026.map(d=>d.unit).sort()).toEqual([...CATALOG.Necrons.units].sort());
 });
 it('preserves all imported fields and drives current runtime pricing',()=>{
  expect(DATASHEETS_2026).toEqual([...snapshot.datasheets].sort((a,b)=>a.unit<b.unit?-1:a.unit>b.unit?1:0));
  expect(rosterCost2026(addSelectionUnit(newSelection('Necrons'),'Chronomancer',3)).entries.map(e=>e.points)).toEqual([70,80,80]);
 });
 it.each([
  s=>{s.edition=10;},
  s=>{s.revision='';},
  s=>{s.datasheets.push(s.datasheets[0]);},
  s=>{s.datasheets.pop();},
  s=>{s.expectedUnits.push(s.expectedUnits[0]);},
  s=>{s.datasheets[0].source='https://wahapedia.ru/wh40k10ed/factions/necrons/Chronomancer';},
  s=>{delete s.datasheets[0].pointsBySize['1'];},
  s=>{s.datasheets[0].laterCopyPointsBySize={'1':{'1':80}};},
  s=>{s.datasheets[0].sizes=[1,1];},
  s=>{s.datasheets[0].pointsBySize['1']=-1;},
  s=>{s.datasheets[0].unknownRule='not silently discarded';},
 ])('rejects malformed, duplicate, obsolete or incomplete records',mutate=>{
  const copy=structuredClone(snapshot);mutate(copy);expect(()=>generateDatasheets(copy)).toThrow(/11e datasheet import/);
 });
 it('fails closed on missing or invalid input and detects drift before replacing output',()=>{
  const dir=mkdtempSync(join(tmpdir(),'necron-import-'));
  try{
   const inputPath=join(dir,'data.json'),outputPath=join(dir,'registry.ts');
   writeFileSync(outputPath,'last known good');
   expect(()=>runImport({inputPath,outputPath})).toThrow();
   expect(readFileSync(outputPath,'utf8')).toBe('last known good');
   writeFileSync(inputPath,JSON.stringify({...snapshot,edition:10}));
   expect(()=>runImport({inputPath,outputPath})).toThrow();
   expect(readFileSync(outputPath,'utf8')).toBe('last known good');
   writeFileSync(inputPath,JSON.stringify(snapshot));
   expect(()=>runImport({inputPath,outputPath,check:true})).toThrow(/stale/);
   runImport({inputPath,outputPath});
   expect(readFileSync(outputPath,'utf8')).toBe(generateDatasheets(snapshot));
   expect(()=>runImport({inputPath,outputPath,check:true})).not.toThrow();
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
