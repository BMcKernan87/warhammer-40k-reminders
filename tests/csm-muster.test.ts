// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {CSM_SHEETS} from '../src/csm-data';
import {CSM_CULT_SHEETS,csmMusterUnits} from '../src/csm-army-data';
import {csmArmyLoadout,csmArmyModelLoadouts,csmArmyWeaponCount} from '../src/csm-army-loadouts';
import {csmKeywords} from '../src/csm-keywords';
import {CSM_MARKS,csmMarkChoices,csmChosenMark} from '../src/csm-muster-data';
import {csmWarlordCandidates,resolvedCsmWarlord,selectCsmWarlord,setCsmMark,csmUnitLimit} from '../src/csm-muster';
import {csmFormations,csmCargoFits,csmCargoFormations} from '../src/csm-transports';
import {individualArmy,setInstanceAttachment,setInstanceModelCount,autoAttachUnambiguousInstances,validateRosterInstances,reconcileInstanceAttachments,removeRosterInstance} from '../src/roster-instances';
import {knightLoadoutFor,setKnightGear} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026,eligibleUpgrades2026} from '../src/upgrades-2026';
import {instanceBodyguards,rosterAttachmentRole,knightJoinedBodyguard} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],detachments=['Veterans of the Long War'],size:ArmySelection['battleSize2026']='Strike Force'){
 let a=individualArmy({...newSelection('Chaos Space Marines'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const squad=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const join=(army:ArmySelection,leader:string,body:string,leaderCopy=1,bodyCopy=1)=>setInstanceAttachment(army,id(leader,leaderCopy),id(body,bodyCopy));
const errors=(army:ArmySelection)=>rosterFindings(army).filter(f=>f.severity==='error').map(f=>f.code);
const cargo=(army:ArmySelection,carrier:string,n=1)=>csmCargoFormations(army,squad(army,carrier,n));
const prince='Heretic Astartes Daemon Prince With Wings',masters='Masters of the Maelstrom';

it.each(CSM_SHEETS.map(s=>[s.unit,s] as const))('%s can be selected, resized and priced at every legal starting strength',(unit,sheet)=>{
 const a=build([unit]);
 for(const models of verifiedUnitSizes2026(a,unit)!){
  const changed=setInstanceModelCount(a,id(unit),models),entry=rosterCost2026(changed).entries[0];
  expect(validateSelection(changed)).toBe(true);
  expect(csmArmyModelLoadouts(squad(changed,unit))).toHaveLength(models);
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('preserves actual equipment and Accursed compositions through the editor resize mutation',()=>{
 let a=setInstanceModelCount(build(['Accursed Cultists','Forgefiend','Forgefiend','Forgefiend']),id('Accursed Cultists'),11);
 a=setKnightGear(a,id('Accursed Cultists'),'Composition','6 Torments + 5 Mutants');
 a=setInstanceModelCount(a,id('Accursed Cultists'),16);
 expect(csmArmyWeaponCount(squad(a,'Accursed Cultists'),'Hideous mutations')).toBe(6);
 a=setInstanceModelCount(a,id('Accursed Cultists'),10);
 expect(csmArmyWeaponCount(squad(a,'Accursed Cultists'),'Hideous mutations')).toBe(5);
 for(const field of csmArmyLoadout('Forgefiend')!.slots){
  const choice=field.choices.find(c=>c.items.includes('Ectoplasma cannon'))!;
  a=setKnightGear(a,id('Forgefiend',3),field.name,choice.name);
 }
 const costs=rosterCost2026(a).entries;
 expect(costs.find(e=>e.id===id('Forgefiend'))).toMatchObject({points:155});
 expect(costs.find(e=>e.id===id('Forgefiend',3))).toMatchObject({points:180,basePoints:165,wargearPoints:15});
 expect(validateSelection(a)).toBe(true);
});
it('replaces all four Cult faction keywords while retaining native compositions, models and current costs',()=>{
 const a=build(CSM_CULT_SHEETS.map(s=>s.unit));
 for(const sheet of CSM_CULT_SHEETS){
  const s=squad(a,sheet.unit),tags=csmKeywords(a,s);
  expect(tags).toContain('HERETIC ASTARTES');
  for(const tag of ['WORLD EATERS','THOUSAND SONS','DEATH GUARD','EMPEROR’S CHILDREN'])expect(tags).not.toContain(tag);
  expect(csmMarkChoices(a,s)).toEqual([]);expect(csmChosenMark(a,s)).toBeDefined();
  for(const models of verifiedUnitSizes2026(a,s.unit)!){
   const changed=setInstanceModelCount(a,s.id,models),updated=squad(changed,s.unit);
   expect(validateSelection(changed)).toBe(true);expect(csmArmyModelLoadouts(updated)).toHaveLength(models);
   expect(rosterCost2026(changed).entries.find(e=>e.id===s.id)?.points).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
  }
 }
 expect(csmKeywords(a,squad(a,'Rubric Marines'),'Aspiring Sorcerer')).toContain('PSYKER');
 expect(csmKeywords(a,squad(a,'Rubric Marines'),'Rubric Marine')).not.toContain('PSYKER');
 expect(errors({...a,battleSize2026:'Incursion'})).toContain('cults-of-dark-gods-allowance');
 const renegade={...a,detachments2026:['Renegade Warband']};
 for(const sheet of CSM_CULT_SHEETS)expect(csmMusterUnits(renegade)).not.toContain(sheet.unit);
 expect(errors(renegade)).toContain('csm-ineligible');
});
it('requires a chosen Prince god and Pactbound mark without making an unfinished editor state unreadable',()=>{
 let a=build(['Chaos Lord','Sorcerer','Dark Commune',prince,'Abaddon The Despoiler','Plague Marines'],['Pactbound Zealots']);
 expect(validateSelection(a)).toBe(true);expect(errors(a)).toContain('csm-allegiance-required');
 expect(csmMarkChoices(a,squad(a,'Chaos Lord'))).toEqual(CSM_MARKS);
 for(const unit of ['Sorcerer','Dark Commune'])expect(csmMarkChoices(a,squad(a,unit))).not.toContain('Khorne');
 expect(csmMarkChoices(a,squad(a,prince))).toEqual(['Khorne','Tzeentch','Nurgle','Slaanesh']);
 expect(csmMarkChoices(a,squad(a,'Abaddon The Despoiler'))).toEqual([]);
 expect(csmChosenMark(a,squad(a,'Abaddon The Despoiler'))).toBe('Chaos Undivided');
 expect(()=>setCsmMark(a,id('Sorcerer'),'Khorne')).toThrow();
 expect(()=>setCsmMark(a,id(prince),'Chaos Undivided')).toThrow();
 expect(()=>setCsmMark(a,id('Plague Marines'),'Tzeentch')).toThrow();
 a=setCsmMark(a,id(prince),'Khorne');
 expect(csmKeywords(a,squad(a,prince))).toContain('KHORNE');expect(csmKeywords(a,squad(a,prince))).not.toContain('PSYKER');
 expect(validateRosterInstances({...a,instances:a.instances!.map(s=>s.unit==='Sorcerer'?{...s,csmMark:'Khorne'}:s)})).toBe(false);
});
it('reconciles removed Pactbound marks while preserving the Prince’s mandatory god and saved identity',()=>{
 let a=build(['Chaos Lord','Chosen',prince],['Pactbound Zealots']);
 for(const unit of ['Chaos Lord','Chosen',prince])a=setCsmMark(a,id(unit),'Nurgle');
 a=join(a,'Chaos Lord','Chosen');a=selectCsmWarlord(a,id(prince));
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));
 expect(opened.retained).toEqual([]);expect(opened.store.profiles[0].army.instances).toEqual(a.instances);
 const changed=reconcileInstanceAttachments({...a,detachments2026:['Veterans of the Long War']});
 expect(squad(changed,'Chaos Lord').csmMark).toBeUndefined();expect(squad(changed,'Chosen').csmMark).toBeUndefined();
 expect(squad(changed,prince).csmMark).toBe('Nurgle');expect(squad(changed,'Chaos Lord').attachedTo).toBe(id('Chosen'));
 expect(validateSelection(changed)).toBe(true);
});
it('clears mark-specific enhancements and incompatible attachments when a selected mark changes',()=>{
 let a=build(['Chaos Lord','Chosen','Master Of Executions'],['Pactbound Zealots']);
 for(const unit of ['Chaos Lord','Chosen','Master Of Executions'])a=setCsmMark(a,id(unit),'Nurgle');
 a=join(a,'Chaos Lord','Chosen');a=join(a,'Master Of Executions','Chosen');
 a=selectUpgrade2026(a,id('Chaos Lord'),'Orbs of Unlife');
 a=setCsmMark(a,id('Chaos Lord'),'Slaanesh');
 expect(squad(a,'Chaos Lord').attachedTo).toBeUndefined();expect(a.upgrades2026?.[id('Chaos Lord')]).toBeUndefined();
 expect(squad(a,'Master Of Executions').attachedTo).toBe(id('Chosen'));
 expect(()=>join(a,'Chaos Lord','Chosen')).toThrow();
 a=setCsmMark(a,id('Chosen'),'Slaanesh');
 expect(squad(a,'Master Of Executions').attachedTo).toBeUndefined();
 expect(knightJoinedBodyguard(a,squad(a,'Chaos Lord'))?.id).toBe(id('Chosen'));
 expect(validateSelection(a)).toBe(true);
});
it('never silently replaces Khorne to make Touched by the Warp eligible',()=>{
 let a=setCsmMark(build([prince],['Cabal of Chaos']),id(prince),'Khorne');
 expect(eligibleUpgrades2026(a,prince,id(prince)).map(u=>u.name)).not.toContain('Touched by the Warp');
 expect(()=>selectUpgrade2026(a,id(prince),'Touched by the Warp')).toThrow();
 expect(squad(a,prince).csmMark).toBe('Khorne');
 a=setCsmMark(a,id(prince),'Nurgle');a=selectUpgrade2026(a,id(prince),'Touched by the Warp');
 expect(csmKeywords(a,squad(a,prince))).toContain('PSYKER');
 expect(csmMarkChoices(a,squad(a,prince))).not.toContain('Khorne');
});
it('supports one Leader plus one Support, including five physical Masters and current Master of Executions Support',()=>{
 let a=build(['Chaos Lord','Chosen','Master Of Executions',masters,'Sorcerer']);
 expect(CSM_SHEETS.filter(s=>s.attachmentRole)).toHaveLength(19);
 expect(rosterAttachmentRole('Chaos Space Marines','Master Of Executions')).toBe('support');
 expect(rosterAttachmentRole('Chaos Space Marines',masters)).toBe('support');
 expect(csmKeywords(a,squad(a,masters))).not.toContain('CHARACTER');
 a=join(a,'Chaos Lord','Chosen');a=join(a,masters,'Chosen');
 expect(()=>join(a,'Sorcerer','Chosen')).toThrow();expect(()=>join(a,'Master Of Executions','Chosen')).toThrow();
 expect(csmFormations(a).find(g=>g.root.unit==='Chosen')?.members.map(s=>s.unit)).toEqual(['Chosen','Chaos Lord',masters]);
 expect(errors(a)).toContain('mandatory-support');
 const unique=autoAttachUnambiguousInstances(build(['Chaos Lord','Master Of Executions','Chosen']));
 expect(squad(unique,'Chaos Lord').attachedTo).toBe(id('Chosen'));expect(squad(unique,'Master Of Executions').attachedTo).toBe(id('Chosen'));
});
it('requires Abaddon as Warlord and keeps Fabius, Cypher and other legal native Characters as optional choices',()=>{
 let a=build(['Fabius Bile','Cypher','Chaos Lord',masters,'Bloodmaster','War Dog Stalker']);
 expect(csmWarlordCandidates(a).map(s=>s.unit)).toEqual(['Fabius Bile','Cypher','Chaos Lord']);
 a=selectCsmWarlord(a,id('Cypher'));expect(resolvedCsmWarlord(a)?.unit).toBe('Cypher');
 expect(()=>selectCsmWarlord(a,id('War Dog Stalker'))).toThrow();expect(()=>selectCsmWarlord(a,id(masters))).toThrow();
 a=addSelectionUnit(a,'Abaddon The Despoiler');
 expect(csmWarlordCandidates(a).map(s=>s.unit)).toEqual(['Abaddon The Despoiler']);
 expect(resolvedCsmWarlord(a)?.unit).toBe('Abaddon The Despoiler');expect(errors(a)).toContain('csm-warlord-ineligible');
 expect(()=>selectCsmWarlord(a,id('Fabius Bile'))).toThrow();
});
it('grants Chaos Cult Battleline copy limits and verifies current three-DP dispositions and the Nightmare exclusion',()=>{
 const a=build(['Traitor Guardsmen Squad']);
 expect(csmUnitLimit(a,'Traitor Guardsmen Squad')).toBe(3);
 expect(csmUnitLimit({...a,detachments2026:['Chaos Cult']},'Traitor Guardsmen Squad')).toBe(6);
 expect(csmUnitLimit({...a,detachments2026:['Chaos Cult'],battleSize2026:'Incursion'},'Traitor Guardsmen Squad')).toBe(4);
 expect(csmUnitLimit(a,'Legionaries')).toBe(6);expect(csmUnitLimit(a,'Chaos Rhino')).toBe(6);expect(csmUnitLimit(a,'Cypher')).toBe(1);
 expect(detachmentBudget('Chaos Space Marines',['Pactbound Zealots'],'Incursion')).toMatchObject({valid:true,limit:3,dispositions:['Disruption','Priority Assets']});
 expect(detachmentBudget('Chaos Space Marines',['Creations of Bile'],'Strike Force').dispositions).toEqual(['Take and Hold','Purge the Foe']);
 expect(detachmentBudget('Chaos Space Marines',["Huron's Marauders"],'Strike Force').dispositions).toEqual(['Disruption','Purge the Foe']);
 expect(detachmentBudget('Chaos Space Marines',['Renegade Raiders'],'Strike Force').dispositions).toEqual(['Priority Assets','Reconnaissance']);
 expect(detachmentBudget('Chaos Space Marines',['Murdertalon Raiders','Nightmare Hunt'],'Strike Force').valid).toBe(false);
});
it('counts all actual passenger models and rejects an overfull Apostle formation',()=>{
 let a=build(['Chaos Rhino','Chaos Land Raider','Dark Apostle','Legionaries','Chaos Lord',masters,'Chosen']);
 a=setInstanceModelCount(a,id('Legionaries'),10);a=join(a,'Dark Apostle','Legionaries');a=join(a,'Chaos Lord','Chosen');a=join(a,masters,'Chosen');
 expect(cargo(a,'Chaos Rhino').map(g=>g.root.unit)).not.toContain('Legionaries');
 expect(cargo(a,'Chaos Land Raider').map(g=>g.root.unit)).not.toContain('Legionaries');
 expect(cargo(a,'Chaos Rhino').find(g=>g.root.unit==='Chosen')).toMatchObject({models:11,spaces:11});
 a=setInstanceModelCount(a,id('Legionaries'),9);
 expect(cargo(a,'Chaos Rhino').find(g=>g.root.unit==='Legionaries')).toMatchObject({models:12,spaces:12});
 expect(csmCargoFits(a,squad(a,'Chaos Rhino'),[id('Legionaries'),id('Chosen')])).toBe(false);
 expect(csmCargoFits(a,squad(a,'Chaos Rhino'),[id('Chosen'),id('Chosen')])).toBe(false);
});
it('weights Terminators, Mutilators and Possessed while rejecting Jump Packs and both spellings of Obliterator',()=>{
 let a=build(['Chaos Rhino','Chaos Land Raider','Chaos Lord In Terminator Armour','Chaos Terminator Squad','Possessed','Mutilators','Obliterators','Raptors']);
 a=join(a,'Chaos Lord In Terminator Armour','Chaos Terminator Squad');
 expect(cargo(a,'Chaos Rhino')).toEqual([]);
 expect(cargo(a,'Chaos Land Raider').find(g=>g.root.unit==='Chaos Terminator Squad')).toMatchObject({models:6,spaces:12});
 expect(cargo(a,'Chaos Land Raider').find(g=>g.root.unit==='Possessed')).toMatchObject({models:5,spaces:10});
 expect(cargo(a,'Chaos Land Raider').find(g=>g.root.unit==='Mutilators')).toMatchObject({models:3,spaces:6});
 for(const name of ['Obliterators','Raptors'])expect(cargo(a,'Chaos Land Raider').map(g=>g.root.unit)).not.toContain(name);
 expect(csmKeywords(a,squad(a,'Obliterators'))).toContain('OBLITERATOR');
 a=setInstanceModelCount(a,id('Chaos Terminator Squad'),6);expect(cargo(a,'Chaos Land Raider').map(g=>g.root.unit)).not.toContain('Chaos Terminator Squad');
});
it('matches distinct Rhino passengers by mark instead of counting the same compatible formation twice',()=>{
 let a=build(['Chaos Lord','Chaos Rhino','Chaos Rhino','Legionaries','Plague Marines'],['Pactbound Zealots']);
 a=setCsmMark(a,id('Chaos Lord'),'Nurgle');a=setCsmMark(a,id('Legionaries'),'Nurgle');a=join(a,'Chaos Lord','Legionaries');
 a=setCsmMark(a,id('Chaos Rhino'),'Nurgle');a=setCsmMark(a,id('Chaos Rhino',2),'Slaanesh');
 expect(cargo(a,'Chaos Rhino').map(g=>g.root.unit)).toEqual(['Legionaries','Plague Marines']);
 expect(cargo(a,'Chaos Rhino',2)).toEqual([]);expect(errors(a)).toContain('dedicated-transport-passengers');
 a=setCsmMark(a,id('Chaos Rhino',2),'Nurgle');expect(errors(a)).not.toContain('dedicated-transport-passengers');
 a=removeRosterInstance(a,id('Plague Marines'));expect(errors(a)).toContain('dedicated-transport-passengers');
});
it('keeps surviving original Leaders and Supports together for cargo and Font, but rejects invented missing-body attachments',()=>{
 let a=build(['Chaos Rhino','Chaos Lord',masters,'Legionaries'],['Cult of the Arkifane']);
 a=join(a,'Chaos Lord','Legionaries');a=join(a,masters,'Legionaries');a=selectUpgrade2026(a,id('Chaos Lord'),'Cybinfernal Font');
 const survivors=a.instances!.filter(s=>s.unit!=='Legionaries');
 const formed=csmFormations(a,survivors).find(g=>g.root.unit==='Chaos Lord')!;
 expect(formed.members.map(s=>s.unit)).toEqual(['Chaos Lord',masters]);
 expect(csmCargoFormations(a,squad(a,'Chaos Rhino'),survivors).find(g=>g.root.unit==='Chaos Lord')).toMatchObject({models:6,spaces:6});
 expect(csmKeywords(a,squad(a,masters),'Garreon the Corpsemaster',survivors)).toContain('SOUL FORGE');
 const withoutFont=survivors.filter(s=>s.unit!=='Chaos Lord');
 expect(csmKeywords(a,squad(a,masters),undefined,withoutFont)).not.toContain('SOUL FORGE');
 const invented=build(['Chaos Rhino','Chaos Lord']);invented.instances=invented.instances!.map(s=>s.unit==='Chaos Lord'?{...s,attachedTo:'Absent#1'}:s);
 expect(csmCargoFormations(invented,squad(invented,'Chaos Rhino'))).toEqual([]);
});
it('scopes Font to its actual formation, Touched to the Character model, and Pinions to its own Jump Lord',()=>{
 let a=build(['Chaos Lord',masters,'Legionaries','Dark Apostle','Chosen','Chaos Rhino'],['Cult of the Arkifane','Cabal of Chaos']);
 a=join(a,'Chaos Lord','Legionaries');a=join(a,masters,'Legionaries');a=join(a,'Dark Apostle','Chosen');
 a=selectUpgrade2026(a,id('Chaos Lord'),'Cybinfernal Font');a=selectUpgrade2026(a,id('Dark Apostle'),'Touched by the Warp');
 for(const unit of ['Chaos Lord',masters,'Legionaries'])for(const model of csmArmyModelLoadouts(squad(a,unit)))expect(csmKeywords(a,squad(a,unit),model.model)).toContain('SOUL FORGE');
 expect(csmKeywords(a,squad(a,'Chosen'))).not.toContain('SOUL FORGE');
 expect(csmKeywords(a,squad(a,'Dark Apostle'),'Dark Apostle')).toContain('PSYKER');
 expect(csmKeywords(a,squad(a,'Dark Apostle'),'Dark Disciple')).not.toContain('PSYKER');
 for(const tag of ['SOUL FORGE','DAEMON'])expect(csmKeywords(a,squad(a,'Chaos Rhino'))).toContain(tag);
 let b=build(['Chaos Lord with Jump Pack','Raptors'],['Murdertalon Raiders']);b=join(b,'Chaos Lord with Jump Pack','Raptors');
 b=selectUpgrade2026(b,id('Chaos Lord with Jump Pack'),'Pact of Cursed Pinions');
 expect(csmKeywords(b,squad(b,'Chaos Lord with Jump Pack'))).toContain('DAEMON');expect(csmKeywords(b,squad(b,'Raptors'))).not.toContain('DAEMON');
});
it('grants only the selected Sorrowscent bearer the extra Warp Talon attachment and removes it with the enhancement',()=>{
 let a=build(['Chaos Lord with Jump Pack','Chaos Lord with Jump Pack','Warp Talons'],['Nightmare Hunt']);
 expect(instanceBodyguards(a,squad(a,'Chaos Lord with Jump Pack'))).not.toContain('Warp Talons');
 a=selectUpgrade2026(a,id('Chaos Lord with Jump Pack'),'Sorrowscent Vulture');
 expect(instanceBodyguards(a,squad(a,'Chaos Lord with Jump Pack'))).toContain('Warp Talons');
 expect(instanceBodyguards(a,squad(a,'Chaos Lord with Jump Pack',2))).not.toContain('Warp Talons');
 a=join(a,'Chaos Lord with Jump Pack','Warp Talons');a=selectUpgrade2026(a,id('Chaos Lord with Jump Pack'),null);
 expect(squad(a,'Chaos Lord with Jump Pack').attachedTo).toBeUndefined();
});
it('keeps Daemonic Pact, Dreadblade and Titan allowances separate and forbids Pact with a nonqualifying Titan',()=>{
 let a=build(['Chaos Lord','Bloodletters','Bloodmaster','War Dog Brigand']);a=join(a,'Bloodmaster','Bloodletters');
 expect(errors(a)).toEqual([]);expect(csmUnitLimit(a,'Knight Abominant')).toBe(0);
 expect(csmMusterUnits(a)).not.toContain('Chaos Warhound Titan');
 expect(csmWarlordCandidates(a).map(s=>s.unit)).toEqual(['Chaos Lord']);
 a=addSelectionUnit(a,'Knight Abominant');expect(errors(a)).toContain('dreadblade-allowance');
 const titan=build(['Chaos Lord','Chaos Warhound Titan']);
 expect(csmMusterUnits(titan)).not.toContain('Bloodletters');expect(rosterCost2026(titan).entries[1].points).toBe(1100);
 expect(csmUnitLimit({...titan,battleSize2026:'Incursion'},'Chaos Warhound Titan')).toBe(0);
 const incompatible=addSelectionUnit(titan,'Bloodletters');expect(errors(incompatible)).toContain('daemonic-pact-faction');
 const missingBattleline=build(['Chaos Lord','Bloodmaster']);expect(errors(missingBattleline)).toContain('daemonic-pact-battleline');
 expect(knightLoadoutFor('Chaos Space Marines','Bloodletters')).toBeDefined();expect(knightLoadoutFor('Chaos Space Marines','War Dog Brigand')).toBeDefined();
 expect(knightLoadoutFor('Chaos Space Marines','Chaos Warhound Titan')).toBeDefined();
});
it('migrates historical Abaddon and detachment spellings while preserving saved IDs and references',()=>{
 const a=build(['Abaddon The Despoiler','Chosen'],["Huron's Marauders"]);
 const historical={...a,units:{'Abaddon the Despoiler':1,Chosen:1},instances:a.instances!.map(s=>s.unit==='Abaddon The Despoiler'?{...s,unit:'Abaddon the Despoiler'}:s),warlordId:id('Abaddon The Despoiler')};
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(historical))));
 expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;expect(saved.units).toEqual(a.units);expect(saved.instances).toEqual(a.instances);
 expect(saved.detachments2026).toEqual(['Huron’s Marauders']);expect(saved.warlordId).toBe(historical.warlordId);
 expect(validateSelection(saved)).toBe(true);
});
