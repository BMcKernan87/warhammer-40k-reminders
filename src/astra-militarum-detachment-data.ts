import type {ArmySelection} from './catalog';
import {ASTRA_UPGRADES} from './astra-detachments.generated';

export function eligibleAstraMilitarumUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Astra Militarum')return [];
 const chosen=army.detachments2026??[];
 const bearer=army.instances?.find(s=>s.id===id);
 return ASTRA_UPGRADES.filter(u=>chosen.includes(u.detachment)&&u.units.some(n=>n===unit)
  &&(!['000010787002','000010787003','000010787005'].includes(u.id)||(bearer&&'characterPromotion' in bearer&&bearer.characterPromotion===true)))
  .map(u=>({...u,name:u.name==='Grand Strategist'&&chosen.includes('Combined Arms')&&chosen.includes('Armoured Infantry')?u.name+' ('+u.detachment+')':u.name}));
}
