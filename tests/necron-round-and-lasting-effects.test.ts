import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders,grouped11thReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';

const roster=(...instances:RosterInstance[])=>({...newSelection('Necrons'),instances});
const unit=(id:string,unit:string)=>({id,unit});
const sheets=(army:ReturnType<typeof roster>,ability:string)=>generate11thReminders(army).filter(r=>r.title.includes(' · '+ability));

// Necrons datasheets v1.2, September faction pack v1.3, core 07.01, 12, 19.04 and 24.02.
describe('army-specific timing and persistent effects',()=>{
 it('orders the Triarch choice before either player’s turn and lists only legal targets for each alternative',()=>{
  const army=roster(unit('king','The Silent King'),unit('shard','Transcendent C’tan'),unit('body','Immortals'),{...unit('chrono','Chronomancer'),attachedTo:'body'});
  const groups=grouped11thReminders(army);
  expect(groups.slice(0,3).map(g=>g.window)).toEqual(['Pre-battle','Start of battle round','Command']);
  expect(sheets(army,'Triarch Abilities')).toMatchObject([{window:'Start of battle round',timing:'start',units:['king']}]);
  expect(sheets(army,'Relentless March')[0].units).toEqual(['king','shard','body']);
  for(const reminder of [...sheets(army,'Phaeron of the Blades'),...sheets(army,'Phaeron of the Stars')]){
   expect(reminder.units).toEqual(['king','body']);
  }
  expect(sheets(roster(unit('shard','Transcendent C’tan')),'Triarch Abilities')).toEqual([]);
 });
 it('carries a timed pin and the death ray choice forward to the actual enemy moves and attacks',()=>{
  const army=roster(unit('scythe','Doom Scythe'),unit('obelisk','Obelisk'),unit('geo','Geomancer'));
  const pulse=sheets(army,'Gravitic Pulse');
  expect(pulse.map(r=>[r.window,r.turn])).toEqual([['Movement','opponent'],['Charge','opponent'],['Fight','opponent']]);
  expect(pulse[1].summary).toMatch(/halve the Charge roll.*can Fly.*4\+/);
  expect(pulse[2].summary).toMatch(/each pile-in or consolidation.*until the start of your next Movement/);
  expect(sheets(army,'Tectonic Reverberations').map(r=>[r.window,r.turn])).toEqual([['Movement','own'],['Movement','opponent'],['Charge','opponent']]);
  expect(sheets(army,'Tectonic Reverberations').find(r=>r.window==='Charge')?.summary).toContain('subtracts 2 from its Charge rolls');
  const deathRay=sheets(army,'Atavistic Instigation');
  expect(deathRay.find(r=>r.window==='Shooting'&&r.turn==='opponent')?.summary).toMatch(/ducked for cover.*subtract 1/);
  expect(deathRay.find(r=>r.window==='Fight')?.summary).toMatch(/melee attacks.*start of your next Shooting phase/);
 });
 it('applies the shoot-and-move charge lock only to the formation that used it',()=>{
  const army=roster(unit('first','Immortals'),unit('other','Immortals'),{...unit('tech','Chronomancer'),attachedTo:'first'},unit('blades','Tomb Blades'));
  for(const [ability,recipient] of [['Chronometron','first'],['Evasion Engrams','blades']]){
   const cue=sheets(army,ability).find(r=>r.window==='Charge');
   expect(cue).toMatchObject({units:[recipient],turn:'own',summary:expect.stringMatching(/cannot declare a charge if .*optional Normal move/)});
  }
 });
 it('applies one personal 4+ Feel No Pain choice over the Technomancer’s formation-wide 5+ and keeps other units outside the effect',()=>{
  const army=roster(unit('wraith','Canoptek Wraiths'),{...unit('tech','Technomancer'),attachedTo:'wraith'},{...unit('thralls','Cryptothralls'),retinueTo:'wraith'},unit('other','Canoptek Wraiths'));
  const save=sheets(army,'Bound Creation').find(r=>r.window==='Fight');
  expect(save).toMatchObject({units:['tech'],summary:expect.stringMatching(/Cryptek model has Feel No Pain 4\+.*one applicable Feel No Pain roll/)});
  expect(sheets(army,'Rites of Reanimation').find(r=>r.window==='Fight')?.units?.sort()).toEqual(['tech','thralls','wraith']);
  expect(sheets(army,'Systematic Vigour')[0].units).toEqual(['thralls']);
 });
 it('distinguishes legal aura formations, Ark and Warrior activation limits, and Trazyn’s battlefield requirements',()=>{
  const army=roster(unit('prophet','Nekrosor Ammentar'),unit('shard','C’tan Shard of the Nightbringer'),unit('vault','Tesseract Vault'),unit('ark','Ghost Ark'),unit('warriors','Necron Warriors'),unit('king','Trazyn the Infinite'),{...unit('tech','Plasmancer'),attachedTo:'warriors'});
  expect(sheets(army,'Infectious Murder-madness')[0].units).toEqual(['prophet','ark','warriors','king']);
  expect(sheets(army,'Repair Barge')[0]).toMatchObject({units:['warriors'],summary:expect.stringMatching(/Once per turn for this Ark.*finishes its attacks.*only once per turn across all Arks/)});
  expect(sheets(army,'Surrogate Hosts')[0]).toMatchObject({units:['tech'],turn:'own',summary:expect.stringMatching(/Trazyn is on the battlefield.*host on the battlefield.*destruction triggers.*full wounds/)});
 });
});

describe('ordinary attacks during Fire Overwatch in core 15.08–09',()=>{
 it('includes Wound re-rolls and wound modifiers for the joined formation while excluding hit- and phase-specific triggers',()=>{
  const army=roster(unit('immortals','Immortals'),{...unit('plasmancer','Plasmancer'),attachedTo:'immortals'},{...unit('crawlers','Canoptek Tomb Crawlers'),retinueTo:'immortals'},unit('barge','Annihilation Barge'));
  const atOverwatch=(ability:string)=>sheets(army,ability).filter(c=>c.window==='Movement'&&c.timing==='end'&&c.turn==='opponent');
  const wound=atOverwatch('Implacable Eradication');
  expect(wound).toHaveLength(1);
  expect(wound[0].units?.sort()).toEqual(['crawlers','immortals','plasmancer']);
  expect(wound[0].summary).toMatch(/re-roll.*Wound roll of 1|Re-roll Wound rolls of 1/);
  expect(wound[0].summary).toContain('objective');
  expect(atOverwatch('Weapon Sentinels')[0].summary).toMatch(/within 12″.*ignore Wound roll modifiers.*unmodified Hit rolls/);
  expect(atOverwatch('Harbinger of Destruction')).toEqual([]);
  expect(atOverwatch('Malevolent Arcing')).toEqual([]);
 });
 it('uses the selected weapons for Heavy Destroyers and applies only legal Lord rerolls on snap shots',()=>{
  const army=roster({...unit('gauss','Lokhust Heavy Destroyers'),equipment:'Gauss destructor'},
   {...unit('enmitic','Lokhust Heavy Destroyers'),equipment:'Enmitic exterminator'},
   {...unit('lord','Lokhust Lord'),attachedTo:'gauss'},unit('scythe','Doom Scythe'));
  const snap=sheets(army,'Optimised for Slaughter').filter(r=>r.window==='Movement');
  expect(snap.find(r=>r.units?.includes('gauss'))?.summary).toMatch(/Gauss destructor.*against Monsters and Vehicles/);
  expect(snap.find(r=>r.units?.includes('enmitic'))?.summary).not.toContain('Gauss destructor');
  expect(sheets(army,'Driven by Hatred').find(r=>r.window==='Movement')?.summary).toMatch(/below half-strength.*re-roll its Wound rolls.*prevents Hit re-rolls/);
  expect(sheets(army,'Atavistic Instigation').find(r=>r.window==='Movement')?.summary).toMatch(/cannot turn snap shots into Critical Hits.*−1 to Hit/);
 });
 it('applies attack defences to enemy reactions with the recipient-specific eligibility and once-per-turn limits intact',()=>{
  const army=roster(unit('ark','Ghost Ark'),unit('warriors','Necron Warriors'),{...unit('orikan','Orikan the Diviner'),attachedTo:'warriors'},unit('guard','Lychguard'),{...unit('lord','Overlord'),attachedTo:'guard'},unit('alone','Lychguard'));
  const reaction=(ability:string)=>sheets(army,ability).filter(r=>r.window==='Movement');
  expect(reaction('Repair Barge')).toMatchObject([{units:['warriors'],turn:'either',summary:expect.stringMatching(/Fire Overwatch.*each Warriors formation|Fire Overwatch.*only once per turn across all Arks/)}]);
  expect(reaction('Master Chronomancer')[0].units?.sort()).toEqual(['orikan','warriors']);
  expect(reaction('Guardian Protocols')).toHaveLength(1);
  expect(reaction('Guardian Protocols')[0].units?.sort()).toEqual(['guard','lord']);
 });
});
