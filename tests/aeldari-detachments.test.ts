import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {AELDARI_SHEETS} from '../src/aeldari-data';
import {AELDARI_DETACHMENTS,AELDARI_STRATAGEMS,AELDARI_UPGRADES,AELDARI_TRAITS} from '../src/aeldari-detachments.generated';
import {aeldariDetachmentReminders} from '../src/aeldari-detachments';
import {currentAeldariDetachment,aeldariSelectedDetachments,eligibleAeldariUpgrades,aeldariUpgradeBaseName,aeldariHasUpgrade,aeldariHasDeepStrike,aeldariHasInfiltrators,aeldariScoutRange} from '../src/aeldari-upgrades';

const all=AELDARI_SHEETS.map(s=>s.unit),id=(unit:string,n=1)=>unit+'#'+n;
function force(detachments2026:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 const instances=units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1),models:AELDARI_SHEETS.find(s=>s.unit===unit)?.sizes[0]}));
 return {...newSelection('Aeldari'),detachments2026,units:counts,instances};
}
const edit=(a:ArmySelection,unit:string,changes:Partial<RosterInstance>,n=1):ArmySelection=>({...a,instances:a.instances!.map(s=>s.id===id(unit,n)?{...s,...changes}:s)});
const join=(a:ArmySelection,unit:string,body:string)=>edit(a,unit,{attachedTo:id(body)});
const equip=(a:ArmySelection,unit:string,name:string):ArmySelection=>({...a,upgrades2026:{...a.upgrades2026,[id(unit)]:name}});
const unit=(a:ArmySelection,name:string,n=1)=>a.instances!.find(s=>s.id===id(name,n))!;
const rows=(a:ArmySelection,roster:readonly RosterInstance[]=a.instances!)=>aeldariDetachmentReminders(a,roster);
const by=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>rows(a,roster).filter(r=>r.sourceRuleId===rule);
const summary=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>by(a,rule,roster).map(r=>r.summary).join('\n');
const targets=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>new Set(by(a,rule,roster).flatMap(r=>r.units??[]));
const windows=(a:ArmySelection,rule:string)=>by(a,rule).filter(r=>r.title.includes(' CP')).map(r=>[r.window,r.turn,r.timing]);

describe('Aeldari current detachment source reconciliation',()=>{
 it('matches15 detachments,17 traits,78Stratagems and52upgrades without Legends',()=>{
  expect(AELDARI_DETACHMENTS).toHaveLength(15);expect(AELDARI_TRAITS).toHaveLength(17);expect(AELDARI_STRATAGEMS).toHaveLength(78);expect(AELDARI_UPGRADES).toHaveLength(52);
  expect(AELDARI_DETACHMENTS.find(d=>d.name==='Warhost')).toMatchObject({dp:2,disposition:'Reconnaissance'});
  expect(AELDARI_DETACHMENTS.find(d=>d.name==='Aspect Host')).toMatchObject({dp:3,disposition:'Priority Assets',additionalDispositions:['Reconnaissance']});
  expect(AELDARI_DETACHMENTS.filter(d=>'tag' in d).map(d=>d.name)).toEqual(['Fateful Performance','Twilight Flickers']);
  expect([...AELDARI_STRATAGEMS,...AELDARI_UPGRADES,...AELDARI_TRAITS].every(r=>/^[0-9a-f]{64}$/.test(r.sourceHash))).toBe(true);
  expect(AELDARI_UPGRADES.flatMap(u=>u.units).some(n=>/Bonesinger|Autarch Skyrunner|Corsair Reaver Band/.test(n))).toBe(false);
 });
 it.each(AELDARI_DETACHMENTS)('executes every printed rule for $name with actual eligible sources',d=>{
  const result=rows(force([d.name],...all));
  for(const rule of [...AELDARI_STRATAGEMS,...AELDARI_TRAITS].filter(r=>r.detachment===d.name))expect(result.some(r=>r.sourceRuleId===rule.id),rule.name).toBe(true);
  expect(new Set(result.map(r=>r.id)).size).toBe(result.length);expect(result.every(r=>r.units?.length&&r.source.startsWith('https://'))).toBe(true);
 });
 it.each(AELDARI_UPGRADES)('implements selected $name in $detachment',u=>{
  let a=force([u.detachment],...all);const bearer=u.units[0];
  if(['000009927003','000009927004','000009927005'].includes(u.id))a=join(a,bearer,'Dire Avengers');
  if(u.id==='000009911004')a=join(a,bearer,'Guardian Defenders');
  if(u.id==='000009911005')a=join(a,bearer,'Storm Guardians');
  if(u.id==='000009915005')a=join(a,bearer,'Troupe');
  a=equip(a,bearer,eligibleAeldariUpgrades(a,bearer,id(bearer)).find(x=>x.id===u.id)!.name);
  expect(eligibleAeldariUpgrades(a,bearer,id(bearer)).some(x=>x.id===u.id)).toBe(true);
  expect(by(a,u.id).length).toBeGreaterThan(0);
  expect(new Set(rows(a).map(r=>r.id)).size).toBe(rows(a).length);
 });
 it('normalizes actual detachment names without using foreign or unselected rules',()=>{
  const a=force(["serpent's brood",'Serpent’s Brood'],'Troupe Master','Troupe');
  expect(currentAeldariDetachment(" SERPENT'S BROOD ")).toBe('Serpent’s Brood');expect(aeldariSelectedDetachments(a)).toEqual(['Serpent’s Brood']);
  expect(rows(force([],'Farseer'))).toEqual([]);expect(rows({...a,faction:'Necrons'})).toEqual([]);expect(eligibleAeldariUpgrades(a,'Troupe Master','missing')).toEqual([]);
 });
 it('preserves duplicate Mistweave prices and different attachment requirements',()=>{
  for(const [det,price] of [['Ghosts of the Webway',15],['Fateful Performance',20]] as const){
   let a=equip(force([det],'Shadowseer','Troupe'),'Shadowseer','Mistweave ('+det+')');
   expect(eligibleAeldariUpgrades(a,'Shadowseer',id('Shadowseer')).find(u=>u.baseName==='Mistweave')?.points).toBe(price);
   expect(aeldariHasInfiltrators(a,unit(a,'Shadowseer'))).toBe(det==='Fateful Performance');
   a=join(a,'Shadowseer','Troupe');expect(aeldariHasInfiltrators(a,unit(a,'Troupe'))).toBe(true);
  }
  const both=force(['Ghosts of the Webway','Fateful Performance'],'Shadowseer','Troupe');
  expect(eligibleAeldariUpgrades(both,'Shadowseer',id('Shadowseer')).filter(u=>u.baseName==='Mistweave').map(u=>[u.name,u.points])).toEqual([['Mistweave (Fateful Performance)',20],['Mistweave (Ghosts of the Webway)',15]]);
  expect(aeldariHasInfiltrators(equip(both,'Shadowseer','Mistweave (Fateful Performance)'),unit(both,'Shadowseer'))).toBe(true);
  expect(aeldariHasInfiltrators(equip(both,'Shadowseer','Mistweave (Ghosts of the Webway)'),unit(both,'Shadowseer'))).toBe(false);
  expect(aeldariUpgradeBaseName('Mistweave (Fateful Performance)')).toBe('Mistweave');
 });
 it('allows unique Corsair enhancements on actual units and Epic Heroes, but Pirate Prince only on Yriel',()=>{
  const a=force(['Eldritch Raiders','Corsair Coterie'],'Prince Yriel','Kharseth','Corsair Voidscarred','Corsair Voidreavers','Corsair Skyreavers','Starfangs','Farseer');
  for(const name of ['Prince Yriel','Kharseth','Corsair Voidscarred','Corsair Voidreavers','Corsair Skyreavers','Starfangs'])expect(eligibleAeldariUpgrades(a,name,id(name)).some(u=>u.name==='Alacritous Assault')).toBe(true);
  expect(eligibleAeldariUpgrades(a,'Prince Yriel',id('Prince Yriel')).map(u=>u.name)).toContain('Pirate Prince');
  expect(eligibleAeldariUpgrades(a,'Kharseth',id('Kharseth')).map(u=>u.name)).not.toContain('Pirate Prince');
  expect(eligibleAeldariUpgrades(a,'Starfangs',id('Starfangs')).some(u=>u.name==='Voidstone'||u.name==='Adrenal Infusions')).toBe(false);
  expect(eligibleAeldariUpgrades(a,'Farseer',id('Farseer'))).toEqual([]);
  expect(AELDARI_UPGRADES.find(u=>u.name==='Pirate Prince')?.units).toEqual(['Prince Yriel']);
 });
 it('keeps ordinary non-Epic Character requirements separate from repeatable unit upgrades',()=>{
  const a=force(['Warhost','Path of the Outcast','Twilight Flickers'],'Eldrad Ulthran','Farseer','Rangers','Shroud Runners','Troupe','Solitaire');
  expect(eligibleAeldariUpgrades(a,'Eldrad Ulthran',id('Eldrad Ulthran'))).toEqual([]);expect(eligibleAeldariUpgrades(a,'Solitaire',id('Solitaire'))).toEqual([]);
  expect(eligibleAeldariUpgrades(a,'Rangers',id('Rangers')).map(u=>[u.name,u.repeatable])).toEqual([['Camouflaged Snipers',true],["Assassins' Eye",true]]);
  expect(eligibleAeldariUpgrades(a,'Troupe',id('Troupe'))).toMatchObject([{name:'Shadowfall Masks',repeatable:true}]);
 });
});

describe('Aeldari detachment timing and actual formations',()=>{
 it('distinguishes own shooting, either Fight and opponent-only windows',()=>{
  const a=force(['Aspect Host','Warhost','Seer Council','Windrider Host','Ghosts of the Webway'],'Farseer','Dire Avengers','Troupe Master','Troupe','Windriders','Vypers');
  expect(windows(a,'000009928002')).toEqual([['Shooting','own','during'],['Fight','either','during']]);
  expect(windows(a,'000009900002')).toEqual([['Shooting','opponent','during'],['Fight','either','during']]);
  expect(windows(a,'000009904003')).toEqual([['Shooting','own','end'],['Fight','either','end']]);
  expect(windows(a,'000009916002')).toEqual(['Command','Movement','Shooting','Charge','Fight'].map(p=>[p,'either','during']));
  expect(windows(a,'000009924002')).toEqual([['Command','either','during']]);
 });
 it('uses actual Asuryani including Corsairs while excluding Harlequins from Warhost',()=>{
  const a=force(['Warhost'],'Farseer','Guardian Defenders','Death Jester','Troupe','Corsair Voidreavers');
  expect(targets(a,'000009900005')).toEqual(new Set([id('Farseer'),id('Guardian Defenders'),id('Corsair Voidreavers')]));
 });
 it('keeps Asurmen exclusion attached to the whole Fire and Fade formation',()=>{
  const a=join(force(['Warhost'],'Asurmen','Dire Avengers','Rangers'),'Asurmen','Dire Avengers');
  expect(targets(a,'000009900006')).toEqual(new Set([id('Rangers')]));
  expect(summary(a,'000009900006')).toContain('cannot charge or embark');
 });
 it('requires a surviving Asuryani Psyker for Seer Council target support',()=>{
  const a=force(['Seer Council'],'Farseer','Dire Avengers','Wraithguard','Shadowseer','Troupe');
  expect(targets(a,'000009924005')).toEqual(new Set([id('Farseer'),id('Dire Avengers')]));
  expect(by(a,'000009924005',a.instances!.filter(s=>s.unit!=='Farseer'))).toEqual([]);
  expect(summary(a,'000009924005')).toContain('Fate die showing 4');expect(summary(a,'000009924006')).toContain('Fate die showing 5');
  expect(summary(a,'000009922')).toContain('do not replace attack or saving rolls');
 });
 it('retains destroyed-model and destroyed-unit reactions after casualties',()=>{
  let a=equip(join(force(['Warhost'],'Farseer','Guardian Defenders'),'Farseer','Guardian Defenders'),'Farseer','Phoenix Gem');
  expect(targets(a,'000009899002',[])).toEqual(new Set([id('Farseer')]));expect(summary(a,'000009899002',[])).toContain('original Attached unit');expect(summary(a,'000009899002',[])).toContain('does not reset');
  a=join(force(['Ghosts of the Webway'],'Troupe Master','Troupe'),'Troupe Master','Troupe');
  expect(targets(a,'000009916002',[])).toEqual(new Set([id('Troupe Master')]));
  expect(summary(a,'000009916002',[])).toContain('original Attached unit');
  a=join(force(['Devoted of Ynnead'],'Yvraine','Ynnari Kabalite Warriors'),'Yvraine','Ynnari Kabalite Warriors');
  expect(targets(a,'000009920002',[])).toEqual(new Set([id('Ynnari Kabalite Warriors')]));expect(summary(a,'000009920002',[])).toContain('last model that began the battle');
 });
 it('preserves Vengeful Dead tokens but expires a destroyed Spirit Guides source',()=>{
  const a=force(['Spirit Conclave'],'Spiritseer','Wraithguard','Wraithlord');
  const live=a.instances!.filter(s=>s.unit!=='Spiritseer');
  expect(by(a,'000009906',live).some(r=>r.title.includes('vengeance'))).toBe(true);
  expect(by(a,'000009906',live).some(r=>r.title.includes('Spirit Guides'))).toBe(false);
  expect(summary(a,'000009906',live)).toContain('persist after their Psyker source');
 });
 it('does not make every destroyed Guardian formation permit an unrelated War Walker target',()=>{
  expect(by(force(['Guardian Battlehost'],'War Walkers'),'000009912004')).toEqual([]);
  const a=force(['Guardian Battlehost'],'War Walkers','Guardian Defenders');
  expect(targets(a,'000009912004',a.instances!.filter(s=>s.unit==='War Walkers'))).toEqual(new Set([id('War Walkers')]));
 });
 it('keeps Windrider Vypers eligibility despite the publisher plural and includes first-round ingress',()=>{
  const a=force(['Windrider Host'],'Vypers','Windriders','Skyweavers','Dragon Knights');
  expect(targets(a,'000009904004')).toEqual(new Set([id('Vypers'),id('Windriders'),id('Dragon Knights')]));
  expect(summary(a,'000009902')).toContain('first battle round');expect(summary(a,'000009904005')).toContain('more than 6″ horizontally');expect(summary(a,'000009904005')).toContain('within 8″ horizontally');
 });
 it('separates Fateful retained casualties from Ghosts immediate fight-on-death',()=>{
  const a=force(['Fateful Performance','Ghosts of the Webway'],'Troupe');
  expect(summary(a,'000011045002')).toContain('formation has not been selected to fight');expect(summary(a,'000011045002')).toContain('or the phase ends');
  expect(summary(a,'000009916003')).toContain('after the attacking unit finishes');
 });
 it('requires a legally fitting Transport for Skyborne Sanctuary and its actual6-inch target',()=>{
  let a=force(['Warhost'],'Guardian Defenders','Falcon');expect(by(a,'000009900003')).toEqual([]);
  a=force(['Warhost'],'Guardian Defenders','Wave Serpent');expect(targets(a,'000009900003')).toEqual(new Set([id('Guardian Defenders')]));
  expect(summary(a,'000009900003')).toContain('wholly within 6″');expect(summary(a,'000009900003')).toContain('does not waive');
 });
 it('shows both Titan CP multipliers on eligible Stratagems',()=>{
  const a=force(['Warhost'],'Farseer','Revenant Titan','Phantom Titan');const r=by(a,'000009900005')[0];
  expect(r.title).toContain('1 / 2 / 3 CP');expect(r.summary).toContain('Revenant Titan costs twice');expect(r.summary).toContain('Phantom Titan costs three times');
 });
 it('uses current Ynnari surge and originalunit destruction conditions',()=>{
  const a=force(['Devoted of Ynnead'],'Yvraine','Guardian Defenders','Wraithguard','Ynnari Wyches','Phantom Titan');
  expect(summary(a,'000009918')).toContain('surge move up to D6+1');expect(summary(a,'000009918')).toContain('not Battle-shocked');
  expect(targets(a,'000009920003')).not.toContain(id('Wraithguard'));expect(targets(a,'000009920007')).not.toContain(id('Wraithguard'));
 });
});

describe('Aeldari upgrades, source expiry and model scopes',()=>{
 it('keeps while-leading benefits on a surviving originalLeader but removes them from the abandoned Bodyguard',()=>{
  const a=equip(join(force(['Aspect Host'],'Autarch','Dire Avengers'),'Autarch','Dire Avengers'),'Autarch','Mantle of Wisdom');
  expect(targets(a,'000009927003')).toEqual(new Set([id('Dire Avengers')]));
  expect(targets(a,'000009927003',[unit(a,'Autarch')])).toEqual(new Set([id('Autarch')]));
  expect(by(a,'000009927003',[unit(a,'Dire Avengers')])).toEqual([]);
  expect(by(equip(force(['Aspect Host'],'Autarch'),'Autarch','Mantle of Wisdom'),'000009927003')).toEqual([]);
 });
 it('allows a valid Support to supply the original Guardian while-leading benefit',()=>{
  const a=equip(join(force(['Guardian Battlehost'],'Warlock','Storm Guardians'),'Warlock','Storm Guardians'),'Warlock','Breath of Vaul');
  expect(summary(a,'000009911005')).toContain('flamers');expect(targets(a,'000009911005',[unit(a,'Warlock')])).toEqual(new Set([id('Warlock')]));
 });
 it('applies enhancement movementgrants only to the actual formation containing a living source',()=>{
  const a=equip(join(force(['Serpent’s Brood'],'Troupe Master','Troupe','Troupe'),'Troupe Master','Troupe'),'Troupe Master','Key of Ghosts');
  expect(aeldariScoutRange(a,unit(a,'Troupe'))).toBe(6);expect(aeldariScoutRange(a,unit(a,'Troupe',2))).toBe(0);
  expect(aeldariScoutRange(a,unit(a,'Troupe'),a.instances!.filter(s=>s.unit!=='Troupe Master'))).toBe(0);
  const b=equip(force(['Corsair Coterie'],'Corsair Voidreavers','Corsair Voidscarred'),'Corsair Voidreavers','Webway Pathstone');
  expect(aeldariHasDeepStrike(b,unit(b,'Corsair Voidreavers'))).toBe(true);expect(aeldariHasDeepStrike(b,unit(b,'Corsair Voidscarred'))).toBe(false);
  const c=join({...b,instances:[...b.instances!,{id:id('Prince Yriel'),unit:'Prince Yriel',models:1}]},'Prince Yriel','Corsair Voidreavers');
  expect(aeldariHasDeepStrike(c,unit(c,'Prince Yriel'))).toBe(true);expect(aeldariHasDeepStrike(c,unit(c,'Prince Yriel'),[unit(c,'Prince Yriel')])).toBe(false);
 });
 it('does not turn optional Ethereal Pathway choices into army-wide Infiltrators',()=>{
  const a=equip(force(['Guardian Battlehost'],'Farseer','Guardian Defenders','Storm Guardians'),'Farseer','Ethereal Pathway');
  expect(aeldariHasInfiltrators(a,unit(a,'Guardian Defenders'))).toBe(false);expect(summary(a,'000009911003')).toContain('up to two');
 });
 it('keeps bearer Psychic weapon bonuses distinct from unit-wide Corsair weapons',()=>{
  const a=equip(join(force(['Seer Council'],'Farseer','Guardian Defenders'),'Farseer','Guardian Defenders'),'Farseer','Stone of Eldritch Fury');
  expect(targets(a,'000009923004')).toEqual(new Set([id('Farseer')]));expect(summary(a,'000009923004')).toContain('does not extend psychic abilities');
  const b=equip(join(force(['Eldritch Raiders'],'Prince Yriel','Corsair Voidreavers'),'Prince Yriel','Corsair Voidreavers'),'Corsair Voidreavers','Exotic Munitions');
  expect(targets(b,'000010699004')).toEqual(new Set([id('Corsair Voidreavers')]));expect(summary(b,'000010699004')).toContain('every model');
 });
 it('keeps Archraider and Torc to their actual surviving model and current CP FAQ',()=>{
  const a=equip(force(['Seer Council'],'Farseer'),'Farseer','Torc of Morai-Heg');
  expect(summary(a,'000009923005')).toContain('no CP is spent');expect(summary(a,'000009923005')).toContain('counts as used');expect(by(a,'000009923005',[])).toEqual([]);
  const b=equip(force(['Corsair Coterie'],'Kharseth'),'Kharseth','Archraider');expect(summary(b,'000010704004')).toContain('choose one actual Character');
 });
 it('does not invent a criticalhit during snapshooting or refund a free manoeuvre',()=>{
  const a=equip(force(['Ghosts of the Webway'],'Death Jester'),'Death Jester','Murder’s Jest');expect(summary(a,'000009915004')).toContain('cannot turn snap shots into Critical Hits');
  expect(by(a,'000009915004').map(r=>r.window)).toEqual(['Shooting','Fight']);
  const b=equip(force(['Eldritch Raiders'],'Prince Yriel'),'Prince Yriel','Pirate Prince');expect(summary(b,'000010699002')).toContain('free manoeuvre is not a token-spend trigger');
  expect(aeldariHasUpgrade(b,unit(b,'Prince Yriel'),'Pirate Prince','Corsair Coterie')).toBe(false);
 });
 it('retains a previously selected timed Spiritseer effect after its source dies without granting new targets',()=>{
  const a=equip(force(['Spirit Conclave'],'Spiritseer','Wraithguard'),'Spiritseer','Stave of Kurnous');
  const remaining=by(a,'000009907003',[unit(a,'Wraithguard')]);
  expect(remaining.some(r=>r.window==='Command')).toBe(false);expect(remaining.some(r=>r.window==='Fight')).toBe(true);
  expect(remaining.every(r=>r.summary.includes('chosen by Spiritseer#1'))).toBe(true);
  expect(remaining.every(r=>r.summary.includes('next Command phase starts'))).toBe(true);
 });
});
