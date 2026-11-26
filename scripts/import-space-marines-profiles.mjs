import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {loadExport} from './import-wahapedia-11e.mjs';
import {spaceMarineWeapons} from './import-space-marines-weapons.mjs';
import {spaceMarineCompositions,spaceMarineModelName} from './import-space-marines-relational.mjs';

const [csv,directory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-space-marines-profiles.mjs CSV_DIR RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const read=name=>JSON.parse(readFileSync(join(directory,'adeptus-astartes',name+'.json'),'utf8'));
const key=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const units=read('units'),weaponIndex=new Map(spaceMarineWeapons(read('weapons')).map(w=>[w.id,w]));
const compositions=spaceMarineCompositions(read('unit-compositions'),units);
const cards={};
function keyword(k){
 const p=k.parameters??{};
 if(k.keyword_id==='anti')return key('anti '+(p.excluded_target_keywords?'non '+p.excluded_target_keywords.join('/'):p.target_keyword)+' '+p.threshold);
 return key(k.keyword_id+' '+(p.value??'')+' '+(p.excluded_target_keywords?'non '+p.excluded_target_keywords.join('/'):p.required_target_keywords_any?.join('/')??''));
}
for(const [sourceId,count] of [['000000139',85],['000000362',2],['000000035',10]]){
 const source=tables.Source.find(s=>s.id===sourceId);
 if(!source||(sourceId!=='000000362'&&source.edition!=='11'))throw Error('Review current Space Marine profile source');
 const sheets=tables.Datasheets.filter(s=>s.faction_id==='SM'&&s.source_id===sourceId);
 if(sheets.length!==count)throw Error('Review current matched-play card count');
 for(const sheet of sheets){
  const matches=units.filter(u=>key(u.name)===key(sheet.name)&&!u.is_legend&&!u.faction_keywords.includes('Black Templars')&&u.game_version.edition==='11th'&&u.game_version.dataslate==='2026-10-14'&&u.external_refs.some(r=>r.namespace==='mfm'));
  if(matches.length!==1)throw Error('No current independent profile for '+sheet.name);
  const unit=matches[0],composition=compositions.find(c=>c.unit_id===unit.id),profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===sheet.id);
  if(!composition)throw Error('Missing composition for '+sheet.name);
  const saveByModel={};let rangedSave=false,meleeOnlySave=false;
  for(const profile of profiles){
   const named=spaceMarineModelName(sheet.name,profile.name),part=composition.models.find(m=>key(m.name)===key(named));
   const ref=unit.profiles.find(p=>key(spaceMarineModelName(sheet.name,p.name))===key(part?.profile_name??named))??(unit.profiles.length===1?unit.profiles[0]:undefined);
   const save=['','-'].includes(profile.inv_sv)?null:Number(profile.inv_sv);
   const independentSave=ref?.invuln_sv??ref?.invuln_sv_ranged??ref?.invuln_sv_melee??null;
   // Exact independently inherited errors: live current cards and CSV agree.
   const knownMismatch=['Ballistus Dreadnought','Brutalis Dreadnought','Redemptor Dreadnought'].includes(sheet.name)?save===null&&independentSave===4:sheet.name==='Marneus Calgar'?save===4&&independentSave===null:false;
   if(['Ballistus Dreadnought','Brutalis Dreadnought','Redemptor Dreadnought','Marneus Calgar'].includes(sheet.name)&&!knownMismatch)throw Error('Review audited invulnerable-save correction '+sheet.name);
   if(!ref||(independentSave!==save&&!knownMismatch))throw Error('Independent save differs '+sheet.name+' / '+profile.name);
   if(profile.inv_sv_descr){
    if(sheet.name==='Astraeus'&&save===5&&profile.inv_sv_descr==='Against ranged attacks only')rangedSave=true;
    else if(sheet.name==='Judiciar'&&save===4&&profile.inv_sv_descr==='Against melee attacks only')meleeOnlySave=true;
    else if(sheet.name==='Wardens of Ultramar'&&['Gaius Silva only','Veteran Sergeant Metaurus only'].includes(profile.inv_sv_descr)){}
    else throw Error('Unreviewed conditional save '+sheet.name+' / '+profile.inv_sv_descr);
   }
   saveByModel[named]=save;
  }
  const distinct=[...new Set(Object.values(saveByModel))];
  const save=distinct.length===1?distinct[0]:null;
  const core=tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Core').map(a=>{
   const name=a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name;
   if(!name)throw Error('Unknown core ability '+sheet.name);
   const ability=unit.ability_ids.find(v=>key(typeof v==='string'?v:v.id)===key(name));
   if(!ability||key(a.parameter)!==key(String(typeof ability==='string'?'':ability.value)))throw Error('Core ability differs '+sheet.name+' / '+name+' '+a.parameter);
   return [name,a.parameter].filter(Boolean).join(' ');
  });
  const independent=new Map();
  for(const id of new Set(unit.weapon_ids)){
   const item=weaponIndex.get(id);
   if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!=='2026-10-14')throw Error('Missing audited weapon '+id);
   for(const p of item.profiles){
    const name=key(p.name)===key(item.name)||['ranged','melee'].includes(p.name.toLowerCase())?item.name:key(p.name).startsWith(key(item.name))?p.name:item.name+' - '+p.name;
    const phase=p.range==='Melee'?'Melee':'Ranged',record=phase+key(name);
    if(independent.has(record))throw Error('Ambiguous independent weapon '+sheet.name+' / '+name);
    independent.set(record,p);
   }
  }
  const weapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===sheet.id&&w.name).map(w=>{
   const p=independent.get(w.type+key(w.name));
   if(!p)throw Error('Missing independent weapon '+sheet.name+' / '+w.name);
   const abilities=w.description?w.description.split(/,\s*/).map(a=>a.toLowerCase()).flatMap(a=>/^anti-monster\/vehicle (\d+)\+$/.test(a)?['anti-monster '+a.match(/\d+/)[0]+'+','anti-vehicle '+a.match(/\d+/)[0]+'+']:[a]):[];
   const expected=(p.keywords??[]).filter(k=>k.keyword_id!=='hunter').map(keyword).sort();
   if(!isDeepStrictEqual(abilities.map(key).sort(),expected))throw Error('Weapon abilities differ '+sheet.name+' / '+w.name+': '+JSON.stringify({abilities,expected}));
   for(const [column,value] of [['range',p.range],['a',p.stats.A],['bs_ws',p.stats.BS??p.stats.WS??'-'],['s',p.stats.S],['ap',p.stats.AP],['d',p.stats.D]]){
    const printed=column==='ap'&&w[column]==='-'?'0':w[column];
    if(sheet.name==='Talonstrike Kill Team'&&w.name==='Hand Flamer'&&column==='bs_ws'){
     if(value!=='-'||printed!=='7'||!abilities.includes('torrent'))throw Error('Review Talonstrike printed Torrent BS');
     continue; // The current printed 7+ is retained; Torrent still automatically hits.
    }
    if(String(value)!==printed)throw Error('Weapon stat differs '+sheet.name+' / '+w.name+' / '+column+': '+w[column]+' vs '+value);
   }
   const hunters=(p.keywords??[]).filter(k=>k.keyword_id==='hunter').map(k=>k.parameters?.target_keyword);
   const targets=p.target_restrictions?.required_keywords_any;
   if(hunters.length&&(!targets||!isDeepStrictEqual(hunters,targets)))throw Error('Hunter restriction disagreement '+sheet.name+' / '+w.name);
   if(targets&&!isDeepStrictEqual(targets,['Monster','Vehicle']))throw Error('Unreviewed Hunter targets');
   if(/ - Hunter$/.test(w.name)&&!targets)throw Error('Missing Hunter restriction '+sheet.name+' / '+w.name);
   return {name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',range:w.range,attacks:w.a,skill:w.bs_ws,strength:Number(w.s),ap:w.ap==='-'?0:Number(w.ap),damage:w.d,abilities,...(w.name.includes(' - ')&&!abilities.includes('extra attacks')?{mode:true}:{}),...(targets?{targets}:{})};
  });
  if(independent.size!==weapons.length)throw Error('Unmatched independent weapons '+sheet.name+': '+independent.size+' vs '+weapons.length);
  if(sheet.damaged_w||sheet.damaged_description)throw Error('Review obsolete damage table '+sheet.name);
  const damaged=core.find(c=>c.startsWith('Damaged '));
  cards[sheet.name]={source:sheet.link,save,rangedSave,...(meleeOnlySave?{meleeOnlySave}:{}),...(distinct.length>1?{saveByModel}:{}),factionAbilities:tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Faction').map(a=>a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name),demise:core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length)??null,core,damage:damaged?{threshold:Number(damaged.slice(8)),oc:0}:null,conversion:null,weapons};
 }
}
const enhancementWeapons={};
for(const [id,name,stats,source] of [
 ['imperiums-sword-assault-brethren','Imperium’s Sword',{A:6,S:7,AP:-3,D:3,WS:2},'https://wahapedia.ru/wh40k11ed/factions/space-marines/#Assault-Brethren'],
 ['the-thief-of-secrets-black-spear-task-force','The Thief of Secrets',{A:6,S:6,AP:-3,D:2,WS:2},'https://wahapedia.ru/wh40k11ed/factions/space-marines/#Black-Spear-Task-Force'],
]){
 const w=weaponIndex.get(id);
 if(!w||w.game_version.dataslate!=='2026-10-14'||w.name!==name||!isDeepStrictEqual(w.profiles,[{name,range:'Melee',stats}]))throw Error('Review enhancement weapon '+name);
 enhancementWeapons[name]={name,source,phase:'Fight',range:'Melee',attacks:String(stats.A),skill:String(stats.WS),strength:stats.S,ap:stats.AP,damage:String(stats.D),abilities:[]};
}
writeFileSync(destination,"// Generated by scripts/import-space-marines-profiles.mjs; exact current profiles independently reconciled.\nimport type {KnightCardStats} from './knight-card-rules';\n"+
 "export type SpaceMarineWeapon=KnightCardStats['weapons'][number]&{range:string;attacks:string;skill:string;damage:string;targets?:readonly string[]};\n"+
 "export type SpaceMarineCardStats=Omit<KnightCardStats,'weapons'>&{meleeOnlySave?:boolean;saveByModel?:Readonly<Record<string,number|null>>;factionAbilities:readonly string[];weapons:readonly SpaceMarineWeapon[]};\n"+
 'export const SM_CARDS:Readonly<Record<string,SpaceMarineCardStats>>={\n'+Object.entries(cards).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>' '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n};\n'+
 'export const SM_ENHANCEMENT_WEAPONS:Readonly<Record<string,SpaceMarineWeapon&{source:string}>>='+JSON.stringify(enhancementWeapons)+';\n');
