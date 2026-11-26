import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';
import {loadExport,modelProfile,rosterMetadata} from './import-wahapedia-11e.mjs';
import {importNativeMuster,nativeNameKey} from './import-native-muster.mjs';
import {applyModelComposition} from './import-mfm-composition.mjs';
import {readPrices} from './import-imperial-knights.mjs';

const [directory,manualDirectory,relationalDirectory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-drukhari.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY OUTPUT_TS');
const {tables}=await loadExport({directory});
const manual=slug=>parse(readFileSync(join(manualDirectory,slug+'.yaml'),'utf8'));
const relational=(slug,file)=>JSON.parse(readFileSync(join(relationalDirectory,slug,file+'.json'),'utf8'));
const nativeManual=manual('drukhari'),alliedManual=manual('aeldari');
for(const m of [nativeManual,alliedManual])if(m.version!=='1.6'||m.firstSeen!=='2026-10-14')throw Error('Review Drukhari/Aeldari points revision');
const source=tables.Source.find(s=>s.id==='000000031'&&s.name==='Drukhari'&&s.edition==='11'&&s.version==='1.2');
const alliedSource=tables.Source.find(s=>s.id==='000000186'&&s.name==='Aeldari'&&s.edition==='11'&&s.version==='1.4');
if(!source||!alliedSource)throw Error('Review current Drukhari and allied source revisions');
const native=tables.Datasheets.filter(d=>d.faction_id==='DRU'&&d.source_id===source.id);
const alliedNames=tables.Datasheets.filter(d=>d.faction_id==='DRU'&&d.source_id===alliedSource.id).map(d=>d.name);
const allied=tables.Datasheets.filter(d=>d.faction_id==='AE'&&d.source_id===alliedSource.id&&alliedNames.includes(d.name));
if(native.length!==23||allied.length!==14||new Set(alliedNames).size!==14)throw Error('Review matched-play Drukhari and allied inventory');
const units={drukhari:relational('drukhari','units'),aeldari:relational('aeldari','units')};
const comps={drukhari:relational('drukhari','unit-compositions'),aeldari:relational('aeldari','unit-compositions')};
function independent(name,slug){
 const found=units[slug].filter(u=>nativeNameKey(u.name)===nativeNameKey(name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(found.length!==1)throw Error('Missing current independent card '+name);
 return found[0];
}
const nativeSheets=importNativeMuster({...tables,Datasheets:native},nativeManual,{name:'Drukhari',slug:'drukhari',factionId:'DRU'});
applyModelComposition(nativeSheets,units.drukhari,comps.drukhari,'drukhari','2026-10-14');
const alliedSheets=allied.map(d=>{
 const ref=independent(d.name,'aeldari'),price=alliedManual.units.find(u=>nativeNameKey(u.name)===nativeNameKey(d.name)&&!u.legends);
 if(!price)throw Error('Unpriced allied unit '+d.name);
 const own=key=>tables[key].filter(r=>r.datasheet_id===d.id);
 const factionKeywords=ref.faction_keywords.map(k=>k.toUpperCase());
 const aliasRows=own('Datasheets_keywords').filter(k=>k.is_faction_keyword==='true'&&!factionKeywords.includes(k.keyword.toUpperCase()));
 // The faction-selection index emits empty/YNNARI aliases for ordinary
 // Corsairs. They are not granted by Corsairs and Travelling Players.
 // Read the actual Aeldari card and its independently extracted faction tag.
 if(aliasRows.some(k=>!['','YNNARI'].includes(k.keyword.toUpperCase())))throw Error('Unreviewed allied faction alias '+d.name);
 let scoped={...tables,Datasheets_keywords:tables.Datasheets_keywords.filter(k=>k.datasheet_id!==d.id||k.is_faction_keyword!=='true'||factionKeywords.includes(k.keyword.toUpperCase()))};
 if(d.name==='Corsair Voidscarred'){
  const rows=own('Datasheets_unit_composition');
  if(rows.map(r=>r.description).join('|')!=='This unit can contain a maximum of 10 models.|1 Voidscarred Felarch|4-9 Corsair Voidscarred|0-1 Shade Runner|0-1 Soul Weaver|0-1 Way Seeker')throw Error('Review optional Corsair specialists');
  scoped={...scoped,Datasheets_unit_composition:tables.Datasheets_unit_composition.filter(r=>r.datasheet_id!==d.id||['1 Voidscarred Felarch','4-9 Corsair Voidscarred'].includes(r.description))};
 }
 const metadata=rosterMetadata(scoped,d.name,d.id,d.name==='Corsair Voidscarred'?['Shade Runner','Soul Weaver','Way Seeker']:[]);
 const edges=new Set(tables.Datasheets_leader.filter(l=>l.leader_id===d.id).map(l=>l.attached_id));
 const bodyguards=allied.filter(b=>edges.has(b.id)).map(b=>b.name).sort();
 const expected=(price.supportTo??price.leaderTo??[]).map(n=>allied.find(b=>nativeNameKey(b.name)===nativeNameKey(n))?.name).filter(Boolean).sort();
 if(!isDeepStrictEqual(bodyguards,expected)||(d.is_support==='true')!==!!price.supportTo)throw Error('Allied attachment mismatch '+d.name);
 let costRows=own('Datasheets_models_cost');
 if(d.name==='Corsair Voidscarred'){
  if(costRows.length!==5||costRows[1].description!=='<div class="dsHeaderComp">1 Voidscarred Felarch, 4 Corsair Voidscarred</div>'||costRows[3].description!=='<div class="dsHeaderComp">1 Voidscarred Felarch, 5-9 Corsair Voidscarred, 0-1 Shade Runner, 0-1 Soul Weaver, 0-1 Way Seeker</div>'||costRows[4].description!=='6-10 models')throw Error('Review Corsair cost-band headings');
  // Composition headings are not copy-price brackets; the 6–10 band uses
  // its upper endpoint in the shared point-band representation.
  costRows=costRows.filter(r=>!r.description.startsWith('<div class="dsHeaderComp">')).map(r=>r.description==='6-10 models'?{...r,description:'10 models'}:r);
 }
 const costs=readPrices(costRows,d.name,price);
 const models=own('Datasheets_models');
 if(models.length!==1)throw Error('Review mixed allied model profiles '+d.name);
 return {faction:'Drukhari',unit:d.name,source:d.link,pointsSource:'https://mfm.warhammer-community.com/en/aeldari',verified:'sizes-and-points',...costs,...metadata,profile:modelProfile(models[0],d.name),...(bodyguards.length?{attachmentRole:d.is_support==='true'?'support':'leader',bodyguards}:{})};
});
applyModelComposition(alliedSheets.filter(s=>s.unit!=='Corsair Voidscarred'),units.aeldari,comps.aeldari,'aeldari','2026-10-14');
const corsair=alliedSheets.find(s=>s.unit==='Corsair Voidscarred'),corsairRef=comps.aeldari.find(c=>c.unit_id===independent(corsair.unit,'aeldari').id);
const specialists=['Shade Runner','Soul Weaver','Way Seeker'];
if(!isDeepStrictEqual(corsairRef.models.map(({name,min,max})=>({name,min,max})),[{name:'Voidscarred Felarch',min:1,max:1},{name:'Corsair Voidscarred',min:4,max:9},...specialists.map(name=>({name,min:0,max:1}))]))throw Error('Independent Corsair composition differs');
const alternatives={};
for(let n=5;n<=10;n++){
 const options=[];
 for(let bits=0;bits<8;bits++){
  const selected=Object.fromEntries(specialists.map((name,i)=>[name,(bits>>i)&1]));
  const regular=n-1-Object.values(selected).reduce((a,b)=>a+b,0);
  if(regular>=4)options.push({'Voidscarred Felarch':1,'Corsair Voidscarred':regular,...selected});
 }
 alternatives[n]=options;
}
if(Object.values(alternatives).flat().length!==36)throw Error('Review Corsair composition count');
corsair.compositionBySize=Object.fromEntries(Object.entries(alternatives).map(([size,options])=>[size,options[0]]));
corsair.composition=[{model:'Voidscarred Felarch',min:1,max:1},{model:'Corsair Voidscarred',min:4,max:9},...specialists.map(model=>({model,min:0,max:1}))];

const key=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const stats=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
for(const [sheets,slug,originals] of [[nativeSheets,'drukhari',native],[alliedSheets,'aeldari',allied]])for(const sheet of sheets){
 const ref=independent(sheet.unit,slug),group=comps[slug].find(c=>c.unit_id===ref.id),d=originals.find(d=>d.name===sheet.unit);
 const printed=tables.Datasheets_models.filter(p=>p.datasheet_id===d.id);
 const roles=[...new Set(Object.values(sheet.compositionBySize).flatMap(c=>Object.keys(c)))];
 const expanded={};
 for(const role of roles){
  const original=printed.length===1?printed[0]:printed.find(p=>key(p.name)===key(role));
  const model=group.models.find(m=>m.name===role),profile=ref.profiles.find(p=>key(p.name)===key(model?.profile_name??role))??(ref.profiles.length===1?ref.profiles[0]:undefined);
  if(!original||!model||!profile)throw Error('Unresolved physical model '+sheet.unit+' / '+role);
  const p=modelProfile(original,sheet.unit);
  if(stats([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])!==stats([profile.M,profile.T,profile.Sv,profile.W,profile.Ld,profile.OC]))throw Error('Characteristics disagree '+sheet.unit+' / '+role);
  expanded[role]=p;
 }
 const named=k=>[sheet.unit,...roles].some(r=>key(r)===key(k)||key(r)===key(k)+'s'||key(r)+'s'===key(k));
 const actual=[...sheet.keywords,...Object.values(sheet.modelKeywords??{}).flat()].filter(k=>!named(k)).sort();
 const expected=[...ref.keywords,...ref.faction_keywords].map(k=>k.toUpperCase()).filter(k=>!named(k)).sort();
 if(!isDeepStrictEqual(actual,expected))throw Error('Keywords differ '+sheet.unit+': '+JSON.stringify({actual,expected}));
 for(const tier of Object.values(sheet.compositionBySize))for(const role of roles)tier[role]??=0;
 if(printed.length>1){delete sheet.profile;sheet.modelProfiles=expanded;}
}
const revision={pack:source.errata_link,packVersion:source.version,alliedPack:alliedSource.errata_link,alliedPackVersion:alliedSource.version,manual:'1.6',exportUpdated:tables.Last_update[0].last_update,independent:'https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core'};
writeFileSync(destination,"// Generated by scripts/import-drukhari.mjs.\nimport type {Datasheet2026} from './datasheets-2026';\n"+
 'export const DRUKHARI_REVISION='+JSON.stringify(revision)+' as const;\n'+
 'export const DRUKHARI_NATIVE_SHEETS:readonly Datasheet2026[]='+JSON.stringify(nativeSheets,null,2)+';\n'+
 'export const DRUKHARI_ALLIED_SHEETS:readonly Datasheet2026[]='+JSON.stringify(alliedSheets.sort((a,b)=>a.unit.localeCompare(b.unit,'en')),null,2)+';\n'+
 'export const DRUKHARI_VOIDSCARRED_COMPOSITIONS:Readonly<Record<number,readonly Readonly<Record<string,number>>[]>>='+JSON.stringify(alternatives)+';\n');
