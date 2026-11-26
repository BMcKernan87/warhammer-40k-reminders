// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,addSelectionUnit,type ArmySelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment,expandRoster} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterCost2026} from '../src/datasheets-2026';
import {chapterSplitPlans} from '../src/space-marine-chapters-splits';
import {spaceMarineUpgradeReminders} from '../src/space-marines-detachments';
import {assignedAgentReminders} from '../src/assigned-agent-reminders';
import {generate11thReminders} from '../src/reminders-11th';

function build(units:string[],detachments:string[]):ArmySelection{
 let army=individualArmy({...newSelection('Space Wolves'),detachments2026:detachments});
 for(const unit of units)army=addSelectionUnit(army,unit);return army;
}
const join=(army:ArmySelection,leader:string)=>setInstanceAttachment(army,leader+'#1','Grey Hunters#1');
const split=(army:ArmySelection)=>setKnightGear(army,'Grey Hunters#1','Battle formation','Split unit');

it('retains one paid unit Upgrade on both actual Grey Hunter split parts',()=>{
 const unsplit=selectUpgrade2026(build(['Grey Hunters'],['Assault Brethren']),'Grey Hunters#1','Furious Assault'),army=split(unsplit);
 const plan=chapterSplitPlans(army)[0];expect(plan.valid).toBe(true);
 const rows=spaceMarineUpgradeReminders(army).filter(r=>r.title.includes('Furious Assault'));
 expect(rows).toHaveLength(2);
 expect(new Set(rows.map(r=>r.id)).size).toBe(2);
 expect(rows.flatMap(r=>r.units??[]).sort()).toEqual(plan.parts.map(p=>p.root.id).sort());
 for(const part of plan.parts)expect(rows.some(r=>r.title.includes(part.root.id)&&r.summary.includes('Sustained Hits 1'))).toBe(true);
 expect(rosterCost2026(army)).toEqual(rosterCost2026(unsplit));
 expect(rosterCost2026(army).entries[0].enhancementPoints).toBeGreaterThan(0);
});

it('keeps a shared model enhancement on its actual bearer’s part',()=>{
 const army=split(selectUpgrade2026(join(build(['Wolf Priest','Grey Hunters'],['Tacticus Attack Force']),'Wolf Priest'),'Wolf Priest#1','Spearpoint War Leader'));
 const plan=chapterSplitPlans(army)[0],part=plan.parts.find(p=>p.members.some(s=>s.unit==='Wolf Priest'))!;
 const rows=spaceMarineUpgradeReminders(army).filter(r=>r.title.includes('Spearpoint War Leader'));
 expect(rows).toHaveLength(1);expect(rows[0].units).toEqual([part.root.id]);expect(rows[0].title).toContain(part.root.id);
});

it('gives Draxus effects only to her actual declared split part',()=>{
 let army=split(join(build(['Inquisitor Draxus','Grey Hunters'],['Champions of Fenris']),'Inquisitor Draxus'));
 army=setKnightGear(army,'Grey Hunters#1','Leader group','Group 2');
 const plan=chapterSplitPlans(army)[0];expect(plan.valid).toBe(true);
 const part=plan.parts.find(p=>p.members.some(s=>s.unit==='Inquisitor Draxus'))!,other=plan.parts.find(p=>p.key!==part.key)!;
 expect(other.physical.some(m=>m.squad.unit==='Inquisitor Draxus')).toBe(false);
 const rows=generate11thReminders(army).filter(r=>/Xenos Hunter|Psychic Veil/.test(r.title));
 expect(rows).toHaveLength(5);
 for(const row of rows){
  expect(row.title).toContain(part.root.id);expect(row.title).not.toContain(other.root.id);
  expect(row.units).toEqual(part.members.map(s=>s.id));
  expect(row.summary).toContain(part.models+' actual models');
  expect(row.summary).toContain('other declared part does not receive this unit-scoped effect');
 }
});

it('retains Authority of the Inquisition for the Agent’s eligible split cargo part',()=>{
 const army=split(join(build(['Inquisitor Draxus','Grey Hunters','Impulsor'],['Champions of Fenris']),'Inquisitor Draxus'));
 const part=chapterSplitPlans(army)[0].parts.find(p=>p.members.some(s=>s.unit==='Inquisitor Draxus'))!;
 const rows=assignedAgentReminders(army).filter(r=>r.title.includes('Authority of the Inquisition'));
 expect(rows).toHaveLength(2);expect(rows.every(r=>r.title.includes(part.root.id)&&r.units?.includes('Inquisitor Draxus#1'))).toBe(true);
});

it('labels an Agent’s source part without narrowing its army-wide CP ability',()=>{
 const army=split(join(build(['Inquisitor Coteaz','Grey Hunters'],['Champions of Fenris']),'Inquisitor Coteaz'));
 const part=chapterSplitPlans(army)[0].parts.find(p=>p.members.some(s=>s.unit==='Inquisitor Coteaz'))!;
 const rows=assignedAgentReminders(army).filter(r=>r.title.includes('Spy Network'));
 expect(rows).toHaveLength(5);
 for(const row of rows){expect(row.units).toEqual(['Inquisitor Coteaz#1']);expect(row.summary).toContain('When your opponent gains a CP');expect(row.summary).toContain('source model is assigned to '+part.root.id);expect(row.summary).not.toContain('unit-scoped effect');}
});

it('keeps ordinary unsplit Agent reminders unchanged',()=>{
 const army=join(build(['Inquisitor Draxus','Grey Hunters'],['Champions of Fenris']),'Inquisitor Draxus');
 const rows=assignedAgentReminders(army).filter(r=>/Xenos Hunter|Psychic Veil/.test(r.title));
 expect(rows).toHaveLength(5);expect(rows.every(r=>!r.title.includes('Group ')&&!r.summary.includes('declared part'))).toBe(true);
 expect(rows.every(r=>r.units?.includes('Grey Hunters#1')&&r.units.includes('Inquisitor Draxus#1'))).toBe(true);
 expect(expandRoster(army)).toHaveLength(2);
});
