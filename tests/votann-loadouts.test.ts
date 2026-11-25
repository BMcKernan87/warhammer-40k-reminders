// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {knightEquippedItems,knightLoadoutFor,knightWeaponCount,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {VOTANN_SHEETS} from '../src/votann-data.generated';
import {votannCharacterWeapons,votannHasRangedWeapon} from '../src/votann-loadouts';
import type {RosterInstance} from '../src/roster-instances';
const faction='Leagues of Votann';
const make=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const count=knightWeaponCount;
function set(s:RosterInstance,slot:string,choice:string){
 const a={...newSelection(faction),units:{[s.unit]:1},instances:[s]};
 return setKnightGear(a,s.id,slot,choice).instances![0];
}
it('keeps all four independent Warriors exchanges, the distinct heavy gun limit and the separate Theyn selections',()=>{
 let unit=set(make('Hearthkyn Warriors',10),'Theyn firearm','Theyn’s pistol');
 unit=set(unit,'Theyn melee weapon','Theyn’s melee weapon');
 unit=set(unit,'Warrior 1 firearm','L7 missile launcher');
 unit=set(unit,'Warrior 2 firearm','Magna-rail rifle');
 unit=set(unit,'Warrior 3 firearm','Plasma knife');
 unit=set(unit,'Warrior 4 firearm','Plasma knife');
 unit=set(unit,'Warrior 5 firearm','Ion blaster');
 expect(count(unit,'Autoch-pattern bolt pistol')).toBe(10);
 expect(count(unit,'Autoch-pattern bolter')).toBe(4);
 expect(count(unit,'Weavefield Crest')).toBe(1);
 expect(count(unit,'L7 missile launcher – focused')).toBe(1);
 expect(()=>set(unit,'Warrior 6 firearm','Plasma knife')).toThrow();
 expect(()=>set(unit,'Warrior 6 firearm','HYLas auto rifle')).toThrow();
 expect(()=>set(unit,'Warrior 2 firearm','L7 missile launcher')).toThrow();
 expect(()=>set(unit,'Theyn firearm','Magna-rail rifle')).toThrow();
});
it('keeps Hearthguard replacements uniform with one optional Hesyr hammer and crest through squad resizing',()=>{
 let guard=set(make('Einhyr Hearthguard',9),'Squad firearms','Volkanite disintegrator');
 guard=set(guard,'Squad melee weapons','Plasma blade gauntlet + Hesyr with Graviton hammer');
 guard=set(guard,'Hesyr crest','Teleport Crest');
 expect(count(guard,'Plasma blade gauntlet')).toBe(8);
 expect(count(guard,'Graviton hammer')).toBe(1);
 expect(count(guard,'Concussion gauntlet')).toBe(0);
 expect(count(guard,'Volkanite disintegrator')).toBe(9);
 expect(count(guard,'Weavefield Crest')).toBe(0);
 const small={...guard,models:5,knightGear:resizeKnightComposition(guard,5)};
 expect(count(small,'Volkanite disintegrator')).toBe(5);
 expect(count(small,'Exoarmour grenade launcher')).toBe(5);
 expect(count(small,'Plasma blade gauntlet')).toBe(4);
 expect(count(small,'Teleport Crest')).toBe(1);
 expect(()=>set(small,'Squad melee weapons','Concussion gauntlet + Plasma blade gauntlet')).toThrow();
});
it('allows all mixed legal Beserk specialist counts, retains the squad’s chosen axes or mauls and limits launchers to non-gauntlet bearers',()=>{
 const unit=make('Cthonian Beserks',10);
 expect(votannHasRangedWeapon(unit)).toBe(false);
 let beserks=set(unit,'Squad melee weapons','Concussion maul + 2 × Twin concussion gauntlet');
 beserks=set(beserks,'Mole launchers on axe or maul bearers','2 × Mole grenade launcher');
 expect(count(beserks,'Concussion maul')).toBe(8);
 expect(count(beserks,'Twin concussion gauntlet')).toBe(2);
 expect(count(beserks,'Mole grenade launcher')).toBe(2);
 expect(votannHasRangedWeapon(beserks)).toBe(true);
 const resized={...beserks,models:7,knightGear:resizeKnightComposition(beserks,7)};
 expect(count(resized,'Concussion maul')).toBe(6);
 expect(count(resized,'Twin concussion gauntlet')).toBe(1);
 expect(count(resized,'Mole grenade launcher')).toBe(1);
 expect(()=>set(resized,'Mole launchers on axe or maul bearers','2 × Mole grenade launcher')).toThrow();
});
it('checks the shared heavy-gun cap and unique equipment on distinct Pioneer bearers, including three-model formations',()=>{
 let pioneers=make('Hernkyn Pioneers',6);
 for(const [i,item] of ['HYLas rotary cannon','Ion beamer','Multiwave Comms Array','Panspectral Scanner','Rollbar Searchlight'].entries())pioneers=set(pioneers,'Pioneer '+(i+1)+' equipment',item);
 expect(count(pioneers,'Magna-coil autocannon')).toBe(6);
 expect(()=>set(pioneers,'Pioneer 6 equipment','Panspectral Scanner')).toThrow();
 expect(()=>set(pioneers,'Pioneer 6 equipment','Ion beamer')).toThrow();
 expect(()=>set(pioneers,'Pioneer 1 equipment','HYLas rotary cannon + Panspectral Scanner')).toThrow();
 const downsized={...pioneers,models:3,knightGear:resizeKnightComposition(pioneers,3)};
 expect(count(downsized,'HYLas rotary cannon')).toBe(1);
 expect(count(downsized,'Ion beamer')).toBe(0);
 expect(count(downsized,'Multiwave Comms Array')).toBe(1);
});
it('retains a single Yaegir squad baseline excluding both distinct specialist rifles, and mixed Steeljack equipment',()=>{
 const yaegirs=make('Hernkyn Yaegirs',10);
 const field=knightLoadoutFor(faction,yaegirs.unit,10)!.slots[0];
 expect(field.choices).toHaveLength(8);
 for(const choice of field.choices){
  const changed=set(yaegirs,field.name,choice.name);
  const shotguns=count(changed,'Bolt shotgun'),revolvers=count(changed,'Bolt revolver');
  const magna=count(changed,'Magna-coil rifle'),apm=count(changed,'APM launcher');
  expect(shotguns*revolvers).toBe(0);
  expect(magna).toBeLessThanOrEqual(1);expect(apm).toBeLessThanOrEqual(1);
  expect(count(changed,'Plasma knife')).toBe(revolvers);
  expect(shotguns+revolvers+magna+apm).toBe(10);
 }
 const guns=set(make('Ironkin Steeljacks with Heavy Volkanite Disintegrators',6),'Steeljack Theyn weapons','Autoch-pattern bolter + Plasma sword');
 expect(count(guns,'Heavy volkanite disintegrator')).toBe(5);
 expect(count(guns,'Preymark Crest')).toBe(1);
 let melee=set(make('Ironkin Steeljacks with Melee Weapons',4),'Steeljack 1 melee weapon','Concussion gauntlet');
 melee=set(melee,'Steeljack Theyn melee weapon','Concussion gauntlet');
 expect(count(melee,'Concussion gauntlet')).toBe(2);
 expect(count(melee,'Plasma sword')).toBe(2);
});
it('reads all five Iron-master kits, the two separate CORVs and both pistols on each Earthshaker base',()=>{
 const master=make('Brôkhyr Iron-master',5);
 for(const tool of ['Autoch-pattern bolt pistol','Las-beam cutter','Plasma torch','Manipulator arms','Graviton rifle','Graviton hammer'])expect(count(master,tool)).toBe(1);
 expect(count(master,'Close combat weapon')).toBe(2);
 const grimnyr=make('Grimnyr',3);
 expect(count(grimnyr,'Autoch-pattern bolter')).toBe(2);
 expect(count(grimnyr,'Ancestral Wrath – witchfire')).toBe(1);
 const battery=set(make('Cthonian Earthshakers',2),'Battery ordnance','Tremor shells');
 expect(count(battery,'Autoch-pattern bolt pistol')).toBe(4);
 expect(count(battery,'Breacher ordnance')).toBe(0);
 expect(count(battery,'Tremor shells')).toBe(2);
 expect(votannHasRangedWeapon(make('Berehk Stornbröw'))).toBe(false);
});
it('picks exactly one Sagitaur weapon kit, two Hekaton sponsons, and smoke only for a selected Kapricus bearer',()=>{
 const sag=set(make('Sagitaur'),'Turret','L7 missile launcher + Sagitaur missile launcher');
 expect(count(sag,'HYLas beam cannon')).toBe(0);
 expect(count(sag,'L7 missile launcher')).toBe(1);
 expect(count(sag,'Sagitaur missile launcher')).toBe(1);
 const tank=set(set(make('Hekaton Land Fortress'),'Sponsons','Twin bolt cannon + Twin ion beamer'),'Scanner or warhead','Hekaton warhead');
 expect(count(tank,'Twin bolt cannon')).toBe(1);
 expect(count(tank,'Twin ion beamer')).toBe(1);
 expect(count(tank,'Panspectral Scanner')).toBe(0);
 const defenders=set(set(make('Kapricus Defenders',2),'Defender 2 smoke launcher','Smoke Launcher'),'Defender 1 gun','HYLas rotary cannon');
 expect(count(defenders,'Smoke Launcher')).toBe(1);
 expect(count(defenders,'HYLas rotary cannon')).toBe(1);
 expect(count(defenders,'Magna-rail cannon')).toBe(1);
});
it('resolves every supported model quantity, slot and variant through the roster editing and equipment-counting APIs',()=>{
 for(const sheet of VOTANN_SHEETS){
  for(const count of Object.keys(sheet.compositionBySize!).map(Number)){
   const model=make(sheet.unit,count),kit=knightLoadoutFor(faction,model.unit,count);
   expect(kit,sheet.unit+' @ '+count).toBeDefined();
   expect(knightEquippedItems(model).length).toBeGreaterThan(0);
   for(const field of kit!.slots){
    for(const variant of field.choices){
     const changed=set(model,field.name,variant.name);
     expect(validKnightGear(changed,faction)).toBe(true);
     const items=knightEquippedItems(changed);
     expect(variant.items.every(w=>items.includes(w))).toBe(true);
    }
   }
  }
  expect(knightLoadoutFor(faction,sheet.unit,0)).toBeUndefined();
  expect(validKnightGear({...make(sheet.unit),knightGear:{'Unknown':'Tremor shells'}},faction)).toBe(false);
 }
});

it('exposes the equipped guns and melee weapons of the actual character without companion or crest items',()=>{
 expect(votannCharacterWeapons(make('Brôkhyr Iron-master',5),'Ranged')).toEqual(['Graviton rifle']);
 expect(votannCharacterWeapons(make('Grimnyr',3),'Ranged')).toEqual(['Ancestral Wrath']);
 expect(votannCharacterWeapons(make('Berehk Stornbröw'),'Ranged')).toEqual([]);
 expect(votannCharacterWeapons(make('Hearthkyn Warriors',10))).toEqual([]);
 const kahl=set(set(make('Kâhl'),'Firearm','Volkanite disintegrator'),'Melee weapon','Mass gauntlet');
 expect(votannCharacterWeapons(kahl)).toEqual(['Volkanite disintegrator','Mass gauntlet']);
 expect(votannCharacterWeapons(kahl,'Melee')).toEqual(['Mass gauntlet']);
});
