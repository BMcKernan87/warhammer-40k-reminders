import {sororitasWarlordCandidates,resolvedSororitasWarlord,selectSororitasWarlord} from './sororitas-muster';
import {greyKnightsWarlordCandidates,resolvedGreyKnightsWarlord,selectGreyKnightsWarlord} from './grey-knights-muster';
import {deathGuardWarlordCandidates,resolvedDeathGuardWarlord,selectDeathGuardWarlord} from './death-guard-muster';
import {thousandSonsWarlordCandidates,resolvedThousandSonsWarlord,selectThousandSonsWarlord} from './thousand-sons-muster';
import {emperorsChildrenWarlordCandidates,resolvedEmperorsChildrenWarlord,selectEmperorsChildrenWarlord} from './emperors-children-muster';
import {astraCanPromote,astraWarlordCandidates,loyalProtectors,resolvedAstraWarlord} from './astra-muster-data';
import {selectAstraWarlord,setAstraCharacter} from './astra-muster';
import {astraProtectorHosts,setAstraProtector} from './astra-protectors';
import {acolyteVariants,formerAcolyte,identifySavedAcolytes,gscWarlordCandidates,resolvedGscWarlord,selectGscWarlord} from './gsc-muster';
import type {ArmySelection} from './catalog';
import {DATASHEETS_2026,verifiedUnitSizes2026} from './datasheets-2026';
import {agentWarlordCandidates,resolvedAgentWarlord,selectAgentWarlord} from './agent-muster';
import {resolvedWarDogCharacterIds} from './chaos-knight-detachments';
import {daemonWarlordCandidates,resolvedDaemonWarlord,selectDaemonWarlord} from './chaos-daemon-muster';
import {orkWarlordCandidates,resolvedOrkWarlord,selectOrkWarlord} from './ork-muster';
import {worldEatersWarlordCandidates,resolvedWorldEatersWarlord,selectWorldEatersWarlord} from './world-eaters-muster';
import {votannWarlordCandidates,resolvedVotannWarlord,selectVotannWarlord} from './votann-muster';
import {custodesWarlordCandidates,resolvedCustodesWarlord,selectCustodesWarlord} from './custodes-muster';
import {chaosKnightWarlordCandidates,resolvedChaosKnightWarlord,selectChaosKnightWarlord} from './chaos-knight-muster';
import {houndpackDogs,changeHoundpackCharacter} from './houndpack-selection';
import {KnightLoadout} from './ImperialKnightLoadout';
import {knightWarlordCandidates,resolvedKnightWarlord,selectKnightWarlord} from './imperial-knight-muster';
import {instanceBodyguards,isModeledLeader,rosterAttachmentRole} from './leader-eligibility';
import {expandRoster,individualArmy,removeRosterInstance,setInstanceAttachment,setInstanceModelCount} from './roster-instances';
import {availableUpgrades2026,selectUpgrade2026,upgradeName2026} from './upgrades-2026';

interface Props {
  army:ArmySelection;
  onChange:(edit:(army:ArmySelection)=>ArmySelection)=>void;
}

export function KnightRoster({army,onChange}:Props) {
  const roster=expandRoster(army);
  const edit:Props['onChange']=change=>onChange(current=>change(individualArmy(current)));
  const chaos=army.faction==='Chaos Knights';
  const custodes=army.faction==='Adeptus Custodes';
  const orks=army.faction==='Orks';
  const agents=army.faction==='Imperial Agents';
  const daemons=army.faction==='Chaos Daemons';
  const sisters=army.faction==='Adepta Sororitas';
  const grey=army.faction==='Grey Knights';
  const deathGuard=army.faction==='Death Guard';
  const thousand=army.faction==='Thousand Sons';
  const legion=army.faction==='Emperor’s Children';
  const guard=army.faction==='Astra Militarum';
  const eaters=army.faction==='World Eaters';
  const cult=army.faction==='Genestealer Cults';
  const votann=army.faction==='Leagues of Votann';
  const warlords=sisters?sororitasWarlordCandidates(army):grey?greyKnightsWarlordCandidates(army):deathGuard?deathGuardWarlordCandidates(army):thousand?thousandSonsWarlordCandidates(army):legion?emperorsChildrenWarlordCandidates(army):guard?astraWarlordCandidates(army):eaters?worldEatersWarlordCandidates(army):cult?gscWarlordCandidates(army):votann?votannWarlordCandidates(army):orks?orkWarlordCandidates(army):custodes?custodesWarlordCandidates(army):agents?agentWarlordCandidates(army):daemons?daemonWarlordCandidates(army):chaos?chaosKnightWarlordCandidates(army):knightWarlordCandidates(army);
  const warlord=sisters?resolvedSororitasWarlord(army):grey?resolvedGreyKnightsWarlord(army):deathGuard?resolvedDeathGuardWarlord(army):thousand?resolvedThousandSonsWarlord(army):legion?resolvedEmperorsChildrenWarlord(army):guard?resolvedAstraWarlord(army):eaters?resolvedWorldEatersWarlord(army):cult?resolvedGscWarlord(army):votann?resolvedVotannWarlord(army):orks?resolvedOrkWarlord(army):custodes?resolvedCustodesWarlord(army):agents?resolvedAgentWarlord(army):daemons?resolvedDaemonWarlord(army):chaos?resolvedChaosKnightWarlord(army):resolvedKnightWarlord(army);
  const selectWarlord=sisters?selectSororitasWarlord:grey?selectGreyKnightsWarlord:deathGuard?selectDeathGuardWarlord:thousand?selectThousandSonsWarlord:legion?selectEmperorsChildrenWarlord:guard?selectAstraWarlord:eaters?selectWorldEatersWarlord:cult?selectGscWarlord:votann?selectVotannWarlord:orks?selectOrkWarlord:custodes?selectCustodesWarlord:agents?selectAgentWarlord:daemons?selectDaemonWarlord:chaos?selectChaosKnightWarlord:selectKnightWarlord;
  const dogs=houndpackDogs(army);
  const promoted=resolvedWarDogCharacterIds(army,roster);
  return <>
    {dogs.length>3&&<fieldset><legend>Houndpack Characters · choose three War Dogs</legend>
      {dogs.map(s=><label key={s.id}><input type="checkbox" aria-label={'Nominate '+s.id+' as a Houndpack Character'} checked={promoted.includes(s.id)}
        disabled={promoted.length===3&&!promoted.includes(s.id)} onChange={e=>edit(a=>changeHoundpackCharacter(a,s.id,e.target.checked))}/> {s.id} </label>)}
    </fieldset>}
    {warlords.length===1 && <p>Warlord: {warlords[0].id}</p>}
    {warlords.length>1 && <label>Warlord <select aria-label="Warlord" value={warlord?.id??''} onChange={e=>edit(a=>selectWarlord(a,e.target.value||null))}>
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
          {guard&&astraCanPromote(army,squad)&&<label><input type="checkbox" aria-label={'Promote '+squad.id+' to Character'} checked={!!squad.characterPromotion} onChange={e=>edit(a=>setAstraCharacter(a,squad.id,e.target.checked))}/> Steel Hammer Character</label>}
          {guard&&loyalProtectors.has(squad.unit)&&<label>Command Squad <select aria-label={'Command Squad for '+squad.id} value={squad.retinueTo??''} onChange={e=>edit(a=>setAstraProtector(a,squad.id,e.target.value||null))}>
            <option value="">Command Squad required</option>{astraProtectorHosts(army,squad.id).map(s=><option key={s.id}>{s.id}</option>)}
          </select></label>}
          {cult&&squad.unit===formerAcolyte&&<label>Current datasheet <select aria-label={'Identify saved squad '+squad.id} value="" onChange={e=>edit(a=>identifySavedAcolytes(a,squad.id,e.target.value))}>
            <option value="">Choose datasheet</option>{acolyteVariants.map(name=><option key={name}>{name}</option>)}
          </select></label>}
          {sizes&&sizes.length>1?<label>Models <select aria-label={'Models for squad '+squad.id} value={squad.models??sizes[0]} onChange={e=>edit(a=>setInstanceModelCount(a,squad.id,Number(e.target.value)))}>
            {sizes.map(n=><option key={n}>{n}</option>)}</select></label>:sheet&&<span>{sheet.sizes[0]} {sheet.sizes[0]===1?'model':'models'}</span>}
          {upgrades.length>0&&<label>Enhancement <select aria-label={'11th upgrade for squad '+squad.id} value={upgradeName2026(army,squad)??''} onChange={e=>edit(a=>selectUpgrade2026(a,squad.id,e.target.value||null))}>
            <option value="">None</option>{upgrades.map(u=><option key={u.name} value={u.name}>{u.name} (+{u.points} pts)</option>)}
          </select></label>}
          {isModeledLeader(army.faction,squad.unit)&&<label>Attached to <select aria-label={'Attach squad '+squad.id} value={squad.attachedTo??''} onChange={e=>edit(a=>setInstanceAttachment(a,squad.id,e.target.value||null))}>
            <option value="">{rosterAttachmentRole(army.faction,squad.unit)==='support'?'Bodyguard required':'Unattached'}</option>{bodies.map(b=><option key={b.id}>{b.id}</option>)}
          </select></label>}
        </div>
        <KnightLoadout army={army} squad={squad} onChange={edit}/>
        <button className="secondary" aria-label={'Remove squad '+squad.id} onClick={()=>edit(a=>removeRosterInstance(a,squad.id))}>Remove squad</button>
      </section>;
    })}
  </>;
}
