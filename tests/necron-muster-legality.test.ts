import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection,removeSelectionUnit} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment,autoAttachUnambiguousInstances,removeRosterInstance} from '../src/roster-instances';
import {necronUnitLimit,legalWarlordCandidates,resolvedWarlord,selectWarlord,unresolvedSupports,NECRON_EPIC_HEROES_11E} from '../src/necron-muster-legality';
import {NECRON_SUPPORTS} from '../src/attachments';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
const army=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const id=(a:ReturnType<typeof army>,unit:string)=>expandRoster(a).find(s=>s.unit===unit)!.id;
const errors=(a:ReturnType<typeof army>)=>rosterFindings(a).filter(f=>f.severity==='error');
describe('11e Necron mustering',()=>{
 it('requires all six Support datasheets to attach, but allows incomplete drafts to persist',()=>{
  for(const support of NECRON_SUPPORTS){
   const a=army(support);
   expect(unresolvedSupports(a).map(s=>s.unit)).toEqual([support]);
   expect(errors(a).some(f=>f.code==='mandatory-support')).toBe(true);
   expect(validateSelection(a)).toBe(true);
   const b=autoAttachUnambiguousInstances(addSelectionUnit(a,'Immortals'));
   expect(unresolvedSupports(b)).toEqual([]);
   expect(expandRoster(b).find(s=>s.unit===support)?.attachedTo).toBe(id(b,'Immortals'));
  }
  expect(unresolvedSupports(army('Overlord'))).toEqual([]);
 });
 it('does not guess among two eligible destinations or allow a second Support slot',()=>{
  const a=army('Technomancer','Plasmancer','Immortals','Necron Warriors');
  expect(unresolvedSupports(autoAttachUnambiguousInstances(a))).toHaveLength(2);
  const b=setInstanceAttachment(a,id(a,'Technomancer'),id(a,'Immortals'));
  expect(()=>setInstanceAttachment(b,id(a,'Plasmancer'),id(a,'Immortals'))).toThrow();
  expect(unresolvedSupports(autoAttachUnambiguousInstances(b))).toHaveLength(0);
 });
 it('detects malformed imported Support links and resolves removal without losing the draft',()=>{
  const a=army('Technomancer','Immortals','Doomsday Ark');
  const b={...a,instances:expandRoster(a).map(s=>s.unit==='Technomancer'?{...s,attachedTo:id(a,'Doomsday Ark')}:s)};
  expect(unresolvedSupports(b)).toHaveLength(1);
  const c=setInstanceAttachment(a,id(a,'Technomancer'),id(a,'Immortals'));
  const d=removeRosterInstance(c,id(c,'Immortals'));
  expect(unresolvedSupports(d)).toHaveLength(1);
  expect(validateSelection(d)).toBe(true);
 });
 it('applies battle-size copy limits to all nine Epic Heroes, Battleline and Dedicated Transports',()=>{
  for(const size of ['Incursion','Strike Force'] as const){
   const a={...army(),battleSize2026:size};
   const cap=size==='Incursion'?2:3;
   for(const u of NECRON_EPIC_HEROES_11E)expect(necronUnitLimit(a,u)).toBe(1);
   for(const u of ['Immortals','Necron Warriors','Ghost Ark'])expect(necronUnitLimit(a,u)).toBe(cap*2);
   expect(necronUnitLimit(a,'Canoptek Wraiths')).toBe(cap);
   for(const [u,n] of [['Imotekh the Stormlord',2],['Ghost Ark',cap*2+1],['Immortals',cap*2+1],['Canoptek Wraiths',cap+1]] as const){
    expect(errors(addSelectionUnit(a,u,n)).some(f=>f.code==='rule-of-three'&&f.unit===u)).toBe(true);
   }
   expect(errors(addSelectionUnit(a,'Ghost Ark',cap*2)).some(f=>f.code==='rule-of-three')).toBe(false);
  }
 });
 it('excludes all C’tan and non-Characters and automatically selects the Silent King',()=>{
  const a=army('C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','C’tan Shard of the Deceiver','Transcendent C’tan','Immortals');
  expect(legalWarlordCandidates(a)).toEqual([]);
  expect(errors(a).some(f=>f.code==='warlord-required')).toBe(true);
  const b=addSelectionUnit(a,'Overlord');
  expect(resolvedWarlord(b)?.unit).toBe('Overlord');
  expect(()=>selectWarlord(b,id(b,'Transcendent C’tan'))).toThrow();
  const c=addSelectionUnit(b,'The Silent King');
  expect(resolvedWarlord(c)?.unit).toBe('The Silent King');
  expect(()=>selectWarlord(c,id(c,'Overlord'))).toThrow();
  expect(resolvedWarlord(removeSelectionUnit(c,'The Silent King'))?.unit).toBe('Overlord');
 });
 it('retains the chosen Warlord across edits and restricts Warlord-targeted stratagems',()=>{
  let a=army('Overlord','Royal Warden','Immortals');
  a=selectWarlord(a,id(a,'Royal Warden'));
  const b={...a,detachments2026:['Hypercrypt Legion']};
  expect(generate11thReminders(b).find(r=>r.title.includes('Reanimation Crypts'))?.units).toEqual([id(b,'Royal Warden')]);
  const c={...a,detachments2026:['Obeisance Phalanx']};
  expect(generate11thReminders(c).filter(r=>r.title.includes('Your Time Is Nigh')).every(r=>r.units?.[0]===id(c,'Royal Warden'))).toBe(true);
  expect(generate11thReminders({...army('Transcendent C’tan'),detachments2026:['Hypercrypt Legion']}).some(r=>r.title.includes('Reanimation Crypts'))).toBe(false);
  expect(resolvedWarlord(removeRosterInstance(a,id(a,'Royal Warden')))?.unit).toBe('Overlord');
 });
 it('detects known points over the battle limit without inventing unverified prices',()=>{
  const a={...army('C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','C’tan Shard of the Deceiver'),battleSize2026:'Incursion' as const};
  expect(errors(a).some(f=>f.code==='points-limit')).toBe(true);
 });
});
