// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {MECHANICUS_SHEETS,MECHANICUS_REVISION,MECHANICUS_DOCTRINA_UNITS} from '../src/mechanicus-data.generated';
import {MECHANICUS_CARDS} from '../src/mechanicus-card-profiles.generated';
import {MECHANICUS_KITS} from '../src/mechanicus-loadouts.generated';
import {mechanicusKeywords,mechanicusMusterUnits} from '../src/mechanicus-data';
import {mechanicusLoadout,mechanicusModelLoadouts,mechanicusWeaponCount,mechanicusHasRangedWeapon,validMechanicusGear,resizeMechanicusGear} from '../src/mechanicus-loadouts';

const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
const count=mechanicusWeaponCount;
function equip(s:RosterInstance,prefix:string,items:string[]){
 const kit=mechanicusLoadout(s.unit,s.models)!;
 const field=kit.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('No legal equipment choice: '+s.unit+' / '+prefix+' / '+items.join(', '));
 const choice=field.choices.find(c=>key(c.items)===key(items))!;
 const gear={...s.knightGear,[field.name]:choice.name};
 if(!validMechanicusGear(s.unit,gear,s.models))throw Error('Equipment limit exceeded');
 return {...s,knightGear:gear};
}
const cost=(s:RosterInstance)=>Object.entries(MECHANICUS_SHEETS.find(row=>row.unit===s.unit)!.wargearPoints??{}).reduce((total,[item,points])=>total+count(s,item)*points,0);

it.each(MECHANICUS_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s resolves every physical model and every single permitted exchange at each legal size',(unit,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+total),kit=mechanicusLoadout(unit,+total)!,models=mechanicusModelLoadouts(s);
  expect(models).toHaveLength(+total);
  expect(models.reduce<Record<string,number>>((out,m)=>({...out,[m.model]:(out[m.model]??0)+1}),{})).toEqual(roles);
  for(const field of kit.slots)for(const choice of field.choices){
   const changed={...s,knightGear:{[field.name]:choice.name}};
   expect(validMechanicusGear(unit,changed.knightGear,+total)).toBe(true);
   const expected=models.flatMap(m=>m.items);
   for(const item of field.choices[0].items){const i=expected.indexOf(item);expect(i).toBeGreaterThanOrEqual(0);expected.splice(i,1);}
   expect(mechanicusModelLoadouts(changed).flatMap(m=>m.items).sort()).toEqual([...expected,...choice.items].sort());
  }
 }
});

it('imports the current matched inventory, complete Doctrina recipients and inherited new bodyguards',()=>{
 const a=newSelection('Adeptus Mechanicus'),names=MECHANICUS_SHEETS.map(s=>s.unit);
 expect(names).toHaveLength(34);expect(new Set(names).size).toBe(34);
 expect(new Set(Object.keys(MECHANICUS_CARDS))).toEqual(new Set(names));
 expect(new Set(MECHANICUS_KITS.map(k=>k.unit))).toEqual(new Set(names));
 expect(new Set(MECHANICUS_DOCTRINA_UNITS)).toEqual(new Set(names));
 expect(mechanicusMusterUnits(a)).toEqual(names);
 for(const name of ['Secutarii Hoplites','Secutarii Peltasts','Terrax-pattern Termite','X-101','Manipulus Skand'])expect(names).not.toContain(name);
 for(const name of ['Cybernetica Datasmith','Skitarii Marshal','Technoarcheologist'])expect(MECHANICUS_SHEETS.find(s=>s.unit===name)?.attachmentRole).toBe('support');
 expect(MECHANICUS_SHEETS.find(s=>s.unit==='Tech-priest Enginseer')?.bodyguards).toEqual(expect.arrayContaining(['Hastarii Exterminators','Hastarii Fusiliers','Servitor Battleclade']));
 expect(MECHANICUS_SHEETS.find(s=>s.unit==='Cybernetica Datasmith')?.bodyguards).toEqual(['Kastelan Robots']);
 expect(MECHANICUS_REVISION).toMatchObject({packVersion:'1.4',manual:'1.6',exportUpdated:'2026-11-23 01:43:36'});
 expect(MECHANICUS_REVISION.pack).toContain('14-10');
 expect(MECHANICUS_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(84);
});

it.each([['Skitarii Rangers','Skitarii Ranger','Galvanic rifle'],['Skitarii Vanguard','Skitarii Vanguard','Radium carbine']])('%s keeps each specialist unique and its one optional device on a locked stock gun',(unit,role,gun)=>{
 let s=squad(unit,10);
 s=equip(s,role+' 1 ·',['Arc rifle']);s=equip(s,role+' 2 ·',['Plasma caliver']);s=equip(s,role+' 3 ·',['Transuranic arquebus']);
 for(const weapon of ['Arc rifle','Plasma caliver','Transuranic arquebus'])expect(()=>equip(s,role+' 4 ·',[weapon])).toThrow();
 s=equip(s,role+' 4 ·',[gun,'Omnispex']);
 expect(()=>equip(s,role+' 5 ·',[gun,'Enhanced data-tether'])).toThrow();
 expect(()=>equip(s,role+' 4 ·',['Arc rifle','Omnispex'])).toThrow();
 s=equip(s,role+' Alpha ·',['Mechanicus pistol']);s=equip(s,role+' Alpha ·',['Alpha combat weapon']);
 expect(count(s,gun)).toBe(6);expect(count(s,'Close combat weapon')).toBe(10);expect(count(s,'Alpha combat weapon')).toBe(1);
 expect(mechanicusModelLoadouts(s).find(m=>m.model===role+' Alpha')?.items).toEqual(expect.arrayContaining(['Mechanicus pistol','Alpha combat weapon','Close combat weapon']));
});

it('keeps the two compulsory Battleclade gun bearers distinct and limits ordinary servitor exchanges',()=>{
 let s=squad('Servitor Battleclade',9);
 expect(count(s,'Heavy arc rifle')).toBe(1);expect(count(s,'Heavy bolter')).toBe(1);expect(count(s,'Servo-claw')).toBe(8);
 expect(mechanicusLoadout(s.unit,9)!.slots.some(f=>f.name.startsWith('Gun Servitor'))).toBe(false);
 s=equip(s,'Combat Servitor 1 ·',['Meltagun','Servo-claw']);
 expect(()=>equip(s,'Combat Servitor 2 ·',['Meltagun','Servo-claw'])).toThrow();
 for(let i=2;i<=4;i++)s=equip(s,'Combat Servitor '+i+' ·',['Incendine igniter','Servo-claw']);
 expect(()=>equip(s,'Combat Servitor 5 ·',['Incendine igniter','Servo-claw'])).toThrow();
 expect(count(s,'Phosphor blaster')).toBe(2);expect(count(s,'Incendine igniter')).toBe(3);expect(count(s,'Meltagun')).toBe(1);
 const a=newSelection('Adeptus Mechanicus');
 expect(mechanicusKeywords(a,s,'Servitor Underseer')).toContain('TECH-PRIEST');
 for(const role of ['Combat Servitor','Gun Servitor with heavy arc rifle','Gun Servitor with heavy bolter'])expect(mechanicusKeywords(a,s,role)).not.toContain('TECH-PRIEST');
 expect(mechanicusKeywords(a,s,'Servitor Underseer')).not.toContain('CHARACTER');
 expect(MECHANICUS_SHEETS.find(x=>x.unit===s.unit)?.modelProfiles).toMatchObject({'Servitor Underseer':{wounds:2,leadership:'7+'},'Combat Servitors and Gun Servitors':{wounds:1,leadership:'8+'}});
});

it('resolves legal Kastelan arm sets independently from each shoulder weapon',()=>{
 let s=squad('Kastelan Robots',3);
 s=equip(s,'Kastelan Robot 1 ·',['Kastelan fist','Kastelan phosphor blaster']);
 s=equip(s,'Kastelan Robot 2 ·',['Close combat weapon','Twin Kastelan phosphor blaster']);
 s=equip(s,'Kastelan Robot 2 ·',['Heavy phosphor blaster']);
 expect(count(s,'Twin Kastelan fist')).toBe(1);expect(count(s,'Kastelan fist')).toBe(1);expect(count(s,'Close combat weapon')).toBe(1);
 expect(count(s,'Incendine combustor')).toBe(2);expect(count(s,'Heavy phosphor blaster')).toBe(1);
 expect(()=>equip(s,'Kastelan Robot 1 ·',['Twin Kastelan fist','Twin Kastelan phosphor blaster'])).toThrow();
});

it('preserves independent Kataphron gun and claw exchanges and complete Sicarian weapon pairs',()=>{
 let b=squad('Kataphron Breachers',4);
 b=equip(b,'Kataphron Breacher 1 ·',['Torsion cannon']);b=equip(b,'Kataphron Breacher 2 ·',['Hydraulic claw']);
 expect(count(b,'Heavy arc rifle')).toBe(3);expect(count(b,'Arc claw')).toBe(3);expect(count(b,'Torsion cannon')).toBe(1);expect(count(b,'Hydraulic claw')).toBe(1);
 let d=squad('Kataphron Destroyers',4);
 d=equip(d,'Kataphron Destroyer 1 ·',['Kataphron plasma culverin']);d=equip(d,'Kataphron Destroyer 1 ·',['Cognis flamer']);
 expect(count(d,'Heavy grav-cannon')).toBe(3);expect(count(d,'Phosphor blaster')).toBe(3);expect(count(d,'Close combat weapon')).toBe(4);
 let infiltrators=squad('Sicarian Infiltrators',5);
 infiltrators=equip(infiltrators,'Sicarian Infiltrator 1 ·',['Flechette blaster','Taser goad']);
 expect(count(infiltrators,'Stubcarbine')).toBe(4);expect(count(infiltrators,'Power weapon')).toBe(4);
 expect(()=>equip(infiltrators,'Sicarian Infiltrator 1 ·',['Flechette blaster','Power weapon'])).toThrow();
 let stalkers=squad('Sicarian Ruststalkers',5);
 stalkers=equip(stalkers,'Sicarian Ruststalker Princeps ·',['Transonic blades and chordclaw']);
 stalkers=equip(stalkers,'Sicarian Ruststalker 1 ·',['Transonic blades']);
 expect(()=>equip(stalkers,'Sicarian Ruststalker 2 ·',['Transonic blades and chordclaw'])).toThrow();
});

it('limits Serberys carbines per three physical models and keeps paired pistols on the others after resizing',()=>{
 let s=squad('Serberys Sulphurhounds',6);
 for(let i=1;i<=2;i++)s=equip(s,'Serberys Sulphurhound '+i+' ·',['Phosphor blast carbine','Phosphor pistol']);
 expect(count(s,'Phosphor blast carbine')).toBe(2);expect(count(s,'Phosphor pistol')).toBe(8);expect(count(s,'Sulphur breath')).toBe(6);
 expect(()=>equip(s,'Serberys Sulphurhound 3 ·',['Phosphor blast carbine','Phosphor pistol'])).toThrow();
 const small={...s,models:4,knightGear:resizeMechanicusGear(s,4)};
 expect(validMechanicusGear(s.unit,small.knightGear??{},4)).toBe(true);expect(count(small,'Phosphor blast carbine')).toBe(1);expect(count(small,'Phosphor pistol')).toBe(5);
 let raiders=equip(squad('Serberys Raiders',6),'Serberys Raider 1 ·',['Enhanced data-tether']);
 expect(()=>equip(raiders,'Serberys Raider 2 ·',['Enhanced data-tether'])).toThrow();
 expect(()=>equip(raiders,'Serberys Raider Alpha ·',['Enhanced data-tether'])).toThrow();
});

it('keeps Onager optional guns and data-tether legal while preserving all aircraft stock gun counts',()=>{
 let s=squad('Onager Dunecrawler');
 s=equip(s,'',['Neutron laser','Cognis heavy stubber','Cognis heavy stubber']);s=equip(s,'',['Broad spectrum data-tether']);
 expect(count(s,'Cognis heavy stubber')).toBe(2);expect(count(s,'Broad spectrum data-tether')).toBe(1);expect(count(s,'Eradication beamer')).toBe(0);
 expect(()=>equip(s,'',['Neutron laser','Icarus array'])).toThrow();
 expect(count(squad('Archaeopter Stratoraptor'),'Cognis heavy stubber')).toBe(2);expect(count(squad('Archaeopter Stratoraptor'),'Heavy phosphor blaster')).toBe(2);
 for(const unit of ['Archaeopter Fusilave','Archaeopter Stratoraptor','Archaeopter Transvector']){
  const aircraft=equip(squad(unit),'',['Chaff launcher']);
  expect(count(aircraft,'Chaff launcher')).toBe(1);expect(count(aircraft,'Command uplink')).toBe(0);
  expect(()=>equip(aircraft,'',['Chaff launcher','Command uplink'])).toThrow();
 }
 expect(count(squad('Skorpius Disintegrator'),'Cognis heavy stubber')).toBe(3);
});

it('prices both paid weapon families from actual models and preserves copy tiers',()=>{
 let walkers=squad('Ironstrider Ballistarii',3);
 walkers=equip(walkers,'Ironstrider Ballistarii 1 ·',['Twin cognis lascannon']);walkers=equip(walkers,'Ironstrider Ballistarii 2 ·',['Twin cognis lascannon']);
 expect(cost(walkers)).toBe(20);expect(cost(equip(squad('Skorpius Disintegrator'),'',['Ferrumite cannon']))).toBe(10);
 expect(MECHANICUS_SHEETS.filter(s=>s.wargearPoints)).toHaveLength(2);
 expect(MECHANICUS_SHEETS.filter(s=>s.laterCopyPointsBySize)).toHaveLength(10);
 expect(MECHANICUS_SHEETS.find(s=>s.unit==='Ironstrider Ballistarii')?.laterCopyPointsBySize).toEqual({3:{1:95,2:175,3:265}});
 expect(MECHANICUS_SHEETS.find(s=>s.unit==='Skorpius Dunerider')?.laterCopyPointsBySize).toEqual({4:{1:85}});
 expect(MECHANICUS_SHEETS.find(s=>s.unit==='Servitor Battleclade')?.laterCopyPointsBySize).toEqual({3:{9:85}});
});

it('preserves current Aircraft changes, full profiles, hybrid gauntlets and exact alpha weapons',()=>{
 const a=newSelection('Adeptus Mechanicus');
 for(const unit of ['Archaeopter Fusilave','Archaeopter Stratoraptor']){
  expect(mechanicusKeywords(a,squad(unit))).toContain('AIRCRAFT');
  expect(MECHANICUS_CARDS[unit].core).not.toContain('Hover');
  expect(MECHANICUS_SHEETS.find(s=>s.unit===unit)?.profile).toMatchObject({move:'-',objectiveControl:'-'});
 }
 expect(mechanicusKeywords(a,squad('Archaeopter Transvector'))).not.toContain('AIRCRAFT');
 expect(MECHANICUS_SHEETS.find(s=>s.unit==='Archaeopter Transvector')?.profile).toMatchObject({move:'14"',objectiveControl:0});
 const corpus=squad('Corpuscarii Electro-priests',6);
 expect(count(corpus,'Electrostatic gauntlets')).toBe(6);
 expect(MECHANICUS_CARDS[corpus.unit].weapons.filter(w=>w.name==='Electrostatic gauntlets').map(w=>w.phase).sort()).toEqual(['Fight','Shooting']);
 expect(mechanicusHasRangedWeapon(squad('Fulgurite Electro-priests'))).toBe(false);
 for(const unit of ['Hastarii Exterminators','Hastarii Fusiliers']){expect(count(squad(unit),'Power weapon')).toBe(1);expect(count(squad(unit),'Close combat weapon')).toBe(4);}
 expect(count(squad('Pteraxii Sterylizors',7),'Phosphor torch')).toBe(6);expect(count(squad('Pteraxii Sterylizors',7),'Taser goad')).toBe(1);
 expect(count(squad('Pteraxii Skystalkers',7),'Flechette carbine')).toBe(6);expect(count(squad('Pteraxii Skystalkers',7),'Flechette blaster')).toBe(1);
 expect(Object.values(MECHANICUS_CARDS).reduce((n,c)=>n+c.weapons.length,0)).toBe(138);
 for(const card of Object.values(MECHANICUS_CARDS))for(const w of card.weapons){expect(w.range).toBeTruthy();expect(w.attacks).toBeTruthy();expect(w.skill).toBeTruthy();expect(w.damage).toBeTruthy();}
 for(const n of [0,1.5,35])expect(mechanicusLoadout('Skitarii Rangers',n)).toBeUndefined();
});
