import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {TYRANID_SHEETS} from './tyranid-data';
import {TYRANID_CARDS} from './tyranid-card-profiles.generated';
import {tyranidKeywords} from './tyranid-keywords';
import {tyranidFormations} from './tyranid-transports';
import {tyranidSynapsePossible} from './tyranid-synapse';
import {tyranidModelLoadouts,tyranidWeaponCount} from './tyranid-loadouts';
import {eligibleTyranidUpgrades,tyranidHasDeepStrike,tyranidSelectedDetachments} from './tyranid-detachment-data';
import {TYRANID_STRATAGEMS} from './tyranid-detachments.generated';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Form={root:RosterInstance;members:readonly RosterInstance[]};
const source='https://wahapedia.ru/wh40k11ed/factions/tyranids/';
const pack='https://assets.warhammer-community.com/eng_14-10_wh40k_faction_pack_tyranids-an12izciwp-np2hnkcsje.pdf';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const defence=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const native=new Set(TYRANID_SHEETS.map(s=>s.unit));
const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const regeneration='Regenerate using Feed the Swarm: heal one model by up to D3+1 lost wounds, or return one destroyed Infantry model other than a Character; return up to three models instead for an Endless Multitude unit. A formation normally regenerates only once per phase, and destroyed Characters cannot be restored to Attached units.';
const destruction='For an Attached unit, destruction triggers only when the last model that started the battle in that formation is destroyed; losing only a Bodyguard or Character does not trigger it.';
const effects:Record<typeof TYRANID_STRATAGEMS[number]['id'],string>={
 '000008349003':'Before fighting, select up to two eligible Tyranids formations within Synapse Range, or one other eligible Tyranids formation. Their attacks score Critical Hits on unmodified Hit rolls of 5+ until this Fight phase ends.',
 '000008349002':'After an enemy selects this formation as an attack target, its models gain Feel No Pain 6+, improved to 5+ if it is within Synapse Range, until phase end. This cannot be activated by mortal-wound abilities such as Doombolt that do not select attack targets.',
 '000008349004':'After enemy Fight target selection, each model in this formation destroyed before it has fought may fight on a 4+, after the attacking unit finishes its attacks and before removing that model. This applies until this Fight phase ends.',
 '000008349005':'Just before this formation Consolidates, add 3″ to that move if it can finish within Engagement Range. If the formation is within Synapse Range and unengaged, it may instead make a Normal move of up to 6″.',
 '000008349006':'In your Command phase, select up to two Tyranids formations within Synapse Range, or one other formation. Give them an additional Hyper-adaptation until your next Command phase starts; it must differ from the army’s first-round choice.',
 '000008349007':'Return up to D3+3 destroyed models to each of up to two Endless Multitude formations within Synapse Range, or one other Endless Multitude formation. Do not return destroyed Characters to Attached units.',
 '000008422003':'Before this Tyranids Monster formation fights, its models re-roll Hit rolls until this Fight phase ends.',
 '000008422004':'After an enemy selects this Monster formation as a Fight target, that enemy takes a Battle-shock test. Its attacks targeting this formation suffer −1 to Hit until phase end, and also −1 to Wound if that test failed.',
 '000008422006':'Before this Monster formation shoots in your Shooting phase, its ranged weapons gain Ignores Cover, and its attacks may ignore any or all Ballistic Skill and Hit-roll modifiers, until phase end.',
 '000008422007':'Just after this actual Tyranids Monster model finishes a Charge move, select one enemy within its Engagement Range. Roll six D6; each 4+ inflicts one mortal wound. Measure from the Monster model, not an attached Infantry model.',
 '000008422002':'When this non-Flying Tyranids Monster model with Deadly Demise is destroyed, its Deadly Demise automatically inflicts mortal wounds without the triggering D6 roll. This targets the actual destroyed model, not every model in its attached formation.',
 '000008422005':'Before this Monster formation moves, its models can pass through non-Titanic models and terrain sections up to 4″ high on Normal, Advance and Fall Back moves this phase. They may cross enemy Engagement Range but cannot finish there. They may also pass through taller terrain; after doing so, roll one D6 for the formation and it becomes Battle-shocked on a 1.',
 '000008409004':'After enemy target selection, attacks targeting this Endless Multitude formation suffer −1 to Hit until this phase ends.',
 '000008409005':'Before this Endless Multitude formation shoots or fights, its weapons gain Sustained Hits 1 until phase end. While the formation contains at least 15 models, unmodified Hit rolls of 5+ are Critical Hits.',
 '000008409006':'Select this Endless Multitude formation in your Movement phase. When it Advances this phase, add 6″ to its models’ Move instead of rolling an Advance die.',
 '000008409002':'Just before this Endless Multitude formation makes an otherwise permitted surge move while within Synapse Range, re-roll the distance D6 and move towards the closest objective marker instead of the closest enemy. This does not itself grant a surge; all other current surge requirements still apply.',
 '000008409007':'After enemy shooting target selection, treat this Endless Multitude formation as containing fewer than five models for Blast until the opponent’s Shooting phase ends.',
 '000008409003':'Once per battle, after this Endless Multitude formation is destroyed, add an identical replacement at Starting Strength in Strategic Reserves. Destroyed attached Characters are not returned. '+destruction,
 // The unchanged Rapacious Hunger rider names D3/flat3 healing. Current
 // publisher Feed the Swarm has no D3 healing option, so that rider cannot
 // replace its D3+1 heal; do not invent a flat4 benefit.
 '000008413007':'Just after this formation destroys an enemy in your Fight phase, immediately '+regeneration,
 '000008413002':'After this Harvester formation is destroyed, mark the enemy that destroyed it. Friendly Tyranids models gain +1 to Wound against that enemy for the rest of the battle, including snap shooting. '+destruction,
 '000008413005':'After enemy target selection, this Harvester formation gains Feel No Pain 5+ until phase end, improved to 4+ if it is within range of an objective you control.',
 '000008413004':'In either Command phase, select an objective controlled by this Harvester formation. It remains yours until the opponent has greater control over it at a phase end.',
 '000008413003':'When a friendly Tyranids formation is destroyed, before removing its last model, select this Harvester within 6″ of it. Regenerate a surviving friendly Tyranids formation within 6″ of that Harvester; the destroyed formation cannot receive this effect. '+regeneration+' '+destruction,
 '000008413006':'Before this formation fights, its melee weapons gain Lethal Hits until this Fight phase ends. If it is a Harvester formation, successful unmodified Hit rolls of 5+ also become Critical Hits.',
 '000008418003':'Before this Vanguard Invader Infantry formation fights, its melee weapons gain Precision until this Fight phase ends.',
 '000008418002':'After this Vanguard Invader formation selects shooting or Fight targets, choose one enemy targeted by those attacks to take a Battle-shock test. This formation gains +1 to Hit against that enemy until phase end, and +1 to Wound as well if the test failed.',
 '000008418006':'After enemy shooting target selection, this Vanguard Invader formation can be targeted only by attacking models within 18″ until phase end, or within 6″ if it has Lone Operative. The opponent can choose new targets.',
 '000008418007':'At the end of the opponent’s Fight phase, place up to two Vanguard Invader formations or one other Tyranids Infantry formation in Strategic Reserves. Every selected formation must be more than 3″ from all enemy units.',
 '000008418004':'In your Movement phase, select one Tyranids formation in Reserves, or up to two Vanguard Invader formations in Reserves. Treat the battle round as one higher only for setting those formations up this phase.',
 '000008418005':'After an enemy finishes a Normal, Advance or Fall Back move in the opponent’s Movement phase, select up to two unengaged Vanguard Invader formations within 8″ of it, or one other unengaged Tyranids Infantry formation within 8″. Each selected formation makes a Normal move of up to 6″.',
 '000008556004':'Before this Synapse formation has been selected to shoot or fight, choose it and one visible enemy within 24″. Until phase end, friendly Tyranids models attacking that enemy re-roll Hit and Wound rolls of 1 while their formation is within 6″ of this Synapse formation.',
 '000008556003':'In either Command phase, select this Synapse formation. Until turn end, friendly Tyranids formations within 9″ of it are within Synapse Range.',
 '000008556005':'After enemy target selection, worsen attacks’ AP against this Synapse formation by 1 only until that attacking unit finishes its attacks. The protection does not last for the whole phase.',
 '000008556006':'Select this formation within Synapse Range in your Command phase. One chosen Synaptic Imperative replaces its current imperative until your next Command phase starts; you may choose an imperative already used this battle.',
 '000008556007':'Just after this Tyranids formation Falls Back in your Movement phase while within Synapse Range, it can shoot and declare a charge for the rest of this turn.',
 '000008556002':'Just after an enemy within 12″ of this Synapse formation fails a Battle-shock test, roll six D6; each 3+ inflicts one mortal wound on that enemy.',
 '000009738004':'When this Tyranid Warriors formation is selected to shoot in your Shooting phase, its ranged attacks have Ignores Cover until phase end.',
 '000009738003':'At the end of your Movement phase, secure one objective controlled by this Tyranid Warriors formation.',
 '000009738002':'After enemy shooting or Fight target selection, attacks targeting this Tyranid Warriors formation with Strength greater than its Toughness suffer −1 to Wound until phase end.',
 '000010148007':'At the end of the opponent’s Fight phase, place one unengaged Tyranids formation or up to two unengaged Burrower formations in Strategic Reserves.',
 '000010148004':'At the end of your Movement phase, select this formation only if it was set up as Reinforcements this turn. Its weapons gain Sustained Hits 1 and Ignores Cover until the end of your next Fight phase. These are unit-wide effects for that stated duration.',
 '000010148005':'At the end of your Movement phase, remove this unengaged formation wholly within 9″ of a Tunnel Marker and set it up wholly within 9″ of another of your Tunnel Markers, more than 6″ horizontally from all enemies. This is repositioning, not Deep Strike; it does not trigger Mawloc’s Terror from the Deep.',
 '000010148006':'Select this Monster formation only if it arrived as Reinforcements this turn. Until your Charge phase ends, friendly Tyranids formations within 6″ of it can re-roll Charge rolls.',
 '000010148002':'In either Command phase, give this Mawloc or Trygon formation Synapse until your next Command phase starts. The keyword grant lasts for that stated duration.',
 '000010148003':'In your Movement phase, select this formation wholly within 9″ of one of your Tunnel Markers. Heal one model by up to D3+1 lost wounds, or return up to D3+1 destroyed models with Wounds 1 at full wounds. This does not return destroyed Characters to Attached units.',
 '000010937004':'At the end of the opponent’s Fight phase, place this unengaged Deathleaper, Lictor or Neurolictor formation in Strategic Reserves.',
 '000010937003':'At the start of your Shooting phase, choose one visible enemy within 12″ of this Deathleaper, Lictor, Neurolictor or Von Ryan’s Leapers formation. That enemy has +6″ detection range until this Shooting phase ends; the source need not have a ranged weapon.',
 '000010937002':'When this Deathleaper, Lictor, Neurolictor or Von Ryan’s Leapers formation is selected to fight, its attacks against hidden enemies gain +1 Strength and +1 AP until this Fight phase ends.',
 '000010941004':'After this Norn Assimilator shoots in your Shooting phase, select one enemy hit by its attacks. That enemy is tethered and suffers −2″ Move until your next Command phase starts.',
 '000010941002':'When this Norn Assimilator suffers a mortal wound, it gains Feel No Pain 4+ against mortal wounds until the current phase ends.',
 '000010941003':'When this Norn Assimilator or Norn Emissary is selected to fight, its melee attacks gain +2 Strength until this Fight phase ends.',
};

export function tyranidDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Tyranids')return [];
 const current={...army,instances:[...roster]},active=roster.filter(s=>native.has(s.unit));
 const forms:Form[]=tyranidFormations(army,active),detachments=tyranidSelectedDetachments(current);
 const has=(name:string)=>detachments.includes(name);
 const tag=(s:RosterInstance,k:string,model?:string)=>tyranidKeywords(current,s,model).has(k);
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const named=(f:Form,...names:string[])=>f.members.some(s=>names.includes(s.unit));
 const weapons=(f:Form,phase:'Shooting'|'Fight',required?:string)=>f.members.flatMap(s=>(TYRANID_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase===phase&&tyranidWeaponCount(s,w.name)>0&&(!required||tyranidModelLoadouts(s).some(m=>tag(s,required,m.model)&&m.items.some(i=>key(i)===key(w.name))))).map(w=>({s,...w})));
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0,melee=(f:Form)=>weapons(f,'Fight').length>0;
 const rangedHits=(f:Form)=>weapons(f,'Shooting').some(w=>!w.abilities.includes('torrent'));
 const movable=(f:Form)=>!kw(f,'AIRCRAFT')&&!named(f,'Sporocyst','Tyrannocyte');
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const tyr=forms.filter(f=>kw(f,'TYRANIDS')),monsters=tyr.filter(f=>kw(f,'MONSTER')),endless=tyr.filter(f=>kw(f,'ENDLESS MULTITUDE'));
 const harvesters=tyr.filter(f=>kw(f,'HARVESTER')),vanguard=tyr.filter(f=>kw(f,'VANGUARD INVADER')),synapse=tyr.filter(f=>kw(f,'SYNAPSE'));
 const warriors=tyr.filter(f=>kw(f,'TYRANID WARRIORS')),burrowers=tyr.filter(f=>kw(f,'BURROWER'));
 const ambushers=tyr.filter(f=>named(f,'Deathleaper','Lictor','Neurolictor','Von Ryan’s Leapers'));
 const norns=tyr.filter(f=>named(f,'Norn Emissary','Norn Assimilator'));
 const original=expandRoster(army);
 const synapsePossible=tyranidSynapsePossible(army,active);
 const originalHarvester=original.some(s=>tyranidKeywords(army,s).has('HARVESTER'));
 const tunnelPossible=original.some(s=>tyranidKeywords(army,s).has('BURROWER'));
 const selected=(s:RosterInstance)=>current.upgrades2026?.[s.id]??current.upgrades2026?.[s.unit]??s.enhancement;
 const rows:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],rule?:string,reference=source)=>{
  if(units.length)rows.push({id:'11e-tyranid-det-'+id+'-'+window+'-'+turn+'-'+timing,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source:reference,sourceRuleId:rule,origin:'detachment'});
 };
 const card=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:readonly Form[],rule?:string,reference=source)=>emit(id,title,window,turn,timing,summary,roots(fs),rule,reference);
 const snap=(id:string,title:string,summary:string,fs:readonly Form[],rule?:string)=>card(id,title,'Movement','opponent','end',summary,fs.filter(f=>ranged(f)&&!kw(f,'TITANIC')),rule);
 const safeDefence=(id:string,title:string,summary:string,fs:readonly Form[],rule?:string)=>{for(const [p,t] of defence)card(id,title,p,t,p==='Movement'?'end':'during',summary,fs,rule);};
 if(has('Invasion Fleet')){
  const adapt='Select one Hyper-adaptation at the start of battle round 1 for the battle: Sustained Hits 1 against Infantry/Swarm, Lethal Hits against Monsters/Vehicles, or Precision on Critical Hits against Character units. Apply it only to TYRANIDS models’ attacks. None of these Critical Hit benefits trigger during snap shooting.';
  card('adapt-choice','Hyper-adaptations','Start of battle round','either','start',adapt,tyr,'000008356');
  card('adapt-shoot','Hyper-adaptations','Shooting','own','during',adapt,tyr.filter(rangedHits),'000008356');
  card('adapt-fight','Hyper-adaptations','Fight','either','during',adapt,tyr.filter(melee),'000008356');
 }
 if(has('Crusher Stampede')){
  const body='Only TYRANIDS MONSTER models gain +1 to Hit while their formation is below Starting Strength, and +1 to Wound as well while it is Below Half-strength. Non-Monster models in an attached formation do not inherit those attack bonuses.';
  card('enraged-shoot','Enraged Behemoths','Shooting','own','during',body,monsters.filter(ranged),'000008403',pack);
  card('enraged-fight','Enraged Behemoths','Fight','either','during',body,monsters.filter(melee),'000008403',pack);
  snap('enraged-snap','Enraged Behemoths · snap shooting','Only MONSTER models retain +1 to Wound while their formation is Below Half-strength. Snap shooting ignores the Hit modifier.',monsters,'000008403');
  for(const p of phases)card('enraged-control','Enraged Behemoths · objective control',p,'either','during','While this Monster formation is at Starting Strength and not Battle-shocked, all models in that formation gain +2 Objective Control, including attached non-Monster models.',monsters,'000008403',pack);
 }
 if(has('Unending Swarm'))card('odds','Insurmountable Odds','Shooting','opponent','during','After an enemy has shot, if those attacks destroyed a model in this Endless Multitude formation, it may surge up to D6″. It must be unengaged, not Battle-shocked and not have moved this phase. Finish towards the closest enemy as required by current surge rules; it cannot move again this phase.',endless,'000008407',pack);
 if(has('Assimilation Swarm')&&harvesters.length)card('feed','Feed the Swarm','Command','own','during','Each Harvester formation may choose one friendly Tyranids formation within 6″. '+regeneration+' Harvester sources: '+names(harvesters)+'. Eligible formations: '+names(tyr)+'.',tyr,'000008411',pack);
 if(has('Vanguard Onslaught'))for(const p of ['Movement','Charge'] as const)card('tendrils','Questing Tendrils',p,'own','during','Tyranids formations may declare a charge after Falling Back. Vanguard Invader formations may also declare a charge after Advancing. A formation must still satisfy all other charge requirements.',tyr.filter(movable),'000008415');
 if(has('Synaptic Nexus')&&synapsePossible){
  const body='At the start of each battle round, you may choose one unused Synaptic Imperative for that round: a 5+ invulnerable save; +1 to Advance and Charge rolls; or +1 to melee Hit rolls. Each can be chosen once per battle. Only formations actually within Synapse Range benefit; Neuroloids can supply that range without granting the Synapse keyword.';
  card('imperative-choice','Synaptic Imperatives','Start of battle round','either','start',body,tyr,'000008420');
  safeDefence('imperative-save','Synaptic Augmentation','If this round’s active imperative is Synaptic Augmentation, models in this formation have a 5+ invulnerable save only while the formation is within Synapse Range.',tyr,'000008420');
  for(const p of ['Movement','Charge'] as const)card('imperative-move','Surging Vitality',p,'own','during','If this round’s active imperative is Surging Vitality, add 1 to this formation’s Advance and Charge rolls only while it is within Synapse Range.',tyr.filter(movable),'000008420');
  card('imperative-fight','Goaded to Slaughter','Fight','either','during','If this round’s active imperative is Goaded to Slaughter, this formation’s melee attacks gain +1 to Hit only while it is within Synapse Range.',tyr.filter(melee),'000008420');
 }
 if(has('Warrior Bioform Onslaught')){
  const actual=active.filter(s=>tyranidModelLoadouts(s).some(m=>['TYRANID WARRIORS','TYRANID PRIME WITH LASH WHIP','WINGED TYRANID PRIME'].some(k=>tag(s,k,m.model))));
  for(const [p,t] of defence)emit('leader-beasts','Leader-beasts',p,t,p==='Movement'?'end':'during','Only actual Tyranid Warriors, Tyranid Prime with Lash Whip and Winged Tyranid Prime models have this 5+ invulnerable save. Other models in their attached formation do not inherit it.',actual,'000009736',pack);
 }
 if(has('Subterranean Assault')){
  card('surprise-shoot','Surprise Assault','Shooting','own','during','Only TYRANIDS models re-roll ranged Hit rolls of 1. This does not permit Hit re-rolls in snap shooting.',tyr.filter(rangedHits),'000010146',pack);
  card('surprise-fight','Surprise Assault','Fight','either','during','Only TYRANIDS models re-roll melee Hit rolls of 1.',tyr.filter(melee),'000010146',pack);
  if(burrowers.length){
   card('tunnels-create','Surprise Assault · Tunnel Markers','Movement','either','during','Each time this Burrower formation is set up from Reserves, place one circular 40mm Tunnel Marker within 1″ of it and more than 3″ horizontally from enemies. This also applies when a Burrower is repositioned and set up again. Enemy non-Aircraft models remove a marker when they end any move within 3″ of it.',burrowers,'000010146',pack);
  }
  if(tunnelPossible){
   card('tunnels-arrive','Surprise Assault · tunnel arrival','Movement','own','during','In your Reinforcements step, a formation arriving from Reserves may be set up wholly within 9″ of one of your existing Tunnel Markers and more than 6″ horizontally from enemies. This is not Deep Strike and does not trigger Mawloc’s Terror from the Deep. Existing markers remain after their source is destroyed. Current Burrower sources: '+(names(burrowers)||'none')+'.',tyr,'000010146',pack);
  }
 }
 if(has('Ambush Predators')){
  card('mindhunger-deploy','Mindhunger · Deep Strike','Pre-battle','either','during','Deathleaper, Lictor and Neurolictor formations gain Deep Strike. Von Ryan’s Leapers do not receive this grant.',ambushers.filter(f=>!named(f,'Von Ryan’s Leapers')),'000010935',pack);
  card('mindhunger-fight','Mindhunger','Fight','either','during','Lictor and Neurolictor attacks targeting Character units re-roll Hit rolls of 1. Deathleaper and Von Ryan’s Leapers do not receive this attack benefit.',ambushers.filter(f=>named(f,'Lictor','Neurolictor')),'000010935',pack);
 }
 if(has('Talons of the Norn Queen'))card('purpose','Protean Purpose','Command','own','during','Once per battle per Norn unit, replace its previous Singular Purpose selection with a new selection in your Command phase. The new selection replaces the old one; their benefits do not stack.',norns,'000010939',pack);
 for(const strat of TYRANID_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=tyr,actors:RosterInstance[]|undefined,body=effects[strat.id],actualTurn:Turn=turn;
   switch(strat.id){
    case '000008349003':case '000008349004':case '000008349005':case '000008413006':targets=tyr.filter(melee);break;
    case '000008349006':targets=tyr.filter(f=>rangedHits(f)||melee(f));break;
    case '000008349007':case '000008409004':case '000008409006':case '000008409007':case '000008409003':targets=endless;break;
    case '000008422003':case '000008422004':targets=monsters.filter(melee);break;
    case '000008422006':targets=monsters.filter(ranged);break;
    case '000008422007':actors=active.filter(s=>tag(s,'TYRANIDS')&&tag(s,'MONSTER'));break;
    case '000008422002':actors=active.filter(s=>tag(s,'TYRANIDS')&&tag(s,'MONSTER')&&!tag(s,'FLY')&&TYRANID_CARDS[s.unit]?.demise);break;
    case '000008422005':targets=monsters.filter(movable);break;
    case '000008409005':targets=endless.filter(phase==='Fight'?melee:rangedHits);break;
    case '000008409002':
     // The current Endless Multitude surge permission is Insurmountable Odds,
     // only in the opponent's Shooting phase; Skulking Horrors is a Normal move.
     targets=phase==='Shooting'&&synapsePossible?endless:[];actualTurn='opponent';break;
    case '000008413007':targets=tyr.filter(melee);break;
    case '000008413002':case '000008413005':case '000008413004':targets=harvesters;break;
    case '000008413003':targets=tyr.length>=2?harvesters:[];body+=' Surviving recipients: '+names(tyr)+'.';break;
    case '000008418003':targets=vanguard.filter(f=>kw(f,'INFANTRY')&&melee(f));break;
    case '000008418002':targets=vanguard.filter(phase==='Fight'?melee:ranged);break;
    case '000008418006':targets=vanguard;break;
    case '000008418007':targets=tyr.filter(f=>kw(f,'VANGUARD INVADER')||kw(f,'INFANTRY'));break;
    case '000008418004':targets=tyr;break;
    case '000008418005':targets=tyr.filter(f=>(kw(f,'VANGUARD INVADER')||kw(f,'INFANTRY'))&&movable(f));break;
    case '000008556004':targets=tyr.some(phase==='Fight'?melee:ranged)?synapse:[];body+=' Possible friendly attack recipients: '+names(tyr.filter(phase==='Fight'?melee:ranged))+'.';break;
    case '000008556003':case '000008556005':case '000008556002':targets=synapse;break;
    case '000008556006':targets=synapsePossible?tyr:[];break;
    case '000008556007':targets=synapsePossible?tyr.filter(movable):[];break;
    case '000009738004':targets=warriors.filter(ranged);break;
    case '000009738003':case '000009738002':targets=warriors;break;
    case '000010148007':targets=tyr;break;
    case '000010148004':targets=tyr.filter(f=>ranged(f)||melee(f));break;
    case '000010148005':case '000010148003':targets=tunnelPossible?tyr:[];break;
    case '000010148006':targets=monsters;break;
    case '000010148002':targets=tyr.filter(f=>named(f,'Mawloc','Trygon'));break;
    case '000010937004':targets=ambushers.filter(f=>!named(f,'Von Ryan’s Leapers'));break;
    case '000010937003':case '000010937002':targets=ambushers;break;
    case '000010941004':case '000010941002':targets=norns.filter(f=>named(f,'Norn Assimilator'));break;
    case '000010941003':targets=norns;break;
   }
   emit(strat.id,strat.name.toLowerCase().replace(/(^| )\p{L}/gu,c=>c.toUpperCase())+' · '+strat.cp+'CP',phase,actualTurn,strat.timing,body,actors??roots(targets),strat.id);
  }
 }
 for(const bearer of active){
  const upgrade=eligibleTyranidUpgrades(current,bearer.unit,bearer.id).find(u=>u.name===selected(bearer));
  if(!upgrade)continue;
  const f=forms.find(g=>g.members.some(s=>s.id===bearer.id));if(!f)continue;
  const title=bearer.id+' · '+upgrade.name;
  const add=(p:ReminderWindow,t:Turn,body:string,timing:Timing='during',units:readonly RosterInstance[]=[f.root],reference=source)=>emit(upgrade.id+'-'+bearer.id,title,p,t,timing,body,units,upgrade.id,reference);
  const personal:Form={root:bearer,members:[bearer]};
  const characterRoles=[...new Set(tyranidModelLoadouts(bearer).filter(m=>tag(bearer,'CHARACTER',m.model)).map(m=>m.model))];
  const owner=upgrade.repeatable?'This upgraded unit':'Only the surviving Character bearer'+(characterRoles.length?' ('+characterRoles.join(', ')+')':'');
  const guns=weapons(personal,'Shooting',upgrade.repeatable?undefined:'CHARACTER');
  const blades=weapons(personal,'Fight',upgrade.repeatable?undefined:'CHARACTER');
  const ownDefence=(body:string,units:readonly RosterInstance[]=[bearer])=>{for(const [p,t] of defence)add(p,t,body,p==='Movement'?'end':'during',units);};
  const ownSnap=(body:string,units:readonly RosterInstance[]=[bearer])=>{if(guns.length&&!kw(f,'TITANIC'))add('Movement','opponent','If the bearer uses Fire Overwatch: '+body,'end',units);};
  switch(upgrade.id){
   case '000008348002':case '000010147003':case '000008417005':{
    const recipients=upgrade.id==='000008417005'?vanguard:tyr;
    if(recipients.length)add('Pre-battle','either','After both players deploy, redeploy up to three '+(upgrade.id==='000008417005'?'Vanguard Invader':'Tyranids')+' formations. They can enter Strategic Reserves regardless of how many units are already there. Move the entire attached formation together. Eligible formations: '+names(recipients)+'.','during',[bearer,...roots(recipients)]);
    break;
   }
   case '000008348003':{
    const body=owner+' can re-roll one Hit, Wound, Damage, Advance, Charge or saving roll once per turn. This is one shared choice for that turn, not one re-roll of each type.';
    for(const p of ['Movement','Charge'] as const)add(p,'own',body,'during',[bearer]);
    if(guns.length)add('Shooting','own',body,'during',[bearer]);
    if(blades.length)add('Fight','either',body,'during',[bearer]);
    add('Shooting','opponent',body,'during',[bearer]);
    add('Movement','own','For a saving throw during enemy snap shooting: '+body,'end',[bearer]);
    ownSnap(owner+' can spend its once-per-turn re-roll on one Wound or Damage roll; snap shooting cannot re-roll Hit rolls.');
    break;
   }
   case '000008348004':for(const p of phases)add(p,'either','Friendly Tyranids formations within 9″ of the surviving Character bearer are within Synapse Range. Measure from that physical bearer, not other models in its attached formation; this does not give the recipients the Synapse keyword. Eligible formations: '+names(tyr)+'.','during',[bearer,...roots(tyr)]);break;
   case '000008348005':{
    const body=owner+' has Feel No Pain 5+. At the start of any turn, if it has lost any starting wounds, its Feel No Pain permanently improves to 4+ for the rest of the battle, even if later healed. Other models receive no benefit.';
    add('Command','either',body,'start',[bearer]);for(const p of phases)add(p,'either',body,'during',[bearer]);break;
   }
   case '000008404002':for(const p of phases)add(p,'either',owner+' gains +3 Objective Control; attached models do not gain this bonus.','during',[bearer]);break;
   case '000008404003':if(blades.length)add('Fight','either',owner+', if destroyed by a melee attack before fighting this phase, may fight on a 3+ after the attacking unit finishes its attacks, then is removed. This does not grant fight-on-death to Bodyguard models.','during',[bearer]);break;
   case '000008404004':ownDefence('Once per battle, when a Psychic attack is allocated to the Character bearer, give only that bearer Feel No Pain 5+ against Psychic attacks until phase end.');break;
   case '000008404005':if(blades.length)add('Fight','either',owner+' gains +1 to Wound for melee attacks targeting a Monster or Vehicle unit; Bodyguard attacks do not gain it.','during',[bearer]);break;
   case '000008408002':add('Movement','own','While the Character bearer survives, every model in its actual attached formation gains +2″ Move.','during',[f.root]);break;
   case '000008408003':{if(endless.length){
    const body='At the start of battle round 1, select up to three Endless Multitude formations within 9″ of the Character bearer. They have Benefit of Cover against ranged attacks until that battle round ends; this selected effect persists for its duration if the bearer later dies. Eligible formations: '+names(endless)+'.';
    add('Start of battle round','either',body,'start',[bearer,...roots(endless)]);
    for(const [p,t] of defence.filter(([p])=>p!=='Fight'))add(p,t,'Only if this formation was selected by Naturalised Camouflage at the start of battle round 1, it has Benefit of Cover against ranged attacks for the rest of that round. The effect expires after round 1.',p==='Movement'?'end':'during',roots(endless));
    }break;
   }
   case '000008408004':{
    const body='While the Character bearer survives, its formation’s attacks improve AP by 1 on Critical Wounds. This applies to all models in that actual formation.';
    if(ranged(f)){add('Shooting','own',body);if(!kw(f,'TITANIC'))add('Movement','opponent','If this formation uses Fire Overwatch: '+body+' Critical Wounds can still trigger during snap shooting.','end');}
    if(melee(f))add('Fight','either',body);break;
   }
   case '000008408005':if(melee(f))add('Fight','either','While the Character bearer survives, all models in its actual formation gain +3″ to Pile-in and Consolidation moves. Other movement and ending-position requirements still apply.');break;
   case '000008412002':{
    const ownRegeneration=harvesters.length>0||melee(f);
    if(ownRegeneration)for(const p of phases)add(p,'either','While the non-Monster Character bearer survives, its actual formation can Regenerate up to twice per phase instead of once. Each regeneration still needs an eligible Feed the Swarm or Stratagem trigger; this does not itself regenerate models.');
    break;
   }
   case '000008412003':{if(harvesters.length){
    const body='Only while the surviving Character bearer itself is within 6″ of a friendly Harvester formation, its actual formation has Fights First and its Heroic Intervention use costs 1CP less. Measure from the bearer, not a Bodyguard. Harvester sources: '+names(harvesters)+'.';
    add('Charge','opponent',body,'end');if(melee(f))add('Fight','either',body);}
    break;
   }
   case '000008412004':if(harvesters.length)add('Command','own','Only friendly Harvester models within 12″ of the surviving Character bearer extend their Feed the Swarm recipient range from 6″ to 9″. Other Harvester models keep the normal range. Harvester sources: '+names(harvesters)+'.','during',[bearer,...roots(harvesters)]);break;
   case '000008412005':if(melee(f)){
    let body='While the Character bearer survives, its formation’s melee weapons have +1 Strength.';
    if(harvesters.length)body+=' The first time this formation destroys an enemy in the Fight phase while that bearer is within 6″ of a friendly Harvester, it also earns +1 melee Attack until battle end. That earned Attack bonus persists if the bearer later dies; the ongoing Strength bonus does not. Harvester sources: '+names(harvesters)+'.';
    else if(originalHarvester)body+=' If this formation previously earned its +1 melee Attack bonus by destroying an enemy while the bearer was within 6″ of a Harvester, that bonus remains until battle end despite the Harvester’s destruction.';
    add('Fight','either',body);
   }break;
   case '000008417002':for(const p of phases)add(p,'either','While the Character bearer is on the battlefield, each enemy unit arriving from Reserves must take a Battle-shock test on a 2+. This also applies to a repositioned enemy when it is set up again, even if its rule does not explicitly place it in Reserves.','during',[bearer]);break;
   case '000008417003':add('Shooting','either','While the Character bearer survives, its actual formation has Stealth: ranged attacks targeting that formation suffer −1 to Hit. Stealth does not change the fixed Hit requirement of snap shooting.','during',[f.root]);break;
   case '000008417004':{
    const body=owner+' gains +1 to Hit and +1 to Wound for attacks against the one enemy unit chosen at the start of the battle. Other models in the formation do not gain these bonuses.';
    add('Pre-battle','either','At the start of the battle, choose one enemy unit for Stalker. '+body,'during',[bearer]);
    if(guns.length)add('Shooting','own',body,'during',[bearer]);if(blades.length)add('Fight','either',body,'during',[bearer]);
    ownSnap(owner+' retains +1 to Wound against the chosen enemy; snap shooting ignores its +1 Hit modifier.');break;
   }
   case '000008421002':{
    const psychicGuns=guns.filter(w=>w.abilities.includes('psychic')),psychicBlades=blades.filter(w=>w.abilities.includes('psychic'));
    const body=owner+' improves Strength and AP by 1 only for its Psychic weapons. Non-Psychic weapons and Bodyguard weapons receive no bonus.';
    if(psychicGuns.length){add('Shooting','own',body,'during',[bearer]);ownSnap(body);}if(psychicBlades.length)add('Fight','either',body,'during',[bearer]);break;
   }
   case '000008421003':add('Movement','either','Enemy units arriving from Reserves cannot be set up within 12″ of the surviving Character bearer. Once per battle in round 1 or 2, when the opponent declares a Strategic Reserves arrival, roll one D6; on 4+ that unit cannot arrive this turn. This prohibition overrides a required arrival, and does not force arrival in the following phase. Measure from the actual bearer, not other models.','during',[bearer]);break;
   case '000008421004':ownDefence(owner+' reduces Damage of attacks allocated to that model by 1, to the normal minimum of 1. Other models in its formation do not gain this reduction.');break;
   case '000008421005':for(const p of phases)add(p,'either','Enemy units within 9″ of the surviving Character bearer worsen Leadership by 1. Measure from that physical bearer, not other models in its formation.','during',[bearer]);break;
   case '000009737002':if(blades.length)add('Fight','either',owner+' re-rolls melee Wound rolls and improves melee AP by 1. Bodyguard models receive neither benefit.','during',[bearer],pack);break;
   case '000009737003':if(melee(f))add('Fight','either','While the Prime survives, every model in its actual formation gains +1 to Hit for melee attacks. This unit-level benefit also works for an unattached Prime.','during',[f.root],pack);break;
   case '000010147002':add('Movement','opponent','Once per battle while the Character bearer survives, use Rapid Ingress on its actual formation for 0CP, even if another unit already used that Stratagem this phase. Other arrival restrictions still apply.','end',[f.root],pack);break;
   case '000010147004':{
    const allDeep=f.members.every(s=>tyranidHasDeepStrike(current,s));
    add('Pre-battle','either','The Character bearer has Deep Strike. Its formation can use Vanguard Intellect only if every model in that formation has Deep Strike; it does not grant that ability to attached models.','during',[f.root],pack);
    if(allDeep)add('Movement','own','This entire formation can use Deep Strike in the Reinforcements step of your first, second or third Movement phase regardless of mission arrival restrictions. This is an own-phase permission and does not enable first-round Rapid Ingress.','during',[f.root],pack);break;
   }
   case '000010147005':{
    add('Pre-battle','either','This selected Character Trygon gains Synapse. Only that model’s melee weapons gain +1 Strength and improve Weapon Skill by 1; the Character promotion remains a separate muster choice.','during',[bearer],pack);
    if(blades.length)add('Fight','either','Only this Trygon Prime improves its melee weapons’ Strength and Weapon Skill by 1. Its Synapse keyword also makes it an actual Synapse source.','during',[bearer],pack);break;
   }
   case '000010936002':add('Movement','opponent','When an enemy ends any move within 8″ of this upgraded Lictor, Neurolictor or Von Ryan’s Leapers formation, it can make a Normal move of up to D3+3″ if otherwise eligible. This is a Normal move, not a surge.','during',[f.root],pack);break;
   case '000010936003':for(const [p,t] of defence.filter(([p])=>p!=='Fight'))add(p,t,'This upgraded Von Ryan’s Leapers formation has −3″ detection range.',p==='Movement'?'end':'during',[f.root],pack);break;
   case '000010940002':{
    const body='This upgraded Norn Emissary’s ranged attacks have Anti-Character 2+: an unmodified Wound roll of 2+ against a Character unit is a Critical Wound.';
    if(guns.length){add('Shooting','own',body,'during',[f.root],pack);ownSnap(body,[f.root]);}break;
   }
   case '000010940003':ownDefence('This upgraded Norn Assimilator has a 4+ invulnerable save.',[f.root]);break;
  }
 }
 // A selected lasting effect can remain after its source dies. These cues do
 // not assert that the untracked choice/kill happened; they preserve its condition.
 const originalForms=tyranidFormations(army,expandRoster(army));
 for(const former of expandRoster(army).filter(s=>!active.some(a=>a.id===s.id))){
  const upgrade=eligibleTyranidUpgrades(army,former.unit,former.id).find(u=>u.name===(army.upgrades2026?.[former.id]??army.upgrades2026?.[former.unit]??former.enhancement));
  if(upgrade?.name==='Naturalised Camouflage'&&endless.length)for(const [p,t] of defence.filter(([p])=>p!=='Fight'))emit(upgrade.id+'-lasting-'+former.id,former.id+' · Naturalised Camouflage',p,t,p==='Movement'?'end':'during','If selected by this bearer at the start of battle round 1, these Endless Multitude formations retain Benefit of Cover against ranged attacks until that round ends even though the bearer has been destroyed.',roots(endless),upgrade.id);
  if(upgrade?.name==='Parasitic Biomorphology'&&originalHarvester){
   const original=originalForms.find(f=>f.members.some(m=>m.id===former.id));
   const survivors=original?tyr.filter(f=>f.members.some(m=>original.members.some(o=>o.id===m.id))):[];
   card(upgrade.id+'-lasting-'+former.id,former.id+' · Parasitic Biomorphology','Fight','either','during','If this formation earned the permanent +1 melee Attack bonus by destroying an enemy while its bearer was within 6″ of a Harvester, it retains that Attack bonus until battle end after the bearer dies. The ongoing +1 Strength benefit has ended.',survivors.filter(melee),upgrade.id);
  }
 }
 return rows;
}
