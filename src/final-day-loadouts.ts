import {FINAL_DAY_KITS} from './final-day-loadouts.generated';
import {GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import {equippedItems,slot,type KnightEquipment} from './knight-gear-options';
import type {RosterInstance} from './roster-instances';

const byUnit=new Map<string,typeof FINAL_DAY_KITS[number]>(FINAL_DAY_KITS.map(k=>[k.unit,k]));
const tiers=new Map(GSC_ALLIED_SHEETS.filter(s=>byUnit.has(s.unit)).map(s=>[s.unit,s.compositionBySize!]));
export function finalDayLoadout(unit:string,models?:number):KnightEquipment|undefined{
 const kit=byUnit.get(unit),sizes=tiers.get(unit);
 if(!kit||!sizes)return undefined;
 const n=models??Number(Object.keys(sizes)[0]);
 if(!Object.hasOwn(sizes,n))return undefined;
 const fixed=kit.fixed.flatMap(group=>Array.from({length:group.count==='each'?n:group.count},()=>group.items).flat());
 const slots=kit.variants.map(variant=>{
  for(const item of variant.standard){
   const position=fixed.findIndex(w=>w===item);
   if(position<0)throw Error(unit+' cannot replace '+item);
   fixed.splice(position,1);
  }
  return slot('Bio-weapon',variant.standard,...variant.choices);
 });
 return {fixed,slots};
}
export function finalDayHasRangedWeapon(squad:RosterInstance):boolean{
 const kit=byUnit.get(squad.unit);
 if(!kit)return false;
 const ranged=new Set<string>(kit.weapons.filter(w=>w.phase==='Shooting').map(w=>w.name));
 return equippedItems(finalDayLoadout(squad.unit,squad.models),squad.knightGear).some(w=>ranged.has(w));
}
