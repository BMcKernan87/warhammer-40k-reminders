import {isDeepStrictEqual} from 'node:util';
import {modelProfile,rosterMetadata} from './import-wahapedia-11e.mjs';
import {readPrices} from './import-imperial-knights.mjs';

export const nativeNameKey=name=>name.toLowerCase().replace(/[‑–]/g,'-').replace(/[’‘]/g,"'").trim();

export function importNativeMuster(tables,manual,spec){
 const {name,slug,factionId}=spec;
 if(manual.slug!==slug||!manual.version)throw Error('Missing '+name+' MFM');
 const sources=new Map(tables.Source.map(s=>[s.id,s]));
 const native=tables.Datasheets.filter(d=>d.faction_id===factionId&&!sources.get(d.source_id)?.name.includes('Legends'));
 const priced=manual.units.filter(u=>!u.legends);
 const prices=new Map(priced.map(u=>[nativeNameKey(u.name),u]));
 const names=new Map(native.map(d=>[nativeNameKey(d.name),d.name]));
 if(prices.size!==priced.length||names.size!==native.length||names.size!==prices.size)throw Error(name+' inventories disagree');
 return native.map(d=>{
  const price=prices.get(nativeNameKey(d.name)),source=sources.get(d.source_id);
  const core=source?.edition==='11'&&source.name===name;
  const fw=source?.name===name+' (Forge World)'&&source.edition==='0'&&spec.packAircraftOrModels.includes(d.name);
  if(!price||(!core&&!fw)||!d.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/'+slug+'/'))throw Error(d.name+' missing 11th edition or matched-play evidence');
  const own=key=>tables[key].filter(s=>s.datasheet_id===d.id);
  const costs=readPrices(own('Datasheets_models_cost'),d.name,price);
  const data=rosterMetadata(tables,d.name,d.id);
  const min=data.composition.reduce((sum,m)=>sum+m.min,0),max=data.composition.reduce((sum,m)=>sum+m.max,0);
  if(min!==costs.sizes[0]||max!==costs.sizes.at(-1))throw Error(d.name+' size/cost bounds differ');
  const models=own('Datasheets_models');
  if(!models.length||new Set(models.map(m=>m.name)).size!==models.length)throw Error(d.name+' duplicate or missing model profile');
  const profiles=models.length===1?{profile:modelProfile(models[0],d.name)}:{modelProfiles:Object.fromEntries(models.map(m=>[m.name,modelProfile(m,d.name)]))};
  const edges=new Set(tables.Datasheets_leader.filter(l=>l.leader_id===d.id).map(l=>l.attached_id));
  const bodyguards=native.filter(b=>edges.has(b.id)).map(b=>b.name).sort();
  const manualBodies=(price.supportTo??price.leaderTo??[]).map(n=>names.get(nativeNameKey(n))).filter(Boolean).sort();
  if(!isDeepStrictEqual(bodyguards,manualBodies)||(d.is_support==='true')!==!!price.supportTo)throw Error(d.name+' source attachment disagreement');
  const attachment=bodyguards.length?{attachmentRole:d.is_support==='true'?'support':'leader',bodyguards}:{};
  return {faction:name,unit:d.name,source:d.link,pointsSource:'https://mfm.warhammer-community.com/en/'+slug,verified:'sizes-and-points',...costs,...data,...profiles,...attachment};
 }).sort((a,b)=>a.unit<b.unit?-1:1);
}
