// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {CSM_SHEETS,CSM_DARK_PACT_UNITS} from '../src/csm-data';
import {CSM_ARMY_SHEETS} from '../src/csm-army-data';
import {csmArmyLoadout} from '../src/csm-army-loadouts';
import {csmCanDarkPact,csmDarkPactsReminders} from '../src/csm-dark-pacts';
import {csmIntrinsicReminders} from '../src/csm-intrinsic';
import type {RosterInstance} from '../src/roster-instances';

function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:CSM_ARMY_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('Chaos Space Marines'),units,instances,detachments2026:detachments};
}
const id=(unit:string)=>unit+'#1';
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const native=(a:ArmySelection,title:string,roster?:RosterInstance[])=>csmIntrinsicReminders(a,roster).filter(r=>r.title===title);
it('uses exactly the54 native Dark Pacts sources instead of faction-keyword inference',()=>{
 expect(new Set(CSM_DARK_PACT_UNITS)).toEqual(new Set(CSM_SHEETS.map(s=>s.unit)));
 const a=army(CSM_SHEETS.map(s=>s.unit));
 for(const source of a.instances!)expect(csmCanDarkPact(a,[source]),source.unit).toBe(true);
});
it('requires the Leadership test and failed-test mortal wounds before selecting the phase-long pact benefit',()=>{
 const a=army(['Legionaries']),rows=csmDarkPactsReminders(a);
 expect(rows.map(r=>[r.window,r.turn,r.timing])).toEqual([['Fight','either','during'],['Shooting','own','during'],['Movement','opponent','end']]);
 for(const row of rows){expect(row.summary).toContain('First take its Leadership test');expect(row.summary).toContain('D3 mortal wounds before any pact effects');expect(row.summary).toContain('Then choose Lethal Hits or Sustained Hits 1');expect(row.summary).toContain('until the end of the phase');}
 expect(rows.find(r=>r.window==='Shooting')!.summary).toContain('no eligible shooting target');expect(rows.find(r=>r.window==='Fight')!.summary).not.toContain('no eligible shooting target');
});
it('retains legal Dark Pact selection in Overwatch while explicitly suppressing both Critical Hit benefits',()=>{
 const a=army(['Abaddon The Despoiler','Defiler','Forgefiend']),rows=csmDarkPactsReminders(a).filter(r=>r.window==='Movement');
 expect(rows).toHaveLength(3);expect(rows.every(r=>r.turn==='opponent'&&r.timing==='end')).toBe(true);
 expect(rows.every(r=>r.summary.includes('neither chosen ability can trigger Critical Hits'))).toBe(true);
 expect(native(a,'Dark Destiny').find(r=>r.window==='Movement')!.summary).toContain('result is 7 or more');
 expect(native(a,'Daemonforge').find(r=>r.window==='Movement')!.summary).toContain('Wound rolls of 1');
});
it('removes shooting prompts for formations with no equipped ranged weapons and all Overwatch from Titanic units',()=>{
 const a=army(['Possessed','Mutilators','Khorne Lord Of Skulls']),rows=csmDarkPactsReminders(a);
 for(const unit of ['Possessed','Mutilators'])expect(rows.filter(r=>r.units?.includes(id(unit))).map(r=>r.window)).toEqual(['Fight']);
 expect(rows.filter(r=>r.units?.includes(id('Khorne Lord Of Skulls'))).map(r=>r.window)).toEqual(['Fight','Shooting']);
});
it('treats an attached formation as one pact and includes the actual attached model’s guns',()=>{
 const a=join(army(['Possessed','Master Of Possession']),'Master Of Possession','Possessed'),rows=csmDarkPactsReminders(a);
 expect(rows).toHaveLength(3);expect(rows.every(r=>r.units?.length===2&&r.title===id('Possessed')+' · Dark Pacts')).toBe(true);
 const blood=native(a,'Unholy Bloodshed');expect(blood.find(r=>r.window==='Movement')!.units).toContain(id('Master Of Possession'));
 const active=a.instances!.filter(s=>s.unit!=='Possessed');expect(native(a,'Unholy Bloodshed',active)).toEqual([]);expect(native(a,'Unholy Bloodshed · Lasting effect',active).length).toBeGreaterThan(0);
});
it('keeps pact and unqualified trigger timing during Cypher’s normal return fire',()=>{
 const a=army(['Cypher']),row=csmDarkPactsReminders(a).find(r=>r.window==='Shooting'&&r.turn==='opponent')!;
 expect(row).toBeDefined();expect(row.summary).toContain('Only when Cypher is permitted to use Guns Blazing');expect(row.summary).toContain('Lethal Hits automatically wounds');expect(row.summary).not.toContain('neither chosen ability can trigger');
 expect(csmDarkPactsReminders(a,[])).toEqual([]);
});
it('does not grant Dark Pacts to Cult allies, Daemonic Pact allies or Dreadblades',()=>{
 const a=army(['Khorne Berzerkers','Rubric Marines','Plague Marines','Noise Marines','Bloodletters','War Dog Brigand']);
 expect(csmDarkPactsReminders(a)).toEqual([]);for(const source of a.instances!)expect(csmCanDarkPact(a,[source])).toBe(false);
});
it('removes every pact-only native cue under Renegade Warband, including retained original-source pact effects',()=>{
 let a=army(['Abaddon The Despoiler','Chaos Terminator Squad','Defiler','Helbrute','Possessed','Master Of Possession','Legionaries'],['Renegade Warband']);a=join(a,'Master Of Possession','Possessed');
 expect(csmDarkPactsReminders(a)).toEqual([]);
 for(const title of ['Dark Destiny','Despoilers','Daemonforge','Dark Ascension','Unholy Bloodshed','Chaos Icon'])expect(native(a,title)).toEqual([]);
 const active=a.instances!.filter(s=>s.unit!=='Possessed');expect(native(a,'Unholy Bloodshed · Lasting effect',active)).toEqual([]);
 expect(native(a,'Sacrificial Dagger').length).toBeGreaterThan(0);
});
it('requires the actual fitted Chaos icon and drops its re-roll after the original icon unit dies',()=>{
 let a=join(army(['Legionaries','Chaos Lord']),'Chaos Lord','Legionaries');
 expect(csmDarkPactsReminders(a).every(r=>!r.summary.includes('Icon sources'))).toBe(true);
 const squad=a.instances![0],slot=csmArmyLoadout(squad.unit,squad.models)!.slots.find(f=>f.choices.some(c=>c.items.includes('Chaos icon')))!;
 a={...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear:{[slot.name]:slot.choices.find(c=>c.items.includes('Chaos icon'))!.name}}:s)};
 expect(csmDarkPactsReminders(a).every(r=>r.summary.includes('Leadership test')&&r.summary.includes('Icon sources: '+id('Legionaries')))).toBe(true);
 const active=a.instances!.filter(s=>s.unit!=='Legionaries');expect(csmDarkPactsReminders(a,active).every(r=>!r.summary.includes('Icon sources'))).toBe(true);
});
it('lets Helbrute’s aura offer both benefits only to actual pact-capable sources',()=>{
 const a=army(['Helbrute','Legionaries','Noise Marines','War Dog Brigand']),rows=native(a,'Dark Ascension');
 expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.units?.includes(id('Legionaries'))&&!r.units?.includes(id('Noise Marines'))&&!r.units?.includes(id('War Dog Brigand')))).toBe(true);
 expect(rows.find(r=>r.window==='Movement')!.summary).toContain('Neither Critical Hit benefit can trigger');
});
it('keeps Dark Pacts on the original faction only',()=>{
 const a={...army(['Legionaries']),faction:'World Eaters' as const};expect(csmDarkPactsReminders(a)).toEqual([]);expect(csmCanDarkPact(a,a.instances!)).toBe(false);
});
