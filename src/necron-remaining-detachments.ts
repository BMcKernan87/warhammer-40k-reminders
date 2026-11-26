import type {ArmySelection} from './catalog';
import {verifiedUnitSizes2026} from './datasheets-2026';
import {necronFormationRoots} from './necron-retinues';
import {resolvedWarlord} from './necron-muster-legality';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {hasNecronRangedWeapon,necronKeywords as k} from './necron-wargear';

export const REMAINING_NECRON_SOURCE='https://wahapedia.ru/wh40k11ed/factions/necrons/';
export const NECRON_CHARACTER_BEARERS=['Chronomancer','Geomancer','Hexmark Destroyer','Overlord','Overlord with translocation shroud','Plasmancer','Psychomancer','Royal Warden','Skorpekh Lord','Technomancer','Lokhust Lord','Catacomb Command Barge'] as const;
const characters=new Set<string>([...NECRON_CHARACTER_BEARERS,'Transcendent C’tan','Illuminor Szeras','Imotekh the Stormlord','Nekrosor Ammentar','Orikan the Diviner','Trazyn the Infinite','C’tan Shard of the Deceiver','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','The Silent King']);
const nobles=new Set(['Overlord','Overlord with translocation shroud','Imotekh the Stormlord','Trazyn the Infinite','Catacomb Command Barge']);
const triarch=new Set(['The Silent King','Triarch Praetorians','Triarch Stalker']);
export const OVERLORD_BEARERS=['Overlord','Overlord with translocation shroud'] as const;
export const DESTROYER_BEARERS=['Hexmark Destroyer','Lokhust Lord','Skorpekh Lord'] as const;
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attackPhases=['Shooting','Fight'] as const;
export function remainingNecronReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Necrons'||!roster.length)return [];
 const result:GeneratedReminder[]=[];
 const selected=army.detachments2026??[];
 const upgrade=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit];
 // Invalid imported attachments must not manufacture a formation keyword or a leading bonus.
 const formations=necronFormationRoots(army,roster);
 const legal=new Map(formations.flatMap(f=>f.leading.map(s=>[s.id,f.id] as const)));
 const matching=(predicate:(s:RosterInstance)=>boolean)=>formations.filter(f=>f.members.some(predicate)).map(f=>f.id);
 const all=formations.map(f=>f.id);
 const shooters=new Set(formations.filter(f=>f.members.some(hasNecronRangedWeapon)).map(f=>f.id));
 const armed=(ids:string[])=>ids.filter(id=>shooters.has(id));
 const bearerAttackPhases=(s:RosterInstance)=>attackPhases.filter(phase=>phase==='Fight'||shooters.has(legal.get(s.id)??s.id));
 const led=formations.filter(f=>f.members.some(s=>legal.has(s.id)&&characters.has(s.unit))).map(f=>f.id);
 const characterUnits=matching(s=>characters.has(s.unit));
 const infantryCharacters=roster.filter(s=>characters.has(s.unit)&&k.INFANTRY.has(s.unit)).map(s=>s.id);
 const targetIds=(s:RosterInstance)=>[...new Set([s.id,...(legal.has(s.id)?[legal.get(s.id)!]:[])])];
 const emit=(id:string,title:string,window:ReminderWindow,summary:string,units?:string[],timing:'start'|'during'|'end'='during')=>{
  if(units&&!units.length)return;
  result.push({id:'11e-necron-'+id,title,window,timing,summary,source:REMAINING_NECRON_SOURCE,origin:'detachment',units});
 };
 const bearer=(s:RosterInstance,id:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during',modelOnly=false)=>emit(id+'-'+s.id,s.id+' · '+title,window,summary,modelOnly?[s.id]:targetIds(s),timing);
 if(selected.includes('Awakened Dynasty')){
  const undyingTargets=formations.filter(f=>f.members.length>1||(f.originalBody.models??verifiedUnitSizes2026(army,f.originalBody.unit)?.[0]??1)>1).map(f=>f.id);
  for(const phase of attackPhases){
   emit('awakened-command-'+phase,'Command Protocols',phase,'While a Necron Character is attached and leading the formation, add 1 to its attacks’ Hit rolls.',phase==='Shooting'?armed(led):led);
   emit('awakened-undying-'+phase,'Protocol of the Undying Legions · 1CP',phase,(phase==='Shooting'?'Opponent’s Shooting: ':'Either Fight: ')+'After an enemy finishes its attacks, select a surviving unit that lost a model to those attacks. Activate Reanimation for D3 wounds, or D3+1 if a Necron Character leads it. Apply active Reanimation abilities. An attached Leader or Support can restore lost Bodyguards even if it is the last model in the formation.',undyingTargets);
  }
  for(const phase of phases)emit('awakened-revenant-'+phase,'Protocol of the Eternal Revenant · 1CP',phase,'Immediately after your Infantry Character model is destroyed, target that destroyed model. At phase end return it as a separate one-model unit with half its starting wounds, as close to its death location as possible and unengaged. Once per model per battle.',infantryCharacters);
  emit('awakened-void','Protocol of the Hungry Void · 1CP','Fight','Before the unit fights, increase melee Strength by 1 this phase; if led by a Necron Character, also improve melee AP by 1, without stacking with another AP improvement.',all);
  emit('awakened-storm','Protocol of the Sudden Storm · 1CP','Movement','Your Movement: grant Assault to the unit’s ranged weapons until turn end; if led by a Necron Character, also re-roll its Advance this phase.',all.filter(id=>shooters.has(id)||led.includes(id)));
  emit('awakened-storm-shoot','Protocol of the Sudden Storm · carryover','Shooting','If the Movement stratagem was used on this unit, its ranged weapons retain Assault for this turn.',armed(all));
  emit('awakened-tyrant','Protocol of the Conquering Tyrant · 1CP','Shooting','Your Shooting: before choosing the unit to shoot, re-roll its Hit rolls of 1 against targets within half weapon range this phase. If a Necron Character leads it, re-roll any Hit roll instead, but only when the attack qualifies for the half range benefit (FAQ).',armed(all));
  if(formations.length>1)emit('awakened-stars','Protocol of the Vengeful Stars · 2CP','Shooting','Opponent’s Shooting: after an enemy destroys a friendly Necron unit, select a Character unit that was within 6″ of the destroyed unit when it was destroyed; after the attacker finishes, it may shoot only that attacker if eligible. Destroying only the Bodyguard or a Character in an attached unit does not trigger this reaction while another model in that formation survives.',armed(characterUnits));
  for(const s of roster.filter(s=>NECRON_CHARACTER_BEARERS.some(u=>u===s.unit))){
   switch(upgrade(s)){
    case 'Veil of Darkness':
     bearer(s,'awakened-veil','Veil of Darkness','End of opponent turn','Once per battle per army: if unengaged, put this formation in Strategic Reserves and give it temporary Deep Strike.','end');
     bearer(s,'awakened-veil-ingress','Veil of Darkness · arrival','Movement','If Veil was used, the formation must arrive by ingress this Movement phase, even on your first turn. Deep Strike expires at the start of Shooting.');break;
    case 'Nether-realm Casket':if(legal.has(s.id))bearer(s,'awakened-casket','Nether-realm Casket','Shooting','While the bearer is leading, all models in the unit gain Stealth; ranged attacks against a unit whose every surviving model has Stealth grant the Benefit of Cover.');break;
    case 'Phasal Subjugator': {
     // A different Bodyguard can become eligible if its last Character is lost.
     // The bearer’s own formation cannot lose every Character while the aura is active.
     const targets=formations.filter(f=>!characters.has(f.body.unit)&&!f.members.some(m=>m.id===s.id));
     const joined=targets.filter(f=>f.members.some(m=>characters.has(m.unit))).map(f=>f.id);
     const afterLoss=joined.length?' '+joined.join(', ')+' can qualify only after losing all attached Characters.':'';
     for(const phase of attackPhases)emit('awakened-subjugator-'+phase+'-'+s.id,s.id+' · Phasal Subjugator (Aura)',phase,
      'Friendly units without the Character keyword within 6″ of the living bearer gain +1 to Hit.'+afterLoss,targets.map(f=>f.id));
     break;
    }
    case 'Enaegic Dermal Bond':for(const phase of phases)bearer(s,'awakened-bond-'+phase,'Enaegic Dermal Bond',phase,'Only the bearer has Feel No Pain 4+.','during',true);break;
   }
  }
 }
 if(selected.includes('Annihilation Legion')){
  const destroyer=(s:RosterInstance)=>k['DESTROYER CULT'].has(s.unit)||(selected.includes('Cursed Legion')&&((upgrade(s)==='Murdermind'&&k.CRYPTEK.has(s.unit))||(upgrade(s)==='Destroyer Ankh'&&[...OVERLORD_BEARERS,'Catacomb Command Barge'].includes(s.unit))));
  const hunters=matching(s=>destroyer(s)||s.unit==='Flayed Ones');
  const ranged=armed(matching(destroyer));
  emit('annihilation-protocol-charge','Annihilation Protocol','Charge','Destroyer Cult and Flayed Ones units may re-roll charges; add 1 if any declared target is below half strength.',hunters);
  emit('annihilation-protocol-shoot','Annihilation Protocol','Shooting','Destroyer Cult units improve ranged AP by 1 when attacking their closest eligible target.',ranged);
  for(const phase of attackPhases){
   emit('annihilation-masks-'+phase,'Masks of Death · 1CP',phase,(phase==='Shooting'?'Opponent’s Shooting: ':'Either Fight: ')+'After the enemy selects targets, impose −1 to Hit against the targeted eligible unit for the phase.',hunters);
   emit('annihilation-spoor-'+phase,'The Spoor of Frailty · 1CP',phase,(phase==='Shooting'?'Your Shooting: ':'Either Fight: ')+'Before selecting the unit to attack, gain +1 Hit against targets below starting strength; also +1 Wound if the target is below half strength, for this phase.',phase==='Shooting'?armed(hunters):hunters);
  }
  emit('annihilation-reanimate','Murderous Reanimation · 1CP','Fight','After the unit kills an enemy unit or first reduces it below half strength, activate its Reanimation Protocols.',hunters);
  emit('annihilation-hunters','Pitiless Hunters · 1CP','Fight','Before the unit fights, extend its pile-in and consolidation limits to 6″ this phase; all other move requirements remain.',hunters);
  emit('annihilation-cruelty','Blood-fuelled Cruelty · 1CP','Movement','Opponent’s Movement: after an enemy Falls Back from a unit engaged with it at phase start, roll D6: 2–5 inflicts D3 mortal wounds, 6 inflicts 3. Your unit may then make a Normal move ending as near that enemy as possible.',hunters);
  emit('annihilation-ire','Insanity’s Ire · 1CP','Shooting','Opponent’s Shooting: after an enemy shoots an unengaged eligible unit, that targeted unit may surge up to D6″.',hunters);
  for(const s of roster.filter(s=>NECRON_CHARACTER_BEARERS.some(u=>u===s.unit))){
   switch(upgrade(s)){
    case 'Eternal Madness':bearer(s,'annihilation-madness','Eternal Madness','Fight','For each destroyed model in this formation that has not fought, roll D6; on 4+ it fights after the attacker finishes, then remove it.');break;
    case 'Ingrained Superiority':for(const phase of bearerAttackPhases(s))bearer(s,'annihilation-superiority-'+phase,'Ingrained Superiority',phase,'Improve AP by 1 on critical wounds made by this formation.');break;
    case 'Soulless Reaper':if(destroyer(s))bearer(s,'annihilation-reaper','Soulless Reaper','Movement','When an enemy engaged with the bearer’s unit is selected to Fall Back, roll D6; on 3+ it cannot Fall Back and must remain stationary this phase.');break;
    case 'Eldritch Nightmare':if(destroyer(s))bearer(s,'annihilation-nightmare','Eldritch Nightmare','Fight','Each enemy unit engaged with the bearer model (not merely its Bodyguard) takes a Battle-shock test at the start of either Fight phase.','start',true);break;
   }
  }
 }
 if(selected.includes('Obeisance Phalanx')){
  const worthy=matching(s=>nobles.has(s.unit)||triarch.has(s.unit)||s.unit==='Lychguard');
  const guards=matching(s=>triarch.has(s.unit)||s.unit==='Lychguard');
  const sentinels=matching(s=>['Lychguard','Triarch Praetorians'].includes(s.unit));
  const vehicles=matching(s=>k.VEHICLE.has(s.unit)||s.unit==='The Silent King');
  const nonTitanic=formations.filter(f=>!f.members.some(s=>k.TITANIC.has(s.unit))).map(f=>f.id);
  emit('obeisance-worthy-command','Worthy Foes','Command','Your Command: mark one enemy unit until your next Command phase. Qualifying Noble, Lychguard and Triarch units gain +1 Wound against that marked unit.',worthy);
  for(const phase of attackPhases){
   emit('obeisance-worthy-'+phase,'Worthy Foes',phase,'Gain +1 to Wound against the marked enemy until the start of your next Command phase; the entire qualifying unit benefits, including attached models.',phase==='Shooting'?armed(worthy):worthy);
   emit('obeisance-artifice-'+phase,'Enslaved Artifice · 1CP',phase,(phase==='Shooting'?'Your Shooting: ':'Either Fight: ')+'Before attacking with a non-Titanic unit, its unmodified Hit rolls of 5+ count as critical Hits this phase.',phase==='Shooting'?armed(nonTitanic):nonTitanic);
   emit('obeisance-nano-'+phase,'Nanoassembly Protocols · 1CP',phase,(phase==='Shooting'?'Opponent’s Shooting: ':'Either Fight: ')+'After enemy target selection, reduce incoming attack Damage by 1 against the targeted Vehicle unit this phase.',vehicles);
  }
  const warlord=resolvedWarlord(army);
  if(warlord)for(const phase of phases)emit('obeisance-time-'+phase,'Your Time Is Nigh · 1CP',phase,'Immediately after the enemy Warlord dies, target your surviving Necron Warlord. Enemy Battle-shock and Leadership tests suffer −1 for the remainder of the battle.',[warlord.id]);
  emit('obeisance-sentinels','Sentinels of Eternity · 1CP','Fight','After enemy target selection, when any model in the targeted Lychguard or Triarch Praetorians unit dies before fighting, on 4+ it fights after the attacker finishes; then remove it. Lasts this phase.',sentinels);
  emit('obeisance-rival','Suffer No Rival · 1CP','Fight','Before a Lychguard or Triarch unit fights, its melee weapons gain Precision this phase.',guards);
  emit('obeisance-territory','Territorial Obsession · 1CP','Command','Your Command: select a Lychguard or Triarch unit; its models gain +1 OC, or +3 OC if the unit is a Vehicle, until your next Command phase.',guards);
  for(const s of roster.filter(s=>OVERLORD_BEARERS.some(u=>u===s.unit))){
   switch(upgrade(s)){
    case 'Honourable Combatant':for(const phase of attackPhases)bearer(s,'obeisance-combatant-'+phase,'Honourable Combatant',phase,'If this formation destroys an enemy Character unit, the opponent loses 1 CP if available.');break;
    case 'Unflinching Will':bearer(s,'obeisance-will','Unflinching Will','Fight','The bearer’s melee weapons gain Precision and Anti-Infantry 5+.','during',true);break;
    case 'Warrior Noble':bearer(s,'obeisance-noble','Warrior Noble','Fight','Incoming melee attacks against this formation suffer −1 to Hit.');break;
    case 'Eternal Conqueror':for(const phase of bearerAttackPhases(s))bearer(s,'obeisance-conqueror-'+phase,'Eternal Conqueror',phase,'Re-roll Hits when this formation attacks an enemy unit within range of an objective marker.');break;
   }
  }
 }
 return result;
}
