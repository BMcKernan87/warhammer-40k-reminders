import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadExport} from './import-wahapedia-11e.mjs';
import {aeldariWeapons} from './import-aeldari-relational.mjs';

const [csv,directory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-aeldari-profiles.mjs CSV_DIR RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const read=(slug,name)=>JSON.parse(readFileSync(join(directory,slug,name+'.json'),'utf8'));
const key=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=name=>name.split(/\s+[-–—]\s+/)[0];
const cards={};
for(const [slug,faction,sourceId,version,count] of [['aeldari','AE','000000186','1.4',74],['aeldari','AE','000000367','',2]]){
 const source=tables.Source.find(s=>s.id===sourceId&&s.version===version);
 if(!source||(sourceId==='000000186'&&source.edition!=='11'))throw Error('Review current Aeldari profile source');
 const sheets=tables.Datasheets.filter(s=>s.faction_id===faction&&s.source_id===sourceId);
 if(sheets.length!==count)throw Error('Review Aeldari card count');
 const units=read(slug,'units'),index=new Map(aeldariWeapons(read(slug,'weapons')).map(w=>[w.id,w]));
 for(const sheet of sheets){
  const matches=units.filter(u=>key(u.name)===key(sheet.name==='Vypers'?'Vyper':sheet.name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
  if(matches.length!==1)throw Error('No current independent profile for '+sheet.name);
  const unit=matches[0],profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===sheet.id);
  const saves=[...new Set(profiles.map(p=>p.inv_sv))];
  if(saves.length!==1)throw Error('Review mixed invulnerable saves '+sheet.name);
  const save=saves[0]==='-'?null:Number(saves[0]),conditional=profiles.some(p=>p.inv_sv_descr);
  let extra={};
  if(sheet.name==='Ynnari Archon'){
   if(save!==2||profiles[0].inv_sv_descr!=='* See Shadow Field ability (below)')throw Error('Review Ynnari Shadow Field save');
   extra.conditionalSave='Shadow Field';
  }else if(['Howling Banshees','Ynnari Wyches'].includes(sheet.name)){
   if(save!==(sheet.name==='Howling Banshees'?5:6)||profiles.some(p=>!p.inv_sv_descr.includes('4+ against melee')))throw Error('Review split melee save '+sheet.name);
   extra.meleeSave=4;
  }else if(conditional){
   if(profiles.some(p=>p.inv_sv_descr!=='* Against ranged attacks only'))throw Error('Review conditional save '+sheet.name);
   extra.rangedSave=true;
  }
  if(unit.profiles.some(p=>(p.invuln_sv??p.invuln_sv_ranged??null)!==save))throw Error('Independent save differs '+sheet.name);
  const core=tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Core').map(a=>{
   const name=a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name;
   if(!name)throw Error('Unknown core ability '+sheet.name);
   const ability=unit.ability_ids.find(v=>key(typeof v==='string'?v:v.id)===key(name));
   if(!ability||key(a.parameter)!==key(String(typeof ability==='string'?'':ability.value)))throw Error('Core ability differs '+sheet.name+' / '+name);
   return [name,a.parameter].filter(Boolean).join(' ');
  });
  const independent=new Map();
  for(const id of new Set(unit.weapon_ids)){
   const item=index.get(id);
   // The relational adapter explicitly guards the three inherited revision labels.
   if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!=='2026-10-14')throw Error('Missing audited weapon '+id);
   for(const p of item.profiles){
    const mode=p.name;
    const itemName=({'The Staff of Ulthamar and witchblade':'Staff of Ulthamar and witchblade','The Fire Axe':'Fire Axe','Kha-vir, the Sword of Sorrows':'Kha-vir'})[item.name]??item.name;
    const name=key(mode)===key(item.name)||['ranged','melee'].includes(mode.toLowerCase())?itemName:itemName+' '+mode;
    const phase=p.range==='Melee'?'Melee':'Ranged',id=phase+key(name);
    if(independent.has(id))throw Error('Ambiguous independent profile '+sheet.name+' / '+name);
    independent.set(id,p);
   }
  }
  const weapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===sheet.id&&w.name).map(w=>{
   const p=independent.get(w.type+key(w.name));
   if(!p)throw Error('Missing independent profile '+sheet.name+' / '+w.name);
   const abilities=w.description?w.description.split(/,\s*/).map(a=>a.toLowerCase()).flatMap(a=>a==='anti-monster/vehicle 3+'?['anti-monster 3+','anti-vehicle 3+']:[a]):[];
   const expected=(p.keywords??[]).map(k=>key(k.keyword_id+(k.parameters?.excluded_target_keywords?' non '+k.parameters.excluded_target_keywords.join('/')+' '+(k.parameters.threshold??''):' '+Object.values(k.parameters??{}).join(' ')))).sort();
   if(JSON.stringify(abilities.map(key).sort())!==JSON.stringify(expected))throw Error('Weapon abilities differ '+sheet.name+' / '+w.name+': '+JSON.stringify({abilities,expected}));
   for(const [column,value] of [['range',p.range],['a',p.stats.A],['bs_ws',p.stats.BS??p.stats.WS??'-'],['s',p.stats.S],['ap',p.stats.AP],['d',p.stats.D]]){
    const printed=column==='ap'&&w[column]==='-'?'0':w[column];
    if(String(value)!==printed)throw Error('Weapon stat differs '+sheet.name+' / '+w.name+' / '+column+': '+w[column]+' vs '+value);
   }
   return {name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',range:w.range,attacks:w.a,skill:w.bs_ws,strength:Number(w.s),ap:w.ap==='-'?0:Number(w.ap),damage:w.d,abilities,...(base(w.name)!==w.name?{mode:true}:{})};
  });
  if(independent.size!==weapons.length)throw Error('Unmatched independent weapons '+sheet.name);
  const bracket=sheet.damaged_w.match(/^1[-–](\d+)$/),rule=sheet.damaged_description;
  const damage=bracket?{threshold:Number(bracket[1]),oc:Number(rule.match(/subtract (\d+) from this model.s Objective Control/i)?.[1]??0)}:null;
  if(sheet.damaged_w&&(!damage||!rule.includes('subtract 1 from the Hit roll')))throw Error('Review damaged profile '+sheet.name);
  cards[sheet.name]={source:sheet.link,save,rangedSave:false,...extra,factionAbilities:tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Faction').map(a=>a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name),demise:core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length)??null,core,damage,conversion:null,weapons};
 }
}
writeFileSync(destination,"// Generated by scripts/import-aeldari-profiles.mjs; current profiles reconciled to independently extracted unit cards; see source inventory for inherited weapon revision labels.\nimport type {KnightCardStats} from './knight-card-rules';\n"+
 "export type AeldariCardStats=Omit<KnightCardStats,'weapons'>&{conditionalSave?:'Shadow Field';meleeSave?:number;factionAbilities:readonly string[];weapons:readonly (KnightCardStats['weapons'][number]&{range:string;attacks:string;skill:string;damage:string})[]};\n"+
 'export const AELDARI_CARDS:Readonly<Record<string,AeldariCardStats>>={\n'+Object.entries(cards).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>' '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n};\n');
