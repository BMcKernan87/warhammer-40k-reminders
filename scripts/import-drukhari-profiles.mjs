import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadExport} from './import-wahapedia-11e.mjs';
import {drukhariWeapons} from './import-drukhari-relational.mjs';

const [csv,directory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-drukhari-profiles.mjs CSV_DIR RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const read=(slug,name)=>JSON.parse(readFileSync(join(directory,slug,name+'.json'),'utf8'));
const key=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=name=>name.split(/\s+[-–—]\s+/)[0];
const alliedNames=tables.Datasheets.filter(s=>s.faction_id==='DRU'&&s.source_id==='000000186').map(s=>s.name);
const cards={};
for(const [slug,faction,sourceId,version,count] of [['drukhari','DRU','000000031','1.2',23],['aeldari','AE','000000186','1.4',14]]){
 const source=tables.Source.find(s=>s.id===sourceId&&s.edition==='11'&&s.version===version);
 if(!source)throw Error('Review Drukhari/allied profile source');
 const sheets=tables.Datasheets.filter(s=>s.faction_id===faction&&s.source_id===sourceId&&(slug==='drukhari'||alliedNames.includes(s.name)));
 if(sheets.length!==count)throw Error('Review Drukhari/allied card count');
 const units=read(slug,'units'),index=new Map((slug==='drukhari'?drukhariWeapons(read(slug,'weapons')):read(slug,'weapons')).map(w=>[w.id,w]));
 for(const sheet of sheets){
  const matches=units.filter(u=>key(u.name)===key(sheet.name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
  if(matches.length!==1)throw Error('No current independent profile for '+sheet.name);
  const unit=matches[0],profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===sheet.id);
  const saves=[...new Set(profiles.map(p=>p.inv_sv))];
  if(saves.length!==1)throw Error('Review mixed invulnerable saves '+sheet.name);
  const save=saves[0]==='-'?null:Number(saves[0]),conditional=profiles.some(p=>p.inv_sv_descr);
  let extra={};
  if(sheet.name==='Archon'){
   if(save!==2||profiles[0].inv_sv_descr!=='* See Shadowfield ability (below)')throw Error('Review Shadowfield save');
   extra.conditionalSave='Shadowfield';
  }else if(sheet.name==='Wyches'){
   if(save!==6||profiles[0].inv_sv_descr!=='* 4+ against melee attacks'||unit.profiles[0].invuln_sv!==null)throw Error('Review Wych melee save');
   // The independent card omits its split ranged/melee save. The current
   // printed card explicitly supplies 6+ and 4+ respectively.
   extra.meleeSave=4;
  }else if(conditional)throw Error('Review conditional save '+sheet.name);
  if(sheet.name!=='Wyches'&&unit.profiles.some(p=>(p.invuln_sv??null)!==save))throw Error('Independent save differs '+sheet.name);
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
   if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!=='2026-10-14')throw Error('Missing current weapon '+id);
   for(const p of item.profiles){
    const mode=item.id==='executioners-demiklaives'&&p.name==='Dual blade'?'Dual blades':item.id==='razorwing-missiles'&&p.name==='Necrotoxin missiles'?'Neurotoxin missiles':p.name;
    const itemName=item.id==='torturers-tool'&&item.name==='Torturer’s tool'?'Torturer’s tools':item.name;
    const name=key(mode)===key(item.name)||['ranged','melee'].includes(mode.toLowerCase())?itemName:itemName+' '+mode;
    const phase=p.range==='Melee'?'Melee':'Ranged',id=phase+key(name);
    if(independent.has(id))throw Error('Ambiguous independent profile '+sheet.name+' / '+name);
    independent.set(id,p);
   }
  }
  const weapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===sheet.id&&w.name).map(w=>{
   const p=independent.get(w.type+key(w.name));
   if(!p)throw Error('Missing independent profile '+sheet.name+' / '+w.name);
   const abilities=w.description?w.description.split(/,\s*/).map(a=>a.toLowerCase()):[];
   const expected=(p.keywords??[]).map(k=>key(k.keyword_id+' '+Object.values(k.parameters??{}).join(' '))).sort();
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
  cards[sheet.name]={source:sheet.link,save,...extra,rangedSave:false,demise:core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length)??null,core,damage,conversion:null,weapons};
 }
}
writeFileSync(destination,"// Generated by scripts/import-drukhari-profiles.mjs; every profile reconciled to two current 11e sources.\nimport type {KnightCardStats} from './knight-card-rules';\n"+
 "export type DrukhariCardStats=Omit<KnightCardStats,'weapons'>&{conditionalSave?:'Shadowfield';meleeSave?:number;weapons:readonly (KnightCardStats['weapons'][number]&{range:string;attacks:string;skill:string;damage:string})[]};\n"+
 'export const DRUKHARI_CARDS:Readonly<Record<string,DrukhariCardStats>>={\n'+Object.entries(cards).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>' '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n};\n');
