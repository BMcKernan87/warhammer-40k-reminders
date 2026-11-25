import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseExport} from './import-wahapedia-11e.mjs';

const dir=process.argv[2];
if(!dir)throw Error('Usage: node scripts/import-knight-datasheet-rules.mjs PATH_TO_11E_CSV_EXPORT');
const read=(table,headers)=>parseExport(readFileSync(resolve(dir,table+'.csv'),'utf8'),headers,table);
const sheets=read('Datasheets',['id','name','faction_id','source_id','damaged_w','damaged_description','link']);
const models=read('Datasheets_models',['datasheet_id','inv_sv','inv_sv_descr']);
const gear=read('Datasheets_wargear',['datasheet_id','name','description','type','line','line_in_wargear']);
const abilities=read('Datasheets_abilities',['datasheet_id','ability_id','type','name','parameter','description']);
const shared=new Map(read('Abilities',['id','name']).map(a=>[a.id,a.name]));
const sources=new Map(read('Source',['id','name','edition']).map(s=>[s.id,s]));
const revision=read('Last_update',['last_update'])[0]?.last_update;
const chaos=process.argv[3]==='--chaos';
const daemons=process.argv[3]==='--daemons';
const custodes=process.argv[3]==='--custodes';
const shadow=process.argv[3]==='--shadow-marines';
const shadowNames=new Set(sheets.filter(s=>s.faction_id==='CD'&&sources.get(s.source_id)?.name==='Chaos Space Marines').map(s=>s.name));
const damned=shadow?new Set(read('Datasheets_keywords',['datasheet_id','keyword']).filter(k=>k.keyword.toUpperCase()==='DAMNED').map(k=>k.datasheet_id)):new Set();
const orks=process.argv[3]==='--orks';
const faction=orks?'Orks':custodes?'Adeptus Custodes':shadow?'Chaos Space Marines':daemons?'Chaos Daemons':chaos?'Chaos Knights':'Imperial Knights';
const slug=orks?'orks':custodes?'adeptus-custodes':shadow?'chaos-space-marines':daemons?'chaos-daemons':chaos?'chaos-knights':'imperial-knights';
const out={};
for(const sheet of sheets.filter(s=>s.faction_id===(orks?'ORK':custodes?'AC':shadow?'CSM':daemons?'CD':chaos?'QT':'QI')&&(!daemons||s.source_id==='000000025')&&(!shadow||shadowNames.has(s.name)&&!damned.has(s.id))).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  const source=sources.get(sheet.source_id);
  if(source?.name.includes('Legends'))continue;
  // The export omits source_id on Destrier. Its individual card and faction index
  // independently identify it as an Imperial Knights 11th-edition app datasheet.
  const unlinkedDestrier=!sheet.source_id&&sheet.name==='Knight Destrier';
  if(!unlinkedDestrier&&source?.edition!=='11'&&source?.name!==faction+' (Forge World)')throw Error('Unrecognised source on '+sheet.name);
  if(!sheet.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/'+slug+'/'))throw Error('11e Knight datasheet URL required');
  const [profile,...alternatives]=models.filter(m=>m.datasheet_id===sheet.id);
  const enforcer=chaos&&sheet.name==='Traitor Enforcer'&&profile?.name==='TRAITOR ENFORCER'&&alternatives.length===1&&alternatives[0].name==='TRAITOR OGRYN'&&alternatives[0].inv_sv==='-';
  if(!profile||!enforcer&&alternatives.some(m=>m.inv_sv!==profile.inv_sv||m.inv_sv_descr!==profile.inv_sv_descr))throw Error('Unexpected save profiles on '+sheet.name);
  const own=abilities.filter(a=>a.datasheet_id===sheet.id);
  const abilityName=a=>a.name||shared.get(a.ability_id);
  const demise=own.find(a=>abilityName(a)==='Deadly Demise')?.parameter;
  const conversion=own.find(a=>a.name==='Conversion')?.description.match(/(?:more than|not within) (\d+)"/i)?.[1];
  const coreDamage=(custodes||orks)?own.find(a=>abilityName(a)==='Damaged')?.parameter:undefined;
  if(coreDamage&&!/^\d+$/.test(coreDamage))throw Error('Unrecognized damaged threshold on '+sheet.name);
  const damaged=sheet.damaged_w.match(/^1[-‑–](\d+)$/);
  const oc=sheet.damaged_description.match(/subtract (\d+) from (?:this|that) model’s Objective Control/i);
  const skarbrand=daemons&&sheet.name==='Skarbrand'&&sheet.damaged_description.includes('add 2 to the Attacks characteristic');
  if(sheet.damaged_w&&(!damaged||(!oc&&!daemons)||(!skarbrand&&!sheet.damaged_description.includes('subtract 1 from the Hit roll'))))throw Error('Unmapped damaged profile on '+sheet.name);
  const weaponRows=gear.filter(w=>w.datasheet_id===sheet.id&&w.name);
  // Some allies have no line numbers, including completely separate weapons on
  // different models. Treat a common printed weapon name with mode suffixes as
  // the grouping key in those rows.
  const weaponName=w=>w.name.split(/\s+[–—-]\s+/)[0];
  const weapons=weaponRows.map(w=>({
    name:w.name,phase:w.type==='Melee'?'Fight':'Shooting',abilities:w.description?w.description.split(/,\s*/):[],
    ...(weaponRows.some(other=>other!==w&&other.type===w.type&&((w.line&&other.line===w.line)||(other.name!==w.name&&weaponName(w)===weaponName(other))))?{mode:true}:{})
  }));
  if(out[sheet.name])throw Error('Duplicate Knight datasheet: '+sheet.name);
  out[sheet.name]={source:sheet.link,save:profile.inv_sv==='-'?null:Number(profile.inv_sv),
    ...(enforcer?{saveBearer:'Traitor Enforcer'}:{}),rangedSave:profile.inv_sv_descr.toLowerCase().includes('ranged'),demise:demise?.trim()??null,
    damage:damaged?{threshold:Number(damaged[1]),oc:Number(oc?.[1]??0),...(skarbrand?{slaughterAttacks:2}:{})}:coreDamage?{threshold:Number(coreDamage),oc:0}:null,
    ...(daemons||custodes||shadow||orks?{core:own.filter(a=>a.type==='Core').map(a=>(abilityName(a)+' '+a.parameter).trim())}:{}),
    conversion:conversion?Number(conversion):null, weapons};
}
if(shadow&&Object.keys(out).length!==14)throw Error('Unexpected Shadow Legion marine inventory');
const required=orks?['Nazdreg','Gargantuan Squiggoth','Big Mek Dakkarig','Wazdakka Gutsmek']:custodes?['Ares Gunship','Shield-Captain','Sentinel Guard Sodality','Caladius Annihilator Grav-Tank']:shadow?['Dark Apostle','Raptors','Chosen','Legionaries']:daemons?['Skarbrand','Be’lakor','Pink Horrors','Rendmaster On Blood Throne']:chaos?['Knight Ruinator','Dark Commune','Traitor Enforcer','Chaos Acastus Knight Porphyrion']:['Knight Destrier','Sir Hekhtur','Acastus Knight Porphyrion','Skitarii Marshal'];
if(!revision||required.some(name=>!out[name]))throw Error('Incomplete Knight export');
const destination=orks?'src/ork-card-data.generated.ts':custodes?'src/custodes-card-data.generated.ts':shadow?'src/shadow-marine-card-data.generated.ts':daemons?'src/daemon-card-data.generated.ts':chaos?'src/chaos-knight-weapon-data.generated.ts':'src/imperial-knight-weapon-data.generated.ts';
const json=Object.entries(out).map(([name,data])=>'  '+JSON.stringify(name)+': '+JSON.stringify(data)).join(',\n');
const text='// Generated by scripts/import-knight-datasheet-rules.mjs from the 11e export dated '+revision+'.\n'+
  "import type {KnightCardStats} from './knight-card-rules';\n\nexport const KNIGHT_CARD_STATS:Readonly<Record<string,KnightCardStats>>={\n"+json+'\n};\n';
writeFileSync(destination+'.tmp',text);renameSync(destination+'.tmp',destination);
