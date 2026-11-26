import {readFileSync,writeFileSync,appendFileSync,mkdtempSync,rmSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parse,stringify} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';
import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {SM_SOURCE_IDS,spaceMarineCompositions,spaceMarineManual,spaceMarineNameKey} from './import-space-marines-relational.mjs';
import {spaceMarineWeapons} from './import-space-marines-weapons.mjs';

const [csv,manualDirectory,relationalDirectory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-space-marines-loadouts.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY OUTPUT_TS');
const temporary=mkdtempSync(join(tmpdir(),'space-marines-loadouts-'));
try{
 const {tables}=await loadExport({directory:csv});
 const native=tables.Datasheets.filter(d=>d.faction_id==='SM'&&SM_SOURCE_IDS.includes(d.source_id));
 const manual=slug=>parse(readFileSync(join(manualDirectory,slug+'.yaml'),'utf8'));
 const prices=spaceMarineManual(manual('space-marines'),manual('deathwatch'),native);
 writeFileSync(join(temporary,'manual.yaml'),stringify({slug:'space-marines',version:'1.6',firstSeen:'2026-10-14',units:[...prices.values()]}));
 const read=name=>JSON.parse(readFileSync(join(relationalDirectory,'adeptus-astartes',name+'.json'),'utf8'));
 const allUnits=read('units'),units=allUnits.filter(u=>!u.faction_keywords.includes('Black Templars')&&native.some(d=>spaceMarineNameKey(d.name)===spaceMarineNameKey(u.name)));
 const compositions=spaceMarineCompositions(read('unit-compositions'),allUnits).filter(c=>units.some(u=>u.id===c.unit_id));
 const unitEquipment={};
 for(const c of compositions){
  const slots=c.loadout.slots.filter(s=>!s.model);if(!slots.length)continue;
  const expected=['grapnel-launcher','grav-chutes'].map(id=>({picks:1,repeats:false,alternate:false,choices:[[],[{id,count:1}]]}));
  if(c.unit_id!=='reiver-squad'||!isDeepStrictEqual(slots,expected))throw Error('Review unit-level equipment '+c.unit_id);
  const d=native.find(d=>d.name==='Reiver Squad'),options=tables.Datasheets_options.filter(o=>o.datasheet_id===d.id);
  if(!['Grav-chutes','Grapnel Launchers'].every(name=>options.some(o=>o.description==='This unit can be equipped with 1 '+name)))throw Error('Review printed Reiver unit equipment');
  // The independent Grapnel record still carries its inherited 10th-edition
  // metadata. Only this exact item is retained under the current printed rule.
  const grapnel=read('wargear').find(w=>w.id==='grapnel-launcher');
  if(grapnel?.name!=='grapnel launcher'||grapnel.game_version.edition!=='10th'||grapnel.game_version.dataslate!=='2025-q3')throw Error('Review inherited Reiver Grapnel record');
  unitEquipment[d.name]=['Grav-chutes','Grapnel Launchers'].map(label=>({label,choices:[[],[label]]}));
 }
 const uniform={
  'aggressor-squad':'All models in this unit can each have their Flamestorm Gauntlets replaced with 1 Auto Boltstorm Gauntlets and 1 Fragstorm Grenade Launcher.',
  'inceptor-squad':'All models in this unit can each have their Assault Bolters replaced with 1 Plasma Exterminators.',
  'eliminator-squad':'All Eliminator models in this unit can each have their Bolt Sniper Rifle replaced with 1 Las Fusil.',
  'desolation-squad':'All models in this unit can each have their Superfrag Rocket Launcher replaced with 1 Superkrak Rocket Launcher.',
  'vanguard-veteran-squad-with-jump-packs':'All models in this unit can each have their Heavy Bolt Pistol replaced with 1 Combat Shield.',
 };
 for(const c of compositions.filter(c=>c.loadout.uniform.length)){
  const d=native.find(d=>spaceMarineNameKey(d.name)===spaceMarineNameKey(units.find(u=>u.id===c.unit_id).name));
  const options=tables.Datasheets_options.filter(o=>o.datasheet_id===d.id);
  if(!uniform[c.unit_id]||c.loadout.uniform.length!==1||!options.some(o=>o.description===uniform[c.unit_id]))throw Error('Review whole-unit exchange '+c.unit_id);
  if(c.unit_id==='vanguard-veteran-squad-with-jump-packs'&&![
   'The Vanguard Veteran Sergeant with Jump Pack can have their Heavy Bolt Pistol replaced with 1 Plasma Pistol.',
   'For every 5 models in this unit, up to 2 Vanguard Veteran with Jump Pack models can each have their Heavy Bolt Pistol replaced with 1 Plasma Pistol.',
  ].every(text=>options.some(o=>o.description===text)))throw Error('Review Vanguard pistol replacements');
  // The runtime presents one whole-unit field, retaining legal Sergeant exceptions.
  c.loadout.uniform=[];
 }
 for(const [name,rows] of [['units',units],['unit-compositions',compositions],['weapons',spaceMarineWeapons(read('weapons'))],['wargear',read('wargear')]])writeFileSync(join(temporary,name+'.json'),JSON.stringify(rows));
 await importFactionLoadouts({slug:'space-marines',factionId:'SM',sourceId:'000000139',packAircraftOrModels:native.filter(d=>d.source_id!=='000000139').map(d=>d.name),expected:97,paid:9,table:'SM_KITS',title:'Space Marines',
  adjustRole(source,template,slots,expanded){
   if(source.name==='Land Raider'){
    const gun=template.items.find(i=>i.id==='godhammer-lascannon');
    if(gun?.count!==1||!source.loadout.includes('2 Godhammer Lascannon'))throw Error('Review paired Land Raider lascannons');
    return compileModelEquipment({...template,items:template.items.map(i=>i===gun?{...i,count:2}:i)},slots,expanded);
   }
  },
  adjustLimits(source,limits,options){
   if(source.name==='Deathwatch Veterans'){
    const rule=options.find(o=>o.includes('black shield blades')||o.includes('Black Shield Blades'));
    if(!rule||!/^1 Deathwatch Veteran/.test(rule))throw Error('Review Black Shield blade limit');
    limits.push({role:'Deathwatch Veteran',thresholds:[{models:5,choices:1}],choices:[['Black Shield blades']]});
   }
  },
 },[csv,join(temporary,'manual.yaml'),temporary,destination]);
 appendFileSync(destination,'export const SM_UNIT_EQUIPMENT='+JSON.stringify(unitEquipment)+' as const;\n');
}finally{rmSync(temporary,{recursive:true,force:true});}
