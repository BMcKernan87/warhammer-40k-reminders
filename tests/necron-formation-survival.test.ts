import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {necronFormationRoots} from '../src/necron-retinues';
import {remainingNecronReminders} from '../src/necron-remaining-detachments';
import {canoptekHypercryptReminders} from '../src/necron-canoptek-hypercrypt';

// Core Rules pp.66–67 (19.01/19.04): attached units persist for the battle,
// and a surviving Leader/Support retains its own leading abilities after losses.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Current Core 19.01.01 explicitly retains surviving Leader/Support as one unit.
// Cryptek Retinue and Canoptek Retinue both join the Bodyguard until battle end.
const squad=(id:string,unit:string,extra:Partial<RosterInstance>={}):RosterInstance=>({id,unit,...extra});
const army=(instances:RosterInstance[],detachment='Awakened Dynasty',upgrades:Record<string,string>={}):ArmySelection=>({
 ...newSelection('Necrons'),instances,detachments2026:[detachment],upgrades2026:upgrades,
});
const formation=(retinue='Cryptothralls')=>army([
 squad('body','Immortals',{models:5}),
 squad('leader','Overlord',{attachedTo:'body',equipment:'Staff of light'}),
 squad('support','Plasmancer',{attachedTo:'body'}),
 squad('retinue',retinue,{retinueTo:'body'}),
]);
const survivors=(a:ArmySelection,...ids:string[])=>expandRoster(a).filter(s=>ids.includes(s.id));
const detachments=(a:ArmySelection,live:readonly RosterInstance[])=>[
 ...remainingNecronReminders(a,live),...canoptekHypercryptReminders(a,live),
];

describe('Necron formations preserve their legally declared membership through casualties',()=>{
 it.each(['Cryptothralls','Canoptek Tomb Crawlers'])('keeps %s in the Bodyguard after its Cryptek dies',retinue=>{
  const a=formation(retinue),live=survivors(a,'body','leader','retinue');
  const groups=necronFormationRoots(a,live);
  expect(groups).toHaveLength(1);
  expect(groups[0].id).toBe('body');
  expect(groups[0].members.map(s=>s.id)).toEqual(['body','leader','retinue']);
  expect(groups[0].leading.map(s=>s.id)).toEqual(['leader']);
  expect(groups[0].originalBody).toMatchObject({id:'body',unit:'Immortals',models:5});
 });

 it.each(['Cryptothralls','Canoptek Tomb Crawlers'])('keeps surviving %s as Bodyguard models when its original host and Cryptek die',retinue=>{
  const a=formation(retinue),groups=necronFormationRoots(a,survivors(a,'leader','retinue'));
  expect(groups).toHaveLength(1);
  expect(groups[0].id).toBe('retinue');
  expect(groups[0].members.map(s=>s.id)).toEqual(['retinue','leader']);
  expect(groups[0].leading.map(s=>s.id)).toEqual(['leader']);
  expect(groups[0].originalBody.id).toBe('body');
 });

 it('keeps a surviving Leader and Support together after every Bodyguard model dies',()=>{
  const a=formation(),live=survivors(a,'leader','support'),groups=necronFormationRoots(a,live);
  expect(groups).toHaveLength(1);
  expect(groups[0].members.map(s=>s.id)).toEqual(['leader','support']);
  expect(groups[0].leading.map(s=>s.id)).toEqual(['leader','support']);
  expect(groups[0].id).toBe('leader');
  expect(groups[0].originalBody.id).toBe('body');
  // Repeated casualty and revival reads must not mutate/copy a previous live state.
  expect(necronFormationRoots(a,[])).toEqual([]);
  expect(necronFormationRoots(a)[0].members.map(s=>s.id)).toEqual(['body','leader','support','retinue']);
 });

 it('does not merge separate original formations after their Bodyguards die',()=>{
  const a=army([
   squad('first','Immortals'),squad('second','Immortals'),
   squad('leader','Overlord',{attachedTo:'first'}),squad('support','Plasmancer',{attachedTo:'first'}),
   squad('other','Chronomancer',{attachedTo:'second'}),
  ]);
  expect(necronFormationRoots(a,survivors(a,'leader','support','other')).map(g=>g.members.map(s=>s.id)))
   .toEqual([['leader','support'],['other']]);
 });

 it('never legalizes an originally overfilled Support slot after one Support dies',()=>{
  const a=formation();
  a.instances!.push(squad('extra','Chronomancer',{attachedTo:'body'}));
  const groups=necronFormationRoots(a,survivors(a,'body','leader','support','retinue'));
  expect(groups.map(g=>g.members.map(s=>s.id))).toEqual([['body'],['leader'],['support'],['retinue']]);
  expect(groups.flatMap(g=>g.leading)).toEqual([]);
  expect(detachments(a,survivors(a,'leader','support')).some(r=>r.title==='Command Protocols')).toBe(false);
 });

 it('never legalizes originally conflicting retinues after one retinue dies',()=>{
  const a=formation();
  a.instances!.push(squad('extra','Canoptek Tomb Crawlers',{retinueTo:'body'}));
  expect(necronFormationRoots(a,survivors(a,'body','support','retinue')).map(g=>g.members.map(s=>s.id)))
   .toEqual([['body','support'],['retinue']]);
 });

 it.each([
  squad('leader','Overlord',{attachedTo:'missing'}),
  squad('leader','Overlord',{attachedTo:'other'}),
  squad('leader','Doomsday Ark',{attachedTo:'body'}),
 ])('does not inherit membership through a changed identity or link: %j',changed=>{
  const a=formation(),live=[...survivors(a,'body','support'),changed];
  const groups=necronFormationRoots(a,live);
  expect(groups.map(g=>g.members.map(s=>s.id))).toEqual([['body','support'],['leader']]);
  expect(groups.flatMap(g=>g.leading).map(s=>s.id)).toEqual(['support']);
 });

 it('does not treat a removed muster link as casualty history',()=>{
  const a=formation();
  const edited={...a,instances:expandRoster(a).filter(s=>s.id!=='body').map(s=>({...s,attachedTo:undefined,retinueTo:undefined}))};
  expect(necronFormationRoots(edited).map(g=>g.members.map(s=>s.id))).toEqual([['leader'],['support'],['retinue']]);
  expect(necronFormationRoots(edited).flatMap(g=>g.leading)).toEqual([]);
 });
});

describe('Necron leading enhancements follow their surviving source',()=>{
 it.each([['leader'],['leader','support'],['leader','retinue']])('keeps Casket, Command Protocols and lost-Bodyguard reanimation for %j',(...liveIds)=>{
  const a={...formation(),upgrades2026:{leader:'Nether-realm Casket'}},live=survivors(a,...liveIds);
  const rows=remainingNecronReminders(a,live),root=liveIds.includes('retinue')?'retinue':'leader';
  expect(rows.find(r=>r.title.endsWith('Nether-realm Casket'))?.units).toEqual([...new Set(['leader',root])]);
  expect(rows.filter(r=>r.title==='Command Protocols').map(r=>r.units)).toEqual([[root],[root]]);
  expect(rows.filter(r=>r.title.startsWith('Protocol of the Undying Legions')).map(r=>r.units)).toEqual([[root],[root]]);
  expect(rows.every(r=>!r.units?.includes('body'))).toBe(true);
 });

 it('removes the dead Casket bearer while retaining the surviving Support leading history',()=>{
  const a={...formation(),upgrades2026:{leader:'Nether-realm Casket'}},live=survivors(a,'support');
  const rows=remainingNecronReminders(a,live);
  expect(rows.some(r=>r.title.includes('Nether-realm Casket'))).toBe(false);
  expect(rows.filter(r=>r.title==='Command Protocols').map(r=>r.units)).toEqual([['support'],['support']]);
 });

 it('keeps Hyperphasic Fulcrum when its surviving Cryptek was originally attached',()=>{
  const a={...formation(),detachments2026:['Canoptek Court'],upgrades2026:{support:'Hyperphasic Fulcrum'}};
  const rows=canoptekHypercryptReminders(a,survivors(a,'support')).filter(r=>r.title.endsWith('Hyperphasic Fulcrum'));
  expect(rows.map(r=>[r.window,r.units])).toEqual([['Movement',['support']],['Shooting',['support']],['Fight',['support']]]);
  expect(canoptekHypercryptReminders(a,survivors(a,'leader')).some(r=>r.title.includes('Hyperphasic Fulcrum'))).toBe(false);
 });

 it.each([
  ['Awakened Dynasty','Nether-realm Casket','Overlord'],
  ['Canoptek Court','Hyperphasic Fulcrum','Plasmancer'],
 ])('does not grant %s leading history to an unattached %s bearer', (detachment,upgrade,unit)=>{
  const a=army([squad('solo',unit)],detachment,{solo:upgrade});
  expect(detachments(a,expandRoster(a)).some(r=>r.title.includes(upgrade)||r.title==='Command Protocols')).toBe(false);
 });
});

describe.each([
 ['Annihilation Legion','Ingrained Superiority'],
 ['Obeisance Phalanx','Eternal Conqueror'],
 ['Hypercrypt Legion','Arisen Tyrant'],
])('%s offensive enhancement uses actual surviving weapons', (detachment,upgrade)=>{
 const named=(a:ArmySelection,live=expandRoster(a))=>detachments(a,live).filter(r=>r.title.endsWith(upgrade));

 it('omits Shooting for a Shroud Overlord and melee-only Lychguard while retaining Fight',()=>{
  const a=army([squad('body','Lychguard'),squad('leader','Overlord with translocation shroud',{attachedTo:'body'})],detachment,{leader:upgrade});
  expect(named(a).map(r=>r.window)).toEqual(['Fight']);
 });

 it('retains Shooting when the legally attached Leader has a ranged weapon',()=>{
  const a=army([squad('body','Lychguard'),squad('leader','Overlord',{attachedTo:'body',equipment:'Staff of light'})],detachment,{leader:upgrade});
  expect(named(a).map(r=>r.window)).toEqual(upgrade==='Ingrained Superiority'?['Movement','Shooting','Fight']:['Shooting','Fight']);
 });

 it('uses surviving armed retinues after host/Cryptek losses and stops Shooting after the retinue dies',()=>{
  const base=formation(),a={...base,detachments2026:[detachment],upgrades2026:{leader:upgrade},
   instances:expandRoster(base).map(s=>s.id==='leader'?{...s,unit:'Overlord with translocation shroud'}:s)};
  expect(named(a,survivors(a,'leader','retinue')).map(r=>r.window)).toEqual(upgrade==='Ingrained Superiority'?['Movement','Shooting','Fight']:['Shooting','Fight']);
  expect(named(a,survivors(a,'leader')).map(r=>r.window)).toEqual(['Fight']);
 });
});
