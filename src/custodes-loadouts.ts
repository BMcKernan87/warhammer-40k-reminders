import {CUSTODES_KITS} from './custodes-loadouts.generated';
import type {RosterInstance} from './roster-instances';
import {equippedItems,knightItemsLabel,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';

// Each Custodes unit with a weapon choice replaces that weapon on every model.
// The 11e datasheets specify this explicitly. Optional vexillas belong to one bearer.
export function custodesLoadout(unit:string,models?:number):KnightEquipment|undefined {
 const kit=CUSTODES_KITS.find(record=>record.unit===unit);
 if(!kit)return undefined;
 const size=models??kit.min;
 if(!Number.isInteger(size)||size<kit.min||size>kit.max)return undefined;
 const forSquad=(items:readonly string[])=>Array.from({length:size},()=>items).flat();
 const slots:KnightSlot[]=[];
 if(kit.choices.length){
  slots.push({name:size===1?'Weapons':'Squad weapons',choices:kit.choices.map(choice=>({
   name:knightItemsLabel(choice),items:forSquad(choice)
  }))});
 }
 for(const gear of kit.optional)slots.push(slot(gear,[],gear));
 return {fixed:forSquad(kit.fixed),slots};
}

export function custodesHasRangedWeapon(squad:RosterInstance):boolean {
 const record=CUSTODES_KITS.find(kit=>kit.unit===squad.unit);
 if(!record)return false;
 const ranged:ReadonlySet<string>=new Set(record.ranged);
 return equippedItems(custodesLoadout(squad.unit,squad.models),squad.knightGear).some(item=>ranged.has(item));
}
