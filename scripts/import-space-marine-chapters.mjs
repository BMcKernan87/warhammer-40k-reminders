import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';
import {loadExport,modelProfile} from './import-wahapedia-11e.mjs';
import {readPrices} from './import-imperial-knights.mjs';
import {SM_SOURCE_IDS,spaceMarinePriceRows} from './import-space-marines-relational.mjs';
import {CHAPTER_SPECS,chapterNameKey as key,chapterModelName,chapterCompositions,chapterIndependent,chapterManual,chapterEquivalent as equivalent,chapterProfileMatches} from './import-space-marine-chapters-relational.mjs';

const [directory,manualDirectory,relationalDirectory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-space-marine-chapters.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY OUTPUT_TS');
const {tables}=await loadExport({directory});
const read=file=>JSON.parse(readFileSync(join(relationalDirectory,'adeptus-astartes',file+'.json'),'utf8'));
const units=read('units'),compositions=chapterCompositions(read('unit-compositions'),units);
const manuals=Object.fromEntries(CHAPTER_SPECS.map(spec=>[spec.faction,chapterManual(parse(readFileSync(join(manualDirectory,spec.slug+'.yaml'),'utf8')),spec)]));
const baseManual=parse(readFileSync(join(manualDirectory,'space-marines.yaml'),'utf8'));
if(baseManual.slug!=='space-marines'||baseManual.version!=='1.6'||baseManual.firstSeen!=='2026-10-14')throw Error('Review shared Space Marine MFM revision');
const allCards=tables.Datasheets.filter(d=>d.faction_id==='SM'&&[...SM_SOURCE_IDS,...CHAPTER_SPECS.map(s=>s.sourceId)].includes(d.source_id));
const canonical=name=>allCards.find(d=>key(d.name)===key(name))?.name;
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const stats=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
const alternatives={},compositionPrices={},membership={},attachments={},transports={},sheets=[];
const headtakers='Wolf Guard Headtakers';

function headtakerPrices(rows,price){
 const expectedCosts=[
  {models:3,points:85,desc:'3 Wolf Guard Headtakers'},
  {models:6,points:115,desc:'3 Wolf Guard Headtakers, 3 Hunting Wolves'},
  {models:6,points:170,desc:'6 Wolf Guard Headtakers'},
  {models:12,points:230,desc:'6 Wolf Guard Headtakers, 6 Hunting Wolves'},
 ];
 const expected=[{range:'[1,2]',label:'Your 1st To 2nd Units Cost',costs:expectedCosts},{range:'[3,)',label:'Your 3rd + Unit Costs',costs:expectedCosts.map((c,i)=>({...c,points:[95,125,180,240][i]}))}];
 const signatures=rows.sort((a,b)=>+a.line-+b.line).map(r=>[r.description,r.cost]);
 const printed=[['YOUR 1ST TO 2ND UNITS COST',''],
  ['<div class="dsHeaderComp">3 Wolf Guard Headtaker</div>',''],['<div class="dsHeaderComp">0 Hunting Wolf</div>',''],['3 models','85'],
  ['<div class="dsHeaderComp">3 Wolf Guard Headtaker</div>',''],['<div class="dsHeaderComp">3 Hunting Wolf</div>',''],['6 models','115'],
  ['<div class="dsHeaderComp">6 Wolf Guard Headtaker</div>',''],['<div class="dsHeaderComp">0 Hunting Wolf</div>',''],['6 models','170'],
  ['<div class="dsHeaderComp">6 Wolf Guard Headtaker</div>',''],['<div class="dsHeaderComp">6 Hunting Wolf</div>',''],['12 models','230'],
  ['YOUR 3RD+ UNIT COSTS',''],['3 models','95'],['6 models','125'],['6 models','180'],['12 models','240']];
 if(!isDeepStrictEqual(price.pricing,expected)||!isDeepStrictEqual(signatures,printed))throw Error('Review composition-specific Headtaker pricing');
 compositionPrices['Space Wolves']={[headtakers]:[[3,0],[3,3],[6,0],[6,6]].map(([headtakers,wolves],i)=>({models:{'Wolf Guard Headtaker':headtakers,'Hunting Wolf':wolves},pointsByCopy:{1:expectedCosts[i].points,3:expected[1].costs[i].points}}))};
 return {sizes:[3,6,12],pointsBySize:{3:85,6:170,12:230},laterCopyPointsBySize:{3:{3:95,6:180,12:240}}};
}

function attachment(d,price){
 const targetIds=new Set(tables.Datasheets_leader.filter(l=>l.leader_id===d.id).map(l=>l.attached_id));
 const bodyguards=[...new Set(allCards.filter(b=>targetIds.has(b.id)).map(b=>b.name))].sort();
 const expected=[...new Set((price.supportTo??price.leaderTo??[]).map(canonical).filter(Boolean))].sort();
 if(!isDeepStrictEqual(bodyguards,expected)||(d.is_support==='true')!==!!price.supportTo)throw Error('Chapter attachment mismatch '+d.name+': '+JSON.stringify({bodyguards,expected,support:d.is_support}));
 return bodyguards.length?{attachmentRole:price.supportTo?'support':'leader',bodyguards}:{};
}

for(const spec of CHAPTER_SPECS){
 const source=tables.Source.find(s=>s.id===spec.sourceId),manual=manuals[spec.faction],native=allCards.filter(d=>d.source_id===spec.sourceId);
 if(source?.name!==spec.faction||source.edition!=='11'||source.type!=='App'||native.length!==spec.cards)throw Error('Review current '+spec.faction+' card source');
 membership[spec.faction]=manual.units.map(u=>canonical(u.name));
 if(membership[spec.faction].some(n=>!n)||new Set(membership[spec.faction]).size!==spec.membership)throw Error('Unresolved '+spec.faction+' roster member');
 membership[spec.faction].sort();attachments[spec.faction]={};transports[spec.faction]={};
 for(const price of manual.units){
  const own=native.find(d=>key(d.name)===key(price.name));
  const d=own??allCards.find(d=>SM_SOURCE_IDS.includes(d.source_id)&&key(d.name)===key(price.name));
  if(!d)throw Error('Unknown '+spec.faction+' roster member '+price.name);
  if(!own){
   const shared=baseManual.units.find(u=>!u.legends&&key(u.name)===key(price.name));
   if(!shared||!isDeepStrictEqual(price.pricing,shared.pricing)||!isDeepStrictEqual(price.wargear??[],shared.wargear??[]))throw Error('Chapter changes shared unit prices '+spec.faction+' '+d.name);
  }
  const a=attachment(d,price);if(a.bodyguards)attachments[spec.faction][d.name]=a;
 }
 for(const d of native){
  const price=manual.units.find(u=>key(u.name)===key(d.name)),ref=chapterIndependent(units,d.name,spec.faction),comp=compositions.find(c=>c.unit_id===ref.id);
  if(!price||!comp||comp.faction_id!=='adeptus-astartes'||comp.game_version.edition!=='11th'||comp.game_version.dataslate!=='2026-10-14'||!d.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/space-marines/'))throw Error('Unverified chapter identity '+d.name);
  const own=table=>tables[table].filter(r=>r.datasheet_id===d.id);
  const composition=own('Datasheets_unit_composition').map(r=>{
   const match=/^(\d+)(?:[-–](\d+))? (.+)$/.exec(plain(r.description));
   if(!match)throw Error('Unrecognized physical composition '+d.name+' '+r.description);
   return {model:chapterModelName(d.name,match[3]),min:+match[1],max:+(match[2]??match[1])};
  });
  for(const c of composition){
   const other=comp.models.find(m=>equivalent(m.name,c.model));
   if(!other)throw Error('Unmatched chapter physical role '+d.name+' '+c.model);
   if(d.name===headtakers&&c.model==='Hunting Wolf'){
    if(c.min!==3||c.max!==6||other.min!==0||other.max!==6)throw Error('Review optional Headtaker Hunting Wolves');
    c.min=0;
   }
   if(c.min!==other.min||c.max!==other.max)throw Error('Composition bounds differ '+d.name+' '+c.model+': '+JSON.stringify({c,other}));
   c.model=other.name;
  }
  const keywords=new Set(),modelKeywords={};
  for(const r of own('Datasheets_keywords')){
   const tag=plain(r.keyword).toUpperCase(),scope=chapterModelName(d.name,plain(r.model).replace(/\s+ONLY$/i,''));
   if(!tag)throw Error('Empty keyword '+d.name);
   if(!scope||scope.toUpperCase()==='ALL MODELS')keywords.add(tag);
   else{
    const role=comp.models.find(m=>equivalent(m.name,scope));if(!role)throw Error('Unknown chapter keyword owner '+d.name+' '+scope);
    modelKeywords[role.name]??=[];if(!modelKeywords[role.name].includes(tag))modelKeywords[role.name].push(tag);
   }
  }
  const named=k=>[d.name,...comp.models.map(m=>m.name)].some(n=>equivalent(n,k));
  const actual=[...new Set([...keywords,...Object.values(modelKeywords).flat()])].filter(k=>!named(k)).sort();
  const expectedTags=[...new Set([...ref.keywords,...ref.faction_keywords].map(k=>k.toUpperCase()))].filter(k=>!named(k)).sort();
  if(!isDeepStrictEqual(actual,expectedTags))throw Error('Chapter keyword mismatch '+d.name+': '+JSON.stringify({actual,expected:expectedTags}));
  const printed=own('Datasheets_models');if(!printed.length||new Set(printed.map(p=>p.name)).size!==printed.length)throw Error('Missing chapter profile '+d.name);
  const profiles={};
  for(const m of comp.models){
   const desired=m.profile_name??m.name;
   const original=printed.length===1?printed[0]:printed.find(p=>chapterProfileMatches(chapterModelName(d.name,p.name),desired));
   const other=ref.profiles.find(p=>chapterProfileMatches(chapterModelName(d.name,p.name),desired))??(ref.profiles.length===1?ref.profiles[0]:undefined);
   if(!original||!other)throw Error('Unknown chapter model profile '+d.name+' / '+m.name+' '+desired);
   const p=modelProfile(original,d.name);
   if(stats([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])!==stats([other.M,other.T,other.Sv,other.W,other.Ld,other.OC]))throw Error('Chapter characteristics differ '+d.name+' / '+m.name+': '+JSON.stringify({p,other}));
   profiles[m.name]=p;
  }
  const prices=d.name===headtakers?headtakerPrices(own('Datasheets_models_cost'),price):readPrices(spaceMarinePriceRows(own('Datasheets_models_cost'),d.name),d.name,price);
  let choices=[{}];
  for(const m of comp.models)choices=choices.flatMap(c=>Array.from({length:m.max-m.min+1},(_,i)=>({...c,[m.name]:m.min+i})));
  // The printed Headtaker card permits 3–6 wolves. The two explicit zero-wolf
  // price blocks permit none; neither source permits one or two wolves.
  if(d.name===headtakers)choices=choices.filter(c=>c['Hunting Wolf']===0||c['Hunting Wolf']>=3);
  const bySize={};
  for(const c of choices){const n=Object.values(c).reduce((sum,n)=>sum+n,0);if(n<prices.sizes[0]||n>prices.sizes.at(-1))continue;(bySize[n]??=[]).push(c);}
  for(const tier of comp.tiers??[]){
   if(tier.models.some(m=>m.min!==m.max))throw Error('Review variable chapter price tier '+d.name);
   const c=Object.fromEntries(comp.models.map(m=>[m.name,tier.models.find(r=>r.name===m.name)?.min??0])),n=Object.values(c).reduce((sum,n)=>sum+n,0);
   if(!bySize[n]?.some(option=>isDeepStrictEqual(option,c)))throw Error('Printed chapter tier outside physical composition '+d.name);
  }
  if(!prices.sizes.every(n=>bySize[n]))throw Error('Missing chapter price strength '+d.name);
  const compositionBySize=Object.fromEntries(Object.entries(bySize).map(([size,options])=>[size,options.at(-1)]));
  if(Object.values(bySize).some(options=>options.length>1)){(alternatives[spec.faction]??={})[d.name]=bySize;}
  if(d.transport)transports[spec.faction][d.name]={source:d.link,text:plain(d.transport)};
  sheets.push({faction:spec.faction,unit:d.name,source:d.link,pointsSource:'https://mfm.warhammer-community.com/en/'+spec.slug,verified:'sizes-and-points',...prices,composition,compositionBySize,keywords:[...keywords].sort(),...(Object.keys(modelKeywords).length?{modelKeywords:Object.fromEntries(Object.entries(modelKeywords).map(([k,v])=>[k,v.sort()]))}:{}),...(printed.length===1?{profile:modelProfile(printed[0],d.name)}:{modelProfiles:profiles}),...attachment(d,price)});
 }
}
sheets.sort((a,b)=>a.faction.localeCompare(b.faction,'en')||a.unit.localeCompare(b.unit,'en'));
if(sheets.length!==66||new Set(sheets.map(s=>s.faction+'|'+s.unit)).size!==66)throw Error('Review complete chapter-native inventory');
const revision={manual:'1.6',manualFirstSeen:'2026-10-14',exportUpdated:tables.Last_update[0].last_update,independent:'https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core/adeptus-astartes',sourceIds:CHAPTER_SPECS.map(s=>s.sourceId)};
writeFileSync(destination,"// Generated by scripts/import-space-marine-chapters.mjs.\nimport type {Datasheet2026} from './datasheets-2026';\n"+
 'export const CHAPTER_NATIVE_REVISION='+JSON.stringify(revision)+' as const;\n'+
 'export const CHAPTER_NATIVE_SHEETS:readonly Datasheet2026[]='+JSON.stringify(sheets,null,2)+';\n'+
 'export const CHAPTER_MEMBERSHIP:Readonly<Record<string,readonly string[]>>='+JSON.stringify(membership)+';\n'+
 'export const CHAPTER_ATTACHMENTS:Readonly<Record<string,Readonly<Record<string,{attachmentRole:"leader"|"support";bodyguards:readonly string[]}>>>>='+JSON.stringify(attachments)+';\n'+
 'export const CHAPTER_TRANSPORTS:Readonly<Record<string,Readonly<Record<string,{source:string;text:string}>>>>='+JSON.stringify(transports)+';\n'+
 'export type ChapterComposition=Readonly<Record<string,number>>;\n'+
 'export type ChapterCompositionTable=Readonly<Record<number,readonly ChapterComposition[]>>;\n'+
 'export const CHAPTER_COMPOSITIONS:Readonly<Record<string,Readonly<Record<string,ChapterCompositionTable>>>>='+JSON.stringify(alternatives)+';\n'+
 'export const CHAPTER_COMPOSITION_PRICES:Readonly<Record<string,Readonly<Record<string,readonly {models:Readonly<Record<string,number>>;pointsByCopy:Readonly<Record<number,number>>}[]>>>>='+JSON.stringify(compositionPrices)+';\n');
