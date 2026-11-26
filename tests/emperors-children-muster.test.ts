// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {EMPERORS_CHILDREN_SHEETS,emperorsChildrenMusterUnits} from '../src/emperors-children-data';
import {emperorsChildrenUnitLimit,emperorsChildrenWarlordCandidates,resolvedEmperorsChildrenWarlord,selectEmperorsChildrenWarlord} from '../src/emperors-children-muster';
import {emperorsChildrenCargoFormations,emperorsChildrenFormations,emperorsChildrenTransportReminders} from '../src/emperors-children-transports';
import {emperorsChildrenLoadout} from '../src/emperors-children-loadouts';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {availableUpgrades2026,selectUpgrade2026} from '../src/upgrades-2026';

const build=(units:string[],d='Carnival of Excess',size:ArmySelection['battleSize2026']='Strike Force')=>{
 let a=individualArmy({...newSelection('Emperor’s Children'),detachments2026:[d],battleSize2026:size});for(const u of units)a=addSelectionUnit(a,u);return a;
};
const id=(s:string)=>s+'#1',find=(a:ArmySelection,s:string)=>a.instances!.find(x=>x.unit===s)!;
const errors=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
it('musters and pays the correct next points bracket for all source sizes of the 23 Legion and Carnival cards',()=>{
 expect(EMPERORS_CHILDREN_SHEETS).toHaveLength(23);
 for(const sheet of EMPERORS_CHILDREN_SHEETS){
  const a=build([sheet.unit]),sizes=verifiedUnitSizes2026(a,sheet.unit)!;
  for(const size of sizes){
   const selected=setInstanceModelCount(a,id(sheet.unit),size);
   expect(validateSelection(selected)).toBe(true);
   expect(rosterCost2026(selected).entries[0].points).toBe(sheet.pointsBySize![sheet.sizes.find(s=>s>=size)!]);
  }
 }
});
it('retains whole attached formations and weights only the actual Terminators and Flawless Blades in a Land Raider',()=>{
 let a=build(['Chaos Rhino','Chaos Land Raider','Flawless Blades','Lord Exultant','Chaos Terminators','Lord Kakophonist','Tormentors','Sorcerer'],'Court of the Phoenician');
 expect(()=>setInstanceAttachment(a,id('Lord Exultant'),id('Flawless Blades'))).toThrow();
 a=selectUpgrade2026(a,id('Lord Exultant'),'Exalted Patron');
 a=setInstanceAttachment(a,id('Lord Exultant'),id('Flawless Blades'));
 a=setInstanceAttachment(a,id('Lord Kakophonist'),id('Chaos Terminators'));
 a=setInstanceAttachment(a,id('Sorcerer'),id('Tormentors'));
 a=setInstanceModelCount(a,id('Flawless Blades'),6);
 const groups=emperorsChildrenCargoFormations(a,find(a,'Chaos Land Raider'));
 expect(groups.map(g=>[g.root.unit,g.spaces])).toEqual([['Flawless Blades',13],['Chaos Terminators',11],['Tormentors',6]]);
 expect(emperorsChildrenCargoFormations(a,find(a,'Chaos Rhino')).map(g=>g.root.unit)).toEqual(['Tormentors']);
 expect(availableUpgrades2026(a,find(a,'Lord Exultant')).map(u=>u.name)).toContain('Exalted Patron');
 a=selectUpgrade2026(a,id('Lord Exultant'),null);expect(find(a,'Lord Exultant').attachedTo).toBeUndefined();
});
it('checks the distinct Legions of Excess allowance after enhancements and native Warlord eligibility',()=>{
 let a=build(['Lord Exultant','Keeper of Secrets','Fiends','Daemonettes'],'Carnival of Excess','Incursion');
 expect(availableUpgrades2026(a,find(a,'Keeper of Secrets')).map(u=>u.name)).toContain('Warp Walker');
 a=selectUpgrade2026(a,id('Keeper of Secrets'),'Warp Walker');
 expect(errors(a)).not.toContain('legions-of-excess-allowance');
 a=addSelectionUnit(a,'Seekers');expect(errors(a)).toContain('legions-of-excess-allowance');
 expect(emperorsChildrenWarlordCandidates(a).map(x=>x.unit)).toEqual(['Lord Exultant']);
 expect(()=>selectEmperorsChildrenWarlord(a,id('Keeper of Secrets'))).toThrow();
 const other={...a,detachments2026:['Mercurial Host']};expect(emperorsChildrenMusterUnits(other)).not.toContain('Fiends');expect(errors(other)).toContain('ec-ineligible');
 a=addSelectionUnit(a,'Fulgrim');expect(resolvedEmperorsChildrenWarlord(a)?.unit).toBe('Fulgrim');
});
it('honours first and later copies, printed Defiler arm surcharges, and chooses between a Titanic Dreadblade and up to three War Dogs',()=>{
 let a=build(['Defiler','Defiler','Daemon Prince of Slaanesh','Daemon Prince of Slaanesh','War Dog Brigand']);
 const slot=emperorsChildrenLoadout('Defiler')!.slots.find(s=>s.choices.some(c=>c.items.includes('Hades lascannon')&&c.items.includes('Heavy reaper autocannon')))!;
 const pair=slot.choices.find(c=>c.items.includes('Hades lascannon')&&c.items.includes('Heavy reaper autocannon'))!;
 a=setKnightGear(a,'Defiler#2',slot.name,pair.name);
 expect(rosterCost2026(a).entries.slice(0,4).map(e=>e.points)).toEqual([300,380,165,180]);
 expect(emperorsChildrenUnitLimit(a,'Knight Desecrator')).toBe(0);
 expect(emperorsChildrenUnitLimit(a,'War Dog Karnivore')).toBe(2);
 a=addSelectionUnit(a,'Knight Desecrator');expect(errors(a)).toContain('dreadblade-allowance');
 expect(emperorsChildrenMusterUnits(a)).toContain('Chaos Warhound Titan');
 expect(emperorsChildrenMusterUnits({...a,battleSize2026:'Incursion'})).not.toContain('Chaos Warhound Titan');
});
it('migrates every saved profile using the former straight apostrophe detachment without rebuilding its squads',()=>{
 const old=build(['Fulgrim','Noise Marines'],"Slaanesh's Chosen");
 const restored=openSavedArmies(JSON.parse(JSON.stringify(initialStore(old))));
 expect(restored.retained).toEqual([]);const curr=restored.store.profiles[0].army;
 expect(curr.detachments2026).toEqual(['Slaanesh’s Chosen']);expect(curr.instances).toEqual(old.instances);
});
it('opens and prices an exact 1000-point Court and prints the legal Rhino and Land Raider passengers',()=>{
 let a=build(['Lord Exultant','Flawless Blades','Chaos Land Raider','Chaos Rhino','Tormentors','Noise Marines','Sorcerer','Maulerfiend'],'Court of the Phoenician','Incursion');
 a=setInstanceModelCount(a,id('Flawless Blades'),6);a=selectUpgrade2026(a,id('Lord Exultant'),'Exalted Patron');
 a=setInstanceAttachment(a,id('Lord Exultant'),id('Flawless Blades'));a=setInstanceAttachment(a,id('Sorcerer'),id('Tormentors'));
 a=selectEmperorsChildrenWarlord(a,id('Lord Exultant'));
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a)))).store.profiles[0].army;
 expect(rosterCost2026(saved).total).toBe(1000);expect(errors(saved)).toEqual([]);
 const reminders=emperorsChildrenTransportReminders(saved);
 expect(reminders.find(r=>r.title==='Chaos Land Raider#1 · Declare passengers')?.summary).toContain('Flawless Blades#1 (13 spaces)');
 expect(reminders.find(r=>r.title==='Chaos Rhino#1 · Declare passengers')?.summary).not.toContain('Flawless Blades');
});
it('opens a legal 2000-point Carnival, keeps all five daemon allies separate and grants Fulgrim the Warlord role',()=>{
 let a=build(['Fulgrim','Shalaxi Helbane','Keeper of Secrets','Daemonettes','Fiends','Seekers','Noise Marines','Lord Kakophonist','Chaos Rhino','Tormentors','Chaos Land Raider','Sorcerer','Chaos Spawn']);
 a=setInstanceModelCount(a,id('Tormentors'),10);
 a=setInstanceAttachment(a,id('Lord Kakophonist'),id('Noise Marines'));
 a=setInstanceAttachment(a,id('Sorcerer'),id('Tormentors'));
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a)))).store.profiles[0].army;
 expect(rosterCost2026(saved).total).toBe(2000);expect(errors(saved)).toEqual([]);
 expect(resolvedEmperorsChildrenWarlord(saved)?.unit).toBe('Fulgrim');
 expect(emperorsChildrenFormations(saved).find(g=>g.root.unit==='Noise Marines')?.members.map(s=>s.unit)).toEqual(['Noise Marines','Lord Kakophonist']);
 expect(emperorsChildrenCargoFormations(saved,find(saved,'Chaos Rhino')).map(g=>g.root.unit)).not.toContain('Daemonettes');
});
