// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {SM_SHEETS} from '../src/space-marines-data';
import {SM_CARDS,SM_ENHANCEMENT_WEAPONS} from '../src/space-marines-card-profiles.generated';
import {spaceMarineLoadout,spaceMarineModelLoadouts,spaceMarineWeaponCount,validSpaceMarineGear} from '../src/space-marines-loadouts';
import {SM_INTRINSIC_INVENTORY} from '../src/space-marines-intrinsic.generated';
import {spaceMarineIntrinsicReminders,SM_DELEGATED_INTRINSIC} from '../src/space-marines-intrinsic';
import {spaceMarineDatasheetCoreReminders,spaceMarineFormationHasDeepStrike,spaceMarineFormationScoutRange} from '../src/space-marines-datasheet-core';
import {spaceMarineWeaponReminders,spaceMarineFullWeaponProfiles,spaceMarineWeaponText} from '../src/space-marines-weapons';
import {spaceMarineFormations} from '../src/space-marines-formations';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
const sheet=(unit:string)=>SM_SHEETS.find(s=>s.unit===unit)!;
const key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:sheet(unit)?.sizes[0]??1,keepUnattached:true});}
 return {...newSelection('Space Marines'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body),keepUnattached:false}:s)});
const without=(a:ArmySelection,...units:string[])=>a.instances!.filter(s=>!units.includes(s.unit));
const upgrade=(a:ArmySelection,unit:string,name:string)=>({...a,upgrades2026:{...a.upgrades2026,[id(unit)]:name}});
const rules=(a:ArmySelection,title:string,roster?:RosterInstance[])=>spaceMarineIntrinsicReminders(a,roster).filter(r=>r.title===title);
const text=(a:ArmySelection,title:string,roster?:RosterInstance[])=>rules(a,title,roster).map(r=>r.summary).join(' ');
const profile=(a:ArmySelection,title:string,roster?:RosterInstance[])=>spaceMarineDatasheetCoreReminders(a,roster).filter(r=>r.title.endsWith(' · '+title));
function equip(a:ArmySelection,unit:string,item:string,which=0){
 const squad=a.instances!.find(s=>s.id===id(unit))!,loadout=spaceMarineLoadout(unit,squad.models)!;
 const choices=loadout.slots.flatMap(field=>field.choices.filter(c=>c.items.some(i=>key(i)===key(item))||key(c.name)===key(item)).map(choice=>({field,choice})))
  .filter(({field,choice})=>validSpaceMarineGear(unit,{...squad.knightGear,[field.name]:choice.name},squad.models));
 const picked=choices[which];if(!picked)throw Error('No legal equipment '+unit+' / '+item);
 return {...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear:{...s.knightGear,[picked.field.name]:picked.choice.name}}:s)};
}
function fixture(unit:string){
 const body=unit==='Kaius Konorius'?'Victrix Honour Guard':sheet(unit).bodyguards?.[0];
 let a=army([...new Set([unit,...body?[body]:[],'Captain','Lieutenant','Intercessor Squad','Redemptor Dreadnought','Infiltrator Squad',...(unit==='Kaius Konorius'?['Marneus Calgar']:[])])]);
 if(body)a=join(a,unit,body);
 if(unit==='Kaius Konorius')a=join(a,'Marneus Calgar','Victrix Honour Guard');
 return a;
}

describe('Space Marines complete current source coverage',()=>{
 it('contains all 97 cards, 186 named entries, 138 core entries and 511 full profiles',()=>{
  expect(SM_SHEETS).toHaveLength(97);
  expect(Object.keys(SM_INTRINSIC_INVENTORY).sort()).toEqual(SM_SHEETS.map(s=>s.unit).sort());
  expect(Object.values(SM_INTRINSIC_INVENTORY).flat()).toHaveLength(186);
  expect(Object.values(SM_CARDS).flatMap(c=>c.core??[])).toHaveLength(138);
  expect(Object.values(SM_CARDS).flatMap(c=>c.weapons)).toHaveLength(511);
  for(const entries of Object.values(SM_INTRINSIC_INVENTORY))for(const entry of entries){expect(entry.source).toContain('/wh40k11ed/');expect(entry.sourceHash).toMatch(/^[a-f0-9]{64}$/);}
  for(const card of Object.values(SM_CARDS))for(const w of card.weapons){expect(w.range).toBeTruthy();expect(w.attacks).toBeTruthy();expect(w.skill).toBeTruthy();expect(w.damage).toBeTruthy();expect(Number.isFinite(w.strength)).toBe(true);expect(Number.isFinite(w.ap)).toBe(true);}
 });
 for(const unit of Object.keys(SM_INTRINSIC_INVENTORY))it(unit+' executes every named rule or explicitly delegates it',()=>{
  const a=fixture(unit),squad=a.instances!.find(s=>s.unit===unit)!,variants=[a];
  for(const field of spaceMarineLoadout(unit,squad.models)!.slots)for(const choice of field.choices){
   const knightGear={[field.name]:choice.name};
   if(validSpaceMarineGear(unit,knightGear,squad.models))variants.push({...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear}:s)});
  }
  const actual=new Set(variants.flatMap(v=>[...spaceMarineIntrinsicReminders(v),...spaceMarineDatasheetCoreReminders(v)].filter(r=>r.units?.includes(squad.id)).map(r=>r.title.replace(squad.id+' · ',''))));
  for(const entry of SM_INTRINSIC_INVENTORY[unit])expect(actual.has(entry.name)||(SM_DELEGATED_INTRINSIC[unit]??[]).includes(entry.name),unit+' · '+entry.name).toBe(true);
 });
 it('emits nothing for another faction or an empty army',()=>{
  for(const fn of [spaceMarineIntrinsicReminders,spaceMarineDatasheetCoreReminders,spaceMarineWeaponReminders]){expect(fn(newSelection('Necrons'))).toEqual([]);expect(fn(army([]))).toEqual([]);}
 });
});

describe('Space Marines actual models, source lifetimes and applied effects',()=>{
 it('keeps a surviving Captain’s own rule after its original bodyguard is destroyed',()=>{
  const a=join(army(['Captain In Gravis Armour','Aggressor Squad']),'Captain In Gravis Armour','Aggressor Squad');
  expect(rules(a,'Strategic Acumen',without(a,'Aggressor Squad'))).toHaveLength(1);
  expect(rules(a,'Refuse to Yield',without(a,'Aggressor Squad')).length).toBeGreaterThan(0);
  expect(rules(a,'Close-quarters Firestorm',without(a,'Aggressor Squad'))).toEqual([]);
  expect(rules(a,'Refuse to Yield',without(a,'Captain In Gravis Armour'))).toEqual([]);
 });
 it('retains Kaius protection for another surviving Character after their bodyguard is lost',()=>{
  const a=join(join(army(['Kaius Konorius','Marneus Calgar','Victrix Honour Guard']),'Kaius Konorius','Victrix Honour Guard'),'Marneus Calgar','Victrix Honour Guard');
  expect(text(a,'Veteran Bodyguard',without(a,'Victrix Honour Guard'))).toContain('other actual Character models');
  expect(text(a,'Veteran Bodyguard')).toContain('Kaius himself');
  expect(rules(a,'Veteran Bodyguard',without(a,'Kaius Konorius'))).toEqual([]);
  expect(rules(army(['Kaius Konorius']),'Veteran Bodyguard')).toEqual([]);
 });
 it('keeps applied target effects after source loss but no longer offers fresh activations',()=>{
  const a=army(['Astraeus','Incursor Squad','Infiltrator Squad','Infernus Squad','Storm Speeder Hailstrike','Storm Speeder Thunderstrike','Techmarine','Captain','Lieutenant','Redemptor Dreadnought','Intercessor Squad']);
  const live=a.instances!.filter(s=>['Redemptor Dreadnought','Intercessor Squad'].includes(s.unit));
  for(const title of ['Suppression Fire · suppressed enemy','Divinator-class Auspexes · scanned enemy','Omni-scramblers · detected enemy','Driven from Cover · chosen enemy','Hailstrike · chosen enemy','Shattered Defences · chosen enemy','Blessings of the Omnissiah · chosen vehicle'])expect(rules(a,title,live).length,title).toBeGreaterThan(0);
  for(const title of ['Suppression Fire','Divinator-class Auspexes (Once per phase, per unit)','Omni-scramblers','Driven from Cover','Hailstrike','Shattered Defences','Blessings of the Omnissiah'])expect(rules(a,title,live),title).toEqual([]);
  for(const title of ['Divinator-class Auspexes · scanned enemy','Omni-scramblers · detected enemy','Driven from Cover · chosen enemy','Shattered Defences · chosen enemy']){expect(rules(a,title,live).every(r=>r.window==='Shooting'&&r.turn==='own')).toBe(true);expect(text(a,title,live)).toContain('phase ends');}
 });
 it('retains a psychic ward on the surviving bodyguard and preserves exact expiry',()=>{
  const a=join(army(['Librarian','Intercessor Squad']),'Librarian','Intercessor Squad'),live=without(a,'Librarian');
  expect(rules(a,'Force Dome (psychic level 1)',live)).toEqual([]);
  expect(text(a,'Force Dome · active psychic effect',live)).toContain('until the start of your next turn');
  expect(text(a,'Force Dome · active psychic effect',live)).toContain('original source is destroyed');
  expect(text(a,'Force Dome (psychic level 1)')).toContain('On 1');expect(text(a,'Force Dome (psychic level 1)')).toContain('effect still applies');
 });
 it('retains Artemis revival with no live units and does not reset the original formation',()=>{
  const a=army(['Watch Captain Artemis']),r=rules(a,'Unstoppable Champion',[]);
  expect(r).toHaveLength(5);expect(r.every(r=>r.timing==='end')).toBe(true);
  expect(r[0].summary).toContain('3 wounds');expect(r[0].summary).toContain('original Starting Strength');
 });
 it('uses unit healing for the Narthecium and only actual optional Helix equipment',()=>{
  const a=join(army(['Apothecary','Intercessor Squad','Infiltrator Squad']),'Apothecary','Intercessor Squad');
  expect(text(a,'Narthecium')).toContain('revive a destroyed non-Character model with 1 wound');
  expect(rules(a,'Helix Gauntlet')).toEqual([]);
  const b=equip(a,'Infiltrator Squad','Helix Gauntlet');expect(text(b,'Helix Gauntlet')).toContain('D3 wounds');
  expect(rules(b,'Helix Gauntlet',without(b,'Infiltrator Squad'))).toEqual([]);
 });
 it('does not require invented Haywire equipment for Incursors',()=>{
  const a=army(['Incursor Squad']);expect(spaceMarineWeaponCount(a.instances![0],'Haywire Mine')).toBe(0);
  expect(text(a,'Haywire Mine (Once per battle, per unit)')).toContain('2D3');
 });
 it('uses the corrected Titus rule and his own destruction condition',()=>{
  const a=join(army(['Captain Titus','Intercessor Squad']),'Captain Titus','Intercessor Squad');
  expect(text(a,'Righteous Fury (Once per battle, per army)')).toContain('+1 Strength');
  expect(text(a,'Righteous Fury (Once per battle, per army)')).toContain('Titus himself destroyed');
  expect(rules(a,'Righteous Fury (Once per battle, per army)')[0].source).toContain('91hillwcff');
  expect(text(a,'Honour of Ultramar')).toContain('has not been selected to fight');expect(text(a,'Honour of Ultramar')).toContain('whichever comes first');
 });
});

describe('Space Marines current timing and equipped deployment',()=>{
 it('keeps shooting-phase-only abilities out of Overwatch and retains eligible Damage/Wound effects',()=>{
  const a=army(['Incursor Squad','Infiltrator Squad','Invader ATVs','Intercessor Squad','Eradicator Squad with Melta Rifles','Gladiator Lancer']);
  for(const title of ['Divinator-class Auspexes (Once per phase, per unit)','Omni-scramblers','Aggressive Reconnaissance','Bolter Discipline'])expect(rules(a,title).some(r=>r.window==='Movement'&&r.turn==='opponent'),title).toBe(false);
  expect(rules(a,'Total Obliteration').some(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);
  expect(text(a,'Aquilon Optics')).toContain('Snap-shot Hit rolls cannot be re-rolled');
 });
 it('uses exact doctrine benefits and makes chosen recipients conditional',()=>{
  const a=army(['Marneus Calgar','Captain','Lieutenant','Intercessor Squad']);
  const reminder=text(a,'Strategic Acumen');expect(reminder).toContain('Tactical Doctrine allows shooting and charging after Falling Back');expect(reminder).toContain('Devastator Doctrine grants ranged Assault');expect(reminder).not.toContain('Ignores Cover');
  const group=spaceMarineFormations(a).find(g=>g.root.unit==='Intercessor Squad')!;
  expect(spaceMarineFormationHasDeepStrike(a,group)).toBe(false);
  expect(text(a,'Thunderhawk Insertion · chosen formation')).toContain('actually selected');
 });
 it('does not invent Caanok’s selected Scout recipient',()=>{
  const a=army(['Caanok Var','Intercessor Squad']);const g=spaceMarineFormations(a).find(g=>g.root.unit==='Intercessor Squad')!;
  expect(spaceMarineFormationScoutRange(a,g)).toBe(0);
  expect(text(a,'Cerebrex Logic Engine · chosen infantry')).toContain('actually selected');
 });
 it('resolves Reiver unit equipment without an invented personal bearer',()=>{
  let a=join(army(['Reiver Squad','Captain In Phobos Armour']),'Captain In Phobos Armour','Reiver Squad');
  const formation=()=>spaceMarineFormations(a).find(g=>g.root.unit==='Reiver Squad')!;
  expect(spaceMarineFormationHasDeepStrike(a,formation())).toBe(false);
  a=equip(a,'Reiver Squad','Grav-chutes');a=equip(a,'Reiver Squad','Grapnel Launchers');
  expect(spaceMarineFormationHasDeepStrike(a,formation())).toBe(true);
  expect(spaceMarineModelLoadouts(a.instances![0]).every(m=>m.items.every(i=>!['Grav-chutes','Grapnel Launchers'].includes(i)))).toBe(true);
  expect(text(a,'Grapnel Launchers')).toContain('Pile In and Consolidation');
  // The surviving Phobos Captain has its own native Deep Strike.
  expect(spaceMarineFormationHasDeepStrike(a,spaceMarineFormations(a,without(a,'Reiver Squad'))[0],without(a,'Reiver Squad'))).toBe(true);
  expect(profile(a,'Grav-chutes',without(a,'Reiver Squad'))).toEqual([]);
 });
 it('keeps both Impulsor equipment branches mutually exclusive and correctly scoped',()=>{
  const a=equip(army(['Impulsor']),'Impulsor','Orbital Comms Array');
  expect(profile(a,'Orbital Comms Array')).toHaveLength(1);expect(profile(a,'Shield Dome')).toEqual([]);
  expect(spaceMarineFormationScoutRange(a,spaceMarineFormations(a)[0])).toBe(6);
  const b=equip(army(['Impulsor']),'Impulsor','Shield dome');expect(profile(b,'Shield Dome').length).toBeGreaterThan(0);expect(profile(b,'Orbital Comms Array')).toEqual([]);
 });
 it('requires actual banner Ancient and does not duplicate the Spectrus Helix ability',()=>{
  const a=army(['Victrix Honour Guard']);expect(rules(a,'Banner of Macragge')).toEqual([]);
  const b=equip(a,'Victrix Honour Guard','Chapter Ancient');expect(rules(b,'Banner of Macragge').length).toBeGreaterThan(0);
  const c=equip(army(['Spectrus Kill Team']),'Spectrus Kill Team','Helix Gauntlet');expect(rules(c,'Helix Gauntlet')).toHaveLength(1);
 });
 it('keeps the Eliminator alternative to one enemy and expires it when the unit has shot',()=>{
  const t=text(army(['Eliminator Squad']),'Special-issue Optics and Ammunition');expect(t).toContain('choose one enemy unit within 24″');expect(t).toContain('until this formation has shot');
 });
});

describe('Space Marines actual weapon profiles and personal saves',()=>{
 it('retains current live card corrections and Hunter target restrictions',()=>{
  for(const n of ['Ballistus Dreadnought','Brutalis Dreadnought','Redemptor Dreadnought'])expect(SM_CARDS[n].save).toBeNull();
  expect(SM_CARDS['Marneus Calgar'].save).toBe(4);
  const c=SM_CARDS['Cato Sicarius'].weapons;expect(c.find(w=>w.name.endsWith('Strike'))).toMatchObject({attacks:'4',strength:6});expect(c.find(w=>w.name.endsWith('Coup de Grace'))).toMatchObject({attacks:'6',strength:5});expect(c.find(w=>w.name.endsWith('Sweep'))?.abilities).toEqual(['sustained hits 1']);
  expect(SM_CARDS['Vanguard Veteran Squad With Jump Packs'].weapons.filter(w=>w.name.startsWith('Plasma pistol'))).toHaveLength(2);
  for(const n of ['Indomitor Kill Team','Eradicator Squad with Melta Rifles','Terminator Squad'])for(const w of SM_CARDS[n].weapons.filter(w=>w.name.endsWith(' - Hunter')))expect(w.targets).toEqual(['Monster','Vehicle']);
  expect(SM_CARDS['Talonstrike Kill Team'].weapons.find(w=>w.name==='Hand Flamer')).toMatchObject({skill:'7',abilities:['torrent','close-quarters']});
 });
 it('does not label Calgar’s Extra Attacks as an exclusive mode',()=>{
  const a=army(['Marneus Calgar']),t=spaceMarineWeaponText(a,a.instances![0],'Fight');
  expect(t).toContain('Overhead Smash (additional Extra Attacks profile)');expect(t).not.toContain('choose one profile');
 });
 it('prints all actual profile statistics and correctly suppresses critical-hit rules for snap shots',()=>{
  const a=army(['Redemptor Dreadnought']),s=a.instances![0],normal=spaceMarineWeaponText(a,s,'Shooting'),snap=spaceMarineWeaponText(a,s,'Shooting',true);
  expect(normal).toContain('Range 24″; A 12; BS 3+; S 6; AP -1; D 1');expect(normal).toContain('Sustained Hits 2 (against targets with neither Monster nor Vehicle');
  expect(snap).not.toContain('Sustained Hits');expect(snap).toContain('Devastating Wounds (against targets with neither Monster nor Vehicle');expect(snap).not.toContain('BS 3+');
 });
 it('excludes unequipped options and checks Hunter profiles against physical weapon bearers',()=>{
  const a=army(['Terminator Squad']),s=a.instances![0];expect(spaceMarineFullWeaponProfiles(a,s).some(w=>w.name.includes('Chainfist'))).toBe(false);
  const b=equip(a,'Terminator Squad','Chainfist');expect(spaceMarineFullWeaponProfiles(b,b.instances![0]).filter(w=>w.name.includes('Chainfist'))).toHaveLength(2);
  expect(spaceMarineWeaponText(b,b.instances![0],'Fight')).toContain('can target only Monster or Vehicle');
 });
 it('grants enhancement weapons only to the actual Company Ancient',()=>{
  const a=upgrade(army(['Company Heroes'],['Assault Brethren']),'Company Heroes',"Imperium's Sword"),s=a.instances![0];
  expect(SM_ENHANCEMENT_WEAPONS['Imperium’s Sword']).toMatchObject({attacks:'6',skill:'2',strength:7,ap:-3,damage:'3'});
  expect(spaceMarineFullWeaponProfiles(a,s,'Ancient').some(w=>w.name==='Imperium’s Sword')).toBe(true);
  expect(spaceMarineFullWeaponProfiles(a,s,'Company Champion').some(w=>w.name==='Imperium’s Sword')).toBe(false);
  expect(spaceMarineFullWeaponProfiles(a,s,'Ancient').some(w=>w.name==='Combat Knife')).toBe(true);
 });
 it('adds the Thief of Secrets without replacing the Watch Master’s native spear',()=>{
  const a=upgrade(army(['Watch Master'],['Black Spear Task Force']),'Watch Master','The Thief of Secrets'),s=a.instances![0],weapons=spaceMarineFullWeaponProfiles(a,s);
  expect(weapons.find(w=>w.name==='The Thief of Secrets')).toMatchObject({count:1,attacks:'6',skill:'2',strength:6,ap:-3,damage:'2'});
  expect(weapons.some(w=>w.phase==='Fight'&&w.name!=='The Thief of Secrets')).toBe(true);
  expect(spaceMarineFullWeaponProfiles({...a,detachments2026:[]},s).some(w=>w.name==='The Thief of Secrets')).toBe(false);
 });
 it('keeps Judiciar melee-only and Astraeus ranged-only invulnerable saves',()=>{
  expect(profile(army(['Judiciar']),'Invulnerable save').every(r=>r.window==='Fight')).toBe(true);
  expect(profile(army(['Astraeus']),'Invulnerable save').every(r=>r.window!=='Fight')).toBe(true);
  const t=profile(army(['Wardens of Ultramar']),'Personal invulnerable saves').map(r=>r.summary).join(' ');expect(t).toContain('Gaius Silva 5+');expect(t).toContain('Veteran Sergeant Metaurus 4+');expect(t).not.toContain('Dainal Kornelius 4+');
 });
 it('keeps Lieutenant shield saves personal and Terminator shields as extra wounds',()=>{
  const a=equip(join(army(['Lieutenant','Intercessor Squad']),'Lieutenant','Intercessor Squad'),'Lieutenant','Storm Shield');
  expect(profile(a,'Storm Shield').every(r=>r.units?.length===1&&r.units[0]===id('Lieutenant'))).toBe(true);
  const b=equip(army(['Terminator Assault Squad']),'Terminator Assault Squad','Storm Shield');expect(profile(b,'Storm Shield').every(r=>r.summary.includes('+1 Wounds'))).toBe(true);
 });
 it('uses only actual passenger weapons for Firing Deck and forbids importing bearer buffs',()=>{
  const a=army(['Impulsor','Captain','Hellblaster Squad']),r=profile(a,'Firing Deck 7');expect(r.length).toBeGreaterThan(0);
  expect(r[0].summary).toContain('One Shot');expect(r[0].summary).toContain('does not gain passenger abilities, enhancements or personal bearer bonuses');
 });
 it('prints reactive profiles only with the selected detachment and keeps normal and snap conditions distinct',()=>{
  expect(spaceMarineWeaponReminders(army(['Redemptor Dreadnought'])).some(r=>r.window==='Shooting'&&r.turn==='opponent')).toBe(false);
  const a=army(['Redemptor Dreadnought'],['Medusa’s Wrath']),reactive=spaceMarineWeaponReminders(a).filter(r=>r.window==='Shooting'&&r.turn==='opponent');
  expect(reactive).toHaveLength(2);
  expect(reactive.find(r=>r.title.endsWith('Reactive snap-shot profiles'))?.summary).toContain('above half Starting Strength');
  expect(reactive.find(r=>r.title.endsWith('Reactive snap-shot profiles'))?.summary).not.toContain('Sustained Hits');
  expect(reactive.find(r=>r.title.endsWith('Reactive ranged weapon profiles'))?.summary).toContain('at or below half Starting Strength');
  expect(reactive.every(r=>r.summary.includes('Rules restricted to your Shooting phase do not trigger'))).toBe(true);
  const b=army(['Hellblaster Squad'],['Devastator Brethren']);expect(spaceMarineWeaponReminders(b).some(r=>r.turn==='opponent'&&r.summary.includes('Hail of Vengeance'))).toBe(true);
 });
 it('retains Damaged Hit penalties for normal return fire while excluding snap shots',()=>{
  const a=army(['Redemptor Dreadnought','Repulsor Executioner'],['Medusa’s Wrath']);
  const ranged=profile(a,'Damaged').filter(r=>r.window==='Shooting');
  expect(ranged).toHaveLength(2);
  expect(ranged.every(r=>r.turn==='either'&&r.summary.includes('subtract 1 from its attack Hit rolls'))).toBe(true);
  expect(ranged.every(r=>r.summary.includes('permitted reactions in the opponent’s turn')&&r.summary.includes('Snap shooting ignores Hit-roll modifiers'))).toBe(true);
  expect(profile(a,'Damaged').filter(r=>r.window==='Fight')).toHaveLength(2);
 });
});
