import {readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {importFactionLoadouts} from './import-faction-loadouts.mjs';
import {compileModelEquipment} from './import-model-equipment-slots.mjs';
import {aeldariWeapons} from './import-aeldari-relational.mjs';
import {loadExport} from './import-wahapedia-11e.mjs';

const [csv,manualDirectory,relationalDirectory,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-aeldari-loadouts.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DIRECTORY OUTPUT_TS');
const temporary=mkdtempSync(join(tmpdir(),'aeldari-loadouts-'));
try{
 for(const name of ['units','wargear'])copyFileSync(join(relationalDirectory,'aeldari',name+'.json'),join(temporary,name+'.json'));
 const {tables}=await loadExport({directory:csv});
 const compositions=JSON.parse(readFileSync(join(relationalDirectory,'aeldari','unit-compositions.json'),'utf8'));
 for(const c of compositions.filter(c=>c.loadout.uniform.length)){
  const d=tables.Datasheets.find(s=>s.faction_id==='AE'&&s.name.toLowerCase()===c.unit_id);
  const options=tables.Datasheets_options.filter(o=>o.datasheet_id===d?.id).map(o=>o.description);
  const expected={wraithguard:'All of the models in this unit can each have their wraithcannon replaced with 1 D-scythe.',wraithblades:'All of the models in this unit can each have their ghostswords replaced with 1 ghostaxe and 1 forceshield.'};
  if(!expected[c.unit_id]||c.loadout.uniform.length!==2||options.length!==1||options[0]!==expected[c.unit_id])throw Error('Review Aeldari uniform equipment '+c.unit_id);
  // Runtime presents these legal alternatives as one whole-unit choice.
  c.loadout.uniform=[];
 }
 writeFileSync(join(temporary,'unit-compositions.json'),JSON.stringify(compositions));
 writeFileSync(join(temporary,'weapons.json'),JSON.stringify(aeldariWeapons(JSON.parse(readFileSync(join(relationalDirectory,'aeldari','weapons.json'),'utf8')))));
 await importFactionLoadouts({slug:'aeldari',factionId:'AE',sourceId:'000000186',packAircraftOrModels:['Phantom Titan','Revenant Titan'],title:'Aeldari',expected:76,paid:1,table:'AELDARI_KITS',manualNames:{vyper:'Vypers'},itemNames:{'the-staff-of-ulthamar-and-witchblade':'Staff of Ulthamar and witchblade','the-fire-axe':'Fire axe','kha-vir-the-sword-of-sorrows':'Kha-vir','drakolithe-once-per-battle-per-token':'Drakolithe'},
  adjustRole(source,t,slots,expanded,options){
   if(source.name==='Dire Avengers'&&t.model==='Dire Avenger Exarch'){
    const own=slots.filter(s=>s.model===t.model);
    if(own.length!==1||own[0].choices.length!==10||options.length!==4||!options[0].startsWith('The Dire Avenger Exarch’s Avenger shuriken catapult can be replaced with 1 shuriken pistol and one of the following:')||options[1]!=='If this unit’s Dire Avenger Exarch is equipped with 1 Avenger shuriken catapult, it can be equipped with 1 additional Avenger shuriken catapult.'||options[2]!=='The Dire Avenger Exarch’s shuriken pistol can be replaced with 1 shimmershield.')throw Error('Review Dire Avenger Exarch alternatives');
    // The independent flattened list accidentally combines mutually
    // exclusive melee choices and duplicates pistol/sword replacements.
    const one=id=>({id,count:1}),ccw=one('close-combat-weapon');
    const choices=[
     [one('avenger-shuriken-catapult'),ccw],
     [{id:'avenger-shuriken-catapult',count:2},ccw],
     ...['diresword','power-glaive'].flatMap(blade=>['shuriken-pistol','shimmershield'].map(other=>[ccw,one(blade),one(other)])),
    ];
    return compileModelEquipment(t,[{...own[0],choices}],expanded);
   }
   if(source.name==='Phantom Titan'){
    const own=slots.filter(s=>s.model===t.model);
    if(own.length!==2||own[0].choices.length!==19||options.length!==3||!options[0].startsWith('This model’s D-bombard can be replaced with')||!options[1].startsWith('This model’s Phantom pulsar can be replaced with')||options[2]!=='This model’s Phantom starcannon can be replaced with 1 pulse laser.')throw Error('Review Phantom Titan weapon options');
    // Reconstruct both arms and the separate shoulder gun. The independent
    // flattened table omitted legal combinations and dropped a shoulder or
    // arm gun in two alternatives. Every blade arm carries two extra guns.
    const one=id=>({id,count:1}),two=id=>({id,count:2});
    const arms=[[one('d-bombard')],[one('phantom-pulsar')],[two('phantom-starcannon'),one('wraith-glaive')],[one('phantom-starcannon'),one('pulse-laser'),one('wraith-glaive')],[two('pulse-laser'),one('wraith-glaive')]];
    const canonical=items=>{
     const grouped=new Map();for(const item of items)grouped.set(item.id,(grouped.get(item.id)??0)+item.count);
     return [...grouped].sort(([a],[b])=>a.localeCompare(b,'en')).map(([id,count])=>({id,count}));
    };
    const combos=arms.flatMap(a=>arms.flatMap(b=>['phantom-starcannon','pulse-laser'].map(id=>canonical([...a,...b,one(id)]))));
    const choices=[...new Map(combos.map(c=>[JSON.stringify(c),c])).values()];
    if(choices.length!==20)throw Error('Review Phantom Titan complete mount combinations');
    const role=compileModelEquipment(t,[{...own[0],choices},own[1]],expanded);
    return {...role,slots:role.slots.map(s=>({...s,label:'Arm and shoulder weapons'}))};
   }
   if(source.name==='Leystalker'){
    if(t.items.some(i=>i.id==='hunting-blades')||!source.loadout.toLowerCase().includes('hunting blades'))throw Error('Review Leystalker hunting blades');
    return compileModelEquipment({...t,items:[...t.items,{id:'hunting-blades',count:1}]},slots,expanded);
   }
   if(['War Walkers','Wraithlord','Wraithknight','Wraithknight with Ghostglaive'].includes(source.name)){
    // A repeated weapon slot represents independent physical mounts. Store
    // each legal multiset once, preserving duplicate fitted weapons.
    const repeated=slots.filter(s=>s.model===t.model&&s.repeats);
    if(!repeated.length||repeated.some(s=>s.picks!==2||s.alternate))throw Error('Review paired Aeldari weapon mounts '+source.name);
    const pairs=slots.map(s=>{
     if(!repeated.includes(s))return s;
     const combos=[];
     for(let a=0;a<s.choices.length;a++)for(let b=a;b<s.choices.length;b++)combos.push([...s.choices[a],...s.choices[b]]);
     const choices=[...new Map(combos.map(c=>[JSON.stringify(c),c])).values()];
     return {...s,picks:1,repeats:false,choices};
    });
    const role=compileModelEquipment(t,pairs,expanded);
    return {...role,slots:role.slots.map(s=>({...s,label:s.choices.some(c=>c.includes('Shuriken catapult'))&&source.name==='Wraithlord'?'Wrist weapons':s.choices.some(c=>c.includes('Starcannon'))?(source.name==='War Walkers'?'Arm weapons':'Shoulder weapons'):s.label}))};
   }
   if(source.name==='Corsair Voidscarred'&&['Shade Runner','Soul Weaver','Way Seeker'].includes(t.model)){
    // Each specialist retains the printed close combat weapon omitted by
    // the independent slot table (but present in its physical model record).
    if(!source.loadout.includes('close combat weapon')||t.items.some(i=>i.id==='close-combat-weapon-corsair-voidscarred'))throw Error('Review specialist close combat weapon');
    const role=compileModelEquipment(t,slots,expanded);
    return {...role,fixed:[...role.fixed,'Close combat weapon']};
   }
  },
  adjustLimits(source,limits,options){
   if(source.name==='Corsair Skyreavers'){
    const l=limits.find(l=>l.role==='Skyreaver'&&l.choices.some(c=>c.includes('Blaster')));
    if(!l||!options.some(o=>o.includes('You cannot select the same option more than once')))throw Error('Review Skyreaver special-weapon uniqueness');
    l.thresholds=l.thresholds.map(t=>({...t,per_choice:t.models===10?2:1}));
   }
  },
  adjustEquipment(source,roles,limits,options){
   const token=source.name==='Dragon Knights'?'Drakolithe':'Aspect shrine token';
   if(source.name==='Dragon Knights'||['Dire Avengers','Dark Reapers','Howling Banshees','Striking Scorpions','Fire Dragons','Swooping Hawks','Warp Spiders'].includes(source.name)){
    if(limits.length!==1||limits[0].role||limits[0].choices.length!==1||limits[0].choices[0][0].toLowerCase()!==token.toLowerCase()||!options.some(o=>o.includes(source.name==='Dragon Knights'?'For every 3 models':'For every 5 models')))throw Error('Review unit-level Aeldari tokens '+source.name);
    // Unit tokens do not create models or belong to a particular bearer.
    // Runtime has a separate token field capped by actual starting strength.
    limits.splice(0);
   }
  },
 },[csv,join(manualDirectory,'aeldari.yaml'),temporary,destination]);
 // Keep the generated source's reproducible invocation explicit.
 const text=readFileSync(destination,'utf8');
 writeFileSync(destination,text.replace('// Generated from the 11e Aeldari cards and October MFM v1.6 by scripts/import-aeldari-loadouts.mjs.','// Generated by scripts/import-aeldari-loadouts.mjs from current Aeldari cards and MFM v1.6.'));
}finally{rmSync(temporary,{recursive:true,force:true});}
