import {importFactionMuster} from './import-faction-muster.mjs';
import {sororitasCompositions} from './import-sororitas-composition.mjs';
import {readFileSync,writeFileSync} from 'node:fs';

const args=process.argv.slice(2);
if(!args[4])throw Error('Usage: node scripts/import-sororitas.mjs CSV_DIR MFM_YAML UNITS_JSON COMPOSITIONS_JSON OUTPUT_TS');
const units=JSON.parse(readFileSync(args[2],'utf8'));
const key=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');

await importFactionMuster({
 name:'Adepta Sororitas',slug:'adepta-sororitas',factionId:'AS',sourceId:'000000112',total:33,
 pack:'eng_14-10_wh40k_-faction_pack_adepta_sororitas-kby0nywexj-dg7kvr3iiy.pdf',packVersion:'1.4',prefix:'SORORITAS',
 // The CSV uses the full title for her keyword scope, but the printed model
 // and composition are named Celestine. Accept that source alias only here,
 // then bind it to the real model role below; Geminae gain neither keyword.
 battleOnlyModels:{'Saint Celestine':['Saint Celestine']},
 compositions:sororitasCompositions,
 extraExport(natives,tables){
  const ability=tables.Abilities.find(a=>a.id==='000008466');
  if(ability?.name!=='Acts of Faith')throw Error('Review Acts of Faith source');
  const authorized=new Set(tables.Datasheets_abilities.filter(a=>a.ability_id===ability.id).map(a=>a.datasheet_id));
  const faithful=natives.filter(s=>authorized.has(s.id)).map(s=>s.name).sort();
  if(faithful.length!==33)throw Error('Review Sororitas Acts of Faith recipients');
  return 'export const SORORITAS_ACTS_OF_FAITH_UNITS:readonly string[]='+JSON.stringify(faithful)+';\n';
 },
 reconcile(byName){
  for(const [name,sheet] of byName){
   const independent=units.filter(u=>key(u.name)===key(name)&&u.external_refs.some(r=>r.namespace==='mfm'));
   if(independent.length!==1)throw Error('Review independent model profiles for '+name);
   const normalized=(values)=>values.map(v=>String(v).replace(/["+]/g,'')).join('|');
   // Sanctifiers share one printed statline, repeated for their individual
   // roles in the relational source. Compare the distinct characteristics.
   const printed=[...new Set(Object.values(sheet.modelProfiles??{model:sheet.profile}).map(p=>normalized([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])))].sort();
   const expected=[...new Set(independent[0].profiles.map(p=>normalized([p.M,p.T,p.Sv,p.W,p.Ld,p.OC])))].sort();
   if(JSON.stringify(printed)!==JSON.stringify(expected))throw Error('Model characteristics disagree for '+name);
  }
  const celestine=byName.get('Saint Celestine');
  if(!celestine?.modelKeywords?.['Saint Celestine']?.includes('CHARACTER')||!celestine.compositionBySize?.[3]?.Celestine)throw Error('Review Celestine keyword scope');
  celestine.modelKeywords.Celestine=celestine.modelKeywords['Saint Celestine'];
  delete celestine.modelKeywords['Saint Celestine'];
  for(const unit of ['Dialogus','Dogmata','Hospitaller','Imagifier'])if(byName.get(unit)?.attachmentRole!=='support')throw Error('Review October Support conversion for '+unit);
  for(const unit of ['Castigator','Exorcist','Immolator','Sororitas Rhino'])if(!byName.get(unit)?.keywords.includes('FRAME'))throw Error('Review October Frame keyword for '+unit);
  if(!byName.get('Celestian Sacresants')?.keywords.includes('CELESTIAN'))throw Error('Review October Celestian keyword');
 },
},args);
writeFileSync(args[4],readFileSync(args[4],'utf8').replace('scripts/import-adepta-sororitas.mjs','scripts/import-sororitas.mjs'));
