import type {ArmySelection} from './catalog';
import {resolvedWarlord} from './necron-muster-legality';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {necronKeywords as k} from './necron-wargear';
import {instanceBodyguards,validMurdermindFormation} from './leader-eligibility';
import {necronAttachmentRole} from './attachments';

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
 const legal=new Map<string,string>();
 for(const body of roster){
  const candidates=roster.filter(l=>l.id!==body.id&&l.attachedTo===body.id&&!body.attachedTo&&characters.has(l.unit)&&instanceBodyguards(army,l).includes(body.unit));
  if(candidates.length>2||new Set(candidates.map(l=>necronAttachmentRole(l.unit))).size!==candidates.length||!validMurdermindFormation(army,body,candidates))continue;
  for(const l of candidates)legal.set(l.id,body.id);
 }
 const formations=roster.filter(s=>!legal.has(s.id)).map(s=>({id:s.id,body:s,members:[s,...roster.filter(l=>legal.get(l.id)===s.id)]}));
 const matching=(predicate:(s:RosterInstance)=>boolean)=>formations.filter(f=>f.members.some(predicate)).map(f=>f.id);
 const all=formations.map(f=>f.id);
 const led=formations.filter(f=>f.members.length>1).map(f=>f.id);
 const characterUnits=matching(s=>characters.has(s.unit));
 const infantryCharacters=roster.filter(s=>characters.has(s.unit)&&k.INFANTRY.has(s.unit)).map(s=>s.id);
 const targetIds=(s:RosterInstance)=>[s.id,...(legal.has(s.id)?[legal.get(s.id)!]:[])];
 const emit=(id:string,title:string,window:ReminderWindow,summary:string,units?:string[],timing:'start'|'during'|'end'='during')=>{
  if(units&&!units.length)return;
  result.push({id:'11e-necron-'+id,title,window,timing,summary,source:REMAINING_NECRON_SOURCE,origin:'detachment',units});
 };
 const bearer=(s:RosterInstance,id:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during')=>emit(id+'-'+s.id,s.id+' · '+title,window,summary,targetIds(s),timing);
 if(selected.includes('Awakened Dynasty')){
  for(const phase of attackPhases){
   emit('awakened-command-'+phase,'Command Protocols',phase,'While a Necron Character is attached and leading the formation, add 1 to its attacks’ Hit rolls.',led);
   emit('awakened-undying-'+phase,'Protocol of the Undying Legions · 1CP',phase,(phase==='Shooting'?'Opponent’s Shooting: ':'Either Fight: ')+'After enemy attacks destroy at least one model in the unit, activate Reanimation for D3 wounds, or D3+1 if led by a Necron Character. Apply other applicable Reanimation rules.',all);
  }
  for(const phase of phases)emit('awakened-revenant-'+phase,'Protocol of the Eternal Revenant · 1CP',phase,'When an Infantry Character dies, return it at phase end as a separate one-model unit with half its starting wounds, as near its death location as possible and unengaged. Each model can benefit once per battle.',infantryCharacters);
  emit('awakened-void','Protocol of the Hungry Void · 1CP','Fight','Before the unit fights, increase melee Strength by 1 this phase; if led by a Necron Character, also improve melee AP by 1, without stacking with another AP improvement.',all);
  emit('awakened-storm','Protocol of the Sudden Storm · 1CP','Movement','Your Movement: grant Assault to the unit’s ranged weapons until turn end; if led by a Necron Character, also re-roll its Advance this phase.',all);
  emit('awakened-storm-shoot','Protocol of the Sudden Storm · carryover','Shooting','If the Movement stratagem was used on this unit, its ranged weapons retain Assault for this turn.',all);
  emit('awakened-tyrant','Protocol of the Conquering Tyrant · 1CP','Shooting','Your Shooting: before choosing the unit to shoot, re-roll its Hit rolls of 1 against targets within half weapon range this phase. A Necron Character leading it upgrades those re-rolls to all Hits, still only within half range.',all);
  emit('awakened-stars','Protocol of the Vengeful Stars · 2CP','Shooting','Opponent’s Shooting: after an enemy destroys a friendly Necron unit, a Character unit within 6″ of the destroyed unit may shoot back at that attacker alone, if it is a legal target.',characterUnits);
  for(const s of roster.filter(s=>NECRON_CHARACTER_BEARERS.some(u=>u===s.unit))){
   switch(upgrade(s)){
    case 'Veil of Darkness':
     bearer(s,'awakened-veil','Veil of Darkness','End of opponent turn','Once per battle per army: if unengaged, put this formation in Strategic Reserves and give it temporary Deep Strike.','end');
     bearer(s,'awakened-veil-ingress','Veil of Darkness · arrival','Movement','If Veil was used, the formation must arrive by ingress this Movement phase, even on your first turn. Deep Strike expires at the start of Shooting.');break;
    case 'Nether-realm Casket':if(legal.has(s.id))bearer(s,'awakened-casket','Nether-realm Casket','Shooting','While this bearer leads the unit, its models have Stealth against ranged attacks.');break;
    case 'Phasal Subjugator':for(const phase of attackPhases)bearer(s,'awakened-subjugator-'+phase,'Phasal Subjugator (Aura)',phase,'Friendly Necron units without the Character keyword within 6″ of the bearer gain +1 to attack Hit rolls.');break;
    case 'Enaegic Dermal Bond':for(const phase of phases)bearer(s,'awakened-bond-'+phase,'Enaegic Dermal Bond',phase,'Only the bearer has Feel No Pain 4+.');break;
   }
  }
 }
 if(selected.includes('Annihilation Legion')){
  const destroyer=(s:RosterInstance)=>k['DESTROYER CULT'].has(s.unit)||(selected.includes('Cursed Legion')&&((upgrade(s)==='Murdermind'&&k.CRYPTEK.has(s.unit))||(upgrade(s)==='Destroyer Ankh'&&[...OVERLORD_BEARERS,'Catacomb Command Barge'].includes(s.unit))));
  const hunters=matching(s=>destroyer(s)||s.unit==='Flayed Ones');
  const ranged=matching(destroyer);
  emit('annihilation-protocol-charge','Annihilation Protocol','Charge','Destroyer Cult and Flayed Ones units may re-roll charges; add 1 if any declared target is below half strength.',hunters);
  emit('annihilation-protocol-shoot','Annihilation Protocol','Shooting','Destroyer Cult units improve ranged AP by 1 when attacking their closest eligible target.',ranged);
  for(const phase of attackPhases){
   emit('annihilation-masks-'+phase,'Masks of Death · 1CP',phase,(phase==='Shooting'?'Opponent’s Shooting: ':'Either Fight: ')+'After the enemy selects targets, impose −1 to Hit against the targeted eligible unit for the phase.',hunters);
   emit('annihilation-spoor-'+phase,'The Spoor of Frailty · 1CP',phase,(phase==='Shooting'?'Your Shooting: ':'Either Fight: ')+'Before selecting the unit to attack, gain +1 Hit against targets below starting strength; also +1 Wound if the target is below half strength, for this phase.',hunters);
  }
  emit('annihilation-reanimate','Murderous Reanimation · 1CP','Fight','After the unit kills an enemy unit or first reduces it below half strength, activate its Reanimation Protocols.',hunters);
  emit('annihilation-hunters','Pitiless Hunters · 1CP','Fight','Before the unit fights, extend its pile-in and consolidation limits to 6″ this phase; all other move requirements remain.',hunters);
  emit('annihilation-cruelty','Blood-fuelled Cruelty · 1CP','Movement','Opponent’s Movement: after an enemy Falls Back from a unit engaged with it at phase start, roll D6: 2–5 inflicts D3 mortal wounds, 6 inflicts 3. Your unit may then make a Normal move ending as near that enemy as possible.',hunters);
  emit('annihilation-ire','Insanity’s Ire · 1CP','Shooting','Opponent’s Shooting: after an enemy shoots an unengaged eligible unit, that targeted unit may surge up to D6″.',hunters);
  for(const s of roster.filter(s=>NECRON_CHARACTER_BEARERS.some(u=>u===s.unit))){
   switch(upgrade(s)){
    case 'Eternal Madness':bearer(s,'annihilation-madness','Eternal Madness','Fight','For each destroyed model in this formation that has not fought, roll D6; on 4+ it fights after the attacker finishes, then remove it.');break;
    case 'Ingrained Superiority':for(const phase of attackPhases)bearer(s,'annihilation-superiority-'+phase,'Ingrained Superiority',phase,'Improve AP by 1 on critical wounds made by this formation.');break;
    case 'Soulless Reaper':if(destroyer(s))bearer(s,'annihilation-reaper','Soulless Reaper','Movement','When an enemy engaged with this formation is chosen to Fall Back, on D6 roll 3+ it must remain stationary instead.');break;
    case 'Eldritch Nightmare':if(destroyer(s))bearer(s,'annihilation-nightmare','Eldritch Nightmare','Fight','Each enemy unit engaged with the bearer takes a Battle-shock test at phase start.','start');break;
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
   emit('obeisance-worthy-'+phase,'Worthy Foes',phase,'Gain +1 Wound against the enemy unit marked during your previous Command phase.',worthy);
   emit('obeisance-artifice-'+phase,'Enslaved Artifice · 1CP',phase,(phase==='Shooting'?'Your Shooting: ':'Either Fight: ')+'Before attacking with a non-Titanic unit, its unmodified Hit rolls of 5+ count as critical Hits this phase.',nonTitanic);
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
    case 'Unflinching Will':bearer(s,'obeisance-will','Unflinching Will','Fight','The bearer’s melee weapons gain Precision and Anti-Infantry 5+.');break;
    case 'Warrior Noble':bearer(s,'obeisance-noble','Warrior Noble','Fight','Incoming melee attacks against this formation suffer −1 to Hit.');break;
    case 'Eternal Conqueror':for(const phase of attackPhases)bearer(s,'obeisance-conqueror-'+phase,'Eternal Conqueror',phase,'Re-roll Hits when this formation attacks an enemy unit within range of an objective marker.');break;
   }
  }
 }
 return result;
}
