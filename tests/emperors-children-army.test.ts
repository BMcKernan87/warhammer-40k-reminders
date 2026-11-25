// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {emperorsChildrenArmyReminders} from '../src/emperors-children-army';
import {EMPERORS_CHILDREN_SHEETS} from '../src/emperors-children-data.generated';
import type {RosterInstance} from '../src/roster-instances';
const row=(unit:string,extra:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...extra});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Emperor’s Children'),instances,detachments2026:['Carnival of Excess']});
it.each(EMPERORS_CHILDREN_SHEETS.map(s=>[s.unit,s.keywords?.includes('LEGIONS OF EXCESS')??false] as const))('checks the actual %s card when generating an advance or fall-back charge', (unit,isDaemon)=>{
 const s=row(unit),rules=emperorsChildrenArmyReminders(army(s));
 if(isDaemon){expect(rules).toEqual([]);return;}
 expect(rules.find(r=>r.window==='Charge')).toMatchObject({units:[s.id],turn:'own',summary:expect.stringMatching(/Advanced or Fell Back.*engaged with at turn start.*another unit’s charge or attack in this phase/)});
 expect(rules.some(r=>r.window==='Fight'||r.turn==='opponent')).toBe(false);
});
it('suppresses shooting for melee-only formations while retaining their charge exception',()=>{
 const spawn=row('Chaos Spawn'),guns=row('Noise Marines');
 const rules=generate11thReminders(army(spawn,guns)).filter(r=>r.id.startsWith('11e-ec-thrill-seekers-'));
 expect(rules.find(r=>r.window==='Shooting')?.units).toEqual([guns.id]);
 expect(rules.find(r=>r.window==='Charge')?.units).toEqual([spawn.id,guns.id]);
 expect(rules.find(r=>r.window==='Movement')?.summary).toMatch(/start of this turn.*this phase/);
});
it('resolves a joined gun-bearing Leader on the bodyguard and excludes borrowed Daemons and War Dogs',()=>{
 const body=row('Infractors'),leader=row('Lord Exultant',{attachedTo:body.id}),dogs=row('War Dog Brigand'),slaanesh=row('Daemonettes');
 const a=army(leader,body,dogs,slaanesh);
 const rules=generate11thReminders(a);
 const innate=rules.filter(r=>r.id.startsWith('11e-ec-thrill-seekers-'));
 expect(innate.length).toBeGreaterThan(0);
 expect(innate.every(r=>JSON.stringify(r.units)===JSON.stringify([body.id]))).toBe(true);
 expect(rules.some(r=>r.id.startsWith('11e-chaos-knight-card')&&r.units?.includes(dogs.id))).toBe(true);
 expect(innate.some(r=>r.units?.includes(slaanesh.id))).toBe(false);
});
