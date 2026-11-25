import {importFactionProfiles} from './import-native-card-profiles.mjs';

// Official September 30 v1.3 update to the two greater daemons' ranged weapons.
const corrected={
 'Infernal Gateway – Witchfire':['24','D6+3','2','9','-2','D3'],
 'Infernal Gateway – Focused Witchfire':['24','D3+6','2','9','-2','3'],
 'Bolt of Change – witchfire':['18','9','2','9','-1','1'],
 'Bolt of Change – focused witchfire':['18','9','2','9','-2','3'],
 'Rod of sorcery':['18','6','2','8','-1','2'],
};
function verifyWeapon(unit,w){
 if(corrected[w.name]&&[w.range,w.a,w.bs_ws,w.s,w.ap,w.d].join('|')!==corrected[w.name].join('|'))throw Error('Reconcile September '+unit+' / '+w.name);
 const inferno=['Inferno bolt pistol','Inferno boltgun','Inferno combi-bolter','Inferno combi-weapon'].includes(w.name);
 if((inferno||unit==='Rubric Marines'&&w.name==='Close combat weapon')&&w.s!=='5'||w.name==='Inferno bolt pistol'&&w.ap!=='-2'||unit==='Infernal Master'&&w.name==='Inferno bolt pistol'&&!w.description.includes('pistol'))throw Error('Verify updated '+unit+' / '+w.name);
}
const brimstone={'coruscating-yellow-flames':'Brimstone Horror','yellow-claws':'Brimstone Horror'};
const battlefieldWeapons={
 'Pink Horrors':{'coruscating-blue-flames':'Blue Horror','blue-claws':'Blue Horror',...brimstone},
 'Blue Horrors':brimstone,
};
// The native 11e Heldrake card lists Hover; the separate relational missing
// ability is explicit here. The September pack removes AIRCRAFT, not Hover.
await importFactionProfiles({missingCore:{Heldrake:['Hover']},label:'Thousand Sons',faction:'TS',sourceId:'000000027',count:34,constant:'TS_CARDS',script:'scripts/import-thousand-sons-profiles.mjs',verifyWeapon,battlefieldWeapons,battlefieldConstant:'HORROR_SPLIT_PROFILES'},process.argv.slice(2));
