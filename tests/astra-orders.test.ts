// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {astraOrderModes,astraOrderReminders,astraOrderTargets} from '../src/astra-orders';
import {ASTRA_SHEETS} from '../src/astra-militarum-data';
import {ASTRA_OFFICERS} from '../src/astra-militarum-data.generated';
import {astraMilitarumLoadout} from '../src/astra-militarum-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const unit=(name:string,options:Partial<RosterInstance>={}):RosterInstance=>({id:name+'#1',unit:name,...options});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Astra Militarum'),instances,detachments2026:['Combined Arms']});
const issue=(a:ArmySelection,s:RosterInstance)=>astraOrderReminders(a).find(r=>r.title===s.id+' · Voice of Command');
it('checks every printed Officer against each of the 72 native formations, including Gaunt’s own unit',()=>{
 for(const [name,profile] of Object.entries(ASTRA_OFFICERS)){
  const officer=unit(name);
  const other=ASTRA_SHEETS.filter(s=>s.unit!==name).map(s=>unit(s.unit));
  const a=army(officer,...other);
  const ids=astraOrderTargets(a,officer).map(s=>s.unit);
  for(const s of ASTRA_SHEETS){
   const tags=[s.unit.toUpperCase(),...s.keywords??[],...Object.values(s.modelKeywords??{}).flat()];
   expect(ids.includes(s.unit),name+' issuing to '+s.unit).toBe(tags.some(k=>profile.targets.includes(k)));
  }
 }
});
it('uses each Commander’s real recipients and round allowance and excludes non-Militarum allies',()=>{
 const tank=unit('Rogal Dorn Commander'),regiment=unit('Cadian Shock Troops'),scout=unit('Scout Sentinels'),ally=unit('Warhound Titan');
 const a=army(tank,regiment,scout,ally);
 const row=issue(a,tank)!;
 expect(row.summary).toMatch(/2 Orders per battle round.*Within 12″/);
 expect(row.units).toContain(scout.id);
 expect(row.units).not.toContain(regiment.id);
 expect(row.units).not.toContain(ally.id);
 expect(astraOrderReminders({...a,faction:'Genestealer Cults',detachments2026:['Brood Brothers Auxilia']})).toEqual([]);
});
it('distinguishes both Grand Strategist enhancements and the native Commissar order restrictions',()=>{
 const officer=unit('Cadian Castellan',{enhancement:'Grand Strategist'}),troops=unit('Cadian Shock Troops'),a=army(officer,troops);
 expect(issue(a,officer)?.summary).toContain('one additional Order');
 expect(issue({...a,detachments2026:['Armoured Infantry']},officer)?.summary).not.toContain('one additional Order');
 const commissar=unit('Commissar'),b=army(commissar,troops,unit('Ratlings'));
 expect(astraOrderModes(b,commissar)).toEqual(['Fix Bayonets!','Duty and Honour!']);
 expect(astraOrderTargets(b,commissar).map(s=>s.unit)).not.toContain('Ratlings');
 const abhuman={...b,detachments2026:['Abhuman Auxiliaries']};
 expect(astraOrderTargets(abhuman,commissar).map(s=>s.unit)).toContain('Ratlings');
 expect(astraOrderModes(abhuman,commissar)).toContain('Take Aim!');
});
it('uses the actual Master Vox for the issuer range and permits one embarked Chimera Officer',()=>{
 const officer=unit('Catachan Command Squad'),troops=unit('Catachan Jungle Fighters',{models:10}),transport=unit('Chimera');
 const slot=astraMilitarumLoadout(officer.unit,5)!.slots.find(s=>s.choices.some(c=>c.items.some(n=>n.toLowerCase()==='master vox')))!;
 const selected=slot.choices.find(c=>c.items.some(n=>n.toLowerCase()==='master vox'))!;
 const absent=slot.choices.find(c=>!c.items.some(n=>n.toLowerCase()==='master vox'))!;
 expect(issue(army({...officer,knightGear:{[slot.name]:absent.name}},troops),officer)?.summary).toContain('Within 6″');
 const a=army({...officer,knightGear:{[slot.name]:selected.name}},troops,transport);
 expect(issue(a,officer)?.summary).toContain('Within 24″');
 expect(astraOrderReminders(a).find(r=>r.title==='Mobile Command Vehicle · '+officer.id)?.summary).toContain(transport.id);
});
it('combines all Officers arriving in a phase without printing a duplicate menu for each',()=>{
 const a=army(unit('Cadian Castellan'),unit('Commissar'),unit('Cadian Shock Troops'));
 const rows=astraOrderReminders(a).filter(r=>r.title==='Voice of Command · After arrival');
 expect(rows.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
 expect(rows.every(r=>r.turn==='either'&&r.timing==='end'&&r.summary.includes('Cadian Castellan#1')&&r.summary.includes('Commissar#1'))).toBe(true);
});
it('includes real native officers in the public generator and keeps the two Priest datasheets distinct',()=>{
 const officer=unit('Lord Solar Leontus'),troops=unit('Cadian Shock Troops');
 const native=unit('Ministorum Priest'),assigned=unit('Ministorum Priest (Imperial Agents)');
 const rows=generate11thReminders(army(officer,troops,native,assigned));
 expect(rows.find(r=>r.title===officer.id+' · Voice of Command')?.units).toContain(troops.id);
 expect(rows.some(r=>r.id.startsWith('11e-agent-'+native.id+'-'))).toBe(false);
 expect(rows.some(r=>r.id.startsWith('11e-agent-'+assigned.id+'-'))).toBe(true);
});
