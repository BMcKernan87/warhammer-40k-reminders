// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {knightLoadoutFor,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {spaceMarineModelLoadouts,spaceMarineWeaponCount} from '../src/space-marines-loadouts';
import {selectSpaceMarineWarlord,resolvedSpaceMarineWarlord} from '../src/space-marines-muster';
import {spaceMarineChapter,spaceMarineMusterUnits} from '../src/space-marines-muster-data';
import {spaceMarineFormations,spaceMarineCargoFormations,spaceMarineCargoFits,spaceMarineDedicatedSatisfied} from '../src/space-marines-transports';
import {spaceMarineKeywords} from '../src/space-marines-keywords';
import {spaceMarineAttachmentRole} from '../src/space-marines-attachments';
import {spaceMarineFormationHasDeepStrike,spaceMarineFormationHasInfiltrators} from '../src/space-marines-datasheet-core';
import {eligibleSpaceMarineUpgrades,selectedSpaceMarineUpgrade} from '../src/space-marines-upgrades';
import {SM_SHEETS,spaceMarineAgentName} from '../src/space-marines-data';
import {isModeledLeader} from '../src/leader-eligibility';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {SM_ACCEPTANCE_ARMIES,SM_ULTRAMARINES_ARMY,SM_IRON_HANDS_ARMY,SM_DEATHWATCH_ARMY,SM_DEATHWATCH_SUPPORT_ARMY,SM_RAVEN_GUARD_ARMY,SM_IMPERIAL_FISTS_ARMY,SM_WHITE_SCARS_ARMY,type SpaceMarineAcceptanceArmy} from './fixtures/space-marines-armies';

const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const itemsKey=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function build(plan:SpaceMarineAcceptanceArmy){
 let army=individualArmy({...newSelection('Space Marines'),battleSize2026:plan.battleSize,detachments2026:plan.detachments});
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const n=(copies.get(row.unit)??0)+1;copies.set(row.unit,n);army=addSelectionUnit(army,row.unit);
  if(row.models!==undefined)army=setInstanceModelCount(army,id(row.unit,n),row.models);
 }
 for(const s of army.instances!)if(isModeledLeader(army.faction,s.unit))army=setInstanceAttachment(army,s.id,null);
 army=selectSpaceMarineWarlord(army,plan.warlord);
 for(const [leader,body] of plan.attachments)army=setInstanceAttachment(army,leader,body);
 for(const [bearer,upgrade] of plan.upgrades)army=selectUpgrade2026(army,bearer,upgrade);
 for(const change of plan.gear){
  const squad=instance(army,change.unit,change.copy),matches=knightLoadoutFor(army.faction,change.unit,squad.models)!.slots.flatMap(field=>
   field.name.startsWith(change.owner)?field.choices.filter(choice=>change.choice?choice.name===change.choice:itemsKey(choice.items)===itemsKey(change.items!)).map(choice=>({field,choice})):[]);
  expect(matches,'Exact equipment choice for '+squad.id+' / '+change.owner).toHaveLength(1);
  army=setKnightGear(army,squad.id,matches[0].field.name,matches[0].choice.name);
 }
 return army;
}
function reopen(plan:SpaceMarineAcceptanceArmy){
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
 for(const squad of saved.instances!)expect(validKnightGear(squad,saved.faction),squad.id).toBe(true);
 expect(spaceMarineDedicatedSatisfied(saved)).toBe(true);
 return saved;
}

for(const plan of SM_ACCEPTANCE_ARMIES)it('saves and reopens the complete '+plan.points+'-point '+plan.name+' force with every selected model, attachment, upgrade and weapon',()=>{
 const army=reopen(plan),rows=generate11thReminders(army);
 expect(rows.some(r=>r.title==='Space Marine Chapters')).toBe(true);
 expect(rows.every(r=>r.source&&r.summary)).toBe(true);
 for(const s of army.instances!)expect(rows.some(r=>r.units?.includes(s.id)),s.id+' appears in generated reminders').toBe(true);
});

it('preserves Calgar and Cato’s distinct attachment roles, actual Victrix specialists, Company Ancient and intermediate Intercessors',()=>{
 const army=build(SM_ULTRAMARINES_ARMY),forms=spaceMarineFormations(army),victrix=forms.find(f=>f.root.unit==='Victrix Honour Guard')!,company=instance(army,'Company Heroes');
 expect(spaceMarineAttachmentRole('Cato Sicarius',army)).toBe('support');
 expect(victrix.models).toBe(8);expect(victrix.members.map(s=>s.unit)).toEqual(['Victrix Honour Guard','Marneus Calgar','Cato Sicarius']);
 expect(spaceMarineModelLoadouts(victrix.root).map(m=>m.model)).toEqual(['Chapter Ancient','Chapter Champion',...Array(4).fill('Victrix Honour Guard')]);
 expect(spaceMarineWeaponCount(victrix.root,'Banner of Macragge')).toBe(1);expect(spaceMarineWeaponCount(victrix.root,'Master-crafted Bolt Carbine')).toBe(5);
 expect(selectedSpaceMarineUpgrade(army,company)?.bearerModels).toEqual(['Ancient']);
 for(const m of spaceMarineModelLoadouts(company))expect(spaceMarineKeywords(army,company,m.model).has('CHARACTER')).toBe(m.model==='Ancient');
 const intercessor=instance(army,'Intercessor Squad');expect(spaceMarineModelLoadouts(intercessor)).toHaveLength(7);
 expect(forms.find(f=>f.root.id===intercessor.id)?.models).toBe(14);
 expect(rosterCost2026(army).entries.find(e=>e.id===intercessor.id)?.points).toBe(170);
 const carrier=instance(army,'Impulsor');expect(spaceMarineCargoFits(army,carrier,[company.id])).toBe(true);expect(spaceMarineCargoFits(army,carrier,[victrix.root.id])).toBe(false);
 expect(spaceMarineCargoFormations(army,carrier).map(f=>f.root.id)).not.toContain(intercessor.id);
 const desolation=instance(army,'Desolation Squad');expect(spaceMarineWeaponCount(desolation,'Superkrak Rocket Launcher')).toBe(4);expect(spaceMarineWeaponCount(desolation,'Vengor Launcher')).toBe(1);
 expect(spaceMarineWeaponCount(instance(army,'Inceptor Squad'),'Plasma Exterminators')).toBe(3);expect(spaceMarineWeaponCount(instance(army,'Inceptor Squad',2),'Assault Bolters')).toBe(3);
 expect(rosterCost2026(army).entries.filter(e=>e.unit==='Inceptor Squad').map(e=>e.points)).toEqual([130,130,150]);
 const shooting=generate11thReminders(army).filter(r=>r.title==='Desolation Squad#1 · Ranged weapon profiles'&&r.turn==='own');
 expect(shooting).not.toHaveLength(0);expect(shooting.map(r=>r.summary).join('\n')).toContain('4 × Superkrak Rocket Launcher');expect(shooting.map(r=>r.summary).join('\n')).not.toContain('5 × Superkrak Rocket Launcher');
});

it('charges Iron Hands guns per actual vehicle and keeps the six-model Ancient formation within Executioner capacity',()=>{
 const army=build(SM_IRON_HANDS_ARMY),cost=rosterCost2026(army),carrier=instance(army,'Repulsor Executioner');
 expect(cost.entries.filter(e=>e.wargearPoints).map(e=>[e.unit,e.wargearPoints])).toEqual([['Redemptor Dreadnought',10],['Repulsor Executioner',10],['Invader ATVs',10]]);
 expect(spaceMarineWeaponCount(instance(army,'Invader ATVs'),'Multi-melta')).toBe(2);
 expect(spaceMarineCargoFormations(army,carrier).find(f=>f.root.unit==='Intercessor Squad')).toMatchObject({models:6,spaces:6});
 expect(spaceMarineCargoFormations(army,carrier).map(f=>f.root.unit)).not.toContain('Heavy Intercessor Squad');
 expect(selectedSpaceMarineUpgrade(army,instance(army,'Techmarine'))?.name).toBe('Target Augury Web');
 const rows=generate11thReminders(army),normal=rows.find(r=>r.title==='Redemptor Dreadnought#1 · Reactive ranged weapon profiles')!,snap=rows.find(r=>r.title==='Redemptor Dreadnought#1 · Reactive snap-shot profiles')!;
 expect(normal).toMatchObject({window:'Shooting',turn:'opponent'});expect(normal.summary).toContain('at or below half Starting Strength');expect(normal.summary).toContain('Macro Plasma Incinerator');
 expect(snap.summary).toContain('above half Starting Strength');expect(snap.summary).not.toMatch(/BS \d\+/);expect(snap.summary).toContain('cannot score Critical Hits');
});

it('keeps Deathwatch transports tied to actual printed model keywords and counts three paid Cyclones plus the Sergeant’s shield',()=>{
 const army=build(SM_DEATHWATCH_ARMY),carrier=instance(army,'Corvus Blackstar'),forms=spaceMarineFormations(army),fortis=forms.find(f=>f.root.unit==='Fortis Kill Team')!;
 expect(spaceMarineCargoFormations(army,carrier).find(f=>f.root.id===fortis.root.id)).toMatchObject({models:11,spaces:11});
 expect(spaceMarineFormationHasDeepStrike(army,fortis)).toBe(true);
 for(const unit of ['Decimus Kill Team','Deathwatch Terminator Squad','Indomitor Kill Team'])expect(spaceMarineCargoFormations(army,carrier).map(f=>f.root.unit)).not.toContain(unit);
 expect(spaceMarineCargoFits(army,instance(army,'Rhino'),[id('Deathwatch Veterans')])).toBe(true);
 const terminators=instance(army,'Deathwatch Terminator Squad');expect(spaceMarineWeaponCount(terminators,'Cyclone Missile Launcher')).toBe(3);expect(spaceMarineWeaponCount(terminators,'Storm Shield')).toBe(1);expect(spaceMarineWeaponCount(terminators,'Storm Bolter')).toBe(4);
 expect(rosterCost2026(army).entries.find(e=>e.id===terminators.id)?.wargearPoints).toBe(35);
 const decimus=spaceMarineModelLoadouts(instance(army,'Decimus Kill Team'));expect(decimus.filter(m=>m.model==='Gravis Veteran')).toHaveLength(2);expect(decimus.filter(m=>m.model.includes('Xenophase'))).toHaveLength(1);
 expect(spaceMarineMusterUnits(army)).not.toContain('Scout Squad');
 // Black Spear excludes the AGENTS OF THE IMPERIUM + DEATHWATCH keyword
 // conjunction; the current Agent card has ORDO XENOS, not DEATHWATCH.
 expect(spaceMarineMusterUnits(army)).toContain('Watch Master (Assigned Agent)');
 const weapons=generate11thReminders(army).filter(r=>r.units?.includes('Captain#1')).map(r=>r.summary).join('\n');expect(weapons).toContain('The Thief of Secrets');
});

it('keeps a generic Beacon bearer within its Deathwatch Support formation and isolates same-named Assigned Agents',()=>{
 const army=build(SM_DEATHWATCH_SUPPORT_ARMY),captain=instance(army,'Captain'),fortis=spaceMarineFormations(army).find(f=>f.root.unit==='Fortis Kill Team')!,agent=instance(army,'Watch Master (Assigned Agent)');
 expect(spaceMarineKeywords(army,captain).has('DEATHWATCH')).toBe(false);expect(spaceMarineKeywords(army,fortis.root).has('DEATHWATCH')).toBe(true);
 expect(spaceMarineFormationHasDeepStrike(army,fortis)).toBe(true);expect(selectedSpaceMarineUpgrade(army,captain)?.name).toBe('Beacon Angelis');
 expect(eligibleSpaceMarineUpgrades(army,captain.unit,captain.id).map(u=>u.name)).toEqual(['Beacon Angelis']);
 expect(spaceMarineAgentName(agent.unit)).toBe('Watch Master');expect(SM_SHEETS.some(s=>s.unit===agent.unit)).toBe(false);
 expect(agent.attachedTo).toBe('Deathwatch Kill Team#1');expect(eligibleSpaceMarineUpgrades(army,agent.unit,agent.id)).toEqual([]);
 const rows=generate11thReminders(army).filter(r=>r.units?.includes(agent.id));expect(rows.length).toBeGreaterThan(0);expect(rows.some(r=>r.source.includes('/imperial-agents/Watch-Master'))).toBe(true);
 expect(rows.filter(r=>r.source.includes('/space-marines/Watch-Master'))).toEqual([]);
 expect(spaceMarineCargoFits(army,instance(army,'Rhino'),[fortis.root.id])).toBe(true);
});

it('retains Raven Guard whole-unit shields, Reiver equipment grants and source-specific model inventories',()=>{
 const army=build(SM_RAVEN_GUARD_ARMY),forms=spaceMarineFormations(army),reivers=forms.find(f=>f.root.unit==='Reiver Squad')!,vanguard=instance(army,'Vanguard Veteran Squad With Jump Packs');
 expect(spaceMarineWeaponCount(vanguard,'Combat Shield')).toBe(5);expect(spaceMarineWeaponCount(vanguard,'Heavy Bolt Pistol')).toBe(0);expect(spaceMarineWeaponCount(vanguard,'Thunder Hammer')).toBe(1);
 expect(spaceMarineFormationHasInfiltrators(army,reivers)).toBe(true);expect(spaceMarineFormationHasDeepStrike(army,reivers)).toBe(true);
 expect(spaceMarineWeaponCount(reivers.root,'Grav-chutes')).toBe(1);expect(spaceMarineWeaponCount(reivers.root,'Grapnel Launchers')).toBe(1);
 expect(spaceMarineModelLoadouts(reivers.root).flatMap(m=>m.items)).not.toContain('Grav-chutes');
 expect(spaceMarineWeaponCount(instance(army,'Scout Squad'),'Sniper Rifle')).toBe(2);
});

it('keeps the Imperial Fists Terminator Leader and Support distinct and White Scars repeated unit upgrades independently saved',()=>{
 const fists=build(SM_IMPERIAL_FISTS_ARMY),term=spaceMarineFormations(fists).find(f=>f.root.unit==='Terminator Squad')!;
 expect(term.models).toBe(7);expect(term.members.map(s=>s.unit)).toEqual(['Terminator Squad','Ancient In Terminator Armour','Librarian In Terminator Armour']);
 expect(spaceMarineFormationHasDeepStrike(fists,term)).toBe(true);
 const scars=build(SM_WHITE_SCARS_ARMY);expect(scars.upgrades2026?.['Invader ATVs#1']).toBe('Chogorian Huntmaster');expect(scars.upgrades2026?.['Land Speeder#1']).toBe('Chogorian Huntmaster');
 expect(spaceMarineWeaponCount(instance(scars,'Invader ATVs'),'Multi-melta')).toBe(1);expect(spaceMarineWeaponCount(instance(scars,'Invader ATVs'),'Onslaught Gatling Cannon')).toBe(1);
 expect(spaceMarineWeaponCount(instance(scars,'Assault Intercessors With Jump Packs'),'Plasma Pistol')).toBe(2);expect(spaceMarineWeaponCount(instance(scars,'Assault Intercessors With Jump Packs',2),'Plasma Pistol')).toBe(0);
});
