// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment,setInstanceModelCount,expandRoster} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {spaceMarineLoadout,spaceMarineModelLoadouts} from '../src/space-marines-loadouts';
import {chapterSplitPlans,chapterSplitReminders,chapterPartWeapons} from '../src/space-marine-chapters-splits';
import {spaceMarineCargoFormations,spaceMarineDedicatedSatisfied,spaceMarineMinimumPodPassengerPoints} from '../src/space-marines-transports';
import {spaceMarineDatasheetCoreReminders} from '../src/space-marines-datasheet-core';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {spaceMarineWeaponReminders} from '../src/space-marines-weapons';

const id=(u:string,n=1)=>u+'#'+n;
const squad=(a:ArmySelection,u:string,n=1)=>expandRoster(a).find(s=>s.id===id(u,n))!;
function build(units:string[],detachments=['Saga of the Great Wolf']){
 let a=individualArmy({...newSelection('Space Wolves'),detachments2026:detachments,battleSize2026:'Strike Force' as const});
 for(const u of units)a=addSelectionUnit(a,u);return a;
}
const join=(a:ArmySelection,l:string,b:string)=>setInstanceAttachment(a,id(l),id(b));
const split=(a:ArmySelection,u:string)=>setKnightGear(a,id(u),'Battle formation','Split unit');

it.each([10])('splits %s Grey Hunters plus its eligible Leader into balanced physical units',count=>{
 let a=join(build(['Ulrik The Slayer','Grey Hunters']),'Ulrik The Slayer','Grey Hunters');
 a=split(setInstanceModelCount(a,id('Grey Hunters'),count),'Grey Hunters');
 const p=chapterSplitPlans(a)[0];
 expect(p.valid).toBe(true);expect(p.parts.map(p=>p.models).reduce((x,y)=>x+y)).toBe(count+1);
 expect(Math.abs(p.parts[0].models-p.parts[1].models)).toBeLessThanOrEqual(1);
 const all=p.parts.flatMap(p=>p.physical.map(m=>m.id));expect(new Set(all).size).toBe(all.length);
 expect(p.parts.filter(p=>p.members.some(s=>s.unit==='Ulrik The Slayer'))).toHaveLength(1);
});
it('rejects an unbalanced declaration and makes its parts unavailable as cargo',()=>{
 let a=split(setInstanceModelCount(build(['Grey Hunters','Rhino']),id('Grey Hunters'),10),'Grey Hunters');
 for(const slot of spaceMarineLoadout('Grey Hunters',10,'Space Wolves',squad(a,'Grey Hunters').knightGear)!.slots.filter(s=>s.name.endsWith(' · Split group')))a=setKnightGear(a,id('Grey Hunters'),slot.name,'Group 1');
 expect(chapterSplitPlans(a)[0].valid).toBe(false);
 expect(rosterFindings(a).some(f=>f.code==='space-marines-split-composition')).toBe(true);
 expect(spaceMarineCargoFormations(a,squad(a,'Rhino'))).toEqual([]);
});
it('assigns two separate Grey Hunter parts to distinct Dedicated Transports without duplicating models',()=>{
 let a=setInstanceModelCount(build(['Grey Hunters','Rhino','Rhino']),id('Grey Hunters'),10);
 expect(spaceMarineDedicatedSatisfied(a)).toBe(false);
 a=split(a,'Grey Hunters');
 expect(spaceMarineDedicatedSatisfied(a)).toBe(true);
 const cargo=spaceMarineCargoFormations(a,squad(a,'Rhino'));
 expect(cargo).toHaveLength(2);expect(cargo.map(g=>g.spaces)).toEqual([5,5]);
 expect(new Set(cargo.flatMap(g=>g.physical.map(m=>m.id))).size).toBe(10);
});
it('keeps every Headtaker and attached Character together while Wolves remain Beast models',()=>{
 let a=join(build(['Ragnar Blackmane','Wolf Guard Headtakers','Rhino']),'Ragnar Blackmane','Wolf Guard Headtakers');
 a=setInstanceModelCount(a,id('Wolf Guard Headtakers'),6);
 const s=squad(a,'Wolf Guard Headtakers'),field=spaceMarineLoadout(s.unit,6,'Space Wolves')!.slots.find(s=>s.name==='Unit composition')!;
 const choice=field.choices.find(c=>spaceMarineModelLoadouts({...s,knightGear:{'Unit composition':c.name}},'Space Wolves').filter(m=>m.model==='Hunting Wolf').length===3)!;
 a=split(setKnightGear(a,s.id,field.name,choice.name),'Wolf Guard Headtakers');
 const p=chapterSplitPlans(a)[0];expect(p.valid).toBe(true);expect(p.parts.map(p=>p.models)).toEqual([4,3]);
 expect(p.parts[1].physical.every(m=>m.model==='Hunting Wolf')).toBe(true);
 const cargo=spaceMarineCargoFormations(a,squad(a,'Rhino'));expect(cargo).toHaveLength(1);
 expect(cargo[0].models).toBe(4);expect(cargo[0].physical.every(m=>m.model!=='Hunting Wolf')).toBe(true);
 expect(chapterSplitReminders(a).find(r=>r.title.includes('Group 2'))?.summary).not.toContain('Ragnar Blackmane::');
});
it('retains original group assignment when an attached source dies and does not move its survivors',()=>{
 const a=split(join(build(['Ulrik The Slayer','Grey Hunters']),'Ulrik The Slayer','Grey Hunters'),'Grey Hunters');
 const initial=chapterSplitPlans(a)[0];
 const live=expandRoster(a).filter(s=>s.unit!=='Ulrik The Slayer'),later=chapterSplitPlans(a,live)[0];
 for(const part of later.parts)expect(part.physical.map(m=>m.id)).toEqual(initial.parts.find(p=>p.key===part.key)!.physical.filter(m=>m.squad.unit!=='Ulrik The Slayer').map(m=>m.id));
});
it('never estimates the compulsory reserve price of a partial original unit',()=>{
 const a=split(build(['Grey Hunters','Drop Pod','Rhino']),'Grey Hunters');
 expect(spaceMarineDedicatedSatisfied(a)).toBe(true);
 expect(spaceMarineMinimumPodPassengerPoints(a)).toBeNull();
});
it('prints only actual assigned passenger guns for a split group’s Firing Deck',()=>{
 const a=split(build(['Grey Hunters','Impulsor']),'Grey Hunters');
 const rows=spaceMarineDatasheetCoreReminders(a).filter(r=>r.title.includes('Firing Deck'));
 expect(rows).toHaveLength(2);
 expect(rows.every(r=>r.title.includes('Group ')&&r.summary.includes('other split group contributes no weapons'))).toBe(true);
});
it('keeps Wolf-Touched transport spaces only on the actual bearer’s split part',()=>{
 let a=join(build(['Iron Priest','Grey Hunters','Rhino'],['Saga of the Beastslayer']),'Iron Priest','Grey Hunters');
 a=selectUpgrade2026(a,id('Iron Priest'),'Wolf-Touched');a=split(a,'Grey Hunters');
 const parts=spaceMarineCargoFormations(a,squad(a,'Rhino'));
 const source=parts.find(g=>g.members.some(s=>s.unit==='Iron Priest'))!,other=parts.find(g=>!g.members.some(s=>s.unit==='Iron Priest'))!;
 expect(source.physical.every(m=>m.keywords.has('WULFEN'))).toBe(true);
 expect(other.physical.some(m=>m.keywords.has('WULFEN'))).toBe(false);
 expect(source.spaces).toBe(source.models*2);expect(other.spaces).toBe(other.models);
});
it('grants a Scout move only to the part containing the actual Spearpoint War Leader',()=>{
 let a=join(build(['Wolf Priest','Grey Hunters'],['Tacticus Attack Force']),'Wolf Priest','Grey Hunters');
 a=split(selectUpgrade2026(a,id('Wolf Priest'),'Spearpoint War Leader'),'Grey Hunters');
 a=setKnightGear(a,id('Grey Hunters'),'Leader group','Group 2');
 const parts=chapterSplitPlans(a)[0].parts,source=parts.find(p=>p.members.some(s=>s.unit==='Wolf Priest'))!,other=parts.find(p=>p.key!==source.key)!;
 const rows=spaceMarineDatasheetCoreReminders(a).filter(r=>r.title.endsWith('Scouts 6″'));
 expect(rows).toHaveLength(1);expect(rows[0].title).toContain(source.root.id);
 expect(rows[0].title).not.toContain(other.root.id);expect(rows[0].units).toEqual(source.members.map(s=>s.id));
 const afterSourceDies=spaceMarineDatasheetCoreReminders(a,expandRoster(a).filter(s=>s.unit!=='Wolf Priest'));
 expect(afterSourceDies.some(r=>r.title.endsWith('Scouts 6″'))).toBe(false);
});
it('retains an attached Agent’s actual printed guns only in her split group and its Firing Deck',()=>{
 let a=split(join(build(['Inquisitor Draxus','Grey Hunters','Impulsor']),'Inquisitor Draxus','Grey Hunters'),'Grey Hunters');
 a=setKnightGear(a,id('Grey Hunters'),'Leader group','Group 2');
 const parts=chapterSplitPlans(a)[0].parts,source=parts.find(p=>p.members.some(s=>s.unit==='Inquisitor Draxus'))!,other=parts.find(p=>p.key!==source.key)!;
 const draxus=source.physical.find(m=>m.squad.unit==='Inquisitor Draxus')!;
 expect(draxus.items).toEqual(['Dirgesinger','Psychic Tempest','Power fist']);
 expect(chapterPartWeapons(a,source,'Shooting').some(w=>w.name==='Dirgesinger'&&w.abilities.includes('anti-infantry 4+'))).toBe(true);
 expect(chapterPartWeapons(a,other,'Shooting').some(w=>/Dirgesinger|Psychic Tempest/.test(w.name))).toBe(false);
 const weapons=spaceMarineWeaponReminders(a).filter(r=>r.window==='Shooting'&&r.turn==='own');
 expect(weapons.find(r=>r.title.startsWith(source.root.id))?.summary).toContain('Dirgesinger');
 expect(weapons.find(r=>r.title.startsWith(other.root.id))?.summary).not.toContain('Dirgesinger');
 const decks=spaceMarineDatasheetCoreReminders(a).filter(r=>r.title.includes('Firing Deck'));
 expect(decks.find(r=>r.title.includes(source.root.id))?.summary).toContain('Psychic Tempest');
 expect(decks.find(r=>r.title.includes(other.root.id))?.summary).not.toContain('Psychic Tempest');
});
