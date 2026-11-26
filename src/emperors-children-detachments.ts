import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {emperorsChildrenKeywords,emperorsChildrenMusterUnits} from './emperors-children-data';
import {resolvedEmperorsChildrenWarlord} from './emperors-children-muster';
import {emperorsChildrenCargoFormations,emperorsChildrenFormations} from './emperors-children-transports';
import {emperorsChildrenHasRangedWeapon,emperorsChildrenWeaponCount} from './emperors-children-loadouts';
import {EC_CARDS} from './ec-profiles.generated';
import {currentEcDetachment,eligibleEmperorsChildrenUpgrades} from './emperors-children-detachment-data';
import {EMP_CHILDREN_STRATAGEMS} from './emperors-children-detachments.generated';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
const source='https://wahapedia.ru/wh40k11ed/factions/emperor-s-children/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Shooting','Fight'] as const;
const effects:Record<typeof EMP_CHILDREN_STRATAGEMS[number]['id'],string>={
 '000010011002':'After the selected Emperor’s Children unit destroys an enemy, a friendly Legions of Excess unit within 6″ restores up to 3 lost wounds to one model.',
 '000010011005':'A Legions of Excess unit may charge after an Advance or Fall Back, provided at least one target is engaged with a friendly Emperor’s Children unit.',
 '000010011006':'After enemy shooting selects targets, subtract 1 from Hit rolls against this Slaanesh unit for the phase.',
 '000010011003':'After the Legions of Excess unit destroys an enemy, an unengaged friendly Emperor’s Children unit within 6″ can declare a charge. A unit that already fought this phase cannot fight again.',
 '000010011004':'Before fighting, select the Slaanesh Beast, Infantry or Mounted unit. Its models can pile in and consolidate up to 6″ through phase end. They may finish farther from the closest enemy model if as close as possible to the closest enemy unit.',
 '000010011007':'Place the unengaged Daemonettes into Strategic Reserves. If they return using Deep Strike in your next Move Units step, a special setup is available near a friendly Emperor’s Children unit.',
 '000010015005':'Before this unit fights, allow its models to re-roll Hit rolls through phase end.',
 '000010015003':'Through turn end, when attacking, this unit’s models can ignore modifiers to Ballistic Skill, Weapon Skill, Hit rolls and Wound rolls.',
 '000010015006':'Once per battle round, immediately after this unit destroys an enemy, increase your pledge by 1. This can raise a zero pledge to one even when your Warlord is off the battlefield.',
 '000010015002':'When an attack or mortal wound is allocated to a model in the unit, give its models Feel No Pain 6+ through phase end, improved to 4+ against mortal wounds.',
 '000010015004':'Choose Emperor’s Children Infantry at the start of the Fight phase. Each enemy model engaged with them must choose this unit as the target when it selects targets this phase.',
 '000010015007':'After enemy target selection, worsen AP against the chosen unit by 1 until the attacking unit finishes.',
 '000010655005':'Before this unit shoots, its Emperor’s Children models improve Strength and AP by 1 for attacks against eligible targets within 12″ through phase end.',
 '000010655004':'Before this Daemon moves or charges, let it move horizontally through terrain during Normal moves, Advances and Charges this phase.',
 '000010655003':'Before the unit fights, its models may re-roll Hit and Wound rolls against Character units this phase.',
 '000010655002':'Through phase end, subtract 1 from Wound rolls against this unit when the attack’s Strength exceeds its Toughness.',
 '000010655007':'After the enemy finishes shooting, if this unit lost one or more wounds from those attacks, it may surge up to D6″.',
 '000010655006':'Select an Emperor’s Children Daemon. Friendly Emperor’s Children units within 6″ of it can re-roll their Charge rolls this phase.',
 '000010953004':'Move the unengaged Terminator formation into Strategic Reserves.',
 '000010953002':'After the enemy targets the Terminators, subtract 1 from Wound rolls on attacks stronger than the unit’s Toughness.',
 '000010953003':'When the Terminators are selected to attack, add 2 to the Strength of those attacks.',
 '000010957004':'When this Battleline unit shoots, its ranged attacks do not prevent it from being hidden.',
 '000010957003':'Select one visible enemy within 12″ of this Battleline unit. Increase that enemy’s detection range by 6″.',
 '000010957002':'When the enemy targets this Battleline unit in range of an objective, worsen incoming AP by 1 until that enemy finishes attacking.',
 '000009999006':'After target selection, subtract 1 from incoming Hit rolls against this unit through phase end.',
 '000009999004':'Before the Infantry moves, it can Advance an extra 6″ without rolling for distance.',
 '000009999003':'After enemy target selection, subtract 1 from Wound rolls against this Infantry unit through phase end.',
 '000009999002':'Before fighting, the unit’s melee weapons gain Sustained Hits 1 through the end of the phase.',
 '000009999005':'After an enemy Normal move, Advance or Fall Back ends within 8″, the chosen Emperor’s Children unit may make a Normal move up to 6″. Beasts and Vehicles are ineligible.',
 '000009999007':'Move the unit to Strategic Reserves if wholly within 9″ of a battlefield edge and no enemy is within 3″ horizontally.',
 '000010003004':'Before consolidation, the unit’s models can move up to 6″ if the unit finishes that consolidation in Engagement Range of an enemy.',
 '000010003005':'Before a unit that charged this turn fights, improve the AP of its melee weapons by 1 through phase end.',
 '000010003002':'After enemy target selection, subtract 1 from incoming Hit rolls against this unit through phase end.',
 '000010003003':'After enemy target selection, models in this unit destroyed before fighting can fight after the attacking unit finishes. Remove each such model after it fights.',
 '000010003006':'If the unit charged last turn and destroyed an enemy in the preceding Fight phase, each enemy within 6″ tests for Battle-shock at −1 if below Half-strength. Those enemies need no further Battle-shock tests this phase.',
 '000010003007':'After an enemy Falls Back, choose an eligible unit within 6″ that could charge it. Declare a charge targeting that enemy without gaining a Charge bonus this turn. Vehicles must be Walkers.',
 '000010007004':'Before this Vehicle moves, it can pass through enemy models other than Monsters and Vehicles this phase. It may pass through Engagement Range but must end outside it and automatically passes Desperate Escape tests.',
 '000010007007':'Choose one Transport or up to two Dedicated Transports. Move each wholly within 9″ of a battlefield edge to Strategic Reserves.',
 '000010007006':'After the enemy targets the carrier, one embarked Emperor’s Children unit may disembark wholly within 6″ of it and outside Engagement Range.',
 '000010007002':'After this unit destroys an enemy this phase, choose a compatible friendly Transport. If wholly within 6″ it may embark, even if it disembarked this turn.',
 '000010007005':'Treat the unit’s disembarkation after a Transport’s Normal move this turn as an assault disembark.',
 '000010007003':'If an unshocked Tormentors unit is embarked, choose an objective you control in range of the carrier. Retain control until the opponent has higher control there at the end of a phase.',
 '000010019006':'When the Character unit declares a charge within 12″ of an engaged enemy, re-roll the Charge roll. The unit must finish engaged with one or more of those enemies.',
 '000010019004':'Immediately after a Character formation becomes your Favoured Champions or the Champions destroy an enemy, all other Emperor’s Children Character units gain +1 Strength on attacks this phase.',
 '000010019002':'Choose one enemy and one or more Character formations before they fight. Their melee weapons gain Sustained Hits 1 against that enemy through phase end.',
 '000010019005':'Once per battle round, immediately after this Character unit becomes Favoured Champions, every enemy unit within 6″ tests for Battle-shock at −1.',
 '000010019007':'After an enemy finishes shooting at this unengaged Character unit, it may surge up to D6″. Re-roll the distance if this unit is not your Favoured Champions.',
 '000010019003':'After enemy target selection, roll for each model in this unit destroyed before fighting. On 4+ it fights after the attacking unit, then is removed. Add 1 if its unit is your Favoured Champions.',
 '000010961002':'When Flawless Blades are selected to fight, their melee attacks gain Precision.',
 '000010961003':'When the Flawless Blades start a charge, they may move through models other than Monsters and Vehicles.',
 '000010961004':'After an engaged enemy Falls Back, if the Blades are now unengaged they may make a Normal move up to D3+3″.',
};

export function emperorsChildrenDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Emperor’s Children')return [];
 const has=(det:string)=>army.detachments2026?.some(n=>currentEcDetachment(n)===det);
 const available=new Set(emperorsChildrenMusterUnits(army)),active=roster.filter(s=>available.has(s.unit));
 const tags=new Map(active.map(s=>[s.id,emperorsChildrenKeywords(army,s)]));
 const tag=(s:RosterInstance,k:string)=>tags.get(s.id)?.has(k)===true;
 const forms=emperorsChildrenFormations(army,active).map(f=>({...f,ranged:f.members.some(s=>emperorsChildrenHasRangedWeapon(s))}));
 type Form=typeof forms[number];
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const ec=forms.filter(f=>kw(f,'EMPEROR’S CHILDREN')),legions=forms.filter(f=>kw(f,'LEGIONS OF EXCESS'));
 const characters=ec.filter(f=>kw(f,'CHARACTER')),battleline=ec.filter(f=>kw(f,'BATTLELINE')),terms=ec.filter(f=>kw(f,'TERMINATOR'));
 const transports=ec.filter(f=>kw(f,'TRANSPORT')),blades=ec.filter(f=>f.members.some(s=>s.unit==='Flawless Blades'));
 const roots=(list:readonly Form[])=>list.map(f=>f.root);
 const names=(list:readonly Form[])=>roots(list).map(s=>s.id).join(', ');
 const group=(s:RosterInstance)=>forms.find(f=>f.members.some(m=>m.id===s.id))!;
 const options=new Map(transports.map(t=>[t,emperorsChildrenCargoFormations(army,t.root,active).map(g=>group(g.root))]));
 const carriers=(p:Form)=>transports.filter(t=>options.get(t)?.includes(p));
 const cargo=ec.filter(f=>carriers(f).length),warlord=resolvedEmperorsChildrenWarlord({...army,instances:[...active]});
 const rows:GeneratedReminder[]=[];
 const issue=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,body:string,units:readonly RosterInstance[],sourceRuleId?:string)=>{
  if(units.length)rows.push({id:'11e-ec-'+key+'-'+window,window,turn,timing,title,summary:body,units:[...new Set(units.map(s=>s.id))],origin:'detachment',source,sourceRuleId});
 };
 const card=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,body:string,list:Form[])=>issue(key,title,window,turn,timing,body,roots(list));
 const selection=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 const profiles=(s:RosterInstance,phase:'Fight'|'Shooting')=>(EC_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase===phase&&emperorsChildrenWeaponCount(s,w.name)>0);
 if(has('Mercurial Host'))card('grace','Quicksilver Grace','Movement','own','during','These Emperor’s Children units may re-roll Advance rolls.',ec.filter(f=>!f.members.some(s=>selection(s)==='Warp Walker')));
 if(has('Peerless Bladesmen'))card('sword','Exquisite Swordsmanship','Fight','either','during','When the unit is selected to fight after charging this turn, choose Lethal Hits or Sustained Hits 1 for its melee weapons while it resolves those attacks.',ec);
 if(has('Rapid Evisceration'))for(const p of attacks){
  card('murder-transports','Mechanised Murder · Transports',p,p==='Fight'?'either':'own','during','Each attack by the Transport model re-rolls one Hit roll of 1 and one Wound roll of 1.',transports.filter(f=>p==='Fight'||f.ranged));
  card('murder-passengers','Mechanised Murder · disembarking models',p,p==='Fight'?'either':'own','during','When a model attacks in the turn it disembarked, re-roll its Hit rolls of 1 and Wound rolls of 1.',cargo.filter(f=>p==='Fight'||f.ranged));
 }
 if(has('Carnival of Excess')&&ec.length&&legions.length){
  for(const p of attacks){
   const participants=[...ec,...legions].filter(f=>p==='Fight'||f.ranged);
   const boosted=participants.flatMap(f=>f.members.flatMap(s=>{
    const selected=[...new Set(profiles(s,p).filter(w=>w.abilities.some(a=>/sustained hits/i.test(a))||(p==='Shooting'&&f.members.some(m=>m.unit==='Lord Kakophonist'&&m.id!==f.root.id))).map(w=>w.name))];
    return selected.length?[s.id+' — '+selected.join(', ')]:[];
   }));
   card('empowered','Daemonic Empowerment',p,p==='Fight'?'either':'own','during','Emperor’s Children and Legions of Excess units empower one another while within 6″. Their weapons gain Sustained Hits 1.'+(boosted.length?' These fitted weapons already have Sustained Hits and instead score Critical Hits on unmodified 5+: '+boosted.join('. ')+'.':'')+' Legions of Excess: '+names(legions)+'. Emperor’s Children: '+names(ec)+'.',participants);
  }
 }
 if(has('Coterie of the Conceited')){
  if(warlord){
   issue('pledge','Pledges to the Dark Prince','Start of battle round','either','start','If the Warlord is on the battlefield, pledge how many enemy units will be destroyed this round.',[warlord]);
   issue('pledge-score','Pledges to the Dark Prince · resolve','End of battle round','either','end','If the number of destroyed enemies meets or exceeds the pledge, gain Pact points equal to the pledge. Otherwise gain none and the Warlord suffers D3 mortal wounds.',[warlord]);
  }
  for(const p of attacks)card('pact','Pact points · cumulative benefits',p,p==='Fight'?'either':'own','during','At 1+ Pact point re-roll Hit rolls of 1. At 3+ also re-roll Wound rolls of 1. '+(p==='Fight'?'At 5+ melee weapons also have Lethal Hits and Sustained Hits 1. ':'')+'At 7+ score Critical Hits on unmodified 5+.',ec.filter(f=>p==='Fight'||f.ranged));
 }
 if(has('Slaanesh’s Chosen')){
  if(warlord)card('favoured','Internal Rivalries · initial Favoured Champions','Pre-battle','either','start','The Warlord’s formation starts the battle as your Favoured Champions.',[group(warlord)]);
  for(const p of ['Movement','Charge'] as const)card('rivals','Internal Rivalries',p,'own','during','These Character formations may ignore modifiers to '+(p==='Movement'?'Move and Advance rolls.':'Charge rolls.'),characters);
  for(const p of attacks)card('champions','Favoured Champions',p,p==='Fight'?'either':'own','during','Models in the current Favoured Champions formation can re-roll Wound rolls. The first time each player’s turn that one of your Character formations destroys an enemy, after its attacks it replaces the previous Champions.',characters.filter(f=>p==='Fight'||f.ranged));
 }
 if(has('Court of the Phoenician'))card('performance','Sensational Performance','Fight','either','during','After charging, when selected to fight choose whether to gain 1 melee Strength and improve melee AP by 1. If used, this unit cannot target an enemy it was engaged with at turn start or an enemy already targeted by another unit’s attack this phase.',ec);
 if(has('Elegant Brutes'))for(const p of ['Movement','Charge'] as const)card('eager','Eager to Kill',p,'own','during','Each time the Terminators are set up, add 1 to their Charge rolls until the turn ends.',terms);
 if(has('Frenzied Host')){
  for(const p of ['Movement','Shooting','Fight'] as const){
   const targets=battleline.flatMap(f=>f.members.filter(s=>tag(s,'BATTLELINE')&&(p!=='Shooting'||emperorsChildrenHasRangedWeapon(s))));
   issue('frantic','Frantic Focus',p,p==='Fight'?'either':'own','during','When the formation is selected to Advance or Fall Back, only its Battleline models gain Sustained Hits 1 on attacks until turn end.',targets);
  }
 }
 if(has('Spectacle of Slaughter'))card('entitled','Entitled to Victory','Fight','either','start','These Flawless Blades formations have Fights First.',blades);
 for(const strat of EMP_CHILDREN_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=forms.filter(f=>f.members.some(s=>strat.units.some(n=>n===s.unit))),body=effects[strat.id];
   switch(strat.id){
    case '000010011002':
     if(!legions.length)continue;targets=ec;
     if(legions.some(f=>f.root.unit==='Daemonettes'))body+=' For Daemonettes, return D3+3 destroyed models instead.';
     body+=' Recipients: '+names(legions)+'.';break;
    case '000010011003':case '000010011005':
     if(!ec.length)continue;targets=legions;body+=' Emperor’s Children formations: '+names(ec)+'.';break;
    case '000010011007':
     targets=legions.filter(f=>f.root.unit==='Daemonettes');
     if(ec.length){
      const arrival='If these Daemonettes were withdrawn by Dark Apparitions at the end of the preceding enemy Fight phase, set them up using Deep Strike wholly within 8″ of a friendly Emperor’s Children unit and more than 6″ horizontally from enemies. Eligible anchors: '+names(ec)+'.';
      card('apparitions-arrival','Dark Apparitions · return from reserves','Movement','own','during',arrival,targets);
      body+=' Stay wholly within 8″ of the friendly unit and more than 6″ from enemies.';
     }else body='Place the unengaged Daemonettes into Strategic Reserves.';
     break;
    case '000010655004':case '000010655003':
     if(targets.some(f=>f.members.some(s=>s.unit==='Fulgrim')))body+=' Master of the Pageant reduces the cost by 1CP when targeting Fulgrim, once per battle round shared between Sinuous Breach and Prideful Superiority.';
     break;
    case '000010655006':body+=' Eligible charge recipients: '+names(ec)+'.';break;
    case '000010007006':targets=transports.filter(t=>options.get(t)?.some(p=>ec.includes(p)));break;
    case '000010007002':case '000010007005':targets=cargo;break;
    case '000010007003':targets=transports.filter(t=>options.get(t)?.some(p=>p.members.some(s=>s.unit==='Tormentors')));break;
    case '000010019004':
     if(characters.length<2)continue;
     targets=characters.filter(f=>characters.some(other=>other!==f&&(phase==='Fight'||other.ranged)));break;
    case '000010019005':case '000010019006':case '000010019003':case '000010019002':case '000010019007':targets=characters;break;
    case '000010957002':case '000010957003':case '000010957004':targets=battleline;break;
    case '000010953004':case '000010953003':case '000010953002':targets=terms;break;
   }
   if(phase==='Shooting'&&turn==='own'&&strat.id!=='000010957003')targets=targets.filter(f=>f.ranged);
   if(strat.id==='000010007006'||strat.id==='000010007003'){
    if(targets.length)body+=' Possible cargo: '+targets.map(t=>t.root.id+' with '+names((options.get(t)??[]).filter(f=>strat.id==='000010007006'||f.members.some(s=>s.unit==='Tormentors')))).join('. ')+'.';
   }else if(strat.id==='000010007002'||strat.id==='000010007005'){
    if(targets.length)body+=' Possible carriers: '+targets.map(f=>f.root.id+' with '+names(carriers(f))).join('. ')+'.';
   }
   const title=(strat.id==='000010007002'?'ON TO THE NEXT':strat.name).toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,c=>c.toUpperCase())+' · '+strat.cp+'CP';
   issue('strat-'+strat.id,title,phase,turn,strat.timing,body,roots(targets),strat.id);
  }
 }
 for(const bearer of active){
  const selected=selection(bearer),upgrade=selected&&eligibleEmperorsChildrenUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===selected);
  if(!upgrade)continue;
  const form=group(bearer),unit=[form.root],bearerOnly=[bearer];
  const cue=(p:ReminderWindow,turn:Turn,when:Timing,text:string,units:readonly RosterInstance[]=bearerOnly)=>
   issue(upgrade.id+'-'+bearer.id,bearer.id+' · '+upgrade.name,p,turn,when,text,units,upgrade.id);
  const attack=(text:string,units:readonly RosterInstance[]=unit)=>{
   if(form.ranged)cue('Shooting','own','during',text,units);
   cue('Fight','either','during',text,units);
  };
  switch(upgrade.id){
   case '000010018002':
    cue('Charge','own','during','The bearer’s formation can re-roll Charge rolls.',unit);
    cue('Movement','own','during','While the bearer’s formation is Favoured Champions, add 2″ to its models’ Move.',unit);break;
   case '000010002002':cue('Charge','opponent','end','The bearer’s formation can use Heroic Intervention for 1CP less even if the Stratagem was already used this phase. This use leaves other formations free to use it again.',unit);break;
   case '000010010002':cue('Charge','opponent','end','When this formation is targeted by Heroic Intervention, reduce its CP cost by 1.',unit);break;
   case '000010014002':
    for(const p of phases)cue(p,'either','end','The first time the bearer was destroyed, take a Leadership test at phase end. If passed, set the bearer back as close to its former position as possible, outside Engagement Range, with D6 wounds up to its starting Wounds.');break;
   case '000010006002':cue('Movement','own','during','Once per turn choose a friendly Emperor’s Children Transport in Strategic Reserves. Through phase end treat the round as one higher when setting it up.',roots(transports));break;
   case '000009998002':attack('Against targets below Starting Strength add 1 to Hit. Against targets below Half-strength also add 1 to Wound.');break;
   case '000010654002':cue('Fight','either','during','The whole formation can ignore modifiers to Weapon Skill, Hit rolls and Wound rolls on its melee attacks.',unit);break;
   case '000010956002':cue('Fight','either','during','Only the Lord Exultant’s melee attacks gain 1 Strength.');break;
   case '000010960002':cue('Movement','own','during','Add 2″ to the Move of the upgraded Flawless Blades unit.',unit);break;
   case '000010952002':
    cue('Pre-battle','either','during','The Lord Kakophonist model gains Deep Strike. An attached unit can deploy using Deep Strike only if all its models have it.'); 
    if(form.ranged)cue('Shooting','own','during','The formation’s ranged attacks gain Ignores Cover.',unit);break;
   case '000010006003':if(cargo.includes(form)){
    cue('Movement','own','end','After the bearer disembarks, Fire Overwatch cannot target this formation for the rest of the turn.',unit);
    cue('Charge','own','during','If the bearer disembarked this turn, its formation may re-roll Charge rolls.',unit);
   }break;
   case '000010952003':attack('The upgraded Terminator unit’s attacks have Sustained Hits 1.');break;
   case '000010002003':cue('Fight','either','start','Once per battle activate Fights First for every model in the bearer’s formation through phase end.',unit);break;
   case '000010960003':cue('Movement','own','end','Enemy units cannot target this formation with snap shooting attacks.',unit);break;
   case '000010956003':if(form.ranged)cue('Shooting','own','during','Improve the AP of all ranged attacks by the bearer’s formation by 1.',unit);break;
   case '000009998003':cue('Fight','either','during','When a melee attack against this formation has Strength greater than its Toughness, subtract 1 from the Wound roll.',unit);break;
   case '000010654003':cue('Movement','own','during','Add 1″ to the bearer’s Move. The Lord Exultant can also lead Flawless Blades.');break;
   case '000010014003':if(form.root!==bearer)cue('Command','either','during','While leading, improve Leadership and Objective Control of every model in the formation by 1.',unit);break;
   case '000010018003':cue('Movement','opponent','during','When an engaged enemy other than a Monster or Vehicle Falls Back, its models must pass Desperate Escape tests. Subtract 1 from the tests if the bearer’s unit is Favoured Champions.',unit);break;
   case '000010010003':for(const p of attacks)cue(p,p==='Fight'?'either':'opponent','during','Once per battle, immediately after enemy target selection, the bearer can gain a 3+ invulnerable save until phase end.');break;
   case '000010002004':cue('Fight','either','during','Add 1 Attack and 1 Damage to the bearer’s melee weapons.');break;
   case '000010014004':cue('Shooting','own','start','Choose one visible enemy within 12″. It tests Leadership at −2 if Battle-shocked. A failure deals 3 mortal wounds.');break;
   case '000010010004':{
    const swords=[...new Set(profiles(bearer,'Fight').map(w=>w.name))];
    if(swords.length){
     cue('Pre-battle','either','start','At battle start choose one of the bearer’s equipped melee weapons: '+swords.join(', ')+'. That weapon gains 1 Attack.');
     cue('Fight','either','during','The chosen melee weapon has +1 Attack. Each time the bearer fights, you may also give that weapon +1 Damage, Devastating Wounds and Hazardous for those attacks.');
    }break;
   }
   case '000010018004':for(const p of phases)cue(p,'either','during','Re-roll Leadership and Battle-shock tests for the bearer’s formation. While Favoured Champions, its models also gain 1 Objective Control.',unit);break;
   case '000009998004':cue('Pre-battle','either','end','After both armies deploy, redeploy up to two friendly Emperor’s Children units. They may enter Strategic Reserves regardless of the number of units already there.',roots(ec));break;
   case '000010654004':cue('Fight','either','start','Choose an enemy engaged with the bearer. It takes a Battle-shock test at −1.');break;
   case '000010006004':cue('Shooting','opponent','during','Once per turn after enemy shooting, an Emperor’s Children unit hit within 9″ of the bearer can embark in a compatible Transport if wholly within 6″. Possible carriers: '+cargo.map(f=>f.root.id+' with '+names(carriers(f))).join('. ')+'.',roots(cargo));break;
   case '000010002005':cue('Fight','either','end','Once per battle, if the bearer is engaged with at least three enemy models, it can fight a second time. Choose Lethal Hits or Sustained Hits 1 for those attacks using Exquisite Swordsmanship.');break;
   case '000010010005':cue('Movement','own','during','Add 6″ instead of rolling to Advance. During Normal moves, Advances and Falls Back this formation may pass through enemies and Engagement Range, but must end outside enemy Engagement Range. Its Desperate Escape tests pass automatically.',unit);break;
   case '000010014005':for(const p of attacks)cue(p,'either','during','Once per turn, if the bearer is not Battle-shocked, after a Hit roll, Wound roll or saving throw for its formation, replace the result with an unmodified 6.',unit);break;
   case '000009998005':cue('Movement','own','during','During Normal moves, Advances and Falls Back this formation may pass through enemies and Engagement Range but cannot end engaged. Its Desperate Escape tests automatically pass.',unit);break;
   case '000010654005':cue('Fight','either','during','Add 1 Strength and 1 Attack to the Daemon Prince bearer’s melee weapons.');break;
   case '000010018005':cue('Fight','either','during','The bearer’s melee weapons have Precision. Against a Character unit its melee attacks gain 1 Strength and improve AP by 1.');break;
   case '000010006005':for(const p of attacks)cue(p,p==='Fight'?'either':'opponent','during','Once per battle round, when a friendly Emperor’s Children Vehicle model within 6″ of the bearer fails a saving throw, change that attack’s Damage to 0.',roots(ec.filter(f=>kw(f,'VEHICLE'))));break;
  }
 }
 return rows;
}
