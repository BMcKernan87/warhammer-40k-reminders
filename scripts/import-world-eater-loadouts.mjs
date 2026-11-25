import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';

const [csv,manualPath,directory,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-world-eater-loadouts.mjs CSV_DIR MFM_YAML 40KDC_WORLD_EATERS_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const mfm=parse(readFileSync(manualPath,'utf8'));
if(mfm.slug!=='world-eaters'||mfm.version!=='1.6')throw Error('Review World Eaters MFM');
const read=name=>JSON.parse(readFileSync(join(directory,name+'.json'),'utf8'));
const items=new Map([...read('wargear'),...read('weapons')].filter(i=>i.game_version.edition==='11th'&&i.game_version.dataslate===mfm.firstSeen).map(i=>[i.id,i]));
const units=read('units'),compositions=read('unit-compositions');
const key=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cap=s=>s[0].toUpperCase()+s.slice(1);
function expanded(choice){
 return choice.flatMap(({id,count})=>{
  const item=items.get(id);
  if(item?.game_version.edition!=='11th'||item.game_version.dataslate!==mfm.firstSeen||count<1)throw Error('Unknown World Eaters item '+id);
  return Array(count).fill(cap(item.name));
 });
}
const out=[];
for(const price of mfm.units.filter(u=>!u.legends)){
 const source=tables.Datasheets.find(s=>s.faction_id==='WE'&&s.source_id==='000000210'&&key(s.name)===key(price.name));
 const unit=units.find(s=>key(s.name)===key(price.name)&&s.external_refs.some(r=>r.namespace==='mfm'));
 const comp=compositions.find(c=>c.unit_id===unit?.id);
 if(!source||comp?.game_version.edition!=='11th'||comp.game_version.dataslate!==mfm.firstSeen||comp.loadout.uniform.length)throw Error('Unmatched native card '+price.name);
 const {loadout}=comp;
 // The v1.3 Defiler card and its native 11e table both specify two
 // excruciator cannons. The relational stock template counts the pair once.
 const templates=loadout.templates.map(t=>source.name==='Defiler'?{...t,items:t.items.map(i=>i.id==='excruciator-cannon'?{...i,count:2}:i)}:t);
 if(source.name==='Defiler'&&!source.loadout.includes('2 excruciator cannons'))throw Error('Review Defiler default weapons');
 const roles=templates.map(t=>compileModelEquipment(t,loadout.slots,expanded));
 const limits=loadout.limits.map(l=>({role:l.model,thresholds:l.breakpoints,choices:l.choices.map(expanded)}));
 const options=tables.Datasheets_options.filter(o=>o.datasheet_id===source.id).map(o=>o.description);
 if(source.name==='Slaughterbound'&&!roles.length){
  if(!source.loadout.toLowerCase().includes('lacerator and daemonic claw'))throw Error('Review Slaughterbound standard weapon');
  roles.push({role:comp.models[0].name,fixed:['Lacerator and daemonic claw'],slots:[]});
 }
 if(source.name==='Goremongers'){
  if(!options.some(o=>o.includes('1 Goremonger')&&o.includes('autopistol'))||!options.some(o=>o.includes('1 Goremonger')&&o.includes('blood harpoon')))throw Error('Review Goremonger specialists');
  limits.push({role:'Goremongers',thresholds:[{models:0,choices:1}],choices:[['Autopistol','Autopistol']]},
   {role:'Goremongers',thresholds:[{models:0,choices:1}],choices:[['Blood harpoon']]});
 }
 if(source.name==='Chaos Rhino'){
  // The stock combi-bolter can only be removed in exchange for a havoc launcher.
  if(!options.some(o=>o.includes('replace 1 combi-bolter with 1 havoc launcher')))throw Error('Review World Eaters Rhino');
  const guns=roles[0].slots.find(s=>s.choices.some(c=>c.includes('Combi-weapon')));
  if(!guns)throw Error('Rhino pintle weapons missing');
  guns.choices=guns.choices.filter(c=>c.length!==1||c[0]!=='Combi-weapon');
 }
 const ranged=[...new Set(tables.Datasheets_wargear.filter(w=>w.datasheet_id===source.id&&w.type==='Ranged').map(w=>w.name.split(/\s+[–—-]\s+/)[0]))];
 const costs=Object.fromEntries((price.wargear??[]).map(g=>[g.item,g.points]));
 out.push({unit:source.name,roles,limits,ranged,costs});
}
if(out.length!==30||out.filter(r=>Object.keys(r.costs).length).length!==2)throw Error('Review World Eaters inventory and paid wargear');
out.sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
writeFileSync(output,"// Generated from the 11e World Eaters cards and October MFM v1.6 by scripts/import-world-eater-loadouts.mjs.\nimport type {ModelEquipmentTable} from './model-equipment-slots';\nexport const WORLD_EATER_KITS:readonly Omit<ModelEquipmentTable,'tiers'>[]=[\n"+out.map(r=>' '+JSON.stringify(r)).join(',\n')+"\n];\n");
