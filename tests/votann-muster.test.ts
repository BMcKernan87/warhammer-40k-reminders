import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {knightJoinedBodyguard} from '../src/leader-eligibility';
import {generate11thReminders} from '../src/reminders-11th';
import {rosterFindings} from '../src/roster-findings';
import {autoAttachUnambiguousInstances,expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {votannKeywords} from '../src/votann-muster-data';
import {votannUnitLimit,votannWarlordCandidates,selectVotannWarlord} from '../src/votann-muster';
import {votannCargoOption,votannTransportFindings} from '../src/votann-transports';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {VOTANN_MANUAL} from './fixtures/votann-manual';

const grim='Grimnyr',master='Brôkhyr Iron-master',thunder='Brôkhyr Thunderkyn',warriors='Hearthkyn Warriors';
const fortress='Hekaton Land Fortress',scouts='Hernkyn Yaegirs',sag='Sagitaur',carrier='Kapricus Carrier';
const build=(names:string[],detachment='Dêlve Assault Shift')=>individualArmy(names.reduce((a,unit)=>addSelectionUnit(a,unit),{...newSelection('Leagues of Votann'),detachments2026:[detachment]} as ArmySelection));
const first=(a:ArmySelection,name:string)=>expandRoster(a).find(s=>s.unit===name)!;
const codes=(a:ArmySelection)=>votannTransportFindings(a).map(f=>f.code);
const cost=(a:ArmySelection)=>rosterCost2026(a).knownPoints;
const cargo=(a:ArmySelection,transport:string,passenger:string)=>votannCargoOption(a,first(a,transport),first(a,passenger));

describe('current Kin mustering and formation transport rules',()=>{
 it.each(VOTANN_MANUAL)('costs every printed %s configuration and permits only its printed bodyguards',(unit,rates,guards)=>{
  const count=Math.max(2,rates.at(-1)![0]);
  const army=build(Array(count).fill(unit));
  const firstSize=rates[0][1][0][0],lastSize=rates[0][1].at(-1)![0];
  const sizes=Array.from({length:lastSize-firstSize+1},(_,i)=>firstSize+i);
  expect(verifiedUnitSizes2026(army,unit)).toEqual(sizes);
  for(const models of sizes){
   const sized=expandRoster(army).reduce((a,s)=>setInstanceModelCount(a,s.id,models),army);
   expect(rosterCost2026(sized).entries.map(e=>e.points)).toEqual(Array.from({length:count},(_,i)=>rates.filter(([threshold])=>threshold<=i+1).at(-1)![1].find(([size])=>size>=models)![1]));
  }
  for(const guard of guards){
   const joined=autoAttachUnambiguousInstances(build([unit,guard]));
   expect(knightJoinedBodyguard(joined,first(joined,unit))?.id).toBe(guard+'#1');
  }
  if(guards.length){
   const invalid=build([unit,fortress]);
   expect(()=>setInstanceAttachment(invalid,unit+'#1',fortress+'#1')).toThrow();
  }
 });
 it('chooses the model that actually has Character and identifies a missing Warlord',()=>{
  const a=build([grim,master,'Ûthar the Destined',warriors]);
  expect(votannWarlordCandidates(a).map(s=>s.unit)).toEqual([grim,master,'Ûthar the Destined']);
  expect(votannKeywords(a,first(a,grim),'CORV').has('CHARACTER')).toBe(false);
  expect(votannKeywords(a,first(a,master),'Ironkin Assistant').has('CHARACTER')).toBe(false);
  expect(votannKeywords(a,first(a,grim),'Grimnyr').has('CHARACTER')).toBe(true);
  expect(rosterFindings(a).map(f=>f.code)).toContain('warlord-required');
  expect(rosterFindings(selectVotannWarlord(a,grim+'#1')).map(f=>f.code)).not.toContain('warlord-required');
  expect(()=>selectVotannWarlord(a,warriors+'#1')).toThrow();
 });
 it('makes Beserks Battleline only in Dêlve and permits its legal priced character enhancement',()=>{
  const a={...build([grim,'Cthonian Beserks']),battleSize2026:'Incursion' as const};
  expect(votannUnitLimit(a,'Cthonian Beserks')).toBe(4);
  expect(votannUnitLimit({...a,detachments2026:['Hearthfyre Arsenal']},'Cthonian Beserks')).toBe(2);
  expect(votannUnitLimit(a,'Ûthar the Destined')).toBe(1);
  expect(votannUnitLimit(a,'Slaughterbound')).toBe(0);
  expect(cost(selectUpgrade2026(a,grim+'#1','Multiwave System Jammer'))).toBe(cost(a)+10);
  expect(()=>selectUpgrade2026(a,'Cthonian Beserks#1','Multiwave System Jammer')).toThrow();
 });
 it('reserves distinct Yaegir halves for their initiating Carrier before permitting a Sagitaur to use the remainder',()=>{
  expect(codes(build([sag,scouts]))).toContain('sagitaur-passengers');
  expect(codes(build([carrier,sag,scouts]))).toEqual([]);
  expect(codes(build([carrier,carrier,scouts]))).toEqual([]);
  expect(codes(build([carrier,carrier,sag,scouts]))).toContain('sagitaur-passengers');
  expect(codes(build([carrier,carrier,carrier,scouts]))).toContain('kapricus-passengers');
  const a=build([carrier,sag,scouts,warriors]);
  expect(cargo(a,carrier,scouts)).toEqual({split:true,models:5,seats:5});
  expect(cargo(a,carrier,warriors)).toBeUndefined();
 });
 it('counts the full attached formation when halving, including zero-space CORVs',()=>{
  const a=autoAttachUnambiguousInstances(build([sag,sag,grim,warriors]));
  expect(first(a,grim).attachedTo).toBe(warriors+'#1');
  expect(cargo(a,sag,warriors)).toEqual({split:true,models:6,seats:4});
  expect(cargo(a,sag,grim)).toBeUndefined();
  expect(codes(a)).toEqual([]);
  const extra=addSelectionUnit(a,sag);
  expect(codes(extra)).toContain('sagitaur-passengers');
 });
 it('fits six Thunderkyn with an Iron-master, Assistant and three E-COGs in fourteen places, excluding them from a Sagitaur',()=>{
  let a=autoAttachUnambiguousInstances(build([fortress,sag,master,thunder,'Cthonian Earthshakers']));
  a=setInstanceModelCount(a,thunder+'#1',6);
  expect(cargo(a,fortress,thunder)).toEqual({split:false,models:11,seats:14});
  expect(cargo(a,sag,thunder)).toBeUndefined();
  expect(cargo(a,fortress,'Cthonian Earthshakers')).toBeUndefined();
  let guard=autoAttachUnambiguousInstances(build([fortress,'Einhyr Champion','Einhyr Hearthguard']));
  expect(cargo(guard,fortress,'Einhyr Hearthguard')).toEqual({split:false,models:6,seats:12});
  guard=setInstanceModelCount(guard,'Einhyr Hearthguard#1',10);
  expect(cargo(guard,fortress,'Einhyr Hearthguard')).toBeUndefined();
 });
 it('prints distinct roster-specific core and deployment subjects and excludes melee-only formations from Fire Overwatch',()=>{
  const a=autoAttachUnambiguousInstances(build([grim,warriors,sag,'Cthonian Beserks','Cthonian Earthshakers']));
  const rules=generate11thReminders(a);
  const cargoRow=rules.find(r=>r.id==='11e-votann-cargo-Sagitaur#1')!;
  expect(cargoRow.window).toBe('Pre-battle');
  expect(cargoRow.summary).toContain(warriors+'#1 (split half)');
  expect(cargoRow.summary).not.toContain('Cthonian Earthshakers#1');
  const fire=rules.find(r=>r.title.startsWith('Fire Overwatch'))!;
  expect(fire.units).toContain(warriors+'#1');
  expect(fire.units).not.toContain(grim+'#1');
  expect(fire.units).not.toContain('Cthonian Beserks#1');
  expect(fire.turn).toBe('opponent');
 });
});
