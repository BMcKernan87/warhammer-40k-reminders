// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {GSC_ALLIED_SHEETS,gscAllyFaction} from '../src/gsc-allies';
import {gscHasRangedWeapon} from '../src/gsc-loadouts';
import {finalDayHasRangedWeapon} from '../src/final-day-loadouts';
import {finalDayWeaponReminders} from '../src/final-day-weapon-reminders';
import {knightLoadoutFor,knightWeaponCount,setKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';
const make=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(instances:RosterInstance[]):ArmySelection=>({...newSelection('Genestealer Cults'),detachments2026:['Final Day'],instances,units:Object.fromEntries(instances.map(s=>[s.unit,1]))});
it('keeps stock talons and allows exactly one Hive Tyrant bio-weapon, including the two ranged options',()=>{
 const tyrant=make('Winged Hive Tyrant'),a=army([tyrant]);
 expect(finalDayHasRangedWeapon(tyrant)).toBe(false);
 expect(knightWeaponCount(tyrant,'Tyrant talons')).toBe(1);
 for(const selected of ['Heavy venom cannon','Stranglethorn cannon','Monstrous scything talons']){
  const updated=setKnightGear(a,tyrant.id,'Bio-weapon',selected),s=updated.instances![0];
  expect(knightWeaponCount(s,'Monstrous bonesword and lash whip')).toBe(0);
  expect(knightWeaponCount(s,selected)).toBe(1);
  expect(knightWeaponCount(s,'Tyrant talons')).toBe(1);
  expect(gscHasRangedWeapon(s)).toBe(selected!=='Monstrous scything talons');
  const actual=finalDayWeaponReminders(updated,[s]);
  if(selected==='Monstrous scything talons')expect(actual.find(r=>r.window==='Fight')?.summary).toMatch(/scything talons.*Extra Attacks/);
  else expect(actual.find(r=>r.window==='Shooting')?.summary).toContain(selected+' — Blast');
  expect(actual.some(r=>r.summary.includes('Monstrous bonesword'))).toBe(false);
 }
 expect(()=>setKnightGear(a,tyrant.id,'Bio-weapon','Heavy venom cannon + Stranglethorn cannon')).toThrow();
});
it('assigns the one venom bolt to the Hyperadapted unit, leaves the attached plain Raveners melee-only, and respects shooting timing',()=>{
 const lead=make('Hyperadapted Raveners',5),body=make('Raveners',5),units=[{...lead,attachedTo:body.id},body],a=army(units);
 expect(knightWeaponCount(lead,'Venom bolt')).toBe(1);
 expect(knightWeaponCount(lead,'Prime claws and talons')).toBe(1);
 expect(knightWeaponCount(lead,'Ravener heavy claws and talons')).toBe(4);
 expect(knightWeaponCount(body,'Ravener claws and talons')).toBe(5);
 expect(gscHasRangedWeapon(body)).toBe(false);
 const rows=finalDayWeaponReminders(a,units);
 expect(rows.filter(r=>r.units?.includes(body.id)&&r.window!=='Fight')).toEqual([]);
 const own=rows.find(r=>r.window==='Shooting')!,watch=rows.find(r=>r.window==='Movement')!;
 expect(own).toMatchObject({turn:'own',units:[lead.id],summary:expect.stringMatching(/1 × Venom bolt.*Assault.*Ignores Cover.*Torrent/)});
 expect(watch).toMatchObject({turn:'opponent',timing:'end',units:[lead.id]});
 expect(watch.summary).not.toContain('Assault (');
});
it('reproduces model quantities and recipient-scoped weapon triggers for all fourteen permitted allies',()=>{
 const expectedRange=['Gargoyles','Hyperadapted Raveners','Trygon','Tyrannocyte'];
 for(const sheet of GSC_ALLIED_SHEETS.filter(s=>gscAllyFaction(s.unit)==='Tyranids')){
  for(const n of Object.keys(sheet.compositionBySize!).map(Number)){
   const s=make(sheet.unit,n),a=army([s]);
   expect(knightLoadoutFor(a.faction,s.unit,n),s.unit+' '+n).toBeDefined();
   expect(finalDayHasRangedWeapon(s)).toBe(expectedRange.includes(s.unit));
   const rows=finalDayWeaponReminders(a,[s]);
   expect(rows.every(r=>r.units?.[0]===s.id&&r.source.includes('/wh40k11ed/factions/tyranids/'))).toBe(true);
   expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
   if(s.unit==='Gargoyles')expect(knightWeaponCount(s,'Fleshborer')).toBe(n);
   if(s.unit==='Von Ryan’s Leapers')expect(knightWeaponCount(s,'Leaper’s talons')).toBe(n);
  }
 }
 const selected=[make('Mawloc'),make('Deathleaper'),make('The Red Terror'),make('Trygon')],a=army(selected);
 const cues=finalDayWeaponReminders(a,selected);
 expect(cues.find(r=>r.units?.[0]==='Mawloc#1')?.summary).toMatch(/Anti-Infantry 4\+.*Devastating Wounds.*Extra Attacks/);
 expect(cues.find(r=>r.units?.[0]==='Deathleaper#1')?.summary).toMatch(/Precision/);
 expect(cues.find(r=>r.units?.[0]==='The Red Terror#1')?.summary).toContain('Gaping maw');
 expect(cues.find(r=>r.units?.[0]==='Trygon#1'&&r.window==='Shooting')?.summary).toMatch(/critical hit scores 2 extra hits/);
 expect(finalDayWeaponReminders({...a,detachments2026:['Host of Ascension']},selected)).toEqual([]);
 expect(finalDayWeaponReminders({...a,faction:'Tyranids'},selected)).toEqual([]);
});
