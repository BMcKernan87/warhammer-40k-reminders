// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import {parseExport,parseCosts,normalizeExport,loadExport,BASE,TABLES,runSourceImport} from '../scripts/import-wahapedia-11e.mjs';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const baseline={expectedUnits:['Chronomancer','Immortals']};
// Minimal synthetic CSV-schema fixture; costs and Chronomancer profile checked against its 11e page.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Chronomancer
const fixture=()=>{
 const t=Object.fromEntries(Object.keys(TABLES).map(n=>[n,[]]));
 t.Factions=[{id:'n',name:'Necrons'}];
 t.Source=[{id:'s',edition:'11',version:'1.2',name:'Necrons'}];
 t.Last_update=[{last_update:'fixture-2026-10'}];
 t.Datasheets=[{id:'c',name:'Chronomancer',source_id:'s',faction_id:'n',link:BASE+'factions/necrons/Chronomancer',loadout:'Stave'},{id:'i',name:'Immortals',source_id:'s',faction_id:'n',link:BASE+'factions/necrons/Immortals'}];
 t.Datasheets_models=[{datasheet_id:'c',line:'1',m:'5"',t:'4',sv:'4+',w:'4',ld:'6+',oc:'1'},{datasheet_id:'i',line:'1',m:'5"',t:'5',sv:'3+',w:'1',ld:'7+',oc:'2'}];
 t.Datasheets_models_cost=[['c','1','YOUR 1ST UNIT COSTS',''],['c','2','1 model','70'],['c','3','YOUR 2ND+ UNIT COSTS',''],['c','4','1 model','80'],['i','1','5 models','65'],['i','2','10 models','130']].map(([datasheet_id,line,description,cost])=>({datasheet_id,line,description,cost}));
 t.Datasheets_abilities=[{datasheet_id:'c',line:'1',ability_id:'a',name:'Support',description:'',type:'Core'}];
 t.Abilities=[{id:'a',name:'Support',description:'fixture core rule'}];
 t.Datasheets_keywords=[{datasheet_id:'c',keyword:'CRYPTEK'}];
 t.Datasheets_options=[{datasheet_id:'i',line:'1',description:'fixture option'}];
 t.Datasheets_wargear=[{datasheet_id:'c',line:'1',line_in_wargear:'1',name:'Aeonstave',description:'Blast',type:'Ranged'}];
 t.Datasheets_leader=[{leader_id:'c',attached_id:'i'}];
 t.Detachments=[{id:'d',name:'Cryptek Conclave',faction_id:'n',dp:'1'}];
 t.Stratagems=[{id:'st',name:'Potentiality Syphon',faction_id:'n',detachment_id:'d',phase:'Shooting',turn:'Your',description:'fixture stratagem'}];
 t.Enhancements=[{id:'e',name:'Gravitic Bolas',faction_id:'n',detachment_id:'d',description:'fixture enhancement'}];
 t.Detachment_abilities=[{id:'da',name:'fixture detachment rule',faction_id:'n',detachment_id:'d',description:'fixture rule'}];
 t.Datasheets_stratagems=[{datasheet_id:'c',stratagem_id:'st'}];
 t.Datasheets_enhancements=[{datasheet_id:'c',enhancement_id:'e'}];
 t.Datasheets_detachment_abilities=[{datasheet_id:'c',detachment_ability_id:'da'}];
 return t;
};
const csv=(name,rows)=>[TABLES[name].join('|')+'|',...rows.map(row=>TABLES[name].map(k=>row[k]??'').join('|')+'|')].join('\r\n')+'\r\n';
describe('Wahapedia 11e export adapter',()=>{
 it('parses BOM, trailing separators and multiline descriptions without losing columns',()=>{
  expect(parseExport('\uFEFFid|description|\r\n1|hello\r\nworld|\r\n',['id','description'],'fixture')).toEqual([{id:'1',description:'hello\nworld'}]);
  expect(()=>parseExport('id|wrong|\n1|x|',['id','description'],'fixture')).toThrow(/columns/);
  expect(()=>parseExport('id|description|\n1|x|y|',['id','description'],'fixture')).toThrow(/malformed/);
 });
 it('normalizes source-linked pricing and joins all supported rule table types',()=>{
  const {candidate,review}=normalizeExport(fixture(),baseline);
  expect(candidate.datasheets[0]).toMatchObject({unit:'Chronomancer',sizes:[1],pointsBySize:{1:70},laterCopyPointsBySize:{2:{1:80}},profile:{move:'5"',toughness:4,wounds:4}});
  expect(candidate.datasheets[1].pointsBySize).toEqual({5:65,10:130});
  expect(review.records[0]).toMatchObject({id:'c',sourceVersion:'1.2',abilities:[{reference:{name:'Support'}}],keywords:[{keyword:'CRYPTEK'}],wargear:[{name:'Aeonstave'}],stratagems:['st'],enhancements:['e'],detachmentAbilities:['da']});
  expect(review.attachments[0]).toMatchObject({leader:'Chronomancer',bodyguard:'Immortals'});
  expect(review.detachments[0].name).toBe('Cryptek Conclave');
 });
 it('preserves third-copy thresholds and refuses ambiguous model labels',()=>{
  const rows=[['1','YOUR 1ST TO 2ND UNITS COST',''],['2','3 models','85'],['3','YOUR 3RD+ UNIT COSTS',''],['4','3 models','95']].map(([line,description,cost])=>({line,description,cost}));
  expect(parseCosts(rows,'Destroyers')).toEqual({sizes:[3],pointsBySize:{3:85},laterCopyPointsBySize:{3:{3:95}}});
  expect(()=>parseCosts([{line:'1',description:'1–3 models',cost:'100'}],'ambiguous')).toThrow(/ambiguous/);
 });
 it.each([
  t=>{t.Source[0].edition='10'},
  t=>{t.Datasheets.pop()},
  t=>{t.Datasheets.push({...t.Datasheets[0],id:'duplicate'})},
  t=>{t.Datasheets_models_cost.pop();t.Datasheets_models_cost.pop()},
  t=>{t.Datasheets_stratagems[0].stratagem_id='missing'},
  t=>{t.Datasheets_leader[0].attached_id='missing'},
 ])('fails closed on inconsistent sources and relationships',mutate=>{
  const t=fixture();mutate(t);expect(()=>normalizeExport(t,baseline)).toThrow(/Wahapedia 11e/);
 });
 it('downloads all tables from the 11e endpoint with a stable revision and checks HTTP failure',async()=>{
  const t=fixture();
  const fetcher=vi.fn(async url=>({ok:true,url,text:async()=>csv(url.slice(BASE.length,-4),t[url.slice(BASE.length,-4)])}));
  const {tables,hashes}=await loadExport({fetcher});
  expect(tables.Datasheets).toHaveLength(2);
  expect(Object.keys(hashes)).toHaveLength(Object.keys(TABLES).length);
  expect(fetcher.mock.calls.every(([url])=>url.startsWith(BASE))).toBe(true);
  await expect(loadExport({fetcher:async()=>({ok:false,status:403})})).rejects.toThrow(/403/);
 });
 it('writes candidates from offline CSV and never overwrites baseline on failure',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'waha-11e-'));
  try{
   const t=fixture();const baselinePath=join(dir,'baseline.json');writeFileSync(baselinePath,JSON.stringify(baseline));
   for(const [name,rows] of Object.entries(t))writeFileSync(join(dir,name+'.csv'),csv(name,rows));
   const outputDir=join(dir,'out');
   expect(await runSourceImport({directory:dir,outputDir,baselinePath})).toMatchObject({units:2});
   const old=readFileSync(join(outputDir,'candidate.json'),'utf8');
   writeFileSync(join(dir,'Source.csv'),csv('Source',[{id:'s',edition:'10',version:'1.2',name:'Necrons'}]));
   await expect(runSourceImport({directory:dir,outputDir,baselinePath})).rejects.toThrow(/edition/);
   expect(readFileSync(join(outputDir,'candidate.json'),'utf8')).toBe(old);
   expect(readFileSync(baselinePath,'utf8')).toBe(JSON.stringify(baseline));
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
