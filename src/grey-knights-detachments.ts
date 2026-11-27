import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {GREY_KNIGHTS_GATE_UNITS,GREY_KNIGHTS_REVISION} from './grey-knights-data.generated';
import {greyKnightsKeywords,greyKnightsMusterUnits} from './grey-knights-data';
import {greyKnightsCargoFormations,greyKnightsFormations,greyKnightsOriginalFormationResolver} from './grey-knights-transports';
import {greyKnightsHasRangedWeapon,greyKnightsWeaponCount} from './grey-knights-loadouts';
import {assignedAgentHasRanged} from './knight-assigned-agents';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {GK_CARDS} from './gk-profiles.generated';
import {GK_STRATAGEMS} from './grey-knights-detachments.generated';
import {eligibleGreyKnightsUpgrades} from './grey-knights-detachment-data';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
const source='https://wahapedia.ru/wh40k11ed/factions/grey-knights/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Shooting','Fight'] as const;
const gateUnits=new Set(GREY_KNIGHTS_GATE_UNITS);
const agentCore=new Map<string,readonly string[]>(ASSIGNED_AGENT_DATA.map(a=>[a.sheet.unit,a.core]));
const publishedStratagems=new Set(['000010921002','000010921003','000010921004','000010925002','000010925003','000010925004','000010929002','000010929003','000010929004','000010365002','000010349003','000010353006','000010357007']);
const effects:Record<typeof GK_STRATAGEMS[number]['id'],string>={
 '000010921002':'When this Paladin formation suffers a mortal wound, its models gain Feel No Pain 4+ against mortal wounds.',
 '000010921003':'When the Paladin formation is selected to fight, its melee attacks gain Precision.',
 '000010921004':'After an enemy selects these Paladins as a melee target, that enemy’s melee attacks gain Hazardous.',
 '000010365002':'Before the Psyker formation attacks, allow it to re-roll Hit rolls for its attacks this phase.',
 '000010365003':'Before the Psyker formation attacks, its attacks score Critical Hits on unmodified Hit rolls of 5+ until phase end.',
 '000010365004':'After enemy target selection, attacks targeting this Walker unit suffer −1 to Hit through phase end.',
 '000010365005':'After enemy target selection, roll a D6 whenever a model in this Infantry formation is destroyed before fighting. If the roll exceeds the current battle round number, the model fights after the attacker finishes, then is removed.',
 '000010365006':'At the end of your Command phase, place this unengaged Psyker formation with Deep Strike into Strategic Reserves.',
 '000010365007':'Just after an enemy arrives in the opponent’s Reinforcements step, a Psyker formation within 12″ of it and outside Engagement Range can enter Strategic Reserves if every model has Deep Strike.',
 '000010357002':'At phase end, select this Psyker formation if it remains on the battlefield and suffered mortal wounds this phase. Choose one enemy that inflicted some of those wounds. Roll one D6 per mortal wound your formation suffered; each 2+ inflicts one Psychic mortal wound on that enemy, up to six.',
 '000010357003':'After enemy target selection, models in the Psyker formation gain Feel No Pain 5+ against attacks with unmodified Damage 1 until phase end.',
 '000010357004':'Before the Psyker formation shoots, its ranged weapons gain Anti-Chaos 4+ through phase end.',
 '000010357005':'This Psyker Infantry formation may declare a charge even if it Advanced this turn.',
 '000010357006':'Through this Movement phase, enemy reinforcements cannot be set up within 12″ horizontally of the chosen Character model.',
 '000010357007':'After an enemy ends a Normal, Advance or Fall Back move within 8″ of this unengaged Psyker formation, it may make a Normal move up to 6″.',
 '000010349004':'Before shooting with a formation that arrived using Deep Strike this turn, give its weapons Sustained Hits 1 through phase end.',
 '000010349006':'After enemy target selection, the targeted Grey Knights formation gains Stealth through phase end.',
 '000010349003':'When the formation arrives using Deep Strike, set it up more than 6″ horizontally from every enemy. It cannot declare a charge this turn.',
 '000010349005':'After an engaged enemy Falls Back, this now-unengaged Grey Knights formation can enter Strategic Reserves if every model has Deep Strike.',
 '000010349007':'At the end of the opponent’s Fight phase, remove this Psyker Infantry formation and place it in Strategic Reserves. Every model must have Deep Strike. The formation can be engaged, and this use is additional to Gate of Infinity.',
 '000010349002':'Before this Infantry formation fights, its equipped Psychic melee weapons gain Devastating Wounds through phase end.',
 '000010925003':'When the Purgation formation is selected to shoot, choose one enemy. Its ranged attacks against that enemy gain Devastating Wounds and Sustained Hits 1.',
 '000010925004':'After the Purgation formation shoots, one Battle-shocked enemy hit by those attacks suffers D3+1 mortal wounds.',
 '000010925002':'When the Purgation formation is selected to Fall Back, that move does not prevent it from shooting this turn.',
 '000010353002':'Before the Terminator formation fights, its models’ melee weapons gain 1 Attack through phase end.',
 '000010353004':'Before this Infantry formation shoots, its equipped storm bolters gain Pistol and Twin-linked through phase end.',
 '000010353003':'After enemy target selection, roll a D6 whenever a model in this Infantry formation is destroyed before shooting or fighting this phase. On 4+ it shoots or fights after the attacker finishes, then is removed.',
 '000010353005':'After this Terminator formation ends a charge, choose one engaged enemy. Roll one D6 per model in your formation engaged with that enemy; each 4+ causes one mortal wound, up to six.',
 '000010353006':'After an enemy ends a Normal, Advance or Fall Back move within 8″ of this unengaged Infantry formation, it may make a Normal move up to D6″.',
 '000010353007':'After enemy target selection, attacks against the Infantry formation suffer −1 to Wound if their Strength exceeds its Toughness. This lasts through phase end.',
 '000010929002':'When this Interceptor formation is selected to fight after charging this turn, its melee attacks gain Lance.',
 '000010929004':'When an enemy previously engaged with these Interceptors ends a Fall Back move, the Interceptors may make a Normal move up to D3+3″ if now unengaged.',
 '000010929003':'When this Interceptor formation starts an action in your Shooting phase, that action does not prevent it from shooting.',
 '000010361003':'Before this formation attacks, its attacks against Monsters and Vehicles gain +1 to Wound through phase end.',
 '000010361002':'Just after this Psyker Vehicle suffers a mortal wound, its models gain Feel No Pain 4+ against mortal wounds through phase end.',
 '000010361005':'Just after the Vehicle Falls Back, it may still shoot and declare a charge this turn.',
 '000010361007':'Just after this Vehicle ends a charge, each enemy unit within 3″ must take a Battle-shock test at −1.',
 '000010361006':'Before the Vehicle moves or charges, it may move horizontally through terrain when making Normal, Advance and Charge moves this phase.',
 '000010361004':'One model in the selected Psyker Vehicle unit recovers up to three lost wounds.',
 '000009778006':'After enemy target selection, Infantry models in the targeted formation that are wholly within Hallowed Ground gain a 4+ invulnerable save through phase end.',
 '000009778005':'Through this Movement phase, each enemy set up or ending a Normal, Advance or Fall Back move within 6″ of this Infantry formation triggers a D6 roll. Add 2 if your formation is wholly within Hallowed Ground. On 4+ the enemy suffers D3 mortal wounds.',
 '000009778004':'When this non-Terminator Infantry formation arrives using Deep Strike, set it up wholly within Hallowed Ground and more than 6″ horizontally from every enemy.',
 '000009778002':'Before attacking with a formation wholly within Hallowed Ground, let it re-roll Wound rolls of 1 through phase end. A Purifier formation can instead re-roll all Wound rolls.',
 '000009778007':'Through this Charge phase, enemies declaring a charge against this Infantry formation subtract 1 from their Charge roll, or subtract 2 if the formation is wholly within Hallowed Ground.',
 '000009778003':'If this Purifier formation was eligible to fight this phase, roll a D6 for each enemy within 6″ at phase end. Each 4+ causes D3 mortal wounds.',
};

export function greyKnightsDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Grey Knights')return [];
 const has=(det:string)=>army.detachments2026?.includes(det);
 const allowed=new Set(greyKnightsMusterUnits(army)),active=roster.filter(s=>allowed.has(s.unit));
 const forms=greyKnightsFormations(army,active).map(f=>({...f,ranged:f.members.some(s=>greyKnightsHasRangedWeapon(s)||assignedAgentHasRanged(s))}));
 type Form=typeof forms[number];
 const tag=(s:RosterInstance,k:string)=>greyKnightsKeywords(army,s).has(k);
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const allDeep=(f:Form)=>f.members.every(s=>(GK_CARDS[s.unit]?.core??agentCore.get(s.unit))?.includes('Deep Strike'));
 const allGate=(f:Form)=>f.members.every(s=>gateUnits.has(s.unit));
 const fitted=(f:Form,name:string)=>f.members.some(s=>greyKnightsWeaponCount(s,name)>0);
 const psychic=(f:Form,p:'Shooting'|'Fight')=>f.members.some(s=>GK_CARDS[s.unit]?.weapons.some(w=>w.phase===p&&w.abilities.includes('psychic')&&greyKnightsWeaponCount(s,w.name)>0));
 const rangedHitRoll=(f:Form)=>f.members.some(s=>GK_CARDS[s.unit]?.weapons.some(w=>w.phase==='Shooting'&&!w.abilities.includes('torrent')&&greyKnightsWeaponCount(s,w.name)>0));
 const gk=forms.filter(f=>kw(f,'GREY KNIGHTS')),infantry=gk.filter(f=>kw(f,'INFANTRY'));
 const terms=gk.filter(f=>kw(f,'TERMINATOR')),vehicles=gk.filter(f=>kw(f,'VEHICLE'));
 const purifiers=gk.filter(f=>f.members.some(s=>s.unit==='Purifier Squad')),purgation=gk.filter(f=>f.members.some(s=>s.unit==='Purgation Squad'));
 const interceptors=gk.filter(f=>f.members.some(s=>s.unit==='Interceptor Squad')),paladins=gk.filter(f=>f.members.some(s=>s.unit==='Paladin Squad'));
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const group=(s:RosterInstance)=>forms.find(f=>f.members.some(m=>m.id===s.id))!;
 const selected=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 const rows:GeneratedReminder[]=[];
 const emit=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],sourceRuleId?:string,reference=source)=>{
  if(units.length)rows.push({id:'11e-gk-det-'+key+'-'+window+'-'+turn,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source:reference,origin:'detachment',sourceRuleId});
 };
 const card=(key:string,name:string,p:ReminderWindow,turn:Turn,t:Timing,body:string,fs:readonly Form[])=>emit(key,name,p,turn,t,body,roots(fs));
 if(has('Warpbane Task Force')){
  for(const p of phases)card('hallowed-ground','Hallowed Ground',p,'either','start','Your deployment zone is Hallowed Ground.'+(purifiers.length?' Ground within 6″ of your Purifier formations ('+names(purifiers)+') is also Hallowed Ground.':'')+' At phase start, controlling at least half of the objectives in No Man’s Land or in the enemy deployment zone makes that respective region Hallowed Ground through phase end.',gk);
  for(const p of attacks)card('hallowed-attacks','Hallowed Ground · attacks',p,p==='Fight'?'either':'own','during','Re-roll Hit rolls of 1 for melee attacks and ranged attacks against visible targets. Purifier formations and formations wholly within Hallowed Ground may re-roll all those Hit rolls instead.',gk.filter(f=>p==='Fight'||rangedHitRoll(f)));
 }
 if(has('Brotherhood Strike')){
  for(const p of attacks)card('fury','Fury of Titan',p,p==='Fight'?'either':'own','during','If this formation was set up using Deep Strike this turn, its models re-roll Hit and Wound rolls of 1 until turn end.',forms.filter(f=>allDeep(f)&&(p==='Fight'||f.ranged)));
  card('fury-snap','Fury of Titan · snap shooting','Movement','opponent','end','If this formation arrived using Deep Strike this turn and then uses Fire Overwatch, re-roll Wound rolls of 1. Snap shooting still forbids Hit re-rolls and Critical Hits.',forms.filter(f=>allDeep(f)&&f.ranged&&!kw(f,'TITANIC')));
 }
 if(has('Hallowed Conclave'))for(const p of ['Movement','Shooting','Charge'] as const)card('duty','Duty Before All',p,'own','during','Falling Back this turn does not prevent this Terminator formation from shooting or declaring a charge.',terms.filter(f=>p!=='Shooting'||f.ranged));
 if(has('Banishers'))card('channelled','Channelled Force','Fight','either','during','When this formation is selected to fight, it may take a Leadership test. If passed, choose Sustained Hits 1 or Lethal Hits for its equipped Psychic melee weapons through phase end. Other melee weapons receive neither benefit.',gk.filter(f=>psychic(f,'Fight')));
 if(has('Sanctic Spearhead'))for(const p of ['Movement','Shooting'] as const)card('fist','Mailed Fist',p,'own','during','When this Vehicle Advances, replace the Advance roll with +6″ Move for the phase. Its ranged weapons gain Assault until turn end.',vehicles.filter(f=>!kw(f,'AIRCRAFT')&&(p!=='Shooting'||f.ranged)));
 if(has('Augurium Task Force'))card('prescience','Prescient Redeployment','Movement','own','start','From battle round two, if you used fewer than the Gate of Infinity limit at the end of the previous enemy turn, select one unengaged formation on the battlefield that qualifies for Gate. Put it in Strategic Reserves; it can return during your Reinforcements step.',gk.filter(allGate));
 if(has('Argent Assault'))card('dauntless','Dauntless Champions','Fight','either','during','When the Paladin formation is selected to fight, its melee attacks gain +1 to Wound when their Strength is lower than the target’s Toughness.',paladins);
 if(has('Fires of Purgation'))card('soulflame','Searing Soulflame','Shooting','own','during','When the Purgation formation selects an enemy to pin with Righteous Persecution, that enemy must also take a Battle-shock test at −1.',purgation.filter(f=>f.ranged));
 if(has('Immaterial Interdiction'))card('echojump','Echojump','Shooting','own','during','After this Interceptor formation shoots, it may make a Surge move up to D6+1″. If it does, it cannot use Personal Teleporters for this shooting sequence.',interceptors.filter(f=>f.ranged));
 for(const strat of GK_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=forms.filter(f=>f.members.some(s=>strat.units.some(n=>n===s.unit))),body=effects[strat.id],actors:RosterInstance[]|undefined;
   switch(strat.id){
    case '000010365006':case '000010365007':case '000010349004':case '000010349003':case '000010349005':case '000010349007':targets=targets.filter(allDeep);break;
    case '000010357006':actors=active.filter(s=>tag(s,'GREY KNIGHTS')&&tag(s,'CHARACTER'));break;
    case '000010357007':{
     const deep=targets.filter(allDeep);
     if(deep.length)body+=' These formations can instead enter Strategic Reserves because every model has Deep Strike: '+names(deep)+'.';break;
    }
    case '000010349002':targets=targets.filter(f=>psychic(f,'Fight'));break;
    case '000010353004':targets=targets.filter(f=>fitted(f,'Storm bolter'));
     if(targets.length)body+=' Equipped storm bolters: '+targets.map(f=>f.root.id+' ('+f.members.reduce((n,s)=>n+greyKnightsWeaponCount(s,'Storm bolter'),0)+')').join(', ')+'.';break;
    case '000010361007':case '000010361006':case '000010361005':targets=targets.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000009778004':targets=targets.filter(f=>!kw(f,'TERMINATOR')&&allDeep(f));break;
    case '000009778003':{
     const crowe=targets.filter(f=>f.members.some(s=>s.unit==='Castellan Crowe'));
     if(crowe.length)body+=' Add 1 to the roll for these formations while Castellan Crowe remains attached: '+names(crowe)+'.';break;
    }
   }
   if(phase==='Shooting'&&turn==='own')targets=targets.filter(f=>f.ranged);
   if(phase==='Shooting'&&['000010365002','000010365003','000010349004'].includes(strat.id))targets=targets.filter(rangedHitRoll);
   const name=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,c=>c.toUpperCase());
   emit('strat-'+strat.id,name+' · '+strat.cp+'CP',phase,turn,strat.timing,body,actors??roots(targets),strat.id,publishedStratagems.has(strat.id)||strat.detachment==='Warpbane Task Force'?GREY_KNIGHTS_REVISION.pack:source);
  }
 }
 for(const bearer of active){
  const pick=selected(bearer),up=pick&&eligibleGreyKnightsUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===pick);
  if(!up)continue;
  const f=group(bearer),unit=[f.root],own=[bearer];
  const carriers=active.filter(s=>greyKnightsCargoFormations(army,s,active).some(g=>g.root.id===f.root.id));
  const transports=carriers.map(s=>s.id).join(', ');
  const cue=(p:ReminderWindow,turn:Turn,when:Timing,body:string,units:readonly RosterInstance[]=own)=>
   emit(up.id+'-'+bearer.id,bearer.id+' · '+up.name,p,turn,when,body,units,up.id,['Argent Assault','Fires of Purgation','Immaterial Interdiction','Warpbane Task Force'].includes(up.detachment)||['Eye of the Augurium','Sigil of Exigence','One Foot in the Future'].includes(up.name)?GREY_KNIGHTS_REVISION.pack:source);
  switch(up.id){
   case '000010356002':if(rangedHitRoll(f))cue('Shooting','own','during','The bearer’s formation re-rolls Hit rolls of 1 in your Shooting phase.',unit);break;
   case '000009777002':for(const p of phases)cue(p,'either','during','While the bearer’s formation is not Battle-shocked, the bearer model has +3 Objective Control. Other models gain no OC from this enhancement.');break;
   case '000010360002':cue('Fight','either','during','The bearer model can Pile In and Consolidate up to 6″ instead of 3″. The other requirements for those moves still apply.');break;
   case '000010924002':if(rangedHitRoll(f))cue('Movement','opponent','end','This Purgation formation’s snap shots hit on unmodified Hit rolls of 5+. Snap shots cannot score Critical Hits or re-roll Hit rolls.',unit);break;
   case '000010364002':cue('Fight','either','start','Once per battle, the bearer can give its own melee weapons +4 Strength through phase end.');break;
   case '000010920002':cue('Charge','either','during','Add 1 to Charge rolls for the bearer’s formation.',unit);break;
   case '000010352002':cue('Charge','opponent','during','This formation can use Heroic Intervention for 1CP less, even if another unit already used it this phase. This use does not prevent other units from using it. Normal Heroic Intervention eligibility and charge restrictions still apply.',unit);break;
   case '000010928002':cue('Movement','own','during','In your first Movement phase, this Interceptor formation may make an ingress move. Use the arrival method available to its actual models.',unit);break;
   case '000010348002':if(allDeep(f))cue('Movement','either','during','Whenever this formation is set up using Deep Strike, roll a D6 for each enemy within 12″ of the bearer model. On 2–5 that enemy suffers one mortal wound; on 6 it suffers D3.',unit);break;
   case '000010364003':break; // Activation and prior-use follow-ups use the original formation below.
   case '000010924003':
    if(f.ranged){
     for(const [p,turn,t] of [['Shooting','own','during'],['Movement','opponent','end']] as const)cue(p,turn,t,'This Purgation formation’s ranged attacks have +2 Strength.',unit);
     if(has('Hallowed Conclave'))cue('Shooting','opponent','during','If destroyed Purgation models shoot using Unending Fidelity, their ranged attacks still gain +2 Strength. Resolve only those destroyed models that qualify for the reaction.',unit);
    }break;
   case '000010356003':cue('Shooting','own','start','If the bearer’s formation is unengaged, it may make a Normal move up to D6″. If it does, it cannot declare a charge this turn.',unit);break;
   case '000010928003':case '000009777004':for(const [p,turn,t] of [['Shooting','opponent','during'],['Movement','own','during'],['Movement','opponent','during'],['Shooting','own','during']] as const)cue(p,turn,t,'Every model in the bearer’s formation has Stealth, giving the unit the Benefit of Cover against ranged attacks.',unit);break;
   case '000010352003':cue('Movement','opponent','during','When an enemy engaged with the bearer’s formation Falls Back, roll a D6: on 2–5 it suffers D3 mortal wounds, or D3+3 on 6. These are Psychic attacks.',unit);break;
   case '000010360003':if(carriers.length)for(const p of ['Movement','Charge'] as const)cue(p,'own','during','If this formation disembarked during your Movement phase, it may re-roll Charge rolls until turn end. Suitable transports: '+transports+'.',unit);break;
   case '000010920003':cue('Shooting','own','start','Select one enemy visible to and within 12″ of the bearer’s formation; increase that enemy’s detection range by 6″.',unit);break;
   case '000009777003':cue('Fight','either','during','The bearer’s own melee weapons gain Precision. While the bearer model is wholly within Hallowed Ground, each of its melee attacks that scores a wound also inflicts one mortal wound on the target.');break;
   case '000010348003':if(allDeep(f))cue('Movement','either','during','After this formation is set up using Deep Strike, enemies cannot target it with Fire Overwatch for the rest of that turn.',unit);break;
   case '000010364004':cue('Movement','either','during','After this formation ends an ingress move, it may make a Normal move up to D6″. If it does, it cannot declare a charge until this turn ends.',unit);break;
   case '000010356004':if(f.ranged)cue('Shooting','own','during','In your Shooting phase, improve the Armour Penetration of the bearer’s formation’s attacks by 1.',unit);break;
   case '000010348004':if(allDeep(f))cue('Charge','either','during','If the bearer’s formation was set up using Deep Strike this turn, it may re-roll Charge rolls until turn end. This does not override another rule that prevents it from charging.',unit);break;
   case '000010360004':cue('Shooting','opponent','during','Once per battle, when an enemy selects this formation as a ranged target, remove it and set it up again more than 8″ horizontally from every enemy. The opponent may retarget attacks that can no longer legally target it.',unit);break;
   case '000010352004':cue('Fight','either','during','Add 3 to the Attacks of the bearer model’s own melee weapons.');break;
   case '000009777005':for(const p of phases)cue(p,'either','start','Once per battle, select one friendly Grey Knights formation within 18″ of and visible to the bearer. It counts as within Hallowed Ground through phase end. Potential recipients: '+names(gk)+'.',roots(gk));break;
   case '000010360005':if(carriers.length&&f.ranged)cue('Shooting','own','during','When the bearer’s formation is selected to shoot after disembarking from a Transport this turn, it may re-roll Wound rolls through phase end. Suitable transports: '+transports+'.',unit);break;
   case '000010364005':cue('Movement','own','during','When this formation is set up in your Reinforcements step, one enemy visible to and within 12″ of the bearer must take a Battle-shock test at −1.',unit);break;
   case '000010348005':break; // Printed with the actual army-wide cap by greyKnightsGateReminders.
   case '000010356005':cue('Shooting','own','start','Select one enemy within 24″ of and visible to the bearer model. It suffers D3 mortal wounds.');break;
   case '000010352005':if(rangedHitRoll(f))cue('Movement','opponent','end','When this formation uses Fire Overwatch, its shots hit on unmodified Hit rolls of 5+. Snap shots still cannot score Critical Hits or re-roll Hit rolls.',unit);break;
  }
 }
 // Shield of Prophecy is a once-per-battle selection, not a passive aura.
 // The printed duration is the whole battle round (Appendix 01.02.02).
 // Do not infer that the player activated it or confer a new use after loss.
 if(has('Augurium Task Force')){
  const declared=expandRoster(army);
  const bearers=declared.filter(s=>selected(s)==='Shield of Prophecy');
  // Ordinary enhancements are unique. Ambiguous/invalid saved selections
  // must not create two activations or a transferable prior-use effect.
  if(bearers.length===1){
   const bearer=bearers[0],up=eligibleGreyKnightsUpgrades(army,bearer.unit,bearer.id).find(u=>u.id==='000010364003');
   const original=up?greyKnightsOriginalFormationResolver(army,roster,declared)(bearer):undefined;
   if(up&&original?.survivors.length){
    const live=original.survivors.find(s=>s.id===bearer.id);
    const title=bearer.id+' · '+up.name,key=up.id+'-'+bearer.id;
    // Keep the prior round-start ID and root label for legal saved armies.
    if(live&&selected(live)===up.name)emit(key,title,'Start of battle round','either','start',
     'Once per battle, at the start of the battle round, the living eligible bearer can give every model in its unit +2 Toughness until this battle round ends.',
     original.bodyguardSurvives?[original.original.root]:original.survivors,up.id);
    for(const [p,turn] of [['Movement','own'],['Movement','opponent'],['Shooting','own'],['Shooting','opponent'],['Fight','either']] as const)
     emit(key+'-active',title+' · active',p,turn,'during',
      'Only if this bearer activated Shield of Prophecy at the start of this battle round: add 2 to the Toughness of each surviving model in the original affected formation until the end of this battle round, even if the bearer is destroyed. Use the highest Toughness among surviving Bodyguard models while attached, or the highest Toughness of the remaining models if no Bodyguard survives. A unit returning from Reserves or a Transport retains the effect for its remaining duration. This is not another use.',
      original.survivors,up.id);
   }
  }
 }
 return rows;
}
