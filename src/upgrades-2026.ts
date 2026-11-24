import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
export interface Upgrade2026 {name:string;faction:'Necrons';detachment:string;unit:string;source:string}
const NECRON_SOURCE='https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf';
export const UPGRADES_2026:readonly Upgrade2026[]=[
 {name:'Enlivened Sentinels',faction:'Necrons',detachment:'Hand of the Dynasty',unit:'Necron Warriors',source:NECRON_SOURCE},
 {name:'Tools of Dominion',faction:'Necrons',detachment:'Hand of the Dynasty',unit:'Immortals',source:NECRON_SOURCE},
 {name:'Recursive Reanimation',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Tomb Blades',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Lokhust Destroyers',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Lokhust Heavy Destroyers',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Lokhust Lord',source:NECRON_SOURCE},
 {name:'Mortality Shroud',faction:'Necrons',detachment:"The Phaeron's Armoury",unit:'Obelisk',source:NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Dread Majesty","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Dread Majesty","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"}
];
export function eligibleUpgrades2026(army:ArmySelection,unit:string):Upgrade2026[]{
 return UPGRADES_2026.filter(u=>u.faction===army.faction&&u.unit===unit&&(army.detachments2026||[]).includes(u.detachment));
}
export function selectUpgrade2026(army:ArmySelection,key:string,name:string|null):ArmySelection{
 const instance=expandRoster(army).find(x=>x.id===key);
 const unit=instance?.unit||key;
 if(!instance&&!(army.units[unit]>0))throw Error('Select a unit before assigning an upgrade');
 if(name&&!eligibleUpgrades2026(army,unit).some(x=>x.name===name))throw Error('Upgrade unavailable for this unit or detachment');
 const upgrades2026={...army.upgrades2026};
 delete upgrades2026[key];
 if(name)upgrades2026[key]=name;
 return {...army,upgrades2026};
}
export function validateUpgrades2026(army:ArmySelection):boolean{
 return Object.entries(army.upgrades2026||{}).every(([key,name])=>{
  const instance=expandRoster(army).find(x=>x.id===key);
  const unit=instance?.unit||key;
  return (Boolean(instance)||army.units[unit]>0)&&eligibleUpgrades2026(army,unit).some(x=>x.name===name);
 });
}
