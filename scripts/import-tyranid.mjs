import {importFactionMuster} from './import-faction-muster.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parse,stringify} from 'yaml';

const args=process.argv.slice(2);
if(!args[4])throw Error('Usage: node scripts/import-tyranid.mjs CSV_DIR MFM_YAML UNITS_JSON COMPOSITIONS_JSON OUTPUT_TS');
const units=JSON.parse(readFileSync(args[2],'utf8'));
const {tables}=await loadExport({directory:args[0]});
if(!tables.Source.some(s=>s.id==='000000020'&&s.name==='Tyranids'&&s.edition==='11'&&s.version==='1.3'))throw Error('Review current Tyranid faction pack');
const key=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const manual=parse(readFileSync(args[1],'utf8'));
const neuro=manual.units.find(u=>u.name==='Neurogaunts');
const independentNeuro=units.find(u=>u.id==='neurogaunts');
const costs=neuro?.pricing[0]?.costs;
// The CSV spells out the 21-model endpoint before the optional second
// Nodebeast at 22. Both are within the manual's same 90-point upper band.
if(neuro.pricing.length!==1||costs?.length!==2||costs[0].models!==11||costs[0].points!==45||costs[1].models!==22||costs[1].points!==90||!independentNeuro.points.some(p=>p.models===12&&p.models_max===21&&p.cost===90))throw Error('Review Neurogaunt point-band normalization');
costs.splice(1,0,{models:21,points:90});
const prepared=mkdtempSync(join(tmpdir(),'tyranid-muster-')),manualPath=join(prepared,'tyranids.yaml');
writeFileSync(manualPath,stringify(manual));
try{
await importFactionMuster({
 name:'Tyranids',slug:'tyranids',factionId:'TYR',sourceId:'000000020',total:52,prefix:'TYRANID',
 pack:'eng_14-10_wh40k_faction_pack_tyranids-an12izciwp-np2hnkcsje.pdf',packVersion:'1.3',
 // Both Imperial Armour cards are printed in the current publisher pack.
 packAircraftOrModels:['Harridan','Hierophant'],
 extraExport(natives,tables){
  const recipients=[['000000705','Synapse','SYNAPSE'],['000000707','Shadow in the Warp','SHADOW']].map(([id,name,label])=>{
   if(!tables.Abilities.some(a=>a.id===id&&a.name===name&&a.faction_id==='TYR'))throw Error('Review Tyranid army rule '+name);
   const authorized=new Set(tables.Datasheets_abilities.filter(a=>a.ability_id===id).map(a=>a.datasheet_id));
   return 'export const TYRANID_'+label+'_UNITS:readonly string[]='+JSON.stringify(natives.filter(s=>authorized.has(s.id)).map(s=>s.name).sort())+';\n';
  }).join('');
  const scoped=tables.Datasheets_abilities.filter(a=>a.ability_id==='000000707'&&natives.some(s=>s.id===a.datasheet_id)).map(a=>{
   const unit=natives.find(s=>s.id===a.datasheet_id).name;
   if(!a.name&&!a.model)return {unit};
   if(unit!=='Hyperadapted Raveners'||a.name!=='Shadow In The Warp (Ravener Prime only)'||a.model)throw Error('Review Shadow in the Warp model scope');
   return {unit,model:'Ravener Prime'};
  }).sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
  return recipients+'export const TYRANID_SHADOW_SOURCES:readonly {unit:string;model?:string}[]='+JSON.stringify(scoped)+';\n';
 },
 reconcile(sheets){
  const normalize=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
  for(const [name,sheet] of sheets){
   const independent=units.filter(u=>key(u.name)===key(name)&&u.external_refs.some(r=>r.namespace==='mfm'));
   if(independent.length!==1)throw Error('Missing independent Tyranid profile '+name);
   const printed=[...new Set(Object.values(sheet.modelProfiles??{model:sheet.profile}).map(p=>normalize([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])))].sort();
   const expected=[...new Set(independent[0].profiles.map(p=>normalize([p.M,p.T,p.Sv,p.W,p.Ld,p.OC])))].sort();
   if(JSON.stringify(printed)!==JSON.stringify(expected))throw Error('Tyranid model characteristics disagree '+name+': '+printed+' vs '+expected);
  }
 },
},[args[0],manualPath,...args.slice(2)]);
writeFileSync(args[4],readFileSync(args[4],'utf8').replace('scripts/import-tyranids.mjs','scripts/import-tyranid.mjs'));
}finally{rmSync(prepared,{recursive:true,force:true});}
