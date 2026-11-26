import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {CSM_SHEETS} from '../src/csm-data';
import {CSM_CULT_SHEETS} from '../src/csm-army-data';
import {CSM_DETACHMENTS,CSM_STRATAGEMS,CSM_TRAITS,CSM_UPGRADES} from '../src/csm-detachments.generated';
import {currentCsmDetachment,csmSelectedDetachments,eligibleCsmUpgrades,csmHasDeepStrike,csmHasInfiltrators,csmScoutRange,csmSoulLinkSources} from '../src/csm-detachment-data';
import {csmDetachmentReminders} from '../src/csm-detachments';
import {csmKeywords} from '../src/csm-keywords';
import {csmFormations} from '../src/csm-transports';
import {csmLoadout} from '../src/csm-loadouts';

const sheets=[...CSM_SHEETS,...CSM_CULT_SHEETS],all=sheets.map(s=>s.unit);
const lord='Chaos Lord',termLord='Chaos Lord In Terminator Armour',jump='Chaos Lord with Jump Pack',apostle='Dark Apostle',commune='Dark Commune',smith='Warpsmith',moe='Master Of Executions',masters='Masters of the Maelstrom';
const legion='Legionaries',chosen='Chosen',cult='Cultist Mob',accursed='Accursed Cultists',talons='Warp Talons',rhino='Chaos Rhino',prince='Heretic Astartes Daemon Prince',wing='Heretic Astartes Daemon Prince With Wings';
const pact='Pactbound Zealots',veterans='Veterans of the Long War',deceptors='Deceptors',raiders='Renegade Raiders',dread='Dread Talons',fellhammer='Fellhammer Siege-host',chaosCult='Chaos Cult',soulforged='Soulforged Warpack',bile='Creations of Bile',cabal='Cabal of Chaos',nightmare='Nightmare Hunt',huron='Huron’s Marauders',renegade='Renegade Warband',warpstrike='Warpstrike Champions',arkifane='Cult of the Arkifane',devotees='Devotees of Destruction',murdertalon='Murdertalon Raiders';
const id=(unit:string,n=1)=>unit+'#'+n;
function force(detachments2026:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 const instances=units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1),models:sheets.find(s=>s.unit===unit)?.sizes[0],csmMark:(unit===prince||unit===wing?'Nurgle':'Chaos Undivided') as RosterInstance['csmMark']}));
 return {...newSelection('Chaos Space Marines'),detachments2026,units:counts,instances};
}
const edit=(a:ArmySelection,unit:string,changes:Partial<RosterInstance>,n=1):ArmySelection=>({...a,instances:a.instances!.map(s=>s.id===id(unit,n)?{...s,...changes}:s)});
const join=(a:ArmySelection,unit:string,body:string)=>edit(a,unit,{attachedTo:id(body)});
const equip=(a:ArmySelection,unit:string,name:string):ArmySelection=>({...a,upgrades2026:{...a.upgrades2026,[id(unit)]:name}});
const rows=(a:ArmySelection,roster:readonly RosterInstance[]=a.instances!)=>csmDetachmentReminders(a,roster);
const by=(a:ArmySelection,r:string,roster?:readonly RosterInstance[])=>rows(a,roster).filter(s=>s.sourceRuleId===r);
const named=(a:ArmySelection,t:string,roster?:readonly RosterInstance[])=>rows(a,roster).filter(s=>s.title===t);
const windows=(a:ArmySelection,r:string)=>by(a,r).map(s=>[s.window,s.turn,s.timing]);
function gunless(a:ArmySelection):ArmySelection{const slot=csmLoadout(lord,1)!.slots.find(s=>s.choices.some(c=>c.items.includes('Plasma pistol')))!;const choice=slot.choices.find(c=>c.items.includes('Power fist'))!;return edit(a,lord,{knightGear:{[slot.name]:choice.name}});}
const unit=(a:ArmySelection,u:string)=>a.instances!.find(s=>s.id===id(u))!;

describe('Chaos Space Marines source-backed detachment coverage',()=>{
 it('reconciles all17 detachments,93 Stratagems,62 enhancements and20 traits',()=>{
  expect(CSM_DETACHMENTS).toHaveLength(17);expect(CSM_STRATAGEMS).toHaveLength(93);expect(CSM_UPGRADES).toHaveLength(62);expect(CSM_TRAITS).toHaveLength(20);
  expect(CSM_DETACHMENTS.find(d=>d.name===pact)).toMatchObject({dp:3,disposition:'Disruption',additionalDispositions:['Priority Assets']});
  expect(CSM_DETACHMENTS.find(d=>d.name===raiders)).toMatchObject({dp:3,disposition:'Priority Assets',additionalDispositions:['Reconnaissance']});
  for(const name of [bile,huron])expect(CSM_DETACHMENTS.find(d=>d.name===name)).toMatchObject({dp:3,additionalDispositions:['Purge the Foe']});
  expect(CSM_DETACHMENTS.find(d=>d.name===soulforged)?.disposition).toBe('Take and Hold');
  expect(CSM_DETACHMENTS.filter(d=>'tag' in d).map(d=>[d.name,'tag' in d&&d.tag])).toEqual([[nightmare,'Nightmare'],[murdertalon,'Nightmare']]);
  expect(CSM_UPGRADES.some(u=>u.repeatable)).toBe(false);
  expect([...CSM_STRATAGEMS,...CSM_UPGRADES,...CSM_TRAITS].every(r=>/^[0-9a-f]{64}$/.test(r.sourceHash))).toBe(true);
 });
 it.each(CSM_DETACHMENTS)('executes every source rule with $name selected on its own',d=>{
  const a=force([d.name],...all),result=rows(a);
  for(const rule of [...CSM_STRATAGEMS,...CSM_TRAITS].filter(r=>r.detachment===d.name))expect(result.filter(r=>r.sourceRuleId===rule.id).length,rule.name).toBeGreaterThan(0);
  expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
  expect(result.every(r=>r.units?.length&&r.source.startsWith('https://'))).toBe(true);
 });
 it.each(CSM_UPGRADES)('executes selected enhancement $name ($detachment)',u=>{
  let a=force([u.detachment],...all),bearer:string=u.units[0];
  if(['Eye of the Warp','Akshur’s Binding Runes','Tzagulla'].includes(u.name))bearer=termLord;
  if(u.name==='Warped Foresight'){bearer=commune;a=join(a,commune,accursed);}
  if(['Cultist’s Brand','Incendiary Goad','Amulet of Tainted Vigour'].includes(u.name)){bearer=apostle;a=join(a,apostle,cult);}
  const mark=({'Eye of Tzeentch':'Tzeentch','Intoxicating Elixir':'Slaanesh','Orbs of Unlife':'Nurgle','Talisman of Burning Blood':'Khorne'} as Record<string,RosterInstance['csmMark']>)[u.name];
  if(mark)a=edit(a,bearer,{csmMark:mark});
  a=equip(a,bearer,u.name);
  expect(eligibleCsmUpgrades(a,bearer,id(bearer)).some(x=>x.id===u.id)).toBe(true);
  const result=rows(a);expect(result.some(r=>r.sourceRuleId===u.id)).toBe(true);
  expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
 });
 it('normalizes detachment spelling but rejects unselected, foreign, allied and nonexistent content',()=>{
  expect(currentCsmDetachment("huron's marauders")).toBe(huron);
  expect(csmSelectedDetachments(force(["huron's marauders",huron]))).toEqual([huron]);
  expect(rows(force([],lord,legion))).toEqual([]);
  expect(rows({...force([veterans],lord),faction:'Necrons'})).toEqual([]);
  expect(rows(force([veterans],'Chaos Contemptor Dreadnought','Imaginary Lord','Bloodletters','War Dog Brigand'))).toEqual([]);
  expect(eligibleCsmUpgrades(force([veterans],legion),legion)).toEqual([]);
  expect(eligibleCsmUpgrades(force([veterans],lord),lord,'Missing#1')).toEqual([]);
  expect(eligibleCsmUpgrades(force([veterans],lord,apostle),apostle,id(lord))).toEqual([]);
  expect(eligibleCsmUpgrades(force([veterans],'Abaddon The Despoiler'),'Abaddon The Despoiler')).toEqual([]);
  expect(rows(force([renegade],'Rubric Marines','Plague Marines','Noise Marines','Khorne Berzerkers'))).toEqual([]);
 });
 it('preserves source phase ownership, start/end timing and explicit durations',()=>{
  for(const det of [veterans,raiders,warpstrike]){
   const rule=det===veterans?'000008961003':det===raiders?'000008969002':'000010740002';
   expect(windows(force([det],...all),rule)).toEqual([['Shooting','opponent','during'],['Fight','either','during']]);
   expect(by(force([det],...all),rule)[0].summary).toMatch(/attacking unit finishes/);
  }
  expect(windows(force([raiders],...all),'000008969006')).toEqual([['Shooting','own','during'],['Fight','own','during']]);
  expect(windows(force([huron],...all),'000010689005')).toEqual([['Fight','own','during']]);
  expect(windows(force([cabal],...all),'000010152003')).toEqual([['Shooting','own','start']]);
  expect(windows(force([huron],...all),'000010689007')).toEqual([['Fight','opponent','end']]);
  expect(windows(force([dread],...all),'000008973007')).toEqual([['Movement','opponent','end']]);
  expect(by(force([warpstrike],...all),'000010740003')[0].summary).toMatch(/until turn end/);
  expect(by(force([warpstrike],...all),'000010740003')[0].summary).toMatch(/Empyric Dislocation/);
 });
});

describe('CSM formations, physical bearers and conditional attack windows',()=>{
 it('gates Pactbound benefits and upgrades on actual valid selected marks',()=>{
  let a=force([pact],lord,'Sorcerer',legion);a=edit(a,lord,{csmMark:'Nurgle'});a=edit(a,legion,{csmMark:'Khorne'});
  expect(eligibleCsmUpgrades(a,lord,id(lord)).map(u=>u.name)).toEqual(['Orbs of Unlife']);
  const printed=named(a,'Marks of Chaos').find(r=>r.window==='Pre-battle')!.summary;
  expect(printed).toContain(id(lord)+': Nurgle');expect(printed).toContain(id('Sorcerer')+': Chaos Undivided');expect(printed).toContain(id(legion)+': Khorne');
  expect(named(a,'Marks of Chaos').find(r=>r.window==='Shooting')?.units).toEqual([id(lord),id('Sorcerer')]);
  expect(named(a,'Marks of Chaos').find(r=>r.window==='Fight')?.units).toEqual([id('Sorcerer'),id(legion)]);
  const invalid=edit(a,'Sorcerer',{csmMark:'Khorne'});
  expect(eligibleCsmUpgrades(invalid,'Sorcerer',id('Sorcerer')).some(u=>u.name==='Talisman of Burning Blood')).toBe(false);
  expect(named(a,'Marks of Chaos').some(r=>r.window==='Movement')).toBe(false);
 });
 it('uses Cult allies actual Heretic Astartes weapons without granting Dark Pacts',()=>{
  const a=force([raiders],'Khorne Berzerkers','Rubric Marines','Plague Marines','Noise Marines');
  expect(named(a,'Raiders and Reavers').find(r=>r.window==='Shooting')?.units).toEqual(a.instances!.map(s=>s.id));
  expect(named(a,'Raiders and Reavers · snap shooting')[0].units).toEqual(a.instances!.map(s=>s.id));
  const b=force([cabal],'Rubric Marines');expect(named(b,'Empyric Wellspring')).toEqual([]);
 });
 it('suppresses Dark Pact triggers for legal Renegade combinations',()=>{
  const a=equip(force([renegade,devotees],smith,'Havocs','Obliterators'),smith,'Pact of Destruction');
  expect(by(a,'000010985002')).toEqual([]);expect(by(a,'000010984002')).toEqual([]);
  expect(named(a,'Rain of Ruin').length).toBeGreaterThan(0);
  expect(named(force([renegade,cabal],'Sorcerer',prince),'Empyric Wellspring')).toEqual([]);
  expect(by(force([renegade,cabal],'Sorcerer'),'000010152003').length).toBeGreaterThan(0);
 });
 it('separates Cypher normal return fire from end-Movement snap shooting',()=>{
  const a=force([nightmare],'Cypher',legion,'Chaos Spawn');
  const reaction=named(a,'Terror Made Manifest · reaction shooting');
  expect(reaction).toHaveLength(1);expect(reaction[0]).toMatchObject({window:'Shooting',turn:'opponent',units:[id('Cypher')]});
  expect(reaction[0].summary).toMatch(/Guns Blazing/);
  const snap=named(a,'Terror Made Manifest · snap shooting')[0];
  expect(snap).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(snap.units).not.toContain(id('Chaos Spawn'));expect(snap.summary).toMatch(/retain \+1 to Wound.*ignores the Hit modifier/);
  expect(rows(a).some(r=>r.title.includes('snap shooting')&&r.window==='Charge')).toBe(false);
  expect(named(force([veterans],'Cypher'),'Focus of Hatred · reaction shooting')[0].units).toEqual([id('Cypher')]);
 });
 it('uses Psyker-unit eligibility while keeping Touched personal to the bearer',()=>{
  let a=force([arkifane,cabal],lord,apostle,legion,chosen,masters);
  a=join(join(join(a,lord,legion),masters,legion),apostle,chosen);
  a=equip(equip(a,lord,'Cybinfernal Font'),apostle,'Touched by the Warp');
  expect(named(a,'Empyric Wellspring').find(r=>r.window==='Shooting')?.units).toEqual([id(legion),id(chosen)]);
  expect(csmKeywords(a,unit(a,apostle),'Dark Apostle').has('PSYKER')).toBe(true);
  expect(csmKeywords(a,unit(a,apostle),'Dark Disciple').has('PSYKER')).toBe(false);
  expect(csmKeywords(a,unit(a,legion)).has('DAEMON')).toBe(false);
  for(const r of by(a,'000010151002'))expect(r.units).toEqual([id(apostle)]);
  expect(by(a,'000010151002')[0].summary).toMatch(/Companion models such as Dark Disciples.*neither personal grant/);
  expect(by(a,'000010151002')[0].summary).toMatch(/ignore any or all Ballistic Skill, Weapon Skill and Hit-roll modifiers.*does not change fixed snap-shooting accuracy/);
  expect(eligibleCsmUpgrades(edit(force([cabal],prince),prince,{csmMark:'Khorne'}),prince,id(prince))).toEqual([]);
 });
 it('removes Font unit keywords and protection after its actual bearer is removed',()=>{
  let a=join(join(force([arkifane],lord,legion,masters,'Chaos Predator Annihilator'),lord,legion),masters,legion);a=equip(a,lord,'Cybinfernal Font');
  expect(named(a,'Soul Forge Boons · 5+ invulnerable save')[0].units).toContain(id(legion));
  expect(by(a,'000010744003')[0].units).toContain(id(legion));
  const alive=a.instances!.filter(s=>s.unit!==lord);
  expect(named(a,'Soul Forge Boons · 5+ invulnerable save',alive)[0].units).toEqual([id('Chaos Predator Annihilator')]);
  expect(by(a,'000010744003',alive)[0].units).not.toContain(id(legion));
  expect(csmKeywords(a,unit(a,masters),'Garlon Souleater',alive).has('SOUL FORGE')).toBe(false);
 });
 it('keeps surviving attached leaders together when a Bodyguard is destroyed',()=>{
  let a=join(join(force([arkifane],lord,legion,masters),lord,legion),masters,legion);a=equip(a,lord,'Cybinfernal Font');
  const alive=a.instances!.filter(s=>s.unit!==legion);
  expect(csmFormations(a,alive)).toHaveLength(1);
  expect(csmKeywords(a,unit(a,masters),'Garlon Souleater',alive).has('SOUL FORGE')).toBe(true);
  expect(named(a,'Soul Forge Boons · 5+ invulnerable save',alive)[0].units).toEqual([id(lord)]);
 });
 it('does not confuse Mark of the Soul Forges with a Soul Forge keyword grant',()=>{
  const a=equip(join(force([arkifane],lord,legion),lord,legion),lord,'Mark of the Soul Forges');
  expect(csmKeywords(a,unit(a,lord)).has('SOUL FORGE')).toBe(false);
  expect(named(a,'Soul Forge Boons · 5+ invulnerable save')).toEqual([]);
  expect(by(a,'000010743004').every(r=>r.units?.length===1&&r.units[0]===id(lord))).toBe(true);
  expect(by(a,'000010743004').some(r=>r.window==='Movement')).toBe(false);
 });
 it('limits personal weapon effects to a gunless actual bearer rather than Bodyguard guns',()=>{
  const a=gunless(equip(join(force([fellhammer],lord,legion),lord,legion),lord,'Iron Artifice'));
  expect(by(a,'000008976003').map(r=>[r.window,r.units])).toEqual([['Fight',[id(lord)]]]);
  const b=equip(join(force([cabal],commune,cult),commune,cult),commune,'Touched by the Warp');
  expect(by(b,'000010151002').every(r=>r.units?.every(u=>u===id(commune)))).toBe(true);
 });
 it('distinguishes personal FNP from whole-unit invulnerable saves',()=>{
  const a=equip(join(force([murdertalon],jump,'Raptors'),jump,'Raptors'),jump,'Shadowcowl Talisman');
  expect(by(a,'000010988002').every(r=>r.units?.[0]===id('Raptors'))).toBe(true);
  expect(by(a,'000010988002')[0].summary).toMatch(/Every model.*including attached Bodyguards/);
  const b=equip(join(force([bile],lord,legion),lord,legion),lord,'Living Carapace');
  expect(by(b,'000009773003').every(r=>r.units?.[0]===id(lord))).toBe(true);
  expect(by(b,'000009773003').map(r=>r.window)).toContain('Charge');
 });
 it('uses all physical models for Cultist’s Brand and limits Incendiary Goad to Damned models',()=>{
  const a=equip(join(force([chaosCult],apostle,cult),apostle,cult),apostle,'Cultist’s Brand');
  expect(by(a,'000008981003')).toHaveLength(2);
  const b=equip(join(force([chaosCult],apostle,legion),apostle,legion),apostle,'Cultist’s Brand');
  expect(by(b,'000008981003')).toEqual([]);
  const c=equip(a,apostle,'Incendiary Goad');
  expect(by(c,'000008981004')[0].summary).toMatch(/only its actual Damned models.*Dark Apostle and Dark Disciples do not become Damned/);
 });
 it('requires a different actual Damned formation for Mortal Thralls',()=>{
  const a=join(force([chaosCult],apostle,cult),apostle,cult);expect(by(a,'000008982007')).toEqual([]);
  const b=join(force([chaosCult],apostle,cult,legion),apostle,cult);
  expect(by(b,'000008982007')[0].units).toEqual([id(legion)]);
  expect(by(b,'000008982007')[0].summary).toMatch(/different friendly Damned formation.*3″.*visible to both/);
 });
 it('checks whole attached transport capacity before offering disembark effects',()=>{
  let a=join(join(force([raiders],lord,masters,legion,rhino),lord,legion),masters,legion);
  expect(by(a,'000008969006')[0].units).toContain(id(legion));
  let b=join(join(force([raiders],apostle,masters,chosen,rhino),apostle,chosen),masters,chosen);
  expect(by(b,'000008969006')).toEqual([]);
  const c=equip(join(force([huron],lord,legion,rhino),lord,legion),lord,'Raid Leader');
  expect(by(c,'000010688003')[0].summary).toMatch(/assault disembark.*wholly within 3″.*must not have embarked.*no-charge restriction/);
  expect(by(equip(force([huron],lord),lord,'Raid Leader'),'000010688003')).toEqual([]);
 });
 it('restricts Deep Strike upgrades to actual bearers with Deep Strike',()=>{
  const a=force([warpstrike],lord,termLord,jump,wing,legion);
  expect(eligibleCsmUpgrades(a,lord,id(lord)).map(u=>u.name)).toEqual(['Infernal Fulgurite']);
  for(const u of [termLord,jump,wing])expect(eligibleCsmUpgrades(a,u,id(u)).map(x=>x.name)).toContain('Akshur’s Binding Runes');
  expect(csmHasDeepStrike(a,unit(a,lord))).toBe(false);
  const b=equip(a,termLord,'Akshur’s Binding Runes');
  expect(by(b,'000010739004').filter(r=>r.window==='Movement').every(r=>r.turn==='own')).toBe(true);
  expect(by(b,'000010739004')[0].summary).toMatch(/does not.*first-round Rapid Ingress/);
 });
 it('propagates actual Scout grants across the whole attached formation',()=>{
  const a=equip(join(force([raiders],lord,legion),lord,legion),lord,'Mark of the Hound');
  for(const s of a.instances!)expect(csmScoutRange(a,s)).toBe(6);
  expect(csmScoutRange(a,unit(a,legion),[unit(a,legion)])).toBe(0);
  const b=equip(join(force([chaosCult],commune,accursed),commune,accursed),commune,'Warped Foresight');
  for(const s of b.instances!)expect(csmScoutRange(b,s)).toBe(6);
  const c=equip(join(force([nightmare],jump,talons),jump,talons),jump,'Sorrowscent Vulture');
  expect(csmFormations(c)).toHaveLength(1);for(const s of c.instances!)expect(csmScoutRange(c,s)).toBe(6);
 });
 it('keeps Eager for Bloodshed personal and Deceptors an optional declaration',()=>{
  const a=equip(force([huron],apostle),apostle,'Eager for Bloodshed');expect(csmHasInfiltrators(a,unit(a,apostle))).toBe(false);
  const b=equip(force([huron],lord),lord,'Eager for Bloodshed');expect(csmHasInfiltrators(b,unit(b,lord))).toBe(true);
  const c=force([deceptors],legion,cult,chosen);expect(csmHasInfiltrators(c,unit(c,legion))).toBe(false);
  expect(named(c,'Masters of Misdirection')[0].units).toEqual([id(legion),id(cult)]);
 });
 it('distinguishes Dread Talons end-turn thrusters from Nightmare end-Fight thrusters',()=>{
  const a=equip(force([dread],jump),jump,'Warp-fuelled Thrusters'),b=equip(force([nightmare],jump),jump,'Warp-fuelled Thrusters');
  expect(windows(a,'000008972004')).toEqual([['End of opponent turn','opponent','end']]);
  expect(windows(b,'000010641003')).toEqual([['Fight','opponent','end']]);
 });
 it('keeps Fabius optional and distinguishes the two half-strength conditions',()=>{
  const a=force([bile],legion);expect(named(a,'Experimental Augmentations')[0].summary).toMatch(/If Fabius Bile is your Warlord.*not compulsory.*including after his destruction/);
  expect(named(force([nightmare],legion),'Terror Made Manifest').find(r=>r.window==='Shooting')!.summary).toContain('strictly less than half');
  expect(named(force([murdertalon],jump),'Prey on the Weak')[0].summary).toContain('Exactly half qualifies');
 });
 it('allows a gunless Psyker to use Fleshy Curse but not shooting-dependent effects',()=>{
  const a=gunless(equip(force([cabal],lord),lord,'Touched by the Warp'));
  expect(by(a,'000010152003')[0].units).toEqual([id(lord)]);
  expect(by(a,'000010152004')).toEqual([]);expect(named(a,'Empyric Wellspring')).toEqual([]);
 });
 it('preserves chosen timed benefits after their source is destroyed',()=>{
  const a=equip(force([soulforged],smith,'Forgefiend'),smith,'Forge’s Blessing');
  const alive=a.instances!.filter(s=>s.unit!==smith);
  expect(by(a,'000008985002',alive).length).toBe(5);
  expect(by(a,'000008985002',alive).every(r=>r.units?.[0]===id('Forgefiend')&&r.summary.includes('including if that bearer has since been destroyed'))).toBe(true);
  const b=equip(join(force([renegade],termLord,'Chaos Terminator Squad'),termLord,'Chaos Terminator Squad'),termLord,'Fratricidal Trophies');
  const survivors=b.instances!.filter(s=>s.unit!==termLord);
  expect(by(b,'000010694004',survivors).some(r=>r.summary.includes('already-triggered benefit survives'))).toBe(true);
 });
 it('checks Soul Link sources and exposes copied abilities conditionally on the actual bearer',()=>{
  const a=equip(join(join(force([deceptors],lord,moe,legion,'Sorcerer',apostle,'Abaddon The Despoiler','Bloodletters'),lord,legion),moe,legion),lord,'Soul Link');
  const sourceIds=csmSoulLinkSources(a,unit(a,lord)).map(s=>s.id);
  expect(sourceIds).toContain(id(moe));expect(sourceIds).toContain(id('Sorcerer'));expect(sourceIds).toContain(id(apostle));
  expect(sourceIds).not.toContain(id(lord));expect(sourceIds).not.toContain(id('Abaddon The Despoiler'));expect(sourceIds).not.toContain(id('Bloodletters'));
  const selected=by(a,'000008964005')[0];expect(selected.summary).toMatch(/including Core and Faction.*off-battlefield.*attachment permissions.*persisting effects/);
  expect(rows(a).some(r=>r.summary.includes('Soul Link')&&r.summary.includes('Sorcerer'))).toBe(true);
 });
 it('uses current Stealth cover and all-model Lone Operative conditions',()=>{
  const a=equip(force([dread],lord),lord,'Night’s Shroud');
  expect(by(a,'000008972003')[0].summary).toMatch(/Benefit of Cover.*including incoming snap shooting/);
  expect(by(a,'000008972003').some(r=>r.window==='Fight')).toBe(false);
  const b=equip(join(force([deceptors],lord,legion),lord,legion),lord,'Shroud of Obfuscation');
  expect(by(b,'000008964004')[0].summary).toMatch(/every surviving model.*including in an Attached unit/);
  expect(by(b,'000008964004')[0].summary).not.toContain('not an Attached unit');
  const c=equip(force([nightmare],lord),lord,'Greyveil Hex');
  expect(by(c,'000010641002')[0].summary).toMatch(/Benefit of Cover.*18″.*incoming snap shooting/);
 });
 it('requires actual Hit rolls for Critical Hit and Hit-re-roll-only benefits',()=>{
  const a=force([fellhammer],'Cultist Firebrand');
  expect(by(a,'000008977004')).toEqual([]);
  expect(by(a,'000008977005').length).toBeGreaterThan(0);
 });
 it('offers conditional Cabal Psyker rules for a legal Soul Link combination',()=>{
  const a=equip(join(force([deceptors,cabal],lord,legion,'Sorcerer'),lord,legion),lord,'Soul Link');
  expect(csmKeywords(a,unit(a,lord)).has('PSYKER')).toBe(false);
  const well=named(a,'Empyric Wellspring').find(r=>r.window==='Shooting')!;
  expect(well.units).toContain(id(legion));expect(well.summary).toMatch(/only while Soul Link has actually been used/);
  for(const source of ['000010152002','000010152003','000010152004']){expect(by(a,source)[0].units).toContain(id(legion));expect(by(a,source)[0].summary).toContain('temporary PSYKER grant remains active');}
 });
 it('does not advertise unselected wargear weapons as enhanced bearer attacks',()=>{
  const kit=csmLoadout(lord,1)!;
  const slot=kit.slots.find(s=>s.choices.some(c=>c.items.includes('Plasma pistol')));
  expect(slot).toBeDefined();
  const choice=slot!.choices.find(c=>c.items.includes('Plasma pistol'))!;
  const a=edit(equip(force([fellhammer],lord),lord,'Warp Tracer'),lord,{knightGear:{[slot!.name]:choice.name}});
  expect(by(a,'000008976005')).toHaveLength(1);expect(by(a,'000008976005')[0]).toMatchObject({window:'Shooting',turn:'own',units:[id(lord)]});
  expect(by(a,'000008976005')[0].summary).toContain('own attacks');
 });
});
