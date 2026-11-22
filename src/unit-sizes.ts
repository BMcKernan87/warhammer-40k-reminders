import type {ArmySelection} from './catalog';
/** Explicitly modeled unit sizes. Missing entries mean not yet verified, not one model. */
export const UNIT_SIZES:Partial<Record<ArmySelection['faction'],Record<string,readonly number[]>>>={
 Necrons:{'Necron Warriors':[10,20],Immortals:[5,10],Lychguard:[5,10],'Lokhust Heavy Destroyers':[1,2,3]},
 Orks:{Boyz:[10,20],Gretchin:[10,20],Nobz:[5,10],Meganobz:[2,3,5,6],Kommandos:[10],Stormboyz:[5,10],Lootas:[5,10]},
 Tyranids:{Termagants:[10,20],Hormagaunts:[10,20],Gargoyles:[10,20],Genestealers:[5,10],Zoanthropes:[3,6],Venomthropes:[3,6],Barbgaunts:[5,10]},
 'Space Marines':{'Intercessor Squad':[5,10],'Assault Intercessor Squad':[5,10],'Heavy Intercessor Squad':[5,10],'Bladeguard Veteran Squad':[3,6],'Aggressor Squad':[3,6],'Eradicator Squad':[3,6],'Infernus Squad':[5,10],'Terminator Squad':[5,10],'Sternguard Veteran Squad':[5,10],'Inceptor Squad':[3,6],'Hellblaster Squad':[5,10]}
};
export function legalUnitSizes(faction:ArmySelection['faction'],unit:string):readonly number[]|undefined{
 return UNIT_SIZES[faction]?.[unit];
}
export function defaultUnitSize(faction:ArmySelection['faction'],unit:string):number|undefined{
 return legalUnitSizes(faction,unit)?.[0];
}
