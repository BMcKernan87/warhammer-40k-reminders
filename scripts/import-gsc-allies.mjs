import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';
import {loadExport,modelProfile,rosterMetadata} from './import-wahapedia-11e.mjs';
import {readPrices} from './import-imperial-knights.mjs';

const [csv,directory,out]=process.argv.slice(2);
if(!out)throw Error('Usage: node scripts/import-gsc-allies.mjs CSV_DIR MFM_AND_40KDC_SOURCE_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const text=file=>readFileSync(join(directory,file),'utf8');
const key=s=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]/g,'');
const guardExcluded=['AIRCRAFT','COMMISSAR','EPIC HERO','MILITARUM TEMPESTUS','OGRYN','RATLING','RATLINGS','TECH-PRIEST ENGINSEER','MINISTORUM PRIEST'];
const tyranidExcluded=['AIRCRAFT','BROODLORD','GENESTEALERS'];
const proxies=tables.Datasheets.filter(d=>d.faction_id==='GC');
const costRows=id=>tables.Datasheets_models_cost.filter(r=>r.datasheet_id===id);
const outSheets=[],outCore={},guardCards={};
for(const [slug,id,excluded] of [['astra-militarum','AM',guardExcluded],['tyranids','TYR',tyranidExcluded]]){
 const manual=parse(text(slug+'.yaml')),units=JSON.parse(text(slug+'-units.json'));
 const compositions=JSON.parse(text(slug+'-unit-compositions.json'));
 if(manual.slug!==slug||manual.version!=='1.6')throw Error('Review matched-play manual '+slug);
 const selected=[];
 for(const price of manual.units.filter(u=>!u.legends&&!u.groupTitle)){
  const rows=tables.Datasheets.filter(d=>d.faction_id===id&&key(d.name)===key(price.name));
  if(rows.length!==1)throw Error(price.name+' has no unique native source');
  const d=rows[0],tags=tables.Datasheets_keywords.filter(k=>k.datasheet_id===d.id).map(k=>k.keyword.toUpperCase());
  if(excluded.some(tag=>tags.includes(tag))||id==='TYR'&&!tags.includes('VANGUARD INVADER'))continue;
  selected.push({d,price});
 }
 for(const {d,price} of selected){
  const copies=proxies.filter(s=>s.name===d.name);
  if(copies.length!==1)throw Error(d.name+' missing GSC ally card or duplicate source');
  const costs=readPrices(costRows(d.id),d.name,price);
  if(!isDeepStrictEqual(costs,readPrices(costRows(copies[0].id),d.name,price)))throw Error(d.name+' allied points differ');
  const source=tables.Source.find(s=>s.id===d.source_id);
  // The native Death Korps export retains the old book ID. Its current 11e
  // Cult proxy provides the present card, with independently matched MFM prices.
  const card=source?.edition==='11'||d.name==='Cyclops Demolition Vehicle'?d:copies[0];
  const cardSource=tables.Source.find(s=>s.id===card.source_id);
  if(cardSource?.edition!=='11'&&!(card.name==='Cyclops Demolition Vehicle'&&cardSource?.name==='Astra Militarum (Forge World)'))throw Error(d.name+' missing current-edition card');
  const relations=units.filter(u=>key(u.name)===key(d.name)&&u.external_refs?.some(r=>r.namespace==='mfm'));
  if(relations.length!==1)throw Error('Missing relational MFM identity '+d.name);
  const c=compositions.find(r=>r.unit_id===relations[0].id);
  if(c?.game_version.edition!=='11th'||c.game_version.dataslate!==manual.firstSeen)throw Error(d.name+' missing current composition');
  const compositionBySize={};
  for(const tier of c.tiers??[{models:c.models}]){
   let variants=[{}];
   for(const m of tier.models){
    if(!Number.isInteger(m.min)||!Number.isInteger(m.max)||m.min<0||m.min>m.max)throw Error(d.name+' invalid model count');
    variants=variants.flatMap(v=>Array.from({length:m.max-m.min+1},(_,i)=>({...v,[m.name]:(v[m.name]??0)+m.min+i})));
   }
   for(const v of variants){
    const total=Object.values(v).reduce((a,b)=>a+b,0);
    if(compositionBySize[total]&&!isDeepStrictEqual(compositionBySize[total],v))throw Error(d.name+' ambiguous legal composition '+total);
    compositionBySize[total]=v;
   }
  }
  const legal=Object.keys(compositionBySize).map(Number);
  if(legal[0]!==costs.sizes[0]||legal.at(-1)!==costs.sizes.at(-1)||costs.sizes.some(n=>!legal.includes(n)))throw Error(d.name+' points and model counts disagree');
  const roles=[...new Set(Object.values(compositionBySize).flatMap(Object.keys))];
  const composition=roles.map((model,index)=>{
   const counts=Object.values(compositionBySize).map(v=>v[model]??0),min=Math.min(...counts),max=Math.max(...counts);
   return {datasheet_id:d.id,line:String(index+1),description:(min===max?min:min+'-'+max)+' '+model};
  });
  const metadata=rosterMetadata({...tables,Datasheets_unit_composition:composition},d.name,d.id);
  const profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===card.id);
  if(!profiles.length)throw Error(d.name+' missing profile');
  const stats=profiles.length===1?{profile:modelProfile(profiles[0],d.name)}:{modelProfiles:Object.fromEntries(profiles.map(m=>[m.name,modelProfile(m,d.name)]))};
  const allowed=new Set(selected.map(r=>r.d.name));
  const bodyguards=(price.supportTo??price.leaderTo??[]).map(n=>[...allowed].find(a=>key(a)===key(n))).filter(Boolean).sort();
  const edges=new Set(tables.Datasheets_leader.filter(l=>l.leader_id===d.id).map(l=>l.attached_id));
  const checked=selected.filter(s=>edges.has(s.d.id)).map(s=>s.d.name).sort();
  if(!isDeepStrictEqual(checked,bodyguards))throw Error(d.name+' native Leader edges differ between sources');
  const attachment=price.supportTo||bodyguards.length?{attachmentRole:price.supportTo?'support':'leader',bodyguards}:{};
  const core=tables.Datasheets_abilities.filter(row=>row.datasheet_id===card.id&&row.type==='Core').map(row=>row.name||tables.Abilities.find(a=>a.id===row.ability_id)?.name);
  if(core.some(n=>!n))throw Error(d.name+' unresolved core ability');
  outCore[d.name]=core;
  if(slug==='astra-militarum'){
   const rows=tables.Datasheets_abilities.filter(a=>a.datasheet_id===card.id);
   // September v1.3 removes the Kasrkin power-weapon profile. Its equipment
   // option is still printed; it cannot supply an attack profile on the sheet.
   const weapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===card.id&&w.name&&!(d.name==='Kasrkin'&&w.name.toLowerCase()==='power weapon'));
   const weaponFamily=name=>name.split(/\s+[-–—]\s+/)[0].toLowerCase();
   const linkedName=a=>a.name||tables.Abilities.find(k=>k.id===a.ability_id)?.name;
   const saves=profiles.filter(p=>/^\d+$/.test(p.inv_sv)).map(p=>({model:p.name,save:Number(p.inv_sv),restriction:p.inv_sv_descr}));
   // Allied proxies often omit the native damage bracket. Check the actual
   // native card before falling back to a proxy with an explicit rule.
   const damageSource=source?.edition==='11'&&d.damaged_w?d:card;
   const threshold=damageSource.damaged_w.match(/^1[-–](\d+)$/);
   const reducedOC=damageSource.damaged_description.match(/subtract (\d+) from its Objective Control characteristic/i);
   if(damageSource.damaged_w&&(!threshold||!damageSource.damaged_description.includes('subtract 1 from the Hit roll')))throw Error(d.name+' has an unrecognised damaged profile');
   guardCards[d.name]={source:card.link,saves,...(threshold?{damage:{threshold:Number(threshold[1]),oc:Number(reducedOC?.[1]??0),source:damageSource.link}}:{}),
    core:rows.filter(a=>a.type==='Core').map(a=>[linkedName(a),a.parameter].filter(Boolean).join(' ')),
    named:rows.filter(a=>['Datasheet','Wargear','Wargear profile'].includes(a.type)&&a.name!=='One Shot').map(a=>a.name),
    weapons:weapons.map(w=>({name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',abilities:w.description?w.description.split(/,\s*/):[],
     ...(weapons.some(v=>v!==w&&v.name!==w.name&&weaponFamily(v.name)===weaponFamily(w.name))?{mode:true}:{})}))};
  }
  outSheets.push({faction:'Genestealer Cults',unit:d.name,source:card.link,pointsSource:'https://mfm.warhammer-community.com/en/'+slug,verified:'sizes-and-points',...costs,...metadata,compositionBySize,...stats,...attachment});
 }
}
const nativeCult=parse(text('genestealer-cults.yaml'));
if(nativeCult.version!=='1.6'||nativeCult.units.some(u=>outSheets.some(s=>key(s.unit)===key(u.name))))throw Error('Review allied points override in updated GSC MFM');
outSheets.sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
writeFileSync(out,"// Generated by scripts/import-gsc-allies.mjs from MFM v1.6 and the November 23 11e export.\nimport type {Datasheet2026} from './datasheets-2026';\nexport const GSC_ALLIED_SHEETS:readonly Datasheet2026[]=[\n"+outSheets.map(s=>' '+JSON.stringify(s)).join(',\n')+"\n];\nexport const GSC_ALLIED_CORE:Readonly<Record<string,readonly string[]>>="+JSON.stringify(outCore,null,1)+";\n");

if(Object.keys(guardCards).length!==52)throw Error('Review Guard ally inventory');
writeFileSync(join(out,'..','brood-brother-cards.generated.ts'),"// Generated alongside the allied roster by scripts/import-gsc-allies.mjs.\nimport type {BroodBrotherCard} from './brood-brother-reminders';\nexport const GUARD_CARDS: Readonly<Record<string,BroodBrotherCard>>={\n"+Object.entries(guardCards).sort(([a],[b])=>a.localeCompare(b,'en')).map(([name,card])=>' '+JSON.stringify(name)+':'+JSON.stringify(card)).join(',\n')+'\n};\n');
