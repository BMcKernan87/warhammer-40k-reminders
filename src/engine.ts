export type Player = 'A' | 'B';
export type Phase = 'Command' | 'Movement' | 'Shooting' | 'Charge' | 'Fight';
export const PHASES: readonly Phase[] = ['Command','Movement','Shooting','Charge','Fight'];
export interface UnitState { id:string; name:string; owner:Player; wounds:number; maxWounds:number; battleShocked:boolean; destroyed:boolean; }
export interface BattleState { round:number; player:Player; phase:Phase; cp:Record<Player,number>; notes:string[]; units:UnitState[]; events:BattleEvent[]; }
export type BattleEvent = { id:string; round:number; player:Player; phase:Phase; kind:'ability'|'stratagem'|'damage'|'heal'|'battle-shock'|'note'; unitId?:string; description:string };
export function createBattle():BattleState {return {round:1,player:'A',phase:'Command',cp:{A:0,B:0},notes:[],units:[],events:[]};}
export function advancePhase(b:BattleState):BattleState {const n=structuredClone(b);const i=PHASES.indexOf(n.phase);if(i<PHASES.length-1)n.phase=PHASES[i+1];else {n.phase='Command';n.player=n.player==='A'?'B':'A';if(n.player==='A')n.round++;}return n;}
export function addUnit(b:BattleState,u:UnitState):BattleState {if(!u.id.trim()||!u.name.trim()||b.units.some(x=>x.id===u.id)||!Number.isInteger(u.maxWounds)||u.maxWounds<1||!Number.isInteger(u.wounds)||u.wounds<0||u.wounds>u.maxWounds)throw new Error('Invalid unit');return {...b,units:[...b.units,structuredClone(u)]};}
export function setWounds(b:BattleState,id:string,wounds:number):BattleState {const u=b.units.find(x=>x.id===id);if(!u||!Number.isInteger(wounds)||wounds<0||wounds>u.maxWounds)throw new Error('Invalid wounds');return {...b,units:b.units.map(x=>x.id===id?{...x,wounds,destroyed:wounds===0}:x)};}
export function recordEvent(b:BattleState,event:BattleEvent):BattleState {if(!event.id.trim()||b.events.some(x=>x.id===event.id)||event.round!==b.round||event.phase!==b.phase||event.player!==b.player||!event.description.trim()||event.unitId&&!b.units.some(x=>x.id===event.unitId))throw new Error('Invalid event');return {...b,events:[...b.events,structuredClone(event)]};}
export function spendCp(b:BattleState,player:Player,amount:number):BattleState {if(!Number.isInteger(amount)||amount<1||b.cp[player]<amount)throw new Error('Insufficient CP');return {...b,cp:{...b.cp,[player]:b.cp[player]-amount}};}
export function gainCommandCp(b:BattleState):BattleState {if(b.phase!=='Command')throw new Error('Not in Command phase');const key='CP gained R'+b.round+' '+b.player;if(b.notes.includes(key))throw new Error('Already gained CP this turn');return {...b,cp:{A:b.cp.A+1,B:b.cp.B+1},notes:[...b.notes,key]};}
