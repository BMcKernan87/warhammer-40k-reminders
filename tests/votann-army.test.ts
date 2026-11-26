import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {setKnightGear} from '../src/knight-loadouts';
import {eligibleVotannUpgrades} from '../src/votann-detachment-data';

function roster(detachment:string,...units:string[]):ArmySelection {
  const counts:Record<string,number>={};
  const instances=units.map(unit=>{counts[unit]=(counts[unit]??0)+1;return {id:unit+'#'+counts[unit],unit};});
  return {...newSelection('Leagues of Votann'),detachments2026:[detachment],units:counts,instances};
}
const rule=(army:ArmySelection,key:string,window:string)=>generate11thReminders(army)
  .find(r=>r.id.startsWith('11e-votann:'+key+':')&&r.window===window);
it('settles objective income in both Command phases and applies the phase-end stance threshold only in native stances',()=>{
  const ordinary=roster('Needgaârd Oathband','Kâhl','Cthonian Beserks','Sagitaur');
  expect(rule(ordinary,'earn','Command')).toMatchObject({turn:'either',timing:'end'});
  expect(rule(ordinary,'stance','Command')).toMatchObject({turn:'own',timing:'end',summary:expect.stringContaining('7+ YP')});
  expect(rule({...ordinary,detachments2026:['Mercenary Oathband']},'stance','Command')?.summary).toMatch(/pay 3 YP to switch/);
  expect(rule(ordinary,'fortify','Fight')?.units).toEqual(['Kâhl#1','Cthonian Beserks#1']);
  expect(rule(ordinary,'hit','Shooting')?.units).toEqual(['Kâhl#1','Sagitaur#1']);
  expect(rule(ordinary,'hit','Movement')).toBeUndefined();
});
it('offers fire-support buffs only to armed eligible recipients and with the relevant transport',()=>{
  const infantry=roster('Brandfast Oathband','Hearthkyn Warriors','Cthonian Beserks');
  expect(rule(infantry,'relay','Shooting')).toBeUndefined();
  const supported=roster('Brandfast Oathband','Hearthkyn Warriors','Cthonian Beserks','Sagitaur');
  expect(rule(supported,'relay','Shooting')).toMatchObject({units:['Hearthkyn Warriors#1'],summary:expect.stringContaining('Sagitaur#1')});
  expect(rule(supported,'relay','Movement')).toBeUndefined();
  expect(rule(roster('Farseekers','Hernkyn Pioneers','Hearthkyn Warriors'),'hunt','Shooting')?.units).toEqual(['Hernkyn Pioneers#1']);
});
it('requires the actual combi-bolter on the selected bearer and preserves the chosen upgrade when a swap would invalidate it',()=>{
  const army=roster('Needgaârd Oathband','Kâhl','Kâhl','Arkanyst Evaluator');
  const options=(a:ArmySelection,unit:string,id:string)=>eligibleVotannUpgrades(a,unit,id).map(u=>u.name);
  const alternate=setKnightGear(army,'Kâhl#2','Firearm','Volkanite disintegrator');
  expect(options(alternate,'Kâhl','Kâhl#1')).toContain('Iron Ambassador');
  expect(options(alternate,'Kâhl','Kâhl#2')).not.toContain('Iron Ambassador');
  expect(options(alternate,'Arkanyst Evaluator','Arkanyst Evaluator#1')).not.toContain('Iron Ambassador');
  expect(()=>setKnightGear({...army,upgrades2026:{'Kâhl#1':'Iron Ambassador'}},'Kâhl#1','Firearm','Volkanite disintegrator')).toThrow('Remove Iron Ambassador');
});
it('restores both printed Hearthband dispositions under the full detachment budget',()=>{
  const budget=detachmentBudget('Leagues of Votann',['Hearthband'],'Strike Force');
  expect(budget.valid).toBe(true);
  expect(budget.dispositions.sort()).toEqual(['Priority Assets','Reconnaissance']);
  expect(detachmentBudget('Leagues of Votann',['Hearthband','Hearthguard Covenant'],'Strike Force').valid).toBe(false);
});
it('gates each remaining detachment effect on its actual squad and activation window',()=>{
  const units=['Kâhl','Einhyr Hearthguard','Cthonian Beserks','Sagitaur','Brôkhyr Thunderkyn','Memnyr Strategist'];
  const checks=[
    ['Hearthband','methodical-ap','Fight',['Kâhl#1','Einhyr Hearthguard#1']],
    ['Persecution Prospect','guerrilla','Shooting',['Kâhl#1','Einhyr Hearthguard#1','Sagitaur#1','Brôkhyr Thunderkyn#1','Memnyr Strategist#1']],
    ['Dêlve Assault Shift','fury','Pre-battle',['Cthonian Beserks#1']],
    ['Hearthfyre Arsenal','optimal-yield','Command',['Memnyr Strategist#1']],
    ['Hearthfyre Arsenal','optimal-fire','Shooting',['Brôkhyr Thunderkyn#1']],
    ['Armoured Trailblazers','spearhead','Pre-battle',['Sagitaur#1']],
    ['Hearthguard Covenant','avatars','Shooting',['Kâhl#1','Einhyr Hearthguard#1']],
  ] as const;
  for(const [detachment,key,window,expected] of checks){
    expect(rule(roster(detachment,...units),key,window)?.units,detachment+'/'+key).toEqual(expected);
    expect(rule(roster('Needgaârd Oathband',...units),key,window)).toBeUndefined();
  }
});
