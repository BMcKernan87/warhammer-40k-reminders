import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {isWorldEatersDreadblade,worldEatersKeywords,worldEatersMusterUnits} from './world-eaters-data';
import {WORLD_EATERS_STRATAGEMS} from './world-eaters-detachments.generated';
import {eligibleWorldEatersUpgrades} from './world-eaters-detachment-data';
import {worldEaterHasRangedWeapon} from './world-eater-loadouts';
import {worldEaterFormationHasDeepStrike} from './world-eater-core';
import {worldEatersCargoFormations} from './world-eaters-muster';
export {eligibleWorldEatersUpgrades} from './world-eaters-detachment-data';

type Turn=NonNullable<GeneratedReminder['turn']>;
const source='https://wahapedia.ru/wh40k11ed/factions/world-eaters/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Shooting','Fight'] as const;
const norm=(s:string)=>s.toLowerCase().replace(/[‐‑–]/g,'-').replaceAll('’',"'");
const descriptions:Record<typeof WORLD_EATERS_STRATAGEMS[number]['id'],string>={
 '000008431004':'After enemy target selection, subtract 1 from the Damage of incoming attacks allocated to this unit for the phase.',
 '000008431003':'Before this unit fights, improve its melee AP by 1 this phase if it charged this turn.',
 '000008431002':'When an eligible unit is destroyed in range of an objective you controlled at the end of the previous phase, select one such objective. It stays under your control until the opponent has greater control at a phase end.',
 '000008431005':'After the unit destroys a Character or Monster model, make a Blessings of Khorne roll to activate one additional blessing for the rest of this battle round.',
 '000008431006':'When the Berzerkers Advance, this unit remains eligible to charge until the end of the turn.',
 '000008431007':'After enemy shooting makes this Berzerker unit eligible to surge, move up to 8″ instead of rolling for the distance.',
 '000010977002':'When selected to attack, these Daemon Vehicles can ignore modifiers to Ballistic Skill, Weapon Skill, Hit rolls and Wound rolls.',
 '000010977004':'When enemy shooting targets this unengaged, non-Titanic Daemon Vehicle, it may surge up to D6″ after the enemy has shot.',
 '000010977003':'When selected to move, the Daemon Vehicle gains Mobile and may move horizontally through dense terrain.',
 '000010981004':'When shooting targets these Terminators, subtract 1 Damage from incoming ranged attacks until the attacking unit finishes.',
 '000010981003':'When selected to fight, the Terminators gain +1 to Wound against Monsters and Vehicles.',
 '000010981002':'When selected to fight, add 1 Attack to the Terminators’ melee attacks.',
 '000010075005':'Before the engaged unit fights, its models within 3″ of an enemy model can fight this phase. They may target an enemy unit within 3″ of them and engaged with their unit.',
 '000010075007':'Once per battle, select a different Idol ability for this Monster or Titanic unit, even if previously chosen. It replaces the army’s current Idol for this source until your next Command phase starts.',
 '000010075002':'When an enemy destroys the selected Monster or Titanic unit, your Jakhals and Goremongers can re-roll Hit rolls against that enemy for the rest of the battle.',
 '000010075003':'Once per battle, replace the destroyed Jakhals unit at its Starting Strength in Strategic Reserves. This cannot return destroyed Characters to their attached unit.',
 '000010075004':'After target selection, give this unit Feel No Pain 6+ through the end of the phase.',
 '000010075006':'For this phase the unit re-rolls melee Hit rolls of 1.',
 '000010087003':'Before the selected Vehicle moves, it can move horizontally through terrain during Normal moves and Advances this phase.',
 '000010087005':'Before this Rhino moves, friendly World Eaters disembarking after its Normal move this phase can use an assault disembark.',
 '000010087006':'After enemy shooting hits the Vehicle, it may make a Normal move up to 6″. It cannot also be targeted by Fury Unleashed this phase.',
 '000010087004':'Before this Rhino moves, disembark one World Eaters unit wholly within 6″. Its models may be set up in Engagement Range.',
 '000010087002':'Choose one eligible World Eaters Infantry formation and a transport it fits in. If wholly within 6″ of the vehicle, it may embark.',
 '000010087007':'After enemy shooting hits a surviving Rhino, one embarked Khorne Berzerkers unit can disembark and surge up to D6+2″. The Rhino cannot also use Unrelenting Advance this phase.',
 '000010079005':'After enemy target selection, pick a Blood Legions unit within 6″ of the targeted World Eaters unit. The World Eaters models gain a 5+ invulnerable save for the phase, improved to 4+ while Boon of Blood is active.',
 '000010079003':'A Blood Legions unit grants a friendly World Eaters unit within 6″ Lance on its melee weapons for this turn. While Daemonic Rage is active, those weapons also gain Twin-linked through the end of the phase.',
 '000010079004':'After fighting and destroying a Character or Monster model, gain D3 Blood Tithe points. You may immediately spend BTP to activate one Blood Tithe ability.',
 '000010079007':'Place one unengaged Blood Legions unit from the battlefield into Strategic Reserves.',
 '000010079006':'Select a Blood Legions unit within 6″ of the friendly World Eaters unit and return destroyed models at full wounds. This cannot return a destroyed Character to an attached unit.',
 '000010079002':'Once per battle round, when a unit’s last model is destroyed, set up Bloodletters from reserves wholly within 9″ of it and more than 6″ horizontally from all enemies before removing the destroyed model. A Transport’s passengers must disembark first.',
 '000010083002':'After enemy target selection, attacks into the Possessed unit suffer −1 to Wound through phase end.',
 '000010083003':'Before fighting, improve the unit’s melee Damage by 1 this phase against the appropriate targets.',
 '000010083004':'After enemy target selection, when a model in this unit dies before fighting, it can fight after the attacking model’s unit has finished. Remove that model after it fights.',
 '000010083005':'Use Deep Strike to set up the Exalted Eightbound more than 6″ horizontally from every enemy. They cannot charge this turn.',
 '000010083006':'Before moving or declaring a charge, the unit can move through enemy models other than Monsters or Vehicles during a Normal move, Advance, Fall Back or Charge this phase. It automatically passes Desperate Escape tests and can end engaged only when charging.',
 '000010083007':'Each enemy engaged with this Possessed unit must take a Battle-shock test at −1.',
 '000009848002':'When the eligible Character unit suffers a mortal wound, its models have Feel No Pain 4+ against mortal wounds.',
 '000009848003':'When the unit is selected to fight, its Character models gain 1 melee Attack and 2 melee Strength.',
 '000009848004':'When an engaged enemy Falls Back, it must use Desperate Escape. If battle-shocked, subtract 1 from its hazard rolls.',
};

export function worldEatersDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='World Eaters')return [];
 const available=new Set(worldEatersMusterUnits(army)),active=roster.filter(s=>available.has(s.unit));
 const selection=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 const groups=new Map<string,RosterInstance[]>();
 const tags=new Map(active.map(s=>[s.id,worldEatersKeywords(army,s)]));
 for(const s of active){
  const root=knightJoinedBodyguard(army,s)?.id??s.id;
  groups.set(root,[...(groups.get(root)??[]),s]);
 }
 const tag=(s:RosterInstance,k:string)=>tags.get(s.id)?.has(k)===true||s.unit.toUpperCase()===k;
 const shoots=(s:RosterInstance)=>worldEaterHasRangedWeapon(s)||isWorldEatersDreadblade(s.unit)||s.unit.toLowerCase().includes('warhound titan');
 const forms=[...groups].map(([id,members])=>({root:members.find(s=>s.id===id)!,members,ranged:members.some(shoots)}));
 type Form=typeof forms[number];
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const roots=(f:readonly Form[])=>f.map(x=>x.root);
 const all=(k:string)=>forms.filter(f=>kw(f,k));
 const formFor=(s:RosterInstance)=>forms.find(f=>f.members.some(m=>m.id===s.id))!;
 const we=all('WORLD EATERS'),legions=all('BLOOD LEGIONS');
 const infantry=we.filter(f=>kw(f,'INFANTRY')),cultists=we.filter(f=>kw(f,'JAKHALS')||kw(f,'GOREMONGERS'));
 const idols=we.filter(f=>kw(f,'MONSTER')||kw(f,'TITANIC'));
 const characters=we.filter(f=>kw(f,'CHARACTER')),ordinary=characters.filter(f=>!kw(f,'EPIC HERO'));
 const termies=we.filter(f=>kw(f,'TERMINATOR SQUAD')),possessed=we.filter(f=>kw(f,'POSSESSED'));
 const engines=forms.filter(f=>kw(f,'VEHICLE')&&kw(f,'DAEMON'));
 const cargo=all('TRANSPORT').flatMap(carrier=>worldEatersCargoFormations(army,carrier.root,active).map(g=>({carrier,passenger:formFor(g.body)})));
 const has=(d:string)=>army.detachments2026?.some(x=>norm(x)===norm(d));
 const rows:GeneratedReminder[]=[];
 function add(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,units:readonly RosterInstance[],sourceRuleId?:string){
  if(units.length)rows.push({id:'11e-world-eaters-'+key+'-'+window,title,window,turn,timing,summary,units:units.map(s=>s.id),source,origin:'detachment',sourceRuleId});
 }
 const receivers=(units:readonly Form[])=>roots(units).map(s=>s.id).join(', ');
 if(has('Berzerker Warband'))add('rage','Relentless Rage','Fight','either','during','Friendly World Eaters units gain 1 Attack on their melee attacks.',roots(we));
 if(has('Vessels of Wrath'))add('wrath','Wrath of Khorne','Fight','either','during','When the non-Epic Character unit is selected to fight, choose Cleave 1 or improved AP by 1 for its Character models’ melee attacks.',ordinary.flatMap(f=>f.members.filter(s=>tag(s,'CHARACTER'))));
 if(has('Brazen Engines'))add('terror','Terror of Khorne','Fight','either','start','Each Daemon Vehicle may choose one engaged enemy to test for Battle-shock at −1. Each enemy can be chosen only once per phase.',roots(engines));
 if(has('Butchers of Khorne'))add('avalanche','Adamantine Avalanche','Fight','either','start','If any of these Terminator Squads are engaged, make one Blessings roll and activate one additional blessing for all friendly Terminator Squads until the phase ends.',roots(termies));
 if(has('Possessed Slaughterband'))add('fury','Brazen Fury','Shooting','opponent','during','After enemy shooting destroys a model in the Possessed unit, it can surge up to D6″. This counts as a Brazen Fury move.',roots(possessed.filter(f=>!f.members.some(s=>selection(s)==='Malicious Vigour'&&eligibleWorldEatersUpgrades(army,s.unit,s.id).some(u=>u.name==='Malicious Vigour')))));
 if(has('Goretrack Onslaught')){
  const passengers=[...new Set(cargo.filter(x=>we.includes(x.passenger)).map(x=>x.passenger))];
  for(const phase of ['Movement','Charge','Fight'] as const)add('rush','Rush to the Fray',phase,phase==='Fight'?'either':'own','during','After disembarking this turn, the unit gains +1 to Charge rolls and its melee weapons gain Lance until the end of the turn.',roots(passengers));
 }
 if(has('Cult of Blood')&&cultists.length&&idols.length){
  const ranges=idols.map(f=>f.root.id+' '+((kw(f,'TITANIC')?9:6)+(f.members.some(s=>selection(s)==='Chosen of the Blood God')?3:0))+'″').join(', ');
  add('idols','Idols of Khorne','Command','own','start','Choose one Idol for your eligible Monsters and Titanic units until your next Command phase starts. Each choice is available once per battle. Infinite Rage grants +1 to Hit and Wound. Burning Wrath grants +1″ Move and +1 to Advance and Charge. Blessed Blood grants a 4+ invulnerable save. All affect Jakhals and Goremongers within the listed aura distances. '+ranges+'.',roots(idols));
  for(const phase of ['Movement','Shooting','Charge','Fight'] as const){
   const detail=phase==='Movement'?'Burning Wrath grants +1″ Move and +1 to Advance.':phase==='Charge'?'Burning Wrath grants +1 to Charge.':'Infinite Rage grants +1 to Hit and Wound while attacking. Blessed Blood grants a 4+ invulnerable save when defending.';
   add('idol-effect','Idols of Khorne · active aura',phase,phase==='Movement'||phase==='Charge'?'own':'either','during','Apply the selected Idol while in range. '+detail+' Aura sources and ranges are '+ranges+'.',roots(cultists));
  }
 }
 if(has('Khorne Daemonkin')){
  const both=forms.filter(f=>we.includes(f)||legions.includes(f));
  const hasBlade=(f:Form)=>f.members.some(s=>selection(s)==='Blade of Endless Bloodshed'&&eligibleWorldEatersUpgrades(army,s.unit,s.id).some(u=>u.name==='Blade of Endless Bloodshed'));
  for(const phase of attacks)add('tithe-income','Blood Tithe · earn points',phase,phase==='Fight'?'either':'own','during','In any phase, when a World Eaters or Blood Legions unit destroys an enemy unit, roll a D6. On 3+ gain 1 Blood Tithe point.',roots(both.filter(f=>phase==='Fight'?!hasBlade(f):f.ranged)));
  const bloodOptions='2 BTP grants a 5+ Feel No Pain against Psychic attacks and mortal wounds to World Eaters and Blood Legions models.'+(legions.length?' For Blood Legions units, 3 BTP grants Lance to melee weapons, 4 BTP grants a 4+ invulnerable save and 5 BTP grants Blessings of Khorne.':'');
  add('tithe-spend','Blood Tithe · choose an ability','Command','either','start','Spend the required Blood Tithe points to activate one ability for the rest of the battle. '+bloodOptions,roots(both));
  for(const phase of phases)add('abjuration','Enraged Abjuration · if activated',phase,'either','during','After activating the 2 BTP ability, the selected army’s World Eaters and Blood Legions models have Feel No Pain 5+ against Psychic attacks and mortal wounds.',roots(both));
  add('tithe-lance','Daemonic Rage · if activated','Fight','either','during','After activating the 3 BTP ability, Blood Legions melee weapons gain Lance.',roots(legions));
  for(const phase of attacks)add('boon','Boon of Blood · if activated',phase,phase==='Fight'?'either':'opponent','during','After activating the 4 BTP ability, these Blood Legions units have a 4+ invulnerable save.',roots(legions));
 }
 for(const strat of WORLD_EATERS_STRATAGEMS){
  if(!has(strat.detachment))continue;
  const linked=new Set(strat.units.map(norm));
  const candidates=forms.filter(f=>f.members.some(s=>linked.has(norm(s.unit))));
  for(const {phase,turn} of strat.windows){
   let targets=candidates,text=descriptions[strat.id];
   if(strat.detachment==='Berzerker Warband'||strat.detachment==='Goretrack Onslaught'||strat.detachment==='Cult of Blood')targets=targets.filter(f=>we.includes(f));
   switch(strat.id){
    case '000010977002':case '000010977003':targets=engines;break;
    case '000010977004':targets=engines.filter(f=>!kw(f,'TITANIC'));break;
    case '000009848002':case '000009848003':targets=ordinary;break;
    case '000009848004':targets=characters;break;
    case '000010075002':case '000010075007':if(!cultists.length)continue;targets=idols;break;
    case '000010075004':if(idols.length)text+=' It improves to 5+ within 6″ of a friendly World Eaters Monster or 9″ of a friendly World Eaters Titanic unit.';break;
    case '000010075006':if(idols.length)text+=' Within 6″ of a friendly World Eaters Monster or 9″ of a friendly World Eaters Titanic unit, re-roll any Hit roll instead.';break;
    case '000010087005':case '000010087004':case '000010087007':
     targets=targets.filter(f=>cargo.some(p=>p.carrier===f&&we.includes(p.passenger)&&(strat.id!=='000010087007'||kw(p.passenger,'KHORNE BERZERKERS'))));break;
    case '000010087002':targets=infantry.filter(f=>cargo.some(p=>p.passenger===f));break;
    case '000010079005':case '000010079003':if(!we.length)continue;targets=legions;text+=' Eligible World Eaters recipients include '+receivers(we)+'.';break;
    case '000010079004':targets=forms.filter(f=>we.includes(f)||legions.includes(f));break;
    case '000010079007':targets=legions;break;
    case '000010079006':{
     const options=legions.filter(f=>f.members.some(s=>tag(s,'MOUNTED')||tag(s,'BEAST')||tag(s,'INFANTRY')));
     if(!options.length)continue;
     targets=we;
     const eligibleTypes=[options.some(f=>kw(f,'MOUNTED'))?'one Mounted model':'',options.some(f=>kw(f,'BEAST'))?'up to D3 Beast models':'',options.some(f=>kw(f,'INFANTRY'))?'up to D6 Infantry models':''].filter(Boolean);
     text+=' Return '+eligibleTypes.join(' or ')+'. Eligible recipients include '+receivers(options)+'.';break;
    }
    case '000010083005':targets=targets.filter(f=>worldEaterFormationHasDeepStrike(army,f.members));break;
    case '000010083003':{
     targets=possessed.filter(f=>kw(f,'EIGHTBOUND')||kw(f,'EXALTED EIGHTBOUND'));
     if(targets.some(f=>kw(f,'EIGHTBOUND')))text+=' Eightbound gain the bonus against non-Monster, non-Vehicle models.';
     if(targets.some(f=>kw(f,'EXALTED EIGHTBOUND')))text+=' Exalted Eightbound gain it against Monster or Vehicle models.';break;
    }
   }
   if(strat.id==='000010977002'&&phase==='Shooting')targets=targets.filter(f=>f.ranged);
   const name=strat.name.toLowerCase().replace(/(^|[\s-])\p{L}/gu,x=>x.toUpperCase());
   add('strat-'+strat.id,name+' · '+strat.cp+'CP',phase,turn,strat.timing,text,roots(targets),strat.id);
  }
 }
 for(const bearer of active){
  const selected=selection(bearer),up=selected&&eligibleWorldEatersUpgrades(army,bearer.unit,bearer.id).find(u=>norm(u.name)===norm(selected));
  if(!up)continue;
  const form=formFor(bearer),unit=[form.root],bearerOnly=[bearer];
  const issue=(window:ReminderWindow,turn:Turn,when:GeneratedReminder['timing'],text:string,recipients=bearerOnly)=>
   add(up.id+'-'+bearer.id,bearer.id+' · '+up.name,window,turn,when,text,recipients,up.id);
  switch(up.id){
   case '000010078002':
    if(legions.length){
     for(const phase of phases)issue(phase,'either','during','While Might of Khorne is active, Blood Legions units within 6″ of the Icon may re-roll Battle-shock tests.',roots(legions));
    }break;
   case '000010086002':if(cargo.some(p=>p.passenger===form))issue('Movement','own','end','If the bearer’s unit disembarked this turn, the enemy cannot target it with Fire Overwatch until turn end.',unit);break;
   case '000010074002':issue('Pre-battle','either','during','Increase the range of each aura ability on this Monster bearer by 3″.');break;
   case '000009847002':issue('Command','own','during','Once per battle per army, activate all Blessings of Khorne for the bearer’s unit until the start of your next turn.',unit);break;
   case '000010082002':issue('Shooting','opponent','during','When this unit makes a Brazen Fury surge move after losing a model to enemy shooting, use a distance roll of 6.',unit);break;
   case '000010980002':issue('Command','either','during','Add 1 to Objective Control for models in the upgraded Terminator unit.',unit);break;
   case '000010976002':issue('Fight','either','during','The upgraded Maulerfiend gains Cleave 2 on its Maulerfiend fists.');break;
   case '000008432002':issue('Fight','either','during','The bearer gains 1 Attack and 1 Damage on its melee weapons, excluding weapons with Extra Attacks.');break;
   case '000010074003':issue('Pre-battle','either','during','The bearer may also lead Jakhals or Goremongers and gains Infiltrators. The whole formation can infiltrate only if every model has that ability.');break;
   case '000009847003':issue('Movement','own','during','This Daemon Prince has Mobile and can move horizontally through dense terrain.');issue('Charge','own','during','Add 1 to the bearer’s Charge rolls.');break;
   case '000010078003':
    for(const phase of phases)issue(phase,'either','during','When the bearer is destroyed, gain 1 Blood Tithe point.'+(phase==='Shooting'||phase==='Fight'?' Its Save is 2+.':''));break;
   case '000010086003':issue('Pre-battle','either','during','A Dedicated Transport gains Scouts 9″ if the bearer starts the battle embarked within it.',roots(cargo.filter(p=>p.passenger===form&&kw(p.carrier,'DEDICATED TRANSPORT')).map(p=>p.carrier)));break;
   case '000008432003':for(const phase of attacks)issue(phase,phase==='Fight'?'either':'opponent','during','When an attack is allocated to this bearer, subtract 1 from its Damage.');break;
   case '000010980003':issue('Fight','either','during','Improve the Weapon Skill of this Terminator unit’s melee attacks by 1.',unit);break;
   case '000010082003':
    for(const phase of phases)issue(phase,'either','during','Each time the bearer’s unit destroys an enemy unit, roll a D6. On 4+ gain 1CP.',unit);break;
   case '000010976003':issue('Pre-battle','either','during','This World Eaters Vehicle gains the Daemon keyword. Apply Daemon Vehicle rules to it.');break;
   case '000008432004':
    if(has('Berzerker Warband')||has('Butchers of Khorne'))issue('Fight','either','during','If a Stratagem or detachment rule grants a Blessings of Khorne roll while this bearer is on the battlefield, you may re-roll up to two dice.');break;
   case '000010078004':
    issue('Pre-battle','either','during','The Lord gains Deep Strike and replaces World Eaters with Blood Legions. It cannot be Warlord. It may lead Bloodcrushers or Flesh Hounds.'+(kw(form,'BLOODCRUSHERS')||kw(form,'FLESH HOUNDS')?' This attached formation benefits from the Lord’s Blessings of Khorne.':''));
    break;
   case '000010074004':for(const phase of attacks)issue(phase,phase==='Fight'?'either':'opponent','during','The Monster bearer gains 1 Toughness and Feel No Pain 5+.');break;
   case '000010082004':
    if(form.ranged)issue('Shooting','own','during','Models in the bearer’s unit score Critical Hits on unmodified Hit rolls of 5+.',unit);
    issue('Fight','either','during','Models in the bearer’s unit score Critical Hits on unmodified Hit rolls of 5+.',unit);break;
   case '000010086004':{
    const vehicles=forms.filter(f=>kw(f,'VEHICLE')&&f.ranged);
    issue('Shooting','own','start','Choose a Vehicle model within 6″ of the bearer, or its carrier if embarked. After that model shoots, one enemy it hit suffers −1 to Hit until the start of your next turn.',roots(vehicles));break;
   }
   case '000008432005':issue('Charge','own','during','The bearer’s unit may re-roll Charge rolls. While Unbridled Bloodlust is active for your army, add a further 1 to those rolls.',unit);break;
   case '000010074005':issue('Pre-battle','either','end','After both players finish deployment, redeploy up to three Jakhals or Goremongers units, including into Strategic Reserves regardless of how many units are already there.',roots(cultists));break;
   case '000010078005':issue('Fight','either','during','The bearer adds 1 Attack, Strength and Damage to its melee weapons. When the bearer’s unit destroys an enemy unit with melee attacks, gain 1 Blood Tithe point automatically instead of rolling.');break;
   case '000010082005':for(const phase of phases)issue(phase,'either','during','When this bearer is destroyed, its Deadly Demise triggers on 2+ and inflicts D3+1 mortal wounds in place of D3.');break;
   case '000010086005':issue('Fight','either','start','Once per battle, give the bearer’s unit Fights First through the end of the phase.',unit);break;
  }
 }
 return rows;
}
