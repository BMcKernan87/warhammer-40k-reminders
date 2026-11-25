import {readFileSync,writeFileSync} from 'node:fs';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualPath,packTextPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-mechanicus-detachments.mjs CSV_DIR MFM_YAML PUBLISHER_PACK_TEXT OUTPUT_TS');
const {tables}=await loadExport({directory});
const mfm=parse(readFileSync(manualPath,'utf8'));
if(mfm.slug!=='adeptus-mechanicus'||mfm.version!=='1.6')throw Error('Review Adeptus Mechanicus MFM revision');
const source=tables.Source.find(s=>s.id==='000000015');
if(source?.edition!=='11'||source.version!=='1.4'||!source.errata_link.includes('eng_14-10_'))throw Error('Review Adeptus Mechanicus publisher revision');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' The ',' the ').replace(' And ',' and ');
const normalize=s=>s.toLowerCase().replace(/^the /,'').replace(/\s*\((upgrade|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'');
const detachments=new Map();
for(const det of tables.Detachments.filter(d=>d.faction_id==='AdM'&&!d.type)){
 const manual=mfm.detachments.find(d=>normalize(d.name)===normalize(det.name));
 const objectives=det.force_disposition.split(/,\s*/).map(s=>s.toUpperCase());
 if(!manual||manual.dp!==Number(det.dp)||objectives.sort().join()!==[...manual.objectives].sort().join())throw Error('MFM disagreement for '+det.name);
 const [disposition,...additional]=manual.objectives.map(title);
 detachments.set(det.id,{name:det.name,dp:manual.dp,disposition,...(manual.unique?{tag:manual.unique}:{}),...(additional.length?{additionalDispositions:additional}:{})});
}
const matchedNames=new Set(mfm.units.filter(u=>!u.legends).map(u=>normalize(u.name)));
const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='AdM'&&matchedNames.has(normalize(d.name))).map(d=>[d.id,d.name]));
const unitLinks=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
const upgrades=tables.Enhancements.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const detachment=detachments.get(row.detachment_id).name;
 const name=row.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim();
 const price=mfm.detachments.find(d=>normalize(d.name)===normalize(detachment)).enhancements.find(e=>normalize(e.name)===normalize(name));
 const units=unitLinks(tables.Datasheets_enhancements,'enhancement_id',row.id);
 if(!price||price.points!==Number(row.cost)||!units.length)throw Error('Unverified Adeptus Mechanicus enhancement '+name);
 if(!row.description&&row.id!=='000010875003')throw Error('Missing enhancement rule '+name);
 return {id:row.id,name,detachment,points:price.points,repeatable:row.upgrade==='true',units};
});
// The November CSV has the TL-4Ø9 name/price/recipient links, but omits its
// weapon table. Reconcile the normalized profile against the October v1.4
// publisher pack, p.3, instead of silently treating the upgrade as statless.
const tl49=tables.Enhancements.find(e=>e.id==='000010875003');
const pack=readFileSync(packTextPath,'utf8');
if(tl49?.name!=='TL-4Ø9'||tl49.description||!pack.includes('TECH-PRIEST model only. This model has the following weapon:')||!pack.includes('TL-4ø9 [DEVASTATING WOUNDS, HAZARDOUS]')||!/24"\s+3\s+2\+\s+11\s+-2\s+D3\+2/.test(pack))throw Error('Review publisher TL-4Ø9 weapon table');
const weapon={name:'TL-4Ø9',phase:'Shooting',range:'24',attacks:'3',skill:'2',strength:11,ap:-2,damage:'D3+2',abilities:['devastating wounds','hazardous']};
const phases=['Command','Movement','Shooting','Charge','Fight'];
const strats=tables.Stratagems.filter(r=>detachments.has(r.detachment_id)).map(row=>{
 const text=row.description.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const trigger=text.match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.split(',')[0].toLowerCase();
 if(!trigger)throw Error('Missing time on '+row.name);
 const windows=phases.filter(p=>trigger.includes(p.toLowerCase()+' phase')||/any (?:of your )?phases?/.test(trigger)).map(phase=>({
  phase,turn:phase==='Fight'&&/ or (the start of )?the fight/.test(trigger)?'either':trigger.includes('opponent')?'opponent':trigger.includes('your ')?'own':'either'
 }));
 const units=unitLinks(tables.Datasheets_stratagems,'stratagem_id',row.id);
 if(!windows.length||!units.length||!/^\d+$/.test(row.cp_cost))throw Error('Missing Adeptus Mechanicus eligibility '+row.name);
 return {id:row.id,name:row.name.trim(),detachment:detachments.get(row.detachment_id).name,cp:Number(row.cp_cost),units,windows,
  timing:/^(the )?start of/.test(trigger)?'start':trigger.startsWith('end of')?'end':'during'};
});
if(detachments.size!==10||strats.length!==51||upgrades.length!==34||sheets.size!==34)throw Error('Reconcile changed matched-play inventory');
const threat=strats.find(s=>s.id==='000010748005');
if(!threat||threat.windows[0].phase!=='Shooting')throw Error('Unquoted multiline Threat-Cogitation record was lost');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e export, October MFM v1.6 and publisher pack v1.4.\n'+
 'export const MECHANICUS_DETACHMENTS='+records([...detachments.values()])+
 'export const MECHANICUS_UPGRADES='+records(upgrades)+'export const MECHANICUS_STRATAGEMS='+records(strats)+
 'export const MECHANICUS_TL49='+JSON.stringify(weapon)+' as const;\n');
