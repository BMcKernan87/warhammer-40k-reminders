// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {TYRANID_SHEETS} from '../src/tyranid-data';
import {tyranidKeywords} from '../src/tyranid-keywords';
import {tyranidLoadout,tyranidWeaponCount} from '../src/tyranid-loadouts';
import {setKnightGear} from '../src/knight-loadouts';
import {tyranidWarlordCandidates,selectTyranidWarlord,tyranidUnitLimit,resolvedTyranidWarlord,setTyranidCharacter,tyranidReserveAccounting} from '../src/tyranid-muster';
import {tyranidCargoFits,tyranidCargoFormations,tyranidFormations} from '../src/tyranid-transports';
import {individualArmy,setInstanceAttachment,setInstanceModelCount,autoAttachUnambiguousInstances,validateRosterInstances,reconcileInstanceAttachments,removeRosterInstance} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026,eligibleUpgrades2026} from '../src/upgrades-2026';
import {instanceBodyguards,rosterAttachmentRole,knightJoinedBodyguard} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {generate11thReminders} from '../src/reminders-11th';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],size:ArmySelection['battleSize2026']='Strike Force',detachments=['Invasion Fleet']){
 let army=individualArmy({...newSelection('Tyranids'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)army=addSelectionUnit(army,unit);
 return army;
}
const squad=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const join=(army:ArmySelection,leader:string,body:string,leaderCopy=1,bodyCopy=1)=>setInstanceAttachment(army,id(leader,leaderCopy),id(body,bodyCopy));
const errors=(army:ArmySelection)=>rosterFindings(army).filter(f=>f.severity==='error').map(f=>f.code);
const cargo=(army:ArmySelection,carrier:string,n=1)=>tyranidCargoFormations(army,squad(army,carrier,n));

it.each(TYRANID_SHEETS.map(s=>[s.unit,s] as const))('%s resolves every legal physical composition and point price in the editor',(unit,sheet)=>{
 const army=build([unit]);
 for(const models of verifiedUnitSizes2026(army,unit)!){
  const selected=setInstanceModelCount(army,id(unit),models);
  expect(validateSelection(selected)).toBe(true);
  const entry=rosterCost2026(selected).entries[0];
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('uses all eight native Leader entries and rejects two Leaders on the same Bodyguard',()=>{
 const leaders=TYRANID_SHEETS.filter(s=>s.attachmentRole);
 expect(leaders).toHaveLength(8);
 for(const sheet of leaders)expect(rosterAttachmentRole('Tyranids',sheet.unit)).toBe('leader');
 let a=build(['Hive Tyrant','The Swarmlord','Tyrant Guard','Neurotyrant','Zoanthropes','Winged Tyranid Prime','Gargoyles']);
 expect(instanceBodyguards(a,squad(a,'Neurotyrant'))).toEqual(['Neurogaunts','Tyrant Guard','Zoanthropes']);
 a=join(a,'Hive Tyrant','Tyrant Guard');
 expect(()=>join(a,'The Swarmlord','Tyrant Guard')).toThrow();
 expect(()=>join(a,'Neurotyrant','Gargoyles')).toThrow();
 a=join(a,'Neurotyrant','Zoanthropes');a=join(a,'Winged Tyranid Prime','Gargoyles');
 expect(tyranidFormations(a).find(g=>g.root.unit==='Zoanthropes')?.members.map(s=>s.unit)).toEqual(['Zoanthropes','Neurotyrant']);
});
it('preserves the chosen brood weapons through the real editor model-count mutation',()=>{
 let a=setInstanceModelCount(build(['Termagants']),id('Termagants'),20);
 const slot=tyranidLoadout('Termagants',20)!.slots[0];
 const choice=slot.choices.find(c=>c.items.filter(i=>i==='Termagant devourer').length===14&&['Shardlauncher','Spike rifle','Strangleweb'].every(name=>c.items.filter(i=>i===name).length===2))!;
 a=setKnightGear(a,id('Termagants'),slot.name,choice.name);
 a=setInstanceModelCount(a,id('Termagants'),19);
 expect(tyranidWeaponCount(squad(a,'Termagants'),'Termagant devourer')).toBe(16);
 for(const name of ['Shardlauncher','Spike rifle','Strangleweb'])expect(tyranidWeaponCount(squad(a,'Termagants'),name)).toBe(1);
 a=setInstanceModelCount(a,id('Termagants'),20);
 expect(tyranidWeaponCount(squad(a,'Termagants'),'Termagant devourer')).toBe(17);
 expect(tyranidWeaponCount(squad(a,'Termagants'),'Fleshborer')).toBe(0);
});
it('automatically attaches an unambiguous Leader and keeps its surviving unit after Bodyguard loss',()=>{
 const a=autoAttachUnambiguousInstances(build(['Hyperadapted Raveners','Raveners']));
 expect(knightJoinedBodyguard(a,squad(a,'Hyperadapted Raveners'))?.unit).toBe('Raveners');
 const surviving=a.instances!.filter(s=>s.unit!=='Raveners');
 expect(tyranidFormations(a,surviving).map(g=>g.root.unit)).toEqual(['Hyperadapted Raveners']);
});
it('rejects Deathleaper as Warlord without forcing the Swarmlord over other legal Characters',()=>{
 const a=build(['Deathleaper','Broodlord','The Swarmlord','Hyperadapted Raveners']);
 expect(tyranidWarlordCandidates(a).map(s=>s.unit)).toEqual(['Broodlord','The Swarmlord','Hyperadapted Raveners']);
 expect(()=>selectTyranidWarlord(a,id('Deathleaper'))).toThrow();
 expect(resolvedTyranidWarlord(selectTyranidWarlord(a,id('Broodlord')))?.unit).toBe('Broodlord');
 expect(errors(build(['Deathleaper']))).toContain('warlord-required');
});
it('selects at most two Subterranean Trygons and persists their Character, Warlord and upgrade choices',()=>{
 let a=build(['Trygon','Trygon','Trygon','Broodlord'],'Strike Force',['Subterranean Assault']);
 expect(eligibleUpgrades2026(a,'Trygon',id('Trygon'))).toEqual([]);
 a=setTyranidCharacter(a,id('Trygon'),true);a=setTyranidCharacter(a,id('Trygon',2),true);
 expect(()=>setTyranidCharacter(a,id('Trygon',3),true)).toThrow(/two/);
 expect(tyranidKeywords(a,squad(a,'Trygon',3)).has('CHARACTER')).toBe(false);
 a=selectUpgrade2026(a,id('Trygon'),'Trygon Prime');a=selectTyranidWarlord(a,id('Trygon'));
 expect(tyranidKeywords(a,squad(a,'Trygon')).has('SYNAPSE')).toBe(true);
 expect(tyranidKeywords(a,squad(a,'Trygon',2)).has('SYNAPSE')).toBe(false);
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));
 expect(opened.retained).toEqual([]);expect(opened.store.profiles[0].army.instances).toEqual(a.instances);
 expect(resolvedTyranidWarlord(opened.store.profiles[0].army)?.id).toBe(id('Trygon'));
 const invalid={...a,instances:a.instances!.map(s=>s.unit==='Trygon'?{...s,characterPromotion:true}:s)};
 expect(validateRosterInstances(invalid)).toBe(false);
 a=setTyranidCharacter(a,id('Trygon'),false);
 expect(a.warlordId).toBeUndefined();expect(a.upgrades2026?.[id('Trygon')]).toBeUndefined();
 expect(tyranidKeywords(a,squad(a,'Trygon')).has('SYNAPSE')).toBe(false);
});
it('removes Character promotion when Subterranean Assault is removed and rejects forged promotion',()=>{
 let a=setTyranidCharacter(build(['Trygon'],'Strike Force',['Subterranean Assault']),id('Trygon'),true);
 a=selectTyranidWarlord(a,id('Trygon'));
 const changed=reconcileInstanceAttachments({...a,detachments2026:['Invasion Fleet']});
 expect(squad(changed,'Trygon').characterPromotion).toBeUndefined();expect(changed.warlordId).toBeUndefined();
 expect(validateSelection(changed)).toBe(true);
 expect(()=>setTyranidCharacter(changed,id('Trygon'),true)).toThrow();
 expect(validateRosterInstances({...a,instances:[{...squad(a,'Trygon'),unit:'Broodlord'}],units:{Broodlord:1}})).toBe(false);
 const removed=removeRosterInstance(a,id('Trygon'));
 expect(tyranidWarlordCandidates(removed)).toEqual([]);
});
it('uses current battle-size copy limits, Warrior Battleline and both three-DP dispositions',()=>{
 const name='Tyranid Warriors With Ranged Bio-weapons';
 const normal=build([name]),warriors={...normal,detachments2026:['Warrior Bioform Onslaught']};
 expect(tyranidUnitLimit(normal,name)).toBe(3);expect(tyranidUnitLimit(warriors,name)).toBe(6);
 expect(tyranidUnitLimit({...warriors,battleSize2026:'Incursion'},name)).toBe(4);
 expect(tyranidUnitLimit(normal,'Deathleaper')).toBe(1);expect(tyranidUnitLimit(normal,'Tyrannocyte')).toBe(6);
 expect(tyranidKeywords(warriors,squad(warriors,name)).has('TYRANID WARRIORS')).toBe(true);
 expect(detachmentBudget('Tyranids',['Invasion Fleet'],'Incursion')).toMatchObject({valid:true,limit:3});
 expect(detachmentBudget('Tyranids',['Invasion Fleet'],'Strike Force').dispositions).toEqual(['Take and Hold','Priority Assets']);
 expect(detachmentBudget('Tyranids',['Subterranean Assault'],'Strike Force').dispositions).toEqual(['Disruption','Reconnaissance']);
 expect(detachmentBudget('Tyranids',['Subterranean Assault','Ambush Predators'],'Strike Force').valid).toBe(false);
});
it('keeps the Ravener Prime’s Character and Synapse keywords on its own physical model',()=>{
 const a=build(['Hyperadapted Raveners']),s=squad(a,'Hyperadapted Raveners');
 for(const key of ['CHARACTER','SYNAPSE']){
  expect(tyranidKeywords(a,s).has(key)).toBe(true);
  expect(tyranidKeywords(a,s,'Ravener Prime').has(key)).toBe(true);
  expect(tyranidKeywords(a,s,'Raveners').has(key)).toBe(false);
 }
 expect(tyranidKeywords(a,s).has('BURROWER')).toBe(true);
 expect(tyranidKeywords(a,s,'Raveners').has('BURROWER')).toBe(true);
 const plain=build(['Raveners']);
 expect(tyranidKeywords(plain,squad(plain,'Raveners')).has('BURROWER')).toBe(true);
});
it('counts every attached Infantry model and enforces the single-Monster alternative',()=>{
 let a=build(['Tyrannocyte','Broodlord','Genestealers','Neurotyrant','Neurogaunts','Psychophage','Exocrine','Hyperadapted Raveners','Raveners']);
 a=join(a,'Broodlord','Genestealers');a=join(a,'Neurotyrant','Neurogaunts');
 const options=cargo(a,'Tyrannocyte');
 expect(options.find(g=>g.root.unit==='Genestealers')).toMatchObject({models:6,spaces:18});
 expect(options.map(g=>g.root.unit)).toContain('Psychophage');
 expect(options.map(g=>g.root.unit)).not.toContain('Exocrine');
 expect(options.map(g=>g.root.unit)).not.toContain('Neurogaunts');
 expect(options.find(g=>g.root.unit==='Hyperadapted Raveners')).toMatchObject({models:5,spaces:15});
 a=join(a,'Hyperadapted Raveners','Raveners');
 expect(cargo(a,'Tyrannocyte').map(g=>g.root.unit)).not.toContain('Raveners');
 a=setInstanceModelCount(a,id('Genestealers'),10);
 expect(cargo(a,'Tyrannocyte').map(g=>g.root.unit)).not.toContain('Genestealers');
 expect(tyranidCargoFits(a,squad(a,'Tyrannocyte'),[id('Psychophage'),id('Broodlord')])).toBe(false);
});
it('can carry two distinct ten-Gaunt formations but never mixes Infantry with a Monster',()=>{
 const a=build(['Tyrannocyte','Termagants','Termagants','Psychophage']);
 const pod=squad(a,'Tyrannocyte');
 expect(tyranidCargoFits(a,pod,[id('Termagants'),id('Termagants',2)])).toBe(true);
 expect(tyranidCargoFits(a,pod,[id('Termagants'),id('Termagants')])).toBe(false);
 expect(tyranidCargoFits(a,pod,[id('Termagants'),id('Psychophage')])).toBe(false);
});
it('requires occupied Tyrannocytes and rejects circular empty-pod assignments',()=>{
 const a=build(['Tyrannocyte','Tyrannocyte','Tervigon']);
 expect(errors(a)).toContain('dedicated-transport-passengers');
 const b=addSelectionUnit(a,'Termagants');
 expect(errors(b)).not.toContain('dedicated-transport-passengers');
});
it('keeps Harridan Gargoyle and Prime limits separate while checking the complete attachment',()=>{
 let a=build(['Harridan','Gargoyles','Gargoyles','Winged Tyranid Prime','Winged Tyranid Prime']);
 a=setInstanceModelCount(a,id('Gargoyles'),20);a=join(a,'Winged Tyranid Prime','Gargoyles');
 const carrier=squad(a,'Harridan');
 expect(cargo(a,'Harridan').find(g=>g.root.id===id('Gargoyles'))).toMatchObject({models:21,usage:{gargoyles:20,primes:1}});
 expect(tyranidCargoFits(a,carrier,[id('Gargoyles')])).toBe(true);
 expect(tyranidCargoFits(a,carrier,[id('Gargoyles'),id('Gargoyles',2)])).toBe(false);
 expect(tyranidCargoFits(a,carrier,[id('Gargoyles'),id('Winged Tyranid Prime',2)])).toBe(false);
 expect(tyranidKeywords(a,carrier).has('AIRCRAFT')).toBe(false);
});
it('checks each physical Hierophant passenger for Fly, Monster status and weighted capacity',()=>{
 let a=build(['Hierophant','Tyranid Warriors With Ranged Bio-weapons','Winged Tyranid Prime','Broodlord','Genestealers','Neurotyrant','Zoanthropes']);
 const warriors='Tyranid Warriors With Ranged Bio-weapons';
 a=join(a,'Winged Tyranid Prime',warriors);a=join(a,'Broodlord','Genestealers');a=join(a,'Neurotyrant','Zoanthropes');
 expect(cargo(a,'Hierophant').map(g=>g.root.unit)).toEqual(['Genestealers']);
 a=setInstanceAttachment(a,id('Winged Tyranid Prime'),null);a=setInstanceModelCount(a,id(warriors),6);
 expect(cargo(a,'Hierophant').find(g=>g.root.unit===warriors)?.spaces).toBe(18);
 expect(tyranidCargoFits(a,squad(a,'Hierophant'),[id(warriors),id('Genestealers')])).toBe(false);
});
it('counts compulsory Aircraft while allowing actual Tyrannocyte passenger exemptions',()=>{
 const a=build(['Harpy','Harpy','Hive Crone','Broodlord'],'Incursion');
 expect(tyranidReserveAccounting(a).aircraftPoints).toBeGreaterThan(500);
 expect(errors(a)).toContain('compulsory-reserves');
 const b=addSelectionUnit(a,'Tyrannocyte');
 expect(tyranidReserveAccounting(b).possibleExemption).toBe(185);
 expect(tyranidReserveAccounting(b).minimumAircraftPoints).toBe(355);
 expect(errors(b)).not.toContain('compulsory-reserves');
 const reminder=generate11thReminders(b).find(r=>r.title==='Declare Strategic Reserves')!;
 expect(reminder.units).not.toContain(id('Tyrannocyte'));
 expect(reminder.summary).toContain('actual embarked passengers');expect(reminder.summary).toContain('If you start');
});
it('prints first-turn seeding and prohibits later embarkation without duplicating native transport cues',()=>{
 const a=build(['Tyrannocyte','Broodlord','Genestealers']);
 const rows=generate11thReminders(join(a,'Broodlord','Genestealers'));
 const seeding=rows.filter(r=>r.title===id('Tyrannocyte')+' · Aerial Seeding arrival');
 expect(seeding).toHaveLength(1);expect(seeding[0]).toMatchObject({window:'Movement',turn:'own'});
 expect(seeding[0].summary).toMatch(/first, second or third.*Immediately disembark.*more than 8″.*no unit can embark/);
 expect(seeding[0].summary).toContain('Rapid Disembark: set each model wholly within 3″');
 expect(seeding[0].summary).toContain('same ingress placement restrictions');
 expect(seeding[0].summary).toContain('cannot declare a charge until the end of the turn');
 expect(seeding[0].summary).toMatch(/too large.*base within 1″.*unengaged.*other placement restrictions/);
});
it('preserves unambiguous old unit identities and retains an ambiguous generic Warrior save',()=>{
 let a=build(['Biovores','Pyrovores','Screamer-killer']);
 const old={'Biovores':'Biovore','Pyrovores':'Pyrovore','Screamer-killer':'Screamer-Killer'} as Record<string,string>;
 const previous={...a,units:Object.fromEntries(Object.entries(a.units).map(([unit,count])=>[old[unit],count])),instances:a.instances!.map(s=>({...s,unit:old[s.unit]}))};
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(previous))));
 expect(opened.retained).toEqual([]);expect(opened.store.profiles[0].army.instances).toEqual(a.instances);
 const legacy={...a,units:{'Tyranid Warriors':1},instances:[{id:'old-warriors',unit:'Tyranid Warriors',models:3}]};
 const retained=openSavedArmies(JSON.parse(JSON.stringify(initialStore(legacy))));
 expect(retained.retained).toHaveLength(1);expect(retained.retained[0].army).toEqual(legacy);
});
