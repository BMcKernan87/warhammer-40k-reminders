import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {parseExport} from './import-wahapedia-11e.mjs';

const [folder,manualPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-imperial-agent-detachments.mjs CSV_DIR IMPERIAL_AGENTS_MFM_YAML OUTPUT_TS');
const read=(name,keys)=>parseExport(readFileSync(join(folder,name+'.csv'),'utf8'),keys,name);
const manual=parse(readFileSync(manualPath,'utf8'));
if(manual.slug!=='imperial-agents'||!manual.version)throw Error('Expected Imperial Agents MFM');
const normal=s=>s.toLowerCase().replace(/\s*\(aura\)/,'').replace(/[^a-z]/g,'').replace('introneural','intraneural');
const sourceIds=read('Source',['id','edition','name']).filter(row=>row.edition==='11'&&row.name==='Imperial Agents').map(row=>row.id);
const sheets=read('Datasheets',['id','faction_id','source_id','name']).filter(row=>row.faction_id==='AoI'&&sourceIds.includes(row.source_id));
const names=new Map(sheets.map(s=>[s.id,s.name]));
const matches=read('Detachments',['id','faction_id','type','name','dp','force_disposition']).filter(row=>row.faction_id==='AoI'&&!row.type);
const dets=new Map(matches.map(d=>{
 const m=manual.detachments.find(row=>normal(row.name)===normal(d.name));
 if(!m||m.dp!==Number(d.dp)||!m.objectives.includes(d.force_disposition.toUpperCase()))throw Error('Cannot reconcile detachment '+d.name);
 return [d.id,m];
}));
const options=read('Datasheets_enhancements',['datasheet_id','enhancement_id']);
const upgrades=read('Enhancements',['id','name','detachment_id','cost']).filter(row=>dets.has(row.detachment_id)).map(row=>{
 const det=dets.get(row.detachment_id),m=det.enhancements.find(e=>normal(e.name)===normal(row.name));
 if(!m||m.points!==Number(row.cost))throw Error('Cannot reconcile enhancement '+row.name);
 const eligible=options.filter(e=>e.enhancement_id===row.id&&names.has(e.datasheet_id)).map(e=>names.get(e.datasheet_id));
 if(!eligible.length)throw Error('Missing enhancement eligibility for '+row.name);
 return {id:row.id,name:row.name,detachment:det.name,points:m.points,repeatable:false,units:eligible};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=read('Stratagems',['id','name','detachment_id','description','cp_cost']).filter(row=>dets.has(row.detachment_id)).map(row=>{
 const when=row.description.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').match(/WHEN\s*:\s*(.*?)\s*TARGET\s*:/i)?.[1].toLowerCase();
 if(!when||!/^\d+$/.test(row.cp_cost))throw Error('Invalid Stratagem '+row.name);
 const trigger=when.split(',')[0];
 const windows=phases.filter(phase=>trigger.includes('any phase')?!trigger.includes('excluding the '+phase.toLowerCase()+' phase'):trigger.includes(phase.toLowerCase()+' phase')).map(phase=>({
  phase,turn:phase==='Fight'&&trigger.includes('or')?'either':trigger.includes('opponent')?'opponent':trigger.includes('your ')?'own':'either'
 }));
 if(!windows.length)throw Error('Unresolved Stratagem timing '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:dets.get(row.detachment_id).name,cp:Number(row.cp_cost),timing:trigger.startsWith('start of')?'start':trigger.startsWith('end of')?'end':'during',windows};
});
if(sheets.length!==29||dets.size!==5||strats.length!==30||upgrades.length!==20)throw Error('Review newly published matched-play rules before regenerating');
const revision=read('Last_update',['last_update'])[0].last_update;
const format=records=>'[\n'+records.map(row=>'  '+JSON.stringify(row)).join(',\n')+'\n]';
writeFileSync(output,'// Generated from the Wahapedia 11th-edition export '+revision+' and MFM v'+manual.version+'.\n'
 +'export const AGENT_UPGRADES = '+format(upgrades)+';\n'
 +'export const AGENT_STRATAGEMS = '+format(strats)+' as const;\n');
