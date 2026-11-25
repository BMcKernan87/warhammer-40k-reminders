import {readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parse as parseYaml} from 'yaml';
import {loadExport,modelProfile,parseCosts,rosterMetadata} from './import-wahapedia-11e.mjs';

const nameKey=name=>name.toLowerCase().replace(/[’‘]/g,"'").trim();
const fail=message=>{throw Error('Knight datasheet import: '+message);};
const forgepactAllies=['Tech-priest Dominus','Tech-priest Manipulus','Skitarii Marshal','Skitarii Rangers','Skitarii Vanguard'];
const imperialPack='https://assets.warhammer-community.com/eng_wh40k_faction_pack_imperial_knights-n1irjnjygs-w8jfnk8kdn.pdf';

const knightFactions={
 'imperial-knights':{faction:'Imperial Knights',id:'QI',allyId:'AdM',allySlug:'adeptus-mechanicus',publisherPack:imperialPack},
 'chaos-knights':{faction:'Chaos Knights',id:'QT',allyId:'CSM',allySlug:'chaos-space-marines',
  publisherPack:'https://assets.warhammer-community.com/eng_wh40k_faction_pack_chaos_knights-87ywk2jovh-xk68yzyb18.pdf'},
};
function alliedNames(tables,spec,sources){
 if(spec.id==='QI')return forgepactAllies;
 // Iconoclast Fiefdom permits DAMNED allies. Use the native keywords, rather
 // than duplicate Knight-catalog entries which also list numerous Legends units.
 const damned=new Set(tables.Datasheets_keywords.filter(k=>k.keyword.toUpperCase()==='DAMNED').map(k=>k.datasheet_id));
 return tables.Datasheets.filter(row=>row.faction_id===spec.allyId&&damned.has(row.id)&&!sources.get(row.source_id)?.name.includes('Legends')).map(d=>d.name);
}

function indexByName(items,label){
 const map=new Map();
 for(const item of items){
  const name=nameKey(item.name);
  if(!name||map.has(name))fail(label+' duplicate or missing name');
  map.set(name,item);
 }
 return map;
}
export function readPrices(rows,unit,mfm){
 // The weapon surcharge section follows, and is independent of, all unit copy brackets.
 const sorted=[...rows].sort((a,b)=>Number(a.line)-Number(b.line));
 const separator=sorted.findIndex(row=>row.description.trim().toUpperCase()==='WARGEAR OPTIONS');
 const prices=parseCosts(separator===-1?sorted:sorted.slice(0,separator),unit);
 const gear=separator===-1?[]:sorted.slice(separator+1).map(row=>{
  const match=/^per (.+)$/i.exec(row.description.trim());
  if(!match||!/^\d+$/.test(row.cost)||Number(row.cost)<=0)fail(unit+' invalid wargear price');
  return {item:match[1],points:Number(row.cost)};
 });
 const pricesByCopy={1:prices.pointsBySize,...prices.laterCopyPointsBySize};
 const expected={};
 let nextCopy=1;
 for(const band of mfm.pricing){
  const range=/^\[(\d+),(\d+\]|\))$/.exec(band.range);
  if(!range||Number(range[1])!==nextCopy)fail(unit+' overlapping or incomplete MFM copy ranges');
  const last=range[2]===')'?Infinity:Number(range[2].slice(0,-1));
  if(last<nextCopy)fail(unit+' invalid MFM copy range');
  nextCopy=last+1;
  expected[range[1]]=Object.fromEntries(band.costs.map(cost=>[cost.models,cost.points]));
 }
 if(nextCopy!==Infinity||!isDeepStrictEqual(expected,pricesByCopy)||!isDeepStrictEqual(gear.map(g=>({...g,item:nameKey(g.item)})),(mfm.wargear??[]).map(g=>({...g,item:nameKey(g.item)}))))fail(unit+' has inconsistent CSV/MFM pricing');
 return {...prices,...(gear.length?{wargearPoints:Object.fromEntries(gear.map(g=>[g.item,g.points]))}:{})};
}
export function importKnights(tables,manual,allyManual){
 const spec=knightFactions[manual.slug];
 if(!spec||allyManual.slug!==spec.allySlug||!manual.version||manual.version!==allyManual.version)fail('mismatched faction manuals or revisions');
 const sources=new Map(tables.Source.map(row=>[row.id,row]));
 const {faction,publisherPack}=spec;
 const allyNames=alliedNames(tables,spec,sources);
 const native=tables.Datasheets.filter(d=>d.faction_id===spec.id&&!allyNames.includes(d.name)&&d.name!=='Sir Hekhtur'&&!sources.get(d.source_id)?.name.includes('Legends'));
 const indexedNative=indexByName(native,faction);
 const included=manual.units.filter(u=>!u.legends);
 if(indexedNative.size!==included.length)fail('matched-play CSV and MFM datasheet inventories differ');
 const nativePrices=indexByName(included,faction);
 const allyPrices=indexByName(allyManual.units.filter(u=>!u.legends),spec.allySlug);
 const nativeAllies=indexByName(tables.Datasheets.filter(d=>d.faction_id===spec.allyId&&allyNames.includes(d.name)),spec.allySlug);
 const units=[...included.map(u=>indexedNative.get(nameKey(u.name))),...allyNames.map(u=>nativeAllies.get(nameKey(u)))];
 if(units.some(d=>!d))fail('missing independently confirmed matched-play datasheet');
 const datasheets=units.map(d=>{
  const ally=d.faction_id===spec.allyId;
  const mfm=(ally?allyPrices:nativePrices).get(nameKey(d.name));
  const source=sources.get(d.source_id);
  // Nine Imperial Armour rows have a legacy "0" source marker, and
  // Destrier has none. These specific units are printed in the current-edition
  // publisher pack and independently have current matched-play MFM entries.
  const packBacked=(!d.source_id&&d.name==='Knight Destrier')||(!ally&&source?.name===faction+' (Forge World)'&&source.edition==='0');
  if(!mfm||(!packBacked&&(source?.edition!=='11'||!source.version)))fail(d.name+' missing edition or MFM evidence');
  const path=ally?spec.allySlug:manual.slug;
  if(!d.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/'+path+'/'))fail(d.name+' unexpected sheet URL');
  const owned=table=>tables[table].filter(row=>row.datasheet_id===d.id);
  const costs=readPrices(owned('Datasheets_models_cost'),d.name,mfm);
  const models=owned('Datasheets_models');
  if(!models.length||new Set(models.map(m=>m.name)).size!==models.length)fail(d.name+' missing or duplicate model profiles');
  const profiles=models.length===1?{profile:modelProfile(models[0],d.name)}:
   {modelProfiles:Object.fromEntries(models.map(m=>[m.name,modelProfile(m,d.name)]))};
  const metadata=rosterMetadata(tables,d.name,d.id);
  const allowedBodies=(mfm.supportTo??mfm.leaderTo??[]).filter(name=>allyNames.includes(name)).sort();
  if(allowedBodies.length){
   const bodyIds=new Set(tables.Datasheets_leader.filter(row=>row.leader_id===d.id).map(row=>row.attached_id));
   const exportBodies=[...nativeAllies.values()].filter(body=>bodyIds.has(body.id)).map(body=>body.name).sort();
   if(!isDeepStrictEqual(allowedBodies,exportBodies)||(d.is_support==='true')!==!!mfm.supportTo)fail(d.name+' attachment mismatch');
   metadata.bodyguards=allowedBodies;
   metadata.attachmentRole=mfm.supportTo?'support':'leader';
  }
  const min=metadata.composition.reduce((sum,m)=>sum+m.min,0);
  const max=metadata.composition.reduce((sum,m)=>sum+m.max,0);
  if(costs.sizes[0]!==min||costs.sizes.at(-1)!==max)fail(d.name+' composition and MFM disagree');
  return {faction,unit:d.name,source:d.link,pointsSource:d.link,verified:'sizes-and-points',...costs,...metadata,...profiles};
 }).sort((a,b)=>a.unit<b.unit?-1:1);
 return {revision:tables.Last_update[0].last_update,mfmVersion:manual.version,publisherPack,datasheets};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [csv,mfmDir,output,slug='imperial-knights']=process.argv.slice(2);
  if(!csv||!mfmDir||!output||!knightFactions[slug])fail('usage: node scripts/import-imperial-knights.mjs <11e CSV directory> <MFM data directory> <generated TS file> [imperial-knights|chaos-knights]');
  const {tables}=await loadExport({directory:csv});
  const manual=slug=>parseYaml(readFileSync(join(mfmDir,slug+'.yaml'),'utf8'));
  const {datasheets,...revision}=importKnights(tables,manual(slug),manual(knightFactions[slug].allySlug));
  const generated='// Generated from the 11e Wahapedia export and checked against the October MFM mirror.\n'+
   "import type {Datasheet2026} from './datasheets-2026';\n"+
   'export const KNIGHT_DATA_REVISION='+JSON.stringify(revision)+' as const;\n'+
   'export const '+(slug==='chaos-knights'?'CHAOS_KNIGHT_SHEETS':'IMPERIAL_KNIGHT_SHEETS')+':readonly Datasheet2026[]='+JSON.stringify(datasheets,null,2)+';\n';
  const temp=output+'.tmp-'+process.pid;
  try{writeFileSync(temp,generated,{flag:'wx'});renameSync(temp,output);}finally{rmSync(temp,{force:true});}
 }catch(error){console.error(error.message);process.exitCode=1;}
}
