import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';
import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {drukhariWeapons} from './import-drukhari-relational.mjs';

const [csv,manualDirectory,relationalDirectory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-drukhari-loadouts.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY OUTPUT_TS');
const {tables}=await loadExport({directory:csv});
const names=tables.Datasheets.filter(d=>d.faction_id==='DRU'&&d.source_id==='000000186').map(d=>d.name.toLowerCase());
const temporary=mkdtempSync(join(tmpdir(),'drukhari-loadouts-')),result=[];
try{
 for(const [slug,factionId,sourceId,title,expected,paid] of [['drukhari','DRU','000000031','Drukhari',23,3],['aeldari','AE','000000186','Aeldari',14,0]]){
  for(const name of ['units','unit-compositions','wargear'])copyFileSync(join(relationalDirectory,slug,name+'.json'),join(temporary,name+'.json'));
  const weapons=JSON.parse(readFileSync(join(relationalDirectory,slug,'weapons.json'),'utf8'));
  writeFileSync(join(temporary,'weapons.json'),JSON.stringify(slug==='drukhari'?drukhariWeapons(weapons):weapons));
  const mfm=parse(readFileSync(join(manualDirectory,slug+'.yaml'),'utf8'));
  if(slug==='aeldari')mfm.units=mfm.units.filter(u=>!u.legends&&names.includes(u.name.toLowerCase()));
  writeFileSync(join(temporary,'manual.json'),JSON.stringify(mfm));
  const output=join(temporary,'kits.ts');
  await importFactionLoadouts({slug,factionId,sourceId,title,expected,paid,table:'IMPORTED_KITS',itemNames:{'torturers-tool':'Torturer’s tools'},
   adjustRole(source,t,slots,expanded,options){
    if(source.name==='Ravager'){
     const repeated=slots.find(s=>s.model===t.model&&s.picks===3&&s.repeats);
     if(!repeated||repeated.choices.length!==2||expanded(repeated.choices[0]).join()!=='Dark lance'||expanded(repeated.choices[1]).join()!=='Disintegrator cannon'||!options.includes('Any number of this model’s dark lances can each be replaced with 1 disintegrator cannon.'))throw Error('Review three independent Ravager cannons');
     const choices=Array.from({length:4},(_,n)=>[...Array.from({length:3-n},()=>repeated.choices[0]).flat(),...Array.from({length:n},()=>repeated.choices[1]).flat()]);
     return compileModelEquipment(t,slots.map(s=>s===repeated?{...s,picks:1,repeats:false,choices}:s),expanded);
    }
    if(source.name==='Archon'){
     if(t.model!=='Archon'||t.items.some(i=>i.id==='shadowfield')||!source.loadout.endsWith('shadowfield.'))throw Error('Review printed Archon shadowfield');
     return compileModelEquipment({...t,items:[...t.items,{id:'shadowfield',count:1}]},slots,expanded);
    }
    if(source.name==='Corsair Voidscarred'&&['Shade Runner','Soul Weaver','Way Seeker'].includes(t.model)){
     // The independent slots omit each specialist's printed close combat
     // weapon, although its physical model record and current card retain it.
     if(!source.loadout.includes('close combat weapon')||t.items.some(i=>i.id==='close-combat-weapon-corsair-voidscarred'))throw Error('Review specialist close combat weapon');
     const role=compileModelEquipment(t,slots,expanded);
     return {...role,fixed:[...role.fixed,'Close combat weapon']};
    }
   },
   adjustEquipment(source,roles,limits,options){
    if(source.name==='Hand of the Archon'){
     // The independent limits record only the two paired gun groups. Each
     // remaining printed one-model specialist exchange is also unique.
     const singles=['Stinger pistol','Shardcarbine','Pain sculptors','Razorflail','Stimm-needler'];
     for(const item of singles){
      if(!options.some(o=>o.startsWith('1 Kabalite Agent')&&o.toLowerCase().includes(item.toLowerCase()))||limits.some(l=>l.choices.some(c=>c.includes(item))))throw Error('Review Hand specialist cap '+item);
      limits.push({role:'Kabalite Agents',thresholds:[{models:0,choices:1}],choices:[[item]]});
     }
    }
    if(source.name==='Incubi'){
     if(!options.includes('For every 5 models in this unit, it can be equipped with 1 Incubi Shrine token.')||limits.length!==1||limits[0].role||limits[0].choices[0].join()!=='Incubi Shrine token')throw Error('Review unit-level Incubi tokens');
     // Tokens are unit equipment, not extra models or a particular bearer.
     // Runtime exposes one capped unit-level token field separately.
     limits.splice(0);
    }
   },
   adjustLimits(source,limits,options){
    if(source.name==='Corsair Skyreavers'){
     const l=limits.find(l=>l.role==='Skyreaver'&&l.choices.some(c=>c.includes('Blaster')));
     if(!l||!options.some(o=>o.includes('You cannot select the same option more than once')))throw Error('Review Skyreaver special-weapon uniqueness');
     l.thresholds=l.thresholds.map(t=>({...t,per_choice:t.models===10?2:1}));
    }
   },
  },[csv,join(temporary,'manual.json'),temporary,output]);
  const text=readFileSync(output,'utf8');
  result.push(...JSON.parse(text.slice(text.indexOf('=[')+1,text.lastIndexOf(';'))));
 }
 result.sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
 writeFileSync(destination,"// Generated by scripts/import-drukhari-loadouts.mjs from current Drukhari/Aeldari cards and MFM v1.6.\nimport type {ModelEquipmentTable} from './model-equipment-slots';\nexport const DRUKHARI_KITS:readonly Omit<ModelEquipmentTable,'tiers'>[]=[\n"+result.map(k=>' '+JSON.stringify(k)).join(',\n')+'\n];\n');
}finally{rmSync(temporary,{recursive:true,force:true});}
