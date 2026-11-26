import {NECRON_LOADOUTS, currentEquipmentName} from './necron-wargear';
import type {ArmySelection} from './catalog';
export interface EquipmentOption {unit:string;choices:readonly string[];defaultChoice:string}
export const EQUIPMENT_OPTIONS:Partial<Record<ArmySelection['faction'],readonly EquipmentOption[]>>={
 Necrons: Object.entries(NECRON_LOADOUTS).flatMap(([unit, sheet]) =>
   sheet.primary ? [{unit, choices: sheet.primary, defaultChoice: sheet.primary[0]}] : []),
 Orks:[{unit:'Boyz',choices:['Slugga and choppa','Shoota'],defaultChoice:'Slugga and choppa'}],
 Tyranids:[{unit:'Termagants',choices:['Fleshborer','Devourer','Spinefists'],defaultChoice:'Fleshborer'},{unit:'Tyrannofex',choices:['Rupture cannon','Acid spray','Fleshborer hive'],defaultChoice:'Rupture cannon'},{unit:'Carnifexes',choices:['Monstrous scything talons','Monstrous crushing claws'],defaultChoice:'Monstrous scything talons'}],
 'Space Marines':[{unit:'Aggressor Squad',choices:['Flamestorm gauntlets','Auto boltstorm gauntlets and fragstorm grenade launcher'],defaultChoice:'Flamestorm gauntlets'},{unit:'Inceptor Squad',choices:['Assault bolters','Plasma exterminators'],defaultChoice:'Assault bolters'},{unit:'Hellblaster Squad',choices:['Plasma incinerators'],defaultChoice:'Plasma incinerators'}]
};
export function equipmentOption(army:ArmySelection,unit:string):EquipmentOption|undefined{return EQUIPMENT_OPTIONS[army.faction]?.find(x=>x.unit===unit);}
export function selectedEquipment(army:ArmySelection,unit:string):string|undefined{const opt=equipmentOption(army,unit);return opt ? currentEquipmentName(unit, army.equipment?.[unit] ?? opt.defaultChoice) : undefined;}
export function setEquipment(army:ArmySelection,unit:string,choice:string):ArmySelection{const opt=equipmentOption(army,unit);if(!army.units[unit]||!opt?.choices.includes(choice))throw Error('Invalid equipment selection');return {...army,equipment:{...army.equipment,[unit]:choice}};}
