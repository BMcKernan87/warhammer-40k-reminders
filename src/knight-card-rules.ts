import type {RosterInstance} from './roster-instances';
import {knightWeaponCount} from './knight-loadouts';
import {weaponAbilityText} from './weapon-abilities-11th';

interface WeaponProfile {name:string; phase:'Shooting'|'Fight'; abilities:readonly string[]; mode?:boolean; strength?:number; ap?:number}
export interface KnightCardStats {
  source:string; save:number|null; rangedSave:boolean; saveBearer?:string; demise:string|null;
  core?:readonly string[]; damage:{threshold:number;oc:number;slaughterAttacks?:number}|null; conversion:number|null; conversionRequiresHit?:boolean; weapons:readonly WeaponProfile[];
}
function keywordTitle(value:string):string{
  return value.split(/( |[-])/).map(word=>/^d\d/i.test(word)?word.toUpperCase():word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()).join('');
}

function profileText(profile:WeaponProfile,stats:KnightCardStats,snap:boolean):string[]{
  return profile.abilities.flatMap(value=>{
    const title=keywordTitle(value);
    if(title==='Reverberating Summons')return []; // Resolver needs friendly Plaguebearers and the equipped bell.
    if(title==='Conversion')return snap||!stats.conversion?[]:['Conversion (at more than '+stats.conversion+'″, '+(stats.conversionRequiresHit===false?'an unmodified':'a successful unmodified')+' 4+ to Hit is critical)'];
    const effect=weaponAbilityText(title,snap);
    return effect?[effect]:[];
  });
}

export function equippedWeaponText(s:RosterInstance,stats:KnightCardStats,phase:'Fight'|'Shooting',snap:boolean,weaponCount=knightWeaponCount):string {
  const descriptions:string[]=[];
  for(const profile of stats.weapons){
    if(profile.phase!==phase)continue;
    const count=weaponCount(s,profile.name);
    if(!count)continue;
    const abilities=profileText(profile,stats,snap);
    if(profile.strength!==undefined)abilities.unshift('S'+profile.strength+(profile.ap===undefined?'':', AP '+profile.ap));
    if(!abilities.length&&!profile.mode)continue;
    descriptions.push(count+' × '+profile.name+(profile.mode?' (choose one profile per weapon)':'')+(abilities.length?' — '+abilities.join(', '):'')+'.');
  }
  return descriptions.join(' ');
}
