import {describe,it,expect} from 'vitest';
import {newSelection,validateSelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {stratagemWindows} from '../scripts/import-stratagem-windows.mjs';
import {detachmentBudget,DETACHMENTS_2026} from '../src/edition-2026';
import {applyNecronStratagemWindow} from '../src/stratagem-windows';
import type {GeneratedReminder} from '../src/generated-reminders';
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
    const key=detachment;
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
    const exact=new Set(expected.flatMap(([,r])=>Object.keys(r.windows).map(window=>r.id+'|'+window)));
    expect([...new Set(actual.map(r=>r.sourceRuleId+'|'+r.window))].sort()).toEqual([...exact].sort());
    const spending=sheet.filter(r=>r.origin==='detachment'&&/\b\d+\s*CP\b/i.test(r.title));
    expect(spending.every(r=>r.sourceRuleId&&r.units?.length&&r.source.startsWith('https://')&&!r.source.includes('wh40k10ed'))).toBe(true);
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

describe('whole Necron detachment selection and activation contract',()=>{
 const entries=DETACHMENTS_2026.Necrons!;
 const factionRules=Object.values(source.rules).filter(r=>r.detachment);
 const bySource=new Map(factionRules.map(r=>[r.id,r]));
 const cp=(r:GeneratedReminder)=>r.origin==='detachment'&&/\b\d+\s*CP\b/i.test(r.title);
 const signature=(r:GeneratedReminder)=>r.sourceRuleId+'|'+r.window+'|'+r.turn+'|'+r.timing;
 const combinations=Array.from({length:2**entries.length},(_,mask)=>entries.filter((_,i)=>mask&(1<<i)));
 it('pins all twelve detachments and all 63 distinct source Stratagem IDs',()=>{
  expect(entries).toHaveLength(12);
  expect(factionRules).toHaveLength(63);
  expect(bySource.size).toBe(63);
  expect([...new Set(factionRules.map(r=>r.detachment))].sort()).toEqual(entries.map(d=>d.name).sort());
 });
 for(const size of ['Incursion','Strike Force'] as const)it('checks every subset and every legal '+size+' combination against emitted activation windows',()=>{
  const limit=size==='Incursion'?2:3;
  let legalCount=0;
  let roster=individualArmy({...newSelection('Necrons'),units:{Overlord:1,Immortals:1,'Necron Warriors':1,'Tomb Blades':1,'Lokhust Heavy Destroyers':1},battleSize2026:size,warlordId:'Overlord#1'});
  roster=setInstanceAttachment(roster,'Overlord#1','Immortals#1');
  const single=new Map(entries.map(d=>[d.name,generate11thReminders({...roster,detachments2026:[d.name]}).filter(cp).map(signature)]));
  for(const combo of combinations){
   const names=combo.map(d=>d.name);
   const conflicts=(names.includes('Awakened Dynasty')&&names.includes('Hand of the Dynasty'))||(names.includes('Hypercrypt Legion')&&names.includes("The Phaeron's Armoury"));
   const valid=names.length>0&&!conflicts&&(combo.reduce((n,d)=>n+d.dp,0)<=limit||(combo.length===1&&combo[0].dp===3));
   expect(detachmentBudget('Necrons',names,size).valid,names.join(' + ')).toBe(valid);
   if(!valid)continue;
   legalCount++;
   const a={...roster,detachments2026:names};
   expect(validateSelection(a)).toBe(true);
   const all=generate11thReminders(a),spending=all.filter(cp);
   expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
   expect([...new Set(spending.map(signature))].sort()).toEqual([...new Set(names.flatMap(name=>single.get(name)!))].sort());
   for(const r of spending){
    const meta=bySource.get(r.sourceRuleId!);
    expect(meta&&names.includes(meta.detachment!)).toBe(true);
    expect((meta!.windows as Record<string,readonly string[]>)[r.window]).toEqual([r.turn,r.timing]);
   }
  }
  expect(legalCount).toBe(size==='Incursion'?15:36);
 });
 it('fails closed on a wrong-phase, unselected or unknown CP-spending card without filtering a conditional follow-up',()=>{
  const r:GeneratedReminder={id:'example',title:'Omnilocked Strafing · 1CP',window:'Movement',timing:'start',summary:'When falling back.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',units:['Tomb Blades#1']};
  expect(applyNecronStratagemWindow(r,['Skysword Spearhead'])).toMatchObject({turn:'own',timing:'during',sourceRuleId:source.rules['omnilocked strafing'].id});
  expect(applyNecronStratagemWindow(r,['Hand of the Dynasty'])).toBeUndefined();
  expect(applyNecronStratagemWindow({...r,window:'Shooting'},['Skyshroud Spearhead'])).toBeUndefined();
  expect(applyNecronStratagemWindow({...r,title:'Invented stratagem · 1CP'},['Skyshroud Spearhead'])).toBeUndefined();
  const follow={...r,title:'Omnilocked Strafing · carryover',window:'Shooting' as const};
  expect(applyNecronStratagemWindow(follow,['Skyshroud Spearhead'])).toEqual(follow);
 });
});
