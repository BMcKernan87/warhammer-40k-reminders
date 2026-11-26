import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026,eligibleUpgrades2026} from '../src/upgrades-2026';
import {individualArmy,expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {detachmentBudget} from '../src/edition-2026';
const army=(detachment:string,...units:string[])=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:[detachment]});
const reminders=generate11thReminders;
describe('11e Canoptek Court',()=>{
 it('includes all six stratagems with corrected phases and matrix conditions',()=>{
  const a=army('Canoptek Court','Technomancer','Canoptek Wraiths');
  const r=reminders(a);
  for(const name of ['Curse of the Cryptek','Cynosure of Eradication','Solar Pulse','Reactive Subroutines','Countertemporal Shift','Suboptimal Facade'])expect(r.some(x=>x.title.includes(name))).toBe(true);
  expect(r.find(x=>x.title.includes('Reactive Subroutines'))?.summary).toContain('8″');
  expect(r.filter(x=>x.title.includes('Cynosure')).every(x=>x.timing==='start')).toBe(true);
  expect(r.filter(x=>x.title.includes('area control'))).toHaveLength(5);
  expect(detachmentBudget('Necrons',['Canoptek Court'],'Incursion').valid).toBe(true);
 });
 it('includes new Canoptek beasts and excludes constructs-only rules from a solo Cryptek',()=>{
  for(const name of ['Canoptek Macrocytes','Canoptek Tomb Crawlers'])expect(reminders(army('Canoptek Court',name)).some(x=>x.title.includes('Reactive Subroutines'))).toBe(true);
  expect(reminders(army('Canoptek Court','Technomancer')).some(x=>x.title.includes('Reactive Subroutines'))).toBe(false);
  expect(reminders(army('Canoptek Court','Immortals')).some(x=>x.id.startsWith('11e-necron-court-'))).toBe(false);
 });
 it('applies selected enhancements to the actual bearer and formation',()=>{
  let a=army('Canoptek Court','Technomancer','Canoptek Wraiths');
  const leader=expandRoster(a).find(x=>x.unit==='Technomancer')!,body=expandRoster(a).find(x=>x.unit==='Canoptek Wraiths')!;
  expect(eligibleUpgrades2026(a,leader.unit).map(x=>x.name)).toEqual(['Dimensional Sanctum','Hyperphasic Fulcrum','Autodivinator','Metalodermal Tesla Weave']);
  a=selectUpgrade2026(a,leader.id,'Hyperphasic Fulcrum');
  expect(reminders(a).some(x=>x.title.includes('Hyperphasic Fulcrum'))).toBe(false);
  a=setInstanceAttachment(a,leader.id,body.id);
  expect(reminders(a).filter(x=>x.title.includes('Hyperphasic Fulcrum')).map(x=>({window:x.window,units:x.units}))).toEqual([
   {window:'Movement',units:[leader.id,body.id]},
   {window:'Shooting',units:[leader.id,body.id]},
   {window:'Fight',units:[leader.id,body.id]},
  ]);
  expect(reminders(selectUpgrade2026(a,leader.id,'Dimensional Sanctum')).find(x=>x.title.includes('Dimensional Sanctum'))?.window).toBe('Pre-battle');
  expect(()=>selectUpgrade2026(a,body.id,'Autodivinator')).toThrow();
  expect(reminders({...a,detachments2026:[]}).some(x=>x.id.startsWith('11e-necron-court-'))).toBe(false);
 });
});
describe('11e Hypercrypt Legion',()=>{
 it('includes all six stratagems on a qualifying roster and uses corrected ingress condition',()=>{
  const a=army('Hypercrypt Legion','Monolith','Immortals','Overlord');
  const r=reminders(a);
  for(const name of ['Hyperphasic Recall','Quantum Deflection','Reanimation Crypts','Cosmic Precision','Dimensional Corridor','Entropic Damping'])expect(r.some(x=>x.title.includes(name))).toBe(true);
  expect(r.find(x=>x.title.includes('Cosmic Precision'))?.summary).toContain('ingress move');
  expect(r.find(x=>x.title.includes('Cosmic Precision'))?.summary).toContain('6″');
  expect(r.find(x=>x.title.includes('Hyperphasing'))?.summary).toContain('up to 2');
  expect(r.find(x=>x.title.includes('Dimensional Corridor'))?.window).toBe('Charge');
 });
 it('omits Monolith, Vehicle and Titanic reactions without qualifying units, and precision for Monster-only roster',()=>{
  const r=reminders(army('Hypercrypt Legion','Immortals'));
  expect(r.some(x=>/Hyperphasic Recall|Quantum Deflection|Dimensional Corridor|Entropic Damping/.test(x.title))).toBe(false);
  expect(reminders(army('Hypercrypt Legion','C’tan Shard of the Void Dragon')).some(x=>x.title.includes('Cosmic Precision'))).toBe(false);
 });
 it('handles all battle sizes and bearer-specific enhancements without epic heroes',()=>{
  const a=army('Hypercrypt Legion','Overlord','Imotekh the Stormlord','Immortals');
  expect(eligibleUpgrades2026(a,'Imotekh the Stormlord')).toHaveLength(0);
  expect(eligibleUpgrades2026(a,'Overlord')).toHaveLength(4);
  const id=expandRoster(a).find(x=>x.unit==='Overlord')!.id;
  for(const [size,count] of [['Incursion',1],['Strike Force',2]] as const){
   const selected=selectUpgrade2026({...a,battleSize2026:size},id,'Dimensional Overseer');
   expect(reminders(selected).find(x=>x.title.includes('Hyperphasing'))?.summary).toContain('up to '+count);
   expect(reminders(selected).find(x=>x.title.includes('Dimensional Overseer'))?.summary).toContain('to '+(count+1));
  }
  expect(reminders(selectUpgrade2026(a,id,'Arisen Tyrant')).filter(x=>x.title.includes('Arisen Tyrant')).map(x=>x.window)).toEqual(['Shooting','Fight']);
  expect(reminders(selectUpgrade2026(a,id,'Osteoclave Fulcrum')).filter(x=>x.title.includes('Osteoclave Fulcrum')).map(x=>x.window)).toEqual(['Pre-battle','Movement']);
  expect(reminders(selectUpgrade2026(a,id,'Hyperspatial Transfer Node')).find(x=>x.title.includes('Hyperspatial Transfer Node'))?.window).toBe('Movement');
 });
});
