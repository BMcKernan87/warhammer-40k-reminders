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
