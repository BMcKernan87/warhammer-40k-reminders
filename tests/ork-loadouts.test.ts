// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {ORK_SHEETS} from '../src/ork-data';
import {orkHasRangedWeapon,orkLoadout} from '../src/ork-loadouts';
import {knightEquippedItems,knightWeaponCount,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
function equip(s:RosterInstance,slot:string,choice:string){
 const army={...newSelection('Orks'),units:{[s.unit]:1},instances:[s]};
 return setKnightGear(army,s.id,slot,choice).instances![0];
}
const count=knightWeaponCount;
it('puts three different heavy guns on different Boyz and scales them by ten, with the Nob retaining only its chosen kit',()=>{
 let boyz=squad('Boyz',10);
 boyz=equip(boyz,'Nob 1 · Weapons','Big Choppa');
 for(const [i,w] of ['Big Shoota','Burna','Rokkit Launcha'].entries())boyz=equip(boyz,'Boy '+(i+1)+' · Firearm',w);
 expect(count(boyz,'Kombi-skorcha')).toBe(0);
 expect(count(boyz,'Shoota')).toBe(6);
 expect(count(boyz,'Choppa')).toBe(9);
 expect(count(boyz,'Slugga')).toBe(9);
 expect(()=>equip(boyz,'Boy 4 · Firearm','Rokkit Launcha')).toThrow();
 const doubled=equip({...boyz,models:20},'Boy 4 · Firearm','Rokkit Launcha');
 expect(count(doubled,'Rokkit Launcha - Busta')).toBe(2);
 expect(count(doubled,'Kombi-skorcha')).toBe(1);
 const resized={...doubled,knightGear:resizeKnightComposition(doubled,10),models:10};
 expect(count(resized,'Rokkit Launcha')).toBe(1);
 expect(count(resized,'Big Choppa')).toBe(1);
 expect(orkLoadout('Boyz',11)).toBeUndefined();
});
it('limits each distinct Nob specialist separately, including the two linked Krumpas selections at ten',()=>{
 let nobz=squad('Nobz',6);
 nobz=equip(nobz,'Nob 1 · Weapons','Kustom Krumpa + Paired Krumpas');
 nobz=equip(nobz,'Nob 2 · Weapons','Big Skorcha + Kustom Choppa');
 nobz=equip(nobz,'Nob 3 · Weapons','Kustom Big Shoota + Kustom Choppa');
 nobz=equip(nobz,'Nob 4 · Weapons','Big Choppa');
 nobz=equip(nobz,'Nob 5 · Weapons','Kustom Krumpa + Kombi-rokkit');
 expect(count(nobz,'Paired Krumpas')).toBe(1);
 expect(count(nobz,'Kustom Krumpa')).toBe(3);
 expect(count(nobz,'Kustom Shoota')).toBe(1);
 expect(()=>equip(nobz,'Nob 6 · Weapons','Kustom Krumpa + Paired Krumpas')).toThrow();
 expect(count(equip({...nobz,models:10},'Nob 6 · Weapons','Kustom Krumpa + Paired Krumpas'),'Paired Krumpas')).toBe(2);
});
it('preserves the total melee or ranged capacity of the individual Meganob kits and counts each paid choice just once',()=>{
 let meganobz=squad('Meganobz',3);
 for(let n=1;n<=3;n++)meganobz=equip(meganobz,'Meganob '+n+' · Weapons','Twin Killsaws');
 expect(orkHasRangedWeapon(meganobz)).toBe(false);
 expect(count(meganobz,'Twin Killsaws')).toBe(3);
 expect(count(meganobz,'Killsaw')).toBe(0);
 meganobz=equip(meganobz,'Meganob 2 · Weapons','Kombi-weapon + Killsaw');
 expect(orkHasRangedWeapon(meganobz)).toBe(true);
 expect(count(meganobz,'Twin Killsaws')).toBe(2);
 expect(count(meganobz,'Killsaw')).toBe(1);
 expect(count(meganobz,'Power Klaw')).toBe(0);
 expect(()=>equip(meganobz,'Meganob 1 · Weapons','Kombi-weapon + Twin Killsaws')).toThrow();
});
it('keeps Kommando weapon swaps on their actual bearer and rejects excess copies',()=>{
 let kommandos=squad('Kommandos',10);
 for(const [n,w] of ['Burna','Rokkit Launcha','Kustom Shoota','Kustom Shoota'].entries())kommandos=equip(kommandos,'Kommando '+(n+1)+' · Special firearm',w);
 kommandos=equip(kommandos,'Kommando 2 · Melee weapon','Breacha Ram');
 expect(count(kommandos,'Slugga')).toBe(10);
 expect(count(kommandos,'Choppa')).toBe(9);
 expect(()=>equip(kommandos,'Kommando 3 · Melee weapon','Breacha Ram')).toThrow();
 expect(()=>equip(kommandos,'Kommando 5 · Special firearm','Kustom Shoota')).toThrow();
 expect(()=>equip(kommandos,'Nob · Melee weapon','Breacha Ram')).toThrow();
});
it('limits the secondary specialist and the two-pistol or hammer replacement on each Wrecker datasheet',()=>{
 let tank=equip(squad('Tankbustas',6),'Nob · Second pistol','Smash Hammer');
 expect(count(tank,'Rokkit Pistol')).toBe(1);
 tank=equip(tank,'Tankbusta 2 · Special equipment','Pulsa Rokkit');
 expect(count(tank,'Pulsa Rokkit')).toBe(1);
 expect(()=>equip(tank,'Tankbusta 1 · Special equipment','Busta Rokkit Launcha')).toThrow();
 tank=equip(tank,'Tankbusta 2 · Special equipment','Busta Rokkit Launcha');
 expect(count(tank,'Busta Rokkit Launcha')).toBe(6);
 const breakas=equip(equip(equip(squad('Breaka Boyz',6),'Nob · Hammer','Rokkit Pistol'),
  'Breaka Boy 1 · Melee weapon','Knucklebustas'),'Breaka Boy 2 · Melee weapon','Tankhammer');
 expect(count(breakas,'Rokkit Pistol')).toBe(2);
 expect(count(breakas,'Smash Hammer')).toBe(3);
 expect(()=>equip(breakas,'Breaka Boy 3 · Melee weapon','Tankhammer')).toThrow();
});
it('allows genuinely different guns on multiple models and checks the one-per-three Deffkopta cap',()=>{
 let guns=equip(squad('Mek Gunz',3),'Mek Gunz 1 · Main gun','Bubblechukka');
 guns=equip(guns,'Mek Gunz 2 · Main gun','Traktor Kannon');
 expect(count(guns,'Smasha Gun')).toBe(1);
 expect(count(guns,'Bubblechukka')).toBe(1);
 expect(count(guns,'Traktor Kannon')).toBe(1);
 const koptas=equip(squad('Deffkoptas',5),'Deffkopta 2 · Main gun','Kustom Mega-blasta');
 expect(()=>equip(koptas,'Deffkopta 3 · Main gun','Kustom Mega-blasta')).toThrow();
 expect(count(equip({...koptas,models:6},'Deffkopta 3 · Main gun','Kustom Mega-blasta'),'Rokkit Launcha')).toBe(4);
});
it('prices the Gunwagon turret once, caps repeated vehicle guns and honors the publisher’s unarmed Squiggoth option',()=>{
 let wagon=equip(squad('Gunwagon'),'Turret','Zzap Gun');
 wagon=equip(wagon,'Big Shootas','4 × Big Shoota');
 expect(count(wagon,'Kannon')).toBe(0);
 expect(count(wagon,'Zzap Gun')).toBe(1);
 expect(count(wagon,'Big Shoota')).toBe(4);
 expect(()=>equip(wagon,'Big Shootas','5 × Big Shoota')).toThrow();
 const beast=squad('Gargantuan Squiggoth');
 expect(orkHasRangedWeapon(beast)).toBe(false);
 expect(knightEquippedItems(beast)).toEqual(['Huge Tusks']);
 expect(orkHasRangedWeapon(equip(beast,'Gun','Kannon'))).toBe(true);
 expect(count(equip(beast,'Gun','Supa-kannon'),'Kannon')).toBe(0);
 const deff=equip(equip(squad('Deff Dread'),'Big Shoota arm','Extra Klaw'),'Skorcha arm','Extra Klaw');
 expect(count(deff,'Extra Klaw')).toBe(2);
 expect(orkHasRangedWeapon(deff)).toBe(false);
});
it('resolves the selected equipment on every model at every published strength across all 55 datasheets',()=>{
 for(const sheet of ORK_SHEETS){
  const tiers=sheet.compositionBySize!;
  for(const n of Object.keys(tiers).map(Number)){
   const model=squad(sheet.unit,n),loadout=orkLoadout(sheet.unit,n);
   expect(loadout,sheet.unit+' at '+n).toBeDefined();
   expect(knightEquippedItems(model).length).toBeGreaterThan(0);
   const names=loadout!.slots.map(slot=>slot.name);
   expect(new Set(names).size).toBe(names.length);
   for(const slot of loadout!.slots){
    for(const choice of slot.choices){
     const configured={...model,knightGear:{[slot.name]:choice.name}};
     expect(validKnightGear(configured,'Orks'),sheet.unit+' '+choice.name).toBe(true);
     const equipped=knightEquippedItems(configured);
     for(const item of new Set(choice.items))expect(equipped.filter(w=>w===item).length).toBeGreaterThanOrEqual(choice.items.filter(w=>w===item).length);
    }
   }
  }
  expect(orkLoadout(sheet.unit,0)).toBeUndefined();
  expect(validKnightGear({...squad(sheet.unit),knightGear:{'Unknown model':'Kannon'}},'Orks')).toBe(false);
 }
});
