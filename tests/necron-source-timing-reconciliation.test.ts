// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {BATTLEFIELD_RULES} from '../src/necron-battlefield-rules';

// Current reproduced Necrons App 11e v1.2 cards:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Spyders
// https://wahapedia.ru/wh40k11ed/factions/necrons/Doomsday-Ark
// https://wahapedia.ru/wh40k11ed/factions/necrons/Psychomancer
// https://wahapedia.ru/wh40k11ed/factions/necrons/Transcendent-C-tan
// https://wahapedia.ru/wh40k11ed/factions/necrons/Ophydian-Destroyers
const army=(...instances:RosterInstance[])=>({...newSelection('Necrons'),instances});
const rules=(a:ReturnType<typeof army>,title:string,roster?:RosterInstance[])=>necronDatasheetReminders2026(a,roster).filter(r=>r.title.includes(' · '+title));
describe('Necron source-to-output activation and timing reconciliation',()=>{
 it('prints Canoptek Swarm only in own Command and preserves the original Command completion key',()=>{
  const a=army({id:'spyders',unit:'Canoptek Spyders',models:2},{id:'scarabs',unit:'Canoptek Scarab Swarms',models:3},{id:'other',unit:'Immortals',models:5});
  const actual=rules(a,'Canoptek Swarm');
  expect(actual).toMatchObject([{id:'11e-necron-spyder-swarm',window:'Command',turn:'own',timing:'during',units:['scarabs']}]);
  expect(actual[0].summary).toMatch(/one surviving friendly Scarab Swarm unit within 6″.*one destroyed model.*each surviving Spyder model/);
  expect(actual[0].summary).toContain('not a Reanimation Protocols activation');
  expect(generate11thReminders(a).filter(r=>r.title.includes(' · Canoptek Swarm'))).toHaveLength(1);
 });
 it('keeps two Spyder units independent and never targets an unrelated unit or a destroyed swarm',()=>{
  const a=army({id:'first',unit:'Canoptek Spyders',models:1},{id:'second',unit:'Canoptek Spyders',models:2},{id:'scarabs',unit:'Canoptek Scarab Swarms',models:3},{id:'other',unit:'Canoptek Scarab Swarms',models:3});
  expect(rules(a,'Canoptek Swarm').map(r=>r.id)).toEqual(['11e-necron-spyder-swarm','11e-necron-spyder-swarm-second-Command']);
  const live=expandRoster(a).map(s=>s.id==='scarabs'||s.id==='first'?{...s,models:0}:s);
  expect(rules(a,'Canoptek Swarm',live)).toMatchObject([{title:'second · Canoptek Swarm',units:['other'],window:'Command'}]);
  expect(rules(a,'Canoptek Swarm',live.filter(s=>s.unit!=='Canoptek Scarab Swarms'))).toEqual([]);
  expect(rules(a,'Canoptek Swarm',live.map(s=>s.id==='other'?{...s,models:0}:s))).toEqual([]);
 });
 it('distinguishes the Doomsday Ark decision during own Movement and conditional cannon benefit in own Shooting',()=>{
  const a=army({id:'ark',unit:'Doomsday Ark'});
  const actual=rules(a,'Overwhelming Obliteration');
  expect(actual.map(r=>[r.window,r.turn,r.timing])).toEqual([['Movement','own','during'],['Shooting','own','during']]);
  expect(actual[0].summary).toContain('until turn end');
  expect(actual[1].summary).toMatch(/remained stationary in your Movement phase.*doomsday cannon.*Devastating Wounds/i);
  expect(rules(a,'Overwhelming Obliteration',[])).toEqual([]);
  expect(rules(a,'Overwhelming Obliteration',[{...expandRoster(a)[0],models:0}])).toEqual([]);
  for(const [id,phase] of [['doomsday-still','Movement'],['doomsday-shoot','Shooting']])expect(BATTLEFIELD_RULES.find(r=>r.id===id)).toMatchObject({phase,turn:'own'});
 });
 it('keeps Nightmare Shroud in the opposing Command phase, and Despair at each own phase start',()=>{
  const a=army({id:'psycho',unit:'Psychomancer'});
  expect(rules(a,'Nightmare Shroud')).toMatchObject([{id:'11e-necron-extra-nightmare-shroud-psycho-Command',window:'Command',turn:'opponent',timing:'during'}]);
  expect(rules(a,'Nightmare Shroud')[0].summary).toMatch(/below Starting Strength within 6″.*−1/);
  const despair=rules(a,'Harbinger of Despair');
  expect(despair.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
  expect(despair.every(r=>r.turn==='own'&&r.timing==='start'&&r.summary.includes('Once per turn'))).toBe(true);
  expect(rules(a,'Nightmare Shroud',[{...expandRoster(a)[0],models:0}])).toEqual([]);
 });
 it('keeps Transdimensional Displacement confined to the optional own Movement Advance',()=>{
  const a=army({id:'shard',unit:'Transcendent C’tan'});
  const actual=rules(a,'Transdimensional Displacement');
  expect(actual).toMatchObject([{id:'11e-necron-transcendent-displacement',window:'Movement',turn:'own',timing:'during'}]);
  expect(actual[0].summary).toMatch(/may use this ability.*no maximum distance.*all types of model.*more than 8 inches horizontally/);
  expect(BATTLEFIELD_RULES.find(r=>r.id==='displace')).toMatchObject({signal:'advance',phase:'Movement',turn:'own'});
 });
 it('separates Ophydian removal at the end of the opposing turn from conditional own Movement ingress',()=>{
  const a=army({id:'ophydians',unit:'Ophydian Destroyers',models:3});
  const actual=rules(a,'Tunnelling Horrors');
  expect(actual.map(r=>[r.window,r.turn,r.timing])).toEqual([['End of opponent turn','opponent','end'],['Movement','own','during']]);
  expect(actual[0].summary).toContain('If unengaged');
  expect(actual[1].summary).toMatch(/If Tunnelling Horrors was used.*must make an ingress move.*including on your first turn/);
  expect(rules(a,'Tunnelling Horrors',[{...expandRoster(a)[0],models:0}])).toEqual([]);
 });
 it.each(['Ophydian Destroyers','Skorpekh Destroyers'])('gives %s the Plasmacyte decision only when selected to fight',unit=>{
  const a=army({id:'destroyers',unit,models:3,wargear:{Plasmacyte:1}});
  const actual=rules(a,'Plasmacyte');
  expect(actual).toMatchObject([{window:'Fight',timing:'during'}]);
  expect(actual[0].summary).toMatch(/One use per equipped Plasmacyte.*selected to fight.*unused Plasmacyte.*until this phase ends/);
  expect(rules(army({id:'destroyers',unit,models:3}),'Plasmacyte')).toEqual([]);
 });
});
