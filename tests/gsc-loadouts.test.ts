// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {GSC_SHEETS} from '../src/gsc-data.generated';
import {gscHasRangedWeapon,gscRidgerunnerWeapons} from '../src/gsc-loadouts';
import {knightEquippedItems,knightLoadoutFor,knightWeaponCount,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const faction='Genestealer Cults';
const unit=(name:string,models?:number):RosterInstance=>({unit:name,id:name+'#1',models});
const count=knightWeaponCount;
function set(s:RosterInstance,slot:string,gear:string){
 const army={...newSelection(faction),units:{[s.unit]:1},instances:[s]};
 return setKnightGear(army,s.id,slot,gear).instances![0];
}
it('keeps the cult icon on its own Hybrid Firearm bearer and enforces both category and per-type caps',()=>{
 let s=unit('Neophyte Hybrids',10);
 s=set(s,'Neophyte Leader weapons','Anointed pistol + Power weapon');
 s=set(s,'Neophyte 1 equipment','Hybrid firearm + Cult Icon');
 for(const [n,gun] of ['Heavy stubber','Seismic cannon','Grenade launcher','Webber'].entries())s=set(s,'Neophyte '+(n+2)+' equipment',gun);
 expect(count(s,'Autopistol')).toBe(10);
 expect(count(s,'Hybrid firearm')).toBe(5);
 expect(count(s,'Cult Icon')).toBe(1);
 expect(count(s,'Close combat weapon')).toBe(9);
 expect(()=>set(s,'Neophyte 1 equipment','Seismic cannon + Cult Icon')).toThrow();
 expect(()=>set(s,'Neophyte 7 equipment','Hybrid firearm + Cult Icon')).toThrow();
 for(const gun of ['Heavy stubber','Mining laser','Flamer','Webber'])expect(()=>set(s,'Neophyte 7 equipment',gun)).toThrow();
 s={...s,models:20};
 s=set(set(s,'Neophyte 6 equipment','Seismic cannon'),'Neophyte 7 equipment','Mining laser');
 expect(count(s,'Seismic cannon')).toBe(2);
 expect(count(s,'Mining laser')).toBe(1);
 expect(()=>set(s,'Neophyte 8 equipment','Heavy stubber')).toThrow();
 const resized={...s,models:10,knightGear:resizeKnightComposition(s,10)};
 expect(count(resized,'Seismic cannon')).toBe(1);
 expect(count(resized,'Mining laser')).toBe(0);
 expect(count(resized,'Cult Icon')).toBe(1);
});
it('keeps both Acolyte card replacements separate and the Leader’s distinct kit intact',()=>{
 let s=unit('Acolyte Hybrids With Autopistols',5);
 s=set(s,'Acolyte Leader melee weapon','Leader’s bio-weapons');
 s=set(s,'Acolyte 1 weapons','Cult Icon + Cult claws and knife');
 for(let n=2;n<=4;n++)s=set(s,'Acolyte '+n+' weapons','Heavy mining tool');
 expect(count(s,'Autopistol')).toBe(1);
 expect(count(s,'Heavy mining tool')).toBe(3);
 expect(count(s,'Cult claws and knife')).toBe(1);
 expect(count(s,'Cult Icon')).toBe(1);
 expect(()=>set(s,'Acolyte 1 weapons','Heavy mining tool')).toThrow();
 expect(()=>set(s,'Acolyte 2 weapons','Cult Icon + Heavy mining tool')).toThrow();
 let f=unit('Acolyte Hybrids With Hand Flamers',6);
 f=set(set(set(f,'Acolyte 1 firearm','Demolition charges'),'Acolyte 2 firearm','Demolition charges'),'Acolyte 3 firearm','Cult Icon');
 expect(count(f,'Cult claws and knife')).toBe(6);
 expect(count(f,'Hand flamer')).toBe(3);
 expect(count(f,'Demolition charges')).toBe(2);
 expect(()=>set(f,'Acolyte 4 firearm','Demolition charges')).toThrow();
 expect(()=>set(f,'Acolyte 4 firearm','Heavy mining tool')).toThrow();
});
it('counts each actual Ridgerunner laser purchase and applies a Spotter or Survey Augur only to weapons on the same model',()=>{
 const s=unit('Achilles Ridgerunners',2),price=GSC_SHEETS.find(d=>d.unit===s.unit)!.wargearPoints!['Heavy mining laser'];
 expect(price).toBe(10);
 expect(count(s,'Heavy mining laser')*price).toBe(20);
 expect(gscRidgerunnerWeapons(s,'Flare Launcher')).toEqual(['Heavy mining laser','Twin heavy stubber','Heavy mining laser','Twin heavy stubber']);
 const mixed=set(set(set(s,'Ridgerunner 1 main gun','Heavy mortar'),'Ridgerunner 1 equipment','Spotter'),'Ridgerunner 2 equipment','Survey Augur');
 expect(count(mixed,'Heavy mining laser')*price).toBe(10);
 expect(gscRidgerunnerWeapons(mixed,'Spotter')).toEqual(['Heavy mortar','Twin heavy stubber']);
 expect(gscRidgerunnerWeapons(mixed,'Survey Augur')).toEqual(['Heavy mining laser','Twin heavy stubber']);
 expect(gscRidgerunnerWeapons(mixed,'Flare Launcher')).toEqual([]);
 expect(count(set(mixed,'Ridgerunner 2 main gun','Achilles missile launcher'),'Heavy mining laser')).toBe(0);
});
it('uses ordinary Jackals for per-four caps, including both upgrade slots on the same bike and the 9-model/eight-bike breakpoint',()=>{
 let squad=set(unit('Atalan Jackals',8),'Jackal 1 firearm','Grenade launcher');
 squad=set(squad,'Jackal 1 melee weapon','Atalan power weapon');
 squad=set(squad,'Jackal 2 melee weapon','Atalan power weapon');
 squad=set(squad,'Wolfquad 1 gun','Atalan incinerator');
 expect(count(squad,'Atalan small arms')).toBe(7);
 expect(()=>set(squad,'Jackal 2 firearm','Grenade launcher')).toThrow();
 expect(()=>set(squad,'Jackal 3 melee weapon','Atalan power weapon')).toThrow();
 expect(()=>set(squad,'Wolfquad 2 gun','Heavy stubber')).toThrow();
 let nine=set({...squad,models:9},'Jackal 2 firearm','Grenade launcher');
 nine=set(nine,'Jackal 3 melee weapon','Atalan power weapon');
 expect(count(nine,'Grenade launcher – krak')).toBe(2);
 expect(count(nine,'Atalan incinerator')).toBe(1);
 expect(()=>set(nine,'Wolfquad 2 gun','Mining laser')).toThrow();
 const ten=set({...nine,models:10},'Wolfquad 2 gun','Mining laser');
 expect(count(ten,'Mining laser')).toBe(1);
 expect(count(ten,'Atalan incinerator')).toBe(1);
 expect(count(ten,'Atalan small arms')).toBe(8);
});
it('distinguishes a rifle Sanctus, melee-only assassins and the compulsory familiar and mixed Metamorph roles',()=>{
 const assassin=unit('Sanctus');
 for(const name of ['Sanctus','Locus','Patriarch','Abominant','Aberrants','Purestrain Genestealers'])expect(gscHasRangedWeapon(unit(name))).toBe(false);
 const rifle=set(assassin,'Assassin weapons','Cult sniper rifle + Close combat weapon');
 expect(gscHasRangedWeapon(rifle)).toBe(true);
 expect(count(rifle,'Sanctus bio-dagger')).toBe(0);
 expect(count(unit('Biophagus'),'Alchemicus Familiar')).toBe(1);
 expect(count(unit('Magus'),'Magus stave')).toBe(1);
 expect(count(unit('Aberrants',7),'Aberrant weapons')).toBe(7);
 const morph=set(set(unit('Hybrid Metamorphs',5),'Metamorph Leader firearm','Hand flamer'),'Metamorph 1 equipment','Cult Icon');
 expect(count(morph,'Leader’s bio-weapons')).toBe(1);
 expect(count(morph,'Metamorph mutations – sweep')).toBe(4);
 expect(count(morph,'Autopistol')).toBe(3);
 expect(()=>set(morph,'Metamorph Leader firearm','Cult Icon')).toThrow();
});
it('constructs every published unit size and equips each slot alternative through the normal roster operation',()=>{
 for(const sheet of GSC_SHEETS){
  for(const n of Object.keys(sheet.compositionBySize!).map(Number)){
   const s=unit(sheet.unit,n),kit=knightLoadoutFor(faction,s.unit,n);
   expect(kit,s.unit+' @ '+n).toBeDefined();
   expect(knightEquippedItems(s).length).toBeGreaterThan(0);
   for(const field of kit!.slots)for(const choice of field.choices){
    const equipped=set(s,field.name,choice.name);
    expect(validKnightGear(equipped,faction)).toBe(true);
    expect(choice.items.every(w=>count(equipped,w)>0)).toBe(true);
   }
  }
  expect(knightLoadoutFor(faction,sheet.unit,0)).toBeUndefined();
  expect(validKnightGear({...unit(sheet.unit),knightGear:{unknown:'Flare Launcher'}},faction)).toBe(false);
 }
});
