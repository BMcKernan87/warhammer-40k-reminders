import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const plain=value=>value.replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
const key=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
const profile=name=>name.split(/\s+[–—-]\s+/)[0].replace(/\s*\(once per battle.*\)$/i,'');
const pack='https://assets.warhammer-community.com/eng_wh40k_faction_pack_orks-bk9eqvzbeq-rkrvgfwe8b.pdf';

export function orkKits(tables,manual){
 if(manual.slug!=='orks'||!manual.version)throw Error('Expected a dated Orks Field Manual');
 const sources=new Map(tables.Source.map(row=>[row.id,row.name]));
 const sheets=tables.Datasheets.filter(row=>row.faction_id==='ORK'&&!sources.get(row.source_id)?.includes('Legends'));
 const names=new Set(manual.units.filter(row=>!row.legends).map(row=>key(row.name)));
 if(names.size!==sheets.length||sheets.some(row=>!names.has(key(row.name))))throw Error('Ork inventory differs between the 11e export and the MFM');
 return sheets.map(sheet=>{
  if(!sheet.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/orks/'))throw Error('Wrong edition or faction on '+sheet.name);
  const own=name=>tables[name].filter(row=>row.datasheet_id===sheet.id);
  const comp=own('Datasheets_unit_composition').map(row=>{
   const m=plain(row.description).match(/^(\d+)(?:[-–](\d+))? (.+?)(?: models?)?$/);
   if(!m)throw Error('Unknown composition '+row.description);
   return {model:m[3],min:Number(m[1]),max:Number(m[2]??m[1])};
  });
  const loadouts=new Map();
  for(const match of plain(sheet.loadout).matchAll(/(?:This|The|Every) (.+?) is equipped with: ([^.]+)\./g)){
   const items=match[2].split('; ').flatMap(part=>{
    const parsed=part.match(/^(\d+) (.+)$/);
    if(!parsed)throw Error(sheet.name+' unknown fixed item '+part);
    return Array(Number(parsed[1])).fill(parsed[2]);
   });
   loadouts.set(key(match[1]),items);
  }
  const models=comp.map(row=>{
   const items=loadouts.get(key(row.model))??loadouts.get('model');
   if(!items)throw Error(sheet.name+' has no fixed loadout for '+row.model);
   // The current publisher faction pack prints huge tusks as the only standard
   // weapon and a single optional kannon/supa-kannon. The CSV duplicates it.
   return {...row,items:sheet.name==='Gargantuan Squiggoth'?['Huge Tusks']:items};
  });
  const ranged=[...new Set(own('Datasheets_wargear').filter(row=>row.type==='Ranged').map(row=>profile(row.name)))];
  return {unit:sheet.name,models,ranged,...(sheet.name==='Gargantuan Squiggoth'?{source:pack}:{})};
 }).sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [directory,mfmPath,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: node scripts/import-ork-loadouts.mjs CSV_DIR ORKS_MFM_YAML OUTPUT_TS');
 const {tables}=await loadExport({directory});
 const rows=orkKits(tables,parse(readFileSync(mfmPath,'utf8')));
 writeFileSync(output,'// Generated from the 11th edition export and dated MFM by scripts/import-ork-loadouts.mjs.\nexport const ORK_KITS=[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n');
}
