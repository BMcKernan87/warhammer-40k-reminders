import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

import {modelKits} from './import-model-kits.mjs';

export function votannKits(tables,manual){
 return modelKits(tables,manual,{slug:'leagues-of-votann',factionId:'LoV',factionName:'Leagues of Votann',
  // Each E-COG carries a different tool on the printed Iron-master card.
  modelRole:(_unit,role,items)=>role==='E-COG'?'E-COG with '+items[0]:role});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [directory,mfmPath,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: node scripts/import-votann-loadouts.mjs CSV_DIR VOTANN_MFM_YAML OUTPUT_TS');
 const {tables}=await loadExport({directory});
 const rows=votannKits(tables,parse(readFileSync(mfmPath,'utf8')));
 writeFileSync(output,'// Generated from the 11th edition export and dated MFM by scripts/import-votann-loadouts.mjs.\nexport const VOTANN_KITS=[\n'+rows.map(row=>'  '+JSON.stringify(row)).join(',\n')+'\n] as const;\n');
}
