// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {knightLoadoutFor,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {spaceMarineModelLoadouts,spaceMarineModelIdentities,spaceMarineWeaponCount} from '../src/space-marines-loadouts';
import {selectSpaceMarineWarlord,resolvedSpaceMarineWarlord,spaceMarineWarlordCandidates} from '../src/space-marines-muster';
import {spaceMarineChapter,spaceMarineMusterUnits} from '../src/space-marines-muster-data';
import {spaceMarineFormations,spaceMarineCargoFormations,spaceMarineCargoFits,spaceMarineDedicatedSatisfied} from '../src/space-marines-transports';
import {spaceMarineKeywords} from '../src/space-marines-keywords';
import {spaceMarineAttachmentRole} from '../src/space-marines-attachments';
import {spaceMarineFormationHasDeepStrike,spaceMarineFormationScoutRange} from '../src/space-marines-datasheet-core';
import {eligibleSpaceMarineUpgrades,selectedSpaceMarineUpgrade} from '../src/space-marines-upgrades';
import {eligibleChapterUpgrades,selectedChapterUpgrade,chapterFormationHasFightsFirst} from '../src/space-marine-chapters-upgrades';
import {chapterSplitPlans} from '../src/space-marine-chapters-splits';
import {CHAPTER_TRAITS} from '../src/space-marine-chapters-detachments.generated';
import {spaceMarinePartWeaponProfiles} from '../src/space-marines-weapons';
import {isModeledLeader} from '../src/leader-eligibility';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {CHAPTER_ACCEPTANCE_ARMIES,BA_SPEARTIP_ARMY,BA_INHERITORS_ARMY,DA_ROCK_ARMY,DA_PURSUIT_ARMY,BT_HOUSEHOLD_ARMY,BT_CRUSADE_ARMY,SW_GREAT_WOLF_ARMY,SW_CHAMPIONS_ARMY,type ChapterAcceptanceArmy} from './fixtures/space-marine-chapters-armies';

const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const itemKey=(item:string)=>item.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const itemsKey=(items:readonly string[])=>items.map(itemKey).sort().join('|');
function build(plan:ChapterAcceptanceArmy){
 let army=individualArmy({...newSelection(plan.faction),battleSize2026:plan.battleSize,detachments2026:plan.detachments});
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const n=(copies.get(row.unit)??0)+1;copies.set(row.unit,n);army=addSelectionUnit(army,row.unit);
  if(row.models!==undefined)army=setInstanceModelCount(army,id(row.unit,n),row.models);
 }
 for(const s of army.instances!)if(isModeledLeader(army.faction,s.unit))army=setInstanceAttachment(army,s.id,null);
 army=selectSpaceMarineWarlord(army,plan.warlord);
 // This selected enhancement supplies the attachment permission itself.
 for(const [bearer,upgrade] of plan.upgrades)if(upgrade==='Wolf-Touched')army=selectUpgrade2026(army,bearer,upgrade);
 for(const [leader,body] of plan.attachments)army=setInstanceAttachment(army,leader,body);
 for(const [bearer,upgrade] of plan.upgrades)if(upgrade!=='Wolf-Touched')army=selectUpgrade2026(army,bearer,upgrade);
 for(const change of plan.gear){
  const squad=instance(army,change.unit,change.copy),matches=knightLoadoutFor(army.faction,change.unit,squad.models,squad.knightGear)!.slots.flatMap(field=>
   field.name.startsWith(change.owner)?field.choices.filter(choice=>change.choice?choice.name===change.choice:itemsKey(choice.items)===itemsKey(change.items!)).map(choice=>({field,choice})):[]);
  expect(matches,'Exact equipment choice for '+squad.id+' / '+change.owner).toHaveLength(1);
  army=setKnightGear(army,squad.id,matches[0].field.name,matches[0].choice.name);
 }
 return army;
}
function reopen(plan:ChapterAcceptanceArmy){
 const army=build(plan),opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(army))));
 expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.instances).toEqual(army.instances);expect(saved.upgrades2026).toEqual(army.upgrades2026);expect(saved.warlordId).toEqual(army.warlordId);
 expect(validateSelection(saved)).toBe(true);
 expect(rosterFindings(saved).filter(f=>f.severity!=='info')).toEqual([]);
 expect(rosterFindings(saved).map(f=>[f.code,f.severity])).toEqual([['detachment-points','info']]);
 const cost=rosterCost2026(saved);
 expect(cost.total).toBe(plan.points);expect(cost.entries.map(e=>e.points)).toEqual(plan.units.map(u=>u.points));
 expect(resolvedSpaceMarineWarlord(saved)?.id).toBe(plan.warlord);expect(spaceMarineChapter(saved)).toBe(plan.chapter);
 for(const squad of saved.instances!){
  expect(validKnightGear(squad,saved.faction),squad.id).toBe(true);
  const models=spaceMarineModelLoadouts(squad,saved.faction);
  expect(models,squad.id+' actual physical model count').toHaveLength(cost.entries.find(e=>e.id===squad.id)!.models!);
  expect(models.every(m=>m.items.length>0),squad.id+' has actual equipment on every model').toBe(true);
 }
 expect(spaceMarineDedicatedSatisfied(saved)).toBe(true);
 return saved;
}

for(const plan of CHAPTER_ACCEPTANCE_ARMIES)it('saves and reopens the complete '+plan.points+'-point '+plan.name+' force with exact equipment, attachments and upgrades',()=>{
 const army=reopen(plan),rows=generate11thReminders(army);
 expect(rows.some(r=>r.title==='Space Marine Chapters'&&r.summary.includes(plan.chapter))).toBe(true);
 expect(rows.every(r=>r.source&&r.summary)).toBe(true);
 for(const trait of CHAPTER_TRAITS.filter(t=>t.faction===army.faction&&plan.detachments.includes(t.detachment)))expect(rows.some(r=>r.sourceRuleId===trait.id),trait.name+' reaches the complete force reminders').toBe(true);
 for(const s of army.instances!)expect(rows.some(r=>r.units?.includes(s.id)),s.id+' appears in generated reminders').toBe(true);
},20_000);

it('keeps Blood Angels combined detachments, personal shields and actual Death Company special weapons coherent',()=>{
 const army=build(BA_SPEARTIP_ARMY),jump=instance(army,'Death Company Marines With Jump Packs'),captain=instance(army,'Death Company Captain with Jump Pack');
 expect(spaceMarineWeaponCount(captain,'Relic Shield',army.faction)).toBe(1);expect(spaceMarineWeaponCount(captain,'Thunder Hammer',army.faction)).toBe(1);expect(spaceMarineWeaponCount(captain,'Heavy Bolt Pistol',army.faction)).toBe(0);
 for(const weapon of ['Eviscerator','Power Fist','Inferno Pistol','Plasma Pistol','Hand Flamer'])expect(spaceMarineWeaponCount(jump,weapon,army.faction)).toBe(1);
 expect(spaceMarineWeaponCount(instance(army,'Death Company Marines'),'Grenade Launcher',army.faction)).toBe(1);
 const rows=generate11thReminders(army);
 expect(rows.some(r=>r.title.includes('Sanguinius')&&/assault doctrine/i.test(r.summary))).toBe(true);
 expect(rows.find(r=>r.title==='Death Company Dreadnought#1 · Ranged weapon profiles'&&r.turn==='own')?.summary).toContain('Twin Multi-melta');
});

it('preserves a seven-model Blood Angels Leader and Support formation, three Sanguinary Guard prices and current Mephiston save',()=>{
 const army=build(BA_INHERITORS_ARMY),group=spaceMarineFormations(army).find(g=>g.root.unit==='Assault Intercessor Squad')!;
 expect(spaceMarineAttachmentRole('Sanguinary Priest',army)).toBe('support');expect(group.models).toBe(7);
 expect(group.members.map(s=>s.unit)).toEqual(['Assault Intercessor Squad','Blood Angels Captain','Sanguinary Priest']);
 expect(spaceMarineCargoFits(army,instance(army,'Impulsor'),[group.root.id])).toBe(true);expect(spaceMarineFormationScoutRange(army,group)).toBe(6);
 expect(rosterCost2026(army).entries.filter(e=>e.unit==='Sanguinary Guard').map(e=>e.points)).toEqual([135,135,150]);
 const rows=generate11thReminders(army),save=rows.filter(r=>r.title==='Chief Librarian Mephiston#1 · Invulnerable save');
 expect(save.length).toBeGreaterThan(0);expect(save.every(r=>r.summary.includes('4+'))).toBe(true);
 expect(spaceMarineWeaponCount(instance(army,'Death Company Marines With Jump Packs'),'Eviscerator',army.faction)).toBe(2);
},20_000);

it('keeps Deathwing unit equipment separate from actual Knight weapons and the Ravenwing Champion enhancement',()=>{
 const army=build(DA_ROCK_ARMY),knights=instance(army,'Deathwing Knights'),term=instance(army,'Deathwing Terminator Squad'),command=instance(army,'Ravenwing Command Squad');
 expect(spaceMarineWeaponCount(knights,'Power Weapon',army.faction)).toBe(4);expect(spaceMarineWeaponCount(knights,'Relic Weapon',army.faction)).toBe(1);expect(spaceMarineWeaponCount(knights,'Watcher in the Dark',army.faction)).toBe(1);
 expect(spaceMarineModelLoadouts(knights,army.faction).flatMap(m=>m.items)).not.toContain('Watcher in the Dark');
 expect(spaceMarineWeaponCount(term,'Cyclone Missile Launcher',army.faction)).toBe(1);expect(spaceMarineWeaponCount(term,'Storm Bolter',army.faction)).toBe(5);
 expect(rosterCost2026(army).entries.find(e=>e.id===term.id)?.wargearPoints).toBe(10);
 expect(selectedChapterUpgrade(army,command)?.bearerModels).toEqual(['Ravenwing Champion']);
 for(const model of spaceMarineModelLoadouts(command,army.faction))expect(spaceMarineKeywords(army,command,model.model).has('CHARACTER')).toBe(model.model==='Ravenwing Champion');
 expect(spaceMarineWeaponCount(command,'Plasma Talon',army.faction)).toBe(2);expect(spaceMarineWeaponCount(command,'Grenade Launcher',army.faction)).toBe(1);
 const forms=spaceMarineFormations(army);expect(forms.find(g=>g.root.unit==='Ravenwing Black Knights')?.models).toBe(6);
 expect(spaceMarineFormationHasDeepStrike(army,forms.find(g=>g.root.id===term.id)!)).toBe(true);
});

it('keeps the Lion compulsory, a ten-model Ravenwing formation and the recruited Deathwatch Beacon bearer separate',()=>{
 const army=build(DA_PURSUIT_ARMY),forms=spaceMarineFormations(army),ravenwing=forms.find(g=>g.root.unit==='Ravenwing Black Knights')!,fortis=forms.find(g=>g.root.unit==='Fortis Kill Team')!,captain=instance(army,'Captain');
 expect(spaceMarineWarlordCandidates(army).map(s=>s.id)).toEqual(['Lion El’jonson#1']);
 expect(ravenwing.models).toBe(10);expect(ravenwing.members.map(s=>s.unit)).toEqual(['Ravenwing Black Knights','Sammael','Ravenwing Command Squad']);
 expect(selectedSpaceMarineUpgrade(army,captain)?.name).toBe('Beacon Angelis');expect(eligibleChapterUpgrades(army,captain.unit,captain.id)).toEqual([]);
 expect(eligibleSpaceMarineUpgrades(army,captain.unit,captain.id).map(u=>u.name)).toEqual(['Beacon Angelis']);
 expect(spaceMarineFormationHasDeepStrike(army,fortis)).toBe(true);expect(spaceMarineCargoFits(army,instance(army,'Rhino'),[fortis.root.id])).toBe(true);
 expect(spaceMarineKeywords(army,captain).has('DEATHWATCH')).toBe(false);expect(spaceMarineMusterUnits(army)).toContain('Fortis Kill Team');
 expect(spaceMarineMusterUnits({...army,detachments2026:['Inner Circle Task Force','Darkflight Pursuit']})).not.toContain('Fortis Kill Team');
 expect(selectedChapterUpgrade(army,instance(army,'Land Speeder Vengeance'))?.name).toBe('Nightforged Battery');expect(selectedChapterUpgrade(army,instance(army,'Ravenwing Darkshroud'))?.name).toBe('Thundercowl Turbines');
 const rows=generate11thReminders(army);expect(rows.filter(r=>r.title==='Ravenwing Darkshroud#1 · Lone Operative').every(r=>r.summary.includes('15″'))).toBe(true);
},20_000);

it('prices all six Templar chassis from their chapter cards and counts each equipped Multi-melta',()=>{
 const small=build(BT_HOUSEHOLD_ARMY),large=build(BT_CRUSADE_ARMY),valiant=instance(small,'Gladiator Valiant');
 expect(spaceMarineWeaponCount(valiant,'Multi-melta',small.faction)).toBe(3);
 expect(rosterCost2026(small).entries.find(e=>e.id===valiant.id)).toMatchObject({basePoints:145,wargearPoints:30,points:175});
 expect(rosterCost2026(large).entries.find(e=>e.unit==='Repulsor Executioner')).toMatchObject({basePoints:265,wargearPoints:10,points:275});
 expect(spaceMarineWeaponCount(instance(large,'Repulsor Executioner'),'Heavy Laser Destroyer',large.faction)).toBe(1);
 for(const [army,units] of [[small,['Impulsor','Gladiator Lancer','Gladiator Valiant']],[large,['Gladiator Reaper','Repulsor','Repulsor Executioner']]] as const)for(const unit of units)expect(rosterCost2026(army).entries.find(e=>e.unit===unit)?.wargearPoints).toBe(unit==='Gladiator Valiant'?30:unit==='Impulsor'?20:10);
 expect(spaceMarineCargoFits(small,instance(small,'Rhino'),['Crusader Squad#1'])).toBe(true);expect(spaceMarineCargoFits(small,instance(small,'Impulsor'),['Sword Brethren Squad#1'])).toBe(true);
 expect(chapterFormationHasFightsFirst(small,spaceMarineFormations(small).find(g=>g.root.unit==='Sword Brethren Squad')!.members)).toBe(true);
});

it('retains intermediate Crusaders, eight-model weapon thresholds, the third Sword Brethren price and every Cenobyte',()=>{
 const army=build(BT_CRUSADE_ARMY),crusaders=instance(army,'Crusader Squad'),swords=instance(army,'Sword Brethren Squad'),grimaldus=instance(army,'Chaplain Grimaldus');
 const models=spaceMarineModelLoadouts(crusaders,army.faction);expect(models.filter(m=>m.model==='Initiate')).toHaveLength(6);expect(models.filter(m=>m.model==='Neophyte')).toHaveLength(8);expect(models.filter(m=>m.model==='Sword Brother')).toHaveLength(1);
 expect(spaceMarineWeaponCount(swords,'Thunder Hammer',army.faction)).toBe(2);expect(spaceMarineWeaponCount(swords,'Plasma Pistol',army.faction)).toBe(2);expect(spaceMarineWeaponCount(swords,'Hand Flamer',army.faction)).toBe(4);expect(spaceMarineWeaponCount(swords,'Twin Lightning Claws',army.faction)).toBe(2);
 expect(rosterCost2026(army).entries.filter(e=>e.unit==='Sword Brethren Squad').map(e=>e.points)).toEqual([250,115,135]);
 expect(spaceMarineModelLoadouts(grimaldus,army.faction).filter(m=>m.model==='Cenobyte Servitor')).toHaveLength(3);
 for(const model of spaceMarineModelLoadouts(grimaldus,army.faction))expect(spaceMarineKeywords(army,grimaldus,model.model).has('CHARACTER')).toBe(model.model==='Chaplain Grimaldus');
 expect(spaceMarineFormations(army).find(g=>g.root.id===crusaders.id)?.models).toBe(19);
 expect(spaceMarineCargoFormations(army,instance(army,'Repulsor')).map(g=>g.root.id)).not.toContain(crusaders.id);
 expect(spaceMarineCargoFits(army,instance(army,'Repulsor'),[swords.id])).toBe(true);
});

it('saves both Space Wolf splits with actual weapons, the attached Characters and three legal Rhino occupants',()=>{
 const army=build(SW_GREAT_WOLF_ARMY),plans=chapterSplitPlans(army),grey=plans.find(p=>p.rootId==='Grey Hunters#1')!,head=plans.find(p=>p.rootId==='Wolf Guard Headtakers#1')!;
 expect(plans.every(p=>p.valid)).toBe(true);expect(grey.parts.map(p=>p.models)).toEqual([5,6]);expect(head.parts.map(p=>p.models)).toEqual([4,3]);
 const first=grey.parts[0],second=grey.parts[1];
 expect(first.members.map(s=>s.unit)).toEqual(['Grey Hunters']);expect(first.members.map(s=>s.unit)).not.toContain('Wolf Priest');
 expect(second.members.map(s=>s.unit)).toEqual(expect.arrayContaining(['Grey Hunters','Wolf Priest']));
 expect(first.physical.flatMap(m=>m.items).filter(i=>itemKey(i)==='powerfist')).toHaveLength(1);expect(second.physical.flatMap(m=>m.items).filter(i=>itemKey(i)==='powerfist')).toHaveLength(0);
 expect(first.physical.some(m=>m.id==='Grey Hunters#1::Grey Hunter Pack Leader#1')).toBe(true);
 expect(head.parts[0].physical.filter(m=>m.model==='Wolf Guard Headtaker')).toHaveLength(3);expect(head.parts[0].members.map(s=>s.unit)).toContain('Ragnar Blackmane');expect(head.parts[1].physical.every(m=>m.model==='Hunting Wolf')).toBe(true);
 const cargo=spaceMarineCargoFormations(army,instance(army,'Rhino')),ids=cargo.map(g=>g.root.id);
 for(const root of ['Grey Hunters#1 · Group 1','Grey Hunters#1 · Group 2','Wolf Guard Headtakers#1 · Group 1'])expect(ids).toContain(root);
 expect(ids).not.toContain('Wolf Guard Headtakers#1 · Group 2');expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
 const all=plans.flatMap(p=>p.parts.flatMap(g=>g.physical.map(m=>m.id)));expect(new Set(all).size).toBe(all.length);
 const original=spaceMarineModelIdentities(instance(army,'Grey Hunters'),army.faction).map(m=>m.id);expect(grey.parts.flatMap(p=>p.physical.filter(m=>m.squad.unit==='Grey Hunters').map(m=>m.id)).sort()).toEqual(original.sort());
 const rows=generate11thReminders(army);expect(rows.find(r=>r.title==='Grey Hunters#1 · Group 1 · actual models'&&r.window==='Pre-battle')?.summary).toContain('Power fist');expect(rows.find(r=>r.title==='Grey Hunters#1 · Group 2 · actual models'&&r.window==='Pre-battle')?.summary).not.toContain('Power fist');
 const firstProfiles=spaceMarinePartWeaponProfiles(army,first),secondProfiles=spaceMarinePartWeaponProfiles(army,second),wolfProfiles=spaceMarinePartWeaponProfiles(army,head.parts[1]);
 expect(firstProfiles.find(w=>itemKey(w.name)==='boltcarbine')?.count).toBe(5);expect(secondProfiles.find(w=>itemKey(w.name)==='boltcarbine')?.count).toBe(5);
 expect(firstProfiles.find(w=>itemKey(w.name)==='powerfist')?.count).toBe(1);expect(secondProfiles.some(w=>itemKey(w.name)==='powerfist')).toBe(false);
 expect(firstProfiles.some(w=>itemKey(w.name)==='croziusarcanum')).toBe(false);expect(secondProfiles.find(w=>itemKey(w.name)==='croziusarcanum')?.count).toBe(1);
 expect(wolfProfiles.filter(w=>w.phase==='Shooting')).toEqual([]);expect(wolfProfiles.find(w=>itemKey(w.name)==='teethandclaws')?.count).toBe(3);
 for(const unit of ['Grey Hunters','Wolf Guard Headtakers','Wolf Priest','Ragnar Blackmane'])expect(rows.some(r=>r.title===unit+'#1 · Ranged weapon profiles'||r.title===unit+'#1 · Melee weapon profiles')).toBe(false);
 expect(rows.find(r=>r.title==='Grey Hunters#1 · Group 1 · Ranged weapon profiles'&&r.turn==='own')?.summary).toContain('5 × Bolt Carbine');
 expect(rows.some(r=>r.title==='Wolf Guard Headtakers#1 · Group 2 · Ranged weapon profiles')).toBe(false);
},20_000);

it('keeps paid Wolf Guard and Thunderwolf shields on their bearers and applies Wolf-Touched to the selected formation',()=>{
 const army=build(SW_CHAMPIONS_ARMY),terms=instance(army,'Wolf Guard Terminators'),cavalry=instance(army,'Thunderwolf Cavalry'),leader=instance(army,'Wolf Guard Battle Leader');
 expect(spaceMarineWeaponCount(terms,'Storm Shield',army.faction)).toBe(3);expect(spaceMarineWeaponCount(terms,'Storm Bolter',army.faction)).toBe(1);expect(spaceMarineWeaponCount(terms,'Assault Cannon',army.faction)).toBe(1);
 expect(spaceMarineWeaponCount(cavalry,'Storm Shield',army.faction)).toBe(6);expect(spaceMarineWeaponCount(cavalry,'Boltgun',army.faction)).toBe(6);
 expect(rosterCost2026(army).entries.filter(e=>e.wargearPoints).map(e=>[e.unit,e.wargearPoints])).toEqual([['Wolf Guard Terminators',15],['Thunderwolf Cavalry',30]]);
 expect(leader.attachedTo).toBe('Wulfen with Storm Shields#1');expect(spaceMarineKeywords(army,leader,'Wolf Guard Battle Leader')).toContain('WULFEN');
 const cargo=spaceMarineCargoFormations(army,instance(army,'Repulsor')).find(g=>g.root.unit==='Wulfen with Storm Shields')!;expect(cargo).toMatchObject({models:6,spaces:12});
 expect(spaceMarineWarlordCandidates(army).map(s=>s.unit)).not.toContain('Murderfang');
 const scouts=instance(army,'Wolf Scouts');for(const weapon of ['Runic Stave','Thunderclap','Plasma Gun','Instigator Bolt Carbine'])expect(spaceMarineWeaponCount(scouts,weapon,army.faction)).toBe(1);
});

it('retains each surviving attached Character in its original split part after its whole Bodyguard is destroyed',()=>{
 const army=build(SW_GREAT_WOLF_ARMY),initial=chapterSplitPlans(army);
 for(const bodyguard of ['Grey Hunters','Wolf Guard Headtakers']){
  const before=initial.find(p=>p.rootId===id(bodyguard))!,survivors=army.instances!.filter(s=>s.id!==id(bodyguard));
  const after=chapterSplitPlans(army,survivors).find(p=>p.rootId===before.rootId)!;
  expect(after.valid).toBe(true);
  for(const part of after.parts)expect(part.physical.map(m=>m.id)).toEqual(before.parts.find(p=>p.key===part.key)!.physical.filter(m=>m.squad.id!==id(bodyguard)).map(m=>m.id));
  expect(after.parts.reduce((n,p)=>n+p.models,0)).toBe(1);
 }
});
