import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {instanceBodyguards} from './leader-eligibility';
import {DEATH_GUARD_SHEETS,deathGuardMusterUnits,deathGuardKeywords} from './death-guard-data';
import {resolvedDeathGuardWarlord} from './death-guard-muster';
import {deathGuardFormations} from './death-guard-transports';
import {deathGuardHasRangedWeapon,deathGuardWeaponCount} from './death-guard-loadouts';
import {deathGuardContagionRange,deathGuardPlagueText} from './death-guard-contagion';
import {DG_CARDS} from './dg-profiles.generated';
import {DG_RANDOM_SHOTS,DG_STRATAGEMS} from './death-guard-detachments.generated';
import {currentDeathGuardDetachment,eligibleDeathGuardUpgrades} from './death-guard-detachment-data';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
const unitStats=new Map(DEATH_GUARD_SHEETS.map(s=>[s.unit,s]));
const source='https://wahapedia.ru/wh40k11ed/factions/death-guard/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const effects:Record<typeof DG_STRATAGEMS[number]['id'],string>={
 '000010132002':'Before this attached formation attacks, its models score Critical Hits on unmodified Hit rolls of 5+ through phase end.',
 '000010132003':'Before this attached formation attacks, let it re-roll Hit and Wound rolls against enemies below Starting Strength through phase end.',
 '000010132004':'After enemy target selection, increase the Toughness of models in the attached formation by 2 until phase end.',
 '000010132006':'In your Movement phase before the Move Units step, select a Character that is not leading and a unit it can lead within 2″ horizontally and 5″ vertically. The recipient cannot be Battle-shocked or already led by a Character or two Leaders. Attach the Character and update the unit’s Starting Strength.',
 '000010132005':'Select a formation containing two Character models. It has Fights First until this phase ends.',
 '000010132007':'Before the unengaged Biologus Putrifier unit shoots, select a visible non-Vehicle enemy within 8″. It suffers all three Plagues until your next turn starts.',
 '000010945004':'When an engaged enemy chooses to Fall Back, roll a D6. On 1 it suffers one mortal wound, on 2–5 it suffers D3, and on 6 it suffers three.',
 '000010945003':'When the Contagion Engine is selected to shoot, choose a visible enemy. It is Afflicted until the Engine finishes its attacks.',
 '000010945002':'When this Contagion Engine is selected to attack, its attacks can re-roll Wound rolls of 1.',
 '000010144003':'Before the Terminators fight, let their models re-roll Hit rolls against targets other than Monsters or Vehicles through phase end.',
 '000010144002':'Give the models in this Terminator formation +3″ Contagion Range through phase end. The modified range cannot exceed 12″.',
 '000010144005':'Select an objective visible to the Lord of Virulence within 30″. Until your next turn starts, enemies in range of it are Afflicted.',
 '000010144004':'After enemy target selection, roll for each model destroyed before it fights. On 4+ it fights after the attacking unit, then is removed.',
 '000010144006':'Before the Terminator formation shoots, its ranged weapons gain Assault and Heavy for this phase.',
 '000010144007':'After the Terminator formation finishes a charge, choose one engaged enemy. Roll a D6 for each friendly model in the formation engaged with that enemy. Each 2+ inflicts one mortal wound, to a maximum of six.',
 '000009730003':'When the Plague Marines are selected to shoot, re-roll Hit rolls of 1. Against targets within half range also re-roll Wound rolls of 1.',
 '000009730002':'Choose an enemy engaged with these Plague Marines. It makes a Battle-shock roll at −1.',
 '000009730004':'When the Plague Marines are selected to shoot, their ranged attacks gain Close-quarters.',
 '000010128004':'Before shooting, the unit can re-roll Hit rolls against visible non-Aircraft targets in the enemy deployment zone through phase end.',
 '000010128002':'Choose a terrain feature within 24″ of and visible to the Vehicle. Until your next turn starts, enemies within 3″ of that feature are Afflicted.',
 '000010128003':'Before this Vehicle moves or charges, let it move horizontally through terrain during Normal moves, Advances or Charges this phase.',
 '000010128007':'Choose an unengaged Death Guard Vehicle and one enemy visible within 12″ of it. When that enemy declares a charge it suffers −1 to the Charge roll.',
 '000010128005':'Before the Vehicle shoots, its ranged weapons gain Assault through phase end.',
 '000010128006':'Select an objective visible to this Vehicle. Each Afflicted enemy in range takes a Battle-shock test and need not take another this phase.',
 '000010949003':'Select an enemy visible to and within the Contagion Range of this Character unit. Increase the enemy’s detection range by 6″.',
 '000010949002':'The Character unit gains +1 Objective Control until the end of the turn.',
 '000010949004':'When the Character unit starts an action in your Shooting phase, it can still shoot.',
 '000010140004':'Through the end of the turn add 1″ Move to this Poxwalkers unit and add 1 Strength and 1 Attack to its melee weapons.',
 '000010140003':'When this Poxwalkers unit is destroyed, choose one enemy that targeted it with attacks during this Fight phase. That enemy is Afflicted for the rest of the battle.',
 '000010140007':'After enemy target selection, choose the targeted Death Guard unit and a different friendly Poxwalkers unit within 3″ of it and visible to both it and the attacking unit. For each attack allocated to the protected unit this phase, if the attacking model can see and legally target the Poxwalkers, destroy Poxwalker models equal to the attack’s Damage instead of making a save.',
 '000010140006':'After this Death Guard unit completes a charge, every enemy engaged with it must take a Battle-shock test at −1.',
 '000010140005':'In your Move Units step, give an unattached Poxwalkers unit in Strategic Reserves Deep Strike through phase end.',
 '000010140002':'After enemy target selection, roll a D6 for each model that attacking unit destroys in the Poxwalkers formation. Each 6 deals one mortal wound after the attacker finishes. If the Poxwalkers formation survives, enemy models these wounds destroy count for Curse of the Walking Pox.',
 '000010136003':'Before fighting, Death Guard models may re-roll Hit rolls this phase against enemies engaged with friendly Plague Legions.',
 '000010136007':'When an engaged non-Monster, non-Vehicle enemy is selected to Fall Back, use this on the engaged Legions unit. For the rest of the phase, enemies attempting to Fall Back from it must test Leadership. On failure the enemy Remains Stationary.',
 '000010136005':'Before a Plague Legions Monster moves or charges, it may move horizontally through terrain during Normal moves, Advances and Charges this phase.',
 '000010136004':'For ranged target selection this phase, enemies engaged with this Legions unit can be targeted as though not engaged with it. Roll a D6 whenever an enemy model in such a unit loses a wound. Each 5+ deals a mortal wound to your Legions unit after the attacker finishes.',
 '000010136002':'Once per battle, when these Nurglings are destroyed, place an identical new unit at full Starting Strength and wounds in Strategic Reserves.',
 '000010136006':'Through the end of your Shooting phase, enemies within 6″ of this Plague Legions unit are Afflicted.',
 '000010124003':'After enemy target selection, subtract 1 Damage from attacks allocated to models in this unit until phase end.',
 '000010124004':'Choose your Warlord while it is on the battlefield. Until your next Command phase starts, increase the Contagion Range of your models by 3″, to a maximum of 12″.',
 '000010124005':'Choose a wounded Death Guard model and one enemy within 3″. Roll a D6 per wound the model has lost. Each 5+ deals a mortal wound to that enemy and restores one wound to your model, up to six of each.',
 '000010124002':'When this Vehicle or Monster with Deadly Demise is destroyed, it inflicts its Deadly Demise mortal wounds automatically. Enemies that suffer those wounds are Afflicted until your next turn starts.',
 '000010124007':'Before the Infantry shoots, its models re-roll ranged Hit and Wound rolls against Afflicted targets through phase end.',
 '000010124006':'Select an enemy visible to this Character unit. Until phase end, Death Guard units shooting that enemy can re-roll the dice for how many attacks their weapons make.',
};

export function deathGuardDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Death Guard')return [];
 const has=(d:string)=>army.detachments2026?.some(n=>currentDeathGuardDetachment(n)===d);
 const allowed=new Set(deathGuardMusterUnits(army)),active=roster.filter(s=>allowed.has(s.unit));
 const actual=deathGuardFormations(army,active).map(f=>({...f,ranged:f.members.some(deathGuardHasRangedWeapon)}));
 const spawned:RosterInstance={id:'Poxwalkers (Numberless Horde reinforcements)',unit:'Poxwalkers',models:10};
 const generatedPox=has('Shamblerot Vectorium')&&active.length>0;
 const forms=generatedPox?[...actual,{root:spawned,members:[spawned],ranged:false}]:actual;
 type Form=typeof forms[number];
 const tags=new Map([...active,...(generatedPox?[spawned]:[])].map(s=>[s.id,deathGuardKeywords(army,s)]));
 const tag=(s:RosterInstance,k:string)=>tags.get(s.id)?.has(k)===true;
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const dg=forms.filter(f=>kw(f,'DEATH GUARD')),legions=forms.filter(f=>kw(f,'PLAGUE LEGIONS'));
 const marine=dg.filter(f=>f.members.some(s=>s.unit==='Plague Marines')),pox=dg.filter(f=>f.members.some(s=>s.unit==='Poxwalkers'));
 const chars=dg.filter(f=>kw(f,'CHARACTER')),vehicles=dg.filter(f=>kw(f,'VEHICLE')),engines=dg.filter(f=>kw(f,'CONTAGION ENGINE'));
 const attached=dg.filter(f=>f.members.length>1),terminators=dg.filter(f=>kw(f,'TERMINATOR'));
 const root=(list:readonly Form[])=>list.map(f=>f.root);
 const names=(list:readonly Form[])=>root(list).map(s=>s.id).join(', ');
 const group=(s:RosterInstance)=>forms.find(f=>f.members.some(m=>m.id===s.id))!;
 const chosen=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 const mortarion=active.find(s=>s.unit==='Mortarion');
 const warlord=resolvedDeathGuardWarlord({...army,instances:active});
 const plagueMenu=Object.entries(deathGuardPlagueText).map(([name,body])=>name+' — '+body).join('. ')+'.';
 const rows:GeneratedReminder[]=[];
 const emit=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],sourceRuleId?:string)=>{
  if(units.length)rows.push({id:'11e-dg-'+key+'-'+window+'-'+turn,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source,origin:'detachment',sourceRuleId});
 };
 const card=(key:string,name:string,p:ReminderWindow,turn:Turn,t:Timing,body:string,fs:Form[])=>emit(key,name,p,turn,t,body,root(fs));
 if(has('Flyblown Host'))card('haze','Verminous Haze','Pre-battle','either','during','During Declare Battle Formations choose up to two friendly Plague Marines units to gain Infiltrators.',marine);
 if(has('Virulent Vectorium'))card('world','Worldblight','Command','own','end','A controlled objective is secured if a friendly Death Guard unit controls it at the end of your Command phase. Enemies in range of that objective are Afflicted until you lose control.',dg);
 if(has('Mortarion’s Hammer'))card('bombard','Miasmic Bombardment','Start of battle round','either','start','Select up to '+(army.battleSize2026==='Incursion'?'one enemy unit':'two enemy units')+' farther than 12″ from every friendly model on the battlefield. Those enemies are Afflicted until round end.',dg);
 if(has('Champions of Contagion'))card('maladies','Manifold Maladies','Start of battle round','either','start','You may replace the army’s chosen Plague for the rest of the battle. '+plagueMenu,dg);
 if(has('Shamblerot Vectorium')){
  emit('horde','Numberless Horde','Command','own','during','In battle rounds '+(army.battleSize2026==='Incursion'?'2 and 3':'2, 3 and 4')+', add one new 10-model Poxwalkers unit to the army in Strategic Reserves. Its subsequent reminders apply after the unit exists. Friendly Poxwalkers have Battleline.',generatedPox?[spawned]:[]);
 }
 if(has('Death Lord’s Chosen'))card('vectors','Deadly Vectors','Command','opponent','during','For each Afflicted enemy unit roll 2D6, subtracting 1 when that enemy is below Half-strength. On a result of 6 or less it suffers D3 mortal wounds.',dg);
 if(has('Contagion Engines'))card('animus','Warped and Rusted Animus','Shooting','own','during','The selected Contagion Engines’ ranged attacks have Assault.',engines.filter(f=>f.ranged));
 for(const strat of DG_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=forms.filter(f=>f.members.some(s=>strat.units.some(n=>n===s.unit))),text=effects[strat.id],actors:RosterInstance[]|undefined;
   switch(strat.id){
    case '000010132002':case '000010132003':case '000010132004':targets=attached;break;
    case '000010132005':targets=attached.filter(f=>f.members.filter(s=>tag(s,'CHARACTER')).length>=2);break;
    case '000010132006':{
     const pairs=chars.filter(f=>f.members.length===1).flatMap(f=>{
      const permitted=instanceBodyguards(army,f.root),eligible=dg.filter(g=>g!==f&&g.members.length===1&&permitted.includes(g.root.unit));
      return eligible.length?[{leader:f.root,eligible}]:[];
     });
     actors=pairs.map(o=>o.leader);
     if(pairs.length)text+=' Legal recipients: '+pairs.map(o=>o.leader.id+' with '+names(o.eligible)).join('. ')+'.';break;
    }
    case '000010132007':text+=' '+plagueMenu;break;
    case '000010945002':case '000010945003':case '000010945004':targets=engines;break;
    case '000010144002':targets=terminators;text+=' Before other modifiers, this gives '+[1,2,3].map(r=>deathGuardContagionRange(r,3)+'″').join(', ')+' in rounds 1, 2 and 3+ respectively.';break;
    case '000010144003':case '000010144004':case '000010144006':case '000010144007':targets=terminators;break;
    case '000010144005':actors=active.filter(s=>s.unit==='Lord of Virulence');break;
    case '000010140007':{
     targets=dg.filter(f=>pox.some(p=>p!==f));
     if(targets.length)text+=' Possible Poxwalker protectors: '+names(pox)+'.';break;
    }
    case '000010140005':targets=pox.filter(f=>f.members.length===1);break;
    case '000010140002':case '000010140003':case '000010140004':targets=pox;break;
    case '000010136003':if(!legions.length)continue;targets=dg;text+=' Possible Legions: '+names(legions)+'.';break;
    case '000010136004':targets=legions.filter(f=>forms.some(g=>g!==f&&(g.ranged||g.members.some(s=>tag(s,'CHAOS KNIGHTS')||s.unit==='Chaos Warhound Titan'))));break;
    case '000010124004':actors=warlord&&tag(warlord,'DEATH GUARD')?[warlord]:[];break;
    case '000010124005':actors=active.filter(s=>{
     if(!tag(s,'DEATH GUARD'))return false;
     const sheet=unitStats.get(s.unit);
     return Boolean(sheet?.profile&&sheet.profile.wounds>1)||Object.values(sheet?.modelProfiles??{}).some(p=>p.wounds>1);
    });break;
    case '000010124002':actors=active.filter(s=>tag(s,'DEATH GUARD')&&(tag(s,'VEHICLE')||tag(s,'MONSTER'))&&Boolean(DG_CARDS[s.unit]?.demise));break;
    case '000010124006':{
     const weapons=active.filter(s=>tag(s,'DEATH GUARD')).flatMap(s=>{
      const items=(DG_RANDOM_SHOTS[s.unit]??[]).filter(w=>deathGuardWeaponCount(s,w)>0);
      return items.length?[s.id+' — '+items.join(', ')]:[];
     });
     if(!weapons.length)continue;targets=chars;text+=' Fitted variable-attack weapons: '+weapons.join('. ')+'.';break;
    }
   }
   if(phase==='Shooting'&&turn==='own'&&!['000010949003','000010136004','000010136006','000010124006'].includes(strat.id))targets=targets.filter(f=>f.ranged);
   if(targets.some(f=>f.root===spawned)&&!actors)text+=' Numberless Horde reinforcements qualify after their round’s Command phase adds them.';
   const name=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,c=>c.toUpperCase());
   emit('strat-'+strat.id,name+' · '+strat.cp+'CP',phase,turn,strat.timing,text,actors??root(targets),strat.id);
  }
 }
 for(const bearer of active){
  const picked=chosen(bearer),up=picked&&eligibleDeathGuardUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===picked);
  if(!up)continue;
  const form=group(bearer),unit=[form.root],own=[bearer];
  const cue=(p:ReminderWindow,turn:Turn,when:Timing,summary:string,units:readonly RosterInstance[]=own,scope='')=>
   emit(up.id+'-'+bearer.id+(scope?'-'+scope:''),bearer.id+' · '+up.name,p,turn,when,summary,units,up.id);
  // These passive effects are not phase-locked. Snap shooting keeps wound
  // modifiers/rerolls and defences, unlike its fixed Hit roll and no Critical Hits.
  const defend=(summary:string,units:readonly RosterInstance[]=unit)=>{
   cue('Shooting','opponent','during',summary,units);
   cue('Movement','own','end','Against enemy Overwatch: '+summary,units);
  };
  const ranged=(summary:string,recipients:readonly Form[]=[form],scope='')=>{
   const armed=recipients.filter(f=>f.ranged);
   cue('Shooting','own','during',summary,root(armed),scope);
   cue('Movement','opponent','end','When firing Overwatch: '+summary,root(armed.filter(f=>!kw(f,'TITANIC'))),scope);
   if(mortarion)cue('Shooting','opponent','during','If Mortarion uses Inflamed Reprisal on a listed formation within 6″: '+summary,root(armed.filter(f=>kw(f,'DEATH GUARD'))),scope);
  };
  switch(up.id){
   case '000010127002':ranged('This formation’s ranged weapons gain Ignores Cover when targeting an Afflicted enemy.');break;
   case '000010131002':cue('Fight','either','during','Once per battle, after this formation fights and destroys at least one Character model with those attacks, choose a Plague. All Afflicted enemies also suffer its effect for the rest of the battle. '+plagueMenu,unit);break;
   case '000010135002':{
    const units=root(legions.filter(f=>f.members.every(s=>DG_CARDS[s.unit]?.core?.includes('Deep Strike'))));
    const summary='When these Legions use Deep Strike, they may set up wholly within 12″ of the bearer and more than 6″ horizontally from all enemies instead of their usual distance.';
    cue('Movement','own','during',summary,units);
    cue('Movement','opponent','end','For an eligible Rapid Ingress after the first battle round: '+summary,units);break;
   }
   case '000009729002':{
    const summary='Re-roll Wound rolls of 1 when this unit attacks an enemy within Contagion Range of a friendly unit.';
    ranged(summary);cue('Fight','either','during',summary,unit);break;
   }
   case '000010123002':cue('Fight','either','during','The bearer’s melee attacks score Critical Hits on unmodified Hit rolls of 5+.');break;
   case '000010948002':{
    const summary='When an attack against the bearer’s formation has Strength greater than its Toughness, subtract 1 from the Wound roll.';
    defend(summary);cue('Fight','either','during',summary,unit);break;
   }
   case '000010139002':if(form.root!==bearer&&pox.includes(form))for(const p of phases)cue(p,'either','during','While the bearer leads these Poxwalkers, its formation gains 1 Objective Control and adds 1 to its Battle-shock and Leadership tests.',unit);break;
   case '000010143002':cue('Fight','either','start','Each enemy engaged with the bearer’s formation must take a Battle-shock test.',unit);break;
   case '000010944002':cue('Fight','either','during','After this Contagion Engine unit fights, one of its models heals D3 wounds.',unit);break;
   case '000010131003':cue('Shooting','own','during','After this Plaguecaster shoots, the Infantry enemy enfeebled by its Pestilent Fallout is also Afflicted while that effect lasts.');break;
   case '000009729003':defend('Reduce the detection range of the upgraded unit by 3″.');break;
   case '000010944003':for(const p of ['Movement','Charge'] as const)cue(p,'own','during','The upgraded Contagion Engine unit has Mobile.',unit);break;
   case '000010948003':cue('Command','own','during','Once per battle per army, select one Plague. For the rest of the battle enemies in this formation’s Contagion Range also suffer that Plague. '+plagueMenu,unit);break;
   case '000010139003':if(form.root!==bearer&&pox.includes(form)){
    const summary='If this led Poxwalkers formation arrives from Strategic Reserves, treat the current round as round three when setting it up.';
    cue('Movement','own','during',summary,unit);
    cue('Movement','opponent','end','For an eligible Rapid Ingress after the first battle round: '+summary,unit);
   }break;
   case '000010127003':if(deathGuardWeaponCount(bearer,'Plague Wind'))cue('Shooting','own','start','Increase the range of the bearer’s Plague Wind by 12″ until phase end.');break;
   case '000010123003':cue('Fight','either','during','The bearer’s melee weapons gain 1 Strength, 1 Attack and Devastating Wounds.');break;
   case '000010135003':cue('Fight','either','during','Add 2 Attacks to the bearer’s melee weapons.');break;
   case '000010143003':if(form.root!==bearer)cue('Movement','own','during','While the bearer leads, its formation gains 1″ Move and may re-roll Advance rolls.',unit);break;
   case '000010135004':cue('Command','opponent','during','In the Battle-shock step, every enemy within 6″ of this Great Unclean One that is below Starting Strength takes a Battle-shock test at −1.');break;
   case '000010127004':if(form.ranged&&!kw(form,'TITANIC'))cue('Movement','opponent','end','Once per battle round, target the bearer’s formation with Fire Overwatch for 0CP, subject to its normal eligibility.',unit);break;
   case '000010123004':{
    const summary='If the bearer’s formation is in range of an objective you control, its models may re-roll their Wound rolls.';
    ranged(summary);cue('Fight','either','during',summary,unit);break;
   }
   case '000010139004':if(form.root!==bearer&&pox.includes(form)&&deathGuardWeaponCount(bearer,'Plague Wind'))ranged('While leading these Poxwalkers, the bearer’s Plague Wind gains 1 Damage. After its formation resolves one or more Plague Wind attacks, destroy D3 Bodyguard models.');break;
   case '000010143004':cue('End of opponent turn','opponent','end','Once per battle, place the unengaged bearer’s formation into Strategic Reserves.',unit);break;
   case '000010131004':break; // Replaces the ordinary model return on the Plague Surgeon's own Narthecium card.
   case '000010135005':if(legions.length)for(const p of phases)cue(p,'either','during','Legions formations within 12″ of the bearer add 1 to Battle-shock tests. If passed, a model recovers D3 wounds.'+(legions.some(f=>kw(f,'BATTLELINE'))?' A Battleline unit can instead return up to D3 destroyed models. Eligible Battleline: '+names(legions.filter(f=>kw(f,'BATTLELINE')))+'.':''),root(legions));break;
   case '000010139005':if(form.root!==bearer&&pox.includes(form)){
    const summary='While the bearer leads, add 1 Toughness only to Poxwalkers models in the formation.',units=form.members.filter(s=>s.unit==='Poxwalkers');
    defend(summary,units);cue('Fight','either','during',summary,units);
   }break;
   case '000010123005':for(const p of phases)cue(p,'either','during','The bearer has Feel No Pain 5+.');break;
   case '000010143005':if(form.root!==bearer)defend('While the bearer leads, its formation can only be targeted by a ranged attack from a model within 18″.');break;
   case '000010131005':cue('Pre-battle','either','during','During Declare Battle Formations, select one Plague. For the rest of the battle enemies within Contagion Range of this bearer also suffer that Plague. '+plagueMenu);break;
   case '000010127005':
    if(vehicles.length)defend('The bearer has Lone Operative while within 3″ of a friendly Death Guard Vehicle. Possible Vehicles: '+names(vehicles)+'.',own);
    ranged('A Death Guard Vehicle within 3″ of the bearer re-rolls ranged Wound rolls of 1 against an enemy visible to that bearer.',vehicles,'vehicles');break;
  }
 }
 return rows;
}
