// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {knightLoadoutFor,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {rosterCost2026} from '../src/datasheets-2026';
import {equippedWeaponText} from '../src/knight-card-rules';
import {worldEaterHasRangedWeapon,worldEaterLoadout,worldEaterModelLoadouts,worldEaterWeaponCount} from '../src/world-eater-loadouts';
import {WORLD_EATERS_SHEETS} from '../src/world-eaters-data.generated';
import type {RosterInstance} from '../src/roster-instances';
const faction='World Eaters';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
function equip(s:RosterInstance,field:string,choice:string){
 const a:ArmySelection={...newSelection(faction),instances:[s],units:{[s.unit]:1}};
 return setKnightGear(a,s.id,field,choice).instances![0];
}
function select(s:RosterInstance,field:number,items:string[]){
 const slot=worldEaterLoadout(s.unit,s.models)!.slots[field],key=(names:readonly string[])=>[...names].sort().join('|');
 const choice=slot.choices.find(c=>key(c.items)===key(items));
 if(!choice)throw Error('Missing '+s.unit+' configuration '+items);
 return equip(s,slot.name,choice.name);
}
const count=worldEaterWeaponCount;
it.each(WORLD_EATERS_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s exposes every legal roster tier and exchanges all choices on the physical unit',(name,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(name,Number(total)),equipped=worldEaterModelLoadouts(s),kit=knightLoadoutFor(faction,name,Number(total))!;
  expect(equipped).toHaveLength(Number(total));
  expect(equipped.reduce<Record<string,number>>((r,m)=>({...r,[m.model]:(r[m.model]??0)+1}),{})).toEqual(roles);
  for(const field of kit.slots){
   for(const choice of field.choices){
    const changed=equip(s,field.name,choice.name);
    const initial=equipped.flatMap(b=>b.items);
    for(const item of field.choices[0].items)initial.splice(initial.indexOf(item),1);
    expect(worldEaterModelLoadouts(changed).flatMap(b=>b.items).sort()).toEqual([...initial,...choice.items].sort());
    expect(validKnightGear(changed,faction)).toBe(true);
   }
  }
 }
});
it('charges each fitted heavy gun and keeps the two official stock Defiler cannons, including mixed arms',()=>{
 let model=squad('Defiler');
 expect(count(model,'Excruciator cannon')).toBe(2);
 expect(count(model,'Hades lascannon')).toBe(0);
 model=select(model,1,['Hades lascannon','Heavy reaper autocannon']);
 expect(count(model,'Hades lascannon')).toBe(1);expect(count(model,'Heavy reaper autocannon')).toBe(1);
 model=select(model,1,['Hades lascannon','Hades lascannon']);
 expect(count(model,'Hades lascannon')).toBe(2);
 expect(worldEaterLoadout(model.unit)!.slots[1].choices.some(c=>c.items.filter(i=>i==='Electroscourge').length>1)).toBe(false);
 model=select(model,2,['Magma cutters','Magma cutters']);
 expect(count(model,'Excruciator cannon')).toBe(0);expect(count(model,'Magma cutters')).toBe(2);
 let forge=squad('Forgefiend');
 expect(count(forge,'Hades autocannon')).toBe(2);
 forge=select(forge,0,['Ectoplasma cannon','Ectoplasma cannon','Ectoplasma cannon','Forgefiend claws']);
 expect(count(forge,'Ectoplasma cannon')).toBe(3);expect(count(forge,'Forgefiend jaws')).toBe(0);
 const costs=rosterCost2026({...newSelection(faction),instances:[squad('Defiler'),{...model,id:'Defiler#2'},forge]});
 expect(costs.entries.map(s=>[s.id,s.points,s.wargearPoints??0])).toEqual([['Defiler#1',270,0],['Defiler#2',340,30],['Forgefiend#1',155,15]]);
 expect(costs.total).toBe(765);

});
it('keeps both Helbrute fists and their firearm upgrades separate from a genuinely melee-only build',()=>{
 let brute=squad('Helbrute');
 brute=select(brute,0,['Helbrute fist','Helbrute fist','Combi-bolter','Heavy flamer']);
 expect(worldEaterHasRangedWeapon(brute)).toBe(true);expect(count(brute,'Helbrute fist')).toBe(2);
 brute=select(brute,0,['Helbrute fist','Helbrute hammer']);
 expect(worldEaterHasRangedWeapon(brute)).toBe(false);
 const rhino=worldEaterLoadout('Chaos Rhino')!;
 expect(rhino.slots[0].choices.some(c=>c.name==='Combi-weapon')).toBe(false);
 expect(rhino.slots[0].choices.some(c=>c.items.includes('Combi-weapon')&&c.items.includes('Havoc launcher')&&!c.items.includes('Combi-bolter'))).toBe(true);
});
it('tracks per-ten Jakhal icons and distinct Berzerker pistols including their Champion, through shrinking a squad',()=>{
 let cult=squad('Jakhals',20);
 cult=equip(cult,'Jakhal 1 · Icon of Khorne','Icon of Khorne');cult=equip(cult,'Jakhal 2 · Icon of Khorne','Icon of Khorne');
 expect(()=>equip(cult,'Jakhal 3 · Icon of Khorne','Icon of Khorne')).toThrow();
 const shrunk={...cult,models:10,knightGear:resizeKnightComposition(cult,10,faction)};
 expect(count(shrunk,'Icon of Khorne')).toBe(1);
 const kr=worldEaterLoadout('Khorne Berzerkers',10)!,champ=kr.slots.find(x=>x.name.includes('Champion')&&x.name.includes('Bolt pistol'))!;
 let mob=equip(squad('Khorne Berzerkers',10),champ.name,'Plasma pistol');
 mob=equip(mob,'Khorne Berzerker 1 · Bolt pistol alternatives','Plasma pistol');
 mob=equip(mob,'Khorne Berzerker 2 · Bolt pistol alternatives','Plasma pistol');
 expect(count(mob,'Plasma pistol – standard')).toBe(3);
 expect(()=>equip(mob,'Khorne Berzerker 3 · Bolt pistol alternatives','Plasma pistol')).toThrow();
});
it('resolves the World Eaters Blood Legion physical bearers and does not apply another faction’s same-name kit',()=>{
 let letters=squad('Bloodletters',10),kit=worldEaterLoadout(letters.unit)!;
 letters=equip(letters,kit.slots[0].name,'Daemonic Icon');
 letters=equip(letters,kit.slots[1].name,'Instrument of Chaos');
 expect(worldEaterModelLoadouts(letters).filter(b=>b.items.includes('Daemonic Icon')&&b.items.includes('Instrument of Chaos'))).toHaveLength(0);
 expect(()=>equip(letters,kit.slots[2].name,'Daemonic Icon')).toThrow();
 expect(count(squad('Bloodcrushers',3),'Bladed horn')).toBe(3);
 expect(count(squad('Slaughterbound'),'Lacerator and daemonic claw')).toBe(1);
 const hellhound=squad('Flesh Hounds',5);
 expect(count(hellhound,'Burning roar')).toBe(1);expect(worldEaterHasRangedWeapon(hellhound)).toBe(true);
 expect(knightLoadoutFor(faction,'Knight Despoiler')).toBeDefined();
 const titan=knightLoadoutFor(faction,'Chaos Warhound Titan')!;
 const fitted=equip(squad('Chaos Warhound Titan'),titan.slots[0].name,titan.slots[0].choices[1].name);
 expect(validKnightGear(fitted,faction)).toBe(true);expect(knightLoadoutFor(faction,'Warhound Titan')).toBeUndefined();
 expect(knightLoadoutFor(faction,'Cultist Mob')).toBeUndefined();
 const printed={source:'',save:null,rangedSave:false,damage:null,demise:null,conversion:null,weapons:[{name:'Bladed horn',phase:'Fight' as const,abilities:['Lance']}]};
 expect(equippedWeaponText(squad('Bloodcrushers',3),printed,'Fight',false,worldEaterWeaponCount)).toContain('3 × Bladed horn');
});
it('limits the two distinct Goremonger specialists and keeps the Herald’s ordinary equipment',()=>{
 let g=squad('Goremongers');
 const field=worldEaterLoadout(g.unit)!.slots;
 const pistol=field[0].choices.find(c=>c.items.filter(i=>i==='Autopistol').length===2)!;
 const harpoon=field[0].choices.find(c=>c.items.includes('Blood harpoon'))!;
 g=equip(g,field[0].name,pistol.name);g=equip(g,field[1].name,harpoon.name);
 expect(()=>equip(g,field[2].name,pistol.name)).toThrow();expect(()=>equip(g,field[2].name,harpoon.name)).toThrow();
 expect(worldEaterModelLoadouts(g).find(x=>x.model==='Blood Herald')!.items).toContain('Chainblade');
});
