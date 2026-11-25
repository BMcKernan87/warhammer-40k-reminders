import React from 'react';
import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {IMPERIAL_KNIGHT_LOADOUTS,knightItemsLabel,setKnightGear,validKnightGear} from './imperial-knight-loadouts';

interface Props {
  army: ArmySelection;
  squad: RosterInstance;
  onChange: (edit:(army:ArmySelection)=>ArmySelection)=>void;
}
export function ImperialKnightLoadout({army,squad,onChange}:Props) {
  const sheet=IMPERIAL_KNIGHT_LOADOUTS[squad.unit];
  if(!sheet||army.faction!=='Imperial Knights')return null;
  return <>
    {sheet.fixed.length>0&&<p className="fixed-gear">{knightItemsLabel(sheet.fixed)}</p>}
    {sheet.slots.length>0&&<div className="loadout-controls">{sheet.slots.map(slot=><label key={slot.name}>{slot.name}
      <select aria-label={slot.name+' for '+squad.id} value={squad.knightGear?.[slot.name]??slot.choices[0].name}
        onChange={event=>{const value=event.target.value;onChange(a=>setKnightGear(a,squad.id,slot.name,value));}}>
        {slot.choices.map(choice=><option key={choice.name}
          disabled={!validKnightGear({...squad,knightGear:{...squad.knightGear,[slot.name]:choice.name}})}>{choice.name}</option>)}
      </select>
    </label>)}</div>}
  </>;
}
