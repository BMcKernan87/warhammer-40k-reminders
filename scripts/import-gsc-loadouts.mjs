import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

import {modelKits} from './import-model-kits.mjs';

export function gscKits(tables,manual){
 return modelKits(tables,manual,{slug:'genestealer-cults',factionId:'GC',factionName:'Genestealer Cults',
  // Equipment text and printed attack-profile titles use these two aliases.
  aliases:{Magus:{'force stave':'Magus stave'},'Hybrid Metamorphs':{'Leader’s cult weapons':'Leader’s bio-weapons'}},
  // The Aberrant Hypermorph and the ordinary Aberrants use the same
  // weapon profile, as corroborated by both MFM model equipment templates.
  modelRole:(unit,role)=>unit==='Aberrants'&&role==='Aberrant'?'model':role});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [directory,mfmPath,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: node scripts/import-gsc-loadouts.mjs CSV_DIR GSC_MFM_YAML OUTPUT_TS');
 const {tables}=await loadExport({directory});
 const rows=gscKits(tables,parse(readFileSync(mfmPath,'utf8')));
 writeFileSync(output,'// Generated from the 11th edition export and dated MFM by scripts/import-gsc-loadouts.mjs.\nexport const GSC_KITS=[\n'+rows.map(row=>'  '+JSON.stringify(row)).join(',\n')+'\n] as const;\n');
}
