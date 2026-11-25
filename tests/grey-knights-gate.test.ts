// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {GREY_KNIGHTS_GATE_UNITS,GREY_KNIGHTS_SHEETS} from '../src/grey-knights-data.generated';
import type {RosterInstance} from '../src/roster-instances';

const row=(unit:string,fields:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...fields});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Grey Knights'),instances,detachments2026:['Brotherhood Strike']});
const gates=(a:ArmySelection)=>generate11thReminders(a).filter(r=>r.id.startsWith('11e-gk-gate-'));
it('only lists the 17 matched cards that print Gate, including the Venerable Dreadnought',()=>{
 const required=new Set(['Brother-captain','Brotherhood Champion','Brotherhood Chaplain','Brotherhood Librarian','Brotherhood Techmarine','Brotherhood Terminator Squad','Castellan Crowe','Grand Master','Grand Master In Nemesis Dreadknight','Grand Master Voldus','Interceptor Squad','Nemesis Dreadknight','Paladin Squad','Purgation Squad','Purifier Squad','Strike Squad','Venerable Dreadnought']);
 expect(new Set(GREY_KNIGHTS_GATE_UNITS)).toEqual(required);
 for(const s of GREY_KNIGHTS_SHEETS){
  const one=row(s.unit,{models:s.sizes[0]});
  expect(gates(army(one)).map(c=>c.units),s.unit).toEqual(required.has(s.unit)?[[one.id],[one.id]]:[]);
 }
});
it('lists legally attached models together and gives first-turn permission only to the formations just removed',()=>{
 const strike=row('Strike Squad',{models:5}),champ=row('Brotherhood Champion',{attachedTo:strike.id}),ally=row('Grey Knights Terminator Squad'),armiger=row('Armiger Warglaive');
 const a={...army(champ,strike,ally,armiger),battleSize2026:'Incursion' as const};
 expect(gates(a)).toMatchObject([
  {window:'Fight',timing:'end',turn:'opponent',units:[strike.id],summary:expect.stringMatching(/up to 2 unengaged formations on the battlefield.*Every model/)},
  {window:'Movement',timing:'during',turn:'own',units:[strike.id],summary:expect.stringMatching(/next Movement phase.*removed using Gate of Infinity.*first turn.*every model/)}
 ]);
});
it('conditions an Inquisitor-led squad on its surviving models and never gives its Inquisitor Gate',()=>{
 const body=row('Brotherhood Terminator Squad',{models:5}),inq=row('Inquisitor',{attachedTo:body.id}),other=row('Venerable Dreadnought');
 const out=gates(army(body,inq,other));
 expect(out[0].summary).toMatch(/Eligible intact formations: Venerable Dreadnought#1\. Brotherhood Terminator Squad#1 can use Gate only after Inquisitor#1 no longer belongs to it/);
 expect(out[0].units).not.toContain(inq.id);
 expect(gates(army(inq))).toEqual([]);
});
it('applies the Tome only when its legal bearer is on the battlefield or in Strategic Reserves',()=>{
 const holder=row('Grand Master',{enhancement:'Tome of Forbidden Ways'}),plain=row('Venerable Dreadnought');
 const list=army(holder,plain);
 expect(gates({...list,battleSize2026:'Strike Force'})[0].summary).toMatch(/up to 3 unengaged.*Grand Master#1.*battlefield or in Strategic Reserves.*increases to 4/);
 expect(gates({...list,battleSize2026:'Incursion'})[0].summary).toContain('increases to 3');
 expect(gates({...list,detachments2026:['Banishers']})[0].summary).not.toContain('increases');
 expect(gates(army({...plain,enhancement:'Tome of Forbidden Ways'}))[0].summary).toContain('increases to 4');
 expect(gates(army(row('Strike Squad',{enhancement:'Tome of Forbidden Ways'})))[0].summary).not.toContain('increases');
});
