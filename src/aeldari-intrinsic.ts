import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {AELDARI_SHEETS} from './aeldari-data';
import {aeldariModelLoadouts,aeldariWeaponCount,aeldariHasRangedWeapon} from './aeldari-loadouts';
import {aeldariMusterUnits} from './aeldari-muster-data';
import {aeldariKeywords} from './aeldari-keywords';
import {aeldariFormations,aeldariCargoFormations} from './aeldari-transports';
import {aeldariHasUpgrade} from './aeldari-upgrades';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingSnap:Step=['Movement','own','end'],returnFire:Step=['Shooting','own','during'];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']),endPhase=PHASES.map((p):Step=>[p,'either','end']);
const defence=[incoming,incomingSnap,returnFire,fight] as const;
const rangedDefence=[incoming,incomingSnap,returnFire] as const;
const pack='https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_aeldari-seqmcs1mu0-g8gzewikcm.pdf';
const sheets=new Map(AELDARI_SHEETS.map(s=>[s.unit,s]));
const key=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const sourceExpiry=' This benefit requires its original ability source to survive. If the last source model dies to an attack, the benefit continues until the attacking unit finishes its attacks.';
const leaderExpiry=' The original Leader or Support must survive; its leading benefit continues after its original Bodyguard is destroyed. If its source dies to an attack, keep the benefit until the attacking unit finishes.';
/** Core-profile, transport and muster modules implement these named entries. */
export const AELDARI_DELEGATED_INTRINSIC:Readonly<Record<string,readonly string[]>>={
 Autarch:['ASPECT TRAINING'],Starweaver:['Rapid Embarkation'],'Ynnari Venom':['Lithe Embarkation'],
 'Death Jester':['TRAVELLING PLAYERS'],Shadowseer:['TRAVELLING PLAYERS'],'Troupe Master':['TRAVELLING PLAYERS'],Solitaire:['PATH OF DAMNATION'],
 Yvraine:['SERVANT OF THE WHISPERING GOD'],'The Visarch':['SERVANT OF THE WHISPERING GOD'],'The Yncarne':['AVATAR OF THE WHISPERING GOD'],
 'D-cannon Platform':['SUPPORT ARTILLERY'],'Shadow Weaver Platform':['SUPPORT ARTILLERY'],'Vibro Cannon Platform':['SUPPORT ARTILLERY'],
 'Corsair Voidreavers':['Mistshield'],'Corsair Voidscarred':['Mistshield'],'Dire Avengers':['Shimmershield'],'Shining Spears':['Shimmershield'],
 Wraithblades:['Forceshield'],Wraithknight:['Scattershield'],'Wraithknight with Ghostglaive':['Scattershield'],'Storm Guardians':['Serpent Shield'],
 'Guardian Defenders':['Fleet of Foot'],
};

export function aeldariIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari')return [];
 const legal=new Set(aeldariMusterUnits(army)),selected=roster.filter(s=>sheets.has(s.unit)&&legal.has(s.unit));
 const groups=aeldariFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const original=expandRoster(army),originalGroups=aeldariFormations(army,original);
 const has=(s:RosterInstance,tag:string)=>aeldariKeywords(army,s,undefined,roster).has(tag);
 const ids=(gs:typeof groups)=>gs.flatMap(g=>g.members.map(s=>s.id));
 const tagged=(...tags:string[])=>groups.filter(g=>tags.every(t=>g.members.some(s=>has(s,t))));
 const allIds=ids(groups),aeldariIds=ids(tagged('AELDARI')),infantryIds=ids(tagged('AELDARI','INFANTRY'));
 const constructs=tagged('WRAITH CONSTRUCT'),constructIds=ids(constructs),nonTitanConstructs=ids(constructs.filter(g=>!g.members.some(s=>has(s,'TITANIC'))));
 const psykerModels=selected.flatMap(s=>aeldariModelLoadouts(s).filter(m=>{const tags=aeldariKeywords(army,s,m.model,roster);return tags.has('AELDARI')&&tags.has('PSYKER');}));
 const result:GeneratedReminder[]=[];
 for(const squad of selected){
  const {id,unit}=squad,group=groups.find(g=>g.members.some(s=>s.id===id));if(!group)continue;
  const formation=group.members.map(s=>s.id),originalGroup=originalGroups.find(g=>g.members.some(s=>s.id===id));
  const leading=group.root.id!==id||!!originalGroup&&originalGroup.root.id!==id;
  const ranged=group.members.some(aeldariHasRangedWeapon),selfGun=aeldariHasRangedWeapon(squad);
  const models=aeldariModelLoadouts(squad),fitted=(item:string)=>models.some(m=>m.items.some(i=>key(i)===key(item)))||aeldariWeaponCount(squad,item)>0;
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id],source=sheets.get(unit)!.source){
   if(!recipients.length)return;
   for(const [window,turn,timing] of steps)result.push({id:['11e-aeldari-native',id,title,window,turn,timing].join(':'),title,window,turn,timing,summary,units:[...new Set([id,...recipients])],source,origin:'unit'});
  }
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary+leaderExpiry,formation);};
  const normalAttack=[fight,...(ranged?[shoot]:[])] as Step[];
  const attacks=[fight,...(ranged?[shoot,snap]:[])] as Step[];
  const ownAttacks=[fight,...(selfGun?[shoot,snap]:[])] as Step[];
  switch(unit){
   case 'Eldrad Ulthran':
    add('Diviner of Futures',[['Command','own','start']],'At the start of your Command phase, if Eldrad is on the battlefield, gain 1CP, subject to the normal additional-CP limit. Being embarked does not count as being on the battlefield.');
    add('Doom (Psychic)',[['Movement','own','end']],'Select one enemy unit visible to and within 18″ of this Eldrad model. Until the start of your next Command phase, friendly Aeldari models add 1 to Wound rolls for attacks targeting that enemy. Measure from Eldrad, not another model in his formation.',aeldariIds);
    break;
   case 'Asurmen':
    led('Tactical Acumen',[shoot],'After this formation shoots in your Shooting phase, it may make a Normal move up to 6″. If it does, it cannot declare a charge for the rest of the turn.');
    led('Tactical Acumen · charge restriction',[['Charge','own','during']],'If this formation used Tactical Acumen this turn, it cannot declare a charge this turn.');
    add('Hand of Asuryan',[shoot,snap],'Once per battle, when Asurmen is selected to shoot, he may set his Bloody Twins to Damage 3 and give that weapon Anti-Infantry 5+ and Devastating Wounds until phase end. This applies to his weapon only; it can be activated for permitted Overwatch, where Critical Wounds remain possible.',[id],pack);
    break;
   case 'Jain Zar':
    led('Whirling Death',[['Movement','either','during']],'When this formation Advances, do not roll: add 6″ to its models’ Move until phase end. During that Advance, ignore vertical distance when measuring each model’s total movement.');
    add('Storm of Silence',ownAttacks,'Jain Zar may re-roll Wound rolls for her own attacks targeting a Character unit. Other models do not gain this personal re-roll.');
    break;
   case 'Fuegan':
    led('Burning Lance',[shoot,snap],'Add 6″ to the Range of Melta weapons equipped by models in this formation. Determine half range from the modified Range; other weapons gain no range.');
    add('Unquenchable Resolve',endPhase,'The first time Fuegan is destroyed, at the end of that phase roll one D6. On 2+, return Fuegan with all his wounds as close as possible to where he was destroyed and unengaged. Rejoin his original attached formation if possible under the core return rules. This can occur only for his first destruction.');
    break;
   case 'Baharroth':
    led('Cloudstrider',[['End of opponent turn','opponent','end']],'At the end of the opponent’s turn, if this formation is unengaged, you may remove it and place it in Strategic Reserves.');
    led('Cloudstrider',[move],'When this formation uses Deep Strike in your Movement phase, it may instead set up more than 6″ horizontally from all enemy models. If it does, it cannot declare a charge this turn. This option is not available for Rapid Ingress in the opponent’s phase.');
    led('Cloudstrider · charge restriction',[['Charge','own','during']],'If this formation used Cloudstrider’s shorter Deep Strike this turn, it cannot declare a charge this turn.');
    add('Cry of the Wind',[shoot],'If Baharroth was set up on the battlefield this turn, every successful unmodified Hit roll for his ranged attacks is a Critical Hit until turn end. Other models do not gain this ability; snap shooting still cannot score Critical Hits.');
    break;
   case 'Maugan Ra':
    led('Harvester of Souls',[shoot],'After selecting all targets in your Shooting phase, only if every attack from this formation targets the same enemy unit, roll one D6 for that target and one for each other enemy unit within 3″ of it. Each 5+ marks that enemy for explosive debris. Resolve all this formation’s attacks against the chosen target, then each marked enemy suffers D3 mortal wounds, rolled separately.');
    add('Face of Death',[shoot],'After Maugan Ra shoots in your Shooting phase, select one enemy unit hit by his own attacks. That enemy takes a Battle-shock test with −1 to the result. Another model’s hits cannot trigger this.');
    break;
   case 'Autarch':
    led('Superlative Strategist',eachPhase,'This formation may re-roll its Advance rolls and any dice rolled for it while performing an Agile Manoeuvre. This includes its Fade Back or Opportunity Seized movement roll when eligible.');
    add('Path of Command',eachPhase,'Once per battle round, one model in your army with Path of Command may reduce the CP cost of a Stratagem targeting its own formation by 1CP. Autarchs and Autarch Wayleapers share this single use.',formation);
    break;
   case 'Autarch Wayleaper':
    led('Indomitable Strength of Will',eachPhase,'Each time you actually spend a Battle Focus token to let this formation perform an Agile Manoeuvre, roll one D6. On 3+, regain 1 Battle Focus token. A free manoeuvre that spends no token does not trigger this roll.');
    add('Path of Command',eachPhase,'Once per battle round, one model in your army with Path of Command may reduce the CP cost of a Stratagem targeting its own formation by 1CP. Autarchs and Autarch Wayleapers share this single use.',formation);
    break;
   case 'Avatar of Khaine':
    add('Molten Form',defence,'Each time an attack is allocated to this Avatar model, halve that attack’s Damage characteristic, rounding up. Other models do not gain this damage reduction.');
    add('The Bloody-Handed (Aura)',[['Movement','either','during'],['Charge','either','during']],'Friendly Aeldari formations within 6″ of this actual Avatar model add 1 to Advance and Charge rolls. This aura requires the Avatar to survive.',aeldariIds);
    break;
   case 'Farseer':
   case 'Farseer Skyrunner':
    led('Branching Fates (Psychic)',attacks,'Once per phase, change one Hit roll, one Wound roll or one Damage roll made for a model in this formation to an unmodified 6. This is one roll of one chosen kind, not one of each.'+(unit==='Farseer'?' Exclude Support Weapon models, including joined artillery.':'')+' Snap shooting cannot score Critical Hits.');
    if(unit==='Farseer')add('Guide (Psychic)',[['Movement','own','end']],'Select one enemy unit visible to and within 18″ of this Farseer model. Until the start of your next Command phase, friendly Aeldari models add 1 to attack Hit rolls against that enemy. An enemy can be selected only once per turn. Fixed snap-shot Hit rolls cannot be modified.',aeldariIds);
    else add('Misfortune (Psychic)',[['Movement','own','end']],'Select one enemy unit visible to and within 18″ of this Farseer Skyrunner model. Until the start of your next Command phase, subtract 1 from Wound rolls for attacks made by that enemy. An enemy can be selected only once per turn.',allIds);
    break;
   case 'Warlock Conclave':{
    const farseer=group.members.find(s=>s.unit==='Farseer'||s.unit==='Eldrad Ulthran'||s.unit==='Farseer Skyrunner');
    if(farseer)add('Protect (Psychic)',defence,'While '+farseer.id+' is an actual surviving Farseer leading this formation, subtract 1 from Wound rolls for attacks targeting it. Both the Farseer condition and the original Warlock source must remain.'+sourceExpiry,formation);
    if(psykerModels.length>1)add('Psychic Communion (Psychic)',[shoot,snap],'When selected to shoot, check each actual Warlock model separately: add 1 to the Attacks and Strength of that Warlock’s Destructor until phase end per other friendly Aeldari Psyker model within 6″ of it, to a maximum of +2. The Warlock itself never counts as another Psyker.');
    break;
   }
   case 'Warlock':
    add('Runes of Fortune (Psychic)',[['Charge','either','during']],'When an enemy declares a charge that targets one or more formations with Runes of Fortune, subtract 2 from its Charge roll. Several qualifying Warlocks do not stack this penalty.',formation);
    if(psykerModels.length>1)add('Psychic Communion (Psychic)',[shoot,snap],'When this Warlock is selected to shoot, add 1 to its Destructor’s Attacks and Strength until phase end per other friendly Aeldari Psyker model within 6″ of the actual Warlock, to a maximum of +2. Do not count the Warlock itself.');
    break;
   case 'Warlock Skyrunners':
    add('Runes of Battle (Psychic)',[shoot,snap],'Weapons equipped by models in this formation have Ignores Cover, denying targets the Benefit of Cover.'+sourceExpiry,formation);
    if(psykerModels.length>1)add('Psychic Communion (Psychic)',[shoot,snap],'When selected to shoot, check each actual Warlock model separately: add 1 to the Attacks and Strength of that Warlock’s Destructor until phase end per other friendly Aeldari Psyker model within 6″ of it, to a maximum of +2. The Warlock itself never counts as another Psyker.');
    break;
   case 'Spiritseer':
    if(constructIds.length)add('Spiritseer',rangedDefence,'While this actual Spiritseer model is within 3″ of at least one friendly Wraith Construct formation, it has Lone Operative: enemy models more than 12″ away cannot see it or target it with Indirect Fire. Check the range and surviving Wraith Construct each time.',[id,...constructIds]);
    add('Spirit Mark (Psychic)',[move],'Once per turn in your Movement phase, when this Spiritseer starts or ends a move, choose one non-Titanic friendly Wraith Construct formation within 6″ of it and one enemy unit visible to it. Until the start of your next Movement phase, that friendly formation’s weapons have Sustained Hits 1 against only that chosen enemy.',nonTitanConstructs);
    add('Tears of Isha (Psychic)',[['Command','own','during']],'Select one friendly Wraith Construct formation within 6″ of this Spiritseer model. If it has any destroyed models, return one with its full wounds. Otherwise, one model regains up to D3 lost wounds. Each formation may be selected only once per turn; this ability can select a Titanic Wraith Construct. Follow normal revival placement restrictions.',constructIds);
    break;
   case 'Guardian Defenders':
    add('Crewed Platform',eachPhase,'When the last actual Guardian Defender model from this datasheet is destroyed, destroy all its remaining Heavy Weapon Platform models too. An attached Leader, Support or separately joined Support Weapon does not keep a Heavy Weapon Platform alive.',formation);
    break;
   case 'Storm Guardians':
    add('Stormblades',[['Command','own','end']],'If this formation is within range of an objective you control at the end of your Command phase, that objective stays yours until the opponent’s Level of Control becomes greater at the end of a phase.',formation);
    add('Crewed Platform',eachPhase,'When the last actual Storm Guardian model from this datasheet is destroyed, destroy its remaining Serpent’s Scale Platform too. Attached Leaders and Supports do not keep that platform or its shield alive.',formation);
    break;
   case 'Windriders':
    add('Swift Demise',[shoot],'Re-roll ranged attack Hit rolls of 1 for models in this formation. If the target is the closest eligible target of the attacking model, re-roll the Hit roll instead. Check the closest eligible target separately for each attacking model; fixed snap-shot Hit rolls cannot be re-rolled.'+sourceExpiry,formation);
    break;
   case 'Rangers':
    add('Path of the Outcast',[['Movement','opponent','during']],'After an enemy ends any move within 8″ of this formation in the opponent’s Movement phase, if this formation is unengaged it may make a Normal move up to D6″. The current trigger is within 8″.',formation,pack);
    break;
   case 'Dire Avengers':
    add('Bladestorm',[shoot],'Ranged weapons equipped by models in this formation have Sustained Hits 1 against enemies within half range of the attacking weapon. Check each weapon’s range separately. This does not create Critical Hits during snap shooting.'+sourceExpiry,formation);
    break;
   case 'Howling Banshees':
    add('Acrobatic',[move,['Charge','own','during']],'This formation remains eligible to declare a charge after Advancing or Falling Back this turn.'+sourceExpiry,formation);
    break;
   case 'Striking Scorpions':
    add('Mandiblasters',[fight],'For a model in this formation that made a Charge move this turn, its melee attacks score a Critical Hit on an unmodified 5+. A model that did not make the Charge move does not gain this benefit.'+sourceExpiry,formation);
    break;
   case 'Fire Dragons':
    add('Assured Destruction',[shoot],'In your Shooting phase, models in this formation may re-roll Hit, Wound and Damage rolls for ranged attacks against Monster or Vehicle units. This does not activate for Overwatch in the opponent’s Movement phase.'+sourceExpiry,formation);
    break;
   case 'Wraithguard':
    add('War Construct',[move,shoot],'This formation remains eligible to shoot in a turn when it Fell Back.'+sourceExpiry,formation);
    break;
   case 'Wraithblades':
    add('Malevolent Souls',[fight],'When a model in this formation is destroyed by a melee attack before it has fought this phase, roll D6. On 3+, leave it in play, let it fight after the attacking unit finishes, then remove it. Models that already fought cannot fight again.'+sourceExpiry,formation);
    break;
   case 'Wave Serpent':
    add('Wave Serpent Shield',rangedDefence,'When a ranged attack targets this Wave Serpent and that attack’s Strength is greater than this model’s Toughness, subtract 1 from its Wound roll. Equal Strength does not qualify.');
    break;
   case 'Swooping Hawks':
    add('Grenade Pack Flyover',[move],'Once per turn in your Movement phase, when this formation is set up or ends a Normal, Advance or Fall Back move, choose one enemy visible to and within 8″ of this formation. Roll one D6 per actual Swooping Hawks model; each 4+ inflicts 1 mortal wound, capped at 6. Attached Characters do not add dice. If used, you cannot target this formation with Explosives for the rest of this turn.',formation);
    add('Grenade Pack Flyover · Explosives restriction',[shoot],'If this formation used Grenade Pack Flyover this turn, you cannot target it with the Explosives Stratagem until the turn ends.',formation);
    break;
   case 'Warp Spiders':{
    const lhykhis=group.members.some(s=>s.unit==='Lhykhis'&&(originalGroups.find(g=>g.members.some(m=>m.id===s.id))?.root.id!==s.id));
    add('Flickerjump',[move],'When selected for a Normal move in your Movement phase, this formation may use Flickerjump: its models have Move 24″ until turn end.'+(lhykhis?' Its surviving attached Lhykhis supplies Empyric Ambush, so Flickerjump does not prevent it charging this turn.':' If used, it cannot declare a charge this turn.')+' At the end of this Movement phase, roll one D6 for every model in the formation; each 1 inflicts 1 mortal wound.',formation);
    add('Flickerjump · hazard',[['Movement','own','end']],'If this formation used Flickerjump this phase, roll one D6 for every model in it, including attached models; each 1 inflicts 1 mortal wound on the formation.',formation);
    if(!lhykhis)add('Flickerjump · charge restriction',[['Charge','own','during']],'If this formation used Flickerjump this turn, it cannot declare a charge unless a surviving Lhykhis that originally led it supplies Empyric Ambush.',formation);
    break;
   }
   case 'Shining Spears':
    add('Extreme Mobility',[['Movement','either','during'],['Charge','either','during']],'When this formation makes a Normal, Advance, Fall Back or Charge move, ignore vertical distance when measuring its models’ movement. Pile In and Consolidation moves are not included.'+sourceExpiry,formation);
    break;
   case 'Crimson Hunter':
    add('Skyhunter',[shoot],'Add 1 to Hit and Wound rolls for this Crimson Hunter’s ranged attacks against a target that can Fly. Fixed snap-shot Hit rolls cannot be modified.');
    add('Skyhunter',[snap],'For permitted Overwatch against a target that can Fly, add 1 to this Crimson Hunter’s Wound rolls. The Hit bonus cannot modify fixed snap-shot Hit rolls.');
    break;
   case 'Vypers':
    add('Harassment Fire',[shoot],'After this formation shoots in your Shooting phase, select one enemy unit hit by those attacks. It is suppressed until the start of your next turn: subtract 1 from its attack Hit rolls. Fixed snap-shot Hit rolls remain unchanged.',formation);
    break;
   case 'Hemlock Wraithfighter':
    add('Mindshock Pod (Aura, Psychic)',eachPhase,'Enemy units within 9″ of this actual Hemlock model subtract 1 from their Battle-shock and Leadership tests. The aura ends when this model leaves the battlefield or is destroyed.');
    break;
   case 'Dark Reapers':
    add('Inescapable Accuracy',[shoot],'For ranged attacks by models in this formation, ignore any or all modifiers to Ballistic Skill and to the Hit roll. This does not bypass snap shooting’s fixed Hit rules.'+sourceExpiry,formation);
    break;
   case 'Falcon':{
    const cargo=aeldariCargoFormations(army,squad,roster).flatMap(g=>g.members.map(s=>s.id));
    if(cargo.length)add('Fire Support',[shoot],'After this Falcon shoots in your Shooting phase, choose one enemy hit by its attacks. Until turn end, friendly models that actually disembarked from this Falcon this turn may re-roll Wound rolls for attacks against that enemy. Merely being able to embark does not qualify; use only the actual disembarked models.',cargo);
    break;
   }
   case 'Fire Prism':
    add('Crystal Matrix',[shoot,snap],'Each time this Fire Prism is selected to shoot, it may re-roll one Hit roll and one Wound roll while resolving those attacks. During snap shooting, its fixed Hit rolls cannot be re-rolled, but the one Wound re-roll remains.');
    if(fitted('Prism cannon'))add('Linked Fire',[shoot,snap],'When selecting targets for this Fire Prism’s prism cannon, you may measure range and visibility from another friendly Fire Prism model visible to this bearer. If doing so, that weapon has Attacks 1. This does not change where the attacking model is, grant another Prism’s weapons or transfer any of its abilities.',selected.filter(s=>s.unit==='Fire Prism').map(s=>s.id));
    break;
   case 'Night Spinner':
    add('Monofilament Web',[shoot],'After this Night Spinner shoots in your Shooting phase, each enemy hit by its actual doomweaver is pinned until the start of your next turn: −2″ Move and −2 to Charge rolls. Hits from its other weapons do not pin.');
    break;
   case 'War Walkers':
    add('Crystalline Targeting',[shoot],'After this formation shoots in your Shooting phase, select one enemy unit hit by its attacks. Until phase end, friendly Aeldari attacks against that enemy improve AP by 1. Each enemy may be selected only once per turn; multiple War Walkers cannot stack this selection.',aeldariIds);
    break;
   case 'Wraithlord':
    add('Fated Hero',[['Pre-battle','either','during']],'At the start of the battle, choose Infantry, Monster, Mounted or Vehicle for this Wraithlord. Keep that choice for the whole battle.');
    add('Fated Hero',[shoot,fight],'Against a target with this Wraithlord’s chosen Fated Hero keyword, re-roll its attack Hit and Wound rolls of 1. Choose only the one keyword selected at battle start.');
    add('Fated Hero',[snap],'Against a target with this Wraithlord’s chosen Fated Hero keyword, re-roll its Wound rolls of 1. Fixed snap-shot Hit rolls cannot be re-rolled.');
    break;
   case 'Wraithknight':
    add('Titanic Strides',[['Movement','either','during']],'For a Normal, Advance or Fall Back move, this Wraithknight may pass through non-Titanic models and terrain sections up to 4″ high. It may cross enemy Engagement Range but must finish unengaged. It may also pass through taller terrain sections; if it does, after moving roll D6 and on 1 it becomes Battle-shocked. This permission does not apply to Charge, Pile In or Consolidation moves.');
    if(fitted('Heavy wraithcannon')||fitted('Suncannon'))add('Point-blank Devastation',[shoot],'For each actual heavy wraithcannon or suncannon attacking a target within half range, re-roll the dice determining its number of attacks. Other weapons gain no re-roll.');
    break;
   case 'Wraithknight with Ghostglaive':
    add('Titanic Agility',[['Movement','either','during']],'For a Normal, Advance or Fall Back move, this Wraithknight may move through models and terrain features of any height. It may cross enemy Engagement Range but cannot finish engaged. This permission does not apply to Charge, Pile In or Consolidation moves.');
    break;
   case 'Revenant Titan':
   case 'Phantom Titan':
    add('Titanic Advance',[['Movement','either','during']],'For a Normal, Advance or Fall Back move, this Titan may move over non-Titanic models and terrain features up to 4″ high as though they were absent. This is not permission to move over taller terrain, other Titanic models or to finish engaged.');
    add('Towering Wraith Construct',eachPhase,'When targeting this '+unit+' with a Stratagem, spend '+(unit==='Revenant Titan'?'twice':'three times')+' that Stratagem’s stated CP cost. Apply applicable cost-modifier rules in their normal order; this does not multiply other units’ costs.');
    if(unit==='Revenant Titan')add('Revenant Jet Pack',[['Movement','either','during']],'When this Titan Advances, do not make an Advance roll; instead add 8″ to its Move until phase end.');
    else add('Flawless Poise',[move,shoot,['Charge','own','during']],'This Phantom Titan remains eligible to shoot and declare a charge in a turn when it Fell Back.');
    break;
   case 'Shroud Runners':
    add('Target Acquisition',[shoot],'After this formation shoots in your Shooting phase, choose one enemy hit by its actual long rifles. That enemy cannot have the Benefit of Cover until phase end. Hits from other weapons do not trigger this.');
    break;
   case 'Yvraine':{
    const body=originalGroup?.members.find(s=>s.id===originalGroup.root.id&&s.id!==id);
    if(body)led('Word of the Phoenix (Psychic)',[['Command','own','during']],'Roll D6; on 2+, return D3+1 destroyed original Bodyguard models from '+body.id+' with full wounds, excluding Support Weapon models. This cannot return attached Characters or separately attached Support units. A surviving Yvraine can restore her original destroyed Bodyguard under core placement rules.');
    add('Herald of Ynnead',[['Fight','either','start']],'Select one enemy unit engaged with this actual Yvraine model. Until this Fight phase ends, friendly Aeldari models re-roll Wound rolls of 1 for attacks targeting that enemy. Engagement with a different model in Yvraine’s formation does not satisfy her personal selection range.',aeldariIds,pack);
    break;
   }
   case 'The Visarch':{
    led('Way of the Blade',[['Fight','either','start']],'All models in this formation have Fights First.');
    const characters=group.members.filter(s=>s.id!==id&&has(s,'CHARACTER')).map(s=>s.id);
    if(leading&&characters.length)add('Yvraine’s Champion',eachPhase,'Other actual Character models attached to this formation have Feel No Pain 4+: each time one would lose a wound, roll D6 and on 4+ it keeps that wound. The Visarch himself and non-Character Bodyguards do not receive this benefit.'+leaderExpiry,characters);
    break;
   }
   case 'The Yncarne':
    add('Inevitable Death',PHASES.map((p):Step=>[p,'opponent','during']),'Once in each opponent’s turn, if the Yncarne is on the battlefield when another friendly Aeldari unit is destroyed, immediately after removing its last model you may remove the Yncarne and set it up as close as possible to that destroyed model’s location, unengaged. This does not prevent the Yncarne moving and can be used in the opponent’s first turn.',aeldariIds,pack);
    add('Ethereal Form',ownAttacks,'Each time this Yncarne destroys an enemy unit, roll D3 and regain that many lost wounds, capped by its starting wounds. If enough wounds were lost, regain the full rolled amount; you cannot choose to heal fewer.');
    break;
   case 'Lhykhis':
    led('Empyric Ambush',[move,['Charge','own','during']],'This formation remains eligible to declare a charge after using Flickerjump this turn. Flickerjump still requires its end-of-phase mortal-wound rolls.');
    add('Whispering Web',[shoot],'After Lhykhis shoots in your Shooting phase, choose one enemy hit by her own attacks. Until turn end, friendly Aeldari attacks against that enemy score Critical Hits on unmodified 5+. Other models’ hits cannot trigger this selection and snap shooting cannot score Critical Hits.',aeldariIds);
    break;
   case 'D-cannon Platform':
    add('Structural Collapse',[shoot,snap],'Re-roll Damage rolls of 1 for this platform’s D-cannon attacks. Against a Titanic unit, you may re-roll the Damage roll instead.');
    break;
   case 'Shadow Weaver Platform':
    add('Monofilament Snare',[shoot],'After this platform shoots in your Shooting phase, choose one enemy hit by its actual shadow weaver. That enemy is snared until the start of your next turn: whenever it makes a Normal, Advance or Fall Back move, roll one D6 per model in it; each 1 inflicts 1 mortal wound on that enemy. Other weapons do not apply this effect.');
    break;
   case 'Vibro Cannon Platform':
    add('Sonic Destruction',[shoot],'In your Shooting phase, for this platform’s vibro cannon attacks against an enemy, add 1 to Strength, improve AP by 1 and add 1 Damage for each other friendly Vibro Cannon Platform model that already attacked that same enemy with its vibro cannon this phase. Count actual earlier attackers; do not count this platform or merely selected targets.');
    break;
   case 'Ynnari Archon':
    led('Overlord',attacks,'Re-roll attack Wound rolls of 1 for models in this formation; while the formation is below Starting Strength, re-roll the Wound roll instead.');
    add('Reborn Mastermind',eachPhase,'Once per battle round, one model in your army with Reborn Mastermind may reduce the CP cost of a Stratagem targeting its own formation by 1CP. Multiple Ynnari Archons share this use.',formation);
    if(fitted('Shadow field'))add('Shadow Field',defence,'This actual Ynnari Archon cannot re-roll its invulnerable saves. After its first failed invulnerable saving throw, it loses its invulnerable save for the rest of the battle. This is the Ynnari failed-save rule; the separate Drukhari Archon’s wound-loss rule does not apply.');
    break;
   case 'Ynnari Succubus':
    led('Storm of Blades',[fight],'Melee weapons equipped by models in this formation have Sustained Hits 1.');
    add('Empowered by Death',[['Fight','either','start'],fight],'At the start of this Fight phase, if this formation is below Starting Strength, all its models gain Fights First until phase end. Being below Starting Strength later in the phase does not activate this start-of-phase trigger.',formation);
    break;
   case 'Ynnari Kabalite Warriors':
    add('Sadistic Raiders',[['Command','own','end']],'If you control an objective within range of this formation or the transport it is actually embarked within, at the end of your Command phase that objective remains yours until the opponent’s Level of Control becomes greater at phase end. Merely being eligible to embark does not make a transport sticky.',formation);
    if(fitted('Phantasm grenade launcher'))add('Phantasm Grenade Launcher',[['Pre-battle','either','during']],'While the actual phantasm grenade launcher bearer survives, this formation has Grenades. If split for a Ynnari Venom, only the half containing that actual bearer gains the equipment keyword.',formation);
    break;
   case 'Ynnari Wyches':
    add('No Escape',[['Movement','either','during'],fight],'When a non-Monster, non-Vehicle enemy engaged with one or more of your Ynnari Wyches formations is selected to Fall Back, every model in it takes a Desperate Escape test. If that enemy is Battle-shocked, subtract 1 from those tests. Several No Escape sources do not cause multiple sets of tests.',formation);
    break;
   case 'Ynnari Incubi':
    add('Tormentors',[['Fight','either','start']],'Each enemy engaged with one or more of your Ynnari Incubi formations takes one Battle-shock test at the start of the Fight phase. Several Tormentors sources do not force repeated tests on one enemy.',formation);
    break;
   case 'Ynnari Reavers':
    add('Eviscerating Fly-by',[['Movement','either','during'],fight],'After this formation ends a Normal move, choose one non-Monster, non-Vehicle enemy it moved over. Roll one D6 per model in this formation; each 4+ inflicts 1 mortal wound. This Ynnari version does not trigger after an Advance or Fall Back.',formation);
    if(fitted('Cluster caltrops'))add('Cluster Caltrops',[['Movement','either','during'],fight],'When rolling for Eviscerating Fly-by, re-roll one D6 per surviving model in this formation actually equipped with cluster caltrops. This grants re-rolls, not additional dice.',formation);
    if(fitted('Grav-talon'))add('Grav-talon',[fight],'Only the actual grav-talon bearer’s melee weapons have Lance, adding 1 to Wound rolls when its unit charged this turn. Other models do not gain Lance.');
    break;
   case 'Ynnari Raider':
    add('Aethersails',[['Movement','either','during']],'When this Ynnari Raider Advances, do not make an Advance roll; instead add 6″ to its Move until phase end. This does not itself permit passengers to disembark after that Advance.');
    break;
   case 'Dragon Knights':
    add('On the Hunt',[move,shoot,['Charge','own','during']],'When this formation makes a Fall Back move, that move does not prevent it shooting or declaring a charge this turn.'+sourceExpiry,formation);
    add('Agile Reach',[fight],'When this formation is selected to fight, melee weapons of its unengaged models within 3″ of an enemy unit engaged with this formation may target that enemy unit. The formation must still be eligible to fight; this is not a 3″ Engagement Range.'+sourceExpiry,formation);
    break;
   case 'Leystalker':
    add('Panicked Quarry',[shoot],'After this Leystalker shoots in your Shooting phase, select one non-Monster, non-Vehicle enemy hit by its attacks. That enemy takes a Battle-shock test with −1 to the result.');
    break;
   case 'Stonesinger':
    add('Elemental Ensnarement',[['Fight','own','end']],'At the end of your Fight phase, if this formation is not Battle-shocked, you may roll D6. On 1 this formation becomes Battle-shocked. Then choose one visible non-Titanic enemy Monster or Vehicle within 18″ of this formation: until the start of your next turn, it is ensnared, has −2″ Move and cannot be pinned. The roll of 1 does not cancel the enemy selection.',formation,pack);
    break;
   case 'Clanblade':
    add('Blade of the Clans',[fight],'Melee attacks made by models in this formation have Sustained Hits 1.'+sourceExpiry,formation);
    add('Cornered Prey',[['Movement','either','during'],fight],'When an enemy engaged with this formation is selected to Fall Back, it must use Desperate Escape mode. If that enemy is Battle-shocked, subtract 1 from its hazard rolls for that mode. This rule does not exclude Monster or Vehicle units.',formation);
    break;
   case 'Death Jester':
    add('Death is Not Enough',[shoot],'After this Death Jester shoots in your Shooting phase, select one non-Monster, non-Vehicle enemy unit hit by its attacks. That enemy takes a Battle-shock test; subtract 1 from that test if those attacks destroyed at least one model in the selected unit.');
    add('Cruel Amusement',[shoot],'When this Death Jester is selected to shoot in your Shooting phase, choose '+(aeldariHasUpgrade(army,squad,'Fanged Leer','Serpent’s Brood')?'two different abilities':'one ability')+' from Ignores Cover, Precision and Sustained Hits 3 for its shrieker cannon until phase end.'+(aeldariHasUpgrade(army,squad,'Fanged Leer','Serpent’s Brood')?' Fanged Leer permits two choices instead of one.':'')+' This choice is not available when firing Overwatch.');
    break;
   case 'Shadowseer':
    led('Fog of Dreams (Psychic)',[incoming,incomingSnap,returnFire],'An attacking enemy model must be within 18″ of this formation to target it with a ranged attack.');
    add('Treacherous Illusion (Psychic)',[fight],'Enemy models’ melee weapons have Hazardous while targeting this Shadowseer’s formation. Resolve Hazard rolls for the Hazardous weapons the enemy actually uses.'+sourceExpiry,formation);
    break;
   case 'Solitaire':
    add('Blitz',[move],'Once per battle, before this Solitaire makes a Normal move in your Movement phase, add 2D6″ to its Move and add 3 to the Attacks of its Solitaire weapons until the end of the turn. This cannot be activated before an Advance or an out-of-phase move.');
    add('Blitz',[['Fight','own','during']],'Only in a turn when this Solitaire used Blitz: add 3 to the Attacks characteristic of its Solitaire weapons until that turn ends.');
    add('Blur of Movement',[move,['Charge','own','during']],'This Solitaire remains eligible to declare a charge after Advancing this turn.');
    break;
   case 'Troupe Master':
    led('Choreographer of War',[fight],'This formation’s models may Pile In or Consolidate up to 6″. They need not finish closer to the closest enemy model, but must finish as close as possible to the closest enemy unit; obey other movement restrictions.');
    add('Cegorach’s Favour',[fight],'The Troupe Master’s own melee attacks re-roll Hit rolls of 1 and add 1 to Wound rolls. These personal bonuses do not apply to other models in the formation.');
    break;
   case 'Skyweavers':
    add('Acrobatic Grace',[incoming,incomingSnap,returnFire],'This Skyweaver formation has Stealth, granting the Benefit of Cover against ranged attacks.'+sourceExpiry,formation);
    add('Acrobatic Grace',[fight],'Subtract 1 from Hit rolls for melee attacks targeting this Skyweaver formation.'+sourceExpiry,formation);
    break;
   case 'Troupe':
    add('Dance of Death',[['Fight','either','start'],fight],'At the start of this Fight phase choose one benefit for this formation until phase end: Hero’s Prowess re-rolls attack Hit rolls of 1; Villain’s Doom adds 1 to attack Wound rolls; Trickster’s Grace subtracts 1 from Hit rolls for attacks targeting it. Only the selected benefit applies.'+sourceExpiry,formation);
    break;
   case 'Voidweaver':
    add('Polychromatic Camouflage',[incoming,incomingSnap,returnFire],'An attacking enemy model must be within 18″ of this Voidweaver formation to target it with a ranged attack.',formation);
    break;
   case 'Corsair Voidreavers':
    add('Reavers of the Void',normalAttack,'This formation’s attack Hit rolls re-roll 1s; against a target within range of an objective marker, re-roll the Hit roll instead. These re-rolls cannot change snap-shot Hit rolls.'+sourceExpiry,formation);
    break;
   case 'Corsair Voidscarred':
    add('Piratical Raiders',[['Pre-battle','either','during']],'At the start of the battle choose one enemy unit for this Corsair formation’s Piratical Raiders ability. Its weapons have Lethal Hits and Precision when targeting that chosen enemy unit.',formation);
    add('Piratical Raiders',normalAttack,'Against the enemy unit selected for this formation at the start of the battle, its models’ weapons have Lethal Hits and Precision.'+sourceExpiry,formation);
    if(fitted('Channeller stones'))add('Channeller Stones',defence,'Once per turn, the first time a saving throw is failed for this formation while its actual Soul Weaver with channeller stones survives, change that attack’s Damage to 0. This is the first failed save, not a later save of your choice; the other Corsair specialists do not provide this ability.',formation);
    if(fitted('Faolchú'))add('Faolchú',[shoot,snap],'While its actual Faolchú bearer survives, ranged weapons equipped by models in this formation have Ignores Cover. The bird is equipment, not an extra physical model.',formation);
    break;
   case 'Kharseth':
    add('Aethersense (Psychic)',[['Movement','either','during']],'Enemy units arriving from Reserves cannot be set up within 12″ of this Kharseth model. Measure from the actual Kharseth, not the edge of its Bodyguard formation.');
    add('Fury of the Void (Psychic)',[shoot],'After Kharseth’s formation shoots in your Shooting phase, select one enemy unit hit by Kharseth’s own Dread of the Deep Void. That enemy is riven until the end of the turn. Attacks by friendly Aeldari models against it add 1 Strength; another model’s weapon does not trigger this rule.',aeldariIds);
    break;
   case 'Prince Yriel':
    led('Piratical Hero',normalAttack,'This formation’s attacks have Sustained Hits 1 and add 1 to their Hit rolls. Neither benefit changes fixed snap-shot Hit rolls or permits Critical Hits during snap shooting.');
    add('Prince of Corsairs',[['Pre-battle','either','during']],'After both players deploy, only if Yriel’s unit is on the battlefield or actually embarked in an on-battlefield Transport, select up to three Aeldari formations and redeploy them. You may place them in Strategic Reserves regardless of how many units are already there. This is not available while Yriel and any carrier are off the battlefield.',aeldariIds);
    break;
   case 'Corsair Skyreavers':
    add('Raid and Run',[['Fight','either','end']],'At the end of the Fight phase, only if this formation was eligible to fight this phase: if now unengaged it may make a Normal move up to D3+3″; otherwise it may make a Fall Back move up to D3+3″. It need not actually have fought, but having been eligible is required.',formation);
    break;
   case 'Starfangs':
    add('Hallucinogen Grenades',[['Shooting','opponent','start']],'At the start of the opponent’s Shooting phase, choose one friendly Aeldari Infantry formation visible to and within 36″ of this Starfang unit. That chosen formation has Stealth until phase end, granting the Benefit of Cover against ranged attacks.',infantryIds);
    break;
  }
  if(['Wraithguard','Wraithblades','Wraithlord'].includes(unit)&&psykerModels.length){
   const lord=unit==='Wraithlord';
   add('Psychic Guidance',[['Command','either','during'],...normalAttack],'While '+(lord?'this actual Wraithlord model':'this formation')+' is within 12″ of at least one friendly actual Aeldari Psyker model, '+(lord?'this Wraithlord has Leadership 6+ and improves its weapons’ Ballistic Skill and Weapon Skill by 1':'models in this formation have Leadership 6+ and add 1 to attack Hit rolls')+'. This requires an actual surviving Psyker within range; an absent optional Way Seeker provides no support. Fixed snap-shot Hit rolls cannot be modified.',formation);
  }
  if(['D-cannon Platform','Shadow Weaver Platform','Vibro Cannon Platform'].includes(unit)&&group.models>1)add('Support Weapon',defence,'When an attack targets this platform’s formation and that formation contains another surviving model, this actual Support Weapon model has Toughness 3 until that attack is resolved. A lone platform uses its own printed Toughness.',formation);
  const shrine=aeldariWeaponCount(squad,'Aspect Shrine token');
  if(shrine)add('Aspect Shrine Token',attacks,'This unit has '+shrine+' Aspect Shrine token'+(shrine===1?'':'s')+'. Once per battle per token, change one Hit roll or Wound roll made for a non-Character model in this formation to an unmodified 6, then expend that token. Attached Characters and any Character models granted by an upgrade cannot use these tokens. Snap shooting cannot score Critical Hits; Critical Wounds remain possible.',formation,pack);
  if(['Dragon Knights','Leystalker'].includes(unit)){
   const count=aeldariWeaponCount(squad,'Drakolithe');
   if(count)add('Drakolithe (Once per battle, per token)',eachPhase,'This unit has '+count+' Drakolithe token'+(count===1?'':'s')+'. When an enemy ends a move within 8″ of this formation, if this formation is unengaged or that enemy ended its move engaged with it, you may expend one token and roll D6. On 3+, that enemy suffers 1 mortal wound. Each token is usable once per battle; the counter is equipment, not another physical model.',formation,pack);
  }
  if(['Death Jester','Shadowseer','Solitaire','Troupe Master','Troupe'].includes(unit)&&fitted('Flip belt'))add('Flip Belt',[['Movement','either','during'],['Charge','either','during'],fight],'For a Normal, Advance, Fall Back or Charge move, ignore vertical distance when measuring how far each actual flip-belt bearer moves. This does not apply to Pile In or Consolidation moves and does not give other attached models a flip belt.',formation);
  if(unit==='Corsair Voidscarred'&&ranged)add('Piratical Raiders',[snap],'Against the enemy chosen for this formation at battle start, its weapons retain Precision during permitted Overwatch. Snap shots cannot score Critical Hits, so Lethal Hits cannot trigger. A visible Character allocation group may still be selected when Precision permits it.'+sourceExpiry,formation);
 }
 // Completed effects retain their stated durations after their original source
 // leaves the battlefield. These are conditional reminders, not invented choices.
 for(const source of original.filter(s=>legal.has(s.unit))){
  const alive=selected.some(s=>s.id===source.id);
  const add=(title:string,steps:readonly Step[],summary:string,recipients=allIds)=>{
   if(!recipients.length)return;
   for(const [window,turn,timing] of steps)result.push({id:['11e-aeldari-lasting',source.id,title,window,turn,timing].join(':'),title,window,turn,timing,summary:source.id+': '+summary,units:[...new Set([source.id,...recipients])],source:sheets.get(source.unit)!.source,origin:'unit'});
  };
  if(source.unit==='Eldrad Ulthran')add('Doom · chosen enemy',[shoot,snap,fight],'If Doom already selected an enemy, friendly Aeldari attacks against it add 1 to Wound rolls until the start of your next Command phase. The effect retains that duration if Eldrad is destroyed or leaves the battlefield.',aeldariIds);
  if(source.unit==='Farseer')add('Guide · chosen enemy',[shoot,fight],'If Guide already selected an enemy, friendly Aeldari attacks against it add 1 to Hit rolls until the start of your next Command phase, even if the Farseer is destroyed. Fixed snap-shot Hit rolls remain unchanged.',aeldariIds);
  if(source.unit==='Farseer Skyrunner')add('Misfortune · chosen enemy',defence,'If Misfortune already selected an enemy, subtract 1 from Wound rolls for that enemy’s attacks until the start of your next Command phase, even if the Farseer Skyrunner is destroyed.');
  if(source.unit==='Spiritseer')add('Spirit Mark · chosen targets',[shoot,fight],'If Spirit Mark already chose a friendly non-Titanic Wraith Construct formation and an enemy, that friendly formation’s weapons have Sustained Hits 1 against that enemy until the start of your next Movement phase. That granted effect keeps its duration if the Spiritseer dies. Snap shooting cannot score Critical Hits.',nonTitanConstructs);
  if(source.unit==='Vypers')add('Harassment Fire · suppressed enemy',defence,'If this formation already suppressed an enemy, that enemy has −1 to its attack Hit rolls until the start of your next turn, even if the Vypers are destroyed. Fixed snap-shot Hit rolls remain unchanged.');
  if(source.unit==='Night Spinner')add('Monofilament Web · pinned enemy',[['Movement','either','during'],['Charge','either','during']],'Enemies already hit by this Night Spinner’s doomweaver in your Shooting phase remain pinned until the start of your next turn: −2″ Move and −2 to Charge rolls. This duration survives destruction of the Night Spinner.');
  if(source.unit==='Shadow Weaver Platform')add('Monofilament Snare · snared enemy',eachPhase,'If this platform already snared an enemy, until the start of your next turn each time that enemy makes a Normal, Advance or Fall Back move, roll one D6 per model in it; each 1 inflicts 1 mortal wound. The effect persists if the platform is destroyed.');
  if(source.unit==='War Walkers')add('Crystalline Targeting · chosen enemy',[shoot],'If this formation already selected an enemy after shooting this phase, friendly Aeldari attacks against it improve AP by 1 until phase end. One enemy can be selected only once per turn. The effect remains after the War Walkers are destroyed.',aeldariIds);
  if(source.unit==='Shroud Runners')add('Target Acquisition · chosen enemy',[shoot],'An enemy already selected after a long-rifle hit cannot have the Benefit of Cover until phase end, even if these Shroud Runners are destroyed.');
  if(source.unit==='Lhykhis')add('Whispering Web · chosen enemy',[shoot,['Fight','own','during']],'An enemy already selected after Lhykhis shot causes friendly Aeldari attacks targeting it to score Critical Hits on unmodified 5+ until this turn ends. The effect remains after Lhykhis dies, but cannot create Critical Hits during snap shooting.',aeldariIds);
  if(source.unit==='Kharseth')add('Fury of the Void · riven enemy',[shoot,['Fight','own','during']],'If Kharseth’s Dread of the Deep Void already made an enemy riven this turn, friendly Aeldari models add 1 Strength to attacks against it until this turn ends, even if Kharseth dies. This expires before the opponent’s turn.',aeldariIds);
  if(source.unit==='Starfangs')add('Hallucinogen Grenades · selected infantry',[incoming],'A friendly Aeldari Infantry formation already selected at the start of this opponent’s Shooting phase has Stealth until phase end, granting the Benefit of Cover. This effect retains its duration if these Starfangs are destroyed.',infantryIds);
  if(source.unit==='Yvraine')add('Herald of Ynnead · chosen enemy',[fight],'If Yvraine already chose an enemy at the start of this Fight phase, friendly Aeldari models re-roll Wound rolls of 1 against it until phase end, even if Yvraine dies.',aeldariIds);
  if(source.unit==='Stonesinger')add('Elemental Ensnarement · ensnared enemy',[['Movement','either','during']],'An enemy already ensnared by this Stonesinger has −2″ Move and cannot be pinned until the start of your next turn, even if the Stonesinger dies. Being unable to be pinned prevents combining the two movement penalties.');
  if(source.unit==='Storm Guardians'||source.unit==='Ynnari Kabalite Warriors')add('Persistent objective control',endPhase,'An objective already made persistent by '+(source.unit==='Storm Guardians'?'Stormblades':'Sadistic Raiders')+' remains yours until the opponent’s Level of Control becomes greater at the end of a phase. This continues after the source moves away or is destroyed.');
  if(source.unit==='Falcon'){
   const cargo=aeldariCargoFormations(army,source,roster).flatMap(g=>g.members.map(s=>s.id));
   add('Fire Support · disembarked models',[shoot,['Fight','own','during']],'If this Falcon already chose an enemy after shooting this turn, friendly models that actually disembarked from this Falcon this turn re-roll Wound rolls for attacks against that enemy until turn end. The effect remains if the Falcon dies. Only actual disembarked models qualify.',cargo);
  }
  if(source.unit==='Fuegan'&&!alive)add('Unquenchable Resolve',endPhase,'If this is the first phase in which Fuegan was destroyed, roll D6 at phase end. On 2+, return him with full wounds as close as possible to where he died and unengaged. Rejoin his original attached formation if possible under the core return rules. His removal does not erase this first-destruction trigger.',[source.id]);
 }
 return result;
}
