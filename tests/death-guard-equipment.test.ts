// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {DEATH_GUARD_SHEETS,deathGuardAdditionalLeaderPair,deathGuardKeywords,deathGuardMusterUnits} from '../src/death-guard-data';
import {deathGuardHasRangedWeapon,deathGuardLoadout,deathGuardModelLoadouts,deathGuardWeaponCount} from '../src/death-guard-loadouts';
import {knightLoadoutFor,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const faction='Death Guard';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const count=deathGuardWeaponCount;
function equip(s:RosterInstance,slot:string,choice:string){
 const army:ArmySelection={...newSelection(faction),instances:[s],units:{[s.unit]:1}};
 return setKnightGear(army,s.id,slot,choice).instances![0];
}
function swap(s:RosterInstance,owner:string,items:string[]){
 const sheet=deathGuardLoadout(s.unit,s.models)!,key=(i:readonly string[])=>[...i].sort().join('|');
 const field=sheet.slots.find(f=>f.name.startsWith(owner)&&f.choices.some(c=>key(items)===key(c.items)));
 if(!field)throw Error('Missing physical selection '+s.unit+'/'+owner+'/'+items.join(', '));
 return equip(s,field.name,field.choices.find(c=>key(items)===key(c.items))!.name);
}
it.each(DEATH_GUARD_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s binds every legal squad size and every weapon exchange to its actual bearer',(unit,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+total),kit=knightLoadoutFor(faction,unit,+total)!,equipped=deathGuardModelLoadouts(s);
  expect(equipped).toHaveLength(+total);
  expect(equipped.reduce<Record<string,number>>((r,b)=>({...r,[b.model]:(r[b.model]??0)+1}),{})).toEqual(roles);
  for(const field of kit.slots)for(const choice of field.choices){
   if(unit==='Blightlord Terminators'){
    const items=choice.items,gun=items.includes('Plague spewer'),special=items.includes('Combi-weapon')||items.includes('Flail of corruption')||items.includes('Blight launcher')||items.includes('Reaper autocannon');
    const three=items.includes('Close combat weapon');
    if((gun&&(three?+total!==3:+total<5))||(+total<5&&special)){
     expect(()=>equip(s,field.name,choice.name)).toThrow();continue;
    }
   }
   const changed=equip(s,field.name,choice.name),initial=equipped.flatMap(b=>b.items);
   for(const item of field.choices[0].items){const n=initial.indexOf(item);expect(n).toBeGreaterThanOrEqual(0);initial.splice(n,1);}
   expect(deathGuardModelLoadouts(changed).flatMap(b=>b.items).sort()).toEqual([...initial,...choice.items].sort());
   expect(validKnightGear(changed,faction)).toBe(true);
  }
 }
});
it('distinguishes the three-model Blightlord spewer from per-five heavy weapons and removes it on growing the squad',()=>{
 let three=squad('Blightlord Terminators',3);
 three=swap(three,'Blightlord Terminator 1 ·',['Plague spewer','Close combat weapon']);
 expect(()=>swap(three,'Blightlord Terminator 2 ·',['Plague spewer','Close combat weapon'])).toThrow();
 expect(()=>swap(three,'Blightlord Champion',['Combi-weapon'])).toThrow();
 expect(count(three,'Plague spewer')).toBe(1);expect(count(three,'Bubotic blade')).toBe(2);
 let large={...three,models:5,knightGear:resizeKnightComposition(three,5,faction)};
 expect(count(large,'Plague spewer')).toBe(0);expect(count(large,'Bubotic blade')).toBe(5);
 large=swap(large,'Blightlord Terminator 1 ·',['Bubotic blade','Plague spewer']);
 expect(()=>swap(large,'Blightlord Terminator 2 ·',['Bubotic blade','Plague spewer'])).toThrow();
 expect(()=>swap(large,'Blightlord Terminator 2 ·',['Close combat weapon','Plague spewer'])).toThrow();
});
it('preserves the mandatory boltgun on the Plague Marine icon bearer and separately counts the Champion',()=>{
 let unit=squad('Plague Marines',10);
 unit=swap(unit,'Plague Champion · Boltgun',['Plasma gun']);unit=swap(unit,'Plague Champion · Plague knives',['Power fist']);
 unit=swap(unit,'Plague Marine 1 ·',['Boltgun','Icon of despair']);
 unit=swap(unit,'Plague Marine 2 ·',['Plasma gun']);unit=swap(unit,'Plague Marine 3 ·',['Meltagun']);
 expect(()=>swap(unit,'Plague Marine 4 ·',['Plague belcher'])).toThrow();expect(()=>swap(unit,'Plague Marine 4 ·',['Boltgun','Icon of despair'])).toThrow();
 expect(count(unit,'Icon of Despair (Aura)')).toBe(1);
 expect(deathGuardModelLoadouts(unit).find(b=>b.items.includes('Icon of despair'))!.items).toContain('Boltgun');
 expect(count(unit,'Plasma gun – supercharge')).toBe(2);
 unit=swap(unit,'Plague Marine 1 ·',['Blight launcher']);expect(count(unit,'Icon of despair')).toBe(0);
 let guard=squad('Deathshroud Terminators',3);
 guard=swap(guard,'Deathshroud Champion · Manreaper',['Plaguespurt gauntlet','Plaguespurt gauntlet','Manreaper']);
 guard=swap(guard,'Deathshroud Champion · Icon of despair',['Icon of despair']);
 expect(count(guard,'Plaguespurt gauntlet')).toBe(4);expect(count(guard,'Icon of Despair (Aura)')).toBe(1);
});
it('resolves native Defiler costs and distinguishes unarmed ranged slots or ranged Plaguespitters',()=>{
 const d=swap(squad('Defiler'),'', ['Hades lascannon','Heavy reaper autocannon']);
 const weapons=DEATH_GUARD_SHEETS.find(s=>s.unit==='Defiler')!.wargearPoints!;
 expect(Object.entries(weapons).reduce((sum,[item,p])=>sum+count(d,item)*p,0)).toBe(30);
 expect(count(d,'Excruciator cannon')).toBe(2);
 const bare=swap(squad('Helbrute'),'', ['Helbrute fist','Helbrute fist']);
 expect(deathGuardHasRangedWeapon(bare)).toBe(false);
 const two=swap(bare,'',['Helbrute fist','Helbrute fist','Heavy flamer','Combi-bolter']);
 expect(count(two,'Helbrute fist')).toBe(2);expect(count(two,'Combi-bolter')).toBe(1);
 expect(deathGuardHasRangedWeapon(squad('Foetid Bloat-drone'))).toBe(false);
 const spew=swap(squad('Foetid Bloat-drone'),'', ['Plaguespitter','Plaguespitter']);
 expect(deathGuardHasRangedWeapon(spew)).toBe(true);expect(count(spew,'Plaguespitter')).toBe(2);
});
it('checks both leaders’ eligibility, including the Noxious Blightbringer exception for Poxwalkers',()=>{
 expect(deathGuardAdditionalLeaderPair('Plague Marines','Foul Blightspawn','Plague Surgeon')).toBe(true);
 expect(deathGuardAdditionalLeaderPair('Plague Marines','Tallyman','Lord of Poxes')).toBe(true);
 expect(deathGuardAdditionalLeaderPair('Plague Marines','Lord of Poxes','Malignant Plaguecaster')).toBe(false);
 expect(deathGuardAdditionalLeaderPair('Plague Marines','Tallyman','Tallyman')).toBe(false);
 expect(deathGuardAdditionalLeaderPair('Poxwalkers','Malignant Plaguecaster','Noxious Blightbringer')).toBe(true);
 expect(deathGuardAdditionalLeaderPair('Poxwalkers','Tallyman','Noxious Blightbringer')).toBe(false);
 expect(deathGuardAdditionalLeaderPair('Poxwalkers','Typhus','Malignant Plaguecaster')).toBe(false);
 expect(deathGuardAdditionalLeaderPair('Blightlord Terminators','Lord of Contagion','Lord of Virulence')).toBe(false);
});
it('scopes the six Plague Legion allies, printing native keywords by detachment and excluding Legends',()=>{
 const a:ArmySelection={...newSelection(faction),battleSize2026:'Strike Force',detachments2026:['Tallyband Summoners']};
 const selected=deathGuardMusterUnits(a),normal=deathGuardMusterUnits({...a,detachments2026:['Virulent Vectorium']});
 expect(selected.filter(u=>!normal.includes(u)).sort()).toEqual(['Beasts of Nurgle','Great Unclean One','Nurglings','Plague Drones','Plaguebearers','Rotigus']);
 expect(selected).toContain('War Dog Karnivore');expect(selected).toContain('Chaos Warhound Titan');
 expect(selected).not.toContain('Death Guard Chaos Lord');expect(deathGuardMusterUnits({...a,battleSize2026:'Incursion'})).not.toContain('Chaos Warhound Titan');
 expect(deathGuardKeywords(a,squad('Poxwalkers'))).not.toContain('BATTLELINE');
 expect(deathGuardKeywords({...a,detachments2026:['Shamblerot Vectorium']},squad('Poxwalkers'))).toContain('BATTLELINE');
 const engine={...a,detachments2026:['Contagion Engines']};
 for(const unit of ['Foetid Bloat-drone','Foetid Bloat-drone with Heavy Blight Launcher','Helbrute','Myphitic Blight-hauler'])expect(deathGuardKeywords(engine,squad(unit))).toContain('CONTAGION ENGINE');
 expect(deathGuardKeywords(engine,squad('Plagueburst Crawler'))).not.toContain('CONTAGION ENGINE');
 let summoned=squad('Plague Drones');
 const slot=deathGuardLoadout(summoned.unit)!.slots;
 summoned=equip(summoned,slot[0].name,slot[0].choices[1].name);summoned=equip(summoned,slot[1].name,slot[1].choices[2].name);
 expect(count(summoned,'Daemonic Icon')).toBe(1);expect(count(summoned,'Instrument of Chaos')).toBe(1);
});
