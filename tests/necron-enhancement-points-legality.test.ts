import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment,autoAttachUnambiguousInstances} from '../src/roster-instances';
import {UPGRADES_2026,selectUpgrade2026,availableUpgrades2026,validateUpgrades2026,upgradeError2026} from '../src/upgrades-2026';
import {rosterCost2026} from '../src/datasheets-2026';
import {NECRON_ENHANCEMENT_POINTS,REPEATABLE_NECRON_UPGRADES,PANTHEON_BINDINGS} from '../src/necron-enhancement-points';
import {detachmentBudget} from '../src/edition-2026';
import {generate11thReminders} from '../src/reminders-11th';
const army=(detachments:string[],...units:string[])=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:detachments});
const id=(a:ReturnType<typeof army>,u:string)=>expandRoster(a).find(s=>s.unit===u)!.id;
describe('11e enhancement points and limits',()=>{
 it('prices every selectable enhancement exactly once per instance, and every binding',()=>{
  expect([...new Set(UPGRADES_2026.map(u=>u.name))].sort()).toEqual(Object.keys(NECRON_ENHANCEMENT_POINTS).sort());
  expect(Object.keys(NECRON_ENHANCEMENT_POINTS)).toHaveLength(38);
  expect(REPEATABLE_NECRON_UPGRADES.size).toBe(5);
  for(const upgrade of UPGRADES_2026){
   const a=army([upgrade.detachment],upgrade.unit);
   const b=selectUpgrade2026(a,id(a,upgrade.unit),upgrade.name);
   expect(rosterCost2026(b).total).toBe(rosterCost2026(a).total!+NECRON_ENHANCEMENT_POINTS[upgrade.name]);
  }
 });
 it('charges all copies of a repeatable Upgrade, but allows only three',()=>{
  const a=army(['Hand of the Dynasty'],'Immortals','Immortals','Immortals','Immortals');
  const squads=expandRoster(a);
  let b={...a,battleSize2026:'Incursion' as const};
  for(const s of squads.slice(0,3))b=selectUpgrade2026(b,s.id,'Tools of Dominion') as typeof b;
  expect(validateUpgrades2026(b)).toBe(true);
  expect(rosterCost2026(b).total).toBe(rosterCost2026(a).total!+45);
  expect(()=>selectUpgrade2026(b,squads[3].id,'Tools of Dominion')).toThrow(/copies/);
  expect(availableUpgrades2026(b,squads[3])).toEqual([]);
  expect(availableUpgrades2026(b,squads[0]).map(x=>x.name)).toContain('Tools of Dominion');
 });
 it('ordinary enhancements cannot repeat, including in imported legacy-key rosters',()=>{
  const a=army(['Awakened Dynasty'],'Overlord','Overlord');
  const [first,second]=expandRoster(a);
  const b=selectUpgrade2026(a,first.id,'Veil of Darkness');
  expect(()=>selectUpgrade2026(b,second.id,'Veil of Darkness')).toThrow(/copies/);
  expect(availableUpgrades2026(b,second).some(u=>u.name==='Veil of Darkness')).toBe(false);
  expect(validateUpgrades2026({...a,upgrades2026:{Overlord:'Veil of Darkness'}})).toBe(false);
 });
 it('enforces two distinct enhancements at Incursion and four at Strike Force',()=>{
  const a=army(['Awakened Dynasty'],'Overlord','Royal Warden','Technomancer','Chronomancer','Plasmancer');
  const units=expandRoster(a);
  let b={...a,battleSize2026:'Incursion' as const};
  b=selectUpgrade2026(b,units[0].id,'Veil of Darkness') as typeof b;
  b=selectUpgrade2026(b,units[1].id,'Nether-realm Casket') as typeof b;
  expect(()=>selectUpgrade2026(b,units[2].id,'Phasal Subjugator')).toThrow(/limit/);
  let c=selectUpgrade2026({...b,battleSize2026:'Strike Force'},units[2].id,'Phasal Subjugator');
  c=selectUpgrade2026(c,units[3].id,'Enaegic Dermal Bond');
  expect(validateUpgrades2026(c)).toBe(true);
  expect(validateUpgrades2026({...c,battleSize2026:'Incursion'})).toBe(false);
 });
 it('forbids two enhancements on one formation regardless of edit order',()=>{
  const a=army(['Hand of the Dynasty','Cryptek Conclave'],'Immortals','Technomancer');
  const leader=id(a,'Technomancer'),body=id(a,'Immortals');
  const b=selectUpgrade2026(selectUpgrade2026(a,body,'Tools of Dominion'),leader,'Quantum Abacus');
  expect(()=>setInstanceAttachment(b,leader,body)).toThrow(/formation/);
  expect(expandRoster(autoAttachUnambiguousInstances(b)).find(s=>s.id===leader)?.attachedTo).toBeUndefined();
  const c=setInstanceAttachment(selectUpgrade2026(a,body,'Tools of Dominion'),leader,body);
  expect(()=>selectUpgrade2026(c,leader,'Quantum Abacus')).toThrow(/formation/);
  expect(validateUpgrades2026({...c,upgrades2026:{[body]:'Tools of Dominion',[leader]:'Quantum Abacus'}})).toBe(false);
 });
 it('automatically charges every mandatory Pantheon binding including later copies and removes cost on detachment change',()=>{
  const units=Object.keys(PANTHEON_BINDINGS);
  const a=army(['Pantheon of Woe'],...units,'Transcendent C’tan');
  const b={...a,detachments2026:[]};
  expect(rosterCost2026(a).total).toBe(rosterCost2026(b).total!+45+45+35+40+40);
  expect(rosterCost2026(a).entries.map(e=>e.bindingPoints)).toEqual([45,45,35,40,40]);
  expect(rosterCost2026(b).entries.every(e=>!e.bindingPoints)).toBe(true);
  const c={...a,detachments2026:['Pantheon of Woe','The Phaeron\'s Armoury']};
  expect(()=>selectUpgrade2026(c,id(c,'Transcendent C’tan'),'Prelocational Optimiser')).toThrow(/binding/i);
 });
 it('checks imported wrong bearer, absent unit, unknown pricing and explicit malformed inputs',()=>{
  const a=army(['Awakened Dynasty'],'Immortals');
  expect(validateUpgrades2026({...a,upgrades2026:{[id(a,'Immortals')]:'Veil of Darkness'}})).toBe(false);
  expect(validateUpgrades2026({...a,upgrades2026:{absent:'Veil of Darkness'}})).toBe(false);
  expect(rosterCost2026({...a,upgrades2026:{[id(a,'Immortals')]:'Unknown'}}).total).toBeNull();
  expect(upgradeError2026({...a,upgrades2026:[] as never})).toMatch(/Invalid/);
 });
 it('keeps newly eligible bearers and their reminders aligned',()=>{
  const a=army(['Starshatter Arsenal'],'Overlord with translocation shroud','Transcendent C’tan');
  const b=selectUpgrade2026(a,id(a,'Overlord with translocation shroud'),'Dread Majesty');
  expect(generate11thReminders(b).some(r=>r.title.includes('Dread Majesty'))).toBe(true);
  const c=selectUpgrade2026(b,id(b,'Transcendent C’tan'),'Miniaturised Nebuloscope');
  expect(generate11thReminders(c).some(r=>r.title.includes('Miniaturised Nebuloscope'))).toBe(true);
 });
 it('enforces current unique tags and Necron Incursion exception',()=>{
  expect(detachmentBudget('Necrons',['Hypercrypt Legion',"The Phaeron's Armoury"],'Strike Force').valid).toBe(false);
  expect(detachmentBudget('Necrons',['Hypercrypt Legion','Hand of the Dynasty'],'Strike Force').valid).toBe(true);
  expect(detachmentBudget('Necrons',['Awakened Dynasty'],'Incursion').valid).toBe(true);
  expect(detachmentBudget('Necrons',['Awakened Dynasty','Hand of the Dynasty'],'Strike Force').valid).toBe(false);
  expect(detachmentBudget('Necrons',['Awakened Dynasty'],'Strike Force').dispositions).toEqual(['Take and Hold','Priority Assets']);
  expect(detachmentBudget('Necrons',['Starshatter Arsenal'],'Strike Force').dispositions).toEqual(['Priority Assets','Purge the Foe']);
  expect(detachmentBudget('Necrons',['Pantheon of Woe'],'Strike Force').dispositions).toEqual(['Disruption']);
 });
});
