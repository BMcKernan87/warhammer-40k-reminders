import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';

const [csv,manualPath,directory,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-emperors-children-loadouts.mjs CSV_DIR MFM_YAML 40KDC_EMPERORS_CHILDREN_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const mfm=parse(readFileSync(manualPath,'utf8'));
if(mfm.slug!=='emperors-children'||mfm.version!=='1.6')throw Error('Review Emperor’s Children MFM');
const read=name=>JSON.parse(readFileSync(join(directory,name+'.json'),'utf8'));
const items=new Map([...read('wargear'),...read('weapons')].filter(i=>i.game_version.edition==='11th'&&i.game_version.dataslate===mfm.firstSeen).map(i=>[i.id,i]));
const units=read('units'),compositions=read('unit-compositions');
const key=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const cap=s=>s[0].toUpperCase()+s.slice(1);
const base=s=>s.split(/\s+[–—-]\s+/)[0];
function expanded(choice){
 return choice.flatMap(({id,count})=>{
  const item=items.get(id);
  if(!item||!Number.isInteger(count)||count<1)throw Error('Missing EC equipment '+id);
  return Array(count).fill(cap(item.name));
 });
}
const out=[];
for(const price of mfm.units.filter(u=>!u.legends)){
 const source=tables.Datasheets.find(s=>s.faction_id==='EC'&&s.source_id==='000000280'&&key(s.name)===key(price.name));
 const unit=units.find(s=>key(s.name)===key(price.name)&&s.external_refs.some(r=>r.namespace==='mfm'));
 const comp=compositions.find(c=>c.unit_id===unit?.id);
 if(!source||comp?.game_version.edition!=='11th'||comp.game_version.dataslate!==mfm.firstSeen||comp.loadout.uniform.length)throw Error('Unmatched EC card '+price.name);
 const {loadout}=comp;
 const templates=loadout.templates.length?loadout.templates:loadout.stock.map(t=>{
  const items=t.items.map(i=>({...i,count:i.count/t.models}));
  if(items.some(i=>!Number.isInteger(i.count)))throw Error('Review per-bearer stock '+source.name);
  return {model:t.model,items};
 });
 const options=tables.Datasheets_options.filter(o=>o.datasheet_id===source.id).map(o=>o.description);
 // The MFM relational table repeats the Defiler’s stock arm pair, even
 // though replacing neither arm gives a single legal configuration.
 const slots=loadout.slots.map(slot=>({...slot,choices:[...new Map(slot.choices.map(c=>[JSON.stringify(c),c])).values()]}));
 const roles=templates.map(t=>{
  if(source.name!=='Chaos Terminators')return compileModelEquipment(t,slots,expanded);
  // The paired accursed weapons replace BOTH the gun and the melee arm.
  const layers=slots.filter(s=>s.model===t.model),paired=layers.filter(s=>s.alternate).flatMap(s=>s.choices);
  if(paired.length!==1||expanded(paired[0]).join()!=='Paired accursed weapons'||!options.some(o=>o.includes('combi-bolter and accursed weapon')))throw Error('Review paired Terminator replacement');
  const normal=compileModelEquipment(t,layers.filter(s=>!s.alternate),expanded);
  if(normal.slots.length!==2||normal.fixed.length)throw Error('Review Terminator arm equipment');
  const [a,b]=normal.slots;
  return {role:t.model,fixed:[],slots:[{label:'Weapons',choices:[...a.choices.flatMap(left=>b.choices.map(right=>[...left,...right])),expanded(paired[0])]}]};
 });
 const limits=loadout.limits.map(l=>({role:l.model,thresholds:l.breakpoints,choices:l.choices.map(expanded)}));
 if(source.name==='Infractors'){
  if(!options.some(o=>o.includes('1 Infractor can be equipped with 1 icon of excess')))throw Error('Review Infractor icon limit');
  limits.push({role:'Infractor',thresholds:[{models:0,choices:1}],choices:[['Icon of Excess']]});
 }
 const profiles=tables.Datasheets_wargear.filter(w=>w.datasheet_id===source.id&&w.name);
 const ranged=[...new Set(profiles.filter(w=>w.type==='Ranged').map(w=>base(w.name)))];
 const fitted=new Set(roles.flatMap(r=>[...r.fixed,...r.slots.flatMap(s=>s.choices.flat())]).map(key));
 for(const w of profiles)if(!fitted.has(key(base(w.name))))throw Error('No equipped EC profile for '+source.name+' – '+w.name);
 const costs=Object.fromEntries((price.wargear??[]).map(g=>[g.item,g.points]));
 out.push({unit:source.name,roles,limits,ranged,costs});
}
if(out.length!==23||out.filter(r=>Object.keys(r.costs).length).length!==1)throw Error('Review EC inventory and paid gear');
out.sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
writeFileSync(output,"// Generated from the 11e Emperor’s Children cards and October MFM v1.6 by scripts/import-emperors-children-loadouts.mjs.\nimport type {ModelEquipmentTable} from './model-equipment-slots';\nexport const EMPERORS_CHILDREN_KITS:readonly Omit<ModelEquipmentTable,'tiers'>[]=[\n"+out.map(r=>' '+JSON.stringify(r)).join(',\n')+"\n];\n");
