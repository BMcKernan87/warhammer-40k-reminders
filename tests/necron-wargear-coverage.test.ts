import {describe,it,expect} from 'vitest';
import {CATALOG,addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,individualArmy,removeRosterInstance,setInstanceEquipment,setInstanceModelCount,setInstanceWargear,setInstanceWeaponCounts} from '../src/roster-instances';
import {NECRON_LOADOUTS,necronSource,slotLimit} from '../src/necron-wargear';
import {DATASHEETS_2026} from '../src/datasheets-2026';
import {generate11thReminders} from '../src/reminders-11th';

describe('11e Necron loadout coverage',()=>{
  it('covers the priced registry and the selectable Chronomancer, with explicit fixed or configurable gear',()=>{
    expect(DATASHEETS_2026.filter(s=>s.faction==='Necrons')).toHaveLength(51);
    expect(Object.keys(NECRON_LOADOUTS).sort()).toEqual([...CATALOG.Necrons.units].sort());
  });
  it.each(CATALOG.Necrons.units)('%s has a legal default at every registered size and rejects foreign gear',unit=>{
    const sheet=NECRON_LOADOUTS[unit];
    expect(sheet.fixed||sheet.primary?.length).toBeTruthy();
    const base=individualArmy(addSelectionUnit(newSelection(),unit));
    const sizes=DATASHEETS_2026.find(d=>d.unit===unit)?.sizes;
    for(const models of sizes??[1]){
      const army=sizes?setInstanceModelCount(base,unit+'#1',models):base;
      const squad=expandRoster(army)[0];
      expect(validateSelection(army)).toBe(true);
      expect(necronSource(unit)).toMatch(/wh40k11ed\/factions\/necrons\/[^/]+$/);
      expect(validateSelection({...army,instances:[{...squad,wargear:{'foreign item':0}}]})).toBe(false);
      for(const primary of sheet.primary??[])expect(validateSelection(setInstanceEquipment(army,squad.id,primary))).toBe(true);
      for(const slot of sheet.slots??[])for(const option of slot.choices){
        const limit=slotLimit(slot,models);
        expect(validateSelection(setInstanceWargear(army,squad.id,option,limit))).toBe(true);
        for(const invalid of [limit+1,-1,.5,NaN])expect(()=>setInstanceWargear(army,squad.id,option,invalid)).toThrow();
      }
    }
  });
  it('allows independent Wraith melee/ranged choices and prevents two guns on one bearer',()=>{
    let a=addSelectionUnit(newSelection(),'Canoptek Wraiths',2);
    const id='Canoptek Wraiths#2';
    a=setInstanceWeaponCounts(a,id,{'Vicious claws':1,'Whip coils':2});
    a=setInstanceWargear(a,id,'Particle caster',2);
    a=setInstanceWargear(a,id,'Transdimensional beamer',1);
    expect(validateSelection(a)).toBe(true);
    expect(()=>setInstanceWargear(a,id,'Particle caster',3)).toThrow();
    expect(a.instances![0].wargear).toBeUndefined();
    expect(validateSelection({...a,instances:[a.instances![0],{...a.instances![1],wargear:{'Particle caster':3,'Transdimensional beamer':1}}]})).toBe(false);
  });
  it('keeps distinct Macrocyte specialists and size-dependent Plasmacyte allowances',()=>{
    let macro=addSelectionUnit(newSelection(),'Canoptek Macrocytes');
    const id='Canoptek Macrocytes#1';
    macro=setInstanceEquipment(macro,id,'Tesla caster');
    macro=setInstanceWargear(macro,id,'Atomiser beam and nanoscarab projector',1);
    macro=setInstanceWargear(macro,id,'Accelerator mandible',1);
    expect(()=>setInstanceWargear(macro,id,'Accelerator mandible',2)).toThrow();
    let squad=setInstanceModelCount(addSelectionUnit(newSelection(),'Skorpekh Destroyers'),'Skorpekh Destroyers#1',6);
    squad=setInstanceWargear(squad,'Skorpekh Destroyers#1','Plasmacyte',2);
    squad=setInstanceModelCount(squad,'Skorpekh Destroyers#1',3);
    expect(squad.instances![0].wargear).toEqual({Plasmacyte:1});
  });
  it('keeps mutually exclusive Lord equipment separate from fixed and optional orbs',()=>{
    const lord=setInstanceWargear(addSelectionUnit(newSelection(),'Lokhust Lord'),'Lokhust Lord#1','Nanoscarab amulet',1);
    expect(()=>setInstanceWargear(lord,'Lokhust Lord#1','Resurrection orb',1)).toThrow();
    expect(generate11thReminders(lord).some(r=>r.title.includes('Resurrection Orb'))).toBe(false);
    expect(generate11thReminders(addSelectionUnit(newSelection(),'Overlord with translocation shroud')).some(r=>r.title.includes('Resurrection Orb'))).toBe(true);
  });
  it('keeps saved primary choices when opening grouped rosters and defaults new Monoliths to flux arcs',()=>{
    let a=addSelectionUnit(newSelection(),'Triarch Stalker');
    a={...a,equipment:{'Triarch Stalker':'Twin heavy gauss cannon'}};
    expect(validateSelection(a)).toBe(true);
    expect(validateSelection(individualArmy(a))).toBe(true);
    const monolith=addSelectionUnit(newSelection(),'Monolith');
    expect(expandRoster(monolith)[0].equipment).toBe('Four gauss flux arcs');
    expect(expandRoster({...monolith,equipment:{Monolith:'Four death rays'}})[0].equipment).toBe('Four death rays');
  });
});

it('a newly bought copy does not inherit the old bearer’s uses or casualties',()=>{
  let a=individualArmy(addSelectionUnit(newSelection(),'Overlord'));
  a=removeRosterInstance(a,'Overlord#1');
  const restored=JSON.parse(JSON.stringify(a));
  expect(validateSelection(restored)).toBe(true);
  expect(addSelectionUnit(restored,'Overlord').instances![0].id).toBe('Overlord#2');
});
