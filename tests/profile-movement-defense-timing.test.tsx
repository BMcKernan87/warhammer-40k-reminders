import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {addSelectionUnit,newSelection,type ArmySelection,type Faction} from '../src/catalog';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {aeldariLoadout,validAeldariGear} from '../src/aeldari-loadouts';
import {ReminderSheet} from '../src/ReminderSheet';
import {initialStore,validateStore} from '../src/profiles';

// Core 05.03–05.04, 24.24 and 24.33: personal saves, Lone Operative and
// Stealth apply to eligible attacks, not just an end-phase Overwatch action.
// Core 15.08 still restricts Overwatch to the end of opponent Movement.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Publisher Astra Militarum v1.3 p.24: Servo-sentry shoots on Deep Strike
// arrival, including its own Movement. Defenders therefore need both turns.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24
// Deathmarks' normal Hyperspace Hunters reaction can also occur during the
// defender's own Movement, before end-phase Overwatch.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
const id=(unit:string,n=1)=>unit+'#'+n;
function army(faction:Faction,units:string[]):ArmySelection{
 let a=individualArmy(newSelection(faction));
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const named=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.title===title);
afterEach(cleanup);

describe('native passive defense during Movement attacks in either turn',()=>{
 it.each([
  ['World Eaters','Angron','11e-world-eater-core',false],
  ['Emperor’s Children','Fulgrim','11e-ec-profile',false],
  ['Thousand Sons','Sekhetar Robots','11e-ts-profile',false],
  ['Death Guard','Mortarion','11e-dg-profile',false],
  ['Grey Knights','Grand Master','11e-gk-profile',false],
  ['Chaos Space Marines','Abaddon The Despoiler','11e-csm-profile',true],
  ['Adepta Sororitas','Morvenn Vahl','11e-sororitas-profile',true],
  ['Adeptus Mechanicus','Belisarius Cawl','11e-mechanicus-profile',true],
  ['T’au Empire','Commander Shadowsun','11e-tau-profile',true],
  ['Tyranids','Hive Tyrant','11e-tyranid-profile',true],
  ['Aeldari','Farseer','11e-aeldari-profile',true],
  ['Drukhari','Archon','11e-drukhari-profile',true],
  ['Space Marines','Captain','11e-space-marines-profile',true],
 ] as const)('%s preserves %s’s old checkmark and adds a separate enemy-arrival window',(faction,unit,prefix,timed)=>{
  const a=army(faction,[unit]),rows=named(a,id(unit)+' · Invulnerable save');
  const movement=rows.filter(r=>r.window==='Movement');
  expect(movement).toHaveLength(2);
  expect(movement.find(r=>r.turn==='own')).toMatchObject({
   id:prefix+':'+id(unit)+':Invulnerable save:Movement:own'+(timed?':end':''),
   timing:'during',units:[id(unit)],origin:'unit',
  });
  expect(movement.find(r=>r.turn==='opponent')).toMatchObject({
   id:prefix+':'+id(unit)+':Invulnerable save:Movement:opponent'+(timed?':during':''),
   timing:'during',units:[id(unit)],origin:'unit',
  });
  expect(rows.every(r=>r.source.includes('/wh40k11ed/'))).toBe(true);
  const all=generate11thReminders(a);
  expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
 });

 it.each([
  ['Thousand Sons','Sekhetar Robots','Stealth','11e-ts-profile',false],
  ['Emperor’s Children','Lucius the Eternal','Lone Operative','11e-ec-profile',false],
  ['Chaos Space Marines','Cypher','Lone Operative','11e-csm-profile',true],
  ['Adeptus Mechanicus','Sydonian Skatros','Stealth','11e-mechanicus-profile',true],
  ['Adeptus Mechanicus','Sydonian Skatros','Lone Operative','11e-mechanicus-profile',true],
  ['T’au Empire','Commander Shadowsun','Stealth','11e-tau-profile',true],
  ['T’au Empire','Ghostkeel Battlesuit','Lone Operative','11e-tau-profile',true],
  ['Tyranids','Deathleaper','Lone Operative','11e-tyranid-profile',true],
  ['Aeldari','Rangers','Stealth','11e-aeldari-profile',true],
  ['Drukhari','Mandrakes','Stealth','11e-drukhari-profile',true],
  ['Space Marines','Eliminator Squad','Stealth','11e-space-marines-profile',true],
 ] as const)('%s / %s retains %s’s original identity while covering both Movement turns',(faction,unit,title,prefix,timed)=>{
  const rows=named(army(faction,[unit]),id(unit)+' · '+title);
  expect(rows.filter(r=>r.window==='Movement').map(r=>[r.turn,r.timing]).sort()).toEqual([['opponent','during'],['own','during']]);
  expect(rows.find(r=>r.window==='Movement'&&r.turn==='own')?.id).toBe(prefix+':'+id(unit)+':'+title+':Movement:own'+(timed?':end':''));
  expect(rows.every(r=>r.units?.join()===id(unit))).toBe(true);
  expect(rows.every(r=>title==='Stealth'?/benefit of cover/i.test(r.summary):r.summary.includes('Indirect Fire'))).toBe(true);
  expect(rows.some(r=>r.window==='Fight')).toBe(false);
 });

 it('keeps a selected Shimmershield on its physical Exarch rather than the attached leader or duplicate squad',()=>{
  let a=setInstanceAttachment(army('Aeldari',['Asurmen','Dire Avengers','Dire Avengers']),id('Asurmen'),id('Dire Avengers'));
  const squad=a.instances!.find(s=>s.id===id('Dire Avengers'))!;
  const selected=aeldariLoadout(squad.unit,squad.models!)!.slots.flatMap(field=>field.choices.map(choice=>({field,choice})))
   .find(({field,choice})=>choice.items.includes('Shimmershield')&&validAeldariGear(squad.unit,{[field.name]:choice.name},squad.models!))!;
  expect(selected).toBeDefined();
  a={...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear:{[selected.field.name]:selected.choice.name}}:s)};
  const rows=named(a,id('Dire Avengers')+' · Shimmershield').filter(r=>r.window==='Movement');
  expect(rows).toHaveLength(2);
  for(const row of rows){
   expect(row.units).toEqual([id('Dire Avengers')]);
   expect(row.summary).toContain('actual shimmershield bearer');
   expect(row.summary).toContain('attached Characters');
  }
  expect(named(a,id('Dire Avengers',2)+' · Shimmershield')).toEqual([]);
 });

 it.each([['Drukhari','Wyches',6],['Aeldari','Howling Banshees',5]] as const)('keeps %s / %s’s stronger melee save out of Movement shooting',(faction,unit,save)=>{
  const rows=named(army(faction,[unit]),id(unit)+' · Invulnerable save');
  const movement=rows.filter(r=>r.window==='Movement');
  expect(movement).toHaveLength(2);
  for(const row of movement)expect(row.summary).toContain('use its '+save+'+ invulnerable save');
  expect(rows.find(r=>r.window==='Fight')?.summary).toContain('use its 4+ invulnerable save');
 });

 it('does not broaden a melee-only personal save into a Movement defense',()=>{
  const rows=named(army('Space Marines',['Judiciar']),id('Judiciar')+' · Invulnerable save');
  expect(rows.map(r=>r.window)).toEqual(['Fight']);
  expect(rows[0].summary).toContain('melee attacks only');
 });

 it('retains both Movement windows and excludes melee for a ranged-only save',()=>{
  const rows=named(army('Space Marines',['Astraeus']),id('Astraeus')+' · Invulnerable save');
  expect(rows.filter(r=>r.window==='Movement')).toHaveLength(2);
  expect(rows.some(r=>r.window==='Fight')).toBe(false);
  expect(rows.every(r=>r.summary.includes('ranged attacks only'))).toBe(true);
 });

 it('retains end-of-enemy-Movement Overwatch and Rapid Ingress beside during-phase defenses',()=>{
  const a=army('Thousand Sons',['Scarab Occult Terminators']),all=generate11thReminders(a);
  expect(all.find(r=>r.title===id('Scarab Occult Terminators')+' · Ranged weapon profiles'&&r.window==='Movement')).toMatchObject({turn:'opponent',timing:'end'});
  expect(all.find(r=>r.title===id('Scarab Occult Terminators')+' · Deep Strike · Rapid Ingress')).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(all.find(r=>r.title==='Fire Overwatch · 1CP')).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(all.filter(r=>r.title===id('Scarab Occult Terminators')+' · Invulnerable save'&&r.window==='Movement').every(r=>r.timing==='during')).toBe(true);
 });

 it('reopens a legacy Movement/end completion without checking the new turn or a duplicate squad',()=>{
  const a=army('T’au Empire',['Commander Shadowsun','Ghostkeel Battlesuit','Ghostkeel Battlesuit']);
  const profile=initialStore(a).profiles[0],title=id('Ghostkeel Battlesuit')+' · Stealth';
  const oldKey='sheet:'+JSON.stringify(['Movement','11e-tau-profile:Ghostkeel Battlesuit#1:Stealth:Movement:own:end',[id('Ghostkeel Battlesuit')]]);
  profile.completed=[oldKey];
  const reopened=JSON.parse(JSON.stringify(profile));
  expect(validateStore({activeId:reopened.id,profiles:[reopened]})).toBe(true);
  let changed:string[]|undefined;
  const view=render(<ReminderSheet profile={reopened} onCompleted={keys=>{changed=keys;}}/>);
  fireEvent.change(screen.getByLabelText('Show phase'),{target:{value:'Movement'}});
  expect(screen.queryByRole('checkbox',{name:title+' · Your turn · during'})).toBeNull();
  expect((screen.getByRole('checkbox',{name:title+' · Opponent’s turn · during'}) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole('checkbox',{name:id('Ghostkeel Battlesuit',2)+' · Stealth · Your turn · during'}) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByLabelText('Show completed reminders'));
  const own=screen.getByRole('checkbox',{name:title+' · Your turn · during'}) as HTMLInputElement;
  expect(own.checked).toBe(true);
  fireEvent.click(own);expect(changed).toEqual([]);
  expect([...view.container.querySelectorAll('.print-sheet strong')].filter(e=>e.textContent===title)).toHaveLength(4);
 });
});
