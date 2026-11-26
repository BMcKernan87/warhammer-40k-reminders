import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualPath,packTextPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-aeldari-detachments.mjs CSV_DIR AELDARI_MFM_YAML PUBLISHER_PACK_TEXT OUTPUT_TS');
const {tables}=await loadExport({directory}),mfm=parse(readFileSync(manualPath,'utf8'));
const source=tables.Source.find(s=>s.id==='000000186'),pack=readFileSync(packTextPath,'utf8');
if(mfm.slug!=='aeldari'||mfm.version!=='1.6'||source?.edition!=='11'||source.version!=='1.4')throw Error('Review Aeldari publisher/MFM revision');
for(const text of ['FACTION PACK: VERSION 1.4','Legal for matched play from 14th October 2026','FATEFUL PERFORMANCE','PATH OF THE OUTCAST','TWILIGHT FLICKERS','UNIQUE: ACROBATIC','Prince Yriel unit only.'])if(!pack.toUpperCase().includes(text.toUpperCase()))throw Error('Unverified Aeldari publisher pack: '+text);
const normalize=s=>s.toLowerCase().replace(/^the /,'').replace(/\s*\((upgrade|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'').replace(/^vyper$/,'vypers');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' And ',' and ').replace(' The ',' the ');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const fingerprint=s=>createHash('sha256').update(plain(s)).digest('hex');
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='AE'&&!d.type)){
 const manual=mfm.detachments.find(d=>normalize(d.name)===normalize(det.name));
 if(!manual||manual.dp!==Number(det.dp)||det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase()).sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title),tag=['Fateful Performance','Twilight Flickers'].includes(det.name)?'Acrobatic':undefined;
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(tag?{tag}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const sources=new Map(tables.Source.map(s=>[s.id,s])),matchedNames=new Set(mfm.units.filter(u=>!u.legends).map(u=>normalize(u.name)));
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='AE'&&matchedNames.has(normalize(d.name))&&!sources.get(d.source_id)?.name.includes('Legends')).map(d=>[d.id,d.name]));
const links=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name,name=row.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim();
 const price=mfm.detachments.find(d=>normalize(d.name)===normalize(detachment)).enhancements.find(e=>normalize(e.name)===normalize(name));
 let units=links(tables.Datasheets_enhancements,'enhancement_id',row.id);
 // The export links Kharseth too; both the printed restriction and publisher pack
 // explicitly identify Prince Yriel, not an arbitrary Anhrathe Character.
 if(row.id==='000010699002'){
  if(!/^Prince Yriel unit only\./.test(plain(row.description)))throw Error('Review Pirate Prince eligibility');
  units=['Prince Yriel'];
 }
 if(!price||price.points!==Number(row.cost)||!units.length||!row.description)throw Error('Unverified Aeldari enhancement '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:row.upgrade==='true',corsair:['Corsair Coterie','Eldritch Raiders'].includes(detachment),units,sourceHash:fingerprint(row.description)};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const trigger=plain(row.description).match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing Aeldari time on '+row.name);
 const windows=phases.filter(p=>new RegExp('\\b'+p.toLowerCase()+'\\b').test(trigger)||/any (?:of your )?phases?/.test(trigger)).map(phase=>({phase,turn:phase==='Fight'?/your fight phase/.test(trigger)?'own':/opponent(?:['’]s|s)? fight phase/.test(trigger)?'opponent':'either':trigger.includes('opponent')?'opponent':trigger.includes('your')?'own':'either'}));
 const units=links(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing Aeldari eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during',sourceHash:fingerprint(row.description)};
});
const traits=tables.Detachment_abilities.filter(r=>detachments.has(r.detachment_id)).map(r=>({id:r.id,name:r.name,detachment:detachments.get(r.detachment_id).name,sourceHash:fingerprint(r.description)}));
if(detachments.size!==15||strats.length!==78||upgrades.length!==52||sheets.size!==76||traits.length!==17)throw Error('Reconcile changed Aeldari matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e export, October MFM v1.6 and publisher pack v1.4.\n'+
 'export const AELDARI_DETACHMENTS='+records([...detachments.values()])+'export const AELDARI_UPGRADES='+records(upgrades)+'export const AELDARI_STRATAGEMS='+records(strats)+'export const AELDARI_TRAITS='+records(traits));
