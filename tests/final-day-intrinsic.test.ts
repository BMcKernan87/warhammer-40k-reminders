// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {finalDayIntrinsicReminders} from '../src/final-day-intrinsic';
import {gscAlliedMusterUnits,gscAllyFindings} from '../src/gsc-allies';
import {gscMusterFindings} from '../src/gsc-muster';
import {setKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const entry=(unit:string,n=1,models?:number):RosterInstance=>({id:unit+'#'+n,unit,models});
function army(instances:RosterInstance[],detachment='Final Day'):ArmySelection{
 const units:Record<string,number>={};
 for(const s of instances)units[s.unit]=(units[s.unit]??0)+1;
 return {...newSelection('Genestealer Cults'),battleSize2026:'Incursion',detachments2026:[detachment],instances,units};
}
const rows=(...s:RosterInstance[])=>finalDayIntrinsicReminders(army(s));
describe('Allied muster and faction-specific source restrictions',()=>{
 it('allows only the 52 permitted Guard sheets or the 14 Vanguard Invaders in their own detachment',()=>{
  const guard=gscAlliedMusterUnits(army([],'Brood Brother Auxilia')),bugs=gscAlliedMusterUnits(army([]));
  expect(guard).toHaveLength(52);expect(bugs).toHaveLength(14);
  expect(guard).toEqual(expect.arrayContaining(['Cyclops Demolition Vehicle','Valkyrie','Taurox Prime','Cadian Shock Troops']));
  expect(guard).not.toContain('Ratlings');expect(guard).not.toContain('Tempestus Scions');expect(guard).not.toContain('Ogryn Squad');
  expect(bugs).toContain('Mawloc');expect(bugs).not.toContain('Broodlord');expect(bugs).not.toContain('Genestealers');
  expect(gscAlliedMusterUnits(army([],'Biosanctic Broodsurge'))).toEqual([]);
  const disabled=army([entry('Mawloc')],'Brood Brothers Auxilia');
  expect(gscAllyFindings(disabled)[0]).toMatchObject({code:'gsc-allied-detachment'});
  expect(finalDayIntrinsicReminders(disabled)).toEqual([]);
 });
 it('includes later-copy surcharges and an allied bearer’s actual enhancement in its half-army budget',()=>{
  const five=army([entry('Hyperadapted Raveners'),entry('Hyperadapted Raveners',2),entry('Hyperadapted Raveners',3)]);
  expect(gscAllyFindings(five)[0].message).toMatch(/505.*500/);
  const tyrant=entry('Winged Hive Tyrant'),selected=army([tyrant,entry('Trygon'),entry('Neurolictor'),entry('Deathleaper')]);
  expect(gscAllyFindings(selected)).toEqual([]);
  expect(gscAllyFindings({...selected,upgrades2026:{[tyrant.id]:'Vanguard Tyrant'}})[0].message).toMatch(/505.*500/);
 });
 it('builds a legal 1,000-point mixed roster, preserving actual Leaders, eligible Tyranid targets and real equipment',()=>{
  const bugs=entry('Gargoyles'),prime={...entry('Winged Tyranid Prime'),attachedTo:bugs.id},tyrant=entry('Winged Hive Tyrant');
  const genestealers=entry('Purestrain Genestealers',1,10),patriarch={...entry('Patriarch'),attachedTo:genestealers.id};
  const list=army([bugs,prime,tyrant,entry('Lictor'),entry('Neurolictor'),genestealers,patriarch,entry('Neophyte Hybrids',1,10),entry('Neophyte Hybrids',2,20),entry('Goliath Rockgrinder')]);
  expect(rosterCost2026(list).total).toBe(1000);expect(gscMusterFindings(list)).toEqual([]);
  const result=finalDayIntrinsicReminders(list),alpha=result.find(r=>r.title==='Alpha Warrior'&&r.window==='Shooting');
  expect(alpha?.units).toEqual([prime.id,bugs.id]);expect(result.filter(r=>r.title==='Alpha Warrior').map(r=>r.window)).toEqual(['Shooting','Fight']);
  expect(result.find(r=>r.title==='Deep Strike')?.units).toEqual([bugs.id,tyrant.id]);
  const saboteurs=(list:ArmySelection)=>finalDayIntrinsicReminders(list).find(r=>r.title==='Psychological Saboteur'&&r.window==='Shooting'&&r.turn==='own');
  expect(saboteurs(list)?.units).toEqual(['Neurolictor#1',bugs.id]);
  expect(saboteurs(setKnightGear(list,tyrant.id,'Bio-weapon','Heavy venom cannon'))?.units).toEqual(['Neurolictor#1',bugs.id,tyrant.id]);
  expect(result.filter(r=>r.title==='Will of the Hive Mind')).toHaveLength(5);
  expect(result.find(r=>r.title==='Will of the Hive Mind')?.units).not.toContain(genestealers.id);
  expect(result.some(r=>r.title==='Synapse'||r.title==='Shadow in the Warp'||r.id.includes('cult-ambush'))).toBe(false);
  expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
 });
});
describe('Final Day personal triggers in the correct turn and phase',()=>{
 it('separates shared Lictor and Tyrant uses from per-formation discounts and keeps ingress and fight-phase withdrawal distinct',()=>{
  const lead=entry('Hyperadapted Raveners'),body=entry('Raveners'),packs=[{...lead,attachedTo:body.id},body];
  const cards=rows(entry('Lictor'),entry('Lictor',2),entry('Winged Hive Tyrant'),entry('Winged Hive Tyrant',2),entry('The Red Terror'),...packs,entry('Von Ryan’s Leapers'));
  expect(cards.filter(r=>r.title==='Pheromone Trail')).toMatchObject([{window:'Movement',timing:'end',turn:'opponent',units:['Lictor#1','Lictor#2'],summary:expect.stringContaining('0CP')}]);
  expect(cards.filter(r=>r.title==='Will of the Hive Mind'&&r.window==='Movement')).toHaveLength(1);
  expect(cards.filter(r=>r.title==='Hypersensory Array')).toMatchObject([{window:'Movement',turn:'opponent',timing:'end',units:[lead.id,body.id]},{window:'Charge',turn:'opponent',timing:'end',units:[lead.id,body.id]}]);
  expect(cards.find(r=>r.title==='Hypersensory Array')?.summary).toContain('Both options share');
  expect(cards.filter(r=>r.title==='Alpha Invader').map(r=>r.window)).toEqual(['Fight']);
  expect(cards.find(r=>r.title==='Pouncing Leap')).toMatchObject({window:'Charge',timing:'end',turn:'opponent',summary:expect.stringContaining('Into the Fray for 1CP')});
  expect(cards.find(r=>r.title==='Subterranean Hunter')).toMatchObject({window:'Fight',turn:'either',timing:'end'});
  expect(cards.find(r=>r.title==='Death From Below')).toMatchObject({window:'End of opponent turn',turn:'opponent',units:[body.id,lead.id]});
  expect(cards.find(r=>r.title==='Swallow Whole')?.summary).toMatch(/gaping maw.*D3\+2/);
  expect(cards.find(r=>r.title==='Fights First')?.units).toEqual(['Lictor#1','Lictor#2','Von Ryan’s Leapers#1']);
 });
 it('restricts closer Trygon deployment and charge inhibition to its own move, and triggers Mawloc attacks on either actual Deep Strike ingress',()=>{
  const cards=rows(entry('Trygon'),entry('Mawloc'));
  expect(cards.filter(r=>r.title==='Subterranean Tunnels').map(r=>[r.window,r.turn])).toEqual([['Movement','own'],['Charge','own']]);
  expect(cards.find(r=>r.title==='Subterranean Tunnels')?.summary).toMatch(/6″.*charge/);
  expect(cards.filter(r=>r.title==='Terror From The Deep').map(r=>[r.window,r.turn,r.timing])).toEqual([['Movement','own','during'],['Movement','opponent','end']]);
  expect(cards.find(r=>r.title==='Terror From The Deep')?.summary).toMatch(/each enemy unit within 12″.*D3.*3 mortal.*Battle-shock/);
  expect(cards.find(r=>r.title==='Damaged'&&r.window==='Shooting')?.units).toEqual(['Trygon#1']);
  expect(cards.filter(r=>r.title==='Damaged'&&r.window==='Fight')).toHaveLength(2);
 });
 it('disembarks whole Tyranid formations from the pod on turn one or eligible Rapid Ingress and excludes oversized or non-Tyranid passengers',()=>{
  const pod=entry('Tyrannocyte'),mouth=entry('Trygon'),wings=entry('Gargoyles',1,10),prime={...entry('Winged Tyranid Prime'),attachedTo:wings.id};
  const cards=rows(pod,mouth,wings,prime,entry('Neophyte Hybrids'));
  const moves=cards.filter(r=>r.title==='Aerial Seeding'&&r.window==='Movement');
  expect(moves.map(r=>r.turn)).toEqual(['own','opponent']);expect(moves[0].units).toEqual([pod.id,wings.id]);
  expect(moves[0].summary).toMatch(/first, second or third.*disembark.*8″.*3″.*cannot charge.*No unit can embark/);
  expect(cards.find(r=>r.title==='Aerial Seeding'&&r.window==='Pre-battle')?.summary).toMatch(/number of reserve units.*points still count/);
  expect(cards.find(r=>r.title==='Deadly Demise D3')?.summary).toMatch(/emergency disembarkation first.*each unit.*separately/);
 });
 it('applies saves to their sources, filters ranged modifiers by actual equipment, and preserves the separate active and passive Neurolictor effects',()=>{
  const melee=rows(entry('Lictor'),entry('Deathleaper'),entry('Neurolictor'),entry('Von Ryan’s Leapers'),entry('Winged Hive Tyrant'),entry('Winged Tyranid Prime'));
  expect(melee.find(r=>r.title==='Feeder Tendrils')?.units).toEqual(['Lictor#1','Deathleaper#1','Neurolictor#1']);
  expect(melee.find(r=>r.title==='Invulnerable save'&&r.units?.includes('Lictor#1'))).toBeUndefined();
  expect(melee.find(r=>r.title==='Invulnerable save'&&r.units?.includes('Von Ryan’s Leapers#1'))?.summary).toContain('6+');
  expect(melee.find(r=>r.title==='Fear of the Unseen'&&r.window==='Command'&&r.turn==='opponent')?.summary).toMatch(/6″.*below its Starting Strength/);
  expect(melee.find(r=>r.title==='Neural Disruption')).toMatchObject({window:'Command',turn:'own'});
  expect(melee.find(r=>r.title==='Psychological Saboteur'&&r.window==='Shooting'&&r.turn==='own')).toBeUndefined();
  expect(melee.find(r=>r.title==='Psychological Saboteur'&&r.turn==='opponent')?.summary).toMatch(/enemy’s Hit rolls.*non-Tyranids/);
  expect(melee.find(r=>r.title==='Alpha Warrior')).toBeUndefined();
  expect(melee.find(r=>r.title==='Death Blow')?.summary).toMatch(/Prime.*4\+.*then remove/);
  expect(melee.find(r=>r.title==='Paroxysm')).toMatchObject({window:'Fight',timing:'start',turn:'either',summary:expect.stringMatching(/visible.*12″.*D3.*Attacks/)});
 });
 it('shows spawned Rippers only with a Parasite, preserving the ovipositor trigger, placement and conditional OC effect',()=>{
  const cards=rows(entry('Parasite Of Mortrex'));
  expect(cards.find(r=>r.title==='Parasitic Infection')).toMatchObject({window:'Fight',turn:'either',summary:expect.stringMatching(/Infantry model.*ovipositor.*D3-model.*within 3″.*no other enemy/)});
  expect(cards.find(r=>r.title==='It Itches!')).toMatchObject({window:'Fight',turn:'either',timing:'start'});
  expect(cards.find(r=>r.title==='Chitinous Horrors')?.summary).toMatch(/If Parasitic Infection.*halve.*engaged/);
  expect(rows(entry('Neurolictor')).find(r=>r.title==='Chitinous Horrors')).toBeUndefined();
  expect(gscAlliedMusterUnits(army([]))).not.toContain('Ripper Swarms');
 });
});
