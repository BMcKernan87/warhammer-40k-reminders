// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {SORORITAS_SHEETS} from '../src/sororitas-data';
import {sororitasAgentName,sororitasMusterUnits,sororitasKeywords} from '../src/sororitas-army-data';
import {sororitasWarlordCandidates,selectSororitasWarlord,sororitasUnitLimit} from '../src/sororitas-muster';
import {sororitasCargoFits,sororitasCargoFormations,sororitasDedicatedSatisfied,sororitasFormations,sororitasSplitCargoFormations} from '../src/sororitas-transports';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026,upgradeError2026} from '../src/upgrades-2026';
import {assignedAgentReminders} from '../src/assigned-agent-reminders';
import {instanceBodyguards} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],size:ArmySelection['battleSize2026']='Strike Force',detachments=['Army of Faith']){
 let army=individualArmy({...newSelection('Adepta Sororitas'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)army=addSelectionUnit(army,unit);
 return army;
}
const squad=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const join=(army:ArmySelection,leader:string,body:string)=>setInstanceAttachment(army,id(leader),id(body));
const errors=(army:ArmySelection)=>rosterFindings(army).filter(f=>f.severity==='error').map(f=>f.code);

it.each(SORORITAS_SHEETS.map(s=>[s.unit,s] as const))('%s resolves every legal strength through the real roster and current native price',(unit,sheet)=>{
 const army=build([unit]);
 for(const models of verifiedUnitSizes2026(army,unit)!){
  const selected=setInstanceModelCount(army,id(unit),models);
  expect(validateSelection(selected)).toBe(true);
  const entry=rosterCost2026(selected).entries[0];
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('keeps native and assigned Priests, Sanctifiers and Sisters rules and prices distinct',()=>{
 const army=build(['Canoness','Ministorum Priest','Ministorum Priest (Assigned Agent)','Sanctifiers','Sanctifiers (Assigned Agent)','Battle Sisters Squad','Sisters of Battle Squad']);
 expect(sororitasAgentName('Ministorum Priest')).toBeUndefined();
 expect(sororitasAgentName('Sanctifiers')).toBeUndefined();
 expect(sororitasAgentName('Ministorum Priest (Assigned Agent)')).toBe('Ministorum Priest');
 const reminders=assignedAgentReminders(army);
 expect(reminders.some(r=>r.units?.includes(id('Sanctifiers')))).toBe(false);
 expect(reminders.some(r=>r.units?.includes(id('Sanctifiers (Assigned Agent)'))&&r.summary.includes('Command Re-roll'))).toBe(true);
 expect(reminders.some(r=>r.units?.includes(id('Ministorum Priest')))).toBe(false);
 expect(new Set(rosterCost2026(army).entries.map(e=>e.id)).size).toBe(7);
 expect(rosterCost2026(army).unknownUnits).toEqual([]);
 expect(sororitasWarlordCandidates(army).map(s=>s.unit)).toEqual(['Canoness','Ministorum Priest']);
});
it('allows one actual Leader and Support on legal bodyguards without permitting two of either role',()=>{
 let army=build(['Canoness','Palatine','Dialogus','Hospitaller','Battle Sisters Squad','Dominion Squad','Inquisitor']);
 army=join(army,'Canoness','Battle Sisters Squad');army=join(army,'Dialogus','Battle Sisters Squad');
 expect(sororitasFormations(army).find(g=>g.root.unit==='Battle Sisters Squad')?.members).toHaveLength(3);
 expect(()=>join(army,'Palatine','Battle Sisters Squad')).toThrow();
 expect(()=>join(army,'Hospitaller','Battle Sisters Squad')).toThrow();
 expect(()=>join(army,'Inquisitor','Dominion Squad')).toThrow();
 army=setInstanceAttachment(army,id('Canoness'),null);army=join(army,'Inquisitor','Battle Sisters Squad');
 expect(sororitasFormations(army).find(g=>g.root.unit==='Battle Sisters Squad')?.members.map(s=>s.unit)).toContain('Dialogus');
});
it('retains allied normal reaction buffs without granting Hit bonuses during Overwatch',()=>{
 const army=join(build(['Inquisitor Greyfax','Battle Sisters Squad'],'Strike Force',['Hallowed Martyrs']),'Inquisitor Greyfax','Battle Sisters Squad');
 const rows=assignedAgentReminders(army);
 expect(rows.find(r=>r.title.endsWith('No Mercy')&&r.window==='Shooting'&&r.turn==='opponent')?.summary).toContain('Praise the Fallen');
 expect(rows.some(r=>r.title.endsWith('No Mercy')&&r.window==='Movement')).toBe(false);
 expect(rows.find(r=>r.id.endsWith('weapons-Shooting-sororitas-reaction'))?.summary).toContain('surviving models');
 const split=join(build(['Inquisitor Greyfax','Battle Sisters Squad','Immolator'],'Strike Force',['Bringers of Flame']),'Inquisitor Greyfax','Battle Sisters Squad');
 expect(assignedAgentReminders(split).find(r=>r.title.endsWith('No Mercy')&&r.turn==='opponent')?.summary).toContain('actually embarked');
 const ordinary={...army,detachments2026:['Army of Faith']};
 expect(assignedAgentReminders(ordinary).some(r=>r.id.endsWith('sororitas-reaction'))).toBe(false);
});
it('enforces current Catechism keyword scope without resurrecting the superseded Repentia attachment',()=>{
 let army=build(['Canoness','Canoness with Jump Pack','Palatine','Ministorum Priest','Repentia Squad'], 'Strike Force',['Penitent Host']);
 army=selectUpgrade2026(army,id('Canoness'),'Catechism of Divine Penitence');
 expect(sororitasKeywords(army,squad(army,'Canoness'))).toContain('PENITENT');
 for(const name of ['Canoness','Palatine','Ministorum Priest'])expect(instanceBodyguards(army,squad(army,name))).not.toContain('Repentia Squad');
 expect(()=>join(army,'Canoness','Repentia Squad')).toThrow();
 army=selectUpgrade2026(army,id('Canoness'),null);army=selectUpgrade2026(army,id('Canoness with Jump Pack'),'Catechism of Divine Penitence');
 expect(sororitasKeywords(army,squad(army,'Canoness with Jump Pack'))).toContain('PENITENT');
});
it('counts complete mixed-model attached formations in native transports, including an allied Inquisitor',()=>{
 let army=build(['Aestred Thurga And Agathae Dolan','Dialogus','Battle Sisters Squad','Sororitas Rhino','Immolator','Saint Celestine','Seraphim Squad','Triumph Of Saint Katherine','Inquisitor']);
 army=join(army,'Aestred Thurga And Agathae Dolan','Battle Sisters Squad');army=join(army,'Dialogus','Battle Sisters Squad');
 const rhino=squad(army,'Sororitas Rhino'),immo=squad(army,'Immolator');
 expect(sororitasCargoFormations(army,rhino).map(g=>g.root.id)).not.toContain(id('Battle Sisters Squad'));
 expect(sororitasSplitCargoFormations(army,immo).find(g=>g.root.id===id('Battle Sisters Squad'))?.halves).toEqual([6,7]);
 expect(sororitasDedicatedSatisfied(army)).toBe(true);
 expect(sororitasCargoFormations(army,rhino).map(g=>g.root.unit)).not.toContain('Saint Celestine');
 expect(sororitasCargoFormations(army,rhino).map(g=>g.root.unit)).not.toContain('Triumph Of Saint Katherine');
 army=setInstanceAttachment(army,id('Aestred Thurga And Agathae Dolan'),null);army=join(army,'Inquisitor','Battle Sisters Squad');
 expect(sororitasCargoFormations(army,rhino).find(g=>g.root.id===id('Battle Sisters Squad'))?.spaces).toBe(12);
 expect(sororitasCargoFits(army,rhino,[id('Battle Sisters Squad')])).toBe(true);
 expect(sororitasCargoFits(army,rhino,[id('Battle Sisters Squad'),id('Battle Sisters Squad')])).toBe(false);
});
it('one split supplies exactly two distinct passenger units and never an extra whole formation',()=>{
 let army=build(['Battle Sisters Squad','Immolator','Immolator']);
 expect(sororitasDedicatedSatisfied(army)).toBe(true);
 expect(sororitasCargoFormations(army,squad(army,'Immolator'))).toEqual([]);
 army=addSelectionUnit(army,'Sororitas Rhino');expect(sororitasDedicatedSatisfied(army)).toBe(false);
 const unsplit=build(['Battle Sisters Squad','Sororitas Rhino','Sororitas Rhino']);
 expect(sororitasDedicatedSatisfied(unsplit)).toBe(false);
 const tooLarge=join(join(build(['Aestred Thurga And Agathae Dolan','Dialogus','Battle Sisters Squad','Immolator','Immolator']),'Aestred Thurga And Agathae Dolan','Battle Sisters Squad'),'Dialogus','Battle Sisters Squad');
 expect(sororitasDedicatedSatisfied(tooLarge)).toBe(false); // 6 + 7 cannot occupy two six-seat vehicles.
});
it('does not treat an orphaned invalid Leader as spare legal cargo',()=>{
 const army=build(['Dialogus','Battle Sisters Squad','Immolator']);
 const invalid={...army,instances:army.instances!.map(s=>s.unit==='Dialogus'?{...s,attachedTo:'missing'}:s)};
 expect(sororitasCargoFormations(invalid,squad(invalid,'Immolator'))).toEqual([]);
 expect(errors(invalid)).toContain('mandatory-support');
});
it('uses the real Warlord requirement, battle-size caps and allied exclusions',()=>{
 let army=build(['Canoness','Morvenn Vahl','Inquisitor','Armiger Warglaive'],'Incursion');
 expect(sororitasWarlordCandidates(army).map(s=>s.unit)).toEqual(['Morvenn Vahl']);
 expect(()=>selectSororitasWarlord(army,id('Canoness'))).toThrow();
 expect(()=>selectSororitasWarlord(army,id('Inquisitor'))).toThrow();
 expect(sororitasUnitLimit(army,'Battle Sisters Squad')).toBe(4);
 expect(sororitasUnitLimit(army,'Paragon Warsuits')).toBe(2);
 expect(sororitasUnitLimit(army,'Morvenn Vahl')).toBe(1);
 expect(sororitasMusterUnits(army)).not.toContain('Warhound Titan');
 expect(sororitasMusterUnits(army)).not.toContain('Repressor');
 army=addSelectionUnit(army,'Inquisitor Greyfax');expect(errors(army)).toContain('assigned-agents-character');
});
it('exempts Hagiomnifex from the army cap while retaining one enhancement per attached formation',()=>{
 let army=build(['Canoness','Canoness','Palatine','Canoness with Jump Pack','Dialogus','Battle Sisters Squad'],'Strike Force',['Army of Faith','Sanctified Orators']);
 army=join(army,'Dialogus','Battle Sisters Squad');
 army=selectUpgrade2026(army,id('Canoness'),'Blade of Saint Ellynor');
 army=selectUpgrade2026(army,id('Palatine'),'Divine Aspect');
 army=selectUpgrade2026(army,id('Canoness with Jump Pack'),'Litanies of Faith');
 army=selectUpgrade2026(army,id('Canoness',2),'Triptych of the Macharian Crusade');
 army=selectUpgrade2026(army,id('Dialogus'),'Hagiomnifex');
 expect(Object.keys(army.upgrades2026!)).toHaveLength(5);
 expect(upgradeError2026(army)).toBeNull();
 expect(()=>join(army,'Canoness','Battle Sisters Squad')).toThrow();
 expect(detachmentBudget('Adepta Sororitas',['Champions of Faith','Sacred Champions'],'Strike Force').valid).toBe(false);
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(army))));
 expect(saved.retained).toEqual([]);expect(saved.store.profiles[0].army.upgrades2026).toEqual(army.upgrades2026);
});
