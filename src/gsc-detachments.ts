import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {gscAllyFaction,gscAllyHasRangedWeapon,gscAlliedKeywords,gscAlliedMusterUnits} from './gsc-allies';
import {GSC_SHEETS,gscKeywords} from './gsc-data';
import {currentGscDetachment,eligibleGscUpgrades,gscNameKey} from './gsc-detachment-data';
import {GSC_NATIVE_RULES,GSC_STRATAGEMS} from './gsc-detachments.generated';
import {gscHasRangedWeapon} from './gsc-loadouts';
import {gscCargoFormations,gscFormations} from './gsc-transports';
import {knightWeaponCount} from './knight-loadouts';
import {expandRoster,type RosterInstance} from './roster-instances';
export {eligibleGscUpgrades} from './gsc-detachment-data';

const source='https://wahapedia.ru/wh40k11ed/factions/genestealer-cults/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Shooting','Fight'] as const;
const native=new Map(GSC_NATIVE_RULES.map(s=>[gscNameKey(s.unit),s]));
const trait=(s:RosterInstance)=>native.get(gscNameKey(s.unit));
const heroes=new Set(['Locus','Sanctus','Reductus Saboteur','Kelermorph']);
const senior=new Set(['Magus','Primus','Acolyte Iconward']);
const swarm=(s:RosterInstance)=>s.unit.startsWith('Acolyte Hybrids')||s.unit==='Neophyte Hybrids'||s.unit==='Hybrid Metamorphs';
type StratId=typeof GSC_STRATAGEMS[number]['id'];
type Turn=NonNullable<GeneratedReminder['turn']>;
const effects:Record<StratId,string>={
 '000009076006':'Before this unit declares a charge, give it +2 to Charge rolls.',
 '000009076005':'Before this unit fights, it may pile in and consolidate up to 6″ this phase. Each model may approach the closest enemy unit instead of its closest model if it finishes as close as possible to that unit.',
 '000009076004':'Before this unit fights, add 1 to its Wound rolls against Monsters and Vehicles for the phase.',
 '000009076003':'After an enemy destroys your Character, roll a D6. On 2+ that enemy suffers D3 mortal wounds, or 2D3 if it destroyed an Abominant or Patriarch.',
 '000009076007':'When an enemy within 9″ of this unit is selected to shoot this phase, it must test Leadership at −1. If it fails, its attacks against your unit suffer −1 to Hit this phase.',
 '000009076002':'Before removing a Cult Ambush marker approached within 8″ by an enemy ending a move, relocate one such marker more than 8″ horizontally from all enemies.',
 '000009085006':'Select one Guard unit and one Cult unit that have yet to shoot. Choose one enemy visible to both and within range of a gun from each. This phase both can only attack that enemy, re-rolling Wound rolls of 1.',
 '000009085007':'After an enemy arrives from reserves in the opposing Move Units step, a friendly unit within 12″ may make a Normal move up to 6″.',
 '000009085002':'When an enemy ends a move within 8″ of a Cult Ambush marker, move one such marker wholly within 6″ of a friendly Guard Vehicle and more than 8″ horizontally from all enemies.',
 '000009085004':'After this Guard unit shoots, pick one enemy it hit. Until turn end it cannot use Fire Overwatch and friendly Cult units may re-roll Charge rolls when charging it.',
 '000009085005':'Choose an enemy engaged with a friendly Cult unit. The Guard unit may shoot it this phase. After shooting, roll a D6 for each friendly Cult unit engaged with that enemy. Each 5+ inflicts D3+1 mortal wounds on that friendly unit.',
 '000009085003':'Once per battle, after enemy attacks destroy the eligible Guard Infantry, roll a D6. On 3+, add an identical full-strength unit to Cult Ambush with its One Shot weapons restored. Place one marker more than 8″ horizontally from all enemies if possible.',
 '000009828005':'When the Cult unit declares a charge within 12″ of an engaged friendly Tyranids unit, add 1 to its Charge roll. It may also re-roll, in which case it must finish engaged with an enemy engaged with that Tyranids unit.',
 '000009828004':'After an enemy shoots or fights and destroys a friendly Tyranids Character unit, Cult models gain +1 to Hit and Wound against that enemy for the rest of the battle.',
 '000009828002':'Before this Cult unit fights, re-roll melee Wound rolls of 1 this phase.',
 '000009828003':'Increase this Tyranids unit’s Catalyst aura from 6″ to 9″ until your next Command phase starts. You cannot use Psi Surge again until your next Command phase ends.',
 '000009828006':'After Falling Back, this Tyranids unit may shoot or declare a charge in the phase where this Stratagem is used.',
 '000009828007':'Put one unengaged friendly Cult or Tyranids unit into Strategic Reserves.',
 '000010901002':'After the Killer unit attacks and destroys an enemy unit or an enemy Character model, each visible friendly battle-shocked Cult unit within 12″ recovers from Battle-shock.',
 '000010901003':'When selected to attack, only the Killer models in this unit gain Devastating Wounds on their attacks.',
 '000010901004':'If an enemy targets this unit and destroys a Killer model before your unit fights, roll a D6. On 1 the enemy suffers a mortal wound. On 2+ retain that model until your unit fights or the phase ends.',
 '000009068003':'Before shooting or fighting, the unit scores Critical Hits on unmodified Hit rolls of 5+ for the phase.',
 '000009068002':'Select two Cult units that have yet to attack and one enemy. Both may only attack that enemy this phase, adding 1 to Wound. In the Fight phase the enemy must be engaged with both friendly units.',
 '000009068006':'Put one unengaged Cult Infantry unit into Strategic Reserves.',
 '000009068005':'When returning a Battleline unit from Cult Ambush this phase, set it up wholly within 6″ of the marker and outside enemy Engagement Range.',
 '000009068007':'When an enemy declares a charge against the Infantry unit, roll a D6. On 2–4 deal D3 mortal wounds to that enemy. On 5+ deal three.',
 '000009068004':'When arriving by Deep Strike, this formation may set up more than 6″ horizontally from every enemy. It cannot charge this turn.',
 '000009080006':'After target selection, this unit has a 4+ invulnerable save against shooting for the phase.',
 '000009080004':'Before shooting, the unit’s ranged weapons gain Lethal Hits against enemies within 18″ for the phase.',
 '000009080003':'After enemy target selection, subtract 1 from the Damage of attacks into this Goliath for the phase.',
 '000009080005':'After an enemy ends a Normal move, Advance or Fall Back within 8″, this unit may make a Normal move of up to 6″.',
 '000009080002':'When an enemy finishes a move within 8″ of a Cult Ambush marker, move one such marker more than 8″ horizontally from all enemies.',
 '000009080007':'Put the unengaged unit into Strategic Reserves if it is wholly within 9″ of a battlefield edge.',
 '000010905002':'When these Purestrains Fall Back, they can still declare a charge.',
 '000010905004':'After an enemy finishes a move within 8″ of these unengaged Purestrains, they may make a Normal move of up to D3+3″.',
 '000010905003':'Reduce this unit’s detection range by 6″ until the turn ends.',
 '000009072003':'Before the unit fights, its non-Character models gain +1 Attack and improve melee Weapon Skill by 1 this phase. Those weapons gain Hazardous.',
 '000009072002':'After an enemy destroys one of your Cult Characters, select a different friendly Cult Character on the battlefield or in reserves. For the battle, your Acolyte Hybrids, Hybrid Metamorphs and Neophyte Hybrids models re-roll Hit rolls of 1 against that enemy.',
 '000009072004':'Before charging, this unit may charge after Advancing or Falling Back this turn.',
 '000009072006':'Set up one eligible unit from Cult Ambush without a marker, more than 6″ horizontally from every enemy.',
 '000009072007':'After enemy shooting destroys a model in this unit, move up to D6″ toward the closest enemy other than an Aircraft. End as close as possible, including within Engagement Range.',
 '000009072005':'Before shooting, this unit’s ranged weapons gain Assault for the phase.',
 '000010909004':'When the enemy targets these Neophytes and every model in the Neophyte unit is in a terrain area, worsen incoming ranged AP by 1 until the attacking unit has attacked.',
 '000010909002':'Select Neophytes in a terrain area. Enemy units in that same area gain 6″ detection range.',
 '000010909003':'When selected to shoot, choose one enemy. Re-roll ranged Hit rolls into that enemy.',
};
export function gscDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Genestealer Cults')return [];
 const detachments=new Set(army.detachments2026?.map(currentGscDetachment)??[]);
 const activeAllies=new Set(gscAlliedMusterUnits(army));
 const participating=roster.filter(s=>trait(s)||activeAllies.has(s.unit));
 const family=(s:RosterInstance)=>trait(s)?'Cult':gscAllyFaction(s.unit);
 const ranged=(s:RosterInstance)=>trait(s)?gscHasRangedWeapon(s):gscAllyHasRangedWeapon(s);
 const tags=(s:RosterInstance)=>trait(s)?gscKeywords(army,s):gscAlliedKeywords(s);
 const tagged=(s:RosterInstance,k:string)=>tags(s).has(k)||gscNameKey(s.unit)===gscNameKey(k);
 const formations=gscFormations(army,participating).map(({body:root,members})=>({root,members,ranged:members.some(ranged)}));
 type Form=typeof formations[number];
 const findForm=(s:RosterInstance)=>formations.find(f=>f.members.some(m=>m.id===s.id))!;
 const roots=(list:readonly Form[])=>list.map(f=>f.root);
 const has=(f:Form,k:string)=>f.members.some(s=>tagged(s,k));
 const cult=formations.filter(f=>family(f.root)==='Cult'),nids=formations.filter(f=>family(f.root)==='Tyranids'),guard=formations.filter(f=>family(f.root)==='Astra Militarum');
 const chars=participating.filter(s=>family(s)==='Cult'&&tagged(s,'CHARACTER'));
 const ambushers=cult.filter(f=>trait(f.root)?.ambush);
 const synapse=nids.filter(f=>has(f,'SYNAPSE'));
 const donors=cult.filter(f=>!has(f,'PURESTRAIN GENESTEALERS')&&!has(f,'PATRIARCH'));
 const markers=ambushers.length>0||detachments.has('Brood Brothers Auxilia')&&guard.some(f=>has(f,'REGIMENT')&&has(f,'INFANTRY')&&!has(f,'ARTILLERY')&&!has(f,'CHARACTER'));
 const cargo=cult.filter(f=>has(f,'TRANSPORT')).flatMap(carrier=>gscCargoFormations(army,carrier.root,participating).map(({body})=>({carrier,passenger:findForm(body)})));
 const modelCount=(f:Form)=>f.members.reduce((n,s)=>n+(s.models??GSC_SHEETS.find(sheet=>sheet.unit===s.unit)?.sizes[0]??1),0);
 const isSwarm=(f:Form)=>f.members.some(swarm);
 const hasHero=(f:Form)=>f.members.some(s=>heroes.has(s.unit));
 const rows:GeneratedReminder[]=[];
 function emit(id:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,targets:readonly RosterInstance[],sourceRuleId?:string){
  if(targets.length)rows.push({id:'11e-gsc-'+id+'-'+window,title,window,turn,timing,summary,units:targets.map(s=>s.id),source,sourceRuleId,origin:'detachment'});
 }
 const ids=(list:readonly Form[])=>roots(list).map(s=>s.id).join(', ');
 if(detachments.has('Host of Ascension')){
  for(const phase of ['Movement','Shooting','Fight'] as const)emit('perfect','A Perfect Ambush',phase,phase==='Shooting'?'own':'either','during',
   'After this Cult unit enters as reinforcements, its weapons gain Sustained Hits 1 and Ignores Cover through the end of your next Fight phase.',roots(cult.filter(f=>phase!=='Shooting'||f.ranged)));
 }
 if(detachments.has('Xenocreed Congregation')){
  const led=cult.filter(f=>isSwarm(f)&&f.members.some(s=>tagged(s,'CHARACTER')&&s.id!==f.root.id));
  emit('fanaticism-advance','Unquestioning Fanaticism','Movement','own','during','While a Character leads these Hybrids, they may re-roll Advance rolls.',roots(led));
  emit('fanaticism-charge','Unquestioning Fanaticism','Charge','own','during','While a Character leads these Hybrids, they may re-roll Charge rolls.',roots(led));
  const protectedLeaders=led.flatMap(f=>f.members.filter(s=>senior.has(s.unit)&&s.id!==f.root.id));
  for(const phase of attacks)emit('fanaticism-fnp','Unquestioning Fanaticism · Character protection',phase,phase==='Fight'?'either':'opponent','during','The listed Character models have Feel No Pain 3+ while leading their eligible units.',protectedLeaders);
 }
 if(detachments.has('Biosanctic Broodsurge')){
  const eligible=roots(cult.filter(f=>has(f,'ABERRANTS')||has(f,'BIOPHAGUS')||has(f,'PURESTRAIN GENESTEALERS')));
  emit('fury','Hypermorphic Fury','Charge','own','during','Add 1 to Charge rolls for these units.',eligible);
  emit('fury','Hypermorphic Fury','Fight','either','during','When selected to fight after charging this turn, the unit’s models gain 1 melee Attack through the end of this phase.',eligible);
 }
 if(detachments.has('Outlander Claw')){
  emit('takeover-oc','Rapid Takeover · objective control','Command','either','during','Each listed Cult Mounted or Vehicle model has +1 Objective Control while its unit is free from Battle-shock.',participating.filter(s=>trait(s)&&(tagged(s,'MOUNTED')||tagged(s,'VEHICLE'))));
  emit('takeover-secure','Rapid Takeover · secure objective','Command','own','end','Controlled objectives in range of your Jackals stay controlled until the opponent has greater control at the end of a phase.',roots(cult.filter(f=>has(f,'ATALAN JACKALS'))));
 }
 if(detachments.has('Brood Brothers Auxilia')&&guard.some(f=>f.ranged)&&cult.some(f=>f.ranged)){
  emit('overlap','Integrated Tactics','Shooting','own','during','When a Guard unit is selected to shoot, it may mark a visible enemy within 18″. Its attacks can only target that enemy this phase. Cult models add 1 to ranged Hit rolls against the marked enemy for the phase. Eligible Cult shooters include '+ids(cult.filter(f=>f.ranged))+'.',roots(guard.filter(f=>f.ranged)));
 }
 if(detachments.has('Final Day')){
  if(donors.length&&nids.length)emit('parasitism','Psionic Parasitism','Movement','own','end','For each Synapse unit choose a visible Cult donor and a visible Tyranids unit, each within 9″ of that Synapse unit. The donor suffers D3+1 mortal wounds. One model in the Tyranids unit heals up to that many wounds. Its models gain +1 to Hit until your next Movement phase starts. Possible donors include '+ids(donors)+'.',roots(synapse));
  if(nids.length)for(const phase of attacks)emit('catalyst','Catalyst',phase,phase==='Fight'?'either':'own','during','Cult models add 1 to Hit against enemies within 6″ of a friendly Tyranids unit. Aura sources include '+ids(nids)+'.',roots(cult.filter(f=>phase==='Fight'||f.ranged)));
 }
 if(detachments.has('Heroes of the Uprising'))for(const phase of attacks)emit('reputation','Killer Reputation',phase,phase==='Fight'?'either':'own','during','The listed Killer models may re-roll Hit rolls of 1 and Wound rolls of 1 when attacking.',participating.filter(s=>heroes.has(s.unit)&&(phase==='Fight'||ranged(s))));
 if(detachments.has('Purestrain Broodswarm'))emit('within','Enemy Within','Fight','opponent','end','Any of your unengaged Purestrain units may enter Strategic Reserves.',roots(cult.filter(f=>has(f,'PURESTRAIN GENESTEALERS'))));
 if(detachments.has('Xenocult Masses'))emit('hordes','Hordes of the Faithful','Command','own','during','Each friendly Neophyte Hybrids unit within a terrain area heals 3 wounds.',roots(cult.filter(f=>has(f,'NEOPHYTE HYBRIDS'))));

 for(const strat of GSC_STRATAGEMS){
  if(!detachments.has(strat.detachment))continue;
  const linked=new Set(strat.units.map(gscNameKey));
  const base=formations.filter(f=>f.members.some(s=>linked.has(gscNameKey(s.unit))));
  const title=strat.name.toLowerCase().replace(/(^|[\s-])\p{L}/gu,w=>w.toUpperCase())+' · '+strat.cp+'CP';
  for(const {phase,turn} of strat.windows){
   let accepted=base,targets:RosterInstance[]|undefined,text=effects[strat.id];
   const shooters=(f:Form)=>f.ranged;
   if((phase==='Shooting'&&turn==='own'&&strat.id!=='000010909002')||strat.id==='000009085004')accepted=accepted.filter(shooters);
   switch(strat.id){
    case '000009076003':targets=chars;break;
    case '000009076002':case '000009080002':
     if(!markers)continue;
     accepted=ambushers.length?ambushers:guard;break;
    case '000009085002':if(!markers)continue;break;
    case '000009085006':
     if(!accepted.some(f=>cult.includes(f))||!accepted.some(f=>guard.includes(f)))continue;break;
    case '000009085005':if(!cult.length)continue;break;
    case '000009085004':if(!cult.length)text='After this Guard unit shoots, pick one enemy it hit. That enemy cannot use Fire Overwatch until the end of the turn.';break;
    case '000009085007':accepted=accepted.filter(f=>!has(f,'MONSTER')&&!has(f,'VEHICLE'));break;
    case '000009085003':accepted=accepted.filter(f=>guard.includes(f)&&!has(f,'ARTILLERY')&&!has(f,'CHARACTER'));break;
    case '000009828005':case '000009828004':case '000009828003':if(!nids.length||!cult.length)continue;break;
    case '000009828002':
     if(nids.length)text+=' If a friendly Tyranids unit is within 6″ of the enemy, you may re-roll any Wound roll instead.';break;
    case '000010901002':if(cult.length<2)continue;break;
    case '000010901003':case '000010901004':
     accepted=accepted.filter(f=>hasHero(f)&&(strat.id!=='000010901003'||phase==='Fight'||f.members.some(s=>heroes.has(s.unit)&&ranged(s))));break;
    case '000009068002':if(accepted.length<2)continue;break;
    case '000009068004':
     accepted=accepted.filter(f=>f.members.every(s=>trait(s)?.deepStrike)||trait(f.root)?.ambush);
     if(accepted.some(f=>trait(f.root)?.ambush))text+=' The Cult Ambush FAQ also permits this when returning from Cult Ambush without a marker.';
     break;
    case '000009068005':case '000009072006':accepted=accepted.filter(f=>trait(f.root)?.ambush);break;
    case '000009072002':
     if(chars.length<2||!cult.some(isSwarm))continue;
     targets=chars;
     if(chars.some(s=>senior.has(s.unit)))text+=' If the slain model was a Magus, Primus or Acolyte Iconward, re-roll any Hit roll instead.';break;
    case '000009072004':
     if(chars.length)text+=' You may also re-roll its Charge roll. If you do, it must finish engaged with an enemy already engaged with a friendly Character unit.';break;
   }
   emit('strat-'+strat.id,title,phase,turn,strat.timing,text,targets??roots(accepted),strat.id);
  }
 }
 for(const bearer of participating){
  const name=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit];
  if(!name)continue;
  const upgrade=eligibleGscUpgrades(army,bearer.unit,bearer.id).find(u=>gscNameKey(u.name)===gscNameKey(name));
  if(!upgrade)continue;
  const form=findForm(bearer),unit=[form.root],equipped=[bearer];
  const add=(window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,affected=unit)=>
   emit(upgrade.id+'-'+bearer.id,bearer.id+' · '+upgrade.name,window,turn,timing,summary,affected,upgrade.id);
  const attack=(summary:string,modelOnly=false)=>{
   if(modelOnly?ranged(bearer):form.ranged)add('Shooting','own','during',summary,modelOnly?equipped:unit);
   add('Fight','either','during',summary,modelOnly?equipped:unit);
  };
  switch(upgrade.id){
   case '000009075002':
    add('Pre-battle','either','during','Every model in this formation has Infiltrators.');
    add('Charge','opponent','end','When the unit uses Heroic Intervention, reduce that use by 1CP. It may intervene despite an earlier use this phase and leaves the Stratagem available to other units.');break;
   case '000009071002':for(const phase of phases)add(phase,'either','during','If the bearer’s unit takes a Battle-shock test, it may re-roll that test.');break;
   case '000010908002':attack('Attacks made by the bearer’s unit can re-roll Damage rolls.');break;
   case '000009079002':if(form.ranged)add('Shooting','own','during','The bearer’s unit may shoot after Falling Back this turn.');break;
   case '000010900002':attack('The bearer’s attacks gain 1 Damage.',true);break;
   case '000010904002':
    for(const phase of attacks)add(phase,phase==='Fight'?'either':'opponent','during','The upgraded Purestrains have +1 Toughness and a 4+ Save.'+(phase==='Fight'?' Their melee attacks also gain 1 Strength.':''));
    break;
   case '000009067002':add('Movement','opponent','during','When an enemy finishes a move within 8″, this unengaged unit can make a Normal move of up to D6″.');break;
   case '000009827002':if(synapse.length&&donors.length)add('Movement','own','end','When Psionic Parasitism heals this bearer, it can regain up to twice the normal number of lost wounds.',equipped);break;
   case '000009084002':add('Shooting','own','during','Once per turn, when a friendly Guard Infantry or Mounted unit within 9″ of the bearer is selected to shoot, improve its ranged AP by 1 for the phase.',roots(guard.filter(f=>f.ranged&&(has(f,'INFANTRY')||has(f,'MOUNTED')))));break;
   case '000009067003':
    if(form.ranged){
     add('Movement','either','during','When the bearer arrives as reinforcements, the unit gains Lethal Hits on its ranged weapons until the end of your next Fight phase.');
     add('Shooting','own','during','If the bearer arrived as reinforcements, apply Lethal Hits to the unit’s ranged weapons through the end of your next Fight phase.');
    }break;
   case '000009079003':
    add('Shooting','own','during','While this bearer is embarked, improve the Ballistic Skill of the carrier’s ranged weapons gained from Firing Deck by 1 for the phase.',roots(cargo.filter(p=>p.passenger===form&&trait(p.carrier.root)?.firingDeck&&cargo.some(x=>x.carrier===p.carrier&&x.passenger.ranged&&(x.passenger===form||modelCount(x.passenger)+modelCount(form)<=(p.carrier.root.unit==='Goliath Truck'?12:6)))).map(p=>p.carrier)));break;
   case '000009084003':add('Charge','opponent','end','Reduce the cost of Heroic Intervention by 1CP when targeting the bearer’s unit.');break;
   case '000009827003':add('Movement','own','end','At the end of your Movement phase, enemy units cannot target the bearer’s unit with Fire Overwatch.');break;
   case '000010900003':if(form.ranged)add('Shooting','own','during','The bearer’s unit gains 2 Strength on its ranged attacks.');break;
   case '000010908003':add('Shooting','opponent','during','The upgraded Neophyte unit has −3″ detection range.');break;
   case '000009075003':add('Fight','either','during','The bearer improves its melee AP and Damage by 1.',equipped);break;
   case '000009071003':attack('The bearer’s unit gains +1 to Hit and +1 to Wound when attacking a Character unit.');break;
   case '000010904003':attack('The bearer’s unit re-rolls Wound rolls of 1.');break;
   case '000009075004':add('Command','either','during','One model in the bearer’s unit regains 1 lost wound.');break;
   // Deeds is applied to the actual Resurgence budget on the Cult Ambush card.
   case '000009071004':break;
   case '000009067004':add('Charge','own','during','Once per battle, when the bearer’s unit declares a charge, add 2 to its Charge rolls for the phase.');break;
   case '000009084004':add('Command','either','during','Every model in the bearer’s unit improves its Leadership and Objective Control by 1.');break;
   case '000009827004':add('Fight','either','during','The Winged Hive Tyrant bearer adds 1 Strength and improves AP by 1 on its own melee weapons.',equipped);break;
   case '000009079004':
    if(knightWeaponCount(bearer,'Cult sniper rifle'))add('Shooting','own','during','After this bearer shoots its cult sniper rifle, select one enemy it hit with that weapon. That enemy suffers −1 to Hit until your next Shooting phase starts.',equipped);break;
   case '000009084005':
    if(form.ranged)add('Movement','opponent','end','An unengaged bearer’s unit targeting one visible eligible enemy within 24″ with Fire Overwatch scores hits on unmodified 5+.');
    break;
   case '000009067005':attack('Models in the bearer’s unit gain +1 to Hit against Character units.');break;
   case '000009079005':
    if(form.ranged&&cargo.some(p=>p.passenger===form))add('Shooting','own','during','After the bearer’s unit disembarks this turn, its ranged attacks may re-roll Hit rolls.');break;
   case '000009827005':if(nids.length)attack('Weapons in the bearer’s unit gain Sustained Hits 1 against enemies within 6″ of a friendly Tyranids unit.');break;
   case '000009071005':add('Charge','own','during','The bearer’s unit can declare a charge after Advancing this turn.');break;
   case '000009075005':
    for(const phase of ['Command','End of your turn','End of opponent turn'] as const)add(phase,phase==='Command'?'either':phase==='End of your turn'?'own':'opponent',phase==='Command'?'during':'end','While an enemy is engaged with the bearer’s unit, reduce each enemy model’s Objective Control by 1, to a minimum of 1.');
    break;
  }
 }
 return rows;
}
