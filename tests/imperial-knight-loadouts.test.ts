import {describe,expect,it} from 'vitest';
import type {ArmySelection} from '../src/catalog';
import {autoAttachUnambiguousInstances,reconcileInstanceAttachments,expandRoster,setInstanceAttachment,validateRosterInstances,type RosterInstance} from '../src/roster-instances';
import {instanceBodyguards,knightJoinedBodyguard} from '../src/leader-eligibility';
import {IMPERIAL_KNIGHT_LOADOUTS,knightEquippedItems,knightWeaponCount,setKnightGear,validKnightGear} from '../src/imperial-knight-loadouts';

const unit=(name:string,id=name+'#1'):RosterInstance=>({unit:name,id});
function roster(...instances:RosterInstance[]):ArmySelection {
  const units:Record<string,number>={};
  for(const squad of instances)units[squad.unit]=(units[squad.unit]??0)+1;
  return {faction:'Imperial Knights',detachment:'Select detachment (unverified)',units,instances};
}
const change=(squad:RosterInstance,slot:string,choice:string)=>expandRoster(setKnightGear(roster(squad),squad.id,slot,choice))[0];

describe('equipped 11th-edition Imperial Knight weapon profiles',()=>{
  it('keeps the paid Crusader cannon and its accompanying stubber on the selected model',()=>{
    const first=unit('Knight Crusader'),second=unit('Knight Crusader','Knight Crusader#2');
    let army=setKnightGear(roster(first,second),second.id,'Cannon','Rapid-fire battle cannon + Questoris heavy stubber');
    army=setKnightGear(army,second.id,'Hull weapon','Questoris heavy stubber');
    const squads=expandRoster(JSON.parse(JSON.stringify(army)));
    expect(knightWeaponCount(squads[0],'Thermal cannon')).toBe(1);
    expect(knightWeaponCount(squads[0],'Rapid-fire battle cannon')).toBe(0);
    expect(knightWeaponCount(squads[1],'Rapid-fire battle cannon')).toBe(1);
    expect(knightWeaponCount(squads[1],'Questoris heavy stubber')).toBe(2);
    expect(knightWeaponCount(squads[1],'Meltagun')+knightWeaponCount(squads[1],'Thermal cannon')).toBe(0);
    expect(validKnightGear(squads[1])).toBe(true);
    expect(knightWeaponCount(unit('Knight Paladin'),'Rapid-fire battle cannon')).toBe(1);
  });
  it('rejects duplicate Destrier melee arms and preserves either legal handed pairing',()=>{
    const model=unit('Knight Destrier');
    for(const selected of ['Bellatus reaper chainsword','Thundershock spear']){
      const updated=change(model,'Gatling arm',selected);
      expect(()=>change(updated,'Bombard arm',selected)).toThrow();
      const opposite=selected==='Thundershock spear'?'Bellatus reaper chainsword':'Thundershock spear';
      const melee=change(updated,'Bombard arm',opposite);
      expect(knightWeaponCount(melee,opposite+' – sweep')).toBe(1);
      expect(knightWeaponCount(melee,'Chastiser gatling cannon')+knightWeaponCount(melee,'Frag bombard')).toBe(0);
    }
  });
  it('keeps the Helverin’s armoured feet off the Warglaive datasheet',()=>{
    expect(knightWeaponCount(unit('Armiger Helverin'),'Armoured feet')).toBe(1);
    expect(knightWeaponCount(unit('Armiger Warglaive'),'Armoured feet')).toBe(0);
    expect(knightWeaponCount(unit('Armiger Warglaive'),'Reaper chain-cleaver – sweep')).toBe(1);
  });
  it('adds both linked weapons per Moirax siege arm, including two matching arms',()=>{
    let squad=unit('Armiger Moirax');
    for(const arm of ['Volkite arm','Graviton arm'])squad=change(squad,arm,'Siege claw + Rad cleanser');
    expect(knightWeaponCount(squad,'Siege claw')).toBe(2);
    expect(knightWeaponCount(squad,'Rad cleanser')).toBe(2);
    expect(knightWeaponCount(squad,'Graviton pulsar')+knightWeaponCount(squad,'Volkite veuglaire')).toBe(0);
    expect(knightWeaponCount(squad,'Armoured feet')).toBe(1);
  });
  it('enforces entire paired cannon and missile groups on Dominus and Porphyrion hulls',()=>{
    for(const name of ['Knight Castellan','Knight Valiant']){
      let model=unit(name);
      expect(knightWeaponCount(model,'Shieldbreaker missile launcher')).toBe(2);
      model=change(model,'Carapace','Shieldbreaker missile launcher + 2 × Twin siegebreaker cannon');
      expect(knightWeaponCount(model,'Twin siegebreaker cannon')).toBe(2);
      expect(knightWeaponCount(model,'Twin meltagun')).toBe(2);
      expect(knightWeaponCount(model,'Shieldbreaker missile launcher')).toBe(1);
      expect(()=>change(model,'Carapace','2 × Twin siegebreaker cannon')).toThrow();
    }
    const mixed=change(unit('Acastus Knight Porphyrion'),'Hull guns','Acastus autocannon + Lascannon');
    expect(knightWeaponCount(mixed,'Lascannon')).toBe(1);
    expect(knightWeaponCount(mixed,'Acastus autocannon')).toBe(1);
    expect(knightWeaponCount(change(mixed,'Missiles','Helios defence missiles'),'Acastus ironstorm missile pod')).toBe(0);
  });
  it('keeps the alpha, three distinct specialists and optic bearer legal in both Forgepact squads',()=>{
    for(const [name,rifle] of [['Skitarii Rangers','Galvanic rifle'],['Skitarii Vanguard','Radium carbine']]){
      let squad=unit(name);
      expect(knightWeaponCount(squad,rifle)).toBe(10);
      for(const special of ['Arc rifle','Plasma caliver','Transuranic arquebus'])squad=change(squad,special+' bearer',special);
      squad=change(squad,'Alpha firearm','Mechanicus pistol');
      squad=change(squad,'Alpha melee equipment','Alpha combat weapon');
      squad=change(squad,'Standard rifle bearer equipment','Omnispex');
      expect(knightWeaponCount(squad,rifle)).toBe(6);
      expect(knightWeaponCount(squad,'Close combat weapon')).toBe(10);
      expect(knightWeaponCount(squad,'Alpha combat weapon')).toBe(1);
      expect(knightWeaponCount(squad,'Plasma caliver – supercharge')).toBe(1);
      expect(knightWeaponCount(squad,'Enhanced data-tether')).toBe(0);
      expect(()=>change(squad,'Standard rifle bearer equipment','Omnispex + Enhanced data-tether')).toThrow();
      expect(()=>change(squad,'Arc rifle bearer','Plasma caliver')).toThrow();
    }
  });
  it('rejects unknown slots, options, invalid saved shapes and foreign faction use',()=>{
    for(const gear of [null,[],{'Hull weapon':'Volcano lance'},{'Gatling arm':'Missing'}]){
      expect(validateRosterInstances(roster({...unit('Knight Errant'),knightGear:gear as Record<string,string>}))).toBe(false);
    }
    expect(validKnightGear({...unit('Armiger Helverin'),knightGear:{Carapace:'Meltagun'}})).toBe(false);
    expect(validateRosterInstances({...roster({...unit('Knight Errant'),knightGear:{}}),faction:'Necrons'})).toBe(false);
  });
});

// Expected counts come from the independent substitutions on each October datasheet,
// including bundled replacements, optional carapace items and Destrier exclusions.
const legalConfigurations:Record<string,number>={
  'Acastus Knight Asterius':1,'Acastus Knight Porphyrion':6,'Armiger Helverin':2,'Armiger Warglaive':2,
  'Armiger Moirax':25,'Canis Rex':1,'Cerastus Knight Acheron':1,'Cerastus Knight Atrapos':1,
  'Cerastus Knight Castigator':1,'Cerastus Knight Lancer':1,'Knight Castellan':2,'Knight Crusader':16,
  'Knight Defender':1,'Knight Destrier':7,'Knight Errant':16,'Knight Gallant':8,'Knight Paladin':16,
  'Knight Preceptor':24,'Knight Valiant':2,'Knight Warden':16,'Questoris Knight Magaera':2,
  'Questoris Knight Styrix':2,'Skitarii Marshal':1,'Tech-priest Dominus':4,'Tech-priest Manipulus':2,
  'Skitarii Rangers':96,'Skitarii Vanguard':96,'Sir Hekhtur':1,
};
it.each(Object.entries(legalConfigurations))('builds every legal printed loadout for %s',(name,total)=>{
  const base=unit(name);
  let choices=[base];
  for(const slot of IMPERIAL_KNIGHT_LOADOUTS[name].slots)choices=choices.flatMap(squad=>
    slot.choices.flatMap(c=>{
      const proposed={...squad,knightGear:{...squad.knightGear,[slot.name]:c.name}};
      if(!validKnightGear(proposed))return [];
      return [change(squad,slot.name,c.name)];
    }));
  expect(choices).toHaveLength(total);
  for(const squad of choices){
    expect(knightEquippedItems(squad).length).toBeGreaterThan(0);
    expect(validateRosterInstances(roster(squad))).toBe(true);
  }
});

it('permits each allied leader only on an available Forgepact Skitarii squad',()=>{
  for(const leader of ['Tech-priest Dominus','Tech-priest Manipulus','Skitarii Marshal']){
    const character=unit(leader),body=unit('Skitarii Rangers'),knight=unit('Knight Castellan');
    const army={...roster(character,body,knight),detachments2026:['Questor Forgepact']};
    expect(instanceBodyguards(army,character)).toEqual(['Skitarii Rangers','Skitarii Vanguard']);
    expect(instanceBodyguards({...army,detachments2026:[]},character)).toEqual([]);
    expect(()=>setInstanceAttachment(army,character.id,knight.id)).toThrow();
    const joined=setInstanceAttachment(army,character.id,body.id);
    expect(expandRoster(joined).find(s=>s.id===character.id)?.attachedTo).toBe(body.id);
  }
});

it('uses separate October Marshal Support and Tech-Priest Leader slots with automatic and explicit assignments',()=>{
  const marshal=unit('Skitarii Marshal'),priest=unit('Tech-priest Dominus'),body=unit('Skitarii Rangers');
  const army={...roster(marshal,priest,body),detachments2026:['Questor Forgepact']};
  const joined=autoAttachUnambiguousInstances(army);
  for(const s of expandRoster(joined).filter(s=>s.id!==body.id))expect(knightJoinedBodyguard(joined,s)?.id).toBe(body.id);
  const retracted=setInstanceAttachment(joined,priest.id,null);
  expect(expandRoster(autoAttachUnambiguousInstances(retracted)).find(s=>s.id===priest.id)?.attachedTo).toBeUndefined();
  const noPact=reconcileInstanceAttachments({...joined,detachments2026:[]});
  expect(expandRoster(noPact).some(s=>s.attachedTo)).toBe(false);

  for(const other of [unit('Tech-priest Manipulus'),unit('Skitarii Marshal','Marshal#2')]){
    const bad={...roster(body,...[priest,marshal,other].map(s=>({...s,attachedTo:body.id}))),detachments2026:['Questor Forgepact']};
    expect(validateRosterInstances(bad)).toBe(false);
    expect(knightJoinedBodyguard(bad,bad.instances![1])).toBeUndefined();
  }
});
