import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {readPrices} from './import-imperial-knights.mjs';
import {parse} from 'yaml';
import {loadExport,modelProfile,parseCosts,rosterMetadata} from './import-wahapedia-11e.mjs';

const supported=['Callidus Assassin','Culexus Assassin','Eversor Assassin','Vindicare Assassin',
 'Voidsmen-at-arms','Navigator','Rogue Trader Entourage','Inquisitor Greyfax','Inquisitor Coteaz','Inquisitor Draxus',
 'Watch Captain Artemis','Watch Master','Inquisitor','Inquisitor Kroyle','Ministorum Priest','Imperial Rhino','Corvus Blackstar','Inquisitorial Chimera','Sisters of Battle Immolator',
 'Grey Knights Terminator Squad','Imperial Navy Breachers','Vigilant Squad','Subductor Squad','Exaction Squad',
 'Inquisitorial Agents','Sisters of Battle Squad','Deathwatch Kill Team','Sanctifiers','Aquila Kill Team'];
const normal=name=>name.toLowerCase().replaceAll('’',"'").trim();
const plain=text=>text.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();

// 40kdc's independently transcribed GW MFM composition is used only for verification.
// Alpaca Software and 40kdc contributors, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
const compositionMirror='https://raw.githubusercontent.com/wn-mitch/40kdc-data/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core/agents-of-the-imperium/unit-compositions.json';
export function aquilaMetadata(owned,mirror){
 const expected=mirror.find(r=>r.unit_id==='aquila-kill-team'&&r.game_version.edition==='11th'&&r.game_version.dataslate==='2026-10-14');
 if(!expected)throw Error('Missing October Aquila formation reference');
 const compositionBySize={};
 for(const tier of expected.tiers){
  if(tier.models.some(model=>model.min!==model.max))throw Error('Aquila fixed formation changed');
  const size=tier.models.reduce((sum,m)=>sum+m.min,0);
  const counts=Object.fromEntries(tier.models.map(m=>[m.name,m.min]));
  if(compositionBySize[size]&&!isDeepStrictEqual(compositionBySize[size],counts))throw Error('Aquila native/allied formations differ');
  compositionBySize[size]=counts;
 }
 const published={};
 let group={};
 for(const row of owned('Datasheets_models_cost')){
  if(row.description.includes('dsHeaderComp')){
   const match=plain(row.description).match(/^(\d+) (.+)$/);
   if(!match||Object.hasOwn(group,match[2]))throw Error('Invalid Aquila formation row');
   if(Number(match[1]))group[match[2]]=Number(match[1]);
  }else if(row.cost){published[Number.parseInt(plain(row.description),10)]=group;group={};}
 }
 if(!isDeepStrictEqual(published,compositionBySize))throw Error('Aquila models in CSV price groups and GW MFM mirror disagree');
 const groups=Object.values(published);
 const names=Object.keys(groups.at(-1));
 const composition=names.map(model=>({model,min:Math.min(...groups.map(g=>g[model]??0)),max:Math.max(...groups.map(g=>g[model]??0))}));
 const range=owned('Datasheets_unit_composition').map(row=>plain(row.description).replace(/^\d+(?:-\d+)? /,'').replace(/ models?$/i,''));
 if(names.length!==range.length||names.some(model=>!range.includes(model)))throw Error('Aquila composition model names changed');
 const modelKeywords={},keywords=[];
 for(const row of owned('Datasheets_keywords')){
  if(!row.model||row.model==='ALL MODELS'){keywords.push(row.keyword.toUpperCase());continue;}
  const scope=row.model.split(', ');
  const selected=names.filter(model=>scope.some(name=>model===name||model.startsWith(name+' with ')));
  if(!selected.length)throw Error('Unknown Aquila model keyword scope '+row.model);
  for(const model of selected)(modelKeywords[model]??=[]).push(row.keyword.toUpperCase());
 }
 return {composition,compositionBySize:published,keywords:keywords.sort(),modelKeywords};
}

function payGroup(raw,allied,unit){
 const rows=raw.filter(row=>unit!=='Aquila Kill Team'||!row.description.includes('dsHeaderComp')).sort((a,b)=>Number(a.line)-Number(b.line));
 if(unit==='Inquisitorial Agents'){
  // The export gives 10 Agents + 1 Servitor an explicit row at the MFM’s 12-model bracket price.
  for(let i=rows.length-2;i>=0;i--)if(plain(rows[i].description)==='11 models'&&plain(rows[i+1].description)==='12 models'&&rows[i].cost===rows[i+1].cost)rows.splice(i,1);
 }
 const group=rows.findIndex(row=>plain(row.description)==='Assigned Agent');
 const gear=rows.findIndex(row=>plain(row.description)==='WARGEAR OPTIONS');
 if(group>=0)return allied?rows.slice(group+1):[...rows.slice(1,group),...(gear>=0?rows.slice(gear):[])];
 if(rows.some(row=>/dsHeaderAoI/i.test(row.description)))throw Error(unit+' missing Assigned Agent price group');
 return rows;
}
export function alliedPrices(rows,unit){return parseCosts(payGroup(rows,true,unit),unit);}

export function importAssignedAgents(tables,manual,mirror){
 if(manual.slug!=='imperial-agents'||!manual.version)throw Error('Expected Imperial Agents MFM');
 const allyGroup=manual.units.filter(row=>row.groupTitle==='Every Model Has The Imperium Keyword'&&!row.legends);
 return supported.map(unit=>{
  const sheets=tables.Datasheets.filter(d=>d.name===unit&&d.faction_id==='AoI');
  const matches=allyGroup.filter(row=>normal(row.name)===normal(unit));
  if(sheets.length!==1||matches.length!==1)throw Error(unit+' ambiguous source');
  const d=sheets[0],mfm=matches[0],source=tables.Source.find(s=>s.id===d.source_id);
  if(source?.name!=='Imperial Agents'||source.edition!=='11'||!d.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/imperial-agents/'))throw Error(unit+' unexpected edition/source');
  const own=table=>tables[table].filter(row=>row.datasheet_id===d.id);
  const costs=readPrices(payGroup(own('Datasheets_models_cost'),true,unit),unit,mfm);
  const natives=manual.units.filter(r=>normal(r.name)===normal(unit)&&!r.groupTitle&&!r.legends);
  if(natives.length!==1)throw Error(unit+' lacks unique native MFM entry');
  const nativeCosts=readPrices(payGroup(own('Datasheets_models_cost'),false,unit),unit,natives[0]);
  const metadata=unit==='Aquila Kill Team'?aquilaMetadata(own,mirror):rosterMetadata(tables,unit,d.id);
  const models=own('Datasheets_models');
  const sheet={unit,faction:'Imperial Knights',source:d.link,pointsSource:'https://mfm.warhammer-community.com/en/imperial-agents',verified:'sizes-and-points',...costs,...metadata};
  const bodyguards=(mfm.supportTo??mfm.leaderTo??[]).flatMap(name=>name==='Battleline Imperium Infantry'
   ?['Skitarii Rangers','Skitarii Vanguard',...supported.filter(candidate=>{
    const target=tables.Datasheets.find(r=>r.faction_id==='AoI'&&r.name===candidate);
    const keys=tables.Datasheets_keywords.filter(row=>row.datasheet_id===target?.id).map(r=>normal(r.keyword));
    return ['battleline','infantry','imperium'].every(k=>keys.includes(k));
   })]:supported.filter(candidate=>normal(candidate)===normal(name)));
  // The revised Aquila sheet explicitly extends eligibility to any Deathwatch Kill Team character.
  if(bodyguards.includes('Deathwatch Kill Team')&&!bodyguards.includes('Aquila Kill Team'))bodyguards.push('Aquila Kill Team');
  if(bodyguards.length){sheet.bodyguards=[...new Set(bodyguards)].sort();sheet.attachmentRole=d.is_support==='true'?'support':'leader';}
  const core=own('Datasheets_abilities').filter(row=>row.type==='Core').map(row=>{
   const name=row.name||tables.Abilities.find(a=>a.id===row.ability_id&&(!a.faction_id||a.faction_id==='AoI'))?.name;
   if(!name)throw Error(unit+' unresolved core ability '+row.ability_id);
   return name;
  });
  if(new Set(models.map(model=>model.inv_sv)).size!==1)throw Error(unit+' has model-specific invulnerable saves');
  if(models.length===1)sheet.profile=modelProfile(models[0],unit);
  else sheet.modelProfiles=Object.fromEntries(models.map(model=>[model.name,modelProfile(model,unit)]));
  return {sheet,nativeCosts,core,weapons:own('Datasheets_wargear').map(row=>({name:row.name,type:row.type,abilities:row.description.toLowerCase()})),invulnerable:models[0].inv_sv};
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [directory,manualPath,output,mirrorPath]=process.argv.slice(2);
 if(!output)throw Error('Usage: node scripts/import-knight-assigned-agents.mjs CSV_DIR IMPERIAL_AGENTS_MFM_YAML OUTPUT_TS [MFM_COMPOSITIONS_JSON]');
 const {tables}=await loadExport({directory});
 const mirror=mirrorPath?JSON.parse(readFileSync(mirrorPath,'utf8')):await (await fetch(compositionMirror)).json();
 const records=importAssignedAgents(tables,parse(readFileSync(manualPath,'utf8')),mirror);
 writeFileSync(output,'// Generated by scripts/import-knight-assigned-agents.mjs.\nexport const ASSIGNED_AGENT_DATA='+JSON.stringify(records,null,2)+' as const;\n');
}
