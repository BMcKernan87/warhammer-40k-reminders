import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {SORORITAS_REVISION} from './sororitas-data.generated';
import {SORORITAS_ARMY_SHEETS,sororitasAgentName,sororitasKeywords,sororitasMusterUnits} from './sororitas-army-data';
import {sororitasCargoFormations,sororitasFormations,sororitasSplitCargoFormations} from './sororitas-transports';
import {sororitasWeaponCount} from './sororitas-loadouts';
import {SORORITAS_CARDS} from './sororitas-card-profiles.generated';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightWeaponCount} from './knight-loadouts';
import {eligibleSororitasUpgrades} from './sororitas-detachment-data';
import {SORORITAS_RANDOM_SHOTS,SORORITAS_STRATAGEMS} from './sororitas-detachments.generated';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Attack='Shooting'|'Fight';
const source='https://wahapedia.ru/wh40k11ed/factions/adepta-sororitas/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const agents=new Map<string,typeof ASSIGNED_AGENT_DATA[number]>(ASSIGNED_AGENT_DATA.map(a=>[a.sheet.unit,a]));
const sheets=new Map(SORORITAS_ARMY_SHEETS.map(s=>[s.unit,s]));
const righteousModels=new Set(['Battle Sisters Squad','Celestian Insidiants','Celestian Sacresants','Paragon Warsuits']);
const updatedStrats=new Set(['000009038003','000009038005','000009034002','000009034007','000009034005','000009034004','000008469003','000008469002','000009030007']);
const effects:Record<typeof SORORITAS_STRATAGEMS[number]['id'],string>={
 '000009038002':'Just after the formation suffers a mortal wound, its models gain Feel No Pain 5+ against mortal wounds through phase end.',
 '000009038003':'Bless this formation until turn end. It may ignore any or all modifiers to its models’ profile characteristics, its weapons’ Ballistic Skill or Weapon Skill, and rolls or tests made for it. Modifiers to saving throws are excluded.',
 '000009038006':'Before this formation shoots or fights, improve its attacks’ Armour Penetration by 1 through phase end. If those attacks destroy one or more enemy models, gain one Miracle die.',
 '000009038004':'Before this formation fights, its melee weapons gain Lance through phase end. If its attacks destroy one or more enemy models this phase, gain one Miracle die.',
 '000009038007':'At the end of the opponent’s Fight phase, place this Jump Pack formation in Strategic Reserves if it is outside Engagement Range.',
 '000009038005':'After enemy target selection, attacks targeting this Infantry formation suffer −1 to Hit through phase end.',
 '000009034005':'Before this formation shoots, its equipped Torrent weapons gain Devastating Wounds through phase end.',
 '000009034002':'After an enemy selects this formation as a target, worsen the Armour Penetration of attacks targeting it by 1, only until that attacker finishes its attacks.',
 '000009034003':'Before this formation fights, its melee weapons gain Lethal Hits through phase end. If those attacks destroy one or more enemy models, select one destroyed model’s unit to take a Battle-shock test.',
 '000009034006':'Before a formation that disembarked this turn shoots, give its ranged attacks +1 to Wound against enemies within 6″ that are also within range of an objective marker, through phase end. If those attacks kill enemy models, select one destroyed model’s unit to take a Battle-shock test.',
 '000009034007':'After an enemy finishes shooting at this Transport, one unit actually embarked in it can disembark, then shoot only that enemy, if it is an eligible target. This is normal shooting, not snap shooting.',
 '000009034004':'Just before this Transport Advances, allow it to re-roll Advance rolls until turn end. Units may disembark after it Advances; those units make a shock disembark move (Core Rules 18.07).',
 '000009832005':'Before this formation fights, allow its models to Pile In and Consolidate up to 6″ until turn end. If Righteous, they need not finish closer to the closest enemy model, but must end as close as possible to the closest enemy unit.',
 '000009832006':'After an enemy selects this Sacresant formation as a melee target, attacks targeting it suffer −1 to Hit through phase end.',
 '000009832004':'Before this formation fights, add 1 to its melee weapons’ Strength until turn end. If it is Righteous, also improve those weapons’ Armour Penetration by 1 until phase end.',
 '000009832002':'Just after this formation is allocated a mortal wound, its models gain Feel No Pain 6+ against mortal wounds through phase end, improved to 5+ if it is Righteous.',
 '000009832007':'Just after this formation Falls Back, it can still shoot this turn. If it is Righteous, it can both shoot and declare a charge this turn.',
 '000009832003':'Before this Righteous formation shoots or fights, choose Lethal Hits or Sustained Hits 1 for its weapons through phase end.',
 '000010861004':'After a friendly Exorcist shoots, select one non-Monster, non-Vehicle enemy it hit. This Infantry Fly formation’s ranged attacks against that enemy gain Devastating Wounds through phase end.',
 '000010861003':'When this Exorcist is selected to shoot, select an enemy visible to and within 9″ of a friendly Adepta Sororitas Infantry Fly formation. This Exorcist’s ranged attacks against that enemy gain +1 to Hit through phase end.',
 '000010861002':'At the start of either Command phase, select a friendly Battle-shocked Adepta Sororitas formation within 6″ of this Infantry Fly formation or Exorcist. The selected formation is no longer Battle-shocked.',
 '000008469004':'Before this formation fights, allow it to re-roll melee Hit rolls through phase end. If it is Below Half-strength, it can also re-roll those Wound rolls.',
 '000008469002':'Target a just-destroyed Adepta Sororitas Character model, except Saint Celestine, at most once per battle for that model. You may discard 1–3 Miracle dice. At phase end, return the model unengaged and as close as possible to where it died, with D3 wounds plus one per discarded die, capped at its starting wounds. It returns as a separate unit with Starting Strength 1.',
 '000008469005':'When the selected Adepta Sororitas Vehicle model is destroyed, its Deadly Demise automatically causes mortal wounds; do not roll the D6 to trigger it.',
 '000008469003':'At the start of the Fight phase, choose this Infantry or Walker formation. Through phase end, each enemy model within Engagement Range of it must target this formation when selecting its attacks’ targets.',
 '000008469007':'After an enemy finishes shooting, if this formation lost one or more models to those attacks and has surviving models able to shoot, it may shoot only that enemy, if it is an eligible target. This is normal shooting, not snap shooting.',
 '000008469006':'After an enemy selects this formation as a melee target, until phase end each of its destroyed models that has not fought this phase fights after the attacker finishes, then is removed. No roll is needed.',
 '000009030004':'Before this Penitent formation fights, its PENITENT models’ melee attacks score Critical Hits on successful unmodified Hit rolls of 5+ through phase end. Other models do not gain this benefit.',
 '000009030003':'After an enemy selects this Penitent formation as a target, only its PENITENT models gain Feel No Pain 4+ through phase end.',
 '000009030005':'Just before this Penitent formation Advances, allow it to declare a charge after Advancing this turn.',
 '000009030002':'When this entire Penitent formation is destroyed while within range of an objective you control, that objective stays yours until the enemy has a greater Level of Control over it at the end of a phase.',
 '000009030006':'Just after this formation Falls Back, choose whether it may shoot or declare a charge this turn. A Penitent formation may both shoot and charge instead.',
 '000009030007':'After an enemy finishes shooting at this Penitent formation, it may make a Surge move up to D6″.',
 '000010865003':'When this Sacresant formation suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds through phase end.',
 '000010865004':'When this Sacresant formation is selected to Advance or Fall Back, that move does not prevent it from shooting or declaring a charge. Its ranged weapons gain Assault until turn end.',
 '000010865002':'When this Sacresant formation is selected to fight, its melee attacks gain 1 Attack and 1 Strength through phase end.',
};

export function sororitasDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adepta Sororitas')return [];
 const has=(det:string)=>army.detachments2026?.includes(det);
 const allowed=new Set(sororitasMusterUnits(army)),active=roster.filter(s=>allowed.has(s.unit));
 const forms=sororitasFormations(army,active);
 type Form=typeof forms[number];
 const tag=(s:RosterInstance,k:string)=>sororitasKeywords(army,s).has(k);
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const weapons=(f:Form,phase:Attack,nativeOnly=false)=>f.members.flatMap(s=>{
  if(nativeOnly&&!tag(s,'ADEPTA SORORITAS'))return [];
  const card=SORORITAS_CARDS[s.unit];
  if(card)return card.weapons.filter(w=>w.phase===phase&&sororitasWeaponCount(s,w.name)>0).map(w=>({s,name:w.name,abilities:w.abilities}));
  const alias=sororitasAgentName(s.unit),agent=alias&&agents.get(alias);
  return agent?agent.weapons.filter(w=>(w.type==='Ranged'?'Shooting':'Fight')===phase&&knightWeaponCount({...s,unit:alias},w.name)>0).map(w=>({s,name:w.name,abilities:w.abilities.split(', ')})):[];
 });
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0;
 const hitRoll=(f:Form,nativeOnly=false)=>weapons(f,'Shooting',nativeOnly).some(w=>!w.abilities.includes('torrent'));
 const torrent=(f:Form)=>weapons(f,'Shooting').some(w=>w.abilities.includes('torrent'));
 const size=(f:Form)=>f.members.reduce((n,s)=>n+(s.models??sheets.get(s.unit)?.sizes[0]??1),0);
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const memberNames=(fs:readonly Form[],predicate:(s:RosterInstance)=>boolean)=>fs.flatMap(f=>f.members.filter(predicate).map(s=>s.id)).join(', ');
 const sisters=forms.filter(f=>kw(f,'ADEPTA SORORITAS'));
 const infantry=sisters.filter(f=>kw(f,'INFANTRY')),jump=sisters.filter(f=>kw(f,'JUMP PACK'));
 const flyers=infantry.filter(f=>kw(f,'FLY')),penitent=sisters.filter(f=>kw(f,'PENITENT'));
 const sacresants=sisters.filter(f=>kw(f,'CELESTIAN SACRESANTS')),exorcists=sisters.filter(f=>f.members.some(s=>s.unit==='Exorcist'));
 const transports=sisters.filter(f=>kw(f,'TRANSPORT'));
 const cargo=(f:Form)=>sororitasCargoFormations(army,f.root,active);
 const splitCargo=(f:Form)=>sororitasSplitCargoFormations(army,f.root,active);
 const carriers=(f:Form)=>transports.filter(t=>cargo(t).some(g=>g.root.id===f.root.id));
 const splitCarriers=(f:Form)=>transports.filter(t=>splitCargo(t).some(g=>g.root.id===f.root.id));
 const praise=sisters.filter(f=>size(f)>1&&ranged(f));
 const ire=sisters.filter(f=>ranged(f)&&(carriers(f).length>0||splitCarriers(f).length>0));
 const reactions=sisters.filter(f=>has('Hallowed Martyrs')&&praise.includes(f)||has('Bringers of Flame')&&ire.includes(f));
 const reaction=(f:Form)=>has('Hallowed Martyrs')&&praise.includes(f)?'If surviving models shoot using Praise the Fallen after this formation lost models to the attacker’s shooting, ':!carriers(f).length?'If a half of this formation was allocated to an Immolator, only models and equipment actually in that embarked half may disembark and shoot using Blazing Ire; for those models, ':'If this formation disembarks and shoots the attacking enemy using Blazing Ire, ';
 const selected=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 const rows:GeneratedReminder[]=[];
 const emit=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],sourceRuleId?:string,reference=source)=>{
  if(units.length)rows.push({id:'11e-sororitas-det-'+key+'-'+window+'-'+turn,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source:reference,sourceRuleId,origin:'detachment'});
 };
 const card=(key:string,title:string,p:ReminderWindow,turn:Turn,timing:Timing,body:string,fs:readonly Form[],reference=source)=>emit(key,title,p,turn,timing,body,roots(fs),undefined,reference);
 if(has('Hallowed Martyrs')){
  for(const p of ['Shooting','Fight'] as const)card('martyrs','The Blood of Martyrs',p,p==='Fight'?'either':'own','during','Only Adepta Sororitas models gain +1 to Hit for attacks that require a Hit roll while their formation is below Starting Strength, and also +1 to Wound while it is Below Half-strength. Attached models without the faction keyword do not receive these bonuses.',sisters.filter(f=>p==='Fight'||weapons(f,p,true).length>0));
  card('martyrs-snap','The Blood of Martyrs · snap shooting','Movement','opponent','end','If this formation uses Fire Overwatch while Below Half-strength, its Adepta Sororitas models gain +1 to Wound. Snap shooting ignores Hit modifiers and cannot score Critical Hits.',sisters.filter(f=>weapons(f,'Shooting',true).length>0&&!kw(f,'TITANIC')));
  for(const f of praise)card('martyrs-reaction-'+f.root.id,'The Blood of Martyrs · reaction shooting','Shooting','opponent','during',reaction(f)+'the surviving Adepta Sororitas models gain +1 to Hit while the formation is below Starting Strength, and also +1 to Wound while Below Half-strength.',[f]);
 }
 if(has('Penitent Host')){
  const modelNames=memberNames(penitent,s=>tag(s,'PENITENT'));
  card('vow','Desperate for Redemption','Command','own','start','Choose one unused Vow of Atonement, active until your next Command phase starts; each Vow may be chosen once per battle. Path of the Penitent: PENITENT models gain +3″ Move. Absolution in Battle: when a formation that charged this turn is selected to fight, its PENITENT models’ melee weapons gain +1 Attack and +1 Strength through phase end. Death Before Disgrace: each PENITENT model destroyed by a melee attack before fighting can fight after the attacker on a D6 roll of 2+, then is removed. PENITENT models in this roster: '+modelNames+'.',penitent,SORORITAS_REVISION.pack);
  card('vow-move','The Path of the Penitent','Movement','own','during','While this Vow is active, only PENITENT models gain +3″ Move: '+modelNames+'.',penitent);
  card('vow-fight','Vows of Atonement · fighting','Fight','either','during','If Absolution in Battle is active, when a formation that charged this turn fights, only its PENITENT models’ melee weapons gain +1 Attack and +1 Strength through phase end. If Death Before Disgrace is active, a PENITENT model destroyed by a melee attack before fighting rolls a D6; on 2+ it fights after the attacker, then is removed. Eligible models: '+modelNames+'.',penitent);
 }
 if(has('Bringers of Flame')){
  const nativeRanged=sisters.filter(f=>weapons(f,'Shooting',true).length>0);
  for(const p of ['Movement','Shooting'] as const)card('fervent','Fervent Purgation',p,'own','during','Adepta Sororitas models’ equipped ranged weapons have Assault. Their ranged attacks against an enemy within 6″ gain +1 Strength. Attached models without the faction keyword do not receive these benefits.',nativeRanged,SORORITAS_REVISION.pack);
  card('fervent-snap','Fervent Purgation · snap shooting','Movement','opponent','end','If this formation uses Fire Overwatch, its Adepta Sororitas models’ ranged attacks against enemies within 6″ retain +1 Strength.',nativeRanged.filter(f=>!kw(f,'TITANIC')),SORORITAS_REVISION.pack);
  for(const f of ire.filter(f=>nativeRanged.includes(f)))card('fervent-reaction-'+f.root.id,'Fervent Purgation · reaction shooting','Shooting','opponent','during',reaction(f)+'its Adepta Sororitas models’ ranged attacks against that enemy gain +1 Strength while within 6″.',[f],SORORITAS_REVISION.pack);
 }
 if(has('Champions of Faith')){
  card('righteous-pick','Righteous Purpose','Command','own','during','Select up to three Adepta Sororitas formations, including embarked formations, to be Righteous until your next Command phase starts. Their models gain +1″ Move and improve Leadership by 1. Only Battle Sisters Squad, Celestian Insidiants, Celestian Sacresants and Paragon Warsuits models improve their weapons’ Ballistic Skill and Weapon Skill by 1.',sisters,SORORITAS_REVISION.pack);
  card('righteous-move','Righteous Purpose · movement','Movement','own','during','While this formation is Righteous, all its models gain +1″ Move and improve Leadership by 1, until your next Command phase starts.',sisters,SORORITAS_REVISION.pack);
  for(const p of ['Shooting','Fight'] as const){
   const fs=sisters.filter(f=>f.members.some(s=>righteousModels.has(s.unit))&&(p==='Fight'||weapons(f,p).some(w=>righteousModels.has(w.s.unit)&&!w.abilities.includes('torrent'))));
   card('righteous-attacks','Righteous Purpose · attacks',p,p==='Fight'?'either':'own','during','While the formation is Righteous, improve the '+(p==='Fight'?'Weapon Skill':'Ballistic Skill')+' of only these models’ equipped weapons by 1: '+memberNames(fs,s=>righteousModels.has(s.unit))+'. Attached Characters’ weapons do not gain this skill bonus.',fs,SORORITAS_REVISION.pack);
  }
  for(const p of phases)card('righteous-oc','Righteous Purpose · Sacresant control',p,'either','during','While this formation is not Battle-shocked, only its Celestian Sacresants models gain +1 Objective Control. This benefit does not require the formation to be Righteous.',sacresants,SORORITAS_REVISION.pack);
 }
 if(has('Chorus of Condemnation'))card('condemn','Angelic Judgement','Shooting','own','during','Each Infantry Fly formation can select one visible enemy within 12″ to condemn; that enemy has +3″ detection range until this Shooting phase ends.',flyers,SORORITAS_REVISION.pack);
 if(has('Sacred Champions')){
  const celestians=sisters.filter(f=>kw(f,'CELESTIAN'));
  for(const p of ['Shooting','Fight'] as const)card('quest','Holy Quest',p,p==='Fight'?'either':'own','during','This Celestian formation’s attacks improve '+(p==='Fight'?'Weapon Skill':'Ballistic Skill')+' by 1, including attacks made by attached models.',celestians.filter(f=>p==='Fight'||hitRoll(f)),SORORITAS_REVISION.pack);
  for(const f of reactions.filter(f=>celestians.includes(f)&&hitRoll(f)))card('quest-reaction-'+f.root.id,'Holy Quest · reaction shooting','Shooting','opponent','during',reaction(f)+'this Celestian formation’s attacks improve Ballistic Skill by 1, including attacks made by attached models.',[f],SORORITAS_REVISION.pack);
 }
 if(has('Sanctified Orators'))for(const p of phases)card('hymns','Hymns of Battle',p,'either','during','Improve Leadership by 1 for all models in this Adepta Sororitas Character formation, including its Bodyguards.',sisters.filter(f=>kw(f,'CHARACTER')),SORORITAS_REVISION.pack);
 for(const strat of SORORITAS_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=sisters,body=effects[strat.id],actors:RosterInstance[]|undefined;
   switch(strat.id){
    case '000009038002':if(jump.length)body+=' Alternatively, target a friendly Jump Pack formation within 3″ of the wounded formation; it and friendly Adepta Sororitas formations within 3″ gain this protection through phase end. Jump Pack sources: '+names(jump)+'.';break;
    case '000009038003':if(jump.length)body+=' If you target a Jump Pack formation ('+names(jump)+'), friendly Adepta Sororitas formations within 3″ are also blessed until turn end.';break;
    case '000009038007':targets=jump;break;
    case '000009038005':targets=infantry;if(jump.length)body+=' Alternatively, target a friendly Jump Pack formation within 3″ of the attacked Infantry formation; it and friendly Adepta Sororitas Infantry formations within 3″ gain this protection. Jump Pack sources: '+names(jump)+'.';break;
    case '000009034005':targets=sisters.filter(torrent);break;
    case '000009034006':targets=ire;if(targets.some(f=>splitCarriers(f).length))body+=' For an Immolator split, only models and equipment assigned to the half that actually disembarked can use this effect.';break;
    case '000009034007':targets=transports.filter(f=>cargo(f).some(ranged)||splitCargo(f).some(ranged));{
     const whole=targets.filter(f=>cargo(f).some(ranged)),split=targets.filter(f=>splitCargo(f).some(ranged));
     if(whole.length)body+=' Whole formations that fit: '+whole.map(f=>f.root.id+' → '+names(cargo(f).filter(ranged))).join('; ')+'.';
     if(split.length)body+=' Optional split passengers: '+split.map(f=>f.root.id+' → '+names(splitCargo(f).filter(ranged))).join('; ')+'. Only physical models and equipment allocated to the embarked half can disembark and shoot, and only against the eligible attacker.';
    }break;
    case '000009034004':targets=transports.filter(f=>cargo(f).length>0||splitCargo(f).length>0);if(targets.some(f=>splitCargo(f).length))body+=' For a split squad, only its actually embarked half can make this shock disembark move.';break;
    case '000009832006':targets=sacresants;
     if(sacresants.length>1)body+=' If the targeted formation is Righteous, select one other non-Battle-shocked Sacresant formation within 6″ to gain the same protection.';break;
    case '000009832003':if(phase==='Shooting')targets=sisters.filter(f=>hitRoll(f));break;
    case '000010861004':targets=exorcists.some(ranged)?flyers.filter(ranged):[];if(targets.length)body+=' Exorcists in this roster: '+names(exorcists.filter(ranged))+'.';break;
    case '000010861003':targets=flyers.length?exorcists.filter(f=>hitRoll(f)):[];if(targets.length)body+=' Infantry Fly sources: '+names(flyers)+'.';break;
    case '000010861002':targets=[...new Set([...flyers,...exorcists])].filter(f=>sisters.some(other=>other!==f));body+=' The Stratagem target must itself be eligible for Stratagems; it cannot be the Battle-shocked recipient.';break;
    case '000008469002':actors=active.filter(s=>tag(s,'ADEPTA SORORITAS')&&tag(s,'CHARACTER')&&s.unit!=='Saint Celestine');break;
    case '000008469005':actors=active.filter(s=>tag(s,'ADEPTA SORORITAS')&&tag(s,'VEHICLE')&&SORORITAS_CARDS[s.unit]?.demise);break;
    case '000008469003':targets=sisters.filter(f=>kw(f,'INFANTRY')||kw(f,'WALKER'));break;
    case '000008469007':targets=praise;break;
    case '000009030004':case '000009030003':case '000009030002':case '000009030007':targets=penitent;break;
    case '000009030005':targets=penitent;{
     const engines=penitent.filter(f=>kw(f,'PENITENT ENGINES'));
     if(engines.length)body+=' Penitent Engines ('+names(engines)+') use +6″ Move for this phase instead of making an Advance roll.';
    }break;
    case '000010865003':case '000010865004':case '000010865002':targets=sacresants;break;
   }
   if(phase==='Shooting'&&turn==='own')targets=targets.filter(ranged);
   const title=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,c=>c.toUpperCase());
   emit('strat-'+strat.id,title+' · '+strat.cp+'CP',phase,turn,strat.timing,body,actors??roots(targets),strat.id,updatedStrats.has(strat.id)||['Champions of Faith','Chorus of Condemnation','Sacred Champions'].includes(strat.detachment)?SORORITAS_REVISION.pack:source);
  }
 }
 for(const bearer of active){
  const pick=selected(bearer),up=pick&&eligibleSororitasUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===pick);
  if(!up)continue;
  const f=forms.find(f=>f.members.some(s=>s.id===bearer.id));if(!f)continue;
  const unit=[f.root],own=[bearer],leading=f.members.length>1&&bearer.id!==f.root.id;
  const cue=(p:ReminderWindow,turn:Turn,when:Timing,body:string,units:readonly RosterInstance[]=own)=>emit(up.id+'-'+bearer.id,bearer.id+' · '+up.name,p,turn,when,body,units,up.id,['Champions of Faith','Chorus of Condemnation','Sacred Champions','Sanctified Orators'].includes(up.detachment)||up.name==='Catechism of Divine Penitence'?SORORITAS_REVISION.pack:source);
  switch(up.id){
   case '000008470002':for(const p of phases)cue(p,'either','during','When the bearer model is destroyed, gain an additional D3 Miracle dice.'+(active.some(s=>s.unit==='Imagifier')?' If the bearer was within 12″ of a friendly Imagifier, its Litany of Deeds can re-roll these additional dice before they enter the pool.':''));break;
   case '000009033002':cue('Fight','either','during','When the bearer is selected to fight, you may discard up to three Miracle dice. For each discarded die, the bearer model’s own melee weapons gain +1 Attack and +1 Strength through phase end.');break;
   case '000009831002':for(const p of ['Shooting','Fight'] as const)if(p==='Fight'||hitRoll(f))cue(p,p==='Fight'?'either':'own','during','Each attack made by the bearer’s formation can ignore any or all Ballistic Skill, Weapon Skill and Hit-roll modifiers.',unit);break;
   // Core 01.02.02 supplies phase-end expiry when a granted effect has no
   // explicit duration; the selected hymn does not persist into later phases.
   case '000010868002':for(const p of phases)cue(p,'either','start','Once per turn for this formation, select one hymn at the start of a phase. The selected hymn lasts until phase end: Rite of Revelation gives enemies +6″ detection range while the formation shoots; Sermon of Intolerance automatically passes its Battle-shock rolls; Catechism of Raging Fervour gives +1″ Move; Psalm of Righteous Smiting gives its attacks +1 Strength; or Chorus of Repudiation gives incoming attacks −1 to Wound when their Strength exceeds the formation’s Toughness.',unit);break;
   case '000009029002':if(penitent.length)for(const p of phases)cue(p,'either','during','While the bearer is on the battlefield, each enemy unit destroyed by a Penitent formation lets you discard one Miracle die and gain one showing 6. Penitent formations: '+names(penitent)+'.');break;
   case '000010864002':for(const p of phases)cue(p,'either','during','All models in this Sacresant formation gain +1 Objective Control, including attached models.',unit);break;
   case '000009037002':cue('Command','own','start','If the bearer is on the battlefield, take a Leadership test for it. Passing gains one Miracle die.');break;
   case '000010860002':cue('Fight','opponent','end','If the bearer’s formation is outside Engagement Range, you may place it in Strategic Reserves.',unit);break;
   case '000010860003':{
    const guns=(SORORITAS_RANDOM_SHOTS[bearer.unit]??[]).filter(w=>sororitasWeaponCount(bearer,w)>0);
    if(guns.length)for(const snap of [false,true])cue(snap?'Movement':'Shooting',snap?'opponent':'own',snap?'end':'during',(snap?'If this Exorcist uses Fire Overwatch, it can still re-roll':'Re-roll')+' rolls determining the number of attacks for its fitted variable-attack weapons: '+guns.join(', ')+'.');break;
   }
   case '000009037003':cue('Fight','either','during','The bearer model’s own melee weapons gain +1 Strength, improve Armour Penetration by 1 and gain Precision. Each time the bearer fights and destroys one or more enemy models, gain one Miracle die.');break;
   case '000009033003':cue('Command','own','start','You may discard up to two Miracle dice, then gain one Miracle die showing the sum of the discarded values, to a maximum of 6.');break;
   case '000008470003':cue('Fight','either','during','The bearer model’s own melee weapons gain +1 Attack, +1 Strength and +1 Damage. If the bearer has lost any wounds, each bonus is +2 instead.');break;
   case '000009029003':cue('Start of battle round','either','start','Once per battle, select one Vow of Atonement for the bearer’s formation until the next battle round starts, even a Vow already used this battle. It applies in addition to the army’s active Vow, and remains active if the bearer dies.',unit);break;
   case '000010864003':cue('Movement','own','during','All models in the bearer’s formation gain +1″ Move.',unit);break;
   case '000009831003':cue('Fight','either','during','The bearer model’s own melee weapons gain +1 Attack. While its formation is Righteous, they instead gain +2 Attacks and +1 Damage.');break;
   case '000009037004':cue('Movement','own','during','Select one enemy within 12″ of the bearer to take a Battle-shock test. If it fails, gain one Miracle die.');break;
   case '000009831004':{
    const self={root:bearer,members:[bearer]},kill='Each time the bearer’s formation destroys an enemy Character model, gain 1CP.';
    for(const p of ['Shooting','Fight'] as const)if(p==='Fight'||ranged(f))cue(p,p==='Fight'?'either':'own','during',(weapons(self,p).length?'Only the bearer model’s own equipped '+(p==='Shooting'?'ranged':'melee')+' weapons have Precision. ':'')+kill,unit);
    if(ranged(f))cue('Movement','opponent','end','During this formation’s Fire Overwatch shots: '+(weapons(self,'Shooting').length?'only the bearer model’s own equipped ranged weapons retain Precision. ':'')+kill,unit);
    if(reactions.includes(f))cue('Shooting','opponent','during',reaction(f)+'retain Eyes of the Oracle only if the bearer is still in the shooting unit. '+(weapons(self,'Shooting').length?'Only the bearer model’s own equipped ranged weapons have Precision. ':'')+kill,unit);
    break;
   }
   case '000008470004':cue('Command','own','end','If the bearer is on the battlefield, re-roll one Miracle die in your pool and keep the new value. If its formation is below Starting Strength, you may re-roll up to three pool dice instead.');break;
   case '000009033004':if(leading){
    const flames=weapons(f,'Shooting').filter(w=>w.abilities.includes('torrent')),others=weapons(f,'Shooting').filter(w=>!w.abilities.includes('torrent'));
    const body=(flames.length?'The formation’s fitted Torrent weapons gain +1 Attack: '+flames.map(w=>w.s.id+' · '+w.name).join(', ')+'. ':'')+(others.length?'Its other equipped ranged weapons gain Sustained Hits 1.':'');
    if(body){cue('Shooting','own','during','While the bearer leads this formation, '+body,unit);if(reactions.includes(f))cue('Shooting','opponent','during',reaction(f)+'while the bearer is still present and leading the shooting unit, its actual Torrent weapons gain +1 Attack and its other actual ranged weapons gain Sustained Hits 1.',unit);}
    if(flames.length)cue('Movement','opponent','end','If this formation uses Fire Overwatch while the bearer leads it, its fitted Torrent weapons gain +1 Attack: '+flames.map(w=>w.s.id+' · '+w.name).join(', ')+'. Other weapons cannot trigger Sustained Hits during snap shooting.',unit);
   }break;
   case '000009029004':if(leading){cue('Shooting','opponent','during','While the bearer leads this formation, all its models have a 5+ invulnerable save.',unit);cue('Movement','own','end','If the enemy uses Fire Overwatch, all models in this formation retain their 5+ invulnerable save while the bearer leads it.',unit);cue('Fight','either','during','While the bearer leads this formation, all its models have a 5+ invulnerable save.',unit);}break;
   case '000008470005':cue('Shooting','opponent','during','When an attack is allocated to the bearer model, change that attack’s Damage to 1. Other models receive no protection from this enhancement.');cue('Movement','own','end','If enemy Fire Overwatch attacks are allocated to the bearer model, change their Damage to 1.');cue('Fight','either','during','When an attack is allocated to the bearer model, change that attack’s Damage to 1.');break;
   case '000009029005':cue('Pre-battle','either','during','Only the bearer model gains the PENITENT keyword. Its attached formation is a Penitent unit, but other models gain no PENITENT keyword.',unit);break;
   case '000009033005':for(const p of phases)cue(p,'either','during','The bearer model has Feel No Pain 5+.'+(p==='Shooting'||p==='Fight'||p==='Movement'?' Its Save characteristic is 2+; other models do not gain this save.':''));break;
   // Sacred Rites and the Triptych saving-throw exception are integrated into
   // the Acts of Faith reminder, so their per-phase die limit stays in one place.
   case '000009037005':break;
   case '000009831005':cue('Movement','opponent','during','Enemy units arriving from Reserves cannot be set up within 12″ of the bearer model.');cue('Movement','own','end','The bearer’s 12″ exclusion also applies to enemies arriving from Reserves using Rapid Ingress at the end of your Movement phase.');break;
  }
 }
 return rows;
}
