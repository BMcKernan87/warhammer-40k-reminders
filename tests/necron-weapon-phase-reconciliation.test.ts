import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment,setInstanceModelCount,setInstanceEquipment,setInstanceWeaponCounts,setInstanceWargear} from '../src/roster-instances';
import {selectWarlord} from '../src/necron-muster-legality';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterCost2026} from '../src/datasheets-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders,grouped11thReminders} from '../src/reminders-11th';
const army=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const id=(a:ReturnType<typeof army>,unit:string)=>expandRoster(a).find(s=>s.unit===unit)!.id;
const named=(a:ReturnType<typeof army>,title:string)=>generate11thReminders(a).filter(r=>r.title.includes(title));
const phases=['Command','Movement','Shooting','Charge','Fight'];
describe('11e source reconciled vehicle and weapon reminders',()=>{
 it('uses only the end of opponent Movement for Fire Overwatch, excluding Titanic weapons',()=>{
  const a=army('Hexmark Destroyer','Canoptek Doomstalker','Seraptek Heavy Construct','Immortals');
  const overwatch=named(a,'Fire Overwatch · 1CP');
  expect(overwatch).toHaveLength(1);
  expect(overwatch[0]).toMatchObject({window:'Movement',timing:'end'});
  expect(overwatch[0].summary).toContain('non-Titanic');
  expect(named(a,'Inescapable Death').every(r=>r.window==='Movement'&&r.timing==='end')).toBe(true);
  expect(named(a,'Sentinel Construct').every(r=>r.window==='Movement'&&r.timing==='end')).toBe(true);
  expect(named(a,'Ranged weapon abilities').filter(r=>r.title.startsWith('Seraptek')).map(r=>r.window)).toEqual(['Shooting']);
  expect(named(a,'Ranged weapon abilities').filter(r=>r.title.startsWith('Immortals')).map(r=>r.window)).toEqual(['Shooting']);
 });
 it('uses source-specific Seraptek and vehicle defenses, damage states and Deadly Demise',()=>{
  const a=army('Seraptek Heavy Construct','Doom Scythe','Annihilation Barge','Canoptek Spyders','Triarch Stalker','Doomsday Ark','Canoptek Doomstalker');
  expect(named(a,'5+ invulnerable save').filter(r=>r.title.startsWith('Seraptek'))).toHaveLength(3);
  expect(named(a,'4+ invulnerable save').filter(r=>r.title.startsWith('Seraptek'))).toHaveLength(0);
  expect(named(a,'Deadly Demise D6+2').map(r=>r.window)).toEqual(phases);
  expect(named(a,'Super-heavy Walker')[0].summary).toContain('Mobile');
  expect(named(a,'Damaged profile · OC').find(r=>r.title.startsWith('Seraptek'))?.summary).toContain('subtract 5');
  expect(named(a,'Damaged profile').find(r=>r.title.startsWith('Doom Scythe'))?.summary).toContain('1–4');
  for(const unit of ['Annihilation Barge','Triarch Stalker','Doomsday Ark','Canoptek Doomstalker'])expect(named(a,'4+ invulnerable save').filter(r=>r.title.startsWith(unit))).toHaveLength(3);
 });
 it('keeps mode alternatives explicit and only includes equipped profiles',()=>{
  let a=army('Triarch Stalker','Geomancer','C’tan Shard of the Nightbringer');
  expect(named(a,'Ranged weapon abilities').find(r=>r.title.startsWith('Triarch Stalker'))?.summary).toContain('Choose one Heat ray profile');
  a=setInstanceEquipment(a,id(a,'Triarch Stalker'),'Particle shredder');
  const summary=named(a,'Ranged weapon abilities').find(r=>r.title.startsWith('Triarch Stalker'))!.summary;
  expect(summary).toContain('Particle shredder');
  expect(summary).not.toContain('Heat ray');
  expect(named(a,'Melee weapon abilities').find(r=>r.title.startsWith('C’tan Shard of the Nightbringer'))?.summary).toContain('strike or sweep');
 });
 it('distinguishes replacement bearers and mixed-weapon counts',()=>{
  let a=army('Canoptek Macrocytes','Canoptek Wraiths');
  const macro=id(a,'Canoptek Macrocytes'),w=id(a,'Canoptek Wraiths');
  a=setInstanceEquipment(a,macro,'Tesla caster');
  a=setInstanceWargear(setInstanceWargear(a,macro,'Accelerator mandible',1),macro,'Atomiser beam and nanoscarab projector',1);
  a=setInstanceWargear(a,w,'Particle caster',2);
  expect(named(a,'Ranged weapon abilities').find(r=>r.title.startsWith('Canoptek Macrocytes'))?.summary).toContain('3 originally equipped models');
  expect(named(a,'Ranged weapon abilities').find(r=>r.title.startsWith('Canoptek Wraiths'))?.summary).toContain('2 originally equipped models');
 });
 it('targets surviving multi-model units for Undying Legions and applies current Cosmic Precision eligibility',()=>{
  const a={...army('Immortals','Plasmancer'),detachments2026:['Awakened Dynasty']};
  const eligible=named(a,'Protocol of the Undying Legions');
  expect(eligible.map(r=>r.window).sort()).toEqual(['Fight','Shooting']);
  for(const rule of eligible)expect(rule.units).toEqual([id(a,'Immortals')]);
  const b={...a,detachments2026:['Hypercrypt Legion']};
  expect(named(b,'Cosmic Precision')[0].summary).toContain('ingress move');
  expect(named(b,'Cosmic Precision')[0].summary).toContain('large-model');
 });
 it('includes the Silent King as Vehicle without falsely making it Titanic',()=>{
  const a={...army('The Silent King'),detachments2026:['Starshatter Arsenal']};
  expect(named(a,'Unyielding Forms')).toHaveLength(2);
  expect(named(a,'Starshatter Arsenal · Relentless Onslaught')).toHaveLength(2);
 });
});
function fullRoster(){
 let a=army('Overlord','Technomancer','Plasmancer','Immortals','Necron Warriors','Canoptek Wraiths','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Doomsday Ark','Lokhust Heavy Destroyers','Canoptek Reanimator','Canoptek Scarab Swarms');
 for(const [unit,size] of [['Immortals',10],['Necron Warriors',20],['Canoptek Wraiths',6],['Lokhust Heavy Destroyers',3]] as const)a=setInstanceModelCount(a,id(a,unit),size);
 a=setInstanceAttachment(a,id(a,'Technomancer'),id(a,'Canoptek Wraiths'));
 a=setInstanceAttachment(a,id(a,'Overlord'),id(a,'Necron Warriors'));
 return selectWarlord(a,id(a,'Overlord'));
}
function checkSheet(a:ReturnType<typeof army>,cost:number){
 expect(validateSelection(a)).toBe(true);
 expect(rosterCost2026(a).total).toBe(cost);
 expect(rosterFindings(a).filter(f=>f.severity==='error')).toEqual([]);
 const r=generate11thReminders(a);
 expect(new Set(r.map(x=>x.id)).size).toBe(r.length);
 expect(grouped11thReminders(a).flatMap(g=>g.reminders)).toHaveLength(r.length);
 expect(r.every(x=>x.source)).toBe(true);
 expect(r.filter(x=>x.title==='Reanimation Protocols · D3 wounds')).toHaveLength(1);
 return r;
}
describe('full Strike Force roster phase sheets against recorded point snapshot',()=>{
 it('generates a 1995-point Awakened Dynasty with three valid attached formations',()=>{
  let a={...fullRoster(),detachments2026:['Awakened Dynasty']};
  a=setInstanceAttachment(a,id(a,'Plasmancer'),id(a,'Immortals')) as typeof a;
  a=selectUpgrade2026(a,id(a,'Overlord'),'Veil of Darkness') as typeof a;
  a=selectUpgrade2026(a,id(a,'Technomancer'),'Nether-realm Casket') as typeof a;
  const r=checkSheet(a,1995);
  expect(r.filter(x=>x.title==='Command Protocols').every(x=>x.units?.length===3)).toBe(true);
  expect(r.some(x=>x.title.includes('Harbinger of Destruction')&&x.units?.includes(id(a,'Immortals')))).toBe(true);
  expect(r.some(x=>x.title.includes('Power Matrix'))).toBe(false);
  expect(r.some(x=>x.title.includes('Nether-realm Casket'))).toBe(true);
 });
 it('generates a 2000-point Canoptek Court plus Hand of the Dynasty with priced Upgrades',()=>{
  let a={...fullRoster(),detachments2026:['Canoptek Court','Hand of the Dynasty']};
  a=setInstanceAttachment(a,id(a,'Plasmancer'),id(a,'Necron Warriors')) as typeof a;
  a=selectUpgrade2026(a,id(a,'Technomancer'),'Hyperphasic Fulcrum') as typeof a;
  a=selectUpgrade2026(a,id(a,'Plasmancer'),'Autodivinator') as typeof a;
  a=selectUpgrade2026(a,id(a,'Immortals'),'Tools of Dominion') as typeof a;
  const r=checkSheet(a,2000);
  expect(r.some(x=>x.title.includes('Power Matrix')&&x.units?.includes(id(a,'Canoptek Wraiths')))).toBe(true);
  expect(r.some(x=>x.title.includes('Hyperphasic Fulcrum')&&x.units?.includes(id(a,'Canoptek Wraiths')))).toBe(true);
  expect(r.some(x=>x.title.includes('Tools of Dominion')&&x.units?.includes(id(a,'Immortals')))).toBe(true);
  expect(r.some(x=>x.title==='Command Protocols')).toBe(false);
 });
});
