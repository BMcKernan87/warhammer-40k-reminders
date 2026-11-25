import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';
import {tyranidWeapons} from './import-tyranid-relational.mjs';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const args=process.argv.slice(2),directory=args[2];
if(!args[3])throw Error('Usage: node scripts/import-tyranid-loadouts.mjs CSV_DIR MFM_YAML RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:args[0]});
const prepared=mkdtempSync(join(tmpdir(),'tyranid-equipment-'));
try{
 for(const name of ['units','wargear'])copyFileSync(join(directory,name+'.json'),join(prepared,name+'.json'));
 writeFileSync(join(prepared,'weapons.json'),JSON.stringify(tyranidWeapons(JSON.parse(readFileSync(join(directory,'weapons.json'),'utf8')))));
 const compositions=JSON.parse(readFileSync(join(directory,'unit-compositions.json'),'utf8'));
 for(const c of compositions.filter(c=>c.loadout.uniform.length)){
  const d=tables.Datasheets.find(s=>s.faction_id==='TYR'&&s.name.toLowerCase().replaceAll(' ','-')===c.unit_id);
  const options=tables.Datasheets_options.filter(o=>o.datasheet_id===d?.id).map(o=>o.description);
  if(c.unit_id==='ripper-swarms'){
   if(c.loadout.uniform.length!==1||options.length!==1||options[0]!=='All models in this unit can each be equipped with 1 spinemaws.')throw Error('Review Ripper uniform equipment');
  }else if(c.unit_id==='termagants'){
   if(c.loadout.uniform.length!==3||options.length!==5||!options[0].startsWith('All models in this unit')||!options[1].startsWith('All models in this unit')||!options.slice(2).every(o=>o.startsWith('For every 10 models in this unit')))throw Error('Review Termagant uniform equipment');
  }else throw Error('Unreviewed Tyranid uniform equipment');
  // Runtime uses one whole-brood field for these two specific datasheets.
  // Keep their actual per-model alternatives here for source reconciliation.
  c.loadout.uniform=[];
 }
 writeFileSync(join(prepared,'unit-compositions.json'),JSON.stringify(compositions));
 await importFactionLoadouts({
  slug:'tyranids',title:'Tyranids',factionId:'TYR',sourceId:'000000020',packAircraftOrModels:['Harridan','Hierophant'],table:'TYRANID_KITS',expected:52,paid:1,
  itemNames:{'genestealers-claws-and-talons':'Genestealer claws and talons'},
  adjustRole(source,t,slots,expanded){
   if(source.name!=='Hive Tyrant')return;
   const own=slots.filter(s=>s.model===t.model);
   if(own.length!==1||own[0].picks!==1||!own[0].repeats||own[0].alternate||own[0].choices.length!==6)throw Error('Review Hive Tyrant arm-pair alternatives');
   return compileModelEquipment(t,own.map(s=>({...s,repeats:false})),expanded);
  },
 },[args[0],args[1],prepared,args[3]]);
 writeFileSync(args[3],readFileSync(args[3],'utf8').replace('scripts/import-tyranids-loadouts.mjs','scripts/import-tyranid-loadouts.mjs'));
}finally{rmSync(prepared,{recursive:true,force:true});}
