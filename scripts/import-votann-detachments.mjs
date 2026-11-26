import {readFileSync,writeFileSync} from 'node:fs';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';
const [directory,manualPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-votann-detachments.mjs CSV_DIR MFM_YAML OUTPUT_TS');
const {tables}=await loadExport({directory});
const mfm=parse(readFileSync(manualPath,'utf8'));
if(mfm.slug!=='leagues-of-votann'||mfm.version!=='1.6')throw Error('Review Leagues of Votann MFM revision');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' The ',' the ').replace(' And ',' and ');
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='LoV'&&!d.type)){
 const manual=mfm.detachments.find(d=>d.name===det.name);
 const objectives=det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase());
 if(!manual||manual.dp!==Number(det.dp)||objectives.sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(additional.length?{additionalDispositions:additional}:{})});
}
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='LoV'&&tables.Source.some(s=>s.id===d.source_id&&s.edition==='11'&&s.name==='Leagues of Votann')).map(d=>[d.id,d.name]));
const unitLinks=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const normalize=name=>name.replace(/\s*\(upgrade\)/i,'').replace(/[-‑]/g,'-').toLowerCase();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name;
 // The publisher's October erratum and MFM retain the second e in Dêlvewerke.
 const name=row.id==='000010443002'?'Dêlvewerke Navigator':row.name;
 const price=mfm.detachments.find(d=>d.name===detachment).enhancements.find(e=>normalize(e.name)===normalize(name));
 const units=unitLinks(tables.Datasheets_enhancements,'enhancement_id',row.id);
 if(!price||price.points!==Number(row.cost)||!units.length)throw Error('Unverified Votann enhancement '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:row.upgrade==='true',units};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const text=row.description.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const trigger=text.match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing time on '+row.name);
 const windows=phases.filter(p=>trigger.includes(p.toLowerCase()+' phase')||/any (?:of your )?phases?/.test(trigger)).map(phase=>({
  phase,turn:phase==='Fight'&&trigger.includes(' or the fight')?'either':trigger.includes('opponent')?'opponent':trigger.includes('your ')?'own':'either'
 }));
 const units=unitLinks(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing Votann eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,
  timing:trigger.startsWith('start of')?'start':trigger.startsWith('end of')?'end':'during'};
});
if(detachments.size!==10||sheets.size!==22||strats.length!==51||upgrades.length!==34)throw Error('Reconcile changed matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,"// Generated from the November 23 11e export and October MFM v1.6.\n"+
 'export const VOTANN_DETACHMENTS='+records([...detachments.values()])+
 'export const VOTANN_UPGRADES='+records(upgrades)+'export const VOTANN_STRATAGEMS='+records(strats));
