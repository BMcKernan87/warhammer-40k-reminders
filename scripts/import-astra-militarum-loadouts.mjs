import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,relationalDir,output,subset]=process.argv.slice(2);
const nativeOnly=subset==='--native-only';
if(subset&&!nativeOnly)throw Error('Unknown equipment subset '+subset);
if(!output)throw Error('Usage: node scripts/import-astra-militarum-loadouts.mjs CSV_DIR MFM_RELATIONAL_DIRECTORY OUTPUT_TS [--native-only]');
const {tables}=await loadExport({directory});
const read=file=>readFileSync(join(relationalDir,'astra-militarum'+file),'utf8');
const records=key=>JSON.parse(read('-'+key+'.json'));
const mfm=parse(read('.yaml'));
if(mfm.slug!=='astra-militarum'||mfm.version!=='1.6')throw Error('Review current Astra Militarum manual');
const units=records('units'),comps=records('unit-compositions');
const items=new Map([...records('wargear'),...records('weapons')].filter(i=>i.game_version.edition==='11th'&&i.game_version.dataslate===mfm.firstSeen).map(i=>[i.id,i]));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const cap=s=>s[0].toUpperCase()+s.slice(1);
const forbidden=new Set(['AIRCRAFT','COMMISSAR','EPIC HERO','MILITARUM TEMPESTUS','OGRYN','RATLING','RATLINGS','TECH-PRIEST ENGINSEER','MINISTORUM PRIEST']);
const expanded=choice=>choice.flatMap(i=>{
 const item=items.get(i.id);
 if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!==mfm.firstSeen||!Number.isInteger(i.count)||i.count<1)throw Error('Unresolved MFM item '+i.id);
 return Array(i.count).fill(cap(item.name));
});
const out=[];
for(const price of mfm.units.filter(p=>!p.legends&&!p.groupTitle)){
 const native=tables.Datasheets.find(s=>s.faction_id==='AM'&&norm(s.name)===norm(price.name));
 if(!native)throw Error('Missing native card '+price.name);
 const tags=tables.Datasheets_keywords.filter(k=>k.datasheet_id===native.id);
 const nativeExclusive=tags.some(k=>forbidden.has(k.keyword.toUpperCase()));
 if(nativeExclusive!==nativeOnly)continue;
 const proxy=tables.Datasheets.find(s=>s.faction_id==='GC'&&s.name===native.name);
 if(!nativeOnly&&(!proxy||proxy.loadout!==native.loadout))throw Error('Review Brood Brothers card '+native.name);
 const options=id=>tables.Datasheets_options.filter(o=>o.datasheet_id===id).map(o=>o.description);
 if(!nativeOnly&&JSON.stringify(options(native.id))!==JSON.stringify(options(proxy.id)))throw Error('Review changed GSC equipment '+native.name);
 const record=units.find(u=>norm(u.name)===norm(price.name)&&u.external_refs.some(r=>r.namespace==='mfm'));
 const comp=comps.find(c=>c.unit_id===record?.id);
 if(comp?.game_version.edition!=='11th'||comp.game_version.dataslate!==mfm.firstSeen||comp.loadout.uniform.length)throw Error('Unverified composition '+native.name);
 const kit=comp.loadout;
 // The mounted Commissar carries two Prefectus heavy stubbers on the September
 // faction card. Its relational stock template records the pair as one.
 const templates=kit.templates.map(t=>native.name==='Commissar Graves'?{...t,items:t.items.map(i=>i.id==='prefectus-heavy-stubber'?{...i,count:2}:i)}:t);
 if(native.name==='Commissar Graves'&&!native.loadout.includes('2 Prefectus heavy stubbers'))throw Error('Review mounted Commissar Graves');
 if(nativeOnly)for(const stock of kit.stock){
  if(templates.some(t=>t.model===stock.model))continue;
  const items=stock.items.map(i=>({...i,count:i.count/stock.models}));
  if(items.some(i=>!Number.isInteger(i.count)))throw Error('Unresolved stock per model for '+native.name);
  templates.push({model:stock.model,items});
 }
 const roles=templates.map(t=>compileModelEquipment(t,kit.slots,expanded));
 const tiers={};
 for(const t of comp.tiers??[{models:comp.models}]){
  let alternatives=[{}];
  for(const m of t.models){alternatives=alternatives.flatMap(v=>Array.from({length:m.max-m.min+1},(_,i)=>({...v,[m.name]:(v[m.name]??0)+m.min+i})));}
  for(const counts of alternatives){
   const n=Object.values(counts).reduce((a,b)=>a+b,0),perRole={};
   for(const role of roles){const base=role.role.replace(/#\d+$/,'');perRole[role.role]=base===role.role?counts[base]:1;}
   if(roles.length&&Object.values(perRole).reduce((a,b)=>a+b,0)!==n)throw Error('Unresolved roles '+native.name);
   tiers[n]=perRole;
  }
 }
 const limits=kit.limits.map(l=>({role:l.model,thresholds:l.breakpoints,choices:l.choices.map(expanded)}));
 // The current datasheet requires distinct Veteran heavy guns and locks the
 // Krieg medical/radio bearer to a lasgun. The relational choices alone do not.
 if(native.name==='Catachan Command Squad'){
  const guns=['Flamer','Grenade launcher','Heavy flamer','Meltagun','Plasma gun','Sniper rifle'];
  if(!options(native.id).some(s=>s.includes('same weapon from this list more than once')))throw Error('Review Veteran weapon limits');
  limits.push({role:'Veteran Guardsman',thresholds:[{models:0,choices:guns.length,per_choice:1}],choices:guns.map(s=>[s])});
 }
 if(native.name==='Death Korps Of Krieg'){
  const role=roles.find(m=>m.role==='Death Korps Trooper');
  const main=role.slots.find(s=>s.choices[0][0]==='Lasgun');
  if(!main||!options(native.id).some(s=>s.includes('only take one of these options')))throw Error('Review Death Korps specialists');
  role.slots=[{label:'Firearm and equipment',choices:[...main.choices,['Lasgun','Vox-caster'],['Lasgun','Death Korps Medi-pack']]}];
 }
 // The Death Rider mounts use a separate profile from Lord Marshal Dreir’s mount.
 if(native.name==='Death Riders'){
  if(!native.loadout.includes('steed’s savage claws'))throw Error('Review Death Rider mount equipment');
  for(const role of roles)role.fixed=role.fixed.map(i=>i==='Savage claws'?"Steed's savage claws":i);
 }
 if(native.name==='Ministorum Priest')roles[0].slots[0].label='Priest weapons';
 if(native.name==='Ratlings'){
  const sniper=roles.find(m=>m.role==='Ratling Sniper');
  if(!sniper||!options(native.id).some(o=>o.includes('Ratling Battlemutt')))throw Error('Review Ratling squad equipment');
  sniper.slots=sniper.slots.filter(s=>!s.choices.some(c=>c.includes('Ratling Battlemutt')));
 }
 const weapons=(record.weapon_ids??[]).map(id=>{const weapon=items.get(id);if(!weapon)throw Error('Unknown weapon '+id);return weapon;});
 const ranged=weapons.filter(w=>w.type==='ranged').map(w=>cap(w.name));
 const fitted=new Set(roles.flatMap(r=>[...r.fixed,...r.slots.flatMap(s=>s.choices.flat())]).map(norm));
 for(const w of tables.Datasheets_wargear.filter(w=>w.datasheet_id===native.id&&w.name)){
  if(!fitted.has(norm(w.name.split(/\s+[–—-]\s+/)[0])))throw Error('No legal bearer for '+native.name+' – '+w.name);
 }
 const costs=Object.fromEntries((price.wargear??[]).map(g=>[cap(g.item),g.points]));
 out.push({unit:native.name,roles,tiers,limits,ranged:[...new Set(ranged)],costs});
}
if(out.length!==(nativeOnly?20:52))throw Error('Review native and Brood Brothers inventories');
out.sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
const origin=nativeOnly?'native 11e Guard cards':'matched 11e native/allied cards';
writeFileSync(output,"// Generated from "+origin+" and October MFM v1.6 by scripts/import-astra-militarum-loadouts.mjs.\nimport type {GuardKit} from './astra-militarum-loadouts';\nexport const "+(nativeOnly?'ASTRA_MILITARUM_NATIVE_ONLY_KITS':'ASTRA_MILITARUM_KITS')+":readonly GuardKit[]=[\n"+out.map(r=>' '+JSON.stringify(r)).join(',\n')+"\n];\n");
