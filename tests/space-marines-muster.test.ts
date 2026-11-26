// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,CATALOG,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {DATASHEETS_2026,rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {SM_SHEETS,spaceMarineAgentName} from '../src/space-marines-data';
import {spaceMarineLoadout,spaceMarineModelLoadouts,spaceMarineWeaponCount} from '../src/space-marines-loadouts';
import {spaceMarineKeywords} from '../src/space-marines-keywords';
import {spaceMarineChapter,spaceMarineMusterUnits} from '../src/space-marines-muster-data';
import {spaceMarineUnitLimit,spaceMarineWarlordCandidates,resolvedSpaceMarineWarlord,selectSpaceMarineWarlord,spaceMarineMandatoryReservePoints} from '../src/space-marines-muster';
import {spaceMarineCargoFits,spaceMarineCargoFormations,spaceMarineDedicatedSatisfied,spaceMarineTransportReminders,spaceMarineFormations} from '../src/space-marines-transports';
import {spaceMarineDoctrineAllowance,spaceMarineDoctrineReminders} from '../src/space-marines-doctrines';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount,setInstanceEquipment,autoAttachUnambiguousInstances,reconcileInstanceAttachments,removeRosterInstance,validateRosterInstances} from '../src/roster-instances';
import {knightLoadoutFor,setKnightGear} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026,eligibleUpgrades2026} from '../src/upgrades-2026';
import {instanceBodyguards,rosterAttachmentRole,knightJoinedBodyguard} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {migrateSavedArmy} from '../src/migrate-saved-army';
import {generate11thReminders} from '../src/reminders-11th';
import {assignedAgentReminders} from '../src/assigned-agent-reminders';
import {agentTransports} from '../src/agent-transports';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],detachments=['Gladius Task Force'],size:ArmySelection['battleSize2026']='Strike Force'){
 let army=individualArmy({...newSelection('Space Marines'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)army=addSelectionUnit(army,unit);return army;
}
const squad=(a:ArmySelection,unit:string,n=1)=>a.instances!.find(s=>s.id===id(unit,n))!;
const join=(a:ArmySelection,leader:string,body:string,leaderCopy=1,bodyCopy=1)=>setInstanceAttachment(a,id(leader,leaderCopy),id(body,bodyCopy));
const errors=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
const cargo=(a:ArmySelection,unit:string,n=1)=>spaceMarineCargoFormations(a,squad(a,unit,n));

it('exposes 97 current native cards and distinct assigned agents without Legends',()=>{
 expect(SM_SHEETS).toHaveLength(97);
 for(const name of ['Tactical Squad','Devastator Squad','Predator Annihilator','Kill Team Cassius','Eradicator Squad'])expect(CATALOG['Space Marines'].units).not.toContain(name);
 for(const name of ['Astraeus','Thunderhawk Gunship','Captain Titus','Decimus Kill Team','Watch Master','Watch Master (Assigned Agent)','Corvus Blackstar','Corvus Blackstar (Assigned Agent)'])expect(CATALOG['Space Marines'].units).toContain(name);
 expect(new Set(DATASHEETS_2026.filter(s=>s.faction==='Space Marines').map(s=>s.unit)).size).toBe(DATASHEETS_2026.filter(s=>s.faction==='Space Marines').length);
});
it.each(SM_SHEETS.map(s=>[s.unit,s] as const))('%s uses the current physical models and prices through the shared editor',(unit,sheet)=>{
 const a=build([unit]);
 for(const models of verifiedUnitSizes2026(a,unit)!){
  const changed=setInstanceModelCount(a,id(unit),models),entry=rosterCost2026(changed).entries[0];
  expect(validateSelection(changed),unit+' '+models).toBe(true);
  expect(spaceMarineModelLoadouts(squad(changed,unit))).toHaveLength(models);
  expect(knightLoadoutFor('Space Marines',unit,models)).toBeDefined();
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('infers actual named chapters and retains neutral model keywords',()=>{
 const a=build(['Marneus Calgar','Captain','Intercessor Squad']);
 expect(spaceMarineChapter(a)).toBe('ULTRAMARINES');
 expect(spaceMarineMusterUnits(a)).toContain('Captain Titus');expect(spaceMarineMusterUnits(a)).not.toContain('Vulkan He’stan');
 expect(spaceMarineKeywords(a,squad(a,'Captain'))).not.toContain('ULTRAMARINES');
 expect(errors(build(['Marneus Calgar','Vulkan He’stan']))).toContain('space-marines-chapter-conflict');
 expect(spaceMarineChapter(build(['Captain'],['Medusa’s Wrath']))).toBe('IRON HANDS');
});
it('allows Deathwatch Support alongside one host Chapter without applying host Deathwatch restrictions',()=>{
 const a=build(['Vulkan He’stan','Deathwatch Veterans','Scout Squad'],['Forgefather’s Seekers','Deathwatch Support']);
 expect(spaceMarineChapter(a)).toBe('SALAMANDERS');expect(spaceMarineMusterUnits(a)).toContain('Deathwatch Veterans');
 expect(spaceMarineMusterUnits(a)).toContain('Scout Squad');expect(errors(a)).not.toContain('space-marines-chapter-conflict');
 const dw=build(['Watch Master'],['Black Spear Task Force']);
 expect(spaceMarineChapter(dw)).toBe('DEATHWATCH');
 for(const unit of ['Scout Squad','Terminator Squad','Terminator Assault Squad','Marneus Calgar'])expect(spaceMarineMusterUnits(dw)).not.toContain(unit);
 expect(spaceMarineMusterUnits(dw)).toContain('Deathwatch Terminator Squad');expect(spaceMarineMusterUnits(dw)).toContain('Captain');
});
it('enforces the Deathwatch ally budget and native/assigned Warlord distinction',()=>{
 const a=build(['Captain','Watch Master','Fortis Kill Team','Indomitor Kill Team','Deathwatch Veterans'],['Deathwatch Support']);
 expect(errors(a)).toContain('space-marines-deathwatch-allowance');
 expect(spaceMarineWarlordCandidates(a).map(s=>s.unit)).toEqual(['Captain']);
 expect(()=>selectSpaceMarineWarlord(a,id('Watch Master'))).toThrow();
 expect(spaceMarineWarlordCandidates(build(['Watch Master','Watch Master (Assigned Agent)'],['Black Spear Task Force'])).map(s=>s.unit)).toEqual(['Watch Master']);
});
it('uses source-verified generic Deathwatch attachment lists without inventing personal keywords',()=>{
 const a=join(build(['Captain','Fortis Kill Team','Corvus Blackstar'],['Black Spear Task Force']),'Captain','Fortis Kill Team');
 expect(instanceBodyguards(a,squad(a,'Captain'))).toContain('Fortis Kill Team');
 expect(knightJoinedBodyguard(a,squad(a,'Captain'))?.unit).toBe('Fortis Kill Team');
 expect(spaceMarineKeywords(a,squad(a,'Captain'),'Captain')).not.toContain('DEATHWATCH');
 expect(cargo(a,'Corvus Blackstar').some(g=>g.root.unit==='Fortis Kill Team')).toBe(false);
 const watch=join(build(['Watch Master','Fortis Kill Team','Corvus Blackstar'],['Black Spear Task Force']),'Watch Master','Fortis Kill Team');
 expect(cargo(watch,'Corvus Blackstar').find(g=>g.root.unit==='Fortis Kill Team')).toMatchObject({models:11,spaces:11});
});
it('changes Cato to mandatory Support with Calgar and reconciles the slot when Calgar leaves',()=>{
 let a=build(['Cato Sicarius','Victrix Honour Guard']);
 expect(rosterAttachmentRole('Space Marines','Cato Sicarius',a)).toBe('leader');
 a=setInstanceAttachment(a,id('Cato Sicarius'),null);expect(squad(a,'Cato Sicarius').keepUnattached).toBe(true);
 a=autoAttachUnambiguousInstances(addSelectionUnit(a,'Marneus Calgar'));
 expect(rosterAttachmentRole('Space Marines','Cato Sicarius',a)).toBe('support');
 expect(squad(a,'Cato Sicarius').keepUnattached).toBeUndefined();
 expect(squad(a,'Cato Sicarius').attachedTo).toBe(id('Victrix Honour Guard'));
 expect(squad(a,'Marneus Calgar').attachedTo).toBe(id('Victrix Honour Guard'));
 expect(validateRosterInstances(a)).toBe(true);
 const removed=removeRosterInstance(a,id('Marneus Calgar'));
 expect(rosterAttachmentRole('Space Marines','Cato Sicarius',removed)).toBe('leader');expect(validateRosterInstances(removed)).toBe(true);
});
it('permits only one actual Leader and Support and retains survivors in their original formation',()=>{
 let a=build(['Captain','Lieutenant','Ancient','Intercessor Squad']);
 a=join(join(a,'Captain','Intercessor Squad'),'Lieutenant','Intercessor Squad');
 expect(()=>join(a,'Ancient','Intercessor Squad')).toThrow();
 const survivors=a.instances!.filter(s=>['Captain','Lieutenant'].includes(s.unit));
 expect(spaceMarineFormations(a,survivors)).toHaveLength(1);expect(spaceMarineFormations(a,survivors)[0].models).toBe(2);
 expect(errors(a)).toContain('mandatory-support');
});
it('requires Guilliman as Warlord and recognises the actual Company Heroes Ancient',()=>{
 const a=build(['Captain','Company Heroes','Roboute Guilliman']);
 expect(spaceMarineKeywords(a,squad(a,'Company Heroes'),'Ancient')).toContain('CHARACTER');
 expect(spaceMarineKeywords(a,squad(a,'Company Heroes'),'Company Champion')).not.toContain('CHARACTER');
 expect(spaceMarineWarlordCandidates(a).map(s=>s.unit)).toEqual(['Roboute Guilliman']);
 expect(resolvedSpaceMarineWarlord(a)?.unit).toBe('Roboute Guilliman');expect(()=>selectSpaceMarineWarlord(a,id('Captain'))).toThrow();
 const company=build(['Company Heroes']);expect(resolvedSpaceMarineWarlord(company)?.unit).toBe('Company Heroes');
});
it('limits optional Victrix Epic Hero models individually while allowing ordinary squads',()=>{
 let a=build(['Captain','Victrix Honour Guard','Victrix Honour Guard']);
 expect(spaceMarineUnitLimit(a,'Victrix Honour Guard')).toBe(3);
 const field=spaceMarineLoadout('Victrix Honour Guard',3)!.slots.find(s=>s.choices.some(c=>c.name==='Chapter Ancient'))!;
 a=setKnightGear(a,id('Victrix Honour Guard'),field.name,'Chapter Ancient');
 expect(spaceMarineKeywords(a,squad(a,'Victrix Honour Guard'))).toContain('EPIC HERO');
 expect(spaceMarineKeywords(a,squad(a,'Victrix Honour Guard',2))).not.toContain('EPIC HERO');
 expect(errors(a)).not.toContain('space-marines-epic-model');
 a=setKnightGear(a,id('Victrix Honour Guard',2),field.name,'Chapter Ancient');expect(errors(a)).toContain('space-marines-epic-model');
});
it('prices intermediate counts at the next printed bracket and keeps later-copy escalation',()=>{
 const a=build(['Intercessor Squad','Fortis Kill Team','Fortis Kill Team','Fortis Kill Team']);
 const six=setInstanceModelCount(a,id('Intercessor Squad'),6),ten=setInstanceModelCount(a,id('Intercessor Squad'),10);
 expect(rosterCost2026(six).entries[0].points).toBe(rosterCost2026(ten).entries[0].points);
 const entries=rosterCost2026(a).entries.filter(e=>e.unit==='Fortis Kill Team');expect(entries.map(e=>e.points)).toEqual([210,210,225]);
});
it('counts attached Gravis models twice without rejecting a legal Impulsor passenger',()=>{
 let a=join(build(['Captain In Gravis Armour','Aggressor Squad','Impulsor','Repulsor Executioner','Land Raider']),'Captain In Gravis Armour','Aggressor Squad');
 expect(cargo(a,'Impulsor')).toEqual([]);expect(cargo(a,'Repulsor Executioner')).toEqual([]);
 expect(cargo(a,'Land Raider').find(g=>g.root.unit==='Aggressor Squad')).toMatchObject({models:4,spaces:8});
 a=setInstanceAttachment(a,id('Captain In Gravis Armour'),null);
 expect(cargo(a,'Impulsor').find(g=>g.root.unit==='Aggressor Squad')).toMatchObject({models:3,spaces:6});
 expect(spaceMarineCargoFits(a,squad(a,'Impulsor'),[id('Aggressor Squad'),id('Captain In Gravis Armour')])).toBe(false);
});
it('counts mixed Decimus Gravis and Talonstrike Jump Pack models physically',()=>{
 const a=build(['Watch Master','Decimus Kill Team','Talonstrike Kill Team','Corvus Blackstar','Repulsor','Rhino'],['Black Spear Task Force']);
 const mixed=cargo(a,'Corvus Blackstar').find(g=>g.root.unit==='Decimus Kill Team')!;
 expect(mixed.models).toBe(5);expect(mixed.spaces).toBe(6);
 expect(cargo(a,'Corvus Blackstar').some(g=>g.root.unit==='Talonstrike Kill Team')).toBe(false);
 expect(cargo(a,'Rhino').some(g=>g.root.unit==='Decimus Kill Team')).toBe(false);
 expect(cargo(a,'Repulsor').some(g=>g.root.unit==='Talonstrike Kill Team')).toBe(false);
});
it('counts Mounted models four times in a Thunderhawk and excludes them from ordinary carriers',()=>{
 const a=join(build(['Captain on Bike','Outrider Squad','Thunderhawk Gunship','Land Raider']),'Captain on Bike','Outrider Squad');
 expect(cargo(a,'Thunderhawk Gunship').find(g=>g.root.unit==='Outrider Squad')).toMatchObject({models:4,spaces:16});
 expect(cargo(a,'Land Raider')).toEqual([]);
});
it('matches distinct Dedicated Transport passengers without greedy assignment or reuse',()=>{
 const a=build(['Captain In Gravis Armour','Aggressor Squad','Intercessor Squad','Impulsor','Rhino']);
 expect(spaceMarineDedicatedSatisfied(a)).toBe(true);
 const tooMany=build(['Captain In Gravis Armour','Aggressor Squad','Impulsor','Impulsor','Impulsor']);
 expect(spaceMarineDedicatedSatisfied(tooMany)).toBe(false);
 expect(spaceMarineDedicatedSatisfied(join(build(['Captain','Intercessor Squad','Rhino','Rhino']),'Captain','Intercessor Squad'))).toBe(false);
});
it('uses Inquisitorial Authority only for an attached eligible Bodyguard and counts the Inquisitor',()=>{
 let a=join(build(['Inquisitor','Intercessor Squad','Rhino','Impulsor']),'Inquisitor','Intercessor Squad');
 expect(cargo(a,'Impulsor').find(g=>g.root.unit==='Intercessor Squad')).toMatchObject({models:6,spaces:6});
 a=setInstanceModelCount(a,id('Intercessor Squad'),7);
 expect(cargo(a,'Impulsor')).toEqual([]);expect(cargo(a,'Rhino')[0]).toMatchObject({models:8,spaces:8});
 const alone=build(['Inquisitor','Rhino']);expect(cargo(alone,'Rhino')).toEqual([]);
 expect(assignedAgentReminders(a).some(r=>r.title.includes('Authority of the Inquisition'))).toBe(true);
});
it('does not confuse native Deathwatch rules with the same-named Assigned Agents',()=>{
 const a=build(['Watch Master','Watch Master (Assigned Agent)','Deathwatch Veterans','Deathwatch Kill Team','Corvus Blackstar','Corvus Blackstar (Assigned Agent)'],['Black Spear Task Force']);
 expect(spaceMarineAgentName('Watch Master')).toBeUndefined();expect(spaceMarineAgentName('Watch Master (Assigned Agent)')).toBe('Watch Master');
 const rows=assignedAgentReminders(a);expect(rows.some(r=>r.units?.includes(id('Watch Master')))).toBe(false);
 expect(rows.some(r=>r.units?.includes(id('Watch Master (Assigned Agent)')))).toBe(true);
 expect(agentTransports(a).cues.some(r=>r.units?.includes(id('Corvus Blackstar')))).toBe(false);
 expect(agentTransports(a).cues.some(r=>r.units?.includes(id('Corvus Blackstar (Assigned Agent)')))).toBe(true);
});
it('keeps current assault/shock/Drop Pod disembarkation and emergency rules',()=>{
 const a=build(['Captain','Intercessor Squad','Impulsor','Land Raider','Drop Pod','Repulsor']);
 const rows=spaceMarineTransportReminders(a);
 expect(rows.find(r=>r.title.endsWith('· Assault Ramp'))?.summary).toContain('Normal move');
 expect(rows.find(r=>r.title.endsWith('· Rapid Disembarkation'))?.summary).toContain('Advance move');
 expect(rows.find(r=>r.title.endsWith('· Combat Embarkation'))).toMatchObject({window:'Charge',turn:'opponent'});
 expect(rows.find(r=>r.title.endsWith('· Drop Pod Assault')&&r.window==='Movement')?.summary).toContain('more than 8″');
 expect(rows.some(r=>r.title===id('Drop Pod')+' · Embarkation')).toBe(false);
 expect(rows.find(r=>r.title.endsWith('· Emergency disembarkation'))?.summary).toContain('before Deadly Demise');
});
it('requires every Thunderhawk passenger model to have Deep Strike for Aerial Assault',()=>{
 const a=build(['Captain In Terminator Armour','Terminator Squad','Intercessor Squad','Thunderhawk Gunship']);
 const joined=join(a,'Captain In Terminator Armour','Terminator Squad');
 const text=spaceMarineTransportReminders(joined).find(r=>r.title.endsWith('· Aerial Assault'))!.summary;
 expect(text).toContain(id('Terminator Squad'));expect(text).not.toContain(id('Intercessor Squad'));
});
it('reserves Drop Pods without treating Fly-only Thunderhawks as Aircraft',()=>{
 const a=build(['Captain','Drop Pod','Thunderhawk Gunship']);
 const costs=rosterCost2026(a).entries;
 expect(spaceMarineMandatoryReservePoints(a)).toBe(costs.find(e=>e.unit==='Drop Pod')!.points);
 expect(errors(a)).not.toContain('mandatory-reserves-limit');
 expect(spaceMarineKeywords(a,squad(a,'Thunderhawk Gunship'))).not.toContain('AIRCRAFT');
 expect(generate11thReminders(a).find(r=>r.title==='Declare Strategic Reserves')?.summary).toContain('Aircraft and Drop Pods');
});
it('applies every current Unique detachment group without treating unrelated one-DP detachments as exclusive',()=>{
 for(const group of [['Assault Brethren','Tactical Brethren'],['Phobos Shadow Force','Shadowmark Talon'],['Tacticus Attack Force','Tacticus Firestorm Force'],['Gravis Linebreaker Force','Gravis Siege Force'],['Ironstorm Spearhead',"Medusa's Wrath"]])expect(detachmentBudget('Space Marines',group,'Strike Force').valid).toBe(false);
 expect(detachmentBudget('Space Marines',['Gladius Task Force'],'Incursion')).toMatchObject({valid:true,spent:3,limit:3});
 expect(detachmentBudget('Space Marines',['Ironclad Champions','Gauntlet Task Force','Terminator Storm Force'],'Strike Force')).toMatchObject({valid:true,spent:3});
});
it('adds doctrine selections only through the actual selected detachment and Calgar condition',()=>{
 expect(spaceMarineDoctrineAllowance(build(['Captain'],['Assault Brethren'])).allowance).toEqual({Assault:2,Devastator:1,Tactical:1});
 expect(spaceMarineDoctrineAllowance(build(['Captain'],['Forgefather’s Seekers'])).allowance.Devastator).toBe(2);
 expect(spaceMarineDoctrineAllowance(build(['Captain'],['Blade of Ultramar'])).allowance).toEqual({Assault:1,Devastator:1,Tactical:1});
 expect(spaceMarineDoctrineAllowance(build(['Marneus Calgar'],['Blade of Ultramar'])).allowance).toEqual({Assault:2,Devastator:2,Tactical:2});
 expect(spaceMarineDoctrineAllowance(build(['Captain'],['Gladius Task Force'])).choices).toHaveLength(1);
});
it('uses the chosen surviving Warlord for Transhuman Strategist and replaces Oath with Combat Doctrines',()=>{
 const a=selectSpaceMarineWarlord(build(['Captain','Librarian','Intercessor Squad']),id('Captain'));
 const rows=spaceMarineDoctrineReminders(a);
 expect(rows.find(r=>r.title.includes('Transhuman Strategist'))?.units).toEqual([id('Captain')]);
 expect(spaceMarineDoctrineReminders(a,a.instances!.filter(s=>s.unit!=='Captain')).some(r=>r.title.includes('Transhuman Strategist'))).toBe(false);
 expect(rows.find(r=>r.id==='11e-sm-combat-doctrines')).toMatchObject({window:'Command',turn:'own',timing:'start'});
 expect(rows.find(r=>r.id==='11e-sm-librarius-budget')?.units).toEqual([id('Librarian')]);
 expect(generate11thReminders(a).some(r=>r.title.includes('Oath of Moment'))).toBe(false);
});
it('restricts Kill Team enhancements to Deathwatch Support while preserving an attached generic Beacon bearer',()=>{
 const a=join(build(['Captain','Fortis Kill Team'],['Gauntlet Task Force','Deathwatch Support']),'Captain','Fortis Kill Team');
 expect(eligibleUpgrades2026(a,'Captain',id('Captain')).map(u=>u.name)).toEqual(['Beacon Angelis']);
 expect(validateSelection(selectUpgrade2026(a,id('Captain'),'Beacon Angelis'))).toBe(true);
});
it('migrates current spelling and the split Eradicator datasheet without changing assigned IDs',()=>{
 const saved={...build(['Captain']),detachments2026:["Forgefather's Seekers"],units:{'Eradicator Squad':1},instances:[{id:'old-eradicators',unit:'Eradicator Squad',models:3}]};
 const migrated=migrateSavedArmy(saved) as ArmySelection;
 expect(migrated.detachments2026).toEqual(['Forgefather’s Seekers']);
 expect(migrated.instances).toEqual([{id:'old-eradicators',unit:'Eradicator Squad with Melta Rifles',models:3}]);expect(validateSelection(migrated)).toBe(true);
});
it.each([
 ['Aggressor Squad','Auto boltstorm gauntlets and fragstorm grenade launcher','Auto Boltstorm Gauntlets','Flamestorm Gauntlets'],
 ['Inceptor Squad','Plasma exterminators','Plasma Exterminators','Assault Bolters'],
] as const)('preserves %s weapons from both aggregate and individual saved armies',(unit,equipment,weapon,stock)=>{
 const aggregate={...newSelection('Space Marines'),units:{[unit]:1},equipment:{[unit]:equipment}};
 const individual={...aggregate,instances:[{id:id(unit),unit,models:3,equipment}]};
 for(const saved of [aggregate,individual]){
  const reopened=individualArmy(migrateSavedArmy(JSON.parse(JSON.stringify(saved))) as ArmySelection);
  const actual=expandRoster(reopened)[0];
  expect(validateSelection(reopened)).toBe(true);
  expect(spaceMarineWeaponCount(actual,weapon)).toBe(3);expect(spaceMarineWeaponCount(actual,stock)).toBe(0);
  if(unit==='Aggressor Squad')expect(spaceMarineWeaponCount(actual,'Fragstorm Grenade Launcher')).toBe(3);
  const profiles=generate11thReminders(reopened).find(r=>r.title===id(unit)+' · Ranged weapon profiles'&&r.window==='Shooting')!.summary;
  expect(profiles).toContain('3 × '+weapon);expect(profiles).not.toContain(stock);
 }
});
it('keeps an explicit current weapon choice and still accepts an intentional older picker change',()=>{
 let a=build(['Inceptor Squad']);
 a=setKnightGear(a,id('Inceptor Squad'),'Unit weapons','Plasma Exterminators');
 expect(squad(a,'Inceptor Squad').equipment).toBe('Assault bolters');
 expect(spaceMarineWeaponCount(expandRoster(a)[0],'Plasma Exterminators')).toBe(3);
 a=setInstanceEquipment(a,id('Inceptor Squad'),'Assault bolters');
 expect(spaceMarineWeaponCount(expandRoster(a)[0],'Assault Bolters')).toBe(3);
 expect(spaceMarineWeaponCount(expandRoster(a)[0],'Plasma Exterminators')).toBe(0);
});
it('does not leave a Cato role conflict after attachment reconciliation',()=>{
 let a=join(join(build(['Cato Sicarius','Marneus Calgar','Captain','Victrix Honour Guard']),'Cato Sicarius','Victrix Honour Guard'),'Captain','Victrix Honour Guard');
 const units={...a.units};delete units['Marneus Calgar'];a={...a,units,instances:a.instances!.filter(s=>s.unit!=='Marneus Calgar')};
 const fixed=reconcileInstanceAttachments(a);expect(validateRosterInstances(fixed)).toBe(true);
 expect(fixed.instances!.filter(s=>s.attachedTo===id('Victrix Honour Guard'))).toHaveLength(1);
});
