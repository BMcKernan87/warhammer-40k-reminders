// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {worldEaterFormationHasDeepStrike,worldEaterProfileReminders} from '../src/world-eater-core';
import {worldEaterLoadout,worldEaterModelLoadouts} from '../src/world-eater-loadouts';
import {WORLD_EATER_CARDS} from '../src/world-eater-profiles.generated';
import {WORLD_EATERS_SHEETS} from '../src/world-eaters-data.generated';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(roster:RosterInstance[],detachment='Khorne Daemonkin'):ArmySelection=>({...newSelection('World Eaters'),detachments2026:[detachment],instances:roster,units:Object.fromEntries(roster.map(s=>[s.unit,1]))});
const rows=(...units:RosterInstance[])=>worldEaterProfileReminders(army(units),units);
const weaponKey=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'').replace('juggernautsbladedhorn','bladedhorn');
it.each(WORLD_EATERS_SHEETS.map(s=>[s.unit,s] as const))('%s prints only the actual profile counts and modes for its default and legal alternatives',(unit,s)=>{
 const card=WORLD_EATER_CARDS[unit];
 for(const size of s.sizes){
  const base=squad(unit,size),kit=worldEaterLoadout(unit,size)!;
  const variants=[base,...kit.slots.flatMap(slot=>slot.choices.slice(1).map(choice=>({...base,knightGear:{[slot.name]:choice.name}})))];
  for(const variant of variants){
   const expected=worldEaterModelLoadouts(variant).flatMap(b=>b.items.map(weaponKey));
   const r=rows(variant).filter(r=>r.title.includes('weapon profiles')&&r.window!=='Movement');
   for(const weapon of card.weapons.filter(w=>w.abilities.length||w.mode)){
    const n=expected.filter(v=>v===weaponKey(weapon.name)).length,text=r.find(r=>r.window===weapon.phase)?.summary??'';
    if(n){expect(text).toContain(n+' × '+weapon.name+(weapon.mode?' (choose one profile per weapon)':' — '));}
    else expect(text).not.toContain(' × '+weapon.name+(weapon.mode?' (':' —'));
   }
  }
 }
});
it('grants Fire Riders only to the validly joined bodyguard and never transfers its Scouts to Berzerkers',()=>{
 const b=squad('Khorne Berzerkers',10),lord={...squad('Lord Invocatus'),attachedTo:b.id};
 const result=rows(lord,b);
 const ingress=result.filter(r=>r.title.includes('Deep Strike'));
 expect(ingress).toHaveLength(3);expect(ingress.every(r=>r.units?.join('/')===[b.id,lord.id].join('/'))).toBe(true);
 expect(ingress.find(r=>r.turn==='opponent')).toMatchObject({timing:'end',summary:expect.stringMatching(/round two or later.*8″/)});
 expect(result.some(r=>r.title.includes('Scouts'))).toBe(false);
 const invalid={...lord,attachedTo:squad('Jakhals',10).id};
 const bad=rows(invalid,squad('Jakhals',10));
 expect(bad.filter(r=>r.units?.includes(squad('Jakhals',10).id)).some(r=>r.title.includes('Deep Strike'))).toBe(false);
});
it('the Slaughterbound inherits both abilities itself while its formation must qualify for each separately',()=>{
 const lord=squad('Slaughterbound');
 expect(rows(lord).some(r=>/Scouts|Deep Strike/.test(r.title))).toBe(false);
 const eight=squad('Eightbound'),exalted=squad('Exalted Eightbound');
 const scouts=rows({...lord,attachedTo:eight.id},eight),arrive=rows({...lord,attachedTo:exalted.id},exalted);
 expect(scouts.filter(r=>r.title.includes('Scouts')).map(r=>r.units)).toEqual([[eight.id,lord.id]]);
 expect(scouts.some(r=>r.title.includes('Deep Strike'))).toBe(false);
 expect(arrive.filter(r=>r.title.includes('Deep Strike')&&r.window==='Pre-battle').map(r=>r.units)).toEqual([[exalted.id,lord.id]]);
 expect(arrive.some(r=>r.title.includes('Scouts'))).toBe(false);
});
it('applies Disciple and Butcher Lord to the bearer only and filters conditional Blood Legions from other armies',()=>{
 const hounds=squad('Flesh Hounds',5),lord={...squad('Lord on Juggernaut'),attachedTo:hounds.id},members=[hounds,lord];
 const a={...army(members),upgrades2026:{[lord.id]:'Disciple of Khorne'}};
 expect(worldEaterFormationHasDeepStrike(a,members)).toBe(true);
 expect(worldEaterFormationHasDeepStrike(army(members),members)).toBe(false);
 expect(worldEaterProfileReminders(army([hounds],'Berzerker Warband'),[hounds])).toEqual([]);
 expect(worldEaterProfileReminders({...a,faction:'Chaos Daemons'},members)).toEqual([]);
 for(const [body,expected] of [['Goremongers',true],['Jakhals',false]] as const){
  const b=squad(body),master={...squad('Master of Executions'),attachedTo:b.id},group=[master,b];
  const cult={...army(group,'Cult of Blood'),upgrades2026:{[master.id]:'Butcher Lord'}};
  expect(worldEaterProfileReminders(cult,group).some(r=>r.title.includes('Infiltrators')&&r.units?.length===2)).toBe(expected);
 }
});
it('filters Rhino Firing Deck to real embarkable bearers including their selected plasma modes, excluding Possessed and oversize squads',()=>{
 const rhino=squad('Chaos Rhino'),bad=squad('Eightbound',3),berzerkers={...squad('Khorne Berzerkers',10),knightGear:{'Khorne Berzerker 1 · Bolt pistol alternatives':'Plasma pistol'}};
 const deck=rows(rhino,bad,berzerkers).find(r=>r.title.includes('Firing Deck'))!;
 expect(deck).toMatchObject({window:'Shooting',turn:'own',units:[rhino.id,berzerkers.id]});
 expect(deck.summary).toMatch(/one ranged weapon.*One Shot/i);expect(deck.summary).toMatch(/1 × Khorne Berzerker — Plasma pistol – standard.*Plasma pistol – supercharge/);
 expect(deck.summary).toMatch(/8 × Khorne Berzerker — Bolt pistol/);
 expect(rows(rhino,bad,{...berzerkers,models:20}).some(r=>r.title.includes('Firing Deck'))).toBe(false);
});
it('keeps saves, destruction, degraded Attacks and objective penalties attached to their own models and windows',()=>{
 const sk=squad('Skarbrand'),lord=squad('Khorne Lord of Skulls'),spawn=squad('Chaos Spawn'),heldrake=squad('Heldrake');
 const result=rows(sk,lord,spawn,heldrake);
 expect(result.find(r=>r.title===sk.id+' · Damaged')).toMatchObject({window:'Fight',turn:'either',summary:expect.stringMatching(/1–7 wounds.*add 2.*Attacks/)});
 expect(result.filter(r=>r.title.startsWith(lord.id)&&r.title.endsWith('Objective Control')).every(r=>r.summary.includes('subtract 4'))).toBe(true);
 expect(result.some(r=>r.title.startsWith(lord.id)&&r.title.includes('Ranged weapon')&&r.window==='Movement')).toBe(false);
 expect(result.filter(r=>r.title===spawn.id+' · Feel No Pain 5+')).toHaveLength(5);
 expect(result.find(r=>r.title===sk.id+' · Invulnerable save')).toMatchObject({units:[sk.id],summary:expect.stringContaining('4+')});
 expect(result.find(r=>r.title.startsWith(heldrake.id)&&r.title.includes('Hover'))?.summary).toContain('2″ reduction');
 expect(result.find(r=>r.title.startsWith(lord.id)&&r.title.includes('Deadly Demise'))?.summary).toContain('D6+2 mortal wounds');
});
