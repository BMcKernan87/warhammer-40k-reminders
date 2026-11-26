// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {aircraftCoreReminders} from '../src/aircraft-core';
import {newSelection,type ArmySelection} from '../src/catalog';
import {custodesFormationReminders} from '../src/custodes-formations';
import {necronDeploymentReminders} from '../src/necron-deployment';
import {orkTransportReminders} from '../src/ork-transports';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {survivingTransportPassengers,transportMovementReminders} from '../src/transport-movement';
import {votannTransportReminders} from '../src/votann-transports';

// Core 18.03–18.07: phase eligibility, wholly-within setup, disembark modes
// and turn-long charge restrictions. Core 22.05/23.03: Aircraft exclusion.
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
const army=(faction:ArmySelection['faction'],instances:RosterInstance[]):ArmySelection=>({...newSelection(faction),instances,units:Object.fromEntries(instances.map(s=>[s.unit,1]))});
const restriction=(rows:ReturnType<typeof transportMovementReminders>)=>rows.find(r=>r.title==='Disembarked passengers · charge restriction');

describe('shared transport phase consequences',()=>{
 it('uses this-phase eligibility and wholly-within placement for every normal disembark mode',()=>{
  const row=transportMovementReminders('test-',['body'],['carrier']).find(r=>r.id==='test-passenger-disembark')!;
  expect(row).toMatchObject({window:'Movement',turn:'own',units:['body'],source:core});
  expect(row.summary).toMatch(/transport on the battlefield.*must not have embarked there this phase.*must not have Advanced or Fallen Back this phase/);
  expect(row.summary).toMatch(/Normal or ingress move this phase.*Rapid.*every model wholly within 3″.*forgo charging this turn.*ingress.*placement restrictions/);
  expect(row.summary).toMatch(/remained stationary or has not yet been selected to move this phase.*Tactical if placement is possible.*every model wholly within 3″.*Normal or Advance move/);
  expect(row.summary).toMatch(/Otherwise use Combat.*Hazard per model.*every model wholly within 6″.*battle-shocked.*forgo charging this turn/);
  expect(row.summary).toContain('coherent and unengaged');
  expect(row.summary).toContain('engage only enemies their transport is engaging');
 });

 it('shows the prior-move charge restriction only for the affected passenger unit or split half',()=>{
  const rows=transportMovementReminders('test-',['body','other'],['carrier'],['body']);
  const row=restriction(rows)!;
  expect(row).toMatchObject({window:'Charge',turn:'either',timing:'during',units:['body'],source:core});
  expect(row.summary).toMatch(/Only if.*Rapid, Combat, Emergency or Shock disembark move this turn.*until turn end.*even if the transport is destroyed/);
  expect(row.summary).toContain('unit or split half that actually disembarked');
  expect(row.summary).toContain('Tactical or Assault disembark does not itself impose this restriction');
  expect(row.summary).toContain('other charge limits and any explicit exception');
  expect(row.units).not.toContain('carrier');
  expect(rows.filter(r=>r.title==='Destroyed transport · emergency disembark').map(r=>[r.window,r.units])).toEqual(
   ['Command','Movement','Shooting','Charge','Fight'].map(window=>[window,['carrier']]));
 });

 it('retains only a conditional Charge follow-up when the carrier is gone, without granting a new disembark',()=>{
  expect(transportMovementReminders('test-',[],[],[])).toEqual([]);
  const rows=transportMovementReminders('test-',[],[],['body']);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({id:'test-passenger-charge-restriction',units:['body'],window:'Charge'});
  expect(rows.some(r=>r.title==='Choose disembark mode'||r.title==='Embark in a transport'||r.title.startsWith('Destroyed transport'))).toBe(false);
  expect(transportMovementReminders('test-',['body'],[],[])).toEqual([]);
 });

 it('carries an opponent-turn Emergency disembark into the same turn’s Charge restrictions',()=>{
  // Core 18.05 lasts to the end of either turn, including a later attempt to
  // declare a Heroic Intervention charge in the opponent’s Charge phase.
  const rows=transportMovementReminders('test-',['body'],['carrier']);
  expect(rows.find(r=>r.id==='test-emergency-disembark-Shooting')).toMatchObject({turn:'either',units:['carrier']});
  expect(restriction(transportMovementReminders('test-',[],[],['body']))).toMatchObject({turn:'either',window:'Charge',units:['body']});
  expect(restriction(rows)?.summary).toMatch(/Only if.*Emergency.*disembark move this turn.*cannot declare a charge until turn end/);
 });

 it('retains original surviving formation members and rejects replaced identities or changed joins',()=>{
  const body:RosterInstance={id:'body',unit:'Boyz'},leader:RosterInstance={id:'leader',unit:'Warboss',attachedTo:'body'};
  expect(survivingTransportPassengers([[body,leader]],[leader])).toEqual(['leader']);
  expect(survivingTransportPassengers([[body,leader]],[])).toEqual([]);
  expect(survivingTransportPassengers([[body,leader]],[{...body,unit:'Gretchin'},leader])).toEqual([]);
  expect(survivingTransportPassengers([[body,leader]],[body,{...leader,attachedTo:'other'}])).toEqual([]);
  expect(survivingTransportPassengers([[body,leader]],[body,{...leader,retinueTo:'other'}])).toEqual([]);
 });
});

const fixtures=[
 {faction:'Orks' as const,carrier:'Trukk',body:'Boyz',models:10,leader:'Warboss',rows:orkTransportReminders},
 {faction:'Adeptus Custodes' as const,carrier:'Coronus Grav-Carrier',body:'Custodian Wardens',models:3,leader:'Trajann Valoris',rows:custodesFormationReminders},
 {faction:'Leagues of Votann' as const,carrier:'Hekaton Land Fortress',body:'Hearthkyn Warriors',models:10,leader:'Kâhl',rows:votannTransportReminders},
];
describe('shared consumers keep actual original passenger identities',()=>{
 it.each(fixtures)('$faction retains prior disembark consequences after its last carrier or Bodyguard is lost',f=>{
  const a=army(f.faction,[{id:'carrier',unit:f.carrier},{id:'body',unit:f.body,models:f.models},{id:'leader',unit:f.leader,attachedTo:'body'}]);
  const original=expandRoster(a),live=original.filter(s=>s.id!=='carrier');
  expect(restriction(f.rows(a,original))?.units).toEqual(['body']);
  const withoutCarrier=f.rows(a,live);
  expect(restriction(withoutCarrier)?.units).toEqual(['body']);
  expect(withoutCarrier.some(r=>r.title==='Choose disembark mode'||r.title==='Embark in a transport'||r.title.startsWith('Destroyed transport'))).toBe(false);
  expect(restriction(f.rows(a,live.filter(s=>s.id==='leader')))?.units).toEqual(['leader']);
  expect(restriction(f.rows(a,[]))).toBeUndefined();
  expect(restriction(f.rows(a,live.map(s=>s.id==='body'?{...s,unit:'Replacement unit'}:s)))).toBeUndefined();
  expect(restriction(f.rows(a,[{id:'carrier',unit:'Replacement carrier'},...live]))).toBeUndefined();
 });

 it('filters Necron follow-ups to the legal whole formation rather than its carrier or separate Leader',()=>{
  const a=army('Necrons',[{id:'carrier',unit:'Ghost Ark'},{id:'body',unit:'Necron Warriors',models:10},
   {id:'leader',unit:'Royal Warden',attachedTo:'body'},{id:'other',unit:'Canoptek Wraiths',models:3}]);
  expect(restriction(necronDeploymentReminders(a,expandRoster(a)))?.units).toEqual(['body']);
 });

 it.each([
  {faction:'Orks' as const,carrier:'Trukk',body:'Boyz',before:20,after:10,leader:'Warboss',rows:orkTransportReminders},
  {faction:'Leagues of Votann' as const,carrier:'Hekaton Land Fortress',body:'Einhyr Hearthguard',before:10,after:5,leader:'Einhyr Champion',rows:votannTransportReminders},
 ])('$faction keeps a prior disembark after casualties made an originally oversized formation fit',f=>{
  const a=army(f.faction,[{id:'carrier',unit:f.carrier},{id:'body',unit:f.body,models:f.before},{id:'leader',unit:f.leader,attachedTo:'body'}]);
  const original=expandRoster(a),reduced=original.map(s=>s.id==='body'?{...s,models:f.after}:s);
  expect(restriction(f.rows(a,original))).toBeUndefined();
  expect(restriction(f.rows(a,reduced))?.units).toEqual(['body']);
  const live=reduced.filter(s=>s.id!=='carrier');
  expect(restriction(f.rows(a,live))?.units).toEqual(['body']);
  expect(f.rows(a,live).some(r=>r.title==='Choose disembark mode'||r.title==='Embark in a transport'||r.title.startsWith('Destroyed transport'))).toBe(false);
  // The surviving attached Character is still part of its original legal
  // formation even though the current cargo root builder has no Bodyguard.
  const leaderOnly=live.filter(s=>s.id==='leader');
  expect(restriction(f.rows(a,leaderOnly))?.units).toEqual(['leader']);
  expect(f.rows(a,leaderOnly).some(r=>r.title==='Choose disembark mode'||r.title==='Embark in a transport')).toBe(false);
  expect(restriction(f.rows(a,live.map(s=>s.id==='body'?{...s,unit:'Replacement unit'}:s)))).toBeUndefined();
  expect(restriction(f.rows(a,live.map(s=>s.id==='leader'?{...s,attachedTo:'other'}:s)))).toBeUndefined();
 });

 it.each([
  {faction:'Orks' as const,carrier:'Trukk',body:'Boyz',models:10,leader:'Painboss',rows:orkTransportReminders},
  {faction:'Adeptus Custodes' as const,carrier:'Coronus Grav-Carrier',body:'Custodian Wardens',models:3,leader:'Knight-Centura',rows:custodesFormationReminders},
  {faction:'Leagues of Votann' as const,carrier:'Hekaton Land Fortress',body:'Hearthkyn Warriors',models:10,leader:'Einhyr Champion',rows:votannTransportReminders},
 ])('$faction does not repair an illegal original join by discarding a destroyed member',f=>{
  const a=army(f.faction,[{id:'carrier',unit:f.carrier},{id:'body',unit:f.body,models:f.models},{id:'leader',unit:f.leader,attachedTo:'body'}]);
  const original=expandRoster(a);
  expect(restriction(f.rows(a,original.filter(s=>s.id==='body')))).toBeUndefined();
  expect(restriction(f.rows(a,original.filter(s=>s.id==='leader')))).toBeUndefined();
 });

 it('keeps only a conditional Votann follow-up when casualty counts cannot identify surviving model composition',()=>{
  const a=army('Leagues of Votann',[{id:'carrier',unit:'Hekaton Land Fortress'},{id:'body',unit:'Einhyr Hearthguard',models:10}]);
  const survivors=[{id:'body',unit:'Einhyr Hearthguard',models:1}];
  const rows=votannTransportReminders(a,survivors);
  expect(rows).toHaveLength(1);
  expect(restriction(rows)?.units).toEqual(['body']);
  expect(restriction(rows)?.summary).toMatch(/Only if.*disembark move this turn/);
  expect(restriction(votannTransportReminders({...a,instances:[{id:'carrier',unit:'Sagitaur'},a.instances![1]]},survivors))).toBeUndefined();
  expect(restriction(votannTransportReminders(a,[{...survivors[0],models:11}]))).toBeUndefined();
  const yaegirs=army('Leagues of Votann',[{id:'carrier',unit:'Sagitaur'},{id:'scouts',unit:'Hernkyn Yaegirs',models:10}]);
  // No Kapricus was present to split this unit, and nine one-seat models
  // cannot have embarked in a six-seat Sagitaur after casualties.
  expect(restriction(votannTransportReminders(yaegirs,[{id:'scouts',unit:'Hernkyn Yaegirs',models:9}]))).toBeUndefined();
 });

 it('retains only the affected possible Votann split half and rejects an originally illegal attachment',()=>{
  const a=army('Leagues of Votann',[{id:'carrier',unit:'Sagitaur'},{id:'body',unit:'Hearthkyn Warriors',models:10},{id:'leader',unit:'Kâhl',attachedTo:'body'}]);
  const rows=votannTransportReminders(a,expandRoster(a).filter(s=>s.id!=='carrier'));
  expect(restriction(rows)?.units).toEqual(['body']);
  expect(restriction(rows)?.summary).toContain('unit or split half that actually disembarked');
  const malformed=army('Leagues of Votann',[{id:'carrier',unit:'Sagitaur'},{id:'body',unit:'Hearthkyn Warriors',models:10},{id:'leader',unit:'Einhyr Champion',attachedTo:'body'}]);
  expect(restriction(votannTransportReminders(malformed,expandRoster(malformed).filter(s=>s.id!=='carrier')))).toBeUndefined();
 });
});

describe('Aircraft during normal reactive attacks',()=>{
 it('keeps the Plunging Fire exclusion visible during Movement reactions without treating Hover as Aircraft',()=>{
  const rows=aircraftCoreReminders('test-',['plane']);
  const movement=rows.find(r=>r.window==='Movement')!;
  expect(movement).toMatchObject({units:['plane'],turn:'either',source:core});
  expect(movement.summary).toContain('Plunging Fire does not apply to ranged attacks made by or targeting Aircraft, including normal Movement-phase reactions');
  expect(movement.summary).toContain('only make ingress moves');
  expect(movement.summary).toContain('cannot use Rapid Ingress');
  expect(rows.find(r=>r.window==='Shooting')?.summary).toContain('Plunging Fire does not apply');
  expect(rows.some(r=>r.title.includes('Hover'))).toBe(false);
  expect(aircraftCoreReminders('test-',[])).toEqual([]);
 });
});
