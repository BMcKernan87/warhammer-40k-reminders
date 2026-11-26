import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';
import {loadExport,modelProfile} from './import-wahapedia-11e.mjs';
import {applyModelComposition} from './import-mfm-composition.mjs';
import {readPrices} from './import-imperial-knights.mjs';
import {SM_SOURCE_IDS,spaceMarineNameKey as key,spaceMarineModelName,spaceMarineCompositions,spaceMarinePriceRows,spaceMarineManual} from './import-space-marines-relational.mjs';

const [directory,manualDirectory,relationalDirectory,publisherText,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-space-marines.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY PUBLISHER_TEXT OUTPUT_TS');
const publisher=readFileSync(publisherText,'utf8').replace(/\s+/g,' ');
if(!publisher.includes('PRINTED PRODUCT UPDATES: VERSION 1.1')||!publisher.includes('Kayvaan Shrike, Keywords Section Add ‘CHARACTER’ and ‘EPIC HERO’.')||!publisher.includes('Librarian in Terminator Armour, Keywords Section Add ‘CHARACTER’.'))throw Error('Review current publisher keyword corrections');
const {tables}=await loadExport({directory});
const manuals=Object.fromEntries(['space-marines','deathwatch'].map(slug=>[slug,parse(readFileSync(join(manualDirectory,slug+'.yaml'),'utf8'))]));
const read=file=>JSON.parse(readFileSync(join(relationalDirectory,'adeptus-astartes',file+'.json'),'utf8'));
const allUnits=read('units'),units=allUnits.filter(u=>!u.faction_keywords.includes('Black Templars')),compositions=spaceMarineCompositions(read('unit-compositions'),allUnits).filter(c=>units.some(u=>u.id===c.unit_id));
const native=tables.Datasheets.filter(d=>d.faction_id==='SM'&&SM_SOURCE_IDS.includes(d.source_id));
const priced=spaceMarineManual(manuals['space-marines'],manuals.deathwatch,native);
const sources=SM_SOURCE_IDS.map(id=>tables.Source.find(s=>s.id===id));
if(sources.some(s=>!s)||sources[0].name!=='Space Marines'||sources[0].edition!=='11'||sources[1].name!=='Space Marines (Forge World)'||sources[1].edition!=='0'||sources[2].name!=='Deathwatch'||sources[2].edition!=='11')throw Error('Review Space Marines source identity');
function independent(name){
 const found=units.filter(u=>key(u.name)===key(name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(found.length!==1)throw Error('Missing current independent card '+name);
 return found[0];
}
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const modelKey=n=>key(n).replace(/[^a-z0-9]/g,'');
const equivalent=(a,b)=>modelKey(a)===modelKey(b)||modelKey(a)+'s'===modelKey(b)||modelKey(a)===modelKey(b)+'s';
const stats=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
const victrix='Victrix Honour Guard';
const sheets=native.map(d=>{
 const price=priced.get(d.name),ref=independent(d.name),comp=compositions.find(c=>c.unit_id===ref.id);
 if(!d.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/space-marines/')||!comp)throw Error('Missing card/composition '+d.name);
 const own=table=>tables[table].filter(r=>r.datasheet_id===d.id);
 const composition=own('Datasheets_unit_composition').map(r=>{
  const match=/^(\d+)(?:[-–](\d+))? (.+)$/.exec(plain(r.description));
  if(!match)throw Error('Unrecognized physical composition '+d.name+' '+r.description);
  return {model:spaceMarineModelName(d.name,match[3]),min:+match[1],max:+(match[2]??match[1])};
 });
 for(const c of composition){
  const other=comp.models.find(m=>equivalent(m.name,c.model));
  if(!other)throw Error('Unmatched physical role '+d.name+' '+c.model);
  if(d.name==='Decimus Kill Team'&&c.model==='Deathwatch Veteran with Xenophase Blade and Special-issue Bolt Pistol'){
   if(c.min!==1||c.max!==1||other.min!==0||other.max!==1)throw Error('Review Decimus optional veteran');
   // The current five-model MFM block explicitly has zero xenophase veterans.
   if(!own('Datasheets_models_cost').some(r=>r.description==='<div class="dsHeaderComp">0 Deathwatch Veteran with Xenophase Blade and Special-issue Bolt Pistol</div>'))throw Error('Missing Decimus five-model composition');
   c.min=0;
  }
  if(c.min!==other.min||c.max!==other.max)throw Error('Composition bounds differ '+d.name+' '+c.model+' '+JSON.stringify({c,other}));
  c.model=other.name;
 }
 const keywords=new Set(),modelKeywords={};
 for(const r of own('Datasheets_keywords')){
  const tag=plain(r.keyword).toUpperCase(),scope=spaceMarineModelName(d.name,plain(r.model).replace(/\s+ONLY$/i,''));
  if(!tag)throw Error('Empty keyword '+d.name);
  if(!scope||scope.toUpperCase()==='ALL MODELS')keywords.add(tag);
  else{
   const role=comp.models.find(m=>equivalent(m.name,scope));
   if(!role)throw Error('Unknown keyword owner '+d.name+' '+scope);
   modelKeywords[role.name]??=[];if(!modelKeywords[role.name].includes(tag))modelKeywords[role.name].push(tag);
  }
 }
 for(const conditional of ref.conditional_keywords??[]){
  if(conditional.required_faction_keyword==='Dark Angels'&&['Deathwing','Ravenwing'].includes(conditional.keyword))keywords.delete(conditional.keyword.toUpperCase());
 }
 if(d.name==='Thunderhawk Gunship'){
  if(!keywords.has('RAVENWING')||ref.keywords.includes('Ravenwing'))throw Error('Review Thunderhawk chapter-view alias');
  keywords.delete('RAVENWING');
 }
 const edges=new Set(tables.Datasheets_leader.filter(l=>l.leader_id===d.id).map(l=>l.attached_id));
 const bodyguards=native.filter(b=>edges.has(b.id)).map(b=>b.name).sort();
 const expected=(price.supportTo??price.leaderTo??[]).map(n=>native.find(b=>key(b.name)===key(n))?.name).filter(Boolean).sort();
 const conditionalSupport=d.name==='Cato Sicarius';
 if(conditionalSupport){
  const change=own('Datasheets_abilities').find(a=>a.name==='Captain of the Honour Guard');
  if(d.is_support!=='false'||!price.supportTo||change?.description!=='If your army includes a Marneus Calgar unit, replace this unit’s Leader ability with the Support ability (this unit can still be attached to the same units).')throw Error('Review conditional Cato Support role');
 }
 if(!isDeepStrictEqual(bodyguards,expected)||!conditionalSupport&&(d.is_support==='true')!==!!price.supportTo)throw Error('Attachment mismatch '+d.name+': '+JSON.stringify({bodyguards,expected,support:d.is_support,priceSupport:!!price.supportTo}));
 const prices=readPrices(spaceMarinePriceRows(own('Datasheets_models_cost'),d.name),d.name,price);
 const printed=own('Datasheets_models');
 if(!printed.length||new Set(printed.map(p=>p.name)).size!==printed.length)throw Error('Missing physical profile '+d.name);
 const profiles={};
 for(const m of comp.models){
  const desired=m.profile_name??m.name;
  const original=printed.length===1?printed[0]:printed.find(p=>equivalent(spaceMarineModelName(d.name,p.name),desired));
  const other=ref.profiles.find(p=>equivalent(spaceMarineModelName(d.name,p.name),desired))??(ref.profiles.length===1?ref.profiles[0]:undefined);
  if(!original||!other)throw Error('Unknown model profile '+d.name+' / '+m.name+' '+desired);
  const p=modelProfile(original,d.name);
  if(stats([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])!==stats([other.M,other.T,other.Sv,other.W,other.Ld,other.OC]))throw Error('Characteristics differ '+d.name+' / '+m.name+': '+JSON.stringify({p,other}));
  profiles[m.name]=p;
 }
 const named=k=>[d.name,...comp.models.map(m=>m.name)].some(n=>equivalent(n,k));
 const actual=[...new Set([...keywords,...Object.values(modelKeywords).flat()])].filter(k=>!named(k)).sort();
 const expectedTags=[...new Set([...ref.keywords,...ref.faction_keywords].map(k=>k.toUpperCase()))].filter(k=>!named(k)).sort();
 const omittedModelIdentity=d.name==='Company Heroes'?['CHAMPION']:d.name===victrix?['ANCIENT','CHAMPION']:[];
 for(const tag of omittedModelIdentity){
  if(expectedTags.includes(tag)||!Object.values(modelKeywords).some(tags=>tags.includes(tag)))throw Error('Review printed model identity '+d.name+' '+tag);
  expectedTags.push(tag);
 }
 expectedTags.sort();
 if(!isDeepStrictEqual(actual,expectedTags))throw Error('Keyword mismatch '+d.name+': '+JSON.stringify({actual,expected:expectedTags}));
 return {faction:'Space Marines',unit:d.name,source:d.link,pointsSource:'https://mfm.warhammer-community.com/en/'+(d.source_id==='000000035'?'deathwatch':'space-marines'),verified:'sizes-and-points',...prices,composition,keywords:[...keywords].sort(),...(Object.keys(modelKeywords).length?{modelKeywords:Object.fromEntries(Object.entries(modelKeywords).map(([k,v])=>[k,v.sort()]))}:{}),...(printed.length===1?{profile:modelProfile(printed[0],d.name)}:{modelProfiles:profiles}),...(bodyguards.length?{attachmentRole:d.is_support==='true'?'support':'leader',bodyguards}:{})};
}).sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
applyModelComposition(sheets.filter(s=>s.unit!==victrix),units,compositions,'adeptus-astartes','2026-10-14');
for(const sheet of sheets.filter(s=>s.unit!==victrix&&s.unit!=='Decimus Kill Team')){
 const comp=compositions.find(c=>c.unit_id===independent(sheet.unit).id);
 // MFM tiers are prices, not a prohibition on the intermediate model counts
 // expressly permitted by the current card (e.g. one Sergeant and 4–9 Marines).
 let choices=[{}];
 for(const m of comp.models)choices=choices.flatMap(c=>Array.from({length:m.max-m.min+1},(_,i)=>({...c,[m.name]:m.min+i})));
 const tiers={};
 for(const c of choices){const n=Object.values(c).reduce((a,b)=>a+b,0);if(n<sheet.sizes[0]||n>sheet.sizes.at(-1))continue;if(tiers[n])throw Error('Unreviewed alternative physical composition '+sheet.unit);tiers[n]=c;}
 if(!sheet.sizes.every(n=>tiers[n])||Object.entries(sheet.compositionBySize).some(([n,c])=>!isDeepStrictEqual(c,tiers[n])))throw Error('Printed composition and priced MFM tiers disagree '+sheet.unit);
 sheet.compositionBySize=tiers;
}
const special=compositions.find(c=>c.unit_id===independent(victrix).id),alternatives={};
for(const tier of special.tiers){
 if(tier.models.some(m=>m.min!==m.max))throw Error('Variable Victrix tier');
 const models=Object.fromEntries(special.models.map(m=>[m.name,tier.models.find(r=>r.name===m.name)?.min??0]));
 const size=Object.values(models).reduce((a,b)=>a+b,0);(alternatives[size]??=[]).push(models);
}
if(!isDeepStrictEqual(Object.keys(alternatives),['3','6'])||Object.values(alternatives).some(a=>a.length!==4))throw Error('Review Victrix composition choices');
const v=sheets.find(s=>s.unit===victrix);v.compositionBySize=Object.fromEntries(Object.entries(alternatives).map(([size,choices])=>[size,choices.find(c=>c[victrix]===+size)]));
for(const sheet of sheets){
 const roles=compositions.find(c=>c.unit_id===independent(sheet.unit).id).models.map(m=>m.name);
 for(const tier of Object.values(sheet.compositionBySize))for(const role of roles)tier[role]??=0;
}
for(const [unit,tags] of [['Kayvaan Shrike',['CHARACTER','EPIC HERO']],['Librarian In Terminator Armour',['CHARACTER']]])if(!tags.every(tag=>sheets.find(s=>s.unit===unit)?.keywords.includes(tag)))throw Error('Missing publisher correction '+unit);
const revision={manual:'1.6',manualFirstSeen:'2026-10-14',publisher:'https://assets.warhammer-community.com/eng_14-10_wh40k_printed_product_updates_space_marines_updates-91hillwcff-wzs8qnozam.pdf',publisherVersion:'1.1',exportUpdated:tables.Last_update[0].last_update,independent:'https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core/adeptus-astartes',sourceIds:SM_SOURCE_IDS};
writeFileSync(destination,"// Generated by scripts/import-space-marines.mjs.\nimport type {Datasheet2026} from './datasheets-2026';\n"+'export const SM_REVISION='+JSON.stringify(revision)+' as const;\n'+'export const SM_NATIVE_SHEETS:readonly Datasheet2026[]='+JSON.stringify(sheets,null,2)+';\n'+'export const SM_VICTRIX_COMPOSITIONS:Readonly<Record<number,readonly Readonly<Record<string,number>>[]>>='+JSON.stringify(alternatives)+';\n');
