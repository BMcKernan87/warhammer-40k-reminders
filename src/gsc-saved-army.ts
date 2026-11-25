import {currentGscDetachment} from './gsc-detachment-data';

export function migrateGscDetachments(value:unknown):unknown{
 if(!value||typeof value!=='object'||!('faction' in value)||value.faction!=='Genestealer Cults'||!('detachments2026' in value)||!Array.isArray(value.detachments2026))return value;
 const selected=value.detachments2026;
 if(!selected.every((name):name is string=>typeof name==='string')||!selected.some(name=>currentGscDetachment(name)!==name))return value;
 return {...value,detachments2026:[...new Set(selected.map(currentGscDetachment))]};
}
