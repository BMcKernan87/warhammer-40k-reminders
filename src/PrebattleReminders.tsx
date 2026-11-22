import type {ArmySelection} from './catalog';
import type {BattleState} from './engine';
import {generate11thReminders} from './reminders-11th';
interface Props {army:ArmySelection;battle:BattleState;completed:readonly string[];onComplete:(id:string)=>void}
export function PrebattleReminders({army,battle,completed,onComplete}:Props){
 if(battle.round!==1||battle.phase!=='Command'||battle.events.length>0)return null;
 const reminders=generate11thReminders(army).filter(r=>r.window==='Pre-battle');
 if(!reminders.length)return null;
 return <section className="panel" aria-label="Pre-battle reminders">
  <h2>Pre-battle · Resolve before round one</h2>
  <p className="muted">After deployment, resolve applicable pre-battle abilities before beginning your first Command phase. Only roster-verified Scout grants are listed. Attached units with unverified Scout permissions are omitted; this checklist does not certify movement geometry.</p>
  <ul>{reminders.map(r=><li key={r.id}><strong>{r.title}</strong><p>{r.summary}</p>
    <button className="secondary" type="button" disabled={completed.includes('prebattle:'+r.id)} onClick={()=>onComplete('prebattle:'+r.id)}>{completed.includes('prebattle:'+r.id)?'Resolved':'Mark resolved / not applicable'}</button>
    <a href={r.source} target="_blank" rel="noreferrer">Rule source</a>
  </li>)}</ul>
 </section>;
}
