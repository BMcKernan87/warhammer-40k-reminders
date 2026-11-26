// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {TYRANID_SHEETS} from '../src/tyranid-data';
import {generate11thReminders} from '../src/reminders-11th';
import {tyranidIntrinsicReminders} from '../src/tyranid-intrinsic';
import {tyranidDetachmentReminders} from '../src/tyranid-detachments';

// Publisher Tyranids v1.3: physical PDF p19 replaces Chameleonic with
// unit Stealth; p20 replaces Foul Spores with the unrestricted Tyranids aura.
// https://assets.warhammer-community.com/eng_14-10_wh40k_faction_pack_tyranids-an12izciwp-np2hnkcsje.pdf
// Core 05.03/19.04/24.33: personal saves, original formation/source lifetimes,
// and Stealth's Benefit of Cover apply to the relevant attack, not just Overwatch.
// Core 15.08–15.09: Overwatch remains at enemy Movement end; snap shots cannot
// receive Hit modifiers, but their Wound modifiers and defensive saves apply.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Astra Militarum v1.3 p24 Servo-sentry permits own-Movement arrival shooting.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24
// Complete November 23 reproduced 11e native cards and enhancement clauses:
// https://wahapedia.ru/wh40k11ed/factions/tyranids/datasheets.html
// https://wahapedia.ru/wh40k11ed/factions/tyranids/
const id=(unit:string,n=1)=>unit+'#'+n;
function army(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Tyranids'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1),models:TYRANID_SHEETS.find(s=>s.unit===unit)?.sizes[0]}))};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const upgrade=(a:ArmySelection,bearer:string,name:string)=>({...a,upgrades2026:{[id(bearer)]:name}});
const named=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.title===title);
const intrinsic=(a:ArmySelection,title:string,roster:readonly RosterInstance[]=a.instances!)=>tyranidIntrinsicReminders(a,roster).filter(r=>r.title===title);
const enhanced=(a:ArmySelection,title:string,roster:readonly RosterInstance[]=a.instances!)=>tyranidDetachmentReminders(a,roster).filter(r=>r.title.endsWith(' · '+title));

describe('Tyranid native defenses during attacks outside Shooting',()=>{
 it.each([
  ['Venomthropes','Foul Spores',false],
  ['Zoanthropes','Warp Field',true],
  ['Tyrannofex','Resilient Organism',true],
  ['Maleceptor','Encephalic Diffusion',true],
  ['Neurolictor','Psychological Saboteur · Enemy attacks',true],
 ] as const)('%s keeps %s in both players’ Movement and Shooting windows',(unit,title,melee)=>{
  const a=army([],unit,'Termagants'),rows=named(a,title);
  expect(rows.filter(r=>r.window==='Movement').map(r=>[r.turn,r.timing]).sort()).toEqual([['opponent','during'],['own','during']]);
  expect(rows.filter(r=>r.window==='Shooting').map(r=>r.turn).sort()).toEqual(['opponent','own']);
  expect(rows.some(r=>r.window==='Fight')).toBe(melee);
  expect(rows.some(r=>r.window==='Command'||r.window==='Charge')).toBe(false);
  expect(rows.every(r=>r.units?.includes(id(unit)))).toBe(true);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 });

 it.each([
  ['Venomthropes','Foul Spores'],['Zoanthropes','Warp Field'],
  ['Tyrannofex','Resilient Organism'],['Maleceptor','Encephalic Diffusion'],
 ] as const)('preserves the existing own-Movement checkmark for %s / %s',(unit,title)=>{
  const rows=named(army([],unit),title),own=rows.find(r=>r.window==='Movement'&&r.turn==='own')!;
  expect(own.id).toBe('11e-tyranid-native:'+id(unit)+':'+title+':Movement:own:end');
  expect(own.timing).toBe('during');
  expect(rows.find(r=>r.window==='Movement'&&r.turn==='opponent')?.id).toBe('11e-tyranid-native:'+id(unit)+':'+title+':Movement:opponent:during');
 });

 it('uses the actual attack type for Maleceptor modifiers in the whole Movement phase',()=>{
  const rows=named(army([],'Maleceptor'),'Encephalic Diffusion').filter(r=>r.window==='Movement');
  const own=rows.find(r=>r.turn==='own')!;
  expect(own.summary).toMatch(/within 6″.*subtract 1 from attack Hit rolls.*normal arrival or reaction shooting/);
  expect(own.summary).toMatch(/Below Half-strength.*subtract 1 from its Wound rolls/);
  expect(own.summary).toMatch(/Snap shots retain the conditional Wound modifier.*fixed Hit rolls are unchanged/);
  expect(rows.every(r=>r.summary.includes('Measure from this source model'))).toBe(true);
  expect(named(army([],'Neurolictor'),'Psychological Saboteur · Enemy attacks').every(r=>r.summary.includes('Battle-shocked enemy unit within 12″')&&r.summary.includes('does not alter fixed snap-shot Hit rolls'))).toBe(true);
 });

 it.each([['Venomthropes','Foul Spores'],['Zoanthropes','Warp Field'],['Maleceptor','Encephalic Diffusion'],['Neurolictor','Psychological Saboteur · Enemy attacks']] as const)('expires the %s aura when its real source is gone',(unit,title)=>{
  const a=army([],unit,'Termagants');
  expect(intrinsic(a,title,a.instances!.filter(s=>s.unit!==unit))).toEqual([]);
  expect(intrinsic(a,title).every(r=>r.summary.includes('within'))).toBe(true);
 });

 it.each([
  ['Venomthropes','Foul Spores'],['Zoanthropes','Warp Field'],['Tyrannofex','Resilient Organism'],
  ['Maleceptor','Encephalic Diffusion'],['Neurolictor','Psychological Saboteur · Enemy attacks'],
 ] as const)('rejects dead, duplicated or replaced sources for %s / %s',(unit,title)=>{
  const a=army([],unit,'Termagants'),source=a.instances![0];
  for(const models of [0,-1,0.5,Infinity,NaN])expect(intrinsic(a,title,[{...source,models},a.instances![1]])).toEqual([]);
  expect(intrinsic(a,title,[...a.instances!,source])).toEqual([]);
  expect(intrinsic(a,title,[{...source,keepUnattached:true},a.instances![1]])).toEqual([]);
  expect(intrinsic(a,title,[{...source,attachedTo:id('Termagants')},a.instances![1]])).toEqual([]);
  expect(intrinsic(a,title,[...a.instances!,{unit:'Hive Tyrant',id:'undeclared',models:1,attachedTo:source.id}])).toEqual([]);
 });

 it('keeps Tyrannofex damage cancellation personal, optional and once per battle across all windows',()=>{
  const a=army([],'Tyrannofex','Tyrannofex','Termagants'),rows=named(a,'Resilient Organism');
  expect(rows).toHaveLength(10);
  for(const row of rows){
   expect(row.units).toHaveLength(1);
   expect(row.summary).toMatch(/Once per battle, after an attack is allocated.*may change.*Damage characteristic to 0/);
   expect(row.summary).toContain('does not prevent wounds that were not caused by an allocated attack');
  }
  expect(rows.filter(r=>r.units?.includes(id('Tyrannofex')))).toHaveLength(5);
  expect(rows.filter(r=>r.units?.includes(id('Tyrannofex',2)))).toHaveLength(5);
  expect(intrinsic(a,'Resilient Organism',a.instances!.filter(s=>s.id!==id('Tyrannofex'))).every(r=>r.units?.join()===id('Tyrannofex',2))).toBe(true);
 });

 it('keeps Foul Spores ranged-only and Warp Field conditional on eligible models in range',()=>{
  const a=join(army([],'Venomthropes','Zoanthropes','Hive Tyrant','Tyrant Guard','Tyrannofex'),'Hive Tyrant','Tyrant Guard');
  const spores=named(a,'Foul Spores');
  expect(spores.every(r=>r.summary.includes('within 6″')&&r.summary.includes('Stealth, granting the Benefit of Cover'))).toBe(true);
  expect(spores.every(r=>r.units?.includes(id('Hive Tyrant'))&&r.units?.includes(id('Tyrannofex')))).toBe(true);
  expect(spores.some(r=>r.window==='Fight')).toBe(false);
  expect(named(a,'Warp Field').every(r=>r.summary.includes('attack is allocated to an eligible model')&&r.summary.includes('does not replace a better available save'))).toBe(true);
 });

 it('keeps Overwatch and phase-locked attack activations at their printed windows',()=>{
  const a=army([],'Hive Guard','Exocrine','Venomthropes');
  expect(named(a,'Defensive Stance')).toMatchObject([{window:'Movement',turn:'opponent',timing:'end'}]);
  expect(named(a,'Symbiotic Targeting')).toMatchObject([{window:'Shooting',turn:'own',timing:'during'}]);
  expect(named(a,'Fire Overwatch · 1CP')).toMatchObject([{window:'Movement',turn:'opponent',timing:'end'}]);
 });
});

describe('Tyranid defensive enhancements and formation lifetimes',()=>{
 it.each([
  ['Crusher Stampede','Hive Tyrant','Null Nodules','000008404004',true],
  ['Synaptic Nexus','Neurotyrant','Synaptic Control','000008421004',true],
  ['Talons of the Norn Queen','Norn Assimilator','Synaptoprescience','000010940003',true],
  ['Ambush Predators','Von Ryan’s Leapers','Cryptophotaic Camouflage','000010936003',false],
  ['Unending Swarm','Hive Tyrant','Naturalised Camouflage','000008408003',false],
 ] as const)('%s / %s uses the same %s protection during both Movement turns',(det,bearer,title,rule,melee)=>{
  const a=upgrade(army([det],bearer,'Termagants'),bearer,title),rows=enhanced(a,title);
  const movement=rows.filter(r=>r.window==='Movement');
  expect(movement.map(r=>[r.turn,r.timing]).sort()).toEqual([['opponent','during'],['own','during']]);
  expect(movement.find(r=>r.turn==='own')?.id).toBe('11e-tyranid-det-'+rule+'-'+id(bearer)+'-Movement-own-end');
  expect(movement.find(r=>r.turn==='opponent')?.id).toBe('11e-tyranid-det-'+rule+'-'+id(bearer)+'-Movement-opponent-during');
  expect(rows.some(r=>r.window==='Fight')).toBe(melee);
  expect(rows.some(r=>r.window==='Shooting'&&r.turn==='either')).toBe(true);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 });

 it.each([['Synaptic Nexus','Synaptic Augmentation','Neurotyrant'],['Warrior Bioform Onslaught','Leader-beasts','Winged Tyranid Prime']] as const)('retains both Movement defense windows for %s / %s',(det,title,unit)=>{
  const rows=named(army([det],unit,'Gargoyles'),title);
  expect(rows.filter(r=>r.window==='Movement').map(r=>[r.turn,r.timing]).sort()).toEqual([['opponent','during'],['own','during']]);
  expect(rows.find(r=>r.window==='Movement'&&r.turn==='own')?.id).toMatch(/Movement-own-end$/);
  if(title==='Synaptic Augmentation')expect(rows.every(r=>r.summary.includes('If this round’s active imperative')&&r.summary.includes('only while the formation is within Synapse Range'))).toBe(true);
  else expect(rows.every(r=>!r.units?.includes(id('Gargoyles'))&&r.summary.includes('Other models in their attached formation do not inherit'))).toBe(true);
 });

 it('uses current Chameleonic Stealth cover on only the bearer’s actual original formation',()=>{
  const a=upgrade(join(army(['Vanguard Onslaught'],'Broodlord','Genestealers','Genestealers'),'Broodlord','Genestealers'),'Broodlord','Chameleonic');
  const rows=enhanced(a,'Chameleonic');
  expect(rows).toHaveLength(3);
  expect(rows.map(r=>[r.window,r.turn,r.timing])).toEqual([['Movement','own','during'],['Movement','opponent','during'],['Shooting','either','during']]);
  expect(rows.find(r=>r.window==='Shooting')?.id).toBe('11e-tyranid-det-000008417003-Broodlord#1-Shooting-either-during');
  expect(rows.every(r=>r.units?.join()===id('Genestealers')&&r.summary.includes('Stealth and receives the Benefit of Cover')&&r.summary.includes('snap shooting'))).toBe(true);
  expect(rows.some(r=>/−1 to Hit|fixed Hit requirement/.test(r.summary))).toBe(false);
  expect(rows.every(r=>r.source.endsWith('eng_14-10_wh40k_faction_pack_tyranids-an12izciwp-np2hnkcsje.pdf'))).toBe(true);
  const alone=a.instances!.filter(s=>s.unit==='Broodlord');
  expect(enhanced(a,'Chameleonic',alone).every(r=>r.units?.join()===id('Broodlord'))).toBe(true);
  expect(enhanced(a,'Chameleonic',a.instances!.filter(s=>s.unit!=='Broodlord'))).toEqual([]);
 });

 it('rejects new identities, new attachments and originally illegal formations for a personal defensive enhancement',()=>{
  const a=upgrade(join(army(['Vanguard Onslaught'],'Broodlord','Genestealers','Genestealers'),'Broodlord','Genestealers'),'Broodlord','Chameleonic');
  expect(enhanced(a,'Chameleonic',a.instances!.map(s=>s.unit==='Broodlord'?{...s,unit:'Winged Tyranid Prime'}:s))).toEqual([]);
  expect(enhanced(a,'Chameleonic',a.instances!.map(s=>s.unit==='Broodlord'?{...s,attachedTo:id('Genestealers',2)}:s))).toEqual([]);
  const invalid=upgrade(join(army(['Vanguard Onslaught'],'Broodlord','Termagants'),'Broodlord','Termagants'),'Broodlord','Chameleonic');
  expect(enhanced(invalid,'Chameleonic',invalid.instances!.filter(s=>s.unit==='Broodlord'))).toEqual([]);
 });

 it('rejects zero-model, duplicate, undeclared and explicitly unlinked Chameleonic sources',()=>{
  const a=upgrade(join(army(['Vanguard Onslaught'],'Broodlord','Genestealers'),'Broodlord','Genestealers'),'Broodlord','Chameleonic');
  const bearer=a.instances![0];
  for(const models of [0,-1,0.5,Infinity,NaN])expect(enhanced(a,'Chameleonic',a.instances!.map(s=>s.id===bearer.id?{...s,models}:s))).toEqual([]);
  expect(enhanced(a,'Chameleonic',[...a.instances!,bearer])).toEqual([]);
  expect(enhanced(a,'Chameleonic',a.instances!.map(s=>s.id===bearer.id?{...s,keepUnattached:true}:s))).toEqual([]);
  expect(enhanced(a,'Chameleonic',[...a.instances!,{unit:'Hive Tyrant',id:'undeclared',models:1,attachedTo:id('Genestealers')}])).toEqual([]);
  expect(enhanced(a,'Chameleonic',[...a.instances!,{unit:'Hive Tyrant',id:'undeclared',models:1,retinueTo:id('Genestealers')}])).toEqual([]);
  const deadBody=a.instances!.map(s=>s.unit==='Genestealers'?{...s,models:0}:s);
  expect(enhanced(a,'Chameleonic',deadBody).every(r=>r.units?.join()===id('Broodlord'))).toBe(true);
  expect(enhanced(a,'Chameleonic',deadBody)).toHaveLength(3);
 });

 it('keeps actual Character damage protection off its bodyguard and duplicate squads',()=>{
  const a=upgrade(join(army(['Synaptic Nexus'],'Neurotyrant','Neurogaunts','Neurogaunts'),'Neurotyrant','Neurogaunts'),'Neurotyrant','Synaptic Control');
  const rows=enhanced(a,'Synaptic Control');
  expect(rows.every(r=>r.units?.join()===id('Neurotyrant'))).toBe(true);
  expect(rows.every(r=>r.summary.includes('attacks allocated to that model')&&r.summary.includes('Other models in its formation do not gain'))).toBe(true);
  expect(enhanced(a,'Synaptic Control',a.instances!.filter(s=>s.unit!=='Neurotyrant'))).toEqual([]);
 });

 it('retains Perfectly Adapted’s one shared re-roll without adding a snap-shot Hit re-roll',()=>{
  const a=upgrade(army(['Invasion Fleet'],'Neurotyrant'),'Neurotyrant','Perfectly Adapted'),rows=enhanced(a,'Perfectly Adapted');
  const incoming=rows.find(r=>r.window==='Movement'&&r.turn==='opponent'&&r.timing==='during')!;
  expect(incoming.summary).toMatch(/For a saving throw.*one shared choice for that turn, not one re-roll of each type/);
  const snap=rows.find(r=>r.window==='Movement'&&r.turn==='opponent'&&r.timing==='end')!;
  expect(snap.summary).toContain('snap shooting cannot re-roll Hit rolls');
  expect(incoming.id).not.toBe(snap.id);
  expect(rows.find(r=>r.id.endsWith('Movement-own-end'))).toMatchObject({timing:'during',summary:expect.stringContaining('saving throw during permitted enemy arrival or reaction shooting')});
 });

 it.each([false,true])('keeps first-round selected camouflage on surviving original recipients after bodyguard loss (bearer dead: %s)',dead=>{
  const a=upgrade(join(army(['Unending Swarm'],'Hive Tyrant','Winged Tyranid Prime','Gargoyles'),'Winged Tyranid Prime','Gargoyles'),'Hive Tyrant','Naturalised Camouflage');
  const active=a.instances!.filter(s=>s.unit!=='Gargoyles'&&(!dead||s.unit!=='Hive Tyrant'));
  const rows=enhanced(a,'Naturalised Camouflage',active);
  expect(rows).toHaveLength(3);
  expect(rows.every(r=>r.units?.join()===id('Winged Tyranid Prime'))).toBe(true);
  expect(rows.every(r=>/selected.*round 1/i.test(r.summary)&&r.summary.includes('Benefit of Cover'))).toBe(true);
  expect(rows.every(r=>r.summary.includes('Endless Multitude models')&&r.summary.includes('destroyed'))).toBe(true);
  expect(rows.some(r=>r.window==='Start of battle round')).toBe(false);
  expect(rows.filter(r=>r.window==='Movement').map(r=>[r.turn,r.timing]).sort()).toEqual([['opponent','during'],['own','during']]);
 });

 it('does not lend previously selected camouflage to changed or newly joined recipients',()=>{
  const a=upgrade(join(army(['Unending Swarm'],'Hive Tyrant','Winged Tyranid Prime','Gargoyles'),'Winged Tyranid Prime','Gargoyles'),'Hive Tyrant','Naturalised Camouflage');
  expect(enhanced(a,'Naturalised Camouflage',[{unit:'Termagants',id:id('Gargoyles'),models:10}])).toEqual([]);
  expect(enhanced(a,'Naturalised Camouflage',[{unit:'Termagants',id:'new-unit',models:10}])).toEqual([]);
  const originalPrime=a.instances!.find(s=>s.unit==='Winged Tyranid Prime')!;
  expect(enhanced(a,'Naturalised Camouflage',[{...originalPrime,attachedTo:'new-unit'},{unit:'Gargoyles',id:'new-unit',models:10}])).toEqual([]);
  const invalid=upgrade(join(army(['Unending Swarm'],'Hive Tyrant','Winged Tyranid Prime','Termagants'),'Winged Tyranid Prime','Termagants'),'Hive Tyrant','Naturalised Camouflage');
  expect(enhanced(invalid,'Naturalised Camouflage',invalid.instances!.filter(s=>s.unit==='Winged Tyranid Prime'))).toEqual([]);
  const survivingPrime=a.instances!.filter(s=>s.unit==='Winged Tyranid Prime');
  expect(enhanced(a,'Naturalised Camouflage',[...survivingPrime,...survivingPrime])).toEqual([]);
  expect(enhanced(a,'Naturalised Camouflage',survivingPrime.map(s=>({...s,keepUnattached:true})))).toEqual([]);
  expect(enhanced(a,'Naturalised Camouflage',[...survivingPrime,{unit:'Hive Tyrant',id:'undeclared',models:1,attachedTo:id('Gargoyles')}])).toEqual([]);
 });

 it('requires the selected legal upgrade and keeps unchanged rules in their own phase',()=>{
  const a=army(['Vanguard Onslaught'],'Broodlord','Genestealers');
  expect(enhanced(a,'Chameleonic')).toEqual([]);
  expect(enhanced(upgrade({...a,detachments2026:['Invasion Fleet']},'Broodlord','Chameleonic'),'Chameleonic')).toEqual([]);
  const nexus=army(['Synaptic Nexus'],'Neurotyrant','Termagants');
  expect(tyranidDetachmentReminders(nexus).filter(r=>r.sourceRuleId==='000008556005').map(r=>r.window)).toEqual(['Shooting','Fight']);
 });
});
