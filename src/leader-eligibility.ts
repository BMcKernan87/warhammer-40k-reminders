import type {ArmySelection} from './catalog';
import {NECRON_LEADERS} from './attachments';
/** Explicitly modeled Leader -> Bodyguard compatibility. Unlisted Leaders remain unsupported. */
export const LEADER_BODYGUARDS:Partial<Record<ArmySelection['faction'],Record<string,readonly string[]>>>={
 Necrons:NECRON_LEADERS,
 Orks:{
  Warboss:['Boyz','Nobz'], 'Warboss in Mega Armour':['Meganobz'],
  Painboy:['Boyz','Nobz'], Weirdboy:['Boyz'], 'Big Mek in Mega Armour':['Meganobz']
 },
 Tyranids:{
  Broodlord:['Genestealers'], 'Winged Hive Tyrant':[]
 },
 'Space Marines':{
  Captain:['Intercessor Squad','Assault Intercessor Squad','Hellblaster Squad','Sternguard Veteran Squad'],
  Lieutenant:['Intercessor Squad','Assault Intercessor Squad','Hellblaster Squad','Sternguard Veteran Squad'],
  Judiciar:['Bladeguard Veteran Squad','Assault Intercessor Squad'],
  'Apothecary Biologis':['Aggressor Squad','Eradicator Squad','Heavy Intercessor Squad'],
  Chaplain:['Intercessor Squad','Assault Intercessor Squad','Bladeguard Veteran Squad']
 }
};
export function leaderBodyguards(faction:ArmySelection['faction'],leader:string):readonly string[]{
 return LEADER_BODYGUARDS[faction]?.[leader]||[];
}
export function isModeledLeader(faction:ArmySelection['faction'],unit:string):boolean{
 return Object.prototype.hasOwnProperty.call(LEADER_BODYGUARDS[faction]||{},unit);
}

/** Cursed Legion grants a specific additional attachment route, not blanket eligibility. */
export const MURDERMIND_BODYGUARDS=['Lokhust Destroyers','Lokhust Heavy Destroyers','Ophydian Destroyers','Skorpekh Destroyers'] as const;
const MURDERMIND_BEARERS=['Chronomancer','Geomancer','Plasmancer','Psychomancer','Technomancer'];
export function hasMurdermind(army:ArmySelection,leader:{id:string;unit:string}):boolean{
 return army.faction==='Necrons'&&!!army.detachments2026?.includes('Cursed Legion')&&MURDERMIND_BEARERS.includes(leader.unit)&&(army.upgrades2026?.[leader.id]??army.upgrades2026?.[leader.unit])==='Murdermind';
}
export function instanceBodyguards(army:ArmySelection,leader:{id:string;unit:string}):readonly string[]{
 const base=leaderBodyguards(army.faction,leader.unit);
 return hasMurdermind(army,leader)?[...new Set([...base,...MURDERMIND_BODYGUARDS])]:base;
}
export function validMurdermindFormation(army:ArmySelection,body:{id:string;unit:string},leaders:readonly {id:string;unit:string}[]):boolean{
 if(!leaders.some(l=>hasMurdermind(army,l)&&!leaderBodyguards(army.faction,l.unit).includes(body.unit)))return true;
 return MURDERMIND_BODYGUARDS.some(u=>u===body.unit)&&leaders.every(l=>hasMurdermind(army,l)||['Skorpekh Lord','Lokhust Lord','Hexmark Destroyer','Nekrosor Ammentar'].includes(l.unit)||(_armyAnkh(army,l)));
}
function _armyAnkh(army:ArmySelection,l:{id:string;unit:string}):boolean{
 return ['Overlord','Overlord with translocation shroud','Catacomb Command Barge'].includes(l.unit)&&(army.upgrades2026?.[l.id]??army.upgrades2026?.[l.unit])==='Destroyer Ankh';
}
