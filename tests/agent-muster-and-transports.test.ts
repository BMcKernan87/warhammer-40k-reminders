import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {agentTransports} from '../src/agent-transports';
import {agentMusterFindings,agentWarlordCandidates} from '../src/agent-muster';
import {rosterCost2026} from '../src/datasheets-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {availableUpgrades2026} from '../src/upgrades-2026';
import {agentExtremisPoints} from '../src/imperial-agent-detachments';

const roster=(units:Record<string,number>,det='Imperialis Fleet')=>individualArmy({...newSelection('Imperial Agents'),units,detachments2026:[det]});
describe('Imperial Agents roster constraints and formation reminders',()=>{
 it('can fill two vehicles with a split Sisters squad only when an Immolator takes one half',()=>{
  const sisters='Sisters of Battle Squad',immo='Sisters of Battle Immolator';
  const a=roster({[sisters]:1,[immo]:1,'Imperial Rhino':1});
  expect(agentTransports(a).dedicatedSatisfied).toBe(true);
  expect(agentTransports(roster({[sisters]:1,[immo]:2})).dedicatedSatisfied).toBe(true);
  for(const b of [roster({[sisters]:1,'Imperial Rhino':2}),roster({[sisters]:1,[immo]:1,'Imperial Rhino':2}),roster({[sisters]:1,'Inquisitorial Chimera':1})])
    expect(agentMusterFindings(b).map(r=>r.code)).toContain('agent-transport-passengers');
  const cue=generate11thReminders(a).find(r=>r.id==='11e-agents-transport-'+immo+'#1');
  expect(cue).toMatchObject({window:'Pre-battle',summary:expect.stringContaining('split')});
 });
 it('respects the Bodyguard, Authority, capacity, prohibited models and unused ordinary transports',()=>{
  let a=roster({'Inquisitor':1,'Imperial Navy Breachers':1,'Imperial Rhino':1,'Inquisitorial Chimera':1,'Corvus Blackstar':1,'Vindicare Assassin':1});
  a=setInstanceAttachment(a,'Inquisitor#1','Imperial Navy Breachers#1');
  const transport=agentTransports(a);
  expect(transport.eligible.get('Imperial Rhino#1')).toEqual(['Imperial Navy Breachers#1']);
  expect(transport.eligible.get('Inquisitorial Chimera#1')).toEqual([]);
  expect(transport.eligible.get('Corvus Blackstar#1')).toEqual([]);
  expect(transport.dedicatedSatisfied).toBe(false);
  expect(agentTransports(roster({'Corvus Blackstar':1})).dedicatedSatisfied).toBe(true);
  expect(agentTransports(roster({'Inquisitorial Chimera':1,'Inquisitorial Agents':1})).dedicatedSatisfied).toBe(true);
 });
 it('counts both Gravis seats when a full Aquila team travels with its Inquisitor',()=>{
  let a=roster({'Aquila Kill Team':1,'Imperial Rhino':1,'Inquisitor':1});
  a=setInstanceAttachment(a,'Inquisitor#1','Aquila Kill Team#1');
  expect(agentTransports(a).dedicatedSatisfied).toBe(true);
  a=setInstanceModelCount(a,'Aquila Kill Team#1',10);
  expect(agentTransports(a).dedicatedSatisfied).toBe(false);
  a=setInstanceAttachment(a,'Inquisitor#1',null);
  expect(agentTransports(a).eligible.get('Imperial Rhino#1')).toContain('Aquila Kill Team#1');
 });
 it('charges native Veiled Blade Assassins automatically and keeps them out of the Warlord and upgrade choices',()=>{
  const units={'Eversor Assassin':1,'Inquisitor':1};
  const fleet=roster(units),veiled=roster(units,'Veiled Blade Elimination Force');
  const extra=agentExtremisPoints(veiled,'Eversor Assassin');
  expect(extra).toBeGreaterThan(0);
  expect(rosterCost2026(veiled).total).toBe(rosterCost2026(fleet).total!+extra);
  expect(rosterCost2026(veiled).entries[0].extremisPoints).toBe(extra);
  expect(agentWarlordCandidates(veiled).map(s=>s.unit)).toEqual(['Inquisitor']);
  expect(availableUpgrades2026(veiled,{id:'Eversor Assassin#1',unit:'Eversor Assassin'})).toEqual([]);
  const allied={...veiled,faction:'Imperial Knights' as const,detachments2026:['Valourstrike Lance']};
  expect(rosterCost2026(allied).entries[0].extremisPoints).toBeUndefined();
 });
});
