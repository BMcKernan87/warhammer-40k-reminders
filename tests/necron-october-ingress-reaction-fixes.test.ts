import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {DATASHEETS_2026} from '../src/datasheets-2026';
import {detachmentBudget} from '../src/edition-2026';
const army=(detachment:string,...units:string[])=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:[detachment]});
const named=(a:ReturnType<typeof army>,name:string)=>generate11thReminders(a).filter(r=>r.title.includes(name));
describe('October 11e source discrepancies',()=>{
 it('permits an ordinary Strategic Reserves ingress for Cosmic Precision, not just Hyperphasing',()=>{
  const a=army('Hypercrypt Legion','Immortals','C’tan Shard of the Void Dragon');
  const r=named(a,'Cosmic Precision')[0];
  expect(r.units).toEqual(['Immortals#1']);
  expect(r.summary).toContain('ordinary Strategic Reserves');
  expect(r.summary).toContain('cannot charge');
  expect(r.summary).toContain('large-model');
 });
 it('does not imply that a modified snap-shooting threshold permits critical hits or rerolls',()=>{
  const a=army('Awakened Dynasty','Hexmark Destroyer','Canoptek Doomstalker');
  const core=named(a,'Fire Overwatch · 1CP')[0];
  expect(core.summary).toContain('not critical hits');
  expect(core.summary).toContain('Hit rolls cannot be re-rolled');
  const hex=named(a,'Inescapable Death').find(r=>!r.title.includes('free Overwatch'))!;
  expect(hex.summary).toContain('not critical hits');
  expect(hex.summary).toContain('Hit rolls cannot be re-rolled');
  expect(named(a,'Inescapable Death · free Overwatch')[0].summary).toContain('across your army');
  expect(named(a,'Multi-threat Eliminator')[0].summary).toContain('one eligible Hexmark');
 });
 it('adds a conditional cue for an eligible temporarily Cryptek formation without granting it the keyword unconditionally',()=>{
  let a=army('Cryptek Conclave','Technomancer','Immortals','Necron Warriors','Doomsday Ark','C’tan Shard of the Void Dragon');
  a=setInstanceAttachment(a,'Technomancer#1','Immortals#1');
  const r=named(a,'temporary Cryptek keyword')[0];
  expect(r.units).toEqual(['Necron Warriors#1']);
  expect(r.summary).toContain('Only if');
  expect(r.summary).toContain('effect ends this phase');
  expect(named(army('Cryptek Conclave','Necron Warriors'),'temporary Cryptek keyword')).toHaveLength(0);
  expect(named({...a,detachments2026:['Awakened Dynasty']},'temporary Cryptek keyword')).toHaveLength(0);
 });
});
// Independent October 2 and September 30 change log cross-check, not full MFM certification.
// https://praetorium.gg/data-updates/necrons
describe('October changed-points regression',()=>{
 it('retains corroborated latest costs instead of reverting to cached summer data',()=>{
  const expected:Record<string,Record<number,number>>={'Annihilation Barge':{1:100},'Canoptek Doomstalker':{1:130},'Canoptek Tomb Crawlers':{2:60},'Doomsday Ark':{1:200},'Immortals':{5:65,10:130},'Lokhust Destroyers':{6:190},'Nekrosor Ammentar':{1:195},'Psychomancer':{1:65},'Trazyn the Infinite':{1:60}};
  for(const [unit,prices] of Object.entries(expected)){
   const row=DATASHEETS_2026.find(d=>d.faction==='Necrons'&&d.unit===unit)!;
   for(const [size,price] of Object.entries(prices))expect(row.pointsBySize?.[Number(size)],unit).toBe(price);
  }
  const lokhust=DATASHEETS_2026.find(d=>d.unit==='Lokhust Destroyers')!;
  expect(lokhust.laterCopyPointsBySize?.[3]?.[6]).toBe(220);
  expect(detachmentBudget('Necrons',['Canoptek Court'],'Strike Force').spent).toBe(2);
 });
});
