import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualPath,packTextPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-csm-detachments.mjs CSV_DIR MFM_YAML PUBLISHER_PACK_TEXT OUTPUT_TS');
const {tables}=await loadExport({directory}),mfm=parse(readFileSync(manualPath,'utf8'));
const source=tables.Source.find(s=>s.id==='000000012');
if(mfm.slug!=='chaos-space-marines'||mfm.version!=='1.6'||source?.edition!=='11'||source.version!=='1.2')throw Error('Review Chaos Space Marine publisher/MFM revision');
const pack=readFileSync(packTextPath,'utf8');
for(const text of ['FACTION PACK: VERSION 1.2','Legal for matched play from 26th August 2026','EMPYRIC WELLSPRING','PREY ON THE WEAK','WARPED','UNIQUE: NIGHTMARE'])if(!pack.toUpperCase().includes(text.toUpperCase()))throw Error('Unverified CSM publisher pack: '+text);
const normalize=s=>s.toLowerCase().replace(/^the /,'').replace(/\s*\((upgrade|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' And ',' and ').replace(' The ',' the ');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const fingerprint=s=>createHash('sha256').update(plain(s)).digest('hex');
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='CSM'&&!d.type)){
 const manual=mfm.detachments.find(d=>normalize(d.name)===normalize(det.name));
 const objectives=det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase());
 if(!manual||manual.dp!==Number(det.dp)||objectives.sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(manual.unique?{tag:manual.unique}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const sources=new Map(tables.Source.map(s=>[s.id,s]));
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='CSM'&&!sources.get(d.source_id)?.name.includes('Legends')).map(d=>[d.id,d.name]));
const unitLinks=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const keywords=id=>tables.Datasheets_keywords.filter(k=>k.datasheet_id===id).map(k=>k.keyword.toUpperCase());
const characters=[...sheets].filter(([id])=>keywords(id).includes('CHARACTER')&&!keywords(id).includes('EPIC HERO')).map(([,name])=>name).sort();
const marks=new Map([['Eye of Tzeentch','TZEENTCH'],['Intoxicating Elixir','SLAANESH'],['Orbs of Unlife','NURGLE'],['Talisman of Burning Blood','KHORNE']]);
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name,name=row.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim();
 const price=mfm.detachments.find(d=>normalize(d.name)===normalize(detachment)).enhancements.find(e=>normalize(e.name)===normalize(name));
 let units=unitLinks(tables.Datasheets_enhancements,'enhancement_id',row.id);
 // Marks are picked during muster, so the export has no static bearer links
 // for these four enhancements. Runtime checks the selected physical bearer.
 if(detachment==='Pactbound Zealots'&&marks.has(name)){
  if(units.length||!plain(row.description).toUpperCase().startsWith('HERETIC ASTARTES '+marks.get(name)+' MODEL ONLY.'))throw Error('Review dynamic mark enhancement '+name);
  units=characters;
 }
 if(!price||price.points!==Number(row.cost)||!units.length||!row.description||row.upgrade==='true')throw Error('Unverified CSM enhancement '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:false,units,sourceHash:fingerprint(row.description)};
});
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const trigger=plain(row.description).match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing CSM time on '+row.name);
 const windows=phases.filter(p=>trigger.includes(p.toLowerCase()+' phase')||/any (?:of your )?phases?/.test(trigger)).map(phase=>({phase,turn:phase==='Fight'?/your fight phase/.test(trigger)?'own':/opponent(?:['’]s|s)? fight phase/.test(trigger)?'opponent':'either':trigger.includes('opponent')?'opponent':trigger.includes('your')?'own':'either'}));
 const units=unitLinks(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing CSM eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during',sourceHash:fingerprint(row.description)};
});
const traits=tables.Detachment_abilities.filter(r=>detachments.has(r.detachment_id)).map(r=>({id:r.id,name:r.name,detachment:detachments.get(r.detachment_id).name,sourceHash:fingerprint(r.description)}));
if(detachments.size!==17||strats.length!==93||upgrades.length!==62||sheets.size!==58||traits.length!==20)throw Error('Reconcile changed CSM matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e export, October MFM v1.6 and publisher pack v1.2.\n'+
 'export const CSM_DETACHMENTS='+records([...detachments.values()])+'export const CSM_UPGRADES='+records(upgrades)+'export const CSM_STRATAGEMS='+records(strats)+'export const CSM_TRAITS='+records(traits));
