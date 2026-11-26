// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {EC_CARDS} from '../src/ec-profiles.generated';
import {ecProfileReminders} from '../src/ec-datasheet-core';
import {emperorsChildrenLoadout,emperorsChildrenModelLoadouts} from '../src/emperors-children-loadouts';
import {EMPERORS_CHILDREN_SHEETS} from '../src/emperors-children-data.generated';
import {worldEaterProfileReminders} from '../src/world-eater-core';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(members:RosterInstance[],detachment='Carnival of Excess'):ArmySelection=>({...newSelection('Emperor’s Children'),units:Object.fromEntries(members.map(s=>[s.unit,1])),instances:members,detachments2026:[detachment]});
const rows=(...members:RosterInstance[])=>ecProfileReminders(army(members),members);
const key=(s:string)=>s.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
it.each(EMPERORS_CHILDREN_SHEETS.map(s=>[s.unit,s] as const))('%s applies the faction’s actual fitted weapon profiles at both legal price tiers',(unit,s)=>{
 const card=EC_CARDS[unit];
 for(const size of s.sizes){
  const base=squad(unit,size),kit=emperorsChildrenLoadout(unit,size)!;
  const changes=[base,...kit.slots.flatMap(slot=>slot.choices.slice(1).map(c=>({...base,knightGear:{[slot.name]:c.name}})))];
  for(const instance of changes){
   const items=emperorsChildrenModelLoadouts(instance).flatMap(b=>b.items.map(key));
   const printed=rows(instance).filter(r=>r.title.includes('weapon profiles')&&r.window!=='Movement');
   for(const p of card.weapons.filter(w=>w.abilities.length||w.mode)){
    const n=items.filter(i=>i===key(p.name)).length,marker=' × '+p.name+(p.mode?' (':' —');
    const text=printed.find(r=>r.window===p.phase)?.summary??'';
    if(n)expect(text).toContain(n+marker);else expect(text).not.toContain(marker);
   }
  }
 }
});
it('gives Lord of the Host only the deployment shared by its actual bodyguard, including scouting a dedicated Rhino',()=>{
 const lord=squad('Lord Exultant'),rhino=squad('Chaos Rhino');
 for(const [unit,scout,infiltrate] of [['Infractors',true,false],['Tormentors',false,true]] as const){
  const b=squad(unit,5),joined={...lord,attachedTo:b.id};
  const r=rows(b,joined,rhino);
  expect(r.some(r=>r.title.endsWith('Scouts 6″')&&r.units?.length===2)).toBe(scout);
  expect(r.some(r=>r.title.endsWith('Scouts · Dedicated Transport')&&r.units?.includes(lord.id))).toBe(scout);
  expect(r.some(r=>r.title.endsWith('Infiltrators')&&r.units?.length===2)).toBe(infiltrate);
 }
 expect(rows(lord).some(r=>/Scouts|Infiltrators/.test(r.title))).toBe(false);
});
it('requires Deep Strike on each member and only gives Cacophonic Accompaniment to the selected Kakophonist',()=>{
 const lord=squad('Lord Kakophonist');
 for(const [name,expected] of [['Chaos Terminators',true],['Noise Marines',false]] as const){
  const b=squad(name),joined={...lord,attachedTo:b.id},roster=[b,joined],a=army(roster,'Elegant Brutes');
  expect(ecProfileReminders(a,roster).some(r=>r.title.includes('Deep Strike'))).toBe(false);
  const tuned={...a,upgrades2026:{[lord.id]:'Cacophonic Accompaniment'}};
  const deep=ecProfileReminders(tuned,roster).filter(r=>r.title.includes('Deep Strike'));
  expect(deep.length).toBe(expected?3:0);if(expected)expect(deep.every(r=>r.units?.join('|')===[b.id,lord.id].join('|'))).toBe(true);
 }
});
it('prints a whole unjoined Lucius’s Lone Operative, actual recipient saves and the v1.3 5+ Defiler save',()=>{
 const lucius=squad('Lucius the Eternal'),b=squad('Flawless Blades'),defiler=squad('Defiler');
 const solo=rows(lucius),attached=rows(b,{...lucius,attachedTo:b.id},defiler);
 expect(solo.filter(r=>r.title.includes('Lone Operative'))).toHaveLength(3);
 expect(attached.some(r=>r.title.includes('Lone Operative'))).toBe(false);
 expect(attached.filter(r=>r.title.endsWith('Feel No Pain 5+')).every(r=>r.units?.join()===lucius.id)).toBe(true);
 expect(attached.find(r=>r.title===defiler.id+' · Invulnerable save')?.summary).toContain('5+');
 expect(attached.find(r=>r.title===defiler.id+' · Damaged')?.summary).toContain('1–6 wounds');
});
it('keeps the five Legion cards inside Carnival and preserves unrelated World Eaters and Daemon kit behavior',()=>{
 const seekers=squad('Seekers'),daemonettes=squad('Daemonettes'),spawn=squad('Chaos Spawn'),legion=[seekers,daemonettes];
 expect(ecProfileReminders(army(legion,'Elegant Brutes'),legion)).toEqual([]);
 const r=rows(...legion,spawn);
 expect(r.some(r=>r.title===seekers.id+' · Scouts 9″')).toBe(true);
 expect(r.find(r=>r.title===daemonettes.id+' · Fights First')).toMatchObject({turn:'either',window:'Fight'});
 expect(r.some(r=>r.title.startsWith(spawn.id)&&r.title.includes('Scouts'))).toBe(false);
 expect(ecProfileReminders({...army(legion),faction:'Chaos Daemons'},legion)).toEqual([]);
 expect(worldEaterProfileReminders({...army([spawn]),faction:'World Eaters'},[spawn]).some(r=>r.title===spawn.id+' · Scouts 8″')).toBe(true);
});
it('emits only fitted passenger weapons from legal Rhino formations and scopes the heldrake Hover to its own move',()=>{
 const ride=squad('Chaos Rhino'),marines=squad('Tormentors',5),term=squad('Chaos Terminators',5),drake=squad('Heldrake');
 const slot=emperorsChildrenLoadout(marines.unit,5)!.slots.find(s=>s.name.startsWith('Tormentor 1 ·')&&s.choices.some(c=>c.name==='Plasma gun'))!;
 const changed={...marines,knightGear:{[slot.name]:'Plasma gun'}};
 const r=rows(ride,changed,term,drake);
 const deck=r.find(r=>r.title.includes('Firing Deck'))!;
 expect(deck).toMatchObject({window:'Shooting',turn:'own',units:[ride.id,changed.id]});
 expect(deck.summary).toMatch(/1 × Tormentor —.*Plasma gun [–-] standard.*Plasma gun [–-] supercharge/);
 expect(deck.summary).not.toMatch(/Terminator|Meltagun/);
 expect(r.find(r=>r.title.endsWith('Hover'))).toMatchObject({units:[drake.id],window:'Movement',turn:'own'});
});
