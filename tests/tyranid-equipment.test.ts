// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {TYRANID_SHEETS,TYRANID_REVISION,TYRANID_SYNAPSE_UNITS,TYRANID_SHADOW_SOURCES} from '../src/tyranid-data.generated';
import {TYRANID_CARDS} from '../src/tyranid-card-profiles.generated';
import {TYRANID_KITS} from '../src/tyranid-loadouts.generated';
import {tyranidKeywords,tyranidMusterUnits} from '../src/tyranid-data';
import {tyranidLoadout,tyranidModelLoadouts,tyranidWeaponCount,tyranidHasRangedWeapon,validTyranidGear,resizeTyranidGear} from '../src/tyranid-loadouts';

const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
const count=tyranidWeaponCount;
function equip(s:RosterInstance,prefix:string,items:string[]){
 const field=tyranidLoadout(s.unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('No legal equipment choice: '+s.unit+' / '+prefix+' / '+items.join(', '));
 const gear={...s.knightGear,[field.name]:field.choices.find(c=>key(c.items)===key(items))!.name};
 if(!validTyranidGear(s.unit,gear,s.models))throw Error('Equipment limit exceeded');
 return {...s,knightGear:gear};
}
function brood(models:number,base:string,shard=0,spike=0,web=0){
 return equip(squad('Termagants',models),'Brood weapons',[...Array(models-shard-spike-web).fill(base),...Array(shard).fill('Shardlauncher'),...Array(spike).fill('Spike rifle'),...Array(web).fill('Strangleweb')]);
}
const resize=(s:RosterInstance,models:number)=>({...s,models,knightGear:resizeTyranidGear(s,models)});

it.each(TYRANID_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s resolves physical models and legal weapons at every starting strength',(unit,sheet)=>{
 for(const [size,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+size),kit=tyranidLoadout(unit,+size)!,models=tyranidModelLoadouts(s);
  expect(models).toHaveLength(+size);expect(validTyranidGear(unit,{},+size)).toBe(true);
  expect(models.reduce<Record<string,number>>((r,m)=>({...r,[m.model]:(r[m.model]??0)+1}),{})).toEqual(Object.fromEntries(Object.entries(roles).filter(([,n])=>n)));
  expect(new Set(kit.slots.map(f=>f.name)).size).toBe(kit.slots.length);
  for(const field of kit.slots)for(const choice of field.choices){
   const changed={...s,knightGear:{[field.name]:choice.name}};
   expect(validTyranidGear(unit,changed.knightGear,+size)).toBe(true);
   const expected=models.flatMap(m=>m.items);
   for(const item of field.choices[0].items){const index=expected.indexOf(item);expect(index).toBeGreaterThanOrEqual(0);expected.splice(index,1);}
   expect(tyranidModelLoadouts(changed).flatMap(m=>m.items).sort()).toEqual([...expected,...choice.items].sort());
  }
 }
});

it('reconciles all52 matched-play cards,135 strengths and133 weapon profiles with current source versions',()=>{
 const names=TYRANID_SHEETS.map(s=>s.unit);
 expect(names).toHaveLength(52);expect(new Set(names).size).toBe(52);
 expect(TYRANID_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(135);
 expect(Object.values(TYRANID_CARDS).reduce((n,c)=>n+c.weapons.length,0)).toBe(133);
 expect(new Set(Object.keys(TYRANID_CARDS))).toEqual(new Set(names));expect(new Set(TYRANID_KITS.map(k=>k.unit))).toEqual(new Set(names));
 expect(tyranidMusterUnits(newSelection('Tyranids'))).toEqual(names);
 expect(new Set(TYRANID_SYNAPSE_UNITS)).toEqual(new Set(names));expect(TYRANID_SHADOW_SOURCES).toHaveLength(17);
 for(const name of ['Barbed Hierodule','Scythed Hierodule','Malanthrope','Dimachaeron','Sky-slasher Swarms','Tyranid Warriors'])expect(names).not.toContain(name);
 for(const name of ['Harridan','Hierophant','Hyperadapted Raveners','The Red Terror','Tyranid Prime with Lash Whip'])expect(names).toContain(name);
 expect(TYRANID_REVISION).toMatchObject({packVersion:'1.3',manual:'1.6',exportUpdated:'2026-11-23 01:43:36'});
 expect(TYRANID_SHEETS.filter(s=>s.laterCopyPointsBySize)).toHaveLength(16);
 expect(TYRANID_SHEETS.filter(s=>s.wargearPoints).map(s=>s.unit)).toEqual(['Tyrannofex']);
});

it('keeps one shared Termagant standard gun and each specialist quota per ten physical models',()=>{
 for(const base of ['Fleshborer','Termagant devourer','Termagant spinefists']){
  const s=brood(20,base,2,2,2);
  expect(count(s,base)).toBe(14);expect(tyranidModelLoadouts(s)).toHaveLength(20);
  for(const m of tyranidModelLoadouts(s))expect(m.items).toHaveLength(2);
 }
 expect(()=>equip(squad('Termagants',10),'Brood weapons',[...Array(5).fill('Fleshborer'),...Array(5).fill('Termagant devourer')])).toThrow();
 expect(()=>brood(19,'Fleshborer',2)).toThrow();expect(()=>brood(20,'Fleshborer',3)).toThrow();
 expect(validTyranidGear('Termagants',{'Termagant 1 · Firearm':'Termagant devourer'},10)).toBe(false);
});

it('preserves the chosen brood gun and legal specialists when growing or shrinking Termagants',()=>{
 const original=brood(20,'Termagant devourer',2,2,2),smaller=resize(original,19);
 expect(count(smaller,'Termagant devourer')).toBe(16);
 for(const special of ['Shardlauncher','Spike rifle','Strangleweb'])expect(count(smaller,special)).toBe(1);
 const larger=resize(smaller,20);expect(count(larger,'Termagant devourer')).toBe(17);
 expect(count(larger,'Shardlauncher')).toBe(1);expect(validTyranidGear(larger.unit,larger.knightGear!,20)).toBe(true);
 expect(tyranidLoadout('Termagants',9)).toBeUndefined();expect(tyranidLoadout('Termagants',20.5)).toBeUndefined();
});

it('equips Ripper Spinemaws on all models or none and keeps that whole-brood choice after resizing',()=>{
 const s=squad('Ripper Swarms',3);expect(tyranidHasRangedWeapon(s)).toBe(false);
 const armed=equip(s,'Brood ranged weapons',Array(3).fill('Spinemaws'));
 expect(tyranidHasRangedWeapon(armed)).toBe(true);expect(count(armed,'Spinemaws')).toBe(3);
 expect(()=>equip(s,'Brood ranged weapons',['Spinemaws'])).toThrow();
 expect(count(resize(armed,1),'Spinemaws')).toBe(1);expect(count(resize(resize(armed,1),3),'Spinemaws')).toBe(3);
});

it('limits each Warrior heavy gun across both the Prime and Warrior models',()=>{
 const unit='Tyranid Warriors With Ranged Bio-weapons';
 let s=equip(squad(unit,3),'Tyranid Prime ·',['Venom cannon']);
 s=equip(s,'Tyranid Warrior 1 ·',['Barbed strangler']);
 expect(()=>equip(s,'Tyranid Warrior 2 ·',['Venom cannon'])).toThrow();
 expect(()=>equip(s,'Tyranid Warrior 2 ·',['Barbed strangler'])).toThrow();
 s=resize(s,6);s=equip(s,'Tyranid Warrior 2 ·',['Venom cannon']);s=equip(s,'Tyranid Warrior 3 ·',['Barbed strangler']);
 expect(count(s,'Venom cannon')).toBe(2);expect(count(s,'Barbed strangler')).toBe(2);
 const shrunk=resize(s,3);expect(count(shrunk,'Venom cannon')).toBe(1);expect(count(shrunk,'Barbed strangler')).toBe(1);
 expect(tyranidModelLoadouts(shrunk).find(m=>m.model==='Tyranid Prime')!.items).toContain('Venom cannon');
});

it('enforces the Hive Tyrant arm-pair restrictions and retains the Winged Tyrant’s fixed talons',()=>{
 const h=squad('Hive Tyrant');
 expect(()=>equip(h,'',['Heavy venom cannon','Stranglethorn cannon'])).toThrow();
 expect(()=>equip(h,'',['Heavy venom cannon','Heavy venom cannon'])).toThrow();
 expect(count(equip(h,'',['Monstrous scything talons','Monstrous scything talons']),'Monstrous scything talons')).toBe(2);
 const wing=equip(squad('Winged Hive Tyrant'),'',['Heavy venom cannon']);
 expect(count(wing,'Heavy venom cannon')).toBe(1);expect(count(wing,'Tyrant talons')).toBe(1);
});

it('keeps individual Carnifex arms and optional guns with their actual model when resized',()=>{
 let s=equip(squad('Carnifexes',2),'Carnifex 1 ·',['Carnifex crushing claws','Heavy venom cannon']);
 s=equip(s,'Carnifex 1 ·',['Bio-plasma']);s=equip(s,'Carnifex 2 ·',['Devourers with brainleech worms','Devourers with brainleech worms']);
 s=equip(s,'Carnifex 2 ·',['Spine banks']);
 const shrunk=resize(s,1);expect(count(shrunk,'Heavy venom cannon')).toBe(1);expect(count(shrunk,'Bio-plasma')).toBe(1);
 expect(count(shrunk,'Devourers with brainleech worms')).toBe(0);expect(count(shrunk,'Spine banks')).toBe(0);
 const grown=resize(shrunk,2);expect(count(grown,'Carnifex scything talons')).toBe(1);expect(count(grown,'Heavy venom cannon')).toBe(1);
 expect(()=>equip(s,'Carnifex 1 ·',['Heavy venom cannon','Stranglethorn cannon'])).toThrow();
});

it('keeps Ravener Prime keywords, Shadow permission, wounds and equipment on the distinct physical bearer',()=>{
 const s=squad('Hyperadapted Raveners',5),models=tyranidModelLoadouts(s),army=newSelection('Tyranids');
 expect(models.map(m=>m.model)).toEqual(['Ravener Prime','Raveners','Raveners','Raveners','Raveners']);
 expect(tyranidKeywords(army,s,'Ravener Prime')).toContain('CHARACTER');expect(tyranidKeywords(army,s,'Raveners')).not.toContain('CHARACTER');
 expect(tyranidKeywords(army,s,'Raveners')).not.toContain('SYNAPSE');expect(tyranidKeywords(army,s)).toContain('SYNAPSE');
 expect(TYRANID_SHADOW_SOURCES.find(row=>row.unit===s.unit)).toEqual({unit:s.unit,model:'Ravener Prime'});
 const sheet=TYRANID_SHEETS.find(row=>row.unit===s.unit)!;
 expect(sheet.modelProfiles?.['Ravener Prime'].wounds).toBe(6);expect(sheet.modelProfiles?.Raveners.wounds).toBe(3);
 expect(sheet.bodyguards).toEqual(['Raveners']);
});

it('allows the second Neurogaunt Nodebeast only with all20 ordinary Neurogaunts at the same upper point price',()=>{
 const sheet=TYRANID_SHEETS.find(s=>s.unit==='Neurogaunts')!;
 expect(sheet.pointsBySize).toEqual({11:45,21:90,22:90});
 expect(tyranidModelLoadouts(squad('Neurogaunts',21)).filter(m=>m.model==='Neurogaunt Nodebeast')).toHaveLength(1);
 expect(tyranidModelLoadouts(squad('Neurogaunts',22)).filter(m=>m.model==='Neurogaunt Nodebeast')).toHaveLength(2);
 expect(tyranidModelLoadouts(squad('Neurogaunts',22)).filter(m=>m.model==='Neurogaunt')).toHaveLength(20);
});

it('prices Tyrannofex main guns without charging or retaining an exchanged weapon',()=>{
 const sheet=TYRANID_SHEETS.find(s=>s.unit==='Tyrannofex')!,standard=squad('Tyrannofex');
 const acid=equip(standard,'',['Acid spray']),rupture=equip(standard,'',['Rupture cannon']);
 const surcharge=(s:RosterInstance)=>Object.entries(sheet.wargearPoints!).reduce((sum,[weapon,price])=>sum+count(s,weapon)*price,0);
 expect(surcharge(standard)).toBe(0);expect(surcharge(acid)).toBe(10);expect(surcharge(rupture)).toBe(20);
 expect(count(rupture,'Fleshborer hive')).toBe(0);expect(count(rupture,'Stinger salvoes')).toBe(1);
 expect(TYRANID_CARDS.Tyrannofex.weapons.find(w=>w.name==='Rupture cannon')).toMatchObject({strength:18,ap:-4});
});

it('uses current Tyrannocyte weapons and the source-backed Screamer-Killer and Red Terror profiles',()=>{
 expect(count(squad('Tyrannocyte'),'Tyrannocyte bio-weapons')).toBe(1);expect(count(squad('Tyrannocyte'),'Deathspitter')).toBe(0);
 expect(TYRANID_CARDS['Screamer-killer'].weapons.find(w=>w.name==='Screamer-killer talons')).toMatchObject({attacks:'10',skill:'3',strength:10,ap:-2,damage:'3'});
 expect(TYRANID_CARDS['The Red Terror'].weapons.find(w=>w.name==='Gaping maw')).toMatchObject({ap:0,damage:'D3+2',abilities:['extra attacks','devastating wounds','precision']});
 for(const card of Object.values(TYRANID_CARDS))for(const weapon of card.weapons){expect(Number.isFinite(weapon.ap)).toBe(true);expect(Number.isFinite(weapon.strength)).toBe(true);}
});
