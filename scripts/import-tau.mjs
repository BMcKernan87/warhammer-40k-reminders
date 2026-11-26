import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';
import {loadExport,modelProfile,rosterMetadata} from './import-wahapedia-11e.mjs';
import {readPrices} from './import-imperial-knights.mjs';
import {nativeNameKey} from './import-native-muster.mjs';
import {applyModelComposition} from './import-mfm-composition.mjs';
import {tauCompositions} from './import-tau-composition.mjs';

const [directory,manualPath,unitsPath,compositionPath,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-tau.mjs CSV_DIR MFM_YAML UNITS_JSON COMPOSITIONS_JSON OUTPUT_TS');
const {tables}=await loadExport({directory}),manual=parse(readFileSync(manualPath,'utf8'));
const units=JSON.parse(readFileSync(unitsPath,'utf8')),compositions=JSON.parse(readFileSync(compositionPath,'utf8'));
if(manual.slug!=='tau-empire'||manual.version!=='1.6'||manual.firstSeen!=='2026-10-14')throw Error('Review T’au MFM revision');
const source=tables.Source.find(s=>s.id==='000000028'&&s.name==='T’au Empire'&&s.edition==='11'&&s.version==='1.2');
if(!source)throw Error('Review T’au current faction pack');
// These four Imperial Armour sheets are printed in the current-edition
// publisher pack v1.2 pp. 11–18. The export retains an edition-0 source stub.
const fw=['Ta’unar Supremacy Armour','Tiger Shark','AX-1-0 Tiger Shark','Manta'];
const native=tables.Datasheets.filter(d=>d.faction_id==='TAU'&&(d.source_id===source.id||d.source_id==='000000382'&&fw.includes(d.name)));
const prices=new Map(manual.units.filter(u=>!u.legends).map(u=>[nativeNameKey(u.name),u]));
const names=new Map(native.map(d=>[nativeNameKey(d.name),d.name]));
if(native.length!==43||names.size!==prices.size||names.size!==native.length)throw Error('Review native T’au matched-play inventory');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const sheets=native.map(d=>{
 const price=prices.get(nativeNameKey(d.name));
 if(!price||!d.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/t-au-empire/'))throw Error('Missing current T’au identity '+d.name);
 const owned=key=>tables[key].filter(s=>s.datasheet_id===d.id);
 let costs=owned('Datasheets_models_cost').filter(row=>{
  if(!row.description.startsWith('<div class="dsHeaderComp">'))return true;
  if(row.cost||!['Broadside Battlesuits','Tidewall Shieldline'].includes(d.name)||!/^\d+ (Broadside Shas’(?:ui|vre)|Tidewall (?:Defence Platform|Shieldline))$/.test(plain(row.description)))throw Error('Review T’au cost-table composition '+d.name);
  return false;
 });
 let normalizedPrice=price;
 if(d.name==='Tidewall Shieldline'){
  const entries=price.pricing[0]?.costs;
  if(price.pricing.length!==1||entries?.length!==2||entries[0].models!==1||entries[0].points!==85||entries[1].models!==1||entries[1].points!==20||entries[1].desc!=='Tidewall Defence Platform'||entries[1].addon!==true)throw Error('Review optional Tidewall price');
  if(costs.length!==3||costs[1].description!=='1 model'||costs[1].cost!=='85'||costs[2].description!=='2 models'||costs[2].cost!=='105')throw Error('Review Shieldline CSV price interpretation');
  const item='Tidewall defence platform';
  normalizedPrice={...price,pricing:[{...price.pricing[0],costs:[entries[0]]}],wargear:[{item,points:entries[1].points}]};
  costs=[...costs.slice(0,2),{datasheet_id:d.id,line:'8',description:'WARGEAR OPTIONS',cost:''},{datasheet_id:d.id,line:'9',description:'per '+item,cost:String(entries[1].points)}];
 }
 const bands=readPrices(costs,d.name,normalizedPrice);
 let composition=owned('Datasheets_unit_composition');
 if(d.name==='Tidewall Shieldline'){
  const option=owned('Datasheets_options').map(o=>o.description).join(' ');
  if(composition.length!==1||plain(composition[0].description)!=='1 Tidewall Shieldline'||option!=='This model can be equipped with 1 Tidewall defence platform.')throw Error('Review optional Tidewall platform');
 }
 // Optional physical roles may begin at zero; the shared legacy metadata
 // parser requires at least one. Parse the real counts here, while retaining
 // its strict keyword-scope checks against the same named model roles.
 const parsed=composition.map(row=>{
  const label=plain(row.description).replace(/\s+[–—-]\s+EPIC HERO$/i,'');
  const m=label.match(/^(\d+)(?:[-–](\d+))?\s+(.+)$/);
  if(!m)throw Error('Review T’au model composition '+d.name);
  return {model:m[3],min:Number(m[1]),max:Number(m[2]??m[1])};
 });
 const proxy=composition.map(row=>({...row,description:row.description.replace(/^0([-–]\d+)?\s/,'1$1 ')}));
 const data=rosterMetadata({...tables,Datasheets_unit_composition:proxy},d.name,d.id);
 data.composition=parsed;
 if(parsed.reduce((n,m)=>n+m.min,0)!==bands.sizes[0]||parsed.reduce((n,m)=>n+m.max,0)!==bands.sizes.at(-1))throw Error('T’au strength and pricing disagree '+d.name);
 const models=owned('Datasheets_models');
 if(!models.length||new Set(models.map(m=>m.name)).size!==models.length)throw Error('Duplicate T’au model profile '+d.name);
 const profile=models.length===1?{profile:modelProfile(models[0],d.name)}:{modelProfiles:Object.fromEntries(models.map(m=>[m.name,modelProfile(m,d.name)]))};
 const edges=new Set(tables.Datasheets_leader.filter(l=>l.leader_id===d.id).map(l=>l.attached_id));
 const bodyguards=native.filter(b=>edges.has(b.id)).map(b=>b.name).sort();
 const manualBodies=(price.supportTo??price.leaderTo??[]).map(n=>names.get(nativeNameKey(n))).filter(Boolean).sort();
 if(!isDeepStrictEqual(bodyguards,manualBodies)||(d.is_support==='true')!==!!price.supportTo)throw Error('T’au attachment sources disagree '+d.name);
 return {faction:'T’au Empire',unit:d.name,source:d.link,pointsSource:'https://mfm.warhammer-community.com/en/tau-empire',verified:'sizes-and-points',...bands,...data,...profile,...(bodyguards.length?{attachmentRole:d.is_support==='true'?'support':'leader',bodyguards}:{})};
}).sort((a,b)=>a.unit<b.unit?-1:1);
applyModelComposition(sheets,units,tauCompositions(compositions),'tau-empire',manual.firstSeen);
const key=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
for(const sheet of sheets){
 const roles=[...new Set(Object.values(sheet.compositionBySize).flatMap(t=>Object.keys(t)))];
 for(const tier of Object.values(sheet.compositionBySize))for(const role of roles)tier[role]??=0;
 const independent=units.filter(u=>key(u.name)===key(sheet.unit)&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(independent.length!==1)throw Error('Missing independent T’au profile '+sheet.unit);
 const normalize=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
 const printed=[...new Set(Object.values(sheet.modelProfiles??{model:sheet.profile}).map(p=>normalize([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])))].sort();
 const expected=[...new Set(independent[0].profiles.map(p=>normalize([p.M,p.T,p.Sv,p.W,p.Ld,p.OC])))].sort();
 if(!isDeepStrictEqual(printed,expected))throw Error('T’au model characteristics disagree '+sheet.unit+': '+printed+' vs '+expected);
}
const rule=tables.Abilities.find(a=>a.name==='For the Greater Good'&&a.faction_id==='TAU');
if(!rule)throw Error('Review For the Greater Good source');
const authorized=new Set(tables.Datasheets_abilities.filter(a=>a.ability_id===rule.id).map(a=>a.datasheet_id));
const recipients=native.filter(s=>authorized.has(s.id)).map(s=>s.name).sort();
const revision={pack:'https://assets.warhammer-community.com/eng_wh40k_faction_pack_tau_empire-sxhzmfrlud-mpzjzuhupn.pdf',packVersion:'1.2',manual:manual.version,exportUpdated:tables.Last_update[0].last_update,composition:'https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core/tau-empire'};
writeFileSync(destination,"// Generated by scripts/import-tau.mjs.\nimport type {Datasheet2026} from './datasheets-2026';\n"+'export const TAU_REVISION='+JSON.stringify(revision)+' as const;\n'+'export const TAU_SHEETS:readonly Datasheet2026[]='+JSON.stringify(sheets,null,2)+';\n'+'export const TAU_GREATER_GOOD_UNITS:readonly string[]='+JSON.stringify(recipients)+';\n');
