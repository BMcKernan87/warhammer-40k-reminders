// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {broodBrotherIntrinsicReminders} from '../src/brood-brother-reminders';
import type {RosterInstance} from '../src/roster-instances';

const squad=(unit:string,extra:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...extra});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Genestealer Cults'),detachments2026:['Brood Brothers Auxilia'],instances});
const named=(a:ArmySelection,n:string)=>broodBrotherIntrinsicReminders(a).filter(r=>r.title.endsWith(' · '+n));

describe('Brood Brothers personal datasheet abilities',()=>{
 it.each([
  ['Basilisk','Earthshaker Rounds','Shooting','own',/Infantry.*2″ Move.*2 from Charge/],
  ['Hippogriff AFV','Convoy Escort Vehicle','Shooting','own',/D6″.*charg/],
  ['Death Riders','Screening Line','Movement','opponent',/8″.*unengaged.*6″/],
  ['Krieg Heavy Weapons Squad','Final Duty','Fight','either',/Fire Coordinator.*each Heavy Weapons Gunner.*3\+/],
  ['Leman Russ Commander','Death Befitting An Officer','Shooting','opponent',/2\+.*attacking unit shoots.*that unit only/],
  ['Deathstrike','Plasma Warhead','Shooting','own',/stationary.*marker.*every unit within 6″/],
  ['Cyclops Demolition Vehicle','Demolition Charges','Charge','either',/within 3″.*2–5.*D3.*D6 on 6/],
  ['Wyvern','Suppression Bombardment','Shooting','own',/non-Monster, non-Vehicle.*quad stormshard mortar.*next Shooting/],
  ['Leman Russ Punisher','Mow Down the Enemy','Movement','opponent',/neither Monster nor Vehicle.*Devastating Wounds/],
 ] as const)('%s resolves %s in the right phase for the right player',(unit,rule,phase,turn,trigger)=>{
  const models=squad(unit),a=army(models);
  expect(named(a,rule)).toContainEqual(expect.objectContaining({window:phase,turn,units:[models.id],summary:expect.stringMatching(trigger)}));
  expect(named({...a,detachments2026:['Final Day']},rule)).toEqual([]);
 });
 it('uses attached bodies for leadership, including saves that still apply to a lone Psyker',()=>{
  const body=squad('Cadian Shock Troops'),leader=squad('Cadian Castellan',{attachedTo:body.id});
  expect(named(army(leader,body),'Senior Officer').map(r=>r.units)).toEqual([[body.id]]);
  expect(named(army(squad('Cadian Castellan')),'Senior Officer')).toEqual([]);
  const psyker=squad('Primaris Psyker');
  expect(named(army(psyker),'Malign Wardings(Psychic)')).toEqual([]);
  expect(named(army(psyker),'Psychic Barrier (Psychic)')[0]).toMatchObject({units:[psyker.id],window:'Shooting',turn:'opponent',timing:'start'});
 });
 it('uses distinct eligible Guard targets for the Baneblade and excludes native Cult squads',()=>{
  const tank=squad('Baneblade'),sisters=squad('Neophyte Hybrids'),second=squad('Baneblade',{id:'Baneblade#2'});
  expect(named(army(tank,sisters),'Rolling Fortress')).toEqual([]);
  const rows=named(army(tank,sisters,second),'Rolling Fortress');
  expect(rows).toHaveLength(4);
  expect(rows.map(r=>r.units)).toEqual([[second.id],[second.id],[tank.id],[tank.id]]);
 });
 it('requires actual fitting passengers for reactions and excludes Artillery',()=>{
  const transport=squad('Stormlord'),field=squad('Field Ordnance Battery'),body=squad('Cadian Shock Troops',{models:10});
  expect(named(army(transport,field),'Mount Up!')).toEqual([]);
  expect(named(army(transport,body,field),'Mount Up!')).toMatchObject([{units:[body.id],turn:'opponent',window:'Movement',timing:'end'}]);
 });
 it('improves Overwatch through an actual Platoon unit and retains the ordinary 5+ otherwise',()=>{
  const team=squad('Cadian Heavy Weapons Squad'),troops=squad('Cadian Shock Troops');
  expect(named(army(team),'Covering Fire')[0].summary).not.toContain('4+');
  expect(named(army(team,troops),'Covering Fire')[0].summary).toContain(troops.id);
 });
 it('keeps snap-shot wound rerolls and excludes the inapplicable Hit reroll',()=>{
  const rows=named(army(squad('Catachan Heavy Weapons Squad')),'Bring it Down!');
  expect(rows.find(r=>r.window==='Shooting')?.summary).toContain('re-roll Hit rolls of 1 and Wound rolls of 1');
  expect(rows.find(r=>r.window==='Movement')?.summary).toContain('cannot re-roll Hit rolls');
 });
 it('filters order-dependent datasheet rules when officers lose Voice of Command',()=>{
  const a=army(squad('Chimera'),squad('Leman Russ Commander'),squad('Cadian Recon Squad'),squad('Field Ordnance Battery'));
  for(const rule of ['Mobile Command Vehicle','Vox-net','Independent Operatives','Rearm, Reload, Fire'])expect(named(a,rule)).toEqual([]);
 });
});
