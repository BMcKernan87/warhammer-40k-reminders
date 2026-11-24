import {readFileSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const input=resolve(root,'data/necrons-11e-datasheets.json');
const output=resolve(root,'src/datasheets-2026.generated.ts');
const fail=message=>{throw new Error('11e datasheet import: '+message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,min=1)=>Number.isSafeInteger(v)&&v>=min;
const string=v=>typeof v==='string'&&v.trim().length>0&&v===v.trim();
function keys(v,allowed,label){
 if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k)))fail(label+' has unexpected fields or invalid shape');
}
function source(v,label){
 if(!string(v))fail(label+' missing source');
 let u;try{u=new URL(v);}catch{fail(label+' invalid source URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.port)fail(label+' invalid source URL');
 const valid=(u.hostname==='wahapedia.ru'&&u.pathname.startsWith('/wh40k11ed/factions/necrons/'))||
 (u.hostname==='assets.warhammer-community.com'&&/warhammer40000_faction_pack_necrons.*\.pdf$/.test(u.pathname))||
 (u.hostname==='tactical40k.com'&&u.pathname==='/codex/necrons');
 if(!valid)fail(label+' source not recognized as a Necron 11e reference');
}
function prices(v,sizes,label){
 if(!object(v)||Object.keys(v).length!==sizes.length||sizes.some(s=>!integer(v[s]))||Object.keys(v).some(k=>!sizes.includes(Number(k))||String(Number(k))!==k))fail(label+' missing or invalid price for legal model size');
}
function profile(v,label){
 keys(v,['move','toughness','save','wounds','leadership','objectiveControl'],label);
 if(!string(v.move)||!string(v.save)||!string(v.leadership)||!integer(v.toughness)||!integer(v.wounds)||!integer(v.objectiveControl,0))fail(label+' invalid profile');
}
const canonical=v=>Array.isArray(v)?v.map(canonical):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export function generateDatasheets(snapshot){
 keys(snapshot,['edition','faction','revision','sourceStatus','datasheets'],'snapshot');
 if(snapshot.edition!==11||snapshot.faction!=='Necrons'||!string(snapshot.revision)||!['mixed-source-unreconciled','source-reconciled'].includes(snapshot.sourceStatus))fail('unsupported edition, faction or missing revision/status');
 if(!Array.isArray(snapshot.datasheets)||snapshot.datasheets.length===0)fail('empty datasheet input');
 const seen=new Set();
 for(const d of snapshot.datasheets){
  keys(d,['faction','unit','source','sizes','pointsBySize','laterCopyPointsBySize','pointsSource','verified','profile'],'datasheet');
  if(d.faction!==snapshot.faction||!string(d.unit)||seen.has(d.unit))fail('invalid faction, missing or duplicate unit: '+d.unit);
  seen.add(d.unit);
  source(d.source,d.unit);
  source(d.pointsSource,d.unit+' points');
  if(d.verified!=='sizes-and-points'||!Array.isArray(d.sizes)||d.sizes.length===0||d.sizes.some(n=>!integer(n))||new Set(d.sizes).size!==d.sizes.length)fail(d.unit+' invalid or incomplete model sizes');
  prices(d.pointsBySize,d.sizes,d.unit);
  if(d.laterCopyPointsBySize!==undefined){
   if(!object(d.laterCopyPointsBySize)||!Object.keys(d.laterCopyPointsBySize).length)fail(d.unit+' invalid copy tiers');
   for(const [tier,table] of Object.entries(d.laterCopyPointsBySize)){
    if(!integer(Number(tier),2)||String(Number(tier))!==tier)fail(d.unit+' invalid copy tier');
    prices(table,d.sizes,d.unit+' copy '+tier);
   }
  }
  if(d.profile!==undefined)profile(d.profile,d.unit);
 }
 const ordered=[...snapshot.datasheets].sort((a,b)=>a.unit<b.unit?-1:a.unit>b.unit?1:0).map(canonical);
 return '// Generated from data/necrons-11e-datasheets.json. Run npm run import:datasheets; do not edit.\n'+
  "import type {Datasheet2026} from './datasheets-2026';\n"+
  'export const IMPORTED_DATASHEETS_2026:readonly Datasheet2026[]='+JSON.stringify(ordered,null,2)+';\n';
}
export function runImport({inputPath=input,outputPath=output,check=false}={}){
 // Read and validate everything before touching the last known good registry.
 const snapshot=JSON.parse(readFileSync(inputPath,'utf8'));
 const generated=generateDatasheets(snapshot);
 if(check){
  if(readFileSync(outputPath,'utf8')!==generated)fail('generated registry is stale; run npm run import:datasheets');
  return;
 }
 const temp=outputPath+'.tmp-'+process.pid;
 try{writeFileSync(temp,generated,{flag:'wx'});renameSync(temp,outputPath);}finally{rmSync(temp,{force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.slice(2).some(a=>a!=='--check'))fail('usage: node scripts/import-datasheets.mjs [--check]');
  runImport({check:process.argv.includes('--check')});
  console.log('Necron 11e datasheet registry '+(process.argv.includes('--check')?'verified':'generated'));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
