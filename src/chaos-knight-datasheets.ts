import {isDreadblade} from './dreadblade-allies';
import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder, ReminderWindow} from './generated-reminders';
import {PHASES} from './engine';
import {chaosKnightMusterUnits, CHAOS_KNIGHT_SHEETS} from './chaos-knights-data';
import {daemonMusterUnits} from './chaos-daemons-data';
import {resolvedWarDogCharacterIds,walkerText} from './chaos-knight-detachments';
import {knightJoinedBodyguard} from './leader-eligibility';
import {knightWeaponCount} from './knight-loadouts';
import {equippedWeaponText} from './knight-card-rules';
import {KNIGHT_CARD_STATS} from './chaos-knight-weapon-data.generated';

const traits=new Map(CHAOS_KNIGHT_SHEETS.map(sheet=>[sheet.unit,new Set(sheet.keywords)]));
const hasKeyword=(s:RosterInstance,keyword:string)=>traits.get(s.unit)?.has(keyword)??false;
export function chaosKnightHasRangedWeapon(squad:RosterInstance):boolean {
  return KNIGHT_CARD_STATS[squad.unit]?.weapons.some(w=>w.phase==='Shooting'&&knightWeaponCount(squad,w.name)>0)??false;
}

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Stage={window:ReminderWindow;turn:Turn;timing:Timing};
const stage=(window:ReminderWindow,turn:Turn,timing:Timing='during'):Stage=>({window,turn,timing});
const shoot=stage('Shooting','own'),fight=stage('Fight','either'),move=stage('Movement','own'),charge=stage('Charge','own');
const snap=stage('Movement','opponent','end'),incoming=stage('Shooting','opponent');
const pre=stage('Pre-battle','either'),command=stage('Command','own'),commandEnd=stage('Command','own','end');
const everyPhase=PHASES.map(window=>stage(window,'either'));
const attacks=[shoot,fight],allDogAttacks=[...attacks,snap];
const defendRanged=[incoming,stage('Movement','own','end')];
interface Effect {name:string;stages:readonly Stage[];text:string}
const effect=(name:string,stages:readonly Stage[],text:string):Effect=>({name,stages,text});

const personal:Readonly<Record<string,readonly Effect[]>>={
  'Chaos Cerastus Knight Acheron':[effect('Searing Flames',[shoot],'After this Knight shoots in your Shooting phase, select one enemy hit by its Acheron flame cannon. That unit loses the Benefit of Cover for the rest of the phase.')],
  'Chaos Cerastus Knight Lancer':[effect('Shock Charge',[charge],'After this Knight finishes a charge in your Charge phase, use Crushing Impact on it for 0 CP, even if another unit already used the Stratagem this phase.')],
  'Chaos Cerastus Knight Castigator':[effect('Storm of Bolts',[shoot],'After shooting in your Shooting phase, select one enemy unit hit that is neither a Monster nor a Vehicle. Its attacks take −1 to Hit until your next turn starts, while this Castigator remains on the battlefield.')],
  'Chaos Cerastus Knight Atrapos':[effect('Macro-extinction Protocols',attacks,'Add 1 to Hit against a Monster or Vehicle unit. If that target is also Titanic or Towering, add 1 to Wound.')],
  'Chaos Questoris Knight Magaera':[effect('Repair Auto-simulacra',[commandEnd],'At the end of your Command phase, restore up to D3 lost wounds to this model.')],
  'Chaos Acastus Knight Porphyrion':[effect('Bastion of Firepower',[move,shoot],'If this model Remains Stationary, its ranged weapons gain Lethal Hits until the end of the turn.')],
  'Chaos Acastus Knight Asterius':[effect('Sunderer of Fortresses',attacks,'Against a Vehicle, increase this attack’s Strength and Damage by 1. Against a Fortification, increase both by 2 instead.')],
  'Knight Despoiler':[effect('Seething Hatred',attacks,'Each time this model is selected to shoot or fight, it may re-roll one Hit roll or one Wound roll across those attacks.')],
  'Knight Tyrant':[effect('Bastion of Corruption',[pre,stage('Movement','either')],'Enemy Reinforcements cannot be set up within 12″ of this model, including when using Rapid Ingress.')],
  'Knight Desecrator':[effect('Obsessive Ruthlessness',[shoot],'When making ranged attacks against a Monster or Vehicle unit, this model may ignore modifiers to its Ballistic Skill, Hit rolls and Wound rolls.')],
  'Knight Rampager':[effect('Bloodlust',[stage('Charge','either'),fight],'If this model makes a Charge move, its melee weapons gain Devastating Wounds for the rest of the turn.')],
  'War Dog Moirax':[effect('Protection Protocols',[stage('Charge','opponent','end')],'At the end of the opponent’s Charge phase, Heroic Intervention costs 1 CP less for this unit. The other targeting conditions apply. Another unit may use it this phase before or after this model.')],
  'War Dog Executioner':[effect('Executioner',attacks,'Against a unit below half-strength, add 1 to Hit. When this model destroys an enemy unit, before removing its last model, every other enemy unit within 3″ of it takes a Battle-shock test.'),effect('Executioner',[snap],'If this model’s snap shooting destroys an enemy unit, every other enemy unit within 3″ of its last model takes a Battle-shock test before that model is removed.')],
  'War Dog Stalker':[effect('Stalker',allDogAttacks,'Add 1 to Wound if the target has no other unit from its army within 6″ of it.')],
  'War Dog Karnivore':[effect('Karnivore',[move,stage('Charge','either')],'You may re-roll this model’s Advance rolls and Charge rolls.')],
  'War Dog Brigand':[effect('Brigand',[shoot,snap],'Ranged attacks against a unit within range of any objective marker gain Ignores Cover.')],
  'War Dog Huntsman':[effect('Huntsman',allDogAttacks,'You may re-roll Wound rolls against Monster or Vehicle units.')],
  'Knight Abominant':[effect('Vortex Terrors (Psychic)',[stage('Shooting','own','start')],'At the start of your Shooting phase, select one visible enemy within 24″. It takes a Battle-shock test.')],
  'Knight Ruinator':[effect('Methodical Destruction',[stage('Start of battle round','either','start')],'At the start of the first battle round, choose one enemy unit as this model’s victim.'),effect('Methodical Destruction',attacks,'Re-roll this model’s Wound rolls against its current victim. Whenever that victim is destroyed, choose a new enemy unit as the victim.'),effect('Methodical Destruction · new victim',everyPhase.filter(s=>s.window!=='Shooting'&&s.window!=='Fight'),'If this model’s current victim is destroyed, choose a new enemy victim immediately.')],
  'Cultist Firebrand':[effect('Cursed Flames',[shoot],'After this model shoots in your Shooting phase, one enemy Infantry unit it hit must take a Battle-shock test.')],
  'Cultist Mob':[effect('For the Dark Gods',[commandEnd],'If this unit is in range of an objective you control at the end of your Command phase, retain control until the opponent’s Level of Control exceeds yours at a phase end.')],
  'Fellgor Beastmen':[effect('Bestial Raiders',[pre,move],'If this unit starts in Strategic Reserves, it can arrive during your first, second or third Reinforcements step despite mission restrictions. For its Strategic Reserves set-up, count the current round as one higher.')],
  'Traitor Guardsmen Squad':[effect('Twisted Defence Force',defendRanged,'While this unit is within range of an objective marker, improve its Save characteristic by 1 against ranged attacks.')],
};

type Aura={distance:number;effect:Effect};
const aura=(distance:number,name:string,stages:readonly Stage[],text:string):Aura=>({distance,effect:effect(name+' (Aura)',stages,text)});
const auras:Readonly<Record<string,Aura>>={
  'Chaos Cerastus Knight Acheron':aura(6,'Unrestrained Terror',[stage('Fight','either','start')],'At the start of either Fight phase, each enemy unit engaged with one or more affected units takes one Battle-shock test.'),
  'Chaos Cerastus Knight Lancer':aura(6,'Dark Fervour',[move,shoot],'Affected models’ ranged weapons have Assault, allowing assault shooting after an Advance.'),
  'Chaos Cerastus Knight Castigator':aura(6,'Offerings for the Dark Gods',[shoot],'Affected models’ ranged weapons gain Sustained Hits 1.'),
  'Chaos Cerastus Knight Atrapos':aura(6,'Consumed with Hunger',attacks,'Affected models may re-roll Hit rolls against Titanic or Towering targets.'),
  'Chaos Questoris Knight Magaera':aura(6,'Huntmaster',[move,shoot],'Affected models’ ranged weapons have Assault, allowing assault shooting after an Advance.'),
  'Chaos Questoris Knight Styrix':aura(6,'Preysight',[shoot,snap],'Affected models’ ranged weapons gain Ignores Cover.'),
  'Knight Despoiler':aura(9,'Dread Dominion',everyPhase,'Improve each affected model’s Leadership and OC by 1.'),
  'Knight Tyrant':aura(6,'Infernal Aegis',defendRanged,'Models in the affected War Dog unit have the Benefit of Cover against incoming attacks.'),
  'Knight Desecrator':aura(9,'Taskmaster',[shoot],'Affected models re-roll ranged Hit rolls of 1.'),
  'Knight Rampager':aura(9,'Frenzied Rampage',[fight],'Affected models re-roll melee Hit rolls of 1.'),
  'Knight Ruinator':aura(9,'Close-range Killers',allDogAttacks,'When attacking the closest eligible target, improve the affected model’s attack AP by 1.'),
};

const scout='During Resolve Pre-battle Abilities, if wholly in your deployment zone Scout up to 6″ and finish more than 8″ horizontally from enemies. From Strategic Reserves, you may instead enter wholly within your deployment zone.';
export function chaosKnightDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[] {
  const knightHost=['World Eaters','Emperor’s Children','Thousand Sons'].includes(army.faction);
  const dreadblades=army.faction==='Chaos Daemons'||knightHost;
  if(!dreadblades&&army.faction!=='Chaos Knights')return [];
  const supported=knightHost?undefined:new Set(army.faction==='Chaos Daemons'?daemonMusterUnits(army):chaosKnightMusterUnits(army));
  const eligible=roster.filter(s=>(supported?supported.has(s.unit):isDreadblade(s.unit))&&KNIGHT_CARD_STATS[s.unit]);
  const dogs=eligible.filter(s=>hasKeyword(s,'WAR DOG'));
  const helhunt=army.detachments2026?.includes('Helhunt Lance');
  const promoted=new Set(resolvedWarDogCharacterIds(army,eligible));
  const result:GeneratedReminder[]=[];
  for(const squad of eligible){
    const {id,unit}=squad,stats=KNIGHT_CARD_STATS[unit];
    const body=knightJoinedBodyguard(army,squad);
    const attached=eligible.filter(s=>knightJoinedBodyguard(army,s)?.id===id);
    const formation=body?.id??id;
    function add(name:string,when:Stage,summary:string,units:string[]=[id]){
      result.push({id:['11e-chaos-knight-card',id,name,when.window,when.turn].join(':'),title:id+' · '+name,...when,summary,units,source:stats.source,origin:'unit'});
    }
    for(const rule of personal[unit]??[])for(const when of rule.stages)add(rule.name,when,rule.text);
    if(stats.save){
      const owner=stats.saveBearer?'the '+stats.saveBearer+' model only':'this model';
      for(const when of stats.rangedSave?defendRanged:[...defendRanged,fight]){
        add('Invulnerable save',when,'When a '+(stats.rangedSave?'ranged ':'')+'attack is allocated to '+owner+', you may use its '+stats.save+'+ invulnerable save.');
      }
    }
    if(stats.demise)for(const when of everyPhase)add('Deadly Demise '+stats.demise,when,'On destruction roll D6 after any required emergency disembarkation. On a 6 each unit within 6″ suffers '+stats.demise+' mortal wounds. Determine random damage separately for each affected unit.');
    if(stats.damage)for(const when of everyPhase)add('Damaged',when,'At 1–'+stats.damage.threshold+' wounds remaining, subtract '+stats.damage.oc+' from this model’s Objective Control and 1 from its Hit rolls.');
    for(const when of [shoot,fight,snap]){
      if(when===snap&&hasKeyword(squad,'TITANIC'))continue;
      const phase=when===fight?'Fight':'Shooting';
      const text=equippedWeaponText(squad,stats,phase,when===snap);
      if(text)add(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles',when,(when===snap?'When firing Overwatch: ':'')+text);
    }
    if(dreadblades&&hasKeyword(squad,'TITANIC'))add('Super-heavy Walker',move,walkerText);
    // Dreadblades may bring one Titanic Knight or up to three War Dogs, never both.
    const grant=dreadblades?undefined:auras[unit];
    if(grant){
      const extras=helhunt&&(army.upgrades2026?.[id]??army.upgrades2026?.[unit])==='Throne Tyrannicus'
        ?eligible.filter(s=>s.id!==id&&hasKeyword(s,'CHAOS KNIGHTS')&&(hasKeyword(s,'CHARACTER')||promoted.has(s.id))):[];
      const self=helhunt&&dogs.length>=2;
      const rule=grant.effect;
      for(const when of rule.stages){
        const snapAttack=when===snap;
        const eligibleExtras=extras.filter(s=>!snapAttack||!hasKeyword(s,'TITANIC'));
        const recipients=[...dogs,...(self&&!snapAttack?[squad]:[]),...eligibleExtras];
        if(!recipients.length)continue;
        let text=rule.text;
        if(dogs.length)text+=' Applies to friendly War Dogs within '+grant.distance+'″ of '+id+': '+dogs.map(s=>s.id).join(', ')+'.';
        if(self&&!snapAttack)text+=' If at least two War Dogs are within this aura, Masters of the Pack also applies it to '+id+'.';
        if(eligibleExtras.length)text+=' Throne Tyrannicus can share this aura with one other Character selected within 9″ during your Command phase, until your next Command phase: '+eligibleExtras.map(s=>s.id).join(', ')+'.';
        add(rule.name,when,text,[...new Set(recipients.map(s=>s.id))]);
      }
    }
    if(unit==='Chaos Questoris Knight Styrix'&&knightWeaponCount(squad,'Graviton crusher'))add('Grav-pinned',shoot,'After shooting in your Shooting phase, enemy Infantry hit by this model’s graviton crusher take −2 Move and −2 to Charge rolls through the end of your opponent’s next turn.');
    if(unit==='Knight Abominant'&&eligible.find(s=>s.unit===unit)?.id===id){
      const bearers=eligible.filter(s=>s.unit===unit).map(s=>s.id);
      add('Warp Storms (Psychic)',stage('Movement','own','end'),'At the end of your Movement phase, roll once per enemy unit within 9″ of any of these models. On 3+ that enemy suffers D3 mortal wounds, regardless of how many Abominants are in range. Bearers: '+bearers.join(', ')+'.',bearers);
    }
    if(unit==='War Dog Stalker'||unit==='Accursed Cultists'&&!attached.length)add('Scouts 6″',pre,scout);
    if(unit==='Accursed Cultists'){
      for(const when of everyPhase)add('Feel No Pain 6+',when,'When an Accursed Cultists model would lose a wound, roll a D6. On 6 it keeps that wound. This applies to the Mutants and Torments.');
      add('Howling Horde',incoming,'After an enemy shoots in its Shooting phase and destroys a model in this formation, the unit may surge up to D6″ if unengaged, unshocked and it has not moved this phase. Move each model into engagement with the closest enemy if possible, otherwise as close as possible. End clear of every other enemy and do not move again this phase.');
    }
    if(unit==='Cultist Firebrand'&&body)for(const when of everyPhase)add('Fiery Faith',when,'While leading '+formation+', this formation may re-roll Leadership tests.',[formation]);
    if(unit==='Dark Commune'){
      if(dreadblades&&army.detachments2026?.includes('Shadow Legion')&&knightWeaponCount(squad,'Chaos icon')){
        for(const when of [shoot,snap,fight])add('Chaos Icon',when,'While the Iconarch and its Chaos icon survive, '+formation+' may re-roll its Leadership test for Dark Pacts.',[formation]);
      }
      if(body)for(const when of [...defendRanged,fight])add('Faithful Flock',when,'While the Cult Demagogue is alive and this unit leads '+formation+', every model in that formation has a 5+ invulnerable save.',[formation]);
      for(const when of [command,move,shoot,charge,stage('Fight','own')])add('Dark Ritual',when,'Once per battle in your Command phase, if the Cult Demagogue survives, invoke the ritual. Until your turn ends '+formation+' may charge after an Advance and adds 1 to its Hit and Wound rolls.',[formation]);
    }
    if(unit==='Traitor Enforcer'){
      for(const when of everyPhase)add('Mutated Bodyguard',when,'While the Traitor Ogryn survives, Character models in this unit have Feel No Pain 4+. The Traitor Enforcer can ignore each wound it would lose on a 4+.');
      if(body)add('Brutal Example',snap,'Once per turn while the Traitor Enforcer survives and leads '+formation+', target this formation with Fire Overwatch for 0 CP, including after another unit used it this turn. Destroy one of its Bodyguard models each time you do so. The usual unengaged, visibility and snap-shooting restrictions apply.',[formation]);
    }
  }
  return result;
}
