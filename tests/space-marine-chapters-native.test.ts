import {describe,it,expect} from 'vitest';
import {CHAPTER_NATIVE_SHEETS,CHAPTER_NATIVE_REVISION,CHAPTER_MEMBERSHIP,CHAPTER_ATTACHMENTS,CHAPTER_COMPOSITIONS,CHAPTER_COMPOSITION_PRICES} from '../src/space-marine-chapters-native.generated';
import {CHAPTER_KITS} from '../src/space-marine-chapters-loadouts.generated';
import {CHAPTER_CARDS} from '../src/space-marine-chapters-card-profiles.generated';
import {spaceMarineLoadout,spaceMarineModelLoadouts,spaceMarineModelIdentities,spaceMarineSplitSelection,spaceMarineWeaponCount,validSpaceMarineGear,resizeSpaceMarineGear,spaceMarineCompositionPrice,spaceMarineCard,spaceMarineHasRangedWeapon} from '../src/space-marines-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const squad=(unit:string,models?:number,knightGear?:Record<string,string>):RosterInstance=>({id:unit+'#1',unit,models,knightGear});
const sheet=(faction:string,unit:string)=>CHAPTER_NATIVE_SHEETS.find(s=>s.faction===faction&&s.unit===unit)!;
const key=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const same=(a:readonly string[],b:readonly string[])=>a.map(key).sort().join('|')===b.map(key).sort().join('|');
const compositionName=(models:Readonly<Record<string,number>>)=>Object.entries(models).filter(([,n])=>n).map(([role,n])=>n+' × '+role).join(' + ');
function composition(faction:string,unit:string,size:number,models:Record<string,number>){
 const field=spaceMarineLoadout(unit,size,faction)!.slots.find(s=>s.name==='Unit composition');
 if(!field)return {};
 expect(field.choices.some(c=>c.name===compositionName(models))).toBe(true);
 return {[field.name]:compositionName(models)};
}
function choose(faction:string,unit:string,size:number,role:string,item:string,n=0,gear:Record<string,string>={}){
 const fields=spaceMarineLoadout(unit,size,faction,gear)!.slots.filter(s=>s.name.startsWith(role)&&s.choices.some(c=>c.items.some(i=>key(i)===key(item))));
 const field=fields[n];if(!field)throw Error('Missing '+faction+' field '+unit+' '+role+' '+item+' '+n);
 return {[field.name]:field.choices.find(c=>c.items.some(i=>key(i)===key(item)))!.name};
}
function exact(faction:string,unit:string,size:number,items:string[]){
 const fields=spaceMarineLoadout(unit,size,faction)!.slots.filter(s=>s.choices.some(c=>same(c.items,items)));
 expect(fields).toHaveLength(1);return {[fields[0].name]:fields[0].choices.find(c=>same(c.items,items))!.name};
}
const counts=(s:RosterInstance,faction:string)=>spaceMarineModelLoadouts(s,faction).reduce<Record<string,number>>((r,m)=>({...r,[m.model]:(r[m.model]??0)+1}),{});

describe('complete chapter-specific native cards',()=>{
 it('reconciles all 66 current cards, 154 legal strengths, 81 physical roles and October prices',()=>{
  expect(CHAPTER_NATIVE_SHEETS).toHaveLength(66);expect(CHAPTER_KITS).toHaveLength(66);
  expect(new Set(CHAPTER_NATIVE_SHEETS.map(s=>s.faction+'|'+s.unit)).size).toBe(66);
  expect(CHAPTER_NATIVE_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(154);
  expect(CHAPTER_KITS.reduce((n,s)=>n+s.roles.length,0)).toBe(81);
  expect(CHAPTER_NATIVE_REVISION).toMatchObject({manual:'1.6',manualFirstSeen:'2026-10-14',exportUpdated:'2026-11-23 01:43:36'});
  for(const [faction,n] of [['Blood Angels',14],['Dark Angels',16],['Black Templars',15],['Space Wolves',21]] as const)expect(CHAPTER_NATIVE_SHEETS.filter(s=>s.faction===faction)).toHaveLength(n);
  expect(CHAPTER_NATIVE_SHEETS.filter(s=>s.laterCopyPointsBySize)).toHaveLength(27);
  expect(CHAPTER_NATIVE_SHEETS.filter(s=>s.wargearPoints)).toHaveLength(9);
 });
 it('emits complete current memberships with no Legends, cross-chapter heroes or duplicated Venerable Dreadnought',()=>{
  for(const [faction,n] of [['Blood Angels',83],['Dark Angels',85],['Black Templars',75],['Space Wolves',88]] as const){
   expect(CHAPTER_MEMBERSHIP[faction]).toHaveLength(n);expect(new Set(CHAPTER_MEMBERSHIP[faction]).size).toBe(n);
   for(const name of ['Marneus Calgar','Kayvaan Shrike','Tactical Squad','Kill Team Cassius','Watch Master','Fortis Kill Team'])expect(CHAPTER_MEMBERSHIP[faction]).not.toContain(name);
  }
  expect(CHAPTER_MEMBERSHIP['Blood Angels']).not.toContain('Librarian Dreadnought');
  expect(CHAPTER_MEMBERSHIP['Dark Angels']).not.toContain('Deathwing Command Squad');
  expect(CHAPTER_MEMBERSHIP['Black Templars']).not.toContain('Librarian');
  expect(CHAPTER_MEMBERSHIP['Space Wolves']).not.toContain('Apothecary');
  expect(sheet('Space Wolves','Venerable Dreadnought')).toMatchObject({pointsBySize:{1:130},laterCopyPointsBySize:{3:{1:140}}});
 });
 it('preserves 25 native Leaders, four Supports and all shared chapter attachment additions',()=>{
  expect(CHAPTER_NATIVE_SHEETS.filter(s=>s.attachmentRole==='leader')).toHaveLength(25);
  expect(CHAPTER_NATIVE_SHEETS.filter(s=>s.attachmentRole==='support').map(s=>s.unit).sort()).toEqual(['Castellan','Crusade Ancient','Ravenwing Command Squad','Sanguinary Priest']);
  expect(CHAPTER_ATTACHMENTS['Blood Angels']['Captain With Jump Pack'].bodyguards).toContain('Sanguinary Guard');
  expect(CHAPTER_ATTACHMENTS['Blood Angels'].Chaplain.bodyguards).toContain('Death Company Marines');
  expect(CHAPTER_ATTACHMENTS['Dark Angels']['Ancient In Terminator Armour']).toMatchObject({attachmentRole:'support',bodyguards:expect.arrayContaining(['Deathwing Knights','Deathwing Terminator Squad'])});
  expect(CHAPTER_ATTACHMENTS['Dark Angels']['Captain on Bike'].bodyguards).toContain('Ravenwing Black Knights');
  expect(CHAPTER_ATTACHMENTS['Black Templars'].Apothecary.bodyguards).toEqual(expect.arrayContaining(['Crusader Squad','Sword Brethren Squad']));
  expect(CHAPTER_ATTACHMENTS['Space Wolves']['Librarian In Phobos Armour'].bodyguards).toContain('Wolf Scouts');
  expect(CHAPTER_ATTACHMENTS['Space Wolves']['Ancient In Terminator Armour'].bodyguards).toContain('Wolf Guard Terminators');
  expect(sheet('Dark Angels','Belial').bodyguards).not.toContain('Deathwing Command Squad');
 });
 it('preserves the actual Character owners in Grimaldus and Ravenwing Command, and distinct Headtaker/Wolf keywords',()=>{
  expect(sheet('Black Templars','Chaplain Grimaldus').keywords).not.toContain('CHARACTER');
  expect(sheet('Black Templars','Chaplain Grimaldus').modelKeywords).toEqual({'Chaplain Grimaldus':['CHAPLAIN','CHARACTER','EPIC HERO']});
  expect(sheet('Dark Angels','Ravenwing Command Squad').keywords).not.toContain('CHARACTER');
  expect(sheet('Dark Angels','Ravenwing Command Squad').modelKeywords).toEqual({'Ravenwing Champion':['CHARACTER']});
  expect(sheet('Space Wolves','Wolf Guard Headtakers').modelKeywords).toEqual({'Wolf Guard Headtaker':['INFANTRY','TACTICUS'],'Hunting Wolf':['BEASTS']});
  expect(spaceMarineModelLoadouts(squad('Chaplain Grimaldus',4),'Black Templars').map(m=>m.model)).toEqual(['Cenobyte Servitor','Cenobyte Servitor','Cenobyte Servitor','Chaplain Grimaldus']);
 });
 it('keeps the six Templar chassis under their actual names and separates their data from base Marines',()=>{
  const vehicles=['Impulsor','Gladiator Lancer','Gladiator Valiant','Gladiator Reaper','Repulsor Executioner','Repulsor'];
  for(const unit of vehicles){
   expect(sheet('Black Templars',unit)).toBeDefined();expect(spaceMarineCard(unit,'Black Templars')).not.toBe(spaceMarineCard(unit));
   expect(spaceMarineLoadout(unit,1,'Black Templars')).not.toEqual(spaceMarineLoadout(unit,1));
   expect(spaceMarineCard(unit,'Blood Angels')).toBe(spaceMarineCard(unit));
  }
  expect(spaceMarineLoadout('Sanguinary Guard',3)).toBeUndefined();
  expect(spaceMarineLoadout('Sanguinary Guard',3,'Blood Angels')).toBeDefined();
  expect(spaceMarineLoadout('Impulsor',1,'Orks')).toBeUndefined();
 });
 for(const s of CHAPTER_NATIVE_SHEETS)it(s.faction+' / '+s.unit+' has real physical equipment at every legal strength and can equip every printed weapon',()=>{
  const sizes=Object.keys(s.compositionBySize!).map(Number);
  for(const size of sizes){
   expect(validSpaceMarineGear(s.unit,{},size,s.faction)).toBe(true);
   const actual=spaceMarineModelLoadouts(squad(s.unit,size),s.faction);
   expect(actual).toHaveLength(size);expect(actual.every(m=>m.items.length>0)).toBe(true);
   expect(validSpaceMarineGear(s.unit,{invented:'weapon'},size,s.faction)).toBe(false);
  }
  for(const weapon of CHAPTER_CARDS[s.faction][s.unit].weapons){
   const reachable=sizes.some(size=>{
    const candidate=squad(s.unit,size);if(spaceMarineWeaponCount(candidate,weapon.name,s.faction))return true;
    return spaceMarineLoadout(s.unit,size,s.faction)!.slots.some(field=>field.choices.some(c=>{
     const gear={[field.name]:c.name};return validSpaceMarineGear(s.unit,gear,size,s.faction)&&spaceMarineWeaponCount({...candidate,knightGear:gear},weapon.name,s.faction)>0;
    }));
   });
   expect(reachable,weapon.name+' has a legal physical bearer').toBe(true);
  }
 });
});

describe('actual mixed chapter compositions and prices',()=>{
 it('preserves every legal Crusader, Headtaker and Scout composition through real equipment selection',()=>{
  let checked=0;
  for(const [faction,units] of Object.entries(CHAPTER_COMPOSITIONS))for(const [unit,sizes] of Object.entries(units))for(const [n,options] of Object.entries(sizes))for(const models of options){
   const size=+n,gear=composition(faction,unit,size,models),s=squad(unit,size,gear);
   expect(validSpaceMarineGear(unit,gear,size,faction)).toBe(true);
   expect(counts(s,faction)).toEqual(Object.fromEntries(Object.entries(models).filter(([,n])=>n)));
   expect(spaceMarineModelLoadouts(s,faction)).toHaveLength(size);checked++;
  }
  expect(checked).toBe(67);
 });
 it('distinguishes both six-model Headtaker prices and current later-copy costs',()=>{
  const faction='Space Wolves',unit='Wolf Guard Headtakers';
  for(const [headtakers,wolves,first,third] of [[3,0,85,95],[3,3,115,125],[6,0,170,180],[6,6,230,240]]){
   const models=headtakers+wolves,gear=composition(faction,unit,models,{'Wolf Guard Headtaker':headtakers,'Hunting Wolf':wolves}),s=squad(unit,models,gear);
   expect(spaceMarineCompositionPrice(s,1,faction)).toBe(first);expect(spaceMarineCompositionPrice(s,2,faction)).toBe(first);expect(spaceMarineCompositionPrice(s,3,faction)).toBe(third);
   expect(spaceMarineWeaponCount(s,'Heavy Bolt Pistol',faction)).toBe(headtakers);expect(spaceMarineWeaponCount(s,'Teeth and Claws',faction)).toBe(wolves);
  }
  expect(CHAPTER_COMPOSITION_PRICES[faction][unit]).toHaveLength(4);
 });
 it('charges an intermediate Headtaker composition at a printed tier covering each actual role',()=>{
  const faction='Space Wolves',unit='Wolf Guard Headtakers';
  for(const [headtakers,wolves,cost] of [[4,0,170],[5,0,170],[3,4,230],[4,3,230],[5,3,230],[6,5,230]]){
   const size=headtakers+wolves,s=squad(unit,size,composition(faction,unit,size,{'Wolf Guard Headtaker':headtakers,'Hunting Wolf':wolves}));
   expect(spaceMarineCompositionPrice(s,1,faction)).toBe(cost);
  }
  // Literal current header is 3–6 wolves; explicit priced blocks additionally
  // permit zero. One/two wolves are not inferred from the broad independent row.
  for(const options of Object.values(CHAPTER_COMPOSITIONS[faction][unit]))expect(options.every(c=>c['Hunting Wolf']===0||c['Hunting Wolf']>=3)).toBe(true);
  expect(spaceMarineCompositionPrice(squad('Blood Claws',10),1,faction)).toBeUndefined();
 });
 it('retains selected wolf counts and compatible Headtaker weapons when strength changes',()=>{
  const faction='Space Wolves',unit='Wolf Guard Headtakers';
  const comp=composition(faction,unit,6,{'Wolf Guard Headtaker':3,'Hunting Wolf':3});
  const gear={...comp,...choose(faction,unit,6,'Wolf Guard Headtaker','Storm Shield',0,comp)},s=squad(unit,6,gear);
  const larger=squad(unit,7,resizeSpaceMarineGear(s,7,faction));
  expect(counts(larger,faction)).toEqual({'Hunting Wolf':3,'Wolf Guard Headtaker':4});expect(spaceMarineWeaponCount(larger,'Storm Shield',faction)).toBe(1);
  const smaller=squad(unit,3,resizeSpaceMarineGear(larger,3,faction));
  expect(counts(smaller,faction)).toEqual({'Wolf Guard Headtaker':3});expect(smaller.knightGear).not.toHaveProperty('Unit composition');
  expect(validSpaceMarineGear(unit,smaller.knightGear!,3,faction)).toBe(true);expect(spaceMarineWeaponCount(smaller,'Storm Shield',faction)).toBe(1);
 });
 it('offers true intermediate Crusader and Wolf Scout compositions without weakening minimum roles',()=>{
  expect(Object.keys(sheet('Black Templars','Crusader Squad').compositionBySize!)).toEqual(Array.from({length:11},(_,i)=>String(i+10)));
  expect(Object.keys(sheet('Space Wolves','Wolf Scouts').compositionBySize!)).toEqual(['6','7','8','9','10','11','12']);
  const faction='Black Templars',unit='Crusader Squad',comp=composition(faction,unit,15,{'Sword Brother':1,Initiate:6,Neophyte:8});
  const s=squad(unit,15,{...comp,...choose(faction,unit,15,'Neophyte','Shotgun',0,comp)});
  expect(counts(s,faction)).toEqual({Initiate:6,Neophyte:8,'Sword Brother':1});
  const smaller=squad(unit,14,resizeSpaceMarineGear(s,14,faction));
  expect(counts(smaller,faction)).toEqual({Initiate:5,Neophyte:8,'Sword Brother':1});expect(spaceMarineWeaponCount(smaller,'Shotgun',faction)).toBe(1);
  expect(validSpaceMarineGear(unit,{'Unit composition':'1 × Sword Brother + 4 × Initiate + 10 × Neophyte'},15,faction)).toBe(false);
 });
});

describe('chapter-specific equipment and printed caps',()=>{
 it('keeps Deathwing Watchers on the unit and the four Knights’ shared weapons separate from their Master',()=>{
  const faction='Dark Angels',unit='Deathwing Knights',gear={...choose(faction,unit,5,'Deathwing Knight weapons','Power Weapon'),...choose(faction,unit,5,'Knight Master','Relic Weapon'),'Watcher in the Dark':'Watcher in the Dark'},s=squad(unit,5,gear);
  expect(validSpaceMarineGear(unit,gear,5,faction)).toBe(true);expect(spaceMarineWeaponCount(s,'Power Weapon',faction)).toBe(4);expect(spaceMarineWeaponCount(s,'Relic Weapon',faction)).toBe(1);
  expect(spaceMarineWeaponCount(s,'Watcher in the Dark',faction)).toBe(1);expect(spaceMarineModelLoadouts(s,faction).flatMap(m=>m.items)).not.toContain('Watcher in the Dark');
  expect(spaceMarineHasRangedWeapon(s,faction)).toBe(false);
  expect(spaceMarineWeaponCount(squad('Deathwing Terminator Squad',7,{'Watcher in the Dark':'Watcher in the Dark'}),'Watcher in the Dark',faction)).toBe(1);
 });
 it('counts paid Deathwing Cyclones only on eligible Terminators and enforces the actual five-model threshold',()=>{
  const faction='Dark Angels',unit='Deathwing Terminator Squad',one=choose(faction,unit,9,'Deathwing Terminators','Cyclone Missile Launcher'),two=choose(faction,unit,9,'Deathwing Terminators','Cyclone Missile Launcher',1);
  expect(validSpaceMarineGear(unit,one,9,faction)).toBe(true);expect(validSpaceMarineGear(unit,{...one,...two},9,faction)).toBe(false);expect(validSpaceMarineGear(unit,{...one,...two},10,faction)).toBe(true);
  expect(spaceMarineWeaponCount(squad(unit,10,{...one,...two}),'Storm Bolter',faction)).toBe(10);
  expect(spaceMarineLoadout(unit,5,faction)!.slots.filter(s=>s.name.startsWith('Deathwing Sergeant')).some(s=>s.choices.some(c=>c.items.some(i=>key(i)==='cyclonemissilelauncher')))).toBe(false);
 });
 it('shares the Ravenwing grenade allowance across every actual role',()=>{
  const faction='Dark Angels',unit='Ravenwing Command Squad',a=choose(faction,unit,3,'Ravenwing Ancient','Grenade Launcher'),b=choose(faction,unit,3,'Ravenwing Champion','Grenade Launcher');
  expect(validSpaceMarineGear(unit,a,3,faction)).toBe(true);expect(validSpaceMarineGear(unit,{...a,...b},3,faction)).toBe(false);
  expect(spaceMarineWeaponCount(squad(unit,3,a),'Plasma Talon',faction)).toBe(2);
 });
 it('preserves the Templar Valiant’s two stock Multi-meltas and optional third, with every printed surcharge',()=>{
  const faction='Black Templars',unit='Gladiator Valiant',s=squad(unit,1),loadout=spaceMarineLoadout(unit,1,faction)!;
  expect(spaceMarineWeaponCount(s,'Multi-melta',faction)).toBe(2);
  const field=loadout.slots[0],extra=field.choices.find(c=>c.items.filter(i=>key(i)==='multimelta').length===3)!;
  expect(spaceMarineWeaponCount({...s,knightGear:{[field.name]:extra.name}},'Multi-melta',faction)).toBe(3);
  expect(sheet(faction,unit)).toMatchObject({pointsBySize:{1:145},wargearPoints:{'Multi-melta':10},laterCopyPointsBySize:{3:{1:165}}});
  expect(sheet(faction,'Repulsor Executioner').wargearPoints).toEqual({'Multi-melta':10});
  expect(sheet(faction,'Impulsor').wargearPoints).toEqual({'Multi-melta':10,'Orbital Comms Array':10});
 });
 it('restores every Sword Brethren cap at four- and eight-model boundaries',()=>{
  const faction='Black Templars',unit='Sword Brethren Squad';
  expect(Object.keys(sheet(faction,unit).compositionBySize!)).toEqual(['4','5','6','7','8','9','10']);
  for(const [item,allowance] of [['Hand flamer',2],['Thunder hammer',1],['Plasma pistol',1],['Twin lightning claws',1]] as const)for(const size of [4,7,8,10]){
   const limit=Math.floor(size/4)*allowance,gear=Object.assign({},...Array.from({length:limit},(_,n)=>choose(faction,unit,size,'Sword Brother',item,n)));
   expect(validSpaceMarineGear(unit,gear,size,faction),item+' at '+size).toBe(true);
   expect(validSpaceMarineGear(unit,{...gear,...choose(faction,unit,size,'Sword Brother',item,limit)},size,faction),item+' overflow at '+size).toBe(false);
  }
 });
 it('caps Crusader special weapons across Power Fists and Pyreblasters combined',()=>{
  const faction='Black Templars',unit='Crusader Squad',a=choose(faction,unit,19,'Initiate','Power Fist'),b=choose(faction,unit,19,'Initiate','Pyreblaster',1),c=choose(faction,unit,19,'Initiate','Power Fist',2);
  expect(validSpaceMarineGear(unit,{...a,...b},19,faction)).toBe(true);expect(validSpaceMarineGear(unit,{...a,...b,...c},19,faction)).toBe(false);expect(validSpaceMarineGear(unit,{...a,...b,...c},20,faction)).toBe(true);
 });
 it('keeps the Execrator’s additional weapon dependent on retaining the bolt pistol',()=>{
  const faction='Black Templars',unit='Execrator',a=exact(faction,unit,1,['Absolvor bolt pistol','Crozius arcanum','Master-crafted power weapon']),b=exact(faction,unit,1,['Crozius arcanum','Hand flamer']);
  expect(validSpaceMarineGear(unit,a,1,faction)).toBe(true);expect(validSpaceMarineGear(unit,b,1,faction)).toBe(true);
  expect(spaceMarineLoadout(unit,1,faction)!.slots.flatMap(s=>s.choices).some(c=>c.items.some(i=>key(i)==='handflamer')&&c.items.some(i=>key(i)==='mastercraftedpowerweapon'))).toBe(false);
 });
 it('caps Death Company foot pistols as one combined allowance and keeps grenade launchers on rifles',()=>{
  const faction='Blood Angels',unit='Death Company Marines',a=choose(faction,unit,10,'Death Company Marines','Inferno Pistol'),b=choose(faction,unit,10,'Death Company Marines','Plasma Pistol',1);
  expect(validSpaceMarineGear(unit,a,10,faction)).toBe(true);expect(validSpaceMarineGear(unit,{...a,...b},10,faction)).toBe(false);
  const grenade=choose(faction,unit,10,'Death Company Marines','Grenade Launcher');expect(spaceMarineModelLoadouts(squad(unit,10,grenade),faction).filter(m=>m.items.includes('Grenade Launcher')).every(m=>m.items.some(i=>key(i)==='boltrifle'))).toBe(true);
 });
 it('keeps Jump Death Company special weapons at their distinct printed caps',()=>{
  const faction='Blood Angels',unit='Death Company Marines With Jump Packs';
  for(const [item,n] of [['Eviscerator',1],['Power fist',1],['Hand flamer',1],['Inferno pistol',1],['Plasma pistol',2],['Power weapon',2]] as const){
   const gear=Object.assign({},...Array.from({length:n},(_,i)=>choose(faction,unit,9,'Death Company Marines',item,i)));
   expect(validSpaceMarineGear(unit,gear,9,faction)).toBe(true);expect(validSpaceMarineGear(unit,{...gear,...choose(faction,unit,9,'Death Company Marines',item,n)},9,faction)).toBe(false);
  }
 });
 it('prevents a Jump Death Company Captain from combining a shield with an unprinted melee exchange',()=>{
  const faction='Blood Angels',unit='Death Company Captain with Jump Pack';
  for(const items of [['Chainsword','Relic shield'],['Relic shield','Thunder hammer']])expect(validSpaceMarineGear(unit,exact(faction,unit,1,items),1,faction)).toBe(true);
  expect(spaceMarineLoadout(unit,1,faction)!.slots.flatMap(s=>s.choices).some(c=>c.items.some(i=>key(i)==='relicshield')&&c.items.some(i=>key(i)==='powerfist'))).toBe(false);
 });
 it('keeps Wolf Scout one-model specials, Haywire bearer prerequisite and twelve-model carbine threshold',()=>{
  const faction='Space Wolves',unit='Wolf Scouts';
  for(const item of ['Runic Stave','Plasma Gun']){
   const a=choose(faction,unit,12,'Wolf Scout ',item),b=choose(faction,unit,12,'Wolf Scout ',item,1);
   expect(validSpaceMarineGear(unit,a,12,faction)).toBe(true);expect(validSpaceMarineGear(unit,{...a,...b},12,faction)).toBe(false);
  }
  const mine=choose(faction,unit,12,'Wolf Scout Pack Leader','Haywire Mine (Once per battle, per unit)'),another=choose(faction,unit,12,'Wolf Scout 1 ·','Haywire Mine (Once per battle, per unit)');
  expect(validSpaceMarineGear(unit,mine,12,faction)).toBe(true);expect(validSpaceMarineGear(unit,{...mine,...another},12,faction)).toBe(false);
  const carbine=choose(faction,unit,12,'Wolf Scout ','Instigator Bolt Carbine');expect(validSpaceMarineGear(unit,carbine,12,faction)).toBe(true);expect(validSpaceMarineGear(unit,carbine,11,faction)).toBe(false);
  for(const field of spaceMarineLoadout(unit,12,faction)!.slots)for(const option of field.choices)if(option.items.some(i=>key(i).startsWith('haywiremine')))expect(option.items.some(i=>key(i)==='plasmapistol')).toBe(true);
 });
 it('keeps paid Wolf Guard and Thunderwolf shields on actual selected bearers',()=>{
  for(const [unit,models,role] of [['Wolf Guard Terminators',5,'Wolf Guard Terminator'],['Thunderwolf Cavalry',3,'Thunderwolf Cavalry']] as const){
   const gear=choose('Space Wolves',unit,models,role,'Storm Shield'),s=squad(unit,models,gear);
   expect(validSpaceMarineGear(unit,gear,models,'Space Wolves')).toBe(true);expect(spaceMarineWeaponCount(s,'Storm Shield','Space Wolves')).toBe(1);expect(sheet('Space Wolves',unit).wargearPoints).toEqual({'Storm Shield':5});
  }
 });
});

describe('physical model assignments for pre-battle splits',()=>{
 it('assigns stable physical identities independently of selected weapons and same-name squad copies',()=>{
  const faction='Space Wolves',unit='Grey Hunters',original=squad(unit,10),equipped=squad(unit,10,choose(faction,unit,10,'Grey Hunter Pack Leader','Power Fist'));
  const before=spaceMarineModelIdentities(original,faction),after=spaceMarineModelIdentities(equipped,faction),other=spaceMarineModelIdentities({...equipped,id:unit+'#2'},faction);
  expect(before.map(m=>m.id)).toEqual(after.map(m=>m.id));expect(new Set(before.map(m=>m.id)).size).toBe(10);
  expect(after.find(m=>m.model==='Grey Hunter Pack Leader')?.id).toBe('Grey Hunters#1::Grey Hunter Pack Leader#1');
  expect(after.find(m=>m.model==='Grey Hunter Pack Leader')?.items).toContain('Power fist');
  expect(other.some(m=>before.some(b=>b.id===m.id))).toBe(false);
 });
 it('offers an optional Grey Hunter split without changing the purchased unit or its equipment',()=>{
  const faction='Space Wolves',unit='Grey Hunters',original=squad(unit,10),split=squad(unit,10,{'Battle formation':'Split unit'});
  expect(spaceMarineSplitSelection(original,faction)).toBeUndefined();
  expect(spaceMarineLoadout(unit,10,faction)!.slots.filter(s=>s.name.endsWith(' · Split group'))).toHaveLength(0);
  expect(spaceMarineLoadout(unit,10,faction,split.knightGear)!.slots.filter(s=>s.name.endsWith(' · Split group'))).toHaveLength(10);
  expect(spaceMarineModelLoadouts(original,faction)).toEqual(spaceMarineModelLoadouts(split,faction));
  expect(spaceMarineSplitSelection(split,faction)).toMatchObject({rule:'Old Greymanes',kind:'equal',attachments:'choose',leaderGroup:'Automatic',supportGroup:'Automatic'});
  expect(spaceMarineSplitSelection(split,faction)!.groups.map(g=>g.modelIds.length)).toEqual([5,5]);
  expect(spaceMarineWeaponCount(split,'Bolt Carbine',faction)).toBe(10);
 });
 it('moves the actual upgraded Pack Leader between split parts without copying its weapons',()=>{
  const faction='Space Wolves',unit='Grey Hunters',gear={'Battle formation':'Split unit',...choose(faction,unit,10,'Grey Hunter Pack Leader','Power Fist'),...choose(faction,unit,10,'Grey Hunter Pack Leader','Plasma Pistol'),'Grey Hunter Pack Leader · Split group':'Group 2','Grey Hunter 5 · Split group':'Group 1'},s=squad(unit,10,gear);
  expect(validSpaceMarineGear(unit,gear,10,faction)).toBe(true);
  const actual=spaceMarineModelIdentities(s,faction),plan=spaceMarineSplitSelection(s,faction)!;
  expect(plan.groups.map(g=>g.modelIds.length)).toEqual([5,5]);
  const groupItems=plan.groups.map(g=>actual.filter(m=>g.modelIds.includes(m.id)).flatMap(m=>m.items));
  expect(groupItems[0]).not.toContain('Plasma pistol');expect(groupItems[0]).not.toContain('Power fist');
  expect(groupItems[1].filter(i=>i==='Plasma pistol')).toHaveLength(1);expect(groupItems[1].filter(i=>i==='Power fist')).toHaveLength(1);
  expect(new Set(plan.groups.flatMap(g=>g.modelIds)).size).toBe(10);
 });
 it('preserves attachment preferences for the formation layer to balance against original attached physical models',()=>{
  const faction='Space Wolves',unit='Grey Hunters',gear={'Battle formation':'Split unit','Leader group':'Group 2','Support group':'Group 1','Grey Hunter Pack Leader · Split group':'Group 2'},s=squad(unit,10,gear);
  // This is a structurally valid 4/6 bodyguard allocation. The formation layer
  // determines whether attached models make the complete groups equally sized.
  expect(validSpaceMarineGear(unit,gear,10,faction)).toBe(true);
  expect(spaceMarineSplitSelection(s,faction)).toMatchObject({leaderGroup:'Group 2',supportGroup:'Group 1'});
  expect(spaceMarineSplitSelection(s,faction)!.groups.map(g=>g.modelIds.length)).toEqual([4,6]);
  expect(validSpaceMarineGear(unit,{...gear,'Leader group':'Group 3'},10,faction)).toBe(false);
  expect(validSpaceMarineGear(unit,{...gear,'Grey Hunter 1 · Split group':'Group 3'},10,faction)).toBe(false);
 });
 it('keeps every Headtaker with its attached models and every actual Hunting Wolf in the other part',()=>{
  const faction='Space Wolves',unit='Wolf Guard Headtakers';
  for(const [size,options] of Object.entries(CHAPTER_COMPOSITIONS[faction][unit]))for(const models of options.filter(c=>c['Hunting Wolf'])){
   const gear={...composition(faction,unit,+size,models),'Battle formation':'Split unit'},s=squad(unit,+size,gear),plan=spaceMarineSplitSelection(s,faction)!,actual=spaceMarineModelIdentities(s,faction);
   expect(validSpaceMarineGear(unit,gear,+size,faction)).toBe(true);
   expect(plan).toMatchObject({rule:'Let Loose the Wolves',kind:'roles',attachments:'headtakers',leaderGroup:'Group 1',supportGroup:'Group 1'});
   expect(plan.groups.map(g=>g.modelIds.length)).toEqual([models['Wolf Guard Headtaker'],models['Hunting Wolf']]);
   expect(actual.filter(m=>plan.groups[0].modelIds.includes(m.id)).every(m=>m.model==='Wolf Guard Headtaker')).toBe(true);
   expect(actual.filter(m=>plan.groups[1].modelIds.includes(m.id)).every(m=>m.model==='Hunting Wolf')).toBe(true);
   expect(spaceMarineCompositionPrice(s,1,faction)).toBe(spaceMarineCompositionPrice({...s,knightGear:{...gear,'Battle formation':'Keep together'}},1,faction));
  }
 });
 it('does not split Headtakers without wolves or allow manual reassignment of their fixed roles',()=>{
  const faction='Space Wolves',unit='Wolf Guard Headtakers',s=squad(unit,6),invalid=squad(unit,6,{'Battle formation':'Split unit'});
  expect(spaceMarineLoadout(unit,6,faction)!.slots.some(s=>s.name==='Battle formation')).toBe(false);
  expect(spaceMarineSplitSelection(s,faction)).toBeUndefined();expect(spaceMarineSplitSelection(invalid,faction)).toBeUndefined();
  expect(validSpaceMarineGear(unit,invalid.knightGear!,6,faction)).toBe(false);
  const mixed={...composition(faction,unit,6,{'Wolf Guard Headtaker':3,'Hunting Wolf':3}),'Battle formation':'Split unit','Leader group':'Group 2'};
  expect(validSpaceMarineGear(unit,mixed,6,faction)).toBe(false);
 });
 it('retains stable existing Headtaker and wolf identities after a composition resize',()=>{
  const faction='Space Wolves',unit='Wolf Guard Headtakers',gear={...composition(faction,unit,6,{'Wolf Guard Headtaker':3,'Hunting Wolf':3}),'Battle formation':'Split unit'},s=squad(unit,6,gear),larger=squad(unit,9,resizeSpaceMarineGear(s,9,faction));
  const before=spaceMarineModelIdentities(s,faction),after=spaceMarineModelIdentities(larger,faction);
  expect(before.every(m=>after.some(a=>a.id===m.id))).toBe(true);
  expect(spaceMarineSplitSelection(larger,faction)!.groups.map(g=>g.modelIds.length)).toEqual([6,3]);
  const smaller=squad(unit,3,resizeSpaceMarineGear(larger,3,faction));
  expect(smaller.knightGear).not.toHaveProperty('Battle formation');expect(spaceMarineSplitSelection(smaller,faction)).toBeUndefined();
  expect(validSpaceMarineGear(unit,smaller.knightGear!,3,faction)).toBe(true);
 });
 it('reopens exact Grey Hunter assignments and removes obsolete split controls when keeping the unit together',()=>{
  const faction='Space Wolves',unit='Grey Hunters',gear={'Battle formation':'Split unit','Leader group':'Group 2','Support group':'Group 1','Grey Hunter Pack Leader · Split group':'Group 2','Grey Hunter 5 · Split group':'Group 1',...choose(faction,unit,10,'Grey Hunter Pack Leader','Power Fist')},s=squad(unit,10,gear),reopened=JSON.parse(JSON.stringify(s)) as RosterInstance;
  expect(spaceMarineSplitSelection(reopened,faction)).toEqual(spaceMarineSplitSelection(s,faction));
  expect(spaceMarineModelIdentities(reopened,faction)).toEqual(spaceMarineModelIdentities(s,faction));
  const joined=squad(unit,10,resizeSpaceMarineGear({...s,knightGear:{...gear,'Battle formation':'Keep together'}},10,faction));
  expect(spaceMarineSplitSelection(joined,faction)).toBeUndefined();expect(Object.keys(joined.knightGear!).some(k=>k.endsWith(' · Split group')||k==='Leader group'||k==='Support group')).toBe(false);
  expect(spaceMarineWeaponCount(joined,'Power Fist',faction)).toBe(1);expect(validSpaceMarineGear(unit,joined.knightGear!,10,faction)).toBe(true);
 });
});
