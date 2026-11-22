import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

type Phase = 'Command'|'Movement'|'Shooting'|'Charge'|'Fight';
type Player = 'A'|'B';
type Battle = {round:number;player:Player;phase:Phase;cp:Record<Player,number>;notes:string[]};
const phases:Phase[]=['Command','Movement','Shooting','Charge','Fight'];
const fresh=():Battle=>({round:1,player:'A',phase:'Command',cp:{A:0,B:0},notes:[]});
function load():Battle {try {const raw=localStorage.getItem('w40k-reminders');if(!raw)return fresh();const x=JSON.parse(raw);if(!Number.isInteger(x.round)||x.round<1||!phases.includes(x.phase)||!['A','B'].includes(x.player)||!Number.isInteger(x.cp?.A)||!Number.isInteger(x.cp?.B)||x.cp.A<0||x.cp.B<0||!Array.isArray(x.notes))return fresh();return x;}catch{return fresh();}}
const reminders:Record<Phase,string[]>={
Command:['Gain 1 CP for each player at the start of the Command phase (once per turn).','Check applicable Command phase abilities and Battle-shock tests.'],
Movement:['Review Normal, Advance, Fall Back and Remain Stationary options.','Resolve any arriving Reserves according to their restrictions.'],
Shooting:['Check which units are eligible to shoot and select legal targets.','Review applicable shooting abilities and stratagem timing.'],
Charge:['Check eligible charging units and declare legal targets.','Resolve charge rolls and applicable reactions.'],
Fight:['Resolve Fights First before Remaining Combats.','Check eligible units, pile-ins, attacks and consolidation.']
};
function App(){
 const [battle,setBattle]=useState<Battle>(load);
 const [history,setHistory]=useState<Battle[]>([]);
 const [note,setNote]=useState('');
 useEffect(()=>localStorage.setItem('w40k-reminders',JSON.stringify(battle)),[battle]);
 const change=(fn:(b:Battle)=>Battle)=>{setHistory(h=>[...h.slice(-49),structuredClone(battle)]);setBattle(fn(structuredClone(battle)));};
 const next=()=>change(b=>{const i=phases.indexOf(b.phase);if(i<phases.length-1)b.phase=phases[i+1];else {b.phase='Command';b.player=b.player==='A'?'B':'A';if(b.player==='A')b.round++;}return b;});
 const gain=()=>change(b=>{const key='CP gained R'+b.round+' '+b.player;if(b.notes.includes(key))return b;b.cp.A++;b.cp.B++;b.notes.push(key);return b;});
 return <main><header><p className="eyebrow">TABLETOP COMPANION · 10TH EDITION</p><h1>Warhammer 40K Reminders</h1><p>Track the turn sequence and keep key timing checks visible. This is a starter aid, not a verified rules reference.</p></header><section className="panel"><div className="stats"><div><small>ROUND</small><strong>{battle.round}</strong></div><div><small>ACTIVE PLAYER</small><strong>{battle.player}</strong></div><div><small>PHASE</small><strong>{battle.phase}</strong></div></div><div className="phases">{phases.map(p=><span key={p} className={p===battle.phase?'active':''}>{p}</span>)}</div><div className="actions"><button onClick={next}>Next phase</button><button className="secondary" onClick={()=>{const prev=history.at(-1);if(prev){setBattle(prev);setHistory(h=>h.slice(0,-1));}}} disabled={!history.length}>Undo</button><button className="secondary" onClick={()=>{setHistory([]);setBattle(fresh());}}>New battle</button></div></section><section className="panel"><h2>Command points</h2><div className="cp">{(['A','B'] as Player[]).map(p=><div key={p}><span>Player {p}</span><strong>{battle.cp[p]}</strong><button className="secondary" aria-label={'Subtract CP player '+p} onClick={()=>change(b=>{b.cp[p]=Math.max(0,b.cp[p]-1);return b;})}>−</button><button className="secondary" aria-label={'Add CP player '+p} onClick={()=>change(b=>{b.cp[p]++;return b;})}>+</button></div>)}</div>{battle.phase==='Command'&&<button onClick={gain} disabled={battle.notes.includes('CP gained R'+battle.round+' '+battle.player)}>Gain command CP for both players</button>}</section><section className="panel"><h2>{battle.phase} phase checklist</h2>{reminders[battle.phase].map(t=><label className="check" key={t}><input type="checkbox" key={battle.round+'-'+battle.player+'-'+battle.phase+'-'+t}/>{t}</label>)}<p className="muted">Check current official rules and datasheets before relying on any reminder.</p></section><section className="panel"><h2>Battle notes</h2><form onSubmit={e=>{e.preventDefault();if(note.trim()){change(b=>{b.notes.push(note.trim());return b;});setNote('');}}}><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Record an event or reminder"/><button type="submit">Add</button></form><ul>{battle.notes.slice(-10).reverse().map((n,i)=><li key={i}>{n}</li>)}</ul></section></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
