import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceWeaponCounts,setInstanceModelCount} from '../src/roster-instances';
describe('datasheet-specific primary weapon restrictions',()=>{
 for(const unit of ['Immortals','Lychguard']){
  it(unit+' cannot mix primary weapons in a single squad',()=>{
   let army=addSelectionUnit(newSelection(),unit);
   army={...army,instances:expandRoster(army)};
   const options=unit==='Immortals'?['Gauss blaster','Tesla carbine']:['Warscythe','Hyperphase sword and dispersion shield'];
   expect(()=>setInstanceWeaponCounts(army,unit+'#1',{[options[0]]:3,[options[1]]:2})).toThrow('same primary weapon');
   army={...army,instances:army.instances!.map(x=>({...x,weaponCounts:{[options[0]]:3,[options[1]]:2}}))};
   expect(validateSelection(army)).toBe(false);
  });
 }
 it('Lokhust Heavy Destroyers still permit mixed primary weapons',()=>{
  let army=addSelectionUnit(newSelection(),'Lokhust Heavy Destroyers');
  army={...army,instances:expandRoster(army)};
  army=setInstanceModelCount(army,'Lokhust Heavy Destroyers#1',3);
  army=setInstanceWeaponCounts(army,'Lokhust Heavy Destroyers#1',{'Gauss destructor':2,'Enmitic exterminator':1});
  expect(validateSelection(army)).toBe(true);
 });
});
