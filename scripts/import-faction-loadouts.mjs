import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';

export async function importFactionLoadouts({slug,factionId,sourceId,packAircraftOrModels=[],expected,paid,table,title,adjustRole,adjustEquipment,adjustLimits,manualNames={},itemNames={},conditionalProfiles={} },args){
 const [csv,manualPath,directory,output]=args;
 const script='scripts/import-'+slug+'-loadouts.mjs';
 if(!output)throw Error('Usage: node '+script+' CSV_DIR MFM_YAML RELATIONAL_DATA_DIR OUTPUT_TS');
 const {tables}=await loadExport({directory:csv});
 const mfm=parse(readFileSync(manualPath,'utf8'));
 if(mfm.slug!==slug||mfm.version!=='1.6')throw Error('Review '+title+' MFM');
 const read=name=>JSON.parse(readFileSync(join(directory,name+'.json'),'utf8'));
 const items=new Map([...read('wargear'),...read('weapons')].filter(i=>i.game_version.edition==='11th'&&i.game_version.dataslate===mfm.firstSeen).map(i=>[i.id,i]));
 const units=read('units'),compositions=read('unit-compositions');
 const key=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 const cap=s=>s[0].toUpperCase()+s.slice(1);
 const base=s=>s.split(/\s+[–—-]\s+/)[0];
 function expanded(choice){
  return choice.flatMap(({id,count})=>{
   const item=items.get(id);
   if(!item||!Number.isInteger(count)||count<1)throw Error('Missing '+title+' equipment '+id);
   return Array(count).fill(itemNames[id]??cap(item.name));
  });
 }
 const out=[];
 for(const price of mfm.units.filter(u=>!u.legends)){
  const source=tables.Datasheets.find(s=>s.faction_id===factionId&&(s.source_id===sourceId||packAircraftOrModels.includes(s.name))&&key(s.name)===key(manualNames[price.name.toLowerCase()]??price.name));
  const unit=units.find(s=>key(s.name)===key(price.name)&&s.external_refs.some(r=>r.namespace==='mfm'));
  const comp=compositions.find(c=>c.unit_id===unit?.id);
  if(!source||comp?.game_version.edition!=='11th'||comp.game_version.dataslate!==mfm.firstSeen||comp.loadout.uniform.length)throw Error('Unmatched '+title+' card '+price.name);
  const {loadout}=comp;
  function stockPerBearer(t){
   const items=t.items.map(i=>({...i,count:i.count/t.models}));
   if(items.some(i=>!Number.isInteger(i.count)))throw Error('Review per-bearer stock '+source.name);
   return {model:t.model,items};
  }
  const templates=loadout.templates.length?loadout.templates.map(t=>{
   const stock=loadout.stock.find(s=>s.model===t.model);
   return !t.items.length&&stock?.items.length?stockPerBearer(stock):t;
  }):loadout.stock.map(stockPerBearer);
  const options=tables.Datasheets_options.filter(o=>o.datasheet_id===source.id).map(o=>o.description);
  // The MFM relational table repeats the Defiler’s stock arm pair, even
  // though replacing neither arm gives a single legal configuration.
  const slots=loadout.slots.map(slot=>({...slot,choices:[...new Map(slot.choices.map(c=>[JSON.stringify(c),c])).values()]}));
  const roles=templates.map(t=>adjustRole?.(source,t,slots,expanded,options)??compileModelEquipment(t,slots,expanded));
  const limits=loadout.limits.map(l=>({role:l.model,thresholds:l.breakpoints,choices:l.choices.map(expanded)}));
  adjustLimits?.(source,limits,options);
  adjustEquipment?.(source,roles,limits,options);
  const profiles=tables.Datasheets_wargear.filter(w=>w.datasheet_id===source.id&&w.name);
  const ranged=[...new Set(profiles.filter(w=>w.type==='Ranged').map(w=>base(w.name)))];
  const fitted=new Set(roles.flatMap(r=>[...r.fixed,...r.slots.flatMap(s=>s.choices.flat())]).map(key));
  for(const w of profiles)if(!fitted.has(key(base(w.name)))&&!(conditionalProfiles[source.name]??[]).includes(base(w.name)))throw Error('No equipped profile for '+source.name+' – '+w.name);
  const costs=Object.fromEntries((price.wargear??[]).map(g=>[g.item,g.points]));
  out.push({unit:source.name,roles,limits,ranged,costs});
 }
 if(out.length!==expected||out.filter(r=>Object.keys(r.costs).length).length!==paid)throw Error('Review '+title+' inventory and paid gear');
 out.sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
 writeFileSync(output,"// Generated from the 11e "+title+" cards and October MFM v1.6 by "+script+".\nimport type {ModelEquipmentTable} from './model-equipment-slots';\nexport const "+table+":readonly Omit<ModelEquipmentTable,'tiers'>[]=[\n"+out.map(r=>' '+JSON.stringify(r)).join(',\n')+"\n];\n");
}
