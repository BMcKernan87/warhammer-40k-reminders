import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualPath,alliedManualPath,packTextPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-drukhari-detachments.mjs CSV_DIR DRUKHARI_MFM_YAML AELDARI_MFM_YAML PUBLISHER_PACK_TEXT OUTPUT_TS');
const {tables}=await loadExport({directory}),mfm=parse(readFileSync(manualPath,'utf8')),alliedMfm=parse(readFileSync(alliedManualPath,'utf8'));
const source=tables.Source.find(s=>s.id==='000000031');
if(mfm.slug!=='drukhari'||alliedMfm.slug!=='aeldari'||alliedMfm.version!=='1.6'||mfm.version!=='1.6'||source?.edition!=='11'||source.version!=='1.2')throw Error('Review Drukhari publisher/MFM revision');
const pack=readFileSync(packTextPath,'utf8');
for(const text of ['FACTION PACK: VERSION 1.2','Legal for matched play from 26th August 2026','EXACTING CRUELTY','CONTRACTED HARVEST','DARKEST ARTIFICE','UNIQUE: WYCH CULT','UNIQUE: KABAL','UNIQUE: COVENS'])if(!pack.toUpperCase().includes(text.toUpperCase()))throw Error('Unverified Drukhari publisher pack: '+text);
const normalize=s=>s.toLowerCase().replace(/^the /,'').replace(/\s*\((upgrade|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' And ',' and ').replace(' The ',' the ');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const fingerprint=s=>createHash('sha256').update(plain(s)).digest('hex');
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='DRU'&&!d.type)){
 const manual=mfm.detachments.find(d=>normalize(d.name)===normalize(det.name));
 const objectives=det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase());
 if(!manual||manual.dp!==Number(det.dp)||objectives.sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 const tag=({'Spectacle of Spite':'Wych Cult','Exhibition of Slaughter':'Wych Cult','Covenite Coterie':'Covens','Tools of Torment':'Covens','Kabalite Cartel':'Kabal','Kabalite Agonysts':'Kabal'})[det.name];
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(tag?{tag}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const sources=new Map(tables.Source.map(s=>[s.id,s]));
const nativeNames=new Set(mfm.units.filter(u=>!u.legends).map(u=>normalize(u.name)));
const matchedNames=new Set([...mfm.units,...alliedMfm.units].filter(u=>!u.legends).map(u=>normalize(u.name)));
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='DRU'&&matchedNames.has(normalize(d.name))&&!sources.get(d.source_id)?.name.includes('Legends')).map(d=>[d.id,d.name]));
const harlequins=new Set([...sheets].filter(([id])=>tables.Datasheets_keywords.some(k=>k.datasheet_id===id&&k.keyword.toUpperCase()==='HARLEQUINS')).map(([,name])=>name));
const unitLinks=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name,name=row.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim();
 const price=mfm.detachments.find(d=>normalize(d.name)===normalize(detachment)).enhancements.find(e=>normalize(e.name)===normalize(name));
 let units=unitLinks(tables.Datasheets_enhancements,'enhancement_id',row.id);
 if(!price||price.points!==Number(row.cost)||!units.length||!row.description)throw Error('Unverified Drukhari enhancement '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:row.upgrade==='true',units,sourceHash:fingerprint(row.description)};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const trigger=plain(row.description).match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing Drukhari time on '+row.name);
 const windows=phases.filter(p=>new RegExp('\\b'+p.toLowerCase()+'\\b').test(trigger)||/any (?:of your )?phases?/.test(trigger)).map(phase=>({phase,turn:phase==='Fight'?/your fight phase/.test(trigger)?'own':/opponent(?:['’]s|s)? fight phase/.test(trigger)?'opponent':'either':trigger.includes('opponent')?'opponent':trigger.includes('your')?'own':'either'}));
 // The DRU clone records carry synthetic DRUKHARI indexing aliases on
 // Corsairs/Harlequins. These are not keyword grants from the army rule.
 let units=unitLinks(tables.Datasheets_stratagems,'stratagem_id',row.id).filter(name=>nativeNames.has(normalize(name))||(row.detachment==='Reaper’s Wager'&&harlequins.has(name)));
 // Current CSV links Postmortality to Wych Cult units, contradicting both
 // its own printed TARGET and the publisher's explicit Haemonculus update.
 if(row.id==='000010585002'){
  if(!/TARGET: One HAEMONCULUS model/i.test(plain(row.description)))throw Error('Review Postmortality bearer correction');
  units=['Haemonculus'];
 }
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing Drukhari eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during',sourceHash:fingerprint(row.description)};
});
const traits=tables.Detachment_abilities.filter(r=>detachments.has(r.detachment_id)).map(r=>({id:r.id,name:r.name,detachment:detachments.get(r.detachment_id).name,sourceHash:fingerprint(r.description)}));
if(detachments.size!==9||strats.length!==45||upgrades.length!==30||sheets.size!==37||traits.length!==9)throw Error('Reconcile changed Drukhari matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e export, October MFM v1.6 and publisher pack v1.2.\n'+
 'export const DRUKHARI_DETACHMENTS='+records([...detachments.values()])+'export const DRUKHARI_UPGRADES='+records(upgrades)+'export const DRUKHARI_STRATAGEMS='+records(strats)+'export const DRUKHARI_TRAITS='+records(traits));
