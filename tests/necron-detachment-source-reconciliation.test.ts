import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {setRetinue} from '../src/necron-retinues';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders,eligibleScoutReminders} from '../src/reminders-11th';
const army=(detachment:string,...units:string[])=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:[detachment]});
const id=(a:ReturnType<typeof army>,u:string)=>expandRoster(a).find(s=>s.unit===u)!.id;
const cue=(a:ReturnType<typeof army>,key:string)=>generate11thReminders(a).find(r=>r.id==='11e-necron-'+key);
describe('source-reconciled Necron detachment targets',()=>{
 it('Hand of the Dynasty targets actual Immortals and Warriors formations in both turns',()=>{
  let a=army('Hand of the Dynasty','Immortals','Necron Warriors','Overlord','Canoptek Wraiths');
  a=setInstanceAttachment(a,id(a,'Overlord'),id(a,'Immortals'));
  const i=id(a,'Immortals'),w=id(a,'Necron Warriors');
  expect(cue(a,'hod-dominance')?.units).toEqual([i]);
  expect(cue(a,'hod-dominance')?.summary).toContain('either Command phase');
  for(const name of ['hod-hypermotility','hod-hypermotility-shooting','hod-will','hod-nanosaturation'])expect(cue(a,name)?.units).toEqual([i,w]);
 });
 it('Skyshroud separates reserve declaration from ingress and eligible fallback shooting',()=>{
  let a=army('Skysword Spearhead','Tomb Blades','Lokhust Destroyers','Lokhust Lord','Immortals');
  a=setInstanceAttachment(a,id(a,'Lokhust Lord'),id(a,'Lokhust Destroyers'));
  const t=id(a,'Tomb Blades'),l=id(a,'Lokhust Destroyers');
  expect(cue(a,'skyshroud-deepstrike-prebattle')).toMatchObject({window:'Pre-battle',units:[t]});
  expect(cue(a,'skyshroud-deepstrike')).toMatchObject({window:'Movement',units:[t]});
  expect(cue(a,'skyshroud-ingress')).toMatchObject({window:'Shooting',units:[t]});
  for(const name of ['skyshroud-omnilocked','skyshroud-omnilocked-shooting','skyshroud-swift','skyshroud-evasive'])expect(cue(a,name)?.units).toEqual([t,l]);
 });
 it('Phaeron excludes grounded Titanic constructs and restricts Cosmic Storm',()=>{
  const a=army("The Phaeron's Armoury",'Seraptek Heavy Construct','Monolith','Obelisk','Tesseract Vault','Immortals');
  for(const name of ['phaeron-engines','phaeron-quantum-shoot','phaeron-quantum-fight','phaeron-particle'])expect(cue(a,name)?.units).toEqual([id(a,'Monolith'),id(a,'Obelisk'),id(a,'Tesseract Vault')]);
  expect(cue(a,'phaeron-cosmic')?.units).toEqual([id(a,'Obelisk'),id(a,'Tesseract Vault')]);
  expect(cue(army("The Phaeron's Armoury",'Seraptek Heavy Construct'),'phaeron-engines')).toBeUndefined();
 });
 it('Conclave distinguishes a destroyed Cryptek model from the formation it leads',()=>{
  let a=army('Cryptek Conclave','Immortals','Plasmancer','Canoptek Tomb Crawlers','Lokhust Heavy Destroyers');
  const i=id(a,'Immortals'),p=id(a,'Plasmancer'),t=id(a,'Canoptek Tomb Crawlers');
  a=setRetinue(setInstanceAttachment(a,p,i),t,i);
  expect(cue(a,'cryconclave-augmentations')?.units).toEqual([i]);
  expect(cue(a,'conclave-untapped')?.units).toEqual([i]);
  expect(cue(a,'conclave-animus-shooting')?.units).toEqual([p]);
  expect(cue(a,'conclave-molecular-fight')?.units).toEqual([i,id(a,'Lokhust Heavy Destroyers')]);
  a=selectUpgrade2026(a,p,'Quantum Abacus');
  expect(cue(a,'conclave-abacus-shooting')?.units).toEqual([p,i]);
  expect(generate11thReminders(a).filter(r=>r.title.includes('Microscarab Swarm')).every(r=>r.units?.join(',')===i)).toBe(true);
 });
 it('Cursed Legion recognizes a Destroyer Ankh on the bearer without targeting its attached model separately',()=>{
  let a=army('Cursed Legion','Overlord','Immortals','Skorpekh Destroyers','Doomsday Ark','C’tan Shard of the Nightbringer');
  const o=id(a,'Overlord'),i=id(a,'Immortals'),s=id(a,'Skorpekh Destroyers');
  a=setInstanceAttachment(selectUpgrade2026(a,o,'Destroyer Ankh'),o,i);
  expect(cue(a,'cursed-image-shooting')?.units).toEqual([i,s]);
  expect(cue(a,'cursed-driven-charge')?.units).toEqual([i,s]);
  expect(cue(a,'cursed-methodical-fight')?.units).toEqual([i,s]);
  expect(cue(a,'cursed-mortis-fight')?.units).toEqual([i,s]);
  expect(cue(a,'cursed-ankh-move')?.units).toEqual([o,i]);
  expect(cue(a,'cursed-ankh-fight')?.units).toEqual([o]);
 });
 it('Pantheon targets only Monster models for destruction reactions and only non-Monster formations for Mass',()=>{
  let a=army('Pantheon of Woe','C’tan Shard of the Deceiver','Immortals','Technomancer','Cryptothralls');
  const i=id(a,'Immortals'),m=id(a,'C’tan Shard of the Deceiver');
  a=setRetinue(setInstanceAttachment(a,id(a,'Technomancer'),i),id(a,'Cryptothralls'),i);
  expect(cue(a,'pantheon-cascade-fight')?.units).toEqual([m]);
  expect(cue(a,'pantheon-erosion')?.units).toEqual([m]);
  expect(cue(a,'pantheon-mass-shooting')?.units).toEqual([i]);
  expect(cue(a,'pantheon-entropy-fight')?.units).toEqual([i]);
  const s=generate11thReminders(a).filter(r=>r.title.includes('Singularity Matrix'));
  expect(s).toHaveLength(5);
  expect(s.every(r=>r.summary.includes('that use’s CP cost')&&r.summary.includes('Once per turn'))).toBe(true);
 });
 it('Scouts remains conditional on all models and covers Dedicated Transport deployment',()=>{
  const a=army('Hand of the Dynasty','Necron Warriors','Ghost Ark');
  const b=selectUpgrade2026(a,id(a,'Necron Warriors'),'Enlivened Sentinels');
  expect(eligibleScoutReminders(b)[0].summary).toContain('Dedicated Transport');
 });
});
