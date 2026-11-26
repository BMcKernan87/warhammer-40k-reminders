import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {PHASES} from '../src/engine';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
import {generate11thReminders} from '../src/reminders-11th';

const army=(...instances:RosterInstance[])=>({...newSelection('Necrons'),instances});
const unit=(id:string,name:string):RosterInstance=>({id,unit:name});
const card=(name:string)=>'https://wahapedia.ru/wh40k11ed/factions/necrons/'+name;
const named=(a:ReturnType<typeof army>,name:string,survivors=expandRoster(a))=>
 necronDatasheetReminders2026(a,survivors).filter(r=>r.title.includes(' · '+name));

// Monolith: one Infantry unit is selected when the gate is used; the charge
// restriction lasts that turn. The current faction FAQ allows shooting away
// from a battlefield edge. Core 01.02.02 retains effects through their duration,
// and 19.01/19.04 preserve the original legally joined unit after casualties.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Monolith
// https://wahapedia.ru/wh40k11ed/factions/necrons/#FAQ
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/#Persisting-Rules-Effects
describe('Eternity Gate consequences on original surviving formations',()=>{
 it('selects exactly one current Infantry formation and retains distinct conditional follow-ups',()=>{
  const a=army(unit('gate','Monolith'),unit('first','Immortals'),unit('second','Immortals'),unit('wraiths','Canoptek Wraiths'));
  const rows=named(a,'Eternity Gate');
  expect(rows.find(r=>r.window==='Movement')).toMatchObject({units:['first','second'],summary:expect.stringContaining('choose one friendly Necrons Infantry unit')});
  expect(rows.filter(r=>r.window!=='Movement').map(r=>[r.window,r.units,r.turn])).toEqual([
   ['Charge',['first','second'],'own'],['Shooting',['first','second'],'own'],
  ]);
  expect(rows.filter(r=>r.window!=='Movement').every(r=>r.source===card('Monolith')&&r.summary.includes('Only the formation that actually used this Monolith’s gate is affected'))).toBe(true);
 });

 it('keeps the used gate’s charge restriction and shooting permission after the Monolith is destroyed',()=>{
  const a=army(unit('gate','Monolith'),unit('body','Immortals'));
  const rows=named(a,'Eternity Gate',expandRoster(a).filter(s=>s.id!=='gate'));
  expect(rows).toHaveLength(2);
  expect(rows.find(r=>r.window==='Charge')).toMatchObject({units:['body'],turn:'own',summary:expect.stringMatching(/used this Monolith’s gate.*cannot make a Charge move until turn end.*Monolith is destroyed/)});
  expect(rows.find(r=>r.window==='Shooting')).toMatchObject({units:['body'],turn:'own',summary:expect.stringMatching(/may shoot.*away from a battlefield edge.*Monolith is destroyed.*all other shooting restrictions still apply/)});
  expect(rows.some(r=>r.window==='Movement')).toBe(false);
 });

 it('retains the existing recipient after the joined Infantry source dies, without offering another ingress',()=>{
  const a=army(unit('gate','Monolith'),unit('body','Canoptek Wraiths'),{...unit('tech','Technomancer'),attachedTo:'body'},unit('unled','Canoptek Wraiths'));
  const rows=named(a,'Eternity Gate',expandRoster(a).filter(s=>s.id!=='tech'));
  expect(rows.map(r=>[r.window,r.units])).toEqual([['Charge',['body']],['Shooting',['body']]]);
  expect(rows.every(r=>r.summary.includes('formation loses its Infantry keyword'))).toBe(true);
  expect(rows.some(r=>r.summary.includes('unled'))).toBe(false);
 });

 it('follows the original formation through the loss of its Bodyguard and Infantry source',()=>{
  const a=army(unit('gate','Monolith'),unit('body','Canoptek Wraiths'),{...unit('tech','Technomancer'),attachedTo:'body'},
   {...unit('retinue','Canoptek Tomb Crawlers'),retinueTo:'body'});
  const remaining=expandRoster(a).filter(s=>s.id==='retinue');
  expect(named(a,'Eternity Gate',remaining).map(r=>[r.window,r.units])).toEqual([['Charge',['retinue']],['Shooting',['retinue']]]);
  expect(named(a,'Eternity Gate',[])).toEqual([]);
 });

 it('does not transfer a gate consequence to replaced IDs, newly supplied models or changed retinue links',()=>{
  const a=army(unit('gate','Monolith'),unit('body','Canoptek Wraiths'),{...unit('tech','Technomancer'),attachedTo:'body'},
   {...unit('retinue','Canoptek Tomb Crawlers'),retinueTo:'body'});
  for(const remaining of [
   [unit('body','Necron Warriors')],
   [unit('new','Immortals')],
   [{...unit('retinue','Canoptek Tomb Crawlers'),retinueTo:'elsewhere'}],
  ])expect(named(a,'Eternity Gate',remaining)).toEqual([]);
  expect(named(a,'Eternity Gate',[unit('gate','Doomsday Ark'),unit('body','Canoptek Wraiths')])).toEqual([]);
 });

 it('does not borrow Infantry from an illegal original Support attachment',()=>{
  const a=army(unit('gate','Monolith'),unit('body','Canoptek Wraiths'),{...unit('wrong','Chronomancer'),attachedTo:'body'});
  expect(named(a,'Eternity Gate',[unit('body','Canoptek Wraiths')])).toEqual([]);
 });

 it('keeps the source identities of two Monoliths separate through loss of either one',()=>{
  const a=army(unit('first','Monolith'),unit('second','Monolith'),unit('body','Immortals'));
  const remaining=expandRoster(a).filter(s=>s.id!=='first');
  const rows=named(a,'Eternity Gate',remaining);
  expect(rows.filter(r=>r.window==='Movement').map(r=>r.title)).toEqual(['second · Eternity Gate']);
  expect(rows.filter(r=>r.window==='Charge').map(r=>r.title)).toEqual(['first · Eternity Gate · charge restriction','second · Eternity Gate · charge restriction']);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 });
});

// Card rules are continuous rather than limited to the Command phase.
// Core 14.02: control is determined at the end of every phase and turn.
// Core 14.02.01: determine control before other end-of-phase/turn rules.
// Core 01.07 / 02.02: Battle-shock's '-' OC is not restored by these modifiers.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// https://wahapedia.ru/wh40k11ed/factions/necrons/Catacomb-Command-Barge
// https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Scarab-Swarms
// https://wahapedia.ru/wh40k11ed/factions/necrons/The-Silent-King
describe('continuous Necron control and Leadership effects',()=>{
 const controlWindows=[...PHASES,'End of your turn','End of opponent turn'];

 it('checks Carrier Wave in every control window with the unit’s range and actual formation identities',()=>{
  const a=army(unit('barge','Catacomb Command Barge'),unit('first','Immortals'),unit('second','Immortals'),
   {...unit('support','Chronomancer'),attachedTo:'first'});
  const rows=named(a,'Carrier Wave');
  expect(rows.map(r=>r.window)).toEqual(controlWindows);
  expect(rows.every(r=>r.timing==='end'&&r.turn==='either'&&r.units?.join(',')==='barge,first,second')).toBe(true);
  expect(rows.every(r=>r.source===card('Catacomb-Command-Barge')&&r.summary.includes('every model in that unit gains +1 OC')&&r.summary.includes('Battle-shocked models retain OC “–”'))).toBe(true);
  expect(named(a,'Carrier Wave',expandRoster(a).filter(s=>s.id!=='barge'))).toEqual([]);
  expect(named(a,'Carrier Wave',expandRoster(a).filter(s=>s.id!=='first'))[0].units).toEqual(['barge','second','support']);
 });

 it('applies Chittering Swarm to every model of an engaged enemy unit, including in Shooting and turn-end scoring',()=>{
  const a=army(unit('scarabs','Canoptek Scarab Swarms'),unit('tech','Technomancer'));
  const rows=named(a,'Chittering Swarm');
  expect(rows.map(r=>r.window)).toEqual(controlWindows);
  expect(rows.every(r=>r.timing==='end'&&r.turn==='either'&&r.units?.join(',')==='scarabs'&&r.source===card('Canoptek-Scarab-Swarms'))).toBe(true);
  expect(rows.every(r=>r.summary.includes('enemy unit is within Engagement Range')&&r.summary.includes('every model in that enemy unit (minimum 1)')&&r.summary.includes('including models not themselves in Engagement Range'))).toBe(true);
  expect(rows.every(r=>r.summary.includes('within 6″ of a surviving friendly Cryptek model')&&r.summary.includes('Battle-shocked models retain OC “–”'))).toBe(true);
 });

 it('removes only the Cryptek-dependent Scarab OC when the last Cryptek dies',()=>{
  const a=army(unit('scarabs','Canoptek Scarab Swarms'),unit('first','Technomancer'),unit('second','Plasmancer'));
  expect(named(a,'Chittering Swarm',expandRoster(a).filter(s=>s.id!=='first')).every(r=>r.summary.includes('Scarab models have OC 1'))).toBe(true);
  const noCryptek=named(a,'Chittering Swarm',[unit('scarabs','Canoptek Scarab Swarms')]);
  expect(noCryptek).toHaveLength(controlWindows.length);
  expect(noCryptek.every(r=>!r.summary.includes('Cryptek')&&r.summary.includes('every model in that enemy unit'))).toBe(true);
  expect(named(a,'Chittering Swarm',expandRoster(a).filter(s=>s.id!=='scarabs'))).toEqual([]);
 });

 it.each([
  ['Monolith',7,4],['Obelisk',8,4],['Tesseract Vault',8,4],['Seraptek Heavy Construct',9,5],
 ] as const)('retains %s damaged OC for every control check without changing its threshold',(name,wounds,penalty)=>{
  const a=army(unit('damaged',name));
  const rows=named(a,'Damaged profile · OC');
  expect(rows.map(r=>r.window)).toEqual(controlWindows);
  expect(rows.every(r=>r.timing==='end'&&r.turn==='either'&&r.units?.join(',')==='damaged')).toBe(true);
  expect(rows.every(r=>r.summary.includes('1–'+wounds+' wounds remaining, subtract '+penalty+' from its OC')&&r.summary.includes('before resolving other end-of-phase or end-of-turn rules'))).toBe(true);
  expect(named(a,'Damaged profile · OC',[])).toEqual([]);
 });

 it('keeps the King’s Leadership aura on every phase’s required rolls without limiting it to non-Monsters',()=>{
  const a=army(unit('king','The Silent King'),unit('shard','C’tan Shard of the Nightbringer'),unit('body','Immortals'),
   {...unit('support','Chronomancer'),attachedTo:'body'});
  const rows=named(a,'The Silent King · Leadership');
  expect(rows.map(r=>r.window)).toEqual(PHASES);
  expect(rows.every(r=>r.turn==='either'&&r.units?.join(',')==='king,shard,body'&&r.source===card('The-Silent-King'))).toBe(true);
  expect(rows.every(r=>r.summary.includes('within 6″ of the surviving Szarekh model')&&r.summary.includes('Leadership and Battle-shock rolls')&&r.summary.includes('including outside the Command phase'))).toBe(true);
  expect(named(a,'The Silent King · Leadership',expandRoster(a).filter(s=>s.id!=='king'))).toEqual([]);
 });
});

// https://wahapedia.ru/wh40k11ed/factions/necrons/Immortals: Implacable
// Eradication triggers on attacks, including melee and permitted reactions.
describe('Immortal attack reminders do not retain a shooting-only trigger',()=>{
 it('uses the same attack condition in melee, normal shooting and Overwatch',()=>{
  const a=army(unit('body','Immortals'),{...unit('tech','Plasmancer'),attachedTo:'body'},unit('other','Immortals'));
  const rows=generate11thReminders(a).filter(r=>r.title.includes(' · Implacable Eradication'));
  expect(rows).toHaveLength(6);
  expect(rows.every(r=>r.summary.includes('When a model in this unit makes an attack.')&&!r.summary.includes('Selected to shoot.'))).toBe(true);
  expect(rows.filter(r=>r.window==='Fight').map(r=>r.units)).toEqual([['body','tech'],['other']]);
  expect(rows.filter(r=>r.window==='Movement').every(r=>r.turn==='opponent'&&r.timing==='end'&&r.summary.includes('Fire Overwatch'))).toBe(true);
  expect(rows.every(r=>r.source===card('Immortals')&&r.summary.includes('re-roll each Wound roll'))).toBe(true);
 });
});
