import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generateDatasheets} from './import-datasheets.mjs';

export const BASE='https://wahapedia.ru/wh40k11ed/';
export const TABLES={
 Factions:['id','name'], Source:['id','edition','version','name'],
 Datasheets:['id','name','faction_id','source_id','link'],
 Datasheets_models:['datasheet_id','line','m','t','sv','w','ld','oc'],
 Datasheets_models_cost:['datasheet_id','line','description','cost'],
 Datasheets_abilities:['datasheet_id','line','ability_id','name','description','type'],
 Abilities:['id','name','description'],
 Datasheets_keywords:['datasheet_id','keyword'],
 Datasheets_options:['datasheet_id','line','description'],
 Datasheets_wargear:['datasheet_id','line','line_in_wargear','name','description','type'],
 Datasheets_leader:['leader_id','attached_id'],
 Datasheets_stratagems:['datasheet_id','stratagem_id'],
 Datasheets_enhancements:['datasheet_id','enhancement_id'],
 Datasheets_detachment_abilities:['datasheet_id','detachment_ability_id'],
 Detachments:['id','faction_id','name','dp'],
 Detachment_abilities:['id','faction_id','name','detachment_id','description'],
 Stratagems:['id','faction_id','name','detachment_id','phase','turn','description'],
 Enhancements:['id','faction_id','name','detachment_id','description'],
 Last_update:['last_update'],
};
const fail=s=>{throw Error('Wahapedia 11e: '+s)};
const norm=s=>s.normalize('NFKC').replace(/[’‘]/g,"'").trim().toLowerCase();
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export function parseExport(text,required,table){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
 const header=lines.shift().split('|');
 if(header.at(-1)==='')header.pop();
 const cols=header.map(s=>s.trim().toLowerCase().replace(/\s+/g,'_'));
 if(new Set(cols).size!==cols.length||required.some(k=>!cols.includes(k)))fail(table+' missing/duplicate columns');
 let pending='';const result=[];
 for(const line of lines){
  if(!pending&&!line.trim())continue;
  pending=pending?pending+'\n'+line:line;
  const parts=pending.split('|');
  if(parts.length<cols.length+1&&!pending.endsWith('|'))continue;
  if(parts.at(-1)==='')parts.pop();
  if(parts.length<cols.length)continue;
  if(parts.length!==cols.length)fail(table+' malformed row');
  result.push(Object.fromEntries(cols.map((k,i)=>[k,parts[i].trim()])));
  pending='';
 }
 if(pending)fail(table+' incomplete final row');
 return result;
}
function unique(rows,key,table){
 const result=new Map();
 for(const row of rows){if(!row[key]||result.has(row[key]))fail(table+' missing/duplicate '+key);result.set(row[key],row);}
 return result;
}
function sortedRows(rows){return [...rows].sort((a,b)=>Number(a.line)-Number(b.line));}
function numeric(v,label,min=0){if(!/^\d+$/.test(v)||!Number.isSafeInteger(Number(v))||Number(v)<min)fail(label);return Number(v);}
export function parseCosts(rows,unit){
 const tiers=[];let current;
 for(const row of sortedRows(rows)){
  const label=plain(row.description).toUpperCase();
  if(!row.cost){
   if(!/^YOUR (?:UNITS?|\d+(?:ST|ND|RD|TH)(?:\s+TO\s+\d+(?:ST|ND|RD|TH)|\s*\+)?\s+UNITS?) COSTS?$/.test(label))fail(unit+' unknown cost bracket '+label);
   const nums=(label.match(/\d+/g)||[]).map(Number);
   current={start:nums[0]||1,end:!nums.length||label.includes('+')?Infinity:nums.at(-1),prices:{}};
   tiers.push(current);continue;
  }
  if(!current){current={start:1,end:Infinity,prices:{}};tiers.push(current);}
  const m=label.match(/^(\d+)\s+MODELS?$/);
  if(!m)fail(unit+' ambiguous model cost '+label);
  const size=numeric(m[1],unit+' invalid size',1),price=numeric(row.cost,unit+' invalid cost',1);
  if(current.prices[size]!==undefined)fail(unit+' duplicate model cost');
  current.prices[size]=price;
 }
 if(!tiers.length||tiers[0].start!==1||tiers.at(-1).end!==Infinity)fail(unit+' incomplete copy pricing');
 for(let i=1;i<tiers.length;i++)if(tiers[i].start!==tiers[i-1].end+1)fail(unit+' overlapping/gapped copy pricing');
 const sizes=Object.keys(tiers[0].prices).map(Number).sort((a,b)=>a-b);
 if(!sizes.length||tiers.some(t=>Object.keys(t.prices).length!==sizes.length||sizes.some(n=>!t.prices[n])))fail(unit+' incomplete size pricing');
 return {sizes,pointsBySize:tiers[0].prices,...(tiers.length>1?{laterCopyPointsBySize:Object.fromEntries(tiers.slice(1).map(t=>[t.start,t.prices]))}:{})};
}
export function normalizeExport(tables,baseline){
 const factions=unique(tables.Factions,'id','Factions');
 const faction=[...factions.values()].filter(r=>norm(r.name)==='necrons');
 if(faction.length!==1)fail('Necrons faction not unique');
 const fid=faction[0].id, sources=unique(tables.Source,'id','Source');
 const all=unique(tables.Datasheets,'id','Datasheets');
 const units=[...all.values()].filter(d=>d.faction_id===fid);
 const matched=new Set();
 const lookup=new Map();
 const records=[];
 const revision=tables.Last_update[0]?.last_update;
 if(tables.Last_update.length!==1||!revision)fail('missing export revision');
 const owned=(table,id)=>tables[table].filter(r=>r.datasheet_id===id);
 const byId={Abilities:unique(tables.Abilities,'id','Abilities'),Stratagems:unique(tables.Stratagems,'id','Stratagems'),Enhancements:unique(tables.Enhancements,'id','Enhancements'),Detachment_abilities:unique(tables.Detachment_abilities,'id','Detachment abilities')};
 const linked=(table,id,key,target)=>owned(table,id).map(r=>{const v=byId[target].get(r[key]);if(!v)fail(table+' dangling reference '+r[key]);return v;});
 const result=baseline.expectedUnits.map(unit=>{
  const found=units.filter(d=>norm(d.name)===norm(unit));
  if(found.length!==1)fail(unit+' missing or ambiguous in export');
  const d=found[0],src=sources.get(d.source_id);
  if(!src||src.edition!=='11'||!src.version)fail(unit+' source edition/version not verified');
  matched.add(d.id);lookup.set(d.id,unit);
  const url=new URL(d.link,BASE);
  if(url.origin!==new URL(BASE).origin||!url.pathname.startsWith('/wh40k11ed/factions/necrons/'))fail(unit+' unexpected datasheet URL');
  const costs=parseCosts(owned('Datasheets_models_cost',d.id),unit);
  const models=owned('Datasheets_models',d.id);
  if(!models.length)fail(unit+' missing models');
  // Keep existing single-model profile shape; multi-profile sheets retain all raw profiles in the review output.
  const m=models.length===1?models[0]:null;
  const profile=m&&/^\d+$/.test(m.t)&&/^\d+$/.test(m.w)&&/^\d+$/.test(m.oc)?{move:m.m,toughness:Number(m.t),save:m.sv,wounds:Number(m.w),leadership:m.ld,objectiveControl:Number(m.oc)}:undefined;
  records.push({id:d.id,unit,source:url.href,sourceVersion:src.version,sourceName:src.name,models,
   abilities:owned('Datasheets_abilities',d.id).map(a=>{const ref=a.ability_id&&byId.Abilities.get(a.ability_id);if(a.ability_id&&!ref)fail(unit+' dangling ability '+a.ability_id);return {...a,reference:ref||undefined};}),
   keywords:owned('Datasheets_keywords',d.id),wargear:owned('Datasheets_wargear',d.id),options:owned('Datasheets_options',d.id),loadout:d.loadout||'',
   stratagems:linked('Datasheets_stratagems',d.id,'stratagem_id','Stratagems').map(r=>r.id),
   enhancements:linked('Datasheets_enhancements',d.id,'enhancement_id','Enhancements').map(r=>r.id),
   detachmentAbilities:linked('Datasheets_detachment_abilities',d.id,'detachment_ability_id','Detachment_abilities').map(r=>r.id)});
  return {faction:'Necrons',unit,source:url.href,pointsSource:url.href,verified:'sizes-and-points',...costs,...(profile?{profile}:{})};
 });
 const attachments=tables.Datasheets_leader.filter(r=>matched.has(r.leader_id)||matched.has(r.attached_id)).map(r=>{
  if(!all.has(r.leader_id)||!all.has(r.attached_id))fail('dangling attachment');
  return {...r,leader:all.get(r.leader_id).name,bodyguard:all.get(r.attached_id).name};
 });
 const detachmentRows=tables.Detachments.filter(r=>r.faction_id===fid);
 const ids=unique(detachmentRows,'id','Necron detachments');
 const relevant=t=>tables[t].filter(r=>r.faction_id===fid||ids.has(r.detachment_id));
 const candidate={edition:11,faction:'Necrons',revision:'wahapedia-'+revision,sourceStatus:'mixed-source-unreconciled',expectedUnits:baseline.expectedUnits,datasheets:result};
 generateDatasheets(candidate);
 return {candidate,review:{edition:11,revision,source:BASE,extraUnits:units.filter(d=>!matched.has(d.id)).map(d=>({id:d.id,name:d.name,source:sources.get(d.source_id)?.name})),records,attachments,detachments:detachmentRows,stratagems:relevant('Stratagems'),enhancements:relevant('Enhancements'),detachmentAbilities:relevant('Detachment_abilities')}};
}
export async function loadExport({directory,fetcher=fetch}={}){
 const load=async name=>{
  const filename=name+'.csv';
  if(directory)return readFileSync(resolve(directory,filename),'utf8');
  const response=await fetcher(BASE+filename,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)fail(filename+' HTTP '+response.status);
  if(response.url&&!response.url.startsWith(BASE))fail(filename+' redirected outside 11e export');
  return response.text();
 };
 const before=await load('Last_update');
 const entries=await Promise.all(Object.keys(TABLES).filter(n=>n!=='Last_update').map(async n=>[n,await load(n)]));
 const after=await load('Last_update');
 if(before!==after)fail('source changed during import; retry');
 entries.push(['Last_update',before]);
 const tables=Object.fromEntries(entries.map(([n,t])=>[n,parseExport(t,TABLES[n],n)]));
 return {tables,hashes:Object.fromEntries(entries.map(([n,t])=>[n,createHash('sha256').update(t).digest('hex')]))};
}
export async function runSourceImport({directory,outputDir,baselinePath='data/necrons-11e-datasheets.json',fetcher}){
 const baseline=JSON.parse(readFileSync(baselinePath,'utf8'));
 const {tables,hashes}=await loadExport({directory,fetcher});
 const {candidate,review}=normalizeExport(tables,baseline);
 // Candidate output only; applying source changes requires review, never overwrites live source.
 mkdirSync(outputDir,{recursive:true});
 for(const [name,value] of [['candidate.json',candidate],['review.json',{...review,hashes}]]){
  const path=resolve(outputDir,name),temp=path+'.tmp-'+process.pid;
  writeFileSync(temp,JSON.stringify(value,null,2)+'\n');renameSync(temp,path);
 }
 return {units:candidate.datasheets.length,revision:candidate.revision};
}
if(import.meta.url.startsWith('file:')&&process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==1&&args.length!==3||args.length===3&&args[1]!=='--from-dir')fail('usage: node scripts/import-wahapedia-11e.mjs OUTPUT_DIR [--from-dir CSV_DIR]');
  console.log(await runSourceImport({outputDir:args[0],directory:args[2]}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
