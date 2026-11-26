// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {DEATH_GUARD_SHEETS,deathGuardMusterUnits} from '../src/death-guard-data';
import {deathGuardUnitLimit,deathGuardWarlordCandidates,resolvedDeathGuardWarlord,selectDeathGuardWarlord} from '../src/death-guard-muster';
import {deathGuardCargoFormations,deathGuardFormations,deathGuardTransportReminders} from '../src/death-guard-transports';
import {deathGuardLoadout} from '../src/death-guard-loadouts';
import {autoAttachUnambiguousInstances,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
const build=(units:string[],d='Tallyband Summoners',size:ArmySelection['battleSize2026']='Strike Force')=>{
 let a=individualArmy({...newSelection('Death Guard'),detachments2026:[d],battleSize2026:size});for(const u of units)a=addSelectionUnit(a,u);return a;
};
const id=(u:string)=>u+'#1',find=(a:ArmySelection,u:string)=>a.instances!.find(s=>s.unit===u)!;
const errors=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
it('musters and prices all 36 battle and Tallyband sheets, including variable Terminator strengths and subsequent copies',()=>{
 expect(DEATH_GUARD_SHEETS).toHaveLength(36);
 for(const sheet of DEATH_GUARD_SHEETS){
  const a=build([sheet.unit]);
  for(const size of verifiedUnitSizes2026(a,sheet.unit)!){
   const selected=setInstanceModelCount(a,id(sheet.unit),size);
   expect(validateSelection(selected)).toBe(true);
   expect(rosterCost2026(selected).entries[0].points).toBe(sheet.pointsBySize![sheet.sizes.find(s=>s>=size)!]);
  }
 }
 let a=build(['Blightlord Terminators','Blightlord Terminators','Blightlord Terminators']);
 a=setInstanceModelCount(a,'Blightlord Terminators#3',10);expect(rosterCost2026(a).entries[2].points).toBe(400);
});
it('allows each of six printed different second Leaders to join a Plague Marines squad without admitting duplicates or an unsupported pair',()=>{
 for(const extra of ['Biologus Putrifier','Foul Blightspawn','Icon Bearer','Noxious Blightbringer','Plague Surgeon','Tallyman']){
  let a=build(['Plague Marines','Lord of Poxes',extra,extra,'Malignant Plaguecaster']);
  a=setInstanceAttachment(a,id(extra),id('Plague Marines'));
  expect(()=>setInstanceAttachment(a,extra+'#2',id('Plague Marines'))).toThrow();
  a=setInstanceAttachment(a,id('Lord of Poxes'),id('Plague Marines'));
  expect(deathGuardFormations(a).find(g=>g.root.unit==='Plague Marines')?.members.map(s=>s.unit)).toEqual(['Plague Marines','Lord of Poxes',extra]);
  expect(()=>setInstanceAttachment(a,id('Malignant Plaguecaster'),id('Plague Marines'))).toThrow();
  a=setInstanceAttachment(a,id(extra),null);expect(()=>setInstanceAttachment(a,id('Malignant Plaguecaster'),id('Plague Marines'))).toThrow();
 }
 const automatic=autoAttachUnambiguousInstances(build(['Plague Marines','Lord of Poxes','Plague Surgeon']));
 expect(automatic.instances!.filter(s=>s.attachedTo===id('Plague Marines'))).toHaveLength(2);
});
it('allows only the Blightbringer to add a second Leader on Poxwalkers, then accounts for every model and Terminator seat',()=>{
 let a=build(['Poxwalkers','Typhus','Noxious Blightbringer','Malignant Plaguecaster','Chaos Rhino','Chaos Land Raider']);
 a=setInstanceAttachment(a,id('Typhus'),id('Poxwalkers'));
 expect(()=>setInstanceAttachment(a,id('Malignant Plaguecaster'),id('Poxwalkers'))).toThrow();
 a=setInstanceAttachment(a,id('Noxious Blightbringer'),id('Poxwalkers'));
 expect(deathGuardCargoFormations(a,find(a,'Chaos Land Raider')).find(g=>g.root.unit==='Poxwalkers')?.spaces).toBe(13);
 expect(deathGuardCargoFormations(a,find(a,'Chaos Rhino')).map(g=>g.root.unit)).not.toContain('Poxwalkers');
 a=setInstanceAttachment(a,id('Typhus'),null);a=setInstanceAttachment(a,id('Malignant Plaguecaster'),id('Poxwalkers'));
 expect(deathGuardCargoFormations(a,find(a,'Chaos Rhino')).find(g=>g.root.unit==='Poxwalkers')?.spaces).toBe(12);
});
it('gates Plague Legions, their half-army allowance, native Warlord role, Shamblerot Poxwalker limit and Dreadblade allowance',()=>{
 let a=build(['Lord of Poxes','Great Unclean One','Rotigus','War Dog Brigand'],'Tallyband Summoners','Incursion');
 expect(errors(a)).toContain('plague-legions-allowance');
 expect(deathGuardWarlordCandidates(a).map(s=>s.unit)).toEqual(['Lord of Poxes']);
 expect(()=>selectDeathGuardWarlord(a,id('Rotigus'))).toThrow();
 expect(deathGuardUnitLimit(a,'Knight Abominant')).toBe(0);a=addSelectionUnit(a,'Knight Abominant');expect(errors(a)).toContain('dreadblade-allowance');
 expect(deathGuardMusterUnits(a)).not.toContain('Chaos Warhound Titan');
 const shamble={...a,detachments2026:['Shamblerot Vectorium']};
 expect(deathGuardUnitLimit(shamble,'Poxwalkers')).toBe(4);expect(deathGuardUnitLimit(a,'Poxwalkers')).toBe(2);
 expect(deathGuardMusterUnits(shamble)).not.toContain('Rotigus');expect(errors(shamble)).toContain('dg-ineligible');
});
it('charges Defiler weapons per held gun, in addition to its later-copy price',()=>{
 let a=build(['Defiler','Defiler']);const slot=deathGuardLoadout('Defiler')!.slots.find(s=>s.choices.some(c=>c.items.includes('Hades lascannon')&&c.items.includes('Heavy reaper autocannon')))!;
 const pair=slot.choices.find(c=>c.items.includes('Hades lascannon')&&c.items.includes('Heavy reaper autocannon'))!;
 a=setKnightGear(a,'Defiler#2',slot.name,pair.name);
 expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual([300,380]);
});
it('reopens historical Death Lord and Mortarion detachment names without changing existing units or their IDs',()=>{
 for(const name of ["Death Lord's Chosen","Mortarion's Hammer"]){
  const a=build(['Mortarion','Plague Marines'],name);
  const store=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));
  expect(store.retained).toEqual([]);
  expect(store.store.profiles[0].army.detachments2026).toEqual([name.replace("'",'’')]);
  expect(store.store.profiles[0].army.instances).toEqual(a.instances);
 }
});
it('opens an exact 1000-point army with a full two-Leader Rhino, a second Marine squad and three Blightlords with their Lord',()=>{
 let a=build(['Lord of Poxes','Tallyman','Plague Marines','Plague Marines','Chaos Rhino','Blightlord Terminators','Lord of Virulence','Chaos Land Raider','Poxwalkers','Icon Bearer'],'Shamblerot Vectorium','Incursion');
 a=setInstanceModelCount(a,id('Plague Marines'),10);
 for(const leader of ['Lord of Poxes','Tallyman'])a=setInstanceAttachment(a,id(leader),id('Plague Marines'));
 a=setInstanceAttachment(a,id('Lord of Virulence'),id('Blightlord Terminators'));
 a=setInstanceAttachment(a,id('Icon Bearer'),'Plague Marines#2');a=selectDeathGuardWarlord(a,id('Lord of Virulence'));
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a)))).store.profiles[0].army;
 expect(rosterCost2026(saved).total).toBe(1000);expect(errors(saved)).toEqual([]);
 const reminders=deathGuardTransportReminders(saved);
 expect(reminders.find(r=>r.title==='Chaos Rhino#1 · Declare passengers')?.summary).toContain('Plague Marines#1 (12 spaces)');
 expect(reminders.find(r=>r.title==='Chaos Land Raider#1 · Declare passengers')?.summary).toContain('Blightlord Terminators#1 (8 spaces)');
});
it('opens a legal 2000-point Tallyband with all six Plague Legions allies, Typhus with Deathshroud and native Mortarion as Warlord',()=>{
 let a=build(['Mortarion','Rotigus','Great Unclean One','Nurglings','Plaguebearers','Plague Drones','Beasts of Nurgle','Typhus','Deathshroud Terminators','Plague Marines','Malignant Plaguecaster','Chaos Rhino','Plagueburst Crawler','Helbrute']);
 a=setInstanceAttachment(a,id('Typhus'),id('Deathshroud Terminators'));a=setInstanceAttachment(a,id('Malignant Plaguecaster'),id('Plague Marines'));
 const saved=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a)))).store.profiles[0].army;
 expect(rosterCost2026(saved).total).toBe(2000);expect(errors(saved)).toEqual([]);
 expect(resolvedDeathGuardWarlord(saved)?.unit).toBe('Mortarion');
 expect(deathGuardCargoFormations(saved,find(saved,'Chaos Rhino')).map(g=>g.root.unit)).toEqual(['Plague Marines']);
});
