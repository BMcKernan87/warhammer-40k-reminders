import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {stratagemWindows} from '../scripts/import-stratagem-windows.mjs';
import source from '../data/necron-stratagem-windows.json';

const detachments:Record<string,string[]> = {
  'Hand of the Dynasty': ['Immortals','Necron Warriors','Doomsday Ark'],
  'Skyshroud Spearhead': ['Tomb Blades','Lokhust Heavy Destroyers','Doomsday Ark'],
  "The Phaeron's Armoury": ['Obelisk','Doomsday Ark'],
  'Annihilation Legion': ['Skorpekh Destroyers','Flayed Ones','Lokhust Heavy Destroyers','Triarch Stalker'],
  'Awakened Dynasty': ['Doomsday Ark','Necron Warriors','Lokhust Heavy Destroyers'],
  'Canoptek Court': ['Canoptek Wraiths','Canoptek Doomstalker','Canoptek Scarab Swarms'],
  'Cryptek Conclave': ['Necron Warriors','Canoptek Doomstalker'],
  'Cursed Legion': ['Lokhust Heavy Destroyers','Skorpekh Lord','Skorpekh Destroyers','Canoptek Doomstalker'],
  'Hypercrypt Legion': ['Monolith','Deathmarks','Doomsday Ark'],
  'Obeisance Phalanx': ['Lychguard','Triarch Stalker','Triarch Praetorians'],
  'Pantheon of Woe': ['C’tan Shard of the Nightbringer','Doomsday Ark'],
  'Starshatter Arsenal': ['Lokhust Heavy Destroyers','Tomb Blades','Doomsday Ark'],
};
describe('matched-play Stratagem timing on an eligible Necron roster',()=>{
  for(const [detachment,units] of Object.entries(detachments))it(detachment,()=>{
    const key=detachment.replace('Skyshroud','Skysword');
    let army=individualArmy({...newSelection(),detachments2026:[key],units:Object.fromEntries(
      [...new Set(['Overlord','Immortals','Technomancer',...units])].map(unit=>[unit,1])
    ),warlordId:'Overlord#1'});
    army=setInstanceAttachment(army,'Overlord#1','Immortals#1');
    army=setInstanceAttachment(army,'Technomancer#1','Immortals#1');
    expect(rosterFindings(army).filter(f=>f.severity==='error')).toEqual([]);
    const sheet=generate11thReminders(army);
    const expected=Object.entries(source.rules).filter(([name,entry])=>entry.detachment===detachment||(!entry.detachment&&!['smokescreen','explosives'].includes(name)));
    const actual=sheet.filter(r=>r.sourceRuleId);
    expect([...new Set(actual.map(r=>r.sourceRuleId))].sort()).toEqual(expected.map(([,v])=>v.id).sort());
    for(const [name,rule] of expected) {
      for(const [window,[turn,timing]] of Object.entries(rule.windows)) {
        const cues=actual.filter(r=>r.sourceRuleId===rule.id&&r.window===window);
        expect(cues.length,name+' / '+window).toBeGreaterThan(0);
        expect(cues.every(r=>r.turn===turn&&r.timing===timing),name+' / '+window).toBe(true);
      }
    }
  });
  it('reads phase-specific turn ownership from the WHEN clause even if the broad turn column says either',()=>{
    const {reaction}=stratagemWindows([{id:'r',name:'Reaction',turn:'Either player’s turn',description:'<b>WHEN:</b> Your opponent’s Shooting phase or the Fight phase, just after targets are selected.<br><b>TARGET:</b> One unit.'}]);
    expect(reaction.windows).toEqual({Shooting:['opponent','during'],Fight:['either','during']});
  });
});
