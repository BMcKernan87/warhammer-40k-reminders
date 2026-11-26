import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {KNIGHT_CARD_STATS as cards} from './gsc-card-data.generated';
import {equippedWeaponText} from './knight-card-rules';
import {knightWeaponCount} from './knight-loadouts';
import {gscCargoFormations,gscFormations,type GscFormation} from './gsc-transports';
import {gscHasRangedWeapon,gscRidgerunnerWeapons} from './gsc-loadouts';
import {gscKeywords} from './gsc-data';
import {gscAmbushCandidates} from './gsc-cult-ambush';

type Stage=[ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const ownShoot:Stage=['Shooting','own','during'],fight:Stage=['Fight','either','during'],move:Stage=['Movement','own','during'];
const overwatch:Stage=['Movement','opponent','end'],enemyShoot:Stage=['Shooting','opponent','during'],enemyOverwatch:Stage=['Movement','own','end'];
const defend=[enemyShoot,enemyOverwatch,fight];
const any:Stage[]=PHASES.map(phase=>[phase,'either','during']);
const prep:Stage=['Pre-battle','either','during'],ownCommand:Stage=['Command','own','during'],commandStart:Stage=['Command','own','start'];

export function gscDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Genestealer Cults')return [];
 const selected=roster.filter(s=>cards[s.unit]);
 const groups=gscFormations(army,selected);
 const ambush=gscAmbushCandidates(army,roster);
 const all=groups.map(g=>g.body.id);
 const shooters=groups.filter(g=>g.members.some(gscHasRangedWeapon)).map(g=>g.body.id);
 const hasGun=(form:GscFormation)=>form.members.some(gscHasRangedWeapon);
 const groupsByMember=new Map(groups.flatMap(g=>g.members.map(m=>[m.id,g] as const)));
 const rows:GeneratedReminder[]=[];
 function emit(s:RosterInstance,title:string,[window,turn,timing]:Stage,summary:string,units:string[]=[groupsByMember.get(s.id)!.body.id]){
  if(units.length)rows.push({id:['11e-gsc-card',s.id,title,window,turn].join(':'),sourceRuleId:title,title:s.id+' · '+title,window,turn,timing,summary,units,source:cards[s.unit].source,origin:'unit'});
 }
 const once=(s:RosterInstance,title:string,stage:Stage,text:string,units?:string[])=>{
  const providers=selected.filter(m=>m.unit===s.unit);
  if(providers[0]!==s)return;
  emit(s,title,stage,text+' Eligible bearers: '+providers.map(m=>m.id).join(', ')+'.',units??[...new Set(providers.map(m=>groupsByMember.get(m.id)!.body.id))]);
 };
 for(const s of selected){
  const group=groupsByMember.get(s.id)!,{body,members}=group,form=body.id,leading=s.id!==form;
  const core=cards[s.unit].core??[],stats=cards[s.unit];
  const add=(title:string,stage:Stage,summary:string,targets?:string[])=>emit(s,title,stage,summary,targets);
  const personal=(title:string,stage:Stage,summary:string)=>add(title,stage,summary,[s.id]);
  const phaseRule=(name:string,text:string)=>any.forEach(stage=>add(name,stage,text));
  const every=(ability:string)=>members.every(m=>cards[m.unit].core?.includes(ability));
  const fnp=core.find(a=>a.startsWith('Feel No Pain'));
  if(fnp)for(const st of any)personal(fnp,st,'When a '+s.unit+' model would lose a wound, keep that wound on '+fnp.slice(-2)+'. Use its best applicable Feel No Pain roll.');
  if(stats.save)for(const st of defend)personal('Invulnerable save',st,'When an attack is allocated to this model, you may use its '+stats.save+'+ invulnerable save.');
  if(stats.demise)for(const st of any)personal('Deadly Demise '+stats.demise,st,'When this model is destroyed, after any emergency disembarkation roll D6. On a 6, every unit within 6″ takes '+stats.demise+' mortal wound'+(stats.demise==='1'?'':'s')+', rolling random damage separately per unit.');
  if(stats.damage)for(const st of [ownShoot,fight])personal('Damaged',st,'While this model has '+stats.damage.threshold+' or fewer wounds remaining, subtract 1 from its Hit rolls.');
  if(s.id===form){
   if(every('Deep Strike'))for(const st of [prep,['Movement','either','during'] as Stage])add('Deep Strike',st,'When this formation makes an ingress move, you may set it up anywhere more than 8″ horizontally from all enemies, including in their deployment zone.');
   if(every('Infiltrators'))add('Infiltrators',prep,'You may deploy the whole formation more than 8″ horizontally from enemy units and the enemy deployment zone.');
   if(every('Stealth'))for(const st of [enemyShoot,enemyOverwatch])add('Stealth',st,'Because every model has Stealth, the formation has the Benefit of Cover against ranged attacks.');
   if(members.length===1&&core.includes('Lone Operative'))for(const st of [enemyShoot,enemyOverwatch])personal('Lone Operative',st,'Enemy models outside 12″ cannot see this model or use indirect fire against it.');
   const distances=members.map(m=>Number(cards[m.unit].core?.find(a=>a.startsWith('Scouts '))?.match(/\d+/)?.[0]??0));
   if(distances.every(Boolean))add('Scouts '+Math.min(...distances)+'″',prep,'During Resolve Pre-battle Abilities, choose one option. A unit in Strategic Reserves may deploy wholly within your deployment zone. A unit already wholly within that zone may make a Scout move up to '+Math.min(...distances)+'″, ending more than 8″ horizontally from enemies.');
  }
  for(const stage of [ownShoot,overwatch,fight]){
   const phase=stage===fight?'Fight':'Shooting',text=equippedWeaponText(s,stats,phase,stage===overwatch);
   if(text)personal(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles',stage,(stage===overwatch?'When firing Overwatch: ':'')+text);
  }
  const cargo=gscCargoFormations(army,s,selected);
  if(cargo.length){
   const armed=cargo.flatMap(g=>{
    const names=new Set(g.members.flatMap(m=>cards[m.unit].weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot')&&knightWeaponCount(m,w.name)).map(w=>w.name)));
    return names.size?[{id:g.body.id,description:g.body.id+' ('+[...names].join(', ')+')'}]:[];
   });
   if(armed.length)add('Firing Deck 6',ownShoot,'When this transport shoots, choose up to six embarked models whose units have not shot this phase. Count one equipped ranged weapon per model, excluding One Shot. All units embarked in this transport then become ineligible to shoot for the rest of the turn. The transport uses its own rules when firing. Possible weapons: '+armed.map(m=>m.description).join('; ')+'.',[s.id,...armed.map(m=>m.id)]);
   if(s.unit==='Goliath Truck'){
    if(cargo.some(hasGun))add('Fire Support',ownShoot,'After this Truck shoots, pick an enemy it hit. Until this phase ends, friendly models that disembarked from this specific Truck this turn can re-roll Wound rolls when attacking that enemy. Possible disembarking formations: '+cargo.filter(hasGun).map(g=>g.body.id).join(', ')+'.',cargo.filter(hasGun).map(g=>g.body.id));
    const scouts=cargo.filter(g=>g.members.every(m=>cards[m.unit].core?.some(a=>a.startsWith('Scouts '))));
    if(scouts.length)add('Scouts · embarked passengers',prep,'If this Dedicated Transport is wholly in your deployment zone and every embarked model has Scouts, it may make their 6″ Scout move, ending more than 8″ horizontally from enemies. Eligible formations: '+scouts.map(g=>g.body.id).join(', ')+'.',[s.id,...scouts.map(g=>g.body.id)]);
   }
  }
  switch(s.unit){
  case 'Patriarch':
   if(leading)add('Might From Beyond',fight,'While the Patriarch survives, all melee weapons in its attached formation gain Devastating Wounds. On a critical wound, deal the weapon’s Damage as mortal wounds to a single model.');
   personal('Cosmic Horror (Psychic)',['Fight','either','start'],'Each enemy unit within 6″ of the Patriarch makes a Battle-shock roll. Once per battle at the same trigger, its Psychic Familiar extends this range to 12″ for the phase.');break;
  case 'Magus':
   for(const phase of PHASES)add('Spiritual Leader',[phase,'either','start'],'Once per battle for this Magus at the start of any phase, clear Battle-shock from one friendly Genestealer Cults formation within 12″.',all);
   once(s,'Mind Control (Psychic)',['Shooting','opponent','start'],'Choose one Magus for the army and one enemy within 18″. The chosen Magus may use its Psychic Familiar once per battle to extend this to 24″. Roll D6: on 1 the Magus suffers D3 mortal wounds, on 2–5 the target’s attacks take −1 to Hit this phase, on 6 also subtract 1 from their Wound rolls.');break;
  case 'Primus':
   if(leading)for(const st of [ownShoot,fight])if(st===fight||hasGun(group))add('Cult Demagogue',st,'While the Primus survives, add 1 to this attached formation’s Hit rolls.');
   once(s,'Decoys and Misdirection',['Pre-battle','either','end'],'After both armies deploy, redeploy up to three of your Genestealer Cults units. They may enter Strategic Reserves regardless of the starting reserve limit.',all);break;
  case 'Acolyte Iconward':
   if(leading)phaseRule('Nexus of Devotion','While the Iconward survives, every model in this formation has Feel No Pain '+(body.unit==='Hybrid Metamorphs'?'4+':'5+')+'. Roll once per wound it would lose.');
   if(ambush.length)for(const phase of PHASES)once(s,'Summon the Cult',[phase,'either','during'],'Once per battle across your army when enemy movement would remove a Cult Ambush marker, move it within 12″ of any Iconward on the battlefield and more than 8″ horizontally from all enemy units. If placement is impossible, remove the marker without spending this use.');break;
  case 'Acolyte Hybrids With Autopistols':
   once(s,'Claimed for the Cult',commandStart,'Roll one D6 per objective you control within range of one or more of these units. If any die is 4+, gain 1 CP total.');break;
  case 'Neophyte Hybrids':
   add('A Plan Generations in the Making',['Command','own','end'],'An objective that you control within range of this formation stays yours until your opponent’s Level of Control exceeds yours at the end of a phase.');break;
  case 'Acolyte Hybrids With Hand Flamers':
   for(const st of [ownShoot,overwatch,fight])add('Industrialised Destruction',st,'When attacking, re-roll Wound rolls of 1. Against a unit within range of an objective, you may re-roll any Wound roll instead.');break;
  case 'Hybrid Metamorphs':
   add('Brood Surge',enemyShoot,'After an enemy unit has shot and killed at least one model in this formation, it may surge up to D6″ if unengaged, not Battle-shocked and it has not moved this phase. Move each model into engagement with the closest enemy if possible, otherwise as close as possible. Do not engage any other enemy. It cannot move again this phase.');break;
  case 'Aberrants':
   if(members.length>1)for(const st of defend)add('Hulking Bodyguards',st,'While a Character leads the Aberrants, attacks against the formation suffer −1 to Wound if the attack’s Strength exceeds the unit’s Toughness.');break;
  case 'Purestrain Genestealers':
   for(const st of [move,['Charge','own','during'] as Stage])add('Swift and Deadly',st,'Advancing this turn does not prevent this formation declaring a charge.');break;
  case 'Goliath Rockgrinder':
   personal('Grinding Line-breaker',['Movement','opponent','during'],'When a non-Monster, non-Vehicle enemy Falls Back from engagement with the Rockgrinder, it must use Desperate Escape, making a hazard roll per model and a Battle-shock roll. Subtract 1 from those hazard rolls if the enemy is already Battle-shocked.');break;
  case 'Abominant':
   if(leading)add('The Chosen One',fight,'When a friendly model in this formation is destroyed by a melee attack before it has fought this phase, roll D6. On a 4+ it fights after the attacker’s unit finishes those attacks, then remove it.');
   for(const phase of PHASES)personal('Regenerating Gene-mass',[phase,'either','end'],'The first time this Abominant is destroyed, roll D6 at phase end. On a 2+ return it at full wounds as close as possible to where it fell, outside enemy engagement.');break;
  case 'Jackal Alphus':
   add('Priority Target',ownShoot,'After this formation shoots, select an enemy hit by its Cult sniper rifle. Until phase end, friendly Genestealer Cults models re-roll Hit rolls of 1 against that target.',shooters);
   add('Master Outrider',ownShoot,'After shooting, this formation may make a Normal move up to 6″ if unengaged. If it does it cannot declare a charge this turn.');break;
  case 'Clamavus':
   once(s,'Voice of New Truths',ownCommand,'One Clamavus may choose an enemy within 18″ and force a Battle-shock roll.');
   for(const st of [move,['Movement','opponent','during'] as Stage])personal('Scrambler Array',st,'When enemy reinforcements arrive, they cannot set up within 12″ of this Clamavus, including during Rapid Ingress.');break;
  case 'Locus':{
   add(leading?'Sudden Assault':'Fights First',['Fight','either','start'],leading?'While the Locus survives, the attached formation has Fights First. It can be selected in the Fights First step.':'This Locus can be selected in the Fights First step.');
   const characters=members.filter(m=>m.id!==s.id&&gscKeywords(army,m).has('CHARACTER'));
   if(leading&&characters.length)for(const st of any)add('Bodyguard',st,'When another attached Character in this formation would lose a wound, that model keeps it on 4+. This protection does not apply to the Locus itself.',characters.map(m=>m.id));break;
  }
  case 'Sanctus':
   if(knightWeaponCount(s,'Cult sniper rifle'))personal('Creeping Shadow',['Movement','opponent','during'],'After an enemy ends a move within 8″ of this unengaged rifle bearer, it may make a Normal move up to 6″.');
   personal('Cloaked Assassin',enemyOverwatch,'Enemy units cannot select the Sanctus as a target of snap shooting.');
   personal('Psychic Spoor',['Start of battle round','either','start'],'At the start of round one, choose one enemy unit as this Sanctus’s prey for the battle.');
   for(const st of [ownShoot,fight,overwatch])if(st===fight||gscHasRangedWeapon(s))personal('Psychic Spoor · prey',st,st===overwatch?'Against the chosen prey you may re-roll Wound rolls while snap shooting.':'Against its chosen prey this Sanctus may re-roll Hit and Wound rolls.');break;
  case 'Kelermorph':
   for(const st of [ownShoot,['Movement','opponent','during'] as Stage])once(s,'Heroic Fusillade',st,'Once per turn across your army, after a Kelermorph shoots, choose one Infantry unit hit by it. That unit makes a Battle-shock roll.');
   personal('Hypersensory Abilities',['Movement','opponent','during'],'Once per turn for this model, after an enemy finishes a Normal, Advance or Fall Back move within 8″, an unengaged Kelermorph can shoot that enemy as in its Shooting phase and then make a Normal move up to D6″. It cannot embark during this move. '+equippedWeaponText(s,stats,'Shooting',false));break;
  case 'Nexos':
   for(const phase of PHASES)once(s,'Battlefield Analysis',[phase,'either','during'],'Once per battle round across your army, when a formation containing a Nexos is targeted with a Stratagem, you may reduce that use’s cost by 1 CP.');
   if(ambush.length)add('Cult Infiltration',['Command','either','start'],'If this Nexos is on the battlefield, select one of your markers on the battlefield that has not moved this turn. Move it up to 6″.');break;
  case 'Biophagus':
   if(leading)add('Twisted Science',fight,'While the Biophagus survives, the attached formation’s melee weapons gain Lethal Hits; a critical hit may wound automatically.');
   if(knightWeaponCount(s,'Injector goad'))personal('Biological Warfare',fight,'Once per battle for this Biophagus, when its unit is selected to fight, its Injector goad gains 3 Attacks and 3 Damage until phase end.');
   if(knightWeaponCount(s,'Alchemicus Familiar'))add('Alchemicus Familiar',fight,'Once per battle for this familiar, when the formation is selected to fight, its models add 1 to Wound rolls against Infantry until phase end.');break;
  case 'Achilles Ridgerunners':
   add('Crossfire',ownShoot,'After this unit shoots, select one enemy it hit. Friendly Genestealer Cults attacks against that target improve AP by 1 for the rest of the turn. The same target can be affected only once per turn.',shooters);
   add('Crossfire · marked enemy',['Fight','own','during'],'Friendly Genestealer Cults melee attacks improve AP by 1 against the enemy that this Ridgerunner unit marked in your Shooting phase, through turn end. Multiple Crossfire marks do not stack.',all);
   if(knightWeaponCount(s,'Flare Launcher'))personal('Flare Launcher',['Shooting','opponent','start'],'While its Flare Launcher bearer survives, this unit has Smoke and may use Smokescreen for 0 CP.');
   if(knightWeaponCount(s,'Spotter'))personal('Spotter',ownShoot,'Each surviving Spotter bearer fires its own ranged weapons at BS 3+. Guns on those bearers: '+gscRidgerunnerWeapons(s,'Spotter').join(', ')+'.');
   if(knightWeaponCount(s,'Survey Augur'))for(const st of [ownShoot,overwatch])add('Survey Augur',st,'After the unit shoots, select one enemy hit by the model bearing a Survey Augur in this phase. Augur bearers’ guns: '+gscRidgerunnerWeapons(s,'Survey Augur').join(', ')+'. Friendly Genestealer Cults models’ attacks ignore cover against that enemy until phase end.',shooters);break;
  case 'Atalan Jackals':
   if(ambush.length)for(const st of [move,overwatch])add('Outrider Gangs',st,'When returning these Jackals with Cult Ambush, every model must fit wholly within 9″ of a battlefield edge and one must touch a Cult Ambush marker, which is then removed. If this is impossible, they cannot return this way.');
   add('Demolition Run',move,'Once per turn for this unit, after its Normal, Advance or Fall Back move, choose a visible enemy within 6″. Roll one D6 per surviving Atalan Jackals model, excluding an attached Jackal Alphus. Each 4+ inflicts one mortal wound, to a maximum of six.');break;
  case 'Reductus Saboteur':
   once(s,'Primed and Ready',ownShoot,'One Reductus Saboteur may use Explosives for 0 CP if it has not already been targeted with that Stratagem this phase.');
   for(const phase of PHASES)once(s,'Planted Explosives',[phase,'either','during'],'After an enemy ends a Normal, Advance or Fall Back move within 8″, one Reductus Saboteur may expend its mine once per battle. On 2+ deal D3+3 mortal wounds. Only one Saboteur may use a mine per battle round.');break;
  case 'Benefictus':
   if(leading&&hasGun(group))add('Bio-horror Disruption (Psychic)',ownShoot,'The attached formation’s ranged weapons have Lethal Hits while the Benefictus survives; a critical hit can wound automatically.');
   for(const phase of PHASES)personal('Psionic Shield (Psychic)',[phase,'either','start'],'Once per battle at the start of any phase, this Benefictus may improve its own invulnerable save to 4+ until phase end.');break;
  }
  if(knightWeaponCount(s,'Cult Icon')){
   const neophytes=s.unit==='Neophyte Hybrids';
   add('Cult Icon',ownCommand,'While the icon bearer survives, return up to '+(neophytes?'3':'D3')+' destroyed models to this formation, or up to '+(neophytes?'D3+3':'3')+' if it is within range of an objective you control. Exclude attached Characters. Previously fired One Shot weapons on these returned models stay expended.');
  }
 }
 return rows;
}
