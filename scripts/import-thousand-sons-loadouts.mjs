import {importLegionLoadouts} from './import-legion-loadouts.mjs';

await importLegionLoadouts({
 slug:'thousand-sons',title:'Thousand Sons',factionId:'TS',sourceId:'000000027',table:'THOUSAND_SONS_KITS',expected:34,paid:2,
 // Split adds these new bearers during a battle. None can start in a purchased unit of Pink Horrors.
 conditionalProfiles:{
  'Pink Horrors':['Coruscating blue flames','Blue claws','Coruscating yellow flames','Yellow claws'],
  'Blue Horrors':['Coruscating yellow flames','Yellow claws'],
 },
},process.argv.slice(2));
