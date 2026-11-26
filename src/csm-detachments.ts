import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {CSM_ARMY_SHEETS,csmMusterUnits} from './csm-army-data';
import {CSM_ARMY_CARDS as CSM_CARDS,csmArmyModelLoadouts as csmModelLoadouts,csmArmyWeaponCount as csmWeaponCount} from './csm-army-loadouts';
import {csmKeywords} from './csm-keywords';
import {csmChosenMark} from './csm-muster-data';
import {csmFormations,csmCargoFormations} from './csm-transports';
import {csmCanDarkPact} from './csm-dark-pacts';
import {csmReactionShooting} from './csm-reactions';
import {csmCopiedIntrinsicReminders} from './csm-intrinsic';
import {csmCopiedCoreReminders} from './csm-datasheet-core';
import {eligibleCsmUpgrades,csmHasDeepStrike,csmSelectedDetachments,csmSoulLinkSources} from './csm-detachment-data';
import {CSM_STRATAGEMS} from './csm-detachments.generated';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Form={root:RosterInstance;members:readonly RosterInstance[]};
const pack='https://assets.warhammer-community.com/eng_wh40k_faction_pack_chaos_space_marines-vs0xkzuia9-omgej8huqu.pdf';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const defence=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const native=new Set(CSM_ARMY_SHEETS.map(s=>s.unit));
const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const surge='A surge requires the formation to be unengaged, not Battle-shocked and not to have moved this phase. Follow the closest-enemy ending requirements; it cannot move again this phase.';
const desperate='First take a Leadership test; failure inflicts D3 mortal wounds before resolving the Desperate Pact.';
const demise='For an Attached unit, an enemy-unit destruction trigger requires the last model that started in that formation to be destroyed; losing only a Bodyguard or Character does not suffice.';
const effects:Record<typeof CSM_STRATAGEMS[number]['id'],string>={
 '000008358004':'Before this Chaos Undivided formation shoots or fights, its attacks re-roll Wound rolls until this phase ends.',
 '000008358005':'Heal one model in this formation by up to 3 lost wounds. If it is Tzeentch and below Starting Strength, also return one destroyed non-Character model with full wounds. A destroyed Character cannot be returned to an Attached unit.',
 '000008358002':'Just after this eligible Character formation destroys an enemy unit in the Fight phase, choose one actual Heretic Astartes Character model in it. That model gains +1 Move, Toughness and Wounds, and its melee weapons gain +1 Attacks, Strength and Damage, for the rest of the battle. Damned, Daemon and Epic Hero formations cannot trigger this. Other models gain nothing. '+demise,
 '000008358006':'Until turn end, this formation may charge after Falling Back. If it has Slaanesh, it may also shoot and charge after Advancing or Falling Back.',
 '000008358007':'After enemy shooting target selection, this formation gains Stealth until phase end. If it has Nurgle, attacking models must also be within 18″ to target it with ranged attacks; the opponent may choose new targets.',
 '000008358003':'After enemy Fight target selection, each model in this formation destroyed before it has fought may fight on a 4+, adding 1 to that roll if the formation has Khorne. Resolve that model after the attacker finishes, then remove it; this lasts until phase end.',
 '000008961006':'Before this non-Tzeentch formation shoots in your Shooting phase, its ranged weapons gain Ignores Cover and the Attacks characteristic of its Torrent weapons becomes 6, until phase end.',
 '000008961003':'After enemy shooting or Fight target selection, worsen the AP of attacks targeting this non-Damned formation by 1 until that attacking unit finishes its attacks. This does not last for the whole phase.',
 '000008961004':'While this non-Damned formation is engaged with your focus of hatred, give it Fights First until this Fight phase ends.',
 '000008961002':'Just after your focus of hatred is destroyed, choose one enemy visible to and within 12″ of this non-Damned Character formation. Treat it as the focus of hatred until your next Command phase starts. '+demise,
 '000008961007':'After an enemy ends a Normal, Advance or Fall Back move in the opponent’s Movement phase, this unengaged non-Damned Infantry or Mounted formation within 8″ may make a Normal move up to 6″.',
 '000008961005':'This non-Damned Infantry or Mounted formation may shoot after Advancing or Falling Back until turn end. Its equipped bolt pistols, boltguns and combi-bolters gain Devastating Wounds only while the formation has inflicted fewer than 6 wounds this turn using that ability. Other weapons do not receive it.',
 '000008965004':'Before this formation shoots, it re-rolls ranged Hit rolls against enemies below Starting Strength and also Wound rolls against enemies Below Half-strength, until this Shooting phase ends.',
 '000008965003':'At the start of your Charge phase, select this formation. Until phase end, add 1 to its Charge rolls for each other friendly Heretic Astartes formation that has already made a Charge move this phase, to a maximum of +3.',
 '000008965005':'Just after this formation Falls Back in your Movement phase, it may shoot for the rest of the turn.',
 '000008965006':'After an enemy ends a Normal, Advance or Fall Back move in the opponent’s Movement phase, this unengaged Infantry or Mounted formation within 8″ may make a Normal move up to 6″.',
 '000008965007':'At the start of the opponent’s Reinforcements step, enemy units arriving from Reserves cannot be set up within 12″ horizontally of this formation until the Movement phase ends.',
 '000008965002':'Just after an enemy non-Titanic model with Deadly Demise is destroyed within 18″ of this Character formation, its Deadly Demise automatically inflicts mortal wounds. Do not roll its trigger die; still roll any random damage amount.',
 '000008969003':'Before this formation fights, its melee attacks against enemies within range of an objective marker gain Precision until phase end.',
 '000008969002':'After enemy shooting or Fight target selection, worsen the AP of attacks targeting this non-Damned formation by 1 until that attacking unit finishes its attacks, not for the entire phase.',
 '000008969006':'Before this formation shoots or fights in your own phase, select it only if it disembarked from a Transport this turn. Its attacks against enemies within range of an objective marker re-roll Hit and Wound rolls until phase end.',
 '000008969007':'This Infantry or Mounted formation may charge after Advancing until the Charge phase ends. Add 1 to its Charge roll if at least one declared target is within range of an objective marker.',
 '000008969004':'At the end of either Fight phase, select this formation if it was eligible to fight at any point that phase. If unengaged, it may make a Normal move up to 6″, or 12″ if Mounted; otherwise it may Fall Back. It cannot embark after this move if it disembarked this turn. Warp Talons may then use Warp Strike only if they destroyed an enemy unit this phase.',
 '000008969005':'Before this Transport or Mounted formation moves, replace its Advance roll with +6″ Move if it Advances this Movement phase.',
 '000008973004':'Before this Infantry formation shoots, its ranged attacks against enemies that are Battle-shocked or Below Half-strength re-roll Hit and Wound rolls until phase end.',
 '000008973002':'Before this Infantry formation fights, improve its melee AP by 1 against Battle-shocked or Below Half-strength enemies until phase end.',
 '000008973003':'Just after this formation destroys an enemy Character unit in the Fight phase, every enemy unit visible to and within 12″ of this formation takes a Battle-shock test. '+demise,
 '000008973007':'At the end of the opponent’s Movement phase, this unengaged Infantry formation may charge one eligible enemy within 6″ that Fell Back this turn. Only that enemy may be targeted. This out-of-turn charge gives no Charge bonus.',
 '000008973005':'Just after this Infantry formation Falls Back in your Movement phase, it may charge for the rest of the turn.',
 '000008973006':'From battle round 2, set this reserved Jump Pack formation up in your Reinforcements step more than 6″ horizontally from all enemies. It cannot charge this turn. One visible enemy Infantry or Mounted unit within 9″ then takes a Battle-shock test.',
 '000008977004':'Before this formation shoots, successful unmodified ranged Hit rolls of 5+ become Critical Hits against enemies Below Half-strength until phase end.',
 '000008977005':'Before this engaged formation shoots in your Shooting phase, its non-Blast ranged weapons gain Pistol until phase end. Blast weapons do not gain Pistol.',
 '000008977002':'Before this formation fights, select it only if attacks targeted it earlier this Fight phase. Its melee attacks re-roll Hit rolls, and also Wound rolls if it is Below Half-strength, until phase end.',
 '000008977003':'After enemy Fight target selection, each melee attack allocated to this non-Damned Infantry formation supplies one D6, to a maximum of six per attacking unit. Roll after that attacker finishes; each 4+ inflicts one mortal wound on it. This lasts until phase end.',
 '000008977006':'After enemy shooting target selection, every model in this non-Damned formation gains Feel No Pain 5+ until the Shooting phase ends.',
 '000008977007':'At the start of the opponent’s Charge phase, enemy Charge rolls targeting this formation suffer −2 until phase end. This does not stack with any other negative modifier to that Charge roll.',
 '000008982002':'Before this Damned formation shoots or fights, it may make a Desperate Pact. '+desperate+' If it does, its attacks re-roll Hit rolls until phase end; if the test did not fail, they also re-roll Wound rolls.',
 '000008982004':'Before this Damned formation fights, it may make a Desperate Pact. '+desperate+' It then suffers another D3 mortal wounds. Its melee weapons gain +1 Attacks until phase end, and +1 Strength as well if the test did not fail.',
 '000008982005':'Before this Damned formation shoots, it may make a Desperate Pact. '+desperate+' If it does, improve ranged AP by 1 until phase end; if the test did not fail, also improve ranged Strength by 1.',
 '000008982003':'After enemy Fight target selection, roll one D6 for each model in this Damned formation destroyed by that attacker. Each 6 inflicts one mortal wound on the attacker after all its attacks finish. The effect expires when that attacker finishes.',
 '000008982006':'This Damned formation may declare a charge after Advancing for the rest of the turn.',
 '000008982007':'After enemy shooting target selection, choose this targeted Heretic Astartes formation and a different friendly Damned formation within 3″, visible to both it and the attacker. Until phase end, while the Damned formation survives and is visible to an attacking model and an eligible target of its attack, skip that attack’s Wound roll against the protected formation; instead inflict mortal wounds on the Damned formation equal to the attack’s Damage.',
 '000008986002':'Before this Daemon Vehicle formation shoots or fights, improve its attacks’ AP by 1 until phase end if it invokes its contract. A vehicle granted Daemon by Daemonic Possession qualifies only after that grant.',
 '000008986004':'Give this currently non-Daemon Heretic Astartes Vehicle formation the Daemon keyword for the rest of the battle.',
 '000008986003':'Before this non-Titanic Daemon Vehicle formation fights, if it invokes its contract, roll one D6 for each enemy model its melee attacks destroy. Each 5+ heals one lost wound after all its attacks finish, to a maximum of 6 healed wounds. This expires at phase end.',
 '000008986007':'When an engaged enemy non-Monster, non-Vehicle unit Falls Back in the opponent’s Movement phase, every model in it takes a Desperate Escape test. Subtract 1 from those tests if it is Battle-shocked. This Daemon Vehicle or Vashtorr formation applies the effect to each qualifying enemy Falling Back from it until phase end.',
 '000008986006':'After an enemy ends a Normal, Advance or Fall Back move in the opponent’s Movement phase, this unengaged Daemon Vehicle or Vashtorr formation within 8″ may make a Normal move up to 6″, ending as close to that enemy as possible.',
 '000008986005':'Before this Daemon Vehicle or Vashtorr formation moves or charges in your phase, its Normal, Advance and Charge moves may pass horizontally through terrain features until phase end. It must still end in a legal position.',
 '000009774004':'Before this Infantry formation fights, its melee attacks re-roll Wound rolls against Character units until phase end. After fighting, if those attacks destroyed an enemy Character model, one enemy unit within 6″ takes a Battle-shock test; test every enemy within 6″ instead if those attacks destroyed the enemy Warlord.',
 '000009774003':'After enemy Fight target selection, each model in this Infantry formation destroyed before it has fought may fight on a 4+, subtracting 1 from the die if the formation has Damned. Resolve that fight after the attacker finishes, then remove the model. This lasts until phase end.',
 '000009774007':'At the start of your Charge phase, this Infantry formation may declare a charge after Advancing for the rest of the turn.',
 '000009774006':'Return one destroyed non-Character model to this non-Damned Infantry formation, or D3 if it has Battleline. This cannot return a destroyed Character to an Attached unit.',
 '000009774005':'This non-Damned Infantry formation suffers D3 mortal wounds, then gains one selected Experimental Augmentation in addition to its existing augmentations until your next Command phase starts.',
 '000009774002':'After enemy shooting or Fight target selection, attacks targeting this Infantry formation suffer −1 to Hit until phase end.',
 '000010152002':'Heal D3+1 lost wounds in this Psyker or Daemon formation; Khorne formations cannot be selected.',
 '000010152003':'At the start of your Shooting phase, choose one visible enemy within 12″ of this Psyker formation and roll one D6. On 1 inflict one mortal wound; on 2–4 inflict D3; on 5–6 inflict 2D3. These wounds are a Psychic attack.',
 '000010152004':'When this Psyker formation is selected to shoot in your Shooting phase, its ranged attacks gain Ignores Cover until phase end.',
 '000010642004':'Just after this formation destroys an enemy unit in the Fight phase, every visible enemy within 6″, excluding Monsters and Vehicles, takes a Battle-shock test. '+demise,
 '000010642003':'Before this Infantry formation shoots or fights, its attacks re-roll Hit rolls against Battle-shocked or Below Half-strength enemies until phase end.',
 '000010642005':'This Infantry formation may charge after Advancing until the Charge phase ends.',
 '000010642007':'After this formation has arrived from Reserves this turn, choose one visible enemy within 12″, excluding Monsters and Vehicles. That enemy takes a Battle-shock test with −1 to the result.',
 '000010642006':'Just after this Infantry formation Falls Back in your Movement phase, it may shoot and charge for the rest of the turn.',
 '000010642002':'Before this Infantry formation shoots or fights, improve its attacks’ AP by 1 against Battle-shocked or Below Half-strength enemies until phase end.',
 '000010689005':'In your own Fight phase, this formation gains +1 melee Attacks until phase end only if it made a Charge move this turn.',
 '000010689002':'Give this Damned formation one benefit until your next turn starts: improve ranged Ballistic Skill by 1, add 1 to the Attacks of its Rapid Fire weapons, or improve its models’ Save by 1.',
 '000010689004':'When this non-Monster, non-Vehicle formation Advances, replace the Advance roll with +6″ Move for this phase.',
 '000010689003':'This non-Monster, non-Vehicle formation may shoot and charge after Advancing for the rest of the turn.',
 '000010689006':'After enemy shooting causes this formation to lose one or more wounds, it may surge up to D6″. '+surge,
 '000010689007':'At the end of the opponent’s Fight phase, place this unengaged non-Monster, non-Vehicle formation in Strategic Reserves only if it is within 6″ of a battlefield edge.',
 '000010695006':'When this formation is selected to shoot in your Shooting phase, improve its ranged AP by 1 until phase end.',
 '000010695003':'Before this non-Damned Infantry or Mounted formation shoots or fights, its attacks against your Vendetta target gain +1 to Wound until phase end.',
 '000010695002':'When this formation is selected to shoot or fight, choose Lethal Hits or Sustained Hits 1 for its weapons until phase end.',
 '000010695005':'Choose an objective controlled by and within range of this formation. It stays under your control until the opponent has greater control over it at a phase end.',
 '000010695007':'After enemy shooting hits this non-Monster, non-Vehicle formation, it may make a Normal move of up to D6″. This is a Normal move, not a surge.',
 '000010695004':'After enemy Fight target selection, each model in this formation destroyed before it has fought may fight on a 4+ after the attacker finishes, then is removed. This lasts until phase end.',
 '000010740007':'Before this formation declares a charge, add 2 to its Charge rolls this phase only if it was set up using Deep Strike this turn.',
 '000010740002':'After enemy shooting or Fight target selection, worsen the AP of attacks targeting this non-Damned formation by 1 until that attacking unit finishes. The same formation cannot also receive Armour of Corruption this phase.',
 '000010740006':'Before they shoot, select up to two formations that used Deep Strike to arrive this turn. Their ranged weapons gain Ignores Cover until your Shooting phase ends.',
 '000010740004':'This Terminator, Obliterators or Mutilators formation may shoot and charge after Advancing for the rest of the turn.',
 '000010740005':'Choose an objective controlled by and within range of this Terminator, Obliterators or Mutilators formation. It stays yours until the opponent has greater control at a phase end.',
 '000010740003':'After enemy Fight target selection, models in this Terminator, Obliterators or Mutilators formation reduce incoming attack Damage by 1, to the normal minimum of 1, until turn end. The same formation cannot also receive Empyric Dislocation this phase.',
 '000010744004':'Before this Soul Forge formation shoots or fights, its attacks re-roll Wound rolls against Character, Monster or Vehicle units until phase end.',
 '000010744002':'Before this non-Damned formation has shot or fought, its next Dark Pact this phase may grant both Lethal Hits and Sustained Hits 1. The pact still requires its Leadership test; snap shooting cannot score Critical Hits.',
 '000010744003':'Before this Soul Forge formation shoots or fights, improve its attacks’ AP by 1 until phase end.',
 '000010744005':'Heal one model in this non-Damned formation by up to D3 wounds, or up to 3 wounds instead if the formation has Soul Forge.',
 '000010744007':'After enemy shooting target selection, models in this Soul Forge formation gain +1 Toughness until phase end.',
 '000010744006':'Just after this formation Advances in your Movement phase, it may shoot for the rest of the turn. If it has Soul Forge, it may also charge after that Advance.',
 '000010985004':'After enemy shooting target selection, attacks against this Havocs or Obliterators formation with Strength greater than its Toughness suffer −1 to Wound until phase end.',
 '000010985003':'After an enemy ends a move within 8″ of this unengaged Havocs formation in the opponent’s Movement phase, it may make a Normal move up to D3+3″.',
 '000010985002':'When this Havocs or Obliterators formation shoots in your Shooting phase and makes a Dark Pact, its ranged attacks gain both Lethal Hits and Sustained Hits 1 until phase end. Resolve the pact’s Leadership test normally.',
 '000010989004':'After this Warp Talons formation ends a move in your Movement phase, choose one visible enemy within 9″, excluding Monsters and Vehicles. That enemy takes a Battle-shock test with −1 to the result.',
 '000010989002':'When this Infantry Fly formation fights after making a Charge move this turn, its melee attacks gain Lance until this Fight phase ends.',
 '000010989003':'When this Infantry Fly formation is selected to Fall Back in your Movement phase, that Fall Back does not prevent it from declaring a charge this turn.'
};

export function csmDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const legal=new Set(csmMusterUnits(army));
 const active=roster.filter(s=>native.has(s.unit)&&legal.has(s.unit)),current={...army,instances:[...roster]},original=expandRoster(army);
 const forms:Form[]=csmFormations(army,active),detachments=csmSelectedDetachments(current),has=(name:string)=>detachments.includes(name);
 const modelCache=new Map<string,ReturnType<typeof csmModelLoadouts>>(),tagCache=new Map<string,Set<string>>();
 const models=(s:RosterInstance)=>{let result=modelCache.get(s.id);if(!result){result=csmModelLoadouts(s);modelCache.set(s.id,result);}return result;};
 const tag=(s:RosterInstance,k:string,model?:string)=>{const id=s.id+'\0'+(model??'');let tags=tagCache.get(id);if(!tags){tags=csmKeywords(army,s,model,roster);tagCache.set(id,tags);}return tags.has(k);};
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const named=(f:Form,...units:string[])=>f.members.some(s=>units.includes(s.unit));
 const readWeapons=(f:Form,phase:'Shooting'|'Fight',required?:string,excluded?:string)=>f.members.flatMap(s=>(CSM_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase===phase&&csmWeaponCount(s,w.name)>0&&models(s).some(m=>(!required||tag(s,required,m.model))&&(!excluded||!tag(s,excluded,m.model))&&m.items.some(i=>key(i)===key(w.name)))).map(w=>({s,...w})));
 const weaponCache=new Map<string,ReturnType<typeof readWeapons>>();
 const weapons=(f:Form,phase:'Shooting'|'Fight',required?:string,excluded?:string)=>{const id=f.members.map(s=>s.id).join('\0')+'|'+phase+'|'+required+'|'+excluded;let result=weaponCache.get(id);if(!result){result=readWeapons(f,phase,required,excluded);weaponCache.set(id,result);}return result;};
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0,melee=(f:Form)=>weapons(f,'Fight').length>0;
 const hitGuns=(f:Form)=>weapons(f,'Shooting').some(w=>!w.abilities.includes('torrent'));
 const movable=(f:Form)=>!kw(f,'AIRCRAFT')&&!kw(f,'FORTIFICATION');
 const infantry=(f:Form)=>kw(f,'INFANTRY'),infantryMounted=(f:Form)=>infantry(f)||kw(f,'MOUNTED');
 const deepStrike=(f:Form)=>f.members.length>0&&f.members.every(s=>csmHasDeepStrike(current,s));
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const selected=(s:RosterInstance)=>current.upgrades2026?.[s.id]??current.upgrades2026?.[s.unit]??s.enhancement;
 const upgraded=(s:RosterInstance,name:string)=>selected(s)===name&&eligibleCsmUpgrades(current,s.unit,s.id).some(u=>u.name===name);
 const csm=forms.filter(f=>kw(f,'HERETIC ASTARTES')),nonDamned=csm.filter(f=>!kw(f,'DAMNED')),damned=csm.filter(f=>kw(f,'DAMNED'));
 const linkPsykers=csm.filter(f=>!kw(f,'PSYKER')&&f.members.some(s=>upgraded(s,'Soul Link')&&csmSoulLinkSources(army,s).length>0));
 const inf=csm.filter(infantry),vehicles=csm.filter(f=>kw(f,'VEHICLE')),psyker=csm.filter(f=>kw(f,'PSYKER')||linkPsykers.includes(f));
 const linkCondition=(fs:readonly Form[])=>{const conditional=fs.filter(f=>linkPsykers.includes(f));return conditional.length?' These formations qualify as Psyker only while Soul Link has actually been used and its temporary PSYKER grant remains active: '+names(conditional)+'.':'';};
 const daemonVehicles=vehicles.filter(f=>kw(f,'DAEMON')),possibleDaemonVehicles=has('Soulforged Warpack')?vehicles:daemonVehicles;
 const soulForge=csm.filter(f=>kw(f,'SOUL FORGE')),warpstrike=csm.filter(f=>kw(f,'TERMINATOR')||named(f,'Obliterators','Mutilators'));
 const flyInfantry=inf.filter(f=>kw(f,'FLY')),firepower=csm.filter(f=>named(f,'Havocs','Obliterators'));
 const pact=(f:Form)=>csmCanDarkPact(current,f.members);
 const carriers=original.filter(s=>csmKeywords(army,s).has('TRANSPORT'));
 const canRide=(f:Form)=>carriers.some(carrier=>{
  const available=active.some(s=>s.id===carrier.id)?active:[...active,carrier];
  return csmCargoFormations(army,carrier,available).some(group=>group.root.id===f.root.id);
 });
 const reactions=csm.filter(f=>f.members.some(s=>csmReactionShooting(current,s,roster).length));
 const reaction=(f:Form)=>f.members.flatMap(s=>csmReactionShooting(current,s,roster));
 const rows:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],rule?:string,reference=pack)=>{
  if(!units.length)return;
  const uid='11e-csm-det-'+id+'-'+window+'-'+turn+'-'+timing,ids=[...new Set(units.map(s=>s.id))],existing=rows.find(r=>r.id===uid);
  if(existing){if(!existing.summary.includes(summary))existing.summary+=' '+summary;existing.units=[...new Set([...(existing.units??[]),...ids])];return;}
  rows.push({id:uid,title,window,turn,timing,summary,units:ids,source:reference,sourceRuleId:rule,origin:'detachment'});
 };
 const card=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:readonly Form[],rule?:string)=>emit(id,title,window,turn,timing,summary,roots(fs),rule);
 const snap=(id:string,title:string,body:string,fs:readonly Form[],rule?:string)=>card(id,title,'Movement','opponent','end',body,fs.filter(f=>ranged(f)&&!kw(f,'TITANIC')),rule);
 const safeDefence=(id:string,title:string,body:string,fs:readonly Form[],rule?:string)=>{for(const [p,t] of defence)card(id,title,p,t,p==='Movement'?'end':'during',body,fs,rule);};
 const normalFire=(id:string,title:string,body:string,fs:readonly Form[],rule?:string,needHits=false)=>{
  card(id,title,'Shooting','own','during',body,fs.filter(needHits?hitGuns:ranged),rule);
  for(const f of reactions.filter(f=>fs.includes(f)&&(needHits?hitGuns(f):ranged(f))))card(id+'-reaction-'+f.root.id,title+' · reaction shooting','Shooting','opponent','during','Only when surviving models shoot through '+reaction(f).join('; ')+': '+body,[f],rule);
 };
 if(has('Pactbound Zealots')){
  card('marks-declare','Marks of Chaos','Pre-battle','either','during','Use each eligible unit’s selected Mark of Chaos. Psykers cannot choose Khorne. Leaders and their Bodyguards, and Transports and embarked units, must share the same Mark. Fixed printed marks and a Daemon Prince’s mandatory Daemonic Allegiance remain in force. Actual unit marks: '+csm.flatMap(f=>f.members).map(s=>s.id+': '+(csmChosenMark(army,s)??'no Mark')).join('; ')+'.',csm,'000008362');
  normalFire('marks-shoot','Marks of Chaos','Only after this formation makes a Dark Pact and passes its Leadership test: Tzeentch Lethal Hits or Nurgle Sustained Hits 1 score Critical Hits on unmodified 5+; Chaos Undivided re-rolls Hit rolls of 1. Apply the matching chosen Dark Pact benefit until phase end. Snap shooting cannot gain these Critical Hit or Hit re-roll benefits.',csm.filter(f=>pact(f)&&['TZEENTCH','NURGLE','CHAOS UNDIVIDED'].some(k=>kw(f,k))),'000008362',true);
  card('marks-fight','Marks of Chaos','Fight','either','during','Only after making a Dark Pact and passing its Leadership test: Khorne Lethal Hits or Slaanesh Sustained Hits 1 score Critical Hits on unmodified 5+; Chaos Undivided re-rolls Hit rolls of 1. Apply the matching chosen Dark Pact benefit until phase end.',csm.filter(f=>pact(f)&&melee(f)&&['KHORNE','SLAANESH','CHAOS UNDIVIDED'].some(k=>kw(f,k))),'000008362');
 }
 if(has('Veterans of the Long War')){
  card('focus-select','Focus of Hatred','Command','own','start','Select one enemy as your focus of hatred until your next Command phase starts; the publisher FAQ permits selecting an embarked enemy. Only HERETIC ASTARTES models excluding DAMNED re-roll Hit rolls against it.',csm,'000008959');
  const targets=csm.filter(f=>f.members.some(s=>models(s).some(m=>tag(s,'HERETIC ASTARTES',m.model)&&!tag(s,'DAMNED',m.model))));
  normalFire('focus-fire','Focus of Hatred','Only HERETIC ASTARTES models excluding DAMNED re-roll Hit rolls against the current focus of hatred. Other models in their formation do not gain the benefit.',targets.filter(f=>weapons(f,'Shooting','HERETIC ASTARTES','DAMNED').some(w=>!w.abilities.includes('torrent'))),'000008959',true);
  card('focus-fight','Focus of Hatred','Fight','either','during','Only HERETIC ASTARTES models excluding DAMNED re-roll Hit rolls against the current focus of hatred.',targets.filter(f=>weapons(f,'Fight','HERETIC ASTARTES','DAMNED').length),'000008959');
 }
 if(has('Deceptors'))card('misdirection','Masters of Misdirection','Pre-battle','either','during','During Declare Battle Formations, choose up to two Legionaries and two Cultist Mob units in Incursion, or three of each in Strike Force. Those chosen units and their attached non-Epic Character units have Infiltrators for this battle. This is an optional declaration; it does not grant Infiltrators to every eligible formation.',csm.filter(f=>named(f,'Legionaries','Cultist Mob')),'000008963');
 if(has('Renegade Raiders')){
  card('raiders-assault','Raiders and Reavers · Assault','Movement','own','during','HERETIC ASTARTES models’ ranged weapons have Assault and may be fired after Advancing.',csm.filter(f=>ranged(f)&&movable(f)),'000008967');
  normalFire('raiders-fire','Raiders and Reavers','HERETIC ASTARTES models’ ranged weapons have Assault. Their attacks improve AP by 1 against enemies within range of an objective marker.',csm,'000008967');
  card('raiders-fight','Raiders and Reavers','Fight','either','during','HERETIC ASTARTES models’ attacks improve AP by 1 against enemies within range of an objective marker.',csm.filter(melee),'000008967');
  snap('raiders-snap','Raiders and Reavers · snap shooting','During Fire Overwatch, HERETIC ASTARTES models retain +1 AP against enemies within range of an objective marker.',csm,'000008967');
 }
 if(has('Dread Talons')){
  card('terror-command','Terror Descends','Command','opponent','during','In the opponent’s Battle-shock step, enemies below Starting Strength within 12″ of one or more of these formations must test at −1. Those affected enemies do not take any other Battle-shock tests that phase.',csm,'000008971');
  for(const p of phases)card('terror-tests','Terror Descends · test modifier',p,'either','during','Subtract 1 from Battle-shock tests taken by enemies within 12″ of one or more of these formations. Multiple nearby formations do not multiply this modifier.',csm,'000008971');
 }
 if(has('Fellhammer Siege-host'))for(const [p,t] of defence.filter(([p])=>p!=='Fight'))card('iron','Iron Fortitude',p,t,p==='Movement'?'end':'during','When ranged attacks target this non-Damned formation and the attack’s Strength exceeds the formation’s Toughness, subtract 1 from that attack’s Wound roll.',nonDamned,'000008975');
 if(has('Chaos Cult')){
  for(const p of ['Movement','Charge'] as const)card('devotion','Desperate Devotion',p,'own','during','When this Damned formation with Dark Pacts is selected to make a Normal or Advance move, or declares a charge, it may make a Desperate Pact unless it arrived from Reserves this turn. '+desperate+' It gains +2″ Move and +2 to Charge rolls until phase end; the benefit still applies if the test failed.',damned.filter(f=>pact(f)&&movable(f)),'000008979');
  card('cult-battleline','Chaos Cult · Battleline','Pre-battle','either','during','Traitor Guardsmen Squad units gain Battleline while this detachment is selected; apply that keyword and its copy limit.',csm.filter(f=>named(f,'Traitor Guardsmen Squad')),'000008980');
 }
 if(has('Soulforged Warpack')){
  const debt='When a HERETIC ASTARTES DAEMON VEHICLE formation makes a Dark Pact, it may invoke its contract: subtract 1 from that Pact’s Leadership test, and gain +1 to ranged Wound rolls and +2 Attacks to melee weapons until phase end. A currently non-Daemon Vehicle qualifies only after Daemonic Possession actually grants DAEMON.';
  normalFire('debt-shoot','Debt to the Soul Forge',debt,possibleDaemonVehicles.filter(pact),'000008984');
  card('debt-fight','Debt to the Soul Forge','Fight','either','during',debt,possibleDaemonVehicles.filter(f=>pact(f)&&melee(f)),'000008984');
  snap('debt-snap','Debt to the Soul Forge · snap shooting','During Fire Overwatch: '+debt+' The Wound modifier works during snap shooting even though Dark Pact Critical Hit benefits do not.',possibleDaemonVehicles.filter(pact),'000008984');
 }
 if(has('Creations of Bile')){
  const augmented=csm.filter(f=>f.members.some(s=>models(s).some(m=>tag(s,'HERETIC ASTARTES',m.model)&&tag(s,'INFANTRY',m.model)&&!tag(s,'DAMNED',m.model))));
  card('augment-choice','Experimental Augmentations','Pre-battle','either','during','At the start of the battle, choose one augmentation, or roll two D6 for two random augmentations; duplicate results grant no extra benefit. The six results grant HERETIC ASTARTES INFANTRY models excluding DAMNED: +1 melee Attacks, +2″ Move, +1 Weapon Skill, +1 Toughness, +1 melee Strength, or +1 Ballistic Skill. If Fabius Bile is your Warlord, you may re-roll one or both random dice. Fabius is not compulsory. The chosen benefits last for the battle, including after his destruction.',augmented,'000009772');
  for(const p of ['Movement','Shooting','Fight'] as const)card('augment-active','Experimental Augmentations',p,p==='Fight'?'either':'own','during','Apply only this battle’s chosen augmentations to actual HERETIC ASTARTES INFANTRY models excluding DAMNED: +2″ Move, +1 Toughness, +1 Ballistic Skill, +1 Weapon Skill, +1 melee Attacks and/or +1 melee Strength as selected. Other physical models do not inherit these model-specific changes. Ballistic Skill changes do not alter snap shooting.',augmented.filter(f=>p==='Movement'||(p==='Fight'?melee(f):ranged(f))),'000009772');
  safeDefence('augment-toughness','Experimental Augmentations · Toughness','Only if this battle’s augmentation grants +1 Toughness, apply it to actual HERETIC ASTARTES INFANTRY models excluding DAMNED when resolving the formation’s Toughness.',augmented,'000009772');
 }
 if(has('Cabal of Chaos')){
  card('wellspring-shoot','Empyric Wellspring','Shooting','own','during','When this non-Daemon Psyker formation makes a Dark Pact in your Shooting phase, its ranged weapons gain +1 Strength until phase end. This is a unit-wide benefit, including Bodyguards; its own-Shooting timing excludes reaction shooting and Fire Overwatch.'+linkCondition(psyker),psyker.filter(f=>!kw(f,'DAEMON')&&pact(f)&&ranged(f)),'000010150');
  card('wellspring-fight','Empyric Wellspring','Fight','either','during','When this non-Khorne Heretic Astartes Daemon Prince formation makes a Dark Pact, its melee weapons gain +2 Strength and +1 AP until phase end.',csm.filter(f=>named(f,'Heretic Astartes Daemon Prince','Heretic Astartes Daemon Prince With Wings')&&!kw(f,'KHORNE')&&pact(f)&&melee(f)),'000010150');
 }
 if(has('Nightmare Hunt')){
  card('manifest-shock','Terror Made Manifest','Command','opponent','during','In the opponent’s Battle-shock step, enemies below Starting Strength within 12″ of one or more of these formations must test at −1. Those affected enemies do not take any other Battle-shock tests that phase.',csm,'000010640');
  const body='HERETIC ASTARTES models gain +1 to Hit against enemies Below Half-strength and +1 to Wound against Battle-shocked enemies. Below Half-strength is strictly less than half.';
  normalFire('manifest-shoot','Terror Made Manifest',body,csm,'000010640');
  card('manifest-fight','Terror Made Manifest','Fight','either','during',body,csm.filter(melee),'000010640');
  snap('manifest-snap','Terror Made Manifest · snap shooting','During Fire Overwatch, HERETIC ASTARTES models retain +1 to Wound against Battle-shocked enemies. Snap shooting ignores the Hit modifier.',csm,'000010640');
  safeDefence('manifest-defence','Terror Made Manifest · defence','Battle-shocked enemy models suffer −1 to Hit when attacking this Heretic Astartes formation. This cannot reduce incoming snap-shooting Hit rolls.',csm,'000010640');
 }
 if(has('Huron’s Marauders')){
  const huron=active.filter(s=>s.unit==='Huron Blackheart'),voices=inf.filter(f=>f.members.some(s=>upgraded(s,'Voice of the Tyrant')));
  card('motivation-choice','Tyrannical Motivation','Command','own','start','Choose Huron’s Elite (+1 to Hit) or Mobile Marauders (shoot and charge after Falling Back) for your Heretic Astartes Infantry formations until your next Command phase starts.',inf,'000010687');
  for(const p of phases)card('motivation-huron','Tyrannical Motivation · Huron’s presence',p,'either','start','At the start of this phase, Heretic Astartes Infantry formations visible to a surviving Huron Blackheart gain both abilities for this phase. Check visibility afresh each phase; seeing him before a Fall Back does not automatically supply later Shooting or Charge permission. Huron sources: '+huron.map(s=>s.id).join(', ')+'.',huron.length?inf:[],'000010687');
  normalFire('motivation-fire','Tyrannical Motivation','If Huron’s Elite is currently active, this Infantry formation gains +1 to Hit. If Mobile Marauders is currently active, it can shoot after Falling Back. A grant from Huron’s visibility at this phase’s start persists until phase end if he is later destroyed. Voice of the Tyrant grants both only while its bearer remains.',inf,'000010687');
  card('motivation-fight','Tyrannical Motivation','Fight','either','during','If Huron’s Elite is currently active, this Infantry formation gains +1 to Hit in melee. A grant from Huron’s visibility at phase start persists to phase end if he is later destroyed. Voice of the Tyrant grants both abilities while its bearer remains.',inf.filter(melee),'000010687');
  for(const p of ['Movement','Charge'] as const)card('motivation-mobile','Tyrannical Motivation · Mobile Marauders',p,'own','during','If Mobile Marauders is active in the relevant phase, this Infantry formation may shoot and charge after Falling Back. A phase-only grant from Huron’s visibility must be checked again at the start of the Shooting or Charge phase.',inf.filter(movable),'000010687');
  if(voices.length)card('motivation-voice','Voice of the Tyrant','Command','own','start','These actual formations gain both Tyrannical Motivation abilities while their Voice of the Tyrant bearer remains.',voices,'000010688002');
 }
 if(has('Renegade Warband')){
  card('slaves-none','Slaves to None','Pre-battle','either','during','Heretic Astartes units lose Dark Pacts and the army cannot use Cults of the Dark Gods. Other selected detachments do not restore a removed Dark Pacts ability. HERETIC ASTARTES models’ ranged weapons have Assault.',csm,'000010691');
  card('slaves-assault','Slaves to None · Assault','Movement','own','during','HERETIC ASTARTES models’ ranged weapons have Assault, allowing those weapons to shoot after Advancing.',csm.filter(f=>ranged(f)&&movable(f)),'000010691');
  normalFire('slaves-fire','Slaves to None · Assault','HERETIC ASTARTES models’ ranged weapons have Assault. This detachment removes Dark Pacts.',csm,'000010691');
  card('vendetta-select','Vendetta','Command','own','start','Select one enemy as your Vendetta until your next Command phase starts. HERETIC ASTARTES models excluding DAMNED re-roll Hit rolls against it.',csm,'000010692');
  normalFire('vendetta-fire','Vendetta','Only HERETIC ASTARTES models excluding DAMNED re-roll Hit rolls against the current Vendetta.',csm.filter(f=>weapons(f,'Shooting','HERETIC ASTARTES','DAMNED').some(w=>!w.abilities.includes('torrent'))),'000010692',true);
  card('vendetta-fight','Vendetta','Fight','either','during','Only HERETIC ASTARTES models excluding DAMNED re-roll Hit rolls against the current Vendetta.',csm.filter(f=>weapons(f,'Fight','HERETIC ASTARTES','DAMNED').length),'000010692');
  card('doctrine','Twisted Doctrine','Movement','own','during','When this non-Battle-shocked formation is selected to move or is set up in your Movement phase, it may use a Twisted Doctrine. First take a Battle-shock test, then choose shoot and charge after Falling Back, or charge after Advancing, until turn end. The chosen permission still applies if that test fails.',csm.filter(movable),'000010693');
  for(const p of ['Shooting','Charge'] as const)card('doctrine-active','Twisted Doctrine · chosen permission',p,'own','during','If this formation used a Twisted Doctrine in your Movement phase, apply its chosen permission until turn end: shoot and charge after Falling Back, or charge after Advancing. The original Battle-shock test’s failure does not cancel that permission.',csm.filter(p==='Shooting'?ranged:movable),'000010693');
 }
 if(has('Warpstrike Champions'))card('portals','Warp Portals','End of opponent turn','opponent','end','Select up to one eligible unengaged Terminator, Obliterators or Mutilators formation in Incursion, or two in Strike Force, and place them in Strategic Reserves.',warpstrike,'000010738');
 if(has('Cult of the Arkifane')){
  card('soul-forge-keywords','Soul Forge Boons','Pre-battle','either','during','Heretic Astartes Vehicles gain Daemon. Heretic Astartes Vehicles, Lord Discordant on Helstalker and Vashtorr gain Soul Forge. Cybinfernal Font also grants Soul Forge to every model in its actual formation only while its bearer remains; Mark of the Soul Forges grants no keyword.',csm.filter(f=>kw(f,'VEHICLE')||kw(f,'SOUL FORGE')),'000010742');
  safeDefence('soul-forge-save','Soul Forge Boons · 5+ invulnerable save','Models in this Soul Forge formation have a 5+ invulnerable save. If Soul Forge comes only from Cybinfernal Font, surviving Bodyguards lose the grant when that bearer is removed.',soulForge,'000010742');
 }
 if(has('Devotees of Destruction'))normalFire('rain-ruin','Rain of Ruin','Havocs and Obliterators formations’ ranged weapons have Heavy. After Remaining Stationary, Heavy gives +1 to Hit on normal shooting; it does not modify snap-shooting Hit rolls.',firepower,'000010983',true);
 if(has('Murdertalon Raiders')){
  const body='This Heretic Astartes Infantry Fly formation re-rolls Hit rolls of 1 against enemies that are Battle-shocked or at or below half Starting Strength. Exactly half qualifies.';
  normalFire('prey-fire','Prey on the Weak',body,flyInfantry,'000010987',true);
  card('prey-fight','Prey on the Weak','Fight','either','during',body,flyInfantry.filter(melee),'000010987');
  safeDefence('prey-defence','Prey on the Weak · defence','Enemy units that are Battle-shocked or at or below half Starting Strength suffer −1 to Hit when attacking this Heretic Astartes Infantry Fly formation. Exactly half qualifies. This cannot modify incoming snap-shooting Hit rolls.',flyInfantry,'000010987');
 }
 for(const strat of CSM_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=csm,actors:RosterInstance[]|undefined,body=effects[strat.id],actualTurn:Turn=turn;
   const attacks=phase==='Fight'?melee:ranged,hitAttacks=phase==='Fight'?melee:hitGuns;
   switch(strat.id){
    case '000008358004':targets=csm.filter(f=>kw(f,'CHAOS UNDIVIDED')&&attacks(f));break;
    case '000008358002':actors=active.filter(s=>tag(s,'HERETIC ASTARTES')&&models(s).some(m=>tag(s,'CHARACTER',m.model))&&csm.some(f=>f.members.includes(s)&&!['DAMNED','DAEMON','EPIC HERO'].some(k=>kw(f,k))&&melee(f)));break;
    case '000008358003':case '000008969003':case '000008973003':case '000008977002':case '000010642004':case '000010689005':case '000010695004':targets=csm.filter(melee);break;
    case '000008358006':targets=csm.filter(movable);break;
    case '000008961006':targets=csm.filter(f=>!kw(f,'TZEENTCH')&&ranged(f));break;
    case '000008961003':case '000008969002':case '000008977006':case '000010740002':case '000010744005':targets=nonDamned;break;
    case '000008961004':targets=nonDamned.filter(melee);break;
    case '000008961002':targets=nonDamned.filter(f=>kw(f,'CHARACTER'));break;
    case '000008961007':targets=nonDamned.filter(f=>infantryMounted(f)&&movable(f));break;
    case '000008961005':targets=nonDamned.filter(f=>infantryMounted(f)&&ranged(f));break;
    case '000008965004':case '000010695006':targets=csm.filter(ranged);break;
    case '000008977004':targets=csm.filter(hitGuns);break;
    case '000008965003':case '000008969004':case '000010689006':targets=csm.filter(movable);break;
    case '000008965005':targets=csm.filter(f=>movable(f)&&ranged(f));break;
    case '000008965006':case '000008969007':targets=csm.filter(f=>infantryMounted(f)&&movable(f));break;
    case '000008965002':targets=csm.filter(f=>kw(f,'CHARACTER'));break;
    case '000008969006':targets=csm.filter(f=>attacks(f)&&canRide(f));break;
    case '000008969005':targets=csm.filter(f=>(kw(f,'TRANSPORT')||kw(f,'MOUNTED'))&&movable(f));break;
    case '000008973004':case '000010642003':case '000010642002':targets=inf.filter(strat.id==='000010642003'?hitAttacks:attacks);break;
    case '000008973002':case '000009774004':targets=inf.filter(melee);break;
    case '000008973007':case '000008973005':case '000009774007':case '000010642005':case '000010642006':targets=inf.filter(movable);break;
    case '000008973006':targets=csm.filter(f=>kw(f,'JUMP PACK')&&deepStrike(f));break;
    case '000008977005':targets=csm.filter(f=>weapons(f,'Shooting').some(w=>!w.abilities.includes('blast')));break;
    case '000008977003':targets=nonDamned.filter(infantry);break;
    case '000008982002':targets=damned.filter(f=>pact(f)&&attacks(f));break;
    case '000008982004':targets=damned.filter(f=>pact(f)&&melee(f));break;
    case '000008982005':targets=damned.filter(f=>pact(f)&&ranged(f));break;
    case '000008982003':targets=damned.filter(melee);break;
    case '000008982006':targets=damned.filter(movable);break;
    case '000008982007':targets=csm.filter(f=>damned.some(d=>d.root.id!==f.root.id));body+=' Eligible distinct Damned formations to check within 3″ and visible to both units: '+names(damned)+'.';break;
    case '000008986002':targets=possibleDaemonVehicles.filter(f=>pact(f)&&attacks(f));break;
    case '000008986004':targets=vehicles.filter(f=>!kw(f,'DAEMON'));break;
    case '000008986003':targets=possibleDaemonVehicles.filter(f=>!kw(f,'TITANIC')&&pact(f)&&melee(f));break;
    case '000008986007':case '000008986006':case '000008986005':targets=csm.filter(f=>(possibleDaemonVehicles.includes(f)||named(f,'Vashtorr The Arkifane'))&&movable(f));break;
    case '000009774003':case '000009774002':targets=inf;break;
    case '000009774006':case '000009774005':targets=nonDamned.filter(infantry);break;
    case '000010152002':targets=csm.filter(f=>(psyker.includes(f)||kw(f,'DAEMON'))&&!kw(f,'KHORNE'));break;
    case '000010152003':targets=psyker;break;
    case '000010152004':targets=psyker.filter(ranged);break;
    case '000010689002':targets=damned;break;
    case '000010689004':case '000010689003':case '000010689007':case '000010695007':targets=csm.filter(f=>!kw(f,'MONSTER')&&!kw(f,'VEHICLE')&&movable(f));break;
    case '000010695003':targets=csm.filter(f=>((infantry(f)&&!kw(f,'DAMNED'))||kw(f,'MOUNTED'))&&attacks(f));break;
    case '000010695002':targets=csm.filter(hitAttacks);break;
    case '000010740007':targets=csm.filter(f=>deepStrike(f)&&movable(f));break;
    case '000010740006':targets=csm.filter(f=>deepStrike(f)&&ranged(f));break;
    case '000010740004':targets=warpstrike.filter(movable);break;
    case '000010740005':case '000010740003':targets=warpstrike;break;
    case '000010744004':case '000010744003':targets=soulForge.filter(attacks);break;
    case '000010744007':targets=soulForge;break;
    case '000010744006':targets=csm.filter(f=>movable(f)&&(ranged(f)||kw(f,'SOUL FORGE')));break;
    case '000010744002':
     // Both granted benefits require Critical Hits: neither can function in
     // Overwatch. Only real normal shooting or fighting offers a useful window.
     if(phase!=='Shooting'&&phase!=='Fight')continue;
     targets=nonDamned.filter(f=>pact(f)&&hitAttacks(f));actualTurn=phase==='Shooting'?'own':'either';
     if(phase==='Shooting')for(const f of reactions.filter(f=>targets.includes(f)))card(strat.id+'-reaction-'+f.root.id,strat.name+' · '+strat.cp+'CP','Shooting','opponent','during','Only before normal shooting through '+reaction(f).join('; ')+': '+body,[f],strat.id);
     break;
    case '000010985004':targets=firepower;break;
    case '000010985003':targets=csm.filter(f=>named(f,'Havocs')&&movable(f));break;
    case '000010985002':targets=firepower.filter(f=>pact(f)&&hitGuns(f));break;
    case '000010989004':targets=csm.filter(f=>named(f,'Warp Talons')&&movable(f));break;
    case '000010989002':targets=flyInfantry.filter(melee);break;
    case '000010989003':targets=flyInfantry.filter(movable);break;
   }
   if(['000010152002','000010152003','000010152004'].includes(strat.id))body+=linkCondition(targets);
   if(['000008986002','000008986003','000008986007','000008986006','000008986005'].includes(strat.id)&&targets.some(f=>kw(f,'VEHICLE')&&!kw(f,'DAEMON')))body+=' A currently non-Daemon Vehicle is eligible only after Daemonic Possession actually grants DAEMON; selection of this detachment alone does not grant it.';
   emit(strat.id,strat.name+' · '+strat.cp+'CP',phase,actualTurn,strat.timing,body,actors??roots(targets),strat.id);
  }
 }
 for(const bearer of active){
  const choice=selected(bearer),upgrade=eligibleCsmUpgrades(current,bearer.unit,bearer.id).find(u=>u.name===choice);
  if(!upgrade)continue;
  const f=csm.find(f=>f.members.some(s=>s.id===bearer.id));if(!f)continue;
  const personal:Form={root:bearer,members:[bearer]},guns=weapons(personal,'Shooting','CHARACTER'),blades=weapons(personal,'Fight','CHARACTER');
  const ownHits=guns.some(w=>!w.abilities.includes('torrent')),leading=f.root.id!==bearer.id;
  const add=(p:ReminderWindow,t:Turn,body:string,timing:Timing='during',units:readonly RosterInstance[]=[f.root])=>emit('upgrade-'+upgrade.id+'-'+bearer.id,upgrade.name,p,t,timing,body,units,upgrade.id);
  const mine=(p:ReminderWindow,t:Turn,body:string,timing:Timing='during')=>add(p,t,body,timing,[bearer]);
  const fire=(body:string,personalOnly=false,hitsOnly=false)=>{
   if(personalOnly?(hitsOnly?ownHits:guns.length):(hitsOnly?hitGuns(f):ranged(f)))add('Shooting','own',body,'during',personalOnly?[bearer]:[f.root]);
   if(reactions.includes(f)&&(personalOnly?guns.length:ranged(f)))add('Shooting','opponent','Only during normal shooting through '+reaction(f).join('; ')+': '+body,'during',personalOnly?[bearer]:[f.root]);
  };
  const overwatch=(body:string,personalOnly=false)=>{if(!kw(f,'TITANIC')&&(personalOnly?guns.length:ranged(f)))add('Movement','opponent','If this formation uses Fire Overwatch: '+body,'end',personalOnly?[bearer]:[f.root]);};
  const protect=(body:string,personalOnly=false,rangedOnly=false)=>{for(const [p,t] of defence.filter(([p])=>!rangedOnly||p!=='Fight'))add(p,t,body,p==='Movement'?'end':'during',personalOnly?[bearer]:[f.root]);};
  const feelNoPain=(body:string)=>{for(const p of phases)mine(p,'either',body);};
  switch(upgrade.id){
   case '000008357002':if(pact(f)){
    const body='Each time this bearer’s formation makes a Dark Pact and passes its Leadership test with a result of 8+, gain 1CP. The bearer must remain in that formation.';
    fire(body);if(melee(f))add('Fight','either',body);overwatch(body+' This CP trigger still works even though snap shooting cannot use Critical Hit benefits.');break;
   }break;
   case '000008357003':{
    feelNoPain('Only this actual Character bearer has Feel No Pain 5+. Bodyguards and companion models do not receive it.');
    if(pact(f)){
     const body='After this actual bearer shoots or fights, if its formation made a Dark Pact this phase and passed the Leadership test, select one enemy hit by the bearer’s own attacks to take a Battle-shock test. Hits made only by other models do not qualify.';
     fire(body,true);if(blades.length)mine('Fight','either',body);overwatch(body,true);
    }break;
   }
   case '000008357004':mine('Fight','either','At phase end, roll one D6 for each enemy unit within 3″ of the actual bearer. Add 1 if the bearer’s formation made a Dark Pact this phase and passed its Leadership test. Each 4+ inflicts D3 mortal wounds on that enemy. Measure from the bearer, not its Bodyguards.','end');break;
   case '000008357005':if(blades.length)mine('Fight','either','Only the bearer’s melee weapons gain +1 Attacks and +1 Strength. If its formation makes a Dark Pact and passes the Leadership test, roll D3 and replace both +1 bonuses with that result until phase end; the bonuses do not stack.');break;
   case '000008960002':
    add('Movement','own','This formation may shoot and charge after Falling Back. While the bearer remains, attacks against your focus of hatred gain +1 to Hit if this formation Fell Back this turn.');
    fire('This formation may shoot after Falling Back; if it Fell Back this turn, its attacks against your focus of hatred gain +1 to Hit.');
    add('Charge','own','This formation may charge after Falling Back. Whenever its charge targets your focus of hatred, add 1 to its Charge roll; the Charge bonus does not require a Fall Back.');
    if(melee(f))add('Fight','either','If this formation Fell Back this turn, its attacks against your focus of hatred gain +1 to Hit.');break;
   case '000008960003':for(const p of phases)mine(p,'either','While this bearer is on the battlefield, each time your focus of hatred is destroyed, roll one D6; on a 4+, gain 1CP. '+demise);break;
   case '000008960004':{
    const body='Once per turn, re-roll one Hit roll, one Wound roll OR one saving throw made for this actual bearer. This is one shared use, not one of each; other models cannot use it.';
    protect(body,true);
    overwatch('The bearer may spend its one use this turn on a Wound roll. Snap-shooting Hit rolls cannot be re-rolled.',true);break;
   }
   case '000008960005':{
    const body='When this actual Chaos Lord bearer attacks your focus of hatred, a successful unmodified Wound roll of 5+ is a Critical Wound. A failed Wound roll of 5 does not become successful. Other models do not gain this rule.';
    fire(body,true);if(blades.length)mine('Fight','either',body);overwatch(body,true);break;
   }
   case '000008964002':if(blades.length)mine('Fight','either','Only the bearer’s melee weapons gain +1 AP and Precision. At the Allocation Order step, Precision can select a visible Character’s allocation group; other models do not gain it.');break;
   case '000008964003':{
    const candidates=csm.filter(g=>['Legionaries','Chosen'].includes(g.root.unit)&&g.members.length===1&&models(g.root).length>=2);
    mine('Pre-battle','either','In Declare Battle Formations, you may place the bearer in Reserves for Falsehood. It can later replace a model in a qualifying unattached Legionaries or Chosen unit; this does not grant an ordinary pre-battle attachment permission.');
    if(candidates.length)add('Movement','own','If the bearer was placed in Reserves for Falsehood, choose an unattached Legionaries or Chosen unit on the battlefield with at least two models remaining. Destroy one model, ignoring destruction-triggered rules; set the bearer as close as possible to its position and within enemy Engagement Range only if that model was engaged with those enemies. Attach the bearer as its Leader. Possible current hosts: '+names(candidates)+'.','during',[bearer]);break;
   }
   case '000008964004':protect('Only the actual bearer has Stealth and Lone Operative. Bodyguards and companion models receive neither grant. If every model in the formation has Stealth, it has the Benefit of Cover against ranged attacks. Lone Operative requires every surviving model to qualify, including in an Attached unit: enemy models more than 12″ away cannot see it or target it with Indirect Fire.',true,true);break;
   case '000008964005':{
    const sources=csmSoulLinkSources(army,bearer);
    if(sources.length){
     mine('Command','own','Choose one other actual Heretic Astartes Infantry Character model, excluding Epic Heroes, from this army: '+sources.map(s=>s.id).join(', ')+'. Until your next Command phase starts, the bearer gains Psyker and replaces its datasheet abilities, including Core and Faction abilities, with that source’s. An off-battlefield source may be chosen and the bearer may use this in Strategic Reserves. Do not copy weapons, characteristics, other keywords or attachment permissions. Prior uses by the source do not consume the bearer’s copied usage allowance. Prior persisting effects from replaced abilities stop applying to the bearer; this does not automatically remove timed effects already placed on other units.','start');
     for(const donor of sources){rows.push(...csmCopiedIntrinsicReminders(army,bearer,donor,roster));rows.push(...csmCopiedCoreReminders(army,bearer,donor,roster));}
    }break;
   }
   case '000008968002':mine('Command','own','If the bearer is on the battlefield, roll one D6 at the start of your Command phase. Add 1 if the actual bearer is wholly within 12″ of the enemy deployment zone; on a 5+, gain 1CP.','start');break;
   case '000008968003':if(blades.length)mine('Fight','either','Only while the actual bearer is wholly within 12″ of the enemy deployment zone, its own melee attacks re-roll Hit and Wound rolls. Bodyguards receive no bonus.');break;
   case '000008968004':add('Pre-battle','either','Every model in the bearer’s actual formation has Scouts 6″ while the bearer remains, including attached Bodyguards. Resolve the Scout move using the whole formation’s eligibility.');break;
   case '000008968005':add('Movement','own','This formation may re-roll Advance rolls and shoot after Falling Back while the bearer remains.');fire('This formation may shoot after Falling Back while the Tyrant’s Lash bearer remains.');break;
   case '000008972002':mine('Command','own','If the bearer is on the battlefield, roll one D6 at the start of your Command phase. Add 1 for each Battle-shocked enemy unit on the battlefield; on a 5+, gain 1CP.','start');break;
   case '000008972003':protect('Every model in this formation has Stealth while the bearer remains, granting the Benefit of Cover against ranged attacks, including incoming snap shooting unless an attack ignores cover. Stealth does not impose a Hit modifier in the current rules.',false,true);break;
   case '000008972004':add('End of opponent turn','opponent','At the end of the opponent’s turn, if this formation is unengaged, remove it and place it in Strategic Reserves.','end');break;
   case '000008972005':if(blades.length)mine('Fight','either','After the actual bearer makes its melee attacks, choose one enemy hit by those attacks to take a Battle-shock test. Hits made only by Bodyguards do not qualify.');break;
   case '000008976002':protect('Once per battle round, when a saving throw is failed for any model in this formation, change that one attack’s Damage to 0. This shared use applies to the bearer’s unit, including Bodyguards.');break;
   case '000008976003':{
    const body='Only the actual bearer’s equipped weapons have Anti-Vehicle 4+ and Anti-Fortification 4+. Against those targets, an unmodified Wound roll of 4+ is a Critical Wound; other models receive neither ability.';
    fire(body,true);if(blades.length)mine('Fight','either',body);overwatch(body,true);break;
   }
   case '000008976004':{
    const body='Only attacks made by the actual bearer gain +1 to Wound while that bearer itself is within range of an objective marker. A Bodyguard standing on the objective does not suffice.';
    fire(body,true);if(blades.length)mine('Fight','either',body);overwatch(body,true);break;
   }
   case '000008976005':if(guns.length)mine('Shooting','own','After the actual bearer shoots in your Shooting phase, choose one enemy hit by its own attacks; that enemy cannot have the Benefit of Cover until this phase ends. This phase-specific trigger does not work during Fire Overwatch or normal reaction shooting.');break;
   case '000008981002':if(f.members.some(s=>models(s).some(m=>tag(s,'DAMNED',m.model)&&!tag(s,'CHARACTER',m.model))))add('Command','own','Return up to D3 destroyed Damned models excluding Characters to this Dark Apostle’s actual formation. Do not return the Apostle, another Character, or non-Damned Dark Disciples.');break;
   case '000008981003':{
    const others=f.members.flatMap(s=>models(s).map(m=>({s,...m}))).filter(m=>!(m.s.id===bearer.id&&tag(m.s,'CHARACTER',m.model))&&!/^Dark Disciple$/i.test(m.model));
    if(others.every(m=>tag(m.s,'DAMNED',m.model)))for(const p of ['Movement','Charge'] as const)add(p,'own','Every other physical model in this formation is Damned, ignoring Dark Disciples, so its Advance and Charge rolls may be re-rolled while the bearer remains.');break;
   }
   case '000008981004':if(weapons(f,'Fight','DAMNED').length)add('Fight','either','While this formation is below Starting Strength, only its actual Damned models’ melee weapons gain +1 Strength. While Below Half-strength they also gain +1 Attacks. The Dark Apostle and Dark Disciples do not become Damned by attachment.');break;
   case '000008981005':if(leading&&CSM_CARDS[f.root.unit]?.core?.some(c=>/^Scouts 6/.test(c)))add('Pre-battle','either','While this bearer leads this Bodyguard unit with native Scouts 6″, every model in their actual formation has Scouts 6″. This does not supply Scout to an unrelated unit.');break;
   case '000008985002':if(vehicles.length)mine('Command','own','Choose one friendly Heretic Astartes Vehicle formation within 12″ of the actual bearer: '+names(vehicles)+'. It has Feel No Pain 6+ until your next Command phase starts. The selected effect continues for that duration if this bearer is later destroyed.');break;
   case '000008985003':mine('Movement','own','Only the actual Warpsmith bearer gains +4″ Move. Other models in its formation retain their own Move characteristics.');break;
   case '000008985004':{
    const eligible=possibleDaemonVehicles.filter(pact),body='If this Daemon Vehicle formation invokes its contract while within 3″ of '+bearer.id+', add 1 to the mortal wounds it suffers from that Dark Pact if it suffers any. Its attacks re-roll Hit rolls until phase end. A current non-Daemon Vehicle must first gain DAEMON through Daemonic Possession.';
    normalFire('upgrade-'+upgrade.id+'-'+bearer.id,upgrade.name,body,eligible,upgrade.id,true);
    card('upgrade-'+upgrade.id+'-'+bearer.id,upgrade.name,'Fight','either','during',body,eligible.filter(melee),upgrade.id);
    snap('upgrade-'+upgrade.id+'-'+bearer.id,upgrade.name+' · snap shooting','If invoking a contract within 3″ of '+bearer.id+' during Fire Overwatch, add 1 to the Dark Pact’s mortal wounds if any are suffered. Snap shooting cannot use the Hit re-rolls.',eligible,upgrade.id);break;
   }
   case '000008985005':for(const p of phases)mine(p,'either','While the bearer is on the battlefield, each time an enemy unit within 12″ of the actual bearer is destroyed, roll one D6; on a 5+, gain 1CP. '+demise);break;
   case '000009773002':if(blades.length)mine('Fight','either','Only the actual bearer’s melee weapons have Precision. At the Allocation Order step, Precision may select a visible Character’s allocation group.');break;
   case '000009773003':mine('Pre-battle','either','Only this actual Chaos Lord bearer gains +1 Wounds and Feel No Pain 5+.');feelNoPain('Only this actual Chaos Lord bearer has Feel No Pain 5+ and +1 Wounds. Bodyguards do not gain either benefit.');break;
   case '000009773004':mine('Movement','either','Enemy units entering the battlefield from Reserves cannot be set up within 12″ horizontally of the actual bearer, including when using a closer ingress permission. Measure from the bearer, not from Bodyguards.');break;
   case '000009773005':if(blades.length)mine('Fight','either','Only the actual bearer’s melee weapons gain +1 Damage, and only its own melee attacks re-roll Hit rolls.');break;
   case '000010151002':{
    const body='Only the actual Character bearer gains Psyker, and only that bearer’s equipped weapons have Psychic. With those weapons, it may ignore any or all Ballistic Skill, Weapon Skill and Hit-roll modifiers on normal attacks; Psychic does not change fixed snap-shooting accuracy. Companion models such as Dark Disciples and attached Bodyguards receive neither personal grant. The formation may satisfy a Psyker-unit condition while the bearer remains.';
    mine('Pre-battle','either',body);fire(body,true);if(blades.length)mine('Fight','either',body);overwatch(body,true);break;
   }
   case '000010151003':if(blades.length)mine('Fight','either','Only the actual Daemon bearer’s melee attacks have Lance: +1 to Wound if its formation made a Charge move this turn.');break;
   case '000010641002':protect('Every model in this formation has Stealth while the bearer remains, granting the Benefit of Cover against ranged attacks. While the formation is within range of an objective you control, an enemy model must be within 18″ to target it with a ranged attack. Both protections also apply against incoming snap shooting; an attack with Ignores Cover ignores the cover benefit.',false,true);break;
   case '000010641003':add('Fight','opponent','At the end of the opponent’s Fight phase, if this formation is unengaged, remove it and place it in Strategic Reserves.','end');break;
   case '000010641004':mine('Fight','either','At phase start, every enemy unit within Engagement Range of the actual bearer takes a Battle-shock test at −1. Enemy units engaged only with its Bodyguards do not qualify.','start');break;
   case '000010641005':add('Pre-battle','either','Every model in the bearer’s actual formation has Scouts 6″ while the bearer remains. During Declare Battle Formations, this Chaos Lord with Jump Pack may attach to Warp Talons as well as its normal eligible Bodyguards.');break;
   case '000010688002':
    add('Movement','own','This actual formation has both Tyrannical Motivation abilities while its Voice of the Tyrant bearer remains: +1 to Hit, and shoot and charge after Falling Back.');
    fire('This actual formation has +1 to Hit and may shoot after Falling Back while its Voice of the Tyrant bearer remains.');
    add('Charge','own','This actual formation may charge after Falling Back while its Voice of the Tyrant bearer remains.');
    if(melee(f))add('Fight','either','This actual formation gains +1 to Hit in melee while its Voice of the Tyrant bearer remains.');break;
   case '000010688003':if(canRide(f))add('Movement','own','When this formation disembarks from a Transport that made a Normal move this turn, it makes an assault disembark move under Core Rules 18.06: set up wholly within 3″ under the normal setup requirements. The formation must not have embarked this phase and the carrier must not have Advanced or Fallen Back this phase. This move does not impose Rapid Disembark’s no-charge restriction, so a charge remains possible subject to normal eligibility. It does not grant another Normal move or apply after ingress alone.');break;
   case '000010688004':{
    const body='Each time this formation is set up on the battlefield, every enemy within 6″ of the formation takes a Battle-shock test, or within 12″ if it was set up using Deep Strike. Merely returning a model to an existing unit does not set that whole unit up again.';
    add('Pre-battle','either',body);add('Movement','either',body);break;
   }
   case '000010688005':mine('Pre-battle','either','Only the actual bearer has Infiltrators. Other models, including Dark Disciples, a Traitor Ogryn and attached Bodyguards, do not inherit it. The formation can deploy with Infiltrators only if every physical model independently has that ability.');break;
   case '000010694002':for(const p of phases)mine(p,'either','Once per battle round, just after your Vendetta is destroyed, if this bearer is on the battlefield, select one enemy visible to the actual bearer as the new Vendetta until another is selected. No distance limit applies. '+demise);break;
   case '000010694003':fire('All ranged weapons in this actual formation have Ignores Cover while the bearer remains.');overwatch('All ranged weapons in this actual formation retain Ignores Cover while the bearer remains.');break;
   case '000010694004':{
    const body='If this formation chose to Default to Doctrine this turn, all its models re-roll Hit rolls until turn end. This timed benefit persists for that duration if the bearer is later removed. Snap shooting cannot re-roll Hit rolls.';
    fire(body,false,true);if(melee(f))add('Fight','either',body);break;
   }
   case '000010694005':for(const p of ['Movement','Charge'] as const)add(p,'own','Add 1 to this actual formation’s Advance and Charge rolls while the bearer remains.');break;
   case '000010739002':add('Movement','opponent','Once per battle, use Rapid Ingress on this formation for 0CP, even if another unit already used that Stratagem this phase. Resolve it at the end of the opponent’s Movement phase and follow its normal arrival restrictions; this enhancement does not itself allow a first-round ingress.','end');break;
   case '000010739003':
    add('Movement','either','Each time the bearer’s formation is set up on the battlefield, it may re-roll Charge rolls until turn end. The timed benefit persists if the bearer is later removed.');
    add('Charge','either','Only if this formation was set up on the battlefield this turn, it may re-roll Charge rolls until turn end. The trigger is not restricted to arriving by Deep Strike.');break;
   case '000010739004':if(deepStrike(f)){add('Pre-battle','either','This formation can use Deep Strike in the Reinforcements step of your first, second or third Movement phase, regardless of mission rules. Every model must independently have Deep Strike; this does not grant it to Bodyguards or permit first-round Rapid Ingress.');add('Movement','own','In your first, second or third Reinforcements step, this reserved formation may use Deep Strike regardless of mission rules. Follow normal Deep Strike distance and placement requirements. This permission does not extend to the opponent’s turn.');}break;
   case '000010739005':{
    const body='Only the actual bearer’s equipped weapons gain +1 Attacks, +1 Strength and +1 AP. If its formation was set up from Reserves this turn, those weapons also gain +1 Damage until turn end. Other models do not gain these weapon bonuses.';
    fire(body,true);if(blades.length)mine('Fight','either',body);overwatch(body,true);break;
   }
   case '000010743002':mine('Command','own','If this bearer is on the battlefield, roll one D6 at the start of your Command phase. Add 1 if the actual bearer is within range of an objective you control; on a 4+, gain 1CP.','start');break;
   case '000010743003':add('Pre-battle','either','Every model in this actual formation has Soul Forge while the Cybinfernal Font bearer remains. This qualifies the formation for Soul Forge Boons and Soul Forge Stratagems. Surviving Bodyguards lose this source of the keyword when the bearer is removed.');break;
   case '000010743004':{
    const body='Only the actual bearer’s attacks score Critical Hits on unmodified 5+. This enhancement does not grant Soul Forge. Torrent weapons make no Hit rolls, and snap shooting cannot score Critical Hits.';
    fire(body,true,true);if(blades.length)mine('Fight','either',body);break;
   }
   case '000010743005':mine('Pre-battle','either','Add 3″ to this actual Warpsmith’s Warpsmith, Master of Mechanisms and Enrage Machine Spirits ranges. Their current base ranges of 3″, 3″ and 12″ become 6″, 6″ and 15″ respectively. Other Warpsmiths receive no extension.');break;
   case '000010984002':if(pact(f)){
    const body='This actual Warpsmith formation may re-roll its Dark Pacts Leadership tests. The permission applies whenever it can make that Dark Pact.';
    fire(body);if(melee(f))add('Fight','either',body);overwatch(body+' Snap shooting still cannot gain Dark Pact Critical Hit benefits.');
    if(ranged(f))add('Shooting','own','After this Warpsmith formation shoots in your Shooting phase, if it used Dark Pacts and those attacks destroyed an enemy model, it heals 3 lost wounds. This healing trigger does not work during Fire Overwatch or normal reaction shooting.','end');break;
   }break;
   case '000010984003':{
    const body='When this Warpsmith formation is selected to shoot, select one enemy within 24″ of the formation. That enemy has +6″ detection range only until this formation finishes shooting; later friendly shooters do not inherit the benefit.';
    fire(body);overwatch(body);break;
   }
   case '000010988002':protect('Every model in this actual Chaos Lord with Jump Pack formation has a 5+ invulnerable save while the Shadowcowl Talisman bearer remains, including attached Bodyguards.');break;
   case '000010988003':mine('Pre-battle','either','Only the actual Chaos Lord with Jump Pack bearer gains Daemon. Its own melee attacks gain +1 Attacks; attached Bodyguard models do not receive either personal grant.');if(blades.length)mine('Fight','either','Only the actual bearer’s melee attacks gain +1 Attacks. This personal Daemon grant does not make its Bodyguard models Daemons.');break;
  }
 }
 // Explicitly timed grants continue to their stated expiry after their source
 // is removed. Use the original selected source, but only surviving recipients.
 for(const bearer of original){
  const choice=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit]??bearer.enhancement;
  const upgrade=eligibleCsmUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===choice);
  if(!upgrade)continue;
  if(upgrade.id==='000008985002')for(const p of phases)card('lasting-'+upgrade.id+'-'+bearer.id,upgrade.name+' · chosen recipient',p,'either','during','Only if this Vehicle was selected within 12″ of '+bearer.id+' in your preceding Command phase, it retains Feel No Pain 6+ until your next Command phase starts, including if that bearer has since been destroyed. The benefit applies to the chosen Vehicle, not every listed candidate.',vehicles,upgrade.id);
  if(active.some(s=>s.id===bearer.id))continue;
  if(upgrade.id==='000008985004'){
   const targets=possibleDaemonVehicles.filter(pact),body='Only if this Daemon Vehicle invoked its contract while within 3″ of '+bearer.id+' earlier this phase, its attacks retain the granted Hit re-rolls until phase end after that bearer’s removal. This does not permit a new activation without that bearer. Snap shooting cannot use Hit re-rolls.';
   normalFire('lasting-'+upgrade.id+'-'+bearer.id,upgrade.name+' · remaining effect',body,targets,upgrade.id,true);
   card('lasting-'+upgrade.id+'-'+bearer.id,upgrade.name+' · remaining effect','Fight','either','during',body,targets.filter(melee),upgrade.id);
  }
  if(!['000010739003','000010694004'].includes(upgrade.id))continue;
  const initial=csmFormations(army,original).find(f=>f.members.some(s=>s.id===bearer.id));
  const recipients=initial?csm.filter(f=>f.members.some(s=>initial.members.some(m=>m.id===s.id))):[];
  if(upgrade.id==='000010739003')card('lasting-'+upgrade.id+'-'+bearer.id,upgrade.name+' · remaining effect','Charge','either','during','Only if this formation was set up earlier this turn while '+bearer.id+' was part of it, its surviving members retain Charge re-rolls until turn end. This already-triggered effect survives the bearer’s removal.',recipients,upgrade.id);
  else{
   const body='Only if this formation chose to Default to Doctrine earlier this turn while '+bearer.id+' was part of it, surviving models retain Hit re-rolls until turn end. This already-triggered benefit survives the bearer’s removal and cannot re-roll snap-shooting Hit rolls.';
   normalFire('lasting-'+upgrade.id+'-'+bearer.id,upgrade.name+' · remaining effect',body,recipients,upgrade.id,true);
   card('lasting-'+upgrade.id+'-'+bearer.id,upgrade.name+' · remaining effect','Fight','either','during',body,recipients.filter(melee),upgrade.id);
  }
 }
 return rows;
}
