// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {greyKnightsDetachmentReminders as reminders} from '../src/grey-knights-detachments';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster,individualArmy,setInstanceAttachment,type RosterInstance} from '../src/roster-instances';
import {GK_UPGRADES} from '../src/grey-knights-detachments.generated';

// Source: reproduced Grey Knights App 11e, Augurium Task Force, Shield of
// Prophecy, https://wahapedia.ru/wh40k11ed/factions/grey-knights/
// Appendix 01.02.02 and 05.02.01 (persisting effects / multiple Toughness):
// https://wahapedia.ru/wh40k11ed/the-rules/rules-appendix/
const shield='Shield of Prophecy',key='000010364003';
const captain='Brother-captain',body='Brotherhood Terminator Squad';
const id=(name:string,n=1)=>name+'#'+n;
function army(...units:string[]):ArmySelection{
 let a=individualArmy({...newSelection('Grey Knights'),detachments2026:['Augurium Task Force']});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const equip=(a:ArmySelection,unit:string)=>({...a,upgrades2026:{[id(unit)]:shield}});
const joined=()=>equip(setInstanceAttachment(army(captain,body,body,'Rhino'),id(captain),id(body)),captain);
const rows=(a:ArmySelection,roster?:readonly RosterInstance[])=>reminders(a,roster).filter(r=>r.sourceRuleId===key);
const activation=(a:ArmySelection,roster?:readonly RosterInstance[])=>rows(a,roster).filter(r=>r.window==='Start of battle round');
const effects=(a:ArmySelection,roster?:readonly RosterInstance[])=>rows(a,roster).filter(r=>r.title.endsWith(' · active'));
const windows=['Movement:own:during','Movement:opponent:during','Shooting:own:during','Shooting:opponent:during','Fight:either:during'].sort();
describe('Shield of Prophecy source timing and original recipients',()=>{
 it.each([...GK_UPGRADES.find(u=>u.id===key)!.units])('emits one activation and five independent attack-window reminders for %s',unit=>{
  const a=equip(army(unit),unit);
  const all=rows(a);
  expect(activation(a)).toMatchObject([{id:'11e-gk-det-'+key+'-'+id(unit)+'-Start of battle round-either',window:'Start of battle round',turn:'either',timing:'start',units:[id(unit)]}]);
  expect(effects(a).map(r=>[r.window,r.turn,r.timing].join(':')).sort()).toEqual(windows);
  expect(effects(a).every(r=>r.units?.join()===id(unit)&&r.summary.includes('at the start of this battle round')&&r.summary.includes('until the end of this battle round'))).toBe(true);
  expect(new Set(all.map(r=>r.id)).size).toBe(6);
 });
 it('targets only the original legal attached formation and retains the activation ID and original root',()=>{
  const a=joined();
  expect(activation(a)[0]).toMatchObject({id:'11e-gk-det-'+key+'-'+id(captain)+'-Start of battle round-either',units:[id(body)]});
  expect(activation(a)[0].summary).toContain('Once per battle');
  expect(effects(a)).toHaveLength(5);
  for(const r of effects(a)){
   expect(r.units).toEqual([id(body),id(captain)]);
   expect(r.summary).toContain('add 2 to the Toughness');
   expect(r.summary).toContain('highest Toughness among surviving Bodyguard models');
   expect(r.summary).toContain('even if the bearer is destroyed');
   expect(r.summary).toContain('This is not another use');
   expect(r.summary).toContain('retains the effect for its remaining duration');
  }
  const all=generate11thReminders(a);
  expect(all.filter(r=>r.sourceRuleId===key)).toHaveLength(6);
  expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
 });
 it.each(['removed','zero'] as const)('retains previously granted Toughness when the bearer is %s without another activation',mode=>{
  const a=joined(),original=expandRoster(a);
  const live=mode==='removed'?original.filter(s=>s.id!==id(captain)):original.map(s=>s.id===id(captain)?{...s,models:0}:s);
  expect(activation(a,live)).toEqual([]);
  expect(effects(a,live).map(r=>r.id)).toEqual(effects(a).map(r=>r.id));
  expect(effects(a,live).every(r=>r.units?.join()===id(body))).toBe(true);
 });
 it.each(['removed','zero'] as const)('preserves the surviving original Captain when its Bodyguard is %s',mode=>{
  const a=joined(),original=expandRoster(a);
  const live=mode==='removed'?original.filter(s=>s.id!==id(body)):original.map(s=>s.id===id(body)?{...s,models:0}:s);
  expect(activation(a,live)[0]?.units).toEqual([id(captain)]);
  expect(effects(a,live).map(r=>r.id)).toEqual(effects(a).map(r=>r.id));
  expect(effects(a,live).every(r=>r.units?.join()===id(captain))).toBe(true);
 });
 it('does not transfer the effect after the entire selected formation is destroyed',()=>{
  const a=joined();
  expect(rows(a,expandRoster(a).filter(s=>s.id!==id(body)&&s.id!==id(captain)))).toEqual([]);
 });
 it('requires the enhancement to be selected and the correct detachment',()=>{
  const a=army(captain,body);
  expect(rows(a)).toEqual([]);
  expect(rows({...equip(a,captain),detachments2026:['Brotherhood Strike']})).toEqual([]);
  expect(rows(equip(army(body),body))).toEqual([]);
 });
 it('rejects duplicate selections of the ordinary unique enhancement',()=>{
  const a=equip(army(captain,captain),captain);
  expect(rows({...a,upgrades2026:{[id(captain)]:shield,[id(captain,2)]:shield}})).toEqual([]);
  expect(rows({...a,upgrades2026:{[captain]:shield}})).toEqual([]);
 });
 it('rejects invalid original joins, dead original bearers, duplicated or substituted identities',()=>{
  const a=joined(),declared=expandRoster(a);
  const invalid=(changes:Partial<RosterInstance>)=>({...a,instances:declared.map(s=>s.id===id(captain)?{...s,...changes}:s)});
  for(const bad of [invalid({attachedTo:'missing'}),invalid({attachedTo:id('Rhino')}),invalid({models:0}),invalid({keepUnattached:true})]){
   expect(rows(bad)).toEqual([]);
   expect(rows(bad,expandRoster(bad).filter(s=>s.id!==id(captain)))).toEqual([]);
  }
  const reused=declared.map(s=>s.id===id(captain)?{...s,unit:'Grand Master'}:s);
  const bodyReused=declared.map(s=>s.id===id(body)?{...s,unit:'Paladin Squad'}:s);
  const duplicate=[...declared,declared.find(s=>s.id===id(captain))!];
  const reattached=declared.map(s=>s.id===id(captain)?{...s,attachedTo:id(body,2)}:s);
  const injected=[...declared,{id:'Brotherhood Librarian#99',unit:'Brotherhood Librarian',models:1,attachedTo:id(body)}];
  for(const live of [reused,bodyReused,duplicate,reattached,injected])expect(rows(a,live)).toEqual([]);
  expect(rows({...a,instances:duplicate})).toEqual([]);
  expect(rows(army(body),declared)).toEqual([]);
 });
});
