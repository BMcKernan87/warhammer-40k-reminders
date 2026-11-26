import {importFactionProfiles} from './import-native-card-profiles.mjs';
function verifyWeapon(unit,w){
 // September 30 World Eaters pack, pp. 6–7.
 const bolt=w.name==='Bolt pistol'&&['Khorne Berzerkers','Lord Invocatus','Master of Executions'].includes(unit);
 if((bolt||['Combi-bolter','Combi-weapon'].includes(w.name))&&(w.s!=='5'||w.ap!=='-1')||unit==='Khorne Berzerkers'&&w.name==='Chainblade'&&w.s!=='5')throw Error('Review September weapon correction '+unit+' / '+w.name);
}
await importFactionProfiles({label:'World Eaters',faction:'WE',sourceId:'000000210',count:30,constant:'WORLD_EATER_CARDS',script:'scripts/import-world-eater-profiles.mjs',verifyWeapon},process.argv.slice(2));
