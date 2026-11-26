// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {WORLD_EATERS_SHEETS,worldEatersAdditionalBodyguards,worldEatersKeywords,worldEatersMusterUnits} from '../src/world-eaters-data';
import {WORLD_EATERS_REVISION} from '../src/world-eaters-data.generated';
import type {RosterInstance} from '../src/roster-instances';
const pick=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=newSelection('World Eaters');
it('offers 25 basic World Eaters sheets, the Dreadblade allowance and the appropriate Titanic Support model',()=>{
 const base=worldEatersMusterUnits({...army,battleSize2026:'Incursion'});
 expect(base).toHaveLength(45);
 expect(base).toContain('Defiler');
 expect(base).toContain('War Dog Karnivore');
 expect(base).not.toContain('Bloodletters');
 expect(base).not.toContain('Chaos Warhound Titan');
 const daemonkin=worldEatersMusterUnits({...army,battleSize2026:'Strike Force',detachments2026:['Khorne Daemonkin']});
 expect(daemonkin).toHaveLength(51);
 for(const name of ['Bloodletters','Bloodcrushers','Bloodthirster','Skarbrand','Flesh Hounds','Chaos Warhound Titan'])expect(daemonkin).toContain(name);
 expect(daemonkin).not.toContain('Skulltaker');
 expect(worldEatersMusterUnits({...army,faction:'Necrons'})).toEqual([]);
});
it('enforces printed exact and flexible compositions before pricing first and later copies',()=>{
 const units=WORLD_EATERS_SHEETS;
 for(const s of units){
  const sizes=verifiedUnitSizes2026(army,s.unit)!;
  for(const n of sizes){
   const count=Math.max(1,...Object.keys(s.laterCopyPointsBySize??{}).map(Number));
   const instances=Array.from({length:count},(_,i)=>({...pick(s.unit,n),id:s.unit+'#'+(i+1)}));
   const result=rosterCost2026({...army,instances});
   const tier=s.sizes.find(size=>size>=n)!;
   expect(result.entries[0].points,s.unit+' '+n).toBe(s.pointsBySize?.[tier]);
   expect(result.entries.at(-1)?.points,s.unit+' '+count).toBe((s.laterCopyPointsBySize?.[count]??s.pointsBySize)?.[tier]);
  }
 }
 expect(verifiedUnitSizes2026(army,'Jakhals')).toEqual([10,20]);
 expect(verifiedUnitSizes2026(army,'Khorne Berzerkers')).toContain(13);
 expect(rosterCost2026({...army,instances:[pick('Jakhals',11)]}).total).toBeNull();
 expect(units.find(s=>s.unit==='Jakhals')!.compositionBySize?.[20]).toEqual({'Jakhal Pack Leader':1,Dishonoured:2,Jakhal:17});
});
it('applies September faction pack profile and keyword changes before October pricing',()=>{
 expect(WORLD_EATERS_REVISION.packVersion).toBe('1.3');
 const sheet=(name:string)=>WORLD_EATERS_SHEETS.find(s=>s.unit===name)!;
 expect(sheet('Heldrake').profile).toMatchObject({move:'12"',objectiveControl:0});
 expect(worldEatersKeywords(army,pick('Heldrake'))).not.toContain('AIRCRAFT');
 expect(worldEatersKeywords(army,pick('Heldrake'))).toContain('FLY');
 for(const n of ['Khârn The Betrayer','Khorne Berzerkers','Master of Executions'])expect(sheet(n).profile?.toughness).toBe(5);
 expect(sheet('Chaos Terminators').profile?.toughness).toBe(6);
 for(const n of ['Chaos Land Raider','Chaos Predator Annihilator','Chaos Predator Destructor','Chaos Rhino','Khorne Lord of Skulls'])expect(worldEatersKeywords(army,pick(n))).toContain('FRAME');
 expect(sheet('Defiler').wargearPoints).toEqual({'Hades lascannon':15,'Heavy reaper autocannon':15});
 expect(sheet('Forgefiend').wargearPoints).toEqual({'Ectoplasma cannon':5});
});
it('changes only the Disciple Lord’s faction keyword and exposes the MFM’s two extra Leader options',()=>{
 const lord=pick('Lord on Juggernaut'),copy={...lord,id:'Lord#2'};
 const a={...army,detachments2026:['Khorne Daemonkin'],upgrades2026:{[lord.id]:'Disciple of Khorne'}};
 expect(worldEatersKeywords(a,lord)).toContain('BLOOD LEGIONS');
 expect(worldEatersKeywords(a,lord)).not.toContain('WORLD EATERS');
 expect(worldEatersKeywords(a,copy)).toContain('WORLD EATERS');
 expect(worldEatersAdditionalBodyguards(a,lord)).toEqual(['Bloodcrushers','Flesh Hounds']);
 const butcher=pick('Master of Executions'),b={...army,detachments2026:['Cult of Blood'],upgrades2026:{[butcher.id]:'Butcher Lord'}};
 expect(worldEatersAdditionalBodyguards(b,butcher)).toEqual(['Jakhals','Goremongers']);
 expect(worldEatersAdditionalBodyguards({...b,detachments2026:['Khorne Daemonkin']},butcher)).toEqual([]);
});
