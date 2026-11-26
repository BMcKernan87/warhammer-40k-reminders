import type {ArmySelection} from './catalog';
import {GSC_UPGRADES} from './gsc-detachments.generated';

export function currentGscDetachment(name:string):string {
 return name==='Brood Brother Auxilia'||name==='Brood Brothers Auxillia'?'Brood Brothers Auxilia':name;
}
export const gscNameKey=(name:string)=>name.toLowerCase().replaceAll('’',"'").replace(/[‐‑–]/g,'-');

export function eligibleGscUpgrades(army:ArmySelection,unit:string,_id?:string){
 if(army.faction!=='Genestealer Cults')return [];
 const selected=army.detachments2026?.map(currentGscDetachment)??[];
 return GSC_UPGRADES.filter(u=>selected.includes(u.detachment)&&u.units.some(bearer=>gscNameKey(bearer)===gscNameKey(unit)));
}
