import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';
import {loadExport,modelProfile,rosterMetadata} from './import-wahapedia-11e.mjs';
import {nativeNameKey} from './import-native-muster.mjs';
import {applyModelComposition} from './import-mfm-composition.mjs';
import {readPrices} from './import-imperial-knights.mjs';

const [directory,manualDirectory,relationalDirectory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-aeldari.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY OUTPUT_TS');
const {tables}=await loadExport({directory});
const manual=parse(readFileSync(join(manualDirectory,'aeldari.yaml'),'utf8'));
const read=file=>JSON.parse(readFileSync(join(relationalDirectory,'aeldari',file+'.json'),'utf8'));
const units=read('units'),compositions=read('unit-compositions');
if(manual.slug!=='aeldari'||manual.version!=='1.6'||manual.firstSeen!=='2026-10-14')throw Error('Review Aeldari MFM revision');
const source=tables.Source.find(s=>s.id==='000000186'&&s.name==='Aeldari'&&s.edition==='11'&&s.version==='1.4');
const armour=tables.Source.find(s=>s.id==='000000367'&&s.name==='Aeldari (Forge World)'&&s.edition==='0');
if(!source||!armour)throw Error('Review current Aeldari source revisions');
const titans=['Phantom Titan','Revenant Titan'];
const native=tables.Datasheets.filter(d=>d.faction_id==='AE'&&(d.source_id===source.id||d.source_id===armour.id&&titans.includes(d.name)));
const key=n=>nativeNameKey(n==='Vypers'?'Vyper':n);
const priced=manual.units.filter(u=>!u.legends);
if(native.length!==76||priced.length!==76||new Set(native.map(d=>key(d.name))).size!==76||new Set(priced.map(d=>key(d.name))).size!==76)throw Error('Review Aeldari matched-play inventory');
function independent(name){
 const found=units.filter(u=>key(u.name)===key(name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(found.length!==1)throw Error('Missing current independent card '+name);
 return found[0];
}
const corsairs='Corsair Voidscarred',specialists=['Shade Runner','Soul Weaver','Way Seeker'];
const sheets=native.map(d=>{
 const price=priced.find(u=>key(u.name)===key(d.name)),ref=independent(d.name);
 if(!price||!d.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/aeldari/'))throw Error('Unpriced Aeldari card '+d.name);
 const own=table=>tables[table].filter(r=>r.datasheet_id===d.id);
 const factionKeywords=ref.faction_keywords.map(k=>k.toUpperCase());
 const aliases=own('Datasheets_keywords').filter(k=>k.is_faction_keyword==='true'&&!factionKeywords.includes(k.keyword.toUpperCase()));
 // The faction index aliases ordinary Asuryani cards into the conditional
 // Ynnari roster. Store only the actual card tags; Disparate Paths applies
 // any selected-army keyword replacement at runtime.
 if(aliases.some(k=>!['','YNNARI'].includes(k.keyword.toUpperCase())))throw Error('Unreviewed faction alias '+d.name);
 let scoped={...tables,Datasheets_keywords:tables.Datasheets_keywords.filter(k=>k.datasheet_id!==d.id||k.is_faction_keyword!=='true'||factionKeywords.includes(k.keyword.toUpperCase()))};
 if(d.name===corsairs){
  if(own('Datasheets_unit_composition').map(r=>r.description).join('|')!=='This unit can contain a maximum of 10 models.|1 Voidscarred Felarch|4-9 Corsair Voidscarred|0-1 Shade Runner|0-1 Soul Weaver|0-1 Way Seeker')throw Error('Review optional Corsair specialists');
  scoped={...scoped,Datasheets_unit_composition:tables.Datasheets_unit_composition.filter(r=>r.datasheet_id!==d.id||['1 Voidscarred Felarch','4-9 Corsair Voidscarred'].includes(r.description))};
 }
 const metadata=rosterMetadata(scoped,d.name,d.id,d.name===corsairs?specialists:[]);
 const edges=new Set(tables.Datasheets_leader.filter(l=>l.leader_id===d.id).map(l=>l.attached_id));
 let bodyguards=native.filter(b=>edges.has(b.id)).map(b=>b.name).sort();
 let expected=(price.supportTo??price.leaderTo??[]).map(n=>native.find(b=>key(b.name)===key(n))?.name).filter(Boolean).sort();
 if(d.name==='Farseer Skyrunner'){
  // Current card and MFM disagree. The current 19.01 FAQ gives the MFM
  // attachment list priority, so preserve its additional compatibility.
  // Runtime formation legality still enforces mandatory Support hosting.
  if(!isDeepStrictEqual(expected,['Warlock Skyrunners','Windriders'])||!isDeepStrictEqual(bodyguards,['Windriders'])||native.find(d=>d.name==='Warlock Skyrunners')?.is_support!=='true')throw Error('Review Farseer Skyrunner Support conflict');
  bodyguards=expected;
 }
 if(!isDeepStrictEqual(bodyguards,expected)||(d.is_support==='true')!==!!price.supportTo)throw Error('Attachment mismatch '+d.name+': '+JSON.stringify({bodyguards,expected}));
 let costs=own('Datasheets_models_cost');
 if(d.name===corsairs){
  if(costs.length!==5||costs[1].description!=='<div class="dsHeaderComp">1 Voidscarred Felarch, 4 Corsair Voidscarred</div>'||costs[3].description!=='<div class="dsHeaderComp">1 Voidscarred Felarch, 5-9 Corsair Voidscarred, 0-1 Shade Runner, 0-1 Soul Weaver, 0-1 Way Seeker</div>'||costs[4].description!=='6-10 models')throw Error('Review Corsair point brackets');
  costs=costs.filter(r=>!r.description.startsWith('<div class="dsHeaderComp">')).map(r=>r.description==='6-10 models'?{...r,description:'10 models'}:r);
 }
 const points=readPrices(costs,d.name,price);
 const models=own('Datasheets_models');
 if(!models.length||new Set(models.map(m=>m.name)).size!==models.length)throw Error('Missing physical profiles '+d.name);
 return {faction:'Aeldari',unit:d.name,source:d.link,pointsSource:'https://mfm.warhammer-community.com/en/aeldari',verified:'sizes-and-points',...points,...metadata,...(models.length===1?{profile:modelProfile(models[0],d.name)}:{modelProfiles:Object.fromEntries(models.map(m=>[m.name,modelProfile(m,d.name)]))}),...(bodyguards.length?{attachmentRole:d.is_support==='true'?'support':'leader',bodyguards}:{})};
}).sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
// The independent MFM entry still uses the singular title. The current
// publisher card (including its 1–2 physical composition) is named Vypers.
const compositionUnits=units.map(u=>u.name==='Vyper'?{...u,name:'Vypers'}:u);
applyModelComposition(sheets.filter(s=>s.unit!==corsairs),compositionUnits,compositions,'aeldari','2026-10-14');
const corsair=sheets.find(s=>s.unit===corsairs),corsairRef=compositions.find(c=>c.unit_id===independent(corsairs).id);
if(!isDeepStrictEqual(corsairRef.models.map(({name,min,max})=>({name,min,max})),[{name:'Voidscarred Felarch',min:1,max:1},{name:corsairs,min:4,max:9},...specialists.map(name=>({name,min:0,max:1}))]))throw Error('Independent Corsair composition differs');
const alternatives={};
for(let n=5;n<=10;n++){
 const options=[];
 for(let bits=0;bits<8;bits++){
  const selected=Object.fromEntries(specialists.map((name,i)=>[name,(bits>>i)&1]));
  const regular=n-1-Object.values(selected).reduce((a,b)=>a+b,0);
  if(regular>=4)options.push({'Voidscarred Felarch':1,[corsairs]:regular,...selected});
 }
 alternatives[n]=options;
}
if(Object.values(alternatives).flat().length!==36)throw Error('Review Corsair compositions');
corsair.compositionBySize=Object.fromEntries(Object.entries(alternatives).map(([size,options])=>[size,options[0]]));
corsair.composition=[{model:'Voidscarred Felarch',min:1,max:1},{model:corsairs,min:4,max:9},...specialists.map(model=>({model,min:0,max:1}))];

const token=n=>n.toLowerCase().replace(/\s+models?$/,'').replace(/[^a-z0-9]/g,'');
const equivalent=(a,b)=>token(a)===token(b)||token(a)+'s'===token(b)||token(a)===token(b)+'s'||token(a)+'es'===token(b)||token(a)===token(b)+'es';
const stats=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
for(const sheet of sheets){
 const ref=independent(sheet.unit),group=compositions.find(c=>c.unit_id===ref.id),d=native.find(d=>d.name===sheet.unit);
 const printed=tables.Datasheets_models.filter(p=>p.datasheet_id===d.id);
 const roles=[...new Set(Object.values(sheet.compositionBySize).flatMap(c=>Object.keys(c)))],expanded={};
 for(const role of roles){
  const original=printed.length===1?printed[0]:printed.find(p=>equivalent(p.name,role));
  const model=group.models.find(m=>m.name===role),profile=ref.profiles.find(p=>equivalent(p.name,model?.profile_name??role))??(ref.profiles.length===1?ref.profiles[0]:undefined);
  if(!original||!model||!profile)throw Error('Unresolved physical model '+sheet.unit+' / '+role);
  const p=modelProfile(original,sheet.unit);
  if(stats([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])!==stats([profile.M,profile.T,profile.Sv,profile.W,profile.Ld,profile.OC]))throw Error('Characteristics disagree '+sheet.unit+' / '+role);
  expanded[role]=p;
 }
 const named=k=>[sheet.unit,...roles].some(r=>equivalent(r,k));
 const actual=[...sheet.keywords,...Object.values(sheet.modelKeywords??{}).flat()].filter(k=>!named(k)).sort();
 let expected=[...ref.keywords,...ref.faction_keywords].map(k=>k.toUpperCase()).filter(k=>!named(k)).sort();
 if(sheet.unit==='Warlock Skyrunners'){
  // The relational index includes this obsolete identity alias in addition
  // to the card's WARLOCKS keyword; it is not a printed keyword.
  if(!expected.includes('WARLOCK SKYRUNNER CONCLAVE'))throw Error('Review Warlock identity alias');
  expected=expected.filter(k=>k!=='WARLOCK SKYRUNNER CONCLAVE');
 }
 if(!isDeepStrictEqual(actual,expected))throw Error('Keywords differ '+sheet.unit+': '+JSON.stringify({actual,expected}));
 for(const tier of Object.values(sheet.compositionBySize))for(const role of roles)tier[role]??=0;
 if(printed.length>1){delete sheet.profile;sheet.modelProfiles=expanded;}
 // Validate the printed min/max for every physical role before matching the
 // normalized independent role names used by the equipment slots.
 for(const comp of sheet.composition){
  const model=group.models.find(m=>equivalent(m.name,comp.model)||(sheet.unit==='Wraithknight with Ghostglaive'&&comp.model==='Wraithknight'&&m.name==='Wraithknight with Ghostglaive'));
  if(!model||model.min!==comp.min||model.max!==comp.max)throw Error('Composition disagrees '+sheet.unit+' / '+comp.model);
  comp.model=model.name;
 }
}
const revision={pack:source.errata_link,packVersion:source.version,manual:manual.version,exportUpdated:tables.Last_update[0].last_update,independent:'https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core'};
writeFileSync(destination,"// Generated by scripts/import-aeldari.mjs.\nimport type {Datasheet2026} from './datasheets-2026';\n"+
 'export const AELDARI_REVISION='+JSON.stringify(revision)+' as const;\n'+
 'export const AELDARI_NATIVE_SHEETS:readonly Datasheet2026[]='+JSON.stringify(sheets,null,2)+';\n'+
 'export const AELDARI_VOIDSCARRED_COMPOSITIONS:Readonly<Record<number,readonly Readonly<Record<string,number>>[]>>='+JSON.stringify(alternatives)+';\n');
