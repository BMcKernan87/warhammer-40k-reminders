import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {necronPersistentStratagemReminders} from '../src/necron-persistent-stratagems';
import {ReminderSheet} from '../src/ReminderSheet';
import {initialStore,validateStore} from '../src/profiles';

// Publisher Necrons v1.3 p.2: Dominance Protocols lasts until turn end.
// p.8: Animus Curse marks the attacking enemy until battle end.
// Core 01.02.02 preserves effects with a duration after source loss;
// 14.02 checks control at each phase/turn end; 15.09 forbids snap Hit re-rolls.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
const force=(detachment:string,...units:string[])=>individualArmy({
 ...units.reduce((a,unit)=>addSelectionUnit(a,unit),newSelection('Necrons')),detachments2026:[detachment],
});
const control=(a:ReturnType<typeof force>,live=expandRoster(a))=>necronPersistentStratagemReminders(a,live).filter(r=>r.id.startsWith('11e-necron-hod-dominance-control-'));
const marks=(a:ReturnType<typeof force>,live=expandRoster(a))=>necronPersistentStratagemReminders(a,live).filter(r=>r.id.startsWith('11e-necron-conclave-animus-lasting-'));
afterEach(cleanup);

describe('Dominance Protocols at control checks',()=>{
 it('keeps the selected Immortals condition through every phase/turn end without adding activations',()=>{
  const a=force('Hand of the Dynasty','Immortals','Immortals','Necron Warriors');
  const actual=generate11thReminders(a),rows=control(a);
  expect(rows.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight','End of your turn','End of opponent turn']);
  for(const r of rows){
   expect(r).toMatchObject({timing:'end',turn:'either',units:['Immortals#1','Immortals#2']});
   expect(r.summary).toMatch(/Only if.*selected.*this turn’s Command phase/);
   expect(r.summary).toContain('+1 OC until that turn ends');
   expect(r.summary).toContain('Battle-shocked models retain OC “–”');
   expect(r.title).not.toMatch(/\dCP/);
   expect(actual.find(x=>x.id===r.id)).toEqual(r);
  }
  expect(actual.filter(r=>r.id==='11e-necron-hod-dominance')).toHaveLength(1);
  expect(actual.find(r=>r.id==='11e-necron-hod-dominance')).toMatchObject({window:'Command',timing:'during'});
  expect(rows.every(r=>r.source.endsWith('#page=2'))).toBe(true);
 });

 it('preserves a selected original Immortals formation after its bodyguards are destroyed',()=>{
  const a=setInstanceAttachment(force('Hand of the Dynasty','Immortals','Immortals','Plasmancer'),'Plasmancer#1','Immortals#2');
  const live=expandRoster(a).filter(s=>s.id!=='Immortals#2');
  expect(control(a,live).every(r=>r.units?.join('|')==='Immortals#1|Plasmancer#1')).toBe(true);
  expect(control(a,live)[0].summary).toContain('after the original Immortals models are destroyed');
 });

 it('does not transfer a selected effect through changed identity, changed attachment or an illegal original join',()=>{
  const a=setInstanceAttachment(force('Hand of the Dynasty','Immortals','Immortals','Plasmancer'),'Plasmancer#1','Immortals#2');
  const changedIdentity=expandRoster(a).map(s=>s.id==='Immortals#1'?{...s,unit:'Necron Warriors'}:s);
  expect(control(a,changedIdentity)[0].units).toEqual(['Immortals#2']);
  const changedLink=expandRoster(a).filter(s=>s.id!=='Immortals#2').map(s=>s.id==='Plasmancer#1'?{...s,attachedTo:'Immortals#1'}:s);
  expect(control(a,changedLink)[0].units).toEqual(['Immortals#1']);
  const illegal=force('Hand of the Dynasty','Immortals','C’tan Shard of the Nightbringer');
  illegal.instances=expandRoster(illegal).map(s=>s.unit==='C’tan Shard of the Nightbringer'?{...s,attachedTo:'Immortals#1'}:s);
  expect(control(illegal,expandRoster(illegal).filter(s=>s.unit!=='Immortals'))).toEqual([]);
 });

 it('does not invent an eligible recipient or persist beyond the selected detachment',()=>{
  expect(control(force('Hand of the Dynasty','Necron Warriors'))).toEqual([]);
  expect(control(force('Cryptek Conclave','Immortals'))).toEqual([]);
  const a=force('Hand of the Dynasty','Immortals');
  expect(control(a,[])).toEqual([]);
 });

 it('keeps prior activation checkmarks separate from new control reminders and prints them all',()=>{
  const a=setInstanceAttachment(force('Hand of the Dynasty','Immortals','Plasmancer'),'Plasmancer#1','Immortals#1');
  const profile=initialStore(a).profiles[0];
  profile.completed=['sheet:'+JSON.stringify(['Command','11e-necron-hod-dominance',['Immortals#1']])];
  const reopened=JSON.parse(JSON.stringify(profile));
  expect(validateStore({activeId:reopened.id,profiles:[reopened]})).toBe(true);
  const view=render(<ReminderSheet profile={reopened} onCompleted={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Show phase'),{target:{value:'Command'}});
  expect(screen.queryByRole('checkbox',{name:/Dominance Protocols · 1CP/})).toBeNull();
  expect((screen.getByRole('checkbox',{name:/Dominance Protocols · objective control/}) as HTMLInputElement).checked).toBe(false);
  fireEvent.change(screen.getByLabelText('Show phase'),{target:{value:'End of opponent turn'}});
  expect(screen.getByRole('checkbox',{name:/Dominance Protocols · objective control/})).toBeTruthy();
  expect([...view.container.querySelectorAll('.print-sheet strong')].filter(e=>e.textContent==='Dominance Protocols · objective control')).toHaveLength(7);
 });
});

describe('Animus Curse after its destroyed source is gone',()=>{
 const forceWithCurse=()=>setInstanceAttachment(force('Cryptek Conclave','Immortals','Plasmancer','Deathmarks','Flayed Ones'),'Plasmancer#1','Immortals#1');
 it('retains the marked enemy for normal attacks and excludes snap-only Movement attackers',()=>{
  const a=forceWithCurse(),actual=generate11thReminders(a),rows=marks(a);
  expect(rows.map(r=>r.window)).toEqual(['Movement','Shooting','Fight']);
  expect(rows.find(r=>r.window==='Movement')).toMatchObject({turn:'opponent',units:['Deathmarks#1']});
  expect(rows.find(r=>r.window==='Shooting')?.units).toEqual(['Immortals#1','Deathmarks#1']);
  expect(rows.find(r=>r.window==='Fight')?.units).toEqual(['Immortals#1','Deathmarks#1','Flayed Ones#1']);
  for(const r of rows){
   expect(r.summary).toContain('Only against an enemy unit previously marked');
   expect(r.summary).toContain('until the battle ends');
   expect(r.summary).toContain('Snap shooting cannot re-roll Hit rolls');
   expect(r.source).toMatch(/#page=8$/);
   expect(actual.find(x=>x.id===r.id)).toEqual(r);
  }
  expect(actual.find(r=>r.id==='11e-necron-conclave-animus-shooting')?.units).toEqual(['Plasmancer#1']);
 });

 it('keeps a prior mark after the Cryptek and its entire original formation are destroyed',()=>{
  const a=forceWithCurse(),live=expandRoster(a).filter(s=>!['Immortals#1','Plasmancer#1'].includes(s.id));
  const rows=marks(a,live);
  expect(rows).toHaveLength(3);
  expect(rows.find(r=>r.window==='Shooting')?.units).toEqual(['Deathmarks#1']);
  expect(rows.every(r=>!r.units?.includes('Plasmancer#1'))).toBe(true);
  expect(rows[0].summary).toContain('after the Cryptek and its original formation are destroyed');
 });

 it('keeps Animus Hit re-rolls for a Hexmark’s normal return fire without granting them to its snap shots',()=>{
  // Multi-threat Eliminator permits normal shooting in the opponent's Shooting
  // phase; Fire Overwatch is snap shooting in Movement (Core 15.08–15.09).
  // https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer
  const a=setInstanceAttachment(force('Cryptek Conclave','Immortals','Plasmancer','Hexmark Destroyer','Flayed Ones'),
   'Plasmancer#1','Immortals#1');
  const actual=generate11thReminders(a),shooting=marks(a).find(r=>r.window==='Shooting');
  expect(shooting).toMatchObject({turn:'either',timing:'during',units:['Immortals#1','Hexmark Destroyer#1']});
  expect(shooting?.summary).toMatch(/previously marked.*re-roll Hit rolls.*normal shooting, including permitted return fire/);
  expect(shooting?.summary).toContain('Snap shooting cannot re-roll Hit rolls');
  expect(actual.find(r=>r.title==='Hexmark Destroyer#1 · Multi-threat Eliminator'))
   .toMatchObject({window:'Shooting',turn:'opponent',units:['Hexmark Destroyer#1']});
  const live=expandRoster(a).filter(s=>s.unit==='Hexmark Destroyer'),remaining=marks(a,live);
  expect(remaining.map(r=>r.window)).toEqual(['Shooting','Fight']);
  expect(remaining.every(r=>r.units?.join()==='Hexmark Destroyer#1')).toBe(true);
  expect(remaining[0].summary).toContain('This effect does not grant an extra attack or mark a new enemy');
 });

 it('requires a possible original Cryptek and rejects source/recipient identity substitution',()=>{
  expect(marks(force('Cryptek Conclave','Deathmarks'))).toEqual([]);
  expect(marks(force('Hand of the Dynasty','Plasmancer','Deathmarks'))).toEqual([]);
  const a=forceWithCurse();
  expect(marks(a,expandRoster(a).map(s=>s.unit==='Plasmancer'?{...s,unit:'Royal Warden'}:s))).toEqual([]);
  const substituted=marks(a,expandRoster(a).map(s=>s.unit==='Deathmarks'?{...s,unit:'Immortals'}:s));
  expect(substituted.some(r=>r.window==='Movement')).toBe(false);
  expect(substituted.every(r=>!r.units?.includes('Deathmarks#1'))).toBe(true);
 });

 it('uses independently deployed Starsteles and gives melee-only armies no ranged follow-up',()=>{
  const a=setInstanceModelCount(force('Cryptek Conclave','Technomancer','Convergence Of Dominion'),'Convergence Of Dominion#1',3);
  const shooting=marks(a).find(r=>r.window==='Shooting')!;
  for(const n of [1,2,3])expect(shooting.units).toContain('Convergence Of Dominion#1 · Starstele '+n);
  expect(shooting.units).not.toContain('Convergence Of Dominion#1');
  const melee=force('Cryptek Conclave','Plasmancer','Flayed Ones');
  expect(marks(melee,expandRoster(melee).filter(s=>s.unit==='Flayed Ones')).map(r=>r.window)).toEqual(['Fight']);
 });
});
