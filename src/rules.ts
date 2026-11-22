import type {BattleState,Phase,Player} from './engine';
export type Timing = 'start'|'during'|'end';
export type Rule = {id:string;title:string;faction:'Core'|'Necrons'|'Space Marines';phase:Phase;timing:Timing;description:string;oncePerTurn?:boolean;owner?:'active'|'opponent'|'either'};
export const RULES:readonly Rule[]=[
 {id:'core-cp',title:'Command point gain',faction:'Core',phase:'Command',timing:'start',description:'At the start of the Command phase, both players gain 1 CP.',oncePerTurn:true,owner:'either'},
 {id:'core-shock',title:'Battle-shock step',faction:'Core',phase:'Command',timing:'during',description:'Check Battle-shock requirements during the Command phase, using the current core rules.',owner:'active'},
 {id:'core-reserves',title:'Reserves',faction:'Core',phase:'Movement',timing:'during',description:'Review arrival timing, placement restrictions and mission restrictions.',owner:'active'},
 {id:'core-shooting',title:'Shooting eligibility',faction:'Core',phase:'Shooting',timing:'during',description:'Check eligibility and target selection before resolving attacks.',owner:'active'},
 {id:'core-fight',title:'Fight sequence',faction:'Core',phase:'Fight',timing:'during',description:'Resolve Fights First and Remaining Combats in the correct sequence.',owner:'either'},
 {id:'necron-reanimation',title:'Reanimation Protocols',faction:'Necrons',phase:'Command',timing:'during',description:'Review the current Reanimation Protocols rule and applicable unit restrictions; timing and effects depend on the current rules text.',owner:'active'},
 {id:'marine-oath',title:'Oath of Moment',faction:'Space Marines',phase:'Command',timing:'during',description:'Review current Oath of Moment target selection and detachment interactions.',owner:'active'}
];
export function availableRules(b:BattleState,faction:'Necrons'|'Space Marines'|'Other',timing?:Timing):Rule[]{
 return RULES.filter(r=>r.phase===b.phase&&(r.faction==='Core'||r.faction===faction)&&(!timing||r.timing===timing));
}
export type Completion = {ruleId:string;round:number;player:Player;phase:Phase};
export function completionKey(ruleId:string,b:Pick<BattleState,'round'|'player'|'phase'>):string{return [b.round,b.player,b.phase,ruleId].join(':');}
export function isCompleted(completed:readonly string[],ruleId:string,b:BattleState):boolean{return completed.includes(completionKey(ruleId,b));}
export function markCompleted(completed:readonly string[],ruleId:string,b:BattleState):string[]{
 if(!RULES.some(r=>r.id===ruleId&&r.phase===b.phase))throw new Error('Rule not available in this phase');
 const key=completionKey(ruleId,b);return completed.includes(key)?[...completed]:[...completed,key];
}
