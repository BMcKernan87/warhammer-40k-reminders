// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';

// Reproduced App Necrons v1.2 cards and Core 01.02.02 / 05.04.04 / 19.04.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Obelisk
// https://wahapedia.ru/wh40k11ed/factions/necrons/Chronomancer
// https://wahapedia.ru/wh40k11ed/factions/necrons/Triarch-Stalker
// https://wahapedia.ru/wh40k11ed/factions/necrons/Nekrosor-Ammentar
// https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Macrocytes
// https://wahapedia.ru/wh40k11ed/factions/necrons/Trazyn-The-Infinite
// https://wahapedia.ru/wh40k11ed/the-rules/rules-appendix/
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Necrons'),instances});
const squad=(id:string,unit:string,patch:Partial<RosterInstance>={}):RosterInstance=>({id,unit,...patch});
const rows=(a:ArmySelection,name:string,live=expandRoster(a))=>necronDatasheetReminders2026(a,live).filter(r=>r.title.includes(' · '+name));
const omit=(a:ArmySelection,...ids:string[])=>expandRoster(a).filter(s=>!ids.includes(s.id));
const zero=(a:ArmySelection,...ids:string[])=>expandRoster(a).map(s=>ids.includes(s.id)?{...s,models:0}:s);

describe('Necron intrinsic current-source and prior-effect identity reconciliation',()=>{
 it.each([
  ['Geomancer','Tectonic Reverberations'],
  ['Obelisk','Gravitic Pulse'],
  ['Doom Scythe','Atavistic Instigation'],
  ['Triarch Stalker','Targeting Relay'],
  ['Catacomb Command Barge','Carrier Wave'],
  ['Canoptek Reanimator','Nanoscarab Reanimation Beam'],
  ['Illuminor Szeras','Mechanical Augmentation'],
 ] as const)('treats a zero-model %s as removed for %s without discarding prior duration',(unit,name)=>{
  const a=army(squad('source',unit),squad('recipient','Necron Warriors'));
  const all=rows(a,name);
  expect(all.length).toBeGreaterThan(0);
  const removed=rows(a,name,omit(a,'source')),destroyed=rows(a,name,zero(a,'source'));
  expect(destroyed).toEqual(removed);
  expect(destroyed.some(r=>r.title==='source · '+name)).toBe(false);
  expect(rows(a,'Ranged weapon abilities',zero(a,'source')).some(r=>r.title.startsWith('source ·'))).toBe(false);
  const neverMustered=army(squad('source',unit,{models:0}),squad('recipient','Necron Warriors'));
  expect(rows(neverMustered,name)).toEqual([]);
 });
 it('retains a legal charge restriction on the remaining original formation but not on a dead or reused recipient',()=>{
  const a=army(squad('body','Immortals',{models:5}),squad('chrono','Chronomancer',{attachedTo:'body'}),
   squad('retinue','Cryptothralls',{retinueTo:'body'}),squad('other','Immortals',{models:5}));
  const prior=rows(a,'Chronometron',zero(a,'chrono','body'));
  expect(prior).toEqual(rows(a,'Chronometron',omit(a,'chrono','body')));
  expect(prior).toMatchObject([{window:'Charge',units:['retinue'],turn:'own'}]);
  expect(rows(a,'Chronometron',zero(a,'chrono','body','retinue'))).toEqual([]);
  const duplicated=[...omit(a,'chrono','retinue'),squad('body','Immortals',{models:5})];
  expect(rows(a,'Chronometron',duplicated)).toEqual([]);
  const changed=zero(a,'chrono','body','retinue').map(s=>s.id==='chrono'?{...s,unit:'Technomancer'}:s);
  expect(rows(a,'Chronometron',changed)).toEqual([]);
 });
 it('retains the legal prior-use gate restriction through zero-model source or Infantry-bearer loss',()=>{
  const a=army(squad('gate','Monolith'),squad('body','Canoptek Wraiths',{models:3}),squad('tech','Technomancer',{attachedTo:'body'}),squad('other','Canoptek Wraiths',{models:3}));
  const expected=rows(a,'Eternity Gate',omit(a,'gate','tech'));
  expect(rows(a,'Eternity Gate',zero(a,'gate','tech'))).toEqual(expected);
  expect(expected).toMatchObject([{window:'Charge',units:['body']},{window:'Shooting',units:['body']}]);
  expect(rows(a,'Eternity Gate',zero(a,'gate','tech','body'))).toEqual([]);
 });
 it('retains the previously selected Prophet effect after explicit source and recipient keyword-bearer losses',()=>{
  const a={...army(squad('prophet','Nekrosor Ammentar'),squad('body','Immortals',{models:5}),squad('lord','Overlord',{attachedTo:'body'}),squad('other','Immortals',{models:5})),
   detachments2026:['Cursed Legion'],upgrades2026:{lord:'Destroyer Ankh'}};
  const expected=rows(a,'Prophet of Destruction',omit(a,'prophet','lord'));
  expect(rows(a,'Prophet of Destruction',zero(a,'prophet','lord'))).toEqual(expected);
  expect(expected.map(r=>[r.window,r.units])).toEqual([['Movement',['body']],['Shooting',['body']],['Fight',['body']]]);
  expect(rows(a,'Prophet of Destruction',zero(a,'prophet','lord','body'))).toEqual([]);
 });
 it('keeps the original selected Mandible effect after the source or its recipient keyword source is destroyed',()=>{
  const a=army(squad('macro','Canoptek Macrocytes',{models:5,wargear:{'Accelerator mandible':1}}),squad('body','Immortals',{models:5}),
   squad('tech','Technomancer',{attachedTo:'body'}),squad('crawlers','Canoptek Tomb Crawlers',{retinueTo:'body'}));
  const expected=rows(a,'Accelerator Mandible',omit(a,'macro','crawlers'));
  expect(rows(a,'Accelerator Mandible',zero(a,'macro','crawlers'))).toEqual(expected);
  expect(expected).toMatchObject([{window:'Fight',units:['body'],title:'macro · Accelerator Mandible · selected formation'}]);
 });
 it('retains secured objectives after Trazyn is explicitly destroyed, without a new Command action',()=>{
  const a=army(squad('body','Immortals',{models:5}),squad('trazyn','Trazyn the Infinite',{attachedTo:'body'}));
  const expected=rows(a,'Ancient Collector',omit(a,'trazyn','body'));
  expect(rows(a,'Ancient Collector',zero(a,'trazyn','body'))).toEqual(expected);
  expect(expected).toHaveLength(5);
  expect(expected.every(r=>r.title.endsWith('secured objective'))).toBe(true);
 });
 it('rejects ambiguous original or observed source identities rather than treating them as a prior activation',()=>{
  const first=squad('obelisk','Obelisk'),a=army(first,squad('other','Immortals'));
  for(const snapshot of [[...expandRoster(a),first],[...expandRoster(a),{...first,models:0}],[{...first,unit:'Monolith',models:0}]]){
   expect(rows(a,'Gravitic Pulse',snapshot)).toEqual([]);
  }
  expect(rows(army(first,{...first}),'Gravitic Pulse',[])).toEqual([]);
 });
 it('checks Gravitic Pulse after any permitted opposing Shooting-phase move through its printed expiry',()=>{
  const a=army(squad('obelisk','Obelisk'));
  const cue=rows(a,'Gravitic Pulse').find(r=>r.window==='Shooting');
  expect(cue).toMatchObject({id:'11e-necron-extra-gravitic-shooting-obelisk-Shooting',turn:'opponent',timing:'during',units:['obelisk']});
  expect(cue?.summary).toMatch(/selected an enemy that can Fly.*finishes any permitted move.*4\+.*D3 mortal wounds.*fixed-distance move.*until the start of your next Movement phase/);
  expect(cue?.summary).toContain('This does not grant movement permission');
  expect(rows(a,'Gravitic Pulse',[]).find(r=>r.window==='Shooting')).toEqual(cue);
 });
 it('selects the Targeting Relay enemy only after all the source attacks resolve in own Shooting',()=>{
  const a=army(squad('stalker','Triarch Stalker'));
  const cue=rows(a,'Targeting Relay')[0];
  expect(cue).toMatchObject({window:'Shooting',turn:'own',timing:'during'});
  expect(cue.summary).toMatch(/After resolving all.*attacks in your Shooting phase.*one enemy unit it hit.*until the end of this phase/);
 });
});
