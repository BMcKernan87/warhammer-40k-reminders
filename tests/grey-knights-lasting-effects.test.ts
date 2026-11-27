// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {greyKnightsIntrinsicReminders as reminders} from '../src/grey-knights-intrinsic';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster,individualArmy,setInstanceAttachment,type RosterInstance} from '../src/roster-instances';

// Current reproduced 11e cards: https://wahapedia.ru/wh40k11ed/factions/grey-knights/datasheets.html
// Durations: https://wahapedia.ru/wh40k11ed/the-rules/rules-appendix/
// Core 15.09: https://wahapedia.ru/wh40k11ed/the-rules/core-rules/
const id=(unit:string,n=1)=>unit+'#'+n;
function army(...units:string[]):ArmySelection{
 let a=individualArmy({...newSelection('Grey Knights'),detachments2026:['Brotherhood Strike']});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const cases=[
 ['Purgation Squad','Righteous Persecution','Strike Squad','Rhino',6],
 ['Brotherhood Techmarine','Blessing of the Omnissiah','Rhino','Grand Master',5],
 ['Razorback','Fire Focus','Strike Squad','Rhino',2],
 ['Venerable Dreadnought','Guidance of the Ancients','Strike Squad','Rhino',1],
] as const;
const effect=(a:ArmySelection,name:string,live?:readonly RosterInstance[])=>reminders(a,live).filter(r=>r.title.startsWith(name+' · '));
const activation=(a:ArmySelection,name:string,live?:readonly RosterInstance[])=>reminders(a,live).filter(r=>r.title===name);
describe.each(cases)('%s lasting effects',(source,title,recipient,replacement,count)=>{
 it('keeps original activation and later reminders independently keyed',()=>{
  const a=army(source,recipient);
  expect(activation(a,title)).toHaveLength(1);
  expect(effect(a,title)).toHaveLength(count);
  expect(effect(a,title).every(r=>r.summary.includes('even if'))).toBe(true);
  const rows=generate11thReminders(a);
  expect(rows.some(r=>r.title.startsWith(title+' · '))).toBe(true);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 });
 it.each(['removed','zero'] as const)('preserves the already-selected benefit after the source is %s',mode=>{
  const a=army(source,recipient);
  const live=mode==='removed'?expandRoster(a).filter(s=>s.unit!==source):expandRoster(a).map(s=>s.unit===source?{...s,models:0}:s);
  expect(activation(a,title,live)).toEqual([]);
  expect(effect(a,title,live).map(r=>r.id)).toEqual(effect(a,title).map(r=>r.id));
  expect(reminders(a,[])).toEqual([]);
 });
 it('rejects reused, duplicate, undeclared or originally zero source identities',()=>{
  const a=army(source,recipient),current=expandRoster(a),s=current.find(m=>m.unit===source)!;
  const changed=current.map(m=>m.id===s.id?{...m,unit:replacement}:m);
  const duplicate=[...current,s];
  const invalid={...a,instances:current.map(m=>m.id===s.id?{...m,models:0}:m)};
  for(const live of [changed,duplicate]){
   expect(activation(a,title,live)).toEqual([]);
   expect(effect(a,title,live)).toEqual([]);
  }
  expect(effect(army(recipient),title,current)).toEqual([]);
  expect(activation(invalid,title)).toEqual([]);
  expect(effect(invalid,title)).toEqual([]);
 });
});
it('keeps pin selection restricted and expiry and old completion IDs explicit',()=>{
 const a=army('Purgation Squad','Purgation Squad','Strike Squad');
 const rows=effect(a,'Righteous Persecution');
 expect(rows).toHaveLength(12);
 expect(rows.every(r=>/non-Monster, non-Vehicle.*until your next turn starts/.test(r.summary))).toBe(true);
 expect(rows.every(r=>r.summary.includes('not fixed-distance moves'))).toBe(true);
 expect(rows.map(r=>r.id)).toContain('11e-gk-card:Purgation Squad#1:Righteous Persecution:Movement:opponent:during');
 expect(rows.map(r=>r.id)).toContain('11e-gk-card:Purgation Squad#2:Righteous Persecution:Charge:opponent:during');
 expect(rows.some(r=>r.window==='Movement'&&r.turn==='own')).toBe(false);
});
it('restricts blessings to native surviving Vehicle models and normal Hit rolls',()=>{
 const a=army('Brotherhood Techmarine','Rhino','Rhino','Knight Paladin','Strike Squad');
 const rows=effect(a,'Blessing of the Omnissiah');
 expect(rows.every(r=>r.units?.includes(id('Rhino'))&&r.units?.includes(id('Rhino',2))&&!r.units?.includes(id('Knight Paladin'))&&!r.units?.includes(id('Strike Squad')))).toBe(true);
 expect(rows.every(r=>r.summary.includes('Fixed snap-shot Hit rolls cannot be modified')&&r.summary.includes('until your next Command phase starts'))).toBe(true);
 const live=expandRoster(a).filter(s=>s.id!==id('Rhino'));
 expect(effect(a,'Blessing of the Omnissiah',live).every(r=>!r.units?.includes(id('Rhino')))).toBe(true);
 expect(effect(a,'Blessing of the Omnissiah',live.filter(s=>s.unit!=='Rhino'))).toEqual([]);
 expect(rows.map(r=>r.id)).toContain('11e-gk-card:Brotherhood Techmarine#1:Blessing of the Omnissiah:Shooting:own:during');
});
it('keeps Fire Focus on the actual original disembarking models, not a new leader or an ineligible Terminator',()=>{
 let a=army('Razorback','Strike Squad','Brotherhood Champion','Brotherhood Terminator Squad');
 a=setInstanceAttachment(a,id('Brotherhood Champion'),id('Strike Squad'));
 const rows=effect(a,'Fire Focus');
 expect(rows).toHaveLength(2);
 expect(rows.every(r=>r.units?.includes(id('Strike Squad'))&&!r.units?.includes(id('Brotherhood Terminator Squad')))).toBe(true);
 expect(rows.every(r=>r.summary.includes('actually disembarked from this exact Razorback this turn')&&r.summary.includes('until this turn ends'))).toBe(true);
 const live=expandRoster(a).filter(s=>s.unit!=='Razorback'&&s.unit!=='Strike Squad');
 expect(effect(a,'Fire Focus',live).every(r=>r.units?.includes(id('Brotherhood Champion')))).toBe(true);
 expect(effect(a,'Fire Focus',live).map(r=>r.id)).toEqual(rows.map(r=>r.id));
 const changed=expandRoster(a).map(s=>s.unit==='Brotherhood Champion'?{...s,attachedTo:undefined}:s);
 expect(effect(a,'Fire Focus',changed)).toEqual([]);
});
it('limits Guidance to the own Shooting phase and genuine Grey Knights models',()=>{
 const a=army('Venerable Dreadnought','Strike Squad','Knight Paladin');
 const rows=effect(a,'Guidance of the Ancients');
 expect(rows).toHaveLength(1);
 expect(rows[0]).toMatchObject({window:'Shooting',turn:'own'});
 expect(rows[0].units).toContain(id('Strike Squad'));
 expect(rows[0].units).not.toContain(id('Knight Paladin'));
 expect(rows[0].summary).toContain('rest of this Shooting phase');
 expect(rows[0].summary).toContain('Fixed snap-shot Hit rolls cannot be modified');
});
