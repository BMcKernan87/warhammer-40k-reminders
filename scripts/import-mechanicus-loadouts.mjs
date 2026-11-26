import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mechanicusCompositions} from './import-mechanicus-composition.mjs';

const args=process.argv.slice(2),directory=args[2];
if(!args[3])throw Error('Usage: node scripts/import-mechanicus-loadouts.mjs CSV_DIR MFM_YAML RELATIONAL_DATA_DIR OUTPUT_TS');
const prepared=mkdtempSync(join(tmpdir(),'mechanicus-equipment-'));
try{
 for(const name of ['units','weapons','wargear'])copyFileSync(join(directory,name+'.json'),join(prepared,name+'.json'));
 writeFileSync(join(prepared,'unit-compositions.json'),JSON.stringify(mechanicusCompositions(JSON.parse(readFileSync(join(directory,'unit-compositions.json'),'utf8')))));
 await importFactionLoadouts({
  slug:'adeptus-mechanicus',title:'Adeptus Mechanicus',factionId:'AdM',sourceId:'000000015',table:'MECHANICUS_KITS',expected:34,paid:2,
 },[args[0],args[1],prepared,args[3]]);
 writeFileSync(args[3],readFileSync(args[3],'utf8').replace('scripts/import-adeptus-mechanicus-loadouts.mjs','scripts/import-mechanicus-loadouts.mjs'));
}finally{rmSync(prepared,{recursive:true,force:true});}
