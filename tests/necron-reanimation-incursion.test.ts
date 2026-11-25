import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {selectWarlord} from '../src/necron-muster-legality';
import {setRetinue} from '../src/necron-retinues';
import {generate11thReminders} from '../src/reminders-11th';
import {rosterFindings} from '../src/roster-findings';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';

it('resolves Reanimation once per battlefield formation in a legal 1,000-point Incursion',()=>{
 const selected=['Necron Warriors','Overlord with translocation shroud','Technomancer','Cryptothralls','Canoptek Reanimator','Doomsday Ark','Immortals','Royal Warden','Skorpekh Destroyers','Canoptek Scarab Swarms'];
 let army:ArmySelection={...individualArmy(selected.reduce((a,name)=>addSelectionUnit(a,name),newSelection('Necrons'))),battleSize2026:'Incursion',detachments2026:['Hand of the Dynasty']};
 const id=(name:string)=>expandRoster(army).find(s=>s.unit===name)!.id;
 const warriors=id('Necron Warriors'),immortals=id('Immortals'),warlord=id('Overlord with translocation shroud');
 army=setInstanceModelCount(setInstanceModelCount(army,warriors,20),immortals,10);
 army=setInstanceAttachment(army,warlord,warriors);
 army=setInstanceAttachment(army,id('Technomancer'),warriors);
 army=setRetinue(army,id('Cryptothralls'),warriors);
 army=setInstanceAttachment(army,id('Royal Warden'),immortals);
 army=selectWarlord(army,warlord);
 expect(rosterCost2026(army).total).toBe(1000);
 expect(rosterFindings(army).filter(f=>f.severity==='error')).toEqual([]);
 const sheet=generate11thReminders(army);
 const activations=sheet.filter(r=>r.id==='11e-necron-reanimation');
 expect(activations).toHaveLength(1);
 expect(activations[0]).toMatchObject({window:'Command',timing:'end'});
 expect(activations[0].units?.toSorted()).toEqual([warriors,immortals,id('Canoptek Reanimator'),id('Doomsday Ark'),id('Skorpekh Destroyers'),id('Canoptek Scarab Swarms')].sort());
 expect(activations[0].summary).toMatch(/one wound.*coherency/);
 expect(activations[0].summary).toContain('can restore its lost Bodyguards');
 expect(sheet.some(r=>r.title.includes('Nanoscarab Reanimation Beam')&&r.window==='Command')).toBe(true);
 expect(sheet.some(r=>r.title.includes('Resurrection Orb')&&r.window==='Fight')).toBe(true);
 expect(sheet.some(r=>r.title.includes('Protocol of the Undying Legions'))).toBe(false);
});

it('omits revival and reactive destroyed-model targets from a one-model Awakened army',()=>{
 const army={...addSelectionUnit(newSelection('Necrons'),'Overlord'),detachments2026:['Awakened Dynasty']};
 const sheet=generate11thReminders(army);
 expect(sheet.find(r=>r.id==='11e-necron-reanimation')?.summary).not.toMatch(/return a destroyed|restore its lost/);
 expect(sheet.some(r=>r.title.includes('Protocol of the Undying Legions'))).toBe(false);
});
