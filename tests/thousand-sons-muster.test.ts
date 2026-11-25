// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {detachmentBudget} from '../src/edition-2026';
import {THOUSAND_SONS_SHEETS,thousandSonsMusterUnits} from '../src/thousand-sons-data';
import {thousandSonsUnitLimit,thousandSonsWarlordCandidates,resolvedThousandSonsWarlord,selectThousandSonsWarlord} from '../src/thousand-sons-muster';
import {thousandSonsCargoFormations,thousandSonsFormations,thousandSonsTransportReminders} from '../src/thousand-sons-transports';
import {thousandSonsLoadout} from '../src/thousand-sons-loadouts';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {availableUpgrades2026,selectUpgrade2026} from '../src/upgrades-2026';

const build=(units:string[],d='Changehost of Deceit',size:ArmySelection['battleSize2026']='Strike Force')=>{
 let a=individualArmy({...newSelection('Thousand Sons'),detachments2026:[d],battleSize2026:size});for(const u of units)a=addSelectionUnit(a,u);return a;
};
const id=(s:string)=>s+'#1',find=(a:ArmySelection,s:string)=>a.instances!.find(x=>x.unit===s)!;
const errors=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
it('prices all legal model counts for the 34 current battle and Changehost datasheets through the ordinary army editor',()=>{
 expect(THOUSAND_SONS_SHEETS).toHaveLength(34);
 for(const sheet of THOUSAND_SONS_SHEETS){
  const a=build([sheet.unit]),sizes=verifiedUnitSizes2026(a,sheet.unit)!;
  for(const size of sizes){
   const selected=setInstanceModelCount(a,id(sheet.unit),size);
   expect(validateSelection(selected)).toBe(true);
   expect(rosterCost2026(selected).entries[0].points).toBe(sheet.pointsBySize![sheet.sizes.find(s=>s>=size)!]);
  }
 }
});
it('checks the Mutant exclusivity, Tzaangor copy threshold and the exact three eligible Bray Lords',()=>{
 const ordinary=build(['Tzaangors'],'Grand Coven','Incursion');
 expect(thousandSonsUnitLimit(ordinary,'Tzaangors')).toBe(2);
 for(const detachment of ['Warpmeld Pact','Servants of Change']){
  expect(thousandSonsUnitLimit({...ordinary,detachments2026:[detachment]},'Tzaangors')).toBe(4);
 }
 expect(detachmentBudget('Thousand Sons',['Servants of Change','Warpmeld Pact'],'Strike Force').valid).toBe(false);
 for(const leader of ['Sorcerer','Sorcerer In Terminator Armour','Infernal Master']){
  let a=build([leader,'Tzaangors'],'Warpmeld Pact');
  expect(()=>setInstanceAttachment(a,id(leader),id('Tzaangors'))).toThrow();
  a=selectUpgrade2026(a,id(leader),'Bray Lord');a=setInstanceAttachment(a,id(leader),id('Tzaangors'));
  expect(thousandSonsFormations(a)[0].members.map(s=>s.unit)).toEqual(['Tzaangors',leader]);
  a=selectUpgrade2026(a,id(leader),null);expect(find(a,leader).attachedTo).toBeUndefined();
 }
 const a=build(['Exalted Sorcerer','Tzaangors'],'Warpmeld Pact');
 expect(availableUpgrades2026(a,find(a,'Exalted Sorcerer')).map(u=>u.name)).not.toContain('Bray Lord');
});
it('accepts printed Infantry riders with Rubrics while excluding a formation with non-Infantry Enlightened and the Terminators from a Rhino',()=>{
 let a=build(['Chaos Rhino','Chaos Land Raider','Ahriman','Exalted Sorcerer on Disc of Tzeentch','Rubric Marines','Tzaangor Enlightened','Sorcerer In Terminator Armour','Scarab Occult Terminators']);
 a=setInstanceAttachment(a,id('Ahriman'),id('Rubric Marines'));a=setInstanceAttachment(a,id('Exalted Sorcerer on Disc of Tzeentch'),id('Tzaangor Enlightened'));
 a=setInstanceAttachment(a,id('Sorcerer In Terminator Armour'),id('Scarab Occult Terminators'));
 expect(thousandSonsCargoFormations(a,find(a,'Chaos Rhino')).map(g=>[g.root.unit,g.spaces])).toEqual([['Rubric Marines',6]]);
 expect(thousandSonsCargoFormations(a,find(a,'Chaos Land Raider')).map(g=>[g.root.unit,g.spaces])).toEqual([['Rubric Marines',6],['Scarab Occult Terminators',12]]);
 a=setInstanceModelCount(a,id('Scarab Occult Terminators'),10);
 expect(thousandSonsCargoFormations(a,find(a,'Chaos Land Raider')).map(g=>g.root.unit)).toEqual(['Rubric Marines']);
});
it('separates native Warlords from six Changehost allies and enforces their half-army cap plus Dreadblade limits',()=>{
 let a=build(['Ahriman','Lord of Change','Kairos Fateweaver','War Dog Brigand'],'Changehost of Deceit','Incursion');
 expect(errors(a)).toContain('scintillating-legions-allowance');
 expect(thousandSonsWarlordCandidates(a).map(s=>s.unit)).toEqual(['Ahriman']);
 expect(()=>selectThousandSonsWarlord(a,id('Lord of Change'))).toThrow();
 expect(thousandSonsUnitLimit(a,'Knight Abominant')).toBe(0);
 a=addSelectionUnit(a,'Knight Abominant');expect(errors(a)).toContain('dreadblade-allowance');
 const other={...a,detachments2026:['Grand Coven']};expect(thousandSonsMusterUnits(other)).not.toContain('Lord of Change');expect(errors(other)).toContain('ts-ineligible');
 expect(thousandSonsMusterUnits(a)).not.toContain('Chaos Warhound Titan');
 expect(thousandSonsMusterUnits({...a,battleSize2026:'Strike Force'})).toContain('Chaos Warhound Titan');
});
it('charges by actual fitted Forgefiend guns and applies second-copy Defiler pricing on the same roster',()=>{
 let a=build(['Forgefiend','Defiler','Defiler']);
 const arms=thousandSonsLoadout('Forgefiend')!.slots[0],triple=arms.choices.find(c=>c.items.filter(i=>i==='Ectoplasma cannon').length===3)!;
 a=setKnightGear(a,id('Forgefiend'),arms.name,triple.name);
 expect(rosterCost2026(a).entries.map(e=>[e.points,e.wargearPoints??0])).toEqual([[150,15],[300,0],[350,0]]);
});
it('retains a saved Magnus stable ID, Warlord link, profiles and selected detachments after normalizing the current datasheet name',()=>{
 const original={...newSelection('Thousand Sons'),units:{'Magnus the Red':1},instances:[{id:'old-magnus',unit:'Magnus the Red',models:1}],warlordId:'old-magnus',detachments2026:['Grand Coven']};
 const restored=openSavedArmies(JSON.parse(JSON.stringify(initialStore(original))));
 expect(restored.retained).toEqual([]);
 const a=restored.store.profiles[0].army;expect(a.units).toEqual({'Magnus The Red':1});
 expect(a.instances?.[0].id).toBe('old-magnus');expect(resolvedThousandSonsWarlord(a)?.id).toBe('old-magnus');
 expect(rosterCost2026(a).total).toBe(455);
});
it('saves a legal 1000-point Warpmeld army and places its Terminator Bray Lord with the Tzaangors in the Land Raider',()=>{
 let a=build(['Sorcerer In Terminator Armour','Tzaangors','Chaos Land Raider','Chaos Rhino','Rubric Marines','Infernal Master','Chaos Predator Annihilator','Chaos Predator Destructor'],'Warpmeld Pact','Incursion');
 a=selectUpgrade2026(a,id('Sorcerer In Terminator Armour'),'Bray Lord');
 a=setInstanceAttachment(a,id('Sorcerer In Terminator Armour'),id('Tzaangors'));a=setInstanceAttachment(a,id('Infernal Master'),id('Rubric Marines'));
 a=selectThousandSonsWarlord(a,id('Infernal Master'));
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a)))).store.profiles[0].army;
 expect(rosterCost2026(saved).total).toBe(1000);expect(errors(saved)).toEqual([]);
 const rows=thousandSonsTransportReminders(saved);
 expect(rows.find(r=>r.title==='Chaos Land Raider#1 · Declare passengers')?.summary).toContain('Tzaangors#1 (12 spaces)');
 expect(rows.find(r=>r.title==='Chaos Rhino#1 · Declare passengers')?.summary).not.toContain('Tzaangors#1');
});
it('reopens a 2000-point Changehost with all six Scintillating Legions units, a full Rubric formation and the mandatory Primarch',()=>{
 let a=build(['Magnus The Red','Kairos Fateweaver','Lord of Change','Pink Horrors','Blue Horrors','Flamers','Screamers','Rubric Marines','Ahriman','Chaos Rhino','Heldrake']);
 a=setInstanceModelCount(a,id('Rubric Marines'),10);a=setInstanceAttachment(a,id('Ahriman'),id('Rubric Marines'));
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a)))).store.profiles[0].army;
 expect(rosterCost2026(saved).total).toBe(2000);expect(errors(saved)).toEqual([]);
 expect(resolvedThousandSonsWarlord(saved)?.unit).toBe('Magnus The Red');
 expect(thousandSonsCargoFormations(saved,find(saved,'Chaos Rhino')).map(g=>[g.root.unit,g.spaces])).toEqual([['Rubric Marines',11]]);
});
