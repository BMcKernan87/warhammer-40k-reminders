import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,manualDirectory,publisherPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-space-marine-chapters-detachments.mjs CSV_DIR MFM_DIRECTORY SPACE_MARINES_PUBLISHER_UPDATES_TEXT OUTPUT_TS');
const publisher=readFileSync(publisherPath,'utf8').replace(/\s+/g,' ');
for(const text of ['PRINTED PRODUCT UPDATES: VERSION 1.1','latest updates to rules that do not appear in print','digital-exclusive detachments'])if(!publisher.includes(text))throw Error('Review current Space Marines publisher notice: '+text);
const {tables}=await loadExport({directory});
const chapters=[
 ['Black Templars','black-templars','000000162'],
 ['Blood Angels','blood-angels','000000021'],
 ['Dark Angels','dark-angels','000000023'],
 ['Space Wolves','space-wolves','000000036'],
];
const normalize=s=>s.toLowerCase().replace(/\s*\((?:upgrade|upgarde|aura|psychic)\)/ig,'').replace(/[^a-z0-9]/g,'');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const hash=s=>createHash('sha256').update(plain(s)).digest('hex');
const title=s=>s.toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()).replace(' And ',' and ').replace(' The ',' the ');
const manual=slug=>{const m=parse(readFileSync(manualDirectory+'/'+slug+'.yaml','utf8'));if(m.slug!==slug||m.version!=='1.6')throw Error('Review '+slug+' MFM revision');return m;};
const coreNames=new Set(manual('space-marines').detachments.map(d=>normalize(d.name)));
const detachments=[],upgrades=[],stratagems=[],traits=[];
for(const [faction,slug,sourceId] of chapters){
 if(tables.Source.find(s=>s.id===sourceId)?.edition!=='11')throw Error('Review '+faction+' app edition');
 const m=manual(slug),chapterManual=m.detachments.filter(d=>!coreNames.has(normalize(d.name)));
 if(chapterManual.length!==3)throw Error('Review '+faction+' current chapter-only detachments');
 const allowedNames=new Set(m.units.map(u=>normalize(u.name)));
 const sheets=new Map(tables.Datasheets.filter(d=>d.faction_id==='SM'&&['000000139','000000362',sourceId].includes(d.source_id)&&allowedNames.has(normalize(d.name))).map(d=>[d.id,d.name]));
 const links=(table,key,id)=>[...new Set(table.filter(r=>r[key]===id&&sheets.has(r.datasheet_id)).map(r=>sheets.get(r.datasheet_id)))].sort();
 for(const md of chapterManual){
  const found=tables.Detachments.filter(d=>d.faction_id==='SM'&&!d.type&&normalize(d.name)===normalize(md.name));
  if(found.length!==1)throw Error('Missing current '+faction+' detachment '+md.name);
  const d=found[0];
  if(Number(d.dp)!==md.dp||d.force_disposition.split(/,\s*/).map(s=>s.toUpperCase()).sort().join()!==[...md.objectives].sort().join())throw Error('MFM detachment disagreement '+d.name);
  const [disposition,...additionalDispositions]=md.objectives.map(title);
  detachments.push({faction,name:d.name,dp:md.dp,disposition,...(md.unique?{tag:md.unique}:{}),...(additionalDispositions.length?{additionalDispositions}: {})});
  for(const r of tables.Detachment_abilities.filter(r=>r.detachment_id===d.id)){
   if(!r.description)throw Error('Missing chapter trait '+r.name);
   traits.push({id:r.id,faction,name:r.name,detachment:d.name,sourceHash:hash(r.description)});
  }
  for(const r of tables.Enhancements.filter(r=>r.detachment_id===d.id)){
   const name=r.name.replace(/\s*\((?:Aura|Psychic)\)/i,'').trim(),price=md.enhancements.find(e=>normalize(e.name)===normalize(name));
   // MFM v1.6 has the isolated spelling "Upgarde" on Nightforged Battery;
   // the current app and live rule both explicitly classify it as an Upgrade.
   if(/\(Upgarde\)/i.test(price?.name??'')&&r.id!=='000011095003')throw Error('Unexpected MFM Upgrade spelling '+name);
   if(!price||price.points!==Number(r.cost)||/\((?:Upgrade|Upgarde)\)/i.test(price.name)!==(r.upgrade==='true'))throw Error('Unverified chapter upgrade price/type '+name);
   const units=links(tables.Datasheets_enhancements,'enhancement_id',r.id);
   if(!units.length||!r.description)throw Error('Missing chapter upgrade eligibility '+name);
   let leaderTo;
   if(r.support_leader){
    if(r.id!=='000010269003'||!/^LEADER: WULFEN WITH STORM SHIELDS\s*, WULFEN$/i.test(plain(r.support_leader))||price.leaderTo?.map(normalize).sort().join()!==['Wulfen','Wulfen With Storm Shields'].map(normalize).sort().join())throw Error('Review special chapter attachment '+name);
    leaderTo=[...price.leaderTo];
   }
   upgrades.push({id:r.id,faction,name,detachment:d.name,points:Number(r.cost),repeatable:r.upgrade==='true',units,...(leaderTo?{leaderTo}:{}),sourceHash:hash(r.description)});
  }
  for(const r of tables.Stratagems.filter(r=>r.detachment_id===d.id)){
   const trigger=plain(r.description).match(/WHEN\s*:\s*(.*?)TARGET\s*:/i)?.[1]?.toLowerCase();
   if(!trigger)throw Error('Missing chapter Stratagem trigger '+r.name);
   const when=trigger.split(/\bwhen\b/)[0].trim(),windows=['Command','Movement','Shooting','Charge','Fight'].filter(p=>new RegExp('\\b'+p.toLowerCase()+'\\b').test(when)||/any (?:of your )?phases?/.test(when)).map(phase=>({phase,turn:phase==='Fight'?/your fight phase/.test(when)?'own':/opponent(?:['’]s|s)? fight phase/.test(when)?'opponent':'either':when.includes('opponent')?'opponent':when.includes('your')?'own':'either'}));
   const units=links(tables.Datasheets_stratagems,'stratagem_id',r.id);
   if(!windows.length||!units.length||!/^\d+$/.test(r.cp_cost))throw Error('Missing chapter Stratagem eligibility/window '+r.name);
   stratagems.push({id:r.id,faction,name:r.name.trim(),detachment:d.name,cp:Number(r.cp_cost),units,windows,timing:/^(the )?start of/.test(when)?'start':when.startsWith('end of')?'end':'during',sourceHash:hash(r.description)});
  }
 }
}
if(detachments.length!==12||traits.length!==12||stratagems.length!==48||upgrades.length!==32||upgrades.filter(u=>u.repeatable).length!==5)throw Error('Reconcile changed chapter matched-play inventory');
const records=rows=>'[\n'+rows.map(r=>'  '+JSON.stringify(r)).join(',\n')+'\n] as const;\n';
writeFileSync(output,'// Generated from November 23 11e app export and October MFM v1.6. Current Space Marines printed-product update v1.1 directs digital-exclusive rules updates to the app; no separate current chapter printed update was found.\n'+
 'export const CHAPTER_DETACHMENTS='+records(detachments)+'export const CHAPTER_UPGRADES='+records(upgrades)+'export const CHAPTER_STRATAGEMS='+records(stratagems)+'export const CHAPTER_TRAITS='+records(traits));
