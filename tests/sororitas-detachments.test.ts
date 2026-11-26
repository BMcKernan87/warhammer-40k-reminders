import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {SORORITAS_SHEETS,SORORITAS_REVISION} from '../src/sororitas-data.generated';
import {sororitasKeywords} from '../src/sororitas-army-data';
import {sororitasFormations} from '../src/sororitas-transports';
import {sororitasLoadout,sororitasWeaponCount} from '../src/sororitas-loadouts';
import {eligibleSororitasUpgrades} from '../src/sororitas-detachment-data';
import {sororitasDetachmentReminders} from '../src/sororitas-detachments';
import {SORORITAS_DETACHMENTS,SORORITAS_RANDOM_SHOTS,SORORITAS_STRATAGEMS,SORORITAS_UPGRADES} from '../src/sororitas-detachments.generated';

const martyrs='Hallowed Martyrs',penitent='Penitent Host',flame='Bringers of Flame',faith='Army of Faith',champions='Champions of Faith',chorus='Chorus of Condemnation',sacred='Sacred Champions',orators='Sanctified Orators';
const sisters='Battle Sisters Squad',canoness='Canoness',jump='Canoness with Jump Pack',palatine='Palatine',priest='Ministorum Priest',sacresants='Celestian Sacresants',insidiants='Celestian Insidiants',paragons='Paragon Warsuits',seraphim='Seraphim Squad',exorcist='Exorcist',rhino='Sororitas Rhino';
const id=(u:string,n=1)=>u+'#'+n;
function force(dets:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Adepta Sororitas'),detachments2026:dets,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1)}))};
}
const edit=(a:ArmySelection,u:string,changes:Partial<RosterInstance>)=>({...a,instances:a.instances!.map(s=>s.id===id(u)?{...s,...changes}:s)});
const join=(a:ArmySelection,u:string,bodyguard=sisters)=>edit(a,u,{attachedTo:id(bodyguard)});
const equip=(a:ArmySelection,u:string,up:string)=>({...a,upgrades2026:{...a.upgrades2026,[id(u)]:up}});
const generate=(a:ArmySelection)=>sororitasDetachmentReminders(a,a.instances);
const by=(a:ArmySelection,key:string)=>generate(a).filter(r=>r.sourceRuleId===key);
const named=(a:ArmySelection,title:string)=>generate(a).filter(r=>r.title===title);
function gun(a:ArmySelection,u:string,choice:string):ArmySelection{
 const squad=a.instances!.find(s=>s.id===id(u))!,slot=sororitasLoadout(u,squad.models)!.slots.find(s=>s.choices.some(c=>c.name===choice||c.items.includes(choice)));
 if(!slot)throw Error('No native weapon choice '+u+': '+choice);
 const value=slot.choices.find(c=>c.name===choice||c.items.includes(choice))!.name;
 return edit(a,u,{knightGear:{...squad.knightGear,[slot.name]:value}});
}

describe('Sororitas current source-backed detachments',()=>{
 it('preserves the October matched-play inventory, dispositions, Reverend exclusion and priced repeatable upgrades',()=>{
  expect(SORORITAS_DETACHMENTS).toHaveLength(8);expect(SORORITAS_STRATAGEMS).toHaveLength(36);expect(SORORITAS_UPGRADES).toHaveLength(25);
  expect(SORORITAS_DETACHMENTS.find(d=>d.name===martyrs)).toMatchObject({dp:3,disposition:'Take and Hold',additionalDispositions:['Priority Assets']});
  expect(SORORITAS_DETACHMENTS.filter(d=>'tag' in d).map(d=>d.name)).toEqual([champions,sacred]);
  expect(SORORITAS_UPGRADES.find(u=>u.name==='Hagiomnifex')).toMatchObject({points:25,repeatable:true,countsTowardLimit:false});
  expect(eligibleSororitasUpgrades(force([chorus],exorcist),exorcist)).toMatchObject([{name:'Symphonic Payload',points:10,repeatable:true}]);
  expect(eligibleSororitasUpgrades(force([sacred],sacresants),sacresants)).toMatchObject([{name:'Writ of Compunction',points:20,repeatable:true}]);
  expect(eligibleSororitasUpgrades(force([faith],canoness),canoness).find(u=>u.name==='Litanies of Faith')?.points).toBe(10);
  expect(SORORITAS_REVISION.pack).toContain('14-10');expect(SORORITAS_REVISION.packVersion).toBe('1.4');
 });
 it('makes all 36 Stratagems executable against real eligible native models',()=>{
  const a=force(SORORITAS_DETACHMENTS.map(d=>d.name),...SORORITAS_SHEETS.map(s=>s.unit));
  const actual=new Set(generate(a).map(r=>r.sourceRuleId));
  expect(SORORITAS_STRATAGEMS.filter(s=>!actual.has(s.id)).map(s=>s.name)).toEqual([]);
  expect(generate(a).every(r=>r.units?.length&&r.source&&r.summary)).toBe(true);
  expect(new Set(generate(a).map(r=>r.id)).size).toBe(generate(a).length);
 });
 it('ignores a foreign faction, absent detachment selections and unsupported imported models',()=>{
  expect(generate({...force([martyrs],sisters),faction:'Grey Knights'})).toEqual([]);
  expect(generate(force([],sisters))).toEqual([]);
  expect(generate(force([martyrs,flame,faith,champions],'Imaginary Saint','Land Raider','Sisters of Battle Squad','Ministorum Priest (Assigned Agent)'))).toEqual([]);
 });
 it('keeps CP changes and exact source phase restrictions',()=>{
  const a=force([faith,flame,penitent],sisters,seraphim,rhino,'Penitent Engines');
  expect(by(a,'000009038003')).toMatchObject([{title:'Light Of The Emperor · 2CP',window:'Command',turn:'either'}]);
  expect(by(a,'000009034007')).toMatchObject([{title:'Blazing Ire · 2CP',window:'Shooting',turn:'opponent'}]);
  expect(by(a,'000009034005')).toMatchObject([{title:'Cleansing Flames · 2CP',window:'Shooting',turn:'own'}]);
  expect(by(a,'000009038006').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Fight','either']]);
  expect(by(a,'000009038007')).toMatchObject([{window:'Fight',turn:'opponent',timing:'end'}]);
  expect(by(a,'000009030007')).toMatchObject([{window:'Shooting',turn:'opponent'}]);
  expect(by(a,'000009030007')[0].summary).toContain('Surge move up to D6″');
  expect(by(a,'000009034002').every(r=>r.summary.includes('only until that attacker finishes'))).toBe(true);
 });
 it('uses current faction-model scope and keeps Blood of Martyrs on legal normal and snap reactions',()=>{
  const a=join(force([martyrs],sisters,'Inquisitor','Castigator','Arco-flagellants'),'Inquisitor');
  expect(named(a,'The Blood of Martyrs').find(r=>r.window==='Shooting')?.units).toEqual([id(sisters),id('Castigator')]);
  expect(named(a,'The Blood of Martyrs')[0].summary).toMatch(/Only Adepta Sororitas models.*below Starting Strength.*Below Half-strength/);
  const snap=named(a,'The Blood of Martyrs · snap shooting')[0];
  expect(snap).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(snap.summary).toMatch(/\+1 to Wound.*ignores Hit modifiers.*cannot score Critical/);
  const react=named(a,'The Blood of Martyrs · reaction shooting');
  expect(react).toHaveLength(1);expect(react[0].units).toEqual([id(sisters)]);
  expect(react[0].summary).toMatch(/If surviving models shoot using Praise the Fallen.*surviving Adepta Sororitas/);
  expect(by(a,'000008469007')[0].units).toEqual([id(sisters)]);
 });
 it('lets a real two-model Character unit use Praise the Fallen but not a lone Character or a gunless formation',()=>{
  const a=force([martyrs],'Aestred Thurga And Agathae Dolan',canoness,'Arco-flagellants','Mortifiers');
  expect(by(a,'000008469007')[0].units).toEqual([id('Aestred Thurga And Agathae Dolan')]);
  expect(by(edit(a,'Mortifiers',{models:2}),'000008469007')[0].units).toContain(id('Mortifiers'));
 });
 it('resurrects actual Character models as separate units and excludes Saint Celestine and attached bodyguards',()=>{
  const a=join(force([martyrs],canoness,sisters,'Saint Celestine','Daemonifuge','Aestred Thurga And Agathae Dolan','Sanctifiers'),canoness);
  const rules=by(a,'000008469002');expect(rules).toHaveLength(5);
  expect(rules[0].units).toEqual([id(canoness),id('Daemonifuge'),id('Aestred Thurga And Agathae Dolan')]);
  expect(rules[0].summary).toMatch(/at most once per battle.*1–3 Miracle dice.*At phase end.*separate unit with Starting Strength 1/);
  expect(rules.every(r=>r.source===SORORITAS_REVISION.pack)).toBe(true);
 });
 it('uses actual Vehicle Deadly Demise, enemy models for forced targeting, and automatic fight-on-death',()=>{
  const a=force([martyrs],rhino,paragons,'Morvenn Vahl',sisters,canoness,'Armiger Warglaive');
  expect(by(a,'000008469005')[0].units).toEqual([id(rhino),id('Morvenn Vahl')]); // The actual Paragon card has no Deadly Demise.
  expect(by(a,'000008469003')[0]).toMatchObject({window:'Fight',timing:'start'});
  expect(by(a,'000008469003')[0].summary).toMatch(/each enemy model within Engagement Range.*target this formation/);
  expect(by(a,'000008469003')[0].units).not.toContain(id(rhino));
  expect(by(a,'000008469006')[0].summary).toMatch(/has not fought.*after the attacker.*No roll/);
 });
 it('uses current Catechism keyword changes without resurrecting stale MFM Repentia Leader metadata',()=>{
  for(const bearer of [canoness,jump,palatine,priest]){
   const a=equip(force([penitent],bearer),bearer,'Catechism of Divine Penitence');
   expect(sororitasKeywords(a,a.instances![0]).has('PENITENT')).toBe(true);
   expect(by(a,'000009030004')[0].units).toEqual([id(bearer)]);
   expect(by(a,'000009029005')[0].summary).toMatch(/Only the bearer model gains.*other models gain no/);
  }
  for(const bearer of [canoness,palatine,priest]){
   const a=join(equip(force([penitent],bearer,'Repentia Squad'),bearer,'Catechism of Divine Penitence'),bearer,'Repentia Squad');
   expect(SORORITAS_SHEETS.find(s=>s.unit===bearer)?.bodyguards).not.toContain('Repentia Squad');
   expect(sororitasFormations(a).find(f=>f.root.unit==='Repentia Squad')?.members).toHaveLength(1);
  }
  expect(by(equip(force([flame],canoness),canoness,'Catechism of Divine Penitence'),'000009029005')).toEqual([]);
 });
 it('distinguishes a Penitent unit from its Penitent models for Vows, critical hits and protection',()=>{
  const a=join(equip(force([penitent],canoness,sisters),canoness,'Catechism of Divine Penitence'),canoness);
  expect(named(a,'Desperate for Redemption')[0]).toMatchObject({window:'Command',turn:'own',timing:'start',units:[id(sisters)]});
  expect(named(a,'Desperate for Redemption')[0].summary).toMatch(/each Vow may be chosen once per battle.*PENITENT models in this roster: Canoness#1\./);
  expect(named(a,'The Path of the Penitent')[0].summary).toContain('only PENITENT models');
  expect(by(a,'000009030004')[0].summary).toMatch(/PENITENT models.*successful unmodified Hit rolls of 5\+.*Other models/);
  expect(by(a,'000009030003')[0].summary).toContain('only its PENITENT models');
  expect(by(a,'000009030002')[0].summary).toContain('entire Penitent formation');
  expect(sororitasKeywords(a,a.instances!.find(s=>s.unit===sisters)!).has('PENITENT')).toBe(false);
 });
 it('limits the fixed six-inch Advance to Penitent Engines and keeps fallback alternatives distinct',()=>{
  const a=force([penitent],'Penitent Engines','Mortifiers','Arco-flagellants',sisters);
  expect(by(a,'000009030005')[0].summary).toMatch(/Penitent Engines \(Penitent Engines#1\).*\+6″ Move.*instead of making an Advance roll/);
  expect(by(a,'000009030005')[0].units).not.toContain(id(sisters));
  expect(by(a,'000009030006')[0].summary).toMatch(/shoot or declare a charge.*Penitent formation may both/);
  expect(named(a,'Vows of Atonement · fighting')[0].summary).toMatch(/destroyed by a melee attack before fighting.*2\+/);
 });
 it('keeps the extra Vow once per battle at round start and after bearer death',()=>{
  const a=join(equip(force([penitent],priest,sisters),priest,'Verse of Holy Piety'),priest);
  expect(by(a,'000009029003')).toMatchObject([{window:'Start of battle round',turn:'either',timing:'start',units:[id(sisters)]}]);
  expect(by(a,'000009029003')[0].summary).toMatch(/Once per battle.*even a Vow already used.*remains active if the bearer dies/);
 });
 it('restricts Bringers ranged buffs to actual faction-model guns, keeping the within-six-inch condition in snap shooting',()=>{
  const a=join(force([flame],sisters,'Inquisitor','Arco-flagellants'),'Inquisitor');
  expect(named(a,'Fervent Purgation')[0].units).toEqual([id(sisters)]);
  expect(named(a,'Fervent Purgation')[0].summary).toMatch(/Adepta Sororitas models.*Assault.*within 6″.*\+1 Strength.*without the faction keyword/);
  expect(named(a,'Fervent Purgation · snap shooting')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(named(a,'Fervent Purgation · snap shooting')[0].summary).toContain('within 6″');
  expect(named(a,'Fervent Purgation · reaction shooting')).toEqual([]);
 });
 it('gates Cleansing Flames to equipped Torrent profiles and leaves them in your Shooting phase only',()=>{
  const a=force([flame],canoness,sisters,'Penitent Engines',exorcist);
  expect(by(a,'000009034005')[0].units).toEqual([id('Penitent Engines')]);
  const b=gun(a,canoness,'Brazier of holy fire');
  expect(by(b,'000009034005')[0].units).toEqual([id(canoness),id('Penitent Engines')]);
  expect(by(b,'000009034005').map(r=>[r.window,r.turn])).toEqual([['Shooting','own']]);
 });
 it('requires genuine embarked capacity for Blazing Ire, Rites of Fire and Carry Forth',()=>{
  const a=force([flame],rhino,sisters,paragons,seraphim,'Arco-flagellants');
  expect(by(a,'000009034007')[0].units).toEqual([id(rhino)]);
  expect(by(a,'000009034007')[0].summary).toContain('Whole formations that fit: Sororitas Rhino#1 → Battle Sisters Squad#1.');
  expect(by(a,'000009034006')[0].units).toEqual([id(sisters)]);
  expect(by(a,'000009034004')[0].summary).toMatch(/shock disembark move.*18.07/);
  const empty=force([flame],rhino,paragons,seraphim);
  for(const key of ['000009034007','000009034006','000009034004'])expect(by(empty,key)).toEqual([]);
  expect(named(empty,'Fervent Purgation · reaction shooting')).toEqual([]);
 });
 it('preserves optional Immolator split reactions without claiming a ten-model squad fits or giving all its guns to a half',()=>{
  const a=force([flame],'Immolator',sisters);
  const ire=by(a,'000009034007')[0];
  expect(ire.units).toEqual([id('Immolator')]);
  expect(ire.summary).not.toContain('Whole formations that fit');
  expect(ire.summary).toMatch(/Optional split passengers.*Only physical models and equipment allocated to the embarked half/);
  expect(by(a,'000009034006')[0].summary).toContain('only models and equipment assigned to the half that actually disembarked');
  expect(named(a,'Fervent Purgation · reaction shooting')[0].summary).toMatch(/only models and equipment actually in that embarked half/);
 });
 it('counts attached characters for transport capacity and rejects illegal transport passengers',()=>{
  const a=join(join(force([flame],rhino,sisters,'Aestred Thurga And Agathae Dolan','Dialogus'),'Aestred Thurga And Agathae Dolan'),'Dialogus');
  expect(sororitasFormations(a).find(f=>f.root.unit===sisters)?.members).toHaveLength(3);
  expect(by(a,'000009034007')).toEqual([]); // 10 + 2 + 1 does not fit twelve spaces.
  expect(by(force([flame],rhino,'Triumph Of Saint Katherine',jump),'000009034007')).toEqual([]);
 });
 it('uses the actual leader and guns for Fire and Fury, with no Sustained Hits during snap shooting',()=>{
  let a=equip(join(force([flame],canoness,sisters,rhino),canoness),canoness,'Fire and Fury');
  expect(by(a,'000009033004').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Shooting','opponent']]);
  a=gun(a,canoness,'Brazier of holy fire');
  const rows=by(a,'000009033004'),snap=rows.find(r=>r.window==='Movement')!;
  expect(rows.find(r=>r.turn==='own')?.summary).toContain('Canoness#1 · Brazier of holy fire');
  expect(snap).toMatchObject({turn:'opponent',timing:'end',units:[id(sisters)]});
  expect(snap.summary).toMatch(/Torrent weapons gain \+1 Attack.*cannot trigger Sustained Hits/);
  expect(rows.find(r=>r.window==='Shooting'&&r.turn==='opponent')?.summary).toMatch(/If this formation disembarks.*bearer is still present and leading/);
  expect(by(edit(a,canoness,{attachedTo:undefined}),'000009033004')).toEqual([]);
 });
 it('keeps Fire and Fury conditional on the bearer sharing and leading the actual embarked split half',()=>{
  const a=gun(equip(join(force([flame],canoness,sisters,'Immolator'),canoness),canoness,'Fire and Fury'),canoness,'Brazier of holy fire');
  const row=by(a,'000009033004').find(r=>r.window==='Shooting'&&r.turn==='opponent')!;
  expect(row.summary).toMatch(/only models and equipment actually in that embarked half.*bearer is still present and leading/);
  expect(row.summary).not.toContain('Canoness#1 · Brazier');
 });
 it('does not grant Righteous skill bonuses to attached Characters, and keeps Sacresant OC independent of Righteous selection',()=>{
  const a=join(force([champions],sisters,canoness,sacresants,paragons,'Castigator'),canoness);
  expect(named(a,'Righteous Purpose')[0]).toMatchObject({window:'Command',turn:'own',timing:'during'});
  expect(named(a,'Righteous Purpose')[0].summary).toMatch(/up to three.*including embarked.*until your next Command/);
  const attack=named(a,'Righteous Purpose · attacks')[0];
  expect(attack.summary).toContain('Battle Sisters Squad#1');expect(attack.summary).not.toContain('Canoness#1');
  expect(attack.summary).toContain('Attached Characters’ weapons do not gain');
  expect(attack.units).not.toContain(id('Castigator'));
  expect(named(a,'Righteous Purpose · attacks').some(r=>r.window==='Movement')).toBe(false);
  const oc=named(a,'Righteous Purpose · Sacresant control');expect(oc).toHaveLength(5);
  expect(oc[0].units).toEqual([id(sacresants)]);expect(oc[0].summary).toMatch(/only its Celestian Sacresants models.*does not require.*Righteous/);
 });
 it('keeps the Righteous conditions and different expiry times on Champions stratagems',()=>{
  const a=force([champions],sacresants,sacresants,sisters);
  expect(by(a,'000009832006')[0].summary).toMatch(/one other non-Battle-shocked Sacresant formation within 6″/);
  expect(by(a,'000009832004')[0].summary).toMatch(/Strength until turn end.*Righteous.*Armour Penetration.*until phase end/);
  expect(by(a,'000009832005')[0].summary).toMatch(/6″ until turn end.*closest enemy model.*closest enemy unit/);
  expect(by(a,'000009832007')[0].summary).toMatch(/still shoot.*Righteous.*both shoot and declare a charge/);
  expect(by(a,'000009832003').every(r=>r.summary.includes('Righteous'))).toBe(true);
 });
 it('suppresses Critical-Hit bonuses when all actual guns are Torrent',()=>{
  const a=gun(force([champions],jump),jump,'Ministorum hand flamer');
  expect(sororitasWeaponCount(a.instances![0],'Ministorum hand flamer')).toBe(1);
  expect(by(a,'000009832003').map(r=>r.window)).toEqual(['Fight']);
  expect(by(equip(a,jump,'Triptych of Judgement'),'000009831002').map(r=>r.window)).toEqual(['Fight']);
 });
 it('keeps Eyes of the Oracle unit-kill CP with a gunless bearer while limiting Precision to its own fitted weapons',()=>{
  const a=equip(join(force([champions],jump,seraphim),jump,seraphim),jump,'Eyes of the Oracle');
  expect(sororitasWeaponCount(a.instances!.find(s=>s.unit===jump)!,'Ministorum hand flamer')).toBe(0);
  const rules=by(a,'000009831004');
  expect(rules.map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Fight','either'],['Movement','opponent']]);
  expect(rules.every(r=>r.units?.[0]===id(seraphim)&&r.summary.includes('formation destroys an enemy Character model, gain 1CP'))).toBe(true);
  for(const row of rules.filter(r=>r.window!=='Fight'))expect(row.summary).not.toContain('Precision');
  expect(rules.find(r=>r.window==='Fight')?.summary).toContain('Only the bearer model’s own equipped melee weapons have Precision');
  const armed=gun(a,jump,'Ministorum hand flamer');
  expect(by(armed,'000009831004').find(r=>r.window==='Shooting')?.summary).toContain('Only the bearer model’s own equipped ranged weapons have Precision');
  expect(by(armed,'000009831004').find(r=>r.window==='Movement')?.summary).toContain('only the bearer model’s own equipped ranged weapons retain Precision');
  expect(by(edit(a,jump,{attachedTo:undefined}),'000009831004').map(r=>r.window)).toEqual(['Fight']);
  const reaction=by({...a,detachments2026:[champions,martyrs]},'000009831004').find(r=>r.window==='Shooting'&&r.turn==='opponent');
  expect(reaction?.summary).toMatch(/Praise the Fallen.*bearer is still in the shooting unit.*formation destroys an enemy Character model, gain 1CP/);
  expect(reaction?.summary).not.toContain('Precision');
  expect(reaction?.units).toEqual([id(seraphim)]);
 });
 it('requires an Exorcist and an actual Infantry Fly source for Chorus combined shooting',()=>{
  const a=force([chorus],exorcist,seraphim,'Intranzia Fraye');
  expect(by(a,'000010861003')[0].units).toEqual([id(exorcist)]);
  expect(by(a,'000010861003')[0].summary).toContain('Infantry Fly sources: Seraphim Squad#1.');
  expect(by(a,'000010861004')[0].units).toEqual([id(seraphim)]);
  expect(by(a,'000010861004')[0].summary).toMatch(/non-Monster, non-Vehicle.*it hit/);
  for(const b of [force([chorus],exorcist),force([chorus],seraphim),force([chorus],exorcist,'Intranzia Fraye')]){
   expect(by(b,'000010861003')).toEqual([]);expect(by(b,'000010861004')).toEqual([]);
  }
  expect(named(a,'Angelic Judgement')[0].summary).toMatch(/visible enemy within 12″.*\+3″ detection range/);
 });
 it('keeps Battle Canticles at the start of either Command phase and requires another formation to receive it',()=>{
  expect(by(force([chorus],exorcist),'000010861002')).toEqual([]);
  const a=force([chorus],exorcist,sisters,'Armiger Warglaive');
  expect(by(a,'000010861002')).toMatchObject([{window:'Command',turn:'either',timing:'start',units:[id(exorcist)]}]);
  expect(by(a,'000010861002')[0].summary).toContain('cannot be the Battle-shocked recipient');
 });
 it('re-rolls only fitted variable attack guns with Symphonic Payload including Overwatch',()=>{
  let a=equip(force([chorus],exorcist),exorcist,'Symphonic Payload');
  expect(SORORITAS_RANDOM_SHOTS.Exorcist).toEqual(['Exorcist conflagration rockets','Exorcist missile launcher']);
  const initial=by(a,'000010860003');expect(initial).toHaveLength(2);
  expect(initial[0].summary).toContain('Exorcist missile launcher');expect(initial[0].summary).not.toContain('Heavy bolter');
  a=gun(a,exorcist,'Exorcist conflagration rockets');
  expect(by(a,'000010860003')[0].summary).toContain('Exorcist conflagration rockets');
  expect(by(a,'000010860003')[0].summary).not.toContain('Exorcist missile launcher');
  expect(by(a,'000010860003')[1]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
 });
 it('applies Holy Quest to whole Celestian units including attached Characters, with legal Bringers reaction only',()=>{
  const a=join(force([sacred,flame],sacresants,canoness,insidiants,sisters,rhino),canoness,sacresants);
  const quest=named(a,'Holy Quest');expect(quest).toHaveLength(2);
  expect(quest[0].summary).toContain('including attacks made by attached models');
  expect(quest[0].units).toEqual([id(sacresants),id(insidiants)]);
  expect(quest.some(r=>r.window==='Movement')).toBe(false);
  expect(named(a,'Holy Quest · reaction shooting').map(r=>r.units)).toEqual([[id(sacresants)],[id(insidiants)]]);
  expect(named({...a,detachments2026:[sacred]},'Holy Quest · reaction shooting')).toEqual([]);
 });
 it('gives Writ of Compunction to the actual whole Sacresant formation and all three Sacred stratagems only to Sacresants',()=>{
  const a=equip(join(force([sacred],sacresants,canoness,insidiants),canoness,sacresants),sacresants,'Writ of Compunction');
  expect(by(a,'000010864002')).toHaveLength(5);
  expect(by(a,'000010864002')[0]).toMatchObject({units:[id(sacresants)]});
  expect(by(a,'000010864002')[0].summary).toContain('including attached models');
  for(const key of ['000010865003','000010865004','000010865002'])expect(by(a,key)[0].units).toEqual([id(sacresants)]);
  expect(by(a,'000010865004')[0].summary).toMatch(/Advance or Fall Back.*shooting or declaring a charge.*Assault until turn end/);
 });
 it('applies Hymns to actual Character formations and keeps Hagiomnifex once per turn at phase start',()=>{
  const a=equip(join(force([orators],canoness,sisters,sisters,'Armiger Warglaive'),canoness),canoness,'Hagiomnifex');
  expect(named(a,'Hymns of Battle')[0].units).toEqual([id(sisters)]);
  expect(named(a,'Hymns of Battle')[0].summary).toContain('including its Bodyguards');
  const hymn=by(a,'000010868002');expect(hymn).toHaveLength(5);
  expect(hymn.every(r=>r.timing==='start'&&r.turn==='either')).toBe(true);
  expect(hymn[0].summary).toMatch(/Once per turn.*\+6″ detection.*automatically passes.*\+1″ Move.*\+1 Strength.*−1 to Wound/);
  expect(hymn[0].summary).toContain('selected hymn lasts until phase end'); // Default duration: current core 01.02.02.
 });
 it('uses the core default phase expiry for the newer triggered effects without an explicit duration',()=>{
  const a=force([chorus,sacred],exorcist,seraphim,sacresants);
  expect(named(a,'Angelic Judgement')[0].summary).toContain('until this Shooting phase ends');
  for(const key of ['000010861003','000010861004','000010865002'])expect(by(a,key)[0].summary).toContain('through phase end');
 });
 it('excludes a real Penitent attached unit from Hagiomnifex even when the selected bearer is not Penitent',()=>{
  const a=join(join(force([orators,penitent],priest,'Dialogus',sisters),priest),'Dialogus');
  expect(sororitasFormations(a).find(f=>f.root.unit===sisters)?.members).toHaveLength(3);
  expect(eligibleSororitasUpgrades(a,'Dialogus',id('Dialogus')).some(u=>u.name==='Hagiomnifex')).toBe(false);
  expect(by(equip(a,'Dialogus','Hagiomnifex'),'000010868002')).toEqual([]);
  expect(eligibleSororitasUpgrades(edit(a,priest,{attachedTo:undefined}),'Dialogus',id('Dialogus')).some(u=>u.name==='Hagiomnifex')).toBe(true);
 });
 it.each([
  [martyrs,'Saintly Example','000008470002','additional D3 Miracle dice'],
  [martyrs,'Through Suffering, Strength','000008470003','bearer model’s own melee weapons'],
  [flame,'Righteous Rage','000009033002','up to three Miracle dice'],
  [faith,'Blade of Saint Ellynor','000009037003','Each time the bearer fights'],
  [champions,'Mark of Devotion','000009831003','instead gain +2 Attacks and +1 Damage'],
 ] as const)('keeps %s / %s on its own bearer model', (det,up,key,body)=>{
  const a=equip(join(force([det],canoness,sisters),canoness),canoness,up);
  expect(by(a,key)[0].units).toEqual([id(canoness)]);expect(by(a,key)[0].summary).toContain(body);
 });
 it('places Miracle-dice economy at the precise command or destruction timings',()=>{
  const a=force([martyrs,flame,faith,penitent],canoness,sisters,priest,'Imagifier');
  expect(by(equip(a,canoness,'Litanies of Faith'),'000009037002')).toMatchObject([{window:'Command',turn:'own',timing:'start'}]);
  expect(by(equip(a,canoness,'Manual of Saint Griselda'),'000009033003')[0].summary).toMatch(/up to two.*sum.*maximum of 6/);
  expect(by(equip(a,canoness,'Chaplet of Sacrifice'),'000008470004')).toMatchObject([{window:'Command',turn:'own',timing:'end'}]);
  expect(by(equip(a,canoness,'Saintly Example'),'000008470002')[0].summary).toMatch(/within 12″.*Imagifier.*re-roll/);
  expect(by(equip(a,canoness,'Psalm of Righteous Judgement'),'000009029002')[0].summary).toMatch(/bearer is on the battlefield.*destroyed by a Penitent formation.*discard one.*showing 6/);
  expect(by(equip(force([penitent],canoness),canoness,'Psalm of Righteous Judgement'),'000009029002')).toEqual([]);
 });
 it('keeps Divine Aspect and Clarion at their own precise Movement and end-Fight windows',()=>{
  const a=force([faith,chorus],canoness,jump);
  expect(by(equip(a,canoness,'Divine Aspect'),'000009037004')).toMatchObject([{window:'Movement',turn:'own',timing:'during'}]);
  expect(by(equip(a,jump,'Clarion of Urgency'),'000010860002')).toMatchObject([{window:'Fight',turn:'opponent',timing:'end'}]);
  expect(by(equip(a,jump,'Clarion of Urgency'),'000010860002')[0].summary).toContain('outside Engagement Range');
 });
 it('keeps Refrain leading-only, protects against enemy Overwatch, and distinguishes Mantle bearer protection',()=>{
  const a=join(equip(force([penitent],priest,sisters),priest,'Refrain of Enduring Faith'),priest);
  expect(by(a,'000009029004').map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Movement','own'],['Fight','either']]);
  expect(by(a,'000009029004').every(r=>r.units?.[0]===id(sisters))).toBe(true);
  expect(by(edit(a,priest,{attachedTo:undefined}),'000009029004')).toEqual([]);
  const b=equip(join(force([martyrs],canoness,sisters),canoness),canoness,'Mantle of Ophelia');
  expect(by(b,'000008470005').every(r=>r.units?.[0]===id(canoness)&&r.summary.includes('Damage to 1'))).toBe(true);
  expect(by(b,'000008470005')[0].summary).toContain('Other models receive no protection');
 });
 it('keeps Iron Surplice Feel No Pain in all phases and the reserve denial on both arrival windows',()=>{
  const a=force([flame,champions],canoness);
  const surplice=by(equip(a,canoness,'Iron Surplice of Saint Istalela'),'000009033005');
  expect(surplice).toHaveLength(5);expect(surplice.every(r=>r.turn==='either'&&r.summary.includes('Feel No Pain 5+'))).toBe(true);
  const denial=by(equip(a,canoness,'Sanctified Amulet'),'000009831005');
  expect(denial.map(r=>[r.window,r.turn,r.timing])).toEqual([['Movement','opponent','during'],['Movement','own','end']]);
  expect(denial[1].summary).toContain('Rapid Ingress');
 });
 it('does not duplicate the Acts of Faith cap or its Triptych saving-throw exception',()=>{
  const a=equip(force([faith],canoness),canoness,'Triptych of the Macharian Crusade');
  expect(eligibleSororitasUpgrades(a,canoness,id(canoness)).find(u=>u.name==='Triptych of the Macharian Crusade')?.points).toBe(20);
  expect(by(a,'000009037005')).toEqual([]);expect(named(a,'Sacred Rites')).toEqual([]);
 });
 it('never gives Epic Heroes, assigned agents, foreign units or a wrong detachment an enhancement',()=>{
  for(const unit of ['Saint Celestine','Inquisitor','Ministorum Priest (Assigned Agent)','Sanctifiers (Assigned Agent)','Armiger Warglaive','Castigator']){
   const a=equip(force(SORORITAS_DETACHMENTS.map(d=>d.name),unit),unit,'Fire and Fury');
   expect(eligibleSororitasUpgrades(a,unit,id(unit))).toEqual([]);expect(by(a,'000009033004')).toEqual([]);
  }
  expect(by(equip(force([faith],canoness),canoness,'Mantle of Ophelia'),'000008470005')).toEqual([]);
  expect(sororitasWeaponCount(force([flame],canoness).instances![0],'Brazier of holy fire')).toBe(0);
 });
});
