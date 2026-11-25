const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

// Retain assigned IDs so references to attached units, enhancements and the Warlord still resolve.
export function renameSavedUnit(value:unknown,faction:string,former:string,current:string):unknown {
 if(!isRecord(value)||value.faction!==faction||!isRecord(value.units)||!(former in value.units)||current in value.units)return value;
 const renamed=(v:unknown)=>v===former?current:v;
 const result={...value};
 for(const key of ['units','equipment','enhancements','upgrades2026','retiredSquadNumbers','attachments']){
  const map=value[key];
  if(!isRecord(map))continue;
  result[key]=Object.fromEntries(Object.entries(map).map(([k,v])=>[renamed(k),key==='attachments'?renamed(v):v]));
 }
 if(Array.isArray(value.instances))result.instances=value.instances.map(s=>isRecord(s)&&s.unit===former?{...s,unit:current}:s);
 return result;
}
