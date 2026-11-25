import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder} from './generated-reminders';
import {PHASES} from './engine';
import {daemonMusterUnits} from './chaos-daemons-data';
import {daemonicPactAllegiance} from './daemonic-pact';
import {knightJoinedBodyguard} from './leader-eligibility';
import {knightWeaponCount} from './knight-loadouts';
import {equippedWeaponText} from './knight-card-rules';
import {KNIGHT_CARD_STATS as cards} from './daemon-card-data.generated';
import {daemonMartialAbilities} from './daemon-martial-abilities';
import {daemonUndivided} from './daemon-undivided';
import {daemonChangeAndDecay} from './daemon-change-decay';
import type {DaemonRuleContext} from './daemon-datasheet-context';

export {daemonHasRangedWeapon} from './daemon-datasheet-context';

function coreAndWeapons(c:DaemonRuleContext,members:readonly RosterInstance[]):void {
  const {squad,add}=c,stats=cards[squad.unit],core=stats.core??[];
  const formation=c.formationId(squad);
  const root=formation===squad.id;
  const all=(name:string)=>members.every(s=>cards[s.unit].core?.includes(name));
  if(root&&all('Deep Strike')){
    add('Deep Strike','Pre-battle','either','during','You may place the entire formation in Strategic Reserves and use Deep Strike when it makes an ingress move.',[formation]);
    add('Deep Strike','Movement','either','during','When this formation makes an ingress move, including with Rapid Ingress, it may set up anywhere more than 8″ horizontally from all enemies, including in their deployment zone.',[formation]);
  }
  if(root&&all('Infiltrators'))add('Infiltrators','Pre-battle','either','during','During deployment, set up anywhere more than 8″ horizontally from enemy models and from the opponent’s deployment zone.',[formation]);
  const scouts=members.map(m=>Number(cards[m.unit].core?.find(x=>x.startsWith('Scouts '))?.match(/\d+/)?.[0]??0));
  if(root&&scouts.every(distance=>distance>0))add('Scouts '+Math.min(...scouts)+'″','Pre-battle','either','during','In Resolve Pre-battle Abilities, if wholly in your deployment zone move up to '+Math.min(...scouts)+'″ and finish more than 8″ horizontally from enemies. From Strategic Reserves, you may instead enter wholly within your deployment zone.',[formation]);
  if(root&&all('Fights First'))add('Fights First','Fight','either','during','Every model in this formation has Fights First. Resolve its combat in the Fights First step.',[formation]);
  for(const window of ['Shooting','Movement'] as const){
    const turn=window==='Shooting'?'opponent':'own';
    if(root&&all('Stealth'))add('Stealth',window,turn,'during','The entire formation gets the Benefit of Cover against ranged attacks.',[formation]);
    if(core.includes('Lone Operative')&&members.length===1)add('Lone Operative',window,turn,'during','Enemy models outside 12″ cannot see this unjoined model or target it with indirect fire.');
  }
  const fnp=core.find(x=>x.startsWith('Feel No Pain'));
  if(fnp)for(const phase of PHASES)add(fnp,phase,'either','during','Whenever a model from this datasheet would lose a wound, roll a D6. On '+fnp.slice(-2)+' it keeps that wound. This applies only to models printed on this card.');
  if(stats.save)for(const phase of ['Movement','Shooting','Fight'] as const)add('Invulnerable save',phase,phase==='Movement'?'own':phase==='Shooting'?'opponent':'either','during','When allocating an attack to a surviving '+squad.unit+' model, you may use its '+stats.save+'+ invulnerable save.');
  if(stats.demise)for(const phase of PHASES)add('Deadly Demise '+stats.demise,phase,'either','during','On destruction, after any emergency disembarkation roll D6. On a 6, each unit within 6″ suffers '+stats.demise+' mortal wound'+(stats.demise==='1'?'':'s')+'. Roll random damage separately for each unit.');
  if(stats.damage)for(const phase of stats.damage.slaughterAttacks?['Fight'] as const:['Shooting','Fight'] as const)add('Damaged',phase,phase==='Shooting'?'own':'either','during','At 1–'+stats.damage.threshold+' wounds remaining, '+(stats.damage.slaughterAttacks?'add 2 to the Attacks of both Slaughter and Carnage profiles.':'subtract 1 from this model’s Hit rolls.'));
  for(const window of ['Shooting','Fight','Movement'] as const){
    const snap=window==='Movement',phase=window==='Fight'?'Fight':'Shooting';
    const text=equippedWeaponText(squad,stats,phase,snap);
    if(text)add(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles',window,snap?'opponent':phase==='Fight'?'either':'own',snap?'end':'during',(snap?'When firing Overwatch: ':'')+text);
  }
  if(knightWeaponCount(squad,'Daemonic icon'))for(const phase of PHASES)add('Daemonic Icon',phase,'either','during','While its icon bearer survives, models in '+formation+' have Leadership 6+.',[formation]);
  if(knightWeaponCount(squad,'Instrument of Chaos'))add('Instrument of Chaos','Charge','either','during','While its instrument bearer survives, add 1 to Charge rolls for '+formation+'.',[formation]);
}

export function daemonDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[] {
  if(army.faction!=='Chaos Knights'&&army.faction!=='Chaos Daemons')return [];
  const allowed=army.faction==='Chaos Daemons'?daemonMusterUnits(army):undefined;
  const daemons=roster.filter(s=>cards[s.unit]&&(!allowed||allowed.includes(s.unit)));
  const bodies=new Map(daemons.map(s=>[s.id,knightJoinedBodyguard(army,s)]));
  const formationId=(s:RosterInstance)=>bodies.get(s.id)?.id??s.id;
  const output:GeneratedReminder[]=[];
  for(const squad of daemons){
    const members=daemons.filter(member=>formationId(member)===formationId(squad));
    const c:DaemonRuleContext={army,squad,roster:daemons,body:bodies.get(squad.id),formationId,god:daemonicPactAllegiance,
      add:(name,window,turn,timing,summary,units=[squad.id])=>{
        if(units.length)output.push({id:['11e-daemon-card',squad.id,name,window,turn].join(':'),title:squad.id+' · '+name,window,turn,timing,summary,units,origin:'unit',source:cards[squad.unit].source});
      }};
    coreAndWeapons(c,members);
    daemonChangeAndDecay(c);
    daemonUndivided(c);
    daemonMartialAbilities(c);
  }
  return output;
}
