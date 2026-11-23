import type {ArmySelection} from './catalog';
import {expandRoster, type RosterInstance} from './roster-instances';
import {addUnit, recordEvent, setWounds, type BattleState, type Player} from './engine';
import {ACTIONS, actionAvailable, isEnemyAction, observationSchema, type Observation, type Signal, type TablePosition} from './battlefield-events';
import {BATTLEFIELD_RULES, type TriggerRule} from './necron-battlefield-rules';
import {NECRON_LOADOUTS, necronSource} from './necron-wargear';
import {resurrectionOrbUsed} from './once-per-battle';
import {verifiedUnitSizes2026} from './datasheets-2026';

export function positionOf(battle: BattleState, id: string): TablePosition {
  if (battle.units.some(u=>u.id==='roster:'+id && u.destroyed)) return 'destroyed';
  return battle.positions?.[id] ?? 'battlefield';
}

export function onTable(battle: BattleState, squad: RosterInstance): boolean {
  if (positionOf(battle,squad.id)!=='battlefield') return false;
  // A character survives the destruction of its bodyguard, but travels with it into reserves or transport.
  const body = squad.attachedTo && positionOf(battle,squad.attachedTo);
  return body !== 'reserves' && body !== 'embarked';
}

export function rosterHealth(army: ArmySelection, battle: BattleState, squad: RosterInstance) {
  const models=squad.models ?? verifiedUnitSizes2026(army,squad.unit)?.[0] ?? 1;
  const maxWounds=squad.unit==='The Silent King' ? 26 : NECRON_LOADOUTS[squad.unit].wounds*models;
  const tracked=battle.units.find(u=>u.id==='roster:'+squad.id);
  const wounds=positionOf(battle,squad.id)==='destroyed' ? 0 : tracked ? Math.min(maxWounds,tracked.wounds) : maxWounds;
  return {maxWounds,wounds};
}
export function changeRosterWounds(army: ArmySelection,battle: BattleState,squad: RosterInstance,wounds: number): BattleState {
  const {maxWounds}=rosterHealth(army,battle,squad);
  const id='roster:'+squad.id;
  const existing=battle.units.find(u=>u.id===id);
  let next=existing
    ? {...battle,units:battle.units.map(u=>u.id===id?{...u,maxWounds,owner:battle.rosterPlayer??'A'}:u)}
    : addUnit(battle,{id,name:squad.id,owner:battle.rosterPlayer??'A',wounds:maxWounds,maxWounds,destroyed:false,battleShocked:false});
  next=setWounds(next,id,wounds);
  if (wounds===0 || positionOf(battle,squad.id)==='destroyed') {
    next={...next,positions:{...next.positions,[squad.id]:wounds===0?'destroyed':'battlefield'}};
  }
  return next;
}
/** Record an explicitly identified enemy attack and update squad health in one transaction.
 * Nearby aura distances remain unverified until measured; do not invent them. */
export function recordEnemyAttackDamage(army:ArmySelection,battle:BattleState,squad:RosterInstance,damage:number):BattleState {
 if(battle.player===(battle.rosterPlayer??'A'))throw Error('Enemy attacks can only be recorded during the opponent turn.');
 if(!Number.isInteger(damage)||damage<1||!onTable(battle,squad))throw Error('Select an active squad and a positive damage amount.');
 const {wounds}=rosterHealth(army,battle,squad);
 if(damage>wounds)throw Error('Damage exceeds remaining wounds.');
 return observe(army,battle,{action:'enemyAttacked',squadId:squad.id,damage});
}

export function moveRosterSquad(army:ArmySelection,battle:BattleState,squad:RosterInstance,to:TablePosition): BattleState {
  if(to==='destroyed')return changeRosterWounds(army,battle,squad,0);
  const next=positionOf(battle,squad.id)==='destroyed'
    ? changeRosterWounds(army,battle,squad,rosterHealth(army,battle,squad).maxWounds) : battle;
  return {...next,positions:{...next.positions,[squad.id]:to}};
}

function listens(rule:TriggerRule, signal:Signal):boolean {
  return typeof rule.signal==='string' ? rule.signal===signal : rule.signal.includes(signal);
}
function sameTiming(rule:TriggerRule,battle:BattleState):boolean {
  const own=battle.player===(battle.rosterPlayer??'A');
  return (!rule.phase||rule.phase===battle.phase)&&(!rule.turn||(rule.turn==='own')===own);
}
export function measuringSquads(army:ArmySelection,battle:BattleState,action:Signal,subjectId?:string):RosterInstance[] {
  if(army.faction!=='Necrons')return [];
  return expandRoster(army).filter(s=>s.id!==subjectId && onTable(battle,s) && BATTLEFIELD_RULES.some(r=>
    r.scope==='nearby' && r.units.includes(s.unit) && (listens(r,action)||(action==='enemyAttacked'&&listens(r,'enemyWounded'))) && sameTiming(r,battle) && (!r.gear||r.gear(s))));
}
function spent(rule:TriggerRule,bearer:RosterInstance,battle:BattleState,subjectId?:string,completed:readonly string[]=[]):number {
  const uses=battle.events.filter(e=>e.use?.rule===rule.id);
  const inTurn=(e:typeof uses[number])=>e.round===battle.round&&e.player===battle.player;
  if(rule.limit==='plasmacytes'){
    const event=[...battle.events].reverse().find(e=>e.kind==='battlefield');
    if(event&&uses.some(e=>e.use?.eventId===event.id&&e.use?.squadId===bearer.id))return bearer.wargear?.Plasmacyte??0;
  }
  if(rule.id==='orb' && (resurrectionOrbUsed(completed,bearer.id)||uses.some(inTurn)))return 1;
  if(rule.id==='ghost-repair' && uses.some(e=>inTurn(e)&&e.use?.subjectId===subjectId))return 1;
  return uses.filter(e=>(rule.shared||e.use!.squadId===bearer.id) &&
    (rule.limit!=='turn'||inTurn(e))&&(rule.limit!=='round'||e.round===battle.round)).length;
}
export interface LiveReminder {
  ruleId:string;
  squadId:string;
  subjectId?:string;
  title:string;
  text:string;
  source:string;
  remaining?:number;
}
export function battlefieldReminders(army:ArmySelection,battle:BattleState,signal:Signal,observation?:Observation,completed:readonly string[]=[]):LiveReminder[] {
  if(army.faction!=='Necrons')return [];
  const phaseWindow=signal==='phaseStart'||signal==='phaseEnd';
  if(!phaseWindow && (!observation || observation.action!==signal || !actionAvailable(observation.action,battle.phase,battle.player===(battle.rosterPlayer??'A'))))return [];
  const roster=expandRoster(army);
  const subject=observation?.squadId?roster.find(s=>s.id===observation.squadId):undefined;
  if(observation?.squadId&&!subject)return [];
  if(subject&&!onTable(battle,subject)&&signal!=='enemyWounded')return [];
  const matches:LiveReminder[]=[];
  const active=roster.filter(s=>onTable(battle,s));
  const eligibleRoster=roster.filter(s=>onTable(battle,s)||positionOf(battle,s.id)==='reserves');
  for(const bearer of active){
    for(const rule of BATTLEFIELD_RULES){
      if(!rule.units.includes(bearer.unit)||!listens(rule,signal)||!sameTiming(rule,battle)||(rule.gear&&!rule.gear(bearer)))continue;
      const ctx={battle,bearer,subject,observation,roster:active,eligibleRoster,actedThisTurn:(action:Signal)=>battle.events.some(e=>
        e.round===battle.round&&e.player===battle.player&&e.observation?.squadId===bearer.id&&e.observation.action===action)};
      if(!phaseWindow){
        const body=bearer.attachedTo && roster.find(s=>s.id===bearer.attachedTo&&onTable(battle,s));
        if(rule.scope==='nearby'){
          const measurement=observation?.measurements?.[bearer.id];
          const sameFormation=!!subject&&(bearer.attachedTo===subject.id||subject.attachedTo===bearer.id||!!bearer.attachedTo&&bearer.attachedTo===subject.attachedTo);
          const distance=bearer.id===subject?.id||sameFormation?0:measurement?.distance;
          const limit=typeof rule.within==='function'?rule.within(ctx):rule.within;
          if(limit!==undefined&&(distance===undefined||distance>limit))continue;
          if(rule.visible&&!measurement?.visible)continue;
        }else if(rule.scope==='leading'){
          if(!body||!(body.id===subject?.id||bearer.id===subject?.id))continue;
        }else if(bearer.id!==subject?.id&&!(rule.scope==='formation'&&body&&body.id===subject?.id))continue;
      }
      if(rule.id==='ghost-repair'&&subject&&!onTable(battle,subject))continue;
      if(rule.when&&!rule.when(ctx))continue;
      const maximum=rule.limit==='plasmacytes'?bearer.wargear?.Plasmacyte??0:1;
      const remaining=rule.limit?maximum-spent(rule,bearer,battle,subject?.id,completed):undefined;
      if(remaining!==undefined&&remaining<=0)continue;
      matches.push({ruleId:rule.id,squadId:bearer.id,subjectId:subject?.id,title:rule.title,
        text:typeof rule.text==='string'?rule.text:rule.text(ctx),source:necronSource(bearer.unit),remaining});
    }
  }
  return matches;
}
export function latestObservation(battle:BattleState):Observation|undefined {
  return [...battle.events].reverse().find(e=>e.round===battle.round&&e.phase===battle.phase&&e.player===battle.player&&e.kind==='battlefield')?.observation;
}
export function observe(army:ArmySelection,battle:BattleState,input:Observation):BattleState {
  const observation=observationSchema.parse(input);
  const roster=expandRoster(army);
  const squad=roster.find(s=>s.id===observation.squadId);
  if(army.faction!=='Necrons'||!actionAvailable(observation.action,battle.phase,battle.player===(battle.rosterPlayer??'A'))||
     (!isEnemyAction(observation.action)&&(!squad||!onTable(battle,squad))))throw Error('This battlefield action is unavailable.');
  if(observation.action==='normal'&&observation.crossedEnemy)observation.action='crossed';
  const canMeasure=measuringSquads(army,battle,observation.action,squad?.id);
  if(Object.keys(observation.measurements??{}).some(id=>!canMeasure.some(s=>s.id===id)))throw Error('Unknown measuring unit.');
  let next=battle;
  if(observation.action==='enemyAttacked'&&squad&&observation.damage){
    const {wounds}=rosterHealth(army,battle,squad);
    if(observation.damage>wounds)throw Error('Wounds lost exceeds the squad’s remaining wounds.');
    next=changeRosterWounds(army,battle,squad,wounds-observation.damage);
    observation.action='enemyWounded';
  }
  return recordEvent(next,{id:crypto.randomUUID(),round:battle.round,player:battle.player,phase:battle.phase,
    kind:'battlefield',observation,description:[squad?.id,ACTIONS[observation.action]].filter(Boolean).join(' · ')});
}
export function useBattlefieldAbility(army:ArmySelection,battle:BattleState,signal:Signal,reminder:LiveReminder,completed:readonly string[]=[]):BattleState {
  const observation=signal==='phaseStart'||signal==='phaseEnd'?undefined:latestObservation(battle);
  const match=battlefieldReminders(army,battle,signal,observation,completed).find(r=>r.ruleId===reminder.ruleId&&r.squadId===reminder.squadId&&r.subjectId===reminder.subjectId&&r.remaining!==undefined);
  if(!match)throw Error('This ability is no longer available.');
  return recordEvent(battle,{id:crypto.randomUUID(),round:battle.round,player:battle.player,phase:battle.phase,kind:'ability',
    use:{rule:match.ruleId,squadId:match.squadId,subjectId:match.subjectId,eventId:observation?[...battle.events].reverse().find(e=>e.kind==='battlefield')?.id:undefined},description:match.squadId+' used '+match.title});
}
export function setRosterPlayer(battle:BattleState,player:Player):BattleState {
  return {...battle,rosterPlayer:player,units:battle.units.map(u=>u.id.startsWith('roster:')?{...u,owner:player}:u)};
}
