// Core 10.05–10.07, 15.09 and chapter 24. The text differs by shooting type:
// snap shots cannot generate critical hits or take a Heavy hit modifier.
export function weaponAbilityText(keyword:string,snap:boolean):string|undefined{
  if(keyword==='Lethal Hits: Non-Monster/vehicle')return snap?undefined:'Lethal Hits (against targets with neither Monster nor Vehicle, critical hits can wound automatically)';
  if(keyword==='Devastating Wounds: Infantry')return 'Devastating Wounds (against Infantry only, a critical wound inflicts the weapon’s Damage as mortal wounds on one model after normal damage)';
  if(keyword==='Sustained Hits 2: Monster/vehicle')return snap?undefined:'Sustained Hits 2 (against a Monster or Vehicle, each critical hit scores two extra hits)';
  if(keyword==='Sustained Hits 1: Non-Monster/vehicle')return snap?undefined:'Sustained Hits 1 (against a target with neither Monster nor Vehicle, each critical hit scores one extra hit)';
  if(keyword==='Lethal Hits: Monster/vehicle')return snap?undefined:'Lethal Hits (against a Monster or Vehicle, a critical hit can wound automatically)';
  if(keyword==='Devastating Wounds: Psyker')return 'Devastating Wounds (against a Psyker, a critical wound deals this weapon’s Damage as mortal wounds to one model after normal damage)';
  if(keyword.startsWith('Blast '))return keyword+' (add '+keyword.slice(6)+' attack dice per five models in the target when selected)';
  if(keyword.startsWith('Cleave '))return keyword+' (if all this weapon’s attacks target the same unit, add '+keyword.slice(7)+' attack dice per five models in that target)';
  if(keyword.startsWith('Sustained Hits '))return snap?undefined:keyword+' (each critical hit scores '+keyword.slice('Sustained Hits '.length)+' extra hit'+(keyword.endsWith(' 1')?'':'s')+')';
  if(keyword.startsWith('Rapid Fire '))return keyword+' (+'+keyword.slice('Rapid Fire '.length)+' attacks within half range)';
  if(keyword.startsWith('Melta '))return keyword+' (+'+keyword.slice(6)+' Damage within half range)';
  if(keyword.startsWith('Anti-')){
    const [target,roll]=keyword.slice(5).split(' ');
    return keyword+' (an unmodified Wound roll of '+roll+' scores a critical wound against '+target+' units)';
  }
  switch(keyword){
    case 'Overcharge': return 'Overcharge (subtract 2 from the bearer’s Hazardous test for this weapon profile)';
    case 'One Shot': return 'One Shot (each weapon may attack once per battle, including after its bearer is returned)';
    case 'Close-Quarters': return snap?'Close-Quarters (each non-Monster, non-Vehicle model chooses its Close-Quarters weapons or its other guns)':'Close-Quarters (if the unit did not Advance, use close-quarters shooting against an engaged target. For other shooting types, each non-Monster, non-Vehicle model chooses its Close-Quarters weapons or other guns)';
    case 'Hazardous': return 'Hazardous (after resolving attacks, roll a hazard die for each selected Hazardous weapon. On 1–2 the unit suffers 1 mortal wound, or 3 if all its models are Monsters or Vehicles)';
    case 'Lance': return 'Lance (+1 to Wound if the attacking unit charged this turn)';
    case 'Heavy': return snap?undefined:'Heavy (+1 to Hit in your Shooting phase if unengaged, no models moved more than 3″ this turn, and the unit was not set up this turn)';
    case 'Lethal Hits': return snap?undefined:'Lethal Hits (on a critical hit, you may skip the Wound roll and wound automatically)';
    case 'Assault': return snap?undefined:'Assault (after an Advance, an unengaged unit can use assault shooting with Assault weapons only and cannot then start an action this phase)';
    case 'Indirect Fire': return snap?undefined:'Indirect Fire (if unengaged and you did not Advance, indirect shooting can target unseen enemies. The target gets cover, Hit rolls cannot be re-rolled, and unmodified 1–5 fails, or 1–3 if stationary with a friendly spotter)';
    case 'Blast': return 'Blast (+1 attack per five models in the target when selected)';
    case 'Devastating Wounds: Monster/vehicle': return 'Devastating Wounds (against a Monster or Vehicle only, a critical wound inflicts this weapon’s Damage as mortal wounds on one model after normal damage)';
    case 'Psychic': return 'Psychic (these attacks are psychic attacks for rules that affect them)';
    case 'Devastating Wounds': return 'Devastating Wounds (on a critical wound, deal the weapon’s Damage as mortal wounds to one model after normal damage)';
    case 'Extra Attacks': return 'Extra Attacks (fight with this weapon in addition to your chosen melee weapon)';
    case 'Ignores Cover': return 'Ignores Cover (deny the target the Benefit of Cover)';
    case 'Pistol': return snap?'Pistol (each non-Monster, non-Vehicle firing model chooses Pistols or other ranged weapons)':'Pistol (can use close-quarters shooting against an engaged target if the unit did not Advance. With other shooting types, a non-Monster, non-Vehicle model chooses Pistols or other ranged weapons)';
    case 'Precision': return 'Precision (when allocating attacks, the active player may select the allocation group containing a visible enemy Character)';
    case 'Torrent': return 'Torrent (hits automatically)';
    case 'Twin-Linked': return 'Twin-Linked (may re-roll the Wound roll)';
    default: return keyword;
  }
}
