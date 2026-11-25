import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sororitasCompositions} from './import-sororitas-composition.mjs';

const args=process.argv.slice(2),directory=args[2];
if(!args[3])throw Error('Usage: node scripts/import-sororitas-loadouts.mjs CSV_DIR MFM_YAML RELATIONAL_DATA_DIR OUTPUT_TS');
const prepared=mkdtempSync(join(tmpdir(),'sororitas-equipment-'));
try{
 for(const name of ['units','weapons','wargear'])copyFileSync(join(directory,name+'.json'),join(prepared,name+'.json'));
 writeFileSync(join(prepared,'unit-compositions.json'),JSON.stringify(sororitasCompositions(JSON.parse(readFileSync(join(directory,'unit-compositions.json'),'utf8')))));
 await importFactionLoadouts({
 slug:'adepta-sororitas',title:'Adepta Sororitas',factionId:'AS',sourceId:'000000112',
 table:'SORORITAS_KITS',expected:33,paid:4,
 adjustRole(source,t,slots,expanded){
  if(source.name!=='Intranzia Fraye')return;
  // Official October pack p. 8 and the relational stock/slot both specify
  // two heavy bolters and two flamers; its per-model template drops the pairs.
  if(!source.loadout.includes('2 heavy bolters')||!source.loadout.includes('2 Ministorum heavy flamers'))throw Error('Review Intranzia paired weapons');
  const items=t.items.map(item=>['heavy-bolter-intranzia-fraye','ministorum-heavy-flamer'].includes(item.id)?{...item,count:2}:item);
  if(items.filter(item=>item.count===2).length!==2)throw Error('Review Intranzia stock template');
  return compileModelEquipment({...t,items},slots,expanded);
 },
 adjustEquipment(source,roles,limits,options){
  const limit=(role,item,max=1)=>({role,thresholds:[{models:0,choices:max}],choices:[[item]]});
  if(source.name==='Battle Sisters Squad'){
   if(limits.length!==2||!options.some(o=>o.includes('1 Battle Sister’s boltgun')&&o.includes('multi-melta')))throw Error('Review Battle Sisters special/heavy limits');
   // The relational source lists whole-unit combinations in a per-bearer
   // constraint. Express the printed limit as two guns, at most one heavy.
   limits.splice(0,1,
    {role:'Battle Sister',thresholds:[{models:0,choices:2}],choices:['Artificer-crafted storm bolter','Meltagun','Ministorum flamer','Heavy bolter','Ministorum heavy flamer','Multi-melta'].map(w=>[w])},
    {role:'Battle Sister',thresholds:[{models:0,choices:1}],choices:['Heavy bolter','Ministorum heavy flamer','Multi-melta'].map(w=>[w])});
  }
  if(source.name==='Celestian Insidiants'){
   if(limits.length!==2||options.length!==6)throw Error('Review Celestian Insidiant specialist limits');
   limits.push(...['Virge of admonition','Denuncia oratory','Simulacrum imperialis'].map(item=>limit('Celestian Insidiant',item)));
  }
  if(source.name==='Sanctifiers'){
   if(limits.length||options.length!==4||!options.some(o=>o.includes('plasma gun cannot be replaced')))throw Error('Review Sanctifier specialist limits');
   limits.push(limit('Sanctifier','Simulacrum imperialis'),{role:'Sanctifier',thresholds:[{models:0,choices:1}],choices:[['Ministorum hand flamer','Ministorum hand flamer']]});
  }
 },
 },[args[0],args[1],prepared,args[3]]);
 // The common importer's slug doubles as a filename; retain the executable
 // entry point used by this faction instead of advertising a missing script.
 writeFileSync(args[3],readFileSync(args[3],'utf8').replace('scripts/import-adepta-sororitas-loadouts.mjs','scripts/import-sororitas-loadouts.mjs'));
}finally{rmSync(prepared,{recursive:true,force:true});}
