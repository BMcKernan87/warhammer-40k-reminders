import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {tauCompositions} from './import-tau-composition.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parse,stringify} from 'yaml';
const args=process.argv.slice(2),directory=args[2];
if(!args[3])throw Error('Usage: node scripts/import-tau-loadouts.mjs CSV_DIR MFM_YAML RELATIONAL_DATA_DIR OUTPUT_TS');
const {tables}=await loadExport({directory:args[0]});
const prepared=mkdtempSync(join(tmpdir(),'tau-equipment-'));
const normalized=items=>items.map(i=>i.id+'#'+i.count).sort().join('|');
function combinations(slot){
 if(slot.alternate||!Number.isInteger(slot.picks)||slot.picks<1||slot.picks>6)throw Error('Unreviewed T’au repeated slot');
 const results=new Map();
 function pick(n,first,items){
  if(n===slot.picks){
   const counts=new Map();for(const i of items)counts.set(i.id,(counts.get(i.id)??0)+i.count);
   if((counts.get('guardian-drone')??0)>1)return;
   const merged=[...counts].sort(([a],[b])=>a.localeCompare(b,'en')).map(([id,count])=>({id,count}));
   results.set(normalized(merged),merged);return;
  }
  slot.choices.forEach((choice,index)=>{if(index>=first)pick(n+1,slot.repeats||choice.length===0?index:index+1,[...items,...choice]);});
 }
 pick(0,0,[]);return [...results.values()];
}
function adjustRole(source,template,slots,expanded,options){
 const own=slots.filter(s=>s.model===template.model);
 if(source.name.startsWith('Commander In ')){
  const primary=own.find(s=>s.picks===1&&s.choices.length>1),extras=own.find(s=>s.picks===3),drones=own.find(s=>s.picks===2);
  const fixed=own.filter(s=>s.picks===1&&s.choices.length===1).flatMap(s=>expanded(s.choices[0]));
  if(!primary||!extras||!drones||!options.some(o=>o.includes('cannot have duplicates')))throw Error('Review Commander hardpoints');
  const stock=expanded(template.items).filter(x=>!fixed.includes(x));
  const optionsPrimary=primary.choices.map(expanded),defaultIndex=optionsPrimary.findIndex(c=>JSON.stringify(c)===JSON.stringify(stock));
  if(defaultIndex<0)throw Error('Review Commander stock weapon');
  return {role:template.model,fixed,slots:[
   {label:'Primary weapon or system',choices:[optionsPrimary[defaultIndex],...optionsPrimary.filter((_,i)=>i!==defaultIndex)]},
   ...Array.from({length:3},(_,i)=>({label:'Additional weapon or system '+(i+1),choices:extras.choices.map(expanded)})),
   {label:'Drones',choices:combinations(drones).map(expanded)},
  ]};
 }
 const layers=own.map(s=>{
  if(s.picks===1&&!s.repeats&&!s.alternate)return s;
  let choices=combinations(s);
  if(source.name==='Stealth Battlesuits'){
   if(!options.includes('The Stealth Shas’vre can be equipped with 1 gun drone.')||!options.includes('The Stealth Shas’vre can be equipped with 1 marker drone.'))throw Error('Review Stealth drone permissions');
   choices=choices.filter(c=>c.every(i=>i.count===1));
  }
  return {...s,picks:1,repeats:false,alternate:false,choices};
 });
 return compileModelEquipment(template,layers,expanded);
}
const droneWeapons={'gundrone':'Twin pulse carbine','missiledrone':'Missile pod','recondrone':'Drone burst cannon','mv15gundrone':'Twin pulse blaster'};
const key=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function adjustEquipment(source,roles,limits,options){
 const granted=items=>items.flatMap(item=>droneWeapons[key(item)]?[item,droneWeapons[key(item)]]:[item]);
 for(const role of roles){
  role.fixed=granted(role.fixed);
  for(const slot of role.slots){
   const items=slot.choices.flat().map(key);
   if(items.length&&items.every(i=>['gundrone','markerdrone','shielddrone','guardiandrone','missiledrone'].includes(i)))slot.label='Drones';
   else if(items.length&&items.every(i=>['gravinhibitordrone','pulseacceleratordrone','recondrone'].includes(i)))slot.label='Support drone';
   else if(items.length&&items.every(i=>i==='seekermissile'))slot.label='Seeker missiles';
   else if(source.name==='Broadside Battlesuits'&&items.includes('weaponsupportsystem'))slot.label='Additional weapons or support system';
   slot.choices=slot.choices.map(granted);
  }
 }
 if(source.name==='Stealth Battlesuits'){
  if(!options.includes('1 Stealth Shas’ui can be equipped with 1 homing beacon.'))throw Error('Review homing beacon limit');
  limits.push({role:'Stealth Shas’ui',thresholds:[{models:0,choices:1}],choices:[['Homing beacon']]});
 }
}
try{
 for(const name of ['units','weapons'])copyFileSync(join(directory,name+'.json'),join(prepared,name+'.json'));
 const gear=JSON.parse(readFileSync(join(directory,'wargear.json'),'utf8'));
 const platform=gear.find(i=>i.id==='tidewall-defence-platform');
 const shieldline=tables.Datasheets.find(s=>s.name==='Tidewall Shieldline'&&s.faction_id==='TAU');
 const option=tables.Datasheets_options.filter(o=>o.datasheet_id===shieldline?.id);
 if(platform?.name!=='Tidewall defence platform'||platform.game_version.edition!=='10th'||option.length!==1||option[0].description!=='This model can be equipped with 1 Tidewall defence platform.')throw Error('Review current Tidewall platform equipment');
 // The extractor retained this item at 10e after representing the 11e MFM
 // add-on as a model. Its current card explicitly grants the equipment.
 platform.game_version={edition:'11th',dataslate:'2026-10-14'};
 writeFileSync(join(prepared,'wargear.json'),JSON.stringify(gear));
 writeFileSync(join(prepared,'unit-compositions.json'),JSON.stringify(tauCompositions(JSON.parse(readFileSync(join(directory,'unit-compositions.json'),'utf8')))));
 const manual=parse(readFileSync(args[1],'utf8')),price=manual.units.find(u=>u.name==='Tidewall Shieldline');
 const addon=price?.pricing[0]?.costs[1];
 if(price.pricing.length!==1||price.pricing[0].costs.length!==2||addon?.addon!==true||addon.models!==1||addon.points!==20||addon.desc!=='Tidewall Defence Platform')throw Error('Review Tidewall platform MFM addon');
 price.wargear=[{item:'Tidewall defence platform',points:addon.points}];
 const manualPath=join(prepared,'tau-empire.yaml');writeFileSync(manualPath,stringify(manual));
 await importFactionLoadouts({
  slug:'tau-empire',title:'T’au Empire',factionId:'TAU',sourceId:'000000028',packAircraftOrModels:['Ta’unar Supremacy Armour','Tiger Shark','AX-1-0 Tiger Shark','Manta'],table:'TAU_KITS',expected:43,paid:7,
  itemNames:{'hunting-blades':'Close combat weapon','rampager-fists':'Krootox fists'},
  conditionalProfiles:{'Strike Team':['Support turret'],'Breacher Team':['Support turret']},
  adjustRole,adjustEquipment,
 },[args[0],manualPath,prepared,args[3]]);
 writeFileSync(args[3],readFileSync(args[3],'utf8').replace('scripts/import-tau-empire-loadouts.mjs','scripts/import-tau-loadouts.mjs'));
}finally{rmSync(prepared,{recursive:true,force:true});}
