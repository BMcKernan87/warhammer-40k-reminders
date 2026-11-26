import {readFileSync,writeFileSync} from 'node:fs';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';
const [directory,manualPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-astra-militarum-detachments.mjs CSV_DIR MFM_YAML OUTPUT_TS');
const {tables}=await loadExport({directory});
const mfm=parse(readFileSync(manualPath,'utf8'));
if(mfm.slug!=='astra-militarum'||mfm.version!=='1.6')throw Error('Review Astra Militarum MFM revision');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' The ',' the ').replace(' And ',' and ');
const normalize=s=>s.toLowerCase().replace(/\s*\((upgrade|aura)\)/ig,'').replace(/[^a-z0-9]/g,'');
const detName=s=>s;
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='AM'&&!d.type)){
 const manual=mfm.detachments.find(d=>normalize(d.name)===normalize(detName(det.name)));
 const objectives=det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase());
 if(!manual||manual.dp!==Number(det.dp)||objectives.sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 detachments.set(det.id,{name:detName(det.name),dp:manual.dp,disposition,...(manual.unique?{tag:manual.unique}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const matchedNames=new Set(mfm.units.filter(u=>!u.legends).map(u=>normalize(u.name)));
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='AM'&&matchedNames.has(normalize(d.name))).map(d=>[d.id,d.name]));
const natives=new Set(tables.Datasheets.filter(d=>d.faction_id==='AM'&&tables.Source.some(s=>s.id===d.source_id&&s.edition==='11'&&s.name==='Astra Militarum')).map(d=>d.name));
const unitLinks=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name;
 const name=row.name.replace(/\s*\(Aura\)/i,'').trim().replace('drop Beacon','Drop Beacon');
 const price=mfm.detachments.find(d=>normalize(d.name)===normalize(detachment)).enhancements.find(e=>normalize(e.name)===normalize(name));
 // Astra Militarum September 30 faction pack, Loyal Protector correction:
 // Ogryn Bodyguards cannot receive Enhancements despite their CHARACTER keyword.
 const units=unitLinks(tables.Datasheets_enhancements,'enhancement_id',row.id).filter(name=>natives.has(name)&&name!=='Ogryn Bodyguard');
 if(!price||price.points!==Number(row.cost)||!units.length)throw Error('Unverified ASTRA enhancement '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:row.upgrade==='true',units};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const text=row.description.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const trigger=text.match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing time on '+row.name);
 const windows=trigger.includes('end of your opponent')&&trigger.includes('turn')?[{phase:'End of opponent turn',turn:'opponent'}]:trigger.includes('reinforcements step')?[{phase:'Movement',turn:trigger.includes('opponent')?'opponent':'own'}]:phases.filter(p=>trigger.includes(p.toLowerCase()+' phase')||/any (?:of your )?phases?/.test(trigger)).map(phase=>({
  phase,turn:phase==='Fight'&&/ or (the start of )?the fight/.test(trigger)?'either':trigger.includes('opponent')?'opponent':trigger.includes('your ')?'own':'either'
 }));
 const units=unitLinks(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing ASTRA eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,
  timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during'};
});
if(detachments.size!==11||strats.length!==57||upgrades.length!==38)throw Error('Reconcile changed matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,"// Generated from the November 23 11e export and October MFM v1.6.\n"+
 'export const ASTRA_DETACHMENTS='+records([...detachments.values()])+
 'export const ASTRA_UPGRADES='+records(upgrades)+'export const ASTRA_STRATAGEMS='+records(strats));
