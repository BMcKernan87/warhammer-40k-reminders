import {observationSchema,abilityUseSchema,tablePositions,type Observation,type AbilityUse,type TablePosition} from './battlefield-events';
export type Player = 'A' | 'B';
export type Phase = 'Command' | 'Movement' | 'Shooting' | 'Charge' | 'Fight';
export const PHASES: readonly Phase[] = ['Command','Movement','Shooting','Charge','Fight'];
export interface UnitState { id:string; name:string; owner:Player; wounds:number; maxWounds:number; battleShocked:boolean; destroyed:boolean; }
export type PrebattleDecision='scouted'|'declined'|'not-applicable';
export interface BattleState { prebattle?:{resolved:boolean;decisions:Record<string,PrebattleDecision>}; round:number; player:Player; phase:Phase; rosterPlayer?:Player; positions?:Record<string,TablePosition>; casualties?:Record<string,Record<string,number>>; cp:Record<Player,number>; notes:string[]; units:UnitState[]; events:BattleEvent[]; }
export type BattleEvent = { id:string; round:number; player:Player; phase:Phase; kind:'ability'|'stratagem'|'damage'|'heal'|'battle-shock'|'note'|'battlefield'; observation?:Observation; use?:AbilityUse; unitId?:string; description:string };
export function createBattle():BattleState {return {prebattle:{resolved:false,decisions:{}},round:1,player:'A',phase:'Command',cp:{A:0,B:0},notes:[],units:[],events:[]};}
export function advancePhase(b:BattleState):BattleState {if(b.prebattle&&!b.prebattle.resolved)throw new Error('Resolve pre-battle decisions before advancing to Command phase');const n=structuredClone(b);const i=PHASES.indexOf(n.phase);if(i<PHASES.length-1)n.phase=PHASES[i+1];else {n.phase='Command';n.player=n.player==='A'?'B':'A';if(n.player==='A')n.round++;}return n;}
export function validateBattleState(x:unknown):x is BattleState {
 if(!x||typeof x!=='object')return false;
 const b=x as Partial<BattleState>;
 if(!Number.isInteger(b.round)||b.round!<1||(b.player!=='A'&&b.player!=='B')||!PHASES.includes(b.phase as Phase))return false;
 if(b.prebattle!==undefined&&(!b.prebattle||typeof b.prebattle.resolved!=='boolean'||!b.prebattle.decisions||typeof b.prebattle.decisions!=='object'||Array.isArray(b.prebattle.decisions)||Object.values(b.prebattle.decisions).some(v=>!['scouted','declined','not-applicable'].includes(v))))return false;
 if(b.casualties!==undefined&&(!b.casualties||typeof b.casualties!=='object'||Array.isArray(b.casualties)||Object.values(b.casualties).some(groups=>!groups||typeof groups!=='object'||Array.isArray(groups)||Object.entries(groups).some(([weapon,count])=>!weapon||!Number.isInteger(count)||count<0))))return false;
 if(b.rosterPlayer!==undefined&&!['A','B'].includes(b.rosterPlayer))return false;
 if(b.positions!==undefined&&(!b.positions||typeof b.positions!=='object'||Array.isArray(b.positions)||Object.values(b.positions).some(p=>!tablePositions.includes(p))))return false;
 if(!b.cp||!Number.isInteger(b.cp.A)||!Number.isInteger(b.cp.B)||b.cp.A<0||b.cp.B<0)return false;
 if(!Array.isArray(b.notes)||b.notes.some(n=>typeof n!=='string')||!Array.isArray(b.units)||!Array.isArray(b.events))return false;
 const ids=new Set<string>();
 for(const u of b.units){
  if(!u||typeof u.id!=='string'||!u.id||ids.has(u.id)||typeof u.name!=='string'||!u.name||!['A','B'].includes(u.owner)||!Number.isInteger(u.maxWounds)||u.maxWounds<1||!Number.isInteger(u.wounds)||u.wounds<0||u.wounds>u.maxWounds||typeof u.battleShocked!=='boolean'||typeof u.destroyed!=='boolean'||u.destroyed!==(u.wounds===0))return false;
  ids.add(u.id);
 }
 const eventIds=new Set<string>();
 for(const e of b.events){
  if(!e||typeof e.id!=='string'||!e.id||eventIds.has(e.id)||!Number.isInteger(e.round)||e.round<1||e.round>b.round!||!['A','B'].includes(e.player)||!PHASES.includes(e.phase)||!['ability','stratagem','damage','heal','battle-shock','note','battlefield'].includes(e.kind)||typeof e.description!=='string'||!e.description||e.unitId!==undefined&&!ids.has(e.unitId))return false;
  if(!validEventPayload(e))return false;
  eventIds.add(e.id);
 }
 return true;
}
export function addUnit(b:BattleState,u:UnitState):BattleState {if(!u.id.trim()||!u.name.trim()||b.units.some(x=>x.id===u.id)||!Number.isInteger(u.maxWounds)||u.maxWounds<1||!Number.isInteger(u.wounds)||u.wounds<0||u.wounds>u.maxWounds)throw new Error('Invalid unit');return {...b,units:[...b.units,structuredClone(u)]};}
export function setWounds(b:BattleState,id:string,wounds:number):BattleState {const u=b.units.find(x=>x.id===id);if(!u||!Number.isInteger(wounds)||wounds<0||wounds>u.maxWounds)throw new Error('Invalid wounds');return {...b,units:b.units.map(x=>x.id===id?{...x,wounds,destroyed:wounds===0}:x)};}
function validEventPayload(event:BattleEvent):boolean {
 if(event.kind==='battlefield'?!observationSchema.safeParse(event.observation).success:event.observation!==undefined)return false;
 return event.use===undefined||(event.kind==='ability'&&abilityUseSchema.safeParse(event.use).success);
}
export function recordEvent(b:BattleState,event:BattleEvent):BattleState {if(!validEventPayload(event)||!event.id.trim()||b.events.some(x=>x.id===event.id)||event.round!==b.round||event.phase!==b.phase||event.player!==b.player||!event.description.trim()||event.unitId&&!b.units.some(x=>x.id===event.unitId))throw new Error('Invalid event');return {...b,events:[...b.events,structuredClone(event)]};}
export function spendCp(b:BattleState,player:Player,amount:number):BattleState {if(!Number.isInteger(amount)||amount<1||b.cp[player]<amount)throw new Error('Insufficient CP');return {...b,cp:{...b.cp,[player]:b.cp[player]-amount}};}
export function gainCommandCp(b:BattleState):BattleState {if(b.phase!=='Command')throw new Error('Not in Command phase');const key='CP gained R'+b.round+' '+b.player;if(b.notes.includes(key))throw new Error('Already gained CP this turn');return {...b,cp:{A:b.cp.A+1,B:b.cp.B+1},notes:[...b.notes,key]};}

export function decidePrebattle(b:BattleState,reminderId:string,decision:PrebattleDecision):BattleState {
 if(!b.prebattle||b.prebattle.resolved||b.round!==1||b.phase!=='Command'||b.events.length)throw Error('Pre-battle has ended');
 if(!reminderId.startsWith('11e-scout-')||!['scouted','declined','not-applicable'].includes(decision))throw Error('Invalid Scout decision');
 return {...b,prebattle:{resolved:false,decisions:{...b.prebattle.decisions,[reminderId]:decision}}};
}
export function finishPrebattle(b:BattleState,requiredIds:readonly string[]):BattleState {
 if(!b.prebattle||b.prebattle.resolved||b.round!==1||b.phase!=='Command'||b.events.length)throw Error('Pre-battle has ended');
 if(requiredIds.some(id=>!b.prebattle!.decisions[id]))throw Error('Resolve each eligible squad before starting the battle');
 return {...b,prebattle:{...b.prebattle,resolved:true}};
}
