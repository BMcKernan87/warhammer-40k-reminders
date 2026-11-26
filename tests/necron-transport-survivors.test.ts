import {describe,it,expect} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {ghostArkPassengers,necronTransportFormations} from '../src/necron-retinues';
import {necronDeploymentReminders} from '../src/necron-deployment';

const army=(...instances:RosterInstance[]):ArmySelection=>({
 ...newSelection('Necrons'),
 units:instances.reduce<Record<string,number>>((units,s)=>({...units,[s.unit]:(units[s.unit]??0)+1}),{}),
 instances,
});
const ids=(a:ArmySelection,roster:readonly RosterInstance[]=expandRoster(a))=>ghostArkPassengers(a,roster).map(s=>s.id);
const without=(roster:RosterInstance[],...lost:string[])=>roster.filter(s=>!lost.includes(s.id));
const cue=(a:ArmySelection,roster:RosterInstance[],key:string)=>necronDeploymentReminders(a,roster).find(r=>r.id==='11e-necron-'+key);

// Current card: https://wahapedia.ru/wh40k11ed/factions/necrons/Ghost-Ark
// Core 18.01/18.02 require the whole current unit to fit. Core 19.01/19.03
// retains the original Attached unit, but does not share model keywords.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
describe('Ghost Ark whole surviving formations',()=>{
 it('does not offer a destroyed original passenger beside an independently surviving duplicate',()=>{
  const a=army({id:'ark',unit:'Ghost Ark'},{id:'first',unit:'Necron Warriors',models:10},{id:'second',unit:'Necron Warriors',models:10});
  const current=without(expandRoster(a),'first');
  expect(ids(a,current)).toEqual(['second']);
  expect(cue(a,current,'passenger-embark')?.units).toEqual(['second']);
  expect(cue(a,current,'emergency-disembark-Shooting')?.units).toEqual(['ark']);
  expect(cue(a,without(current,'second'),'passenger-embark')).toBeUndefined();
  expect(cue(a,without(current,'second'),'emergency-disembark-Shooting')).toBeUndefined();
 });

 it('allows a larger original Warrior squad only after the actual surviving models fit the ten-model compartment',()=>{
  const a=army({id:'ark',unit:'Ghost Ark'},{id:'warriors',unit:'Necron Warriors',models:20},{id:'warden',unit:'Royal Warden',attachedTo:'warriors'});
  const survivors=(models:number)=>expandRoster(a).map(s=>s.id==='warriors'?{...s,models}:s);
  expect(ids(a)).toEqual([]);
  expect(ids(a,survivors(11))).toEqual([]);
  expect(ids(a,survivors(10))).toEqual(['warriors']);
  expect(cue(a,survivors(10),'passenger-embark')?.units).toEqual(['warriors']);
  expect(a.instances?.find(s=>s.id==='warriors')?.models).toBe(20);
 });

 it('counts the separate Character compartment by physical models and never splits attached Characters off',()=>{
  const a=army({id:'ark',unit:'Ghost Ark'},{id:'warriors',unit:'Necron Warriors',models:10},
   {id:'overlord',unit:'Overlord',models:1,attachedTo:'warriors'},
   {id:'tech',unit:'Technomancer',models:1,attachedTo:'warriors'});
  const roster=expandRoster(a);
  expect(ids(a)).toEqual([]);
  expect(ids(a,without(roster,'overlord'))).toEqual(['warriors']);
  expect(ids(a,without(roster,'warriors'))).toEqual([]);
  expect(ids(a,without(roster,'warriors','overlord'))).toEqual(['tech']);
  expect(ids(a,without(roster,'overlord').map(s=>s.id==='tech'?{...s,models:2}:s))).toEqual([]);
 });

 it('keeps joined retinue models in capacity checks after their original Bodyguard or Cryptek dies',()=>{
  const a=army({id:'ark',unit:'Ghost Ark'},{id:'warriors',unit:'Necron Warriors',models:10},
   {id:'tech',unit:'Technomancer',attachedTo:'warriors'},
   {id:'thralls',unit:'Cryptothralls',models:2,retinueTo:'warriors'});
  const roster=expandRoster(a);
  expect(ids(a)).toEqual([]);
  expect(ids(a,without(roster,'tech'))).toEqual([]);
  expect(ids(a,without(roster,'warriors'))).toEqual([]);
  expect(ids(a,without(roster,'thralls'))).toEqual(['warriors']);
  expect(ids(a,without(roster,'warriors','thralls'))).toEqual(['tech']);
 });

 it('permits a surviving originally attached Support but not an unattached or illegally joined Support',()=>{
  const valid=army({id:'ark',unit:'Ghost Ark'},{id:'body',unit:'Immortals'},
   {id:'tech',unit:'Technomancer',attachedTo:'body'});
  expect(ids(valid)).toEqual([]);
  expect(ids(valid,without(expandRoster(valid),'body'))).toEqual(['tech']);
  const unattached=army({id:'ark',unit:'Ghost Ark'},{id:'tech',unit:'Technomancer'});
  expect(ids(unattached)).toEqual([]);
  const illegal=army({id:'ark',unit:'Ghost Ark'},{id:'tech',unit:'Technomancer',attachedTo:'ark'});
  expect(ids(illegal)).toEqual([]);
  expect(ids(illegal,without(expandRoster(illegal),'ark'))).toEqual([]);
 });

 it('rejects substituted original identities and changed attachment or retinue links',()=>{
  const a=army({id:'ark',unit:'Ghost Ark'},{id:'body',unit:'Necron Warriors',models:10},
   {id:'tech',unit:'Technomancer',attachedTo:'body'},
   {id:'thralls',unit:'Cryptothralls',retinueTo:'body'});
  const current=without(expandRoster(a),'body','thralls');
  expect(ids(a,current)).toEqual(['tech']);
  expect(ids(a,current.map(s=>s.id==='tech'?{...s,unit:'Overlord'}:s))).toEqual([]);
  expect(ids(a,current.map(s=>s.id==='tech'?{...s,attachedTo:undefined}:s))).toEqual([]);
  expect(necronTransportFormations(a,expandRoster(a).map(s=>s.id==='thralls'?{...s,retinueTo:'ark'}:s)).some(f=>f.members.some(s=>s.id==='thralls'))).toBe(false);
 });
});

// Current card: https://wahapedia.ru/wh40k11ed/factions/necrons/Night-Scythe
// The unit capacity uses the surviving Attached unit's keywords (Core 19.03),
// unlike the Ghost Ark's model-specific two-compartment capacity.
describe('Night Scythe current Infantry unit eligibility',()=>{
 it('counts a large whole Leader, Support and retinue formation as one unit',()=>{
  const a=army({id:'scythe',unit:'Night Scythe'},{id:'body',unit:'Necron Warriors',models:20},
   {id:'overlord',unit:'Overlord',attachedTo:'body'},{id:'tech',unit:'Technomancer',attachedTo:'body'},
   {id:'thralls',unit:'Cryptothralls',models:2,retinueTo:'body'});
  const roster=expandRoster(a);
  expect(cue(a,roster,'night-scythe-embark')?.units).toEqual(['body']);
  expect(cue(a,roster,'passenger-embark')?.units).toEqual(['body']);
  expect(cue(a,without(roster,'body'),'night-scythe-embark')?.units).toEqual(['thralls']);
  expect(cue(a,without(roster,'body','thralls'),'night-scythe-embark')?.units).toEqual(['overlord']);
  expect(cue(a,without(roster,'body','thralls','overlord'),'night-scythe-embark')?.units).toEqual(['tech']);
 });

 it('retains Infantry only while an actual surviving formation member supplies it',()=>{
  const a=army({id:'scythe',unit:'Night Scythe'},{id:'wraiths',unit:'Canoptek Wraiths',models:3},
   {id:'tech',unit:'Technomancer',attachedTo:'wraiths'});
  const roster=expandRoster(a);
  expect(cue(a,roster,'night-scythe-embark')?.units).toEqual(['wraiths']);
  expect(cue(a,without(roster,'tech'),'night-scythe-embark')).toBeUndefined();
  expect(cue(a,without(roster,'wraiths'),'night-scythe-embark')?.units).toEqual(['tech']);
  expect(cue(a,without(roster,'tech'),'passenger-embark')).toBeUndefined();
 });

 it('does not promote an unattached Support, illegal original join or replacement model into a passenger',()=>{
  for(const a of [army({id:'scythe',unit:'Night Scythe'},{id:'tech',unit:'Technomancer'}),
   army({id:'scythe',unit:'Night Scythe'},{id:'tech',unit:'Technomancer',attachedTo:'scythe'})]){
   expect(cue(a,expandRoster(a),'night-scythe-embark')).toBeUndefined();
  }
  const a=army({id:'scythe',unit:'Night Scythe'},{id:'body',unit:'Immortals'},{id:'tech',unit:'Technomancer',attachedTo:'body'});
  const replaced=without(expandRoster(a),'body').map(s=>s.id==='tech'?{...s,unit:'Overlord'}:s);
  expect(cue(a,replaced,'night-scythe-embark')).toBeUndefined();
 });
});

describe('prior disembark restrictions after transport casualties',()=>{
 it('retains only the conditional Charge follow-up after losing both the carrier and the Infantry keyword source',()=>{
  const a=army({id:'scythe',unit:'Night Scythe'},{id:'wraiths',unit:'Canoptek Wraiths',models:3},
   {id:'tech',unit:'Technomancer',attachedTo:'wraiths'},{id:'other',unit:'Canoptek Wraiths',models:3});
  const current=without(expandRoster(a),'scythe','tech');
  const rows=necronDeploymentReminders(a,current);
  expect(rows.map(r=>r.id)).toEqual(['11e-necron-passenger-charge-restriction']);
  expect(rows[0]).toMatchObject({window:'Charge',turn:'either',units:['wraiths']});
  expect(rows[0].summary).toMatch(/if .*disembark/i);
  expect(rows[0].summary).toContain('this turn');
 });

 it('retains a fitting casualty-reduced Warrior formation after its original Ark is destroyed',()=>{
  const a=army({id:'ark',unit:'Ghost Ark'},{id:'body',unit:'Necron Warriors',models:20},
   {id:'warden',unit:'Royal Warden',attachedTo:'body'});
  const current=without(expandRoster(a),'ark').map(s=>s.id==='body'?{...s,models:9}:s);
  expect(cue(a,current,'passenger-charge-restriction')?.units).toEqual(['body']);
  expect(cue(a,current,'passenger-embark')).toBeUndefined();
  expect(cue(a,current,'passenger-disembark')).toBeUndefined();
  expect(cue(a,current,'emergency-disembark-Shooting')).toBeUndefined();
 });

 it('does not carry an earlier disembark restriction to a changed or missing original formation',()=>{
  const a=army({id:'scythe',unit:'Night Scythe'},{id:'body',unit:'Immortals'},
   {id:'tech',unit:'Technomancer',attachedTo:'body'});
  const current=without(expandRoster(a),'scythe','body');
  expect(cue(a,current,'passenger-charge-restriction')?.units).toEqual(['tech']);
  expect(cue(a,current.map(s=>({...s,unit:'Overlord'})),'passenger-charge-restriction')).toBeUndefined();
  expect(cue(a,current.map(s=>({...s,attachedTo:undefined})),'passenger-charge-restriction')).toBeUndefined();
  expect(necronDeploymentReminders(a,[])).toEqual([]);
  const noCarrier=army({id:'body',unit:'Immortals'});
  expect(cue(noCarrier,expandRoster(noCarrier),'passenger-charge-restriction')).toBeUndefined();
 });
});
