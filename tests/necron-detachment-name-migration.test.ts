import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {DETACHMENTS_2026,detachmentBudget} from '../src/edition-2026';
import {currentNecronDetachment} from '../src/necron-detachment-names';
import {eligibleUpgrades2026,selectUpgrade2026,UPGRADES_2026} from '../src/upgrades-2026';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount,setInstanceModelLoadouts,setInstanceWeaponCounts} from '../src/roster-instances';
import {modelLoadoutRows} from '../src/necron-model-loadouts';
import {generate11thReminders} from '../src/reminders-11th';
import {rosterCost2026} from '../src/datasheets-2026';
import {migrateSavedArmy} from '../src/migrate-saved-army';
import {initialStore} from '../src/profiles';
import {openSavedArmies,storeSavedArmies} from '../src/saved-armies';

// Current primary Faction Pack v1.3: p3 prints SKYSHROUD SPEARHEAD and p4
// prints PRELOCATIONAL OPTIMISER. The old app key was not the printed name.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
const current='Skyshroud Spearhead',legacy='Skysword Spearhead';
function army(name=current):ArmySelection{
 let a=individualArmy({...newSelection('Necrons'),detachments2026:[name]});
 for(const unit of ['Tomb Blades','Tomb Blades','Lokhust Lord','Lokhust Heavy Destroyers','Immortals'])a=addSelectionUnit(a,unit);
 a=setInstanceAttachment(a,'Lokhust Lord#1','Lokhust Heavy Destroyers#1');
 a=setInstanceModelCount(a,'Lokhust Heavy Destroyers#1',2);
 a=setInstanceWeaponCounts(a,'Lokhust Heavy Destroyers#1',{'Gauss destructor':1,'Enmitic exterminator':1});
 const blades=expandRoster(a).find(s=>s.id==='Tomb Blades#1')!;
 a=setInstanceModelLoadouts(a,blades.id,modelLoadoutRows(blades,3).map((r,i)=>({...r,primary:i===0?'Particle beamer':'Twin gauss blaster',gear:i===1?['Nebuloscope']:[]})));
 a=selectUpgrade2026(a,'Tomb Blades#1','Recursive Reanimation');
 return selectUpgrade2026(a,'Lokhust Heavy Destroyers#1','Deepening Madness');
}

describe('source-backed Skyshroud name and legacy saved-key migration',()=>{
 it('publishes the printed name with the same DP and disposition, accepting only one normalized selection',()=>{
  expect(DETACHMENTS_2026.Necrons?.find(d=>d.name===current)).toEqual({name:current,disposition:'Reconnaissance',dp:1});
  expect(DETACHMENTS_2026.Necrons?.some(d=>d.name===legacy)).toBe(false);
  expect(detachmentBudget('Necrons',[legacy],'Incursion')).toEqual(detachmentBudget('Necrons',[current],'Incursion'));
  expect(detachmentBudget('Necrons',[legacy,current],'Strike Force').valid).toBe(false);
  expect(currentNecronDetachment('Unknown Spearhead')).toBe('Unknown Spearhead');
 });

 it('keeps canonical and legacy runtime selection equivalent for actual upgrades, attachments and all reminder IDs',()=>{
  const canonical=army(),older={...canonical,detachments2026:[legacy]};
  expect(validateSelection(canonical)).toBe(true);
  expect(validateSelection(older)).toBe(true);
  expect(eligibleUpgrades2026(older,'Tomb Blades')).toEqual(eligibleUpgrades2026(canonical,'Tomb Blades'));
  expect(eligibleUpgrades2026(canonical,'Immortals')).toEqual([]);
  expect(eligibleUpgrades2026(canonical,'Tomb Blades').map(u=>[u.name,u.detachment])).toEqual([['Recursive Reanimation',current]]);
  expect(generate11thReminders(older)).toEqual(generate11thReminders(canonical));
  const rows=generate11thReminders(canonical);
  expect(rows.filter(r=>r.sourceRuleId&&r.id.startsWith('11e-necron-skyshroud')).map(r=>r.sourceRuleId).sort()).toEqual(['000010888002','000010888003','000010888004']);
  expect(rows.find(r=>r.id==='11e-necron-skyshroud-deepstrike')?.units).toEqual(['Tomb Blades#1','Tomb Blades#2']);
  expect(rows.find(r=>r.id==='11e-necron-skyshroud-deepening')?.units).toEqual(['Lokhust Heavy Destroyers#1']);
  expect(rows.filter(r=>r.title.includes('Recursive Reanimation')).every(r=>r.units?.join()==='Tomb Blades#1')).toBe(true);
 });

 it('reopens old profiles without changing physical models, unit IDs, equipment, costs or attachments',()=>{
  const original=army(legacy),before=structuredClone(original);
  const raw=initialStore(original),opened=openSavedArmies(JSON.parse(JSON.stringify(raw)));
  expect(opened.retained).toEqual([]);
  expect(opened.store.activeId).toBe(raw.activeId);
  const restored=opened.store.profiles[0].army;
  expect(restored).toEqual({...original,detachments2026:[current]});
  expect(expandRoster(restored)).toEqual(expandRoster(original));
  expect(rosterCost2026(restored)).toEqual(rosterCost2026(original));
  expect(generate11thReminders(restored)).toEqual(generate11thReminders(original));
  expect(original).toEqual(before);
  expect(openSavedArmies(JSON.parse(storeSavedArmies(opened.store,[])))).toEqual(opened);
 });

 it('coalesces mixed old and current names on import without duplicating points or reminders',()=>{
  const original=army(legacy),mixed={...original,detachments2026:[legacy,current,'Hand of the Dynasty']};
  const migrated=migrateSavedArmy(mixed) as ArmySelection;
  expect(migrated.detachments2026).toEqual([current,'Hand of the Dynasty']);
  expect(migrated.instances).toBe(mixed.instances);
  expect(migrated.upgrades2026).toBe(mixed.upgrades2026);
  expect(detachmentBudget('Necrons',migrated.detachments2026!,'Strike Force')).toMatchObject({spent:2,valid:true});
  const rows=generate11thReminders(migrated);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
  expect(migrateSavedArmy(migrated)).toBe(migrated);
 });

 it('leaves other factions, unknown names and malformed detachment arrays untouched',()=>{
  const other={faction:'Orks',detachments2026:[legacy]},unknown={faction:'Necrons',detachments2026:['Unknown Spearhead']},malformed={faction:'Necrons',detachments2026:[legacy,null]};
  for(const value of [other,unknown,malformed,null,42])expect(migrateSavedArmy(value)).toBe(value);
 });

 it('uses the current September primary pack for starter-upgrade citations while preserving its printed Optimiser name',()=>{
  const starter=UPGRADES_2026.filter(u=>u.faction==='Necrons'&&[current,'Hand of the Dynasty',"The Phaeron's Armoury"].includes(u.detachment));
  expect(starter.length).toBeGreaterThan(0);
  expect(starter.every(u=>u.source==='https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf')).toBe(true);
  expect(starter.some(u=>u.name==='Prelocational Optimiser')).toBe(true);
  expect(starter.some(u=>u.name==='Relocational Optimiser')).toBe(false);
  expect(UPGRADES_2026.filter(u=>u.faction==='Necrons').some(u=>u.source.includes('eng_09-06'))).toBe(false);
 });
});
