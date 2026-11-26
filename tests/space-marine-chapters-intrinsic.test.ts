// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection,type Faction} from '../src/catalog';
import {CHAPTER_NATIVE_SHEETS} from '../src/space-marine-chapters-native.generated';
import {CHAPTER_CARDS,CHAPTER_PROFILE_LIMITATIONS} from '../src/space-marine-chapters-card-profiles.generated';
import {CHAPTER_INTRINSIC_INVENTORY} from '../src/space-marine-chapters-intrinsic.generated';
import {chapterIntrinsicReminders,CHAPTER_DELEGATED_INTRINSIC} from '../src/space-marine-chapters-intrinsic';
import {spaceMarineCard} from '../src/space-marines-card-data';
import {spaceMarineSheet} from '../src/space-marines-data';
import {spaceMarineLoadout,spaceMarineModelLoadouts,spaceMarineWeaponCount,validSpaceMarineGear} from '../src/space-marines-loadouts';
import {spaceMarineFormations} from '../src/space-marines-formations';
import {chapterSplitPlans} from '../src/space-marine-chapters-splits';
import {spaceMarineMusterUnits} from '../src/space-marines-muster-data';
import {spaceMarineDatasheetCoreReminders,spaceMarineFormationScoutRange} from '../src/space-marines-datasheet-core';
import {spaceMarineIntrinsicReminders} from '../src/space-marines-intrinsic';
import {spaceMarineFullWeaponProfiles,spaceMarineWeaponText} from '../src/space-marines-weapons';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
const key=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
function army(faction:Faction,names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:spaceMarineSheet(unit,faction)?.sizes[0]??1,keepUnattached:true});}
 return {...newSelection(faction),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string):ArmySelection=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body),keepUnattached:false}:s)});
const without=(a:ArmySelection,...units:string[])=>a.instances!.filter(s=>!units.includes(s.unit));
const size=(a:ArmySelection,unit:string,models:number):ArmySelection=>({...a,instances:a.instances!.map(s=>s.id===id(unit)?{...s,models}:s)});
const rules=(a:ArmySelection,title:string,roster?:RosterInstance[])=>chapterIntrinsicReminders(a,roster).filter(r=>r.title===title||r.title.startsWith(title+' (')||r.title.endsWith(' · '+title)||r.title.includes(' · '+title+' ('));
const text=(a:ArmySelection,title:string,roster?:RosterInstance[])=>rules(a,title,roster).map(r=>r.summary).join(' ');
const core=(a:ArmySelection,title:string)=>spaceMarineDatasheetCoreReminders(a).filter(r=>r.title.endsWith(' · '+title));
function equip(a:ArmySelection,unit:string,item:string,which=0):ArmySelection{
 const squad=a.instances!.find(s=>s.id===id(unit))!;
 const choices=spaceMarineLoadout(unit,squad.models,a.faction,squad.knightGear)!.slots.flatMap(field=>field.choices.filter(c=>c.items.some(i=>key(i)===key(item))||key(c.name)===key(item)).map(choice=>({field,choice})))
  .filter(({field,choice})=>validSpaceMarineGear(unit,{...squad.knightGear,[field.name]:choice.name},squad.models,a.faction));
 const chosen=choices[which];if(!chosen)throw Error('Missing legal '+unit+' / '+item);
 return {...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear:{...s.knightGear,[chosen.field.name]:chosen.choice.name}}:s)};
}
function fixture(faction:Faction,unit:string){
 const sheet=spaceMarineSheet(unit,faction)!,body=unit==='Ragnar Blackmane'?'Blood Claws':sheet.bodyguards?.[0];
 const auxiliary=faction==='Blood Angels'?['Baal Predator','Death Company Marines']:faction==='Dark Angels'?['Deathwing Terminator Squad','Land Speeder Vengeance']:faction==='Black Templars'?['Crusader Squad','Impulsor']:['Blood Claws','Wulfen','Venerable Dreadnought'];
 let a=army(faction,[...new Set([unit,...body?[body]:[],...auxiliary])]);
 if(body)a=join(a,unit,body);
 return a;
}

describe('four chapters complete current source inventory',()=>{
 it('contains all 66 cards, 151 named rules, 92 core rules and 316 full profiles',()=>{
  expect(CHAPTER_NATIVE_SHEETS).toHaveLength(66);
  expect(Object.values(CHAPTER_INTRINSIC_INVENTORY).flatMap(v=>Object.values(v).flat())).toHaveLength(151);
  const cards=Object.values(CHAPTER_CARDS).flatMap(v=>Object.values(v));
  expect(cards.flatMap(c=>c.core??[])).toHaveLength(92);expect(cards.flatMap(c=>c.weapons)).toHaveLength(316);
  for(const faction of ['Blood Angels','Dark Angels','Black Templars','Space Wolves']){
   const expected=CHAPTER_NATIVE_SHEETS.filter(s=>s.faction===faction).map(s=>s.unit).sort();
   expect(Object.keys(CHAPTER_CARDS[faction]).sort()).toEqual(expected);
   expect(Object.keys(CHAPTER_INTRINSIC_INVENTORY[faction]).sort()).toEqual(expected);
  }
  for(const entries of Object.values(CHAPTER_INTRINSIC_INVENTORY).flatMap(v=>Object.values(v)))for(const e of entries){expect(e.source).toContain('/wh40k11ed/');expect(e.sourceHash).toMatch(/^[a-f0-9]{64}$/);}
  for(const c of cards)for(const w of c.weapons){expect(w.range).toBeTruthy();expect(w.attacks).toBeTruthy();expect(w.skill).toBeTruthy();expect(w.damage).toBeTruthy();expect(Number.isFinite(w.strength)).toBe(true);expect(Number.isFinite(w.ap)).toBe(true);}
 });
 for(const s of CHAPTER_NATIVE_SHEETS)it(s.faction+' / '+s.unit+' executes every named entry or delegates to an explicit shared owner',()=>{
  const a=fixture(s.faction,s.unit),variants:ArmySelection[]=[];
  for(const n of new Set([s.sizes[0],s.sizes.at(-1)!])){
   const base=size(a,s.unit,n),squad=base.instances!.find(r=>r.unit===s.unit)!;variants.push(base);
   for(const field of spaceMarineLoadout(s.unit,n,s.faction)!.slots)for(const choice of field.choices){
    const knightGear={[field.name]:choice.name};
    if(validSpaceMarineGear(s.unit,knightGear,n,s.faction))variants.push({...base,instances:base.instances!.map(r=>r.id===squad.id?{...r,knightGear}:r)});
   }
  }
  const actual=new Set(variants.flatMap(v=>chapterIntrinsicReminders(v).filter(r=>r.units?.includes(id(s.unit))).map(r=>r.title)));
  for(const entry of CHAPTER_INTRINSIC_INVENTORY[s.faction][s.unit])expect(actual.has(entry.name)||(CHAPTER_DELEGATED_INTRINSIC[s.faction]?.[s.unit]??[]).includes(entry.name),entry.name).toBe(true);
 });
 it('has no generic fallback for empty armies, base Space Marines or unrelated factions',()=>{
  for(const faction of ['Blood Angels','Dark Angels','Black Templars','Space Wolves','Space Marines','Necrons'] as const)expect(chapterIntrinsicReminders(army(faction,[]))).toEqual([]);
  expect(chapterIntrinsicReminders(army('Space Marines',['Captain','Intercessor Squad']))).toEqual([]);
 });
 it('keeps six Templar chassis separate and consumes their common abilities through the shared runtime',()=>{
  const vehicles=['Impulsor','Gladiator Lancer','Gladiator Reaper','Gladiator Valiant','Repulsor','Repulsor Executioner'];
  for(const unit of vehicles){expect(spaceMarineCard(unit,'Black Templars')).toBe(CHAPTER_CARDS['Black Templars'][unit]);expect(spaceMarineCard(unit,'Black Templars')).not.toBe(spaceMarineCard(unit));}
  const a=army('Black Templars',vehicles),r=spaceMarineIntrinsicReminders(a);
  for(const title of ['Aquilon Optics','Priority Target Acquisition','Reaping Tally','Executioner'])expect(r.some(v=>v.title===title),title).toBe(true);
  expect(chapterIntrinsicReminders(a)).toEqual([]);
  const b=equip(a,'Impulsor','Shield Dome');expect(core(b,'Shield Dome').length).toBeGreaterThan(0);
  const c=equip(a,'Impulsor','Orbital Comms Array');expect(core(c,'Orbital Comms Array')).toHaveLength(1);
 });
});

describe('chapter source lifetime and exact duration',()=>{
 it('retains Ragnar’s own original Blood Claws rule after the Bodyguard dies, without retaining its source ability',()=>{
  const a=join(army('Space Wolves',['Ragnar Blackmane','Blood Claws']),'Ragnar Blackmane','Blood Claws');
  expect(text(a,'War Howl',without(a,'Blood Claws'))).toContain('+1 Strength and Sustained Hits 1');
  expect(rules(a,'Berserk Charge',without(a,'Blood Claws'))).toEqual([]);
  expect(rules(a,'War Howl',without(a,'Ragnar Blackmane'))).toEqual([]);
  expect(rules(army('Space Wolves',['Ragnar Blackmane']),'War Howl')).toEqual([]);
 });
 it('preserves already selected recipients after Azrael dies but never selects a fresh recipient',()=>{
  const a=army('Dark Angels',['Azrael','Deathwing Terminator Squad']),live=without(a,'Azrael');
  expect(rules(a,'Masterful Tactician',live)).toEqual([]);
  const t=text(a,'Masterful Tactician · chosen recipient',live);expect(t).toContain('Only the formation already chosen');expect(t).toContain('until the start of your next Command phase');expect(t).toContain('source is destroyed');
 });
 it('keeps Transfixing Gaze and Murderous Hurricane in their own Movement phases only',()=>{
  const ba=army('Blood Angels',['Chief Librarian Mephiston']);
  expect(text(ba,'Transfixing Gaze')).toContain('Until this Movement phase ends');
  expect(rules(ba,'Transfixing Gaze · active psychic effect').every(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);
  const sw=army('Space Wolves',['Njal Stormcaller','Blood Claws']);
  const active=rules(sw,'Murderous Hurricane · chosen enemy');expect(active).toHaveLength(1);expect(active[0]).toMatchObject({window:'Movement',turn:'own',timing:'end'});
  expect(active[0].summary).toContain('does not persist into Shooting or Charge');
 });
 it('keeps the Watcher protection to the triggering phase and the bomb through next opponent Movement',()=>{
  const a=army('Dark Angels',['Azrael','Deathwing Terminator Squad','Ravenwing Dark Talon']);
  expect(text(a,'Watcher in the Dark')).toContain('until this phase ends');
  expect(text(a,'Watcher in the Dark · active protection',without(a,'Azrael'))).toBe('');
  const b=join(army('Dark Angels',['Azrael','Intercessor Squad','Ravenwing Dark Talon']),'Azrael','Intercessor Squad');
  expect(text(b,'Watcher in the Dark · active protection',without(b,'Azrael'))).toContain('until this phase ends');
  expect(text(b,'Stasis Bomb · slowed enemy',without(b,'Ravenwing Dark Talon'))).toContain('through the end of the opponent’s next Movement phase');
  expect(rules(b,'Stasis Bomb · slowed enemy').every(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);
 });
 it('keeps an already activated psychic ward after its source dies within the original formation',()=>{
  const a=join(army('Dark Angels',['Ezekiel','Inner Circle Companions']),'Ezekiel','Inner Circle Companions'),live=without(a,'Ezekiel');
  expect(rules(a,'Whispers of the Shadow Forest',live)).toEqual([]);
  const t=text(a,'Whispers of the Shadow Forest · active psychic effect',live);expect(t).toContain('until this phase ends');expect(t).toContain('source is destroyed');
  expect(rules(a,'Book of Salvation',live)).toEqual([]);
 });
 it('retains pending personal death triggers even when the surviving roster is empty',()=>{
  for(const unit of ['Death Company Captain','Death Company Captain with Jump Pack']){
   const r=rules(army('Blood Angels',[unit]),'Death Visions of Sanguinius',[]);expect(r).toHaveLength(1);expect(r[0].summary).toContain('D6, +2');expect(r[0].summary).toContain('that attacking enemy');
  }
  for(const [faction,unit,title] of [['Dark Angels','Belial','Strikes of Retribution'],['Space Wolves','Wolf Guard Battle Leader','Heroic Last Stand']] as const){
   const t=text(army(faction,[unit]),title,[]);expect(t).toContain('2+');expect(t).toContain('whichever comes first');expect(t).toContain('does not restore the model');
  }
 });
 it('limits a selected Grimaldus relic to one and distinguishes the choosing Servitor from the lasting source',()=>{
  const a=join(army('Black Templars',['Chaplain Grimaldus','Crusader Squad']),'Chaplain Grimaldus','Crusader Squad');
  expect(text(a,'Temple Relics')).toContain('choose up to one');expect(text(a,'Temple Relics')).toContain('Losing the last Servitor after selection does not end');
  expect(text(a,'Faithful Cenobytes')).toContain('0 transport spaces');expect(text(a,'Faithful Cenobytes')).toContain('remaining Cenobyte Servitor');
  for(const title of ['Banner of the Emperor Victorious','Column from the Major Altar','Water from the Stoup of Elucidation']){expect(text(a,title)).toContain('Only if this is Grimaldus’s selected');expect(rules(a,title,without(a,'Chaplain Grimaldus'))).toEqual([]);}
 });
 it('preserves an activated Castellan or Ancient effect for its surviving original formation',()=>{
  const a=join(join(army('Black Templars',['Marshal','Castellan','Crusader Squad']),'Marshal','Crusader Squad'),'Castellan','Crusader Squad');
  expect(text(a,'Vehement Aggression · active effect',without(a,'Castellan'))).toContain('only if the Leadership roll succeeded');
  const b=join(join(army('Black Templars',['Marshal','Crusade Ancient','Crusader Squad']),'Marshal','Crusader Squad'),'Crusade Ancient','Crusader Squad');
  expect(text(b,'Vengeful Exhortation · active effect',without(b,'Crusade Ancient'))).toContain('only this Fight phase');
 });
});

describe('chapter actual equipment, models and current profiles',()=>{
 it('retains the current independent reconciliation corrections without obsolete Pistol semantics',()=>{
  expect(CHAPTER_CARDS['Blood Angels']['Chief Librarian Mephiston'].save).toBe(4);
  expect(CHAPTER_CARDS['Space Wolves']['Bjorn The Fell-handed'].weapons.find(w=>w.name==='Assault Cannon')?.skill).toBe('2');
  expect(CHAPTER_CARDS['Black Templars'].Castellan.weapons.find(w=>w.name==='Heavy Bolt Pistol')).toMatchObject({strength:4,abilities:['pistol']});
  expect(CHAPTER_PROFILE_LIMITATIONS).toEqual({});
  expect(CHAPTER_CARDS['Dark Angels']['Ravenwing Darkshroud'].core).toContain('Lone Operative 15"');
  expect(CHAPTER_CARDS['Blood Angels']['Death Company Captain with Jump Pack'].core).toContain('Leader');
  for(const [unit,name] of [['Iron Priest','Helfrost Pistol - Dispersed'],['Murderfang','Heavy Flamer'],['Wulfen Dreadnought','Heavy Flamer']])expect(CHAPTER_CARDS['Space Wolves'][unit].weapons.find(w=>w.name===name)).toMatchObject({skill:'7',abilities:expect.arrayContaining(['torrent'])});
 });
 it('keeps actual Hunter target restrictions and profile choice attached to the equipped Chainfist',()=>{
  const a=army('Dark Angels',['Deathwing Terminator Squad']);expect(spaceMarineFullWeaponProfiles(a,a.instances![0]).some(w=>w.name.includes('Chainfist'))).toBe(false);
  const b=equip(a,'Deathwing Terminator Squad','Chainfist');
  const w=spaceMarineFullWeaponProfiles(b,b.instances![0]).filter(w=>w.name.includes('Chainfist'));expect(w).toHaveLength(2);expect(w.find(p=>p.name.endsWith('Hunter'))?.targets).toEqual(['Monster','Vehicle']);
  expect(spaceMarineWeaponText(b,b.instances![0],'Fight')).toContain('can target only Monster or Vehicle');
 });
 it('uses Watchers once per equipped unit without inventing a physical model bearer',()=>{
  for(const unit of ['Deathwing Knights','Deathwing Terminator Squad']){
   const a=army('Dark Angels',[unit]);expect(rules(a,'Watcher in the Dark')).toEqual([]);
   const b=equip(a,unit,'Watcher in the Dark'),s=b.instances![0];expect(spaceMarineWeaponCount(s,'Watcher in the Dark',b.faction)).toBe(1);
   expect(spaceMarineModelLoadouts(s,b.faction).every(m=>!m.items.includes('Watcher in the Dark'))).toBe(true);
   expect(text(b,'Watcher in the Dark')).toContain('including against the triggering wound');
  }
 });
 it('requires the optional mine and real Death Totem equipment',()=>{
  const original=army('Space Wolves',['Wolf Scouts','Wulfen']),wulfen=original.instances!.find(s=>s.unit==='Wulfen')!;
  // The printed default is a totem; exchange each actual bearer for a launcher.
  const knightGear=Object.fromEntries(spaceMarineLoadout('Wulfen',wulfen.models,original.faction)!.slots.map(field=>[field.name,field.choices.find(c=>c.items.some(i=>key(i)==='stormfragautolauncher'))!.name]));
  const a={...original,instances:original.instances!.map(s=>s.unit==='Wulfen'?{...s,knightGear}:s)};
  expect(rules(a,'Haywire Mine')).toEqual([]);expect(rules(a,'Death Totem')).toEqual([]);
  const b=equip(equip(a,'Wolf Scouts','Haywire Mine (Once per battle, per unit)'),'Wulfen','Death Totem');
  expect(text(b,'Haywire Mine')).toContain('2D3 if it is a Vehicle');expect(text(b,'Death Totem')).toContain('actual Death Totem bearer');
  expect(spaceMarineModelLoadouts(b.instances!.find(s=>s.unit==='Wolf Scouts')!,b.faction).filter(m=>m.items.some(i=>i.startsWith('Haywire Mine')))).toHaveLength(1);
 });
 it('counts two physical melee weapons rather than two profiles on a single Wulfen axe',()=>{
  const a=equip(army('Space Wolves',['Wulfen Dreadnought']),'Wulfen Dreadnought','Fenrisian Great Axe');
  expect(spaceMarineFullWeaponProfiles(a,a.instances![0]).filter(w=>w.name.startsWith('Fenrisian Great Axe'))).toHaveLength(2);
  const shield=equip(a,'Wulfen Dreadnought','Blizzard Shield');expect(rules(shield,'Violent Fury')).toEqual([]);
  const dual=equip(a,'Wulfen Dreadnought','Great Wolf Claw');expect(text(dual,'Violent Fury')).toContain('two melee weapons');
 });
 it('scopes Hunting Hounds to actual wolves in mixed Scout and Headtaker cards',()=>{
  const a=army('Space Wolves',['Wolf Guard Headtakers','Wolf Scouts']);expect(rules(a,'Hunting Hounds').some(r=>r.units?.includes(id('Wolf Guard Headtakers')))).toBe(false);
  const b=size(a,'Wolf Guard Headtakers',12),t=text(b,'Hunting Hounds');expect(t).toContain('only its actual Hunting Wolf models');expect(t).toContain('attached models do not receive');
  expect(spaceMarineModelLoadouts(b.instances![0],b.faction).filter(m=>m.model==='Hunting Wolf')).toHaveLength(6);
 });
 it('keeps personal shield types and actual bearer scope distinct',()=>{
  const term=equip(army('Space Wolves',['Wolf Guard Terminators']),'Wolf Guard Terminators','Storm Shield');expect(core(term,'Storm Shield').every(r=>r.summary.includes('+1 Wounds'))).toBe(true);expect(core(term,'Storm Shield').length).toBeGreaterThan(0);
  const cavalry=equip(army('Space Wolves',['Thunderwolf Cavalry']),'Thunderwolf Cavalry','Storm Shield');expect(core(cavalry,'Storm Shield').some(r=>r.summary.includes('4+ invulnerable'))).toBe(true);
  const dcc=equip(army('Blood Angels',['Death Company Captain with Jump Pack']),'Death Company Captain with Jump Pack','Relic Shield');expect(core(dcc,'Relic Shield').some(r=>r.summary.includes('+1 Wounds'))).toBe(true);
 });
 it('preserves the Ravenwing Command actual Ancient, Champion and Apothecary roles',()=>{
  const a=army('Dark Angels',['Ravenwing Command Squad']);
  expect(text(a,'Astartes Banner')).toContain('actual surviving Ravenwing Ancient');
  expect(text(a,'Honour or Death')).toContain('actual Ravenwing Champion');
  expect(text(a,'Narthecium')).toContain('actual surviving Ravenwing Apothecary');
 });
});

describe('chapter consequential timing and attack rules',()=>{
 it('respects psychic levels, per-phase use and the effect after a failed psychic roll',()=>{
  for(const [faction,unit,title,level] of [['Blood Angels','Chief Librarian Mephiston','Transfixing Gaze',2],['Dark Angels','Ezekiel','Engulfing Fear',1],['Space Wolves','Njal Stormcaller','Murderous Hurricane',1]] as const){
   const t=text(army(faction,[unit]),title);expect(t).toContain('Once per phase');expect(t).toContain(level+' psychic level');expect(t).toContain('per-battle-round budget');expect(t).toContain('not Battle-shocked');expect(t).toContain('effect still applies');
  }
  expect(text(army('Dark Angels',['Ezekiel']),'Engulfing Fear')).toContain('Visibility is not required');
 });
 it('keeps doctrine activation budgets and the Blood Angels personal Finest Hour distinct',()=>{
  const a=join(army('Blood Angels',['Blood Angels Captain','Intercessor Squad']),'Blood Angels Captain','Intercessor Squad');
  expect(text(a,'Strategic Acumen')).toContain('does not spend an army-wide');expect(text(a,'Finest Hour')).toContain('Other models do not gain');
  expect(spaceMarineIntrinsicReminders(a).filter(r=>r.title==='Finest Hour')).toEqual([]);
  const sw=army('Space Wolves',['Logan Grimnar']);expect(text(sw,'Guile of the Wolf')).toContain('do not spend army-wide');expect(rules(sw,'Guile of the Wolf').every(r=>r.timing==='start')).toBe(true);
 });
 it('grants actual Forlorn Hero Scouts to the whole joined formation',()=>{
  const a=join(army('Blood Angels',['Death Company Captain','Death Company Marines']),'Death Company Captain','Death Company Marines');
  expect(spaceMarineFormationScoutRange(a,spaceMarineFormations(a)[0])).toBe(6);
  expect(text(a,'Forlorn Hero')).toContain('whole formation');
 });
 it('retains the literal Black Rage absence conditions and below-half boundary',()=>{
  const a=army('Blood Angels',['Death Company Marines']);expect(text(a,'Black Rage')).toContain('both proximity checks must be met');expect(text(a,'Black Rage')).toContain('Objective Control is modified to 0');
  expect(text(a,'An Honourable Death in Combat')).toContain('exactly half is not below half');
 });
 it('distinguishes hit, lost-wound and destroyed-model surge triggers',()=>{
  const ba=text(army('Blood Angels',['Death Company Dreadnought']),'Driven by Fury');expect(ba).toContain('hit this formation');expect(ba).toContain('Losing a wound or model is not required');
  const bt=text(army('Black Templars',['Crusader Squad']),'Righteous Zeal');expect(bt).toContain('destroyed a model');
  const sw=text(army('Space Wolves',['Wulfen Dreadnought']),'Bestial Rage');expect(sw).toContain('lost a wound');
  for(const t of [ba,bt,sw]){expect(t).toContain('not Battle-shocked');expect(t).toContain('not already moved this phase');expect(t).toContain('Do not engage another enemy');}
 });
 it('keeps normal reactive Vengeance fully equipped and excludes unequipped guns',()=>{
  const a=army('Dark Angels',['Land Speeder Vengeance','Deathwing Terminator Squad']),s=a.instances![0],t=text(a,'Storm of Vengeance');
  expect(t).toContain('normal shooting against only that attacking enemy');expect(t).toContain('Normal target eligibility still applies');
  const weapons=spaceMarineFullWeaponProfiles(a,s).filter(w=>w.phase==='Shooting');for(const w of weapons)expect(t).toContain(w.name);
  expect(t).toContain('Range ');expect(t).toContain('; BS ');expect(rules(a,'Storm of Vengeance').every(r=>r.window==='Shooting'&&r.turn==='opponent')).toBe(true);
 });
 it('retains Arjac’s Wound re-roll for snap shooting but suppresses Hit and Critical Hit bonuses',()=>{
  const a=army('Space Wolves',['Arjac Rockfist','Wolf Guard Battle Leader']),arjac=rules(a,'Champion of the Kingsguard');
  expect(arjac.some(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);expect(text(a,'Champion of the Kingsguard')).toContain('only the Wound re-roll remains');
  expect(rules(a,'Tempered Ferocity').some(r=>r.window==='Movement')).toBe(false);
  const da=army('Dark Angels',['Azrael','Deathwing Terminator Squad']);expect(rules(da,'Supreme Grand Master').some(r=>r.window==='Movement')).toBe(false);expect(rules(da,'Deathwing').some(r=>r.window==='Movement')).toBe(false);
 });
 it('keeps Leadership rolls distinct from Battle-shock and heals the actual formation correctly',()=>{
  const bt=text(army('Black Templars',['Castellan']),'Vehement Aggression');expect(bt).toContain('regardless of that result');expect(bt).toContain('not a Battle-shock roll');
  const ba=text(army('Blood Angels',['The Sanguinor']),'Aura of Fervour');expect(ba).toContain('does not grant Battle-shock re-rolls');
  const sw=text(army('Space Wolves',['Wolf Priest']),'Healing Balms');expect(sw).toContain('heal a wounded surviving model first');expect(sw).toContain('revive a destroyed non-Character');
 });
 it('keeps the Homer discount at opponent Movement end and removes the token after any qualifying enemy move',()=>{
  const a=army('Dark Angels',['Deathwing Knights']),r=rules(a,'Teleport Homer');
  expect(r.some(x=>x.window==='Movement'&&x.turn==='opponent'&&x.timing==='end')).toBe(true);expect(text(a,'Teleport Homer')).toContain('does not change normal reserve arrival timing');
  expect(text(a,'Teleport Homer · enemy movement')).toContain('including a reaction in your turn');
 });
 it('uses actual objective range, isolation and selected quarry without inferring a battlefield choice',()=>{
  const a=army('Space Wolves',['Grey Hunters','Wolf Scouts','Wolf Guard Headtakers']);
  expect(text(a,'Cunning Hunters')).toContain('need not control');expect(text(a,'Deadly Stalkers')).toContain('opponent’s other units');
  expect(text(a,'Headhunters')).toContain('actually selected quarry');expect(text(a,'Headhunters')).toContain('when it is destroyed');
  expect(spaceMarineMusterUnits(a)).toContain('Wolf Guard Headtakers');
 });
});

describe('chapter intrinsic sources after declared Space Wolf splits',()=>{
 it('keeps Ragnar with Headtakers and prints separate quarry rules for the actual Wolves part',()=>{
  let a=join(size(army('Space Wolves',['Ragnar Blackmane','Wolf Guard Headtakers']),'Wolf Guard Headtakers',12),'Ragnar Blackmane','Wolf Guard Headtakers');
  a=equip(a,'Wolf Guard Headtakers','Split unit');
  const plan=chapterSplitPlans(a)[0];expect(plan.valid).toBe(true);expect(plan.parts.map(p=>p.models)).toEqual([7,6]);
  const howl=rules(a,'War Howl');expect(howl.length).toBeGreaterThan(0);expect(howl.every(r=>r.title.includes('Group 1'))).toBe(true);
  expect(rules(a,'Battle-lust').every(r=>r.title.includes('Group 1'))).toBe(true);
  const wolves=rules(a,'Headhunters').filter(r=>r.title.includes('Group 2'));expect(wolves.length).toBeGreaterThan(0);expect(wolves.every(r=>r.window==='Fight'||r.window==='Start of battle round')).toBe(true);
  expect(wolves.every(r=>!r.units?.includes(id('Ragnar Blackmane')))).toBe(true);
  expect(rules(a,'Hunting Hounds').every(r=>r.title.includes('Group 2'))).toBe(true);
  expect(rules(a,'War Howl',without(a,'Wolf Guard Headtakers')).every(r=>r.title.includes('Group 1'))).toBe(true);
 });
 it('keeps a Wolf Priest’s effects with its assigned Grey Hunter part while both parts retain their own source rule',()=>{
  let a=join(army('Space Wolves',['Wolf Priest','Grey Hunters']),'Wolf Priest','Grey Hunters');
  a=equip(a,'Grey Hunters','Split unit');a=equip(a,'Grey Hunters','Group 2');
  const plan=chapterSplitPlans(a)[0];expect(plan.valid).toBe(true);expect(plan.parts[1].members.some(s=>s.unit==='Wolf Priest')).toBe(true);
  expect(rules(a,'Litany of Hate').every(r=>r.title.includes('Group 2'))).toBe(true);
  expect(rules(a,'Healing Balms').every(r=>r.title.includes('Group 2'))).toBe(true);
  const cunning=rules(a,'Cunning Hunters');expect(cunning.some(r=>r.title.includes('Group 1'))).toBe(true);expect(cunning.some(r=>r.title.includes('Group 2'))).toBe(true);
  expect(cunning.filter(r=>r.title.includes('Group 1')).every(r=>!r.units?.includes(id('Wolf Priest')))).toBe(true);
 });
 it('preserves Njal’s already used psychic effect only on its original part after his death',()=>{
  let a=join(army('Space Wolves',['Njal Stormcaller','Grey Hunters','Blood Claws']),'Njal Stormcaller','Grey Hunters');
  a=equip(a,'Grey Hunters','Split unit');a=equip(a,'Grey Hunters','Group 2');
  const live=without(a,'Njal Stormcaller');
  expect(rules(a,'Storm Caller',live)).toEqual([]);
  const effect=rules(a,'Storm Caller · active psychic effect',live);expect(effect.length).toBeGreaterThan(0);expect(effect.every(r=>r.title.includes('Group 2'))).toBe(true);
  expect(effect.every(r=>r.summary.includes('does not transfer to the other part'))).toBe(true);
  expect(effect.every(r=>!r.units?.includes(id('Blood Claws')))).toBe(true);
 });
});
