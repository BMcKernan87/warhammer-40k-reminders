import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {addUnit,advancePhase,createBattle,gainCommandCp,recordEvent,setWounds,spendCp,PHASES,type BattleState,type Player,type UnitState} from './engine';
import {availableRules,completionKey} from './rules';
import './style.css';

type Faction = 'Necrons' | 'Space Marines' | 'Other';
const reminders:Record<string,string[]>={
 Command:['Check Command phase abilities and Battle-shock requirements.','Both players normally gain 1 CP at the start of the Command phase.'],
 Movement:['Declare Normal Moves, Advances, Fall Backs or Remain Stationary.','Check Reserve arrival restrictions and movement-triggered abilities.'],
 Shooting:['Select eligible units and legal targets.','Check ranged weapon abilities and applicable Stratagem timing.'],
 Charge:['Declare eligible charging units and targets.','Check charge reactions and charge roll requirements.'],
 Fight:['Resolve Fights First and then Remaining Combats.','Check pile-in, attacks and consolidation eligibility.']
};
const factionReminders:Record<Faction,Partial<Record<string,string[]>>>={
 Necrons:{Command:['Review Reanimation Protocols and your active detachment rules; confirm current timing in the official rules.'],Movement:['Check Canoptek and Cryptek movement-related abilities on current datasheets.'],Shooting:['Review Tesla, Gauss and other weapon abilities on the selected datasheets.'],Fight:['Check applicable Destroyer, C’tan and leader abilities.']},
 'Space Marines':{Command:['Review Oath of Moment target selection and current detachment abilities.'],Shooting:['Review Oath of Moment effects and weapon profiles.'],Fight:['Check leader abilities, melee weapon profiles and relevant detachment rules.']},
 Other:{}
};
const storageKey='w40k-reminders-v2';
const completionStorageKey='w40k-reminders-completed-v1';
function loadCompleted():string[]{try{const x=JSON.parse(localStorage.getItem(completionStorageKey)||'[]');return Array.isArray(x)?x.filter((v):v is string=>typeof v==='string').slice(-500):[];}catch{return [];}}
function valid(x:unknown):x is BattleState {
 if(!x||typeof x!=='object')return false;
 const b=x as Partial<BattleState>;
 return Number.isInteger(b.round)&&b.round!>=1&&(b.player==='A'||b.player==='B')&&PHASES.includes(b.phase!)&&
 !!b.cp&&Number.isInteger(b.cp.A)&&Number.isInteger(b.cp.B)&&b.cp.A>=0&&b.cp.B>=0&&
 Array.isArray(b.notes)&&b.notes.every(n=>typeof n==='string')&&Array.isArray(b.units)&&Array.isArray(b.events);
}
function load():BattleState {try{const x=JSON.parse(localStorage.getItem(storageKey)||'null');return valid(x)?x:createBattle();}catch{return createBattle();}}
function App(){
 const [battle,setBattle]=useState<BattleState>(load);
 const [history,setHistory]=useState<BattleState[]>([]);
 const [faction,setFaction]=useState<Faction>('Necrons');
 const [name,setName]=useState('');
 const [owner,setOwner]=useState<Player>('A');
 const [wounds,setWoundsInput]=useState('1');
 const [note,setNote]=useState('');
 const [error,setError]=useState('');
 const [completed,setCompleted]=useState<string[]>(loadCompleted);
 useEffect(()=>localStorage.setItem(storageKey,JSON.stringify(battle)),[battle]);
 useEffect(()=>localStorage.setItem(completionStorageKey,JSON.stringify(completed)),[completed]);
 const change=(fn:(b:BattleState)=>BattleState)=>{try{const next=fn(battle);setHistory(h=>[...h.slice(-49),structuredClone(battle)]);setBattle(next);setError('');}catch(e){setError(e instanceof Error?e.message:'Action rejected');}};
 const next=()=>change(advancePhase);
 const gain=()=>change(gainCommandCp);
 const add=()=>{const count=Number(wounds);if(!name.trim()||!Number.isInteger(count)||count<1){setError('Enter a unit name and a positive integer wound total');return;}const unit:UnitState={id:crypto.randomUUID(),name:name.trim(),owner,wounds:count,maxWounds:count,battleShocked:false,destroyed:false};change(b=>addUnit(b,unit));setName('');};
 const log=(description:string,kind:'ability'|'note'='note')=>change(b=>recordEvent(b,{id:crypto.randomUUID(),round:b.round,player:b.player,phase:b.phase,kind,description}));
 const cpKey='CP gained R'+battle.round+' '+battle.player;
 return <main><header><p className="eyebrow">TABLETOP COMPANION · 10TH EDITION</p><h1>Warhammer 40K Reminders</h1><p>Battle tracking and contextual reminders. Always verify current faction rules and datasheets; this is not an official rules source.</p></header>
 <section className="panel"><div className="stats"><div><small>ROUND</small><strong>{battle.round}</strong></div><div><small>ACTIVE PLAYER</small><strong>{battle.player}</strong></div><div><small>PHASE</small><strong>{battle.phase}</strong></div></div><div className="phases">{PHASES.map(p=><span key={p} className={p===battle.phase?'active':''}>{p}</span>)}</div><div className="actions"><button onClick={next}>Next phase</button><button className="secondary" onClick={()=>{const prev=history.at(-1);if(prev){setBattle(prev);setHistory(h=>h.slice(0,-1));}}} disabled={!history.length}>Undo</button><button className="secondary" onClick={()=>{if(window.confirm('Start a new battle and clear the current battle state?')){setHistory([]);setBattle(createBattle());setCompleted([]);setError('');}}}>New battle</button></div></section>
 <section className="panel"><h2>Command points</h2><div className="cp">{(['A','B'] as Player[]).map(p=><div key={p}><span>Player {p}</span><strong>{battle.cp[p]}</strong><button className="secondary" aria-label={'Spend CP player '+p} disabled={battle.cp[p]===0} onClick={()=>change(b=>spendCp(b,p,1))}>−</button><button className="secondary" aria-label={'Add CP player '+p} onClick={()=>change(b=>({...b,cp:{...b.cp,[p]:b.cp[p]+1}}))}>+</button></div>)}</div>{battle.phase==='Command'&&<button onClick={gain} disabled={battle.notes.includes(cpKey)}>Gain command CP for both players</button>}</section>
 <section className="panel"><h2>Phase reminders</h2><label>Faction focus <select value={faction} onChange={e=>setFaction(e.target.value as Faction)}><option>Necrons</option><option>Space Marines</option><option>Other</option></select></label>{[...reminders[battle.phase],...(factionReminders[faction][battle.phase]||[])].map(t=><label className="check" key={battle.round+'-'+battle.player+'-'+battle.phase+'-'+t}><input type="checkbox" key={battle.round+'-'+battle.player+'-'+battle.phase+'-'+t}/>{t}</label>)}<h3>Timed rules checklist</h3>{availableRules(battle,faction).map(r=><label className="check" key={completionKey(r.id,battle)}><input type="checkbox" checked={completed.includes(completionKey(r.id,battle))} onChange={e=>{const k=completionKey(r.id,battle);setCompleted(s=>e.target.checked?[...new Set([...s,k])]:s.filter(x=>x!==k));}}/><span><strong>{r.title}</strong> · {r.timing} phase<br/>{r.description}</span></label>)}<p className="muted">Faction notes are prompts to consult current rules, not executable rulings.</p></section>
 <section className="panel"><h2>Units</h2><div className="unit-form"><input aria-label="Unit name" placeholder="Unit name" value={name} onChange={e=>setName(e.target.value)}/><select aria-label="Unit owner" value={owner} onChange={e=>setOwner(e.target.value as Player)}><option value="A">Player A</option><option value="B">Player B</option></select><input aria-label="Starting wounds" type="number" min="1" value={wounds} onChange={e=>setWoundsInput(e.target.value)}/><button onClick={add}>Add unit</button></div>{battle.units.map(u=><div className="unit" key={u.id}><div><strong>{u.name}</strong><small>Player {u.owner} · {u.destroyed?'Destroyed':u.battleShocked?'Battle-shocked':'Active'}</small></div><div className="unit-actions"><button className="secondary" disabled={u.wounds===0} onClick={()=>change(b=>setWounds(b,u.id,u.wounds-1))}>−</button><span>{u.wounds}/{u.maxWounds}</span><button className="secondary" disabled={u.wounds===u.maxWounds} onClick={()=>change(b=>setWounds(b,u.id,u.wounds+1))}>+</button><button className="secondary" disabled={u.destroyed} onClick={()=>change(b=>({...b,units:b.units.map(x=>x.id===u.id?{...x,battleShocked:!x.battleShocked}:x)}))}>{u.battleShocked?'Clear shock':'Battle-shock'}</button></div></div>)}</section>
 <section className="panel"><h2>Battle log</h2><form onSubmit={e=>{e.preventDefault();if(note.trim()){log(note.trim());setNote('');}}}><input aria-label="Battle event" value={note} onChange={e=>setNote(e.target.value)} placeholder="Record an event or reminder"/><button type="submit">Record</button></form><ul>{battle.events.slice(-12).reverse().map(e=><li key={e.id}>R{e.round} · {e.player} · {e.phase}: {e.description}</li>)}</ul></section>{error&&<p role="alert" className="error">{error}</p>}</main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
