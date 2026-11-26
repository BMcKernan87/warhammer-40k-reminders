import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {csmWeapons} from './import-csm-relational.mjs';

const args=process.argv.slice(2);
if(!args[3])throw Error('Usage: node scripts/import-csm-loadouts.mjs CSV_DIR MFM_YAML RELATIONAL_DATA_DIR OUTPUT_TS');
const prepared=mkdtempSync(join(tmpdir(),'csm-equipment-'));
let havocStock=false;
try{
for(const name of ['units','unit-compositions','wargear'])copyFileSync(join(args[2],name+'.json'),join(prepared,name+'.json'));
writeFileSync(join(prepared,'weapons.json'),JSON.stringify(csmWeapons(JSON.parse(readFileSync(join(args[2],'weapons.json'),'utf8')))));
await importFactionLoadouts({
 slug:'chaos-space-marines',title:'Chaos Space Marines',factionId:'CSM',sourceId:'000000012',table:'CSM_KITS',expected:54,paid:2,
 adjustRole(source,t,slots,expanded,options){
  if(source.name!=='Chaos Terminator Squad')return;
  // Paired accursed weapons replace both arms; no gun remains on that model.
  const own=slots.filter(s=>s.model===t.model),paired=own.filter(s=>s.alternate).flatMap(s=>s.choices);
  if(paired.length!==1||expanded(paired[0]).join()!=='Paired accursed weapons'||!options.some(o=>o.includes('combi-bolter and accursed weapon')))throw Error('Review paired Terminator replacement');
  const normal=compileModelEquipment(t,own.filter(s=>!s.alternate),expanded);
  if(normal.slots.length!==2||normal.fixed.length)throw Error('Review Terminator arm choices');
  const [a,b]=normal.slots;
  return {role:t.model,fixed:[],slots:[{label:'Weapons',choices:[...a.choices.flatMap(left=>b.choices.map(right=>[...left,...right])),expanded(paired[0])]}]};
 },
 adjustEquipment(source,roles,_limits,options){
  if(source.name==='Legionaries'){
   // The independent enumeration contains an impossible third replacement
   // weapon: the Champion has only its boltgun and bolt pistol to exchange.
   // https://wahapedia.ru/wh40k11ed/factions/chaos-space-marines/Legionaries
   const field=roles.find(r=>r.role==='Aspiring Champion').slots.find(s=>s.choices.some(c=>c.length===3));
   if(!field||field.choices.length!==19||field.choices.filter(c=>c.length===3).length!==1||field.choices.find(c=>c.length===3).join('|')!=='Astartes chainsword|Heavy melee weapon|Plasma pistol'||!options.some(o=>o.startsWith('The Aspiring Champion’s boltgun can be replaced'))||!options.some(o=>o.startsWith('The Aspiring Champion’s bolt pistol can be replaced'))||!options.some(o=>o==='* Maximum 1 per model.'))throw Error('Review Legionary Champion replacements');
   field.choices=field.choices.filter(c=>c.length===2);
  }
  if(source.name==='Red Corsairs Raiders'){
   // The two separate replacements may be made by the same physical Raider.
   // Current v1.2 publisher card, also transcribed in source.link.
   const field=roles.find(r=>r.role==='Red Corsairs Raider').slots[0];
   if(field.choices.length!==3||!options.some(o=>o.includes('1 Red Corsairs Raider’s boltgun can be replaced with 1 meltagun')&&o.includes('1 Red Corsairs Raider’s reaver’s blade can be replaced with 1 power fist')))throw Error('Review Red Corsairs Raider replacements');
   field.choices.push(['Bolt pistol','Meltagun','Power fist']);
  }
  if(source.name==='Havocs'){
   // Templates describe one generic Havoc. The printed stock unit instead
   // starts with two autocannons and two lascannons, all freely replaceable.
   // https://wahapedia.ru/wh40k11ed/factions/chaos-space-marines/Havocs
   if(!source.loadout.includes('2 Havocs are equipped with:</b> Havoc autocannon; close combat weapon.')||!source.loadout.includes('2 Havocs are equipped with:</b> Havoc lascannon; close combat weapon.')||roles.find(r=>r.role==='Havoc').slots.length!==1)throw Error('Review mixed Havoc standard weapons');
   havocStock=true;
  }
 },
 adjustLimits(source,limits,options){
  if(source.name==='Legionaries'){
   const limit=limits.find(l=>l.role==='Legionary'&&l.choices.some(c=>c.includes('Plasma gun')));
   if(!limit||limit.choices.length!==9||limit.thresholds.some(t=>t.per_choice)||!options.some(o=>o.includes('For every 5 models in this unit, 1 Legionary’s boltgun')&&o.includes('(duplicates are not allowed)')))throw Error('Review Legionary specialist uniqueness');
   limit.thresholds=limit.thresholds.map(t=>({...t,per_choice:1}));
  }
  if(source.name==='Raptors'){
   // The v1.2 replacement card has one distinct pair of special guns per
   // five models, not four freely duplicated guns at the upper strength.
   const limit=limits.find(l=>l.role==='Raptor'&&l.choices.some(c=>c.includes('Plasma gun')));
   if(!limit||limit.choices.length!==3||limit.thresholds.some(t=>t.per_choice)||options.filter(o=>o.includes('you cannot select the same option more than once')).length!==2)throw Error('Review Raptor specialist uniqueness');
   limit.thresholds=limit.thresholds.map(t=>({...t,per_choice:t.models===10?2:1}));
  }
 },
},[args[0],args[1],prepared,args[3]]);
if(!havocStock)throw Error('Missing Havoc standard weapons');
writeFileSync(args[3],readFileSync(args[3],'utf8').replace('scripts/import-chaos-space-marines-loadouts.mjs','scripts/import-csm-loadouts.mjs')+
 'export const CSM_HAVOC_GUNS:readonly string[]=["Havoc autocannon","Havoc autocannon","Havoc lascannon","Havoc lascannon"];\n');
}finally{rmSync(prepared,{recursive:true,force:true});}
