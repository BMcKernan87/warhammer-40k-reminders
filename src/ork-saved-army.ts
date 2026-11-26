const names:Readonly<Record<string,string>>={'Warboss in Mega Armour':'Warboss In Mega Armour','Big Mek in Mega Armour':'Big Mek In Mega Armour'};
const oldBoyz=new Set(['Slugga and choppa','Shoota']);
const isMap=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);

export function migrateOrkArmy(value:unknown):unknown {
 if(!isMap(value)||value.faction!=='Orks'||!isMap(value.units))return value;
 const rename=(x:unknown)=>typeof x==='string'&&Object.hasOwn(names,x)?names[x]:x;
 for(const [oldName,name] of Object.entries(names))if(oldName in value.units&&name in value.units)return value;
 const result={...value};
 let changed=false;
 for(const key of ['units','equipment','enhancements','upgrades2026','retiredSquadNumbers','attachments']){
  const map=value[key];
  if(!isMap(map))continue;
  const replacement:Record<string,unknown>={};
  for(const [oldName,v] of Object.entries(map)){
   if(key==='equipment'&&oldName==='Boyz'&&typeof v==='string'&&oldBoyz.has(v)){changed=true;continue;}
   const name=rename(oldName) as string;
   const next=key==='attachments'?rename(v):v;
   if(oldName!==name||next!==v)changed=true;
   replacement[name]=next;
  }
  result[key]=replacement;
 }
 if(Array.isArray(value.instances))result.instances=value.instances.map(s=>{
  if(!isMap(s))return s;
  const unit=rename(s.unit);
  if(unit!==s.unit)changed=true;
  const model:Record<string,unknown>={...s,unit};
  if(unit==='Boyz'){
   // Both earlier primary choices are compulsory on every ordinary Boy now.
   if(typeof model.equipment==='string'&&oldBoyz.has(model.equipment)){delete model.equipment;changed=true;}
   if(isMap(model.weaponCounts)&&Object.keys(model.weaponCounts).every(k=>oldBoyz.has(k))){delete model.weaponCounts;changed=true;}
  }
  return model;
 });
 return changed?result:value;
}
