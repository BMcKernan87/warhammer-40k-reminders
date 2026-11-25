// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {MECHANICUS_SHEETS} from '../src/mechanicus-data';
import {mechanicusMusterUnits} from '../src/mechanicus-army-data';
import {mechanicusKeywords} from '../src/mechanicus-keywords';
import {mechanicusWarlordCandidates,selectMechanicusWarlord,mechanicusUnitLimit,resolvedMechanicusWarlord} from '../src/mechanicus-muster';
import {mechanicusCargoFits,mechanicusCargoFormations,mechanicusFormations} from '../src/mechanicus-transports';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {assignedAgentReminders} from '../src/assigned-agent-reminders';
import {instanceBodyguards,rosterAttachmentRole} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {generate11thReminders} from '../src/reminders-11th';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],size:ArmySelection['battleSize2026']='Strike Force',detachments=['Rad-Zone Corps']){
 let army=individualArmy({...newSelection('Adeptus Mechanicus'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)army=addSelectionUnit(army,unit);
 return army;
}
const squad=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const join=(army:ArmySelection,leader:string,body:string)=>setInstanceAttachment(army,id(leader),id(body));
const errors=(army:ArmySelection)=>rosterFindings(army).filter(f=>f.severity==='error').map(f=>f.code);

it.each(MECHANICUS_SHEETS.map(s=>[s.unit,s] as const))('%s resolves every legal model count through the native roster and published point bracket',(unit,sheet)=>{
 const army=build([unit]);
 for(const models of verifiedUnitSizes2026(army,unit)!){
  const selected=setInstanceModelCount(army,id(unit),models);
  expect(validateSelection(selected)).toBe(true);
  const entry=rosterCost2026(selected).entries[0];
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('enforces current Leader and Support roles across the published Hastarii and Battleclade routes',()=>{
 let army=build(['Tech-priest Dominus','Tech-priest Enginseer','Skitarii Marshal','Technoarcheologist','Hastarii Fusiliers','Servitor Battleclade']);
 expect(rosterAttachmentRole('Adeptus Mechanicus','Skitarii Marshal')).toBe('support');
 expect(rosterAttachmentRole('Adeptus Mechanicus','Technoarcheologist')).toBe('support');
 for(const unit of ['Hastarii Fusiliers','Hastarii Exterminators','Servitor Battleclade'])expect(instanceBodyguards(army,squad(army,'Tech-priest Enginseer'))).toContain(unit);
 army=join(join(army,'Tech-priest Dominus','Hastarii Fusiliers'),'Skitarii Marshal','Hastarii Fusiliers');
 expect(mechanicusFormations(army).find(g=>g.root.unit==='Hastarii Fusiliers')?.members).toHaveLength(3);
 expect(()=>join(army,'Tech-priest Enginseer','Hastarii Fusiliers')).toThrow();
 expect(()=>join(army,'Technoarcheologist','Hastarii Fusiliers')).toThrow();
 army=join(army,'Technoarcheologist','Servitor Battleclade');
 expect(errors(army)).not.toContain('mandatory-support');
});
it('requires a bodyguard for every Support and keeps Datasmith confined to its Robots',()=>{
 let army=build(['Cybernetica Datasmith','Kastelan Robots','Skitarii Rangers']);
 expect(errors(army)).toContain('mandatory-support');
 expect(()=>join(army,'Cybernetica Datasmith','Skitarii Rangers')).toThrow();
 army=join(army,'Cybernetica Datasmith','Kastelan Robots');
 expect(errors(army)).not.toContain('mandatory-support');
 expect(rosterAttachmentRole('Adeptus Mechanicus','Cybernetica Datasmith')).toBe('support');
});
it('counts every attached model against the Dunerider twelve and Transvector eleven seats',()=>{
 let army=build(['Tech-priest Dominus','Skitarii Marshal','Skitarii Rangers','Skorpius Dunerider','Archaeopter Transvector','Inquisitor']);
 army=join(join(army,'Tech-priest Dominus','Skitarii Rangers'),'Skitarii Marshal','Skitarii Rangers');
 const dunerider=squad(army,'Skorpius Dunerider'),transvector=squad(army,'Archaeopter Transvector');
 expect(mechanicusCargoFormations(army,dunerider).find(g=>g.root.unit==='Skitarii Rangers')?.spaces).toBe(12);
 expect(mechanicusCargoFormations(army,transvector).map(g=>g.root.unit)).not.toContain('Skitarii Rangers');
 expect(mechanicusCargoFits(army,dunerider,[id('Skitarii Rangers')])).toBe(true);
 expect(mechanicusCargoFits(army,dunerider,[id('Skitarii Rangers'),id('Skitarii Rangers')])).toBe(false);
 army=setInstanceAttachment(army,id('Tech-priest Dominus'),null);army=setInstanceAttachment(army,id('Skitarii Marshal'),null);
 army=join(army,'Inquisitor','Skitarii Rangers');
 expect(mechanicusCargoFormations(army,transvector).find(g=>g.root.unit==='Skitarii Rangers')?.spaces).toBe(11);
});
it('does not turn an Underseer or attached Tech-Priest keyword into permission for all passenger models',()=>{
 let army=build(['Servitor Battleclade','Tech-priest Dominus','Fulgurite Electro-priests','Skorpius Dunerider','Archaeopter Transvector','Sydonian Skatros','Pteraxii Skystalkers','Kataphron Breachers']);
 army=join(army,'Tech-priest Dominus','Fulgurite Electro-priests');
 const dunerider=squad(army,'Skorpius Dunerider'),transvector=squad(army,'Archaeopter Transvector');
 expect(mechanicusCargoFormations(army,dunerider).map(g=>g.root.unit)).toEqual(expect.arrayContaining(['Servitor Battleclade','Fulgurite Electro-priests']));
 for(const unit of ['Servitor Battleclade','Fulgurite Electro-priests','Sydonian Skatros','Pteraxii Skystalkers','Kataphron Breachers'])expect(mechanicusCargoFormations(army,transvector).map(g=>g.root.unit)).not.toContain(unit);
 for(const unit of ['Sydonian Skatros','Pteraxii Skystalkers','Kataphron Breachers'])expect(mechanicusCargoFormations(army,dunerider).map(g=>g.root.unit)).not.toContain(unit);
 expect(mechanicusKeywords(army,squad(army,'Servitor Battleclade'),'Servitor Underseer')).toContain('TECH-PRIEST');
 expect(mechanicusKeywords(army,squad(army,'Servitor Battleclade'),'Combat Servitor')).not.toContain('TECH-PRIEST');
 expect(mechanicusWarlordCandidates(army).map(s=>s.unit)).toEqual(['Tech-priest Dominus']);
});
it('applies the actual Amplificator grant to its whole formation without granting it to a duplicate squad',()=>{
 let army=join(build(['Tech-priest Dominus','Fulgurite Electro-priests','Fulgurite Electro-priests','Archaeopter Transvector'],'Strike Force',['Eradication Cohort']),'Tech-priest Dominus','Fulgurite Electro-priests');
 army=selectUpgrade2026(army,id('Tech-priest Dominus'),'Martial Signatum Amplificator');
 expect(mechanicusKeywords(army,squad(army,'Fulgurite Electro-priests'),'Fulgurite Electro-Priest')).toContain('SKITARII');
 expect(mechanicusKeywords(army,squad(army,'Fulgurite Electro-priests',2))).not.toContain('SKITARII');
 const ids=mechanicusCargoFormations(army,squad(army,'Archaeopter Transvector')).map(g=>g.root.id);
 expect(ids).toContain(id('Fulgurite Electro-priests'));expect(ids).not.toContain(id('Fulgurite Electro-priests',2));
 const legacy={...army,upgrades2026:undefined,instances:army.instances!.map(s=>s.unit==='Tech-priest Dominus'?{...s,enhancement:'Martial Signatum Amplificator'}:s)};
 expect(mechanicusKeywords(legacy,squad(legacy,'Fulgurite Electro-priests'))).toContain('SKITARII');
 army=setInstanceAttachment(army,id('Tech-priest Dominus'),null);
 expect(mechanicusKeywords(army,squad(army,'Fulgurite Electro-priests'))).not.toContain('SKITARII');
});
it('requires different whole passengers for multiple dedicated transports and excludes orphaned Supports',()=>{
 const army=build(['Tech-priest Dominus','Skitarii Rangers','Skorpius Dunerider','Skorpius Dunerider']);
 const attached=join(army,'Tech-priest Dominus','Skitarii Rangers');
 expect(errors(attached)).toContain('dedicated-transport-passengers');
 expect(errors(army)).not.toContain('dedicated-transport-passengers');
 const support=build(['Skitarii Marshal','Skorpius Dunerider']);
 expect(mechanicusCargoFormations(support,squad(support,'Skorpius Dunerider'))).toEqual([]);
 const invalid={...support,instances:support.instances!.map(s=>s.unit==='Skitarii Marshal'?{...s,attachedTo:'missing'}:s)};
 expect(mechanicusCargoFormations(invalid,squad(invalid,'Skorpius Dunerider'))).toEqual([]);
});
it('selects a Supreme Commander when present and never selects Skatros or an allied Character as Warlord',()=>{
 let army=build(['Tech-priest Dominus','Belisarius Cawl','Thulia Ghuld','Sydonian Skatros','Inquisitor']);
 expect(mechanicusWarlordCandidates(army).map(s=>s.unit)).toEqual(['Belisarius Cawl','Thulia Ghuld']);
 expect(resolvedMechanicusWarlord(army)).toBeUndefined();
 expect(()=>selectMechanicusWarlord(army,id('Tech-priest Dominus'))).toThrow();
 expect(()=>selectMechanicusWarlord(army,id('Inquisitor'))).toThrow();
 army=selectMechanicusWarlord(army,id('Thulia Ghuld'));expect(resolvedMechanicusWarlord(army)?.unit).toBe('Thulia Ghuld');
 const lone=build(['Sydonian Skatros','Inquisitor']);expect(mechanicusWarlordCandidates(lone)).toEqual([]);expect(errors(lone)).toContain('warlord-required');
});
it('enforces battle-size copies, Aircraft reserves and Imperial ally restrictions',()=>{
 let army=build(['Tech-priest Dominus'],'Incursion');
 expect(mechanicusUnitLimit(army,'Skitarii Rangers')).toBe(4);expect(mechanicusUnitLimit(army,'Kataphron Breachers')).toBe(2);expect(mechanicusUnitLimit(army,'Belisarius Cawl')).toBe(1);
 expect(mechanicusMusterUnits(army)).not.toContain('Warhound Titan');expect(mechanicusMusterUnits(army)).not.toContain('Secutarii Hoplites');
 for(const name of ['Archaeopter Fusilave','Archaeopter Fusilave','Archaeopter Stratoraptor','Archaeopter Stratoraptor'])army=addSelectionUnit(army,name);
 expect(errors(army)).toContain('compulsory-reserves');
 const transvectors=build(['Tech-priest Dominus','Archaeopter Transvector','Archaeopter Transvector'],'Incursion');
 expect(errors(transvectors)).not.toContain('compulsory-reserves');
 const allies=build(['Tech-priest Dominus','Inquisitor','Inquisitor Greyfax'],'Incursion');expect(errors(allies)).toContain('assigned-agents-character');
});
it('keeps DATA-PSALM combinations exclusive and names actual Recon recipients',()=>{
 expect(detachmentBudget('Adeptus Mechanicus',['Data-Psalm Conclave','Luminen Auto-choir'],'Strike Force').valid).toBe(false);
 const army=build(['Skitarii Rangers','Skitarii Vanguard'],'Strike Force',['Cohort Acquisitus']);
 expect(mechanicusKeywords(army,squad(army,'Skitarii Rangers'))).toContain('RECON AUGURY');
 expect(mechanicusKeywords(army,squad(army,'Skitarii Vanguard'))).not.toContain('RECON AUGURY');
});
it('deducts compulsory Aircraft from optional starting reserves while keeping Transvector optional',()=>{
 const army=build(['Tech-priest Dominus','Archaeopter Fusilave','Archaeopter Transvector'],'Incursion');
 const reserve=generate11thReminders(army).find(r=>r.title==='Declare Strategic Reserves')!;
 expect(reserve.summary).toContain('After compulsory Aircraft, 340 points remain');
 expect(reserve.units).not.toContain(id('Archaeopter Fusilave'));
 expect(reserve.units).toContain(id('Archaeopter Transvector'));
});
it('includes native Battleline in an allied Rogue Trader redeployment reminder',()=>{
 const army=build(['Tech-priest Dominus','Skitarii Rangers','Rogue Trader Entourage']);
 expect(assignedAgentReminders(army).find(r=>r.title.endsWith('Warrant of Trade'))?.units).toContain(id('Skitarii Rangers'));
});
it('retains allied weapon and Hit effects only during a permitted normal return-fire reaction',()=>{
 const army=join(build(['Inquisitor Greyfax','Skitarii Rangers'],'Strike Force',['Eradication Cohort']),'Inquisitor Greyfax','Skitarii Rangers');
 const rows=assignedAgentReminders(army);
 expect(rows.find(r=>r.title.endsWith('No Mercy')&&r.window==='Shooting'&&r.turn==='opponent')?.summary).toContain('Analytic Reprisals');
 expect(rows.some(r=>r.title.endsWith('No Mercy')&&r.window==='Movement')).toBe(false);
 expect(rows.find(r=>r.id.endsWith('weapons-Shooting-mechanicus-reaction'))?.summary).toContain('surviving models');
 expect(assignedAgentReminders({...army,detachments2026:['Rad-Zone Corps']}).some(r=>r.id.endsWith('mechanicus-reaction'))).toBe(false);
});
it('reopens old Dominus and detachment names while retaining squad identity and Warlord reference',()=>{
 const army=selectMechanicusWarlord(build(['Tech-priest Dominus','Skitarii Rangers']),id('Tech-priest Dominus'));
 const old=JSON.parse(JSON.stringify(initialStore(army)).replaceAll('Tech-priest Dominus','Tech-Priest Dominus').replaceAll('Rad-Zone Corps','Rad-zone Corps'));
 const opened=openSavedArmies(old);expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.units['Tech-priest Dominus']).toBe(1);expect(saved.detachments2026).toEqual(['Rad-Zone Corps']);
 expect(saved.instances?.find(s=>s.unit==='Tech-priest Dominus')?.id).toBe('Tech-Priest Dominus#1');
 expect(saved.warlordId).toBe('Tech-Priest Dominus#1');expect(validateSelection(saved)).toBe(true);
});
