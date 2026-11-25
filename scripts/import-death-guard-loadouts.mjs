import {importLegionLoadouts} from './import-legion-loadouts.mjs';

await importLegionLoadouts({
 slug:'death-guard',title:'Death Guard',factionId:'DG',sourceId:'000000014',table:'DEATH_GUARD_KITS',expected:36,paid:1,
 itemNames:{'icon-of-despair-aura':'Icon of despair'},
 manualNames:{'myphitic blight-haulers':'Myphitic Blight-hauler'},
 adjustLimits(source,limits,options){
  if(source.name!=='Blightlord Terminators')return;
  // Three-model spewers replace both stock weapons. The per-five
  // replacement retains the bubotic blade and has its own quota.
  const spewer=limits.find(l=>l.choices.length===1&&l.choices[0][0]==='Plague spewer');
  if(!spewer||!options.some(o=>o.includes('only 3 models')&&o.includes('plague spewer and 1 close combat weapon')))throw Error('Review Blightlord spewer strength requirements');
  spewer.choices=[['Plague spewer','Bubotic blade']];
 },
},process.argv.slice(2));
