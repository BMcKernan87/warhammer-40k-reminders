import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadExport} from './import-wahapedia-11e.mjs';

export async function importFactionProfiles({label,faction,sourceId,count,constant,script,verifyWeapon,publisherSaves={},battlefieldWeapons={},battlefieldConstant,missingCore={}},[csv,relational,destination]){
if(!destination)throw Error('Usage: node '+script+' CSV_DIR FACTION_40KDC_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const read=name=>JSON.parse(readFileSync(join(relational,name+'.json'),'utf8'));
const units=read('units'),weaponIndex=new Map(read('weapons').map(w=>[w.id,w]));
const key=s=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=name=>name.split(/\s+[-–—]\s+/)[0];
const source=tables.Source.find(s=>s.id===sourceId&&s.name===label&&s.edition==='11');
if(!source)throw Error('Expected the native 11th edition '+label+' source');
const native=tables.Datasheets.filter(s=>s.faction_id===faction&&s.source_id===source.id),cards={},replacements={};
for(const sheet of native){
 const matches=units.filter(u=>key(u.name)===key(sheet.name)&&!u.is_legend&&u.game_version.edition==='11th'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(matches.length!==1)throw Error('No current matched-play identity for '+sheet.name);
 const unit=matches[0],profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===sheet.id);
 const saves=[...new Set(profiles.map(p=>p.inv_sv))];
 if(saves.length!==1||profiles.some(p=>p.inv_sv_descr))throw Error('Review separate or conditional profile saves for '+sheet.name);
 const save=saves[0]==='-'?null:Number(saves[0]);
 if(unit.profiles.some(p=>(p.invuln_sv??publisherSaves[sheet.name]??null)!==save))throw Error('Invulnerable saves differ for '+sheet.name);
 const core=tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Core').map(a=>{
  const name=a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name;
  if(!name)throw Error('Unknown core ability on '+sheet.name);
  const ability=unit.ability_ids.find(v=>key(typeof v==='string'?v:v.id)===key(name));
  const knownOmission=!ability&&missingCore[sheet.name]?.includes(name)&&!a.parameter;
  if(!knownOmission&&(!ability||key(a.parameter)!==key(String(typeof ability==='string'?'':ability.value))))throw Error('Core data differ for '+sheet.name+': '+name);
  return [name,a.parameter].filter(Boolean).join(' ');
 });
 const independent=new Map(),extra=battlefieldWeapons[sheet.name]??{};
 for(const id of new Set([...unit.weapon_ids,...Object.keys(extra)])){
  const item=weaponIndex.get(id);
  if(!item||item.game_version.edition!=='11th')throw Error('Missing 11e weapon '+id);
  for(const p of item.profiles){
   const name=key(p.name)===key(item.name)?item.name:item.name+' '+p.name;
   const nameKey=key(name).replace('juggernautsbladedhorn','bladedhorn');
   const abilities=(p.keywords??[]).map(k=>key(k.keyword_id+' '+Object.values(k.parameters??{}).join(' '))).sort();
   independent.set(nameKey,abilities);
   if(extra[id]){
    // A replacement after a battlefield ability is absent from the muster kit.
    (replacements[sheet.name]??=[]).push({model:extra[id],name:item.name,phase:item.type==='melee'?'Fight':'Shooting',range:p.range,attacks:p.stats.A,skill:p.stats.BS??p.stats.WS,strength:p.stats.S,ap:p.stats.AP,damage:p.stats.D});
   }
  }
 }
 const weapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===sheet.id).map(w=>{
  const abilities=w.description?w.description.split(/,\s*/):[];
  if(JSON.stringify(abilities.map(key).sort())!==JSON.stringify(independent.get(key(w.name))))throw Error('Compare native profile '+sheet.name+' / '+w.name);
  verifyWeapon(sheet.name,w);
  const spawned=replacements[sheet.name]?.find(r=>key(r.name)===key(w.name));
  if(spawned&&[spawned.range,spawned.attacks,spawned.skill,spawned.strength,spawned.ap,spawned.damage].map(String).join('|')!==[w.range,w.a,w.bs_ws,w.s,w.ap,w.d].join('|'))throw Error('Review replacement profile '+sheet.name+' / '+w.name);
  return {name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',abilities,...(base(w.name)!==w.name?{mode:true}:{})};
 });
 if(independent.size!==weapons.length)throw Error('Unmatched native weapon profiles on '+sheet.name);
 const bracket=sheet.damaged_w.match(/^1[-–](\d+)$/),rule=sheet.damaged_description;
 const damage=bracket?{threshold:Number(bracket[1]),oc:Number(rule.match(/subtract (\d+) from this model.s Objective Control/i)?.[1]??0)}:null;
 if(damage&&!rule.includes('subtract 1 from the Hit roll')){
  if(sheet.name!=='Skarbrand'||!rule.includes('add 2 to the Attacks characteristic of this model’s melee weapons'))throw Error('Unresolved damage rule for '+sheet.name);
  damage.slaughterAttacks=2;
 }
 if(sheet.damaged_w&&!damage)throw Error('Invalid damage bracket on '+sheet.name);
 cards[sheet.name]={source:sheet.link,save,rangedSave:false,demise:core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length)??null,
  core,damage,conversion:null,weapons};
}
if(Object.keys(cards).length!==count)throw Error('Review '+label+' profile inventory');
writeFileSync(destination,"// Generated by "+script+" using both native 11e profile sources.\nimport type {KnightCardStats} from './knight-card-rules';\nexport const "+constant+":Readonly<Record<string,KnightCardStats>>={\n"+Object.entries(cards).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>' '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n};\n'+(battlefieldConstant?'export const '+battlefieldConstant+'='+JSON.stringify(replacements,null,1)+' as const;\n':''));
}
