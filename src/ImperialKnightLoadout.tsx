import {rosterAttachmentRole} from './leader-eligibility';
import {expandRoster} from './roster-instances';
import React from 'react';
import {guardFactionUpdate,kasrkinProfileConflict} from './astra-militarum-loadouts';
import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {gearEnhancementConflict,knightLoadoutFor,knightItemsLabel,setKnightGear,validKnightGear} from './knight-loadouts';

interface Props {
  army: ArmySelection;
  squad: RosterInstance;
  onChange: (edit:(army:ArmySelection)=>ArmySelection)=>void;
}
export function KnightLoadout({army,squad,onChange}:Props) {
  const sheet=knightLoadoutFor(army.faction,squad.unit,squad.models,squad.knightGear);
  if(!sheet)return null;
  return <>
    {sheet.fixed.length>0&&<p className="fixed-gear">{knightItemsLabel(sheet.fixed)}</p>}
    {kasrkinProfileConflict(squad)&&<p>The Kasrkin card allows the Sergeant’s power weapon. The September faction update removes its attack profile. <a href={guardFactionUpdate} target="_blank" rel="noreferrer">Faction update, p. 24</a></p>}
    {sheet.slots.length>0&&<div className="loadout-controls">{sheet.slots.filter(slot=>!['Leader group','Support group'].includes(slot.name)||expandRoster(army).some(s=>s.attachedTo===squad.id&&rosterAttachmentRole(army.faction,s.unit,army)===(slot.name==='Leader group'?'leader':'support'))).map(slot=><label key={slot.name}>{slot.name}
      <select aria-label={slot.name+' for '+squad.id} value={squad.knightGear?.[slot.name]??slot.choices[0].name}
        onChange={event=>{const value=event.target.value;onChange(a=>setKnightGear(a,squad.id,slot.name,value));}}>
        {slot.choices.map(choice=>{
          const updated={...squad,knightGear:{...squad.knightGear,[slot.name]:choice.name}};
          const conflict=gearEnhancementConflict(army,updated);
          return <option key={choice.name} title={conflict}
            disabled={!!conflict||(!['Unit composition','Battle formation'].includes(slot.name)&&!validKnightGear(updated,army.faction))}>{choice.name}</option>;
        })}
      </select>
    </label>)}</div>}
  </>;
}

export {KnightLoadout as ImperialKnightLoadout};
