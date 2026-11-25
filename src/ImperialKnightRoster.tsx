import type {ArmySelection} from './catalog';
import {DATASHEETS_2026,verifiedUnitSizes2026} from './datasheets-2026';
import {ImperialKnightLoadout} from './ImperialKnightLoadout';
import {knightWarlordCandidates,resolvedKnightWarlord,selectKnightWarlord} from './imperial-knight-muster';
import {instanceBodyguards,isModeledLeader,rosterAttachmentRole} from './leader-eligibility';
import {expandRoster,individualArmy,removeRosterInstance,setInstanceAttachment,setInstanceModelCount} from './roster-instances';
import {availableUpgrades2026,selectUpgrade2026,upgradeName2026} from './upgrades-2026';

interface Props {
  army:ArmySelection;
  onChange:(edit:(army:ArmySelection)=>ArmySelection)=>void;
}

export function ImperialKnightRoster({army,onChange}:Props) {
  const roster=expandRoster(army);
  const edit:Props['onChange']=change=>onChange(current=>change(individualArmy(current)));
  const warlords=knightWarlordCandidates(army);
  return <>
    {warlords.length===1 && <p>Warlord: {warlords[0].id}</p>}
    {warlords.length>1 && <label>Warlord <select aria-label="Warlord" value={resolvedKnightWarlord(army)?.id??''} onChange={e=>edit(a=>selectKnightWarlord(a,e.target.value||null))}>
      <option value="">Select Warlord</option>{warlords.map(s=><option key={s.id}>{s.id}</option>)}
    </select></label>}
    {roster.map(squad=>{
      const sheet=DATASHEETS_2026.find(row=>row.faction===army.faction&&row.unit===squad.unit);
      const sizes=verifiedUnitSizes2026(army,squad.unit);
      const upgrades=availableUpgrades2026(army,squad);
      const bodies=roster.filter(body=>instanceBodyguards(army,squad).includes(body.unit)).filter(body=>{
        try {setInstanceAttachment(army,squad.id,body.id);return true;} catch {return false;}
      });
      return <section key={squad.id} className="loadout" aria-label={'Squad '+squad.id}>
        <div className="squad-heading"><strong>{squad.id}</strong>{sheet&&<a href={sheet.source} target="_blank" rel="noreferrer">Datasheet</a>}</div>
        <div className="loadout-controls">
          {sizes&&sizes.length>1?<label>Models <select aria-label={'Models for squad '+squad.id} value={squad.models??sizes[0]} onChange={e=>edit(a=>setInstanceModelCount(a,squad.id,Number(e.target.value)))}>
            {sizes.map(n=><option key={n}>{n}</option>)}</select></label>:sheet&&<span>{sheet.sizes[0]} {sheet.sizes[0]===1?'model':'models'}</span>}
          {upgrades.length>0&&<label>Enhancement <select aria-label={'11th upgrade for squad '+squad.id} value={upgradeName2026(army,squad)??''} onChange={e=>edit(a=>selectUpgrade2026(a,squad.id,e.target.value||null))}>
            <option value="">None</option>{upgrades.map(u=><option key={u.name} value={u.name}>{u.name} (+{u.points} pts)</option>)}
          </select></label>}
          {isModeledLeader(army.faction,squad.unit)&&<label>Attached to <select aria-label={'Attach squad '+squad.id} value={squad.attachedTo??''} onChange={e=>edit(a=>setInstanceAttachment(a,squad.id,e.target.value||null))}>
            <option value="">{rosterAttachmentRole(army.faction,squad.unit)==='support'?'Bodyguard required':'Unattached'}</option>{bodies.map(b=><option key={b.id}>{b.id}</option>)}
          </select></label>}
        </div>
        <ImperialKnightLoadout army={army} squad={squad} onChange={edit}/>
        <button className="secondary" aria-label={'Remove squad '+squad.id} onClick={()=>edit(a=>removeRosterInstance(a,squad.id))}>Remove squad</button>
      </section>;
    })}
  </>;
}
