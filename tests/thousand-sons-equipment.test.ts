// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {THOUSAND_SONS_SHEETS,thousandSonsAdditionalBodyguards,thousandSonsKeywords,thousandSonsMusterUnits} from '../src/thousand-sons-data';
import {thousandSonsHasRangedWeapon,thousandSonsLoadout,thousandSonsModelLoadouts,thousandSonsWeaponCount} from '../src/thousand-sons-loadouts';
import {knightLoadoutFor,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const faction='Thousand Sons';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const count=thousandSonsWeaponCount;
function equip(s:RosterInstance,slot:string,choice:string){
 const army:ArmySelection={...newSelection(faction),instances:[s],units:{[s.unit]:1}};
 return setKnightGear(army,s.id,slot,choice).instances![0];
}
function swap(s:RosterInstance,owner:string,items:string[]){
 const sheet=thousandSonsLoadout(s.unit,s.models)!,key=(i:readonly string[])=>[...i].sort().join('|');
 const field=sheet.slots.find(f=>f.name.startsWith(owner)&&f.choices.some(c=>key(items)===key(c.items)));
 if(!field)throw Error('Missing physical selection '+s.unit+'/'+owner+'/'+items.join(', '));
 return equip(s,field.name,field.choices.find(c=>key(items)===key(c.items))!.name);
}
it.each(THOUSAND_SONS_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s binds every legal squad size and every weapon exchange to its actual bearer',(unit,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+total),kit=knightLoadoutFor(faction,unit,+total)!,equipped=thousandSonsModelLoadouts(s);
  expect(equipped).toHaveLength(+total);
  expect(equipped.reduce<Record<string,number>>((r,b)=>({...r,[b.model]:(r[b.model]??0)+1}),{})).toEqual(roles);
  for(const field of kit.slots)for(const choice of field.choices){
   const changed=equip(s,field.name,choice.name),initial=equipped.flatMap(b=>b.items);
   for(const item of field.choices[0].items){const n=initial.indexOf(item);expect(n).toBeGreaterThanOrEqual(0);initial.splice(n,1);}
   expect(thousandSonsModelLoadouts(changed).flatMap(b=>b.items).sort()).toEqual([...initial,...choice.items].sort());
   expect(validKnightGear(changed,faction)).toBe(true);
  }
 }
});
it('limits the Rubric soulreaper and icon to one each at any size and keeps the psychic attack on the Sorcerer',()=>{
 let troops=squad('Rubric Marines',10);
 troops=swap(troops,'Rubric Marine 1 ·',['Soulreaper cannon']);
 troops=swap(troops,'Rubric Marine 1 ·',['Icon of flame']);
 expect(()=>swap(troops,'Rubric Marine 2 ·',['Soulreaper cannon'])).toThrow();
 expect(()=>swap(troops,'Rubric Marine 2 ·',['Icon of flame'])).toThrow();
 troops=swap(troops,'Rubric Marine 2 ·',['Warpflamer']);troops=swap(troops,'Aspiring Sorcerer',['Warpflame pistol']);
 const bearers=thousandSonsModelLoadouts(troops);
 expect(bearers.find(b=>b.items.includes('Soulreaper cannon'))!.items).toContain('Icon of flame');
 expect(bearers.filter(b=>b.items.includes('Malefic Curse')).map(b=>b.model)).toEqual(['Aspiring Sorcerer']);
 const a=newSelection(faction);
 expect(thousandSonsKeywords(a,troops)).toContain('PSYKER');expect(thousandSonsKeywords(a,troops,'Aspiring Sorcerer')).toContain('PSYKER');
 expect(thousandSonsKeywords(a,troops,'Rubric Marine')).not.toContain('PSYKER');
});
it('allows two special weapons and two missile racks in ten Scarabs and reconciles them to one of each when resizing',()=>{
 let unit=squad('Scarab Occult Terminators',10);
 for(const n of [1,2]){
  unit=swap(unit,'Scarab Occult Terminator '+n+' ·',['Hellfyre missile rack']);
  unit=swap(unit,'Scarab Occult Terminator '+n+' ·',[n===1?'Soulreaper cannon':'Heavy warpflamer']);
 }
 expect(()=>swap(unit,'Scarab Occult Terminator 3 ·',['Heavy warpflamer'])).toThrow();
 expect(()=>swap(unit,'Scarab Occult Terminator 3 ·',['Hellfyre missile rack'])).toThrow();
 unit=swap(unit,'Scarab Occult Sorcerer',['Prosperine khopesh']);
 const five={...unit,models:5,knightGear:resizeKnightComposition(unit,5,faction)};
 expect(count(five,'Hellfyre missile rack')).toBe(1);expect(count(five,'Soulreaper cannon')).toBe(1);expect(count(five,'Heavy warpflamer')).toBe(0);
 expect(count(five,'Prosperine khopesh')).toBe(5);expect(count(five,'Malefic Curse')).toBe(1);
});
it('keeps the Thousand Sons versions of shared vehicles, including paid weapons and Pyraflux magma cutters',()=>{
 const costs=(s:RosterInstance)=>Object.entries(THOUSAND_SONS_SHEETS.find(r=>r.unit===s.unit)!.wargearPoints!)
  .reduce((sum,[item,points])=>sum+count(s,item)*points,0);
 let defiler=squad('Defiler'),forge=squad('Forgefiend');
 expect(count(defiler,'Excruciator cannon')).toBe(2);
 defiler=swap(defiler,'',['Hades lascannon','Hades lascannon']);expect(costs(defiler)).toBe(30);
 defiler=swap(defiler,'',['Pyraflux magma cutters','Pyraflux magma cutters']);expect(count(defiler,'Excruciator cannon')).toBe(0);
 expect(count(defiler,'Magma cutters')).toBe(0);expect(count(defiler,'Pyraflux magma cutters')).toBe(2);
 forge=swap(forge,'',['Ectoplasma cannon','Ectoplasma cannon','Ectoplasma cannon','Forgefiend claws']);
 expect(costs(forge)).toBe(15);expect(count(forge,'Hades autocannon')).toBe(0);
 const gunless=swap(squad('Helbrute'),'', ['Helbrute fist','Helbrute hammer']);
 expect(thousandSonsHasRangedWeapon(gunless)).toBe(false);
 const fists=swap(gunless,'',['Helbrute fist','Helbrute fist','Inferno combi-bolter','Heavy flamer']);
 expect(count(fists,'Helbrute fist')).toBe(2);expect(count(fists,'Inferno combi-bolter')).toBe(1);
 expect(thousandSonsHasRangedWeapon(fists)).toBe(true);
});
it('keeps Tzaangor horn and banner on separate bearers and adds Battleline only under either Mutant detachment',()=>{
 let goats=squad('Tzaangors',10);
 goats=swap(goats,'Tzaangor 1 ·',['Autopistol','Chainsword','Herd banner']);
 goats=swap(goats,'Tzaangor 2 ·',['Tzaangor blades','Brayhorn']);
 expect(()=>swap(goats,'Tzaangor 3 ·',['Autopistol','Chainsword','Brayhorn'])).toThrow();
 expect(thousandSonsModelLoadouts(goats).some(b=>b.items.includes('Herd banner')&&b.items.includes('Brayhorn'))).toBe(false);
 const a=newSelection(faction);
 expect(thousandSonsKeywords(a,goats)).not.toContain('BATTLELINE');
 for(const d of ['Servants of Change','Warpmeld Pact'])expect(thousandSonsKeywords({...a,detachments2026:[d]},goats)).toContain('BATTLELINE');
 expect(thousandSonsHasRangedWeapon(squad('Tzaangors',10))).toBe(false);expect(thousandSonsHasRangedWeapon(goats)).toBe(true);
});
it('requires Changehost for its six host-specific daemons and keeps Split-only models off the starting roster',()=>{
 const a:ArmySelection={...newSelection(faction),battleSize2026:'Strike Force',detachments2026:['Changehost of Deceit']};
 const all=thousandSonsMusterUnits(a),plain=thousandSonsMusterUnits({...a,detachments2026:['Grand Coven']});
 expect(all.filter(u=>!plain.includes(u)).sort()).toEqual(['Blue Horrors','Flamers','Kairos Fateweaver','Lord of Change','Pink Horrors','Screamers']);
 expect(all).toContain('Knight Despoiler');expect(all).toContain('Chaos Warhound Titan');
 expect(thousandSonsMusterUnits({...a,battleSize2026:'Incursion'})).not.toContain('Chaos Warhound Titan');
 const pink=squad('Pink Horrors'),blue=squad('Blue Horrors');
 expect(count(pink,'Coruscating pink flames')).toBe(10);expect(count(pink,'Coruscating blue flames')).toBe(0);
 expect(count(blue,'Coruscating yellow flames')).toBe(0);expect(count(blue,'Coruscating blue flames')).toBe(10);
 expect(thousandSonsKeywords(a,pink)).toContain('PINK');expect(thousandSonsKeywords(a,pink)).not.toContain('BRIMSTONE');
 expect(thousandSonsKeywords(a,pink,'Brimstone Horror')).toContain('BRIMSTONE');expect(thousandSonsKeywords(a,pink,'Blue Horror')).toContain('BLUE');
 expect(thousandSonsKeywords(a,blue)).not.toContain('PINK');
 expect(count(squad('Kairos Fateweaver'),'Infernal Gateway')).toBe(1);expect(count(squad('Kairos Fateweaver'),'Staff of Tomorrow')).toBe(1);
});
it('applies Bray Lord only to the three printed Sorcerer/Infernal Master bearers and uses the updated vehicle keywords',()=>{
 const a:ArmySelection={...newSelection(faction),detachments2026:['Warpmeld Pact']};
 for(const unit of ['Sorcerer','Sorcerer In Terminator Armour','Infernal Master','Exalted Sorcerer','Ahriman']){
  const s={...squad(unit),enhancement:'Bray Lord'};
  const canLead=thousandSonsAdditionalBodyguards(a,s).includes('Tzaangors');
  expect(canLead).toBe(['Sorcerer','Sorcerer In Terminator Armour','Infernal Master'].includes(unit));
  expect(thousandSonsAdditionalBodyguards({...a,detachments2026:[]},s)).toEqual([]);
 }
 expect(thousandSonsKeywords(a,squad('Chaos Vindicator'))).toContain('FRAME');
 expect(thousandSonsKeywords(a,squad('Heldrake'))).not.toContain('AIRCRAFT');
});
