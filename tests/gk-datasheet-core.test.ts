// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {GK_CARDS} from '../src/gk-profiles.generated';
import {gkProfileReminders,greyKnightsFormationHasDeepStrike} from '../src/gk-datasheet-core';
import {greyKnightsLoadout,greyKnightsModelLoadouts} from '../src/grey-knights-loadouts';
import {GREY_KNIGHTS_SHEETS} from '../src/grey-knights-data.generated';
const s=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(roster:RosterInstance[],detachment='Brotherhood Strike'):ArmySelection=>({...newSelection('Grey Knights'),units:Object.fromEntries(roster.map(v=>[v.unit,1])),instances:roster,detachments2026:[detachment]});
const rows=(...roster:RosterInstance[])=>gkProfileReminders(army(roster),roster);
const stockKey=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^servoarms$/,'servoarm');
it.each(GREY_KNIGHTS_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s prints the phase and count of its actual purchased and issued equipment',(unit,sheet)=>{
 for(const size of sheet.sizes){
  const base=s(unit,size),kit=greyKnightsLoadout(unit,size)!;
  for(const choice of [base,...kit.slots.flatMap(slot=>slot.choices.slice(1).map(gear=>({...base,knightGear:{[slot.name]:gear.name}})))]){
   const guns=greyKnightsModelLoadouts(choice).flatMap(m=>m.items.map(stockKey)),print=rows(choice).filter(r=>r.title.includes('weapon profiles')&&r.window!=='Movement');
   for(const p of GK_CARDS[unit].weapons.filter(w=>w.abilities.length||w.mode||w.strength!==undefined)){
    const n=guns.filter(g=>g===stockKey(p.name)).length,text=print.find(r=>r.window===p.phase)?.summary??'',marker=' × '+p.name+(p.mode?' (':' —');
    if(n)expect(text).toContain(n+marker);else expect(text).not.toContain(marker);
   }
  }
 }
});
it('uses September aircraft keywords and Hover for each real hull, with no snap shooting from the Titanic transport',()=>{
 const hawk=s('Stormhawk Interceptor'),talon=s('Stormtalon Gunship'),raven=s('Stormraven Gunship'),transport=s('Grey Knights Thunderhawk Gunship');
 const all=rows(hawk,talon,raven,transport);
 const aircraft=all.filter(r=>r.title.startsWith('Aircraft ·'));expect(aircraft).toHaveLength(6);
 expect(aircraft.every(r=>r.units.join(',')===[hawk.id,talon.id].join(','))).toBe(true);
 expect(aircraft.find(r=>r.window==='End of opponent turn')?.turn).toBe('opponent');
 expect(all.filter(r=>r.title.endsWith('Hover')).map(r=>r.units[0]).sort()).toEqual([raven.id,transport.id].sort());
 const weaponRows=all.filter(r=>r.title===transport.id+' · Ranged weapon profiles');expect(weaponRows.map(r=>r.window)).toEqual(['Shooting']);
 expect(weaponRows[0].summary).toContain('4 × Twin heavy bolter');expect(weaponRows[0].summary).not.toContain('Hellstrike missile battery');
 expect(all.filter(r=>r.title===transport.id+' · Damaged').every(r=>r.summary.includes('1–10 wounds'))).toBe(true);
});
it('distinguishes current S5 melee amendments and shows them only for models that replaced their Nemesis weapon',()=>{
 for(const unit of ['Strike Squad','Purifier Squad','Interceptor Squad','Purgation Squad']){
  const base=s(unit,5),kit=greyKnightsLoadout(unit,5)!,slot=kit.slots.find(slot=>slot.choices.some(c=>c.items.includes('Close combat weapon')))!,picked=slot.choices.find(c=>c.items.includes('Close combat weapon'))!;
  const changed={...base,knightGear:{[slot.name]:picked.name}},melee=rows(changed).find(r=>r.title.endsWith('Melee weapon profiles'))!;
  expect(melee.summary).toMatch(/1 × Close combat weapon — S5/);
  if(unit==='Strike Squad'||unit==='Purifier Squad')expect(melee.source).toMatch(/warhammer-community.*faction_pack_grey_knights/);
  expect(rows(base).find(r=>r.title.endsWith('Melee weapon profiles'))?.summary??'').not.toMatch(/Close combat weapon/);
 }
});
it('revalidates Deep Strike and Scout on the entire actual formation, including a legal Inquisitor',()=>{
 const strike=s('Strike Squad',5),rho=s('Rhino'),razor=s('Razorback'),caster={...s('Inquisitor'),attachedTo:strike.id};
 const base=rows(strike,rho,razor);expect(base.find(r=>r.title===strike.id+' · Deep Strike')?.units).toEqual([strike.id]);
 expect(base.filter(r=>r.title.endsWith('Scouts · Dedicated Transport')).map(r=>r.units[0]).sort()).toEqual([rho.id,razor.id].sort());
 const joined=[strike,rho,razor,caster],a=army(joined),protectedRows=gkProfileReminders(a,joined);
 expect(greyKnightsFormationHasDeepStrike(a,[strike,caster])).toBe(false);
 expect(protectedRows.some(r=>r.title.includes('Scouts')||r.title.endsWith('Deep Strike'))).toBe(false);
 const champion={...s('Brotherhood Champion'),attachedTo:strike.id};
 expect(greyKnightsFormationHasDeepStrike(army([strike,champion]),[strike,champion])).toBe(true);
 expect(rows(strike,rho,champion).some(r=>r.title.includes('Scouts'))).toBe(false);
 const deck=protectedRows.find(r=>r.title===rho.id+' · Firing Deck 2')!;
 expect(deck.units).toEqual([rho.id,strike.id,caster.id]);expect(deck.summary).toMatch(/Inquisitor.*Bolt pistol/i);
 expect(deck.summary).not.toMatch(/Combi-weapon|Psychic Shock Wave/);
 const psychic={...caster,knightGear:{Firearm:'Combi-weapon','Inquisitorial gifts':'Psychic gifts + Psychic Shock Wave + Inquisitorial melee weapon'}};
 const arm=rows(strike,rho,psychic).find(r=>r.title.endsWith('Firing Deck 2'))!.summary;
 expect(arm).toMatch(/Combi-weapon/);expect(arm).toMatch(/Psychic Shock Wave/i);expect(arm).not.toMatch(/Bolt pistol/i);
});
