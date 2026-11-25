import type {ArmySelection} from './catalog';
import {DATASHEETS_2026,rosterCost2026,type UnitProfile2026} from './datasheets-2026';

function profileText(p:UnitProfile2026){
  return 'M '+p.move+' · T '+p.toughness+' · Sv '+p.save+' · W '+p.wounds+' · Ld '+p.leadership+' · OC '+p.objectiveControl;
}

export function RosterPoints({army}:{army:ArmySelection}){
  const costs=rosterCost2026(army);
  return <section aria-label="11th-edition points">
    <h3>11th-edition roster points</h3>
    <p>{costs.total===null?'Total unavailable — '+costs.unknownUnits.length+' entries need verified point values or explicit model counts.':'Recorded 11th-edition total: '+costs.total+' points'}</p>
    {costs.entries.map(entry=>{
      const sheet=DATASHEETS_2026.find(d=>d.faction===army.faction&&d.unit===entry.unit);
      const extras=[
        entry.wargearPoints&&'+'+entry.wargearPoints+' weapons',
        entry.enhancementPoints&&'+'+entry.enhancementPoints+' enhancement',
        entry.bindingPoints&&'+'+entry.bindingPoints+' mandatory binding'
      ].filter(Boolean);
      return <div key={entry.id}>
        <p>{entry.id}: {entry.points===null?'Points not verified':entry.points+' pts'}
          {extras.length>0&&' (includes '+extras.join(', ')+')'}
          {sheet?.profile&&!sheet.modelProfiles&&<span> · {profileText(sheet.profile)}</span>}
          {entry.source&&<a href={entry.source} target="_blank" rel="noopener noreferrer"> · Datasheet source</a>}
        </p>
        {Object.entries(sheet?.modelProfiles??{}).map(([model,p])=><p key={model}>{model} · {profileText(p)}</p>)}
      </div>;
    })}
  </section>;
}
