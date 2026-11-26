import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {PHASES} from './engine';
import {knightJoinedBodyguard} from './leader-eligibility';
import {knightWeaponCount} from './imperial-knight-loadouts';
import {KNIGHT_CARD_STATS} from './imperial-knight-weapon-data.generated';
import {equippedWeaponText} from './knight-card-rules';

export function knightHasRangedWeapon(squad:RosterInstance):boolean{
  return KNIGHT_CARD_STATS[squad.unit]?.weapons.some(w=>w.phase==='Shooting'&&knightWeaponCount(squad,w.name)>0)??false;
}

type Timing=GeneratedReminder['timing'];
type Rule={name:string;windows:readonly ReminderWindow[];summary:string; timing?:Timing};
const shooting=['Shooting'] as const, attacks=['Shooting','Fight'] as const, fight=['Fight'] as const;
const movingAndShooting=['Movement','Shooting'] as const;
const duty=(name:string,windows:Rule['windows'],summary:string,timing?:Timing):Rule=>({name,windows,summary,timing});

// These affect the selected Armiger model. The provider's own effect is separate.
const bondsman:Readonly<Record<string,Rule>>={
  'Knight Paladin':duty('Paladin’s Duty',attacks,'Its weapons gain Lethal Hits. Its melee weapons also gain Lance (+1 to Wound after charging).'),
  'Knight Errant':duty('Errant’s Duty',movingAndShooting,'It may re-roll its Advance roll. Its ranged weapons gain Assault, allowing assault shooting after Advancing.'),
  'Knight Warden':duty('Warden’s Duty',attacks,'Its weapons gain Sustained Hits 1 and its ranged weapons also gain Ignores Cover.'),
  'Knight Gallant':duty('Gallant’s Duty',['Charge','Fight'],'It may re-roll its Charge roll and its melee Hit rolls.'),
  'Knight Crusader':duty('Crusader’s Duty',shooting,'Add 1 to Hit rolls for its ranged attacks.'),
  'Knight Preceptor':duty('Mentor',attacks,'Against this Preceptor’s current quarry the selected Armiger may re-roll its Wound rolls.'),
  'Knight Defender':duty('Defender’s Duty',['Movement','Shooting','Fight'],'Subtract 1 from the Damage of each attack allocated to it.'),
  'Cerastus Knight Acheron':duty('Acheron’s Duty',fight,'At the start of either Fight phase, enemy units engaged with any affected models take one Battle-shock test with −1 to the result.','start'),
  'Cerastus Knight Atrapos':duty('Atrapos’ Duty',attacks,'Against a Titanic or Towering model it may re-roll both Hit and Wound rolls.'),
  'Cerastus Knight Castigator':duty('Castigator’s Duty',shooting,'Its ranged weapons gain Sustained Hits 1 and improve their AP by 1.'),
  'Cerastus Knight Lancer':duty('Lancer’s Duty',['Movement','Charge'],'It can declare a charge in a turn in which it Advanced.'),
  'Questoris Knight Magaera':duty('Magaera’s Duty',shooting,'When it shoots the closest eligible target, improve that attack’s Strength and AP by 1.'),
  'Questoris Knight Styrix':duty('Styrix’s Duty',attacks,'After it has shot or fought, select one enemy unit it hit. That enemy takes a Battle-shock test with −1 to the result.')
};

const personal:Readonly<Record<string,Rule[]>>={
  'Knight Paladin':[duty('Seasoned Noble',shooting,'Improve ranged AP by 1 when targeting the closest eligible enemy.')],
  'Knight Errant':[duty('Aggressive Assault',shooting,'Add 1 to ranged Hit rolls against the closest eligible enemy.')],
  'Knight Warden':[duty('Thin Their Ranks',shooting,'Ranged attacks gain Devastating Wounds against units with neither Monster nor Vehicle.')],
  'Knight Gallant':[duty('Martial Pride',fight,'When consolidating, add 3″ to the move if the unit can end engaged with an enemy.')],
  'Knight Crusader':[duty('Punishing Salvoes',movingAndShooting,'If the model remains stationary in your Movement phase, its ranged weapons gain Sustained Hits 1 until your turn ends.')],
  'Knight Preceptor':[duty('Exemplar of the Code',['Pre-battle'],'At the start of the battle, choose an enemy unit as this model’s quarry. When that quarry is destroyed, you may choose a new enemy unit.','start'),duty('Exemplar of the Code',attacks,'This Preceptor may re-roll Wound rolls against its current quarry. When the quarry is destroyed you may replace it.')],
  'Knight Destrier':[duty('Ram Jets',['Movement'],'When selected for a Normal move or Advance, add D3″ to Move for the phase.'),duty('Saturation Fire',shooting,'Ranged attacks ignore cover if the target is within range of an objective.')],
  'Knight Castellan':[duty('Titan Hunter',shooting,'When a ranged attack from this model is allocated to a Monster or Vehicle model, you may re-roll its Damage roll.')],
  'Knight Valiant':[duty('Thundershock',shooting,'In your Shooting phase, when targeting with the thundercoil harpoon, roll once for its target and each other enemy within 6″ of that target. Each 4+ deals D3 mortal wounds to that unit after all attacks against the target resolve.')],
  'Cerastus Knight Acheron':[duty('Searing Flames',shooting,'After this model shoots in your Shooting phase, select an enemy unit hit by its Acheron flame cannon. Deny that unit cover for the rest of the phase.')],
  'Cerastus Knight Atrapos':[duty('Macro-extinction Protocols',attacks,'Add 1 to Hit against Monster or Vehicle units. If that target is also Titanic or Towering, add 1 to Wound.')],
  'Cerastus Knight Castigator':[duty('Storm of Bolts',shooting,'In your Shooting phase, after this model shoots, select a non-Monster, non-Vehicle enemy unit it hit. That enemy takes −1 to Hit until your next turn starts, while this Knight remains on the battlefield.')],
  'Cerastus Knight Lancer':[duty('Shock Charge',['Charge'],'This model may use Crushing Impact for 0 CP, including after another unit used it this phase.')],
  'Questoris Knight Magaera':[duty('Repair Auto-simulacra',['Command'],'At the end of your Command phase this Knight regains up to D3 lost wounds.','end')],
  'Questoris Knight Styrix':[duty('Grav-pinned',shooting,'In your Shooting phase, enemy Infantry hit by this model’s graviton crusher have −2 Move and −2 to Charge rolls until the end of the opponent’s next turn.')],
  'Acastus Knight Porphyrion':[duty('Bastion of Firepower',movingAndShooting,'After remaining stationary, the model’s ranged weapons have Lethal Hits for the rest of the turn.')],
  'Acastus Knight Asterius':[duty('Sunderer of Fortresses',attacks,'Add 1 to Strength and Damage against a Vehicle, or 2 to both against a Fortification instead.')],
  'Armiger Helverin':[duty('Suppression Protocols',shooting,'In your Shooting phase, after shooting, select one non-Monster, non-Vehicle enemy hit by an Armiger autocannon. Its attacks take −1 to Hit until the start of your next turn.')],
  'Armiger Warglaive':[duty('Impetuous Glory',['Charge','Fight'],'If the Warglaive charged this turn, its reaper chain-cleaver gains +1 Attack on strike or +2 Attacks on sweep until turn end.')],
  'Armiger Moirax':[duty('Protection Protocols',['Charge'],'At the end of the enemy Charge phase, this unit can use Heroic Intervention at −1 CP even after another use. Its use leaves other units eligible for that Stratagem.','end')],
  'Canis Rex':[duty('Legendary Freeblade',PHASES,'Once per turn, when your Stratagem targets Canis Rex, you may reduce that use’s CP cost by 1.'),duty('Chainbreaker',PHASES,'Once per battle at the start of either player’s phase, clear Battle-shock from one friendly Imperium unit within 12″ of Canis Rex.','start')],
  'Skitarii Rangers':[duty('Objective Scouted',['Command'],'At the end of your Command phase, an objective you control within range of this unit stays yours until the opponent beats your Level of Control at a phase end.','end')],
  'Skitarii Vanguard':[duty('Rad-saturation (Aura)',PHASES,'Enemy units without the Vehicle keyword within 3″ of this unit subtract 1 from their models’ OC.')],
  'Tech-priest Dominus':[duty('Data-spike',fight,'At the start of either Fight phase choose an enemy Vehicle engaged with this model’s unit. On a 4+ it suffers D6 mortal wounds and worsens its melee Weapon Skill by 1 for the phase.','start')],
};

export function imperialKnightDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
  if(!['Imperial Knights','Adeptus Custodes','Imperial Agents','Astra Militarum'].includes(army.faction))return [];
  const output:GeneratedReminder[]=[];
  const eligible=roster.filter(s=>KNIGHT_CARD_STATS[s.unit]&&s.unit!=='Sir Hekhtur'&&
    (!/^(?:Skitarii|Tech-priest)/.test(s.unit)||army.detachments2026?.includes('Questor Forgepact')));
  const armigers=eligible.filter(s=>s.unit.startsWith('Armiger ')).map(s=>s.id);
  const formations=eligible.filter(s=>!knightJoinedBodyguard(army,s));
  for(const s of eligible){
    const stats=KNIGHT_CARD_STATS[s.unit];
    const body=knightJoinedBodyguard(army,s);
    const root=body??s;
    const formation=[root,...eligible.filter(member=>knightJoinedBodyguard(army,member)?.id===root.id)];
    const emit=(name:string,window:ReminderWindow,summary:string,timing:Timing='during',targets:string[]=[s.id],source=stats.source)=>{
      output.push({id:['11e-knight-card',s.id,name,window].join(':'),title:s.id+' · '+name,window,timing,summary,units:targets,source,origin:'unit'});
    };
    const rule=(r:Rule)=>{for(const window of r.windows)emit(r.name,window,r.summary,r.timing)};
    for(const r of personal[s.unit]??[])rule(r);
    const dutyRule=bondsman[s.unit];
    if(dutyRule&&armigers.length){
      for(const window of dutyRule.windows)emit(dutyRule.name+' (Bondsman)',window,'If affected by this Knight’s Bondsman ability until your next Command phase: '+dutyRule.summary+' Eligible Armigers: '+armigers.join(', ')+'.',dutyRule.timing,armigers);
    }
    if(stats.save){
      const windows:ReminderWindow[]=stats.rangedSave?['Movement','Shooting']:['Movement','Shooting','Fight'];
      for(const window of windows)emit('Invulnerable save',window,'When an eligible '+(stats.rangedSave?'ranged ':'')+'attack is allocated to this model, you may use its '+stats.save+'+ invulnerable save.'+(window==='Movement'?' Applies to incoming shooting reactions.':''));
    }
    if(stats.demise)for(const window of PHASES)emit('Deadly Demise '+stats.demise,window,'When this model is destroyed, after any emergency disembarkation roll D6. On a 6 every unit within 6″ suffers '+stats.demise+' mortal wounds. Roll random damage separately per unit.');
    if(stats.damage)for(const window of ['Command','Shooting','Fight'] as const)emit('Damaged',window,'At 1–'+stats.damage.threshold+' wounds remaining, subtract '+stats.damage.oc+' from this model’s OC and subtract 1 from its Hit rolls.');
    for(const window of ['Movement','Shooting','Fight'] as const){
      const snap=window==='Movement';
      if(snap&&stats.demise&&!s.unit.startsWith('Armiger '))continue;
      const phase=window==='Fight'?'Fight':'Shooting';
      const descriptions=equippedWeaponText(s,stats,phase,snap);
      if(descriptions.length)emit(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles',window,(snap?'When firing Overwatch at the end of the opponent’s Movement phase: ':'')+descriptions,snap?'end':'during');
    }
    if(s.unit==='Knight Destrier'&&knightWeaponCount(s,'Thundershock spear')&&knightWeaponCount(s,'Bellatus reaper chainsword'))emit('Thundercharge','Fight','With both the thundershock spear and bellatus reaper chainsword equipped, add 2 to this model’s melee weapon Attacks.');
    if((s.unit==='Knight Castellan'||s.unit==='Knight Valiant')&&armigers.length)for(const window of movingAndShooting)emit('Ion Aegis (Aura)',window,'An Armiger within 6″ of this model gains cover against ranged attacks. Eligible models: '+armigers.join(', ')+'.','during',armigers);
    if(s.unit==='Knight Defender'){
      const targets=eligible.filter(t=>t.id!==s.id&&!/^(?:Skitarii|Tech-priest)/.test(t.unit)).map(t=>t.id);
      if(targets.length)for(const window of movingAndShooting)emit('Selfless Protector',window,'If at least one attacking model cannot fully see the Imperial Knights model because of this Defender, that target model gets cover and a 4+ invulnerable save against that ranged attack. Eligible models: '+targets.join(', ')+'.','during',targets);
    }
    if(s.unit==='Canis Rex'){
      const pilot=KNIGHT_CARD_STATS['Sir Hekhtur'].source;
      for(const window of PHASES)emit('Sir Hekhtur · emergency disembarkation',window,'If Canis Rex is destroyed, the pilot must make an Emergency Disembarkation. The unit counts as destroyed only when Sir Hekhtur is also destroyed. While the pilot is on foot, only your Core Stratagems may target him.','during',[s.id],pilot);
      for(const window of movingAndShooting)emit('Sir Hekhtur · Lone Operative',window,'If the pilot has disembarked and is alive, enemy models outside 12″ cannot see him or target him with indirect shooting. His pistol can be used for close-quarters shooting.','during',[s.id],pilot);
    }
    if(s.unit==='Skitarii Rangers'&&formation.length===1)emit('Scouts 6″','Pre-battle','In Resolve Pre-battle Abilities, if wholly in your deployment zone Scout up to 6″ and finish more than 8″ horizontally from enemies, or enter your own deployment zone from Strategic Reserves.');
    if(knightWeaponCount(s,'Enhanced data-tether'))for(const window of PHASES)emit('Enhanced data-tether',window,'When a surviving bearer’s unit is targeted by your Stratagem, roll D6. Gain 1 CP on 5+.');
    if(knightWeaponCount(s,'Omnispex'))for(const window of movingAndShooting)emit('Omnispex',window,'While the bearer is alive, ranged weapons in its unit have Ignores Cover. Formation: '+formation.map(m=>m.id).join(', ')+'.','during',formation.map(m=>m.id));
    if(s.unit==='Skitarii Marshal'){
      const targets=formations.filter(f=>f.unit.startsWith('Skitarii ')||eligible.some(m=>m.unit==='Skitarii Marshal'&&knightJoinedBodyguard(army,m)?.id===f.id)).map(f=>f.id);
      for(const window of PHASES)emit('Servo-skull Uplink',window,'Once per battle, at the start of a phase, clear Battle-shock on one friendly Skitarii unit within 6″ of this model. Candidates: '+targets.join(', ')+'.','start',targets);
    }
    if(s.unit==='Tech-priest Manipulus')for(const window of PHASES)emit('Defend the Divine Work',window,'Once per battle at the start of any phase, all models in this unit gain a 4+ invulnerable save until phase end. Unit: '+root.id+'.','start',[root.id]);
    if(body){
      const joined=' This applies while leading '+body.id+'.';
      if(s.unit==='Tech-priest Dominus')for(const window of PHASES)emit('Lord of the Machine Cult',window,'Every model in this formation has Feel No Pain 5+.'+joined,'during',[body.id]);
      if(s.unit==='Tech-priest Manipulus')for(const window of attacks)emit('Galvanic Field',window,'The formation’s weapons have Lethal Hits.'+joined,'during',[body.id]);
      if(s.unit==='Skitarii Marshal')for(const window of attacks)emit('Control Edict',window,'The formation may re-roll its Hit rolls.'+joined,'during',[body.id]);
    }
  }
  return output;
}
