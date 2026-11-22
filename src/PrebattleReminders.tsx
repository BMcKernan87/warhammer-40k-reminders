import type {ArmySelection} from './catalog';
import type {BattleState,PrebattleDecision} from './engine';
import {generate11thReminders} from './reminders-11th';
interface Props {army:ArmySelection;battle:BattleState;onDecide:(id:string,decision:PrebattleDecision)=>void;onFinish:(ids:string[])=>void}
export function PrebattleReminders({army,battle,onDecide,onFinish}:Props){
 if(!battle.prebattle||battle.prebattle.resolved)return null;
 const reminders=generate11thReminders(army).filter(r=>r.window==='Pre-battle');
 const decisions=battle.prebattle.decisions;
 const unresolved=reminders.filter(r=>!decisions[r.id]);
 return <section className="panel" aria-label="Pre-battle reminders">
  <h2>Resolve pre-battle abilities</h2>
  <p className="muted">After deployment, decide whether each verified Scout squad makes its move. The app cannot measure battlefield geometry: confirm distances and positioning on the table. No Scout-eligible squads? Start the battle immediately.</p>
  <ul>{reminders.map(r=><li key={r.id}><strong>{r.title}</strong><p>{r.summary}</p>
   <label>Decision for {r.units?.[0]??r.title} <select aria-label={'Scout decision for '+(r.units?.[0]??r.title)} value={decisions[r.id]??''} onChange={e=>onDecide(r.id,e.target.value as PrebattleDecision)}>
    <option value="">Choose an outcome</option><option value="scouted">Scout move completed</option><option value="declined">Did not Scout</option><option value="not-applicable">Not applicable (e.g. not deployed)</option>
   </select></label> <a href={r.source} target="_blank" rel="noreferrer">Rule source</a>
  </li>)}</ul>
  <button type="button" disabled={unresolved.length>0} onClick={()=>onFinish(reminders.map(r=>r.id))}>Begin first Command phase</button>
  {unresolved.length>0&&<p className="muted">{unresolved.length} squad decision(s) remaining</p>}
 </section>;
}
