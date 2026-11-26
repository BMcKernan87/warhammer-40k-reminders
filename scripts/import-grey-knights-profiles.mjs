import {importFactionProfiles} from './import-native-card-profiles.mjs';

// The current pack's Imperial Armour card (pp. 7–8) explicitly includes
// the Thunderhawk. The other 25 are from the Grey Knights native source.
function verifyWeapon(unit,w,stats){
 const bolter=w.name==='Storm bolter'||unit==='Brotherhood Librarian'&&w.name==='Combi-weapon'||unit==='Stormraven Gunship'&&w.name==='Hurricane bolter';
 const combat=['Interceptor Squad','Purgation Squad','Purifier Squad','Strike Squad'].includes(unit)&&w.name==='Close combat weapon';
 if(!bolter&&!combat)return;
 const stale=combat&&['Strike Squad','Purifier Squad'].includes(unit)&&w.s==='4';
 if(stats.S!==5||!stale&&w.s!=='5'||bolter&&(stats.AP!==-1||w.ap!=='-1'))throw Error('Review September weapon correction '+unit+' / '+w.name);
 return {strength:stats.S,...(bolter?{ap:stats.AP}:{})};
}
await importFactionProfiles({label:'Grey Knights',faction:'GK',sourceId:'000000013',packSheets:{'Grey Knights Thunderhawk Gunship':'000000365'},weaponNames:{'Brotherhood Techmarine':{'Servo-arm':'Servo-arms'}},count:26,constant:'GK_CARDS',script:'scripts/import-grey-knights-profiles.mjs',verifyWeapon},process.argv.slice(2));
