import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualDirectory,publisherPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-space-marines-detachments.mjs CSV_DIR MFM_DIRECTORY PUBLISHER_UPDATES_TEXT OUTPUT_TS');
const publisher=readFileSync(publisherPath,'utf8').replace(/\s+/g,' ');
for(const text of ['PRINTED PRODUCT UPDATES: VERSION 1.1','latest updates to rules that do not appear in print','digital-exclusive detachments','Captain Titus, Righteous Fury Ability','Kayvaan Shrike, Keywords Section'])if(!publisher.includes(text))throw Error('Review current Space Marines publisher update: '+text);
const {tables}=await loadExport({directory});
const manuals=['space-marines','deathwatch'].map(slug=>{
 const manual=parse(readFileSync(manualDirectory+'/'+slug+'.yaml','utf8'));
 if(manual.slug!==slug||manual.version!=='1.6')throw Error('Review '+slug+' MFM revision');
 return manual;
});
const sourceIds=['000000139','000000362','000000035'];
for(const id of ['000000139','000000035'])if(tables.Source.find(s=>s.id===id)?.edition!=='11')throw Error('Review Space Marines/Deathwatch app edition');
const normalize=s=>s.toLowerCase().replace(/\s*\((upgrade|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const fingerprint=s=>createHash('sha256').update(plain(s)).digest('hex');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' And ',' and ').replace(' The ',' the ');
const allManual=manuals.flatMap(m=>m.detachments),selectedManual=[...new Map(allManual.map(d=>[normalize(d.name),d])).values()];
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='SM'&&!d.type&&selectedManual.some(m=>normalize(m.name)===normalize(d.name)))){
 const matches=allManual.filter(m=>normalize(m.name)===normalize(det.name)),manual=matches[0];
 for(const m of matches)if(m.dp!==Number(det.dp)||det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase()).sort().join()!==[...m.objectives].sort().join()||m.unique!==manual.unique)throw Error('MFM detachment disagreement '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(manual.unique?{tag:manual.unique}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const native=tables.Datasheets.filter(d=>d.faction_id==='SM'&&sourceIds.includes(d.source_id)),sheets=new Map(native.map(d=>[d.id,d.name]));
if(new Set(native.map(d=>d.name)).size!==native.length)throw Error('Duplicate current matched-play sheet');
const links=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const characterUnits=native.filter(d=>{
 const tags=tables.Datasheets_keywords.filter(k=>k.datasheet_id===d.id).map(k=>k.keyword.toUpperCase());
 return tags.includes('CHARACTER')&&!tags.includes('EPIC HERO');
}).map(d=>d.name).sort();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name,name=row.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim();
 const prices=allManual.filter(d=>normalize(d.name)===normalize(detachment)).map(d=>d.enhancements.find(e=>normalize(e.name)===normalize(name)));
 if(prices.some(p=>!p||p.points!==Number(row.cost)||/\(Upgrade\)/i.test(p.name)!==(row.upgrade==='true')))throw Error('Unverified Space Marines enhancement price or Upgrade tag '+name);
 let units=links(tables.Datasheets_enhancements,'enhancement_id',row.id);
 // The printed permission is any Astartes model. The Kill Team condition
 // controls the effect, not the purchase; Veteran Recruits can also supply
 // Kill Team to an otherwise ordinary Character in its actual formation.
 if(['000008522003','000011168002'].includes(row.id)){
  if(units.join()!=='Watch Master'||!/^ADEPTUS ASTARTES model only\. If this unit is a Kill Team unit,/i.test(plain(row.description)))throw Error('Review Beacon Angelis eligible bearer reconciliation');
  units=characterUnits;
 }
 if(!units.length||!row.description||row.support_leader)throw Error('Unverified Space Marines enhancement '+name);
 return {id:row.id,name,detachment,points:Number(row.cost),repeatable:row.upgrade==='true',units,sourceHash:fingerprint(row.description)};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const trigger=plain(row.description).match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing Space Marines time '+row.name);
 const windows=phases.filter(p=>new RegExp('\\b'+p.toLowerCase()+'\\b').test(trigger)||/any (?:of your )?phases?/.test(trigger)).map(phase=>({phase,turn:phase==='Fight'?/your fight phase/.test(trigger)?'own':/opponent(?:['’]s|s)? fight phase/.test(trigger)?'opponent':'either':trigger.includes('opponent')?'opponent':trigger.includes('your')?'own':'either'}));
 const units=links(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing Space Marines eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during',sourceHash:fingerprint(row.description)};
});
const traits=tables.Detachment_abilities.filter(r=>detachments.has(r.detachment_id)).map(r=>({id:r.id,name:r.name,detachment:detachments.get(r.detachment_id).name,sourceHash:fingerprint(r.description)}));
if(detachments.size!==23||traits.length!==23||strats.length!==94||upgrades.length!==61||sheets.size!==97)throw Error('Reconcile changed Space Marines matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e app export and October MFM v1.6; current printed-product update v1.1 defers digital-exclusive detachment changes to the app.\n'+
 'export const SM_DETACHMENTS='+records([...detachments.values()])+'export const SM_UPGRADES='+records(upgrades)+'export const SM_STRATAGEMS='+records(strats)+'export const SM_TRAITS='+records(traits));
