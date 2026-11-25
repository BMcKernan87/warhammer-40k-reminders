import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy,setInstanceModelCount,setInstanceAttachment} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {DATASHEETS_2026,rosterCost2026} from '../src/datasheets-2026';
const army=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const cue=(a:ReturnType<typeof army>,id:string)=>generate11thReminders(a).find(r=>r.id==='11e-core-'+id);
describe('October 2026 later-copy reconciliation',()=>{
 it.each([
 ['Transcendent C’tan',1,[340,360,360]],
 ['Obelisk',1,[280,310,310]],
 ['Seraptek Heavy Construct',1,[540,570,570]],
 ['Skorpekh Lord',1,[95,95,105]],
 ['Deathmarks',5,[60,60,70]],
 ['Deathmarks',10,[120,120,130]],
 ['Triarch Stalker',1,[110,110,120]],
 ] as const)('prices later copies of %s (%i models)',(unit,size,expected)=>{
  let a=army(unit,unit,unit);
  if(size>1)for(let i=1;i<=3;i++)a=setInstanceModelCount(a,unit+'#'+i,size);
  expect(rosterCost2026(a).entries.map(x=>x.points)).toEqual(expected);
 });
 it('includes all seventeen current later-copy cost records',()=>{
  expect(DATASHEETS_2026.filter(d=>d.faction==='Necrons'&&d.laterCopyPointsBySize)).toHaveLength(17);
 });
 it('counts binding costs in addition to escalated Transcendent C’tan pricing',()=>{
  const a={...army('Transcendent C’tan','Transcendent C’tan'),detachments2026:['Pantheon of Woe']};
  expect(rosterCost2026(a).entries.map(x=>x.points)).toEqual([380,400]);
 });
});
describe('current Necron core Stratagem coverage',()=>{
 it('includes all applicable core Stratagem families in phase order',()=>{
  const a=army('Overlord','Immortals','Doomsday Ark');
  for(const phase of ['Command','Movement','Shooting','Charge','Fight']){
   expect(cue(a,'command-reroll-'+phase)?.window).toBe(phase);
   expect(cue(a,'stratagem-limits-'+phase)?.summary).toContain('battle-shocked');
  }
  expect(cue(a,'insane-bravery')).toMatchObject({window:'Command',timing:'during'});
  expect(cue(a,'rapid-ingress')).toMatchObject({window:'Movement',timing:'end'});
  expect(cue(a,'crushing-impact')).toMatchObject({window:'Charge',units:['Doomsday Ark#1']});
  expect(cue(a,'heroic-intervention')).toMatchObject({window:'Charge',timing:'end'});
  expect(cue(a,'epic-challenge')).toMatchObject({window:'Fight',units:['Overlord#1']});
  expect(cue(a,'counteroffensive')).toMatchObject({window:'Fight'});
 });
 it('filters Character, Walker, Titanic and Aircraft eligibility by actual formation',()=>{
  let a=army('Overlord','Immortals','Monolith','Canoptek Doomstalker','Doom Scythe');
  a=setInstanceAttachment(a,'Overlord#1','Immortals#1');
  expect(cue(a,'epic-challenge')?.units).toEqual(['Immortals#1']);
  expect(cue(a,'heroic-intervention')?.units).toEqual(['Immortals#1','Canoptek Doomstalker#1']);
  expect(cue(a,'rapid-ingress')?.units).not.toContain('Doom Scythe#1');
  expect(cue(a,'overwatch')?.units).not.toContain('Monolith#1');
  expect(cue(a,'crushing-impact')?.units).toEqual(['Monolith#1','Canoptek Doomstalker#1']);
 });
 it('omits impossible keyword-based options, without inventing battlefield state',()=>{
  const a=army('Immortals');
  for(const id of ['crushing-impact','epic-challenge','explosives','smokescreen'])expect(cue(a,id)).toBeUndefined();
  expect(cue(army('Monolith'),'overwatch')).toBeUndefined();
  expect(cue(army('Doom Scythe'),'rapid-ingress')).toBeUndefined();
  expect(cue(army('Doom Scythe'),'crushing-impact')).toBeUndefined();
  expect(cue(a,'rapid-ingress')?.summary).toContain('in Strategic Reserves');
 });
});
