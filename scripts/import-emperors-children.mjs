import {importLegionMuster} from './import-legion-muster.mjs';

await importLegionMuster({
 name:'Emperor’s Children',slug:'emperors-children',urlSlug:'emperor-s-children',factionId:'EC',sourceId:'000000280',
 daemons:'Legions of Excess',total:23,daemonCount:5,pack:'eng_30-09_wh40k_faction_pack_emperors_children-xp2mhzppxs-1cvykicdxu.pdf',prefix:'EMPERORS_CHILDREN',
 armyRuleExport(natives,tables){
  const thrill=tables.Abilities.find(a=>a.faction_id==='EC'&&a.name==='Thrill Seekers');
  if(!thrill||!thrill.description.includes('Engagement Range')||!thrill.description.includes('this phase'))throw Error('Review Thrill Seekers targeting');
  const enabled=natives.filter(card=>tables.Datasheets_abilities.some(a=>a.datasheet_id===card.id&&a.ability_id===thrill.id)).map(s=>s.name).sort();
  if(enabled.length!==18)throw Error('Review the native Thrill Seekers recipients');
  return 'export const THRILL_SEEKERS:readonly string[]='+JSON.stringify(enabled)+';\n';
 },
 reconcile(byName){
  for(const [unit,toughness] of Object.entries({'Chaos Terminators':6,'Lord Kakophonist':6,'Lucius the Eternal':6,Infractors:5,'Lord Exultant':5,Sorcerer:5,Tormentors:5})){
   if(byName.get(unit)?.profile?.toughness!==toughness)throw Error('Reconcile September Toughness on '+unit);
  }
  const drake=byName.get('Heldrake'),p=drake.profile;
  if(!p||p.move!=='12"'||p.save!=='3+'||p.objectiveControl!==0||drake.keywords.includes('AIRCRAFT')||
   byName.get('Noise Marines').profile.wounds!==3||!byName.get('Fulgrim').keywords.includes('MOBILE')||
   ['Chaos Rhino','Chaos Land Raider'].some(unit=>!byName.get(unit).keywords.includes('FRAME')))throw Error('Reconcile September profile updates');
 },
},process.argv.slice(2));
