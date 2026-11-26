import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026,eligibleUpgrades2026} from '../src/upgrades-2026';
import {individualArmy,expandRoster,setInstanceAttachment} from '../src/roster-instances';
const army=(detachment:string,...units:string[])=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:[detachment]});
const r=generate11thReminders;
const find=(a:ReturnType<typeof army>,name:string)=>r(a).filter(x=>x.title.includes(name));
const unitId=(a:ReturnType<typeof army>,name:string)=>expandRoster(a).find(s=>s.unit===name)!.id;
describe('Awakened Dynasty 11e',()=>{
 it('emits all six stratagems and uses the actual led formation',()=>{
  let a=army('Awakened Dynasty','Overlord','Immortals','Necron Warriors');
  const leader=unitId(a,'Overlord'),body=unitId(a,'Immortals');
  a=setInstanceAttachment(a,leader,null);
  expect(find(a,'Command Protocols')).toHaveLength(0);
  a=setInstanceAttachment(a,leader,body);
  expect(find(a,'Command Protocols').map(x=>x.units)).toEqual([[body],[body]]);
  for(const name of ['Eternal Revenant','Undying Legions','Hungry Void','Sudden Storm','Conquering Tyrant','Vengeful Stars'])expect(find(a,name).length).toBeGreaterThan(0);
  expect(find(a,'Conquering Tyrant')[0].summary).toContain('half range');
  expect(find(a,'Undying Legions').map(x=>x.window)).toEqual(['Shooting','Fight']);
  expect(find(a,'Eternal Revenant').every(x=>x.units?.includes(leader))).toBe(true);
 });
 it('preserves Veil errata and excludes epic heroes',()=>{
  let a=army('Awakened Dynasty','Overlord','Imotekh the Stormlord','Immortals');
  const id=unitId(a,'Overlord');
  expect(eligibleUpgrades2026(a,'Imotekh the Stormlord')).toHaveLength(0);
  expect(eligibleUpgrades2026(a,'Overlord')).toHaveLength(4);
  a=selectUpgrade2026(a,id,'Veil of Darkness');
  expect(find(a,'Veil of Darkness').map(x=>x.window)).toEqual(['End of opponent turn','Movement']);
  expect(find(a,'Veil of Darkness')[1].summary).toContain('first turn');
  expect(find({...a,detachments2026:[]},'Veil of Darkness')).toHaveLength(0);
 });
 it('does not grant character-only stratagems to a bodyguard-only roster',()=>{
  const a=army('Awakened Dynasty','Immortals');
  expect(find(a,'Eternal Revenant')).toHaveLength(0);
  expect(find(a,'Vengeful Stars')).toHaveLength(0);
  expect(find(a,'Undying Legions')).toHaveLength(2);
 });
});
describe('Annihilation Legion 11e',()=>{
 it('includes six stratagems and errata AP, but restricts AP to Destroyer Cult',()=>{
  const a=army('Annihilation Legion','Lokhust Destroyers','Flayed Ones','Immortals');
  for(const name of ['Masks of Death','The Spoor of Frailty','Murderous Reanimation','Pitiless Hunters','Blood-fuelled Cruelty','Insanity’s Ire'])expect(find(a,name).length).toBeGreaterThan(0);
  expect(find(a,'Annihilation Protocol').find(x=>x.window==='Shooting')?.units).toEqual([unitId(a,'Lokhust Destroyers')]);
  expect(find(a,'Annihilation Protocol').find(x=>x.window==='Charge')?.units).toEqual([unitId(a,'Lokhust Destroyers'),unitId(a,'Flayed Ones')]);
  expect(find(a,'Insanity’s Ire')[0].summary).toContain('unengaged');
  expect(find(army('Annihilation Legion','Immortals'),'Masks of Death')).toHaveLength(0);
 });
 it('restricts Destroyer-specific enhancements and honors selected bearer',()=>{
  const a=army('Annihilation Legion','Overlord','Skorpekh Lord','Skorpekh Destroyers');
  expect(eligibleUpgrades2026(a,'Overlord').map(x=>x.name)).toEqual(['Eternal Madness','Ingrained Superiority']);
  expect(eligibleUpgrades2026(a,'Skorpekh Lord')).toHaveLength(4);
  const id=unitId(a,'Skorpekh Lord');
  expect(find(selectUpgrade2026(a,id,'Soulless Reaper'),'Soulless Reaper')[0].window).toBe('Movement');
  expect(()=>selectUpgrade2026(a,unitId(a,'Overlord'),'Eldritch Nightmare')).toThrow();
  expect(find(selectUpgrade2026(a,id,'Eldritch Nightmare'),'Eldritch Nightmare')[0].timing).toBe('start');
 });
});
describe('Obeisance Phalanx 11e',()=>{
 it('includes six stratagems and separates Noble, Lychguard and Triarch selectors',()=>{
  let a=army('Obeisance Phalanx','Overlord','Immortals','Lychguard','Triarch Stalker','Monolith');
  const lord=unitId(a,'Overlord'),body=unitId(a,'Immortals');
  a=setInstanceAttachment(a,lord,body);
  for(const name of ['Your Time Is Nigh','Enslaved Artifice','Nanoassembly Protocols','Sentinels of Eternity','Suffer No Rival','Territorial Obsession'])expect(find(a,name).length).toBeGreaterThan(0);
  expect(find(a,'Worthy Foes')[0].units).toContain(body);
  expect(find(a,'Worthy Foes')[0].units).toContain(unitId(a,'Triarch Stalker'));
  expect(find(a,'Enslaved Artifice')[0].units).not.toContain(unitId(a,'Monolith'));
  expect(find(a,'Sentinels of Eternity')[0].units).toEqual([unitId(a,'Lychguard')]);
  expect(find(a,'Territorial Obsession')[0].summary).toContain('+3 OC');
  expect(find(a,'Territorial Obsession')[0].units).not.toContain(body);
 });
 it('permits only Overlords to take the four enhancements',()=>{
  const a=army('Obeisance Phalanx','Overlord','Overlord with translocation shroud','Catacomb Command Barge','Technomancer');
  expect(eligibleUpgrades2026(a,'Overlord')).toHaveLength(4);
  expect(eligibleUpgrades2026(a,'Overlord with translocation shroud')).toHaveLength(4);
  expect(eligibleUpgrades2026(a,'Catacomb Command Barge')).toHaveLength(0);
  expect(eligibleUpgrades2026(a,'Technomancer')).toHaveLength(0);
  const id=unitId(a,'Overlord');
  expect(find(selectUpgrade2026(a,id,'Unflinching Will'),'Unflinching Will')[0].summary).toContain('Anti-Infantry 5+');
  expect(find(selectUpgrade2026(a,id,'Eternal Conqueror'),'Eternal Conqueror').map(x=>x.window)).toEqual(['Shooting','Fight']);
 });
 it('handles ordinary and Titanic units without granting ineligible bonuses',()=>{
  const a=army('Obeisance Phalanx','Monolith');
  expect(find(a,'Enslaved Artifice')).toHaveLength(0);
  expect(find(a,'Worthy Foes')).toHaveLength(0);
  expect(find(a,'Nanoassembly Protocols')).toHaveLength(2);
 });
});
