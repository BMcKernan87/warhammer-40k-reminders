import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {expandRoster,individualArmy,setInstanceModelLoadouts,type RosterInstance} from '../src/roster-instances';
import {initialStore,validateStore} from '../src/profiles';

// Each Tomb Blade carries exactly one chosen primary, and each Wraith replaces
// its claws with coils individually. The physical rows must describe the same
// weapons the saved roster actually resolves, including older unit-wide fields.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Tomb-Blades
// https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Wraiths
const units=[
 ['Tomb Blades','Twin gauss blaster','Twin tesla carbine'],
 ['Canoptek Wraiths','Vicious claws','Whip coils'],
] as const;
const roster=(unit:string)=>individualArmy(addSelectionUnit(newSelection('Necrons'),unit,2));
const rows=(primary:string)=>Array.from({length:3},()=>({primary,gear:[]}));
const reopen=(army:ArmySelection)=>JSON.parse(JSON.stringify(initialStore(army)));
const patch=(army:ArmySelection,id:string,fields:Partial<RosterInstance>)=>({...army,
 instances:army.instances!.map(s=>s.id===id?{...s,...fields}:s)});

describe('saved Necron equipment and physical-model consistency',()=>{
 it.each(units)('accepts matching legacy %s equipment on reopen', (unit,_default,chosen)=>{
  const id=unit+'#1';
  const army={...patch(roster(unit),id,{equipment:undefined,modelLoadouts:rows(chosen)}),equipment:{[unit]:chosen}};
  expect(expandRoster(army).find(s=>s.id===id)?.equipment).toBe(chosen);
  expect(validateSelection(army)).toBe(true);
  expect(validateStore(reopen(army))).toBe(true);
 });
 it.each(units)('rejects a %s save whose legacy primary disagrees with its model rows',(unit,original,chosen)=>{
  const id=unit+'#1';
  const army={...patch(roster(unit),id,{equipment:undefined,modelLoadouts:rows(original)}),equipment:{[unit]:chosen}};
  expect(expandRoster(army).find(s=>s.id===id)?.equipment).toBe(chosen);
  expect(validateSelection(army)).toBe(false);
  expect(validateStore(reopen(army))).toBe(false);
 });
 it('keeps a duplicate squad’s explicit weapon and model choice ahead of legacy equipment',()=>{
  const unit='Tomb Blades',first=unit+'#1',second=unit+'#2';
  const army={...setInstanceModelLoadouts(roster(unit),second,rows('Particle beamer')),equipment:{[unit]:'Twin tesla carbine'}};
  const reopened=reopen(army);
  expect(validateStore(reopened)).toBe(true);
  const resolved=expandRoster(reopened.profiles[0].army);
  expect(resolved.find(s=>s.id===first)?.equipment).toBe('Twin gauss blaster');
  expect(resolved.find(s=>s.id===second)).toMatchObject({equipment:'Particle beamer',modelLoadouts:rows('Particle beamer')});
 });
 it('keeps an explicit mixed distribution ahead of the legacy uniform choice',()=>{
  const unit='Tomb Blades',id=unit+'#1';
  const physical=[{primary:'Particle beamer',gear:['Nebuloscope']},...rows('Twin gauss blaster').slice(1)];
  const army={...setInstanceModelLoadouts(roster(unit),id,physical),equipment:{[unit]:'Twin tesla carbine'}};
  const reopened=reopen(army);
  expect(validateStore(reopened)).toBe(true);
  expect(expandRoster(reopened.profiles[0].army).find(s=>s.id===id)).toMatchObject({
   weaponCounts:{'Particle beamer':1,'Twin gauss blaster':2},modelLoadouts:physical,wargear:{Nebuloscope:1},
  });
 });
});
