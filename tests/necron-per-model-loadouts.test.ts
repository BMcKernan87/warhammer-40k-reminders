import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceEquipment,setInstanceModelCount,setInstanceModelLoadouts,setInstanceWargear,setInstanceWeaponCounts} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore,validateStore} from '../src/profiles';
import type {ModelLoadout} from '../src/necron-model-loadouts';

const roster=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const blades='Tomb Blades#1';
const mixedBlades:ModelLoadout[]=[
  {primary:'Particle beamer',gear:['Shieldvanes','Nebuloscope']},
  {primary:'Twin tesla carbine',gear:['Shadowloom']},
  {primary:'Twin gauss blaster',gear:[]},
];
describe('per-model options from the 11e Necron datasheets',()=>{
  it('applies the optic to the actual weapon, independently per squad, through save and reopen',()=>{
    const army=setInstanceModelLoadouts(roster('Tomb Blades','Tomb Blades'),blades,mixedBlades);
    const saved=JSON.parse(JSON.stringify(initialStore(army)));
    expect(validateStore(saved)).toBe(true);
    const rules=generate11thReminders(saved.profiles[0].army).filter(r=>r.title.includes('Nebuloscope'));
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every(r=>r.units?.includes(blades)&&r.summary.includes('Particle beamer')&&!r.summary.includes('Twin tesla'))).toBe(true);
    expect(expandRoster(army)[0].weaponCounts).toEqual({'Particle beamer':1,'Twin tesla carbine':1,'Twin gauss blaster':1});
  });
  it('honors old mixed count-only saves without inventing the bearer weapon',()=>{
    let army=setInstanceWeaponCounts(roster('Tomb Blades'),blades,{'Particle beamer':1,'Twin gauss blaster':2});
    army=setInstanceWargear(army,blades,'Nebuloscope',1);
    expect(validateStore(initialStore(army))).toBe(true);
    const rule=generate11thReminders(army).find(r=>r.title.includes('Nebuloscope'));
    expect(rule?.summary).toContain('surviving Nebuloscope bearers');
    expect(rule?.summary).not.toMatch(/Particle beamer|Twin gauss blaster/);
  });
  it('retains explicit associations through total adjustments, resize and uniform replacement',()=>{
    let army=setInstanceModelLoadouts(roster('Tomb Blades'),blades,mixedBlades);
    army=setInstanceWargear(army,blades,'Shieldvanes',2);
    army=setInstanceWeaponCounts(army,blades,{'Particle beamer':1,'Twin gauss blaster':2});
    expect(expandRoster(army)[0].modelLoadouts?.[0]).toEqual(mixedBlades[0]);
    army=setInstanceModelCount(army,blades,6);
    expect(expandRoster(army)[0].modelLoadouts?.slice(3)).toEqual(Array(3).fill({primary:'Twin gauss blaster',gear:[]}));
    const rows=expandRoster(army)[0].modelLoadouts!;
    army=setInstanceModelLoadouts(army,blades,rows.map((row,i)=>i===5?{primary:'Particle beamer',gear:['Nebuloscope']}:row));
    army=setInstanceModelCount(army,blades,3);
    expect(expandRoster(army)[0].wargear?.Nebuloscope).toBe(1);
    army=setInstanceEquipment(army,blades,'Twin tesla carbine');
    expect(expandRoster(army)[0].modelLoadouts?.every(row=>row.primary==='Twin tesla carbine')).toBe(true);
    expect(validateSelection(army)).toBe(true);
  });
  it('prevents two optics or two Wraith guns sharing one model and rejects forged saved totals',()=>{
    const army=roster('Tomb Blades','Canoptek Wraiths');
    expect(()=>setInstanceModelLoadouts(army,blades,[{primary:'Particle beamer',gear:['Shadowloom','Nebuloscope']},...mixedBlades.slice(1)])).toThrow();
    expect(()=>setInstanceModelLoadouts(army,'Canoptek Wraiths#1',Array(3).fill({primary:'Vicious claws',gear:['Particle caster','Transdimensional beamer']}))).toThrow();
    const next=setInstanceModelLoadouts(army,blades,mixedBlades);
    for(const patch of [{weaponCounts:{'Twin gauss blaster':3}},{wargear:{Shadowloom:3}},{modelLoadouts:[]},{modelLoadouts:[null,null,null]}]){
      expect(validateSelection({...next,instances:next.instances!.map(s=>s.id===blades?{...s,...patch}:s)})).toBe(false);
    }
  });
  it('accepts each printed combination of weapons, one optic and shieldvanes on Tomb Blades',()=>{
    for(const primary of ['Twin gauss blaster','Twin tesla carbine','Particle beamer']){
      for(const optic of [[],['Nebuloscope'],['Shadowloom']]){
        for(const armour of [[],['Shieldvanes']]){
          const army=setInstanceModelLoadouts(roster('Tomb Blades'),blades,[{primary,gear:[...optic,...armour]},...mixedBlades.slice(1)]);
          expect(validateSelection(army)).toBe(true);
          const rules=generate11thReminders(army);
          expect(rules.some(r=>r.title.includes('Shieldvanes'))).toBe(armour.length>0);
          expect(rules.some(r=>r.title.includes('Nebuloscope'))).toBe(optic.includes('Nebuloscope'));
        }
      }
    }
  });
  it('accepts every Wraith melee/ranged pairing and all three independent Spyder options',()=>{
    for(const primary of ['Vicious claws','Whip coils']){
      for(const gun of [[],['Particle caster'],['Transdimensional beamer']]){
        const army=setInstanceModelLoadouts(roster('Canoptek Wraiths'),'Canoptek Wraiths#1',Array(3).fill({primary,gear:gun}));
        expect(validateSelection(army)).toBe(true);
        expect(generate11thReminders(army).some(r=>r.id==='11e-core-overwatch')).toBe(gun.length>0);
      }
    }
    for(const beamers of [[],['Pair of particle beamers']]){
      for(const claw of [[],['Fabricator claw array']]){
        for(const prism of [[],['Gloom prism']]){
          const army=setInstanceModelLoadouts(roster('Canoptek Spyders'),'Canoptek Spyders#1',[{gear:[...beamers,...claw,...prism]}]);
          expect(validateSelection(army)).toBe(true);
          expect(generate11thReminders(army).some(r=>r.id==='11e-core-overwatch')).toBe(beamers.length>0);
        }
      }
    }
  });
});
describe('Fire Overwatch, core 04.01.01 and 15.08',()=>{
  const eligible=(army:ReturnType<typeof roster>)=>generate11thReminders(army).find(r=>r.id==='11e-core-overwatch')?.units??[];
  it('excludes formations with no ranged weapons and includes the actual armed leader through its formation',()=>{
    let army=roster('Canoptek Scarab Swarms','Lychguard','Overlord');
    army=setInstanceAttachment(army,'Overlord#1','Lychguard#1');
    expect(eligible(army)).toEqual(['Lychguard#1']);
    expect(eligible(setInstanceEquipment(army,'Overlord#1','Voidscythe'))).toEqual([]);
  });
  it('checks default, optional or fixed ranged weapons on each squad separately',()=>{
    let army=roster('Canoptek Wraiths','Canoptek Wraiths','Canoptek Spyders','Lokhust Lord','Lychguard','Doomsday Ark','Monolith','Orikan the Diviner');
    army=setInstanceWargear(army,'Canoptek Wraiths#2','Transdimensional beamer',1);
    expect(eligible(army)).toEqual(['Canoptek Wraiths#2','Lokhust Lord#1','Doomsday Ark#1']);
    army=setInstanceEquipment(army,'Lokhust Lord#1','Lord’s blade');
    expect(eligible(army)).toEqual(['Canoptek Wraiths#2','Doomsday Ark#1']);
  });
});
