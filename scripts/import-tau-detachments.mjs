import {readFileSync,writeFileSync} from 'node:fs';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualPath,packTextPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-tau-detachments.mjs CSV_DIR MFM_YAML PUBLISHER_PACK_TEXT OUTPUT_TS');
const {tables}=await loadExport({directory});
const mfm=parse(readFileSync(manualPath,'utf8'));
const source=tables.Source.find(s=>s.id==='000000028');
if(mfm.slug!=='tau-empire'||mfm.version!=='1.6'||source?.edition!=='11'||source.version!=='1.2')throw Error('Review T’au publisher/MFM revision');
const pack=readFileSync(packTextPath,'utf8');
for(const text of ['FACTION PACK: VERSION 1.2','Legal for matched play from 26th August 2026','INTEGRATED COMMAND STRUCTURE','SUPERIOR CRAFTSMANSHIP','EXPERT FIELDCRAFT'])if(!pack.includes(text))throw Error('Unverified publisher pack: '+text);
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' The ',' the ').replace(' And ',' and ');
const normalize=s=>s.toLowerCase().replace(/^the /,'').replace(/\s*\((upgrade|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'');
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='TAU'&&!d.type)){
 const manual=mfm.detachments.find(d=>normalize(d.name)===normalize(det.name));
 const objectives=det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase());
 if(!manual||manual.dp!==Number(det.dp)||objectives.sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 // The August pack calls the shared Retaliation/Experimental tag RETALIATION.
 // The October MFM and current app call the same exclusion group BATTLESUIT.
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(manual.unique?{tag:manual.unique}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const matchedNames=new Set(mfm.units.filter(u=>!u.legends).map(u=>normalize(u.name)));
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='TAU'&&matchedNames.has(normalize(d.name))).map(d=>[d.id,d.name]));
const unitLinks=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name;
 const name=row.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim();
 const price=mfm.detachments.find(d=>normalize(d.name)===normalize(detachment)).enhancements.find(e=>normalize(e.name)===normalize(name));
 const units=unitLinks(tables.Datasheets_enhancements,'enhancement_id',row.id);
 if(!price||price.points!==Number(row.cost)||!units.length||!row.description)throw Error('Unverified T’au enhancement '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:row.upgrade==='true',units};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const text=row.description.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const trigger=text.match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing time on '+row.name);
 const windows=phases.filter(p=>trigger.includes(p.toLowerCase()+' phase')||/any (?:of your )?phases?/.test(trigger)).map(phase=>({phase,turn:phase==='Fight'&&/ or (?:the start of )?the fight/.test(trigger)?'either':trigger.includes('opponent')?'opponent':trigger.includes('your ')?'own':'either'}));
 const units=unitLinks(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing T’au eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during'};
});
const traits=tables.Detachment_abilities.filter(r=>detachments.has(r.detachment_id)).map(r=>({id:r.id,name:r.name,detachment:detachments.get(r.detachment_id).name}));
if(detachments.size!==7||strats.length!==31||upgrades.length!==23||sheets.size!==43||traits.length!==9)throw Error('Reconcile changed T’au matched-play inventory');
for(const id of ['000009840002','000009840003','000009840004'])if(!strats.some(s=>s.id===id))throw Error('Unquoted multiline Auxiliary record was lost');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e export, October MFM v1.6 and publisher pack v1.2.\n'+
 'export const TAU_DETACHMENTS='+records([...detachments.values()])+'export const TAU_UPGRADES='+records(upgrades)+'export const TAU_STRATAGEMS='+records(strats)+'export const TAU_TRAITS='+records(traits));
