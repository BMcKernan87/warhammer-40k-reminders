import {describe,it,expect} from 'vitest';
import {generate11thReminders} from '../src/reminders-11th';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
const s=(unit:string,id=unit):RosterInstance=>({id,unit});
const native=(instances:RosterInstance[],detachments2026:string[]=[])=>({...newSelection('Chaos Daemons'),detachments2026,instances});
const named=(rows:ReturnType<typeof generate11thReminders>,n:string)=>rows.filter(r=>r.title.endsWith(' · '+n));
describe('Dreadblade and Shadow Legion datasheet access within native daemon armies',()=>{
 it('uses the exact fitted Dreadblade card and allows its printed walker, while withholding the Chaos Knight army rule and impossible mixed-size auras',()=>{
   const r=generate11thReminders(native([s('Knight Desecrator','d'),s('Plaguebearers')]));
   expect(named(r,'Obsessive Ruthlessness')[0]).toMatchObject({units:['d'],window:'Shooting'});
   expect(named(r,'Super-heavy Walker')[0].summary).toContain('non-Titanic');
   expect(r.some(x=>x.title.includes('Harbingers of Dread'))).toBe(false);
   expect(named(r,'Ranged weapon profiles').find(x=>x.title.startsWith('d ·'))?.summary).toContain('against a Monster or Vehicle only');
   const bad=generate11thReminders(native([s('Knight Desecrator'),s('War Dog Stalker')]));
   expect(named(bad,'Taskmaster (Aura)')).toEqual([]);
   const pack=generate11thReminders(native([s('War Dog Stalker'),s('War Dog Brigand'),s('War Dog Huntsman')]));
   expect(named(pack,'Huntsman').find(x=>x.window==='Movement')?.turn).toBe('opponent');
   expect(named(pack,'Scouts 6″')).toHaveLength(1);
 });
 it('allows the Dark Commune Chaos Icon through Shadow Legion, prohibits illegal standalone ally cards, and preserves valid native attached formations',()=>{
   const units=[s('Be’lakor','be'),s('Cultist Mob','c'),{...s('Dark Commune','d'),attachedTo:'c'},s('Poxbringer','p'),s('Plaguebearers','pb')];
   const shadow=generate11thReminders(native(units,['Shadow Legion']));
   expect(named(shadow,'Chaos Icon')[0]).toMatchObject({units:['c']});
   expect(named(shadow,'Dark Ritual')[0].summary).toContain('c may charge');
   expect(named(generate11thReminders(native(units)),'Chaos Icon')).toEqual([]);
   expect(named(generate11thReminders(native([s('Skarbrand'),s('Be’lakor')],['Shadow Legion'])),'Rage Embodied (Aura)')).toEqual([]);
   const attached=generate11thReminders(native([{...s('Poxbringer','p'),attachedTo:'pb'},s('Plaguebearers','pb')]));
   expect(named(attached,'Poxbringer')[0].units).toEqual(['pb']);
 });
 it('shares Be’lakor’s actual Shadow Legion forms with Marine formations, excluding Dreadblades and melee-only shooting recipients',()=>{
   const units=[s('Be’lakor','be'),s('Plaguebearers','pb'),s('Havocs','guns'),s('Accursed Cultists','melee'),s('Wardog','unrecognized'),s('Knight Desecrator','dread')];
   const r=generate11thReminders(native(units,['Shadow Legion']));
   const shield=named(r,'Wreathed in Shadows (Aura, Psychic)')[0];
   expect(shield.units?.sort()).toEqual(['be','guns','melee','pb']);
   const offence=named(r,'Shadow Lord (Aura, Psychic)');
   expect(offence.find(c=>c.window==='Shooting')?.units).toContain('guns');
   expect(offence.find(c=>c.window==='Shooting')?.units).not.toContain('melee');
   expect(offence.find(c=>c.window==='Fight')?.units).toContain('melee');
   expect(offence.find(c=>c.window==='Fight')?.units).not.toContain('dread');
 });
});
