// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {formationDeploymentReminders} from '../src/formation-deployment';
import {SM_SHEETS} from '../src/space-marines-data';
import {spaceMarineFormations} from '../src/space-marines-formations';
import {spaceMarineLoadout,validSpaceMarineGear} from '../src/space-marines-loadouts';
import {spaceMarineMandatoryReservePoints,spaceMarineMinimumReservePoints,spaceMarineMusterFindings} from '../src/space-marines-muster';
import {spaceMarineCargoFormations,spaceMarineDedicatedSatisfied,spaceMarineMinimumPodPassengerPoints} from '../src/space-marines-transports';
import {minimumTransportAssignmentCost} from '../src/transport-matching';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {setInstanceAttachment,validateRosterInstances} from '../src/roster-instances';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(...choices:(string|[string,number])[]):ArmySelection{
 const units:Record<string,number>={},instances=choices.map(choice=>{
  const [unit,models]=typeof choice==='string'?[choice,SM_SHEETS.find(s=>s.unit===choice)!.sizes[0]]:choice;
  return {unit,models,id:id(unit,units[unit]=(units[unit]??0)+1)};
 });
 return {...newSelection('Space Marines'),units,instances,battleSize2026:'Incursion',detachments2026:['Gladius Task Force']};
}
const join=(army:ArmySelection,leader:string,body:string,n=1)=>setInstanceAttachment(army,id(leader),id(body,n));
const codes=(army:ArmySelection)=>spaceMarineMusterFindings(army).map(f=>f.code);
const impossiblePods=()=>join(build('Drop Pod','Drop Pod',['Hellblaster Squad',10],['Hellblaster Squad',10],'Captain'),'Captain','Hellblaster Squad');

describe('occupied Drop Pod reserve accounting',()=>{
 it('rejects the 670-point roster whose two occupied Pods exceed the 500-point reserve allowance',()=>{
  const army=impossiblePods();
  expect(validateRosterInstances(army)).toBe(true);
  expect(rosterCost2026(army).total).toBe(670);
  expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
  expect(spaceMarineMandatoryReservePoints(army)).toBe(120);
  expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(550);
  expect(spaceMarineMinimumReservePoints(army)).toBe(670);
  const finding=spaceMarineMusterFindings(army).find(f=>f.code==='mandatory-reserves-limit');
  expect(finding).toMatchObject({severity:'error'});
  expect(finding!.message).toContain('670 points');
  expect(finding!.message).toContain('500-point allowance');
  expect(codes(army)).not.toContain('points-limit');
 });

 it('cannot reuse a formation or peel off its attached Captain to occupy a second Pod',()=>{
  const army=join(build('Drop Pod','Drop Pod',['Hellblaster Squad',10],'Captain'),'Captain','Hellblaster Squad');
  expect(spaceMarineCargoFormations(army,army.instances![0]).map(g=>g.root.id)).toEqual([id('Hellblaster Squad')]);
  expect(spaceMarineDedicatedSatisfied(army)).toBe(false);
  expect(spaceMarineMinimumPodPassengerPoints(army)).toBeNull();
  expect(spaceMarineMinimumReservePoints(army)).toBeNull();
  expect(codes(army)).toContain('dedicated-transport-passengers');
  expect(codes(army)).not.toContain('mandatory-reserves-limit');
 });

 it('reserves the cheap squad for the Impulsor when the larger squad can only fill the Pod',()=>{
  const army=build('Drop Pod','Impulsor',['Scout Squad',5],['Hellblaster Squad',10]);
  expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
  expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(230);
  expect(spaceMarineMinimumReservePoints(army)).toBe(290);
  expect(spaceMarineMinimumPodPassengerPoints({...army,instances:[...army.instances!].reverse()})).toBe(230);
 });

 it('minimizes across Pods, Rhinos and Impulsors together, leaving unused formations available',()=>{
  const army=build('Drop Pod','Rhino','Impulsor',['Scout Squad',5],['Intercessor Squad',10],['Hellblaster Squad',10]);
  expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(170);
  expect(spaceMarineMinimumReservePoints(army)).toBe(230);
  const extra=build('Drop Pod','Rhino','Impulsor',['Scout Squad',5],['Scout Squad',5],['Intercessor Squad',10],['Hellblaster Squad',10]);
  expect(spaceMarineMinimumPodPassengerPoints(extra)).toBe(65);
  expect(spaceMarineMinimumReservePoints(extra)).toBe(125);
 });

 it('counts the actual bodyguard, Leader, Support, paid equipment and enhancement once each',()=>{
  let army=join(join(build('Drop Pod','Desolation Squad','Captain','Lieutenant'),'Captain','Desolation Squad'),'Lieutenant','Desolation Squad');
  const field=spaceMarineLoadout('Desolation Squad',5)!.slots.find(s=>s.choices.some(c=>c.items.includes('Vengor Launcher')))!;
  const choice=field.choices.find(c=>c.items.includes('Vengor Launcher'))!;
  army={...army,instances:army.instances!.map(s=>s.unit==='Desolation Squad'?{...s,knightGear:{[field.name]:choice.name}}:s)};
  army=selectUpgrade2026(army,id('Captain'),'Artificer Armour');
  expect(validateRosterInstances(army)).toBe(true);
  expect(validSpaceMarineGear('Desolation Squad',army.instances!.find(s=>s.unit==='Desolation Squad')!.knightGear!,5)).toBe(true);
  const entries=rosterCost2026(army).entries;
  expect(entries.find(e=>e.unit==='Desolation Squad')).toMatchObject({basePoints:140,wargearPoints:5,points:145});
  expect(entries.find(e=>e.unit==='Captain')).toMatchObject({basePoints:90,enhancementPoints:15,points:105});
  expect(entries.find(e=>e.unit==='Lieutenant')!.points).toBe(50);
  expect(spaceMarineCargoFormations(army,army.instances![0])[0].models).toBe(7);
  expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(300);
  expect(spaceMarineMinimumReservePoints(army)).toBe(360);
 });

 it('uses actual later-copy roster prices instead of the first-copy datasheet price',()=>{
  const army=build('Drop Pod','Drop Pod','Drop Pod','Desolation Squad','Desolation Squad','Desolation Squad');
  expect(rosterCost2026(army).entries.filter(e=>e.unit==='Desolation Squad').map(e=>e.points)).toEqual([140,140,150]);
  expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(430);
  expect(spaceMarineMinimumReservePoints(army)).toBe(610);
 });

 it('keeps actual potential Pod passengers in the reserve candidate list and states only a minimum',()=>{
  const army=impossiblePods(),formations=spaceMarineFormations(army).map(g=>({id:g.root.id,body:g.root,members:g.members}));
  const reminder=formationDeploymentReminders(army,formations,unit=>SM_SHEETS.find(s=>s.unit===unit)!.keywords!).find(r=>r.title==='Declare Strategic Reserves')!;
  expect(reminder.units).toEqual([id('Hellblaster Squad'),id('Hellblaster Squad',2)]);
  expect(reminder.summary).toContain('At least 550 points of passengers');
  expect(reminder.summary).toContain('minimum starting reserve cost 670 points');
  expect(reminder.summary).toContain('Declare the actual passengers');
  expect(reminder.summary).toContain('380 points remain for their passengers and other reserves');
 });

 it('does not force passengers in ground Dedicated Transports into reserves',()=>{
  const army=build('Rhino','Impulsor',['Scout Squad',5],['Hellblaster Squad',10]);
  expect(spaceMarineDedicatedSatisfied(army)).toBe(true);
  expect(spaceMarineMinimumPodPassengerPoints(army)).toBe(0);
  expect(spaceMarineMinimumReservePoints(army)).toBe(0);
  expect(spaceMarineMinimumPodPassengerPoints(build('Rhino','Impulsor',['Scout Squad',5]))).toBeNull();
 });

 it('does not turn Fly-only Thunderhawk or Corvus transports into compulsory Aircraft reserves',()=>{
  const army=build('Thunderhawk Gunship','Corvus Blackstar');
  for(const unit of Object.keys(army.units)){
   expect(SM_SHEETS.find(s=>s.unit===unit)!.keywords).toContain('FLY');
   expect(SM_SHEETS.find(s=>s.unit===unit)!.keywords).not.toContain('AIRCRAFT');
  }
  expect(spaceMarineMandatoryReservePoints(army)).toBe(0);
  expect(spaceMarineMinimumReservePoints(army)).toBe(0);
 });
});

describe('minimum distinct transport assignment',()=>{
 it('can reverse an earlier paid assignment to obtain the cheaper complete matching',()=>{
  const prices=[[1,2],[2,100]];
  expect(minimumTransportAssignmentCost([0,1],[0,1],()=>true,(vehicle,passenger)=>prices[vehicle][passenger])).toBe(4);
 });

 it('reports no assignment when enough passengers exist but eligibility cannot fill every carrier',()=>{
  expect(minimumTransportAssignmentCost(['Pod','Rhino'],['eligible','ineligible'],(_,p)=>p==='eligible',()=>100)).toBeNull();
  expect(minimumTransportAssignmentCost([],['unused'],()=>true,()=>100)).toBe(0);
 });
});
