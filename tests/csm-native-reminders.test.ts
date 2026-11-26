// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {CSM_SHEETS} from '../src/csm-data';
import {CSM_ARMY_SHEETS} from '../src/csm-army-data';
import {CSM_CARDS,CSM_CULT_WEAPONS} from '../src/csm-card-profiles.generated';
import {csmArmyLoadout,csmArmyModelLoadouts,csmArmyWeaponCount,validCsmArmyGear} from '../src/csm-army-loadouts';
import {csmIntrinsicReminders,csmCopiedIntrinsicReminders} from '../src/csm-intrinsic';
import {csmProfileReminders,csmCopiedCoreReminders,csmFormationHasDeepStrike,csmFormationScoutRange} from '../src/csm-datasheet-core';
import {csmFormations} from '../src/csm-transports';
import {csmReactionShooting} from '../src/csm-reactions';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:CSM_ARMY_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('Chaos Space Marines'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const mark=(a:ArmySelection,unit:string,csmMark:NonNullable<RosterInstance['csmMark']>)=>({...a,instances:a.instances!.map(s=>s.id===id(unit)?{...s,csmMark}:s)});
const upgrade=(a:ArmySelection,unit:string,name:string)=>({...a,upgrades2026:{...a.upgrades2026,[id(unit)]:name}});
const get=(a:ArmySelection,title:string,roster?:RosterInstance[])=>csmIntrinsicReminders(a,roster).filter(r=>r.title===title);
const profile=(a:ArmySelection,title:string,roster?:RosterInstance[])=>csmProfileReminders(a,roster).filter(r=>r.title.endsWith(' · '+title));
function equip(a:ArmySelection,unit:string,item:string,field?:string){
 const squad=a.instances!.find(s=>s.id===id(unit))!;
 const slot=csmArmyLoadout(unit,squad.models)!.slots.find(f=>(!field||f.name.includes(field))&&f.choices.some(c=>c.items.includes(item)));
 if(!slot)throw Error('Missing legal equipment '+unit+' / '+item+' / '+field);
 const knightGear={...squad.knightGear,[slot.name]:slot.choices.find(c=>c.items.includes(item))!.name};
 expect(validCsmArmyGear(unit,knightGear,squad.models)).toBe(true);
 return {...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear}:s)};
}
function fixture(unit:string):ArmySelection{
 const sheet=CSM_SHEETS.find(s=>s.unit===unit)!,body=sheet.bodyguards?.[0];
 let a=army([...new Set([unit,...body?[body]:[],'Legionaries','Chaos Rhino','Defiler','Cypher'])]);
 if(body)a=join(a,unit,body);
 for(const item of ['Chaos icon','Chaos familiar','Voice Eater'])if(csmArmyLoadout(unit,sheet.sizes[0])?.slots.some(f=>f.choices.some(c=>c.items.includes(item))))a=equip(a,unit,item);
 if(unit==='Helbrute'){
  for(const field of csmArmyLoadout(unit,sheet.sizes[0])!.slots.filter(f=>f.choices.some(c=>c.items.includes('Helbrute fist'))))a=equip(a,unit,'Helbrute fist',field.name);
 }
 if(unit.includes('Daemon Prince'))a=mark(a,unit,'Khorne');
 return a;
}

// Enumerated from the current publisher/CSV source snapshot. Attachment
// permissions are covered by shared muster tests; each allegiance is tested below.
const expected:Record<string,string[]>={
 "Abaddon The Despoiler": [
  "The Warmaster",
  "Dark Destiny",
  "SUPREME COMMANDER",
  "Paragon of Hatred",
  "Mark of Chaos Ascendant",
  "Lord of the Traitor Legions"
 ],
 "Accursed Cultists": [
  "Howling Horde"
 ],
 "Chaos Bikers": [
  "Rapid Assault",
  "Chaos Icon"
 ],
 "Chaos Land Raider": [
  "Assault Ramp"
 ],
 "Chaos Lord": [
  "Lord of Chaos",
  "Chance for Glory"
 ],
 "Chaos Lord In Terminator Armour": [
  "Lord of Chaos",
  "Formidably Resilient"
 ],
 "Chaos Lord with Jump Pack": [
  "Lord of Chaos",
  "Cruel Hunter"
 ],
 "Chaos Predator Annihilator": [
  "Annihilator"
 ],
 "Chaos Predator Destructor": [
  "Destructor"
 ],
 "Chaos Rhino": [
  "Self Repair"
 ],
 "Chaos Spawn": [
  "Mind-breaking Mutations"
 ],
 "Chaos Terminator Squad": [
  "Despoilers"
 ],
 "Chaos Vindicator": [
  "Siege Shield"
 ],
 "Chosen": [
  "Chaos Icon",
  "Chosen Marauders"
 ],
 "Cultist Firebrand": [
  "Fiery Faith",
  "Cursed Flames"
 ],
 "Cultist Mob": [
  "For the Dark Gods"
 ],
 "Cypher": [
  "Agent of Discord",
  "Guns Blazing"
 ],
 "Dark Apostle": [
  "Dark Zealotry",
  "Demagogue",
  "Malign Sacrifice"
 ],
 "Dark Commune": [
  "Faithful Flock",
  "Dark Ritual",
  "Chaos Icon"
 ],
 "Defiler": [
  "Scuttling Walker",
  "Daemonforge"
 ],
 "Fabius Bile": [
  "Enhanced Warriors",
  "Surgeon Acolyte",
  "Chirurgeon"
 ],
 "Fellgor Beastmen": [
  "Bestial Raiders"
 ],
 "Forgefiend": [
  "Daemonic Ordnance"
 ],
 "Haarken Worldclaimer": [
  "Head Taker",
  "Herald of the Apocalypse"
 ],
 "Havocs": [
  "Stabilisation Talons"
 ],
 "Helbrute": [
  "Dark Ascension",
  "Devoted to Destruction"
 ],
 "Heldrake": [
  "Airborne Predator"
 ],
 "Heretic Astartes Daemon Prince": [
  "Dark Blessing",
  "Ascended Daemon",
  "Lord of Chaos",
  "Daemonic Allegiance"
 ],
 "Heretic Astartes Daemon Prince With Wings": [
  "Daemonic Destruction",
  "Flying Horror",
  "Daemonic Allegiance"
 ],
 "Huron Blackheart": [
  "Lord of Badab",
  "Hamadrya’s Knowledge"
 ],
 "Khorne Lord Of Skulls": [
  "Plough Through the Enemy"
 ],
 "Kravek Morne": [
  "Headlong Destruction",
  "Architect of Ruin"
 ],
 "Legionaries": [
  "Veterans of the Long War",
  "Chaos Icon"
 ],
 "Lord Discordant On Helstalker": [
  "Corrupt Machine Spirits",
  "Spirit Thief"
 ],
 "Master Of Executions": [
  "Warp-sighted Butcher",
  "Trophy Taker"
 ],
 "Master Of Possession": [
  "Daemonkin",
  "Sacrificial Dagger"
 ],
 "Masters of the Maelstrom": [
  "Choice Samples",
  "Fleet Command",
  "Plunder"
 ],
 "Maulerfiend": [
  "Siege Crawler"
 ],
 "Mutilators": [
  "Crushing Charge"
 ],
 "Nemesis Claw": [
  "Visions of Suffering",
  "Voice Eater"
 ],
 "Noctilith Crown": [
  "Malevolent Locus",
  "Malign Cover",
  "Fortification"
 ],
 "Obliterators": [
  "Warp Rift Firepower"
 ],
 "Possessed": [
  "Unholy Bloodshed",
  "Chaos Icon"
 ],
 "Raptors": [
  "Fearsome",
  "Terrifying Assault"
 ],
 "Red Corsairs Raiders": [
  "Trophy Takers"
 ],
 "Red Corsairs Reave-Captain": [
  "Brutal Raider",
  "Raider’s Due"
 ],
 "Sorcerer": [
  "Prescience",
  "Gift of Chaos"
 ],
 "Sorcerer In Terminator Armour": [
  "Chaos Familiar",
  "Warptime",
  "Death Hex"
 ],
 "Traitor Enforcer": [
  "Brutal Example",
  "Mutated Bodyguard"
 ],
 "Traitor Guardsmen Squad": [
  "Twisted Defence Force"
 ],
 "Vashtorr The Arkifane": [
  "Unholy Mechanisms",
  "Reorder Reality",
  "Indentured Daemon Engines"
 ],
 "Venomcrawler": [
  "Soul Eater"
 ],
 "Warp Talons": [
  "Warp Strike"
 ],
 "Warpsmith": [
  "Warpsmith",
  "Master of Mechanisms",
  "Enrage Machine Spirits"
 ]
};

it.each(Object.entries(expected))('covers every native %s ability and keeps stable distinct IDs',(unit,titles)=>{
 const a=fixture(unit),rows=csmIntrinsicReminders(a);
 for(const title of titles){const recipient=title==='Enhanced Warriors'?CSM_SHEETS.find(s=>s.unit===unit)!.bodyguards![0]:unit;const matching=rows.filter(r=>r.title===title&&r.units?.includes(id(recipient)));expect(matching.length,title).toBeGreaterThan(0);expect(matching.every(r=>r.source.startsWith('https://'))).toBe(true);}
 expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
});
it('covers exactly54 native matched-play datasheets and four Cult weapon sets',()=>{
 expect(Object.keys(expected).sort()).toEqual(CSM_SHEETS.map(s=>s.unit).sort());
 expect(Object.keys(CSM_CARDS)).toHaveLength(54);expect(Object.keys(CSM_CULT_WEAPONS).sort()).toEqual(['Khorne Berzerkers','Noise Marines','Plague Marines','Rubric Marines']);
});
it('keeps actual Leader effects on their formation and through the original Bodyguard’s destruction',()=>{
 let a=army(['Chosen','Chosen','Chaos Lord','Master Of Executions']);expect(get(a,'Warp-sighted Butcher')).toEqual([]);
 a=join(join(a,'Chaos Lord','Chosen'),'Master Of Executions','Chosen');
 const row=get(a,'Warp-sighted Butcher')[0];expect(row.units).toEqual(expect.arrayContaining([id('Chosen'),id('Chaos Lord'),id('Master Of Executions')]));expect(row.units).not.toContain('Chosen#2');
 const active=a.instances!.filter(s=>s.id!==id('Chosen'));expect(csmFormations(a,active).find(g=>g.members.some(s=>s.unit==='Chaos Lord'))!.members).toHaveLength(2);
 const kept=get(a,'Warp-sighted Butcher',active)[0];expect(kept.units).toEqual(expect.arrayContaining([id('Chaos Lord'),id('Master Of Executions')]));expect(kept.units).not.toContain(id('Chosen'));
 expect(get(a,'Warp-sighted Butcher',active.filter(s=>s.unit!=='Master Of Executions'))).toEqual([]);
});
it('allows a Master of Executions’ own ranged kills to trigger Trophy Taker while excluding Bodyguard kills',()=>{
 const a=join(army(['Master Of Executions','Legionaries']),'Master Of Executions','Legionaries'),rows=get(a,'Trophy Taker');
 expect(rows.map(r=>[r.window,r.turn])).toEqual([['Fight','either'],['Shooting','own'],['Movement','opponent']]);expect(rows.every(r=>r.units?.length===1&&r.units[0]===id('Master Of Executions'))).toBe(true);expect(rows[0].summary).toContain('kills by other models');
});
it('retains Fabius’s battle-long Bodyguard bonuses after death and keeps its damage-zero/return on their physical sources',()=>{
 const a=join(army(['Fabius Bile','Chosen','Master Of Executions']),'Fabius Bile','Chosen');
 const rows=get(a,'Enhanced Warriors');expect(rows).toHaveLength(4);expect(rows.every(r=>r.units?.length===1&&r.units[0]===id('Chosen'))).toBe(true);
 expect(rows[0].summary).toContain('including if embarked');expect(rows[0].summary).toContain('Surgeon Acolyte');
 const active=a.instances!.filter(s=>s.unit!=='Fabius Bile');expect(get(a,'Enhanced Warriors',active)).toHaveLength(4);expect(get(a,'Surgeon Acolyte',active)).toEqual([]);
 expect(get(a,'Surgeon Acolyte')[0].summary).toContain('does not require the Surgeon Acolyte');expect(get(a,'Chirurgeon',active)).toHaveLength(5);expect(get(a,'Chirurgeon',active)[0].summary).toContain('first time');
});
it('uses the actual Enforcer and Ogryn models without leaking the personal invulnerable save',()=>{
 const a=join(army(['Traitor Enforcer','Traitor Guardsmen Squad']),'Traitor Enforcer','Traitor Guardsmen Squad');
 expect(csmArmyModelLoadouts(a.instances![0]).map(m=>m.model)).toEqual(['Traitor Enforcer','Traitor Ogryn']);
 const inv=profile(a,'Invulnerable save · Traitor Enforcer');expect(inv).toHaveLength(5);expect(inv.every(r=>r.summary.includes('Only an actual Traitor Enforcer')&&r.summary.includes('5+'))).toBe(true);
 expect(profile(a,'Invulnerable save')).toEqual([]);expect(profile(a,'Invulnerable save · Traitor Ogryn')).toEqual([]);
 expect(get(a,'Mutated Bodyguard')[0].summary).toContain('Character models');expect(get(a,'Mutated Bodyguard')[0].summary).toContain('Ogryn and other non-Character');
 expect(get(a,'Brutal Example')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});expect(get(a,'Brutal Example')[0].summary).toContain('destroys one Bodyguard model');
});
it('gates wargear abilities and alternative weapon profiles on actual fitted equipment',()=>{
 let a=army(['Nemesis Claw','Sorcerer In Terminator Armour','Legionaries','Chaos Lord']);
 expect(get(a,'Voice Eater')).toEqual([]);expect(get(a,'Chaos Familiar')).toEqual([]);expect(get(a,'Chaos Icon')).toEqual([]);
 a=equip(equip(equip(a,'Nemesis Claw','Voice Eater'),'Sorcerer In Terminator Armour','Chaos familiar'),'Legionaries','Chaos icon');
 expect(get(a,'Voice Eater')).toHaveLength(5);expect(get(a,'Chaos Familiar')).toHaveLength(4);expect(get(a,'Chaos Icon').length).toBeGreaterThan(0);
 a=equip(a,'Chaos Lord','Accursed weapon');expect(profile(a,'Melee weapon profiles').find(r=>r.units?.includes(id('Chaos Lord')))!.summary).not.toContain('Daemon hammer');
 a=equip(a,'Chaos Lord','Daemon hammer');const melee=profile(a,'Melee weapon profiles').find(r=>r.units?.includes(id('Chaos Lord')))!.summary;
 expect(melee).toContain('1 × Daemon hammer');expect(melee).toContain('A 5; WS 3+; D 2');expect(melee).toContain('S8, AP -2');expect(melee).toContain('Devastating Wounds');
});
it('uses complete equipped native and Cult profiles while omitting Critical Hit and Hit bonuses from snap shots',()=>{
 const a=army(['Abaddon The Despoiler','Forgefiend','Khorne Berzerkers','Rubric Marines','Plague Marines','Noise Marines']);
 for(const unit of Object.keys(CSM_CULT_WEAPONS)){
  const rows=profile(a,'Ranged weapon profiles').filter(r=>r.units?.includes(id(unit)));expect(rows).toHaveLength(2);
  expect(rows.find(r=>r.window==='Shooting')!.summary).toMatch(/A .+; BS /);expect(rows[0].summary).toMatch(/D /);expect(rows[0].summary).toMatch(/S\d+, AP/);expect(rows[0].summary).not.toContain('undefined');
 }
 const snap=profile(a,'Ranged weapon profiles').find(r=>r.window==='Movement'&&r.units?.includes(id('Abaddon The Despoiler')))!.summary;
 expect(snap).toContain('snap shooting');expect(snap).not.toContain('Sustained Hits');expect(snap).not.toContain('BS ');
 const normal=profile(a,'Ranged weapon profiles').find(r=>r.window==='Shooting'&&r.units?.includes(id('Abaddon The Despoiler')))!.summary;expect(normal).toContain('Sustained Hits');expect(normal).toContain('BS 2+');
 expect(get(a,'Daemonic Ordnance').find(r=>r.window==='Movement')!.summary).toContain('Devastating Wounds and Hazardous');
});
it('prints Cypher’s normal return fire with his actual guns, no fabricated penalty and no phase-locked firing deck',()=>{
 const a=army(['Cypher','Chaos Rhino','Legionaries']);
 expect(csmReactionShooting(a,a.instances![0])).toHaveLength(1);expect(csmReactionShooting(a,a.instances![1])).toEqual([]);
 const row=profile(a,'Reaction shooting · equipped models')[0];expect(row).toMatchObject({window:'Shooting',turn:'opponent'});expect(row.summary).toContain('no intrinsic Ballistic Skill penalty');expect(row.summary).toContain('BS 2+');expect(row.summary).toContain('only that enemy');
 expect(profile(a,'Firing Deck 2')).toHaveLength(1);expect(profile(a,'Firing Deck 2')[0]).toMatchObject({window:'Shooting',turn:'own'});
 const live=a.instances!.filter(s=>s.unit!=='Cypher');expect(profile(a,'Reaction shooting · equipped models',live)).toEqual([]);
});
it('shows Firing Deck passenger guns by actual model and excludes models that cannot fit',()=>{
 let a=army(['Chaos Rhino','Chaos Land Raider','Legionaries','Chaos Lord','Havocs','Mutilators','Raptors','Plague Marines']);a=join(a,'Chaos Lord','Legionaries');
 const deck=profile(a,'Firing Deck 2')[0];expect(deck.summary).toContain('choose up to 2 embarked models');expect(deck.summary).toContain('one ranged weapon');expect(deck.summary).toContain('Chaos Lord');expect(deck.summary).toContain('Plague Marine');expect(deck.summary).not.toContain('Mutilator');expect(deck.summary).not.toContain('Raptor');
 expect(get(a,'Assault Ramp').every(r=>r.units?.includes(id('Mutilators')))).toBe(true);
 expect(get(a,'Self Repair')[0]).toMatchObject({window:'Command',turn:'own',timing:'start'});
});
it('requires Deep Strike and Scouts on the complete surviving formation',()=>{
 let a=join(army(['Chaos Terminator Squad','Abaddon The Despoiler','Chosen']),'Abaddon The Despoiler','Chaos Terminator Squad');
 expect(profile(a,'Deep Strike').filter(r=>r.window==='Pre-battle')).toHaveLength(1);
 a=join(a,'Abaddon The Despoiler','Chosen');expect(csmFormationHasDeepStrike(a,csmFormations(a).find(g=>g.root.unit==='Chosen')!.members)).toBe(false);
 expect(profile(a,'Deep Strike').filter(r=>r.window==='Pre-battle').every(r=>!r.units?.includes(id('Abaddon The Despoiler')))).toBe(true);
 let cult=join(army(['Accursed Cultists','Dark Commune']),'Dark Commune','Accursed Cultists');expect(csmFormationScoutRange(cult,csmFormations(cult)[0].members)).toBe(0);
 cult=upgrade({...cult,detachments2026:['Chaos Cult']},'Dark Commune','Warped Foresight');expect(profile(cult,'Scouts 6″')).toHaveLength(1);
});
it.each(['Khorne','Tzeentch','Nurgle','Slaanesh'] as const)('applies only the actually selected %s Daemonic Allegiance',god=>{
 const unit='Heretic Astartes Daemon Prince With Wings',a=mark(army([unit]),unit,god),rows=csmIntrinsicReminders(a).filter(r=>r.title.startsWith('Daemonic Allegiance ·'));
 expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.title==='Daemonic Allegiance · '+god&&r.units?.length===1)).toBe(true);
 const text=rows.map(r=>r.summary).join(' ');expect(text).toContain(({Khorne:'2 Strength',Tzeentch:'3 Attacks',Nurgle:'1 Toughness',Slaanesh:'2″'})[god]);
});
it('extends each verified Warpsmith range by exactly3″ only with a legal selected Crown of Worms',()=>{
 let a=army(['Warpsmith','Chaos Rhino'],['Cult of the Arkifane']);
 expect(get(a,'Warpsmith')[0].summary).toContain('within 3″');expect(get(a,'Enrage Machine Spirits')[0].summary).toContain('within 12″');
 a=upgrade(a,'Warpsmith','Crown of Worms');expect(get(a,'Warpsmith')[0].summary).toContain('within 6″');expect(get(a,'Master of Mechanisms')[0].summary).toContain('within 6″');expect(get(a,'Enrage Machine Spirits')[0].summary).toContain('within 15″');
 const dead=a.instances!.filter(s=>s.unit!=='Warpsmith');expect(get(a,'Master of Mechanisms',dead)).toEqual([]);expect(get(a,'Master of Mechanisms · Lasting effect',dead)[0].summary).toContain('previously selected');
});
it('retains marked enemies after their source dies but removes fresh activation prompts',()=>{
 const a=army(['Sorcerer In Terminator Armour','Lord Discordant On Helstalker','Noise Marines','Cypher','Legionaries']);
 const live=a.instances!.filter(s=>!['Sorcerer In Terminator Armour','Lord Discordant On Helstalker','Noise Marines'].includes(s.unit));
 for(const title of ['Death Hex','Spirit Thief','Terrifying Crescendo'])expect(get(a,title,live)).toEqual([]);
 expect(get(a,'Death Hex · Lasting mark',live).some(r=>r.window==='Shooting'&&r.turn==='opponent')).toBe(true);
 expect(get(a,'Spirit Thief · Lasting mark',live)).toHaveLength(1);expect(get(a,'Spirit Thief')[0].summary).toContain('no stated range limit');
 expect(get(a,'Terrifying Crescendo · Lasting mark',live)).toHaveLength(5);
});
it('keeps Dark Ritual wholly in the activating own turn and preserves its already-used effect after source death',()=>{
 const a=join(army(['Dark Commune','Cultist Mob']),'Dark Commune','Cultist Mob');
 const rows=get(a,'Dark Ritual · Attack bonus');expect(rows.map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Fight','own']]);
 const dead=a.instances!.filter(s=>s.unit!=='Dark Commune');expect(get(a,'Dark Ritual',dead)).toEqual([]);expect(get(a,'Dark Ritual · Lasting effect',dead).every(r=>r.turn==='own')).toBe(true);
});
it('adds conditional opponent-Movement charge triggers only for eligible Dread Talons Infantry',()=>{
 let a=join(army(['Haarken Worldclaimer','Raptors','Mutilators','Heretic Astartes Daemon Prince With Wings']),'Haarken Worldclaimer','Raptors');
 expect(get(a,'Head Taker')).toHaveLength(1);expect(get(a,'Crushing Charge')).toHaveLength(1);
 a={...a,detachments2026:['Dread Talons']};
 for(const title of ['Head Taker','Crushing Charge']){
  const reaction=get(a,title).find(r=>r.window==='Movement')!;expect(reaction).toMatchObject({turn:'opponent',timing:'end'});expect(reaction.summary).toContain('Merciless Pursuit');expect(reaction.summary).toContain('within 6″');expect(reaction.summary).toContain('no Charge bonus');
 }
 expect(get(a,'Daemonic Destruction').some(r=>r.window==='Movement')).toBe(false);
});
it('keeps movement reaction triggers in every phase and source-specific Corpusmaster recovery',()=>{
 const a=join(army(['Huron Blackheart','Masters of the Maelstrom','Legionaries']),'Huron Blackheart','Legionaries');const full=join(a,'Masters of the Maelstrom','Legionaries');
 expect(get(full,'Hamadrya’s Knowledge')).toHaveLength(5);expect(get(full,'Plunder')).toHaveLength(5);
 expect(get(full,'Choice Samples')[0].summary).toContain('actual Garreon the Corpsemaster');expect(get(full,'Choice Samples')[0].summary).toContain('non-Character');expect(get(full,'Fleet Command')[0].summary).toContain('or its transport');
});
it('requires an actual qualifying fight for Warp Strike and allows the FAQ’s later Fall Back sequence',()=>{
 const row=get(army(['Warp Talons']),'Warp Strike')[0];expect(row).toMatchObject({window:'Fight',turn:'either',timing:'end'});expect(row.summary).toContain('actually fought');expect(row.summary).toContain('Being eligible to fight without fighting is insufficient');expect(row.summary).toContain('Opportunistic Raiders Fall Back');
});
it('keeps the four Cult abilities but suppresses unavailable original faction benefits',()=>{
 let a=army(['Khorne Berzerkers','Rubric Marines','Plague Marines','Noise Marines']);
 a=equip(equip(a,'Rubric Marines','Icon of flame'),'Plague Marines','Icon of despair');
 expect(get(a,'Blood Surge')[0].summary).toContain('D6+2″');expect(get(a,'Murderous Charge')[0]).toMatchObject({window:'Fight'});
 expect(get(a,'Bringers of Change')).toHaveLength(2);expect(get(a,'Bringers of Change')[0].summary).toContain('you do not control');expect(get(a,'Icon of Flame')[0].summary).toContain('non-Character');
 expect(get(a,'Icon of Despair')[0].summary).toContain('actual Icon of Despair bearer');expect(get(a,'Terrifying Crescendo')[0]).toMatchObject({window:'Shooting',turn:'own'});
 const all=csmIntrinsicReminders(a).map(r=>r.title+' '+r.summary).join(' ');expect(all).not.toMatch(/Infused with|Afflicted|Blessings of Khorne|Icon of Bloodshed|Cabal of Sorcerers|Thrill Seekers/);
});
it('copies only a selected Soul Link source’s abilities, with actual bearer weapons and Psyker prerequisites',()=>{
 let a=army(['Dark Commune','Cultist Mob','Sorcerer','Sorcerer In Terminator Armour','Master Of Possession'],['Deceptors']);a=upgrade(join(a,'Dark Commune','Cultist Mob'),'Dark Commune','Soul Link');
 const bearer=a.instances!.find(s=>s.unit==='Dark Commune')!,source=(unit:string)=>a.instances!.find(s=>s.unit===unit)!;
 expect(csmCopiedIntrinsicReminders(a,bearer,source('Sorcerer')).map(r=>r.title)).toContain('Soul Link · Prescience');
 expect(csmCopiedIntrinsicReminders(a,bearer,source('Sorcerer')).some(r=>r.title==='Soul Link · Gift of Chaos')).toBe(false);
 expect(csmCopiedIntrinsicReminders(a,bearer,source('Master Of Possession')).some(r=>r.title==='Soul Link · Sacrificial Dagger')).toBe(false);
 expect(csmCopiedIntrinsicReminders(a,bearer,source('Sorcerer In Terminator Armour')).some(r=>r.title.includes('Death Hex'))).toBe(true);
 const core=csmCopiedCoreReminders(a,bearer,source('Sorcerer In Terminator Armour'));expect(core.find(r=>r.title==='Soul Link · Deep Strike')!.summary).toContain('other models without Deep Strike');expect(core.some(r=>r.title.includes('Invulnerable'))).toBe(false);expect(core.find(r=>r.title==='Soul Link · Core and Faction abilities')!.summary).toContain('Soul Link itself grants the actual bearer the Psyker keyword');
 const live=a.instances!.filter(s=>s.unit!=='Sorcerer In Terminator Armour');expect(csmCopiedCoreReminders(a,bearer,source('Sorcerer In Terminator Armour'),live).length).toBeGreaterThan(0);
 expect(csmCopiedIntrinsicReminders({...a,upgrades2026:{}},bearer,source('Sorcerer'))).toEqual([]);
});
it('copies source usage independently and keeps replacements conditional, never copying loadouts or attachment permission',()=>{
 let a=army(['Sorcerer','Chaos Lord','Chaos Lord In Terminator Armour','Chosen'],['Deceptors']);a=upgrade(join(a,'Sorcerer','Chosen'),'Sorcerer','Soul Link');
 const bearer=a.instances![0],lord=a.instances![1],term=a.instances![2],rows=csmCopiedIntrinsicReminders(a,bearer,lord);
 expect(rows.some(r=>r.title==='Soul Link · Chance for Glory')).toBe(true);expect(rows.every(r=>r.summary.startsWith('Only if '+id('Sorcerer')+' chose '+id('Chaos Lord')))).toBe(true);
 expect(csmCopiedCoreReminders(a,bearer,term).find(r=>r.title==='Soul Link · Core and Faction abilities')!.summary).toContain('does not copy weapons');
 expect(get(a,'Gift of Chaos').every(r=>r.summary.includes('not to have been replaced'))).toBe(true);
 expect(profile(a,'Melee weapon profiles').find(r=>r.units?.includes(id('Sorcerer')))!.summary).not.toContain('Daemon hammer');
});
it('keeps earned Raider control and sticky Cultist objectives after their sources die',()=>{
 let a=army(['Red Corsairs Raiders','Chaos Lord','Cultist Mob']);a=join(a,'Chaos Lord','Red Corsairs Raiders');
 const active=a.instances!.filter(s=>s.unit==='Chaos Lord');
 const earned=get(a,'Trophy Takers · Earned control',active);expect(earned).toHaveLength(5);expect(earned[0].units).toEqual([id('Chaos Lord')]);expect(earned[0].summary).toContain('had already destroyed');
 expect(get(a,'For the Dark Gods',active)).toEqual([]);expect(get(a,'For the Dark Gods · Held objective',active)).toHaveLength(5);
});
it('preserves the Enforcer’s original leading rule and resolves the required sacrifice before Overwatch',()=>{
 const a=join(army(['Traitor Enforcer','Traitor Guardsmen Squad']),'Traitor Enforcer','Traitor Guardsmen Squad'),active=a.instances!.filter(s=>s.unit==='Traitor Enforcer');
 expect(get(a,'Brutal Example',active)[0].summary).toContain('before resolving Fire Overwatch');expect(get(a,'Brutal Example',active)[0].summary).toContain('before choosing the surviving models’ guns');expect(get(a,'Mutated Bodyguard',active)).toHaveLength(5);
});
it('retains conditional copied target effects after a selected Soul Link bearer dies',()=>{
 let a=army(['Chaos Lord','Chosen','Warpsmith','Sorcerer In Terminator Armour','Chaos Rhino'],['Deceptors']);a=upgrade(join(a,'Chaos Lord','Chosen'),'Chaos Lord','Soul Link');
 const active=a.instances!.filter(s=>s.unit!=='Chaos Lord'),rows=csmIntrinsicReminders(a,active);
 const copied=rows.filter(r=>r.title.startsWith('Soul Link · '));expect(copied.length).toBeGreaterThan(0);expect(copied.every(r=>r.summary.includes(id('Chaos Lord'))&&r.summary.includes('before its destruction'))).toBe(true);
 expect(copied.some(r=>r.title.includes('Death Hex'))).toBe(true);expect(copied.some(r=>r.title.includes('Master of Mechanisms'))).toBe(true);expect(copied.some(r=>r.title.includes('Chance for Glory'))).toBe(false);
});
it('applies current Psychic attack modifier rules and keeps Warpsmith Lone Operative dependent on every attached model',()=>{
 const a=join(army(['Warpsmith','Legionaries','Chaos Rhino','Sorcerer']),'Warpsmith','Legionaries');
 const normal=profile(a,'Ranged weapon profiles').find(r=>r.window==='Shooting'&&r.units?.includes(id('Sorcerer')))!;expect(normal.summary).toContain('ignore any or all modifiers');expect(normal.summary).toContain('Ballistic Skill or Weapon Skill');
 const snap=profile(a,'Ranged weapon profiles').find(r=>r.window==='Movement'&&r.units?.includes(id('Sorcerer')))!;expect(snap.summary).not.toContain('ignore any or all modifiers');
 expect(get(a,'Warpsmith')[0].summary).toContain('every surviving model');expect(get(a,'Warpsmith')[0].summary).toContain('Bodyguard without it prevents');
});
it('does not leak Chaos Space Marine generators into other factions',()=>{
 const a={...army(['Cypher']),faction:'Chaos Daemons' as const};expect(csmIntrinsicReminders(a)).toEqual([]);expect(csmProfileReminders(a)).toEqual([]);expect(csmReactionShooting(a,a.instances![0])).toEqual([]);
});
