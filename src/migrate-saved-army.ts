import {SPACE_MARINE_FACTIONS} from './space-marines-factions';
import {currentSpaceMarineDetachment} from './space-marines-upgrades';
import {currentAeldariDetachment} from './aeldari-upgrades';
import {currentDrukhariDetachment} from './drukhari-upgrades';
import {currentCsmDetachment} from './csm-detachment-data';
import {currentTyranidDetachment} from './tyranid-detachment-data';
import {currentTauDetachment} from './tau-detachment-data';
import {currentDeathGuardDetachment} from './death-guard-detachment-data';
import {currentMechanicusDetachment} from './mechanicus-detachment-data';
import {migrateSavedDetachments} from './saved-detachment-names';
import {migrateCustodesArmy} from './custodes-saved-army';
import {migrateEmperorsChildrenDetachments} from './emperors-children-saved-army';
import {migrateGscDetachments} from './gsc-saved-army';
import {migrateOrkArmy} from './ork-saved-army';
import {renameSavedUnit} from './saved-unit-name';

export function migrateSavedArmy(value:unknown):unknown{
 let marines=value;
 for(const faction of SPACE_MARINE_FACTIONS)marines=migrateSavedDetachments(marines,faction,currentSpaceMarineDetachment);
 for(const faction of SPACE_MARINE_FACTIONS)for(const [before,after] of [['Eradicator Squad','Eradicator Squad with Melta Rifles'],['Invader ATV','Invader ATVs'],['Captain in Gravis Armour','Captain In Gravis Armour'],['Captain in Phobos Armour','Captain In Phobos Armour'],['Captain in Terminator Armour','Captain In Terminator Armour'],['Captain with Jump Pack','Captain With Jump Pack'],['Chaplain on Bike','Chaplain On Bike'],['Librarian in Terminator Armour','Librarian In Terminator Armour']])marines=renameSavedUnit(marines,faction,before,after);
 marines=renameSavedUnit(marines,'Black Templars','Primaris Crusader Squad','Crusader Squad');
 marines=renameSavedUnit(marines,'Black Templars','Sword Brethren','Sword Brethren Squad');
 const aeldari=renameSavedUnit(migrateSavedDetachments(marines,'Aeldari',currentAeldariDetachment),'Aeldari','Vyper','Vypers');
 const drukhari=migrateSavedDetachments(aeldari,'Drukhari',currentDrukhariDetachment);
 const csm=renameSavedUnit(migrateSavedDetachments(drukhari,'Chaos Space Marines',currentCsmDetachment),'Chaos Space Marines','Abaddon the Despoiler','Abaddon The Despoiler');
 let tyranids=migrateSavedDetachments(csm,'Tyranids',currentTyranidDetachment);
 for(const [oldName,newName] of [['Biovore','Biovores'],['Pyrovore','Pyrovores'],['Screamer-Killer','Screamer-killer']])tyranids=renameSavedUnit(tyranids,'Tyranids',oldName,newName);
 const tau=migrateSavedDetachments(tyranids,'T’au Empire',currentTauDetachment);
 const mechanicus=migrateSavedDetachments(tau,'Adeptus Mechanicus',currentMechanicusDetachment);
 const named=renameSavedUnit(mechanicus,'Adeptus Mechanicus','Tech-Priest Dominus','Tech-priest Dominus');
 const detachments=migrateSavedDetachments(named,'Death Guard',currentDeathGuardDetachment);
 const renamed=renameSavedUnit(detachments,'Thousand Sons','Magnus the Red','Magnus The Red');
 return migrateEmperorsChildrenDetachments(migrateGscDetachments(migrateOrkArmy(migrateCustodesArmy(renamed))));
}
