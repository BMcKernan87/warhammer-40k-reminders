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
 let tyranids=migrateSavedDetachments(value,'Tyranids',currentTyranidDetachment);
 for(const [oldName,newName] of [['Biovore','Biovores'],['Pyrovore','Pyrovores'],['Screamer-Killer','Screamer-killer']])tyranids=renameSavedUnit(tyranids,'Tyranids',oldName,newName);
 const tau=migrateSavedDetachments(tyranids,'T’au Empire',currentTauDetachment);
 const mechanicus=migrateSavedDetachments(tau,'Adeptus Mechanicus',currentMechanicusDetachment);
 const named=renameSavedUnit(mechanicus,'Adeptus Mechanicus','Tech-Priest Dominus','Tech-priest Dominus');
 const detachments=migrateSavedDetachments(named,'Death Guard',currentDeathGuardDetachment);
 const renamed=renameSavedUnit(detachments,'Thousand Sons','Magnus the Red','Magnus The Red');
 return migrateEmperorsChildrenDetachments(migrateGscDetachments(migrateOrkArmy(migrateCustodesArmy(renamed))));
}
