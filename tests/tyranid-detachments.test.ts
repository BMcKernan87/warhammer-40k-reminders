import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {TYRANID_SHEETS} from '../src/tyranid-data';
import {TYRANID_DETACHMENTS,TYRANID_STRATAGEMS,TYRANID_TRAITS,TYRANID_UPGRADES} from '../src/tyranid-detachments.generated';
import {currentTyranidDetachment,eligibleTyranidUpgrades,tyranidHasDeepStrike,tyranidSelectedDetachments} from '../src/tyranid-detachment-data';
import {tyranidDetachmentReminders} from '../src/tyranid-detachments';
import {tyranidLoadout} from '../src/tyranid-loadouts';
import {tyranidKeywords} from '../src/tyranid-keywords';
import {tyranidFormations} from '../src/tyranid-transports';

const invasion='Invasion Fleet',crusher='Crusher Stampede',unending='Unending Swarm',assimilation='Assimilation Swarm',vanguard='Vanguard Onslaught',nexus='Synaptic Nexus',warrior='Warrior Bioform Onslaught',subterranean='Subterranean Assault',ambush='Ambush Predators',talons='Talons of the Norn Queen';
const hive='Hive Tyrant',guard='Tyrant Guard',neuro='Neurotyrant',brood='Broodlord',genes='Genestealers',prime='Winged Tyranid Prime',lash='Tyranid Prime with Lash Whip';
const meleeWarriors='Tyranid Warriors With Melee Bio-weapons',rangedWarriors='Tyranid Warriors With Ranged Bio-weapons',hyper='Hyperadapted Raveners';
const all=TYRANID_SHEETS.map(s=>s.unit);
const id=(unit:string,n=1)=>unit+'#'+n;
function force(dets:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Tyranids'),detachments2026:dets,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1),models:TYRANID_SHEETS.find(s=>s.unit===unit)?.sizes[0]}))};
}
const edit=(a:ArmySelection,u:string,changes:Partial<RosterInstance>,n=1)=>({...a,instances:a.instances!.map(s=>s.id===id(u,n)?{...s,...changes}:s)});
const join=(a:ArmySelection,u:string,body:string)=>edit(a,u,{attachedTo:id(body)});
const equip=(a:ArmySelection,u:string,name:string)=>({...a,upgrades2026:{...a.upgrades2026,[id(u)]:name}});
const rows=(a:ArmySelection,roster:readonly RosterInstance[]=a.instances!)=>tyranidDetachmentReminders(a,roster);
const by=(a:ArmySelection,r:string)=>rows(a).filter(s=>s.sourceRuleId===r);
const named=(a:ArmySelection,t:string)=>rows(a).filter(s=>s.title===t);
const windows=(a:ArmySelection,r:string)=>by(a,r).map(s=>[s.window,s.turn,s.timing]);

describe('current Tyranid detachment source and execution',()=>{
 it('reconciles the complete current inventory and the two3DP dual dispositions',()=>{
  expect(TYRANID_DETACHMENTS).toHaveLength(10);expect(TYRANID_STRATAGEMS).toHaveLength(51);expect(TYRANID_UPGRADES).toHaveLength(34);expect(TYRANID_TRAITS).toHaveLength(10);
  expect(TYRANID_DETACHMENTS.find(d=>d.name===invasion)).toMatchObject({dp:3,disposition:'Take and Hold',additionalDispositions:['Priority Assets']});
  expect(TYRANID_DETACHMENTS.find(d=>d.name===subterranean)).toMatchObject({dp:3,disposition:'Disruption',additionalDispositions:['Reconnaissance']});
  expect(TYRANID_UPGRADES.filter(u=>u.repeatable).map(u=>u.name)).toEqual(['Encircling Horrors','Destabilising Predation','Cryptophotaic Camouflage','Synaptoprescience']);
  expect([...TYRANID_STRATAGEMS,...TYRANID_UPGRADES,...TYRANID_TRAITS].every(r=>/^[0-9a-f]{64}$/.test(r.sourceHash))).toBe(true);
  const a=force(TYRANID_DETACHMENTS.map(d=>d.name),...all);
  for(const rule of [...TYRANID_STRATAGEMS,...TYRANID_TRAITS])expect(by(a,rule.id).length,rule.name).toBeGreaterThan(0);
  expect(new Set(rows(a).map(r=>r.id)).size).toBe(rows(a).length);
 });
 it.each(TYRANID_UPGRADES)('executes the source-backed $name enhancement or upgrade',u=>{
  let a=force([u.detachment],...all),bearer=u.name==='Power of the Hive Mind'?neuro:u.name==='Vanguard Intellect'?prime:u.name==='Regenerating Monstrosity'?brood:u.units[0];
  if(bearer==='Trygon')a=edit(a,bearer,{characterPromotion:true});
  a=equip(a,bearer,u.name);
  expect(eligibleTyranidUpgrades(a,bearer,id(bearer)).some(x=>x.name===u.name)).toBe(true);
  expect(by(a,u.id).length).toBeGreaterThan(0);
  expect(new Set(rows(a).map(r=>r.id)).size).toBe(rows(a).length);
 });
 it('does not emit unselected, foreign, Legends or nonexistent-unit content',()=>{
  expect(rows(force([],hive,'Termagants'))).toEqual([]);
  expect(rows({...force([invasion],hive),faction:'Necrons'})).toEqual([]);
  expect(rows(force([invasion,crusher,subterranean],'Malanthrope','Dimachaeron','Barbed Hierodule','Scythed Hierodule','Sky-slasher Swarms','Imaginary Tyrant'))).toEqual([]);
  expect(eligibleTyranidUpgrades(force([invasion],'Termagants'),'Termagants')).toEqual([]);
  expect(currentTyranidDetachment('Talons Of The Norn Queen')).toBe(talons);
  expect(tyranidSelectedDetachments(force(['talons of the norn queen',talons]))).toEqual([talons]);
 });
 it('preserves phase ownership, reaction timing and abbreviated-rule expiry',()=>{
  const a=force(TYRANID_DETACHMENTS.map(d=>d.name),...all);
  for(const r of ['000008349002','000008422002','000008409004','000008413005','000008556005','000009738002'])expect(windows(a,r)).toEqual([['Shooting','opponent','during'],['Fight','either','during']]);
  for(const r of ['000008409005','000008418002','000008556004'])expect(windows(a,r)).toEqual([['Shooting','own','during'],['Fight','either','during']]);
  for(const r of ['000008413004','000008556003','000010148002'])expect(windows(a,r)).toEqual([['Command','either','during']]);
  for(const r of ['000008418007','000010148007','000010937004'])expect(windows(a,r)).toEqual([['Fight','opponent','end']]);
  expect(windows(a,'000008413007')).toEqual([['Fight','own','during']]);
  expect(windows(a,'000010937003')).toEqual([['Shooting','own','start']]);
  expect(by(a,'000010937003')[0].summary).toContain('until this Shooting phase ends');
  expect(by(a,'000010941002')).toHaveLength(5);expect(by(a,'000010941002')[0].summary).toContain('until the current phase ends');
  expect(by(a,'000010148004')[0].summary).toContain('until the end of your next Fight phase');
  expect(by(a,'000010941004')[0].summary).toContain('until your next Command phase starts');
 });
 it('does not grant Critical Hit benefits or Hit rerolls to snap shooting',()=>{
  const a=force([invasion,subterranean],hive,'Termagants','Spore Mines');
  expect(named(a,'Hyper-adaptations').every(r=>r.window!=='Movement')).toBe(true);
  expect(named(a,'Surprise Assault').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Fight','either']]);
  expect(named(a,'Hyper-adaptations').find(r=>r.window==='Fight')?.units).not.toContain(id('Spore Mines'));
  expect(named(a,'Hyper-adaptations')[0].summary).toMatch(/Critical Hit benefits.*snap shooting/);
 });
 it('separates Monster models attack bonuses from Monster-unit objective control',()=>{
  const a=join(force([crusher],hive,guard,'Termagants'),hive,guard);
  expect(tyranidFormations(a).find(f=>f.root.unit===guard)?.members.map(m=>m.unit)).toEqual([guard,hive]);
  expect(named(a,'Enraged Behemoths')[0].units).toEqual([id(guard)]);
  expect(named(a,'Enraged Behemoths')[0].summary).toMatch(/Only TYRANIDS MONSTER models.*Non-Monster models.*do not inherit/);
  expect(named(a,'Enraged Behemoths · objective control')[0].summary).toMatch(/all models.*including attached non-Monster/);
  expect(named(force([crusher],'Exocrine'),'Enraged Behemoths · snap shooting')[0].summary).toMatch(/retain \+1 to Wound.*ignores the Hit modifier/);
 });
 it('targets actual charging or dying Monster models rather than attached Infantry',()=>{
  const a=join(force([crusher],hive,guard,'Winged Hive Tyrant','Exocrine'),hive,guard);
  expect(by(a,'000008422007')[0].units).toContain(id(hive));expect(by(a,'000008422007')[0].units).not.toContain(id(guard));
  expect(by(a,'000008422002')[0].units).not.toContain(id('Winged Hive Tyrant'));
  expect(by(a,'000008422002')[0].units).toContain(id('Exocrine'));
  expect(by(a,'000008422002')[0].summary).toMatch(/actual destroyed model.*not every model/);
 });
 it('keeps current Unending surge requirements and Goading separate from Normal reactive moves',()=>{
  const a=force([unending],hive,'Termagants','Hormagaunts','Gargoyles','Neurogaunts');
  expect(windows(a,'000008409002')).toEqual([['Shooting','opponent','during']]);
  expect(named(a,'Insurmountable Odds')[0].summary).toMatch(/destroyed a model.*unengaged.*not Battle-shocked.*not have moved/);
  expect(by(a,'000008409002')[0].summary).toMatch(/does not itself grant a surge/);
  expect(by(force([unending],'Termagants'),'000008409002')).toEqual([]);
 });
 it('uses whole Endless formations for replacement and does not restore attached Characters',()=>{
  const a=join(force([unending],prime,'Gargoyles'),prime,'Gargoyles');
  expect(by(a,'000008409003')[0].units).toEqual([id('Gargoyles')]);
  expect(by(a,'000008409003')[0].summary).toMatch(/Once per battle.*Destroyed attached Characters are not returned.*last model that started the battle/);
 });
 it('uses current Feed healing, excludes destroyed recipients and does not invent a flat4 Harvester heal',()=>{
  const a=force([assimilation],hive,'Pyrovores','Termagants');
  expect(named(a,'Feed the Swarm')[0].summary).toMatch(/within 6″.*D3\+1.*one destroyed Infantry model other than a Character.*up to three/);
  expect(by(a,'000008413007')[0].summary).toContain('D3+1');expect(by(a,'000008413007')[0].summary).not.toMatch(/up to 4|four wounds/);
  expect(by(a,'000008413003')[0].summary).toContain('destroyed formation cannot receive');
  expect(by(force([assimilation],'Pyrovores'),'000008413003')).toEqual([]);
  expect(by(a,'000008413002')[0].summary).toMatch(/including snap shooting.*last model that started/);
 });
 it('filters Vanguard Infantry and unit-wide effects on actual attached formations',()=>{
  const a=join(force([vanguard],prime,'Gargoyles',hive,guard,'Lictor','Harpy'),prime,'Gargoyles');
  expect(by(a,'000008418003')[0].units).toContain(id('Gargoyles'));
  expect(by(a,'000008418003')[0].units).not.toContain(id(hive));
  expect(by(a,'000008418005')[0].summary).toContain('within 8″');expect(by(a,'000008418005')[0].units).not.toContain(id('Harpy'));
  expect(by(a,'000008418006')[0].summary).toMatch(/within 18″.*within 6″ if it has Lone Operative/);
 });
 it('limits Reinforced Hive Node to one attacker and requires actual Synapse actors',()=>{
  const a=join(force([nexus],neuro,'Neurogaunts','Termagants'),neuro,'Neurogaunts');
  expect(by(a,'000008556005')[0].units).toEqual([id('Neurogaunts')]);
  expect(by(a,'000008556005')[0].summary).toMatch(/until that attacking unit finishes.*does not last for the whole phase/);
  expect(by(a,'000008556002')[0].units).not.toContain(id('Termagants'));
  expect(rows(a,a.instances!.filter(s=>s.unit!==neuro)).some(r=>r.sourceRuleId==='000008556002')).toBe(false);
  expect(rows(a,a.instances!.filter(s=>s.unit!==neuro)).some(r=>r.title==='Synaptic Imperatives')).toBe(true);
 });
 it('allows a gunless Synapse source for Irresistible Will when another formation can shoot',()=>{
  expect(by(force([nexus],'Neurolictor'),'000008556004').map(r=>r.window)).toEqual(['Fight']);
  const a=force([nexus],'Neurolictor','Termagants');
  expect(by(a,'000008556004').find(r=>r.window==='Shooting')?.units).toEqual([id('Neurolictor')]);
  expect(by(a,'000008556004')[0].summary).toContain(id('Termagants'));
 });
 it('keeps Warrior and Prime model saves distinct from other attached Bodyguards',()=>{
  const a=join(force([warrior],prime,'Gargoyles',meleeWarriors,rangedWarriors),prime,'Gargoyles');
  expect(named(a,'Leader-beasts')[0].units).toContain(id(prime));expect(named(a,'Leader-beasts')[0].units).not.toContain(id('Gargoyles'));
  expect(named(a,'Leader-beasts')[0].summary).toContain('Other models in their attached formation do not inherit');
  expect(by(a,'000009738004')[0].units).toEqual([id(rangedWarriors)]);
 });
 it('honours the singular/plural keyword equivalence for both Ravener Tunnel sources',()=>{
  const a=force([subterranean],'Raveners',hyper,'Mawloc','Trygon','The Red Terror','Termagants');
  expect(named(a,'Surprise Assault · Tunnel Markers')[0].units).toEqual([id('Raveners'),id(hyper),id('Mawloc'),id('Trygon'),id('The Red Terror')]);
  expect(named(a,'Surprise Assault · tunnel arrival')[0].units).toContain(id('Termagants'));
  expect(named(a,'Surprise Assault · tunnel arrival')[0].summary).toMatch(/wholly within 9″.*more than 6″.*not Deep Strike.*does not trigger Mawloc/);
  expect(by(a,'000010148007')[0].summary).toContain('up to two unengaged Burrower');
 });
 it('retains existing Tunnel Markers after their Burrower source dies',()=>{
  const a=force([subterranean],'Trygon','Termagants'),survivors=a.instances!.filter(s=>s.unit!=='Trygon');
  expect(rows(a,survivors).some(r=>r.title==='Surprise Assault · Tunnel Markers')).toBe(false);
  expect(rows(a,survivors).find(r=>r.title==='Surprise Assault · tunnel arrival')?.units).toEqual([id('Termagants')]);
  expect(rows(a,survivors).some(r=>r.sourceRuleId==='000010148003')).toBe(true);
 });
 it('separates Ambush Deep Strike grants, Character hunting and gunless detection sources',()=>{
  const a=force([ambush],'Deathleaper','Lictor','Neurolictor','Von Ryan’s Leapers');
  expect(named(a,'Mindhunger · Deep Strike')[0].units).toEqual([id('Deathleaper'),id('Lictor'),id('Neurolictor')]);
  expect(named(a,'Mindhunger')[0].units).toEqual([id('Lictor'),id('Neurolictor')]);
  expect(by(a,'000010937003')[0].units).toHaveLength(4);expect(by(a,'000010937003')[0].summary).toContain('need not have a ranged weapon');
  expect(tyranidHasDeepStrike(a,a.instances![1])).toBe(true);expect(tyranidHasDeepStrike(a,a.instances![3])).toBe(false);
 });
 it('keeps Norn retargeting once per unit and distinguishes both Norn upgrades',()=>{
  const a=equip(equip(force([talons],'Norn Emissary','Norn Assimilator'),'Norn Emissary','Destabilising Predation'),'Norn Assimilator','Synaptoprescience');
  expect(named(a,'Protean Purpose')[0].summary).toMatch(/Once per battle per Norn.*replaces the old one/);
  expect(by(a,'000010940002').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Movement','opponent']]);
  expect(by(a,'000010940002')[0].units).toEqual([id('Norn Emissary')]);
  expect(by(a,'000010940003')[0].units).toEqual([id('Norn Assimilator')]);
 });
 it('requires current Character promotion and grants all four Subterranean Trygon options',()=>{
  const a=force([subterranean],'Trygon');expect(eligibleTyranidUpgrades(a,'Trygon',id('Trygon'))).toEqual([]);
  const b=edit(a,'Trygon',{characterPromotion:true});expect(eligibleTyranidUpgrades(b,'Trygon',id('Trygon')).map(x=>x.name)).toEqual(['Synaptic Strategy','Tremor Senses','Vanguard Intellect','Trygon Prime']);
  const c=equip(b,'Trygon','Trygon Prime');expect(tyranidKeywords(c,c.instances![0]).has('SYNAPSE')).toBe(true);
  expect(by(c,'000010147005')[0].summary).toContain('Character promotion remains a separate muster choice');
 });
 it('corrects broad CSV links for Monster exclusions and actual Deep Strike',()=>{
  const a=force([assimilation,subterranean],hive,brood,prime);
  expect(eligibleTyranidUpgrades(a,hive,id(hive)).some(u=>u.name==='Regenerating Monstrosity')).toBe(false);
  expect(eligibleTyranidUpgrades(a,brood,id(brood)).some(u=>u.name==='Regenerating Monstrosity')).toBe(true);
  expect(eligibleTyranidUpgrades(a,brood,id(brood)).some(u=>u.name==='Vanguard Intellect')).toBe(false);
  expect(eligibleTyranidUpgrades(a,prime,id(prime)).some(u=>u.name==='Vanguard Intellect')).toBe(true);
 });
 it('does not give Deep Strike to a Prime’s non-Deep-Strike Bodyguards or enable early opponent ingress',()=>{
  const a=equip(join(force([subterranean],prime,meleeWarriors),prime,meleeWarriors),prime,'Vanguard Intellect');
  expect(by(a,'000010147004').map(r=>r.window)).toEqual(['Pre-battle']);
  const b=equip(force([subterranean],prime),prime,'Vanguard Intellect');
  expect(by(b,'000010147004').map(r=>[r.window,r.turn])).toEqual([['Pre-battle','either'],['Movement','own']]);
  expect(by(b,'000010147004')[1].summary).toContain('does not enable first-round Rapid Ingress');
 });
 it('keeps personal Ravener Prime effects off ordinary Ravener models',()=>{
  const a=equip(force([nexus],hyper),hyper,'Synaptic Control');
  expect(by(a,'000008421004')[0].summary).toMatch(/Only the surviving Character bearer \(Ravener Prime\).*Other models.*do not gain/);
  let b=equip(force([vanguard],hyper),hyper,'Stalker');
  const field=tyranidLoadout(hyper)!.slots.find(s=>s.choices.some(c=>c.items.includes('Venom bolt')))!;
  b=edit(b,hyper,{knightGear:{[field.name]:field.choices.find(c=>c.items.includes('Venom bolt'))!.name}});
  expect(by(b,'000008417004').find(r=>r.window==='Fight')?.summary).toContain('Ravener Prime');
  expect(by(b,'000008417004').some(r=>r.window==='Movement'||r.window==='Shooting')).toBe(false);
 });
 it('requires actual Psychic weapons for Power of the Hive Mind',()=>{
  expect(by(equip(force([nexus],brood),brood,'Power of the Hive Mind'),'000008421002')).toEqual([]);
  const a=equip(force([nexus],neuro),neuro,'Power of the Hive Mind');
  expect(by(a,'000008421002').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Movement','opponent']]);
  expect(by(a,'000008421002')[0].summary).toContain('Non-Psychic weapons and Bodyguard weapons receive no bonus');
 });
 it('uses a single once-per-turn Perfectly Adapted choice and no snap Hit rerolls',()=>{
  const a=equip(force([invasion],neuro),neuro,'Perfectly Adapted');
  expect(by(a,'000008348003')[0].summary).toContain('one shared choice');
  expect(by(a,'000008348003').find(r=>r.window==='Movement'&&r.turn==='opponent'&&r.timing==='end')?.summary).toContain('snap shooting cannot re-roll Hit rolls');
 });
 it('keeps Adaptive Biology permanent after triggering and applies it only to its bearer',()=>{
  const a=equip(join(force([invasion],hive,guard),hive,guard),hive,'Adaptive Biology');
  expect(by(a,'000008348005').some(r=>r.window==='Command'&&r.timing==='start')).toBe(true);
  expect(by(a,'000008348005')[0].summary).toMatch(/permanently improves to 4\+.*even if later healed.*Other models receive no benefit/);
  expect(by(a,'000008348005').every(r=>JSON.stringify(r.units)===JSON.stringify([id(hive)]))).toBe(true);
 });
 it('requires living Harvester proximity for Instinctive Defence and uses the current discount',()=>{
  expect(by(equip(force([assimilation],brood),brood,'Instinctive Defence'),'000008412003')).toEqual([]);
  const a=equip(join(force([assimilation],brood,genes,'Pyrovores'),brood,genes),brood,'Instinctive Defence');
  expect(by(a,'000008412003').map(r=>[r.window,r.turn,r.timing])).toEqual([['Charge','opponent','end'],['Fight','either','during']]);
  expect(by(a,'000008412003')[0].summary).toMatch(/bearer itself.*within 6″.*Fights First.*costs 1CP less/);
  expect(rows(a,a.instances!.filter(s=>s.unit!=='Pyrovores')).some(r=>r.sourceRuleId==='000008412003')).toBe(false);
 });
 it('does not invent a Parasitic kill bonus when the army has no Harvester source',()=>{
  const a=equip(join(force([assimilation],brood,genes),brood,genes),brood,'Parasitic Biomorphology');
  expect(by(a,'000008412005')[0].summary).toContain('+1 Strength');expect(by(a,'000008412005')[0].summary).not.toContain('+1 melee Attack');
 });
 it('retains only earned Parasitic Attacks after bearer death, not ongoing Strength',()=>{
  const a=equip(join(force([assimilation],brood,genes,'Pyrovores'),brood,genes),brood,'Parasitic Biomorphology');
  const r=rows(a,a.instances!.filter(s=>s.unit!==brood)).find(r=>r.sourceRuleId==='000008412005')!;
  expect(r.units).toEqual([id(genes)]);expect(r.summary).toMatch(/If this formation earned.*retains that Attack bonus.*ongoing \+1 Strength benefit has ended/);
 });
 it('retains selected first-round camouflage after bearer death and avoids accidental fall-through',()=>{
  const a=equip(force([unending],hive,'Termagants'),hive,'Naturalised Camouflage');
  expect(rows(a,a.instances!.filter(s=>s.unit!==hive)).find(r=>r.sourceRuleId==='000008408003')?.summary).toMatch(/If selected.*until that round ends.*bearer has been destroyed/);
  expect(by(equip(force([unending],hive),hive,'Naturalised Camouflage'),'000008408003')).toEqual([]);
 });
 it('keeps personal ranges on real Character sources and current Psychostatic denial precedence',()=>{
  const a=equip(force([nexus],hyper),hyper,'Psychostatic Disruption');
  expect(by(a,'000008421003')[0].summary).toMatch(/within 12″.*round 1 or 2.*on 4\+.*overrides a required arrival.*actual bearer/);
  const b=equip(force([vanguard],hyper),hyper,'Hunting Grounds');
  expect(by(b,'000008417002')[0].summary).toMatch(/on a 2\+.*repositioned enemy.*does not explicitly place/);
 });
});
