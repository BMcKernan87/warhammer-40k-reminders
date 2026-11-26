import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';

// Version 1.6, effective 14 October 2026. Pin the public MFM scrape so a
// changed remote table cannot inadvertently certify a different balance update.
export const MFM_SNAPSHOT='https://raw.githubusercontent.com/richardsolomou/wh40k-11e-mfm/6eed7b100ae508c1faa76a42bf7b55ecabb59107/data/necrons.yaml';
export const MFM_VERSION='1.6';
export const MFM_EFFECTIVE_DATE='2026-10-14';
const key=name=>name.trim().toLowerCase().replaceAll('’',"'");
function enhancementKey(name){
 // The primary Faction Pack uses Prelocational. Wahapedia calls it Relocational.
 return key(name).replace(/ \((aura|upgrade)\)/g,'').replace(/^relocational optimiser$/,'prelocational optimiser');
}
function index(rows,normalize,label){
 if(!Array.isArray(rows))throw Error('Missing '+label+' table');
 const indexed=new Map();
 for(const row of rows){
  if(!row||typeof row.name!=='string'||!row.name.trim())throw Error('Missing '+label+' name');
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
 if(!Array.isArray(unit.pricing)||!unit.pricing.length)throw Error(unit.name+' missing pricing');
 for(const tier of unit.pricing){
  const interval=typeof tier.range==='string'&&tier.range.match(/^\[(\d+),(\d+\]|\))$/);
  if(!interval||Number(interval[1])!==next)throw Error(unit.name+' invalid price interval '+tier.range);
  const start=next;
  next=interval[2]===')'?Infinity:Number(interval[2].slice(0,-1))+1;
  if(next<=start||!Array.isArray(tier.costs)||!tier.costs.length)throw Error(unit.name+' empty price interval '+tier.range);
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
 compare([mfm.slug,mfm.version,mfm.firstSeen],['necrons',MFM_VERSION,MFM_EFFECTIVE_DATE],'pinned Necron MFM version and effective date');
 const sheets=index(snapshot.datasheets.map(s=>({...s,name:s.unit})),key,'datasheet');
 const allUnits=index(mfm.units,key,'MFM unit');
 for(const unit of allUnits.values())if(unit.legends!==undefined&&typeof unit.legends!=='boolean')throw Error(unit.name+' invalid Legends flag');
 const units=new Map([...allUnits].filter(([,unit])=>!unit.legends));
 compareNames(sheets,units,'matched-play datasheets');
 let costs=0,attachments=0;
 for(const [id,unit] of units){
  const sheet=sheets.get(id),tiers=mfmTiers(unit);
  compare({1:sheet.pointsBySize,...sheet.laterCopyPointsBySize},tiers,unit.name+' costs');
  costs+=Object.values(tiers).reduce((total,sizes)=>total+Object.keys(sizes).length,0);
  if(unit.supportTo!==undefined&&unit.leaderTo!==undefined)throw Error(unit.name+' conflicting attachment roles');
  const role=unit.supportTo!==undefined?'support':unit.leaderTo!==undefined?'leader':undefined;
  const targets=unit.supportTo??unit.leaderTo??[];
  if(!Array.isArray(targets)||targets.some(n=>typeof n!=='string'||!n.trim()))throw Error(unit.name+' invalid attachment targets');
  const namedTargets=targets.map(key);
  if(new Set(namedTargets).size!==namedTargets.length||namedTargets.some(n=>n===id||!allUnits.has(n)))throw Error(unit.name+' duplicate, self or unknown attachment target');
  // Known Legends permissions are excluded from matched-play comparison. A typo
  // or missing unit is an invalid source relationship, not a Legends exclusion.
  const bodyguards=namedTargets.filter(n=>units.has(n)).sort();
  compare([sheet.attachmentRole,(sheet.bodyguards??[]).map(key).sort()],[bodyguards.length?role:undefined,bodyguards],unit.name+' attachments');
  attachments+=bodyguards.length;
 }
 const detachments=index(review.detachments,key,'detachment'),official=index(mfm.detachments,key,'MFM detachment');
 const detachmentIds=new Set();
 for(const detachment of detachments.values()){
  if(typeof detachment.id!=='string'||!detachment.id||detachmentIds.has(detachment.id))throw Error('Missing or duplicate detachment source ID');
  detachmentIds.add(detachment.id);
 }
 if(!Array.isArray(review.enhancements)||review.enhancements.some(e=>!detachmentIds.has(e.detachment_id)))throw Error('Enhancement has an unknown detachment source ID');
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
