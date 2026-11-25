import {importFactionMuster} from './import-faction-muster.mjs';

await importFactionMuster({
 name:'Death Guard',slug:'death-guard',factionId:'DG',sourceId:'000000014',daemons:'Plague Legions',total:36,daemonCount:6,
 manualNames:{'myphitic blight-haulers':'Myphitic Blight-hauler'},
 pack:'eng_30-09_wh40k_faction_pack_death_guard-bp5c8lcjq6-i4ew7urwyk.pdf',prefix:'DEATH_GUARD',
 extraExport(natives){
  const additional={};
  for(const s of natives.filter(s=>s.leader_footer)){
   const text=s.leader_footer.replace(/<[^>]*>/g,'').toLowerCase();
   const match=text.match(/^you can attach this model to a (plague marines(?: or poxwalkers)?) unit, even if one other leader unit has already been attached to it/);
   if(!match||!text.includes('cannot attach more than one of the same leader'))throw Error('Review Death Guard additional Leader '+s.name);
   additional[s.name]=match[1].split(' or ').map(body=>body==='plague marines'?'Plague Marines':'Poxwalkers');
  }
  if(Object.keys(additional).length!==6)throw Error('Review Death Guard additional Leader inventory');
  return 'export const DEATH_GUARD_ADDITIONAL_LEADERS:Readonly<Record<string,readonly string[]>>='+JSON.stringify(additional)+';\n';
 },
 reconcile(byName){
  const frames=['Chaos Land Raider','Chaos Predator Annihilator','Chaos Predator Destructor','Chaos Rhino','Miasmic Malignifier','Plagueburst Crawler'];
  if(frames.some(unit=>!byName.get(unit)?.keywords.includes('FRAME')))throw Error('Review September Death Guard Frame keywords');
 },
},process.argv.slice(2));
