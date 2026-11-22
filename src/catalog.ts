export type Faction='Necrons'|'Space Marines';
export const CATALOG:Record<Faction,{detachments:readonly string[];units:readonly string[];enhancements:readonly string[]}> = {
 'Necrons':{
  detachments:['Awakened Dynasty','Canoptek Court','Hypercrypt Legion','Annihilation Legion','Obeisance Phalanx'],
  units:['C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Imotekh the Stormlord','Orikan the Diviner','Technomancer','Plasmancer','Chronomancer','Overlord','Skorpekh Lord','Hexmark Destroyer','Necron Warriors','Immortals','Canoptek Wraiths','Canoptek Scarab Swarms','Lokhust Heavy Destroyers','Skorpekh Destroyers','Lychguard','Deathmarks','Doomsday Ark','Monolith','Canoptek Doomstalker'],
  enhancements:[]
 },
 'Space Marines':{
  detachments:['Gladius Task Force','Firestorm Assault Force','Ironstorm Spearhead','Vanguard Spearhead','Anvil Siege Force','Stormlance Task Force','1st Company Task Force'],
  units:['Marneus Calgar','Roboute Guilliman','Captain','Lieutenant','Judiciar','Apothecary Biologis','Chaplain','Intercessor Squad','Assault Intercessor Squad','Heavy Intercessor Squad','Bladeguard Veteran Squad','Aggressor Squad','Eradicator Squad','Infernus Squad','Terminator Squad','Sternguard Veteran Squad','Inceptor Squad','Hellblaster Squad','Ballistus Dreadnought','Redemptor Dreadnought','Brutalis Dreadnought','Land Raider','Repulsor Executioner'],
  enhancements:[]
 }
};
export interface ArmySelection {faction:Faction;detachment:string;units:Record<string,number>}
export function newSelection(faction:Faction='Necrons'):ArmySelection{return {faction,detachment:CATALOG[faction].detachments[0],units:{}}}
export function addSelectionUnit(s:ArmySelection,name:string,count=1):ArmySelection{
 if(!CATALOG[s.faction].units.includes(name)||!Number.isInteger(count)||count<1)throw Error('Invalid unit selection');
 return {...s,units:{...s.units,[name]:(s.units[name]||0)+count}};
}
export function removeSelectionUnit(s:ArmySelection,name:string):ArmySelection{
 const units={...s.units};delete units[name];return {...s,units};
}
export function validateSelection(x:unknown):x is ArmySelection{
 if(!x||typeof x!=='object')return false;
 const s=x as Partial<ArmySelection>;
 return (s.faction==='Necrons'||s.faction==='Space Marines')&&CATALOG[s.faction].detachments.includes(s.detachment||'')&&!!s.units&&typeof s.units==='object'&&!Array.isArray(s.units)&&Object.entries(s.units).every(([name,count])=>CATALOG[s.faction!].units.includes(name)&&Number.isInteger(count)&&count>0&&count<=30);
}
