import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightWeaponCount} from './knight-loadouts';
import {equippedWeaponText} from './knight-card-rules';
import {knightJoinedBodyguard} from './leader-eligibility';
import {KNIGHT_CARD_STATS as cards} from './shadow-marine-card-data.generated';
import {daemonKeywords} from './chaos-daemons-data';
import type {RosterInstance} from './roster-instances';

export function shadowLegionHasRangedWeapon(s:RosterInstance):boolean {
 return cards[s.unit]?.weapons.some(w=>w.phase==='Shooting'&&knightWeaponCount(s,w.name)>0)??false;
}

export function shadowMarineReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[] {
 if(army.faction!=='Chaos Daemons'||!army.detachments2026?.includes('Shadow Legion'))return [];
 const marines=roster.filter(s=>cards[s.unit]);
 const joined=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id??s.id]));
 const unit=(s:RosterInstance)=>joined.get(s.id)??s.id;
 const heretics=[...new Set(roster.filter(s=>daemonKeywords(army,s).has('HERETIC ASTARTES')).map(unit))];
 const lords=marines.filter(s=>['Chaos Lord','Chaos Lord In Terminator Armour','Chaos Lord with Jump Pack'].includes(s.unit));
 const sorcerers=marines.filter(s=>s.unit==='Sorcerer In Terminator Armour');
 const out:GeneratedReminder[]=[];
 for(const s of marines){
  const source=cards[s.unit].source,formation=unit(s),members=roster.filter(m=>unit(m)===formation),attached=formation!==s.id,body=[formation],bearer=[s.id];
  const armed=members.some(shadowLegionHasRangedWeapon);
  function add(name:string,window:ReminderWindow,turn:NonNullable<GeneratedReminder['turn']>,timing:GeneratedReminder['timing'],summary:string,units=bearer){
   if(units.length)out.push({id:['11e-shadow-marine',s.id,name,window,turn].join(':'),title:s.id+' · '+name,source,window,turn,timing,summary,units,origin:'unit'});
  }
  for(const phase of ['Movement','Shooting','Fight'] as const){
   const snap=phase==='Movement',stats=cards[s.unit];
   const text=equippedWeaponText(s,stats,phase==='Fight'?'Fight':'Shooting',snap);
   if(text)add(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles',phase,snap?'opponent':phase==='Fight'?'either':'own',snap?'end':'during',(snap?'Fire Overwatch using snap shooting. ':'')+text);
   if(stats.save)add('Invulnerable save',phase,'either','during','Models from this datasheet have a '+stats.save+'+ invulnerable save. Attached models use their own saves.');
  }
  if(knightWeaponCount(s,'Chaos icon')>0){
   for(const phase of ['Movement','Shooting','Fight'] as const){
    if(phase!=='Fight'&&!armed)continue;
    const icon=s.knightGear?.['Chaos icon bearer'];
    add('Chaos Icon',phase,phase==='Movement'?'opponent':'either','during','While the icon bearer survives'+(icon?' ('+icon+')':'')+', this formation may re-roll the Leadership test it takes to make a Dark Pact.',body);
   }
  }
  if(lords[0]?.id===s.id){
   const targets=[...new Set(lords.map(unit))];
   for(const phase of PHASES)add('Lord of Chaos',phase,'either','during','Once per battle round across your army, when a Lord of Chaos unit is targeted by a Stratagem, it may reduce that use’s cost by 1CP.',targets);
  }
  switch(s.unit){
   case 'Chaos Lord':
    add('Chance for Glory','Fight','either','start','Once per battle, increase the Strength, Attacks, AP and Damage of this Lord’s melee weapons by 1 until this phase ends.');
    break;
   case 'Chaos Lord In Terminator Armour':
    for(const phase of ['Movement','Shooting','Fight'] as const)add('Formidably Resilient',phase,'either','during','Halve the Damage characteristic of each attack allocated to this Lord. Round fractions up.');
    break;
   case 'Chaos Lord with Jump Pack':
    if(attached)add('Cruel Hunter','Fight','either','during','While this Lord leads the formation, its models may pile in and consolidate up to 6″.',body);
    break;
   case 'Dark Apostle':
    if(attached)add('Dark Zealotry','Fight','either','during','While this unit leads the formation and its Dark Apostle model survives, add 1 to its models’ melee Wound rolls.',body);
    for(const phase of PHASES)add('Demagogue',phase,'either','start','Once per battle, choose one battle-shocked friendly Heretic Astartes unit within 12″ of this unit’s surviving Dark Apostle model. Clear its Battle-shock.',heretics);
    add('Malign Sacrifice','Fight','either','start','If a Dark Disciple remains, choose one Disciple and one enemy engaged with this unit. Roll a D6. On 2–5 that enemy suffers one mortal wound, on 6 it suffers D3. Then destroy the selected Disciple.');
    break;
   case 'Sorcerer':
    if(attached)for(const phase of ['Shooting','Fight'] as const)add('Prescience (Psychic)',phase,'either','during','While the Sorcerer leads this formation, subtract 1 from Hit rolls for attacks that target it.',body);
    for(const phase of ['Movement','Shooting','Fight'] as const)add('Gift of Chaos (Psychic)',phase,phase==='Movement'?'opponent':'either',phase==='Movement'?'end':'during','After this Sorcerer resolves its attacks, choose one enemy hit by one or more of its Psychic attacks. That enemy takes a Leadership test and suffers D3 mortal wounds on failure.');
    break;
   case 'Sorcerer In Terminator Armour':
    if(knightWeaponCount(s,'Chaos familiar'))for(const phase of ['Movement','Shooting','Fight'] as const)add('Chaos Familiar',phase,'either','during','Once per battle when an attack is allocated to this bearer, you may change its Damage characteristic to 0.');
    if(attached)for(const phase of ['Movement','Charge'] as const)add('Warptime (Psychic)',phase,phase==='Movement'?'own':'either','during','While this Sorcerer leads the formation, it can re-roll its Advance and Charge rolls.',body);
    if(sorcerers[0]?.id===s.id){
     const users=sorcerers.map(m=>m.id);
     add('Death Hex (Psychic)','Shooting','own','start','One Psyker with this ability may choose one visible enemy within 12″ and roll a D6. On 1, that Psyker’s unit suffers D3 mortal wounds. On 2+, improve AP by 1 for attacks against the chosen enemy until the start of your next Movement phase.',users);
     for(const phase of ['Movement','Shooting','Fight'] as const)add('Death Hex · marked target',phase,phase==='Fight'?'either':'opponent','during','If Death Hex succeeded, attacks against its marked enemy improve AP by 1. The mark expires at the start of your next Movement phase.',users);
    }
    break;
   case 'Master Of Possession':
    if(attached)for(const phase of ['Movement','Charge'] as const)add('Daemonkin (Psychic)',phase,phase==='Movement'?'own':'either','during','While this model leads the formation, add 1 to its Advance and Charge rolls.',body);
    for(const phase of ['Movement','Shooting','Fight'] as const)add('Sacrificial Dagger',phase,phase==='Movement'?'opponent':'either',phase==='Movement'?'end':'during','Once per phase when this model is selected to shoot or fight, its unit can suffer one mortal wound. This model then adds 1 to Hit and Wound rolls for its Psychic attacks until phase end.'+(phase==='Movement'?' Its snap shots use unmodified Hit rolls.':''));
    break;
   case 'Chaos Terminator Squad':
    for(const phase of ['Shooting','Fight'] as const)add('Despoilers',phase,phase==='Shooting'?'own':'either','during','After making a Dark Pact, models in this formation may re-roll Hit rolls for the rest of the phase.',body);
    break;
   case 'Chosen':
    for(const phase of ['Movement','Shooting','Charge'] as const)add('Chosen Marauders',phase,'own','during','This formation can shoot and declare a charge in a turn in which it Advanced or Fell Back.',body);
    break;
   case 'Possessed':
    for(const phase of ['Movement','Shooting','Fight'] as const){
     if(phase!=='Fight'&&!armed)continue;
     add('Unholy Bloodshed',phase,phase==='Movement'?'opponent':'either',phase==='Movement'?'end':'during','Once per battle, when this formation makes a Dark Pact, its models’ weapons gain Devastating Wounds for the rest of the phase.',body);
    }
    break;
   case 'Raptors':
    for(const phase of PHASES)add('Fearsome (Aura)',phase,'either','during','An enemy unit within 6″ subtracts 1 from its Battle-shock and Leadership test results.',body);
    add('Terrifying Assault','Fight','either','start','Each enemy engaged with one or more units with this ability must take a Battle-shock test.',body);
    break;
   case 'Warp Talons':
    add('Warp Strike','Fight','either','end','If this unit destroyed at least one enemy unit this phase and is now unengaged, you may remove it from the battlefield and place it in Strategic Reserves.',body);
    break;
   case 'Havocs':
    add('Stabilisation Talons','Shooting','own','during','When a model in this formation makes a ranged attack, you may ignore any or all modifiers to its Ballistic Skill and Hit roll.',body);
    break;
   case 'Legionaries':
    add('Veterans of the Long War','Fight','either','during','Models in this formation re-roll melee Wound rolls of 1. Against an enemy unit within range of an objective marker, you can re-roll any melee Wound roll instead.',body);
    break;
  }
 }
 return out;
}
