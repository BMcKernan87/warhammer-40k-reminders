import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualPath,packTextPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-tyranid-detachments.mjs CSV_DIR MFM_YAML PUBLISHER_PACK_TEXT OUTPUT_TS');
const {tables}=await loadExport({directory});
const mfm=parse(readFileSync(manualPath,'utf8'));
const source=tables.Source.find(s=>s.id==='000000020');
if(mfm.slug!=='tyranids'||mfm.version!=='1.6'||source?.edition!=='11'||source.version!=='1.3')throw Error('Review Tyranid publisher/MFM revision');
const pack=readFileSync(packTextPath,'utf8');
for(const text of ['FACTION PACK: VERSION 1.3','Legal for matched play from 14th October 2026','MINDHUNGER','HIGHER IMPERATIVES','LEADER-BEASTS','SURPRISE ASSAULT'])if(!pack.includes(text))throw Error('Unverified publisher pack: '+text);
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' The ',' the ').replace(' And ',' and ');
const normalize=s=>s.toLowerCase().replace(/^the /,'').replace(/\s*\((upgrade|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'');
const fingerprint=s=>createHash('sha256').update(s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).digest('hex');
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='TYR'&&!d.type)){
 const manual=mfm.detachments.find(d=>normalize(d.name)===normalize(det.name));
 const objectives=det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase());
 if(!manual||manual.dp!==Number(det.dp)||objectives.sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(manual.unique?{tag:manual.unique}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const matchedNames=new Set(mfm.units.filter(u=>!u.legends).map(u=>normalize(u.name)));
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='TYR'&&matchedNames.has(normalize(d.name))).map(d=>[d.id,d.name]));
const unitLinks=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name;
 const name=row.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim();
 const price=mfm.detachments.find(d=>normalize(d.name)===normalize(detachment)).enhancements.find(e=>normalize(e.name)===normalize(name));
 const units=unitLinks(tables.Datasheets_enhancements,'enhancement_id',row.id);
 if(!price||price.points!==Number(row.cost)||!units.length||!row.description)throw Error('Unverified Tyranid enhancement '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:row.upgrade==='true',units,sourceHash:fingerprint(row.description)};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const text=row.description.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const trigger=text.match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing time on '+row.name);
 const windows=phases.filter(p=>trigger.includes(p.toLowerCase()+' phase')||/any (?:of your )?phases?/.test(trigger)).map(phase=>({phase,turn:phase==='Fight'&&/ or (?:the start of )?the fight/.test(trigger)?'either':trigger.includes('opponent')?'opponent':trigger.includes('your ')?'own':'either'}));
 const units=unitLinks(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing Tyranid eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during',sourceHash:fingerprint(row.description)};
});
const traits=tables.Detachment_abilities.filter(r=>detachments.has(r.detachment_id)).map(r=>({id:r.id,name:r.name,detachment:detachments.get(r.detachment_id).name,sourceHash:fingerprint(r.description)}));
if(detachments.size!==10||strats.length!==51||upgrades.length!==34||sheets.size!==52||traits.length!==10)throw Error('Reconcile changed Tyranid matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e export, October MFM v1.6 and publisher pack v1.3.\n'+
 'export const TYRANID_DETACHMENTS='+records([...detachments.values()])+'export const TYRANID_UPGRADES='+records(upgrades)+'export const TYRANID_STRATAGEMS='+records(strats)+'export const TYRANID_TRAITS='+records(traits));
