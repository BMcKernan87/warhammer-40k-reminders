import {importFactionProfiles} from './import-native-card-profiles.mjs';

// September 30 matched-play pack, pp. 5–7. Validate the Death Guard versions
// of these weapons before importing their reminder keywords.
function verifyWeapon(unit,w){
 const updated=['Bolt pistol','Boltgun','Combi-bolter','Combi-weapon','Plague knife','Plague knives'].includes(w.name);
 const closeCombat=['Blightlord Terminators','Foul Blightspawn','Tallyman'].includes(unit)&&w.name==='Close combat weapon';
 if(updated&&(w.s!=='5'||w.ap!=='-1')||closeCombat&&w.s!=='5'||unit==='Chaos Predator Destructor'&&w.name==='Predator autocannon'&&w.s!=='9')throw Error('Review September profile change '+unit+' / '+w.name);
}
await importFactionProfiles({publisherSaves:{Defiler:5},unitNames:{'Myphitic Blight-hauler':'Myphitic Blight-haulers'},label:'Death Guard',faction:'DG',sourceId:'000000014',count:36,constant:'DG_CARDS',script:'scripts/import-death-guard-profiles.mjs',verifyWeapon},process.argv.slice(2));
