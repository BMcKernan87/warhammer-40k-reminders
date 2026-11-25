import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {DRUKHARI_SHEETS,DRUKHARI_NATIVE_SHEETS,DRUKHARI_ALLIED_SHEETS} from '../src/drukhari-data';
import {DRUKHARI_DETACHMENTS,DRUKHARI_STRATAGEMS,DRUKHARI_UPGRADES,DRUKHARI_TRAITS} from '../src/drukhari-detachments.generated';
import {currentDrukhariDetachment,drukhariSelectedDetachments,eligibleDrukhariUpgrades,drukhariHasUpgrade,drukhariHasDeepStrike,drukhariHasInfiltrators,drukhariScoutRange} from '../src/drukhari-upgrades';
import {drukhariDetachmentReminders} from '../src/drukhari-detachments';
import {drukhariKeywords} from '../src/drukhari-keywords';

const all=DRUKHARI_SHEETS.map(s=>s.unit),id=(unit:string,n=1)=>unit+'#'+n;
const realspace='Realspace Raiders',sky='Skysplinter Assault',spite='Spectacle of Spite',coven='Covenite Coterie',cartel='Kabalite Cartel',reaper='Reaper’s Wager',exhibition='Exhibition of Slaughter',agonysts='Kabalite Agonysts',tools='Tools of Torment';
function force(detachments2026:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 const instances=units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1),models:DRUKHARI_SHEETS.find(s=>s.unit===unit)?.sizes[0]}));
 return {...newSelection('Drukhari'),detachments2026,units:counts,instances,warlordId:instances.find(s=>s.unit==='Archon')?.id};
}
const edit=(a:ArmySelection,unit:string,changes:Partial<RosterInstance>,n=1):ArmySelection=>({...a,instances:a.instances!.map(s=>s.id===id(unit,n)?{...s,...changes}:s)});
const join=(a:ArmySelection,unit:string,body:string)=>edit(a,unit,{attachedTo:id(body)});
const equip=(a:ArmySelection,unit:string,name:string):ArmySelection=>({...a,upgrades2026:{...a.upgrades2026,[id(unit)]:name}});
const unit=(a:ArmySelection,name:string,n=1)=>a.instances!.find(s=>s.id===id(name,n))!;
const rows=(a:ArmySelection,roster:readonly RosterInstance[]=a.instances!)=>drukhariDetachmentReminders(a,roster);
const by=(a:ArmySelection,r:string,roster?:readonly RosterInstance[])=>rows(a,roster).filter(x=>x.sourceRuleId===r);
const summary=(a:ArmySelection,r:string,roster?:readonly RosterInstance[])=>by(a,r,roster).map(x=>x.summary).join('\n');
const targets=(a:ArmySelection,r:string,roster?:readonly RosterInstance[])=>new Set(by(a,r,roster).flatMap(x=>x.units??[]));
const windows=(a:ArmySelection,r:string)=>by(a,r).filter(x=>x.title.includes(' CP')).map(x=>[x.window,x.turn,x.timing]);

describe('Drukhari current matched-play detachment sources',()=>{
 it('reconciles all9 detachments,45 Stratagems,30 upgrades and9 traits with current MFM dispositions',()=>{
  expect(DRUKHARI_DETACHMENTS).toHaveLength(9);expect(DRUKHARI_STRATAGEMS).toHaveLength(45);expect(DRUKHARI_UPGRADES).toHaveLength(30);expect(DRUKHARI_TRAITS).toHaveLength(9);
  expect(DRUKHARI_DETACHMENTS.find(d=>d.name===coven)?.disposition).toBe('Take and Hold');
  expect(DRUKHARI_DETACHMENTS.find(d=>d.name===exhibition)?.disposition).toBe('Reconnaissance');
  expect(DRUKHARI_DETACHMENTS.find(d=>d.name===agonysts)?.disposition).toBe('Disruption');
  expect(DRUKHARI_DETACHMENTS.find(d=>d.name===reaper)).toMatchObject({dp:3,disposition:'Priority Assets',additionalDispositions:['Purge the Foe']});
  expect(DRUKHARI_DETACHMENTS.filter(d=>'tag' in d).map(d=>[d.name,'tag' in d&&d.tag])).toEqual([[spite,'Wych Cult'],[coven,'Covens'],[cartel,'Kabal'],[exhibition,'Wych Cult'],[agonysts,'Kabal'],[tools,'Covens']]);
  expect(DRUKHARI_UPGRADES.filter(u=>u.repeatable).map(u=>u.name)).toEqual(['Elixir of the Corpse Courts']);
  expect([...DRUKHARI_STRATAGEMS,...DRUKHARI_UPGRADES,...DRUKHARI_TRAITS].every(r=>/^[0-9a-f]{64}$/.test(r.sourceHash))).toBe(true);
 });
 it('corrects synthetic ally eligibility and the erroneous Postmortality CSV links against printed targets',()=>{
  const native=new Set(DRUKHARI_NATIVE_SHEETS.map(s=>s.unit)),harlequin=new Set(DRUKHARI_ALLIED_SHEETS.filter(s=>s.keywords?.includes('HARLEQUINS')).map(s=>s.unit));
  expect(DRUKHARI_STRATAGEMS.find(s=>s.name==='POSTMORTALITY')?.units).toEqual(['Haemonculus']);
  for(const s of DRUKHARI_STRATAGEMS)expect(s.units.every(u=>native.has(u)||(s.detachment===reaper&&harlequin.has(u))),s.name).toBe(true);
 });
 it.each(DRUKHARI_DETACHMENTS)('executes every printed rule for $name with eligible units',d=>{
  const a=force([d.name],...all),result=rows(a);
  for(const rule of [...DRUKHARI_STRATAGEMS,...DRUKHARI_TRAITS].filter(r=>r.detachment===d.name))expect(result.some(r=>r.sourceRuleId===rule.id),rule.name).toBe(true);
  expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
  expect(result.every(r=>r.units?.length&&r.source.startsWith('https://'))).toBe(true);
 });
 it.each(DRUKHARI_UPGRADES)('implements selected $name in $detachment',u=>{
  let a=force([u.detachment],...all);const bearer=u.units[0];
  if(u.id==='000010588005')a=join(a,'Archon','Kabalite Warriors');
  a=equip(a,bearer,u.name);
  expect(eligibleDrukhariUpgrades(a,bearer,id(bearer)).some(x=>x.id===u.id)).toBe(true);
  expect(by(a,u.id).length).toBeGreaterThan(0);
  expect(new Set(rows(a).map(r=>r.id)).size).toBe(rows(a).length);
 });
 it('normalizes apostrophes and case without accepting unselected or foreign detachments',()=>{
  const a=force(["reaper's wager",reaper],'Archon');
  expect(currentDrukhariDetachment(" reaper's wager ")).toBe(reaper);expect(drukhariSelectedDetachments(a)).toEqual([reaper]);
  expect(rows(force([],'Archon'))).toEqual([]);expect(rows({...a,faction:'Necrons'})).toEqual([]);
  expect(eligibleDrukhariUpgrades(a,'Archon','missing')).toEqual([]);
 });
 it('selects duplicate enhancement names by the actual detachment and source price',()=>{
  for(const [det,price,rule] of [[cartel,20,'000010588005'],[agonysts,15,'000011036002']] as const){
   const a=equip(force([det],'Archon'),'Archon','Towering Arrogance');
   expect(eligibleDrukhariUpgrades(a,'Archon',id('Archon')).filter(u=>u.name==='Towering Arrogance')).toMatchObject([{points:price,id:rule}]);
  }
  for(const [det,price] of [[spite,25],[exhibition,20]] as const)expect(eligibleDrukhariUpgrades(force([det],'Succubus'),'Succubus',id('Succubus')).find(u=>u.name==='Periapt of Torments')?.points).toBe(price);
 });
 it('limits ordinary enhancements to actual eligible non-Epic characters and allows the unit upgrade',()=>{
  const a=force([realspace,tools],'Lady Malys','Lelith Hesperax','Drazhar','Kabalite Warriors','Cronos','Talos','Archon','Death Jester','Prince Yriel');
  for(const name of ['Lady Malys','Lelith Hesperax','Drazhar','Kabalite Warriors','Death Jester','Prince Yriel'])expect(eligibleDrukhariUpgrades(a,name,id(name))).toEqual([]);
  for(const name of ['Cronos','Talos'])expect(eligibleDrukhariUpgrades(a,name,id(name))).toMatchObject([{name:'Elixir of the Corpse Courts',repeatable:true}]);
  expect(eligibleDrukhariUpgrades(a,'Archon',id('Archon')).some(u=>u.name==='Dark Vitality')).toBe(true);
 });
 it('allows only expressly permitted Harlequin enhancements under Reaper’s Wager',()=>{
  const a=force([reaper],'Troupe Master','Death Jester','Shadowseer','Solitaire','Prince Yriel','Kharseth','Archon');
  for(const name of ['Troupe Master','Death Jester','Shadowseer'])expect(eligibleDrukhariUpgrades(a,name,id(name)).map(u=>u.name).sort()).toEqual(['Archraider','Reaper’s Cowl','Webway Walker'].sort());
  for(const name of ['Solitaire','Prince Yriel','Kharseth'])expect(eligibleDrukhariUpgrades(a,name,id(name))).toEqual([]);
  expect(eligibleDrukhariUpgrades(a,'Archon',id('Archon')).map(u=>u.name)).not.toContain('Reaper’s Cowl');
 });
});

describe('Drukhari detachment timing and formation interactions',()=>{
 it('uses both Movement and Charge windows and distinguishes opponent shooting from either Fight',()=>{
  const a=force([realspace,spite,reaper,coven],'Archon','Succubus','Wyches','Haemonculus','Wracks');
  expect(windows(a,'000010581005')).toEqual([['Movement','own','start'],['Charge','own','start']]);
  expect(windows(a,'000009782006')).toEqual([['Movement','own','during'],['Charge','own','during']]);
  expect(windows(a,'000010575004')).toEqual([['Shooting','own','start'],['Fight','either','start']]);
  expect(windows(a,'000010585006')).toEqual([['Shooting','opponent','during'],['Fight','either','during']]);
  expect(windows(a,'000010585002')).toEqual(['Command','Movement','Shooting','Charge','Fight'].map(p=>[p,'either','during']));
 });
 it('counts each Alliance of Agony pairing once and recognizes Lady Malys and Lelith model keywords',()=>{
  let a=force([realspace],'Lady Malys','Kabalite Warriors','Lelith Hesperax','Wyches','Haemonculus','Wracks','Haemonculus','Wracks');
  expect(summary(a,'000010572')).toContain('gain 6 Pain tokens');expect(summary(a,'000010572')).toContain('do not need to be attached');
  a=force([realspace],'Lady Malys','Kabalite Warriors','Lelith Hesperax');expect(summary(a,'000010572')).toContain('gain 2 Pain tokens');
  expect(by(force([realspace],'Archon','Succubus','Haemonculus'),'000010572')).toEqual([]);
 });
 it('does not grant native rules to Corsair or Harlequin allies',()=>{
  const a=force([realspace,cartel,coven,sky,agonysts],'Archon','Kabalite Warriors','Raider','Troupe','Death Jester','Corsair Voidreavers');
  const foreign=new Set([id('Troupe'),id('Death Jester'),id('Corsair Voidreavers')]);
  expect(rows(a).flatMap(r=>r.units??[]).some(u=>foreign.has(u))).toBe(false);
 });
 it('keeps Kabalite model benefits distinct from whole-unit target eligibility',()=>{
  const a=join(force([cartel,agonysts],'Archon','Incubi','Kabalite Warriors','Wyches','Raider'),'Archon','Incubi');
  expect(targets(a,'000010587')).toContain(id('Incubi'));expect(targets(a,'000011037002')).toContain(id('Incubi'));
  expect(targets(a,'000011037004')).toEqual(new Set([id('Kabalite Warriors')]));
  expect(targets(a,'000011035')).not.toContain(id('Wyches'));expect(summary(a,'000010587')).toContain('only Kabal or Blades for Hire models');
 });
 it('requires the actual Archon Warlord for a new Contract, including Lady Malys',()=>{
  let a=force([cartel],'Archon','Lady Malys','Succubus');
  expect(targets(a,'000010589005')).toEqual(new Set([id('Archon')]));
  a={...a,warlordId:id('Lady Malys')};expect(targets(a,'000010589005')).toEqual(new Set([id('Lady Malys')]));
  a={...a,warlordId:id('Succubus')};expect(by(a,'000010589005')).toEqual([]);
  a={...a,warlordId:id('Archon')};expect(by(a,'000010589005',a.instances!.filter(s=>s.unit!=='Archon'))).toEqual([]);
 });
 it('uses the automatically resolved sole native Warlord for Enemies Without Number',()=>{
  for(const name of ['Archon','Lady Malys']){
   const a={...force([cartel],name,'Kabalite Warriors','Death Jester'),warlordId:undefined};
   expect(targets(a,'000010589005')).toEqual(new Set([id(name)]));
  }
  const unresolved={...force([cartel],'Archon','Succubus'),warlordId:undefined};
  expect(by(unresolved,'000010589005')).toEqual([]);
 });
 it('does not confuse Contract target-only Precision with broader conditional critical-hit bonuses',()=>{
  const a=force([cartel],'Archon','Kabalite Warriors');
  expect(summary(a,'000010587')).toContain('latter two benefits are not restricted to the Contract unit');
  expect(summary(a,'000010589004')).toContain('against your Contract unit');
  expect(summary(a,'000010589003')).toContain('at most 3 Pain tokens');
 });
 it('requires a distinct non-Vehicle sacrifice formation for Double-cross',()=>{
  expect(by(force([cartel],'Archon'),'000010589002')).toEqual([]);
  expect(by(force([cartel],'Archon','Raider'),'000010589002')).toEqual([]);
  const a=force([cartel],'Archon','Wracks','Corsair Voidreavers');expect(targets(a,'000010589002')).toEqual(new Set([id('Archon')]));
  expect(summary(a,'000010589002')).toContain(id('Wracks'));expect(summary(a,'000010589002')).not.toContain(id('Corsair Voidreavers'));
 });
 it('returns Postmortality’s actual Haemonculus as an independent one-model unit',()=>{
  const a=join(force([coven],'Haemonculus','Wracks','Succubus','Wyches'),'Haemonculus','Wracks');
  expect(targets(a,'000010585002')).toEqual(new Set([id('Haemonculus')]));
  expect(summary(a,'000010585002')).toContain('separate unit at Starting Strength 1');expect(summary(a,'000010585002')).toContain('once per battle');
  expect(targets(a,'000010585002',a.instances!.filter(s=>s.unit!=='Haemonculus'))).toEqual(new Set([id('Haemonculus')]));
 });
 it('keeps poison ticking after its source dies and uses both Command phases',()=>{
  const a=force([coven],'Haemonculus','Wracks');
  const r=by(a,'000010585004',[]);expect(r).toHaveLength(1);expect(r[0]).toMatchObject({window:'Command',turn:'either',timing:'start'});
  expect(r[0].summary).toContain('even if the original');
 });
 it('uses the publisher’s current surge and Connoisseurs token refund',()=>{
  const a=force([coven],'Haemonculus','Wracks','Archon');
  expect(summary(a,'000010585007')).toContain('surge up to D6');expect(summary(a,'000010585007')).toContain('No casualty or lost wound is required');
  expect(summary(a,'000010585007')).toContain('not Battle-shocked');expect(summary(a,'000010585007')).toContain('cannot move again this phase');
  expect(targets(a,'000010585006')).toContain(id('Archon'));expect(summary(a,'000010585006')).toContain('only if your formation remains on the battlefield and is Haemonculus Covens');
 });
 it('implements the current reactive charge and the two different fight-on-death rules',()=>{
  const a=force([spite,reaper],'Succubus','Wyches','Troupe');
  expect(windows(a,'000010581006')).toEqual([['Movement','opponent','during']]);
  expect(summary(a,'000010581006')).toContain('within 6″');expect(summary(a,'000010581006')).toContain('only enemy units that Fell Back');
  expect(summary(a,'000010581002')).toContain('No die roll is required');
  expect(summary(a,'000009782003')).toContain('4+, adding 1 if the formation is losing');
 });
 it('keeps all selected drugs limited to actual Wych Cult models and retains opponent defensive effects',()=>{
  const a=force([spite],'Succubus','Wyches','Reavers','Archon','Kabalite Warriors');
  expect(targets(a,'000010579')).toEqual(new Set([id('Succubus'),id('Wyches'),id('Reavers')]));
  expect(summary(a,'000010579')).toContain('duplicate');
  expect(by(a,'000010579').some(r=>r.window==='Shooting'&&r.turn==='either')).toBe(true);
 });
 it('applies Reaper’s Wager to native and Harlequins models but not Corsairs',()=>{
  const a=force([reaper],'Archon','Troupe','Corsair Voidreavers','Razorwing Jetfighter');
  expect(targets(a,'000009780')).toEqual(new Set([id('Archon'),id('Troupe'),id('Razorwing Jetfighter')]));
  expect(summary(a,'000009780')).toContain('up to 1000 points');expect(summary(a,'000009780')).toContain('ignores all Hit re-rolls');
  const snap=by(a,'000009780').find(r=>r.title.includes('snap'));expect(snap?.units).toContain(id('Razorwing Jetfighter'));
  expect(by(a,'000009782002').flatMap(r=>r.units??[])).not.toContain(id('Corsair Voidreavers'));
 });
 it('does not invent a Critical Hit during snap shooting',()=>{
  const a=force([cartel,agonysts,reaper],'Archon','Kabalite Warriors');
  const wager=by(a,'000009780').find(r=>r.title.includes('snap'))!;expect(wager.summary).toContain('re-roll Wound rolls of 1 only');
  const agenda=by(a,'000010587').find(r=>r.title.includes('snap'))!;expect(agenda.summary).toContain('only Trophy Hunters can apply');
  expect(by(a,'000011035').some(r=>r.window==='Movement')).toBe(false);
 });
});

describe('Drukhari transports and scoped enhancement effects',()=>{
 it('includes Venom split-half passengers without pretending the entire eleven-model formation embarks',()=>{
  const a=join(equip(force([sky],'Archon','Kabalite Warriors','Venom'),'Archon','Nightmare Shroud'),'Archon','Kabalite Warriors');
  expect(targets(a,'000010577004')).toContain(id('Kabalite Warriors'));expect(summary(a,'000008714')).toContain('actual disembarking models');
  expect(targets(a,'000010577002')).toContain(id('Venom'));expect(summary(a,'000010577002')).toContain('physical passengers');
  expect(summary(a,'000010576005')).toContain('split half containing the bearer');
 });
 it('filters real cargo restrictions and preserves Wyches’ embarkation exception',()=>{
  const a=force([sky],'Wyches','Scourges with Heavy Weapons','Venom');
  expect(targets(a,'000010577004')).toContain(id('Wyches'));expect(targets(a,'000010577004')).not.toContain(id('Scourges with Heavy Weapons'));
  const noCarrier=force([sky],'Wyches','Incubi');expect(targets(noCarrier,'000010577003')).toEqual(new Set([id('Wyches')]));
  expect(summary(a,'000010577003')).toContain('in a turn it disembarked from that same Transport');
  expect(summary(a,'000010577006')).toContain('within 8″');
 });
 it('prints actual Archraider carrier candidates with an explicit starting-passenger condition',()=>{
  let a=equip(join(force([reaper],'Archon','Kabalite Warriors','Venom','Raider','Starweaver'),'Archon','Kabalite Warriors'),'Archon','Archraider');
  expect(summary(a,'000009781002')).toContain('actually starts embarked');expect(summary(a,'000009781002')).toContain(id('Venom'));expect(summary(a,'000009781002')).toContain(id('Raider'));expect(summary(a,'000009781002')).not.toContain(id('Starweaver'));
  expect(drukhariScoutRange(a,unit(a,'Raider'))).toBe(0);
  a=equip(force([reaper],'Death Jester','Starweaver','Raider'),'Death Jester','Archraider');expect(summary(a,'000009781002')).toContain(id('Starweaver'));expect(summary(a,'000009781002')).not.toContain(id('Raider'));
 });
 it('shares Webway Walker through the actual surviving formation and removes it after bearer death',()=>{
  const a=equip(join(force([reaper],'Archon','Kabalite Warriors','Kabalite Warriors'),'Archon','Kabalite Warriors'),'Archon','Webway Walker');
  expect(drukhariHasDeepStrike(a,unit(a,'Kabalite Warriors'))).toBe(true);expect(drukhariHasDeepStrike(a,unit(a,'Kabalite Warriors',2))).toBe(false);
  const live=a.instances!.filter(s=>s.unit!=='Archon');expect(drukhariHasDeepStrike(a,unit(a,'Kabalite Warriors'),live)).toBe(false);
  expect(summary(a,'000009781003')).toContain('does not itself permit charging after ingress');
 });
 it('keeps Webway Awl’s free Rapid Ingress in the correct window',()=>{
  const a=equip(join(force([cartel],'Archon','Hand of the Archon'),'Archon','Hand of the Archon'),'Archon','Webway Awl');
  expect(drukhariHasDeepStrike(a,unit(a,'Hand of the Archon'))).toBe(true);
  expect(by(a,'000010588003').find(r=>r.window==='Movement')).toMatchObject({turn:'opponent',timing:'end'});
  expect(summary(a,'000010588003')).toContain('does not waive an arrival restriction');
 });
 it('limits Reaper’s Cowl to the actual Harlequin bearer formation and current Stealth cover',()=>{
  const a=equip(join(force([reaper],'Troupe Master','Troupe','Troupe'),'Troupe Master','Troupe'),'Troupe Master','Reaper’s Cowl');
  expect(drukhariHasInfiltrators(a,unit(a,'Troupe'))).toBe(true);expect(drukhariHasInfiltrators(a,unit(a,'Troupe',2))).toBe(false);
  expect(drukhariHasInfiltrators(a,unit(a,'Troupe'),a.instances!.filter(s=>s.unit!=='Troupe Master'))).toBe(false);
  expect(summary(a,'000009781004')).toContain('more than 8″ horizontally from the opponent’s deployment zone and all enemy units');
  expect(summary(a,'000009781004')).not.toContain('more than 9″');
  expect(summary(a,'000009781004')).toContain('Benefit of Cover');expect(summary(a,'000009781004')).toContain('does not subtract 1');
 });
 it('does not turn Informant Network’s optional choice into blanket Infiltrators',()=>{
  const a=equip(force([cartel],'Archon','Kabalite Warriors','Hand of the Archon','Incubi'),'Archon','Informant Network');
  expect(summary(a,'000010588004')).toContain('choose up to three');expect(summary(a,'000010588004')).toContain(id('Kabalite Warriors'));expect(summary(a,'000010588004')).not.toContain(id('Incubi'));
  expect(drukhariHasInfiltrators(a,unit(a,'Kabalite Warriors'))).toBe(false);
 });
 it('keeps Dark Vitality free Pain activation distinct from optional token-spend effects',()=>{
  const a=equip(join(force([realspace],'Haemonculus','Wracks'),'Haemonculus','Wracks'),'Haemonculus','Dark Vitality');
  expect(drukhariHasUpgrade(a,unit(a,'Haemonculus'),'Dark Vitality')).toBe(true);expect(drukhariHasUpgrade(a,unit(a,'Wracks'),'Dark Vitality')).toBe(false);
  expect(summary(a,'000010574002')).toContain('printed activation timing');expect(summary(a,'000010574002')).toContain('Optional token costs');
  expect(by(a,'000010574002',a.instances!.filter(s=>s.unit!=='Haemonculus'))).toEqual([]);
  const b=equip(force([sky],'Archon','Raider'),'Archon','Sadistic Fulcrum');expect(summary(b,'000010576003')).toContain('actually spend 1 Pain token');
 });
 it('distinguishes the two Periapt rules and Towering Arrogance’s leading requirement',()=>{
  const x=equip(force([exhibition],'Succubus'),'Succubus','Periapt of Torments');expect(summary(x,'000011032002')).toContain('all snap shooting');
  const y=equip(force([spite],'Succubus'),'Succubus','Periapt of Torments');expect(summary(y,'000010580004')).toContain('does not prohibit every other kind');
  let a=equip(force([cartel],'Archon','Kabalite Warriors'),'Archon','Towering Arrogance');expect(by(a,'000010588005')).toEqual([]);a=join(a,'Archon','Kabalite Warriors');expect(by(a,'000010588005').length).toBe(1);
  expect(summary(a,'000010588005',a.instances!.filter(s=>s.unit!=='Kabalite Warriors'))).toContain('surviving Archon keeps its own while-leading benefit');
  expect(by(a,'000010588005',a.instances!.filter(s=>s.unit!=='Archon'))).toEqual([]);
  const b=equip(force([agonysts],'Archon'),'Archon','Towering Arrogance');expect(summary(b,'000011036002')).toContain('even while the Archon is unattached');
 });
 it('scopes weapon improvements to the actual bearer and preserves Anti during snap shooting',()=>{
  const a=equip(join(force([coven],'Haemonculus','Wracks'),'Haemonculus','Wracks'),'Haemonculus','Master Nemesine');
  expect(targets(a,'000010584003')).toEqual(new Set([id('Haemonculus')]));expect(summary(a,'000010584003')).toContain('not Critical Wounds');
  const b=equip(join(force([realspace],'Succubus','Wyches'),'Succubus','Wyches'),'Succubus','Eye of Spite');expect(targets(b,'000010574004')).toEqual(new Set([id('Succubus')]));expect(summary(b,'000010574004')).toContain('by 2 instead');
  const c=equip(join(force([spite],'Succubus','Wyches'),'Succubus','Wyches'),'Succubus','Morghenna’s Curse');expect(targets(c,'000010580005')).toEqual(new Set([id('Succubus')]));
 });
 it('keeps Master Artisan wounds personal, toughness shared and source expiry automatic',()=>{
  const a=equip(join(force([coven],'Haemonculus','Wracks'),'Haemonculus','Wracks'),'Haemonculus','Master Artisan');
  expect(by(a,'000010584004').find(r=>r.window==='Pre-battle')?.units).toEqual([id('Haemonculus')]);
  expect(by(a,'000010584004').find(r=>r.window==='Shooting')?.units).toEqual([id('Wracks')]);
  expect(by(a,'000010584004',a.instances!.filter(s=>s.unit!=='Haemonculus'))).toEqual([]);
 });
 it('keeps Phantasmal Smoke source-dependent and never stacks cover',()=>{
  const a=equip(force([sky],'Archon','Raider'),'Archon','Phantasmal Smoke');
  expect(summary(a,'000010576002')).toContain('cover benefits do not stack');expect(summary(a,'000010576002')).toContain(id('Raider'));
  expect(by(a,'000010576002',a.instances!.filter(s=>s.unit!=='Raider'))).toEqual([]);
 });
 it('applies Master Regenesist only to returned Bodyguards and records full Haemonculus aura scope',()=>{
  const a=equip(join(force([coven],'Haemonculus','Wracks'),'Haemonculus','Wracks'),'Haemonculus','Master Regenesist');
  expect(summary(a,'000010584002')).toContain('D3+3');expect(summary(a,'000010584002')).toContain('does not return a destroyed Character');
  const b=equip(force([coven],'Haemonculus','Wracks'),'Haemonculus','Master Repugnomancer');expect(summary(b,'000010584005')).toContain('within 9″');expect(summary(b,'000010584005')).toContain('measure from this actual bearer');
 });
});
