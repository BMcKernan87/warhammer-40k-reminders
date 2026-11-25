// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {DG_CARDS} from '../src/dg-profiles.generated';
import {dgProfileReminders} from '../src/dg-datasheet-core';
import {deathGuardLoadout,deathGuardModelLoadouts} from '../src/death-guard-loadouts';
import {DEATH_GUARD_SHEETS} from '../src/death-guard-data.generated';
const s=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(roster:RosterInstance[],detachment='Tallyband Summoners'):ArmySelection=>({...newSelection('Death Guard'),units:Object.fromEntries(roster.map(v=>[v.unit,1])),instances:roster,detachments2026:[detachment]});
const rows=(...roster:RosterInstance[])=>dgProfileReminders(army(roster),roster);
const stockKey=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
it.each(DEATH_GUARD_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s prints the phase and count of its actual purchased and issued equipment',(unit,sheet)=>{
 for(const size of sheet.sizes){
  const base=s(unit,size),kit=deathGuardLoadout(unit,size)!;
  for(const choice of [base,...kit.slots.flatMap(slot=>slot.choices.slice(1).map(gear=>({...base,knightGear:{[slot.name]:gear.name}})))]){
   const guns=deathGuardModelLoadouts(choice).flatMap(m=>m.items.map(stockKey)),print=rows(choice).filter(r=>r.title.includes('weapon profiles')&&r.window!=='Movement');
   for(const p of DG_CARDS[unit].weapons.filter(w=>w.abilities.length||w.mode)){
    const n=guns.filter(g=>g===stockKey(p.name)).length,text=print.find(r=>r.window===p.phase)?.summary??'',marker=' × '+p.name+(p.mode?' (':' —');
    if(n)expect(text).toContain(n+marker);else expect(text).not.toContain(marker);
   }
  }
 }
});
it('prints deployment for actual formations and keeps the Deathshroud own-phase ingress rule distinct from Rapid Ingress',()=>{
 const body=s('Deathshroud Terminators',3),typhus={...s('Typhus'),attachedTo:body.id},both=rows(body,typhus);
 expect(both.find(r=>r.title.endsWith(' · Deep Strike'))?.units).toEqual([body.id,typhus.id]);
 expect(both.find(r=>r.title.endsWith(' · Deep Strike')&&r.window==='Movement')).toBeUndefined();
 expect(both.find(r=>r.title.endsWith(' · Rapid Ingress'))).toMatchObject({units:[body.id,typhus.id],window:'Movement',turn:'opponent',summary:expect.stringContaining('more than 8″')});
 const pox=s('Poxwalkers',10),joined=rows(pox,{...typhus,attachedTo:pox.id});
 expect(rows(pox).some(r=>r.title.endsWith('Infiltrators'))).toBe(true);
 expect(joined.some(r=>r.title.endsWith('Infiltrators')||r.title.endsWith('Deep Strike'))).toBe(false);
 expect(joined.filter(r=>r.title.includes('Feel No Pain')).every(r=>r.units.length===1&&r.units[0]===pox.id)).toBe(true);
});
it('uses installed passenger guns from both leaders and marines, omitting passengers that cannot legally fit',()=>{
 const marines=s('Plague Marines',7),rhino=s('Chaos Rhino'),pair=[{...s('Plague Surgeon'),attachedTo:marines.id},{...s('Malignant Plaguecaster'),attachedTo:marines.id}];
 const terms=s('Blightlord Terminators',5),cards=rows(rhino,marines,...pair,terms);
 const deck=cards.find(r=>r.title.endsWith('Firing Deck 2'))!;
 expect(deck).toMatchObject({window:'Shooting',turn:'own'});expect(new Set(deck.units)).toEqual(new Set([rhino.id,marines.id,...pair.map(l=>l.id)]));
 expect(deck.summary).toMatch(/Plague Marine.*Boltgun/);expect(deck.summary).toMatch(/Plague Surgeon.*Bolt pistol/);expect(deck.summary).toMatch(/Malignant Plaguecaster.*Plague Wind/i);
 expect(rows(rhino,terms).some(r=>r.title.endsWith('Firing Deck 2'))).toBe(false);
});
it('grants future Shamblerot reinforcements their own printed FNP and Lethal Hits without deploying them at muster',()=>{
 const hero=s('Typhus'),pox=s('Poxwalkers',10),a=army([hero,pox],'Shamblerot Vectorium'),all=dgProfileReminders(a,[hero,pox]);
 const future=all.filter(r=>r.title.includes('Numberless Horde reinforcements'));
 expect(future.filter(r=>r.title.includes('Feel No Pain 5+')).map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
 expect(future.find(r=>r.window==='Fight'&&r.title.includes('weapon profiles'))?.summary).toMatch(/after Numberless Horde.*10 × Improvised weapon.*Lethal Hits/);
 expect(future.some(r=>r.window==='Pre-battle')).toBe(false);
 expect(all.find(r=>r.title===pox.id+' · Infiltrators')).toBeDefined();
 expect(dgProfileReminders(army([hero],'Virulent Vectorium'),[hero]).some(r=>r.title.includes('Numberless Horde'))).toBe(false);
});
it('uses the selected host and correct complete formation before allowing the six Plague Legion and defensive cues',()=>{
 const beast=s('Beasts of Nurgle',2),rotigus=s('Rotigus'),nurglings=s('Nurglings',3),group=[beast,rotigus,nurglings],r=rows(...group);
 expect(r.find(v=>v.title===beast.id+' · Scouts 6″')).toBeDefined();
 expect(r.find(v=>v.title===nurglings.id+' · Infiltrators')).toBeDefined();
 expect(r.filter(v=>v.title===rotigus.id+' · Feel No Pain 6+')).toHaveLength(5);
 expect(r.filter(v=>v.title===rotigus.id+' · Damaged').every(v=>v.summary.includes('1–7'))).toBe(true);
 expect(dgProfileReminders(army(group,'Virulent Vectorium'),group)).toEqual([]);
 expect(dgProfileReminders({...army(group),faction:'Chaos Daemons'},group)).toEqual([]);
 const defiler=s('Defiler'),normal=rows(defiler);expect(normal.find(v=>v.title.endsWith('Invulnerable save'))?.summary).toMatch(/5\+ invulnerable/);
 expect(normal.find(v=>v.window==='Shooting'&&v.turn==='own'&&v.title.includes('Ranged weapon profiles'))?.summary).toMatch(/2 × Excruciator cannon.*Lethal Hits/);
});
