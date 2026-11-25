import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {knightWeaponCount} from './knight-loadouts';
import {DAEMON_SHEETS,daemonKeywords,shadowLegionBans} from './chaos-daemons-data';
import {daemonicPactAllegiance} from './daemonic-pact';
import {DAEMON_DETACHMENTS,DAEMON_STRATAGEMS,DAEMON_TRAITS,DAEMON_UPGRADES} from './chaos-daemon-detachments.generated';

export {DAEMON_DETACHMENTS};
const source='https://wahapedia.ru/wh40k11ed/factions/chaos-daemons/';
const normal=(s:string)=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[‑–]/g,'-');
const byUnit=new Map(DAEMON_SHEETS.map(s=>[normal(s.unit),s]));
const gear=new Map(DAEMON_TRAITS.map(s=>[normal(s.unit),s]));
const princes=['daemon prince of chaos','daemon prince of chaos with wings'];
const greater=new Set(['Bloodthirster','Great Unclean One','Kairos Fateweaver','Keeper Of Secrets','Lord of Change','Rotigus','Shalaxi Helbane','Skarbrand'].map(normal));
const selected=(army:ArmySelection,name:string)=>army.detachments2026?.some(d=>normal(d)===normal(name));
export {shadowLegionBans as daemonShadowRestrictedUnit};
export function eligibleDaemonUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Chaos Daemons')return [];
 const key=normal(unit),sheet=byUnit.get(key),shadow=selected(army,'Shadow Legion');
 if(unit==='Exalted Flamer'||!sheet||(shadow&&shadowLegionBans(unit)))return [];
 const squad=expandRoster(army).find(s=>s.id===id)??{unit,id:id??unit};
 const keywords=daemonKeywords(army,squad);
 const marine=shadow&&keywords.has('HERETIC ASTARTES')&&keywords.has('CHARACTER');
 if(!keywords.has('LEGIONES DAEMONICA')&&!marine)return [];
 const god=normal(daemonicPactAllegiance(squad)??'');
 return DAEMON_UPGRADES.filter(u=>{
  if(!selected(army,u.detachment))return false;
  if(marine)return u.detachment==='Shadow Legion'&&u.units.some(n=>normal(n)===key);
  if(sheet?.keywords?.includes('EPIC HERO'))return false;
  if(princes.includes(key)&&!u.repeatable&&u.detachment!=='Shadow Legion'){
   const gods:Record<string,string>={
    'Daemonic Incursion':({'A’rgath, the King of Blades':'khorne','Soulstealer':'slaanesh','The Endless Gift':'nurgle','The Everstave':'tzeentch'} as Record<string,string>)[u.name],
    'Blood Legion':'khorne','Legion of Excess':'slaanesh','Scintillating Legion':'tzeentch','Plague Legion':'nurgle',
   };
   return !!god&&gods[u.detachment]===god;
  }
  return u.units.some(n=>normal(n)===key);
 });
}
type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Formation=RosterInstance[];
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const keyword=(s:RosterInstance,k:string)=>byUnit.get(normal(s.unit))?.keywords?.includes(k)===true;
const native=(s:RosterInstance)=>keyword(s,'LEGIONES DAEMONICA');
const marine=(s:RosterInstance)=>keyword(s,'HERETIC ASTARTES');
const forGod=(s:RosterInstance,god:string)=>daemonicPactAllegiance(s)?.toLowerCase()===god;
const hasWeapon=(s:RosterInstance,kind:'ranged'|'melee')=>{
 const profiles=gear.get(normal(s.unit))?.[kind];
 if(profiles)return profiles.some(w=>knightWeaponCount(s,w)>0);
 return false;
};
const hasDeepStrike=(s:RosterInstance)=>gear.get(normal(s.unit))?.deepStrike===true;
function formations(army:ArmySelection,roster:readonly RosterInstance[]):Formation[]{
 const represented=roster.filter(s=>selected(army,'Shadow Legion')?daemonKeywords(army,s).has('SHADOW LEGION')&&!shadowLegionBans(s.unit):native(s));
 const groups=new Map<string,Formation>();
 for(const squad of represented){
  const target=represented.find(s=>s.id===squad.attachedTo);
  const permitted=target&&byUnit.get(normal(squad.unit))?.bodyguards?.some(name=>normal(name)===normal(target.unit));
  const key=target&&permitted?target.id:squad.id;
  groups.set(key,[...groups.get(key)??[],squad]);
 }
 return [...groups.values()];
}
const allPhase=phases.join(',');
interface StratCue {windows:string;turn:Turn;timing?:Timing;scope?:string;cue:string}
const strats:Record<string,StratCue>={
 'daemonic invulnerability':{windows:'Shooting',turn:'opponent',cue:'After an enemy chooses this unit as a target, re-roll invulnerable saves of 1 for its models through this phase.'},
 'the realm of chaos':{windows:'End of opponent turn',turn:'opponent',timing:'end',cue:'Put up to two unengaged Daemon units in your Shadow of Chaos, or one other unengaged Daemon unit, into Strategic Reserves. They must ingress in your next Movement phase, including turn one.'},
 'draught of terror':{windows:'Shooting,Fight',turn:'either',scope:'attack',cue:'Before this unit shoots or fights, improve its weapons’ AP by 1 this phase. Re-roll wound rolls against Battle-shocked targets.'},
 'denizens of the warp':{windows:'Movement',turn:'own',scope:'deep',cue:'Set up this arriving Deep Strike unit more than 6″ horizontally from every enemy model.'},
 'warp surge':{windows:'Charge',turn:'own',scope:'mobile',cue:'A unit in your Shadow of Chaos that Advanced may charge this phase.'},
 'corrupt realspace':{windows:'Command',turn:'either',timing:'start',cue:'Choose a unit within range of an objective you control. Its marker stays yours until the enemy controls it at the start or end of a turn. The area within 6″ is in your Shadow while you hold that corrupted marker.'},
 'archagonists':{windows:'Fight',turn:'either',scope:'attack',cue:'Before fighting, choose one Slaanesh Monster unit or up to two Slaanesh non-Monster units. Their attacks get +1 to wound this phase.'},
 'overwhelming excess':{windows:'Shooting,Fight',turn:'opponent',cue:'After enemy target selection, attacks against this targeted unit take −1 to hit through this phase.'},
 'cavalcade of blades':{windows:'Charge',turn:'own',cue:'Just after the charge move ends, pick one engaged enemy. Roll one D6 per charging model in its Engagement Range, or six dice for a Monster unit. Each 4+ causes one mortal wound.'},
 'rapturous agony':{windows:'Shooting,Fight',turn:'opponent',scope:'small',cue:'When an enemy targets this non-Monster, non-Vehicle unit, subtract 1 from wound rolls for attacks whose Strength exceeds its Toughness.'},
 'phantasmal longing':{windows:'Movement,Charge',turn:'own',cue:'This unit’s models may move through terrain features during this phase.'},
 'sensory excruciation':{windows:'Command',turn:'own',scope:'monster',cue:'Choose a Slaanesh Monster on the battlefield. Every friendly and enemy unit within your Shadow of Chaos tests Battle-shock, with −1 if below half strength. Successful friendly tests can trigger Daemonic Manifestation.'},
 'pyrogenesis':{windows:'Shooting,Fight',turn:'either',scope:'attack',cue:'Before this unit shoots or fights, its weapons get +2 Strength this phase. Spend one Flux token for +3 Strength and one better AP instead.'},
 'fateborne nightmares':{windows:'Movement,Charge',turn:'own',cue:'This unit can pass through terrain features when its models move this phase.'},
 'impossible eclipse':{windows:allPhase,turn:'either',scope:'monster',cue:'Choose a Tzeentch Monster on the battlefield. Add No Man’s Land or the enemy deployment zone to your Shadow until phase end, or spend a Flux token to add both.'},
 'flickering reality':{windows:'Fight',turn:'either',cue:'After the enemy targets this unit, roll a D6. One Flux token lets you re-roll it. Through this phase, attacks against it end on a matching unmodified hit roll after re-rolls, including Critical Hits.'},
 'ficklefire':{windows:'Shooting',turn:'own',cue:'Choose a unit engaged with an enemy. Ignore that engagement for choosing ranged targets and resolving ranged attacks this phase. For each enemy model destroyed while its unit is engaged with yours, a 5+ causes your unit one mortal wound after the attacking unit finishes.'},
 'delirium unmade':{windows:'Fight',turn:'opponent',timing:'end',cue:'Put one unengaged Tzeentch unit in Strategic Reserves. Spend one Flux token to choose up to two Tzeentch units, including engaged units.'},
 'sheathed in brass':{windows:'Shooting',turn:'opponent',cue:'After enemy target selection, give models in the targeted Khorne unit a 3+ Save through phase end.'},
 'fools\' flight':{windows:'Movement',turn:'opponent',cue:'After an enemy Falls Back, an unengaged Khorne unit within 6″ may declare a charge. Only enemies that Fell Back this phase and are within charge range can be targets.'},
 'blood begets skulls':{windows:'Charge',turn:'own',cue:'Before selecting this unit to charge, allow it to charge after Advancing this turn.'},
 'skulls beget blood':{windows:'Shooting',turn:'own',scope:'footOrMounted',cue:'An unengaged Khorne Infantry or Mounted unit that did not Fall Back can pick a visible enemy within 8″, outside Engagement Range of all your units. Roll six D6, inflicting one mortal wound per 4+.'},
 'gore-hungry onslaught':{windows:'Movement,Charge',turn:'own',cue:'This unit’s models may pass through terrain features when moving in this phase.'},
 'wrath undeniable':{windows:'Fight',turn:'either',scope:'attack',cue:'After enemy target selection, each model in the targeted unit destroyed by a melee attack before it fights may fight on a 4+ after its attacker finishes. Then remove it.'},
 'seeping virulence':{windows:'Fight',turn:'either',scope:'attack',cue:'Before this unit fights, give its attacks Critical Hits on unmodified hit rolls of 5+ through phase end.'},
 'fever visions':{windows:'Shooting,Fight',turn:'either',scope:'attack',cue:'Before shooting or fighting, gain +1 to hit this phase. After its attacks, choose one enemy unit hit by your unit to take a Battle-shock test.'},
 'murkshadows':{windows:'Movement',turn:'own',scope:'infantry',cue:'When making Normal moves this phase, models in the selected Nurgle Infantry unit get +5″ Move.'},
 'plague of woes':{windows:'Command',turn:'opponent',cue:'Before choosing Melancholic Miasma targets, choose a Nurgle unit. After an enemy tests for that rule, a different enemy within 9″ of your unit must also test.'},
 'rot and renewal':{windows:'Movement,Charge',turn:'own',cue:'Models in this unit may move through terrain features for this phase.'},
 'foetid resurgence':{windows:'Command',turn:'own',scope:'revive',cue:'Return one destroyed non-Character model at full wounds, or up to D3 for Battleline. For a Monster unit, heal one model by up to D3+1 wounds instead.'},
 'encroaching darkness':{windows:'Shooting',turn:'own',scope:'attack',cue:'Pick up to one Heretic Astartes unit and up to one Daemon unit that arrived from Reserves this turn. Their weapons gain Ignores Cover for this phase.'},
 'death denied':{windows:'Command',turn:'own',cue:'One model recovers up to three wounds. A Tzeentch unit may also restore one destroyed non-Character model at full wounds.'},
 'shade path':{windows:'Charge',turn:'opponent',timing:'start',cue:'Select a visible enemy within 12″ of this unit. Its charge rolls take −1 when it declares a charge. If your unit is Nurgle, the enemy must also take a Battle-shock test.'},
 'spiteful demise':{windows:allPhase,turn:'either',cue:'Immediately after this unit is destroyed, before removing the last model or rolling Deadly Demise, roll a D6 per enemy engaged with it. Add 2 for Slaanesh. On 4–5 inflict D3 mortal wounds, on 6+ inflict three.'},
 'channelled wrath':{windows:'Fight',turn:'either',scope:'attack',cue:'Before fighting, give the unit’s melee weapons Lance for the phase. A Khorne unit also improves those weapons’ AP by 1.'},
 'binding shadow':{windows:'Fight',turn:'opponent',timing:'end',cue:'Put up to one unengaged Heretic Astartes unit and up to one unengaged Daemon unit into Strategic Reserves.'},
 'inescapable manifestations':{windows:'Movement',turn:'opponent',cue:'When an enemy Falls Back from this Mounted unit, it must use desperate escape. If Battle-shocked, it also subtracts 1 from those hazard rolls.'},
 'warp-riders':{windows:'Movement',turn:'own',cue:'When selected to move, this Mounted unit gains Mobile.'},
 'from beyond the veil':{windows:'Movement',turn:'either',timing:'end',cue:'A Mounted unit in Strategic Reserves may ingress at the end of this Movement phase, including from the first turn.'},
 'carnival of excess':{windows:'Fight',turn:'either',scope:'slaaneshCharacter',cue:'After an enemy has fought, give one eligible Slaanesh non-Monster Character unit that has not fought Fights First. It must be the next unit you choose to fight.'},
 'call to murder':{windows:'Fight',turn:'either',scope:'khorneCharacter',cue:'When a charging Khorne non-Monster Character unit fights, add 1 to the Attacks of its melee attacks.'},
 'skirling magicks':{windows:'Shooting',turn:'own',scope:'tzeentchCharacter',cue:'When selected to shoot, this Tzeentch non-Monster Character unit’s ranged attacks gain Lethal Hits.'},
 'bilious blessing':{windows:'Shooting',turn:'own',timing:'start',scope:'nurgleCharacter',cue:'Pick a visible enemy within 8″ of this Nurgle non-Monster Character unit. Roll seven D6, inflicting one mortal wound per 4+.'},
 'incorporeal entities':{windows:'Shooting',turn:'opponent',cue:'After an enemy targets this Battleline unit, subtract 1 from wound rolls for ranged attacks with Strength above its Toughness.'},
 'daemonic infestation':{windows:'Command',turn:'own',scope:'nonPink',cue:'Heal three wounds on this Battleline unit. Pink Horrors cannot be chosen.'},
 'soulseeing':{windows:'Shooting',turn:'own',timing:'start',cue:'Select a visible enemy within 12″ of this Battleline unit. Increase the enemy’s detection range by 6″.'},
};

const godOfDetachment:Record<string,string>={'Blood Legion':'khorne','Scintillating Legion':'tzeentch','Plague Legion':'nurgle','Legion of Excess':'slaanesh'};
function detachmentGroup(name:string,formation:Formation):boolean{
 const has=(k:string)=>formation.some(s=>keyword(s,k));
 const god=godOfDetachment[name];
 if(god)return formation.some(s=>native(s)&&forGod(s,god));
 if(name==='Shadow Legion')return formation.some(s=>native(s)||marine(s));
 if(name==='Cavalcade of Chaos')return has('MOUNTED');
 if(name==='Lords of the Warp')return has('CHARACTER')&&!has('MONSTER');
 if(name==='Warptide')return has('BATTLELINE');
 return formation.some(native);
}
function inScope(scope:string|undefined,f:Formation,window:ReminderWindow):boolean{
 const has=(k:string)=>f.some(s=>keyword(s,k));
 if(scope==='deep')return f.every(hasDeepStrike);
 if(scope==='mobile')return !has('FORTIFICATION');
 if(scope==='small')return !has('MONSTER')&&!has('VEHICLE');
 if(scope==='monster')return has('MONSTER');
 if(scope==='footOrMounted')return has('INFANTRY')||has('MOUNTED');
 if(scope==='infantry')return has('INFANTRY');
 if(scope==='revive')return has('MONSTER')||f.some(s=>!keyword(s,'CHARACTER')&&(byUnit.get(normal(s.unit))?.sizes?.at(-1)??1)>1);
 if(scope==='nonPink')return !f.some(s=>s.unit==='Pink Horrors');
 if(scope?.endsWith('Character'))return f.some(s=>forGod(s,scope.slice(0,-9)))&&(scope!=='tzeentchCharacter'||f.some(s=>hasWeapon(s,'ranged')));
 if(scope==='attack')return f.some(s=>hasWeapon(s,window==='Fight'?'melee':'ranged'));
 return true;
}
interface EnhancementCue {windows:readonly ReminderWindow[];cue:string;turn?:Turn;timing?:Timing;formation?:boolean;nearby?:'smallGod'|'god';}
const attack=['Shooting','Fight'] as const;
const upgradeCues:Record<string,EnhancementCue>={
 'A’rgath, the King of Blades':{windows:['Fight'],cue:'The bearer’s melee weapons get +1 Attack and Strength, increased to +2 for both while the bearer is in your Shadow of Chaos.'},
 'Soulstealer':{windows:['Fight'],cue:'After each enemy model the bearer destroys in melee, roll a D6, adding 1 in your Shadow. On a 4+ the bearer heals one wound.'},
 'The Endless Gift':{windows:phases,cue:'The bearer ignores each lost wound on a Feel No Pain roll of 5+.'},
 'The Everstave':{windows:['Shooting'],cue:'The bearer’s ranged weapons get +1 Strength and +3″ range. Within your Shadow, use +2 Strength and +6″ range instead.'},
 'False Majesty':{windows:['Fight'],nearby:'smallGod',cue:'Friendly Slaanesh non-Monster Daemon units within 6″ of the bearer get +1 to wound with melee attacks.'},
 'Dreaming Crown':{windows:['Fight'],nearby:'smallGod',cue:'Friendly Slaanesh non-Monster Daemon units within 6″ of the bearer get +1 to hit with melee attacks.'},
 'Avatar of Perfection':{windows:phases,timing:'start',cue:'If every other friendly unit is more than 6″ away, the bearer may re-roll its Advance and Charge rolls and ignore any modifiers to its Move, Advance or Charge rolls.'},
 'Soul Glutton':{windows:['Fight'],timing:'end',cue:'If an attack by the bearer destroyed an enemy model this phase, heal up to D3 wounds on the bearer.'},
 'Inescapable Eye':{windows:['Command'],turn:'own',cue:'While the bearer is on the battlefield, if the opponent has at least one Flux token, gain one additional Flux token.'},
 'Infernal Puppeteer':{windows:['Shooting'],turn:'own',cue:'When the bearer’s unit is selected to shoot, any enemy visible to a friendly Tzeentch Daemon unit has +9″ detection range until the bearer’s unit finishes shooting.'},
 'Neverblade':{windows:['Fight'],cue:'The bearer’s melee weapons gain 2 Strength, 1 Attack, and one better AP. Add 1 to the bearer’s melee hit rolls.'},
 'Improbable Shield':{windows:phases,nearby:'god',cue:'Friendly Tzeentch Daemon units within 6″ of the bearer have Feel No Pain 4+ against psychic attacks and mortal wounds.'},
 'Slaughterthirst':{windows:['Fight'],nearby:'smallGod',cue:'Models in friendly Khorne non-Monster Daemon units within 6″ of the bearer have Lance on their weapons.'},
 'Fury’s Cage':{windows:['Fight'],cue:'When the bearer is selected to fight it may suffer D3+1 mortal wounds. If it does so, re-roll its attack hit and wound rolls for this phase.'},
 'Brazenmaw':{windows:['Charge'],formation:true,cue:'Add 2 to charge rolls for the bearer’s unit.'},
 'Gateway Unto Damnation':{windows:phases,cue:'When the bearer is destroyed, its Deadly Demise triggers on 2+. If it destroyed an enemy unit this battle, its Deadly Demise damage becomes D3+3.'},
 'Cankerblight':{windows:phases,cue:'After an enemy within 6″ fails Battle-shock, excluding Monsters and Vehicles, you may have its controller destroy one of its models. Replace Daemonic Terror’s mortal wounds for that test.'},
 'Maggot Maws':{windows:['Shooting'],turn:'own',cue:'Choose an enemy within 6″ to test Battle-shock. Roll one D6, inflicting D3 mortal wounds on 3+. Daemonic Terror causes no mortal wounds from this use.'},
 'Droning Shroud':{windows:['Shooting'],nearby:'god',cue:'A friendly Nurgle Daemon unit within 6″ of the bearer can only be targeted by ranged attacks from models within 18″ of that unit.'},
 'Font of Spores':{windows:attack,nearby:'god',cue:'Improve weapon AP by 1 for models in friendly Nurgle Daemon units within 6″ of the bearer.'},
 'Leaping Shadows':{windows:['Pre-battle'],formation:true,cue:'Models in the bearer’s unit have Scouts 9″. Resolve the Scout move before the first turn.'},
 'Mantle of Gloom':{windows:phases,formation:true,cue:'Enemy models in units engaged with the bearer’s unit get −1 Objective Control.'},
 'Fade to Darkness':{windows:['Fight'],timing:'end',formation:true,cue:'If the bearer’s unit destroyed an enemy unit this phase and is unengaged, it may enter Strategic Reserves.'},
 'Malice Made Manifest':{windows:['Fight'],timing:'start',formation:true,cue:'Choose an enemy engaged with the bearer’s unit and roll one D6. On 2–5 it suffers D3 mortal wounds, on a 6 it suffers three.'},
 'Apocalyptic Steeds':{windows:['Movement'],formation:true,cue:'Models in the upgraded Mounted unit have +1″ Move.'},
 'Soul-Shattering Charge':{windows:['Fight'],formation:true,cue:'When selected to fight after charging this turn, the upgraded unit may let its models within 3″ of an engaged enemy unit target that enemy.'},
 'Swollen with Power':{windows:['Pre-battle'],cue:'Increase the upgraded non-Monster Character model’s Wounds characteristic by 2.'},
 'Bane-Forged Weapons':{windows:attack,formation:true,cue:'The upgraded Battleline unit’s attacks have +1 Strength.'},
 'Soul-Hungry Slaughterers':{windows:['Movement','Charge'],turn:'opponent',cue:'Reduce Heroic Intervention or Fire Overwatch by 1CP when it targets this upgraded Battleline unit. Follow the normal eligibility and targeting restrictions for the Stratagem used.'},
};
export function daemonArmyReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Chaos Daemons')return [];
 const groups=formations(army,roster),nativeGroups=groups.filter(f=>f.some(native)),all=nativeGroups.flat();
 if(!groups.length)return [];
 const rows:GeneratedReminder[]=[];
 function add(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,subjects:readonly RosterInstance[],origin:GeneratedReminder['origin']='detachment',sourceRuleId?:string){
  if(!subjects.length)return;
  rows.push({id:'11e-daemon-'+id+'-'+window,title,window,turn,timing,summary,source,origin,units:[...new Set(subjects.map(s=>s.id))],...(sourceRuleId?{sourceRuleId}:{})});
 }
 const anchors=all.filter(s=>greater.has(normal(s.unit)));
 for(const phase of phases){
  add('shadow','The Shadow of Chaos',phase,'either','start','Your deployment zone is in your Shadow. Each other zone enters it for this phase if it contains objectives and you control at least half of them at phase start, counting No Man’s Land and the enemy deployment zone separately.',all,'army');
  add('manifest','Daemonic Manifestation',phase,'either','during','When one of these units tests Battle-shock within your Shadow, add 1 to the roll. On success heal D3 wounds on one model, or restore up to D3 destroyed non-Character models to a Battleline unit instead. Insane Bravery counts as a successful test.',all,'army');
  add('terror','Daemonic Terror',phase,'either','during','An enemy testing Battle-shock in your Shadow'+(anchors.length?' or within 6″ of '+anchors.map(s=>s.id).join(', '):'')+' takes −1 to the test. A failed test inflicts D3 mortal wounds on that enemy.',all,'army');
 }
 for(const det of DAEMON_DETACHMENTS){
  if(!selected(army,det.name))continue;
  const relevant=groups.filter(f=>detachmentGroup(det.name,f)),units=relevant.flat();
  const act=(id:string,name:string,w:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets=units)=>add(id,name,w,turn,timing,summary,targets);
  if(det.name==='Daemonic Incursion'){
   act('realm-return','The Realm of Chaos · required ingress','Movement','own','during','Any unit put in Strategic Reserves by The Realm of Chaos at the previous opponent turn end must ingress this Movement phase, even in round one.');
   for(const [god,members] of [undefined,'khorne','tzeentch','nurgle','slaanesh'].map(g=>[g,relevant.filter(f=>f.every(hasDeepStrike)&&f.some(s=>daemonicPactAllegiance(s)?.toLowerCase()===g)).flat()] as const)){
    const nearby=god?anchors.filter(s=>forGod(s,god)):[];
    act('rift-'+(god??'undivided'),'Warp Rifts','Movement','either','during','When setting up with Deep Strike wholly in your Shadow'+(nearby.length?' or wholly within 6″ of a matching friendly Greater Daemon ('+nearby.map(s=>s.id).join(', ')+')':'')+', every model may set up more than 6″ horizontally from enemies. The arriving unit cannot use its own aura.',members);
   }
  }
  if(det.name==='Blood Legion'){
   act('murdercall','Murdercall','Movement','opponent','during','Each time an enemy other than an Aircraft finishes a move within 8″ of one or more Khorne Daemon units, one of those units may surge up to D6″.');
   for(const phase of phases)act('blood-tainted','Blood Tainted',phase,'either','end','If this unit destroyed an enemy that began the phase in range of an objective and you now have higher control there, retain the marker until the enemy exceeds your control at a phase end.');
  }
  if(det.name==='Legion of Excess'){
   act('aura','Beguiling Aura','Charge','own','during','These Slaanesh Daemon units may declare a charge after Falling Back this turn.');
   for(const w of ['Charge','Fight'] as const)act('gambit','Seductive Gambit',w,'own','during','When a unit ends a charge, it may give up Fights First for the rest of the turn to re-roll hits and wound rolls of 1 when attacking.');
  }
  if(det.name==='Scintillating Legion'){
   act('flux-pool','Fates in Flux','Pre-battle','either','start','Begin the battle with three Flux tokens. Spent tokens pass to the other player.');
   act('flux-gain','Fates in Flux','Command','own','during','Gain one Flux token if the opponent has any Flux tokens.');
   for(const phase of phases)act('flux-use','Fates in Flux · re-rolls',phase,'either','during','Spend one Flux token just after a friendly Tzeentch Daemon Advance, hit, wound, damage, save or Hazardous roll to re-roll it. Transfer spent tokens to the opponent, including when enhancing Stratagems. Unless they also have Fates in Flux, they can return tokens to re-roll their own Advances, hits, wounds or saves.');
  }
  if(det.name==='Plague Legion'){
   act('miasma','Melancholic Miasma','Command','either','during','Select an enemy in your Shadow of Chaos to test Battle-shock. Enemies within 9″ of a friendly Nurgle Daemon unit also count as in your Shadow.');
   for(const w of ['Movement','Shooting','Charge','Fight'] as const)act('miasma-aura','Melancholic Miasma · Shadow of Chaos',w,'either','during','Enemies within 9″ of these Nurgle Daemon units count as in your Shadow of Chaos.');
  }
  if(det.name==='Cavalcade of Chaos'){
   for(const w of ['Shooting','Charge'] as const)act('avalanche','Unholy Avalanche',w,'own','during','A Mounted Daemon unit that Fell Back this turn can still shoot and declare a charge.',relevant.filter(f=>w==='Charge'||f.some(s=>hasWeapon(s,'ranged'))).flat());
  }
  if(det.name==='Lords of the Warp')act('loci','Loci of Power','Pre-battle','either','during','The non-Monster Daemon Character models listed here get +1 Leadership and +1 Objective Control.',units.filter(s=>keyword(s,'CHARACTER')&&!keyword(s,'MONSTER')));
  if(det.name==='Warptide'){
   for(const w of ['Movement','Shooting','Charge'] as const)act('shudder','Shudderblink',w,'own','during','After this Battleline unit is selected to Advance, its ranged attacks gain Assault through turn end and it can charge this turn.',relevant.filter(f=>w!=='Shooting'||f.some(s=>hasWeapon(s,'ranged'))).flat());
  }
  if(det.name==='Shadow Legion'){
   const of=(god:string)=>relevant.filter(f=>f.some(s=>forGod(s,god))).flat();
   const undivided=relevant.filter(f=>f.some(s=>normal(s.unit)===normal('Be’lakor')||marine(s)));
   act('shadow-muster','Thralls of the First Prince','Pre-battle','either','during','Daemons gain Shadow Legion. Be’lakor and the permitted Heretic Astartes units gain Shadow Legion and Undivided. Exclude both Daemon Princes and all other Epic Heroes. Allied Heretic Astartes may use up to half the battle-size allowance.');
   act('shadow-deep','Disciples of Be’lakor · Deep Strike','Movement','either','during','Heretic Astartes models in Shadow Legion Undivided units have Deep Strike.',units.filter(s=>marine(s)));
   for(const w of attack)act('shadow-pact','Disciples of Be’lakor · Dark Pacts',w,'either','during','When your unit is selected to shoot or fight, it may make a Dark Pact. Test Leadership and suffer D3 mortal wounds on failure. Choose Lethal Hits or Sustained Hits 1 for its weapons until the end of the phase. Be’lakor automatically passes the test.',undivided.filter(f=>f.some(s=>hasWeapon(s,w==='Fight'?'melee':'ranged'))).flat());
   for(const w of ['Shooting','Charge'] as const)act('cowl','Murderer’s Cowl',w,'own','during','This Khorne unit may shoot and charge even after Advancing this turn.',of('khorne').filter(s=>w==='Charge'||hasWeapon(s,'ranged')));
   for(const w of attack)act('puppetry','Penumbral Puppetry',w,'either','during','This Tzeentch unit has Stealth. Melee attacks targeting it subtract 1 from their hit rolls.',of('tzeentch'));
   for(const w of attack)act('gloam-rot','Gloam Rot',w,'either','during','When an incoming attack’s Strength exceeds this Nurgle unit’s Toughness, subtract 1 from the wound roll.',of('nurgle'));
   for(const w of ['Movement','Charge'] as const)act('caress','Shadow’s Caress',w,'own','during','Enemy models cannot select this Slaanesh unit as a snap shooting target.',of('slaanesh'));
  }
  for(const strat of DAEMON_STRATAGEMS.filter(s=>s.detachment===det.name)){
   const cue=strats[normal(strat.name)];
   if(!cue)continue;
   for(const w of cue.windows.split(',') as ReminderWindow[]){
    const turn=cue.windows==='Shooting,Fight'?(w==='Fight'?'either':cue.turn==='opponent'?'opponent':'own'):cue.turn;
    add(strat.id,strat.name+' · '+strat.cp+'CP',w,turn,cue.timing??'during',cue.cue,relevant.filter(f=>inScope(cue.scope,f,w)).flat(),'detachment',strat.id);
   }
  }
 }
 for(const group of groups)for(const bearer of group){
  const name=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit];
  if(!name||!eligibleDaemonUpgrades(army,bearer.unit,bearer.id).some(u=>u.name===name))continue;
  const cue=upgradeCues[name];
  if(!cue)continue;
  const god=daemonicPactAllegiance(bearer);
  for(const w of cue.windows){
   const nearby=cue.nearby?nativeGroups.filter(f=>f.some(s=>god&&forGod(s,god.toLowerCase()))&&
    (cue.nearby!=='smallGod'||!f.some(s=>keyword(s,'MONSTER')))&&
    (!['False Majesty','Dreaming Crown','Slaughterthirst','Font of Spores'].includes(name)||f.some(s=>hasWeapon(s,w==='Fight'?'melee':'ranged')))).flat():[];
   if(cue.nearby&&!nearby.length)continue;
   if(name==='Bane-Forged Weapons'&&!group.some(s=>hasWeapon(s,w==='Fight'?'melee':'ranged')))continue;
   if(name==='Soul-Hungry Slaughterers'&&w==='Movement'&&!group.some(s=>hasWeapon(s,'ranged')))continue;
   const subjects=cue.formation?group:cue.nearby?[bearer,...nearby]:[bearer];
   add('upgrade-'+bearer.id+'-'+name,name,w,cue.turn??'either',cue.timing??'during',bearer.id+' bears this upgrade. '+cue.cue,subjects);
  }
 }
 return rows;
}
