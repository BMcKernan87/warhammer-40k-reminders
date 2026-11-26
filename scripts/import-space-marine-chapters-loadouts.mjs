import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {isDeepStrictEqual} from 'node:util';
import {parse,stringify} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';
import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {CHAPTER_SPECS,chapterNameKey as key,chapterCompositions,chapterIndependent,chapterManual} from './import-space-marine-chapters-relational.mjs';
import {chapterWeapons} from './import-space-marine-chapters-weapons.mjs';

const [csv,manualDirectory,relationalDirectory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-space-marine-chapters-loadouts.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY OUTPUT_TS');
const temporary=mkdtempSync(join(tmpdir(),'space-marine-chapters-loadouts-'));
try{
 const {tables}=await loadExport({directory:csv});
 const read=name=>JSON.parse(readFileSync(join(relationalDirectory,'adeptus-astartes',name+'.json'),'utf8'));
 const allUnits=read('units'),allCompositions=chapterCompositions(read('unit-compositions'),allUnits),weapons=chapterWeapons(read('weapons')),wargear=read('wargear');
 const kits=[],unitEquipment={},splitRules={};
 const splits={
  'Grey Hunters':{rule:'Old Greymanes',kind:'equal',text:'In the Declare Battle Formations step, you can split this unit into two units, each containing as equal a number of models as possible (when splitting a unit in this way, make a note of which models form each of the two new units).'},
  'Wolf Guard Headtakers':{rule:'Let Loose the Wolves',kind:'roles',text:'At the start of the Declare Battle Formations step, you can split this unit into two units, one containing all Wolf Guard Headtaker models and all leader/support models, the other containing all Hunting Wolves models, with new starting strengths accordingly.'},
 };
 for(const spec of CHAPTER_SPECS){
  const native=tables.Datasheets.filter(d=>d.faction_id==='SM'&&d.source_id===spec.sourceId);
  for(const d of native){
   const split=splits[d.name];if(!split)continue;
   if(spec.faction!=='Space Wolves'||!tables.Datasheets_abilities.some(a=>a.datasheet_id===d.id&&a.name===split.rule&&a.description===split.text))throw Error('Review chapter physical split rule '+d.name);
   (splitRules[spec.faction]??={})[d.name]={rule:split.rule,kind:split.kind,source:d.link};
  }
  const manual=chapterManual(parse(readFileSync(join(manualDirectory,spec.slug+'.yaml'),'utf8')),spec);
  manual.units=manual.units.filter(u=>native.some(d=>key(d.name)===key(u.name)));
  const units=native.map(d=>chapterIndependent(allUnits,d.name,spec.faction));
  const compositions=structuredClone(allCompositions.filter(c=>units.some(u=>u.id===c.unit_id)));
  unitEquipment[spec.faction]={};
  for(const c of compositions){
   const d=native.find(d=>key(d.name)===key(units.find(u=>u.id===c.unit_id).name)),options=tables.Datasheets_options.filter(o=>o.datasheet_id===d.id);
   const unitSlots=c.loadout.slots.filter(s=>!s.model);
   if(unitSlots.length){
    const expected=[{picks:1,repeats:false,alternate:false,choices:[[],[{id:'watcher-in-the-dark',count:1}]]}];
    if(!['Deathwing Knights','Deathwing Terminator Squad'].includes(d.name)||!isDeepStrictEqual(unitSlots,expected)||!options.some(o=>o.description.replace(/\.$/,'')==='This unit can be equipped with 1 Watcher in the Dark'))throw Error('Review chapter unit equipment '+d.name);
    unitEquipment[spec.faction][d.name]=[{label:'Watcher in the Dark',choices:[[],['Watcher in the Dark']]}];
   }
   if(c.loadout.uniform.length){
    const expected=[{model:'Deathwing Knights',choices:[{items:[{id:'mace-of-absolution',count:1}],substitute:false},{items:[{id:'power-weapon-deathwing-knights',count:1}],substitute:false}]}];
    if(d.name!=='Deathwing Knights'||!isDeepStrictEqual(c.loadout.uniform,expected)||!options.some(o=>o.description==='All Deathwing Knight models in this unit can each have their Mace of Absolution replaced with 1 Power Weapon.'))throw Error('Review chapter whole-unit exchange '+d.name);
    c.loadout.uniform=[];
   }
  }
  for(const [name,rows] of [['units',units],['unit-compositions',compositions],['weapons',weapons],['wargear',wargear]])writeFileSync(join(temporary,name+'.json'),JSON.stringify(rows));
  writeFileSync(join(temporary,'manual.yaml'),stringify(manual));
  const output=join(temporary,'kits.ts');
  await importFactionLoadouts({slug:spec.slug,factionId:'SM',sourceId:spec.sourceId,expected:spec.cards,paid:spec.paid,table:'CHAPTER_TEMP_KITS',title:spec.faction,
   adjustLimits(source,limits,options){
    if(source.name==='Sword Brethren Squad'){
     const required=[
      'For every 4 models in this unit, up to 2 models can each have their Heavy Bolt Pistol replaced with 1 Hand Flamer.',
      'Any number of models can each have their Chainsword replaced with 1 Master-crafted Power Weapon.',
      'For every 4 models in this unit, 1 model can have their Chainsword replaced with 1 Thunder Hammer.',
      'For every 4 models in this unit, 1 model can have their Heavy Bolt Pistol replaced with 1 Plasma Pistol.',
      'For every 4 models in this unit, 1 model can have their Heavy Bolt Pistol and Chainsword replaced with 1 Twin Lightning Claws.',
     ];
     if(limits.length||!isDeepStrictEqual(options,required))throw Error('Review Sword Brethren printed equipment caps');
     for(const [item,count] of [['Hand flamer',2],['Thunder hammer',1],['Plasma pistol',1],['Twin lightning claws',1]])limits.push({role:'Sword Brother',thresholds:[{models:4,choices:count},{models:8,choices:2*count}],choices:[[item]]});
    }
    if(source.name==='Wolf Scouts'){
     const required=['1 Wolf Scout model can have their Plasma Pistol and Combat Knife replaced with one of the following: 1 Bolt Pistol, 1 Runic Stave, 1 Thunderclap','1 Wolf Scout model can have their Plasma Pistol replaced with 1 Plasma Gun.'];
     if(!required.every(rule=>options.includes(rule))||limits.length!==2||limits.some(l=>l.choices.some(c=>c.includes('Runic Stave')||c.includes('Plasma gun'))))throw Error('Review one-model Wolf Scout exchanges');
     limits.push({role:'Wolf Scout',thresholds:[{models:0,choices:1}],choices:[['Runic stave']]},{role:'Wolf Scout',thresholds:[{models:0,choices:1}],choices:[['Plasma gun']]});
    }
   },
  },[csv,join(temporary,'manual.yaml'),temporary,output]);
  const generated=readFileSync(output,'utf8');
  const rows=JSON.parse(generated.slice(generated.indexOf('=[\n')+1,generated.lastIndexOf('];')+1));
  kits.push(...rows.map(k=>({faction:spec.faction,...k})));
 }
 if(kits.length!==66||kits.filter(k=>Object.keys(k.costs).length).length!==9)throw Error('Review complete chapter equipment inventory');
 writeFileSync(destination,"// Generated by scripts/import-space-marine-chapters-loadouts.mjs.\nimport type {ModelEquipmentTable} from './model-equipment-slots';\n"+
  'export const CHAPTER_KITS:readonly (Omit<ModelEquipmentTable,"tiers">&{faction:string})[]=[\n'+kits.map(k=>' '+JSON.stringify(k)).join(',\n')+'\n];\n'+
  'export const CHAPTER_UNIT_EQUIPMENT:Readonly<Record<string,Readonly<Record<string,readonly {label:string;choices:readonly (readonly string[])[]}[]>>>>='+JSON.stringify(unitEquipment)+';\n'+
  'export const CHAPTER_SPLIT_RULES:Readonly<Record<string,Readonly<Record<string,{rule:string;kind:"equal"|"roles";source:string}>>>>='+JSON.stringify(splitRules)+';\n');
}finally{rmSync(temporary,{recursive:true,force:true});}
