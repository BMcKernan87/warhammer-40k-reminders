// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection,type Faction} from '../src/catalog';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterCost2026} from '../src/datasheets-2026';
import {spaceMarineMinimumReservePoints} from '../src/space-marines-muster';
import {spaceMarineCargoFormations,spaceMarineDedicatedSatisfied,spaceMarineMinimumPodPassengerPoints,spaceMarineTransportReminders} from '../src/space-marines-transports';

const id=(unit:string,n=1)=>unit+'#'+n;
const squad=(army:ArmySelection,unit:string,n=1)=>expandRoster(army).find(s=>s.id===id(unit,n))!;
function build(units:string[],faction:Faction='Space Wolves'){
 let army=individualArmy({...newSelection(faction),battleSize2026:'Strike Force' as const,detachments2026:faction==='Space Wolves'?['Saga of the Great Wolf']:['Ironstorm Spearhead']});
 for(const unit of units)army=addSelectionUnit(army,unit);
 return army;
}
const split=(army:ArmySelection)=>setKnightGear(army,id('Grey Hunters'),'Battle formation','Split unit');

it('counts a split Grey Hunter unit exactly once when two Pods require both parts',()=>{
 const army=split(build(['Grey Hunters','Drop Pod','Drop Pod']));
 expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
 expect(spaceMarineCargoFormations(army,squad(army,'Drop Pod')).map(g=>g.root.id)).toEqual(['Grey Hunters#1 · Group 1','Grey Hunters#1 · Group 2']);
 expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(180);
 expect(spaceMarineMinimumReservePoints(army)).toBe(300);
});

it('keeps a split unit’s partial price unknown when one part can occupy a Pod and the other a Rhino',()=>{
 const army=split(build(['Grey Hunters','Drop Pod','Rhino']));
 expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
 expect(spaceMarineMinimumPodPassengerPoints(army)).toBeNull();
 expect(spaceMarineMinimumReservePoints(army)).toBeNull();
});

it('keeps a partial price unknown with two Pods when another formation can replace one split part',()=>{
 const army=split(build(['Grey Hunters','Intercessor Squad','Drop Pod','Drop Pod']));
 expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
 expect(spaceMarineMinimumPodPassengerPoints(army)).toBeNull();
});

it('proves both parts enter Pods when a Gravis formation must occupy the remaining Impulsor',()=>{
 const army=split(build(['Grey Hunters','Aggressor Squad','Drop Pod','Drop Pod','Impulsor']));
 expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
 expect(spaceMarineCargoFormations(army,squad(army,'Drop Pod')).some(g=>g.root.unit==='Aggressor Squad')).toBe(false);
 expect(spaceMarineCargoFormations(army,squad(army,'Impulsor')).some(g=>g.root.unit==='Aggressor Squad')).toBe(true);
 expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(180);
});

it('proves neither split part enters a Pod when the larger formations require both Pods',()=>{
 let army=build(['Grey Hunters','Intercessor Squad','Assault Intercessor Squad','Drop Pod','Drop Pod','Impulsor','Impulsor']);
 army=setInstanceModelCount(army,id('Intercessor Squad'),10);army=setInstanceModelCount(army,id('Assault Intercessor Squad'),10);army=split(army);
 expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
 expect(spaceMarineCargoFormations(army,squad(army,'Drop Pod')).map(g=>g.root.id)).toContain('Grey Hunters#1 · Group 1');
 expect(spaceMarineCargoFormations(army,squad(army,'Impulsor')).map(g=>g.root.unit)).toEqual(['Grey Hunters','Grey Hunters']);
 expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(340);
 expect(spaceMarineMinimumReservePoints(army)).toBe(460);
});

it('adds an attached source’s complete upgraded price once when both parts must enter Pods',()=>{
 let army=build(['Wolf Priest','Grey Hunters','Drop Pod','Drop Pod']);
 army=setInstanceAttachment(army,id('Wolf Priest'),id('Grey Hunters'));army=selectUpgrade2026(army,id('Wolf Priest'),'Howlmaw');army=split(army);
 expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
 expect(rosterCost2026(army).entries.find(e=>e.id===id('Wolf Priest'))?.points).toBe(90);
 expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(270);
 expect(spaceMarineMinimumReservePoints(army)).toBe(390);
 const unknown=rosterCost2026(army).entries.map(e=>e.id===id('Wolf Priest')?{...e,points:null}:e);
 expect(spaceMarineMinimumPodPassengerPoints(army,expandRoster(army),unknown)).toBeNull();
});

it('does not infer an exact cost when the remaining Dedicated Transports cannot all be filled',()=>{
 const army=split(build(['Grey Hunters','Drop Pod','Drop Pod','Rhino']));
 expect(spaceMarineDedicatedSatisfied(army)).toBe(false);
 expect(spaceMarineMinimumPodPassengerPoints(army)).toBeNull();
});

it.each(['Repulsor','Repulsor Executioner'])('prints the Black Templars %s Jump Pack two-space allowance',unit=>{
 const army=build([unit,'Captain With Jump Pack'],'Black Templars'),cargo=spaceMarineCargoFormations(army,squad(army,unit));
 expect(cargo.find(g=>g.root.unit==='Captain With Jump Pack')).toMatchObject({models:1,spaces:2});
 const reminder=spaceMarineTransportReminders(army).find(r=>r.title===id(unit)+' · Declare passengers')!;
 expect(reminder.summary).toContain('Each Jump Pack, Gravis or Terminator model uses 2 spaces');
 expect(reminder.summary).not.toContain('Cannot carry JUMP PACK');
});

it('keeps the generic Repulsor Jump Pack prohibition in its capacity reminder',()=>{
 const army=build(['Repulsor','Captain With Jump Pack'],'Space Marines');
 const reminder=spaceMarineTransportReminders(army).find(r=>r.title==='Repulsor#1 · Declare passengers')!;
 expect(reminder.summary).toContain('Cannot carry JUMP PACK');
 expect(reminder.summary).toContain('Each Gravis or Terminator model uses 2 spaces');
 expect(spaceMarineCargoFormations(army,squad(army,'Repulsor')).some(g=>g.root.unit==='Captain With Jump Pack')).toBe(false);
});
