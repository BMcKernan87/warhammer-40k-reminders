import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {individualArmy,expandRoster,setInstanceAttachment,reconcileInstanceAttachments} from '../src/roster-instances';
import {instanceBodyguards} from '../src/leader-eligibility';
const army=(detachment:string,...units:string[])=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:[detachment]});
const reminders=generate11thReminders;
describe('Cursed Legion',()=>{
 it('emits six stratagems only for relevant roster and correct phase',()=>{
  const a=army('Cursed Legion','Skorpekh Destroyers','Immortals');
  const r=reminders(a);
  for(const name of ['Methodical Murder','Image of Death','Mortis Protocols','Driven to Butchery','Spreading Madness','Unnatural Aggression'])expect(r.some(x=>x.title.includes(name))).toBe(true);
  expect(r.filter(x=>x.title.includes('Driven to Butchery')).map(x=>x.window)).toEqual(['Shooting','Charge']);
  expect(r.find(x=>x.title.includes('Unnatural Aggression'))?.timing).toBe('end');
  expect(reminders(army('Cursed Legion','Immortals')).some(x=>x.title.includes('Cold Fervour'))).toBe(false);
  expect(reminders({...a,detachments2026:[]}).some(x=>x.id.startsWith('11e-necron-cursed-'))).toBe(false);
 });
 it('Murdermind changes a single Cryptek attachment and removing it clears that attachment',()=>{
  const a=army('Cursed Legion','Plasmancer','Skorpekh Destroyers');
  const leader=expandRoster(a).find(s=>s.unit==='Plasmancer')!;
  const body=expandRoster(a).find(s=>s.unit==='Skorpekh Destroyers')!;
  expect(()=>setInstanceAttachment(a,leader.id,body.id)).toThrow();
  const upgraded=selectUpgrade2026(a,leader.id,'Murdermind');
  expect(instanceBodyguards(upgraded,leader)).toContain(body.unit);
  const attached=setInstanceAttachment(upgraded,leader.id,body.id);
  expect(expandRoster(attached).find(x=>x.id===leader.id)?.attachedTo).toBe(body.id);
  expect(expandRoster(selectUpgrade2026(attached,leader.id,null)).find(x=>x.id===leader.id)?.attachedTo).toBeUndefined();
  expect(expandRoster(reconcileInstanceAttachments({...attached,detachments2026:[],upgrades2026:{}})).find(x=>x.id===leader.id)?.attachedTo).toBeUndefined();
 });
 it('only upgrades the eligible bearer',()=>{
  const a=army('Cursed Legion','Overlord','Immortals');
  const id=expandRoster(a).find(x=>x.unit==='Overlord')!.id;
  expect(reminders(selectUpgrade2026(a,id,'Destroyer Ankh')).some(x=>x.title.includes('Cold Fervour'))).toBe(true);
  expect(()=>selectUpgrade2026(a,id,'Murdermind')).toThrow();
 });
});
describe('Pantheon of Woe',()=>{
 it('automatically binds each selected C’tan without manual upgrades',()=>{
  const a=army('Pantheon of Woe','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Immortals');
  const r=reminders(a);
  expect(r.find(x=>x.title.includes('Quantum Goad'))?.window).toBe('Charge');
  expect(r.find(x=>x.title.includes('Animus Damper'))?.timing).toBe('start');
  expect(r.some(x=>x.title.includes('Singularity Matrix'))).toBe(false);
  expect(r.filter(x=>x.title.includes('Cosmic Distortion'))).toHaveLength(5);
  for(const name of ['Disharmonisation Cascade','Molecular Erosion','Mass Transmogrification','Entrophasic Aura Targeting','Chronodistortion','Phase Melding'])expect(r.some(x=>x.title.includes(name))).toBe(true);
  expect(new Set(r.map(x=>x.id)).size).toBe(r.length);
  expect(reminders({...a,detachments2026:[]}).some(x=>x.id.startsWith('11e-necron-pantheon-'))).toBe(false);
 });
 it('omits Monster-dependent effects without Monsters',()=>{
  const r=reminders(army('Pantheon of Woe','Immortals'));
  expect(r.some(x=>x.title.includes('Cosmic Distortion')||x.title.includes('Mass Transmogrification')||x.title.includes('Molecular Erosion'))).toBe(false);
  expect(r.some(x=>x.title.includes('Entrophasic Aura Targeting'))).toBe(true);
 });
});
