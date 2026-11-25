import {mechanicusMusterUnits} from './mechanicus-army-data';
import {mechanicusUnitLimit} from './mechanicus-muster';
import {sororitasMusterUnits} from './sororitas-army-data';
import {sororitasUnitLimit} from './sororitas-muster';
import {greyKnightsMusterUnits} from './grey-knights-data';
import {greyKnightsUnitLimit} from './grey-knights-muster';
import {deathGuardMusterUnits} from './death-guard-data';
import {deathGuardUnitLimit} from './death-guard-muster';
import {thousandSonsMusterUnits} from './thousand-sons-data';
import {thousandSonsUnitLimit} from './thousand-sons-muster';
import {migrateSavedArmy} from './migrate-saved-army';
import {emperorsChildrenMusterUnits} from './emperors-children-data';
import {emperorsChildrenUnitLimit} from './emperors-children-muster';
import {astraMusterUnits} from './astra-muster-data';
import {astraUnitLimit} from './astra-muster';
import {gscMusterUnits,gscUnitLimit} from './gsc-muster';
import {alliedTitanAndKnightNames,freebladeSlotsRemaining,isWarhound} from './titan-support-data';
import {ASSIGNED_AGENT_UNITS} from './assigned-agent-data';
import {agentUnitLimit} from './agent-muster';
import {KnightRoster} from './KnightRoster';
import {daemonMusterUnits} from './chaos-daemons-data';
import {daemonUnitLimit} from './chaos-daemon-muster';
import {orkUnitLimit} from './ork-muster';
import {worldEatersMusterUnits} from './world-eaters-data';
import {worldEatersUnitLimit} from './world-eaters-muster';
import {votannUnitLimit} from './votann-muster';
import {custodesUnitLimit} from './custodes-muster';
import {chaosKnightMusterUnits} from './chaos-knights-data';
import {chaosKnightUnitLimit} from './chaos-knight-muster';
import {reconcileHoundpack} from './houndpack-selection';
import {knightMusterUnits} from './imperial-knights-data';
import {knightUnitLimit} from './imperial-knight-muster';
import {NecronRoster} from './NecronRoster';
import {necronUnitLimit} from './necron-muster-legality';
import {reconcileInstanceAttachments,individualArmy} from './roster-instances';
import {ReminderSheet} from './ReminderSheet';
import {BATTLE_SIZES_2026,DETACHMENTS_2026,detachmentBudget,type BattleSize2026} from './edition-2026';
import {isModeledLeader,leaderBodyguards} from './leader-eligibility';
import {supportsMixedPrimaryWeapons} from './mixed-weapons';
import {legalUnitSizes,defaultUnitSize} from './unit-sizes';
import {rosterFindings} from './roster-findings';
import {expandRoster,autoAttachUnambiguousInstances,setInstanceAttachment,setInstanceEquipment,setInstanceEnhancement,removeRosterInstance,setInstanceModelCount,setInstanceWeaponCounts,setInstanceResurrectionOrb} from './roster-instances';
import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createBattle,validateBattleState,type BattleState} from './engine';
import {CATALOG,newSelection,addSelectionUnit,removeSelectionUnit,validateSelection,type ArmySelection,type Faction as CatalogFaction} from './catalog';
import {currentFactionUrl} from './sources';
import {equipmentOption,selectedEquipment,setEquipment} from './equipment';
import {NECRON_LEADERS,eligibleBodyguards,attachLeader} from './attachments';
import {NECRON_ENHANCEMENTS,eligibleEnhancementBearers,assignEnhancement} from './enhancements';
import {PROFILE_KEY,initialStore,updateProfile,createProfile,deleteProfile,type ProfileStore} from './profiles';
import {eligibleUpgrades2026,selectUpgrade2026} from './upgrades-2026';
import {RosterPoints} from './RosterPoints';
import {verifiedUnitSizes2026} from './datasheets-2026';
import {openSavedArmies,storeSavedArmies} from './saved-armies';
import {changeBattleSize} from './roster-battle-size';
import './style.css';

const storageKey='w40k-reminders-v2';
const completionStorageKey='w40k-reminders-completed-v1';
const armyStorageKey='w40k-reminders-army-v1';
function loadArmy():ArmySelection{try{const x=migrateSavedArmy(JSON.parse(localStorage.getItem(armyStorageKey)||'null'));return validateSelection(x)?x:newSelection();}catch{return newSelection();}}
function loadCompleted():string[]{try{const x=JSON.parse(localStorage.getItem(completionStorageKey)||'[]');return Array.isArray(x)?x.filter((v):v is string=>typeof v==='string').slice(-500):[];}catch{return [];}}
function load():BattleState {try{const x=JSON.parse(localStorage.getItem(storageKey)||'null');return validateBattleState(x)?x:createBattle();}catch{return createBattle();}}
function loadProfiles() {
 const fallback=()=>initialStore(loadArmy(),load(),loadCompleted());
 const serialized=localStorage.getItem(PROFILE_KEY);
 try{return openSavedArmies(JSON.parse(serialized??'null'),fallback);}
 catch{
   // Preserve the original if an interrupted write or an older version cannot be read.
   if(serialized&&!localStorage.getItem(PROFILE_KEY+'-recovery'))localStorage.setItem(PROFILE_KEY+'-recovery',serialized);
   return {store:fallback(),retained:[]};
 }
}
function App(){
 const [saved]=useState(loadProfiles);
 const [profiles,setProfiles]=useState<ProfileStore>(saved.store);
 const profile=profiles.profiles.find(p=>p.id===profiles.activeId)!;
 const army=profile.army;
 const [mode,setMode]=useState<'Edit'|'Play'>('Edit');
 const [selectedUnit,setSelectedUnit]=useState('');
 const [selectedCount,setSelectedCount]=useState(1);
 const [error,setError]=useState('');
 useEffect(()=>{localStorage.setItem(PROFILE_KEY,storeSavedArmies(profiles,saved.retained));},[profiles,saved]);
 // Keep existing single-army saves usable as a fallback on the same device.
 useEffect(()=>{
   localStorage.setItem(armyStorageKey,JSON.stringify(profile.army));
   localStorage.setItem(storageKey,JSON.stringify(profile.battle));
   localStorage.setItem(completionStorageKey,JSON.stringify(profile.completed));
 },[profile]);
 const setArmy=(value:ArmySelection|((army:ArmySelection)=>ArmySelection))=>{
   const next=typeof value==='function'?value(army):value;
   setProfiles(s=>updateProfile(s,profile.id,{army:reconcileHoundpack(army,next)}));
 };
 const editArmy=(edit:(army:ArmySelection)=>ArmySelection)=>{
   try{setArmy(edit);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Invalid roster change');}
 };
 const resetEditor=()=>{setSelectedUnit('');setSelectedCount(1);setError('');};
 const knightEditor=['Adeptus Mechanicus','Adepta Sororitas','Grey Knights','Death Guard','Thousand Sons','Emperor’s Children','Astra Militarum','Imperial Knights','Chaos Knights','Chaos Daemons','Imperial Agents','Adeptus Custodes','Orks','Leagues of Votann','Genestealer Cults','World Eaters'].includes(army.faction);
 const individualEditor=army.faction==='Necrons'||knightEditor;
 const nativeAvailable=army.faction==='Adeptus Mechanicus'?mechanicusMusterUnits(army):army.faction==='Adepta Sororitas'?sororitasMusterUnits(army):army.faction==='Grey Knights'?greyKnightsMusterUnits(army):army.faction==='Death Guard'?deathGuardMusterUnits(army):army.faction==='Thousand Sons'?thousandSonsMusterUnits(army):army.faction==='Emperor’s Children'?emperorsChildrenMusterUnits(army):army.faction==='Astra Militarum'?astraMusterUnits(army):army.faction==='World Eaters'?worldEatersMusterUnits(army):army.faction==='Genestealer Cults'?gscMusterUnits(army):army.faction==='Imperial Agents'?ASSIGNED_AGENT_UNITS:army.faction==='Chaos Daemons'?daemonMusterUnits(army):army.faction==='Chaos Knights'?chaosKnightMusterUnits(army):army.faction==='Imperial Knights'?knightMusterUnits(army):CATALOG[army.faction].units;
 const availableUnits=[...new Set([...nativeAvailable.filter(name=>!isWarhound(name)),...alliedTitanAndKnightNames(army)])];
 const copiesLeft=(unit:string)=>{
   const limit=army.faction==='Adeptus Mechanicus'?mechanicusUnitLimit(army,unit):army.faction==='Adepta Sororitas'?sororitasUnitLimit(army,unit):army.faction==='Grey Knights'?greyKnightsUnitLimit(army,unit):army.faction==='Death Guard'?deathGuardUnitLimit(army,unit):army.faction==='Thousand Sons'?thousandSonsUnitLimit(army,unit):army.faction==='Emperor’s Children'?emperorsChildrenUnitLimit(army,unit):army.faction==='Astra Militarum'?astraUnitLimit(army,unit):army.faction==='World Eaters'?worldEatersUnitLimit(army,unit):army.faction==='Genestealer Cults'?gscUnitLimit(army,unit):army.faction==='Leagues of Votann'?votannUnitLimit(army,unit):army.faction==='Orks'?orkUnitLimit(army,unit):army.faction==='Adeptus Custodes'?custodesUnitLimit(army,unit):army.faction==='Imperial Agents'?agentUnitLimit(army,unit):army.faction==='Chaos Daemons'?daemonUnitLimit(army,unit):army.faction==='Chaos Knights'?chaosKnightUnitLimit(army,unit):army.faction==='Necrons'?necronUnitLimit(army,unit):army.faction==='Imperial Knights'?knightUnitLimit(army,unit):30;
   return Math.min(freebladeSlotsRemaining(army,unit)??Infinity,Math.max(0,limit-(army.units[unit]??0)));
 };
 const remainingCopies=selectedUnit&&availableUnits.includes(selectedUnit)?copiesLeft(selectedUnit):0;
 return <main><header><h1>Warhammer 40K Reminders</h1><p>11th edition · Rules coverage varies by faction.</p></header>
 <section className="panel"><h2>Saved armies</h2>{saved.retained.length>0&&<p role="status">{saved.retained.length} older saved {saved.retained.length===1?'army needs':'armies need'} migration before editing. The original data is preserved.</p>}<div className="unit-form">
   <label>Army <select aria-label="Saved army" value={profile.id} onChange={e=>{const id=e.target.value;setProfiles(s=>({...s,activeId:id}));resetEditor();}}>
     {profiles.profiles.map(p=><option key={p.id} value={p.id}>{p.name} · {p.army.faction}</option>)}
   </select></label>
   <button className="secondary" disabled={profiles.profiles.length>=100} onClick={()=>{
     const name=window.prompt('Name your new army'); if(!name?.trim())return;
     const id=crypto.randomUUID(); setProfiles(s=>createProfile(s,id,name));resetEditor();
   }}>New army</button>
   <button className="secondary" onClick={()=>{
     const name=window.prompt('Rename army',profile.name);
     if(name?.trim())setProfiles(s=>updateProfile(s,profile.id,{name:name.trim().slice(0,100)}));
   }}>Rename</button>
   <button className="secondary" disabled={profiles.profiles.length<2} onClick={()=>{
     if(window.confirm('Delete this saved army?')){setProfiles(s=>deleteProfile(s,profile.id));resetEditor();}
   }}>Delete</button>
 </div></section>
 <section className="panel"><div className="actions">
   <button className={mode==='Edit'?'':'secondary'} onClick={()=>setMode('Edit')}>Edit army</button>
   <button className={mode==='Play'?'':'secondary'} onClick={()=>setMode('Play')}>Play reminders</button>
 </div></section>
 {mode==='Edit'&&<section className="panel"><h2>Build your army</h2><div className="unit-form"><label>Faction <select aria-label="Army faction" value={army.faction} onChange={e=>{const faction=e.target.value as CatalogFaction;setArmy(newSelection(faction));setSelectedUnit('');}}>{(Object.keys(CATALOG) as CatalogFaction[]).map(f=><option key={f}>{f}</option>)}</select></label></div><section aria-label="2026 detachment planner"><h3>Detachments</h3><label>Battle size <select aria-label="2026 battle size" value={army.battleSize2026||'Strike Force'} onChange={e=>editArmy(s=>changeBattleSize(s,e.target.value as BattleSize2026))}>{(Object.keys(BATTLE_SIZES_2026) as BattleSize2026[]).map(size=><option key={size} value={size}>{size} ({BATTLE_SIZES_2026[size].points} points)</option>)}</select></label>{DETACHMENTS_2026[army.faction]?<><p>Detachment Points: {detachmentBudget(army.faction,army.detachments2026||[],army.battleSize2026||'Strike Force').spent} / {detachmentBudget(army.faction,army.detachments2026||[],army.battleSize2026||'Strike Force').limit}</p>{DETACHMENTS_2026[army.faction]!.map(det=><label key={det.name} style={{display:'block'}}><input type="checkbox" disabled={!army.detachments2026?.includes(det.name)&&!detachmentBudget(army.faction,[...(army.detachments2026||[]),det.name],army.battleSize2026??'Strike Force').valid} checked={(army.detachments2026||[]).includes(det.name)} onChange={e=>{const next=e.target.checked?[...(army.detachments2026||[]),det.name]:(army.detachments2026||[]).filter(n=>n!==det.name);if(next.length&&!detachmentBudget(army.faction,next,army.battleSize2026||'Strike Force').valid){setError('Detachment Point budget exceeded or selection invalid');return;}setArmy(s=>reconcileInstanceAttachments({...s,detachments2026:next,upgrades2026:Object.fromEntries(Object.entries(s.upgrades2026||{}).filter(([key,name])=>{const unit=s.instances?.find(x=>x.id===key)?.unit||key;return next.some(det=>eligibleUpgrades2026({...s,detachments2026:next},unit,key).some(upgrade=>upgrade.name===name&&upgrade.detachment===det));}))}));setError('');}}/> {det.name==='Skysword Spearhead'?'Skyshroud Spearhead':det.name} — {det.dp} DP · {[det.disposition,...(det.additionalDispositions??[])].join(', ')}</label>)}<p>Force Dispositions: {detachmentBudget(army.faction,army.detachments2026||[],army.battleSize2026||'Strike Force').dispositions.join(', ')||'Select a detachment'}</p></>:<p className="muted">2026 detachment catalog for this faction is not yet imported.</p>}</section><div className="unit-form"><label>Unit <select aria-label="Select unit" value={selectedUnit} onChange={e=>{setSelectedUnit(e.target.value);setSelectedCount(1);}}><option value="">Select a unit…</option>{availableUnits.map(u=><option key={u} disabled={copiesLeft(u)===0}>{u}</option>)}</select></label><label>Quantity <select aria-label="Unit quantity" value={selectedCount} onChange={e=>setSelectedCount(Number(e.target.value))}>{[1,2,3,4,5,6,10,20].filter(n=>n<=remainingCopies).map(n=><option key={n} value={n}>{n}</option>)}</select></label><button disabled={!selectedUnit||selectedCount>remainingCopies} onClick={()=>{editArmy(s=>autoAttachUnambiguousInstances(addSelectionUnit(individualEditor?individualArmy(s):s,selectedUnit,selectedCount)));setSelectedUnit('');setSelectedCount(1);}}>Add</button></div>{army.faction==='Necrons'?<NecronRoster army={army} onChange={editArmy}/>:knightEditor?<KnightRoster army={army} onChange={editArmy}/>:Object.entries(army.units).map(([unit,count])=><div className="unit" key={unit}><div><strong>{count} × {unit}</strong>{!army.instances&&equipmentOption(army,unit)&&<label> Equipment <select aria-label={'Equipment for '+unit} value={selectedEquipment(army,unit)} onChange={e=>setArmy(s=>setEquipment(s,unit,e.target.value))}>{equipmentOption(army,unit)!.choices.map(choice=><option key={choice}>{choice}</option>)}</select></label>}</div>{!army.instances&&Object.prototype.hasOwnProperty.call(NECRON_LEADERS,unit)&&<label> Attach to <select aria-label={'Attach '+unit+' to'} value={army.attachments?.[unit]||''} onChange={e=>{try{setArmy(s=>attachLeader(s,unit,e.target.value||null));setError('');}catch(err){setError(String(err));}}}><option value="">Not attached</option>{eligibleBodyguards(army,unit).map(body=><option key={body} value={body}>{body}</option>)}</select></label>}{!army.instances&&eligibleEnhancementBearers(army).includes(unit)&&<label> Enhancement <select aria-label={'Enhancement for '+unit} value={army.enhancements?.[unit]||''} onChange={e=>{try{setArmy(s=>assignEnhancement(s,unit,e.target.value||null));setError('');}catch(err){setError(String(err));}}}><option value="">No enhancement</option>{(NECRON_ENHANCEMENTS[army.detachment]||[]).filter(enh=>enh===army.enhancements?.[unit]||!Object.values(army.enhancements||{}).includes(enh)).map(enh=><option key={enh}>{enh}</option>)}</select></label>}{!army.instances&&eligibleUpgrades2026(army,unit).length>0&&<label>11th-edition upgrade <select aria-label={'11th upgrade for '+unit} value={army.upgrades2026?.[unit]||''} onChange={e=>{try{setArmy(s=>selectUpgrade2026(s,unit,e.target.value||null));setError('');}catch(err){setError(String(err));}}}><option value="">No upgrade</option>{eligibleUpgrades2026(army,unit).map(upgrade=><option key={upgrade.name} value={upgrade.name}>{upgrade.name}</option>)}</select></label>}<button className="secondary" onClick={()=>setArmy(s=>removeSelectionUnit(s,unit))}>Remove</button></div>)}{!individualEditor&&<div><h3>Individual squads and Leader assignments</h3><p className="muted">Enable individual squads for separate unit reminders across all factions. Necron armies also support the modeled Leader attachment and enhancement options. Existing unit counts are preserved.</p>{!army.instances?<button className="secondary" onClick={()=>setArmy(s=>({...s,instances:expandRoster(s),attachments:{},enhancements:{},equipment:{}}))}>Enable individual squads</button>:expandRoster(army).map(instance=><div className="unit" key={instance.id}><strong>{instance.id}</strong>{instance.unit==='Overlord'&&<label>Resurrection Orb <select aria-label={'Resurrection Orb for '+instance.id} value={instance.resurrectionOrb?'yes':'no'} onChange={e=>setArmy(s=>setInstanceResurrectionOrb(s,instance.id,e.target.value==='yes'))}><option value="no">Not equipped</option><option value="yes">Equipped</option></select></label>}{(verifiedUnitSizes2026(army,instance.unit)||legalUnitSizes(army.faction,instance.unit))&&<label>Models <select aria-label={'Models for squad '+instance.id} value={instance.models??defaultUnitSize(army.faction,instance.unit)} onChange={e=>{try{setArmy(s=>setInstanceModelCount(s,instance.id,Number(e.target.value)));setError('');}catch(err){setError(String(err));}}}>{(verifiedUnitSizes2026(army,instance.unit)||legalUnitSizes(army.faction,instance.unit))!.map(n=><option key={n} value={n}>{n}</option>)}</select></label>}{supportsMixedPrimaryWeapons(army.faction,instance.unit)&&equipmentOption(army,instance.unit)&&<label>Weapon configuration <select aria-label={'Weapon configuration for '+instance.id} value={instance.weaponCounts?'mixed':'uniform'} onChange={e=>{try{setArmy(s=>{if(e.target.value==='uniform'){return {...s,instances:s.instances?.map(x=>x.id===instance.id?{...x,weaponCounts:undefined}:x)};}const opt=equipmentOption(s,instance.unit)!;const models=instance.models??defaultUnitSize(army.faction,instance.unit)??1;return setInstanceWeaponCounts(s,instance.id,{[opt.defaultChoice]:models});});setError('');}catch(err){setError(String(err));}}}><option value="uniform">Single weapon type</option><option value="mixed">Model-by-model counts</option></select></label>}{instance.weaponCounts&&equipmentOption(army,instance.unit)?.choices.map(weapon=><label key={weapon}>{weapon} models <select aria-label={weapon+' models in '+instance.id} value={instance.weaponCounts?.[weapon]||0} onChange={e=>{try{const options=equipmentOption(army,instance.unit)!.choices;const models=instance.models??defaultUnitSize(army.faction,instance.unit)??1;const desired=Number(e.target.value);const counts:Record<string,number>={[weapon]:desired};let remaining=models-desired;for(const other of options.filter(w=>w!==weapon)){const amount=Math.min(remaining,instance.weaponCounts?.[other]||0);counts[other]=amount;remaining-=amount;}if(remaining>0){const fallback=options.find(w=>w!==weapon)!;counts[fallback]=(counts[fallback]||0)+remaining;}setArmy(s=>setInstanceWeaponCounts(s,instance.id,counts));setError('');}catch(err){setError(String(err));}}}>{Array.from({length:(instance.models??defaultUnitSize(army.faction,instance.unit)??1)+1},(_,n)=><option key={n} value={n}>{n}</option>)}</select></label>)}{!instance.weaponCounts&&equipmentOption(army,instance.unit)&&<label>Equipment <select aria-label={'Equipment for squad '+instance.id} value={instance.equipment||equipmentOption(army,instance.unit)!.choices[0]} onChange={e=>{try{setArmy(s=>setInstanceEquipment(s,instance.id,e.target.value));setError('');}catch(err){setError(String(err));}}}>{equipmentOption(army,instance.unit)!.choices.map(choice=><option key={choice}>{choice}</option>)}</select></label>}{eligibleEnhancementBearers(army).includes(instance.unit)&&<label>Enhancement <select aria-label={'Enhancement for squad '+instance.id} value={instance.enhancement||''} onChange={e=>{try{setArmy(s=>setInstanceEnhancement(s,instance.id,e.target.value||null));setError('');}catch(err){setError(String(err));}}}><option value="">No enhancement</option>{(NECRON_ENHANCEMENTS[army.detachment]||[]).map(enh=><option key={enh}>{enh}</option>)}</select></label>}{eligibleUpgrades2026(army,instance.unit).length>0&&<label>11th-edition upgrade <select aria-label={'11th upgrade for squad '+instance.id} value={army.upgrades2026?.[instance.id]||''} onChange={e=>{try{setArmy(s=>selectUpgrade2026(s,instance.id,e.target.value||null));setError('');}catch(err){setError(String(err));}}}><option value="">No upgrade</option>{eligibleUpgrades2026(army,instance.unit).map(upgrade=><option key={upgrade.name} value={upgrade.name}>{upgrade.name}</option>)}</select></label>}{isModeledLeader(army.faction,instance.unit)&&<label>Attach to squad <select aria-label={'Attach squad '+instance.id} value={instance.attachedTo||''} onChange={e=>{try{setArmy(s=>setInstanceAttachment(s,instance.id,e.target.value||null));setError('');}catch(err){setError(String(err));}}}><option value="">Not attached</option>{expandRoster(army).filter(body=>leaderBodyguards(army.faction,instance.unit).includes(body.unit)).map(body=><option key={body.id} value={body.id}>{body.id}</option>)}</select></label>}<button className="secondary" aria-label={'Remove squad '+instance.id} onClick={()=>{try{setArmy(s=>removeRosterInstance(s,instance.id));setError('');}catch(err){setError(String(err));}}}>Remove squad</button></div>)}</div>}<RosterPoints army={army}/><section aria-label="Roster validation findings"><h3>Roster validation and coverage</h3><p className="muted">Loadouts use the linked 11th-edition datasheets. A roster that passes the implemented checks can still have other rules or mission restrictions.</p><ul>{rosterFindings(army).map((finding,index)=><li key={finding.code+'-'+(finding.unit||'')+'-'+index}><strong>{finding.severity.toUpperCase()}</strong> · {finding.message}</li>)}</ul></section><p><a href={currentFactionUrl(army)} target="_blank" rel="noopener noreferrer">Wahapedia: {army.faction} faction rules and detachments</a></p>{!individualEditor&&Object.keys(army.units).map(unit=><p key={unit}><a href={currentFactionUrl(army)+'datasheets.html'} target="_blank" rel="noopener noreferrer">{unit} datasheet reference</a></p>)}</section>}
 {mode==='Play'&&<ReminderSheet key={profile.id} profile={profile} onCompleted={completed=>setProfiles(s=>updateProfile(s,profile.id,{completed}))}/>}
 {error&&<p role="alert" className="error">{error}</p>}</main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
