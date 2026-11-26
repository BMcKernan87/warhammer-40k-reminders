import {importFactionProfiles} from './import-native-card-profiles.mjs';
function verifyWeapon(unit,w){
 // September 30 Emperor’s Children pack, pp. 9–10.
 const bolt=w.name==='Bolt pistol'&&['Flawless Blades','Infractors','Lord Exultant','Sorcerer','Tormentors'].includes(unit);
 const bolter=unit==='Tormentors'&&w.name==='Boltgun';
 const combat=w.name==='Close combat weapon'&&['Lord Exultant','Lord Kakophonist','Noise Marines','Tormentors'].includes(unit);
 const sabre=unit==='Infractors'&&w.name==='Duelling sabre';
 if((bolt||bolter||['Combi-bolter','Combi-weapon'].includes(w.name))&&(w.s!=='5'||w.ap!=='-1')||
  (combat||sabre)&&w.s!=='5'||unit==='Flawless Blades'&&w.name==='Blissblade'&&w.a!=='4')throw Error('Review September weapon correction '+unit+' / '+w.name);
}
// The September v1.3 card on p. 7 explicitly gives the Defiler a 5+ invulnerable
// save. 40kDC omits this one field from the otherwise matching profile.
await importFactionProfiles({publisherSaves:{Defiler:5},label:'Emperor’s Children',faction:'EC',sourceId:'000000280',count:23,constant:'EC_CARDS',script:'scripts/import-emperors-children-profiles.mjs',verifyWeapon},process.argv.slice(2));
