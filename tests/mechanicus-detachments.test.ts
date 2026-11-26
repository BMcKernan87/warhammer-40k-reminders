import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {MECHANICUS_SHEETS,MECHANICUS_REVISION} from '../src/mechanicus-data.generated';
import {mechanicusKeywords} from '../src/mechanicus-keywords';
import {mechanicusFormations} from '../src/mechanicus-transports';
import {mechanicusLoadout} from '../src/mechanicus-loadouts';
import {currentMechanicusDetachment,eligibleMechanicusUpgrades} from '../src/mechanicus-detachment-data';
import {mechanicusDetachmentReminders} from '../src/mechanicus-detachments';
import {mechanicusReactionShooting} from '../src/mechanicus-reactions';
import {MECHANICUS_DETACHMENTS,MECHANICUS_STRATAGEMS,MECHANICUS_TL49,MECHANICUS_UPGRADES} from '../src/mechanicus-detachments.generated';

const rad='Rad-Zone Corps',hunter='Skitarii Hunter Cohort',psalm='Data-Psalm Conclave',explore='Explorator Maniple',cyber='Cohort Cybernetica',erad='Eradication Cohort',halo='Haloscreed Battle Clade',recon='Cohort Acquisitus',lords='Lords of the Forge',choir='Luminen Auto-choir';
const rangers='Skitarii Rangers',vanguard='Skitarii Vanguard',dominus='Tech-priest Dominus',marshal='Skitarii Marshal',datasmith='Cybernetica Datasmith',robots='Kastelan Robots',corpus='Corpuscarii Electro-priests',fulgur='Fulgurite Electro-priests',dunerider='Skorpius Dunerider',vector='Archaeopter Transvector';
const id=(u:string,n=1)=>u+'#'+n;
function force(dets:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Adeptus Mechanicus'),detachments2026:dets,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1)}))};
}
const edit=(a:ArmySelection,u:string,changes:Partial<RosterInstance>)=>({...a,instances:a.instances!.map(s=>s.id===id(u)?{...s,...changes}:s)});
const join=(a:ArmySelection,u:string,bodyguard=rangers)=>edit(a,u,{attachedTo:id(bodyguard)});
const equip=(a:ArmySelection,u:string,up:string)=>({...a,upgrades2026:{...a.upgrades2026,[id(u)]:up}});
const generate=(a:ArmySelection)=>mechanicusDetachmentReminders(a,a.instances);
const by=(a:ArmySelection,key:string)=>generate(a).filter(r=>r.sourceRuleId===key);
const named=(a:ArmySelection,title:string)=>generate(a).filter(r=>r.title===title);
function gun(a:ArmySelection,u:string,choice:string):ArmySelection{
 const squad=a.instances!.find(s=>s.id===id(u))!,slot=mechanicusLoadout(u,squad.models)!.slots.find(s=>s.choices.some(c=>c.name===choice||c.items.includes(choice)));
 if(!slot)throw Error('No native weapon choice '+u+': '+choice);
 const value=slot.choices.find(c=>c.name===choice||c.items.includes(choice))!.name;
 return edit(a,u,{knightGear:{...squad.knightGear,[slot.name]:value}});
}

describe('current Adeptus Mechanicus detachments and enhancements',()=>{
 it('reconciles all matched-play inventory, current DP and Data-Psalm exclusion',()=>{
  expect(MECHANICUS_DETACHMENTS).toHaveLength(10);expect(MECHANICUS_STRATAGEMS).toHaveLength(51);expect(MECHANICUS_UPGRADES).toHaveLength(34);
  expect(MECHANICUS_DETACHMENTS.find(d=>d.name===halo)).toMatchObject({dp:3,disposition:'Priority Assets',additionalDispositions:['Purge the Foe']});
  expect(MECHANICUS_DETACHMENTS.find(d=>d.name===cyber)?.dp).toBe(1);expect(MECHANICUS_DETACHMENTS.find(d=>d.name===lords)?.dp).toBe(2);expect(MECHANICUS_DETACHMENTS.find(d=>d.name===erad)?.dp).toBe(2);
  expect(MECHANICUS_DETACHMENTS.filter(d=>'tag'in d).map(d=>d.name)).toEqual([psalm,choir]);
  expect(MECHANICUS_UPGRADES.find(u=>u.name==='Stealth-Screened Cybercanids')).toMatchObject({points:15,repeatable:true,units:['Serberys Raiders']});
  expect(MECHANICUS_REVISION.packVersion).toBe('1.4');expect(MECHANICUS_REVISION.pack).toContain('14-10');
 });
 it('recognizes old saved capitalization without creating a second detachment',()=>{
  for(const [old,current] of [['Data-psalm Conclave',psalm],['Rad-zone Corps',rad],['Luminen Auto-Choir',choir]])expect(currentMechanicusDetachment(old)).toBe(current);
  expect(eligibleMechanicusUpgrades(force(['Rad-zone Corps'],marshal),marshal).map(u=>u.name)).toContain('Autoclavic Denunciation');
  expect(named(force(['Data-psalm Conclave'],corpus),'Benedictions of the Omnissiah')).toHaveLength(1);
 });
 it('makes all 51 Stratagems executable, including the source record containing an unquoted newline',()=>{
  const a=force(MECHANICUS_DETACHMENTS.map(d=>d.name),...MECHANICUS_SHEETS.map(s=>s.unit));
  const rows=generate(a),actual=new Set(rows.map(r=>r.sourceRuleId));
  expect(MECHANICUS_STRATAGEMS.filter(s=>!actual.has(s.id)).map(s=>s.name)).toEqual([]);
  expect(by(a,'000010748005')).toHaveLength(1);
  expect(rows.every(r=>r.units?.length&&r.summary&&r.source)).toBe(true);expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 });
 it.each(MECHANICUS_UPGRADES)('executes the source-backed $name enhancement for an allowed bearer',upgrade=>{
  const unit=upgrade.units[0],sheet=MECHANICUS_SHEETS.find(s=>s.unit===unit)!;
  let a=force([upgrade.detachment],...MECHANICUS_SHEETS.map(s=>s.unit));
  if(sheet.bodyguards?.length)a=join(a,unit,sheet.bodyguards[0]);
  a=equip(a,unit,upgrade.name);
  expect(by(a,upgrade.id).length).toBeGreaterThan(0);
  expect(new Set(generate(a).map(r=>r.id)).size).toBe(generate(a).length);
 });
 it('filters foreign armies, unrelated allies, unselected detachments and illegal enhancement bearers',()=>{
  expect(generate({...force([rad],rangers),faction:'Necrons'})).toEqual([]);
  expect(generate(force([],rangers))).toEqual([]);
  expect(generate(force([rad,psalm,lords],'Inquisitor','Armiger Warglaive','Imaginary Marshal'))).toEqual([]);
  expect(eligibleMechanicusUpgrades(force([lords],'Servitor Battleclade'),'Servitor Battleclade')).toEqual([]);
  expect(by(equip(force([lords],rangers),rangers,'TL-4Ø9'),'000010875003')).toEqual([]);
 });
 it('keeps source phase/turn restrictions for attacks, defence and reactions',()=>{
  const a=force([hunter,lords,choir,erad],rangers,vanguard,marshal,dominus,corpus,'Sicarian Ruststalkers');
  expect(by(a,'000008561003').map(r=>[r.window,r.turn,r.timing])).toEqual([['Shooting','own','start'],['Fight','either','start']]);
  expect(by(a,'000010876002').map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Fight','either']]);
  expect(by(a,'000010880002').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Fight','either']]);
  expect(by(a,'000010748007')).toMatchObject([{window:'Shooting',turn:'opponent',timing:'during'}]);
  expect(by(a,'000008561007')).toMatchObject([{window:'Fight',turn:'opponent',timing:'end'}]);
 });
 it('keeps current first-round bombardment and later Command fallout distinct',()=>{
  const a=force([rad],rangers);
  expect(named(a,'Rad-bombardment')[0]).toMatchObject({window:'Start of battle round',timing:'start'});
  expect(named(a,'Rad-bombardment')[0].summary).toMatch(/standing firm.*3\+.*taking cover becomes Battle-shocked.*5\+/);
  expect(named(a,'Rad-bombardment · Fallout')[0]).toMatchObject({window:'Command',turn:'own',timing:'start'});
  expect(named(a,'Rad-bombardment · Fallout')[0].summary).toMatch(/rounds 2–5.*1 mortal wound.*Battle-shock/);
 });
 it('offers the extra non-Battleline Skitarii target only with an actual Battleline first target',()=>{
  const a=force([rad],rangers,'Serberys Raiders');
  for(const key of ['000008386004','000008386002','000008386005','000008386007'])expect(by(a,key)[0].summary).toContain('non-Battleline Skitarii formation within 6″: Serberys Raiders#1');
  expect(by(force([rad],'Serberys Raiders'),'000008386004')[0].summary).not.toContain('also select');
  expect(by(force([rad],rangers),'000008386004')[0].summary).not.toContain('also select');
 });
 it('interprets Stealth as cover and keeps only eligible Hunter formations',()=>{
  const a=force([hunter],rangers,'Serberys Raiders','Ironstrider Ballistarii','Onager Dunecrawler',dominus);
  const rows=named(a,'Stealth Optimisation');
  expect(rows.map(r=>[r.window,r.turn])).toEqual([['Movement','own'],['Shooting','either']]);
  expect(rows[0].units).toEqual([id(rangers),id('Serberys Raiders'),id('Ironstrider Ballistarii')]);
  expect(rows[0].summary).toMatch(/Benefit of Cover.*does not stack.*not a Hit penalty/);
  const hidden=equip(force([recon],'Serberys Raiders'),'Serberys Raiders','Stealth-Screened Cybercanids');
  expect(by(hidden,'000010871003')[0].summary).toMatch(/not visible.*outside 15″.*Indirect Fire.*within 15″/);
 });
 it('distinguishes Cult models from a Cult formation, including an attached Inquisitor',()=>{
  const a=join(join(force([psalm],rangers,dominus,'Inquisitor'),dominus),'Inquisitor');
  // Both are Leaders, so an illegal double-Leader choice cannot confer a formation.
  expect(mechanicusFormations(a).find(f=>f.root.unit===rangers)?.members).toHaveLength(1);
  const b=join(force([psalm],rangers,dominus),dominus);
  const ranged=named(b,'Panegyric Procession')[0];expect(ranged.units).toEqual([id(rangers)]);
  expect(ranged.summary).toMatch(/only CULT MECHANICUS models.*Tech-priest Dominus#1/);
  expect(named(b,'Citation in Savagery')[0].summary).toMatch(/all its models.*including attached models/);
  for(const key of ['000008565003','000008565007','000008565002','000008565004'])expect(by(b,key)[0].summary).toMatch(/CULT MECHANICUS models?/);
 });
 it('uses source-model range for Litany and the Electro-Priest bonus',()=>{
  const a=join(force([psalm],rangers,dominus,corpus),dominus);
  const row=by(a,'000008565006')[0];expect(row.units).toEqual([id(rangers),id(corpus)]);
  expect(row.summary).toMatch(/within 6″.*CULT MECHANICUS models.*Add 1.*ELECTRO-PRIEST.*5\+.*D3/);
 });
 it('applies Cybernetica movement/control and command-duration vehicle stratagems to real recipients',()=>{
  const a=join(force([cyber],robots,datasmith,'Onager Dunecrawler',rangers),datasmith,robots);
  expect(named(a,'Cyber-Psalm Programming')[0].units).toEqual([id(robots)]);
  expect(named(a,'Cyber-Psalm Programming · control')).toHaveLength(5);
  expect(named(a,'Cyber-Psalm Programming · control')[0].summary).toContain('not Battle-shocked');
  for(const key of ['000008573002','000008573003','000008573004','000008573006','000008573007'])expect(by(a,key)[0].units).toContain(id(robots));
  expect(by(a,'000008573003')[0].summary).toMatch(/fixed BS first.*Protector.*BS 2\+/);
  expect(by(a,'000008573004')[0].summary).toMatch(/below Starting Strength.*next Command.*Below Half-strength/);
 });
 it('uses actual multi-model Skitarii Infantry for normal return fire, never lone Skatros or unrelated vehicles',()=>{
  const a=join(force([erad],rangers,marshal,'Sydonian Skatros','Onager Dunecrawler',corpus),marshal);
  const r=by(a,'000010748007')[0];expect(r.units).toEqual([id(rangers)]);
  expect(r.summary).toMatch(/lost models.*surviving models.*only that enemy.*normal shooting.*surviving models and their weapons/);
  expect(mechanicusReactionShooting(a,a.instances!.find(s=>s.unit===marshal)!,a.instances)).toHaveLength(1);
  expect(mechanicusReactionShooting(a,a.instances!.find(s=>s.unit==='Sydonian Skatros')!,a.instances)).toEqual([]);
 });
 it('lets Martial Signatum supply Skitarii to the actual attached Cult formation and its reaction',()=>{
  const a=equip(join(force([erad],dominus,corpus,fulgur),dominus,corpus),dominus,'Martial Signatum Amplificator');
  expect(mechanicusKeywords(a,a.instances!.find(s=>s.unit===corpus)!).has('SKITARII')).toBe(true);
  expect(mechanicusKeywords(a,a.instances!.find(s=>s.unit===fulgur)!).has('SKITARII')).toBe(false);
  expect(by(a,'000010748007')[0].units).toEqual([id(corpus)]);
  expect(named(a,'Murderous Imperative')[0].units).toEqual([id(corpus)]);
  expect(by(edit(a,dominus,{attachedTo:undefined}),'000010748007')).toEqual([]);
 });
 it('retains only valid passive wound benefits in snap shooting and full benefits in normal reactions',()=>{
  const a=join(force([erad,explore,psalm],rangers,dominus),dominus);
  expect(named(a,'Murderous Imperative · snap shooting')[0].summary).toMatch(/Conqueror.*Wound rolls of 1.*ignores Hit modifiers and re-rolls.*cannot score Critical Hits/);
  expect(named(a,'Murderous Imperative · reaction shooting')[0].summary).toMatch(/surviving.*Hit rolls.*Protector.*Wound rolls.*Conqueror/);
  expect(named(a,'Acquisition at Any Cost · snap shooting')[0].summary).toContain('Wound rolls of 1');
  expect(named(a,'Panegyric Procession · snap shooting')[0].summary).toContain('CULT MECHANICUS models');
  expect(by(a,'000010748004').every(r=>r.window==='Shooting'&&r.turn==='own')).toBe(true);
 });
 it('requires a surviving Skitarii source when checking a supplied reaction formation',()=>{
  const a=equip(join(force([erad],dominus,corpus),dominus,corpus),dominus,'Martial Signatum Amplificator');
  const bodyguard=a.instances!.find(s=>s.unit===corpus)!;
  expect(mechanicusReactionShooting(a,bodyguard,a.instances)[0]).toMatch(/still has Skitarii and Infantry.*destroyed sources.*surviving models/);
  expect(mechanicusReactionShooting(a,bodyguard,[bodyguard])).toEqual([]);
  const b=join(force([erad],dominus,rangers),dominus),leader=b.instances!.find(s=>s.unit===dominus)!;
  expect(mechanicusReactionShooting(b,leader,[leader])).toEqual([]);
 });
 it('requires actual variable Damage weapons for Threat-Cogitation Targeters',()=>{
  const a=force([erad],'Ironstrider Ballistarii','Onager Dunecrawler');
  expect(by(a,'000010748005')).toEqual([]);
  const b=gun(a,'Ironstrider Ballistarii','Twin cognis lascannon');
  expect(by(b,'000010748005')[0].units).toContain(id('Ironstrider Ballistarii'));
 });
 it('requires two distinct Skitarii formations for Binharic Offence',()=>{
  expect(by(join(force([hunter],rangers,marshal),marshal),'000008561003')).toEqual([]);
  const a=force([hunter],rangers,vanguard);expect(by(a,'000008561003')).toHaveLength(2);
  expect(by(a,'000008561003')[0].summary).toMatch(/two distinct.*only that enemy/);
 });
 it('keeps the current Halo selection count and excludes permanent Dyad formations from that quota',()=>{
  const a=equip(join(force([halo],robots,datasmith,rangers,vanguard),datasmith,robots),datasmith,'Transoracular Dyad Wafers');
  const row=named(a,'Noospheric Transference')[0];expect(row.summary).toMatch(/one or two.*including embarked.*Eligible new selections: Skitarii Rangers#1, Skitarii Vanguard#1/);
  expect(row.summary).toMatch(/already have Halo Override.*cannot be chosen.*Kastelan Robots#1/);
  expect(named({...a,battleSize2026:'Incursion'},'Noospheric Transference')[0].summary).toContain('Select one Adeptus');
  expect(by(a,'000009745002')[0].summary).toMatch(/until battle end.*cannot be selected.*still receive/);
  expect(by(edit(a,datasmith,{attachedTo:undefined}),'000009745002')).toEqual([]);
 });
 it('does not turn Neural Overload into a new Halo keyword and retains current fall-back hazard timing',()=>{
  const a=force([halo],rangers,'Kataphron Breachers');
  expect(by(a,'000009746004')[0].summary).toMatch(/D3 mortal wounds.*Otherwise.*without gaining the Halo Override keyword/);
  expect(by(a,'000009746006')[0].summary).toMatch(/selected to Fall Back.*shooting or declaring a charge.*hazard rolls/);
  expect(by(a,'000009746007')[0].units).toEqual([id(rangers)]);
  expect(by(a,'000009746007')[0].summary).toMatch(/within 8″.*D6″.*6″.*Halo Override/);
 });
 it('requires genuine transport capacity for embarkation, disembarkation and Dunerider assault moves',()=>{
  const a=join(join(force([explore,halo],dunerider,vector,rangers,dominus,marshal),dominus),marshal);
  expect(mechanicusFormations(a).find(f=>f.root.unit===rangers)?.members).toHaveLength(3);
  expect(by(a,'000008569007')[0].summary).toContain('Skitarii Rangers#1 → Skorpius Dunerider#1.');
  expect(by(a,'000008569007')[0].summary).not.toContain('→ Archaeopter Transvector');
  expect(by(a,'000009746005')[0].summary).toMatch(/assault disembark move.*18.06.*Skitarii Rangers#1/);
  const b=force([explore,halo],dunerider,robots,'Kataphron Breachers','Pteraxii Skystalkers');
  expect(by(b,'000008569007')).toEqual([]);expect(by(b,'000008569005')).toEqual([]);expect(by(b,'000009746005')).toEqual([]);
 });
 it('requires a Smoke source for Incense and a Recon source for Defect Scrutiny',()=>{
  expect(by(force([explore],rangers),'000008569006')).toEqual([]);
  expect(by(force([explore],rangers,dunerider),'000008569006')[0].summary).toMatch(/Both.*Stealth and Benefit of Cover.*do not stack/);
  expect(by(force([recon],'Onager Dunecrawler'),'000010872002')).toEqual([]);
  const a=force([recon],rangers,'Onager Dunecrawler');expect(by(a,'000010872002')[0].summary).toContain('Recon Augury sources: Skitarii Rangers#1.');
  expect(named(a,'Enhanced Augurs')[0]).toMatchObject({window:'Shooting',turn:'own',units:[id(rangers)]});
  expect(named(a,'Enhanced Augurs')[0].summary).toMatch(/\+3″ detection range.*Shooting phase ends/);
 });
 it('uses actual Tech-Priest models for War-Form Mantles without granting the Bodyguard its saves',()=>{
  const a=join(force([lords],rangers,dominus,'Servitor Battleclade'),dominus);
  const row=named(a,'War-Form Mantles')[0];expect(row.units).toEqual([id(dominus),id('Servitor Battleclade')]);
  expect(row.summary).toMatch(/Only TECH-PRIEST models.*4\+.*Feel No Pain 5\+.*Bodyguards.*do not gain/);
  expect(row.summary).toContain('Servitor Battleclade#1 · Servitor Underseer');expect(row.summary).not.toContain('Servitor Battleclade#1 · Combat Servitor');
  expect(named(a,'Baffling Data Screed')[0].summary).toMatch(/not Battle-shocked.*2\+.*within 12″.*−1.*hidden.*more than once per turn/);
 });
 it('keeps Scriptural Prognosis limited to the current attacker and Electrotraction at Advance selection',()=>{
  const a=force([lords,choir],dominus,corpus);
  expect(by(a,'000010876002')[0].summary).toMatch(/within range of an objective.*only until that enemy finishes/);
  expect(by(a,'000010880003')[0].summary).toMatch(/selected to Advance.*declaring a charge/);
  expect(by(a,'000010880004')[0]).toMatchObject({window:'Shooting',turn:'opponent'});
  expect(by(a,'000010880004')[0].summary).toMatch(/unengaged.*Surge move up to D6″/);
 });
 it('keeps Corpuscarii critical-hit effects out of snap fire and heals Fulgurites after fighting',()=>{
  const a=equip(join(force([choir,erad],dominus,corpus,fulgur),dominus,corpus),dominus,'Martial Signatum Amplificator');
  expect(named(a,'Cyber-Static Canticles')[0]).toMatchObject({window:'Shooting',turn:'own',units:[id(corpus)]});
  expect(named(a,'Cyber-Static Canticles · reaction shooting')).toHaveLength(1);
  expect(generate(a).filter(r=>r.title.includes('Cyber-Static')&&r.window==='Movement')).toEqual([]);
  expect(named(a,'Cyber-Static Canticles · healing')[0]).toMatchObject({window:'Fight',turn:'either',units:[id(fulgur)]});
 });
 it('prints the publisher TL-4Ø9 profile only for its bearer, including permitted reaction and snap shooting',()=>{
  const a=equip(join(force([lords,erad],dominus,rangers),dominus),dominus,'TL-4Ø9');
  expect(MECHANICUS_TL49).toMatchObject({range:'24',attacks:'3',skill:'2',strength:11,ap:-2,damage:'D3+2',abilities:['devastating wounds','hazardous']});
  const rows=by(a,'000010875003');expect(rows.map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Shooting','opponent'],['Movement','opponent']]);
  expect(rows.every(r=>r.units?.[0]===id(dominus)&&r.source===MECHANICUS_REVISION.pack)).toBe(true);
  expect(rows[0].summary).toMatch(/Only the bearer.*24″.*A 3.*BS 2\+.*S11.*AP -2.*D D3\+2.*Hazardous test/);
  expect(rows[2].summary).toMatch(/cannot score Critical Hits.*Critical Wounds/);
 });
 it('limits leading-only enhancements and preserves personal effects without granting them to bodyguards',()=>{
  for(const [name,key] of [['Malphonic Susurrus','000008385003'],['Peerless Eradicator','000008385004'],['Genetor','000008568003'],['Logis','000008568004'],['Artisan','000008568005']]){
   const a=equip(force([rad,explore],dominus,rangers),dominus,name);expect(by(a,key)).toEqual([]);expect(by(join(a,dominus),key).length).toBeGreaterThan(0);
  }
  const a=equip(join(force([psalm],dominus,rangers),dominus),dominus,'Mantle of the Gnosticarch');
  expect(by(a,'000008564003').every(r=>r.units?.[0]===id(dominus)&&r.summary.includes('Bodyguards do not gain'))).toBe(true);
 });
 it('keeps once-per-battle Locum phase triggers distinct from its bearer Leadership',()=>{
  const a=equip(force([psalm],dominus,corpus),dominus,'Mechanicus Locum');
  const rows=by(a,'000008564002');expect(rows).toHaveLength(6);expect(new Set(rows.map(r=>r.id)).size).toBe(6);
  expect(rows.filter(r=>r.timing==='start')).toHaveLength(5);expect(rows[0].summary).toBe('Only the bearer has Leadership 6+.');
 });
 it('grants all actual attached models Clandestine deployment and battle-long MOBILE to valid Datasmith robots',()=>{
  const a=equip(join(join(force([hunter],rangers,marshal,dominus),dominus),marshal),marshal,'Clandestine Infiltrator');
  expect(by(a,'000008560003')[0].summary).toMatch(/all models.*another attached Leader or Support.*Scouts 6″/);
  const b=equip(join(force([lords],robots,datasmith),datasmith,robots),datasmith,'Vingh’s Wafers of Dynamism');
  expect(by(b,'000010875002').map(r=>r.window)).toEqual(['Start of battle round','Movement']);
  expect(by(b,'000010875002')[1].summary).toMatch(/horizontally through dense terrain.*does not allow vertical/);
  expect(by(edit(b,datasmith,{attachedTo:undefined}),'000010875002')).toEqual([]);
 });
 it('keeps ranged upgrades on actual weapons and only phase-locked Uplink in own Shooting',()=>{
  const a=equip(join(force([halo,erad],rangers,dominus),dominus),dominus,'Sanctified Ordnance');
  expect(by(a,'000009745004').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Shooting','opponent'],['Movement','opponent']]);
  expect(by(a,'000009745004')[2].summary).toMatch(/\+6″ Range.*Hazardous tests/);
  const b=equip(join(force([hunter,erad],rangers,marshal),marshal),marshal,'Battle-sphere Uplink');
  expect(by(b,'000008560005')).toMatchObject([{window:'Shooting',turn:'own'}]);
  expect(by(b,'000008560005')[0].summary).toMatch(/After.*shoots.*Normal move up to 6″.*cannot declare a charge/);
 });
 it('retains wound-critical anti effects in snap fire and never adds personal weapon effects to the bodyguard',()=>{
  const a=equip(join(force([rad,erad],rangers,dominus),dominus),dominus,'Autoclavic Denunciation');
  expect(by(a,'000008385005').every(r=>r.units?.[0]===id(dominus))).toBe(true);
  expect(by(a,'000008385005').find(r=>r.window==='Movement')?.summary).toMatch(/Anti-Infantry 2\+ and Anti-Monster 4\+.*Critical Wounds remain possible/);
 });
});
