import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {GREY_KNIGHTS_SHEETS} from '../src/grey-knights-data.generated';
import {greyKnightsDetachmentReminders} from '../src/grey-knights-detachments';
import {eligibleGreyKnightsUpgrades} from '../src/grey-knights-detachment-data';
import {GK_DETACHMENTS,GK_STRATAGEMS,GK_UPGRADES} from '../src/grey-knights-detachments.generated';
import {greyKnightsLoadout,greyKnightsWeaponCount} from '../src/grey-knights-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const warpbane='Warpbane Task Force',brotherhood='Brotherhood Strike',hallowed='Hallowed Conclave',banishers='Banishers',sanctic='Sanctic Spearhead',augur='Augurium Task Force',argent='Argent Assault',fires='Fires of Purgation',immaterial='Immaterial Interdiction';
const master='Grand Master',captain='Brother-captain',chaplain='Brotherhood Chaplain',champion='Brotherhood Champion',tech='Brotherhood Techmarine',lib='Brotherhood Librarian',strike='Strike Squad',term='Brotherhood Terminator Squad',paladin='Paladin Squad',purifier='Purifier Squad',purgation='Purgation Squad',interceptor='Interceptor Squad',dread='Nemesis Dreadknight',gm='Grand Master In Nemesis Dreadknight',venerable='Venerable Dreadnought',crowe='Castellan Crowe';
const id=(unit:string,n=1)=>unit+'#'+n;
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Grey Knights'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1)}))};
}
const edit=(a:ArmySelection,u:string,changes:Partial<RosterInstance>)=>({...a,instances:a.instances!.map(s=>s.id===id(u)?{...s,...changes}:s)});
const equip=(a:ArmySelection,u:string,name:string)=>({...a,upgrades2026:{[id(u)]:name}});
const generate=(a:ArmySelection)=>greyKnightsDetachmentReminders(a,a.instances);
const by=(a:ArmySelection,key:string)=>generate(a).filter(r=>r.sourceRuleId===key);
const named=(a:ArmySelection,title:string)=>generate(a).filter(r=>r.title===title);
function gun(a:ArmySelection,u:string,choice:string):ArmySelection{
 const squad=a.instances!.find(s=>s.id===id(u))!,slot=greyKnightsLoadout(u,squad.models)!.slots.find(s=>s.choices.some(c=>c.name===choice))!;
 return edit(a,u,{knightGear:{...squad.knightGear,[slot.name]:choice}});
}

describe('Grey Knights source-backed detachment rules',()=>{
 it('uses the nine October dispositions, all 45 Stratagems and 30 priced upgrade records',()=>{
  expect(GK_DETACHMENTS).toHaveLength(9);expect(GK_STRATAGEMS).toHaveLength(45);expect(GK_UPGRADES).toHaveLength(30);
  expect(detachmentBudget('Grey Knights',[warpbane],'Incursion')).toMatchObject({spent:3,valid:true,dispositions:['Take and Hold','Purge the Foe']});
  expect(detachmentBudget('Grey Knights',[argent,immaterial],'Strike Force')).toMatchObject({spent:2,valid:true,dispositions:['Priority Assets','Reconnaissance']});
  expect(eligibleGreyKnightsUpgrades(force([fires],purgation),purgation)).toMatchObject([{points:10,repeatable:true},{points:20,repeatable:true}]);
  expect(eligibleGreyKnightsUpgrades(force([brotherhood],venerable),venerable).find(u=>u.name==='Tome of Forbidden Ways')?.points).toBe(25);
  expect(eligibleGreyKnightsUpgrades(force([argent],champion),champion)).toEqual([]);
 });
 it('determines Hallowed Ground per phase and keeps Crowe’s modifier on his actual Purifiers',()=>{
  const a=edit(force([warpbane],purifier,purifier,crowe,'Rhino'),crowe,{attachedTo:id(purifier)});
  expect(named(a,'Hallowed Ground')).toHaveLength(5);
  expect(named(a,'Hallowed Ground')[0].summary).toMatch(/deployment zone.*6″.*at least half/i);
  const flames=by(a,'000009778003')[0];
  expect(flames).toMatchObject({window:'Fight',turn:'either',timing:'end',units:[id(purifier),id(purifier,2)]});
  expect(flames.summary).toContain('while Castellan Crowe remains attached: '+id(purifier)+'.');
  expect(by(edit(a,crowe,{attachedTo:undefined}),'000009778003')[0].summary).not.toContain('Add 1');
 });
 it('requires the entire formation to have Deep Strike for arrival and withdrawal effects',()=>{
  const a=edit(force([brotherhood],strike,term,'Inquisitor','Land Raider','Callidus Assassin','Armiger Warglaive'),'Inquisitor',{attachedTo:id(term)});
  expect(by(a,'000010349003')[0].units).toEqual([id(strike)]);
  expect(by(a,'000010349007')[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end',units:[id(strike)]});
  expect(by(a,'000010349003')[0].summary).toMatch(/more than 6″.*cannot declare a charge/);
  expect(named(a,'Fury of Titan').find(r=>r.window==='Fight')?.units).toEqual([id(strike),'Callidus Assassin#1']);
  expect(by(a,'000010349004')[0].units).not.toContain(id(term));
  expect(by(equip(a,'Inquisitor','Banishing Wave'),'000010348002')).toEqual([]);
 });
 it('never grants mixed formations a Deep Strike withdrawal while retaining their legal six-inch move',()=>{
  const a=edit(force([banishers],term,strike,'Inquisitor'),'Inquisitor',{attachedTo:id(term)});
  const shadow=by(a,'000010357007')[0];
  expect(shadow).toMatchObject({window:'Movement',turn:'opponent',units:[id(term),id(strike)]});
  expect(shadow.summary).toContain('within 8″');
  expect(shadow.summary).toContain('because every model has Deep Strike: '+id(strike)+'.');
  const aug={...a,detachments2026:[augur]};
  expect(named(aug,'Prescient Redeployment')[0].units).toEqual([id(strike)]);
  expect(by(aug,'000010365006')[0].units).toEqual([id(strike)]);
  expect(by(aug,'000010365007')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'during',units:[id(strike)]});
 });
 it('distinguishes bearer models from their attached formation and uses current Heroic Intervention wording',()=>{
  const base=edit(force([warpbane,hallowed],master,paladin,paladin),master,{attachedTo:id(paladin)});
  const relic=by(equip(base,master,'Mandulian Reliquary'),'000009777002');
  expect(relic).toHaveLength(5);expect(relic[0].units).toEqual([id(master)]);
  expect(relic[0].summary).toMatch(/bearer model has \+3.*Other models gain no OC/);
  const reap=by(equip(base,master,'Sanctic Reaper'),'000010352004')[0];
  expect(reap.units).toEqual([id(master)]);expect(reap.summary).toContain('bearer model’s own');
  const eye=by(equip(base,master,'Eye of the Augurium'),'000010352002')[0];
  expect(eye).toMatchObject({window:'Charge',turn:'opponent',units:[id(paladin)]});
  expect(eye.summary).toMatch(/1CP less.*another unit already used.*does not prevent other units/);
 });
 it('prints Psychic weapon effects only for actual equipped Psychic melee weapons',()=>{
  const a=force([banishers,brotherhood],chaplain,tech,dread,gm,'Rhino');
  expect(named(a,'Channelled Force')).toEqual([]);
  expect(by(a,'000010349002')).toEqual([]);
  const hammer=gun(a,dread,'Nemesis daemon greathammer');
  expect(named(hammer,'Channelled Force')[0].units).toEqual([id(dread)]);
  expect(by(hammer,'000010349002')).toEqual([]); // Walker is not Infantry.
  const joined=edit(force([banishers,brotherhood],chaplain,term),chaplain,{attachedTo:id(term)});
  expect(by(joined,'000010349002')[0].units).toEqual([id(term)]);
 });
 it('checks actual storm bolters and respects both turns of the Fight phase',()=>{
  const a=force([hallowed],captain);
  expect(by(a,'000010353004')[0].summary).toContain(id(captain)+' (1)');
  expect(by(gun(a,captain,'Incinerator'),'000010353004')).toEqual([]);
  const b=force([augur],term,venerable);
  expect(by(b,'000010365002').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Fight','either']]);
  expect(by(b,'000010365004').map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Fight','either']]);
  expect(by(b,'000010365005')[0].summary).toContain('exceeds the current battle round number');
 });
 it('does not invent advance, fall-back or charge moves for the compulsory-reserve Aircraft',()=>{
  const a=force([sanctic],'Stormhawk Interceptor','Stormtalon Gunship','Rhino');
  expect(named(a,'Mailed Fist')[0].units).toEqual(['Rhino#1']);
  for(const key of ['000010361005','000010361006','000010361007'])for(const row of by(a,key))expect(row.units).toEqual(['Rhino#1']);
  expect(by(a,'000010361003').find(r=>r.window==='Shooting')?.units).toEqual(['Stormhawk Interceptor#1','Stormtalon Gunship#1','Rhino#1']);
 });
 it('only offers transport-triggered upgrade effects when the complete formation can fit a real carrier',()=>{
  const a=edit(force([sanctic],master,term),master,{attachedTo:id(term)});
  expect(by(equip(a,master,'Quickening Foci'),'000010360003')).toEqual([]);
  const rhino={...a,instances:[...a.instances!,{unit:'Rhino',id:'Rhino#1'}]};
  expect(by(equip(rhino,master,'Quickening Foci'),'000010360003')).toEqual([]);
  const land={...a,instances:[...a.instances!,{unit:'Land Raider',id:'Land Raider#1'}]};
  expect(by(equip(land,master,'Quickening Foci'),'000010360003')[0].summary).toContain('Suitable transports: Land Raider#1');
  expect(by(equip(land,master,'Spiritus Machina'),'000010360005')[0].units).toEqual([id(term)]);
 });
 it('uses the September ingress and teleport corrections without granting charge permission',()=>{
  const a=force([augur],master);
  const foot=by(equip(a,master,'One Foot in the Future'),'000010364004')[0];
  expect(foot).toMatchObject({window:'Movement',turn:'either'});
  expect(foot.summary).toMatch(/ends an ingress move.*D6″.*cannot declare a charge/);
  const sigil=by(equip({...a,detachments2026:[sanctic]},master,'Sigil of Exigence'),'000010360004')[0];
  expect(sigil.summary).toMatch(/Once per battle.*more than 8″.*retarget/);
  expect(by(force([hallowed],strike),'000010353006')[0].summary).toContain('within 8″');
 });
 it('keeps Paladin, Purgation and Interceptor rules specific to their matching formed squads',()=>{
  const a=force([argent,fires,immaterial],paladin,purgation,interceptor,strike,'Armiger Warglaive');
  expect(named(a,'Dauntless Champions')[0].units).toEqual([id(paladin)]);
  expect(named(a,'Searing Soulflame')[0].units).toEqual([id(purgation)]);
  expect(named(a,'Echojump')[0]).toMatchObject({window:'Shooting',turn:'own',timing:'during',units:[id(interceptor)]});
  expect(named(a,'Echojump')[0].summary).toMatch(/Surge move up to D6\+1″.*cannot use Personal Teleporters/);
  expect(by(a,'000010921002')).toHaveLength(5);
  expect(by(a,'000010929004')[0].summary).toMatch(/Fall Back.*D3\+3″.*unengaged/);
  expect(by(a,'000010925004')[0].summary).toMatch(/Battle-shocked enemy hit.*D3\+1 mortal/);
 });
 it('targets Circle of Sanctuary at the Character model and excludes unrelated allied Characters',()=>{
  const a=edit(force([banishers],master,term,'Inquisitor',venerable),master,{attachedTo:id(term)});
  expect(by(a,'000010357006')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'start',units:[id(master),id(venerable)]});
  expect(by(a,'000010357006')[0].summary).toContain('within 12″ horizontally');
 });
 it.each([
  [banishers,captain,'Sigil of the Hunt','Shooting','Hit rolls of 1'],
  [warpbane,captain,'Mandulian Reliquary','Command','+3 Objective Control'],
  [sanctic,venerable,'Driven by Duty','Fight','up to 6″'],
  [fires,purgation,'Precognicient Volleys','Movement','5+'],
  [augur,captain,'Grimoire of Conjunctions','Fight','+4 Strength'],
  [argent,captain,'Psychic Celerity','Charge','Add 1'],
  [hallowed,captain,'Eye of the Augurium','Charge','1CP less'],
  [immaterial,interceptor,'Predestined Coordinates','Movement','first Movement phase'],
  [brotherhood,captain,'Banishing Wave','Movement','12″'],
  [augur,captain,'Shield of Prophecy','Start of battle round','+2 Toughness'],
  [fires,purgation,'Boons of Deimos','Shooting','+2 Strength'],
  [banishers,captain,'The Ephemeral Tome','Shooting','cannot declare a charge'],
  [immaterial,interceptor,'Astral Overlap','Shooting','Stealth'],
  [hallowed,captain,'Inescapable Judgement','Movement','D3+3'],
  [sanctic,captain,'Quickening Foci','Charge','re-roll Charge rolls'],
  [argent,captain,'Vigilance of Titan','Shooting','detection range by 6″'],
  [warpbane,captain,'Radiant Champion','Fight','one mortal wound'],
  [brotherhood,captain,'Blinding Aura','Movement','Fire Overwatch'],
  [augur,captain,'One Foot in the Future','Movement','ingress move'],
  [banishers,captain,'The Sixty-sixth Seal','Shooting','Armour Penetration'],
  [brotherhood,captain,'Purity of Purpose','Charge','re-roll Charge rolls'],
  [warpbane,captain,'Phial of the Abyss','Shooting','Stealth'],
  [sanctic,captain,'Sigil of Exigence','Shooting','8″'],
  [hallowed,captain,'Sanctic Reaper','Fight','Add 3'],
  [warpbane,captain,'Paragon of Sanctity','Command','18″'],
  [sanctic,captain,'Spiritus Machina','Shooting','re-roll Wound rolls'],
  [augur,captain,'Doomseer’s Amulet','Movement','Battle-shock test at −1'],
  [banishers,captain,'Pyresoul','Shooting','24″'],
  [hallowed,captain,'Nemesis Rounds','Movement','5+'],
 ])('applies the selected %s upgrade to the actual %s bearer: %s',(det,bearer,choice,phase,trigger)=>{
  const a=force([det],bearer,'Land Raider');
  const up=eligibleGreyKnightsUpgrades(a,bearer).find(u=>u.name===choice)!;
  expect(up).toBeDefined();
  expect(by(equip(a,bearer,choice),up.id).find(r=>r.window===phase)?.summary).toContain(trigger);
  expect(by(a,up.id)).toEqual([]);
  expect(by({...equip(a,bearer,choice),detachments2026:[]},up.id)).toEqual([]);
 });
 it.each([[warpbane,6],[brotherhood,6],[hallowed,6],[banishers,6],[sanctic,6],[augur,6],[argent,3],[fires,3],[immaterial,3]] as const)('prints every current %s Stratagem with a source, eligible models and exact phase/turn', (det,count)=>{
  let a=force([det],...GREY_KNIGHTS_SHEETS.map(s=>s.unit));
  a=edit(a,crowe,{attachedTo:id(purifier)});
  const rows=generate(a),strats=rows.filter(r=>r.id.startsWith('11e-gk-det-strat-'));
  expect(new Set(strats.map(r=>r.sourceRuleId)).size).toBe(count);
  expect(strats.every(r=>r.summary.length>30&&r.units?.length&&r.turn&&r.title.includes('CP')&&r.source.startsWith('https://'))).toBe(true);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
  expect(generate(force([det],'Armiger Warglaive'))).toEqual([]);
 });
 it('retains correctly counted native weapons even when the bearer has a mixed kit',()=>{
  const a=gun(force([hallowed],captain),captain,'Psycannon');
  expect(greyKnightsWeaponCount(a.instances![0],'Psycannon')).toBe(1);
  expect(by(a,'000010353004')).toEqual([]);
 });
 it('uses current Stealth cover and preserves only the permitted Fury re-roll for snap shooting',()=>{
  const a=force([warpbane],captain),b=force([immaterial],interceptor);
  for(const rows of [by(equip(a,captain,'Phial of the Abyss'),'000009777004'),by(equip(b,interceptor,'Astral Overlap'),'000010928003')]){
   expect(rows.map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Movement','own'],['Movement','opponent'],['Shooting','own']]);
   expect(rows.every(r=>r.summary.includes('Benefit of Cover')&&!r.summary.includes('Hit rolls'))).toBe(true);
  }
  const fury=named(force([brotherhood],captain),'Fury of Titan · snap shooting')[0];
  expect(fury).toMatchObject({window:'Movement',turn:'opponent',timing:'end',units:[id(captain)]});
  expect(fury.summary).toMatch(/Deep Strike this turn.*re-roll Wound rolls of 1.*forbids Hit re-rolls/);
 });
 it('suppresses Hit-roll improvements when every equipped ranged weapon is Torrent',()=>{
  const a=gun(force([augur,banishers,hallowed,warpbane],captain),captain,'Incinerator');
  expect(by(a,'000010365002').some(r=>r.window==='Shooting')).toBe(false);
  expect(by(a,'000010365003').some(r=>r.window==='Shooting')).toBe(false);
  expect(by(equip(a,captain,'Sigil of the Hunt'),'000010356002')).toEqual([]);
  expect(by(equip(a,captain,'Nemesis Rounds'),'000010352005')).toEqual([]);
  expect(named(a,'Hallowed Ground · attacks').map(r=>r.window)).toEqual(['Fight']);
  expect(by(equip(a,captain,'The Sixty-sixth Seal'),'000010356004')[0].window).toBe('Shooting');
 });
 it('retains Boons of Deimos on a legal Unending Fidelity shooting reaction without granting extra shooting',()=>{
  const a=equip(force([fires,hallowed],purgation),purgation,'Boons of Deimos');
  expect(detachmentBudget('Grey Knights',[fires,hallowed],'Strike Force').valid).toBe(true);
  const reaction=by(a,'000010924003').find(r=>r.window==='Shooting'&&r.turn==='opponent');
  expect(reaction?.summary).toMatch(/If destroyed Purgation models shoot using Unending Fidelity.*\+2 Strength.*only those destroyed models/);
  expect(by({...a,detachments2026:[fires]},'000010924003').some(r=>r.window==='Shooting'&&r.turn==='opponent')).toBe(false);
 });
});
