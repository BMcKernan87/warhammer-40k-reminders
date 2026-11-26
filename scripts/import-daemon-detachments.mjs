import {readFileSync,writeFileSync} from 'node:fs';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualFile,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-daemon-detachments.mjs CSV_DIR DAEMONS_MFM_YAML OUTPUT_TS');
const {tables}=await loadExport({directory});
const manual=parse(readFileSync(manualFile,'utf8'));
const norm=t=>t.toLowerCase().replace(/[’‘]/g,"'").replace(/[‑–]/g,'-').replace(/ \((?:upgrade|aura)\)$/,'');
const title=s=>s.toLowerCase().replace(/(^|\s|[-‑])\p{L}/gu,w=>w.toUpperCase());
const dets=tables.Detachments.filter(d=>d.faction_id==='CD'&&d.dp);
if(dets.length!==manual.detachments.length)throw Error('Detachment inventory differs between manual and export');
const nativeIds=new Set(tables.Source.filter(s=>s.name==='Chaos Daemons'&&s.edition==='11'&&s.version).map(x=>x.id));
const native=tables.Datasheets.filter(s=>s.faction_id==='CD'&&nativeIds.has(s.source_id));
const ids=new Map(dets.map(d=>[d.id,d.name]));
const detachments=dets.map(d=>{
 const m=manual.detachments.find(x=>norm(x.name)===norm(d.name));
 if(!m||m.dp!==Number(d.dp)||m.objectives.map(norm).join(',')!==d.force_disposition.split(', ').map(norm).join(','))throw Error('MFM detachment mismatch '+d.name);
 return {name:d.name,dp:Number(d.dp),objectives:d.force_disposition.split(', ')};
});
const upgrades=tables.Enhancements.filter(e=>ids.has(e.detachment_id)).map(e=>{
 const m=manual.detachments.find(d=>norm(d.name)===norm(e.detachment)).enhancements.find(u=>norm(u.name)===norm(e.name));
 if(!m||m.points!==Number(e.cost))throw Error('MFM upgrade mismatch '+e.name);
 const matches=new Set(tables.Datasheets_enhancements.filter(s=>s.enhancement_id===e.id).map(s=>s.datasheet_id));
 const eligible=tables.Datasheets.filter(s=>s.faction_id==='CD'&&matches.has(s.id)).map(s=>s.name);
 return {id:e.id,name:e.name.replace(/ \(Aura\)$/,''),detachment:ids.get(e.detachment_id),points:Number(e.cost),repeatable:e.upgrade==='true',units:eligible};
});
const strats=tables.Stratagems.filter(s=>ids.has(s.detachment_id)).map(s=>({id:s.id,name:title(s.name),detachment:ids.get(s.detachment_id),cp:Number(s.cp_cost)}));
if(strats.find(s=>s.name==='From Beyond The Veil')?.cp!==2)throw Error('Expected v1.2 erratum setting From Beyond the Veil to 2CP');
const abilities=new Map(tables.Abilities.map(a=>[a.id,a.name]));
const marineSource=tables.Source.find(s=>s.name==='Chaos Space Marines'&&s.edition==='11'&&s.version);
if(!marineSource)throw Error('Missing Shadow Legion marine data');
const shadow=tables.Datasheets.filter(s=>s.faction_id==='CD'&&s.source_id===marineSource.id);
const traits=[...native,...shadow].map(d=>{
 const weapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===d.id&&w.name);
 const listed=type=>[...new Set(weapons.filter(w=>w.type===type).map(w=>w.name.split(/\s+[–—-]\s+/)[0]))];
 const deepStrike=tables.Datasheets_abilities.some(a=>a.datasheet_id===d.id&&(a.name||abilities.get(a.ability_id))==='Deep Strike');
 return {unit:d.name,ranged:listed('Ranged'),melee:listed('Melee'),deepStrike};
});
const emit=(name,data)=>'export const '+name+' = [\n'+data.map(d=>'  '+JSON.stringify(d)+',').join('\n')+'\n];\n';
writeFileSync(output,'// Generated from the current 11e export and MFM '+manual.version+' by scripts/import-daemon-detachments.mjs.\n'+
 emit('DAEMON_DETACHMENTS',detachments)+emit('DAEMON_STRATAGEMS',strats)+emit('DAEMON_UPGRADES',upgrades)+emit('DAEMON_TRAITS',traits));
