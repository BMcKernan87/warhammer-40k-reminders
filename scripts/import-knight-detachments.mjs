import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseExport} from './import-wahapedia-11e.mjs';

const folder=process.argv[2];
const faction=process.argv[3]??'QI';
if(!['QT','QI'].includes(faction))throw Error('Use QI for Imperial Knights or QT for Chaos Knights');
const chaos=faction==='QT';
if (!folder) throw Error('Supply the directory containing the current Wahapedia 11th-edition CSV export');
const read=(table,cols)=>parseExport(readFileSync(join(folder,table+'.csv'),'utf8'),cols,table);
const normalize=value=>value.replace(/[‑–]/g,'-').replaceAll('’',"'").toLowerCase();
const sheets=read('Datasheets',['id','name','faction_id']);
const sheetNames=new Map(sheets.map(row=>[row.id,row.name]));
const links=read('Datasheets_enhancements',['datasheet_id','enhancement_id']);
const selected=table=>read(table,['id','name','faction_id','detachment']).filter(r=>r.faction_id===faction);
const options=selected('Enhancements').map(r=>{
 const units=links.filter(l=>l.enhancement_id===r.id).map(l=>sheetNames.get(l.datasheet_id));
 if(!units.length||units.includes(undefined)||!/^\d+$/.test(r.cost))throw Error('Unresolved enhancement '+r.name);
 return {name:r.name,detachment:r.detachment,points:Number(r.cost),repeatable:r.upgrade==='true',...(chaos?{anyChaosCharacter:/^Chaos Knights model only/i.test(r.description.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())}:{}),units:units.map(normalize).sort()};
});
const strats=selected('Stratagems').map(r=>{
 const description=r.description.replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ');
 const when=description.match(/WHEN\s*:\s*(.*?)\s*TARGET\s*:/i)?.[1]?.toLowerCase();
 if(!when||!/^\d+$/.test(r.cp_cost))throw Error('Invalid Stratagem '+r.name);
 const phases=when.includes('any phase')?['Command','Movement','Shooting','Charge','Fight']:
   ['Command','Movement','Shooting','Charge','Fight'].filter(phase=>when.includes(phase.toLowerCase()+' phase')||when.includes(phase.toLowerCase()+' or '));
 if(!phases.length)throw Error('Unknown phase '+when);
 const windowText=when.split(',')[0];
 const windows=phases.map(phase=>({phase,turn:windowText.includes('opponent')&&phase!=='Fight'?'opponent':
   phase==='Fight'&&phases.length>1?'either':windowText.includes('opponent')?'opponent':windowText.includes('your ')?'own':'either'}));
 const timing=when.startsWith('start of')||when.startsWith('the start of')?'start':when.startsWith('end of')?'end':'during';
 return {id:r.id,name:r.name,detachment:r.detachment,cp:Number(r.cp_cost),timing,windows};
});
if(options.length!==(chaos?28:26)||strats.length!==39)throw Error('Review changed Imperial Knights roster before updating the published rules');
const revision=read('Last_update',['last_update'])[0].last_update;
const format=rows=>rows.map(r=>'  '+JSON.stringify(r)).join(',\n');
const abilities=read('Datasheets_abilities',['datasheet_id','name','ability_id']);
const weapons=read('Datasheets_wargear',['datasheet_id','name']);
const keywords=read('Datasheets_keywords',['datasheet_id','keyword']);
const traits=sheets.filter(s=>s.faction_id===faction).map(s=>{
 const rows=abilities.filter(a=>a.datasheet_id===s.id);
 const profile=weapons.filter(w=>w.datasheet_id===s.id);
 if(chaos){
   const words=keywords.filter(k=>k.datasheet_id===s.id).map(k=>normalize(k.keyword));
   return {unit:s.name,native:rows.some(a=>a.ability_id==='000008512'),walker:rows.some(a=>a.ability_id==='000008513'),
     dog:words.includes('war dog'),character:words.includes('character'),abhorrent:words.includes('abhorrent'),
     dogAura:rows.some(a=>!a.ability_id&&a.name.toLowerCase().includes('(aura)')&&a.description.toLowerCase().includes('dog')),
     damned:words.includes('damned')};
 }
 return {unit:s.name,chivalric:rows.some(a=>a.ability_id==='000008458'),walker:rows.some(a=>a.ability_id==='000008460'),
   bondsman:rows.some(a=>a.name.includes('(Bondsman)')),feet:profile.some(w=>/^(titanic|armoured) feet$/i.test(w.name)),
   blast:profile.some(w=>w.description.toLowerCase().includes('blast'))};
});
const prefix=chaos?'CHAOS_KNIGHT':'KNIGHT';
const output='// Generated from the Wahapedia 11th-edition export '+revision+'.\n'
 +'export const '+prefix+'_TRAITS = [\n'+format(traits)+'\n];\n'
 +'export const '+prefix+'_UPGRADES = [\n'+format(options)+ '\n];\n'
 +'export const '+prefix+'_STRATAGEMS = [\n'+format(strats)+'\n] as const;\n';
writeFileSync(fileURLToPath(new URL('../src/'+(chaos?'chaos':'imperial')+'-knight-detachments.generated.ts',import.meta.url)),output);
