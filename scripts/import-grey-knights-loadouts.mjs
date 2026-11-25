import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';

await importFactionLoadouts({
 slug:'grey-knights',title:'Grey Knights',factionId:'GK',sourceId:'000000013',packAircraftOrModels:['Grey Knights Thunderhawk Gunship'],
 table:'GREY_KNIGHTS_KITS',expected:26,paid:6,
 adjustRole(source,t,slots,expanded,options){
  if(source.name==='Purifier Squad'){
   if(!source.loadout.includes('storm bolter; Nemesis force weapon'))throw Error('Review Purifier standard weapons');
   const missing='nemesis-force-weapon-purifier-squad',items=t.items.some(i=>i.id===missing)?t.items:[...t.items,{id:missing,count:1}];
   return compileModelEquipment({...t,items},slots,expanded);
  }
  if(source.name==='Brotherhood Techmarine'){
   // The MFM composition references a pre-launch-only weapon ID. Resolve the
   // fixed axe (and the rest of this model's fixed kit) on the current 11e card.
   const loadout=source.loadout.replace(/<[^>]*>/g,'').replace(/^This model is equipped with:\s*/i,'').replace(/\.$/,'');
   const fixed=loadout.split(/;\s*/).map(name=>name[0].toUpperCase()+name.slice(1));
   if(options.length||fixed.length!==4||!fixed.includes('Omnissian power axe'))throw Error('Review Brotherhood Techmarine equipment');
   return {role:t.model,fixed:fixed.map(i=>i==='Servo-arm'?'Servo-arms':i),slots:[]};
  }
  if(source.name!=='Nemesis Dreadknight')return;
  if(!options.some(s=>s.includes('up to two')&&s.includes('cannot take duplicates')))throw Error('Review Nemesis Dreadknight arms');
  const guns=slots.find(s=>s.picks===2&&!s.repeats);
  if(!guns||guns.choices.length!==4)throw Error('Review Dreadknight weapons');
  const weapons=guns.choices.filter(c=>c.length),choices=[[],...weapons,...weapons.flatMap((a,i)=>weapons.slice(i+1).map(b=>[...a,...b]))];
  const result=compileModelEquipment(t,slots.map(s=>s===guns?{...s,picks:1,choices}:s),expanded);
  result.slots.find(s=>s.choices.some(c=>c.includes('Heavy psycannon'))).label='Additional weapons';
  return result;
 },
 adjustEquipment(source,roles,limits,options){
  const paladins=source.name==='Paladin Squad';
  if(!paladins&&source.name!=='Brotherhood Terminator Squad')return;
  const ordinary=roles.find(r=>r.role===(paladins?'Paladin':'Terminator'));
  const ancient=roles.find(r=>r.role===(paladins?'Paladin Ancient':'Ancient'));
  if(!ordinary||!ancient||!options.some(s=>s.includes('Ancient’s banner'))||limits.length!==1)throw Error('Review Terminator bearer options');
  const stock='Nemesis force weapon';
  function alternatives(bearer){
   if(bearer.slots.length!==1)throw Error('Review '+bearer.role+' linked equipment');
   return bearer.slots[0].choices.map(c=>{
    const items=[...bearer.fixed,...c];
    const at=items.indexOf(stock);
    if(at<0)throw Error('Missing '+stock+' on '+bearer.role);
    items.splice(at,1);return items;
   });
  }
  const banner="Ancient's banner",medical="Apothecary's narthecium";
  const optionsWithBanner=alternatives(ancient).filter(c=>c.includes(banner));
  const ordinaryGear=alternatives(ordinary);
  if(optionsWithBanner.length!==4||!ordinaryGear.some(c=>c.includes(medical)))throw Error('Review banner and narthecium names on '+source.name);
  ordinary.fixed=[stock];
  ordinary.slots=[{label:'Storm bolter and equipment',choices:[...ordinaryGear,...optionsWithBanner]}];
  roles.splice(roles.indexOf(ancient),1);
  limits[0].excluding=[banner];
  limits.push(...[banner,medical].map(item=>({role:ordinary.role,thresholds:[{models:0,choices:1}],choices:[[item]]})));
 },
},process.argv.slice(2));
