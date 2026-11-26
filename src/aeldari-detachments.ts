import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {AELDARI_CARDS,aeldariWeaponCount} from './aeldari-loadouts';
import {aeldariKeywords} from './aeldari-keywords';
import {aeldariFormations} from './aeldari-formations';
import {aeldariCargoFormations,aeldariSplitCargoFormations} from './aeldari-transports';
import {aeldariSelectedDetachments,eligibleAeldariUpgrades,aeldariOriginallyLed} from './aeldari-upgrades';
import {AELDARI_STRATAGEMS} from './aeldari-detachments.generated';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Form={root:RosterInstance;members:readonly RosterInstance[];models:number};
const source='https://wahapedia.ru/wh40k11ed/factions/aeldari/';
const pack='https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_aeldari-seqmcs1mu0-g8gzewikcm.pdf';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const incoming=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const demise='For an Attached unit, a destroyed-unit trigger occurs only when the last model that began the battle in that formation is destroyed; losing only its Bodyguard or one Character is insufficient.';
const surge='It must be unengaged, not Battle-shocked and not have moved this phase. Select the closest enemy, ignoring Aircraft unless this formation can Fly. Each model must end engaged with that enemy if possible, otherwise as close as possible; do not engage another enemy. It cannot move again this phase.';
const effects:Record<typeof AELDARI_STRATAGEMS[number]['id'],string>={
 '000009770002':'When this Aeldari Vehicle formation suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds until phase end.',
 '000009770004':'When this Aeldari Vehicle formation Falls Back in your Movement phase, that move does not prevent it from shooting.',
 '000009770003':'When this Aeldari Vehicle formation is selected to shoot, its attacks can re-roll one Hit roll, one Wound roll and one Damage roll.',
 '000009928006':'Before this Aspect Warriors formation shoots, select one of Ignores Cover, Lethal Hits or Sustained Hits 1 for its ranged weapons until phase end. You may discard one of its available Aspect Shrine tokens to select two instead; do not spend a token belonging to another unit.',
 '000009928002':'Before this Aspect Warriors or Avatar of Khaine formation shoots or fights, its attacks may ignore any or all modifiers to Ballistic Skill, Weapon Skill, Strength, AP, Damage and Hit rolls until phase end. This does not ignore Wound-roll modifiers.',
 '000009928005':'Before this Avatar of Khaine shoots, its ranged Wailing Doom has Range 18″ and Damage 8 until phase end.',
 '000009928003':'After enemy Fight target selection, each model in this Aspect Warriors or Avatar of Khaine formation destroyed before it has fought may fight on a D6 result of 4+, then be removed after the attacking unit finishes. You may discard one available Aspect Shrine token from this unit when using the Stratagem to add 1 to those rolls. This lasts until phase end.',
 '000009928007':'When an engaged enemy that is neither a Monster nor a Vehicle is selected to Fall Back in the opponent’s Movement phase, every model in that enemy takes a Desperate Escape test, at −1 if that enemy is Battle-shocked.',
 '000009928004':'At the end of either Fight phase, this unengaged Asuryani formation that was eligible to fight may embark within a friendly Transport it can legally fit inside, if every model is wholly within 6″ of that Transport. Apply all passenger restrictions and capacity to the entire formation; this does not waive the same-turn disembark/embark restriction.',
 '000010705002':'Before this Aeldari formation fights, its attacks re-roll Wound rolls of 1 until phase end. If it is Anhrathe, its attacks against an enemy within range of an objective marker may instead re-roll the full Wound roll.',
 '000010705007':'Just after enemy shooting destroys one or more models in this Aeldari Infantry formation, it may surge up to D6+1″. '+surge,
 '000010705003':'Just after this Aeldari formation Falls Back, it may charge after that Fall Back for the rest of the turn. If it is Anhrathe, choose one enemy it was engaged with at phase start and roll six D6; each 4+ causes one mortal wound to that enemy.',
 '000010705006':'After enemy shooting target selection, if this Aeldari Infantry formation is within an objective marker you control, it gains Stealth and can only be targeted by attacking models within 18″ until phase end. Current Stealth grants cover against ranged attacks; it does not subtract from Hit rolls.',
 '000010705005':'Just after this Anhrathe formation destroys one or more enemy units in your Shooting phase, finish all its shooting attacks, then it may make a Normal move up to D6+1″. Normal-move restrictions still apply. '+demise,
 '000010705004':'Before this Rangers or Shroud Runners formation shoots, its ranged weapons gain Ignores Cover, Rapid Fire 1 and +1 AP until phase end.',
 '000009920004':'Just after this Ynnari Infantry formation selects its Fight targets, its attacks re-roll Hit rolls of 1 until phase end, or the full Hit roll if it is below Starting Strength.',
 '000009920003':'After enemy shooting or Fight target selection, attacks targeting this Ynnari Infantry or Mounted formation, excluding Wraith Constructs, suffer −1 to Wound until phase end.',
 '000009920006':'Before this Ynnari formation shoots in your Shooting phase, its ranged weapons gain Lethal Hits and Ignores Cover until phase end.',
 '000009920005':'After enemy Fight target selection, every model in this Ynnari formation destroyed before it has fought may fight after the attacking unit finishes, then is removed. No die roll is required. This lasts until phase end.',
 '000009920007':'At the end of the opponent’s Shooting phase, if one or more models in this non-Wraith Construct Ynnari formation were destroyed this phase, it can shoot as if it were your Shooting phase. Apply current out-of-phase restrictions; this does not trigger other abilities restricted to your Shooting phase.',
 '000009920002':'When this Ynnari formation is just destroyed while within an objective marker you controlled at the previous phase’s end, select one such marker. It remains yours until the opponent has a greater Level of Control there at the end of a phase. The destroyed formation is explicitly eligible. '+demise,
 '000010700005':'Before this Anhrathe, Rangers or Shroud Runners formation shoots, its attacks gain +1 to Wound if their Strength is less than the highest Toughness in the enemy unit until phase end.',
 '000010700004':'After enemy Fight target selection, this Aeldari Infantry formation, excluding Wraith Constructs, gains Feel No Pain 5+ until phase end.',
 '000010700007':'At the end of the opponent’s Fight phase, remove this unengaged Anhrathe formation to Strategic Reserves. If it is below Starting Strength, return all its destroyed non-Character models, up to Starting Strength; do not return destroyed Characters.',
 '000010700002':'In either Command phase, this engaged Anhrathe formation gains +1 Objective Control per model until the next Command phase starts.',
 '000010700003':'Before this Corsair Voidscarred formation shoots in your Shooting phase or fights, its attacks gain +1 Damage until phase end.',
 '000010700006':'At the start of the opponent’s Charge phase, choose one visible non-Titanic enemy within 36″ of this Rangers, Shroud Runners or Starfangs formation. That enemy’s Charge rolls suffer −2 until phase end; this does not stack with other negative Charge-roll modifiers.',
 '000011045003':'At the end of the opponent’s Fight phase, place this unengaged Harlequins formation into Strategic Reserves.',
 '000011045004':'When an enemy ends a move within 8″ of this unengaged Harlequins Infantry formation in the opponent’s Movement phase, it may make a Normal move up to D3+3″. Normal-move restrictions still apply.',
 '000011045002':'After enemy Fight target selection, when a model in this Harlequins formation is destroyed, if the formation has not been selected to fight this phase, roll a D6. On 4+, retain that model until the formation has fought or the phase ends, whichever happens first. This Fateful Performance version does not immediately interrupt to fight after the attacker.',
 '000009916002':'When this actual Harlequins Character model is just destroyed, return it at phase end as close as possible to its former position, unengaged, with half its starting wounds remaining, rounding up. Each model can be targeted only once per battle. A revived Leader or Support remains part of its original Attached unit and must return to it in coherency if possible; this does not reset the formation’s Starting Strength.',
 '000009916007':'At the end of the opponent’s Fight phase, remove this unengaged Harlequins formation to Strategic Reserves.',
 '000009916006':'At the end of the opponent’s Charge phase, this Harlequins Infantry or Mounted formation may declare and resolve a charge against only eligible enemies within 6″. It must otherwise be eligible to charge those enemies. It receives no Charge bonus this turn.',
 '000009916005':'Just after an enemy ends a Normal, Advance or Fall Back move within 8″ of this Troupe formation in the opponent’s Movement phase, it may make a Normal move up to 6″. Normal-move restrictions still apply.',
 '000009916004':'Just after this Harlequins formation Falls Back, it may shoot and charge after that Fall Back for the rest of the turn.',
 '000009916003':'After enemy Fight target selection, each model in this Harlequins formation destroyed before it has fought may fight on a D6 result of 4+, after the attacking unit finishes, then is removed. This Ghosts of the Webway version lasts until phase end.',
 '000009912004':'Once per battle round, just after enemy shooting or Fight attacks destroy a friendly Dire Avengers or Guardians formation, wait for that enemy to finish its attacks. This War Walkers formation may then shoot as if it were your Shooting phase, targeting only that enemy if it is eligible. Apply out-of-phase restrictions. '+demise,
 '000009912003':'After enemy shooting or Fight target selection, if this Dire Avengers or Guardians formation is within an objective marker, attacks targeting it suffer −1 to Wound until phase end.',
 '000009912002':'Before this Dire Avengers or Guardians formation shoots in your Shooting phase or fights, its attacks against enemies within objective markers may re-roll Wound rolls until phase end.',
 '000009912006':'Before this Dire Avengers or Guardians formation shoots, all its ranged weapons gain Pistol until phase end. A model still chooses its Pistols or its other ranged weapons unless another rule permits both.',
 '000009912007':'At the end of the opponent’s Fight phase, if this Guardians formation is unengaged, remove it to Strategic Reserves and return every destroyed Guardians model, up to Starting Strength. This does not return attached models lacking the Guardians keyword.',
 '000009912005':'Before this Storm Guardians formation moves, its Advances add 6″ to Move instead of rolling until phase end. It may shoot and charge after Advancing for the rest of the turn.',
 '000011049004':'Just after this Rangers or Shroud Runners formation shoots, it may make a Normal move up to D6″. It cannot charge or embark within a Transport for the rest of the turn; Normal-move restrictions still apply.',
 '000011049003':'Just after this Rangers or Shroud Runners formation shoots, choose one enemy hit by those attacks; that enemy gains +6″ detection range until phase end.',
 '000011049002':'Just after this Rangers or Shroud Runners formation shoots, choose one enemy hit by those attacks to take a Battle-shock test, at −1 if those attacks destroyed any of its models.',
 '000009924005':'Before this non-Wraith Construct Asuryani Infantry formation shoots, if it is within 9″ of a friendly Asuryani Psyker model, its ranged weapons gain Ignores Cover and its attacks gain +1 AP on Critical Wounds until phase end.',
 '000009924006':'Just after an enemy ends a Normal, Advance or Fall Back move within 9″ of this Asuryani Psyker model, roll six D6; each 3+ causes one mortal wound to that enemy.',
 '000009924003':'After enemy Fight target selection, if this non-Wraith Construct Asuryani Infantry formation is within 9″ of a friendly Asuryani Psyker model, attacks targeting it suffer −1 to Hit and −1 to Wound until phase end.',
 '000009924002':'In either Command phase, choose one visible enemy within 18″ of this Asuryani Psyker model. That enemy takes a Battle-shock test at −1.',
 '000009924007':'After enemy shooting target selection, if this non-Wraith Construct Asuryani Infantry formation is within 9″ of a friendly Asuryani Psyker model, it can only be targeted by attacking models within 18″ until phase end.',
 '000009924004':'In your Movement phase, select this non-Wraith Construct Asuryani Infantry formation before it moves, provided it was not set up this phase and is within 9″ of a friendly Asuryani Psyker model. Place it in Strategic Reserves and give it Deep Strike. It must make an ingress move this phase and cannot be selected to move again this phase; obey ingress restrictions.',
 '000010650007':'At the end of the opponent’s Fight phase, remove this Harlequins Vehicle or Mounted formation to Strategic Reserves if it is unengaged.',
 '000010650006':'Just after an enemy ends a Normal, Advance or Fall Back move within 8″ of this Harlequins Infantry formation in the opponent’s Movement phase, it may make a Normal move up to 6″. Normal-move restrictions still apply.',
 '000010650005':'At the end of your Fight phase, this Harlequins Mounted formation that was eligible to fight may make a Normal move if unengaged, or a Fall Back move up to 6″ if engaged.',
 '000010650004':'In your Charge phase, this Harlequins formation may charge after Advancing until phase end.',
 '000010650003':'Before this Harlequins Vehicle formation shoots, allow it to make a Normal move up to 6″ after it finishes shooting if unengaged. It cannot charge for the rest of the turn.',
 '000010650002':'At the start of either Fight phase, this Troupe formation may select three Dance of Death abilities instead of one until phase end.',
 '000009908002':'Before a friendly Wraith Construct formation shoots in your Shooting phase or fights, choose an Aeldari Psyker model within 12″ and an enemy visible to that model. The Wraith formation’s attacks against that enemy may ignore any or all AP and Damage modifiers until phase end; other modifiers still apply.',
 '000009908007':'Just after this Wraithblades, Wraithlord or Wraithknight formation ends a Charge move, choose an engaged enemy. Roll one D6 per actual Wraithblades model, or four dice for a Wraithlord formation, or six for a Wraithknight formation; each 3+ causes one mortal wound.',
 '000009908003':'After enemy shooting or Fight target selection, reduce the Damage of attacks allocated to this non-Titanic Wraith Construct formation by 1, to the normal minimum of 1, until phase end.',
 '000009908004':'Before this Wraithblades, Wraithlord or Wraithknight formation fights, its melee weapons gain Devastating Wounds until phase end.',
 '000009908005':'In your Command phase, choose this Wraithblades, Wraithguard or Wraithlord formation and one friendly Asuryani Psyker model. Until your next Command phase starts, the formation counts as within 12″ of that model for Psychic Guidance and Spirit Guides. This does not create a missing ability or keep a destroyed Psyker source active.',
 '000009908006':'At the start of your Movement phase, choose one objective marker you control within range of this Wraithblades or Wraithguard formation. That marker stays yours until the opponent has greater Level of Control there at the end of a phase.',
 '000011053004':'Just after this Harlequins Vehicle formation shoots, it may make a Normal move up to D6″. It cannot charge for the rest of the turn; Normal-move restrictions still apply.',
 '000011053003':'At the end of your Movement phase, select one objective marker this Troupe formation controls; that objective is secured, remaining yours until the opponent has greater Level of Control there at the end of a phase.',
 '000011053002':'When this Troupe formation is selected to fight, its melee attacks gain Lance until phase end: +1 to Wound if the formation made a Charge move this turn.',
 '000009900005':'Before this Asuryani formation shoots, its ranged weapons gain Sustained Hits 1 against enemies within 12″ until phase end. A weapon that already has Sustained Hits instead scores Critical Hits on unmodified 5+ for those attacks. Do not add the Sustained Hits values together.',
 '000009900002':'After enemy shooting or Fight target selection, attacks targeting this non-Wraith Construct Asuryani formation suffer −1 to Hit until phase end.',
 '000009900003':'At the end of either Fight phase, this unengaged Asuryani formation that was eligible to fight may embark within a friendly Transport it can legally fit inside, if every model is wholly within 6″ of it. Apply all passenger restrictions and capacity to the entire formation; this does not waive the same-turn disembark/embark restriction.',
 '000009900007':'At the end of the opponent’s Fight phase, remove this unengaged Asuryani Infantry formation to Strategic Reserves if wholly within 9″ of a battlefield edge.',
 '000009900004':'Just after this Asuryani formation Falls Back, it may shoot and charge after that Fall Back for the rest of the turn.',
 '000009900006':'Just after this Asuryani Infantry formation shoots, excluding Aircraft, Asurmen and Wraith Constructs, it may make a Normal move up to D6+1″. It cannot charge or embark within a Transport for the rest of the turn; Normal-move restrictions still apply.',
 '000009904002':'Before this Asuryani Mounted or Vypers formation shoots in your Shooting phase or fights, if it arrived from Reserves this turn, its attacks may re-roll Wound rolls until phase end.',
 '000009904007':'After enemy shooting target selection, models in this Asuryani Mounted or Vypers formation gain a 4+ invulnerable save until phase end.',
 '000009904006':'Before this Asuryani Mounted or Vypers formation shoots, its attacks gain +1 AP until phase end.',
 '000009904003':'At the end of your Shooting phase or either Fight phase, if this Asuryani Mounted formation destroyed one or more enemy units that phase, it may make a Normal move up to 7″. Normal-move restrictions still apply. '+demise,
 '000009904004':'Before this Asuryani Mounted or Vypers formation moves, it may shoot and charge after Advancing or Falling Back for the rest of the turn.',
 '000009904005':'In your Movement phase’s reinforcement step, this Asuryani Mounted or Vypers formation in Reserves may arrive anywhere more than 6″ horizontally from all enemies. If placed within 8″ horizontally of any enemy, it cannot charge for the rest of the turn. This does not waive other arrival restrictions.',
};

export function aeldariDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari')return [];
 const detachments=aeldariSelectedDetachments(army),has=(name:string)=>detachments.includes(name),original=expandRoster(army);
 const active=roster.filter(s=>!!AELDARI_CARDS[s.unit]),current={...army,instances:[...active]};
 const forms:Form[]=aeldariFormations(army,active),originalForms:Form[]=aeldariFormations(army,original);
 const tag=(s:RosterInstance,k:string)=>aeldariKeywords(army,s,undefined,active).has(k);
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const named=(f:Form,...names:string[])=>f.members.some(s=>names.includes(s.unit));
 const weapons=(f:Form,phase:'Shooting'|'Fight')=>f.members.flatMap(s=>(AELDARI_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase===phase&&aeldariWeaponCount(s,w.name)>0));
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0,melee=(f:Form)=>weapons(f,'Fight').length>0;
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const aeldari=forms.filter(f=>kw(f,'AELDARI')),asur=forms.filter(f=>kw(f,'ASURYANI')),harlequins=forms.filter(f=>kw(f,'HARLEQUINS')),corsairs=forms.filter(f=>kw(f,'ANHRATHE'));
 const infantry=aeldari.filter(f=>kw(f,'INFANTRY')),vehicles=aeldari.filter(f=>kw(f,'VEHICLE')),transports=vehicles.filter(f=>kw(f,'TRANSPORT'));
 const ynnari=forms.filter(f=>kw(f,'YNNARI')),wraith=forms.filter(f=>kw(f,'WRAITH CONSTRUCT')),aspect=forms.filter(f=>kw(f,'ASPECT WARRIORS')||kw(f,'AVATAR OF KHAINE'));
 const wind=asur.filter(f=>kw(f,'MOUNTED')||kw(f,'VYPER')||kw(f,'VYPERS')),guard=asur.filter(f=>kw(f,'DIRE AVENGERS')||kw(f,'GUARDIANS'));
 const outcasts=forms.filter(f=>kw(f,'RANGERS')||kw(f,'SHROUD RUNNERS')),psykers=active.filter(s=>tag(s,'AELDARI')&&tag(s,'PSYKER')),asurPsykers=psykers.filter(s=>tag(s,'ASURYANI'));
 const battleFocus=forms.filter(f=>f.members.some(s=>AELDARI_CARDS[s.unit]?.factionAbilities.includes('Battle Focus'))||has('Spirit Conclave')&&asurPsykers.length>0&&named(f,'Wraithblades','Wraithguard','Wraithlord'));
 const cargo=(f:Form)=>[...aeldariCargoFormations(army,f.root,active),...aeldariSplitCargoFormations(army,f.root,active)];
 const canRide=(f:Form)=>transports.some(t=>cargo(t).some(g=>g.members.some(m=>f.members.some(s=>s.id===m.id))));
 const rows:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],rule?:string,reference=source)=>{
  if(units.length)rows.push({id:'11e-aeldari-det-'+id+'-'+window+'-'+turn+'-'+timing,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source:reference,sourceRuleId:rule,origin:'detachment'});
 };
 const card=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:readonly Form[],rule?:string,reference=source)=>emit(id,title,window,turn,timing,summary,roots(fs),rule,reference);
 const snap=(id:string,title:string,summary:string,fs:readonly Form[],rule?:string)=>card(id,title,'Movement','opponent','end',summary,fs.filter(f=>ranged(f)&&!kw(f,'TITANIC')),rule);
 if(has('Armoured Warhost'))card('skilled','Skilled Crews','Shooting','own','during','Ranged attacks made by friendly Aeldari Vehicle formations have Assault, allowing those weapons to shoot after Advancing.',vehicles.filter(ranged),'000009768',pack);
 if(has('Warhost')){
  card('grace-token','Martial Grace · Battle Focus','Start of battle round','either','start','Receive 1 additional Battle Focus token at the start of each battle round.',originalForms,'000009898');
  for(const phase of ['Movement','Shooting','Fight'] as const)card('grace-move','Martial Grace · Swift as the Wind',phase,'either','during','When an eligible formation performs Swift as the Wind, add an extra 1″ to Move until phase end, for +3″ in total. Eligibility and token costs still apply.',battleFocus,'000009898');
  for(const phase of ['Movement','Shooting','Fight'] as const)card('grace-roll','Martial Grace · manoeuvre rolls',phase,'either','during','Add 1 to the D6 result of every Agile Manoeuvre performed by your formations. Opportunity Seized and Fade Back therefore move up to D6+2″. This modifies a manoeuvre’s die result, not every reactive-move die.',battleFocus,'000009898');
 }
 if(has('Windrider Host')){
  card('wind-reserves','Ride the Wind · initial Reserves','Pre-battle','either','during','During Declare Battle Formations, you may place Asuryani Mounted and Vypers formations in Reserves; they arrive using Strategic Reserves placement. This permission does not waive the overall reserve limit. Windriders gain Battleline.',wind,'000009902');
  card('wind-arrive','Ride the Wind · reserve arrival','Movement','either','during','For these Asuryani Mounted and Vypers formations’ reserve setup, treat the battle round as one higher. The current FAQ permits arrival in the first battle round, including Rapid Ingress in the opponent’s first turn; apply the placement rules for the increased round.',wind,'000009902');
  card('wind-return','Ride the Wind · return to Reserves','End of opponent turn','opponent','end','Remove up to 1/2/3 unengaged Asuryani Mounted or Vypers formations to Strategic Reserves in Incursion/Strike Force/Onslaught respectively.',wind,'000009902');
 }
 if(has('Spirit Conclave')){
  const originalPsykers=original.filter(s=>aeldariKeywords(army,s).has('ASURYANI')&&aeldariKeywords(army,s).has('PSYKER'));
  for(const phase of phases)emit('vengeful-token','Shepherds of the Dead · mark the killer',phase,'either','during','Whenever an actual Asuryani Psyker model is destroyed by an enemy unit, give that enemy a Vengeful Dead token. This is a model-destruction trigger; the rest of an Attached unit need not be destroyed.',originalPsykers,'000009906');
  if(originalPsykers.length){
   for(const phase of ['Shooting','Fight'] as const)card('vengeful-attacks','Shepherds of the Dead · vengeance',phase,phase==='Fight'?'either':'own','during','Only actual Wraith Construct models gain +1 to Hit and +1 to Wound against enemies with one or more Vengeful Dead tokens. Multiple tokens do not multiply the bonus. Existing tokens persist after their Psyker source is destroyed.',wraith.filter(phase==='Fight'?melee:ranged),'000009906');
   snap('vengeful-snap','Shepherds of the Dead · snap shooting','When Wraith Construct models fire snap shots against enemies with Vengeful Dead tokens, apply +1 to Wound. Snap shooting ignores Hit-roll modifiers, so the +1 to Hit cannot change its hit threshold.',wraith,'000009906');
  }
  const guided=wraith.filter(f=>named(f,'Wraithblades','Wraithguard','Wraithlord'));
  if(asurPsykers.length)for(const phase of ['Movement','Shooting','Charge','Fight'] as const)card('guides','Spirit Guides · Battle Focus',phase,'either','during','While this Wraithblades, Wraithguard or Wraithlord formation is within 12″ of a surviving Asuryani Psyker model, it has Battle Focus. Use the exact manoeuvre timing and normal token/once-per-phase restrictions. Available sources: '+asurPsykers.map(s=>s.id).join(', ')+'.',guided,'000009906');
  card('wraith-battleline','Shepherds of the Dead · Battleline','Pre-battle','either','during','Wraithblades and Wraithguard gain Battleline under this selected detachment.',wraith.filter(f=>named(f,'Wraithblades','Wraithguard')),'000009906');
 }
 if(has('Guardian Battlehost')){
  const defenders=asur.filter(f=>['DIRE AVENGERS','GUARDIANS','SUPPORT WEAPON','WAR WALKERS'].some(k=>kw(f,k)));
  for(const phase of ['Shooting','Fight'] as const)card('defend','Defend at All Costs',phase,phase==='Fight'?'either':'own','during','Only actual Dire Avenger, Guardian, Support Weapon or War Walker models gain +1 to Hit if their formation and/or the target is within an objective marker. Attached models without a qualifying keyword do not inherit the model-specific bonus. Snap shooting ignores this Hit-roll modifier.',defenders.filter(phase==='Fight'?melee:ranged),'000009910');
 }
 for(const [det,rule] of [['Ghosts of the Webway','000009914'],['Fateful Performance','000011043']] as const)if(has(det))card('acrobatic-'+rule,'Acrobatic Onslaught','Charge','either','during','Harlequins models may move through enemy models when making Charge moves. End in legal positions and obey all other charge requirements.',harlequins,rule,det==='Fateful Performance'?pack:source);
 for(const [det,rule] of [['Ghosts of the Webway','000009914'],['Serpent’s Brood','000010648']] as const)if(has(det)){
  card('players-'+rule,'Travelling Players · muster','Pre-battle','either','during','Troupe units gain Battleline and their actual Troupe models have Objective Control 2. You may include up to three each of Death Jester, Shadowseer and Troupe Master, and may select an eligible Harlequins Character as Warlord. Solitaire’s explicit prohibition still applies.',harlequins,rule);
 }
 if(has('Devoted of Ynnead')){
  card('servants','Servants of the Whispering God','Pre-battle','either','during','Include Yvraine and/or the Yncarne and select one of those models as Warlord. Ynnari units are permitted without Asuryani; Asuryani units other than Epic Heroes gain Ynnari.',originalForms,'000009918');
  card('intent','Strength from Death · Lethal Intent','Shooting','opponent','end','If any friendly Ynnari formation was destroyed this phase, select one surviving Ynnari Infantry or Mounted formation that was within 6″ of a destroyed formation. It may make a Normal move up to D6+1″. Normal-move restrictions still apply. '+demise,ynnari.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED')),'000009918',pack);
  card('surge','Strength from Death · Lethal Surge','Shooting','opponent','during','Once per turn, when this non-Titanic Ynnari formation performs Fade Back after being hit by enemy shooting, it may make a surge move up to D6+1″ instead of the Normal move.'+(has('Warhost')?' Martial Grace adds 1 to that die result, for D6+2″.':'')+' Battle Focus eligibility and token requirements still apply. '+surge,ynnari.filter(f=>!kw(f,'TITANIC')&&battleFocus.includes(f)),'000009918',pack);
  card('reprisal','Strength from Death · Lethal Reprisal','Fight','either','start','Select one non-Titanic Ynnari formation below Starting Strength; it gains Fights First until phase end.',ynnari.filter(f=>!kw(f,'TITANIC')),'000009918');
 }
 if(has('Seer Council')){
  card('fate-pool','Strands of Fate · Fate dice pool','Start of battle round','either','start','At the start of battle round 1, roll 3/6/9 Fate dice for Incursion/Strike Force/Onslaught and retain their results in a pool. When using a Seer Council Stratagem, you may discard a matching die to reduce that use by 1 CP: 1 Presentiment of Dread; 2 Forewarned; 3 Unshrouded Truth; 4 Fate Inescapable; 5 Isha’s Fury; 6 Psychic Shield. These dice pay for those Stratagems; they do not replace attack or saving rolls.',originalForms,'000009922');
 }
 if(has('Aspect Host')){
  for(const phase of ['Shooting','Fight'] as const)card('path','Path of the Warrior',phase,phase==='Fight'?'either':'own','during','When this Aspect Warriors or Avatar of Khaine formation is selected to shoot or fight, choose to re-roll Hit rolls of 1 or Wound rolls of 1 for its attacks until phase end. Mantle of Wisdom can grant both to its eligible bearer’s formation.',aspect.filter(phase==='Fight'?melee:ranged),'000009926');
  snap('path-snap','Path of the Warrior · snap shooting','When selected to shoot during Fire Overwatch, choose to re-roll Hit rolls of 1 or Wound rolls of 1 until phase end. Re-rolls still apply to snap shooting, but Critical Hits cannot occur.',aspect,'000009926');
 }
 if(has('Serpent’s Brood')){
  const mounted=harlequins.filter(f=>kw(f,'MOUNTED')||kw(f,'VEHICLE'));
  for(const phase of ['Shooting','Fight'] as const){
   card('boons','Boons of the Brood',phase,phase==='Fight'?'either':'own','during','Weapons of actual Harlequins Mounted and Harlequins Vehicle models have Sustained Hits 1. Identical Sustained Hits bonuses do not stack. Snap shooting cannot activate Sustained Hits.',mounted.filter(phase==='Fight'?melee:ranged),'000010648');
   card('boons-cargo','Boons of the Brood · disembarked formation',phase,phase==='Fight'?'either':'own','during','If this Harlequins formation disembarked from a Transport this turn, its weapons have Sustained Hits 1 until turn end. Apply this only to the actual disembarking formation or split half. Snap shooting cannot activate Sustained Hits.',harlequins.filter(f=>canRide(f)&&(phase==='Fight'?melee(f):ranged(f))),'000010648');
  }
 }
 if(has('Eldritch Raiders')){
  card('yriel-advance','Yriel’s Own · Advance re-roll','Movement','own','during','Anhrathe, Rangers and Shroud Runners formations may re-roll Advance rolls.',forms.filter(f=>kw(f,'ANHRATHE')||kw(f,'RANGERS')||kw(f,'SHROUD RUNNERS')),'000010697',pack);
  card('yriel-charge','Yriel’s Own · charge after Advance','Charge','own','during','Aeldari formations may declare a charge in a turn in which they Advanced. Other charge restrictions still apply.',aeldari.filter(f=>!kw(f,'AIRCRAFT')),'000010697',pack);
  card('veterans-raiders','Veterans of the Void · Corsair enhancements','Pre-battle','either','during','Each Anhrathe unit may receive up to one selected Eldritch Raiders Corsair Enhancement, including eligible non-Character units and Epic Heroes. Each Corsair Enhancement is unique across the army, and its printed points cost counts toward the army limit. Pirate Prince is restricted to Prince Yriel.',corsairs,'000010698',pack);
 }
 if(has('Corsair Coterie')){
  for(const phase of ['Movement','Charge','Fight'] as const)card('raiders-trap','Relentless Raiders · objective trap',phase,'either','during','Whenever an enemy ends a Normal, Advance, Fall Back or Charge move within an objective marker you currently control, roll a D6; on 2+, that enemy suffers D3 mortal wounds. A Pile-in or Consolidation move is not a listed trigger. This army effect does not require a surviving Corsair beside the marker.',originalForms,'000010702',pack);
  for(const phase of phases)card('void-thieves','Void Thieves · secure objective',phase,'either','end','If this Anhrathe formation is within an objective marker you control at phase end, that marker stays yours until the opponent has greater Level of Control there at the end of a phase. Once secured, it remains secured after this source leaves or is destroyed.',corsairs,'000010702',pack);
  card('veterans-coterie','Veterans of the Void · Corsair enhancements','Pre-battle','either','during','Each Anhrathe unit may receive up to one selected Corsair Coterie Corsair Enhancement, including eligible non-Character units and Epic Heroes. Each Corsair Enhancement is unique across the army, and its printed points cost counts toward the army limit.',corsairs,'000010703',pack);
 }
 if(has('Path of the Outcast')){
  card('doom','Far-Reaching Doom','Shooting','own','during','When this Rangers or Shroud Runners formation is selected to shoot, enemy units gain +6″ detection range until it finishes shooting.',outcasts.filter(ranged),'000011047',pack);
  snap('doom-snap','Far-Reaching Doom · snap shooting','When this Rangers or Shroud Runners formation is selected to shoot during Fire Overwatch, enemy units gain +6″ detection range until it finishes shooting. This selection trigger is not limited to your Shooting phase.',outcasts,'000011047');
 }
 if(has('Twilight Flickers'))for(const [phase,turn] of incoming)card('distortion','Dance of Distortion',phase,turn,'during','Friendly Harlequins formations have Stealth, granting cover against ranged attacks under the current core rules. Cover benefits do not stack; Stealth does not subtract 1 from Hit rolls.',harlequins,'000011051',pack);
 const seerTargets=asur.filter(f=>kw(f,'INFANTRY')&&!kw(f,'WRAITH CONSTRUCT'));
 const fateValues:Record<string,number>={'000009924002':1,'000009924003':2,'000009924004':3,'000009924005':4,'000009924006':5,'000009924007':6};
 for(const strat of AELDARI_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets:readonly Form[]=aeldari,actors:readonly RosterInstance[]|undefined,body=effects[strat.id];
   switch(strat.id){
    case '000009770002':case '000009770004':targets=vehicles;break;
    case '000009770003':targets=vehicles.filter(ranged);break;
    case '000009928006':targets=aspect.filter(f=>kw(f,'ASPECT WARRIORS')&&ranged(f));break;
    case '000009928002':targets=aspect.filter(phase==='Fight'?melee:ranged);break;
    case '000009928005':targets=aspect.filter(f=>kw(f,'AVATAR OF KHAINE')&&ranged(f));break;
    case '000009928003':targets=aspect.filter(melee);break;
    case '000009928007':targets=aspect;break;
    case '000009928004':case '000009900003':targets=asur.filter(canRide);break;
    case '000010705002':targets=aeldari.filter(melee);break;
    case '000010705007':case '000010705006':targets=infantry;break;
    case '000010705003':targets=aeldari.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000010705005':targets=corsairs.filter(ranged);break;
    case '000010705004':case '000011049004':case '000011049003':case '000011049002':targets=outcasts.filter(ranged);break;
    case '000009920004':targets=ynnari.filter(f=>kw(f,'INFANTRY')&&melee(f));break;
    case '000009920003':targets=ynnari.filter(f=>(kw(f,'INFANTRY')||kw(f,'MOUNTED'))&&!kw(f,'WRAITH CONSTRUCT'));break;
    case '000009920006':targets=ynnari.filter(ranged);break;
    case '000009920005':targets=ynnari.filter(melee);break;
    case '000009920007':targets=ynnari.filter(f=>!kw(f,'WRAITH CONSTRUCT')&&ranged(f));break;
    case '000009920002':targets=originalForms.filter(f=>f.members.some(s=>aeldariKeywords(army,s).has('YNNARI')));break;
    case '000010700005':targets=forms.filter(f=>(kw(f,'ANHRATHE')||kw(f,'RANGERS')||kw(f,'SHROUD RUNNERS'))&&ranged(f));break;
    case '000010700004':targets=infantry.filter(f=>!kw(f,'WRAITH CONSTRUCT'));break;
    case '000010700007':case '000010700002':targets=corsairs;break;
    case '000010700003':targets=corsairs.filter(f=>named(f,'Corsair Voidscarred')&&(phase==='Fight'?melee(f):ranged(f)));break;
    case '000010700006':targets=forms.filter(f=>kw(f,'RANGERS')||kw(f,'SHROUD RUNNERS')||kw(f,'STARFANG')||kw(f,'STARFANGS'));break;
    case '000011045003':case '000011045002':case '000009916007':case '000009916004':case '000009916003':case '000010650004':targets=harlequins;break;
    case '000011045004':case '000010650006':targets=harlequins.filter(f=>kw(f,'INFANTRY'));break;
    case '000009916002':actors=original.filter(s=>aeldariKeywords(army,s).has('HARLEQUINS')&&aeldariKeywords(army,s).has('CHARACTER'));targets=[];break;
    case '000009916006':targets=harlequins.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED'));break;
    case '000009916005':case '000010650002':case '000011053003':case '000011053002':targets=harlequins.filter(f=>kw(f,'TROUPE'));break;
    case '000009912004':targets=original.some(s=>aeldariKeywords(army,s).has('DIRE AVENGERS')||aeldariKeywords(army,s).has('GUARDIANS'))?asur.filter(f=>kw(f,'WAR WALKERS')&&ranged(f)):[];break;
    case '000009912003':targets=guard;break;
    case '000009912002':targets=guard.filter(phase==='Fight'?melee:ranged);break;
    case '000009912006':targets=guard.filter(ranged);break;
    case '000009912007':targets=guard.filter(f=>kw(f,'GUARDIANS'));break;
    case '000009912005':targets=guard.filter(f=>named(f,'Storm Guardians'));break;
    case '000009924005':targets=asurPsykers.length?seerTargets.filter(ranged):[];break;
    case '000009924003':case '000009924007':case '000009924004':targets=asurPsykers.length?seerTargets:[];break;
    case '000009924006':case '000009924002':actors=asurPsykers;targets=[];break;
    case '000010650007':targets=harlequins.filter(f=>kw(f,'VEHICLE')||kw(f,'MOUNTED'));break;
    case '000010650005':targets=harlequins.filter(f=>kw(f,'MOUNTED'));break;
    case '000010650003':case '000011053004':targets=harlequins.filter(f=>kw(f,'VEHICLE')&&ranged(f));break;
    case '000009908002':targets=psykers.length?wraith.filter(phase==='Fight'?melee:ranged):[];body+=' Available Psyker sources: '+psykers.map(s=>s.id).join(', ')+'.';break;
    case '000009908007':case '000009908004':targets=wraith.filter(f=>kw(f,'WRAITHBLADES')||kw(f,'WRAITHLORD')||kw(f,'WRAITHKNIGHT'));break;
    case '000009908003':targets=wraith.filter(f=>!kw(f,'TITANIC'));break;
    case '000009908005':targets=asurPsykers.length?wraith.filter(f=>named(f,'Wraithblades','Wraithguard','Wraithlord')):[];body+=' Available sources: '+asurPsykers.map(s=>s.id).join(', ')+'.';break;
    case '000009908006':targets=wraith.filter(f=>named(f,'Wraithblades','Wraithguard'));break;
    case '000009900005':targets=asur.filter(ranged);break;
    case '000009900002':targets=asur.filter(f=>!kw(f,'WRAITH CONSTRUCT'));break;
    case '000009900007':targets=asur.filter(f=>kw(f,'INFANTRY'));break;
    case '000009900004':targets=asur.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000009900006':targets=asur.filter(f=>kw(f,'INFANTRY')&&!kw(f,'AIRCRAFT')&&!kw(f,'ASURMEN')&&!kw(f,'WRAITH CONSTRUCT')&&ranged(f));break;
    case '000009904002':targets=wind.filter(phase==='Fight'?melee:ranged);break;
    case '000009904007':case '000009904004':case '000009904005':targets=wind;break;
    case '000009904006':targets=wind.filter(ranged);break;
    case '000009904003':targets=asur.filter(f=>kw(f,'MOUNTED')&&(phase==='Fight'?melee(f):ranged(f)));break;
   }
   if(fateValues[strat.id])body+=' You may discard one Fate die showing '+fateValues[strat.id]+' to reduce this use by 1 CP.';
   const costs=[...new Set(targets.map(f=>strat.cp*(named(f,'Phantom Titan')?3:named(f,'Revenant Titan')?2:1)))].sort((a,b)=>a-b);
   if(targets.some(f=>named(f,'Revenant Titan')))body+=' Targeting a Revenant Titan costs twice the stated CP cost ('+strat.cp*2+' CP).';
   if(targets.some(f=>named(f,'Phantom Titan')))body+=' Targeting a Phantom Titan costs three times the stated CP cost ('+strat.cp*3+' CP).';
   const title=strat.name+' · '+(actors||!costs.length?strat.cp:costs.join(' / '))+' CP';
   if(actors)emit('strat-'+strat.id,title,phase,turn,strat.timing,body,actors,strat.id);
   else card('strat-'+strat.id,title,phase,turn,strat.timing,body,targets,strat.id);
  }
 }
 // Phoenix Gem and Staged Death can matter after the bearer has left the
 // current roster, so their destroyed-model cards use original selections.
 for(const bearer of original){
  const name=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit]??bearer.enhancement;
  const selected=eligibleAeldariUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===name),gem=selected?.id==='000009899002'?selected:undefined;
  if(gem)for(const phase of phases)emit('gem-'+bearer.id,gem.name+' · '+bearer.id,phase,'either','during','The first time this bearer is destroyed, remove it and roll a D6 at phase end. On 2+, return it unengaged, as close as possible to its former position, with full wounds. A revived Leader or Support remains part of its original Attached unit and must return to it in coherency if possible; this does not reset the formation’s Starting Strength.',[bearer],gem.id);
  const lingering=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets:readonly Form[]=wraith)=>{
   if(selected)card('lingering-'+selected.id+'-'+bearer.id+'-'+suffix,selected.name+' · previously selected target',window,turn,timing,summary,targets,selected.id);
  };
  if(selected?.id==='000009907002')for(const [window,turn] of [['End of your turn','own'],['End of opponent turn','opponent']] as const)lingering('oc',window,turn,'end','Only the Wraith Construct formation actually chosen by '+bearer.id+' in your last Command phase retains +1 Objective Control on Infantry models and +3 on Monster models until your next Command phase starts. This already-applied timed effect persists if the Spiritseer is later destroyed.');
  if(selected?.id==='000009907003'){
   const eligible=wraith.filter(f=>!kw(f,'TITANIC'));
   for(const phase of ['Shooting','Fight'] as const)lingering('precision',phase,phase==='Fight'?'either':'own','during','Only the non-Titanic Wraith Construct formation actually chosen by '+bearer.id+' in your last Command phase gains Precision on Critical Wounds until your next Command phase starts. Torrent attacks cannot have Precision. This already-applied timed effect persists if the Spiritseer is later destroyed.',eligible.filter(phase==='Fight'?melee:ranged));
   lingering('precision-snap','Movement','opponent','end','If the non-Titanic Wraith Construct formation chosen by '+bearer.id+' in your last Command phase fires during Fire Overwatch, it retains Precision on Critical Wounds until your next Command phase starts. Torrent attacks cannot have Precision. Snap shooting prevents Critical Hits, not Critical Wounds; the timed effect persists after the Spiritseer is destroyed.',eligible.filter(ranged));
  }
  if(selected?.id==='000009907004')for(const [phase,turn] of incoming)lingering('cover',phase,turn,'during','Only the Wraith Construct formation actually chosen by '+bearer.id+' in your last Command phase has cover against ranged attacks whose attacking model is beyond 18″, until your next Command phase starts. This already-applied timed effect persists if the Spiritseer is later destroyed.');
 }
 for(const bearer of active){
  const name=current.upgrades2026?.[bearer.id]??current.upgrades2026?.[bearer.unit]??bearer.enhancement;
  const upgrade=eligibleAeldariUpgrades(current,bearer.unit,bearer.id).find(u=>u.name===name);if(!upgrade)continue;
  const f=forms.find(g=>g.members.some(s=>s.id===bearer.id));if(!f)continue;
  const row=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets:readonly Form[]=[f])=>card('upgrade-'+upgrade.id+'-'+bearer.id+'-'+suffix,upgrade.name+' · '+bearer.id,window,turn,timing,summary,targets,upgrade.id);
  const ownRow=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string)=>emit('upgrade-'+upgrade.id+'-'+bearer.id+'-'+suffix,upgrade.name+' · '+bearer.id,window,turn,timing,summary,[bearer],upgrade.id);
  const led=(test:(body:RosterInstance)=>boolean)=>aeldariOriginallyLed(army,bearer,test);
  const bodyKeyword=(body:RosterInstance,k:string)=>aeldariKeywords(army,body).has(k);
  const aspectLead=led(body=>bodyKeyword(body,'ASPECT WARRIORS')),guardLead=led(body=>bodyKeyword(body,'DIRE AVENGERS')||bodyKeyword(body,'GUARDIANS'));
  const leaderPersistence='The surviving bearer keeps its own while-leading benefit after its original Bodyguard is destroyed under Core 19.04; an initially unattached bearer does not receive it.';
  switch(upgrade.id){
   case '000009911002':ownRow('oc','Pre-battle','either','during','Only this bearer has Objective Control 5; other models in the formation retain their own characteristics.');break;
   case '000009915002':row('coil','Charge','either','during','Whenever this Troupe Master bearer’s formation ends a Charge move, choose one engaged enemy. Roll one D6 for each actual model in the formation that is engaged with that enemy; each 4+ causes one mortal wound, to a maximum of 6.');break;
   case '000010649002':case '000011052003':row('scouts','Pre-battle','either','during','Every model in this bearer’s formation has Scouts 6″ while the bearer remains in that formation. Resolve the whole formation’s Scout move and transport eligibility using its actual models.');break;
   case '000011044002':row('charge','Charge','either','during','This Troupe Master bearer’s formation may re-roll Charge rolls.');break;
   case '000009919002':
    ownRow('storm','Shooting','own','during','Only this Farseer bearer’s Eldritch Storm has Devastating Wounds. Other weapons and Bodyguards do not receive that ability.');
    ownRow('storm-snap','Movement','opponent','end','If this Farseer bearer fires Eldritch Storm during Fire Overwatch, it retains Devastating Wounds. Snap shooting prevents Critical Hits, not Critical Wounds.');break;
   case '000009769002':
    if(vehicles.length){
     for(const [phase,turn] of incoming)ownRow('lone',phase,turn,'during','While this actual Psyker bearer is within 3″ of a friendly Aeldari Vehicle, it has Lone Operative. This model-only grant does not give its Bodyguards the ability. Lone Operative does not protect it while part of an Attached unit; otherwise enemies beyond 12″ cannot see it or target it with Indirect Fire. Available Vehicles: '+names(vehicles)+'.');
     ownRow('heal','Movement','own','during','At the start or end of this bearer’s formation’s move, choose one friendly Aeldari Vehicle model within 3″ of the actual bearer. Restore D3 lost wounds to that Vehicle model, up to its starting wounds. Available Vehicle formations: '+names(vehicles)+'.');
    }break;
   case '000009907002':row('clarity','Command','own','during','Choose one friendly Wraith Construct formation within 12″ of this Spiritseer bearer. Until your next Command phase starts, its actual Infantry models gain +1 Objective Control and its actual Monster models gain +3 Objective Control. Other model types gain neither bonus. Eligible formations: '+names(wraith)+'.',wraith);break;
   case '000010699002':for(const phase of phases)row('refund',phase,'either','during','Whenever you actually spend a Battle Focus token for Prince Yriel’s formation to perform an Agile Manoeuvre, roll a D6; on 3+, gain 1 Battle Focus token. A free manoeuvre is not a token-spend trigger. This enhancement is restricted to Prince Yriel.');break;
   case '000010704002':for(const phase of phases)row('infamy',phase,'either','during','Enemy models in units within 3″ of this upgraded Anhrathe formation suffer −1 Objective Control, to a minimum of 1. Measure the aura from the upgraded formation.');break;
   case '000009899002':break; // Original-roster destruction trigger above.
   case '000011052002':row('first','Fight','either','start','This upgraded Troupe formation has Fights First.');break;
   case '000009927002':ownRow('murder','Fight','either','during','Only this Autarch bearer’s melee weapons gain +1 Damage and Precision. Bodyguard weapons do not inherit this bonus.');break;
   case '000009923002':ownRow('lucid','Command','own','during','You may add 1 to or subtract 1 from the value of one die in your Fate dice pool. Use the adjusted value for the matching Seer Council Stratagem discount.');break;
   case '000009903002':row('scouts','Pre-battle','either','during','Every model in this Asuryani Mounted bearer’s formation has Scouts 9″ while the bearer remains in that formation.');break;
   case '000011048002':row('hidden','Shooting','own','during','This upgraded Rangers formation’s ranged attacks do not prevent it from being hidden. Apply the remaining detection and hiding requirements normally.');break;
   case '000010699003':row('lance','Fight','either','during','Melee weapons of all models in this upgraded Anhrathe formation have Lance, giving +1 to Wound if the formation made a Charge move this turn.');break;
   case '000010704003':
    row('deep','Pre-battle','either','during','Every model in this upgraded Anhrathe formation has Deep Strike while the enhancement source remains in that formation.');
    row('reserve','End of opponent turn','opponent','end','Once per battle, if this upgraded Anhrathe formation is unengaged, you may remove it to Strategic Reserves.');break;
   case '000009911003':{
    const guardians=originalForms.filter(g=>g.members.some(s=>aeldariKeywords(army,s).has('GUARDIANS')));
    if(guardians.length)row('pathway','Pre-battle','either','during','In Deploy Armies, select up to two Guardians units from your army; their models gain Infiltrators. This optional choice is not an automatic grant to every eligible unit. Check every actual attached model’s eligibility when deploying. Eligible formations: '+names(guardians)+'.');break;
   }
   case '000010649003':ownRow('wail','Fight','either','during','Only this Troupe Master bearer’s melee weapons gain +3 Strength and +1 Attacks.');break;
   case '000009903003':for(const [phase,turn] of incoming)row('mirage',phase,turn,'during','Attacks targeting this bearer’s formation suffer −1 to Hit. Snap shooting ignores Hit-roll modifiers.');break;
   case '000009907003':{
    const eligible=wraith.filter(g=>!kw(g,'TITANIC'));
    row('kurnous','Command','own','during','Select one non-Titanic Wraith Construct formation within 12″ of this Spiritseer bearer. Until your next Command phase starts, its attacks gain Precision on Critical Wounds. This is not unconditional Precision on every successful wound, and Torrent attacks cannot have Precision. Eligible formations: '+names(eligible)+'.',eligible);break;
   }
   case '000011044003':row('infiltrate','Pre-battle','either','during','This Shadowseer bearer’s formation has Infiltrators, including when the bearer started unattached. Deploy more than 8″ horizontally from enemy units and the opponent’s deployment zone.');break;
   case '000009769003':row('guiding','Shooting','own','start','Choose one visible friendly Aeldari Vehicle formation within 6″ of this actual Psyker bearer. Its ranged attacks gain +1 to Hit until phase end. Eligible Vehicles: '+names(vehicles)+'.',vehicles.filter(ranged));break;
   case '000009919003':ownRow('whispers','Shooting','own','during','After this Warlock bearer finishes shooting, select one enemy hit by its own attacks to take a Battle-shock test. Hits made only by its Bodyguards do not trigger this effect.');break;
   case '000009923003':for(const phase of phases)row('warding',phase,'either','during','Every model in this bearer’s formation has Feel No Pain 4+ against mortal wounds, Psychic attacks and Critical Wounds from Devastating Wounds attacks. Other damage uses the model’s normal defensive abilities.');break;
   case '000009915003':row('escape','Movement','opponent','during','When an engaged enemy that is neither a Monster nor a Vehicle Falls Back from this bearer’s formation, all its models take Desperate Escape tests, at −1 if that enemy is Battle-shocked.');break;
   case '000009927003':
    if(aspectLead){
     for(const phase of ['Shooting','Fight'] as const)row('wisdom',phase,phase==='Fight'?'either':'own','during','When this bearer’s Aspect Warriors formation is selected to shoot or fight, its models receive both Path of the Warrior abilities: re-roll Hit rolls of 1 and Wound rolls of 1 until phase end. '+leaderPersistence);
     if(ranged(f))row('wisdom-snap','Movement','opponent','end','When selected to shoot during Fire Overwatch, this eligible bearer’s formation receives both Path of the Warrior re-rolls until phase end. Re-rolls apply to snap shooting. '+leaderPersistence);
    }break;
   case '000009899003':ownRow('token','Start of battle round','either','start','Receive 1 additional Battle Focus token if this bearer is on the battlefield or is embarked in a Transport on the battlefield. A bearer and its Transport both in Reserves do not supply the token.');break;
   case '000011048003':
    row('assassin','Shooting','own','during','This upgraded Rangers or Shroud Runners formation’s ranged attacks gain +1 AP against Character units.');
    if(ranged(f))row('assassin-snap','Movement','opponent','end','During Fire Overwatch, this upgraded formation retains +1 AP against Character units; this does not require a Critical Hit.');break;
   case '000009919004':ownRow('attacks','Fight','either','during','Only this Ynnari Archon bearer’s melee weapons gain +2 Attacks.');break;
   case '000009927004':if(aspectLead)for(const [phase,turn] of incoming)row('shimmer',phase,turn,'during','Ranged attacks targeting this bearer’s Aspect Warriors formation suffer −1 to Wound. '+leaderPersistence);break;
   case '000009907004':row('mists','Command','own','during','Choose one Wraith Construct formation within 12″ of this Spiritseer bearer. Until your next Command phase starts, its models receive cover against ranged attacks unless the attacking model is within 18″. Eligible formations: '+names(wraith)+'.',wraith);break;
   case '000010699004':
    row('munitions','Shooting','own','during','Ranged weapons of every model in this upgraded Anhrathe formation have Anti-Monster 5+ and Anti-Vehicle 5+: unmodified Wound rolls of 5+ against those targets are Critical Wounds.');
    if(ranged(f))row('munitions-snap','Movement','opponent','end','During Fire Overwatch, this upgraded formation’s ranged weapons retain Anti-Monster 5+ and Anti-Vehicle 5+. Snap shooting prevents Critical Hits, not Critical Wounds.');break;
   case '000009923004':
    ownRow('range','Shooting','own','during','Only this bearer’s ranged Psychic weapons gain +12″ Range. This does not extend psychic abilities, auras or non-Psychic weapons.');
    ownRow('range-snap','Movement','opponent','end','This bearer’s ranged Psychic weapons retain +12″ Range during Fire Overwatch. The Stratagem’s own target-range restriction still applies.');break;
   case '000009899004':for(const phase of phases)row('reroll',phase,'either','during','Once per battle round, you may target this bearer’s formation with Command Re-roll for 0 CP. Use its normal roll eligibility and timing; this does not allow a re-roll to be re-rolled or an extra use where another rule forbids it.');break;
   case '000009915004':for(const phase of ['Shooting','Fight'] as const)ownRow('jest',phase,phase==='Fight'?'either':'own','during','When this Death Jester bearer attacks an enemy Below Half-strength, every successful Hit roll is a Critical Hit. This applies to ranged and melee attacks. It cannot turn snap shots into Critical Hits, because snap shooting prohibits them.');break;
   case '000009903004':
    for(const phase of ['Shooting','Fight'] as const)ownRow('seerstrike',phase,phase==='Fight'?'either':'own','during','Only this Asuryani Mounted Psyker bearer’s Psychic weapons have Anti-Monster 2+ and Anti-Vehicle 2+. Unmodified Wound rolls of 2+ against those targets are Critical Wounds.');
    ownRow('seerstrike-snap','Movement','opponent','end','During Fire Overwatch, this bearer’s ranged Psychic weapons retain Anti-Monster 2+ and Anti-Vehicle 2+. Snap shooting prevents Critical Hits, not Critical Wounds.');break;
   case '000009911004':if(guardLead&&ranged(f))row('overwatch','Movement','opponent','end','Once per battle round, you may target this bearer’s Dire Avengers or Guardians formation with Fire Overwatch for 0 CP. Its hits are scored on unmodified 5+, or 4+ if within an objective marker you control. This replaces the usual snap-shot hit threshold, but does not permit Critical Hits. '+leaderPersistence);break;
   case '000010649004':
    ownRow('amusement','Shooting','own','during','When this Death Jester bearer uses Cruel Amusement, choose two of its printed abilities for its shrieker cannon instead of one.');
    ownRow('amusement-snap','Movement','opponent','end','When this Death Jester bearer uses Cruel Amusement during Fire Overwatch, choose two printed abilities. Sustained Hits cannot activate in snap shooting, which cannot score Critical Hits.');break;
   case '000010704004':
    row('choose','Pre-battle','either','start','At battle start, choose one actual Character model in this upgraded Anhrathe unit to receive Lord of Deceit. The aura belongs to that chosen model.');
    for(const phase of phases)ownRow('deceit',phase,'either','during','Once per turn, when the opponent targets an enemy unit within 12″ of the Character model chosen at battle start with a Stratagem, increase that use’s CP cost by 1. The chosen model must still be present to supply the aura. If the opponent cannot pay, no CP is spent and the Stratagem has no effect, but it counts as used; otherwise they must pay and resolve it.');break;
   case '000010649005':row('redeploy','Pre-battle','either','during','After both players deploy, select up to three Harlequins units and redeploy them. They may be placed in Strategic Reserves regardless of how many units are already there. Apply this to the complete selected formations and actual attached models. Eligible formations: '+names(harlequins)+'.');break;
   case '000010704005':for(const [phase,turn] of incoming)row('save',phase,turn,'during','Every model in this upgraded Anhrathe Infantry formation has a 5+ invulnerable save.');break;
   case '000010699005':row('fade','Shooting','opponent','during','When this upgraded Anhrathe Infantry formation is eligible for Fade Back after enemy shooting hits it, it may perform that manoeuvre without spending a Battle Focus token. It may do so despite another unit using Fade Back this phase, and does not block another unit from doing so. The formation still cannot perform two Agile Manoeuvres in one phase.');break;
   case '000009923005':for(const phase of phases)ownRow('torc',phase,'either','during','Once per turn, when the opponent targets an enemy unit within 12″ of this actual Psyker bearer with a Stratagem, you may increase that use’s CP cost by 1. If the opponent cannot pay, no CP is spent and it has no effect, but it counts as used. If they can pay the new cost, they must pay and resolve it.');break;
   case '000009903005':ownRow('echoes','Command','own','during','Roll a D6; gain 1 CP on 5+. Add 1 if this bearer is outside your deployment zone and a further 1 if it is inside the opponent’s deployment zone. Measure the actual bearer’s position and apply the normal cap on CP gained outside the standard Command-phase award.');break;
   case '000009915005':if(aeldariOriginallyLed(army,bearer))row('infiltrate','Pre-battle','either','during','While this Shadowseer bearer leads its formation, every model has Infiltrators. Deploy more than 8″ horizontally from enemy units and the opponent’s deployment zone. '+leaderPersistence);break;
   case '000009899005':
    ownRow('damage','Shooting','own','during','Only this Asuryani Psyker bearer’s ranged Psychic weapons gain +1 Damage.');
    ownRow('damage-snap','Movement','opponent','end','This bearer’s ranged Psychic weapons retain +1 Damage during Fire Overwatch; Bodyguards do not inherit it.');break;
   case '000009911005':
    if(led(body=>body.unit==='Storm Guardians')){
     row('flame','Shooting','own','during','For this bearer’s Storm Guardians formation, re-roll the number of attacks rolled for flamers and re-roll Damage rolls for fusion guns. Other weapon types do not receive these re-rolls. '+leaderPersistence);
     if(ranged(f))row('flame-snap','Movement','opponent','end','When this formation fires snap shots, retain its flamer Attacks and fusion-gun Damage re-rolls. Torrent weapons still hit automatically. '+leaderPersistence);
    }break;
   case '000009927005':if(aspectLead)row('oc','Pre-battle','either','during','Every model in this bearer’s Aspect Warriors formation gains +1 Objective Control. '+leaderPersistence);break;
   case '000009919005':ownRow('wounds','Fight','either','during','Only this Ynnari Succubus bearer may re-roll Wound rolls for its melee attacks.');break;
   case '000009907005':row('duty','Movement','opponent','during','When an enemy ends a move within 8″ of this Spiritseer bearer’s formation, if the formation is unengaged it may make a Normal move up to 6″. Normal-move restrictions still apply.');break;
  }
 }
 return rows;
}
