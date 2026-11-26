// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {AELDARI_SHEETS} from '../src/aeldari-data';
import {AELDARI_CARDS,aeldariLoadout,aeldariModelLoadouts,aeldariWeaponCount,validAeldariGear} from '../src/aeldari-loadouts';
import {AELDARI_INTRINSIC_INVENTORY} from '../src/aeldari-intrinsic.generated';
import {aeldariIntrinsicReminders,AELDARI_DELEGATED_INTRINSIC} from '../src/aeldari-intrinsic';
import {aeldariDatasheetCoreReminders,aeldariFormationHasDeepStrike,aeldariFormationHasInfiltrators,aeldariFormationScoutRange} from '../src/aeldari-datasheet-core';
import {aeldariWeaponReminders,aeldariFullWeaponProfiles} from '../src/aeldari-weapons';
import {aeldariFormations} from '../src/aeldari-formations';
import type {RosterInstance} from '../src/roster-instances';

const id=(name:string)=>name+'#1';
const sheet=(unit:string)=>AELDARI_SHEETS.find(s=>s.unit===unit)!;
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:sheet(unit)?.sizes[0]??1,keepUnattached:true});}
 return {...newSelection('Aeldari'),units,instances,detachments2026:detachments.length?detachments:names.some(n=>n.startsWith('Ynnari ')||['Yvraine','The Visarch','The Yncarne'].includes(n))?['Devoted of Ynnead']:[]};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body),keepUnattached:false}:s)});
const size=(a:ArmySelection,unit:string,models:number)=>({...a,instances:a.instances!.map(s=>s.id===id(unit)?{...s,models}:s)});
const upgrade=(a:ArmySelection,unit:string,name:string)=>({...a,upgrades2026:{...a.upgrades2026,[id(unit)]:name}});
const rule=(a:ArmySelection,title:string,roster?:RosterInstance[])=>aeldariIntrinsicReminders(a,roster).filter(r=>r.title===title);
const profile=(a:ArmySelection,title:string,roster?:RosterInstance[])=>aeldariDatasheetCoreReminders(a,roster).filter(r=>r.title.endsWith(' · '+title));
const text=(a:ArmySelection,title:string,roster?:RosterInstance[])=>rule(a,title,roster).map(r=>r.summary).join(' ');
const without=(a:ArmySelection,...units:string[])=>a.instances!.filter(s=>!units.includes(s.unit));
function equip(a:ArmySelection,unit:string,item:string,which=0){
 const squad=a.instances!.find(s=>s.id===id(unit))!,loadout=aeldariLoadout(unit,squad.models)!;
 const choices=loadout.slots.flatMap(field=>field.choices.filter(c=>c.items.includes(item)||c.name===item).map(choice=>({field,choice})))
  .filter(({field,choice})=>validAeldariGear(unit,{...squad.knightGear,[field.name]:choice.name},squad.models));
 const picked=choices[which];if(!picked)throw Error('No legal choice '+unit+' / '+item+' / '+which);
 const knightGear={...squad.knightGear,[picked.field.name]:picked.choice.name};
 return {...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear}:s)};
}
function fixture(unit:string){
 const body=unit==='Autarch'?'Howling Banshees':sheet(unit).bodyguards?.[0];
 let a=army([...new Set([unit,...body?[body]:[],'Guardian Defenders','Farseer',...(unit==='The Visarch'?['Yvraine']:[]),'Dire Avengers','Wraithguard','Fire Prism','Troupe','Starweaver'])]);
 if(body)a=join(a,unit,body);
 if(unit==='Warlock Conclave')a=join(join(a,'Warlock Conclave','Guardian Defenders'),'Farseer','Guardian Defenders');
 if(unit==='The Visarch')a=join(join(a,'The Visarch','Guardian Defenders'),'Yvraine','Guardian Defenders');
 if(['D-cannon Platform','Shadow Weaver Platform','Vibro Cannon Platform'].includes(unit))a={...a,instances:a.instances!.map(s=>s.unit===unit?{...s,retinueTo:id('Guardian Defenders')}:s)};
 if(unit==='Corsair Voidscarred')a=size(a,unit,10);
 return a;
}

describe('Aeldari current source inventory and executable coverage',()=>{
 it('reconciles all 76 cards, 159 named rules and 364 complete weapon profiles',()=>{
  expect(AELDARI_SHEETS).toHaveLength(76);
  expect(Object.keys(AELDARI_INTRINSIC_INVENTORY).sort()).toEqual(AELDARI_SHEETS.map(s=>s.unit).sort());
  expect(Object.values(AELDARI_INTRINSIC_INVENTORY).flat()).toHaveLength(159);
  expect(Object.values(AELDARI_CARDS).flatMap(c=>c.weapons)).toHaveLength(364);
  for(const entries of Object.values(AELDARI_INTRINSIC_INVENTORY))for(const entry of entries){expect(entry.source).toContain('/wh40k11ed/');expect(entry.sourceHash).toMatch(/^[a-f0-9]{64}$/);}
 });
 for(const unit of Object.keys(AELDARI_INTRINSIC_INVENTORY))it(unit+' covers every named source rule or delegates it explicitly',()=>{
  const a=fixture(unit),squad=a.instances!.find(s=>s.unit===unit)!;
  const variants=[a];
  for(const field of aeldariLoadout(unit,squad.models)!.slots)for(const choice of field.choices){
   const knightGear={[field.name]:choice.name};
   if(validAeldariGear(unit,knightGear,squad.models))variants.push({...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear}:s)});
  }
  const actual=new Set(variants.flatMap(v=>[...aeldariIntrinsicReminders(v),...aeldariDatasheetCoreReminders(v)].filter(r=>r.units?.includes(squad.id)).map(r=>r.title.replace(squad.id+' · ',''))));
  for(const entry of AELDARI_INTRINSIC_INVENTORY[unit])expect(actual.has(entry.name)||(AELDARI_DELEGATED_INTRINSIC[unit]??[]).includes(entry.name),unit+' · '+entry.name).toBe(true);
 });
 it('does not emit Aeldari rules for other factions or an empty selection',()=>{
  for(const fn of [aeldariIntrinsicReminders,aeldariDatasheetCoreReminders,aeldariWeaponReminders]){expect(fn(newSelection('Necrons'))).toEqual([]);expect(fn(newSelection('Aeldari'))).toEqual([]);}
 });
});

describe('Aeldari leading, Support and source lifetime',()=>{
 it('retains surviving original leading benefits after the Bodyguard dies',()=>{
  for(const [leader,body,title] of [['Asurmen','Dire Avengers','Tactical Acumen'],['Fuegan','Fire Dragons','Burning Lance'],['Baharroth','Swooping Hawks','Cloudstrider'],['Farseer','Guardian Defenders','Branching Fates (Psychic)'],['Prince Yriel','Corsair Voidreavers','Piratical Hero'],['The Visarch','Guardian Defenders','Way of the Blade']]){
   const a=join(army([leader,body]),leader,body);
   expect(rule(a,title,without(a,body)).length,title).toBeGreaterThan(0);
   expect(text(a,title,without(a,body))).toContain('continues after its original Bodyguard is destroyed');
   expect(rule(army([leader]),title),title).toEqual([]);
  }
 });
 it('gives Conclave protection only with an actual living Farseer leading its formation',()=>{
  const a=join(join(army(['Farseer','Warlock Conclave','Guardian Defenders']),'Farseer','Guardian Defenders'),'Warlock Conclave','Guardian Defenders');
  expect(rule(a,'Protect (Psychic)')).toHaveLength(4);
  expect(rule(a,'Protect (Psychic)',without(a,'Farseer'))).toEqual([]);
  expect(rule(a,'Protect (Psychic)',without(a,'Warlock Conclave'))).toEqual([]);
  expect(rule(army(['Warlock Conclave']),'Protect (Psychic)')).toEqual([]);
 });
 it('requires actual Psyker models for guidance and another Psyker for Communion',()=>{
  expect(rule(army(['Wraithguard','Wraithblades','Wraithlord']),'Psychic Guidance')).toEqual([]);
  expect(rule(army(['Warlock']),'Psychic Communion (Psychic)')).toEqual([]);
  const a=army(['Warlock','Wraithguard']);expect(rule(a,'Psychic Guidance').length).toBeGreaterThan(0);
  expect(rule(army(['Warlock','Farseer']),'Psychic Communion (Psychic)').length).toBeGreaterThan(0);
  expect(rule(army(['Warlock Conclave']),'Psychic Communion (Psychic)').length).toBeGreaterThan(0);
 });
 it('keeps Visarch Feel No Pain restricted to other attached Character models',()=>{
  const a=join(join(army(['The Visarch','Yvraine','Guardian Defenders']),'The Visarch','Guardian Defenders'),'Yvraine','Guardian Defenders');
  expect(text(a,'Yvraine’s Champion')).toContain('Visarch himself and non-Character Bodyguards do not receive');
  expect(rule(a,'Yvraine’s Champion').every(r=>r.units?.includes(id('Yvraine')))).toBe(true);
  expect(rule(a,'Yvraine’s Champion',without(a,'The Visarch'))).toEqual([]);
 });
 it('keeps Yvraine revival on original Bodyguards and excludes Support Weapons',()=>{
  const a=join(army(['Yvraine','Guardian Defenders']),'Yvraine','Guardian Defenders');
  expect(text(a,'Word of the Phoenix (Psychic)')).toContain('D3+1');
  expect(text(a,'Word of the Phoenix (Psychic)')).toContain('excluding Support Weapon models');
  expect(text(a,'Word of the Phoenix (Psychic)',without(a,'Guardian Defenders'))).toContain(id('Guardian Defenders'));
  expect(rule(army(['Yvraine']),'Word of the Phoenix (Psychic)')).toEqual([]);
 });
 it('retains Fuegan first-destruction resurrection when no live unit remains',()=>{
  const a=army(['Fuegan']),r=rule(a,'Unquenchable Resolve',[]);
  expect(r).toHaveLength(5);expect(r.every(r=>r.timing==='end')).toBe(true);
  expect(r[0].summary).toContain('first phase');expect(r[0].summary).toContain('On 2+');expect(r[0].summary).toContain('Rejoin his original attached formation');
 });
 it('retains applied target effects after source loss and stops fresh activations',()=>{
  const a=army(['Eldrad Ulthran','Farseer','Farseer Skyrunner','Spiritseer','Vypers','Night Spinner','War Walkers','Shroud Runners','Lhykhis','Kharseth','Starfangs','Yvraine','Stonesinger','Wraithguard','Guardian Defenders']);
  const live=a.instances!.filter(s=>['Wraithguard','Guardian Defenders'].includes(s.unit));
  for(const title of ['Doom · chosen enemy','Guide · chosen enemy','Misfortune · chosen enemy','Spirit Mark · chosen targets','Harassment Fire · suppressed enemy','Monofilament Web · pinned enemy','Crystalline Targeting · chosen enemy','Target Acquisition · chosen enemy','Whispering Web · chosen enemy','Fury of the Void · riven enemy','Hallucinogen Grenades · selected infantry','Herald of Ynnead · chosen enemy','Elemental Ensnarement · ensnared enemy'])expect(rule(a,title,live).length,title).toBeGreaterThan(0);
  for(const title of ['Doom (Psychic)','Guide (Psychic)','Misfortune (Psychic)','Spirit Mark (Psychic)','Harassment Fire','Monofilament Web','Crystalline Targeting','Target Acquisition','Whispering Web','Fury of the Void (Psychic)','Hallucinogen Grenades','Herald of Ynnead','Elemental Ensnarement'])expect(rule(a,title,live),title).toEqual([]);
 });
});

describe('current Aeldari timing and personal targets',()=>{
 it('permits Hand of Asuryan during Overwatch but keeps shooting-phase-only attacks out',()=>{
  const a=army(['Asurmen','Maugan Ra','Fire Dragons','Death Jester','Kharseth','Vypers','War Walkers']);
  expect(rule(a,'Hand of Asuryan').some(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(true);
  for(const title of ['Face of Death','Assured Destruction','Death is Not Enough','Cruel Amusement','Fury of the Void (Psychic)','Harassment Fire','Crystalline Targeting'])expect(rule(a,title).some(r=>r.window==='Movement'&&r.turn==='opponent'),title).toBe(false);
  expect(text(a,'Hand of Asuryan')).toContain('Anti-Infantry 5+');
 });
 it('keeps Baharroth shorter arrival in own Movement and unconditional charge prohibition',()=>{
  const a=join(army(['Baharroth','Swooping Hawks']),'Baharroth','Swooping Hawks');
  expect(rule(a,'Cloudstrider').find(r=>r.window==='Movement')).toMatchObject({turn:'own'});
  expect(text(a,'Cloudstrider')).toContain('more than 6″ horizontally');expect(text(a,'Cloudstrider')).toContain('not available for Rapid Ingress');
  expect(rule(a,'Cloudstrider').find(r=>r.window==='End of opponent turn')).toMatchObject({turn:'opponent'});
  expect(text(a,'Cry of the Wind')).toContain('his ranged attacks');
 });
 it('uses actual Swooping Hawks for grenade dice, caps mortals and blocks Explosives',()=>{
  const a=join(army(['Baharroth','Swooping Hawks']),'Baharroth','Swooping Hawks'),r=text(a,'Grenade Pack Flyover');
  expect(r).toContain('per actual Swooping Hawks model');expect(r).toContain('capped at 6');expect(r).toContain('Attached Characters do not add dice');expect(r).toContain('8″');
  expect(text(a,'Grenade Pack Flyover · Explosives restriction')).toContain('cannot target');
 });
 it('keeps Flickerjump hazards while Lhykhis grants the charge exception',()=>{
  const a=join(army(['Lhykhis','Warp Spiders']),'Lhykhis','Warp Spiders');
  expect(text(a,'Flickerjump')).toContain('Move 24″');expect(text(a,'Flickerjump')).toContain('does not prevent it charging');
  expect(text(a,'Flickerjump · hazard')).toContain('including attached models');
  expect(rule(a,'Flickerjump · charge restriction')).toEqual([]);
  expect(rule(a,'Flickerjump · charge restriction',without(a,'Lhykhis'))).toHaveLength(1);
 });
 it('uses Yncarne opponent-only relocation and mandatory rolled healing',()=>{
  const a=army(['The Yncarne','Guardian Defenders']);
  expect(rule(a,'Inevitable Death').every(r=>r.turn==='opponent')).toBe(true);
  expect(text(a,'Inevitable Death')).toContain('opponent’s first turn');expect(text(a,'Inevitable Death')).toContain('another friendly Aeldari unit');
  expect(text(a,'Ethereal Form')).toContain('cannot choose to heal fewer');
 });
 it('does not apply personal wound rerolls or weapon boosts to bodyguards',()=>{
  const a=join(army(['Jain Zar','Howling Banshees']),'Jain Zar','Howling Banshees');
  expect(rule(a,'Storm of Silence').every(r=>r.units?.length===1&&r.units[0]===id('Jain Zar'))).toBe(true);
  expect(text(a,'Storm of Silence')).toContain('her own attacks');
 });
 it('applies Fanged Leer to two Death Jester choices without retaining a one-choice instruction',()=>{
  const a=upgrade(army(['Death Jester'],['Serpent’s Brood']),'Death Jester','Fanged Leer');
  expect(text(a,'Cruel Amusement')).toContain('choose two different abilities');
  expect(text(a,'Cruel Amusement')).not.toContain('choose one ability');
  expect(text(army(['Death Jester']),'Cruel Amusement')).toContain('choose one ability');
 });
});

describe('Ynnari, Exodite, artillery and physical equipment differences',()=>{
 it('keeps the Ynnari Shadow Field failed-save trigger distinct from Drukhari',()=>{
  const a=army(['Ynnari Archon']);
  expect(text(a,'Shadow Field')).toContain('first failed invulnerable saving throw');
  expect(profile(a,'Invulnerable save').every(r=>r.summary.includes('first failed invulnerable save'))).toBe(true);
 });
 it('keeps Ynnari Reaver fly-by Normal-only and grav-talon Lance',()=>{
  const a=equip(army(['Ynnari Reavers']),'Ynnari Reavers','Grav-talon');
  expect(text(a,'Eviscerating Fly-by')).toContain('does not trigger after an Advance or Fall Back');
  expect(text(a,'Grav-talon')).toContain('Lance');expect(text(a,'Grav-talon')).not.toContain('Lethal Hits');
 });
 it('requires actual Aspect Shrine tokens and excludes all Character bearers',()=>{
  let a=join(army(['Asurmen','Dire Avengers']),'Asurmen','Dire Avengers');
  expect(rule(a,'Aspect Shrine Token')).toEqual([]);a=equip(a,'Dire Avengers','Aspect Shrine token');
  expect(text(a,'Aspect Shrine Token')).toContain('1 Aspect Shrine token');
  expect(text(a,'Aspect Shrine Token')).toContain('non-Character model');expect(text(a,'Aspect Shrine Token')).toContain('cannot use these tokens');
 });
 it('counts Drakolithe tokens without creating physical models',()=>{
  let a=army(['Dragon Knights','Leystalker']);
  expect(rule(a,'Drakolithe (Once per battle, per token)').find(r=>r.units?.includes(id('Leystalker')))?.summary).toContain('2 Drakolithe tokens');
  a=equip(a,'Dragon Knights','Drakolithe');
  expect(rule(a,'Drakolithe (Once per battle, per token)').find(r=>r.units?.includes(id('Dragon Knights')))?.summary).toContain('1 Drakolithe token');
  expect(aeldariModelLoadouts(a.instances!.find(s=>s.unit==='Dragon Knights')!)).toHaveLength(3);
 });
 it('keeps Stonesinger effect after a self-Battle-shock result and prevents pinning',()=>{
  const a=army(['Stonesinger']),r=rule(a,'Elemental Ensnarement')[0];
  expect(r).toMatchObject({window:'Fight',turn:'own',timing:'end'});expect(r.summary).toContain('roll of 1 does not cancel');expect(r.summary).toContain('cannot be pinned');
 });
 it('uses Support Weapon Toughness3 only while another model remains',()=>{
  const a={...army(['D-cannon Platform','Guardian Defenders']),instances:army(['D-cannon Platform','Guardian Defenders']).instances!.map(s=>s.unit==='D-cannon Platform'?{...s,retinueTo:id('Guardian Defenders')}:s)};
  expect(text(a,'Support Weapon')).toContain('Toughness 3');
  expect(rule(a,'Support Weapon',without(a,'Guardian Defenders'))).toEqual([]);
  expect(rule(army(['D-cannon Platform']),'Support Weapon')).toEqual([]);
 });
 it('does not let an attached Character keep a Guardian platform alive',()=>{
  for(const [unit,leader] of [['Guardian Defenders','Farseer'],['Storm Guardians','Autarch']]){
   const a=join(army([unit,leader]),leader,unit);expect(text(a,'Crewed Platform')).toContain('last actual');expect(text(a,'Crewed Platform')).toContain(unit==='Storm Guardians'?'Attached Leaders':'attached Leader');
  }
 });
 it('keeps personal shields on actual bearers and the Storm shield formation-wide',()=>{
  const a=equip(join(army(['Asurmen','Dire Avengers']),'Asurmen','Dire Avengers'),'Dire Avengers','Shimmershield');
  expect(profile(a,'Shimmershield')[0].summary).toContain('actual shimmershield bearer');expect(profile(a,'Shimmershield')[0].summary).toContain('attached Characters');
  const storm=join(army(['Farseer','Storm Guardians']),'Farseer','Storm Guardians');
  expect(profile(storm,'Serpent Shield').every(r=>r.units?.includes(id('Farseer'))&&r.summary.includes('every model'))).toBe(true);
 });
});

describe('Aeldari complete profiles, deployment and transport scope',()=>{
 it('keeps Rangers and Titans ranged-only saves, and Banshees improved melee saves',()=>{
  for(const unit of ['Rangers','Shroud Runners','Revenant Titan','Phantom Titan'])expect(profile(army([unit]),'Invulnerable save').some(r=>r.window==='Fight'),unit).toBe(false);
  const a=army(['Howling Banshees']);expect(profile(a,'Invulnerable save').find(r=>r.window==='Fight')?.summary).toContain('use its 4+');expect(profile(a,'Invulnerable save').find(r=>r.window==='Shooting')?.summary).toContain('use its 5+');
 });
 it('grants Autarch native training only through its original eligible Bodyguard',()=>{
  const a=join(army(['Autarch','Striking Scorpions']),'Autarch','Striking Scorpions'),g=aeldariFormations(a)[0];
  expect(aeldariFormationScoutRange(a,g.members)).toBe(7);expect(aeldariFormationHasInfiltrators(a,g.members)).toBe(true);expect(profile(a,'Stealth')).not.toEqual([]);
  expect(aeldariFormationScoutRange(a,without(a,'Striking Scorpions'))).toBe(7);
  expect(aeldariFormationScoutRange(army(['Autarch']),army(['Autarch']).instances!)).toBe(0);
  const b=join(army(['Autarch','Howling Banshees']),'Autarch','Howling Banshees');expect(profile(b,'Fights First')).toHaveLength(1);
 });
 it('checks the whole actual formation for Deep Strike',()=>{
  let a=join(army(['Autarch Wayleaper','Warp Spiders']),'Autarch Wayleaper','Warp Spiders');expect(aeldariFormationHasDeepStrike(a,a.instances!)).toBe(true);
  a=join(army(['Autarch','Guardian Defenders']),'Autarch','Guardian Defenders');expect(aeldariFormationHasDeepStrike(a,a.instances!)).toBe(false);
 });
 it('prints full current stats and conditional Exodite weapon keywords accurately',()=>{
  const a=army(['Leystalker','Stonesinger','Fuegan','Yvraine']);
  const rows=aeldariWeaponReminders(a),leystalker=rows.find(r=>r.units?.includes(id('Leystalker'))&&r.window==='Shooting')!;
  expect(leystalker.summary).toContain('36″; A 2; BS 2+; D 3; S6, AP -2');
  expect(leystalker.summary).toContain('targets with neither Monster nor Vehicle');
  const stonesinger=rows.find(r=>r.units?.includes(id('Stonesinger'))&&r.window==='Shooting')!;
  expect(stonesinger.summary).toContain('Anti-Monster 3+');expect(stonesinger.summary).toContain('Anti-Vehicle 3+');expect(stonesinger.summary).toContain('a target with neither Monster nor Vehicle');
  const fuegan=aeldariFullWeaponProfiles(a,a.instances!.find(s=>s.unit==='Fuegan')!).find(w=>w.phase==='Fight')!;expect(fuegan).toMatchObject({attacks:'6',skill:'2',strength:5,ap:-4,damage:'3'});
 });
 it('excludes Titanic Overwatch and keeps ordinary aircraft core deployment',()=>{
  const a=army(['Revenant Titan','Phantom Titan','Crimson Hunter','Hemlock Wraithfighter']);
  expect(aeldariWeaponReminders(a).filter(r=>r.window==='Movement').some(r=>r.units?.some(id=>id.includes('Titan')))).toBe(false);
  expect(aeldariDatasheetCoreReminders(a).find(r=>r.title==='Aircraft · compulsory reserves')?.units).toEqual([id('Crimson Hunter'),id('Hemlock Wraithfighter')]);
  expect(aeldariDatasheetCoreReminders(a).some(r=>r.title.includes('Hover'))).toBe(false);
 });
 it('prints only legal actual passenger pools without importing their personal abilities',()=>{
  const a=army(['Starweaver','Troupe','Ynnari Kabalite Warriors','Ynnari Raider','Ynnari Venom','Dire Avengers']);
  const rows=aeldariDatasheetCoreReminders(a).filter(r=>r.title.includes('Firing Deck'));
  const star=rows.find(r=>r.units?.includes(id('Starweaver')))!;expect(star.summary).toContain(id('Troupe'));expect(star.summary).not.toContain(id('Dire Avengers'));expect(star.summary).not.toContain(id('Ynnari Kabalite Warriors'));
  const raider=rows.find(r=>r.units?.includes(id('Ynnari Raider')))!;expect(raider.summary).toContain(id('Ynnari Kabalite Warriors'));expect(raider.summary).toContain('does not gain passenger abilities');
 });
});
