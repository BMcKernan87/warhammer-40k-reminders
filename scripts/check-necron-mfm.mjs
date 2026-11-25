import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';

// Version 1.6, effective 14 October 2026. Pin the public MFM scrape so a
// changed remote table cannot inadvertently certify a different balance update.
export const MFM_SNAPSHOT='https://raw.githubusercontent.com/richardsolomou/wh40k-11e-mfm/6eed7b100ae508c1faa76a42bf7b55ecabb59107/data/necrons.yaml';
const key=name=>name.trim().toLowerCase().replaceAll('’',"'");
function enhancementKey(name){
 // The primary Faction Pack uses Prelocational. Wahapedia calls it Relocational.
 return key(name).replace(/ \((aura|upgrade)\)/g,'').replace(/^relocational optimiser$/,'prelocational optimiser');
}
function index(rows,normalize,label){
 const indexed=new Map();
 for(const row of rows){
  const id=normalize(row.name);
  if(indexed.has(id))throw Error('Duplicate '+label+': '+row.name);
  indexed.set(id,row);
 }
 return indexed;
}
function compare(actual,expected,label){
 if(!isDeepStrictEqual(actual,expected))throw Error(label+' differs: '+JSON.stringify(actual)+' vs MFM '+JSON.stringify(expected));
}
function compareNames(actual,expected,label){
 compare([...actual.keys()].sort(),[...expected.keys()].sort(),label);
}
function mfmTiers(unit){
 let next=1;
 const result={};
 for(const tier of unit.pricing){
  const interval=tier.range.match(/^\[(\d+),(\d+\]|\))$/);
  if(!interval||Number(interval[1])!==next)throw Error(unit.name+' invalid price interval '+tier.range);
  const start=next;
  next=interval[2]===')'?Infinity:Number(interval[2].slice(0,-1))+1;
  if(next<=start||!tier.costs.length)throw Error(unit.name+' empty price interval '+tier.range);
  const costs={};
  for(const {models,points} of tier.costs){
   if(!Number.isSafeInteger(models)||models<1||!Number.isSafeInteger(points)||points<1||Object.hasOwn(costs,models))throw Error(unit.name+' invalid size or cost');
   costs[models]=points;
  }
  result[start]=costs;
 }
 if(next!==Infinity)throw Error(unit.name+' incomplete price intervals');
 return result;
}
export function verifyMfm(snapshot,review,mfm){
 compare([snapshot.edition,snapshot.faction,review.edition,snapshot.revision],[11,'Necrons',11,'wahapedia-'+review.revision],'edition and export revision');
 if(mfm.slug!=='necrons'||!mfm.version||!mfm.firstSeen)throw Error('Expected a dated Necron MFM snapshot');
 const sheets=index(snapshot.datasheets.map(s=>({...s,name:s.unit})),key,'datasheet');
 const units=index(mfm.units.filter(u=>!u.legends),key,'MFM unit');
 compareNames(sheets,units,'matched-play datasheets');
 let costs=0,attachments=0;
 for(const [id,unit] of units){
  const sheet=sheets.get(id),tiers=mfmTiers(unit);
  compare({1:sheet.pointsBySize,...sheet.laterCopyPointsBySize},tiers,unit.name+' costs');
  costs+=Object.values(tiers).reduce((total,sizes)=>total+Object.keys(sizes).length,0);
  const role=unit.supportTo?'support':unit.leaderTo?'leader':undefined;
  const bodyguards=(unit.supportTo??unit.leaderTo??[]).map(key).filter(n=>units.has(n)).sort();
  compare([sheet.attachmentRole,(sheet.bodyguards??[]).map(key).sort()],[bodyguards.length?role:undefined,bodyguards],unit.name+' attachments');
  attachments+=bodyguards.length;
 }
 const detachments=index(review.detachments,key,'detachment'),official=index(mfm.detachments,key,'MFM detachment');
 compareNames(detachments,official,'matched-play detachments');
 let enhancements=0;
 for(const [id,detachment] of official){
  const source=detachments.get(id);
  compare(Number(source.dp),detachment.dp,detachment.name+' Detachment Points');
  compare(source.force_disposition.split(',').map(key).sort(),detachment.objectives.map(key).sort(),detachment.name+' force dispositions');
  const upgrades=index(review.enhancements.filter(e=>e.detachment_id===source.id),enhancementKey,'enhancement');
  const expected=index(detachment.enhancements??[],enhancementKey,'MFM enhancement');
  compareNames(upgrades,expected,detachment.name+' enhancements');
  for(const [name,item] of expected)compare(Number(upgrades.get(name).cost),item.points,detachment.name+' / '+name);
  enhancements+=expected.size;
 }
 return {mfmVersion:mfm.version,effectiveDate:mfm.firstSeen,units:units.size,costs,attachments,detachments:official.size,enhancements};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [directory,localYaml,...extra]=process.argv.slice(2);
  if(!directory||extra.length)throw Error('Usage: npm run check:necron-mfm -- REVIEW_DIR [MFM_YAML]');
  const [snapshot,review]=await Promise.all(['candidate.json','review.json'].map(async file=>JSON.parse(await readFile(resolve(directory,file),'utf8'))));
  let yaml;
  if(localYaml)yaml=await readFile(localYaml,'utf8');
  else{
   const response=await fetch(MFM_SNAPSHOT,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('MFM snapshot HTTP '+response.status);
   yaml=await response.text();
  }
  console.log(verifyMfm(snapshot,review,parse(yaml)));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
