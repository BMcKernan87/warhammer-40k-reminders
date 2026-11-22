import type {ArmySelection} from './catalog';
export interface EquipmentOption {unit:string;choices:readonly string[];defaultChoice:string}
export const EQUIPMENT_OPTIONS:Partial<Record<ArmySelection['faction'],readonly EquipmentOption[]>>={
 Necrons:[{unit:'Overlord',choices:['Tachyon arrow and Overlord’s blade','Staff of light','Voidscythe'],defaultChoice:'Tachyon arrow and Overlord’s blade'},{unit:'Necron Warriors',choices:['Gauss flayer','Gauss reaper'],defaultChoice:'Gauss flayer'},{unit:'Immortals',choices:['Gauss blaster','Tesla carbine'],defaultChoice:'Gauss blaster'},{unit:'Lokhust Heavy Destroyers',choices:['Gauss destructor','Enmitic exterminator'],defaultChoice:'Gauss destructor'},{unit:'Lychguard',choices:['Warscythe','Hyperphase sword and dispersion shield'],defaultChoice:'Warscythe'}],
 Orks:[{unit:'Boyz',choices:['Slugga and choppa','Shoota'],defaultChoice:'Slugga and choppa'}],
 Tyranids:[{unit:'Termagants',choices:['Fleshborer','Devourer','Spinefists'],defaultChoice:'Fleshborer'}]
};
export function equipmentOption(army:ArmySelection,unit:string):EquipmentOption|undefined{return EQUIPMENT_OPTIONS[army.faction]?.find(x=>x.unit===unit);}
export function selectedEquipment(army:ArmySelection,unit:string):string|undefined{const opt=equipmentOption(army,unit);return opt?opt.choices.includes(army.equipment?.[unit]||'')?army.equipment![unit]:opt.defaultChoice:undefined;}
export function setEquipment(army:ArmySelection,unit:string,choice:string):ArmySelection{const opt=equipmentOption(army,unit);if(!army.units[unit]||!opt?.choices.includes(choice))throw Error('Invalid equipment selection');return {...army,equipment:{...army.equipment,[unit]:choice}};}
