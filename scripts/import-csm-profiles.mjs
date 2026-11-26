import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadExport} from './import-wahapedia-11e.mjs';
import {csmWeapons} from './import-csm-relational.mjs';

const [csv,directory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-csm-profiles.mjs CSV_DIR RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const read=name=>JSON.parse(readFileSync(join(directory,name+'.json'),'utf8'));
const units=read('units'),weaponIndex=new Map(csmWeapons(read('weapons')).map(w=>[w.id,w]));
const key=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=name=>name.split(/\s+[-–—]\s+/)[0];
function fullWeapons(sheet,unit,index){
 const printedWeapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===sheet.id&&w.name);
 const independent=new Map();
 for(const id of new Set(unit.weapon_ids)){
  const item=index.get(id);
  if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!=='2026-10-14')throw Error('Missing current 11e weapon '+id);
  for(const p of item.profiles){
   const mode=p.name,name=key(mode)===key(item.name)||['ranged','melee'].includes(mode.toLowerCase())?item.name:item.name+' '+mode;
   const phase=p.range==='Melee'?'Melee':'Ranged',id=phase+key(name);
   if(independent.has(id))throw Error('Ambiguous weapon profile '+sheet.name+' / '+name);
   independent.set(id,p);
  }
 }
 const weapons=printedWeapons.map(w=>{
  const id=w.type+key(w.name),p=independent.get(id);
  if(!p)throw Error('Missing independent profile for '+sheet.name+' / '+w.name);
  const abilities=w.description?w.description.split(/,\s*/).map(a=>a.toLowerCase()):[];
  const expected=(p.keywords??[]).map(k=>key(k.keyword_id+' '+Object.values(k.parameters??{}).join(' '))).sort();
  if(JSON.stringify(abilities.map(key).sort())!==JSON.stringify(expected))throw Error('Compare weapon abilities '+sheet.name+' / '+w.name);
  for(const [column,value] of [['range',p.range],['a',p.stats.A],['bs_ws',p.stats.BS??p.stats.WS??'-'],['s',p.stats.S],['ap',p.stats.AP],['d',p.stats.D]]){
   const printed=column==='ap'&&w[column]==='-'?'0':w[column];
   if(String(value)!==printed)throw Error('Review '+sheet.name+' / '+w.name+' '+column+': '+w[column]+' vs '+value);
  }
  return {name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',range:w.range,attacks:w.a,skill:w.bs_ws,strength:Number(w.s),ap:w.ap==='-'?0:Number(w.ap),damage:w.d,abilities,...(base(w.name)!==w.name?{mode:true}:{})};
 });
 if(independent.size!==weapons.length)throw Error('Unmatched weapon profiles on '+sheet.name);
 return weapons;
}
const source=tables.Source.find(s=>s.id==='000000012'&&s.name==='Chaos Space Marines'&&s.edition==='11'&&s.version==='1.2');
if(!source)throw Error('Review CSM native profile source');
const native=tables.Datasheets.filter(s=>s.faction_id==='CSM'&&s.source_id===source.id),cards={};
for(const sheet of native){
 const matches=units.filter(u=>key(u.name)===key(sheet.name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(matches.length!==1)throw Error('No current matched-play identity for '+sheet.name);
 const unit=matches[0],profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===sheet.id);
 let save=null,modelSaves;
 if(sheet.name==='Traitor Enforcer'){
  // The independent card repeats the Enforcer's 5++ on the Ogryn. The
  // printed current card explicitly restricts it to the Enforcer model.
  // https://wahapedia.ru/wh40k11ed/factions/chaos-space-marines/Traitor-Enforcer
  if(profiles.length!==2||profiles[0].name!=='TRAITOR ENFORCER'||profiles[0].inv_sv!=='5'||profiles[0].inv_sv_descr!=='* Traitor Enforcer model only.'||profiles[1].name!=='TRAITOR OGRYN'||profiles[1].inv_sv!=='-'||profiles[1].inv_sv_descr||unit.profiles.some(p=>p.invuln_sv!==5))throw Error('Review personal Traitor Enforcer save');
  modelSaves={'Traitor Enforcer':5,'Traitor Ogryn':null};
 }else{
  const saves=[...new Set(profiles.map(p=>p.inv_sv))];
  if(saves.length!==1||profiles.some(p=>p.inv_sv_descr))throw Error('Review separate or conditional saves for '+sheet.name);
  save=saves[0]==='-'?null:Number(saves[0]);
  if(unit.profiles.some(p=>(p.invuln_sv??null)!==save))throw Error('Invulnerable saves differ for '+sheet.name);
 }
 const core=tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Core').map(a=>{
  const name=a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name;
  if(!name)throw Error('Unknown core ability on '+sheet.name);
  const ability=unit.ability_ids.find(v=>key(typeof v==='string'?v:v.id)===key(name));
  if(!ability||key(a.parameter)!==key(String(typeof ability==='string'?'':ability.value)))throw Error('Core data differ for '+sheet.name+': '+name);
  return [name,a.parameter].filter(Boolean).join(' ');
 });
 const weapons=fullWeapons(sheet,unit,weaponIndex);
 const bracket=sheet.damaged_w.match(/^1[-–](\d+)$/),rule=sheet.damaged_description;
 const damage=bracket?{threshold:Number(bracket[1]),oc:Number(rule.match(/subtract (\d+) from this model.s Objective Control/i)?.[1]??0)}:null;
 if(sheet.damaged_w&&(!damage||!rule.includes('subtract 1 from the Hit roll')))throw Error('Review damaged profile for '+sheet.name);
 cards[sheet.name]={source:sheet.link,save,...(modelSaves?{modelSaves}:{}),rangedSave:false,demise:core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length)??null,core,damage,conversion:null,weapons};
}
if(Object.keys(cards).length!==54)throw Error('Review CSM profile inventory');
// The same pinned independent revision supplies each Cult's native units.json
// and weapons.json under RELATIONAL_DATA_DIR/cults/<faction>/. Keeping these
// separate preserves the 54-card native muster and its own Dark Pacts scope.
const cults={};
for(const [name,faction,slug,sourceId,count] of [
 ['Khorne Berzerkers','WE','world-eaters','000000210',5],
 ['Rubric Marines','TS','thousand-sons','000000027',8],
 ['Plague Marines','DG','death-guard','000000014',14],
 ['Noise Marines','EC','emperors-children','000000280',6],
]){
 const sheets=tables.Datasheets.filter(s=>s.faction_id==='CSM'&&s.source_id===sourceId&&s.name===name);
 const original=tables.Datasheets.filter(s=>s.faction_id===faction&&s.source_id===sourceId&&s.name===name);
 if(sheets.length!==1||original.length!==1)throw Error('Review Cult identity '+name);
 const readCult=file=>JSON.parse(readFileSync(join(directory,'cults',slug,file+'.json'),'utf8'));
 const units=readCult('units').filter(u=>key(u.name)===key(name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(units.length!==1)throw Error('Review independent Cult identity '+name);
 const index=new Map(readCult('weapons').map(w=>[w.id,w])),weapons=fullWeapons(sheets[0],units[0],index);
 const normalized=ws=>ws.map(w=>JSON.stringify(w)).sort().join('\n');
 if(weapons.length!==count||normalized(weapons)!==normalized(fullWeapons(original[0],units[0],index)))throw Error('Cult and original faction profiles differ for '+name);
 cults[name]=weapons;
}
writeFileSync(destination,"// Generated by scripts/import-csm-profiles.mjs using both current 11e profile sources.\nimport type {KnightCardStats} from './knight-card-rules';\n"+
 "export type CsmCardStats=Omit<KnightCardStats,'weapons'>&{modelSaves?:Readonly<Record<string,number|null>>;weapons:readonly (KnightCardStats['weapons'][number]&{range:string;attacks:string;skill:string;damage:string})[]};\n"+
 'export const CSM_CARDS:Readonly<Record<string,CsmCardStats>>={\n'+Object.entries(cards).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>' '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n};\n'+
 'export const CSM_CULT_WEAPONS:Readonly<Record<string,CsmCardStats[\'weapons\']>>={\n'+Object.entries(cults).map(([k,v])=>' '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n};\n');
