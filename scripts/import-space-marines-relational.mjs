import {isDeepStrictEqual} from 'node:util';

export const SM_SOURCE_IDS=['000000139','000000362','000000035'];
export const spaceMarineNameKey=name=>name.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[‑–]/g,'-').replace(/\s+/g,' ').trim();
export const spaceMarineModelName=(unit,name)=>{
 if(name.toUpperCase()==='ALL MODELS')return 'ALL MODELS';
 let value=name.replace(/\s+models?$/i,'');
 if(unit==='Wardens of Ultramar'&&value==='Dainal Komelius')value='Dainal Kornelius';
 if(unit.toLowerCase()==='vanguard veteran squad with jump packs'&&['Vanguard Veteran','Vanguard Veteran Sergeant'].includes(value))value+=' with Jump Pack';
 return value;
};

/** Preserve actual physical roles; these are exact spelling aliases, not new models. */
export function spaceMarineCompositions(rows,units){
 const out=structuredClone(rows);
 const wardens=out.find(c=>c.unit_id==='wardens-of-ultramar');
 if(!wardens||wardens.models.filter(m=>m.name==='Dainal Komelius').length!==1)throw Error('Review Wardens model spelling');
 for(const c of out){
  const name=units.find(u=>u.id===c.unit_id)?.name;
  if(!name)throw Error('Composition without unit '+c.unit_id);
  const rename=n=>spaceMarineModelName(name,n);
  c.models=c.models.map(m=>({...m,name:rename(m.name),...(m.profile_name?{profile_name:rename(m.profile_name)}:{})}));
  for(const t of c.tiers??[])t.models=t.models.map(m=>({...m,name:rename(m.name)}));
  for(const key of ['stock','templates','slots','limits','options','uniform'])for(const r of c.loadout[key]??[])if(r.model)r.model=rename(r.model);
 }
 return out;
}

/** Chapter views repeat identical complete price bands in the public CSV. */
export function spaceMarinePriceRows(rows,unit){
 const sorted=[...rows].sort((a,b)=>Number(a.line)-Number(b.line));
 const kept=[],seen=new Set();let band='';
 for(const row of sorted){
  if(row.description.startsWith('<div class="dsHeaderComp">')){
   if(unit!=='Decimus Kill Team')throw Error('Unreviewed composition-specific price '+unit);
   continue;
  }
  if(!row.cost)band=row.description;
  const key=JSON.stringify([band,row.description,row.cost]);
  if(!seen.has(key)){kept.push({...row,line:String(kept.length+1)});seen.add(key);}
 }
 return kept;
}

export function spaceMarineManual(base,deathwatch,native){
 for(const [manual,slug] of [[base,'space-marines'],[deathwatch,'deathwatch']])if(manual.slug!==slug||manual.version!=='1.6'||manual.firstSeen!=='2026-10-14')throw Error('Review Space Marines MFM revision');
 const selected=new Map();
 for(const d of native){
  const manual=d.source_id==='000000035'?deathwatch:base;
  const entries=manual.units.filter(u=>!u.legends&&spaceMarineNameKey(u.name)===spaceMarineNameKey(d.name));
  if(entries.length!==1)throw Error('Missing current MFM unit '+d.name);
  const common=deathwatch.units.find(u=>!u.legends&&spaceMarineNameKey(u.name)===spaceMarineNameKey(d.name));
  if(d.source_id!=='000000035'&&common){
   const eligible=names=>names.filter(n=>native.some(d=>spaceMarineNameKey(d.name)===spaceMarineNameKey(n))).sort();
   const pricing=u=>({pricing:u.pricing,wargear:u.wargear??[],leaderTo:eligible(u.leaderTo??[]),supportTo:eligible(u.supportTo??[])});
   if(!isDeepStrictEqual(pricing(entries[0]),pricing(common)))throw Error('Chapter changes shared MFM entry '+d.name);
  }
  selected.set(d.name,entries[0]);
 }
 if(base.units.filter(u=>!u.legends).length!==87||native.length!==97||selected.size!==97)throw Error('Review matched-play Space Marines inventory');
 return selected;
}
