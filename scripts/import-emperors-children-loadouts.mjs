import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';

await importFactionLoadouts({
 slug:'emperors-children',title:'Emperor’s Children',factionId:'EC',sourceId:'000000280',
 table:'EMPERORS_CHILDREN_KITS',expected:23,paid:1,
 adjustRole(source,t,slots,expanded,options){
  if(source.name!=='Chaos Terminators')return;
  // The paired accursed weapons replace BOTH the gun and the melee arm.
  const layers=slots.filter(s=>s.model===t.model),paired=layers.filter(s=>s.alternate).flatMap(s=>s.choices);
  if(paired.length!==1||expanded(paired[0]).join()!=='Paired accursed weapons'||!options.some(o=>o.includes('combi-bolter and accursed weapon')))throw Error('Review paired Terminator replacement');
  const normal=compileModelEquipment(t,layers.filter(s=>!s.alternate),expanded);
  if(normal.slots.length!==2||normal.fixed.length)throw Error('Review Terminator arm equipment');
  const [a,b]=normal.slots;
  return {role:t.model,fixed:[],slots:[{label:'Weapons',choices:[...a.choices.flatMap(left=>b.choices.map(right=>[...left,...right])),expanded(paired[0])]}]};
 },
 adjustLimits(source,limits,options){
  if(source.name==='Infractors'){
   if(!options.some(o=>o.includes('1 Infractor can be equipped with 1 icon of excess')))throw Error('Review Infractor icon limit');
   limits.push({role:'Infractor',thresholds:[{models:0,choices:1}],choices:[['Icon of Excess']]});
  }
 },
},process.argv.slice(2));
