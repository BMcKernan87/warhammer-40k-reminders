import React,{useState} from 'react';
import type {ArmySelection} from './catalog';
import type {BattleState,Player} from './engine';
import {expandRoster,type RosterInstance} from './roster-instances';
import {ACTIONS,actionAvailable,isEnemyAction,tablePositions,type Action,type Observation,type Signal,type TablePosition} from './battlefield-events';
import {BATTLEFIELD_RULES} from './necron-battlefield-rules';
import {battlefieldReminders,changeRosterWounds,recordEnemyAttackDamage,latestObservation,measuringSquads,moveRosterSquad,observe,onTable,positionOf,rosterHealth,setRosterPlayer,useBattlefieldAbility,type LiveReminder} from './necron-battlefield';

type Change = (fn:(b:BattleState)=>BattleState)=>void;
interface Props {army:ArmySelection;battle:BattleState;change:Change;completed:readonly string[]}
function ActionForm({army,battle,change}:{army:ArmySelection;battle:BattleState;change:Change}){
  const roster=expandRoster(army);
  const active=roster.filter(s=>onTable(battle,s));
  const [selected,setSelected]=useState(active[0]?.id??'');
  const [pickedAction,setPickedAction]=useState<Action|''>('');
  const own=battle.player===(battle.rosterPlayer??'A');
  const enemyActions=(Object.keys(ACTIONS) as Action[]).filter(k=>isEnemyAction(k)&&actionAvailable(k,battle.phase,own)&&measuringSquads(army,battle,k).length>0);
  const subject=selected==='enemy'&&enemyActions.length?'enemy':active.find(s=>s.id===selected)?.id??active[0]?.id;
  const squad=active.find(s=>s.id===subject);
  const formation=squad?active.filter(s=>s.id===squad.id||s.attachedTo===squad.id):[];
  function relevant(action:Action){
    if(action==='enemyWounded'||action==='crossed'||isEnemyAction(action)||!actionAvailable(action,battle.phase,own))return false;
    if(action==='meleeKill'&&squad?.unit==='Illuminor Szeras')return true;
    if(['normal','enemyAttacked','allocated','charged','reanimate'].includes(action))return true;
    if(measuringSquads(army,battle,action,subject).length)return true;
    return BATTLEFIELD_RULES.some(r=>formation.some(s=>r.units.includes(s.unit)&&(!r.gear||r.gear(s)))&&
      (Array.isArray(r.signal)?r.signal.includes(action):r.signal===action));
  }
  const actions=subject==='enemy'?enemyActions:(Object.keys(ACTIONS) as Action[]).filter(relevant);
  const action=pickedAction&&actions.includes(pickedAction)?pickedAction:'';
  const measuring=action?measuringSquads(army,battle,action,squad?.id):[];
  const chooseTarget=action==='shoot'&&['Lokhust Heavy Destroyers'].includes(squad?.unit??'')||action==='enemyAttacks';
  const isAttack=action==='shoot'||action==='fight';
  function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!action)return;
    const fields=new FormData(e.currentTarget);
    const optionalNumber=(key:string)=>{const value=fields.get(key);return typeof value==='string'&&value.trim()!==''?Number(value):undefined;};
    const measurements:NonNullable<Observation['measurements']>={};
    for(const sensor of measuring){
      const distance=optionalNumber('range-'+sensor.id);
      const blocksSight=fields.has('cover-'+sensor.id);
      if(distance!==undefined||blocksSight)measurements[sensor.id]={distance,visible:fields.has('visible-'+sensor.id),blocksSight,controlledObjective:fields.has('objective-'+sensor.id)};
    }
    const input:Observation={action,squadId:squad?.id,range:optionalNumber('range'),damage:optionalNumber('damage'),
      strength:optionalNumber('strength'),toughness:optionalNumber('toughness'),crossedEnemy:fields.has('crossed'),target:(fields.get('target')||undefined) as Observation['target'],
      onObjective:fields.has('objective'),enemyObjective:fields.has('enemyObjective'),belowHalf:fields.has('belowHalf'),
      closest:fields.has('closest'),unengaged:fields.has('unengaged'),psychicOrMortal:fields.has('psychic'),measurements};
    change(b=>observe(army,b,input));
    setPickedAction('');
  }
  if(!active.length)return <p>Place a roster squad on the battlefield to record its actions.</p>;
  return <form className="observation" onSubmit={submit}>
    <div className="loadout-controls">
      <label>Unit involved <select aria-label="Battlefield unit" value={subject??''} onChange={e=>{setSelected(e.target.value);setPickedAction('');}}>
        {active.map(s=><option key={s.id}>{s.id}</option>)}{enemyActions.length>0&&<option value="enemy">Enemy unit</option>}
      </select></label>
      <label>Battlefield action <select aria-label="Battlefield action" value={action} onChange={e=>setPickedAction(e.target.value as Action)}>
        <option value="">Choose an action</option>{actions.map(k=><option value={k} key={k}>{ACTIONS[k]}</option>)}
      </select></label>
    </div>
    {action&&<div className="action-facts" key={subject+'-'+action}>
      {action==='normal'&&squad?.unit==='Canoptek Wraiths'&&<label><input type="checkbox" name="crossed"/> Moved over an enemy unit</label>}
      {chooseTarget&&<label>{action==='enemyAttacks'?'Attacking enemy type':'Target type'} <select name="target" defaultValue=""><option value="">Choose type</option><option value="other">Other</option><option value="monster">Monster</option><option value="vehicle">Vehicle</option></select></label>}
      {action==='shoot'&&squad?.unit==='Canoptek Tomb Crawlers'&&<label>Range to target (inches) <input type="number" name="range" min="0" step="any"/></label>}
      {isAttack&&active.some(s=>s.unit==='Nekrosor Ammentar')&&squad?.unit!=='Lokhust Destroyers'&&<label><input type="checkbox" name="closest"/> Closest eligible enemy</label>}
      {isAttack&&squad?.unit==='Immortals'&&<label><input type="checkbox" name="objective"/> Target is on an objective</label>}
      {action==='shoot'&&squad?.unit==='Lokhust Destroyers'&&<><label><input type="checkbox" name="closest"/> Closest eligible enemy</label><label><input type="checkbox" name="enemyObjective"/> Target is on an enemy-controlled objective</label></>}
      {isAttack&&['Lokhust Lord','Flayed Ones'].includes(squad?.unit??'')&&<label><input type="checkbox" name="belowHalf"/> Target is below half-strength</label>}
      {(action==='shot'||action==='shotHit')&&formation.some(s=>s.unit==='Chronomancer')&&<label><input type="checkbox" name="unengaged"/> Outside Engagement Range</label>}
      {action==='targeted'&&squad&&['Lychguard','Catacomb Command Barge'].includes(squad.unit)&&<><label>Attack Strength <input type="number" name="strength" min="1" step="1"/></label>
        <label>Defending Toughness <input type="number" name="toughness" min="1" step="1" defaultValue={squad.unit==='Lychguard'?5:8}/></label></>}
      {action==='allocated'&&active.some(s=>s.wargear?.['Gloom prism']||s.unit==='Nekrosor Ammentar')&&<label><input type="checkbox" name="psychic"/> Psychic attack or mortal wounds</label>}
      {action==='enemyAttacked'&&squad&&<label>Wounds lost <input type="number" name="damage" min="0" max={rosterHealth(army,battle,squad).wounds} defaultValue="0"/></label>}
      {measuring.map(s=><div className="measurement" key={s.id}><label>{s.id} to {subject==='enemy'?'enemy unit':'affected unit'} (inches) <input type="number" name={'range-'+s.id} min="0" step="any"/></label>
          {s.unit==='Convergence Of Dominion'&&action==='allocated'&&<label><input type="checkbox" name={'cover-'+s.id}/> Obscures the defender from at least one ranged attacker</label>}
          {action==='arrival'&&s.unit==='Geomancer'&&<label><input type="checkbox" name={'objective-'+s.id}/> Geomancer is on an objective you control</label>}
          {action==='arrival'&&s.unit==='Deathmarks'&&<label><input type="checkbox" name={'visible-'+s.id}/> Visible to {s.id}</label>}
        </div>)}
    </div>}
    <button disabled={!action} type="submit">Record action</button>
  </form>;
}
function Tracker({army,battle,change,squad}:{army:ArmySelection;battle:BattleState;change:Change;squad:RosterInstance}){
  const [damage,setDamage]=useState(1);
  const {wounds,maxWounds}=rosterHealth(army,battle,squad);
  const position=positionOf(battle,squad.id);
  return <div className="unit"><strong>{squad.id}</strong><div className="unit-actions">
    <label>Position <select aria-label={'Position of '+squad.id} value={position} onChange={e=>change(b=>moveRosterSquad(army,b,squad,e.target.value as TablePosition))}>
      {tablePositions.map(p=><option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select></label>
    <button className="secondary" aria-label={'Lose one wound '+squad.id} disabled={wounds===0} onClick={()=>change(b=>changeRosterWounds(army,b,squad,wounds-1))}>−</button>
    <span>{wounds}/{maxWounds} W</span>{battle.player!==(battle.rosterPlayer??'A')&&position==='battlefield'&&wounds>0&&<label>Enemy attack damage <input aria-label={'Enemy attack damage to '+squad.id} type="number" min="1" max={wounds} step="1" value={damage} onChange={e=>setDamage(Number(e.target.value))}/><button className="secondary" disabled={!Number.isInteger(damage)||damage<1||damage>wounds} aria-label={'Record enemy attack damage to '+squad.id} onClick={()=>change(b=>recordEnemyAttackDamage(army,b,squad,damage))}>Record damage &amp; trigger rules</button></label>}<button className="secondary" aria-label={'Restore one wound '+squad.id} disabled={wounds===maxWounds} onClick={()=>change(b=>changeRosterWounds(army,b,squad,wounds+1))}>+</button>
  </div></div>;
}
export function NecronBattlefield({army,battle,change,completed}:Props){
  const squads=expandRoster(army);
  if(!squads.length)return null;
  const last=latestObservation(battle);
  function renderList(signal:Signal,entries:LiveReminder[]){
    return <ul className="live-list">{entries.map(r=><li key={r.ruleId+'-'+r.squadId}>
      <strong>{r.title}</strong><small>{r.squadId}{r.subjectId&&r.subjectId!==r.squadId?' · '+r.subjectId:''}</small>
      <p>{r.text}</p><a href={r.source} target="_blank" rel="noreferrer">Datasheet</a>
      {r.remaining!==undefined&&<button className="secondary" aria-label={'Use '+r.title+' for '+r.squadId} onClick={()=>change(b=>useBattlefieldAbility(army,b,signal,r,completed))}>Use ability{r.remaining>1?' ('+r.remaining+' left)':''}</button>}
    </li>)}</ul>;
  }
  const start=battlefieldReminders(army,battle,'phaseStart',undefined,completed);
  const end=battlefieldReminders(army,battle,'phaseEnd',undefined,completed);
  const matches=last?battlefieldReminders(army,battle,last.action,last,completed):[];
  return <section className="panel" aria-label="Live battlefield reminders">
    <h2>Battlefield reminders</h2>
    <label>My army is <select aria-label="Roster player" value={battle.rosterPlayer??'A'} onChange={e=>change(b=>setRosterPlayer(b,e.target.value as Player))}>
      <option value="A">Player A</option><option value="B">Player B</option></select></label>
    {start.length>0&&<><h3>This {battle.phase} phase</h3>{renderList('phaseStart',start)}</>}
    <h3>Record a battlefield action</h3>
    <ActionForm key={[battle.round,battle.player,battle.phase,battle.rosterPlayer].join('-')} army={army} battle={battle} change={change}/>
    {last&&<div aria-live="polite" aria-label="Triggered abilities"><h3>{ACTIONS[last.action]}{last.squadId?' · '+last.squadId:''}</h3>
      {matches.length?renderList(last.action,matches):<p>No further modeled reminders for this action.</p>}</div>}
    {end.length>0&&<><h3>Before ending the {battle.phase} phase</h3>{renderList('phaseEnd',end)}</>}
    <details><summary>Squad positions and wounds</summary>
      <p>Squads start on the battlefield. Mark reserves, embarked units and casualties here. Wounds are tracked by squad. For mixed loadouts, check which wargear bearers survive.</p>
      {squads.map(s=><Tracker key={s.id} army={army} battle={battle} change={change} squad={s}/>)}
    </details>
  </section>;
}
