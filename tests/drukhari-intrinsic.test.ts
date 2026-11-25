// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {DRUKHARI_SHEETS,DRUKHARI_NATIVE_SHEETS} from '../src/drukhari-data';
import {DRUKHARI_CARDS,drukhariLoadout,drukhariModelLoadouts,drukhariWeaponCount,validDrukhariGear} from '../src/drukhari-loadouts';
import {DRUKHARI_INTRINSIC_INVENTORY} from '../src/drukhari-intrinsic.generated';
import {drukhariIntrinsicReminders,DRUKHARI_DELEGATED_INTRINSIC} from '../src/drukhari-intrinsic';
import {drukhariDatasheetCoreReminders,drukhariFormationHasDeepStrike,drukhariFormationScoutRange} from '../src/drukhari-datasheet-core';
import {drukhariWeaponReminders,drukhariFullWeaponProfiles} from '../src/drukhari-weapons';
import {drukhariFormations} from '../src/drukhari-formations';
import type {RosterInstance} from '../src/roster-instances';

const id=(name:string)=>name+'#1';
const sheet=(unit:string)=>DRUKHARI_SHEETS.find(s=>s.unit===unit)!;
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:sheet(unit)?.sizes[0]??1,keepUnattached:true});}
 return {...newSelection('Drukhari'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body),keepUnattached:false}:s)});
const size=(a:ArmySelection,unit:string,models:number)=>({...a,instances:a.instances!.map(s=>s.id===id(unit)?{...s,models}:s)});
const upgrade=(a:ArmySelection,unit:string,name:string)=>({...a,upgrades2026:{...a.upgrades2026,[id(unit)]:name}});
const rule=(a:ArmySelection,title:string,roster?:RosterInstance[])=>drukhariIntrinsicReminders(a,roster).filter(r=>r.title===title);
const profile=(a:ArmySelection,title:string,roster?:RosterInstance[])=>drukhariDatasheetCoreReminders(a,roster).filter(r=>r.title.endsWith(' · '+title));
const text=(a:ArmySelection,title:string,roster?:RosterInstance[])=>rule(a,title,roster).map(r=>r.summary).join(' ');
function equip(a:ArmySelection,unit:string,item:string,which=0){
 const squad=a.instances!.find(s=>s.id===id(unit))!,loadout=drukhariLoadout(unit,squad.models)!;
 const choices=loadout.slots.flatMap(field=>field.choices.filter(c=>c.items.includes(item)||c.name===item).map(choice=>({field,choice})))
  .filter(({field,choice})=>validDrukhariGear(unit,{...squad.knightGear,[field.name]:choice.name},squad.models));
 const picked=choices[which];if(!picked)throw Error('No legal choice '+unit+' / '+item+' / '+which);
 const knightGear={...squad.knightGear,[picked.field.name]:picked.choice.name};
 return {...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear}:s)};
}
function fixture(unit:string){
 const body=sheet(unit).bodyguards?.[0];
 let a=army([...new Set([unit,...body?[body]:[],'Kabalite Warriors','Wyches','Wracks','Raider','Venom','Troupe','Starweaver'])]);
 if(body)a=join(a,unit,body);
 if(unit==='Corsair Voidscarred')a=size(a,unit,10);
 return a;
}
const without=(a:ArmySelection,...units:string[])=>a.instances!.filter(s=>!units.includes(s.unit));

describe('Drukhari named ability coverage from current sources',()=>{
 it('audits exactly 102 named entries on all 37 matched-play native and allied sheets',()=>{
  expect(Object.keys(DRUKHARI_INTRINSIC_INVENTORY).sort()).toEqual(DRUKHARI_SHEETS.map(s=>s.unit).sort());
  expect(Object.values(DRUKHARI_INTRINSIC_INVENTORY).flat()).toHaveLength(102);
  for(const entries of Object.values(DRUKHARI_INTRINSIC_INVENTORY))for(const entry of entries){expect(entry.source).toContain('/wh40k11ed/');expect(entry.sourceHash).toMatch(/^[a-f0-9]{64}$/);}
 });
 for(const unit of Object.keys(DRUKHARI_INTRINSIC_INVENTORY))it(unit+' has executable or explicitly delegated coverage for every named rule',()=>{
  const a=fixture(unit),squad=a.instances!.find(s=>s.unit===unit)!;
  const variants=[a];
  for(const field of drukhariLoadout(unit,squad.models)!.slots)for(const choice of field.choices){
   const knightGear={[field.name]:choice.name};
   if(validDrukhariGear(unit,knightGear,squad.models))variants.push({...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear}:s)});
  }
  const actual=new Set(variants.flatMap(v=>[...drukhariIntrinsicReminders(v),...drukhariDatasheetCoreReminders(v)].filter(r=>r.units?.includes(squad.id)).map(r=>r.title.replace(squad.id+' · ',''))));
  for(const entry of DRUKHARI_INTRINSIC_INVENTORY[unit])expect(actual.has(entry.name)||(DRUKHARI_DELEGATED_INTRINSIC[unit]??[]).includes(entry.name),unit+' · '+entry.name).toBe(true);
 });
 it('does not generate faction rules on a different faction or an empty selection',()=>{
  expect(drukhariIntrinsicReminders(newSelection('Necrons'))).toEqual([]);
  expect(drukhariDatasheetCoreReminders(newSelection('Necrons'))).toEqual([]);
  expect(drukhariWeaponReminders(newSelection('Necrons'))).toEqual([]);
  expect(drukhariIntrinsicReminders(newSelection('Drukhari'))).toEqual([]);
 });
});

describe('current Power from Pain and actual attached sources',()=>{
 it('gains a Command token and tokens for enemy losses regardless of the allied killer',()=>{
  const a=army(['Archon','Death Jester']);
  expect(rule(a,'Power from Pain · Command token')).toEqual([expect.objectContaining({window:'Command',turn:'own',timing:'start'})]);
  expect(text(a,'Power from Pain · harvest suffering')).toContain('destroying unit need not be Drukhari');
  expect(text(a,'Power from Pain · harvest suffering')).toContain('fails a Battle-shock test');
  expect(drukhariIntrinsicReminders(a).some(r=>/Battle Focus|Strands of Fate/.test(r.title))).toBe(false);
 });
 it('shares one empowerment between the actual Archon and Bodyguard',()=>{
  const a=join(army(['Archon','Kabalite Warriors']),'Archon','Kabalite Warriors');
  for(const title of ['Hatred Eternal (Pain)','Sadistic Raiders (Pain)']){
   const r=rule(a,title);expect(r.every(x=>x.units?.includes(id('Archon'))&&x.units?.includes(id('Kabalite Warriors')))).toBe(true);
   expect(r.every(x=>x.summary.includes('do not pay again for each source'))).toBe(true);
  }
  expect(rule(a,'Hatred Eternal (Pain)').map(r=>[r.window,r.turn])).toEqual([['Fight','either'],['Shooting','own']]);
 });
 it('activates Wyches only at own Charge start and combines their benefit with the Succubus reroll',()=>{
  const a=join(army(['Succubus','Wyches']),'Succubus','Wyches');
  expect(rule(a,'Acrobatic Gladiators (Pain)').every(r=>r.window==='Charge'&&r.turn==='own')).toBe(true);
  expect(text(a,'Acrobatic Gladiators (Pain)')).toContain('Advancing or Falling Back');
  expect(text(a,'Lithe Agility (Pain)')).toContain('without another token');
  expect(rule(a,'Lithe Agility (Pain)').every(r=>r.turn==='own'&&['Movement','Charge'].includes(r.window))).toBe(true);
 });
 it('uses Dark Vitality at printed triggers without new token spending and removes it with its bearer',()=>{
  const a=upgrade(join(army(['Archon','Kabalite Warriors'],['Realspace Raiders']),'Archon','Kabalite Warriors'),'Archon','Dark Vitality');
  expect(text(a,'Sadistic Raiders (Pain)')).toContain('without spending a Pain token');
  expect(rule(a,'Sadistic Raiders (Pain)').some(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);
  const survivors=without(a,'Archon');
  expect(text(a,'Sadistic Raiders (Pain)',survivors)).not.toContain('Dark Vitality');
  expect(rule(a,'Sadistic Raiders (Pain)',survivors).some(r=>r.window==='Movement')).toBe(false);
 });
 it('restores only actual original Bodyguards, including after their last model is destroyed',()=>{
  let a=join(army(['Haemonculus','Wracks'],['Covenite Coterie']),'Haemonculus','Wracks');
  expect(text(a,'Fleshcraft (Pain)')).toContain('D3+1');
  expect(text(a,'Fleshcraft (Pain)')).toContain('cannot return an attached Character');
  a=upgrade(a,'Haemonculus','Master Regenesist');
  expect(text(a,'Fleshcraft (Pain)')).toContain('D3+3');
  const survivors=without(a,'Wracks');
  expect(text(a,'Fleshcraft (Pain)',survivors)).toContain(id('Wracks'));
  expect(rule(army(['Haemonculus']),'Fleshcraft (Pain)')).toEqual([]);
 });
 it('rolls Pain Adept once for the army instead of once per Haemonculus',()=>{
  const a=army(['Haemonculus','Haemonculus','Wracks']);
  expect(rule(a,'Pain Adept')).toHaveLength(1);
  expect(rule(a,'Pain Adept')[0].units).toEqual(['Haemonculus#1','Haemonculus#2']);
  expect(text(a,'Pain Adept')).toContain('one roll for the army');
 });
 it('uses the actual Haemonculus range and extends Fear Incarnate with Master Repugnomancer',()=>{
  const a=upgrade(army(['Haemonculus'],['Covenite Coterie']),'Haemonculus','Master Repugnomancer');
  expect(text(a,'Fear Incarnate (Aura)')).toContain('9″');
  expect(rule(a,'Fear Incarnate (Aura)').find(r=>r.window==='Command'&&r.turn==='opponent')?.summary).toContain('below Starting Strength');
 });
 it('does not give Wrack weapon changes to the attached Haemonculus',()=>{
  const a=join(army(['Haemonculus','Wracks']),'Haemonculus','Wracks');
  const r=text(a,'Experimental Enhancements (Pain)');
  expect(r).toContain('non-Character');expect(r).toContain('Attacks 3');expect(r).toContain('Attacks 4 and Hazardous');expect(r).toContain('Haemonculus’s weapons do not receive');
 });
 it('keeps surviving Leaders’ leading benefits after their original Bodyguard dies',()=>{
  for(const [leader,body,title] of [['Drazhar','Incubi','Onslaught'],['Prince Yriel','Corsair Voidreavers','Piratical Hero'],['Shadowseer','Troupe','Fog of Dreams (Psychic)'],['Succubus','Wyches','Storm of Blades']]){
   const a=join(army([leader,body]),leader,body),live=without(a,body);
   expect(rule(a,title,live).length,title).toBeGreaterThan(0);
   expect(text(a,title,live)).toContain('continues after its original Bodyguard is destroyed');
   expect(rule(army([leader]),title),title+' does not invent an original attachment').toEqual([]);
  }
 });
 it('removes dead Bodyguard rules from a surviving Leader while retaining its own abilities',()=>{
  const a=join(army(['Archon','Kabalite Warriors']),'Archon','Kabalite Warriors'),live=without(a,'Kabalite Warriors');
  expect(rule(a,'Sadistic Raiders (Pain)',live)).toEqual([]);
  expect(rule(a,'Hatred Eternal (Pain)',live).length).toBeGreaterThan(0);
  expect(rule(a,'Persistent objective control',live).length).toBeGreaterThan(0);
 });
});

describe('current native timing, range and effect corrections',()=>{
 it('uses Shadowfield’s non-mortal wound trigger and whole-formation saving-throw reroll restriction',()=>{
  const a=join(army(['Archon','Kabalite Warriors']),'Archon','Kabalite Warriors'),r=text(a,'Shadowfield');
  expect(r).toContain('no model in its formation may re-roll saving throws');expect(r).toContain('other than a mortal wound');expect(r).toContain('another model do not break');
  expect(profile(a,'Invulnerable save').filter(r=>r.units?.includes(id('Archon'))).every(r=>r.summary.includes('2+')&&r.summary.includes('first time it loses a non-mortal wound'))).toBe(true);
 });
 it('uses the Wyches 6+ ranged and 4+ melee saves without granting them to their Leader',()=>{
  const a=join(army(['Succubus','Wyches']),'Succubus','Wyches'),saves=profile(a,'Invulnerable save').filter(r=>r.units?.includes(id('Wyches')));
  expect(saves.filter(r=>r.window!=='Fight').every(r=>r.summary.includes('use its 6+'))).toBe(true);
  expect(saves.find(r=>r.window==='Fight')?.summary).toContain('use its 4+');
  expect(saves.every(r=>r.summary.includes('Attached models from another datasheet use their own saves'))).toBe(true);
 });
 it('uses current 8-inch Hellion and Scourge restrictions rather than old 9-inch wording',()=>{
  const a=army(['Hellions','Scourges with Shardcarbines']);
  expect(rule(a,'Skyboard Evasion')).toEqual([expect.objectContaining({window:'Movement',turn:'opponent'})]);
  expect(text(a,'Skyboard Evasion')).toContain('ends any move within 8″');
  expect(text(a,'Swooping Descent (Pain)')).toContain('more than 6″');
  expect(text(a,'Swooping Descent (Pain)')).toContain('within 8″');
  expect(rule(a,'Swooping Descent (Pain)').some(r=>r.turn==='opponent')).toBe(false);
  expect(text(a,'Swooping Descent · charge restriction')).toContain('exactly 8″');
 });
 it('uses the current Void Mine opponent Fight window and excludes Lone Operative units',()=>{
  const a=army(['Voidraven Bomber']),r=rule(a,'Void Mine');
  expect(r).toHaveLength(1);expect(r[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end'});
  expect(r[0].summary).toContain('visible enemy model within 24″');expect(r[0].summary).toContain('Lone Operative');
  expect(r[0].summary).toContain('D6 for the radius');expect(r[0].summary).not.toContain('once per battle');
 });
 it('uses Lady Malys actual model for the once-per-turn CP tax',()=>{
  const a=join(army(['Lady Malys','Kabalite Warriors']),'Lady Malys','Kabalite Warriors');
  expect(rule(a,'Mind Like a Steel Trap (Aura)')).toHaveLength(5);
  expect(text(a,'Mind Like a Steel Trap (Aura)')).toContain('Once per turn');expect(text(a,'Mind Like a Steel Trap (Aura)')).toContain('within 12″ of this Lady Malys model');
 });
 it('does not activate own-Shooting abilities during Overwatch but retains Murderous Crossfire',()=>{
  const a=army(['Archon','Razorwing Jetfighter','Voidraven Bomber','Scourges with Heavy Weapons','Scourges with Shardcarbines','Death Jester','Kharseth']);
  for(const title of ['Hatred Eternal (Pain)','Nowhere to Run (Pain)','Nowhere to Hide (Pain)','Winged Strike (Pain)','Death is Not Enough','Cruel Amusement','Fury of the Void (Psychic)'])expect(rule(a,title).some(r=>r.window==='Movement'&&r.turn==='opponent'),title).toBe(false);
  expect(rule(a,'Murderous Crossfire').some(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);
 });
 it('does not permit snap shooting to trigger Lethal Hits, but keeps Precision allocation',()=>{
  const a=upgrade(join(army(['Archon','Hand of the Archon'],['Realspace Raiders']),'Archon','Hand of the Archon'),'Archon','Dark Vitality');
  const r=rule(a,'Assassins’ Poisons (Pain)').find(r=>r.window==='Movement')!;
  expect(r.summary).toContain('retain Precision');expect(r.summary).toContain('visible Character allocation group');expect(r.summary).toContain('Lethal Hits cannot trigger');
 });
 it('keeps aircraft deployment and returns without obsolete Hover',()=>{
  const a=army(['Razorwing Jetfighter','Voidraven Bomber']),r=drukhariDatasheetCoreReminders(a);
  expect(r.find(r=>r.title==='Aircraft · compulsory reserves')?.units).toEqual([id('Razorwing Jetfighter'),id('Voidraven Bomber')]);
  expect(r.find(r=>r.title==='Aircraft · return to Strategic Reserves')).toMatchObject({window:'End of opponent turn',turn:'opponent'});
  expect(r.some(r=>r.title.includes('Hover'))).toBe(false);
  expect(drukhariWeaponReminders(a).some(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);
 });
 it('keeps Talos fight-on-death at Fight start, with no second fight for a model that already fought',()=>{
  const a=army(['Talos']);expect(rule(a,'Mindless Killing Machines (Pain)').every(r=>r.window==='Fight')).toBe(true);
  const r=text(a,'Mindless Killing Machines (Pain)');expect(r).toContain('destroyed by a melee attack');expect(r).toContain('On 2+');expect(r).toContain('already fought does not fight again');
 });
 it('uses full Ravager Hit rerolls and keeps their snap restriction',()=>{
  const a=army(['Ravager']);expect(text(a,'Eradicate the Foe')).toContain('full Hit re-roll, not only rolls of 1');
  expect(rule(a,'Eradicate the Foe').some(r=>r.window==='Movement')).toBe(false);
 });
 it('requires actual fight eligibility for Skyreavers’ end-phase retreat',()=>{
  const a=army(['Corsair Skyreavers']),r=rule(a,'Raid and Run')[0];
  expect(r).toMatchObject({window:'Fight',turn:'either',timing:'end'});expect(r.summary).toContain('was eligible to fight');expect(r.summary).toContain('D3+3');expect(r.summary).toContain('Fall Back');
 });
});

describe('physical bearers, scopes and persistent effects',()=>{
 it('keeps Shadowseer protection at 18 inches and only its own formation',()=>{
  const a=join(army(['Shadowseer','Troupe','Kabalite Warriors']),'Shadowseer','Troupe');
  expect(text(a,'Fog of Dreams (Psychic)')).toContain('18″');
  expect(rule(a,'Fog of Dreams (Psychic)').every(r=>r.units?.includes(id('Troupe'))&&!r.units?.includes(id('Kabalite Warriors')))).toBe(true);
  expect(text(a,'Treacherous Illusion (Psychic)')).toContain('Enemy models’ melee weapons have Hazardous');
 });
 it('does not turn an optional equipment source into a formation-wide physical bearer',()=>{
  let a=join(army(['Archon','Kabalite Warriors']),'Archon','Kabalite Warriors');
  expect(rule(a,'Soul Trap')).toEqual([]);a=equip(a,'Archon','Soul trap');expect(text(a,'Soul Trap')).toContain('actual Soul Trap bearer');
  expect(text(a,'Soul Trap')).toContain('after resolving all of this bearer’s attacks');
  a=equip(a,'Kabalite Warriors','Kabalite icon');expect(text(a,'Kabalite Icon')).toContain('actual Kabalite icon bearer only');
  expect(text(a,'Kabalite Icon')).toContain('only its declared half');
 });
 it('distinguishes the Hand launcher from the Kabalite launcher and suppresses absent equipment',()=>{
  let a=army(['Hand of the Archon','Kabalite Warriors']);expect(rule(a,'Phantasm Grenade Launcher')).toEqual([]);
  a=equip(equip(a,'Hand of the Archon','Phantasm grenade launcher'),'Kabalite Warriors','Phantasm grenade launcher');
  const rows=rule(a,'Phantasm Grenade Launcher');
  expect(rows.find(r=>r.units?.includes(id('Kabalite Warriors')))?.summary).toContain('Smoke and Grenades');
  expect(rows.find(r=>r.units?.includes(id('Hand of the Archon')))?.summary).not.toContain('and Grenades');
 });
 it('keeps the first-failed-save Stimm-needler tied to its actual bearer and split half',()=>{
  const a=equip(army(['Hand of the Archon']),'Hand of the Archon','Stimm-needler'),r=text(a,'Stimm-needler');
  expect(r).toContain('first time a saving throw is failed');expect(r).toContain('actual stimm-needler bearer survives');expect(r).toContain('other split half protects only that half');
 });
 it('allows Shrine tokens only to physical Incubi and Klaivex, with the actual token count',()=>{
  let a=size(join(army(['Drazhar','Incubi']),'Drazhar','Incubi'),'Incubi',10);expect(rule(a,'Incubi Shrine Token')).toEqual([]);
  const s=a.instances!.find(s=>s.unit==='Incubi')!,field=drukhariLoadout('Incubi',10)!.slots.find(f=>f.name==='Incubi Shrine tokens')!;
  a={...a,instances:a.instances!.map(x=>x.id===s.id?{...x,knightGear:{[field.name]:field.choices[2].name}}:x)};
  expect(text(a,'Incubi Shrine Token')).toContain('2 Incubi Shrine tokens');expect(text(a,'Incubi Shrine Token')).toContain('Drazhar cannot use this token');
 });
 it('treats grav-talons as personal and caltrops as actual per-bearer fly-by rerolls',()=>{
  const a=equip(equip(size(army(['Reavers']),'Reavers',6),'Reavers','Grav-talon'),'Reavers','Cluster caltrops',1);
  expect(text(a,'Grav-talon')).toContain('actual grav-talon bearer');expect(text(a,'Grav-talon')).toContain('Other Reavers retain');
  expect(text(a,'Cluster Caltrops')).toContain('for each surviving model');expect(text(a,'Eviscerating Fly-by')).toContain('excluding Monster and Vehicle');
 });
 it('requires both macro-scalpels on the same Talos model',()=>{
  let a=size(army(['Talos']),'Talos',2);
  expect(text(a,'Devoted to Pain')).toContain('two macro-scalpels');
  const s=a.instances![0],fields=drukhariLoadout('Talos',2)!.slots.filter(f=>f.choices.some(c=>c.items.includes('Talos gauntlet')));
  const knightGear=Object.fromEntries(fields.map(f=>[f.name,f.choices.find(c=>c.items.includes('Talos gauntlet'))!.name]));
  a={...a,instances:[{...s,knightGear}]};
  expect(drukhariModelLoadouts(a.instances![0]).every(m=>m.items.filter(i=>i==='Macro-scalpel').length===1)).toBe(true);
  expect(rule(a,'Devoted to Pain')).toEqual([]);
 });
 it('checks each current Cronos for the missing-vortex aura bonus',()=>{
  let a=size(army(['Cronos']), 'Cronos',2);
  expect(text(a,'Pain Engine (Aura)')).toContain('adding 1');
  for(let i=0;i<2;i++)a=equip(a,'Cronos','Spirit vortex',i);
  expect(text(a,'Pain Engine (Aura)')).toContain('every current Cronos has a spirit vortex');
  expect(text(a,'Pain Engine (Aura)')).toContain('without spending a token does not trigger');
 });
 it('only grants Channeller Stones through an actual Soul Weaver and keeps Faolchú and Mistshield personal sources',()=>{
  let a=size(army(['Corsair Voidscarred']), 'Corsair Voidscarred',10);expect(rule(a,'Channeller Stones')).toEqual([]);
  a=equip(a,'Corsair Voidscarred','Soul Weaver');expect(text(a,'Channeller Stones')).toContain('actual Soul Weaver');
  a=equip(a,'Corsair Voidscarred','Faolchú');expect(text(a,'Faolchú')).toContain('bird is equipment, not an extra physical model');
  a=equip(a,'Corsair Voidscarred','Mistshield');expect(profile(a,'Mistshield').every(r=>r.summary.includes('actual mistshield bearer')&&r.summary.includes('Attached')===false)).toBe(true);
  expect(profile(a,'Mistshield')[0].summary).toContain('attached Characters');
 });
 it('limits Flip Belts to their bearers and the four printed move types',()=>{
  const a=join(army(['Troupe Master','Troupe']),'Troupe Master','Troupe');
  expect(text(a,'Flip Belt')).toContain('Normal, Advance, Fall Back or Charge');expect(text(a,'Flip Belt')).toContain('does not apply to Pile In or Consolidation');
 });
 it('retains already-applied enemy effects after source casualties, but no fresh activation',()=>{
  const a=army(['Razorwing Jetfighter','Ravager','Voidraven Bomber','Scourges with Shardcarbines','Kharseth','Starfangs','Kabalite Warriors']);
  const live=without(a,'Razorwing Jetfighter','Ravager','Voidraven Bomber','Scourges with Shardcarbines','Kharseth','Starfangs');
  for(const title of ['Nowhere to Run · pinned enemy','Agonising Suppression · suppressed enemy','Nowhere to Hide · exposed enemy','Murderous Crossfire · marked enemy','Fury of the Void · riven enemy','Hallucinogen Grenades · selected infantry'])expect(rule(a,title,live).length,title).toBeGreaterThan(0);
  for(const title of ['Nowhere to Run (Pain)','Agonising Suppression (Pain)','Nowhere to Hide (Pain)','Murderous Crossfire','Fury of the Void (Psychic)','Hallucinogen Grenades'])expect(rule(a,title,live),title).toEqual([]);
  expect(rule(a,'Fury of the Void · riven enemy',live).every(r=>r.turn==='own')).toBe(true);
 });
 it('does not grant native Pain or faction-wide Aeldari rules to allied units',()=>{
  const a=army(['Troupe','Corsair Voidreavers','Kharseth']);
  expect(drukhariIntrinsicReminders(a).some(r=>r.title.endsWith('(Pain)'))).toBe(false);
  expect(drukhariIntrinsicReminders(a).some(r=>r.title.includes('Battle Focus'))).toBe(false);
  const restricted=army(['Archon','Troupe','Corsair Voidreavers','Kharseth'],['Reaper’s Wager']);
  expect(rule(restricted,'Fury of the Void (Psychic)')).toEqual([]);
  expect(drukhariWeaponReminders(restricted).some(r=>r.units?.includes(id('Corsair Voidreavers')))).toBe(false);
 });
});

describe('deployment, physical full profiles and legal passenger inventories',()=>{
 it('grants Hand Leaders Scouts7 while keeping unjoined Characters without Scouts',()=>{
  const a=join(army(['Archon','Hand of the Archon','Venom']),'Archon','Hand of the Archon'),group=drukhariFormations(a).find(g=>g.root.unit==='Hand of the Archon')!;
  expect(group.members).toHaveLength(2);expect(drukhariFormationScoutRange(a,group.members)).toBe(7);
  expect(drukhariFormationScoutRange(army(['Archon']),army(['Archon']).instances!)).toBe(0);
  expect(profile(a,'ARCHON’S RETINUE')).toHaveLength(1);
  expect(profile(a,'Scouts · passengers').some(r=>r.units?.includes(id('Venom')))).toBe(true);
 });
 it('requires all models for Deep Strike and uses surviving Webway Walker bearers',()=>{
  let a=join(army(['Archon','Kabalite Warriors'],['Reaper’s Wager']),'Archon','Kabalite Warriors');
  expect(drukhariFormationHasDeepStrike(a,a.instances!)).toBe(false);
  a=upgrade(a,'Archon','Webway Walker');expect(drukhariFormationHasDeepStrike(a,a.instances!)).toBe(true);
  const live=without(a,'Archon');expect(drukhariFormationHasDeepStrike(a,live,live)).toBe(false);
 });
 it('uses current Stealth as cover and all-model Fights First without gifting personal Fights First',()=>{
  const a=join(army(['Lelith Hesperax','Wyches']),'Lelith Hesperax','Wyches');
  expect(profile(a,'Fights First')).toEqual([]);expect(text(a,'Blur of Blades')).toContain('All models in this formation');
  expect(text(army(['Skyweavers']),'Acrobatic Grace')).toContain('Benefit of Cover');
 });
 it('prints complete current ranged and melee profiles with correct snap differences',()=>{
  const a=army(['Archon','Kabalite Warriors','Drazhar','Scourges with Heavy Weapons']);
  const r=drukhariWeaponReminders(a),archon=r.find(r=>r.units?.includes(id('Archon'))&&r.window==='Shooting')!;
  expect(archon.summary).toContain('12″; A 1; BS 2+; D 1; S2, AP 0');
  expect(r.find(r=>r.units?.includes(id('Drazhar'))&&r.window==='Fight')?.summary).toContain('A 8; WS 2+; D 2; S5, AP -2');
  const snap=r.filter(r=>r.window==='Movement').map(r=>r.summary).join(' ');expect(snap).not.toMatch(/BS \d/);expect(snap).not.toContain('Heavy (+1');expect(snap).not.toContain('a critical hit');
  expect(r.some(r=>r.window==='Shooting'&&r.turn==='opponent')).toBe(false);
 });
 it('resolves the optional Way Seeker’s actual psychic weapons and normal accuracy rule',()=>{
  let a=size(army(['Corsair Voidscarred']),'Corsair Voidscarred',10);
  expect(drukhariFullWeaponProfiles(a,a.instances![0]).some(w=>w.name==='Executioner')).toBe(false);
  a=equip(a,'Corsair Voidscarred','Way Seeker');
  expect(drukhariFullWeaponProfiles(a,a.instances![0]).find(w=>w.name==='Executioner')).toMatchObject({count:1,attacks:'3',skill:'3',damage:'D3'});
  const normal=drukhariWeaponReminders(a).find(r=>r.window==='Shooting')!,snap=drukhariWeaponReminders(a).find(r=>r.window==='Movement')!;
  expect(normal.summary).toContain('ignore any or all modifiers to their Ballistic Skill or Weapon Skill and Hit roll');expect(snap.summary).not.toContain('ignore any or all modifiers');
 });
 it('prints Firing Deck for fitting whole formations and only conditional physical half pools for Venoms',()=>{
  const a=join(army(['Archon','Kabalite Warriors','Raider','Venom','Talos','Starweaver','Corsair Voidscarred']),'Archon','Kabalite Warriors'),r=drukhariDatasheetCoreReminders(a);
  const whole=r.find(r=>r.units?.includes(id('Raider'))&&/Firing Deck/.test(r.title))!;
  expect(whole.summary).toContain(id('Kabalite Warriors'));expect(whole.summary).toContain(id('Archon'));expect(whole.summary).not.toContain(id('Talos'));expect(whole.summary).not.toContain(id('Corsair Voidscarred'));
  const split=r.find(r=>r.units?.includes(id('Venom'))&&r.title.includes('split passengers'))!;
  expect(split.summary).toContain('5 + 6');expect(split.summary).toContain('actual half');expect(split.summary).toContain('never use equipment assigned to the other half');expect(split.summary).toContain('Do not transfer passenger abilities');
 });
 it('does not give Starweaver Firing Deck to native Drukhari or Corsair passengers',()=>{
  const a=army(['Starweaver','Kabalite Warriors','Corsair Voidreavers','Troupe','Troupe Master']),r=drukhariDatasheetCoreReminders(a).filter(r=>r.units?.includes(id('Starweaver'))&&/Firing Deck/.test(r.title));
  expect(r.length).toBeGreaterThan(0);expect(r[0].summary).toContain(id('Troupe'));expect(r[0].summary).not.toContain(id('Kabalite Warriors'));expect(r[0].summary).not.toContain(id('Corsair Voidreavers'));
 });
 it('keeps Raider Vanguard options conditional on the selected ability and actual passenger type',()=>{
  const a=army(['Raider','Kabalite Warriors','Wyches','Wracks']);
  expect(text(a,'Vanguard of the Dark City')).toContain('Only that selected ability');
  expect(text(a,'Masters of the Shadowed Sky')).toContain('actually embarked');
  expect(text(a,'Speed of the Kill')).toContain('except during Emergency');
  expect(text(a,'Visions of Butchery')).toContain('Attached Haemonculi do not count');
  expect(rule(army(['Raider','Kabalite Warriors']),'Visions of Butchery')).toEqual([]);
 });
 it('prints the Venom Shock Disembark exception with its original restrictions',()=>{
  const a=army(['Venom','Kabalite Warriors']),r=text(a,'Rapid Deployment (Pain)');
  expect(r).toContain('after that Advance');expect(r).toContain('did not embark in this transport this phase');expect(r).toContain('wholly within 3″');expect(r).toContain('cannot declare a charge');
 });
});
