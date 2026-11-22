import React from 'react';
import type {ArmySelection} from './catalog';
import {expandRoster,individualArmy,removeRosterInstance,setInstanceAttachment,setInstanceEquipment,setInstanceModelCount,setInstanceResurrectionOrb,setInstanceWargear,setInstanceWeaponCounts,type RosterInstance} from './roster-instances';
import {NECRON_LOADOUTS,availableGearCount,currentEquipmentName,necronSource} from './necron-wargear';
import {necronAttachmentRole} from './attachments';
import {isModeledLeader,leaderBodyguards} from './leader-eligibility';
import {verifiedUnitSizes2026} from './datasheets-2026';
import {eligibleUpgrades2026,selectUpgrade2026} from './upgrades-2026';

type Edit = (fn:(army:ArmySelection)=>ArmySelection)=>void;
function numbers(max:number) {
  return Array.from({length:max+1},(_,n)=><option key={n} value={n}>{n}</option>);
}
function redistribute(squad:RosterInstance,choices:readonly string[],choice:string,count:number,models:number) {
  const counts:Record<string,number>={[choice]:count};
  const others=choices.filter(w=>w!==choice);
  let rest=models-count;
  for(const w of others){
    counts[w]=Math.min(rest,squad.weaponCounts?.[w]??0);
    rest-=counts[w];
  }
  counts[others[0]]+=rest;
  return counts;
}
function Loadout({army,squad,edit}:{army:ArmySelection;squad:RosterInstance;edit:Edit}) {
  const sheet=NECRON_LOADOUTS[squad.unit];
  const sizes=verifiedUnitSizes2026(army,squad.unit)??[1];
  const models=squad.models??sizes[0];
  const primary=currentEquipmentName(squad.unit,squad.equipment??sheet.primary?.[0]??'');
  const choices=sheet.primary??[];
  const single=army.units[squad.unit]===1;
  const upgrades=eligibleUpgrades2026(army,squad.unit);
  const roster=expandRoster(army);
  const bodies=roster.filter(body=>leaderBodyguards('Necrons',squad.unit).includes(body.unit) &&
    !roster.some(l=>l.id!==squad.id&&l.attachedTo===body.id&&necronAttachmentRole(l.unit)===necronAttachmentRole(squad.unit)));
  const fixed=[sheet.fixed,choices.length===1?choices[0]:''].filter(Boolean).join(' · ');
  const special=squad.unit==='Canoptek Macrocytes' ? Object.values(squad.wargear??{}).reduce((sum,n)=>sum+n,0) : 0;
  return <section className="loadout" aria-label={'Squad '+squad.id}>
    <div className="squad-heading"><strong>{squad.id}</strong><a href={necronSource(squad.unit)} target="_blank" rel="noreferrer">Datasheet</a></div>
    {fixed&&<p className="fixed-gear">{fixed}</p>}
    <div className="loadout-controls">
      {sizes.length>1?<label>Models <select aria-label={'Models for squad '+squad.id} value={models} onChange={e=>edit(a=>setInstanceModelCount(a,squad.id,Number(e.target.value)))}>{sizes.map(n=><option key={n}>{n}</option>)}</select></label>:<span>{models} {models===1?'model':'models'}</span>}
      {choices.length>1&&<label>{special?`Primary weapon · ${models-special} bearers`:'Primary weapon'} <select aria-label={single?'Equipment for '+squad.unit:'Equipment for squad '+squad.id}
        value={squad.weaponCounts?'mixed':primary} onChange={e=>edit(a=>e.target.value==='mixed'
          ?setInstanceWeaponCounts(a,squad.id,{[primary]:models}):setInstanceEquipment(a,squad.id,e.target.value))}>
        {choices.map(c=><option key={c} disabled={squad.unit==='Overlord'&&squad.resurrectionOrb&&c===choices[0]}>{c}</option>)}
        {sheet.mixed&&<option value="mixed">Mixed weapons</option>}
      </select></label>}
      {squad.weaponCounts&&choices.map(choice=><label key={choice}>{choice} models
        <select aria-label={choice+' models in '+squad.id} value={squad.weaponCounts?.[choice]??0}
          onChange={e=>edit(a=>setInstanceWeaponCounts(a,squad.id,redistribute(squad,choices,choice,Number(e.target.value),models)))}>{numbers(models)}</select></label>)}
      {squad.unit==='Overlord'&&<label>Resurrection orb <select aria-label={'Resurrection Orb for '+squad.id} value={squad.resurrectionOrb?'yes':'no'}
        onChange={e=>edit(a=>setInstanceResurrectionOrb(a,squad.id,e.target.value==='yes'))}>
        <option value="no">None</option><option value="yes" disabled={primary===choices[0]}>Equipped</option></select></label>}
      {sheet.slots?.flatMap(slot=>slot.choices.map(option=><label key={option}>{option==='Overlord’s blade'?'Replace staff of light with Overlord’s blade':option}
        <select aria-label={option+' in '+squad.id} value={squad.wargear?.[option]??0} onChange={e=>edit(a=>setInstanceWargear(a,squad.id,option,Number(e.target.value)))}>
          {numbers(availableGearCount(slot,squad,option,models))}
        </select></label>))}
      {isModeledLeader('Necrons',squad.unit)&&<label>Attached to <select aria-label={'Attach squad '+squad.id} value={squad.attachedTo??''} onChange={e=>edit(a=>setInstanceAttachment(a,squad.id,e.target.value||null))}>
        <option value="">Unattached</option>{bodies.map(b=><option key={b.id}>{b.id}</option>)}</select></label>}
      {upgrades.length>0&&<label>11th-edition upgrade <select aria-label={'11th upgrade for squad '+squad.id} value={army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??''} onChange={e=>edit(a=>selectUpgrade2026(a,squad.id,e.target.value||null))}>
        <option value="">None</option>{upgrades.map(u=><option key={u.name}>{u.name}</option>)}</select></label>}
    </div>
    <button className="secondary" aria-label={'Remove squad '+squad.id} onClick={()=>edit(a=>removeRosterInstance(a,squad.id))}>Remove squad</button>
  </section>;
}
export function NecronRoster({army,onChange}:{army:ArmySelection;onChange:Edit}) {
  return <>{expandRoster(army).map(s=><Loadout key={s.id} squad={s} army={army} edit={fn=>onChange(a=>fn(individualArmy(a)))}/>)}</>;
}
