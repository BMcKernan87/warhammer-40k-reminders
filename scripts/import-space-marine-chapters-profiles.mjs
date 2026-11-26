import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {loadExport} from './import-wahapedia-11e.mjs';
import {chapterWeapons} from './import-space-marine-chapters-weapons.mjs';
import {CHAPTER_SPECS,chapterCompositions,chapterModelName,chapterIndependent,chapterProfileMatches,chapterEquivalent} from './import-space-marine-chapters-relational.mjs';

const [csv,directory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-space-marine-chapters-profiles.mjs CSV_DIR RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const read=name=>JSON.parse(readFileSync(join(directory,'adeptus-astartes',name+'.json'),'utf8'));
const key=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const units=read('units'),weaponIndex=new Map(chapterWeapons(read('weapons')).map(w=>[w.id,w]));
const compositions=chapterCompositions(read('unit-compositions'),units),cards={};
function keyword(k){
 const p=k.parameters??{};
 if(k.keyword_id==='anti')return key('anti '+(p.excluded_target_keywords?'non '+p.excluded_target_keywords.join('/'):p.target_keyword)+' '+p.threshold);
 return key(k.keyword_id+' '+(p.value??'')+' '+(p.excluded_target_keywords?'non '+p.excluded_target_keywords.join('/'):p.required_target_keywords_any?.join('/')??''));
}
for(const spec of CHAPTER_SPECS){
 const source=tables.Source.find(s=>s.id===spec.sourceId);
 if(!source||source.edition!=='11')throw Error('Review current chapter profile source '+spec.faction);
 const sheets=tables.Datasheets.filter(s=>s.faction_id==='SM'&&s.source_id===spec.sourceId);
 if(sheets.length!==spec.cards)throw Error('Review current chapter profile count '+spec.faction);
 cards[spec.faction]={};
 for(const sheet of sheets){
  const unit=chapterIndependent(units,sheet.name,spec.faction),composition=compositions.find(c=>c.unit_id===unit.id);
  const profiles=tables.Datasheets_models.filter(r=>r.datasheet_id===sheet.id),saveByModel={};
  if(!composition)throw Error('Missing chapter composition '+sheet.name);
  for(const part of composition.models){
   const named=chapterModelName(sheet.name,part.name),desired=part.profile_name??named;
   const printed=profiles.find(p=>chapterProfileMatches(p.name,named))??profiles.find(p=>chapterProfileMatches(p.name,desired))??(profiles.length===1?profiles[0]:undefined);
   const ref=unit.profiles.find(p=>chapterEquivalent(p.name,desired))??(unit.profiles.length===1?unit.profiles[0]:undefined);
   if(!printed||!ref)throw Error('Missing model save '+sheet.name+' / '+named);
   if(printed.inv_sv_descr)throw Error('Unreviewed conditional chapter save '+sheet.name+' / '+printed.inv_sv_descr);
   const save=['','-'].includes(printed.inv_sv)?null:Number(printed.inv_sv),independentSave=ref.invuln_sv??ref.invuln_sv_ranged??ref.invuln_sv_melee??null;
   const mephiston=sheet.name==='Chief Librarian Mephiston'&&named==='Chief Librarian Mephiston';
   if(mephiston&&(save!==4||independentSave!==5))throw Error('Review current Mephiston invulnerable-save correction');
   if(save!==independentSave&&!mephiston)throw Error('Independent save differs '+sheet.name+' / '+named+': '+save+' vs '+independentSave);
   saveByModel[named]=save;
  }
  const distinct=[...new Set(Object.values(saveByModel))],save=distinct.length===1?distinct[0]:null;
  const core=tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Core').map(a=>{
   const name=a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name;
   if(!name)throw Error('Unknown core ability '+sheet.name);
   const ability=unit.ability_ids.find(v=>key(typeof v==='string'?v:v.id)===key(name));
   const leader=sheet.name==='Death Company Captain with Jump Pack'&&name==='Leader',darkshroud=sheet.name==='Ravenwing Darkshroud'&&name==='Lone Operative';
   if(leader&&(ability||a.parameter!==''||unit.attachment_role!=='leader'))throw Error('Review Jump Captain independent Leader omission');
   if(darkshroud&&(ability!=='lone-operative'||a.parameter!=='15"'))throw Error('Review Darkshroud Lone Operative distance');
   if(!leader&&!darkshroud&&(!ability||key(a.parameter)!==key(String(typeof ability==='string'?'':ability.value))))throw Error('Core ability differs '+sheet.name+' / '+name+' '+a.parameter);
   return [name,a.parameter].filter(Boolean).join(' ');
  });
  const independent=new Map();
  for(const id of new Set(unit.weapon_ids)){
   const item=weaponIndex.get(id);
   if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!=='2026-10-14')throw Error('Missing audited chapter weapon '+id);
   for(const p of item.profiles){
    const name=key(p.name)===key(item.name)||['ranged','melee'].includes(p.name.toLowerCase())?item.name:key(p.name).startsWith(key(item.name))?p.name:item.name+' - '+p.name;
    const phase=p.range==='Melee'?'Melee':'Ranged',record=phase+key(name);
    if(independent.has(record))throw Error('Ambiguous independent chapter weapon '+sheet.name+' / '+name);
    independent.set(record,p);
   }
  }
  const weapons=tables.Datasheets_wargear.filter(w=>w.datasheet_id===sheet.id&&w.name).map(w=>{
   const p=independent.get(w.type+key(w.name));
   if(!p)throw Error('Missing independent chapter weapon '+sheet.name+' / '+w.name);
   const abilities=w.description?w.description.split(/,\s*/).map(a=>a.toLowerCase()).flatMap(a=>/^anti-monster\/vehicle (\d+)\+$/.test(a)?['anti-monster '+a.match(/\d+/)[0]+'+','anti-vehicle '+a.match(/\d+/)[0]+'+']:[a]):[];
   const expected=(p.keywords??[]).filter(k=>k.keyword_id!=='hunter').map(keyword).sort();
   if(!isDeepStrictEqual(abilities.map(key).sort(),expected))throw Error('Chapter weapon abilities differ '+sheet.name+' / '+w.name+': '+JSON.stringify({abilities,expected}));
   for(const [column,value] of [['range',p.range],['a',p.stats.A],['bs_ws',p.stats.BS??p.stats.WS??'-'],['s',p.stats.S],['ap',p.stats.AP],['d',p.stats.D]]){
    const printed=column==='ap'&&w[column]==='-'?'0':w[column];
    if(column==='bs_ws'&&[['Iron Priest','Helfrost Pistol - Dispersed'],['Murderfang','Heavy Flamer'],['Wulfen Dreadnought','Heavy Flamer']].some(([u,n])=>sheet.name===u&&w.name===n)){
     if(value!=='-'||printed!=='7'||!abilities.includes('torrent'))throw Error('Review chapter printed Torrent BS '+sheet.name);
     continue; // Retain the printed 7+; Torrent still hits automatically.
    }
    if(String(value)!==printed)throw Error('Chapter weapon stat differs '+sheet.name+' / '+w.name+' / '+column+': '+w[column]+' vs '+value);
   }
   const hunters=(p.keywords??[]).filter(k=>k.keyword_id==='hunter').map(k=>k.parameters?.target_keyword),targets=p.target_restrictions?.required_keywords_any;
   if(hunters.length&&(!targets||!isDeepStrictEqual(hunters,targets)))throw Error('Chapter Hunter restriction disagreement '+sheet.name+' / '+w.name);
   if(targets&&!isDeepStrictEqual(targets,['Monster','Vehicle']))throw Error('Unreviewed chapter Hunter targets');
   if(/ - Hunter$/.test(w.name)&&!targets)throw Error('Missing chapter Hunter restriction '+sheet.name+' / '+w.name);
   return {name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',range:w.range,attacks:w.a,skill:w.bs_ws,strength:Number(w.s),ap:w.ap==='-'?0:Number(w.ap),damage:w.d,abilities,...(w.name.includes(' - ')&&!abilities.includes('extra attacks')?{mode:true}:{}),...(targets?{targets}:{})};
  });
  if(independent.size!==weapons.length)throw Error('Unmatched independent chapter weapons '+sheet.name+': '+independent.size+' vs '+weapons.length);
  if(sheet.damaged_w||sheet.damaged_description)throw Error('Review obsolete chapter damage table '+sheet.name);
  const damaged=core.find(c=>c.startsWith('Damaged '));
  cards[spec.faction][sheet.name]={source:sheet.link,save,rangedSave:false,...(distinct.length>1?{saveByModel}:{}),factionAbilities:tables.Datasheets_abilities.filter(a=>a.datasheet_id===sheet.id&&a.type==='Faction').map(a=>a.name||tables.Abilities.find(r=>r.id===a.ability_id)?.name),demise:core.find(c=>c.startsWith('Deadly Demise '))?.slice('Deadly Demise '.length)??null,core,damage:damaged?{threshold:Number(damaged.slice(8)),oc:0}:null,conversion:null,weapons};
 }
}
if(Object.values(cards).flatMap(f=>Object.values(f).flatMap(c=>c.weapons)).length!==316)throw Error('Review current chapter full weapon count');
writeFileSync(destination,"// Generated by scripts/import-space-marine-chapters-profiles.mjs; current profiles independently reconciled.\nimport type {SpaceMarineCardStats} from './space-marines-card-profiles.generated';\n"+
 'export const CHAPTER_CARDS:Readonly<Record<string,Readonly<Record<string,SpaceMarineCardStats>>>>={\n'+Object.entries(cards).map(([faction,entries])=>' '+JSON.stringify(faction)+':{\n'+Object.entries(entries).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>'  '+JSON.stringify(k)+':'+JSON.stringify(v)).join(',\n')+'\n }').join(',\n')+'\n};\n'+
 'export const CHAPTER_PROFILE_LIMITATIONS:Readonly<Record<string,Readonly<Record<string,readonly {weapon:string;printedAbility:string;issue:string}[]>>>>={};\n');
