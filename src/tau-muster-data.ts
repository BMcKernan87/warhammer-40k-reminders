import type {RosterInstance} from './roster-instances';

/** Kroot Carnivores' Bodyguard rule permits two different Shapers only at Starting Strength 20. */
export function tauAdditionalLeaderPair(body:RosterInstance,left:string,right:string):boolean{
 const shapers=['Kroot Trail Shaper','Kroot War Shaper','Kroot Flesh Shaper'];
 return body.unit==='Kroot Carnivores'&&body.models===20&&left!==right&&shapers.includes(left)&&shapers.includes(right);
}
