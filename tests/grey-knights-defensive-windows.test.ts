// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import type {GeneratedReminder} from '../src/generated-reminders';
import {GREY_KNIGHTS_REVISION} from '../src/grey-knights-data.generated';
import {greyKnightsIntrinsicReminders} from '../src/grey-knights-intrinsic';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster,individualArmy,setInstanceAttachment,type RosterInstance} from '../src/roster-instances';

// Sanctuary is replaced on physical p10 of the publisher's September v1.2 pack.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_grey_knights-jnrahwb1qf-ubjtmdlivm.pdf#page=10
// Other full card clauses are in the complete November 23 reproduced App export:
// https://wahapedia.ru/wh40k11ed/factions/grey-knights/Stormraven-Gunship
// https://wahapedia.ru/wh40k11ed/factions/grey-knights/Brotherhood-Techmarine
// https://wahapedia.ru/wh40k11ed/factions/grey-knights/Brotherhood-Librarian
// Core 19.04 preserves an original surviving Leader's own leading ability;
// its last source dying to an attack ends it after that unit finishes attacking.
// Core 24.24/24.33 preserve all-model Lone Operative and Stealth conditions.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Incoming normal fire can occur in either Movement phase, e.g. Servo-sentry:
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24

const id=(unit:string,n=1)=>unit+'#'+n;
function army(...units:string[]):ArmySelection{
 let a=individualArmy({...newSelection('Grey Knights'),detachments2026:['Brotherhood Strike']});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const join=(a:ArmySelection,unit:string,body:string)=>setInstanceAttachment(a,id(unit),id(body));
const rows=(a:ArmySelection,title:string,roster?:readonly RosterInstance[])=>(roster===undefined?generate11thReminders(a):greyKnightsIntrinsicReminders(a,roster)).filter(r=>r.id.startsWith('11e-gk-card:')&&r.title===title);
const stages=(list:GeneratedReminder[])=>list.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const rangedStages=['Shooting:opponent:during','Movement:own:during','Shooting:own:during','Movement:opponent:during'];
const savedId=(unit:string,title:string,stage:string)=>'11e-gk-card:'+id(unit)+':'+title+':'+stage;
const defensiveTitles=new Set(['Sanctuary','Armoured Resilience','Techmarine','Haloed in Soulfire','Sanctic Hood']);

describe('Grey Knights incoming attack windows and saved identities',()=>{
 it.each([
  ['Grand Master Voldus','Sanctuary','Paladin Squad',true],
  ['Stormraven Gunship','Armoured Resilience',undefined,true],
  ['Brotherhood Techmarine','Techmarine','Strike Squad',false],
  ['Brotherhood Librarian','Haloed in Soulfire','Brotherhood Terminator Squad',false],
 ] as const)('%s keeps its old completion keys while covering all permitted incoming attack windows',(unit,title,body,melee)=>{
  let a=army(unit,...(body?[body]:[]),'Rhino');
  if(body)a=join(a,unit,body);
  const actual=rows(a,title);
  expect(stages(actual)).toEqual([...rangedStages,...(melee?['Fight:either:during']:[])].sort());
  const old=['Shooting:opponent:during','Movement:own:end',...(melee?['Fight:either:during']:[])];
  expect(actual.map(r=>r.id)).toEqual(expect.arrayContaining(old.map(stage=>savedId(unit,title,stage))));
  expect(actual.find(r=>r.window==='Movement'&&r.turn==='own')).toMatchObject({id:savedId(unit,title,'Movement:own:end'),timing:'during'});
  expect(actual.find(r=>r.window==='Movement'&&r.turn==='opponent')?.id).toBe(savedId(unit,title,'Movement:opponent:during'));
  expect(actual.find(r=>r.window==='Shooting'&&r.turn==='own')?.id).toBe(savedId(unit,title,'Shooting:own:during'));
  const all=generate11thReminders(a);
  expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
  expect(all.find(r=>r.title==='Fire Overwatch · 1CP')).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(all.find(r=>r.title==='Rapid Ingress · 1CP')).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
 });

 it('keeps Sanctuary available to an originally unattached Voldus with its current publisher wording and separate melee effect',()=>{
  const a=setInstanceAttachment(army('Grand Master Voldus','Paladin Squad'),id('Grand Master Voldus'),null);
  const actual=rows(a,'Sanctuary');
  expect(actual).toHaveLength(5);
  expect(actual.every(r=>r.units?.join()===id('Grand Master Voldus')&&r.source===GREY_KNIGHTS_REVISION.pack+'#page=10')).toBe(true);
  expect(actual.filter(r=>r.window!=='Fight').every(r=>/unit has Stealth.*Benefit of Cover against ranged attacks/.test(r.summary)&&!r.summary.includes('Hit roll'))).toBe(true);
  expect(actual.find(r=>r.window==='Fight')?.summary).toMatch(/Subtract 1.*Hit roll.*melee attack/);
  expect(actual.every(r=>/Voldus must survive.*until that attacking unit finishes its attacks/.test(r.summary))).toBe(true);
 });

 it('keeps each Stormraven reduction personal, including against return fire, without protecting its passengers or a duplicate vehicle',()=>{
  const a=army('Stormraven Gunship','Stormraven Gunship','Strike Squad');
  const actual=rows(a,'Armoured Resilience');
  expect(actual).toHaveLength(10);
  for(const n of [1,2]){
   const own=actual.filter(r=>r.units?.includes(id('Stormraven Gunship',n)));
   expect(own).toHaveLength(5);
   expect(own.every(r=>r.units?.join()===id('Stormraven Gunship',n))).toBe(true);
   expect(own.every(r=>/allocated to this Stormraven model.*subtract 1.*Damage.*does not extend.*passengers/.test(r.summary))).toBe(true);
  }
  const current=expandRoster(a).filter(s=>s.id!==id('Stormraven Gunship'));
  expect(rows(a,'Armoured Resilience',current)).toHaveLength(5);
  expect(rows(a,'Armoured Resilience',current).every(r=>r.units?.join()===id('Stormraven Gunship',2))).toBe(true);
 });

 it('keeps the Techmarine condition visible on a printed attached roster without giving Lone Operative to Bodyguards',()=>{
  const a=join(army('Brotherhood Techmarine','Strike Squad','Stormraven Gunship','Rhino'),'Brotherhood Techmarine','Strike Squad');
  const actual=rows(a,'Techmarine');
  expect(actual).toHaveLength(4);
  for(const row of actual){
   expect(row.units).toEqual([id('Brotherhood Techmarine'),id('Stormraven Gunship'),id('Rhino')]);
   expect(row.summary).toMatch(/Techmarine model is within 3″.*Grey Knights Vehicle unit with a surviving model.*only the Techmarine has Lone Operative/);
   expect(row.summary).toMatch(/does not grant it to Bodyguard or other attached models.*every surviving model.*including after its Bodyguard is destroyed/);
   expect(row.summary).toMatch(/Enemy models outside 12″.*Indirect Fire/);
  }
  const removed=expandRoster(a).filter(s=>s.unit!=='Strike Squad');
  const zero=expandRoster(a).map(s=>s.unit==='Strike Squad'?{...s,models:0}:s);
  expect(rows(a,'Techmarine',removed)).toEqual(rows(a,'Techmarine',zero));
  expect(rows(a,'Techmarine',removed).map(r=>r.id)).toEqual(actual.map(r=>r.id));
 });

 it('requires a living native Vehicle, never an allied Knight or a Vehicle that was removed or reduced to zero models',()=>{
  const a=army('Brotherhood Techmarine','Stormraven Gunship','Knight Paladin');
  const current=expandRoster(a);
  expect(rows(a,'Techmarine')).toHaveLength(4);
  expect(rows(a,'Techmarine').every(r=>r.units?.join()===id('Brotherhood Techmarine')+','+id('Stormraven Gunship'))).toBe(true);
  expect(rows(a,'Techmarine',current.filter(s=>s.unit!=='Stormraven Gunship'))).toEqual([]);
  expect(rows(a,'Techmarine',current.map(s=>s.unit==='Stormraven Gunship'?{...s,models:0}:s))).toEqual([]);
 });

 it.each(['reused','duplicate','undeclared','originally empty'] as const)('does not use a %s Vehicle identity to enable the Techmarine’s protection',mode=>{
  let a=army('Brotherhood Techmarine','Stormraven Gunship');
  let current=expandRoster(a);
  if(mode==='reused')current=current.map(s=>s.unit==='Stormraven Gunship'?{...s,unit:'Rhino'}:s);
  if(mode==='duplicate')current.push({...current.find(s=>s.unit==='Stormraven Gunship')!});
  if(mode==='undeclared'){a=army('Brotherhood Techmarine');current=[...expandRoster(a),{id:'Rhino#99',unit:'Rhino',models:1}];}
  if(mode==='originally empty')a={...a,instances:expandRoster(a).map(s=>s.unit==='Stormraven Gunship'?{...s,models:0}:s)};
  expect(rows(a,'Techmarine',current)).toEqual([]);
 });

 it('preserves the Librarian’s paired leading defenses after the original Bodyguard dies, with independent duplicate sources',()=>{
  let a=army('Brotherhood Librarian','Brotherhood Librarian','Brotherhood Terminator Squad','Brotherhood Terminator Squad');
  a=join(a,'Brotherhood Librarian','Brotherhood Terminator Squad');
  a=setInstanceAttachment(a,id('Brotherhood Librarian',2),id('Brotherhood Terminator Squad',2));
  const current=expandRoster(a).filter(s=>s.id!==id('Brotherhood Terminator Squad'));
  const zero=expandRoster(a).map(s=>s.id===id('Brotherhood Terminator Squad')?{...s,models:0}:s);
  for(const [title,count] of [['Haloed in Soulfire',4],['Sanctic Hood',5]] as const){
   const actual=rows(a,title,current);
   expect(actual).toHaveLength(count*2);
   expect(actual).toEqual(rows(a,title,zero));
   expect(actual.map(r=>r.id)).toEqual(rows(a,title).map(r=>r.id));
   const survivor=actual.filter(r=>r.id.includes(':'+id('Brotherhood Librarian')+':'));
   expect(survivor.every(r=>r.units?.join()===id('Brotherhood Librarian')&&r.summary.includes('surviving original Leader retains its own leading benefit'))).toBe(true);
   const other=actual.filter(r=>r.id.includes(':'+id('Brotherhood Librarian',2)+':'));
   expect(other.every(r=>r.units?.join()===[id('Brotherhood Librarian',2),id('Brotherhood Terminator Squad',2)].join())).toBe(true);
  }
  expect(stages(rows(a,'Sanctic Hood').filter(r=>r.units?.includes(id('Brotherhood Librarian'))))).toEqual(['Command:either:during','Movement:either:during','Shooting:either:during','Charge:either:during','Fight:either:during'].sort());
  expect(rows(a,'Sanctic Hood').every(r=>/Feel No Pain 4\+ against Psychic Attacks, including mortal wounds caused by Psychic attacks/.test(r.summary))).toBe(true);
  expect(rows(a,'Haloed in Soulfire').every(r=>/an attacking model.*ranged attack only from within 18″/.test(r.summary))).toBe(true);
 });

 it('does not invent a while-leading benefit for an originally unattached Librarian or a later attachment',()=>{
  const a=setInstanceAttachment(army('Brotherhood Librarian','Brotherhood Terminator Squad'),id('Brotherhood Librarian'),null);
  const joined=expandRoster(a).map(s=>s.unit==='Brotherhood Librarian'?{...s,attachedTo:id('Brotherhood Terminator Squad'),keepUnattached:undefined}:s);
  for(const title of ['Sanctic Hood','Haloed in Soulfire']){
   expect(rows(a,title)).toEqual([]);
   expect(rows(a,title,joined)).toEqual([]);
  }
 });
});

describe.each([
 ['Grand Master Voldus','Paladin Squad','Sanctuary'],
 ['Brotherhood Librarian','Brotherhood Terminator Squad','Haloed in Soulfire'],
 ['Brotherhood Techmarine','Strike Squad','Techmarine'],
] as const)('%s defense keeps its original legal formation',(unit,body,title)=>{
 const declared=()=>join(army(unit,body,body,'Stormraven Gunship'),unit,body);
 const sourceRows=(a:ArmySelection,current?:readonly RosterInstance[])=>greyKnightsIntrinsicReminders(a,current).filter(r=>defensiveTitles.has(r.title)&&r.id.startsWith('11e-gk-card:'+id(unit)+':'));

 it('preserves only surviving original recipients after Bodyguard loss and removes a dead or zero-model source',()=>{
  const a=declared(),current=expandRoster(a);
  const removed=current.filter(s=>s.id!==id(body)),zero=current.map(s=>s.id===id(body)?{...s,models:0}:s);
  expect(rows(a,title,removed).length).toBeGreaterThan(0);
  expect(rows(a,title,removed)).toEqual(rows(a,title,zero));
  expect(rows(a,title,removed).every(r=>!r.units?.includes(id(body))&&!r.units?.includes(id(body,2)))).toBe(true);
  expect(sourceRows(a,current.filter(s=>s.id!==id(unit)))).toEqual([]);
  expect(sourceRows(a,current.map(s=>s.id===id(unit)?{...s,models:0}:s))).toEqual([]);
 });

 it.each(['different source','different Bodyguard','changed join','changed unattached flag','retinue join','duplicate source','duplicate Bodyguard','new joiner'] as const)('rejects a %s in the current roster',change=>{
  const a=declared();let current=expandRoster(a);
  if(change==='different source')current=current.map(s=>s.id===id(unit)?{...s,unit:'Stormraven Gunship'}:s);
  if(change==='different Bodyguard')current=current.map(s=>s.id===id(body)?{...s,unit:body==='Strike Squad'?'Purgation Squad':body==='Paladin Squad'?'Brotherhood Terminator Squad':'Paladin Squad'}:s);
  if(change==='changed join')current=current.map(s=>s.id===id(unit)?{...s,attachedTo:id(body,2)}:s);
  if(change==='changed unattached flag')current=current.map(s=>s.id===id(unit)?{...s,keepUnattached:true}:s);
  if(change==='retinue join')current=current.map(s=>s.id===id(unit)?{...s,retinueTo:id(body)}:s);
  if(change==='duplicate source')current.push({...current.find(s=>s.id===id(unit))!});
  if(change==='duplicate Bodyguard')current.push({...current.find(s=>s.id===id(body))!});
  if(change==='new joiner')current.push({id:'Brotherhood Chaplain#99',unit:'Brotherhood Chaplain',models:1,attachedTo:id(body)});
  expect(sourceRows(a,current)).toEqual([]);
 });

 it.each(['illegal pair','original zero Bodyguard','original zero source','original duplicate source','invalid original joiner'] as const)('does not inherit defense from an %s',change=>{
  let a=declared();let original=expandRoster(a);
  if(change==='illegal pair')original=original.map(s=>s.id===id(unit)?{...s,attachedTo:id('Stormraven Gunship')}:s);
  if(change==='original zero Bodyguard')original=original.map(s=>s.id===id(body)?{...s,models:0}:s);
  if(change==='original zero source')original=original.map(s=>s.id===id(unit)?{...s,models:0}:s);
  if(change==='original duplicate source')original.push({...original.find(s=>s.id===id(unit))!});
  if(change==='invalid original joiner')original.push({id:'Stormraven Gunship#99',unit:'Stormraven Gunship',models:1,attachedTo:id(unit)});
  a={...a,instances:original};
  expect(sourceRows(a)).toEqual([]);
  const removed=original.filter(s=>s.id===id(unit)||s.id===id('Stormraven Gunship')).map(s=>({...s,models:1}));
  expect(sourceRows(a,removed)).toEqual([]);
 });
});
