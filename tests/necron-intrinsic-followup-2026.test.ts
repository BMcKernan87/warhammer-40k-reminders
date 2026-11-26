import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';

// Necrons Faction Pack v1.3, p.13: Accelerator Mandible selects one friendly
// Canoptek unit within 3" of the bearer's unit at the start of Fight; its weapons
// improve WS by 1 until the end of that phase. Core 01.02.02 preserves a timed
// effect after its source is destroyed. Core 19.01/19.04 preserve the original
// attached unit, but do not permit transferring a benefit to another formation.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
const macro=(id='macro'):RosterInstance=>({id,unit:'Canoptek Macrocytes',wargear:{'Accelerator mandible':1}});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Necrons'),instances});
const joined=()=>army(macro(),{id:'body',unit:'Immortals'},{id:'support',unit:'Technomancer',attachedTo:'body'},
 {id:'crawlers',unit:'Canoptek Tomb Crawlers',retinueTo:'body'},{id:'unrelated',unit:'Immortals'});
const followups=(a:ArmySelection,live=expandRoster(a))=>necronDatasheetReminders2026(a,live)
 .filter(r=>r.title.endsWith(' · Accelerator Mandible · selected formation'));
const activations=(a:ArmySelection,live=expandRoster(a))=>necronDatasheetReminders2026(a,live)
 .filter(r=>r.title.endsWith(' · Accelerator Mandible'));

describe('Accelerator Mandible retains only its original selected Fight benefit',()=>{
 it('keeps the normal start-of-Fight selection without duplicating unchanged recipients',()=>{
  const a=joined();
  expect(followups(a)).toEqual([]);
  expect(activations(a)).toMatchObject([{window:'Fight',timing:'start',units:['macro','body']}]);
  expect(activations(a)[0].summary).toMatch(/bearer survives.*within 3″ of its unit.*Weapon Skill.*this phase/);
 });

 it.each([
  ['source', ['macro']],
  ['recipient keyword', ['crawlers']],
  ['source and recipient keyword', ['macro','crawlers']],
 ] as const)('retains the original attached recipient after %s loss',(reason,removed)=>{
  const a=joined(),live=expandRoster(a).filter(s=>!(removed as readonly string[]).includes(s.id));
  const rows=followups(a,live);
  expect(rows).toMatchObject([{id:'11e-necron-extra-mandible-lasting-macro-Fight',window:'Fight',timing:'during',turn:'either',units:['body']}]);
  expect(rows[0].summary).toMatch(/If.*bearer selected.*within 3″ of its unit.*start of this Fight phase.*Weapon Skill of weapons.*by 1 until this phase ends/);
  expect(rows[0].summary).toMatch(/bearer is destroyed.*loses its Canoptek keyword.*Only the original formation actually selected.*does not permit a new selection/);
  expect(rows[0].source).toBe('https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Macrocytes');
  expect(rows[0].units).not.toContain('unrelated');
  expect(activations(a,live)).toHaveLength((removed as readonly string[]).includes('macro')?0:1);
 });

 it('retains a selected effect after the equipped bearer is lost while other Macrocytes survive',()=>{
  const a=joined(),live=expandRoster(a).map(s=>s.id==='macro'?{...s,models:4,wargear:{'Accelerator mandible':0}}:s);
  expect(activations(a,live)).toEqual([]);
  expect(followups(a,live)).toMatchObject([{units:['macro','body']}]);
 });

 it('keeps the surviving originally attached Support as recipient after all its Bodyguards die',()=>{
  const a=joined(),live=expandRoster(a).filter(s=>s.id==='support'||s.id==='unrelated');
  expect(followups(a,live)).toMatchObject([{units:['support']}]);
 });

 it('keeps duplicate Macrocytes sources independent and does not grant new activations to the dead source',()=>{
  const a=joined();a.instances!.push(macro('second'));
  const live=expandRoster(a).filter(s=>s.id!=='macro');
  expect(followups(a,live)).toMatchObject([{id:'11e-necron-extra-mandible-lasting-macro-Fight',title:'macro · Accelerator Mandible · selected formation',units:['body','second']}]);
  expect(activations(a,live).map(r=>r.title)).toEqual(['second · Accelerator Mandible']);
 });

 it.each([
  {id:'macro',unit:'Canoptek Spyders'},
  {...macro(),attachedTo:'body'},
  {...macro(),retinueTo:'body'},
 ])('rejects a changed original source identity or membership: %j',changed=>{
  const a=joined(),live=expandRoster(a).map(s=>s.id==='macro'?changed:s).filter(s=>s.id!=='crawlers');
  expect(followups(a,live)).toEqual([]);
 });

 it('does not transfer a selection to a reused recipient ID with a different datasheet',()=>{
  const a=army(macro(),{id:'recipient',unit:'Canoptek Wraiths'});
  expect(followups(a,[{id:'recipient',unit:'Immortals'}])).toEqual([]);
 });

 it('does not transfer the benefit through changed retinue membership',()=>{
  const a=joined(),live=expandRoster(a).filter(s=>s.id!=='macro').map(s=>s.id==='crawlers'?{...s,retinueTo:'unrelated'}:s);
  // The original body/support survive and keep their already-selected effect;
  // neither the moved retinue nor the other Immortals unit receives it.
  expect(followups(a,live)).toMatchObject([{units:['body']}]);
 });

 it('does not turn an originally illegal retinue join into a qualifying selected formation',()=>{
  const a=army(macro(),{id:'body',unit:'Immortals'},
   {id:'crawlers',unit:'Canoptek Tomb Crawlers',retinueTo:'body'});
  expect(followups(a,expandRoster(a).filter(s=>s.id!=='macro'))).toEqual([]);
 });

 it('requires an originally equipped valid source and a surviving original recipient',()=>{
  const unarmed=army({id:'macro',unit:'Canoptek Macrocytes'},{id:'recipient',unit:'Canoptek Wraiths'});
  expect(followups(unarmed,[{id:'recipient',unit:'Canoptek Wraiths'}])).toEqual([]);
  const invalidSource=army({...macro(),attachedTo:'recipient'},{id:'recipient',unit:'Canoptek Wraiths'});
  expect(followups(invalidSource,[{id:'recipient',unit:'Canoptek Wraiths'}])).toEqual([]);
  expect(followups(joined(),[])).toEqual([]);
  expect(followups(army(),[{id:'new',unit:'Canoptek Wraiths'}])).toEqual([]);
 });
});
