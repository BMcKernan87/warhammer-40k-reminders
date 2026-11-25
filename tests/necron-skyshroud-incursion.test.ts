import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {expandRoster,individualArmy,removeRosterInstance,setInstanceEquipment,setInstanceModelCount,setInstanceModelLoadouts} from '../src/roster-instances';
import {modelLoadoutRows} from '../src/necron-model-loadouts';
import {rosterCost2026} from '../src/datasheets-2026';
import {rosterFindings} from '../src/roster-findings';
import {grouped11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies,storeSavedArmies} from '../src/saved-armies';

const first='Tomb Blades#1',second='Tomb Blades#2';
function savedIncursion():ArmySelection {
  const selection={...newSelection('Necrons'),battleSize2026:'Incursion' as const,detachments2026:['Skysword Spearhead']};
  const units=['Tomb Blades','Tomb Blades','Lokhust Lord','Lokhust Heavy Destroyers','Immortals','Orikan the Diviner','Doomsday Ark','Triarch Stalker','Flayed Ones'];
  let army:ArmySelection=units.reduce<ArmySelection>((a,unit)=>addSelectionUnit(a,unit),selection);
  army=individualArmy({...army,equipment:{'Tomb Blades':'Twin tesla carbine','Triarch Stalker':'Twin heavy gauss cannon'},
    attachments:{'Lokhust Lord':'Lokhust Heavy Destroyers','Orikan the Diviner':'Immortals'},
    upgrades2026:{[first]:'Recursive Reanimation','Lokhust Heavy Destroyers':'Deepening Madness'}});
  return {...army,warlordId:'Lokhust Lord#1',equipment:{'Tomb Blades':'Twin tesla carbine'},instances:army.instances!.map(s=>{
    if(s.id===first)return {...s,models:4,equipment:undefined,wargear:{Nebuloscope:1}};
    if(s.id===second)return {...s,equipment:undefined,weaponCounts:{'Particle beamer':1,'Twin gauss blaster':2}};
    if(s.unit==='Immortals')return {...s,models:10};
    if(s.unit==='Lokhust Heavy Destroyers')return {...s,models:2,equipment:undefined,weaponCounts:{'Gauss destructor':1,'Enmitic exterminator':1}};
    return s;
  })};
}
const sheet=(army:ArmySelection)=>grouped11thReminders(army).flatMap(group=>group.reminders);
describe('reopening a 1,000-point Skyshroud Incursion with mixed saved equipment representations',()=>{
  it('resolves inherited guns, individual mixed weapons, attached characters, costs and named upgrades',()=>{
    const reopened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(savedIncursion()))));
    expect(reopened.retained).toEqual([]);
    const army=reopened.store.profiles[0].army;
    expect(rosterFindings(army).filter(f=>f.severity==='error')).toEqual([]);
    expect(rosterCost2026(army).total).toBe(1000);
    const rules=sheet(army);
    const guns=rules.filter(r=>r.window==='Shooting'&&r.title.includes('Ranged weapon abilities'));
    expect(guns.find(r=>r.title.startsWith(first))?.summary).toContain('Twin tesla carbine');
    expect(guns.find(r=>r.title.startsWith(second))?.summary).toContain('Particle beamer');
    expect(guns.find(r=>r.title.startsWith(second))?.summary).not.toContain('Twin tesla carbine');
    expect(guns.find(r=>r.title.startsWith('Triarch Stalker'))?.summary).toContain('Heavy gauss cannon array');
    expect(rules.some(r=>r.title.includes('Recursive Reanimation')&&r.units?.includes(first))).toBe(true);
    expect(rules.some(r=>r.title.includes('Recursive Reanimation')&&r.units?.includes(second))).toBe(false);
    expect(rules.some(r=>r.title.includes('Harbinger of Destruction')||r.title.includes('Canoptek Court'))).toBe(false);
    expect(new Set(rules.map(r=>r.id)).size).toBe(rules.length);
  });
  it('keeps surviving bearer assignments across intermediate strengths, deletion, re-add and profile persistence',()=>{
    const original=savedIncursion();
    let army=individualArmy(original);
    expect(army.equipment).toEqual({});
    const selected=expandRoster(army).find(s=>s.id===first)!;
    const rows=modelLoadoutRows(selected,4);
    expect(rows.every(r=>r.primary==='Twin tesla carbine')).toBe(true);
    const chosen=rows.map((row,i)=>({...row,gear:i===2?['Nebuloscope']:[]}));
    army=setInstanceModelLoadouts(army,first,chosen);
    for(const strength of [6,5,4]){
      army=setInstanceModelCount(army,first,strength);
      expect(rosterCost2026(army).total).toBe(1000);
      expect(expandRoster(army).find(s=>s.id===first)?.modelLoadouts?.[2]).toEqual(chosen[2]);
    }
    expect(rosterCost2026(setInstanceModelCount(army,first,3)).total).toBe(930);
    army=addSelectionUnit(removeRosterInstance(army,second),'Tomb Blades');
    const replacement=expandRoster(army).find(s=>s.id==='Tomb Blades#3');
    expect(replacement?.equipment).toBe('Twin gauss blaster');
    expect(replacement?.modelLoadouts).toBeUndefined();
    army=setInstanceEquipment(army,'Tomb Blades#3','Particle beamer');
    const reopened=openSavedArmies(JSON.parse(storeSavedArmies(initialStore(army),[]))).store.profiles[0].army;
    expect(validateSelection(reopened)).toBe(true);
    expect(rosterCost2026(reopened).total).toBe(1000);
    expect(sheet(reopened).some(r=>r.title.includes(second)||r.units?.includes(second))).toBe(false);
    expect(sheet(reopened).some(r=>r.units?.includes(first)&&r.summary.includes('Weapons on those bearers: Twin tesla carbine'))).toBe(true);
    expect(original.equipment).toEqual({'Tomb Blades':'Twin tesla carbine'});
  });
});
