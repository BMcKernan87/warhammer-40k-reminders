import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {THOUSAND_SONS_SHEETS} from '../src/thousand-sons-data.generated';
import {eligibleThousandSonsUpgrades} from '../src/thousand-sons-detachment-data';
import {thousandSonsDetachmentReminders as generate} from '../src/thousand-sons-detachments';
import {thousandSonsRitualReminders} from '../src/thousand-sons-rituals';
import type {RosterInstance} from '../src/roster-instances';
const change='Changehost of Deceit',grand='Grand Coven',hex='Hexwarp Thrallband',regen='Ritual of Regeneration',rub='Rubricae Phalanx',sek='Sekhetar Cohort',serv='Servants of Change',forged='Warpforged Cabal',pact='Warpmeld Pact';
const s='Sorcerer',sh='Tzaangor Shaman',ex='Exalted Sorcerer',dp='Daemon Prince of Tzeentch',rm='Rubric Marines',scarab='Scarab Occult Terminators',goat='Tzaangors',spawn='Chaos Spawn',rb='Sekhetar Robots',lord='Lord of Change',horror='Pink Horrors',rhino='Chaos Rhino',beast='Mutalith Vortex Beast';
const id=(u:string,n=1)=>u+'#'+n;
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Thousand Sons'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1)}))};
}
const edit=(a:ArmySelection,u:string,p:Partial<RosterInstance>)=>({...a,instances:a.instances?.map(x=>x.id===id(u)?{...x,...p}:x)});
const equip=(a:ArmySelection,u:string,upgrade:string)=>({...a,upgrades2026:{[id(u)]:upgrade}});
const by=(a:ArmySelection,key:string)=>generate(a).filter(r=>r.sourceRuleId===key);
const named=(a:ArmySelection,title:string)=>generate(a).filter(r=>r.title===title);
describe('Thousand Sons detachment effects',()=>{
 it('enforces the two Mutant detachments and both dispositions for the 3DP formations',()=>{
  expect(detachmentBudget('Thousand Sons',[serv,pact],'Strike Force').valid).toBe(false);
  expect(detachmentBudget('Thousand Sons',[hex],'Incursion')).toMatchObject({spent:3,valid:true,dispositions:['Take and Hold','Reconnaissance']});
  expect(detachmentBudget('Thousand Sons',[rub],'Strike Force').dispositions).toEqual(['Take and Hold','Priority Assets']);
  expect(eligibleThousandSonsUpgrades(force([change],lord),lord).map(u=>u.name)).toEqual(['Nethershriek Mind-eater','Duplicitous Malediction']);
  expect(eligibleThousandSonsUpgrades(force([serv],spawn),spawn)[0]).toMatchObject({points:10,repeatable:true});
 });
 it('pairs native Psykers with eligible Legions, including the September 12-inch charge reaction',()=>{
  const a=force([change],lord,horror,rm,rhino,'Knight Despoiler');
  expect(named(a,'Infernal Pacts · Daemonic Illusions')[0].units).toEqual([id(rm)]);
  expect(by(a,'000010198006')[0]).toMatchObject({window:'Charge',turn:'opponent',timing:'start',units:[id(rm),id(lord),id(horror)]});
  expect(by(a,'000010198006')[0].summary).toContain('12″');
  expect(by(force([change],rm),'000010198003')).toHaveLength(0);
  expect(by(force([change],lord,horror),'000010198004')[0].summary).not.toContain('up to 6″ instead');
  expect(by(a,'000010198005')[0].units).toEqual([id(horror)]);
 });
 it('uses only eligible native Ritual models for Arcane Focus, actual Psychic weapons for Devastating Sorcery and physical role for Destined by Fate',()=>{
  const a=force([grand],rm,scarab,rhino,lord);
  expect(by(a,'000010194006')[0].units).toEqual([id(rm),id(scarab)]);
  expect(by(a,'000010194003')[0].summary).toContain('Rubric Marines#1 (Aspiring Sorcerer only)'.replace(' only',''));
  expect(by(a,'000010194003')[0].summary).toContain('Scarab Occult Sorcerer');
  expect(by(a,'000010194007')[0].units).not.toContain(id(rhino));
  expect(named(a,'Kindred Sorcery')[0].summary).toContain('once per battle');
 });
 it('uses the real Flow areas and applies a selected Noctilith Mantle to the complete legal formation',()=>{
  const a=edit(equip(force([hex],s,rm,scarab),s,'Noctilith Mantle'),s,{attachedTo:id(rm)});
  expect(named(a,'Flow of Magic · determine areas')).toHaveLength(5);
  expect(named(a,'Noctilith Mantle · Psychic attacks').find(r=>r.window==='Shooting')?.units).toEqual([id(rm)]);
  expect(named(a,'Flow of Magic · Psychic attacks')[0].units).not.toContain(id(rm));
  expect(by(a,'000009742007')[0].summary).toContain('Rubric Marines#1');
  const veil=by(a,'000009742005')[0];
  expect(veil).toMatchObject({window:'Movement',turn:'own',timing:'start'});
  expect(veil.summary).toMatch(/Rubric Marines gain Deep Strike.*more than 6″.*cannot charge/);
  expect(by(force([hex],rm),'000009742005')[0].summary).not.toContain('cannot charge');
 });
 it('uses the current 1CP/Strength 5 inferno profiles and does not apply Implacable Guardians to the aspiring Psyker',()=>{
  const a=force([rub],s,rm,rhino);
  const str=by(a,'000010206004')[0];
  expect(str.title).toContain('1CP');
  expect(str.summary).toMatch(/Strength 5.*Inferno boltgun/);
  expect(str.units).not.toContain(id(rhino));
  const guard=by(a,'000010206006')[0];
  expect(guard).toMatchObject({window:'Shooting',turn:'opponent',units:[id(rm)]});
  expect(guard.summary).toContain('non-Psyker models');
 });
 it('requires a real Psyker aura for Robots and Vehicles while preserving Warpfire’s default one-roll choice',()=>{
  const empty=force([forged,sek],rb,rhino);
  expect(by(empty,'000010210006')).toHaveLength(0);
  expect(by(empty,'000010969004')).toHaveLength(0);
  expect(named(empty,'Warpfire Infusion')[0].summary).not.toContain('one of each');
  const a=force([forged,sek],rb,rhino,rm);
  expect(by(a,'000010210006')[0].title).toContain('2CP');
  expect(by(a,'000010210006')[0].summary).toContain('Rubric Marines#1');
  expect(named(a,'Ensorcelled Animus').find(r=>r.window==='Fight')?.summary).toContain('12″');
  expect(named(a,'Warpfire Infusion · Deadly Demise')[0].units).toContain(id(rhino));
 });
 it('uses actual Mutant ranges, affected physical models and the going-second turn-one restriction',()=>{
  const a=edit(force([pact],sh,goat,beast),sh,{attachedTo:id(goat)});
  expect(named(a,'Warpmeld Pact · Tzaangors')[0].units).toEqual([id(goat)]);
  expect(by(a,'000010202007')[0].summary).toMatch(/does not permit a first-turn arrival.*8″.*6″/);
  expect(by(force([pact],goat),'000010202007')[0].summary).not.toContain('8″');
  expect(by(a,'000010202006')[0].summary).toContain('later in the turn');
  expect(by(a,'000010202005')[0].units).toEqual([id(sh)]);
  expect(by(force([pact],sh),'000010202005')).toHaveLength(0);
 });
 it('includes newly attached Characters when infiltrating the chosen Rubricae and offers the correct form count',()=>{
  const a=equip(force([rub],s,rm,rm,scarab),s,'Risen Rubricae');
  const row=by(a,'000010205002')[0];
  expect(row.summary).toMatch(/two different.*one other.*including Characters subsequently attached/);
  expect(row.units).toEqual([id(rm),id(rm,2),id(scarab)]);
  expect(by(equip(force([rub],s,scarab),s,'Risen Rubricae'),'000010205002')[0].units).toEqual([id(scarab)]);
 });
 it('prints a single healing cue with the Curse rider instead of offering a second D3 roll',()=>{
  const a=equip(force([regen],s,dp),s,'Curse of Life');
  expect(by(a,'000010964003')[0].units).toEqual([id(s)]);
  expect(named(a,'Sorcerous Invigoration')).toHaveLength(0);
  expect(named(force([regen],rm,dp),'Sorcerous Invigoration')[0].units).toEqual([id(rm)]);
 });
 it.each([
  [change,lord,'Nethershriek Mind-eater','Shooting','3 mortal'],[change,lord,'Duplicitous Malediction','Pre-battle','three friendly'],
  [change,s,'Tome of True Names','Fight','2+ invulnerable'],[grand,s,'Eldritch Vortex of E’taph','Shooting','1 Damage'],
  [grand,s,'Umbralefic Crystal','Movement','including in turn one'],[hex,s,'Arcane Might','Fight','2 Strength'],
  [hex,'Infernal Master','Empowered Manifestation','Shooting','Hazardous'],[hex,s,'Empyric Onslaught','Shooting','3 Attacks'],
  [hex,s,'Noctilith Mantle','Shooting','may use Rituals'],[regen,s,'Curse of Life','Shooting','add 3'],
  [regen,s,'Eruption of Vitality','Charge','Starting Strength 1'],[rub,s,'Arcane Thralls','Charge','9″'],
  [rub,s,'Lord of the Rubricae','Shooting','Rubricae models'],[rub,s,'Risen Rubricae','Pre-battle','Infiltrators'],
  [rub,s,'The Stave Abominus','Fight','Sustained Hits D3'],[sek,s,'Occulus Infernum','Movement','Ballistic Skill'],
  [sek,s,'Walking Rampart','Shooting','Lone Operative'],[serv,spawn,'Thicket of Bladed Bone','Fight','Cleave 1'],
  [serv,sh,'Unravelled Fates','Movement','recovers'],[forged,s,'Biomechanical Mutation','Command','D3 wounds'],
  [forged,s,'The Perplexing Cloak','Shooting','Lone Operative'],[pact,s,'Bray Lord','Pre-battle','Scouts 6″'],
  [pact,sh,'Diamond of Distortion','Fight','incoming Hit'],[pact,sh,'Flowing Flesh','Charge','Feel No Pain 4+'],
 ])('resolves actual %s effects from the fitted %s bearer – %s',(det,bearer,pick,phase,body)=>{
  let a=force([det],...new Set([bearer,s,rm,rb,scarab,goat,sh,rhino]));
  a=edit(edit(a,s,{attachedTo:id(rm)}),sh,{attachedTo:id(goat)});
  const option=eligibleThousandSonsUpgrades(a,bearer,id(bearer)).find(u=>u.name===pick)!;
  expect(option,pick).toBeDefined();
  const cards=by(equip(a,bearer,pick),option.id);
  expect(cards.find(r=>r.window===phase)?.summary,pick).toContain(body);
  expect(by(a,option.id)).toHaveLength(0);
 });
 it.each([
  [forged,s,'Warp Syphon','extra die'],[grand,s,'Lord of Forbidden Lore','6″'],[pact,sh,'Warpmeld Dagger','mortal wounds'],
  [change,s,'Diabolic Savant','add 1 to the test'],[grand,ex,'Incandaeum','Doombolt'],[forged,s,'Warp-cursed Runemaster','6″'],
 ])('places the %s caster’s %s upgrade %s in the actual Ritual sequence',(det,bearer,enhancement,text)=>{
  const a=equip(force([det],bearer,rhino,horror),bearer,enhancement);
  expect(eligibleThousandSonsUpgrades(a,bearer).some(u=>u.name===enhancement)).toBe(true);
  expect(thousandSonsRitualReminders(a).some(r=>r.summary.includes(text))).toBe(true);
 });
 it('exercises all 45 Stratagems in nine detachments, on genuine formations with no duplicate per-phase cards',()=>{
  for(const [det,count] of [[change,6],[grand,6],[hex,6],[regen,3],[rub,6],[sek,3],[serv,3],[forged,6],[pact,6]] as const){
   const a=force([det],...THOUSAND_SONS_SHEETS.map(s=>s.unit)),out=generate(a);
   const strats=out.filter(r=>r.id.startsWith('11e-ts-strat-'));
   expect(new Set(strats.map(r=>r.sourceRuleId)).size,det).toBe(count);
   expect(strats.every(r=>r.units?.length&&r.turn&&r.title.includes('CP')&&r.summary.length>30)).toBe(true);
   expect(new Set(out.map(r=>r.id)).size,det).toBe(out.length);
  }
 });
});
