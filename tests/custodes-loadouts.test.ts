// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {CUSTODES_KITS} from '../src/custodes-loadouts.generated';
import {custodesHasRangedWeapon,custodesLoadout} from '../src/custodes-loadouts';
import {knightEquippedItems,knightWeaponCount,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {parseCustodesKit} from '../scripts/import-custodes-loadouts.mjs';

const make=(unit:string,models=1):RosterInstance=>({unit,models,id:unit+'#1'});
const equip=(s:RosterInstance,key:string,value:string)=>{
 const army={...newSelection('Adeptus Custodes'),units:{[s.unit]:1},instances:[s]};
 return setKnightGear(army,s.id,key,value).instances![0];
};
it('applies the paid shield only to the two permitted Shield-Captain kits',()=>{
 const s=make('Shield-Captain');
 expect(knightEquippedItems(s)).toEqual(['Praesidium Shield','Pyrithite Spear']);
 const blade=equip(s,'Weapons','Praesidium Shield + Eternity-pattern Paragon Blade');
 expect(knightWeaponCount(blade,'Praesidium Shield')).toBe(1);
 expect(knightWeaponCount(blade,'Pyrithite Spear')).toBe(0);
 for(const choice of ['Guardian Spear','Castellan Axe'])expect(knightWeaponCount(equip(s,'Weapons',choice),'Praesidium Shield')).toBe(0);
 expect(()=>equip(s,'Weapons','Praesidium Shield + Castellan Axe')).toThrow();
 expect(knightWeaponCount(make('Sentinel Guard Sodality',3),'Praesidium Shield')).toBe(3);
});
it.each(['Custodian Wardens','Allarus Custodians'])('keeps weapon replacements uniform at every legal strength for %s, with one optional banner',unit=>{
 for(const models of [2,3]){
  const s=make(unit,models);
  const changed=equip(equip(s,'Squad weapons','Castellan Axe'),'Vexilla','Vexilla');
  expect(knightWeaponCount(changed,'Castellan Axe')).toBe(models);
  expect(knightWeaponCount(changed,'Guardian Spear')).toBe(0);
  expect(knightWeaponCount(changed,'Vexilla')).toBe(1);
  if(unit==='Allarus Custodians')expect(knightWeaponCount(changed,'Balistus Grenade Launcher')).toBe(models);
  expect(()=>equip(s,'Squad weapons','Guardian Spear + Castellan Axe')).toThrow();
  expect(knightWeaponCount({...changed,models:models===2?3:2},'Castellan Axe')).toBe(models===2?3:2);
 }
});
it('replaces each linked vehicle kit without leaving extra pistons or guns',()=>{
 const telemon=make('Telemon Heavy Dreadnought');
 expect(knightWeaponCount(telemon,'Twin Neutronium Cascade Projectors')).toBe(2);
 const gun=equip(telemon,'Weapons','Arachnus Storm Cannon + Caestus Fist');
 expect(knightWeaponCount(gun,'Twin Neutronium Cascade Projectors')).toBe(1);
 expect(knightWeaponCount(gun,'Spiculus Bolt Launcher')).toBe(1);
 expect(knightWeaponCount(gun,'Dual Caestus Fists')).toBe(0);
 expect(()=>equip(telemon,'Weapons','Iliastus Accelerator Culverin + Arachnus Storm Cannon')).toThrow();
 const achillus=equip(make('Contemptor-Achillus Dreadnought'),'Weapons','2 × Adrathic Combi-destructor');
 expect(knightWeaponCount(achillus,'Adrathic Combi-destructor')).toBe(2);
 expect(knightWeaponCount(achillus,'Lastrum Storm Bolter')).toBe(0);
});
it('allocates faction infantry, bike and fixed equipment at their selected strength',()=>{
 for(let n=4;n<=10;n++){
  expect(knightWeaponCount(make('Prosecutor Squad',n),'Boltgun')).toBe(n);
  expect(knightWeaponCount(make('Witchseeker Squad',n),'Flamer')).toBe(n);
  expect(knightWeaponCount(make('Vigilator Squad',n),'Executioner Greatblade')).toBe(n);
 }
 const rifles=equip(make('Gyrfalcon Jetbike Sodality',2),'Squad weapons','Twin Corvae Las-pulser');
 expect(knightWeaponCount(rifles,'Twin Corvae Las-pulser')).toBe(2);
 expect(knightWeaponCount(rifles,'Lastrum Bolt Cannon')).toBe(0);
 const sister=equip(make('Knight-Centura'),'Weapons','Master-crafted Flamer + Gun Stock');
 expect(custodesHasRangedWeapon(make('Knight-Centura'))).toBe(false);
 expect(custodesHasRangedWeapon(make('Vigilator Squad',10))).toBe(false);
 expect(custodesHasRangedWeapon(sister)).toBe(true);
 expect(custodesHasRangedWeapon(equip(make('Shield-Captain'),'Weapons','Praesidium Shield + Eternity-pattern Paragon Blade'))).toBe(false);
 expect(knightEquippedItems(sister)).toEqual(['Master-crafted Flamer','Gun Stock']);
 expect(knightWeaponCount(make('Blade Champion'),'Vaultswords - Hurricanis')).toBe(1);
});
it('resolves all published kits at all printed strengths and rejects impossible slot values',()=>{
 for(const data of CUSTODES_KITS){
  expect(custodesLoadout(data.unit,data.min-1)).toBeUndefined();
  expect(custodesLoadout(data.unit,data.max+1)).toBeUndefined();
  for(let n=data.min;n<=data.max;n++){
   const s=make(data.unit,n);
   const options=custodesLoadout(data.unit,n)!;
   const permutations=options.slots.reduce<Record<string,string>[]>((sets,slot)=>sets.flatMap(set=>slot.choices.map(c=>({...set,[slot.name]:c.name}))),[{}]);
   for(const knightGear of permutations){
    const squad={...s,knightGear};
    expect(validKnightGear(squad,'Adeptus Custodes')).toBe(true);
    const selected=options.slots.flatMap(slot=>slot.choices.find(c=>c.name===knightGear[slot.name])!.items);
    expect(knightEquippedItems(squad)).toEqual([...options.fixed,...selected]);
   }
   expect(validKnightGear({...s,knightGear:{Undocumented:'Vexilla'}},'Adeptus Custodes')).toBe(false);
  }
 }
});
it('refuses a future unsupported replacement or a nonexistent weapon instead of inventing a loadout',()=>{
 const example={unit:'Example',composition:'2-3 models',loadout:'Every model is equipped with: 1 Rifle.',knownItems:new Set(['rifle','axe'])};
 expect(()=>parseCustodesKit({...example,options:['Every third model may swap its Rifle for an Axe.']})).toThrow(/unsupported replacement/);
 expect(()=>parseCustodesKit({...example,options:['This model’s Axe can be replaced with 1 Rifle.']})).toThrow(/insufficient copies/);
});
