// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {GREY_KNIGHTS_SHEETS,greyKnightsKeywords,greyKnightsMusterUnits} from '../src/grey-knights-data';
import {greyKnightsHasRangedWeapon,greyKnightsLoadout,greyKnightsModelLoadouts,greyKnightsWeaponCount} from '../src/grey-knights-loadouts';
import {knightLoadoutFor,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const faction='Grey Knights';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const count=greyKnightsWeaponCount;
function equip(s:RosterInstance,slot:string,choice:string){
 const army:ArmySelection={...newSelection(faction),instances:[s],units:{[s.unit]:1}};
 return setKnightGear(army,s.id,slot,choice).instances![0];
}
function swap(s:RosterInstance,owner:string,items:string[]){
 const sheet=greyKnightsLoadout(s.unit,s.models)!,key=(i:readonly string[])=>[...i].sort().join('|');
 const field=sheet.slots.find(f=>f.name.startsWith(owner)&&f.choices.some(c=>key(items)===key(c.items)));
 if(!field)throw Error('Missing physical selection '+s.unit+'/'+owner+'/'+items.join(', '));
 return equip(s,field.name,field.choices.find(c=>key(items)===key(c.items))!.name);
}
it.each(GREY_KNIGHTS_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s binds every legal squad size and every weapon exchange to its actual bearer',(unit,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+total),kit=knightLoadoutFor(faction,unit,+total)!,equipped=greyKnightsModelLoadouts(s);
  expect(equipped).toHaveLength(+total);
  expect(equipped.reduce<Record<string,number>>((r,b)=>({...r,[b.model]:(r[b.model]??0)+1}),{})).toEqual(roles);
  for(const field of kit.slots)for(const choice of field.choices){
   if(+total<5&&['Brotherhood Terminator Squad','Paladin Squad'].includes(unit)&&choice.items.length===1&&['Psilencer','Psycannon','Incinerator'].includes(choice.name)){
    expect(()=>equip(s,field.name,choice.name)).toThrow();continue;
   }
   const changed=equip(s,field.name,choice.name),initial=equipped.flatMap(b=>b.items);
   for(const item of field.choices[0].items){const n=initial.indexOf(item);expect(n).toBeGreaterThanOrEqual(0);initial.splice(n,1);}
   expect(greyKnightsModelLoadouts(changed).flatMap(b=>b.items).sort()).toEqual([...initial,...choice.items].sort());
   expect(validKnightGear(changed,faction)).toBe(true);
  }
 }
});
const banner="Ancient's banner",medic="Apothecary's narthecium";
const cost=(s:RosterInstance)=>Object.entries(GREY_KNIGHTS_SHEETS.find(row=>row.unit===s.unit)!.wargearPoints??{}).reduce((total,[item,points])=>total+count(s,item)*points,0);
it.each([['Brotherhood Terminator Squad','Terminator',1],['Paladin Squad','Paladin',2]] as const)('gives %s one optional banner weapon in addition to its other specialists and a separate Apothecary',(unit,role,maximum)=>{
 let team=squad(unit,5);
 team=swap(team,role+' 1 ·',[banner,'Psycannon']);
 for(let i=0;i<maximum;i++)team=swap(team,role+' '+(i+2)+' ·',['Psycannon']);
 const last=role+' '+(maximum+2)+' ·';
 expect(()=>swap(team,last,['Psilencer'])).toThrow();
 expect(()=>swap(team,last,[banner,'Storm bolter'])).toThrow();
 team=swap(team,last,[medic]);
 expect(count(team,'Psycannon')).toBe(maximum+1);expect(cost(team)).toBe(5*(maximum+1));
 const bearers=greyKnightsModelLoadouts(team);
 expect(bearers.filter(b=>b.items.includes(banner)&&b.items.includes('Psycannon'))).toHaveLength(1);
 expect(bearers.filter(b=>b.items.includes(medic)&&b.items.includes('Storm bolter'))).toHaveLength(0);
 const small={...team,models:4,knightGear:resizeKnightComposition(team,4,faction)};
 expect(count(small,'Psycannon')).toBe(1);expect(cost(small)).toBe(5);
 let four=squad(unit,4);
 four=swap(four,role+' 1 ·',[medic]);
 expect(()=>swap(four,role+' 2 ·',[medic])).toThrow();
 four=swap(four,role+' 2 ·',[banner,'Incinerator']);
 expect(count(four,'Storm bolter')).toBe(2);expect(count(four,'Nemesis force weapon')).toBe(4);
});
it('keeps both Nemesis Dreadknights unarmed at range by default and charges each purchased distinct firearm',()=>{
 let knight=squad('Nemesis Dreadknight'),master=squad('Grand Master In Nemesis Dreadknight');
 expect(greyKnightsHasRangedWeapon(knight)).toBe(false);expect(greyKnightsHasRangedWeapon(master)).toBe(false);
 knight=swap(knight,'Additional weapons',['Heavy psycannon','Heavy incinerator']);
 expect(greyKnightsHasRangedWeapon(knight)).toBe(true);expect(cost(knight)).toBe(15);
 expect(()=>swap(knight,'Additional weapons',['Heavy psycannon','Heavy psycannon'])).toThrow();
 expect(()=>swap(knight,'Additional weapons',['Sublimator'])).toThrow();
 master=swap(master,'Additional weapons',['Sublimator','Heavy psycannon']);
 master=swap(master,'Fragstorm grenade launcher',['Fragstorm grenade launcher']);
 expect(count(master,'Fragstorm grenade launcher')).toBe(1);expect(cost(master)).toBe(30);
});
it('keeps each heavy Purifier’s psychic attack and exchanges the force weapon for the printed close combat weapon',()=>{
 let flames=squad('Purifier Squad',5);
 expect(count(flames,'Nemesis force weapon')).toBe(5);expect(count(flames,'Purifying Flame')).toBe(5);
 flames=swap(flames,'Purifier 1 ·',['Incinerator','Close combat weapon']);
 expect(count(flames,'Nemesis force weapon')).toBe(4);expect(count(flames,'Purifying Flame')).toBe(5);
 const gunner=greyKnightsModelLoadouts(flames).find(m=>m.items.includes('Incinerator'))!;
 expect(gunner.items).toContain('Purifying Flame');expect(gunner.items).not.toContain('Nemesis force weapon');
 const engineer=squad('Brotherhood Techmarine');
 expect(count(engineer,'Servo-arms')).toBe(1);expect(count(engineer,'Servo-arm')).toBe(1);expect(count(engineer,'Omnissian power axe')).toBe(1);
});
it('charges Stormraven guns in pairs, switches the Thunderhawk’s bombs and resolves all four of its heavy bolters',()=>{
 let storm=squad('Stormraven Gunship');
 storm=swap(storm,'Hurricane bolter',['Hurricane bolter','Hurricane bolter']);expect(cost(storm)).toBe(20);
 const heavy=swap(squad('Grey Knights Thunderhawk Gunship'),'Thunderhawk cluster bombs',['Hellstrike missile battery']);
 expect(count(heavy,'Thunderhawk cluster bombs')).toBe(0);expect(count(heavy,'Hellstrike missile battery')).toBe(1);expect(count(heavy,'Twin heavy bolter')).toBe(4);
 const a=newSelection(faction);
 expect(greyKnightsKeywords(a,heavy)).toContain('TITANIC');expect(greyKnightsKeywords(a,heavy)).not.toContain('AIRCRAFT');
 expect(greyKnightsKeywords(a,squad('Stormhawk Interceptor'))).toContain('AIRCRAFT');
});
it('offers separate native and requisitioned Terminators along with legal imperial allies and no Legends',()=>{
 const a:ArmySelection={...newSelection(faction),battleSize2026:'Strike Force'};
 const all=greyKnightsMusterUnits(a);
 expect(new Set(all).size).toBe(all.length);
 for(const name of ['Grey Knights Terminator Squad','Brotherhood Terminator Squad','Knight Crusader','Warhound Titan','Inquisitor'])expect(all).toContain(name);
 for(const name of ['Kaldor Draigo','Brother-captain Stern','Chaos Warhound Titan'])expect(all).not.toContain(name);
 expect(greyKnightsMusterUnits({...a,battleSize2026:'Incursion'})).not.toContain('Warhound Titan');
 expect(knightLoadoutFor(faction,'Grey Knights Terminator Squad')).toBeDefined();expect(knightLoadoutFor(faction,'Knight Crusader')).toBeDefined();
 expect(greyKnightsKeywords(a,squad('Venerable Dreadnought'))).toContain('CHARACTER');
});
