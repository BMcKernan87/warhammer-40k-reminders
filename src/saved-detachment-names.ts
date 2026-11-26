export function migrateSavedDetachments(value:unknown,faction:string,current:(name:string)=>string):unknown{
 if(!value||typeof value!=='object'||!('faction' in value)||value.faction!==faction||!('detachments2026' in value)||!Array.isArray(value.detachments2026))return value;
 const selected=value.detachments2026;
 if(!selected.every((name):name is string=>typeof name==='string')||!selected.some(name=>current(name)!==name))return value;
 return {...value,detachments2026:[...new Set(selected.map(current))]};
}
