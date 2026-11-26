import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment,type RosterInstance} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
import {rosterCost2026} from '../src/datasheets-2026';

const army=(...units:string[])=>({...individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons'))),battleSize2026:'Incursion' as const,detachments2026:['Hand of the Dynasty']});
const declaration=(a:ReturnType<typeof army>)=>generate11thReminders(a).find(r=>r.id==='11e-necron-reserve-declaration');

// Core 20.01/23.01: half the battle-size points, including embarked cargo,
// with actual Aircraft compulsory. The Night Scythe's current errata removes
// Aircraft; Quantum Invader retains its first/second/third own-Movement permission.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// https://wahapedia.ru/wh40k11ed/factions/necrons/Doom-Scythe
// https://wahapedia.ru/wh40k11ed/factions/necrons/Night-Scythe
describe('Necron compulsory reserves and Night Scythe arrival',()=>{
 it('deducts both Doom Scythes and prices a whole attached formation before offering optional reserves',()=>{
  let a=army('Doom Scythe','Doom Scythe','Royal Warden','Immortals','Immortals','Night Scythe');
  a={...setInstanceAttachment(a,'Royal Warden#1','Immortals#1'),battleSize2026:'Incursion',detachments2026:['Hand of the Dynasty']};
  const prices=new Map(rosterCost2026(a).entries.map(e=>[e.id,e.points]));
  expect(prices.get('Doom Scythe#1')).toBe(200);
  expect(prices.get('Doom Scythe#2')).toBe(200);
  expect(prices.get('Royal Warden#1')!+prices.get('Immortals#1')!).toBe(115);
  expect(declaration(a)).toMatchObject({window:'Pre-battle',units:['Immortals#2'],summary:expect.stringContaining('After compulsory Aircraft, 100 points remain')});
  expect(declaration(a)?.summary).toContain('including units embarked in reserved transports');
 });

 it('keeps Night Scythes optional and applies the actual battle-size allowance',()=>{
  const a=army('Doom Scythe','Night Scythe','Immortals');
  expect(declaration(a)).toMatchObject({units:['Night Scythe#1','Immortals#1'],summary:expect.stringContaining('After compulsory Aircraft, 300 points remain')});
  const strike={...a,battleSize2026:'Strike Force' as const};
  expect(generate11thReminders(strike).find(r=>r.id==='11e-necron-reserve-declaration')?.summary).toContain('After compulsory Aircraft, 800 points remain');
  const aircraft=generate11thReminders(a).filter(r=>r.id.startsWith('11e-necron-aircraft-'));
  expect(aircraft).toHaveLength(6);
  expect(aircraft.every(r=>r.units?.join()==='Doom Scythe#1')).toBe(true);
 });

 it('describes Quantum Invader only in its own Movement ingress window and only while its source survives',()=>{
  const a=army('Night Scythe','Night Scythe','Doom Scythe');
  const rows=generate11thReminders(a).filter(r=>r.title.endsWith(' · Quantum Invader'));
  expect(rows).toHaveLength(2);
  for(const [index,row] of rows.entries()){
   expect(row).toMatchObject({window:'Movement',timing:'during',turn:'own',units:['Night Scythe#'+(index+1)],source:'https://wahapedia.ru/wh40k11ed/factions/necrons/Night-Scythe'});
   expect(row.summary).toMatch(/Move Units step.*first, second or third Movement phase.*ingress move.*regardless of mission rules/);
   expect(row.summary).not.toContain('Reinforcements step');
  }
  const surviving=necronDatasheetReminders2026(a,expandRoster(a).filter(s=>s.id!=='Night Scythe#1'));
  expect(surviving.filter(r=>r.title.endsWith(' · Quantum Invader')).map(r=>r.units)).toEqual([['Night Scythe#2']]);
 });
});

describe('Invasion Beams uses the legal surviving passenger formation',()=>{
 const selected=(...instances:RosterInstance[])=>({...newSelection('Necrons'),instances});
 const beams=(a:ReturnType<typeof selected>,roster=expandRoster(a))=>necronDatasheetReminders2026(a,roster).filter(r=>r.title.endsWith(' · Invasion Beams'));

 it('retains an originally attached Support after Bodyguard losses and the end-of-either-Fight conditions',()=>{
  const a=selected({id:'scythe',unit:'Night Scythe'},{id:'body',unit:'Immortals'},
   {id:'tech',unit:'Technomancer',attachedTo:'body'},{id:'other',unit:'Technomancer'});
  expect(beams(a)).toMatchObject([{window:'Fight',timing:'end',units:['body'],summary:expect.stringMatching(/transport is empty.*unengaged.*wholly within 6″/)}]);
  const survivors=expandRoster(a).filter(s=>s.id!=='body');
  expect(beams(a,survivors).map(r=>r.units)).toEqual([['tech']]);
  expect(beams(a,survivors.filter(s=>s.id!=='scythe'))).toEqual([]);
 });

 it('rejects originally illegal attachments and replaced or detached survivors',()=>{
  const illegal=selected({id:'scythe',unit:'Night Scythe'},{id:'tech',unit:'Technomancer',attachedTo:'scythe'});
  expect(beams(illegal)).toEqual([]);
  const a=selected({id:'scythe',unit:'Night Scythe'},{id:'body',unit:'Immortals'},
   {id:'tech',unit:'Technomancer',attachedTo:'body'});
  const survivors=expandRoster(a).filter(s=>s.id!=='body');
  expect(beams(a,survivors.map(s=>s.id==='tech'?{...s,unit:'Overlord'}:s))).toEqual([]);
  expect(beams(a,survivors.map(s=>s.id==='tech'?{...s,attachedTo:undefined}:s))).toEqual([]);
 });

 it('requires a current Infantry member rather than inheriting a destroyed model’s keyword',()=>{
  const a=selected({id:'scythe',unit:'Night Scythe'},{id:'wraiths',unit:'Canoptek Wraiths'},
   {id:'tech',unit:'Technomancer',attachedTo:'wraiths'});
  expect(beams(a).map(r=>r.units)).toEqual([['wraiths']]);
  expect(beams(a,expandRoster(a).filter(s=>s.id!=='tech'))).toEqual([]);
 });
});
