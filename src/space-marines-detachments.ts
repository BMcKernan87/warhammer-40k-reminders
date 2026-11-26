import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {SM_CARDS,spaceMarineModelLoadouts,spaceMarineWeaponCount} from './space-marines-loadouts';
import {spaceMarineKeywords} from './space-marines-keywords';
import {spaceMarineFormations} from './space-marines-formations';
import {spaceMarineCargoFormations} from './space-marines-transports';
import {spaceMarineAgentName} from './space-marines-data';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightWeaponCount} from './knight-loadouts';
import {spaceMarineSelectedDetachments,selectedSpaceMarineUpgrade} from './space-marines-upgrades';
import {SM_STRATAGEMS} from './space-marines-detachments.generated';
export {SM_DETACHMENTS,SM_UPGRADES,SM_STRATAGEMS,SM_TRAITS} from './space-marines-detachments.generated';
export {currentSpaceMarineDetachment,eligibleSpaceMarineUpgrades} from './space-marines-upgrades';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Form={root:RosterInstance;members:readonly RosterInstance[];models:number};
const source='https://wahapedia.ru/wh40k11ed/factions/space-marines/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const incoming=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const agentProfiles=new Map<string,{name:string;phase:string;abilities:string[]}[]>(ASSIGNED_AGENT_DATA.map(d=>[d.sheet.unit,d.weapons.map(w=>({name:w.name,phase:w.type==='Ranged'?'Shooting':'Fight',abilities:w.abilities.split(',').map(a=>a.trim()).filter(Boolean)}))]));
const armour='After enemy target selection, worsen the AP of attacks targeting this Astartes formation by 1, only until that attacking enemy finishes its attacks. This does not protect against later attacking units in the phase.';
const doctrine='In your Command phase, choose one Combat Doctrine for this Astartes formation until your next Command phase starts. Unless a rule explicitly says otherwise, it replaces the doctrine already active for this formation; this use does not spend an army-wide doctrine selection.';
const retained='After enemy Fight target selection, when a model in this formation is destroyed before the formation has been selected to fight this phase, roll a D6. On 4+, retain that model until the formation has fought or the phase ends, whichever happens first. This does not interrupt to fight immediately after the attacker.';
const anti='Before this Kill Team shoots in your Shooting phase, its ranged attacks without Devastating Wounds gain Anti-non-Vehicle 4+ until phase end: unmodified Wound rolls of 4+ are Critical Wounds only against targets that are not Vehicles.';
const kraken='Before this Kill Team shoots in your Shooting phase, its ranged weapons gain +6″ Range and +1 Strength until phase end.';
const dragonfire='Before this Kill Team shoots in your Shooting phase, its ranged attacks re-roll Wound rolls of 1 and gain Ignores Cover until phase end.';
const relentless='Before this Tacticus formation shoots in your Shooting phase or fights, choose Sustained Hits 1 against targets that are neither Monsters nor Vehicles, or Lethal Hits against Monster or Vehicle targets, until phase end. Apply only the selected option and its actual target restriction.';
const shadowStrike='Before this hidden Phobos formation shoots in your Shooting phase or fights, its attacks gain +1 Strength and Lethal Hits until phase end. The formation must actually be hidden when selected.';
const annihilating='Before this Gravis formation shoots in your Shooting phase or fights, its attacks gain Lethal Hits until phase end.';
const effects:Record<typeof SM_STRATAGEMS[number]['id'],string>={
 '000008352006':'Before this Astartes formation shoots in your Shooting phase, its ranged attacks gain Ignores Cover until phase end.',
 '000008352007':'When an enemy ends a move within 8″ of this unengaged Astartes Infantry or Mounted formation in the opponent’s Movement phase, it may make a Normal move up to D6″. Obey normal movement restrictions.',
 '000008352003':retained,
 '000008352002':armour,
 '000008352004':'Before this Astartes formation fights, its melee attacks gain Lance until phase end, giving +1 to Wound if the formation charged this turn.',
 '000008352005':doctrine,
 '000008479003':'In your Command phase, this Astartes Vehicle formation, excluding Dedicated Transports, Fly and Walkers, may ignore modifiers to Move, Ballistic Skill, Hit rolls and Wound rolls until your next Command phase starts. This does not ignore other characteristics or rolls.',
 '000008479002':'When this Astartes Vehicle formation suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds until phase end.',
 '000008479004':'Before this Astartes Vehicle formation, excluding Dedicated Transports, Fly and Walkers, shoots in your Shooting phase, its ranged attacks gain Lethal Hits only against Monster or Vehicle targets until phase end.',
 '000008487002':'At the end of either Fight phase, if this Astartes Mounted formation was eligible to fight, it may make a Normal move if unengaged, or a Fall Back move if engaged. Apply the selected move’s normal restrictions.',
 '000008487003':'When this Astartes Mounted or Speeder formation is selected to Advance in your Movement phase, you may change its Advance roll to 6.',
 '000008487004':'After enemy shooting target selection, ranged attacks targeting this Astartes Mounted or Speeder formation suffer −1 to Hit until phase end.',
 '000008523003':kraken,
 '000008523004':anti,
 '000008523002':armour,
 '000008523007':'At the end of the opponent’s Fight phase, remove this unengaged Astartes Infantry formation to Strategic Reserves. If it is a Kill Team, it also gains Deep Strike until the end of your next Movement phase.',
 '000008523006':doctrine,
 '000008523005':dragonfire,
 '000010369003':'In your Command phase, choose Assault Doctrine or Tactical Doctrine for this Astartes Infantry formation until your next Command phase starts. It replaces its previous doctrine unless another rule explicitly allows both.',
 '000010369002':'At the start of the opponent’s Charge phase, if this unengaged Astartes formation actually has at least one Torrent or Melta weapon, select one visible enemy within 12″. That enemy’s Charge rolls suffer −1 until phase end.',
 '000010369005':'Before this Astartes Infantry formation shoots in your Shooting phase, its ranged Torrent attacks gain +1 AP until phase end. Other weapons gain no bonus.',
 '000010369007':'After enemy shooting against a friendly Astartes Transport, choose one Astartes formation actually embarked in that Transport. It may disembark using the normal legal placement requirements, then shoot using normal shooting at only that attacking enemy. This is not snap shooting; other rules restricted to your Shooting phase do not trigger.',
 '000010369006':'Before this Astartes Infantry formation shoots in your Shooting phase or fights an enemy within 6″, its attacks against that enemy may re-roll Hit rolls of 1 and Wound rolls of 1 until phase end.',
 '000010369004':'Before this engaged Astartes formation shoots in your Shooting phase, its actual Torrent weapons lose Blast and gain Close-Quarters and +1 Attacks until phase end. Other weapons gain neither permission nor bonus.',
 '000010467007':'Before this Astartes Infantry formation fights, its melee attacks gain Precision until phase end.',
 '000010467006':'In your Command phase, Tactical Doctrine becomes active for this Astartes Infantry formation in addition to any other doctrine until your next Command phase starts.',
 '000010467005':'After this Astartes Infantry formation shoots in your Shooting phase, those attacks do not prevent it from being hidden. All other hiding and detection requirements still apply.',
 '000010467004':'Before this Astartes Infantry formation shoots in your Shooting phase, if it made an ingress move this turn, its ranged attacks gain +1 Ballistic Skill and +1 AP until phase end.',
 '000010467003':'When an enemy ends a move within 8″ of this unengaged Astartes Infantry formation in the opponent’s Movement phase, it may make a Normal move up to D6″, or up to 6″ if it is Phobos or Scout Squad. Obey normal movement restrictions.',
 '000010467002':'At the end of the opponent’s Fight phase, remove this unengaged Astartes Infantry formation to Strategic Reserves.',
 '000010630004':'When this Astartes Mounted formation is selected to move in your Movement phase or declares a charge in your Charge phase, it gains Mobile until phase end. Its models may move horizontally through dense terrain; Mobile does not itself permit vertical movement through floors or ending inside solid terrain. Apply every other restriction of the selected move.',
 '000010630005':'Before this Astartes formation fights, choose Lethal Hits or Lance for its melee attacks until phase end. If it is Mounted, it receives both instead.',
 '000010630006':'At the end of the opponent’s Fight phase, remove this unengaged Astartes Mounted or Speeder formation to Strategic Reserves.',
 '000010630007':'When an enemy ends a move within 8″ of this unengaged Astartes Infantry, Mounted or Speeder formation in the opponent’s Movement phase, it may make a Normal move up to D3+3″. Obey normal movement restrictions.',
 '000010630003':'When this Astartes formation is selected to Advance or Fall Back in your Movement phase, that particular Fall Back does not prevent shooting. Its ranged attacks also gain Assault until phase end, the default duration for this untimed triggered weapon benefit; do not extend Assault into the Shooting phase.',
 '000010630002':'After enemy shooting target selection, ranged attacks targeting this Astartes Mounted or Speeder formation suffer −1 to Wound until phase end.',
 '000010634002':armour,
 '000010634003':'Before this Astartes formation shoots in your Shooting phase, its ranged attacks gain Ignores Cover until phase end.',
 '000010634005':'Before this Astartes formation fights, its melee attacks gain Lance until phase end.',
 '000010634006':'When an enemy ends a move within 8″ of this unengaged Astartes Infantry or Mounted formation in the opponent’s Movement phase, it may make a Normal move up to D3+3″. Obey normal movement restrictions.',
 '000010634007':'After enemy shooting or Fight target selection, attacks targeting this Astartes formation suffer −1 to Wound if their Strength is greater than its Toughness, until phase end.',
 '000010634004':doctrine,
 '000010760007':'After enemy shooting causes this unengaged Astartes Infantry or Mounted formation to lose at least one wound, it may make a Normal move up to D6″, or up to D3+3″ if entrenched. It cannot embark in a Transport for the rest of the turn. A hit that causes no lost wound is insufficient.',
 '000010760005':'When this entrenched Astartes Infantry formation is selected to consolidate, it may choose objective consolidation regardless of that mode’s Before Moving restrictions. It may leave Engagement Range if it still meets objective consolidation’s other conditions; this does not waive the required legal end position.',
 '000010760006':'Before this Astartes Infantry or Mounted formation shoots in your Shooting phase or fights, its attacks gain +1 to Wound against Monster or Vehicle targets until phase end.',
 '000010760004':'Before this Astartes formation shoots in your Shooting phase or fights, choose Lethal Hits or Sustained Hits 1 for its attacks until phase end. If entrenched, it receives both instead.',
 '000010760003':'After enemy shooting or Fight target selection, this Astartes formation, excluding Monsters and Vehicles, imposes −1 to Wound on attacks whose Strength exceeds its Toughness until phase end. If entrenched, all attacks targeting it suffer that penalty regardless of Strength.',
 '000010760002':'In either Command phase, if this Astartes formation is within an objective marker, its models gain +1 Objective Control until the end of that turn.',
 '000011169004':anti,
 '000011169002':kraken,
 '000011169003':dragonfire,
 '000011169005':'At the end of the opponent’s Fight phase, remove this unengaged Kill Team formation to Strategic Reserves.',
 '000011181004':'When this Astartes Vehicle formation is destroyed, before its Deadly Demise roll, change that roll to an unmodified 6. It must actually have Deadly Demise; this does not grant that ability or change its mortal-wound value.',
 '000011181003':'When this Astartes formation suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds until phase end.',
 '000011181005':'In your Command phase, this Astartes Dreadnought formation gains +1″ Move, +1 Toughness, +1 Leadership, +1 Objective Control and +1 to Hit until your next Command phase starts. Snap shooting ignores the Hit-roll modifier.',
 '000011181006':'In your Command phase, choose this Astartes formation only if below Starting Strength. Until your next Command phase starts, it may ignore modifiers to Ballistic Skill, Weapon Skill, Hit rolls and Wound rolls. Its original Attached formation determines Starting Strength.',
 '000011181007':'After an enemy finishes shooting at this unengaged Astartes Vehicle formation in the opponent’s Shooting phase, it may shoot only at that enemy using snap shooting. If at Half-strength or Below Half-strength, it uses normal shooting instead. Snap shots cannot re-roll or modify Hit rolls or score Critical Hits; normal return fire retains applicable normal attack abilities but does not trigger other rules restricted to your Shooting phase.',
 '000011181002':'Before this Astartes formation shoots in your Shooting phase or fights, its attacks gain Sustained Hits 1 until phase end. If it is a Vehicle formation, its attacks also gain +1 to Wound.',
 '000011185003':'At the end of either Fight phase, this unengaged Astartes Infantry formation may embark if it was eligible to fight, is wholly within 6″ of a friendly Transport and the entire formation can legally fit inside. Apply all actual passenger keywords and remaining capacity; this rule does not waive the same-turn setup restriction.',
 '000011185004':'At the end of your Movement phase, if this Astartes Transport actually contains an embarked Astartes Battleline formation, select one objective the Transport controls. That objective becomes secured until the opponent has a greater Level of Control at a phase end.',
 '000011185002':'When this Astartes formation is selected to disembark in any phase, each actual passenger model may be placed within its Transport’s setup distance instead of wholly within that distance. Apply the actual disembark move’s distance and every other placement restriction; no model or equipment is duplicated.',
 '000011189004':'At the end of the opponent’s Fight phase, remove this unengaged Phobos or Scout Squad formation to Strategic Reserves.',
 '000011189003':'At the end of your Movement phase, if this unengaged Phobos or Scout Squad formation controls an objective, that objective becomes snared. The next time an enemy ends a move within that objective, roll a D6; on 2+, that enemy suffers D6 mortal wounds. Remove the snare after that trigger even if the roll fails.',
 '000011189002':shadowStrike,
 '000011193004':'When this Tacticus formation is selected to consolidate, it may move up to D3+3″ for that consolidation. Its selected consolidation mode and all end-position restrictions still apply.',
 '000011193002':relentless,
 '000011193003':'After an enemy finishes fighting, choose this Tacticus formation only if it is within an objective marker and eligible to fight. It gains Fights First until phase end and must be your next selected formation to fight; normal player-selection order still applies.',
 '000011197002':shadowStrike,
 '000011197003':'When an enemy ends a move within 8″ of this unengaged Phobos formation in the opponent’s Movement phase, it may make a Normal move up to D6″, or up to 6″ if Tactical Doctrine is active for it. Obey normal movement restrictions.',
 '000011197004':'After enemy shooting target selection, ranged attacks targeting this Phobos formation suffer −1 to Hit until phase end.',
 '000011201002':'After enemy shooting or Fight target selection, reduce the Damage of attacks targeting this Astartes Terminator formation by 1, only until that attacking enemy finishes its attacks. This does not protect against later attacking units in the phase.',
 '000011201003':'Before this Astartes Terminator formation shoots in your Shooting phase, its ranged attacks gain Lethal Hits and Sustained Hits 1 until phase end.',
 '000011201004':'At the end of the opponent’s Fight phase, remove this unengaged Astartes Terminator formation to Strategic Reserves.',
 '000011205002':armour,
 '000011205004':retained+' Add 1 to the retention roll if Assault Doctrine is active for this formation.',
 '000011205003':'Before this Astartes formation fights, its melee attacks gain Lance until phase end. If Assault Doctrine is active for it, those attacks also gain +1 AP.',
 '000011209004':'Just after this Gravis formation ends a charge move in your Charge phase, select one engaged enemy. Roll one D6 for each actual model in your formation that is engaged with that enemy; each 3+ inflicts one mortal wound. Do not count models outside Engagement Range.',
 '000011209002':annihilating,
 '000011209003':'After this Gravis formation shoots in your Shooting phase, if unengaged it may make a Normal move up to 5″ that must end within an objective marker. It cannot charge or embark in a Transport for the rest of the turn.',
 '000011213002':armour,
 '000011213004':'After enemy shooting destroys at least one model in this Astartes formation, its surviving models may shoot using normal shooting at only that enemy. It need not be unengaged unless normal shooting eligibility requires it. This is not snap shooting and does not trigger other rules restricted to your Shooting phase.',
 '000011213003':'Before this Astartes formation shoots in your Shooting phase, its ranged attacks gain Ignores Cover until phase end. If Devastator Doctrine is active for it, those attacks also gain +1 AP.',
 '000011217004':'After this Gravis formation shoots in your Shooting phase, choose one enemy hit by its attacks. That enemy takes a Battle-shock test with −1 to its roll.',
 '000011217003':'At the end of your Movement phase, select one objective controlled by this Gravis formation. That objective becomes secured until the opponent has a greater Level of Control at a phase end.',
 '000011217002':annihilating,
 '000011221002':armour,
 '000011221003':'After this Astartes formation shoots in your Shooting phase, choose one enemy hit by its attacks. That enemy is suppressed until the start of your next turn; its attacks suffer −1 to Hit for that duration. Snap shooting ignores that Hit-roll modifier.',
 '000011221004':'When an enemy ends a move within 8″ of this unengaged Astartes Infantry or Mounted formation in the opponent’s Movement phase, it may make a Normal move up to D6″, or up to 6″ if Tactical Doctrine is active for it. Obey normal movement restrictions.',
 '000011225002':'At the start of either Fight phase, every enemy engaged with this Dreadnought formation takes a Battle-shock test with −1 to its roll.',
 '000011225004':'When this Dreadnought formation is selected to move in your Movement phase or declares a charge in your Charge phase, it gains Mobile until phase end. Its models may move horizontally through dense terrain; Mobile does not itself permit vertical movement through floors or ending inside solid terrain. Apply every other restriction of the selected move.',
 '000011225003':'Before this Dreadnought formation shoots in your Shooting phase or fights, choose Lethal Hits or Sustained Hits 1 for its attacks until phase end.',
 '000011229004':'Before this engaged Tacticus formation shoots in your Shooting phase, its ranged attacks without Blast gain Close-Quarters and Ignores Cover until phase end. Blast attacks gain neither benefit.',
 '000011229002':'In either Command phase, if this Tacticus formation is within an objective marker, its models gain +1 Objective Control until the end of that turn.',
 '000011229003':relentless,
};

function context(army:ArmySelection,roster:readonly RosterInstance[]){
 const detachments=spaceMarineSelectedDetachments(army),has=(name:string)=>detachments.includes(name),original=expandRoster(army);
 const forms:Form[]=spaceMarineFormations(army,roster),originalForms:Form[]=spaceMarineFormations(army,original);
 const active=forms.flatMap(f=>f.members),current={...army,instances:[...active]};
 const kw=(f:Form,k:string)=>f.members.some(s=>spaceMarineKeywords(army,s,undefined,active).has(k));
 const originalKw=(f:Form,k:string)=>f.members.some(s=>spaceMarineKeywords(army,s,undefined,original).has(k));
 const named=(f:Form,...names:string[])=>f.members.some(s=>names.includes(s.unit));
 const weapons=(f:Form,phase:'Shooting'|'Fight')=>f.members.flatMap(s=>{
  const native=SM_CARDS[s.unit],profiles=native?.weapons??agentProfiles.get(spaceMarineAgentName(s.unit)??'')??[];
  return profiles.filter(w=>w.phase===phase&&(native?spaceMarineWeaponCount(s,w.name):knightWeaponCount(s,w.name))>0).map(w=>({name:w.name,abilities:w.abilities}));
 });
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0,melee=(f:Form)=>weapons(f,'Fight').length>0;
 const weaponAbility=(f:Form,pattern:RegExp)=>weapons(f,'Shooting').some(w=>w.abilities.some(a=>pattern.test(a)));
 const astartes=forms.filter(f=>kw(f,'ADEPTUS ASTARTES')),infantry=astartes.filter(f=>kw(f,'INFANTRY')),vehicles=astartes.filter(f=>kw(f,'VEHICLE'));
 const transports=vehicles.filter(f=>kw(f,'TRANSPORT')),mounted=astartes.filter(f=>kw(f,'MOUNTED')),swift=astartes.filter(f=>kw(f,'MOUNTED')||kw(f,'SPEEDER'));
 const phobos=astartes.filter(f=>kw(f,'PHOBOS')),scouts=astartes.filter(f=>kw(f,'PHOBOS')||named(f,'Scout Squad'));
 const tacticus=astartes.filter(f=>kw(f,'TACTICUS')),gravis=astartes.filter(f=>kw(f,'GRAVIS')),terminators=astartes.filter(f=>kw(f,'TERMINATOR'));
 const dreadnoughts=astartes.filter(f=>kw(f,'DREADNOUGHT')),killTeams=astartes.filter(f=>kw(f,'KILL TEAM'));
 const tanks=vehicles.filter(f=>!['DEDICATED TRANSPORT','FLY','WALKER'].some(k=>kw(f,k)));
 const cargoCache=new Map<string,ReturnType<typeof spaceMarineCargoFormations>>();
 const cargo=(f:Form)=>{if(!cargoCache.has(f.root.id))cargoCache.set(f.root.id,spaceMarineCargoFormations(army,f.root,active));return cargoCache.get(f.root.id)!;};
 let passengerIds:Set<string>|undefined;
 const canRide=(f:Form)=>{passengerIds??=new Set(transports.flatMap(t=>cargo(t).flatMap(g=>g.members.map(m=>m.id))));return f.members.some(s=>passengerIds!.has(s.id));};
 const names=(fs:readonly Form[])=>fs.map(f=>f.root.id).join(', '),rows:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],rule:string)=>{
  if(units.length)rows.push({id:'11e-sm-det-'+id+'-'+window+'-'+turn+'-'+timing,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source,sourceRuleId:rule,origin:'detachment'});
 };
 const card=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:readonly Form[],rule:string)=>emit(id,title,window,turn,timing,summary,fs.map(f=>f.root),rule);
 const snap=(id:string,title:string,summary:string,fs:readonly Form[],rule:string)=>card(id,title,'Movement','opponent','end',summary,fs.filter(f=>ranged(f)&&!kw(f,'TITANIC')),rule);
 return {has,original,active,current,forms,originalForms,kw,originalKw,named,weapons,ranged,melee,weaponAbility,astartes,infantry,vehicles,transports,mounted,swift,phobos,scouts,tacticus,gravis,terminators,dreadnoughts,killTeams,tanks,cargo,canRide,names,rows,emit,card,snap};
}

export function spaceMarineDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Space Marines')return [];
 const c=context(army,roster),{has,original,active,forms,originalForms,kw,originalKw,named,weapons,ranged,melee,weaponAbility,astartes,infantry,vehicles,transports,mounted,swift,phobos,scouts,tacticus,gravis,terminators,dreadnoughts,killTeams,tanks,cargo,canRide,names,rows,emit,card,snap}=c;
 const doctrineExtras=[
  ['Gladius Task Force','Codex Discipline','000008355','one Combat Doctrine'],
  ['Assault Brethren','Assault Mastery','000011203','Assault Doctrine'],
  ['Tactical Brethren','Tactical Mastery','000011219','Tactical Doctrine'],
  ['Devastator Brethren','Devastator Mastery','000011211','Devastator Doctrine'],
  ['Forgefather’s Seekers',"Vulkan’s Quest",'000010367','Devastator Doctrine'],
  ['Spearpoint Task Force','Storm-swift Onslaught','000010626','Assault Doctrine or Tactical Doctrine'],
 ] as const;
 for(const [det,title,id,choice] of doctrineExtras)if(has(det))card(id+'-doctrine',title+' · additional doctrine','Command','own','start','You may select '+choice+' one additional time per battle. Record this additional use with the normal once-per-battle doctrine uses; selecting a doctrine normally makes it active until your next Command phase starts.',astartes,id);
 if(has('Blade of Ultramar')&&original.some(s=>s.unit==='Marneus Calgar'))card('mastered','Mastered Doctrines','Command','own','start','Because this army includes Marneus Calgar, you may select each of Assault, Devastator and Tactical Doctrine one additional time per battle. This army-composition condition does not require Calgar to survive.',astartes,'000010632');
 if(has('Ironstorm Spearhead')){
  const eligible=vehicles.filter(f=>!kw(f,'WALKER'));
  card('targeters','Ironstorm Auto-targeters','Shooting','either','during','For each friendly Astartes Vehicle formation excluding Walkers, re-roll one Hit roll and one Wound roll when resolving its ranged attacks. Dedicated Transports and flying Vehicles are eligible for this trait. During snap shooting, only the Wound-roll re-roll applies.',eligible.filter(ranged),'000008477');
  snap('targeters-snap','Ironstorm Auto-targeters · snap shooting','When this non-Walker Astartes Vehicle fires snap shots, retain its one Wound-roll re-roll. Snap shooting prohibits Hit-roll re-rolls, modifiers and Critical Hits.',eligible,'000008477');
 }
 if(has('Stormlance Task Force'))for(const [window,turn] of [['Pre-battle','either'],['Movement','either'],['Shooting','either'],['Fight','either']] as const)card('lightning','Lightning-fast Strike',window,turn,'during','Friendly Astartes Mounted and Speeder formations have +2″ Move. Apply their modified Move when the permitted move uses that characteristic; this does not increase a separately fixed D6″ or 6″ move limit.',swift,'000008485');
 for(const [det,id] of [['Black Spear Task Force','000008521'],['Deathwatch Support','000011167']] as const)if(has(det)){
  for(const phase of ['Shooting','Fight'] as const)card(id+'-tactics','Mission Tactics',phase,'either','during','For this Kill Team formation, Devastator Doctrine gives Sustained Hits 1, Tactical Doctrine gives Lethal Hits, and Assault Doctrine gives Precision only against enemies within 9″ of the formation. Apply only doctrines actually active for it; Torrent attacks cannot gain Precision. Snap shooting cannot activate Sustained Hits or Lethal Hits.',killTeams.filter(phase==='Fight'?melee:ranged),id);
  snap(id+'-tactics-snap','Mission Tactics · snap shooting','Snap shooting cannot score Critical Hits, so Furor’s Sustained Hits and Malleus’s Lethal Hits cannot trigger. If Assault Doctrine is active, non-Torrent attacks retain Purgatus Precision against enemies within 9″ of the Kill Team formation.',killTeams,id);
  card(id+'-muster',det+' · army restrictions','Pre-battle','either','during',det==='Deathwatch Support'?'Deathwatch allies may total at most 500 points. Unless a rule explicitly permits it, a Deathwatch model cannot be Warlord. Every Kill Team formation may contain enhancements only from Deathwatch Support, including enhancements on recruited Characters.':'Use only Deathwatch Chapter Astartes alongside generic Astartes. A unit with both AGENTS OF THE IMPERIUM and DEATHWATCH keywords is excluded; the printed Kill Team Cassius exception is a Legends unit. Apply the actual keywords, not a Deathwatch-sounding name or ORDO XENOS alone.',originalForms,id);
 }
 if(has('Forgefather’s Seekers')){
  card('vulkan-strength',"Vulkan’s Quest · close fire",'Shooting','either','during','Friendly Astartes ranged attacks gain +1 Strength when targeting an enemy unit within 12″ of the attacking formation.',astartes.filter(ranged),'000010367');
  snap('vulkan-strength-snap',"Vulkan’s Quest · snap shooting",'Ranged attacks retain +1 Strength against enemies within 12″ of this formation during snap shooting. This does not require a Critical Hit.',astartes,'000010367');
  if(original.some(s=>/^Vulkan He[’']stan$/.test(s.unit))){
   const infernus=astartes.filter(f=>named(f,'Infernus Squad'));
   card('vulkan-action-move',"Vulkan’s Quest · Infernus actions",'Movement','own','during','Because this army includes Vulkan He’stan, when this Infernus formation Advances or Falls Back, that particular move does not prevent it from starting an action.',infernus,'000010367');
   card('vulkan-action',"Vulkan’s Quest · Infernus actions",'Shooting','own','during','This Infernus formation can start an otherwise legal action despite its qualifying Advance or Fall Back this turn. Starting that action does not prevent it from shooting; other action restrictions still apply.',infernus,'000010367');
  }
 }
 if(has('Shadowmark Talon')){
  for(const [phase,turn] of incoming)card('shadow-stealth','Shadow Tactics · Stealth',phase,turn,'during','Friendly Astartes formations have Stealth: they receive cover against ranged attacks, worsening the attacking weapon’s Ballistic Skill by 1. This does not impose a Hit-roll penalty, has no effect on snap-shot hit thresholds, and cover benefits do not stack.',astartes,'000010463');
  for(const phase of ['Movement','Shooting','Charge','Fight'] as const)card('shadow-detection','Shadow Tactics · detection',phase,'either','during','Friendly Phobos and Scout Squad formations have −3″ detection range. Use the current detection and hidden-unit rules with their modified range.',scouts,'000010463');
  const shaan=active.filter(s=>s.unit==='Aethon Shaan');
  emit('shadow-discount','Unparalleled Tactician','Fight','opponent','end','Once per battle round, per army, when you use Into Darkness, reduce that use by 1 CP while Aethon Shaan’s formation supplies this ability. This is not restricted to targeting Shaan’s own formation.',shaan,'000010463');
 }
 if(has('Spearpoint Task Force')){
  card('storm-swift','Storm-swift Onslaught · Advance','Movement','own','during','Friendly Astartes Mounted and Speeder formations add 1 to Advance rolls.',swift,'000010626');
  card('wrath-khan','Wrath of the First Khan','Fight','either','end','If Suboden Khan’s formation was eligible to fight this phase, it may make a Normal move if unengaged, or a Fall Back move if engaged. Apply that move’s normal restrictions.',astartes.filter(f=>named(f,'Suboden Khan')),'000010626');
 }
 if(has('Ceramite Sentinels')){
  for(const phase of ['Shooting','Fight'] as const)card('adaptive-wounds','Adaptive Defence · terrain',phase,'either','during','While this Astartes formation is within a terrain area, its attacks may re-roll Wound rolls of 1. This benefit does not require the formation to be entrenched.',astartes.filter(phase==='Fight'?melee:ranged),'000010758');
  snap('adaptive-snap','Adaptive Defence · snap shooting','If this formation is within a terrain area, snap shots retain re-rolls of Wound rolls of 1.',astartes,'000010758');
  for(const phase of phases){
   card('entrenched','Adaptive Defence · entrenched',phase,'either','start','This Astartes formation is entrenched only while within a terrain area, not set up this turn, and no model in the formation has moved more than 3″ this turn. Recheck all three conditions before applying an entrenched bonus.',astartes,'000010758');
   card('defensive-mastery','Defensive Mastery · entrenched',phase,'either','start','Darnath Lysander’s or Tor Garadon’s actual formation is entrenched regardless of terrain, setup or distance moved. The named source must remain in the formation for this exception.',astartes.filter(f=>named(f,'Darnath Lysander','Tor Garadon')),'000010758');
  }
 }
 if(has("Medusa's Wrath")){
  const sources=astartes.filter(f=>named(f,'Caanok Var','Iron Father Feirros')),near=sources.length?' If this formation is within 6″ of a surviving Caanok Var or Iron Father Feirros formation ('+names(sources)+'), it may instead re-roll one of each: Hit, Wound and Damage.':'';
  for(const phase of ['Shooting','Fight'] as const)card('armoured-wrath','Armoured Wrath',phase,'either','during','When this Astartes formation is selected to shoot or fight, choose one Hit roll, one Wound roll or one Damage roll to re-roll while resolving those attacks.'+near+' Snap shooting prohibits the Hit-roll re-roll; Wound and Damage re-rolls remain available.',astartes.filter(phase==='Fight'?melee:ranged),'000011179');
  snap('armoured-wrath-snap','Armoured Wrath · snap shooting','When selected to fire snap shots, choose one Wound roll or one Damage roll to re-roll. Hit-roll re-rolls are prohibited.'+(sources.length?' If within 6″ of a surviving Caanok Var or Iron Father Feirros formation, it may instead re-roll one Wound roll and one Damage roll.':''),astartes,'000011179');
 }
 if(has('Gauntlet Task Force')){
  card('combined-mark','Combined Deployment · assail a target','Shooting','own','during','After this Astartes Transport formation finishes shooting, choose one enemy hit by those attacks. That enemy is assailed until the end of this turn.',transports.filter(ranged),'000011183');
  if(originalForms.some(f=>originalKw(f,'ADEPTUS ASTARTES')&&originalKw(f,'TRANSPORT')))for(const phase of ['Shooting','Fight'] as const)card('combined-attacks','Combined Deployment · disembarked attackers',phase,'own','during','If this Astartes formation disembarked this turn, its attacks gain Sustained Hits 1 against the enemy actually made assailed by a Transport this Shooting phase. That marker lasts until turn end even if its Transport source is destroyed. Snap shooting cannot activate Sustained Hits.',astartes.filter(phase==='Fight'?melee:ranged),'000011183');
 }
 if(has('Phobos Shadow Force')){
  const text='After this Phobos or Scout Squad formation has shot, choose either: those attacks do not prevent it from being hidden; or make a Normal move up to D6″, after which it cannot declare a charge until turn end. This trigger is not limited to your Shooting phase; apply normal hiding or Normal-move restrictions.';
  card('shadow-masters','Shadow Masters','Shooting','either','during',text,scouts.filter(ranged),'000011187');
  snap('shadow-masters-snap','Shadow Masters · after snap shooting',text,scouts,'000011187');
 }
 if(has('Tacticus Attack Force'))card('wrath-chapter','Wrath of the Chapter','Movement','own','during','Friendly Tacticus formations may re-roll Advance rolls.',tacticus,'000011191');
 if(has('Phobos Shock Force')){
  card('vanguard-choose','Vanguard Ambushers','Movement','own','end','If this Phobos formation is hidden at the end of your Movement phase, its attacks may re-roll Wound rolls of 1 until the end of the turn. Record which formations qualified at this timing.',phobos,'000011195');
  for(const phase of ['Shooting','Fight'] as const)card('vanguard-attacks','Vanguard Ambushers · marked formation',phase,'own','during','Only a Phobos formation that was hidden at the end of your Movement phase receives re-rolls of Wound rolls of 1 until turn end. Becoming visible later does not cancel the already-applied timed effect.',phobos.filter(phase==='Fight'?melee:ranged),'000011195');
 }
 if(has('Terminator Storm Force'))card('death-blow','Death Blow','Charge','either','during','Friendly Astartes Terminator formations add 1 to Charge rolls, including an otherwise legal charge outside your Charge phase.',terminators,'000011199');
 if(has('Gravis Linebreaker Force')){
  card('walking-fortress','Walking Fortress','Shooting','either','during','If this Gravis formation made a Normal move this turn, its ranged attacks lose Heavy and gain +1 to Hit. An Advance, Fall Back, ingress or disembark does not by itself count as a Normal move. Snap shooting ignores the Hit-roll bonus.',gravis.filter(ranged),'000011207');
  snap('walking-fortress-snap','Walking Fortress · snap shooting','If this Gravis formation made a Normal move this turn, its ranged attacks still lose Heavy. Snap shooting ignores the +1 Hit-roll modifier.',gravis,'000011207');
 }
 if(has('Gravis Siege Force'))for(const [phase,turn] of incoming)card('indomitable','Indomitable Defence',phase,turn,'during','While this Gravis formation is within an objective marker, attacks targeting it suffer −1 to Wound only if their Strength is greater than its Toughness.',gravis,'000011215');
 if(has('Ironclad Champions'))for(const phase of ['Shooting','Fight'] as const)card('enduring','Enduring Vengeance',phase,'either','during','Friendly Astartes Dreadnought formations may re-roll Hit rolls of 1. This does not apply to snap shooting, which prohibits Hit-roll re-rolls.',dreadnoughts.filter(phase==='Fight'?melee:ranged),'000011223');
 if(has('Tacticus Firestorm Force')){
  const eligible=tacticus.filter(f=>weaponAbility(f,/^rapid fire\b/i)),text='This Tacticus formation’s actual Rapid Fire weapons receive their printed additional attacks against targets up to the weapon’s maximum range. Other weapons do not gain Rapid Fire.';
  card('fire-patterns','Codex Fire-patterns','Shooting','either','during',text,eligible,'000011227');
  snap('fire-patterns-snap','Codex Fire-patterns · snap shooting',text,eligible,'000011227');
 }
 for(const strat of SM_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets:readonly Form[]=astartes;
   const attack=(fs:readonly Form[])=>fs.filter(phase==='Fight'?melee:ranged);
   switch(strat.id){
    case '000008352006':case '000010634003':case '000011213003':case '000011213004':case '000011221003':targets=astartes.filter(ranged);break;
    case '000008352007':case '000010634006':case '000011221004':targets=astartes.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED'));break;
    case '000008352003':case '000008352004':case '000010630005':case '000010634005':case '000011205004':case '000011205003':targets=astartes.filter(melee);break;
    case '000008479003':targets=tanks;break;
    case '000008479004':targets=tanks.filter(ranged);break;
    case '000008479002':targets=vehicles;break;
    case '000008487002':case '000010630004':targets=mounted;break;
    case '000008487003':case '000008487004':case '000010630006':case '000010630002':targets=swift;break;
    case '000008523003':case '000008523004':case '000008523005':case '000011169004':case '000011169002':case '000011169003':targets=killTeams.filter(ranged);break;
    case '000008523007':case '000010369003':case '000010467006':case '000010467003':case '000010467002':case '000010760005':targets=infantry;break;
    case '000010369002':targets=astartes.filter(f=>weaponAbility(f,/^(?:torrent|melta)\b/i));break;
    case '000010369005':targets=infantry.filter(f=>weaponAbility(f,/^torrent\b/i));break;
    case '000010369007':targets=astartes.filter(canRide);break;
    case '000010369006':targets=attack(infantry);break;
    case '000010369004':targets=astartes.filter(f=>weaponAbility(f,/^torrent\b/i));break;
    case '000010467007':targets=infantry.filter(melee);break;
    case '000010467005':case '000010467004':targets=infantry.filter(ranged);break;
    case '000010630007':targets=astartes.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED')||kw(f,'SPEEDER'));break;
    case '000010630003':targets=astartes.filter(ranged);break;
    case '000010760007':targets=astartes.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED'));break;
    case '000010760006':targets=attack(astartes.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED')));break;
    case '000010760004':case '000011181002':targets=attack(astartes);break;
    case '000010760003':targets=astartes.filter(f=>!kw(f,'MONSTER')&&!kw(f,'VEHICLE'));break;
    case '000011169005':targets=killTeams;break;
    case '000011181004':targets=originalForms.filter(f=>originalKw(f,'ADEPTUS ASTARTES')&&originalKw(f,'VEHICLE')&&f.members.some(s=>!!SM_CARDS[s.unit]?.demise));break;
    case '000011181005':targets=dreadnoughts;break;
    case '000011181007':targets=vehicles.filter(ranged);break;
    case '000011185003':targets=infantry.filter(canRide);break;
    case '000011185004':targets=transports.filter(f=>cargo(f).some(g=>kw(g,'ADEPTUS ASTARTES')&&kw(g,'BATTLELINE')));break;
    case '000011185002':targets=astartes.filter(canRide);break;
    case '000011189004':case '000011189003':targets=scouts;break;
    case '000011189002':case '000011197002':targets=attack(phobos);break;
    case '000011193004':case '000011193003':targets=tacticus.filter(melee);break;
    case '000011193002':case '000011229003':targets=attack(tacticus);break;
    case '000011197003':case '000011197004':targets=phobos;break;
    case '000011201002':case '000011201004':targets=terminators;break;
    case '000011201003':targets=terminators.filter(ranged);break;
    case '000011209004':case '000011217003':targets=gravis;break;
    case '000011209002':case '000011217002':targets=attack(gravis);break;
    case '000011209003':case '000011217004':targets=gravis.filter(ranged);break;
    case '000011225002':case '000011225004':targets=dreadnoughts;break;
    case '000011225003':targets=attack(dreadnoughts);break;
    case '000011229004':targets=tacticus.filter(f=>weapons(f,'Shooting').some(w=>!w.abilities.some(a=>/^blast\b/i.test(a))));break;
    case '000011229002':targets=tacticus;break;
   }
   card('strat-'+strat.id,strat.name+' · '+strat.cp+' CP',phase,turn,strat.timing,effects[strat.id],targets,strat.id);
  }
 }
 // These are records of previously applied timed effects, not new uses of
 // their Stratagems. Their original source can have left the battlefield.
 for(const [det,id,name,targets,restriction] of [
  ['Gladius Task Force','000008352005','ADAPTIVE STRATEGY',astartes,'one chosen doctrine'],
  ['Black Spear Task Force','000008523006','ADAPTIVE TACTICS',astartes,'one chosen doctrine'],
  ['Forgefather’s Seekers','000010369003','WRATH AND RUIN',infantry,'chosen Assault or Tactical Doctrine'],
  ['Shadowmark Talon','000010467006','FEINT AND THRUST',infantry,'Tactical Doctrine in addition to any other active doctrine'],
  ['Blade of Ultramar','000010634004','ULTRAMARIAN ADAPTIVITY',astartes,'one chosen doctrine'],
 ] as const)if(has(det))for(const phase of ['Movement','Shooting','Charge'] as const)card('lasting-'+id,name+' · selected doctrine',phase,phase==='Movement'?'own':'either','during','Only the formation actually targeted in your last Command phase retains '+restriction+' until your next Command phase starts. Devastator permits shooting after Advancing; Assault permits a charge after its qualifying Advance; Tactical permits shooting and charging after its qualifying Fall Back. This is not another Stratagem use.',targets,id);
 if(has('Ironstorm Spearhead'))for(const phase of ['Movement','Shooting'] as const)card('lasting-machine','MIGHT OF THE MACHINE SPIRIT · selected Vehicle',phase,'either','during','Only the eligible Vehicle selected in your last Command phase may ignore modifiers to Move, Ballistic Skill, Hit rolls and Wound rolls until your next Command phase starts. Snap shooting still prohibits Hit-roll modifiers.',tanks,'000008479003');
 if(has("Medusa's Wrath")){
  for(const phase of phases){
   card('lasting-fury','ANCIENT FURY · selected Dreadnought',phase,'either','during','Only the Dreadnought selected in your last Command phase retains +1″ Move, +1 Toughness, +1 Leadership, +1 Objective Control and +1 to Hit until your next Command phase starts. Snap shooting ignores the Hit-roll bonus.',dreadnoughts,'000011181005');
   card('lasting-unbowed','UNBOWED CONVICTION · selected formation',phase,'either','during','Only the formation selected while below Starting Strength in your last Command phase may ignore modifiers to Ballistic Skill, Weapon Skill, Hit rolls and Wound rolls until your next Command phase starts. Healing later does not cancel the timed effect; snap shooting keeps its own restrictions.',astartes,'000011181006');
  }
 }
 if(has('Phobos Shadow Force')&&originalForms.some(f=>originalKw(f,'PHOBOS')||named(f,'Scout Squad')))for(const phase of ['Movement','Shooting','Charge','Fight'] as const)emit('lasting-snare','MORTIS SNARES · snared objective',phase,'either','during','The next time an enemy ends a move within an objective actually marked by Mortis Snares, roll a D6; on 2+, it suffers D6 mortal wounds. Remove that snare after the trigger even if the roll fails. An existing objective marker persists if its original Phobos or Scout source is destroyed.',original.filter(s=>spaceMarineKeywords(army,s,undefined,original).has('PHOBOS')||s.unit==='Scout Squad'),'000011189003');
 if(has('Tactical Brethren')&&originalForms.some(f=>originalKw(f,'ADEPTUS ASTARTES')&&ranged(f)))for(const phase of ['Shooting','Fight'] as const)card('lasting-suppression','DOMINATION FIRE · suppressed enemy',phase,'either','during','An enemy actually hit and marked by Domination Fire suffers −1 to Hit until your next turn starts, including after the Astartes source is destroyed. This applies when that enemy attacks any friendly formation; snap shooting ignores Hit-roll modifiers.',forms,'000011221003');
 return rows;
}

export function spaceMarineUpgradeReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Space Marines')return [];
 const {original,active,current,forms,kw,weapons,ranged,melee,weaponAbility,astartes,infantry,vehicles,transports,cargo,names,rows,emit,card}=context(army,roster);
 // Destruction triggers and effects with a printed duration retain the
 // original selection. Ordinary passive benefits require a living source.
 for(const bearer of original){
  const upgrade=selectedSpaceMarineUpgrade(army,bearer);if(!upgrade)continue;
  const former=spaceMarineFormations(army,original).find(f=>f.members.some(s=>s.id===bearer.id));
  const survivors=former?forms.filter(f=>f.members.some(s=>former.members.some(m=>m.id===s.id))):[];
  const lasting=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets:readonly Form[])=>card('upgrade-lasting-'+upgrade.id+'-'+bearer.id+'-'+suffix,upgrade.name+' · previously selected effect',window,turn,timing,summary,targets,upgrade.id);
  if(upgrade.id==='000010759002')for(const phase of phases)emit('upgrade-revive-'+bearer.id,upgrade.name+' · '+bearer.id,phase,'either','end','Once per battle, per army, at the end of a phase in which this actual Gravis bearer was destroyed, roll a D6. On 2+, return that model unengaged, as close as possible to its former position, with 3 wounds. A revived Leader remains in its original Attached unit and returns in coherency if possible; this does not create a separate unit or reset Starting Strength.',[bearer],upgrade.id);
  if(upgrade.id==='000011180002')for(const phase of ['Shooting','Fight'] as const)lasting('lethal',phase,'either','during','Only the actual Astartes Vehicle model chosen by '+bearer.id+' at the start or end of its last qualifying Movement-phase move has Lethal Hits until your next Command phase starts. Other models in the Vehicle formation do not gain the benefit. This timed effect persists after the Techmarine source is destroyed; snap shooting cannot activate Lethal Hits.',vehicles.filter(phase==='Fight'?melee:ranged));
  if(upgrade.id==='000011180004')for(const phase of ['Movement','Shooting','Charge'] as const)lasting('doctrine',phase,phase==='Movement'?'own':'either','during','Only the visible Astartes Vehicle formation actually chosen by '+bearer.id+' in your last Movement phase retains its chosen Devastator or Tactical Doctrine until your next Command phase starts. Devastator gives Assault; Tactical preserves shooting and charge eligibility after its qualifying Fall Back. The timed selection persists if its bearer is later destroyed.',vehicles);
  if(upgrade.id==='000008522004')for(const phase of ['Movement','Shooting','Charge','Fight'] as const)lasting('tome',phase,'either','during','If '+bearer.id+' used the Tome in your last Command phase, its original surviving formation retains Assault, Devastator and Tactical Doctrine together until your next Command phase starts, including after the bearer is destroyed. Apply their actual shooting and charge permissions and any Mission Tactics only while the formation qualifies. This does not spend another use.',survivors);
 }
 for(const bearer of active){
  const upgrade=selectedSpaceMarineUpgrade(current,bearer);if(!upgrade)continue;
  const f=forms.find(g=>g.members.some(s=>s.id===bearer.id));if(!f)continue;
  const prefix='upgrade-'+upgrade.id+'-'+bearer.id,title=upgrade.name+' · '+bearer.id;
  const row=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets:readonly Form[]=[f])=>card(prefix+'-'+suffix,title,window,turn,timing,summary,targets,upgrade.id);
  const own=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string)=>emit(prefix+'-'+suffix,title,window,turn,timing,summary,[bearer],upgrade.id);
  const model=upgrade.bearerModels.length?'the actual '+upgrade.bearerModels.join(' / ')+' enhancement bearer':'the actual enhancement bearer';
  const weaponKey=(name:string)=>name.split(/\s+[-–—]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
  const ownItems=spaceMarineModelLoadouts(bearer).filter(m=>!upgrade.bearerModels.length||upgrade.bearerModels.includes(m.model)).flatMap(m=>m.items).map(weaponKey);
  const ownNonPsychicRanged=()=>(SM_CARDS[bearer.unit]?.weapons??[]).some(w=>w.phase==='Shooting'&&ownItems.includes(weaponKey(w.name))&&!w.abilities.some(a=>/^psychic\b/i.test(a)));
  const attacks=(summary:string,snapSummary?:string)=>{
   if(ranged(f))row('ranged','Shooting','either','during',summary);
   if(melee(f))row('melee','Fight','either','during',summary);
   if(snapSummary&&ranged(f)&&!kw(f,'TITANIC'))row('snap','Movement','opponent','end',snapSummary);
  };
  const defences=(summary:string)=>{for(const [phase,turn] of incoming)row('defence',phase,turn,'during',summary);};
  switch(upgrade.id){
   case '000008353002':
    own('characteristics','Pre-battle','either','during','Only '+model+' has +1 Objective Control and +1 Leadership. Other Company Heroes and attached models retain their own characteristics.');
    for(const phase of phases)own('feel-no-pain',phase,'either','during','Only '+model+' has Feel No Pain 5+.');
    if(melee(f))row('exhortation','Fight','either','during','Ancient Exhortation: once per battle, per army, when this bearer’s formation is selected to fight, its melee attacks gain +1 Attacks until phase end. Record this use; the +1 applies to the whole actual formation.');break;
   case '000008353003':case '000010633004':
    own('melee','Fight','either','during','Only '+model+' gains +1 Strength and +1 AP on melee attacks, or +2 Strength and +2 AP instead if Assault Doctrine is actually active for its formation.');break;
   case '000008353004':case '000010633002':case '000011220003':
    row('tactical','Command','own','start','While the eligible Captain bearer remains in this formation, Tactical Doctrine is active for it in addition to any other Combat Doctrine. This does not spend an army-wide doctrine use.');
    row('fall-back','Movement','own','during','When this bearer’s formation is selected to Fall Back, its additional Tactical Doctrine means that particular Fall Back does not prevent shooting or declaring a charge.');
    for(const phase of ['Shooting','Charge'] as const)row('tactical-permission',phase,'own','during','If this formation made a Fall Back under its additional Tactical Doctrine, that particular move does not prevent shooting or declaring a charge. All other shooting and charge eligibility requirements still apply.');break;
   case '000008353005':case '000010633003':
    own('save','Pre-battle','either','during','Only '+model+' has a 2+ armour Save. This does not change the armour of its Bodyguards or other models.');
    for(const phase of phases)own('feel-no-pain',phase,'either','during','Only '+model+' has Feel No Pain 5+.');break;
   case '000008478002':
    defences('The models in this upgraded eligible Astartes Vehicle formation have a 5+ invulnerable save.');
    row('heal','Command','own','end','At the end of your Command phase, this upgraded Vehicle formation heals 1 wound, without exceeding a model’s starting wounds. Apply current unit-healing rules: if every remaining model is at full wounds, healing can return a destroyed non-Character model where applicable.');break;
   case '000008478003':
    if(ranged(f))row('heavy','Shooting','own','during','This upgraded Vehicle formation’s ranged attacks have Heavy: add 1 to Hit in your Shooting phase only if it is unengaged, was not set up this turn, and no model in the formation moved more than 3″ this turn. Snap shooting ignores Hit-roll modifiers.');break;
   case '000008486002':case '000010629002':
    row('advance','Movement','own','during','This upgraded formation may re-roll Advance rolls.');break;
   case '000008486003':
    row('spot','Shooting','own','start','At the start of your Shooting phase, choose one visible enemy within 12″ of this upgraded Speeder formation. That enemy is spotted and gains +3″ detection range until phase end, the default duration of this untimed triggered effect.');break;
   case '000008522002':
    own('weapon','Fight','either','during','Only '+model+' gains The Thief of Secrets as an additional melee weapon: 6 attacks, WS 2+, Strength 6, AP −3, Damage 2, with no weapon abilities. It does not replace a native weapon or allow the bearer to use multiple ordinary melee weapons in one fight.');break;
   case '000008522003':case '000011168002':
    if(kw(f,'KILL TEAM')){
     row('deep-strike','Pre-battle','either','during','While this eligible bearer remains in its actual Kill Team formation, that whole formation has Deep Strike. Check every model in the actual formation when declaring and arriving from Reserves.');
     row('ingress','Movement','opponent','end','At the end of the opponent’s Movement phase, when you target this bearer’s actual Kill Team formation with Rapid Ingress, reduce that use by 1 CP. It still needs legal reserve arrival timing and placement; this gives neither an extra Stratagem use nor unconditional first-round arrival.');
    }break;
   case '000008522004':
    row('choose','Command','own','during','Once per battle, per army, activate the Tome: Assault, Devastator and Tactical Doctrine become active together for this bearer’s formation until your next Command phase starts. This explicit rule permits all three at once.');break;
   case '000008522005':
    for(const [phase,turn] of incoming)own('osseus',phase,turn,'during','Enemy Vehicle formations within 6″ of '+model+' suffer −1 Attacks on their attacks. Measure from the actual Watch Master or Techmarine model, including when it is in an Attached formation; this does not require those attacks to target its own formation.');break;
   case '000010368002':
    attacks('This bearer’s formation may ignore modifiers to Ballistic Skill, Weapon Skill and Hit rolls. This does not ignore modifiers to Strength, AP, Damage or Wound rolls. Snap shooting retains its own Hit-roll restrictions.','Snap shooting still ignores Hit-roll modifiers and cannot re-roll Hit rolls or score Critical Hits. Forged in Battle grants no exception.');break;
   case '000010368003':
    for(const [phase,turn] of incoming)own('damage',phase,turn,'during','Reduce Damage by 1 only for attacks allocated to '+model+'. Other models in the formation do not receive this protection.');break;
   case '000010368004':
    own('melee','Fight','either','during','Only '+model+' gains +1 Strength and +1 Damage on melee attacks.');break;
   case '000010368005':
    if(weaponAbility(f,/^torrent\b/i)){
     row('torrent','Shooting','either','during','Only this bearer’s formation’s actual Torrent weapons gain +1 Attacks. Models without an equipped Torrent weapon receive no bonus.');
     row('torrent-snap','Movement','opponent','end','Actual Torrent weapons in this bearer’s formation retain +1 Attacks and automatic hits during snap shooting.');
    }break;
   case '000010466002':
    row('infiltrators','Pre-battle','either','during','This Infantry bearer’s whole formation has Infiltrators. Deploy more than 8″ horizontally from enemy units and the opponent’s deployment zone, subject to normal legal setup.');break;
   case '000010466003':
    own('fights-first','Fight','either','start','Only '+model+' receives Fights First from this enhancement. The whole formation is a Fights First unit only while every actual model has that ability; this enhancement alone does not give it to attached Bodyguards.');
    for(const [phase,turn] of incoming)own('lone',phase,turn,'during','Only '+model+' receives Lone Operative. An Attached formation benefits only while every actual surviving model has Lone Operative, including when only this bearer remains. When active, enemies beyond 12″ cannot see it or target it with Indirect Fire; if different Lone Operative ranges apply, use the largest.');break;
   case '000010466004':case '000011200003':
    row('first-ingress','Movement','own','during','In your first Movement phase, this bearer’s formation may make an ingress move from Reserves. This explicitly grants first-round arrival; apply the current placement requirements for its actual ingress mode and models.');break;
   case '000010466005':
    for(const phase of phases)row('coronal',phase,'either','during','Enemy formations engaged with this bearer’s formation cannot be targeted by their controlling player’s Stratagems unless they are Monsters or Vehicles. This does not block your own Stratagems targeting those enemies.');break;
   case '000010629003':
    row('huntmaster','Movement','either','during','When this upgraded Mounted or Speeder formation is selected to make an ingress move, treat the current battle round as one higher for that move. Apply Strategic Reserves placement using the increased round and retain the other requirements of the rule permitting that ingress.');break;
   case '000010629004':
    if(ranged(f)){
     row('ranged','Shooting','either','during','This bearer’s formation’s ranged attacks have Ignores Cover and Sustained Hits 1. During snap shooting, only Ignores Cover applies because those attacks cannot score Critical Hits.');
     row('snap','Movement','opponent','end','During snap shooting, this formation retains Ignores Cover. Sustained Hits cannot trigger because snap shooting cannot score Critical Hits.');
    }break;
   case '000010629005':
    own('melee','Fight','either','during','Only '+model+' gains +1 Strength and +1 AP on melee attacks, or +2 Strength and +2 AP instead if its formation made a Charge move this turn.');break;
   case '000010633005':
    if(ranged(f))row('ranged','Shooting','either','during','This bearer’s formation’s ranged attacks have Sustained Hits 1. This cannot trigger during snap shooting, which cannot score Critical Hits.');break;
   case '000010759002':break; // Original-selection destruction trigger above.
   case '000010759003':
    row('action-move','Movement','own','during','When this upgraded formation makes an Advance or Fall Back, that particular move does not prevent it from starting an action.');
    row('action','Shooting','own','during','A qualifying Advance or Fall Back by this upgraded formation does not prevent it from starting an otherwise legal action. This enhancement does not also permit shooting while performing that action.');break;
   case '000010759004':case '000011228002':
    row('redeploy','Pre-battle','either','during','After both players have deployed, redeploy up to three friendly Astartes Infantry formations. You may put the chosen formations in Strategic Reserves regardless of how many are already there. Apply redeployment to the whole actual Attached formation. Eligible formations: '+names(infantry)+'.',infantry);break;
   case '000010759005':
    if(ranged(f)){
     row('cover','Shooting','either','during','This upgraded formation’s ranged weapons have Ignores Cover.');
     row('cover-snap','Movement','opponent','end','This upgraded formation’s ranged attacks retain Ignores Cover during snap shooting.');
    }break;
   case '000011180002':
    if(vehicles.length)row('choose','Movement','own','during','At the start or end of this Techmarine’s formation’s move in your Movement phase, choose one friendly Astartes Vehicle model within 3″ of that formation. Only the chosen Vehicle model’s attacks gain Lethal Hits until your next Command phase starts. Eligible Vehicle formations: '+names(vehicles)+'.',vehicles);break;
   case '000011180003':
    for(const [phase,turn] of incoming)if(vehicles.length)row('ward',phase,turn,'during','Once per battle round, per army, when an enemy targets a friendly Astartes Vehicle formation within 6″ of this Techmarine’s formation, give that Vehicle Feel No Pain 5+ only until that attacking enemy has finished its attacks. Measure from the Techmarine’s actual formation; it does not protect against every later attacker. Eligible Vehicles: '+names(vehicles)+'.',vehicles);break;
   case '000011180004':
    if(vehicles.length)row('choose','Movement','own','during','Choose one visible friendly Astartes Vehicle formation within 6″ of '+model+', then choose Devastator or Tactical Doctrine. That doctrine is active for that Vehicle until your next Command phase starts, replacing its previous doctrine unless a rule explicitly allows both. Eligible Vehicles: '+names(vehicles)+'.',vehicles);break;
   case '000011180005':
    own('toughness','Pre-battle','either','during','Only '+model+' gains +1 Toughness. Use the normal Attached-unit Toughness rules when attacks target a mixed formation.');
    for(const phase of phases)own('feel-no-pain',phase,'either','during','Only '+model+' has Feel No Pain 5+.');break;
   case '000011184002':
    row('charge','Charge','either','during','If this bearer’s formation disembarked this turn, it may re-roll Charge rolls. The disembark move must still permit charging.');
    for(const [phase,turn] of incoming)row('no-snap',phase,turn,'during','If this bearer’s formation disembarked this turn, enemy formations cannot target it with snap shooting attacks, including reactive snap shooting. This does not prevent normal shooting attacks.');break;
   case '000011184003':{
    const carriers=transports.filter(t=>cargo(t).some(g=>g.members.some(m=>f.members.some(s=>s.id===m.id))));
    if(carriers.length&&infantry.length)row('uplink','Movement','own','during','Only while this Captain’s formation is actually embarked in a Transport, choose one friendly Astartes Infantry formation within 6″ of that Transport and one Combat Doctrine. The chosen doctrine is active until this Movement phase ends, the default duration where the rule supplies no duration. A qualifying Advance or Fall Back made under that doctrine retains that particular move’s eligibility exception. Possible carriers: '+names(carriers)+'.',infantry);break;
   }
   case '000011188002':case '000011196003':
    attacks('Against an actually hidden enemy, this bearer’s formation’s attacks may re-roll Wound rolls of 1, or Wound rolls of 1 and 2 if Assault Doctrine is active for this formation. Hidden status does not itself permit an otherwise illegal target.','During snap shooting against an actually hidden enemy, retain Wound-roll re-rolls of 1, or 1 and 2 if Assault Doctrine is active. Snap shooting prohibits Critical Hits, not Wound-roll re-rolls.');break;
   case '000011188003':
    if(ranged(f))row('move','Shooting','own','during','After this bearer’s formation finishes shooting in your Shooting phase, if unengaged it may make a Normal move up to 6″. If it does, it cannot declare a charge until the end of the turn.');break;
   case '000011192002':
    attacks('When resolving this bearer’s formation’s attacks, it may re-roll one Hit roll and one Wound roll. Snap shooting prohibits the Hit-roll re-roll.','When this bearer’s formation fires snap shots, it retains one Wound-roll re-roll. Snap shooting prohibits the Hit-roll re-roll.');break;
   case '000011192003':
    row('scouts','Pre-battle','either','during','This Tacticus bearer’s whole formation has Scouts 6″. Apply the current Scout move timing and every-model requirement, including actual Transport eligibility.');break;
   case '000011196002':
    for(const [phase,turn] of incoming)row('no-snap',phase,turn,'during','Enemy formations cannot target this bearer’s formation with snap shooting attacks while the actual eligible bearer remains, including reactive snap shooting. Normal shooting is unaffected.');break;
   case '000011200002':
    if(melee(f))row('lethal','Fight','either','during','This Terminator bearer’s formation’s melee attacks have Lethal Hits.');break;
   case '000011204002':
    own('weapon','Fight','either','during','Only '+model+' gains Imperium’s Sword as an additional melee weapon: 6 attacks, WS 2+, Strength 7, AP −3, Damage 3, with no weapon abilities. It does not replace a native weapon or allow use of multiple ordinary melee weapons in one fight.');break;
   case '000011204003':
    if(melee(f))row('sustained','Fight','either','during','This upgraded Astartes Infantry formation’s melee attacks have Sustained Hits 1 only against enemy formations that are neither Monsters nor Vehicles.');break;
   case '000011208002':
    defences('Attacks targeting this Gravis bearer’s formation suffer −1 to Wound only if their Strength is greater than the formation’s Toughness.');break;
   case '000011208003':
    row('scouts','Pre-battle','either','during','This Gravis bearer’s whole formation has Scouts 5″. Apply the current Scout move timing and every-model requirement, including actual Transport eligibility.');break;
   case '000011212002':
    if(ownNonPsychicRanged()){
     own('ranged','Shooting','either','during','Only '+model+' gains +1 Attacks, Strength, AP and Damage on its actual non-Psychic ranged attacks. Psychic attacks and other models’ weapons receive no bonus.');
     own('ranged-snap','Movement','opponent','end','Only '+model+' retains +1 Attacks, Strength, AP and Damage on its non-Psychic ranged attacks during snap shooting. These bonuses do not require a Critical Hit.');
    }break;
   case '000011212003':
    if(ranged(f))row('lethal','Shooting','either','during','This bearer’s formation’s ranged attacks have Lethal Hits. This cannot trigger during snap shooting, which cannot score Critical Hits.');
    row('advance','Movement','own','during','If Devastator Doctrine is actually active for this bearer’s formation, it may re-roll Advance rolls.');break;
   case '000011216002':
    for(const phase of phases)row('oc',phase,'either','during','Every model in this upgraded Gravis formation gains +1 Objective Control. Apply this to actual models currently in the formation, including attached models.');break;
   case '000011216003':
    row('heal','Command','own','during','This Apothecary Biologis bearer’s formation heals D3+1 wounds. Restore wounds without exceeding a model’s starting wounds; under current unit-healing rules, if every surviving model is at full wounds, healing can return destroyed non-Character models from this original formation. Returned models remain in that formation and do not reset Starting Strength.');break;
   case '000011220002':{
    const battleline=astartes.filter(g=>kw(g,'BATTLELINE'));
    row('overwatch','Movement','opponent','end','Once per battle round, per army, when you target a friendly Astartes Battleline formation within 12″ of '+model+' with Fire Overwatch or Heroic Intervention, reduce that use by 1 CP. This is one shared discount, not one for each Stratagem; their ordinary timing and target eligibility still apply.',battleline.filter(g=>ranged(g)&&!kw(g,'TITANIC')));
    row('intervention','Charge','opponent','end','At the end of the opponent’s Charge phase, once per battle round, per army, when using Heroic Intervention on a friendly Astartes Battleline formation within 12″ of '+model+', reduce its cost by 1 CP. It must be unengaged and have an enemy within 12″; the charge mode’s own limits still apply. This shares the same once-per-round use as the Fire Overwatch discount and grants no extra Stratagem use.',battleline.filter(g=>melee(g)&&(!kw(g,'VEHICLE')||kw(g,'WALKER')||kw(g,'CHARACTER'))));break;
   }
   case '000011224002':
    defences('Attacks targeting this upgraded Dreadnought formation have their Damage reduced by 1.');break;
   case '000011224003':{
    const eligible=astartes.filter(g=>kw(g,'INFANTRY')||kw(g,'MOUNTED'));
    for(const phase of ['Shooting','Fight'] as const)row('champion',phase,'either','during','Friendly Astartes Infantry or Mounted formations within 6″ of this upgraded Dreadnought formation may re-roll Hit rolls of 1. The Dreadnought must survive to supply this aura. It does not apply to snap shooting.',eligible.filter(phase==='Fight'?melee:ranged));break;
   }
   case '000011228003':
    for(const phase of phases)row('leadership',phase,'either','during','Friendly Astartes formations within 6″ of '+model+' may re-roll Leadership rolls. Measure from the actual Tacticus bearer; the aura ends if that bearer is destroyed. Do not replace a separately named test with a Leadership roll.',astartes);break;
  }
 }
 return rows;
}
