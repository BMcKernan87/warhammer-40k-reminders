// Publisher Core 10.05–10.07 (p.35), 15.09 (p.57) and chapter 24 (pp.78–85):
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// The text differs by shooting type:
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
    case 'Close-Quarters': return closeQuartersText('Close-Quarters',snap);
    case 'Hazardous': return 'Hazardous (after resolving all of the unit’s attacks, roll together one hazard die per selected Hazardous weapon. Each 1–2 inflicts 1 mortal wound on the unit, or 3 if every model is a Monster or Vehicle. Allocate these as normal mortal wounds; they are not restricted to the weapon bearers)';
    case 'Lance': return 'Lance (+1 to Wound if the attacking unit charged this turn)';
    case 'Heavy': return snap?undefined:'Heavy (+1 to Hit in your Shooting phase if unengaged, no models moved more than 3″ this turn, and the unit was not set up this turn)';
    case 'Lethal Hits': return snap?undefined:'Lethal Hits (on a critical hit, you may skip the Wound roll and wound automatically)';
    case 'Assault': return snap?undefined:'Assault (after an Advance, an unengaged unit can use assault shooting with Assault weapons only and cannot then start an action this phase)';
    case 'Indirect Fire': return snap?undefined:'Indirect Fire (if unengaged and you did not Advance, indirect shooting can target unseen enemies. The target gets cover and Hit rolls cannot be re-rolled. Unmodified 1–5 fails, or 1–3 if the firing unit Remained Stationary and the target is visible to a friendly unit. Other guns still require visible targets. After shooting, the unit cannot start an action this phase)';
    case 'Blast': return 'Blast (+1 attack per five models in the target when selected)';
    case 'Devastating Wounds: Monster/vehicle': return 'Devastating Wounds (against a Monster or Vehicle only, a critical wound inflicts this weapon’s Damage as mortal wounds on one model after normal damage)';
    case 'Psychic': return snap?'Psychic (these attacks are psychic attacks for rules that affect them)':'Psychic (these are psychic attacks; you may ignore any or all modifiers to their Ballistic Skill or Weapon Skill and Hit roll)';
    case 'Devastating Wounds': return 'Devastating Wounds (on a critical wound, deal the weapon’s Damage as mortal wounds to one model after normal damage)';
    case 'Extra Attacks': return 'Extra Attacks (select all of the model’s Extra Attacks weapons and one of its other melee weapons if available)';
    case 'Ignores Cover': return 'Ignores Cover (deny the target the Benefit of Cover)';
    case 'Pistol': return closeQuartersText('Pistol',snap);
    case 'Precision': return 'Precision (when allocating attacks, the active player may select the allocation group containing a visible enemy Character)';
    case 'Torrent': return 'Torrent (hits automatically)';
    case 'Twin-Linked': return 'Twin-Linked (may re-roll the Wound roll)';
    default: return keyword;
  }
}

// Core 24.27 makes Pistol and Close-Quarters identical for all rules purposes.
// Their shared weapon group must not be mistaken for two competing categories.
function closeQuartersText(name:'Pistol'|'Close-Quarters',snap:boolean):string{
  const choice='each non-Monster, non-Vehicle model chooses its Pistol/Close-Quarters weapons together or its other ranged weapons';
  return name+' ('+(snap?choice:'if engaged and the unit did not Advance, it can use close-quarters shooting. Non-Monster, non-Vehicle models then fire only Pistol/Close-Quarters weapons and only at enemies engaged with their unit. With other shooting types, '+choice+'. After close-quarters shooting, the unit cannot start an action this phase')+')';
}
