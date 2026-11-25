import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const key=value=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const plain=value=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
const profile=name=>name.trim().split(/\s+[–—-]\s+/)[0];
export function votannKits(tables,manual){
 if(manual.slug!=='leagues-of-votann'||!manual.version)throw Error('Expected a dated Leagues of Votann Field Manual');
 const sources=new Map(tables.Source.map(row=>[row.id,row]));
 const sheets=tables.Datasheets.filter(row=>row.faction_id==='LoV'&&!sources.get(row.source_id)?.name.includes('Legends'));
 const legal=new Set(manual.units.filter(row=>!row.legends).map(row=>key(row.name)));
 if(legal.size!==sheets.length||sheets.some(row=>!legal.has(key(row.name))))throw Error('Votann inventory differs between the 11e export and MFM');
 return sheets.map(sheet=>{
  if(!sheet.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/leagues-of-votann/'))throw Error('Wrong datasheet edition');
  const own=t=>tables[t].filter(row=>row.datasheet_id===sheet.id);
  const weapons=own('Datasheets_wargear'),wargear=own('Datasheets_abilities').filter(row=>row.type==='Wargear');
  const names=[...weapons.map(w=>profile(w.name)),...wargear.map(r=>r.name.trim())];
  const canonical=new Map(names.map(name=>[key(name),name]));
  const common=[],bearers={};
  for(const row of plain(sheet.loadout).matchAll(/\b(This|Every|The|One(?: other)?) ([^.:*!]+?) is (?:additionally )?equipped with: ([^.]+)\./g)){
   const rawRole=row[2];
   const items=row[3].split(/; |, /).flatMap(value=>{
    const [,n,item]=value.match(/^(?:(\d+) )?(.+)$/);
    const name=canonical.get(key(item))??canonical.get(key(item).replace(/s$/,''));
    if(!name)throw Error(sheet.name+' has unknown standard equipment '+item);
    return Array(Number(n??1)).fill(name);
   });
   if(rawRole==='model'){common.push(...items);continue;}
   // The card describes three different E-COGs. The MFM formation table
   // identifies each by its distinctive tool, not by an interchangeable type.
   const role=rawRole==='E-COG'?'E-COG with '+items[0]:rawRole;
   if(bearers[role])throw Error('Duplicate bearer '+role);
   bearers[role]=items;
  }
  if(!common.length&&!Object.keys(bearers).length)throw Error(sheet.name+' has no parsed equipment');
  const namesFor=type=>[...new Set(weapons.filter(w=>w.type===type).map(w=>profile(w.name)))];
  return {unit:sheet.name,common,bearers,ranged:namesFor('Ranged'),melee:namesFor('Melee')};
 }).sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [directory,mfmPath,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: node scripts/import-votann-loadouts.mjs CSV_DIR VOTANN_MFM_YAML OUTPUT_TS');
 const {tables}=await loadExport({directory});
 const rows=votannKits(tables,parse(readFileSync(mfmPath,'utf8')));
 writeFileSync(output,'// Generated from the 11th edition export and dated MFM by scripts/import-votann-loadouts.mjs.\nexport const VOTANN_KITS=[\n'+rows.map(row=>'  '+JSON.stringify(row)).join(',\n')+'\n] as const;\n');
}
