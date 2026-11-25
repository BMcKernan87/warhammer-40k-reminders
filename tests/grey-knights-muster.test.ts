// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {GREY_KNIGHTS_SHEETS,greyKnightsMusterUnits} from '../src/grey-knights-data';
import {greyKnightsWarlordCandidates,selectGreyKnightsWarlord,greyKnightsUnitLimit} from '../src/grey-knights-muster';
import {greyKnightsCargoFits,greyKnightsCargoFormations,greyKnightsFormations} from '../src/grey-knights-transports';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {setKnightGear} from '../src/knight-loadouts';
import {greyKnightsLoadout} from '../src/grey-knights-loadouts';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const id=(unit:string)=>unit+'#1';
function build(units:string[],size:ArmySelection['battleSize2026']='Strike Force'){
 let a=individualArmy({...newSelection('Grey Knights'),detachments2026:['Brotherhood Strike'],battleSize2026:size});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const instance=(a:ArmySelection,name:string)=>a.instances!.find(s=>s.unit===name)!;
const errors=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
function gear(a:ArmySelection,unit:string,owner:string,items:string[]){
 const squad=instance(a,unit),key=(list:readonly string[])=>[...list].sort().join('|');
 const slot=greyKnightsLoadout(unit,squad.models)!.slots.find(s=>s.name.startsWith(owner)&&s.choices.some(c=>key(c.items)===key(items)))!;
 return setKnightGear(a,squad.id,slot.name,slot.choices.find(c=>key(c.items)===key(items))!.name);
}

it.each(GREY_KNIGHTS_SHEETS.map(s=>[s.unit,s] as const))('%s musters every published strength and uses its actual roster pricing',(unit,sheet)=>{
 const a=build([unit]);
 for(const size of verifiedUnitSizes2026(a,unit)!){
  const selected=setInstanceModelCount(a,id(unit),size);
  expect(validateSelection(selected)).toBe(true);
  expect(rosterCost2026(selected).entries[0].points).toBe(sheet.pointsBySize![sheet.sizes.find(s=>s>=size)!]);
 }
});
it('retains native and requisitioned Terminators as distinct units, and validates the allied Character allowance',()=>{
 let a=build(['Brotherhood Librarian','Brotherhood Terminator Squad','Grey Knights Terminator Squad','Inquisitor','Inquisitor Greyfax'],'Incursion');
 expect(rosterCost2026(a).entries.filter(e=>e.unit.includes('Terminator')).map(e=>e.points)).toEqual([150,190]);
 expect(errors(a)).toContain('assigned-agents-character');
 expect(greyKnightsWarlordCandidates(a).map(s=>s.unit)).toEqual(['Brotherhood Librarian']);
 expect(()=>selectGreyKnightsWarlord(a,id('Inquisitor'))).toThrow();
 expect(()=>join(a,'Brotherhood Librarian','Grey Knights Terminator Squad')).toThrow();
 a=join(a,'Inquisitor','Brotherhood Terminator Squad');
 expect(greyKnightsFormations(a).find(g=>g.root.unit==='Brotherhood Terminator Squad')?.members.map(s=>s.unit)).toEqual(['Brotherhood Terminator Squad','Inquisitor']);
 expect(()=>join(a,'Brotherhood Librarian','Brotherhood Terminator Squad')).toThrow();
 expect(greyKnightsMusterUnits(a)).not.toContain('Kaldor Draigo');
 expect(greyKnightsMusterUnits(a)).not.toContain('Warhound Titan');
});
it('charges every native gun and later copy independently while preserving a paid banner on resize',()=>{
 let a=build(['Brotherhood Librarian','Brotherhood Librarian','Grand Master In Nemesis Dreadknight','Paladin Squad']);
 expect(rosterCost2026(a).entries.slice(0,2).map(e=>e.points)).toEqual([95,105]);
 a=gear(a,'Grand Master In Nemesis Dreadknight','Additional weapons',['Heavy psycannon','Sublimator']);
 expect(rosterCost2026(a).entries[2].points).toBe(240);
 a=setInstanceModelCount(a,id('Paladin Squad'),5);
 a=gear(a,'Paladin Squad','Paladin 1 ·',["Ancient's banner",'Psycannon']);
 a=gear(a,'Paladin Squad','Paladin 2 ·',['Psycannon']);
 expect(rosterCost2026(a).entries[3].points).toBe(240);
 a=setInstanceModelCount(a,id('Paladin Squad'),4);
 expect(rosterCost2026(a).entries[3].points).toBe(190);
 const reopened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));
 expect(reopened.retained).toEqual([]);expect(reopened.store.profiles[0].army.instances).toEqual(a.instances);
});
it('requires distinct real passengers, counts every Terminator and keeps the Stormraven Dreadnought bay separate',()=>{
 let a=build(['Grand Master Voldus','Paladin Squad','Venerable Dreadnought','Venerable Dreadnought','Stormraven Gunship','Rhino','Razorback','Strike Squad','Inquisitor']);
 a=setInstanceModelCount(a,id('Paladin Squad'),5);a=join(a,'Grand Master Voldus','Paladin Squad');a=join(a,'Inquisitor','Strike Squad');
 const raven=instance(a,'Stormraven Gunship'),paladins=id('Paladin Squad'),dread=id('Venerable Dreadnought'),strike=id('Strike Squad');
 expect(greyKnightsCargoFormations(a,raven).find(g=>g.root.id===paladins)?.spaces).toBe(12);
 expect(greyKnightsCargoFits(a,raven,[paladins,dread])).toBe(true);
 expect(greyKnightsCargoFits(a,raven,[paladins,dread,'Venerable Dreadnought#2'])).toBe(false);
 expect(greyKnightsCargoFits(a,raven,[paladins,strike])).toBe(false);
 expect(greyKnightsCargoFits(a,raven,[dread,dread])).toBe(false);
 expect(greyKnightsCargoFormations(a,instance(a,'Razorback')).find(g=>g.root.id===strike)?.spaces).toBe(6);
 expect(greyKnightsCargoFormations(a,instance(a,'Rhino')).map(g=>g.root.id)).not.toContain(paladins);
 expect(errors(a)).toContain('dedicated-transport-passengers');
 a=addSelectionUnit(a,'Purgation Squad');expect(errors(a)).not.toContain('dedicated-transport-passengers');
});
it('enforces the current Aircraft reserve budget without treating Hover transports as compulsory Aircraft',()=>{
 const a=build(['Brotherhood Champion','Stormtalon Gunship','Stormtalon Gunship','Stormhawk Interceptor'],'Incursion');
 expect(errors(a)).not.toContain('compulsory-reserves');
 expect(errors(addSelectionUnit(a,'Stormhawk Interceptor'))).toContain('compulsory-reserves');
 const b=build(['Brotherhood Champion','Stormraven Gunship','Grey Knights Thunderhawk Gunship'],'Incursion');
 expect(errors(b)).not.toContain('compulsory-reserves');
 expect(greyKnightsUnitLimit(a,'Strike Squad')).toBe(4);
 expect(greyKnightsUnitLimit(a,'Paladin Squad')).toBe(2);
 expect(greyKnightsUnitLimit(a,'Castellan Crowe')).toBe(1);
});
it('reopens an exact 1,000-point Brotherhood Strike with a full Terminator formation, legal mixed guns, two enhancements and Rhino passengers',()=>{
 let a=build(['Grand Master','Brotherhood Terminator Squad','Strike Squad','Brotherhood Champion','Rhino','Land Raider Redeemer','Interceptor Squad'],'Incursion');
 a=setInstanceModelCount(a,id('Brotherhood Terminator Squad'),5);
 a=gear(a,'Brotherhood Terminator Squad','Terminator 1 ·',["Ancient's banner",'Psycannon']);
 a=gear(a,'Brotherhood Terminator Squad','Terminator 2 ·',['Psycannon']);
 a=gear(a,'Brotherhood Terminator Squad','Terminator 3 ·',["Apothecary's narthecium"]);
 a=join(a,'Grand Master','Brotherhood Terminator Squad');a=join(a,'Brotherhood Champion','Strike Squad');a=selectGreyKnightsWarlord(a,id('Grand Master'));
 a=selectUpgrade2026(a,id('Grand Master'),'Tome of Forbidden Ways');a=selectUpgrade2026(a,id('Brotherhood Champion'),'Purity of Purpose');
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a)))).store.profiles[0].army;
 expect(rosterCost2026(saved).total).toBe(1000);expect(errors(saved)).toEqual([]);
 expect(greyKnightsCargoFormations(saved,instance(saved,'Land Raider Redeemer')).find(g=>g.root.unit==='Brotherhood Terminator Squad')?.spaces).toBe(12);
 expect(greyKnightsCargoFormations(saved,instance(saved,'Rhino')).map(g=>g.root.unit)).toContain('Strike Squad');
});
