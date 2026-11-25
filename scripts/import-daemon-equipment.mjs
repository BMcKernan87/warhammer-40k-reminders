import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadExport} from './import-wahapedia-11e.mjs';

const clean=text=>text.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const plain=text=>text.toLowerCase().replaceAll('’',"'");
const options=new Map([['Lord of Change',1],['Great Unclean One',2],['Keeper Of Secrets',1],['Bloodthirster',1],['Soul Grinder',1]]);

export function importDaemonEquipment(tables){
 const source=tables.Source.find(s=>s.edition==='11'&&s.name==='Chaos Daemons'&&s.version);
 if(!source)throw Error('Missing current Daemon source');
 const units=tables.Datasheets.filter(s=>s.faction_id==='CD'&&s.source_id===source.id);
 const result={};
 for(const sheet of units){
  const own=table=>tables[table].filter(r=>r.datasheet_id===sheet.id);
  const printed=own('Datasheets_wargear').map(r=>r.name.split(/\s+[–—-]\s+/)[0]);
  const items=raw=>raw.split(';').map(n=>n.trim().replace(/\.$/,'')).filter(n=>n&&n!=='nothing')
   .map(n=>printed.find(w=>plain(w)===plain(n))??n[0].toUpperCase()+n.slice(1));
  const optionsText=own('Datasheets_options').map(r=>clean(r.description)).filter(t=>t&&t.toLowerCase()!=='none');
  const separateBearers=optionsText.length===2&&optionsText.every(t=>t.includes('instrument of Chaos')&&t.includes('daemonic icon'));
  if(!separateBearers&&optionsText.length!==(options.get(sheet.name)??0))throw Error(sheet.name+': unrecognized wargear options');
  let minimum=0,maximum=0;
  for(const c of own('Datasheets_unit_composition')){
   const row=/^(\d+)(?:[–-](\d+))?\s/.exec(clean(c.description));
   if(!row)throw Error(sheet.name+': unsupported composition');
   minimum+=Number(row[1]);maximum+=Number(row[2]??row[1]);
  }
  const loadout=clean(sheet.loadout);
  let perModel=[],extra=[];
  if(sheet.name==='Flesh Hounds'){
   const [hound,pack]=loadout.split('Every Flesh Hound is equipped with:');
   perModel=items(pack);
   extra=items(hound.split('is equipped with:')[1]).filter(w=>!perModel.includes(w));
  }else if(sheet.name==='Pink Horrors'||sheet.name==='Blue Horrors'){
   // Only starting models are mustered. The other two printed profiles are
   // conditional results of Split and are explained by that ability.
   perModel=items(loadout.split(' is equipped with:')[1].split(' Every ')[0]);
  }else{
   const raw=/^(?:This model is|Every model is) equipped with:\s*(.+)$/i.exec(loadout);
   if(!raw)throw Error(sheet.name+': unrecognized equipment ownership');
   perModel=items(raw[1]);
  }
  result[sheet.name]={minimum,maximum,perModel,...(extra.length?{extra}:{}),...(separateBearers?{separateBearers:true}:{})};
 }
 return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a<b?-1:1));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [directory,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: node scripts/import-daemon-equipment.mjs CSV_DIR OUTPUT_TS');
 const {tables}=await loadExport({directory});
 const data=importDaemonEquipment(tables);
 writeFileSync(output,"// Generated from the current 11e Daemon datasheet export by scripts/import-daemon-equipment.mjs.\n"+
  'export interface DaemonEquipmentData {minimum:number;maximum:number;perModel:string[];extra?:string[];separateBearers?:boolean}\n'+
  'export const DAEMON_EQUIPMENT:Readonly<Record<string,DaemonEquipmentData>>={\n'+
  Object.entries(data).map(([name,record])=>'  '+JSON.stringify(name)+': '+JSON.stringify(record)+',').join('\n')+'\n};\n');
}
