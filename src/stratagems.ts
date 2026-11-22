import type {BattleState,Player,Phase} from './engine';
export type Trigger='roll'|'after-enemy-fights'|'unit-destroyed'|'attack-targeted';
export type Fact='eligible-roll'|'enemy-just-fought'|'friendly-unit-can-fight'|'target-eligible';
export interface TriggerEvent {kind:Trigger;actor:Player;facts?:Partial<Record<Fact,boolean>>;unitId?:string}
export interface Stratagem {id:string;name:string;cost:number;phase?:Phase;trigger:Trigger;owner:'actor'|'opponent';faction:'Core'|'Necrons'|'Space Marines';requirements:Fact[];limit:'phase'|'turn';description:string;verified:boolean}
export const STRATAGEMS:readonly Stratagem[]=[
 {id:'command-reroll',name:'Command Re-roll',cost:1,trigger:'roll',owner:'actor',faction:'Core',requirements:['eligible-roll'],limit:'phase',description:'Confirm the roll is one permitted by the current Command Re-roll rule before spending CP.',verified:false},
 {id:'counter-offensive',name:'Counter-offensive',cost:2,phase:'Fight',trigger:'after-enemy-fights',owner:'opponent',faction:'Core',requirements:['enemy-just-fought','friendly-unit-can-fight'],limit:'phase',description:'Confirm the target unit and exact timing in the current core rules.',verified:false}
];
export interface Assessment {rule:Stratagem;owner:Player;status:'eligible'|'conditional'|'ineligible';reasons:string[];key:string}
export function usageKey(b:BattleState,r:Stratagem,owner:Player):string {return [r.id,owner,b.round,b.player,r.limit==='phase'?b.phase:'turn'].join(':')}
export function assess(b:BattleState,event:TriggerEvent,used:readonly string[],rules:readonly Stratagem[]=STRATAGEMS):Assessment[]{
 const results:Assessment[]=[];
 for(const r of rules){
  if(r.trigger!==event.kind||r.phase&&r.phase!==b.phase)continue;
  const owner:Player=r.owner==='actor'?event.actor:event.actor==='A'?'B':'A';
  const reasons:string[]=[];
  if(r.faction!=='Core')continue; // Faction rules require verified roster mapping.
  if(!r.verified)reasons.push('Current rule text not verified: advisory only');
  if(b.cp[owner]<r.cost)reasons.push('Insufficient CP');
  const key=usageKey(b,r,owner);
  if(used.includes(key))reasons.push('Already used in this window');
  for(const fact of r.requirements){if(event.facts?.[fact]===false)reasons.push('Requirement failed: '+fact);else if(event.facts?.[fact]===undefined)reasons.push('Confirm '+fact);}
  const ineligible=reasons.some(x=>x.startsWith('Insufficient')||x.startsWith('Already')||x.startsWith('Requirement failed'));
  results.push({rule:r,owner,status:ineligible?'ineligible':reasons.length?'conditional':'eligible',reasons,key});
 }
 return results;
}
export function applyStratagem(b:BattleState,event:TriggerEvent,used:readonly string[],id:string,rules:readonly Stratagem[]=STRATAGEMS):{battle:BattleState;used:string[]} {
 const found=assess(b,event,used,rules).find(x=>x.rule.id===id);
 if(!found||found.status!=='eligible'||!found.rule.verified)throw new Error('Stratagem cannot be applied without verified eligibility');
 const n=structuredClone(b);n.cp[found.owner]-=found.rule.cost;
 n.events.push({id:'stratagem-'+found.key,round:n.round,player:n.player,phase:n.phase,kind:'stratagem',description:found.rule.name});
 return {battle:n,used:[...used,found.key]};
}
