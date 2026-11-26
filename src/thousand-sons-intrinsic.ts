import type {ArmySelection} from './catalog';
import {daemonChangeAndDecay} from './daemon-change-decay';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {THOUSAND_SONS_SHEETS,thousandSonsMusterUnits,thousandSonsKeywords} from './thousand-sons-data';
import {thousandSonsHasRangedWeapon,thousandSonsModelLoadouts,thousandSonsWeaponCount} from './thousand-sons-loadouts';
import {thousandSonsRitualCasters} from './thousand-sons-rituals';
import {thousandSonsFormations,thousandSonsCargoFormations} from './thousand-sons-transports';
import {thousandSonsPsychicWeapons} from './ts-datasheet-core';
import {TS_CARDS} from './ts-profiles.generated';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing'],GeneratedReminder['timing']?];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'];
// Normal arrival/reaction attacks can happen in either player's Movement phase.
// Keep the original own-Movement/end IDs when widening passive defenses.
const incomingMove:Step=['Movement','own','during','end'],incomingArrival:Step=['Movement','opponent','during'];
const rangedDefend=[incoming,incomingMove,shoot,incomingArrival],defend=[incoming,incomingMove,fight,shoot,incomingArrival];
const charge:Step=['Charge','either','during'],eachPhase=PHASES.map((p):Step=>[p,'either','during']);
const sheets=new Map(THOUSAND_SONS_SHEETS.map(s=>[s.unit,s]));
const distinct=(values:string[])=>[...new Set(values)];
const list=(values:string[])=>distinct(values).join(', ');
const weaponBase=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase();

function iconWeapons(army:ArmySelection,members:readonly RosterInstance[]){
 return distinct(members.flatMap(s=>thousandSonsModelLoadouts(s).flatMap(m=>{
  if(thousandSonsKeywords(army,s,m.model).has('CHARACTER'))return [];
  const printed=TS_CARDS[s.unit]?.weapons??[];
  return m.items.filter(i=>printed.some(w=>w.phase==='Shooting'&&weaponBase(w.name)===weaponBase(i)&&!w.abilities.includes('ignores cover'))).map(i=>m.model+' – '+i);
 })));
}

export function thousandSonsIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Thousand Sons')return [];
 const allowed=new Set(thousandSonsMusterUnits(army)),native=roster.filter(s=>allowed.has(s.unit)&&sheets.has(s.unit)&&(s.models??1)>0);
 const groups=thousandSonsFormations(army,roster).filter(g=>g.members.every(m=>allowed.has(m.unit)));
 const groupOf=(s:RosterInstance)=>groups.find(g=>g.members.some(m=>m.id===s.id));
 const declared=expandRoster(army),declaredGroups=thousandSonsFormations(army,declared).filter(g=>g.members.every(m=>allowed.has(m.unit)));
 const sameMember=(start:RosterInstance,current:RosterInstance)=>start.id===current.id&&start.unit===current.unit&&start.attachedTo===current.attachedTo&&start.retinueTo===current.retinueTo&&Boolean(start.keepUnattached)===Boolean(current.keepUnattached);
 // These enemy-targeted effects remember the original source, not a later unit
 // reusing its ID. Validate original joins before looking at current casualties.
 function unchangedSource(source:RosterInstance){
  const original=declaredGroups.find(g=>g.members.some(m=>sameMember(m,source)));
  if(!original||original.root.attachedTo||original.root.retinueTo)return false;
  if(original.members.some(m=>m.retinueTo||(m.attachedTo&&m.keepUnattached)||declared.filter(d=>d.id===m.id).length!==1))return false;
  const ids=new Set(original.members.map(m=>m.id));
  if(declared.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''))))return false;
  for(const member of original.members){
   const current=roster.filter(m=>m.id===member.id);
   if(current.length>1||(current[0]&&!sameMember(member,current[0])))return false;
  }
  return !roster.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??'')));
 }
 const survivingIds=roster.filter(s=>allowed.has(s.unit)&&(s.models??1)>0&&declared.filter(d=>sameMember(d,s)).length===1&&roster.filter(m=>m.id===s.id).length===1).map(s=>s.id);
 function leadingDefence(s:RosterInstance){
  const original=declaredGroups.find(g=>g.root.id!==s.id&&g.members.some(m=>m.id===s.id));
  if(!original||original.members.some(m=>m.retinueTo||m.keepUnattached||declared.filter(d=>d.id===m.id).length!==1))return;
  const ids=new Set(original.members.map(m=>m.id)),survivors:RosterInstance[]=[];
  for(const member of original.members){
   const current=roster.filter(m=>m.id===member.id);
   if(current.length>1)return;
   const live=current[0];
   if(!live)continue;
   if(live.unit!==member.unit||live.attachedTo!==member.attachedTo||live.retinueTo!==member.retinueTo||Boolean(live.keepUnattached)!==Boolean(member.keepUnattached))return;
   if(live.models!==undefined&&live.models<=0)continue;
   survivors.push(live);
  }
  // A surviving original Leader keeps its own while-leading defense (Core
  // 19.04); a different model or a newly joined recipient cannot inherit it.
  if(!survivors.some(m=>m.id===s.id)||roster.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''))))return;
  return {survivors,bodyguardSurvives:survivors.some(m=>m.id===original.root.id)};
 }
 const rootId=(s:RosterInstance)=>groupOf(s)?.root.id??s.id;
 const targets=(...tags:string[])=>groups.filter(g=>{
  const groupTags=new Set(g.members.flatMap(m=>[...thousandSonsKeywords(army,m)]));
  return tags.every(t=>groupTags.has(t));
 }).map(g=>g.root.id);
 const nativePsykers=targets('THOUSAND SONS','PSYKER'),allPsykers=targets('PSYKER'),nativeInfantry=targets('THOUSAND SONS','INFANTRY');
 const casters=thousandSonsRitualCasters(army,roster).filter(s=>thousandSonsKeywords(army,s).has('THOUSAND SONS'));
 const psyGuns=(s:RosterInstance)=>thousandSonsPsychicWeapons(army,s).filter(w=>w.phase==='Shooting');
 const psychicShooters=native.filter(s=>psyGuns(s).some(w=>thousandSonsKeywords(army,s,w.model).has('THOUSAND SONS')));
 const results:GeneratedReminder[]=[];
 for(const squad of native){
  const {unit,id}=squad,group=groupOf(squad);
  if(!group)continue;
  const formation=group.members.map(m=>m.id),leading=group.root.id!==id;
  const hasGun=thousandSonsHasRangedWeapon(squad),groupGuns=group.members.some(thousandSonsHasRangedWeapon);
  function add(title:string,steps:readonly Step[],summary:string,ids=[id]){
   if(!ids.length)return;
   for(const [window,turn,timing,identityTiming=timing] of steps)results.push({id:['11e-ts-card',id,title,window,turn,identityTiming].join(':'),title,window,turn,timing,summary,origin:'unit',units:distinct([id,...ids]),source:sheets.get(unit)!.source});
  }
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary,formation);};
  const ledDefence=(title:string,steps:readonly Step[],summary:string)=>{
   const original=leadingDefence(squad);
   if(original)add(title,steps,summary+(original.bodyguardSurvives?'':' This surviving original Leader retains this benefit after its Bodyguard is destroyed because it started the battle in this legal attached formation.'),original.survivors.map(m=>m.id));
  };
  const fitted=(name:string)=>thousandSonsWeaponCount(squad,name)>0;
  switch(unit){
   case 'Sorcerer':
   case 'Sorcerer In Terminator Armour':
    led('Empyric Guidance',groupGuns?[shoot,fight]:[fight],'While this Sorcerer leads the formation, its weapons have Lethal Hits. Critical Hits automatically wound. Torrent weapons score no Critical Hits.');
    if(unit==='Sorcerer'){
     for(const phase of [shoot,fight]){
      const weapons=thousandSonsPsychicWeapons(army,squad).filter(w=>w.phase===phase[0]).map(w=>w.name);
      if(weapons.length)add('Twisted Sorceries',[phase],'Once per battle, in your Shooting phase or the Fight phase, this Sorcerer can add 3 to the Attacks and Strength of its own Psychic weapons through phase end. Equipped for this phase: '+list(weapons)+'.');
     }
    }else add('Marked by Fate',[['Shooting','own','start']],'Choose one enemy visible to this Sorcerer. Models in its formation add 1 to Hit rolls against that enemy until this Shooting phase ends.',formation);
    break;
   case 'Rubric Marines':{
    add('Bringers of Change',[shoot,snap],'This formation re-rolls ranged Wound rolls of 1. Against a unit within range of an objective marker you do not control, it may instead re-roll the Wound roll.',formation);
    if(fitted('Icon of flame')&&!army.detachments2026?.includes('Chosen Cabal')){
     const weapons=iconWeapons(army,group.members);
     if(weapons.length)add('Icon of Flame',[shoot,snap],'While the Icon bearer survives, the formation’s non-Character models gain Ignores Cover on ranged weapons. Weapons gaining it: '+list(weapons)+'.',group.members.filter(m=>iconWeapons(army,[m]).length).map(m=>m.id));
    }
    break;
   }
   case 'Helbrute':{
    add('Terrifying Assault',hasGun?[shoot,fight]:[fight],'After this Helbrute shoots in your Shooting phase or fights, choose one enemy unit it hit. That unit takes a Battle-shock test.'+(nativePsykers.length?' Subtract 1 if that enemy is within 9″ of one or more of these friendly Thousand Sons Psyker formations.':''),[id,...nativePsykers]);
    const arms=thousandSonsModelLoadouts(squad).flatMap(m=>m.items).filter(i=>['Helbrute fist','Helbrute hammer','Power scourge'].includes(i));
    if(arms.length===2)add('Devoted to Destruction',[fight],'Add 2 Attacks to each of the two fitted melee arms: '+arms.join(' and ')+'. The close combat weapon keeps its printed Attacks.');
    break;
   }
   case 'Chaos Rhino':{
    const cargo=thousandSonsCargoFormations(army,squad,roster);
    const eligible=cargo.flatMap(g=>g.members.filter(m=>psyGuns(m).length).map(m=>({member:m,body:g.root})));
    if(eligible.length)add('Sorcerous Support',[shoot],'After this Rhino shoots, choose an enemy unit it hit. Until phase end, add 1 to Hit and Wound rolls for Psychic Attacks against that enemy made by models that disembarked from this Rhino this turn. Eligible shooters: '+list(eligible.flatMap(({member})=>psyGuns(member).map(w=>member.id+' ('+w.model+' – '+w.name+')')))+'.',eligible.map(e=>e.body.id));
    break;
   }
   case 'Chaos Spawn':
    add('Regenerating Monstrosities',[['Command','either','start']],'At the start of each player’s Command phase, one surviving model in this unit regains up to 3 lost wounds.');break;
   case 'Heldrake':
    if(!unchangedSource(squad))break;
    add('Flame-wreathed',[move],'After this Heldrake ends a Normal move, you may choose one enemy unit it moved over. Models in it cannot receive the Benefit of Cover for the rest of the turn.');
    break;
   case 'Chaos Land Raider':{
    const cargo=thousandSonsCargoFormations(army,squad,roster).map(g=>g.root.id);
    if(cargo.length){
     add('Assault Ramp',[move],'When passengers disembark after this Land Raider makes a Normal move, they Assault Disembark wholly within 3″ and outside Engagement Range. They retain charge eligibility.',cargo);
     add('Assault Ramp',[['Charge','own','during']],'Passengers that Assault Disembarked after this Land Raider made a Normal move can charge this turn.',cargo);
    }break;
   }
   case 'Chaos Predator Destructor':
   case 'Chaos Predator Annihilator':{
    const eligible=distinct([...psychicShooters,...casters].map(rootId));
    if(eligible.length){
     const antiTank=unit.endsWith('Annihilator');
     const effects=antiTank?'against a Monster or Vehicle, re-roll Hit and Damage rolls.':'against a unit that is neither a Monster nor a Vehicle, improve Strength and AP by 1.';
     add(antiTank?'Ensorcelled Annihilation':'Ensorcelled Destruction',[shoot],'If the enemy was already hit this phase by a Psychic Attack from a friendly Thousand Sons Psyker model, this Predator gains a bonus on its ranged attacks: '+effects+(casters.length?' Doombolt from an eligible Thousand Sons Psyker counts as a Psychic Attack.':''),eligible);
    }break;
   }
   case 'Chaos Vindicator':
    add('Siege Shield',[shoot],'Its demolisher cannon can target an enemy engaged with this Vindicator if no other friendly unit is engaged with that enemy. The Vindicator’s ranged attacks ignore its Hit penalty for being engaged.');break;
   case 'Forgefiend':
    if(unchangedSource(squad)&&hasGun)add('Blazing Salvoes',[shoot],'After this Forgefiend shoots in your Shooting phase, choose one enemy unit it hit. That enemy subtracts 1 from all attack Hit rolls until your next turn starts. Fixed snap-shot Hit rolls cannot be modified.');break;
   case 'Maulerfiend':
    add('Snarling Protector · Heroic Intervention',[['Charge','opponent','end']],'Heroic Intervention costs this Maulerfiend 1CP less. Other units can use it in the same phase before or after this use.');
    if(allPsykers.length)add('Snarling Protector · charge',[charge],'When declaring a charge, if an engaged friendly Psyker unit is within 12″, you may re-roll the charge roll. If you use this option, the Maulerfiend must finish engaged with an enemy engaged with that Psyker unit.',allPsykers);break;
   case 'Defiler':
    add('Scuttling Walker',[move],'On a Normal, Advance or Fall Back move the Defiler can pass through terrain and non-Titanic models. It can cross enemy Engagement Range but must finish outside it. It automatically passes Desperate Escape tests.');
    add('Destroyer of Futures',[['Fight','opponent','during']],'Once per phase for this Defiler, in the Fight step of your opponent’s Fight phase after an enemy has resolved its attacks, use Counter-offensive for 1CP less if the Defiler is eligible. It gains Fights First and must be the next unit you select to fight. Other units can use the Stratagem this phase before or after this use.');break;
   case 'Magnus The Red':
    add('Unearthly Power',[['Start of battle round','either','start']],'Choose Impossible Form, Treason of Tzeentch or Time Flux. Magnus has that choice until the next battle round begins.');
    add('Impossible Form',defend,'If chosen this round, subtract 1 from the Damage of each non-Psychic attack against Magnus.');
    add('Treason of Tzeentch',[['Shooting','opponent','start']],'If chosen this round, select one enemy unit within 24″ of Magnus. Its ranged weapons have Hazardous for this phase.');
    add('Time Flux',[move],'If chosen this round, models in friendly Thousand Sons units within 6″ of Magnus add 2″ to their Move characteristic.',targets('THOUSAND SONS'));break;
   case 'Ahriman':
    add('Scryer of Fates',[['Pre-battle','own','end']],'After both armies deploy, redeploy up to three friendly Thousand Sons units. They may go into Strategic Reserves regardless of the number of units already there.',targets('THOUSAND SONS'));break;
   case 'Exalted Sorcerer':
    ledDefence('Arcane Shield',defend,'While this Exalted Sorcerer leads the formation, every model in it has a 4+ invulnerable save.');
    led('Rebind Rubricae',[['Command','own','during']],'While leading, you may roll one D6. On 1 the formation suffers D3 mortal wounds. On 2–5 return one destroyed Bodyguard model. On 6 return up to two destroyed Bodyguard models.');break;
   case 'Tzaangors':{
    const mirage=army.detachments2026?.includes('Warpmeld Pact');
    add('Ambushing Hunters',[['End of opponent turn','opponent','end']],'If this formation is more than 6″ horizontally from every enemy unit, you may remove it from the battlefield and place it into Strategic Reserves.'+(mirage?' When going second, Tzaangors that started on the battlefield and used this ability cannot arrive with Twisted Mirage in your first turn.':''),formation);
    if(fitted('Brayhorn'))add('Brayhorn',[move,charge],'While the Brayhorn bearer survives, you may re-roll Advance and Charge rolls made for this formation.',formation);
    if(fitted('Herd Banner'))add('Herd Banner',eachPhase,'While the banner bearer survives and its unit is within range of an objective marker you control, improve the Leadership of models in this formation by 1.',formation);
    break;
   }
   case 'Scarab Occult Terminators':{
    const psykers=group.members.flatMap(m=>thousandSonsModelLoadouts(m).filter(b=>thousandSonsKeywords(army,m,b.model).has('PSYKER')).map(b=>b.model));
    if(psykers.length)add('Rites of Coalescence',defend,'While any Psyker model in this formation survives ('+list(psykers)+'), subtract 1 from Wound rolls for attacks that target the formation.',formation);break;
   }
   case 'Daemon Prince of Tzeentch':
    if(nativeInfantry.length){
     add('Servile Pawns',rangedDefend,'While within 3″ of a friendly Thousand Sons Infantry unit, this Prince has Lone Operative. Enemy models outside 12″ cannot see it or target it with Indirect Fire.',nativeInfantry);
     add('Glamour of Tzeentch',rangedDefend,'Models in friendly Thousand Sons Infantry units within 6″ of this Prince gain Stealth and receive the Benefit of Cover against ranged attacks.',nativeInfantry);
    }break;
   case 'Tzaangor Shaman':
    led('Bestial Prophet',groupGuns?[shoot,fight]:[fight],'While this Shaman leads the formation, add 1 to its models’ attack Hit rolls.');
    if(leading)for(const phase of [shoot,fight]){
     const weapons=thousandSonsPsychicWeapons(army,squad).filter(w=>w.phase===phase[0]).map(w=>w.name);
     if(weapons.length)add('Sacrificial Blessing',[phase],'When the formation is selected to attack, you may destroy one of its Bodyguard models. This Shaman adds D3 to the Attacks and Strength of its own Psychic weapons until phase end: '+list(weapons)+'.',formation);
    }break;
   case 'Tzaangor Enlightened':
    add('Prophesied Doom',[charge],'After this formation ends a charge, choose one engaged enemy unit. Roll one D6 per model in this formation within Engagement Range of that enemy. Each 4+ deals one mortal wound.',formation);break;
   case 'Mutalith Vortex Beast':
    add('Mutating Vortex',[['Movement','own','end']],'Roll one D6 for each enemy unit within 6″. On 2–3 it suffers 1 mortal wound, on 4–5 it suffers D3, and on 6 it suffers D6. Every enemy unit within 6″ then tests Battle-shock, including on a roll of 1.');break;
   case 'Infernal Master':
    led('Malefic Maelstrom',groupGuns?[shoot,fight]:[fight],'While this Infernal Master leads the formation, its weapons have Sustained Hits 1. Critical Hits score one additional hit. Torrent weapons score no Critical Hits.');
    add('Glimpse of Eternity',[shoot,snap,incoming,incomingMove,fight],'Once per turn, change one Hit roll, Wound roll or saving throw made for this Infernal Master to an unmodified 6. All three roll types share that use.');
    add('Glimpse of Eternity',[incomingArrival],'When an enemy makes a permitted arrival or reaction attack during its Movement phase, once per turn change one saving throw made for this Infernal Master to an unmodified 6. This shares its use with changing this model’s Hit or Wound roll, including when it fires Overwatch later this phase.');break;
   case 'Exalted Sorcerer on Disc of Tzeentch':
    ledDefence('Illusions of Tzeentch',rangedDefend,'While this Sorcerer leads the formation, an attacking model can target the formation with a ranged attack only from within 18″.');
    if(unchangedSource(squad)&&fitted('Arcane Fire'))add('Binding Tendrils',[shoot],'After this Sorcerer shoots in your Shooting phase, choose one enemy Infantry unit hit by its own Arcane Fire. Its Move is reduced by 2″ and its Charge rolls by 2 until your next turn starts.');break;
   case 'Daemon Prince of Tzeentch with Wings':{
    const healing=' If this Prince destroys a Character unit, it regains up to D3 lost wounds, or up to 3 if that unit was also a Psyker.';
    add('Hunter of Souls',[shoot,fight],'Against a Character unit, re-roll Hit and Wound rolls of 1. Against a Psyker Character unit, you may instead re-roll Hit and Wound rolls.'+healing);
    add('Hunter of Souls',[snap],'Re-roll Wound rolls of 1 against a Character unit, or any Wound roll against a Psyker Character unit, when firing Overwatch.'+healing);
    add('Aetherstride',[move],'When arriving by Deep Strike in your Movement phase, you may set up more than 6″ horizontally from all enemies. If you do, Dark Blessing gains Sustained Hits D3 and this Prince cannot charge until turn end.');
    add('Aetherstride',[shoot],'If the Prince used Aetherstride this turn, its Dark Blessing has Sustained Hits D3.');
    add('Aetherstride',[['Charge','own','during']],'The Prince cannot declare a charge if it used Aetherstride this turn.');break;
   }
   case 'Sekhetar Robots':
    add('Prophetic Sentinels',[snap,['Charge','opponent','end']],'Once per turn, reduce the cost of Fire Overwatch or Heroic Intervention targeting this unit by 1CP. The two Stratagems share this discount.');break;
   case 'Tzaangor Enlightened with Fatecaster Greatbows':
    add('Malign Trickery',[['Movement','opponent','during']],'After an enemy unit ends any move within 8″, if this formation is unengaged, it may make a Normal move of up to D6″.',formation);break;
   case 'Lord of Change':{
    const allies=groups.filter(g=>g.members.some(m=>thousandSonsKeywords(army,m).has('SCINTILLATING LEGIONS')&&thousandSonsHasRangedWeapon(m))).map(g=>g.root.id);
    add('Daemon Lord of Tzeentch',[shoot,snap],'Friendly Scintillating Legions units within 6″ of this Lord of Change add 1 Strength to their models’ ranged attacks.',allies);
    add('Master of Magicks',[shoot],'Choose Ignores Cover, Lethal Hits or Sustained Hits D3 for this model’s Bolt of Change until this Shooting phase ends.');break;
   }
   case 'Kairos Fateweaver':case 'Screamers':case 'Flamers':case 'Blue Horrors':case 'Pink Horrors':
    daemonChangeAndDecay({army,squad,roster:native,formationId:rootId,god:()=>'Tzeentch',add:(name,window,turn,timing,summary,ids)=>{
     if(name!=='Split models · weapons')add(name,[[window,turn,timing]],summary,ids);
    }});
    if(unit==='Pink Horrors'){
     if(fitted('Daemonic icon'))add('Daemonic Icon',eachPhase,'While this Icon bearer survives, models in its unit have Leadership 6+.');
     if(fitted('Instrument of Chaos'))add('Instrument of Chaos',[charge],'While the Instrument bearer survives, add 1 to this unit’s Charge rolls.');
    }break;
  }
 }
 // The reproduced Appendix 01.02.02 and each card's stated duration preserve
 // these selected enemy effects; the cards impose no source-survival condition.
 // Keep old follow-up IDs and source-only roster labels (both form saved sheet
 // keys), while separating new rows from activation checkmarks.
 for(const source of declared.filter(s=>allowed.has(s.unit)&&sheets.has(s.unit)&&(s.models??1)>0&&unchangedSource(s))){
  const add=(title:string,steps:readonly Step[],summary:string,legacy:(step:Step)=>boolean=()=>false)=>{
   if(!survivingIds.length)return;
   for(const step of steps){
    const [window,turn,timing]=step;
    results.push({id:[legacy(step)?'11e-ts-card':'11e-ts-lasting',source.id,title,window,turn,timing].join(':'),title:title+' · '+(title==='Blazing Salvoes'?'suppressed enemy':title==='Binding Tendrils'?'ensnared enemy':'exposed enemy'),window,turn,timing,summary,origin:'unit',units:[source.id],source:sheets.get(source.unit)!.source});
   }
  };
  if(source.unit==='Forgefiend'&&thousandSonsHasRangedWeapon(source))add('Blazing Salvoes',[shoot,incomingArrival,incoming,fight],
   'Only if this Forgefiend already suppressed an enemy after hitting it in your Shooting phase, subtract 1 from that enemy’s attack Hit rolls, including permitted normal arrival or return-fire attacks against any friendly unit. The effect expires at the start of your next turn, even if the Forgefiend is destroyed. Fixed snap-shot Hit rolls cannot be modified.',
   ([window,turn])=>window==='Fight'||window==='Shooting'&&turn==='opponent');
  if(source.unit==='Exalted Sorcerer on Disc of Tzeentch'&&thousandSonsWeaponCount(source,'Arcane Fire')>0)add('Binding Tendrils',
   [shoot,['Charge','own','during'],fight,incomingArrival,incoming,['Charge','opponent','during']],
   'Only the enemy Infantry unit already hit by this Sorcerer’s own Arcane Fire and selected in your Shooting phase is ensnared: subtract 2″ from its Move characteristic and 2 from its Charge rolls until the start of your next turn, even if the Sorcerer is destroyed. Apply the Move penalty when a move uses that characteristic; it does not shorten fixed-distance moves, Pile In or Consolidation moves.',
   ([window,turn])=>turn==='opponent'&&(window==='Movement'||window==='Charge'));
  if(source.unit==='Heldrake')add('Flame-wreathed',[move,shoot],
   'Only the enemy already chosen after this Heldrake flew over it during a Normal move loses the Benefit of Cover for the rest of that turn, even if the Heldrake is destroyed. Apply this to permitted ranged attacks later in the same Movement phase as well as Shooting; the effect ends before the next turn.',
   ([window])=>window==='Shooting');
 }
 return results;
}
