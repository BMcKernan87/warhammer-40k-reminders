import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {parseExport} from './import-wahapedia-11e.mjs';

const [folder,manualPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-custodes-detachments.mjs CSV_DIR CUSTODES_MFM_YAML OUTPUT_TS');
const read=(name,keys)=>parseExport(readFileSync(join(folder,name+'.csv'),'utf8'),keys,name);
const manual=parse(readFileSync(manualPath,'utf8'));
if(manual.slug!=='adeptus-custodes'||!manual.version)throw Error('Expected Adeptus Custodes MFM');
const normal=s=>s.toLowerCase().replace(/\(upgrade\)/g,'').replace(/[^a-z]/g,'');
const sources=read('Source',['id','edition','name']).filter(row=>row.edition==='11'&&row.name==='Adeptus Custodes').map(row=>row.id);
const sheets=read('Datasheets',['id','source_id','name','faction_id']).filter(row=>row.faction_id==='AC'&&(sources.includes(row.source_id)||row.source_id==='000000354'&&['Orion Assault Dropship','Ares Gunship'].includes(row.name)&&manual.units.some(u=>u.name===row.name&&!u.legends)));
const names=new Map(sheets.map(s=>[s.id,s.name]));
const matches=read('Detachments',['id','faction_id','type','name','dp','force_disposition']).filter(row=>row.faction_id==='AC'&&!row.type);
const dets=new Map(matches.map(d=>{
 const m=manual.detachments.find(row=>normal(row.name)===normal(d.name));
 if(!m||m.dp!==Number(d.dp))throw Error('Cannot reconcile detachment '+d.name);
 return [d.id,{...m,name:d.name}];
}));
const abilities=read('Datasheets_abilities',['datasheet_id','ability_id','description']);
const army=sheets.map(s=>{
 const rows=abilities.filter(a=>a.datasheet_id===s.id);
 const has=id=>rows.some(a=>a.ability_id===id);
 return {unit:s.name,katah:has('000008391'),aegis:has('000011234'),aquila:has('000011233'),nulls:has('000011230'),
  oncePerUnit:rows.filter(a=>a.name.toLowerCase().includes('once per battle, per unit')).map(a=>a.name.split(' (')[0])};
});
const upgradeLinks=read('Datasheets_enhancements',['datasheet_id','enhancement_id']);
const upgrades=read('Enhancements',['id','name','detachment_id','cost','upgrade']).filter(row=>dets.has(row.detachment_id)).map(row=>{
 const det=dets.get(row.detachment_id),m=det.enhancements.find(e=>normal(e.name)===normal(row.name));
 if(!m||m.points!==Number(row.cost))throw Error('Cannot reconcile upgrade '+row.name);
 const units=upgradeLinks.filter(e=>e.enhancement_id===row.id&&names.has(e.datasheet_id)).map(e=>names.get(e.datasheet_id));
 if(!units.length)throw Error('Missing eligibility '+row.name);
 const isUpgrade=row.upgrade==='true';
 return {id:row.id,name:row.name,detachment:det.name,points:m.points,isUpgrade,repeatable:isUpgrade&&!/one per army/i.test(row.name),units};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const stratLinks=read('Datasheets_stratagems',['stratagem_id','datasheet_id']);
const strats=read('Stratagems',['id','name','detachment_id','description','cp_cost']).filter(row=>dets.has(row.detachment_id)).map(row=>{
 const when=row.description.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').match(/WHEN\s*:\s*(.*?)\s*TARGET\s*:/i)?.[1].toLowerCase();
 if(!when||!/^\d+$/.test(row.cp_cost))throw Error('Invalid Stratagem '+row.name);
 const trigger=when.split(',')[0];
 const windows=phases.filter(phase=>trigger.includes('any phase')||trigger.includes(phase.toLowerCase()+' phase')||trigger.includes(phase.toLowerCase()+'/')).map(phase=>({
  phase,turn:phase==='Fight'&&trigger.includes(' or ')?'either':trigger.includes('opponent')?'opponent':trigger.includes('your ')?'own':'either'
 }));
 const units=stratLinks.filter(e=>e.stratagem_id===row.id&&names.has(e.datasheet_id)).map(e=>names.get(e.datasheet_id));
 if(!windows.length||!units.length)throw Error('Missing timing or recipients '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:dets.get(row.detachment_id).name,cp:Number(row.cp_cost),timing:trigger.startsWith('start of')?'start':trigger.startsWith('end of')?'end':'during',windows,units};
});
if(sheets.length!==29||dets.size!==13||strats.length!==41||upgrades.length!==29)throw Error('Review changed matched-play inventory '+[sheets.length,dets.size,strats.length,upgrades.length].join(','));
const revision=read('Last_update',['last_update'])[0].last_update;
const format=records=>'[\n'+records.map(row=>'  '+JSON.stringify(row)).join(',\n')+'\n]';
writeFileSync(output,'// Generated from Wahapedia 11e export '+revision+' and MFM v'+manual.version+'.\n'
 +'export const CUSTODES_ARMY_ABILITIES = '+format(army)+';\n'
 +'export const CUSTODES_UPGRADES = '+format(upgrades)+';\n'
 +'export const CUSTODES_STRATAGEMS = '+format(strats)+' as const;\n');
