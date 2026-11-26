// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {ASTRA_MILITARUM_KITS} from '../src/astra-militarum-loadouts.generated';
import {broodBrotherLoadout,broodBrotherModelLoadouts,broodBrotherWargearPoints,kasrkinProfileConflict} from '../src/astra-militarum-loadouts';
import {gscHasRangedWeapon} from '../src/gsc-loadouts';
import {knightEquippedItems,knightItemsLabel,knightLoadoutFor,knightWeaponCount,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';
const faction='Genestealer Cults';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
function change(s:RosterInstance,name:string,choice:string){
 return setKnightGear({...newSelection(faction),units:{[s.unit]:1},instances:[s]},s.id,name,choice).instances![0];
}
const count=knightWeaponCount;
it.each(ASTRA_MILITARUM_KITS.map(k=>[k.unit,k] as const))('%s preserves the correct number of bearers at each legal size and exchanges each actual selectable kit',(unit,kit)=>{
 for(const models of Object.keys(kit.tiers).map(Number)){
  const s=squad(unit,models),loadout=knightLoadoutFor(faction,unit,models)!;
  const stock=knightEquippedItems(s);
  const bearers=broodBrotherModelLoadouts(s);
  expect(bearers).toHaveLength(models);
  expect(bearers.flatMap(b=>b.items).sort()).toEqual([...stock].sort());
  expect(stock.sort()).toEqual([...loadout.fixed,...loadout.slots.flatMap(slot=>slot.choices[0].items)].sort());
  expect(new Set(loadout.slots.map(slot=>slot.name)).size).toBe(loadout.slots.length);
  for(const slot of loadout.slots){
   for(const choice of slot.choices){
    const changed=change(s,slot.name,choice.name);
    const expected=[...stock];
    for(const item of slot.choices[0].items){const index=expected.indexOf(item);expect(index).toBeGreaterThanOrEqual(0);expected.splice(index,1);}
    expected.push(...choice.items);
    expect(knightEquippedItems(changed).sort()).toEqual(expected.sort());
    expect(validKnightGear(changed,faction)).toBe(true);
   }
  }
 }
});
it('pays for every equipped Russ hull and sponson, including its stock lascannon, and its commander’s alternate turret',()=>{
 let tank=squad('Leman Russ Battle Tank');
 expect(count(tank,'Lascannon')).toBe(1);
 expect(broodBrotherWargearPoints(tank)).toBe(5);
 const hull=broodBrotherLoadout(tank.unit)!.slots.find(s=>s.choices.length===15)!;
 expect(hull.choices).toHaveLength(15);
 const doubled=hull.choices.find(c=>c.items.filter(n=>n==='Multi-melta').length===2&&c.items.includes('Lascannon'))!;
 tank=change(tank,hull.name,doubled.name);
 expect(count(tank,'Multi-melta')).toBe(2);
 expect(broodBrotherWargearPoints(tank)).toBe(15);
 tank=change(tank,hull.name,'Heavy flamer');
 expect(broodBrotherWargearPoints(tank)).toBe(0);
 let commander=squad('Leman Russ Commander');
 commander=change(commander,'Leman Russ battle cannon alternatives','Demolisher battle cannon');
 expect(broodBrotherWargearPoints(commander)).toBe(20);
});
it('charges the weapons bought by individual Field Ordnance Teams and Krieg heavy gunners',()=>{
 let field=squad('Field Ordnance Battery'),krieg=squad('Krieg Heavy Weapons Squad');
 expect(broodBrotherWargearPoints(field)).toBe(0);
 for(let i=1;i<=2;i++)field=change(field,'Ordnance Team '+i+' · Malleus rocket launcher alternatives','Bombast field gun');
 expect(broodBrotherWargearPoints(field)).toBe(20);
 for(let i=1;i<=3;i++)krieg=change(krieg,'Heavy Weapons Gunner '+i+' · Lascannon alternatives','Krieg heavy flamer');
 expect(count(krieg,'Laspistol')).toBe(4);
 expect(broodBrotherWargearPoints(krieg)).toBe(15);
});
it('keeps the two-man Recon missile team together, permits a second marksman instead and retains all ten close-combat weapons',()=>{
 let recon=squad('Cadian Recon Squad');
 expect(count(recon,'Lasgun')).toBe(10);
 recon=change(recon,'Marksman','Long-las');
 recon=change(recon,'Two remaining specialists',knightItemsLabel(['Laspistol','Laspistol','Missile launcher']));
 const team=broodBrotherModelLoadouts(recon).filter(m=>m.items.includes('Laspistol'));
 expect(team).toHaveLength(2);expect(team.filter(m=>m.items.includes('Missile launcher'))).toHaveLength(1);
 expect(count(recon,'Laspistol')).toBe(2);expect(count(recon,'Missile launcher')).toBe(1);
 expect(count(recon,'Long-las')).toBe(1);expect(count(recon,'Close combat weapon')).toBe(10);
 recon=change(recon,'Two remaining specialists','Lasgun + Long-las');
 expect(count(recon,'Long-las')).toBe(2);expect(count(recon,'Missile launcher')).toBe(0);
 expect(count(recon,'Laspistol')).toBe(0);
});
it('enforces specialist quotas, distinct guns in the Catachan Command Squad and the Krieg medical bearer’s lasgun',()=>{
 let troopers=squad('Death Korps Of Krieg',10);
 troopers=change(troopers,'Death Korps Trooper 1 · Firearm and equipment','Lasgun + Death Korps Medi-pack');
 expect(()=>change(troopers,'Death Korps Trooper 2 · Firearm and equipment','Lasgun + Death Korps Medi-pack')).toThrow();
 troopers=change(troopers,'Death Korps Trooper 1 · Firearm and equipment','Plasma gun');
 expect(count(troopers,'Death Korps Medi-pack')).toBe(0);
 expect(()=>change(troopers,'Death Korps Trooper 2 · Firearm and equipment','Plasma gun')).toThrow();
 let veterans=squad('Catachan Command Squad');
 veterans=change(veterans,'Veteran Guardsman 1 · Lasgun alternatives','Plasma gun');
 expect(()=>change(veterans,'Veteran Guardsman 2 · Lasgun alternatives','Plasma gun')).toThrow();
 veterans=change(veterans,'Veteran Guardsman 2 · Lasgun alternatives','Lasgun + Master vox');
 expect(count(veterans,'Master vox')).toBe(1);
});
it('scales special weapons by squad size on reopen and permits both Valkyrie and Taurox Prime while excluding prohibited units',()=>{
 let troops=squad('Cadian Shock Troops',20);
 troops=change(troops,'Shock Trooper 1 · Lasgun alternatives','Plasma gun');
 troops=change(troops,'Shock Trooper 3 · Lasgun alternatives','Plasma gun');
 troops=change(troops,'Shock Trooper 4 · Lasgun alternatives','Grenade launcher');
 const cropped={...troops,models:10,knightGear:resizeKnightComposition(troops,10)};
 expect(count(cropped,'Plasma gun')).toBe(1);expect(count(cropped,'Grenade launcher')).toBe(1);
 expect(gscHasRangedWeapon(squad('Valkyrie'))).toBe(true);
 expect(gscHasRangedWeapon(squad('Taurox Prime'))).toBe(true);
 expect(gscHasRangedWeapon(squad('Cyclops Demolition Vehicle'))).toBe(false);
 expect(gscHasRangedWeapon(squad('Aegis Defence Line'))).toBe(false);
 expect(broodBrotherLoadout('Avenger Strike Fighter')).toBeUndefined();
 expect(broodBrotherLoadout('Tempestus Scions')).toBeUndefined();
});

it('retains the published Kasrkin exchange and identifies its missing attack profile only on that bearer',()=>{
 const sergeant=squad('Kasrkin');
 expect(kasrkinProfileConflict(sergeant)).toBe(false);
 const sword=change(sergeant,'Kasrkin Sergeant · Chainsword alternatives','Power weapon');
 expect(kasrkinProfileConflict(sword)).toBe(true);
 expect(broodBrotherModelLoadouts(sword).filter(m=>m.items.includes('Power weapon')).map(m=>m.model)).toEqual(['Kasrkin Sergeant']);
});
