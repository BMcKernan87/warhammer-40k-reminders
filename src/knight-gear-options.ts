export interface KnightSlot {
  name: string;
  choices: {name:string; items:readonly string[]}[];
}
export interface KnightEquipment {
  fixed: readonly string[];
  slots: readonly KnightSlot[];
}

export function countedKnightItems(items:readonly string[]):Record<string,number> {
  const counts:Record<string,number>={};
  for(const name of items) counts[name]=(counts[name]??0)+1;
  return counts;
}
export function knightItemsLabel(items:readonly string[]):string {
  return Object.entries(countedKnightItems(items)).map(([name,n])=>n>1?n+' × '+name:name).join(' + ')||'None';
}
// In each slot the first option is the printed standard equipment.
export function slot(name:string,...options:(string|readonly string[])[]):KnightSlot {
  return {name,choices:options.map(option=>{
    const items=typeof option==='string'?[option]:option;
    return {name:knightItemsLabel(items),items};
  })};
}
export const chassis=(fixed:readonly string[],...slots:KnightSlot[]):KnightEquipment=>({fixed,slots});

export function equippedItems(sheet:KnightEquipment|undefined,gear?:Record<string,string>):string[] {
 if(!sheet)return [];
 return [...sheet.fixed,...sheet.slots.flatMap(slot=>{
  const name=gear?.[slot.name]??slot.choices[0].name;
  return slot.choices.find(choice=>choice.name===name)?.items??[];
 })];
}
