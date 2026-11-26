import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {parseExport} from './import-wahapedia-11e.mjs';

const [folder,manualPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-ork-detachments.mjs CSV_DIR ORK_MFM_YAML OUTPUT_TS');
const read=(name,keys)=>parseExport(readFileSync(join(folder,name+'.csv'),'utf8'),keys,name);
const manual=parse(readFileSync(manualPath,'utf8'));
if(manual.slug!=='orks'||!manual.version)throw Error('Expected Orks MFM');
const normal=s=>s.toLowerCase().replace(/\(upgrade\)/g,'').replace(/[^a-z]/g,'');
const sources=read('Source',['id','edition','name']).filter(row=>row.edition==='11'&&row.name==='Orks').map(row=>row.id);
const sheets=read('Datasheets',['id','source_id','name','faction_id']).filter(row=>row.faction_id==='ORK'&&(sources.includes(row.source_id)||row.source_id==='000000378'&&row.name==='Gargantuan Squiggoth'&&manual.units.some(u=>u.name===row.name&&!u.legends)));
const names=new Map(sheets.map(s=>[s.id,s.name]));
const matches=read('Detachments',['id','faction_id','type','name','dp','force_disposition']).filter(row=>row.faction_id==='ORK'&&!row.type);
const dets=new Map(matches.map(d=>{
 const m=manual.detachments.find(row=>normal(row.name)===normal(d.name));
 if(!m||m.dp!==Number(d.dp))throw Error('Cannot reconcile detachment '+d.name);
 return [d.id,{...m,name:d.name}];
}));
const abilities=read('Datasheets_abilities',['datasheet_id','ability_id','description']);
const weapons=read('Datasheets_wargear',['datasheet_id','type']);
const army=sheets.map(s=>{
 const rows=abilities.filter(a=>a.datasheet_id===s.id);
 const has=id=>rows.some(a=>a.ability_id===id);
 return {unit:s.name,waaagh:has('000003676'),boss:has('000011126'),psychic:has('000011127'),
  ranged:weapons.some(w=>w.datasheet_id===s.id&&w.type.toLowerCase()==='ranged'),
  firingDeck:has('000008334'),infiltrators:has('000008345'),stealth:has('000008337'),
  motivates:rows.some(a=>a.name.startsWith('Intimidating Motivation')),hunts:rows.some(a=>a.name.startsWith('Keep Huntin'))};
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
 return {id:row.id,name:row.name.trim(),detachment:dets.get(row.detachment_id).name,cp:Number(row.cp_cost),timing:trigger.includes('battle-shock step')?'during':trigger.startsWith('start of')?'start':trigger.startsWith('end of')?'end':'during',both:trigger.startsWith('start/end'),windows,units};
});
if(sheets.length!==55||dets.size!==15||strats.length!==40||upgrades.length!==38)throw Error('Review changed matched-play inventory '+[sheets.length,dets.size,strats.length,upgrades.length].join(','));
const revision=read('Last_update',['last_update'])[0].last_update;
const format=records=>'[\n'+records.map(row=>'  '+JSON.stringify(row)).join(',\n')+'\n]';
writeFileSync(output,'// Generated from Wahapedia 11e export '+revision+' and MFM v'+manual.version+'.\n'
 +'export const ORK_ARMY_ABILITIES = '+format(army)+';\n'
 +'export const ORK_UPGRADES = '+format(upgrades)+';\n'
 +'export const ORK_STRATAGEMS = '+format(strats)+' as const;\n');
