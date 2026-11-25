import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadExport} from './import-wahapedia-11e.mjs';
import {tyranidWeapons} from './import-tyranid-relational.mjs';

const [csv,directory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-tyranid-profiles.mjs CSV_DIR RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const read=name=>JSON.parse(readFileSync(join(directory,name+'.json'),'utf8'));
const units=read('units'),weaponIndex=new Map(tyranidWeapons(read('weapons')).map(w=>[w.id,w]));
const key=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=name=>name.split(/\s+[-–—]\s+/)[0];
const source=tables.Source.find(s=>s.id==='000000020'&&s.name==='Tyranids'&&s.edition==='11'&&s.version==='1.3');
if(!source)throw Error('Review the current Tyranid 11th edition faction pack');
const native=tables.Datasheets.filter(s=>s.faction_id==='TYR'&&(s.source_id===source.id||s.source_id==='000000380'&&['Harridan','Hierophant'].includes(s.name))),cards={};
for(const sheet of native){
 const matches=units.filter(u=>key(u.name)===key(sheet.name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(matches.length!==1)throw Error('No current matched-play identity for '+sheet.name);
 const unit=matches[0],profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===sheet.id);
 const saves=[...new Set(profiles.map(p=>p.inv_sv))];
 if(saves.length!==1||profiles.some(p=>p.inv_sv_descr))throw Error('Review separate or conditional saves for '+sheet.name);
 const save=saves[0]==='-'?null:Number(saves[0]);
 if(unit.profiles.some(p=>(p.invuln_sv??null)!==save))throw Error('Invulnerable saves differ for '+sheet.name);
 const core=tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Core').map(a=>{
  const name=a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name;
  if(!name)throw Error('Unknown core ability on '+sheet.name);
  const ability=unit.ability_ids.find(v=>key(typeof v==='string'?v:v.id)===key(name));
  if(!ability||key(a.parameter)!==key(String(typeof ability==='string'?'':ability.value)))throw Error('Core data differ for '+sheet.name+': '+name);
  return [name,a.parameter].filter(Boolean).join(' ');
 });
 const printedWeapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===sheet.id&&w.name);
 const independent=new Map();
 for(const id of new Set(unit.weapon_ids)){
  const item=weaponIndex.get(id);
  if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!=='2026-10-14')throw Error('Missing current 11e weapon '+id);
  for(const p of item.profiles){
   const mode=p.name,printedBase=item.id==='genestealers-claws-and-talons'?'Genestealer claws and talons':item.name;
   const name=key(mode)===key(item.name)||['ranged','melee'].includes(mode.toLowerCase())?printedBase:printedBase+' '+mode;
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
  if(JSON.stringify(abilities.map(key).sort())!==JSON.stringify(expected))throw Error('Compare native abilities '+sheet.name+' / '+w.name);
  for(const [column,value] of [['range',p.range],['a',p.stats.A],['bs_ws',p.stats.BS??p.stats.WS??'-'],['s',p.stats.S],['ap',p.stats.AP],['d',p.stats.D]]){
   const printed=column==='ap'&&w[column]==='-'?'0':w[column];
   if(String(value)!==printed)throw Error('Review '+sheet.name+' / '+w.name+' '+column+': '+w[column]+' vs '+value);
  }
  return {name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',range:w.range,attacks:w.a,skill:w.bs_ws,strength:Number(w.s),ap:w.ap==='-'?0:Number(w.ap),damage:w.d,abilities,...(base(w.name)!==w.name?{mode:true}:{})};
 });
 if(independent.size!==weapons.length)throw Error('Unmatched native weapon profiles on '+sheet.name);
 const bracket=sheet.damaged_w.match(/^1[-–](\d+)$/),rule=sheet.damaged_description;
 let damage=bracket?{threshold:Number(bracket[1]),oc:Number(rule.match(/subtract (\d+) from this model.s Objective Control/i)?.[1]??0)}:null;
 if(sheet.damaged_w&&(!damage||!rule.includes('subtract 1 from the Hit roll')))throw Error('Review damaged profile for '+sheet.name);
 cards[sheet.name]={source:sheet.link,save,rangedSave:false,demise:core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length)??null,
  core,damage,conversion:null,weapons};
}
if(Object.keys(cards).length!==52)throw Error('Review Tyranid profile inventory');
writeFileSync(destination,"// Generated by scripts/import-tyranid-profiles.mjs using both current 11e profile sources.\nimport type {KnightCardStats} from './knight-card-rules';\n"+
 "export type TyranidCardStats=Omit<KnightCardStats,'weapons'>&{weapons:readonly (KnightCardStats['weapons'][number]&{range:string;attacks:string;skill:string;damage:string})[]};\n"+
 'export const TYRANID_CARDS:Readonly<Record<string,TyranidCardStats>>={\n'+Object.entries(cards).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>' '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n};\n');
