// @vitest-environment node
import {expect,it} from 'vitest';
import type {RosterInstance} from '../src/roster-instances';
import {CSM_SHEETS,CSM_REVISION,CSM_DARK_PACT_UNITS,CSM_ACCURSED_COMPOSITIONS,CSM_UNITS} from '../src/csm-data';
import {CSM_CARDS,CSM_CULT_WEAPONS} from '../src/csm-card-profiles.generated';
import {CSM_KITS} from '../src/csm-loadouts.generated';
import {csmLoadout,csmModelLoadouts,csmWeaponCount,csmHasRangedWeapon,validCsmGear,resizeCsmGear} from '../src/csm-loadouts';

const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
const count=csmWeaponCount;
const sheet=(unit:string)=>CSM_SHEETS.find(s=>s.unit===unit)!;
const roles=(s:RosterInstance)=>csmModelLoadouts(s).reduce<Record<string,number>>((r,m)=>({...r,[m.model]:(r[m.model]??0)+1}),{});
function equip(s:RosterInstance,prefix:string,items:string[]){
 const field=csmLoadout(s.unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('No legal equipment choice: '+s.unit+' / '+prefix+' / '+items.join(', '));
 const gear={...s.knightGear,[field.name]:field.choices.find(c=>key(c.items)===key(items))!.name};
 if(!validCsmGear(s.unit,gear,s.models))throw Error('Equipment limit exceeded');
 return {...s,knightGear:gear};
}
const resize=(s:RosterInstance,models:number)=>({...s,models,knightGear:resizeCsmGear(s,models)});
const surcharge=(s:RosterInstance)=>Object.entries(sheet(s.unit).wargearPoints??{}).reduce((sum,[weapon,price])=>sum+count(s,weapon)*price,0);

it.each(CSM_SHEETS.map(s=>[s.unit,s] as const))('%s resolves physical models and equipment at every legal starting strength',(unit,s)=>{
 for(const [size,composition] of Object.entries(s.compositionBySize!)){
  const original=squad(unit,+size),kit=csmLoadout(unit,+size)!,models=csmModelLoadouts(original);
  expect(models).toHaveLength(+size);expect(validCsmGear(unit,{},+size)).toBe(true);
  expect(roles(original)).toEqual(Object.fromEntries(Object.entries(composition).filter(([,n])=>n)));
  expect(new Set(kit.slots.map(f=>f.name)).size).toBe(kit.slots.length);
  for(const field of kit.slots)for(const choice of field.choices){
   const changed={...original,knightGear:{[field.name]:choice.name}};
   // The extra Nemesis Claw heavy gun becomes legal only at ten models.
   if(!validCsmGear(unit,changed.knightGear,+size)){
    expect(unit).toBe('Nemesis Claw');expect(+size).toBeLessThan(10);
    expect(choice.items.some(i=>['Heavy bolter','Missile launcher'].includes(i))).toBe(true);
    continue;
   }
   const expected=models.flatMap(m=>m.items);
   for(const item of field.choices[0].items){const index=expected.indexOf(item);expect(index).toBeGreaterThanOrEqual(0);expected.splice(index,1);}
   expect(csmModelLoadouts(changed).flatMap(m=>m.items).sort()).toEqual([...expected,...choice.items].sort());
  }
  expect(validCsmGear(unit,{'Unknown field':'Unknown choice'},+size)).toBe(false);
 }
 expect(csmLoadout(unit,0)).toBeUndefined();expect(csmLoadout(unit,999)).toBeUndefined();
});

it('reconciles 54 native cards, 115 legal strengths, 315 profiles and the current points revisions',()=>{
 expect(CSM_UNITS).toHaveLength(54);expect(new Set(CSM_UNITS).size).toBe(54);
 expect(CSM_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(115);
 expect(Object.values(CSM_CARDS).reduce((n,c)=>n+c.weapons.length,0)).toBe(315);
 expect(new Set(Object.keys(CSM_CARDS))).toEqual(new Set(CSM_UNITS));
 expect(new Set(CSM_KITS.map(k=>k.unit))).toEqual(new Set(CSM_UNITS));
 expect(new Set(CSM_DARK_PACT_UNITS)).toEqual(new Set(CSM_UNITS));
 expect(CSM_REVISION).toMatchObject({packVersion:'1.2',manual:'1.6',exportUpdated:'2026-11-23 01:43:36'});
 expect(CSM_SHEETS.filter(s=>s.laterCopyPointsBySize)).toHaveLength(21);
 expect(CSM_SHEETS.filter(s=>s.wargearPoints).map(s=>s.unit)).toEqual(['Defiler','Forgefiend']);
 for(const name of ['Khorne Berzerkers','Rubric Marines','Plague Marines','Noise Marines','Chaos Contemptor Dreadnought','Greater Brass Scorpion'])expect(CSM_UNITS).not.toContain(name);
 for(const name of ['Kravek Morne','Mutilators','Red Corsairs Raiders','Red Corsairs Reave-Captain','Masters of the Maelstrom'])expect(CSM_UNITS).toContain(name);
 expect(sheet('Defiler').pointsBySize).toEqual({1:300});expect(sheet('Defiler').laterCopyPointsBySize).toEqual({2:{1:350}});
 expect(sheet('Chaos Rhino').laterCopyPointsBySize).toEqual({4:{1:75}});
 for(const k of CSM_KITS){
  const available=k.roles.flatMap(r=>[...r.fixed,...r.slots.flatMap(f=>f.choices.flat())]).map(i=>i.toLowerCase());
  for(const w of CSM_CARDS[k.unit].weapons){
   expect(available).toContain(w.name.split(/\s+[–—-]\s+/)[0].toLowerCase());
   expect(Number.isFinite(w.strength)).toBe(true);expect(Number.isFinite(w.ap)).toBe(true);
  }
 }
});

it('supports all 24 Accursed Cultist mixtures and preserves actual Torments when resized',()=>{
 expect(Object.values(CSM_ACCURSED_COMPOSITIONS).flat()).toHaveLength(24);
 for(const [size,mixes] of Object.entries(CSM_ACCURSED_COMPOSITIONS))for(const mix of mixes){
  const s={...squad('Accursed Cultists',+size),knightGear:{Composition:`${mix.Torment} Torments + ${mix.Mutant} Mutants`}};
  expect(validCsmGear(s.unit,s.knightGear,+size)).toBe(true);expect(roles(s)).toEqual(mix);
  expect(count(s,'Hideous mutations')).toBe(mix.Torment);expect(count(s,'Blasphemous appendages')).toBe(mix.Mutant);
  expect(csmHasRangedWeapon(s)).toBe(false);
 }
 const chosen={...squad('Accursed Cultists',11),knightGear:{Composition:'6 Torments + 5 Mutants'}};
 expect(roles(resize(chosen,16))).toEqual({Torment:6,Mutant:10});
 expect(roles(resize(chosen,10))).toEqual({Torment:5,Mutant:5});
 expect(roles(resize(chosen,8))).toEqual({Torment:3,Mutant:5});
 expect(validCsmGear('Accursed Cultists',{Composition:'2 Torments + 9 Mutants'},11)).toBe(false);
 expect(csmLoadout('Accursed Cultists',8.5)).toBeUndefined();
 expect(sheet('Accursed Cultists').pointsBySize).toEqual({8:90,16:185});
});

it('keeps Character, Psyker, wounds and personal saves on the correct mixed-unit models',()=>{
 for(const [unit,bearer,companions] of [
  ['Dark Apostle','Dark Apostle',['Dark Disciple','Dark Disciple']],
  ['Fabius Bile','Fabius Bile',['Surgeon Acolyte']],
  ['Dark Commune','Cult Demagogue',['Mindwitch','Iconarch','Blessed Blade','Blessed Blade']],
  ['Traitor Enforcer','Traitor Enforcer',['Traitor Ogryn']],
 ] as const){
  const card=sheet(unit);expect(csmModelLoadouts(squad(unit)).map(m=>m.model).sort()).toEqual([bearer,...companions].sort());
  expect(card.keywords).not.toContain('CHARACTER');expect(card.modelKeywords?.[bearer]).toContain('CHARACTER');
  for(const model of companions)expect(card.modelKeywords?.[model]??[]).not.toContain('CHARACTER');
 }
 expect(sheet('Dark Commune').modelKeywords?.Mindwitch).toEqual(['PSYKER']);
 expect(sheet('Dark Commune').modelProfiles?.['Cult Demagogue'].wounds).toBe(4);
 expect(sheet('Dark Commune').modelProfiles?.Mindwitch.wounds).toBe(1);
 expect(sheet('Fabius Bile').modelProfiles?.['Surgeon Acolyte'].save).toBe('6+');
 expect(CSM_CARDS['Traitor Enforcer']).toMatchObject({save:null,modelSaves:{'Traitor Enforcer':5,'Traitor Ogryn':null}});
 expect(sheet('Traitor Enforcer').modelProfiles?.['Traitor Ogryn']).toMatchObject({toughness:6,wounds:4});
 const masters=sheet('Masters of the Maelstrom');
 expect(masters.keywords).not.toContain('CHARACTER');expect(masters.modelKeywords).toEqual({'Garlon Souleater':['PSYKER']});
 expect(masters.modelProfiles?.['Captain Sargotta']).toMatchObject({toughness:3,wounds:3,save:'4+'});
 expect(masters.modelProfiles?.['Garreon the Corpsemaster']).toMatchObject({toughness:5,wounds:4,save:'3+'});
 expect(count(squad('Dark Apostle'),'Accursed crozius')).toBe(1);expect(count(squad('Dark Apostle'),'Close combat weapon')).toBe(2);
});

it('enforces Legionary specialist uniqueness and exactly two Champion replacement weapons',()=>{
 let s=equip(squad('Legionaries',10),'Legionary 1 ·',['Lascannon']);
 expect(()=>equip(s,'Legionary 2 ·',['Lascannon'])).toThrow();
 s=equip(s,'Legionary 2 ·',['Plasma gun']);expect(()=>equip(s,'Legionary 3 ·',['Flamer'])).toThrow();
 s=equip(s,'Legionary 3 ·',['Heavy melee weapon']);expect(()=>equip(s,'Legionary 4 ·',['Heavy melee weapon'])).toThrow();
 s=equip(s,'Legionary 4 ·',['Balefire tome']);expect(()=>equip(s,'Legionary 5 ·',['Balefire tome'])).toThrow();
 expect(()=>equip(s,'Aspiring Champion ·',['Astartes chainsword','Heavy melee weapon','Plasma pistol'])).toThrow();
 expect(()=>equip(s,'Aspiring Champion ·',['Plasma pistol','Plasma pistol'])).toThrow();
 s=equip(s,'Aspiring Champion ·',['Heavy melee weapon','Plasma pistol']);
 expect(count(s,'Heavy melee weapon')).toBe(2);expect(count(s,'Plasma pistol')).toBe(1);
 s=equip(s,'Aspiring Champion ·',['Chaos icon']);expect(()=>equip(s,'Legionary 1 ·',['Chaos icon'])).toThrow();
 const smaller=resize(s,9);expect(count(smaller,'Lascannon')).toBe(1);expect(count(smaller,'Plasma gun')).toBe(0);
 expect(count(smaller,'Balefire tome')).toBe(1);expect(count(smaller,'Chaos icon')).toBe(1);
});

it('keeps each five-model Raptor special-gun group distinct and plasma-pistol bearers on chainswords',()=>{
 let s=equip(squad('Raptors',5),'Raptor 1 ·',['Bolt pistol','Close combat weapon','Flamer']);
 expect(()=>equip(s,'Raptor 2 ·',['Bolt pistol','Close combat weapon','Flamer'])).toThrow();
 s=equip(s,'Raptor 2 ·',['Bolt pistol','Close combat weapon','Meltagun']);
 expect(()=>equip(s,'Raptor 3 ·',['Bolt pistol','Close combat weapon','Plasma gun'])).toThrow();
 s=resize(s,10);s=equip(s,'Raptor 3 ·',['Bolt pistol','Close combat weapon','Flamer']);
 s=equip(s,'Raptor 4 ·',['Bolt pistol','Close combat weapon','Plasma gun']);
 expect(()=>equip(s,'Raptor 5 ·',['Bolt pistol','Close combat weapon','Flamer'])).toThrow();
 s=equip(s,'Raptor 5 ·',['Astartes chainsword','Plasma pistol']);
 expect(()=>equip(s,'Raptor 5 ·',['Heavy melee weapon','Plasma pistol'])).toThrow();
 expect(count(resize(s,9),'Flamer')).toBe(1);expect(count(resize(s,9),'Meltagun')).toBe(1);
 expect(count(resize(s,9),'Plasma gun')).toBe(0);
});

it('lets the same Red Corsairs Raider take both separately limited replacements',()=>{
 let s=equip(squad('Red Corsairs Raiders',5),'Red Corsairs Raider 1 ·',['Bolt pistol','Meltagun','Power fist']);
 expect(count(s,'Meltagun')).toBe(1);expect(count(s,'Power fist')).toBe(1);
 expect(()=>equip(s,'Red Corsairs Raider 2 ·',['Bolt pistol','Meltagun','Reaver’s blade'])).toThrow();
 expect(()=>equip(s,'Red Corsairs Raider 2 ·',['Bolt pistol','Boltgun','Power fist'])).toThrow();
 s=resize(s,10);s=equip(s,'Red Corsairs Raider 2 ·',['Bolt pistol','Meltagun','Power fist']);
 expect(count(s,'Meltagun')).toBe(2);expect(count(resize(s,9),'Meltagun')).toBe(1);
 const champion=equip(s,'Red Corsairs Raider Champion ·',['Boltgun','Hand flamer','Reaver’s blade']);
 expect(csmModelLoadouts(champion).find(m=>m.model==='Red Corsairs Raider Champion')!.items).toContain('Hand flamer');
});

it('starts Havocs with two autocannons and two lascannons and keeps upgrades with their physical bearer',()=>{
 const s=squad('Havocs',5);expect(count(s,'Havoc autocannon')).toBe(2);expect(count(s,'Havoc lascannon')).toBe(2);
 const fitted=equip(s,'Havoc 3 ·',['Havoc reaper chaincannon']);
 expect(count(fitted,'Havoc lascannon')).toBe(1);expect(count(fitted,'Havoc reaper chaincannon')).toBe(1);
 expect(csmModelLoadouts(fitted).filter(m=>m.model==='Havoc')[2].items).toEqual(['Close combat weapon','Havoc reaper chaincannon']);
 const champion=equip(equip(fitted,'Havoc Champion · Astartes chainsword',['Power fist']),'Havoc Champion · Flamer',['Power fist']);
 expect(count(champion,'Power fist')).toBe(2);expect(count(champion,'Flamer')).toBe(0);
});

it('replaces both Terminator arms for paired weapons and enforces shared per-five quotas',()=>{
 let s=equip(squad('Chaos Terminator Squad',5),'Terminator Champion ·',['Paired accursed weapons']);
 expect(count(s,'Combi-bolter')).toBe(4);expect(()=>equip(s,'Chaos Terminator 1 ·',['Paired accursed weapons'])).toThrow();
 expect(()=>equip(s,'Terminator Champion ·',['Accursed weapon','Reaper autocannon'])).toThrow();
 s=equip(s,'Chaos Terminator 1 ·',['Power fist','Reaper autocannon']);
 expect(()=>equip(s,'Chaos Terminator 2 ·',['Accursed weapon','Heavy flamer'])).toThrow();
 s=equip(s,'Chaos Terminator 2 ·',['Power fist','Combi-bolter']);s=equip(s,'Chaos Terminator 3 ·',['Power fist','Combi-bolter']);
 expect(()=>equip(s,'Chaos Terminator 4 ·',['Power fist','Combi-bolter'])).toThrow();
 s=equip(s,'Chaos Terminator 4 ·',['Chainfist','Combi-bolter']);
 s=resize(s,10);s=equip(s,'Chaos Terminator 5 ·',['Chainfist','Heavy flamer']);
 expect(count(s,'Chainfist')).toBe(2);expect(count(resize(s,9),'Chainfist')).toBe(1);
 expect(csmHasRangedWeapon(equip(squad('Chaos Lord In Terminator Armour'),'',['Paired accursed weapons']))).toBe(false);
});

it('keeps the Chosen power-fist bearer’s boltgun and permits limited pistol and combi-weapon replacements',()=>{
 let s=equip(squad('Chosen',5),'Chosen Champion ·',['Boltgun','Plasma pistol','Power fist']);
 expect(()=>equip(s,'Chosen Champion ·',['Combi-weapon','Plasma pistol','Power fist'])).toThrow();
 s=equip(s,'Chosen 1 ·',['Accursed weapon','Combi-weapon','Plasma pistol']);
 expect(()=>equip(s,'Chosen 2 ·',['Accursed weapon','Boltgun','Plasma pistol'])).toThrow();
 s=equip(s,'Chosen 2 ·',['Accursed weapon','Bolt pistol','Combi-weapon']);
 expect(()=>equip(s,'Chosen 3 ·',['Accursed weapon','Bolt pistol','Combi-weapon'])).toThrow();
 s=equip(s,'Chosen 3 ·',['Bolt pistol','Paired accursed weapons']);
 expect(()=>equip(s,'Chosen 4 ·',['Bolt pistol','Paired accursed weapons'])).toThrow();
 expect(count(s,'Power fist')).toBe(1);expect(count(s,'Plasma pistol')).toBe(2);
});

it('enforces Nemesis Claw specialist uniqueness and the ten-model heavy-gun gate',()=>{
 let s=equip(squad('Nemesis Claw',5),'Legionary 1 ·',['Astartes chainsword','Voice Eater']);
 expect(()=>equip(s,'Legionary 2 ·',['Astartes chainsword','Voice Eater'])).toThrow();
 s=equip(s,'Legionary 2 ·',['Plasma gun']);expect(()=>equip(s,'Legionary 3 ·',['Meltagun'])).toThrow();
 expect(()=>equip(s,'Legionary 3 ·',['Heavy bolter'])).toThrow();
 s=resize(s,10);s=equip(s,'Legionary 3 ·',['Heavy bolter']);
 expect(()=>equip(s,'Legionary 4 ·',['Missile launcher'])).toThrow();
 expect(count(resize(s,9),'Heavy bolter')).toBe(0);expect(count(resize(s,9),'Voice Eater')).toBe(1);
});

it('limits Biker special equipment to two ordinary Bikers and Guardsman specials to three distinct guns',()=>{
 let bikers=equip(squad('Chaos Bikers',6),'Chaos Biker 1 ·',['Combi-bolter','Plasma gun']);
 bikers=equip(bikers,'Chaos Biker 2 ·',['Combi-weapon']);
 expect(()=>equip(bikers,'Chaos Biker 3 ·',['Combi-bolter','Meltagun'])).toThrow();
 expect(()=>equip(bikers,'Biker Champion ·',['Combi-bolter','Plasma gun'])).toThrow();
 expect(count(bikers,'Combi-bolter')).toBe(5);expect(count(bikers,'Combi-weapon')).toBe(1);
 let guards=equip(squad('Traitor Guardsmen Squad',10),'Traitor Guardsmen 1 ·',['Meltagun']);
 expect(()=>equip(guards,'Traitor Guardsmen 2 ·',['Meltagun'])).toThrow();
 guards=equip(guards,'Traitor Guardsmen 2 ·',['Plasma gun']);guards=equip(guards,'Traitor Guardsmen 3 ·',['Cultist sniper rifle']);
 expect(()=>equip(guards,'Traitor Guardsmen 4 ·',['Flamer'])).toThrow();
});

it('prices every Defiler and Forgefiend paid weapon and retains the current Defiler modes',()=>{
 const stock=squad('Defiler');expect(surcharge(stock)).toBe(0);expect(count(stock,'Excruciator cannon')).toBe(2);
 for(const [items,price] of [
  [['Hades lascannon','Hades lascannon'],30],
  [['Heavy reaper autocannon','Heavy reaper autocannon'],30],
  [['Hades lascannon','Heavy reaper autocannon'],30],
  [['Electroscourge','Hades lascannon'],15],
  [['Electroscourge','Heavy missile launcher'],0],
 ] as [string[],number][]){const s=equip(stock,'Heavy baleflamer',items);expect(surcharge(s)).toBe(price);}
 expect(()=>equip(stock,'Heavy baleflamer',['Electroscourge','Electroscourge'])).toThrow();
 const magma=equip(stock,'Excruciator cannon',['Magma cutters','Magma cutters']);
 expect(count(magma,'Excruciator cannon')).toBe(0);expect(count(magma,'Magma cutters')).toBe(2);
 const modes=CSM_CARDS.Defiler.weapons.filter(w=>w.name.startsWith('Shearing claws'));
 expect(modes).toMatchObject([{name:'Shearing claws – strike',attacks:'5',strength:16,ap:-3,damage:'D6+1'},{name:'Shearing claws – sweep',attacks:'10',strength:6,ap:-2,damage:'1'}]);
 for(const mode of modes)expect(count(stock,mode.name)).toBe(1);
 let forge=squad('Forgefiend');expect(surcharge(forge)).toBe(0);
 forge=equip(forge,'Forgefiend jaws',['Armoured limbs','Ectoplasma cannon']);expect(surcharge(forge)).toBe(5);
 forge=equip(forge,'Hades autocannon',['Ectoplasma cannon','Ectoplasma cannon']);
 expect(surcharge(forge)).toBe(15);expect(count(forge,'Hades autocannon')).toBe(0);expect(count(forge,'Forgefiend jaws')).toBe(0);
});

it('keeps free tokens and mode-based weapon checks without a second allegiance control',()=>{
 const sorcerer=equip(squad('Sorcerer In Terminator Armour'),'Chaos familiar',['Chaos familiar']);
 expect(count(sorcerer,'Chaos familiar')).toBe(1);expect(surcharge(sorcerer)).toBe(0);
 expect(count(squad('Dark Commune'),'Chaos icon')).toBe(1);expect(count(squad('Dark Commune'),'Warp Curse – witchfire')).toBe(1);
 for(const name of ['Heretic Astartes Daemon Prince','Heretic Astartes Daemon Prince With Wings'])expect(csmLoadout(name)!.slots).toEqual([]);
 const lord=equip(squad('Chaos Lord'),'Plasma pistol',['Power fist']);expect(csmHasRangedWeapon(lord)).toBe(false);
 expect(csmHasRangedWeapon(squad('Chaos Lord'))).toBe(true);expect(csmHasRangedWeapon(squad('Mutilators'))).toBe(false);
 expect(validCsmGear('Unrecognised unit',{})).toBe(false);expect(csmModelLoadouts(squad('Unrecognised unit'))).toEqual([]);
});

it('provides all 33 complete Cult weapon profiles without adding Cult cards to the native Dark Pacts inventory',()=>{
 expect(Object.fromEntries(Object.entries(CSM_CULT_WEAPONS).map(([name,weapons])=>[name,weapons.length]))).toEqual({'Khorne Berzerkers':5,'Rubric Marines':8,'Plague Marines':14,'Noise Marines':6});
 for(const [name,weapons] of Object.entries(CSM_CULT_WEAPONS)){
  expect(CSM_UNITS).not.toContain(name);expect(CSM_DARK_PACT_UNITS).not.toContain(name);
  for(const w of weapons){
   for(const value of [w.range,w.attacks,w.skill,w.damage])expect(value).toBeTruthy();
   expect(Number.isFinite(w.strength)).toBe(true);expect(Number.isFinite(w.ap)).toBe(true);
  }
 }
 expect(CSM_CULT_WEAPONS['Khorne Berzerkers'].find(w=>w.name==='Bolt pistol')).toMatchObject({strength:5,ap:-1,skill:'4'});
 expect(CSM_CULT_WEAPONS['Rubric Marines'].find(w=>w.name==='Inferno boltgun')).toMatchObject({strength:5,ap:-2,attacks:'2'});
 expect(CSM_CULT_WEAPONS['Plague Marines'].find(w=>w.name==='Boltgun')).toMatchObject({strength:5,ap:-1,attacks:'2'});
 expect(CSM_CULT_WEAPONS['Noise Marines'].find(w=>w.name==='Close combat weapon')).toMatchObject({strength:5,ap:0});
 expect(CSM_CULT_WEAPONS['Noise Marines'].filter(w=>w.name.startsWith('Blastmaster'))).toHaveLength(2);
});
