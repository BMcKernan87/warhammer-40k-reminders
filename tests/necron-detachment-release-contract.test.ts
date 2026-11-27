// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection,type ArmySelection} from '../src/catalog';
import {DETACHMENTS_2026,detachmentBudget,type BattleSize2026} from '../src/edition-2026';
import {changeDetachments2026} from '../src/roster-detachments';
import {individualArmy,expandRoster,setInstanceAttachment,setInstanceEquipment} from '../src/roster-instances';
import {selectUpgrade2026,UPGRADES_2026} from '../src/upgrades-2026';
import {NECRON_ENHANCEMENT_POINTS,PANTHEON_BINDINGS} from '../src/necron-enhancement-points';
import {generate11thReminders} from '../src/reminders-11th';
import {rosterCost2026} from '../src/datasheets-2026';
import {initialStore,createProfile} from '../src/profiles';
import {openSavedArmies,storeSavedArmies} from '../src/saved-armies';
import {rosterFindings} from '../src/roster-findings';

const force=(detachment:string,...units:string[]):ArmySelection=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:[detachment]});
const id=(name:string)=>name+'#1';
const rows=(a:ArmySelection,name:string)=>generate11thReminders(a).filter(r=>name==='Enlivened Sentinels'?r.id.startsWith('11e-scout-')&&r.summary.includes(name):r.title.includes(' · '+name));
const records=Object.keys(NECRON_ENHANCEMENT_POINTS).map(name=>UPGRADES_2026.find(u=>u.faction==='Necrons'&&u.name===name)!);

describe('Necron detachment and enhancement selection-to-sheet release contract',()=>{
 it('covers all 38 ordinary enhancements plus four mandatory Pantheon bindings',()=>{
  expect(records).toHaveLength(38);
  expect(records.every(Boolean)).toBe(true);
  expect(Object.keys(PANTHEON_BINDINGS)).toHaveLength(4);
 });
 it.each(records.map(record=>[record.detachment,record.name,record.unit] as const))('%s — %s generates only its selected eligible bearer effect',(det,name,unit)=>{
  const body=name==='Murdermind'?'Lokhust Heavy Destroyers':det==='Obeisance Phalanx'?'Lychguard':(['Chronomancer','Geomancer','Plasmancer','Psychomancer','Technomancer','Overlord'].includes(unit)?'Immortals':undefined);
  const units=[unit,...(body?[body]:[]),'Necron Warriors','Doomsday Ark',...(name==='Prelocational Optimiser'?['Monolith']:[])];
  let a=force(det,...new Set(units));
  if(body&&name!=='Murdermind')a=setInstanceAttachment(a,id(unit),id(body));
  if(!expandRoster(a).some(s=>s.unit==='Overlord')&&!expandRoster(a).some(s=>s.unit.endsWith('Lord')||s.unit==='Catacomb Command Barge'))a=addSelectionUnit(a,'Overlord');
  expect(rows(a,name)).toEqual([]);
  let b=selectUpgrade2026(a,id(unit),name);
  if(body&&name==='Murdermind')b=setInstanceAttachment(b,id(unit),id(body));
  expect(validateSelection(b)).toBe(true);
  expect(rosterCost2026(b).total).toBe(rosterCost2026(a).total!+NECRON_ENHANCEMENT_POINTS[name]);
  const actual=rows(b,name);
  expect(actual.length,name).toBeGreaterThan(0);
  expect(actual.every(r=>r.units?.length&&r.source.startsWith('https://')&&(r.title.includes(id(unit))||r.id==='11e-scout-'+id(unit)))).toBe(true);
  expect(new Set(generate11thReminders(b).map(r=>r.id)).size).toBe(generate11thReminders(b).length);
  const roundtrip=openSavedArmies(JSON.parse(storeSavedArmies(initialStore(b),[])));
  expect(roundtrip.retained).toEqual([]);
  expect(generate11thReminders(roundtrip.store.profiles[0].army)).toEqual(generate11thReminders(b));
  expect(rows(selectUpgrade2026(b,id(unit),null),name)).toEqual([]);
  expect(rows(changeDetachments2026(b,[]),name)).toEqual([]);
 });
 it.each(Object.entries(PANTHEON_BINDINGS))('prices and emits only the mandatory binding of %s',(unit,binding)=>{
  const a=force('Pantheon of Woe','Overlord',unit);
  const b=changeDetachments2026(a,['Hand of the Dynasty']);
  const printed=rows(a,binding.name);
  expect(printed.length).toBeGreaterThan(0);
  expect(printed.every(r=>r.title.startsWith(id(unit)+' · ')&&r.units?.includes(id(unit)))).toBe(true);
  expect(rosterCost2026(a).total).toBe(rosterCost2026(b).total!+binding.points);
  expect(rows(b,binding.name)).toEqual([]);
 });
 it('preserves other detachments, legal upgrades, equipment, attachments and saved identity through clearing and reselection',()=>{
  let a=force('Hand of the Dynasty','Overlord','Immortals','Tomb Blades');
  a=changeDetachments2026(a,['Hand of the Dynasty','Skyshroud Spearhead']);
  a=setInstanceAttachment(a,id('Overlord'),id('Immortals'));
  a=setInstanceEquipment(a,id('Immortals'),'Tesla carbine');
  a=selectUpgrade2026(a,id('Immortals'),'Tools of Dominion');
  a=selectUpgrade2026(a,id('Tomb Blades'),'Recursive Reanimation');
  const original=structuredClone(a);
  const sky=changeDetachments2026(a,['Skyshroud Spearhead']);
  expect(sky.upgrades2026).toEqual({[id('Tomb Blades')]:'Recursive Reanimation'});
  expect(rows(sky,'Tools of Dominion')).toEqual([]);
  expect(rows(sky,'Recursive Reanimation')).toHaveLength(5);
  const draft=changeDetachments2026(sky,[]);
  expect(validateSelection(draft)).toBe(true);
  expect(detachmentBudget('Necrons',[],'Strike Force').valid).toBe(false);
  expect(rosterFindings(draft).some(f=>f.code==='no-11e-detachment'&&f.severity==='warning')).toBe(true);
  expect(generate11thReminders(draft).filter(r=>r.origin==='detachment')).toEqual([]);
  expect(expandRoster(draft)).toEqual(expandRoster(original));
  expect(draft.upgrades2026).toEqual({});
  const store=createProfile(initialStore(draft),'other','Other army');
  const raw={...store,activeId:'default',profiles:store.profiles.map(p=>p.id==='default'?{...p,completed:['saved-check']}:p)};
  const restored=openSavedArmies(JSON.parse(storeSavedArmies(raw,[])));
  expect(restored.retained).toEqual([]);
  expect(restored.store).toEqual(raw);
  const changed=changeDetachments2026(restored.store.profiles[0].army,['Awakened Dynasty']);
  expect(expandRoster(changed)).toEqual(expandRoster(original));
  expect(a).toEqual(original);
  expect(()=>changeDetachments2026(changed,['Awakened Dynasty','Hand of the Dynasty'])).toThrow(/budget/);
  expect(()=>changeDetachments2026(changed,['Skysword Spearhead','Skyshroud Spearhead'])).toThrow(/budget/);
  expect(()=>changeDetachments2026(changed,['Made up'])).toThrow(/budget/);
 });
 it('keeps every supported faction’s empty-detachment draft editable without making it a valid matched-play selection',()=>{
  for(const [faction,det] of Object.entries(DETACHMENTS_2026)){
   if(!det?.length)continue;
   const a=newSelection(faction as ArmySelection['faction']);
   const draft=changeDetachments2026(changeDetachments2026(a,[det[0].name]),[]);
   expect(validateSelection(draft),faction).toBe(true);
   expect(detachmentBudget(draft.faction,[],'Strike Force').valid).toBe(false);
   expect(openSavedArmies(JSON.parse(storeSavedArmies(initialStore(draft),[]))).retained).toEqual([]);
   expect(validateSelection({...draft,detachments2026:['made-up detachment']})).toBe(false);
  }
 });
});
