import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {createBattle,PHASES} from '../src/engine';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
import {battlefieldReminders,changeRosterWounds,observe,useBattlefieldAbility} from '../src/necron-battlefield';

const army=(...instances:RosterInstance[])=>({...newSelection('Necrons'),instances});
const card=(name:string)=>'https://wahapedia.ru/wh40k11ed/factions/necrons/'+name;

// Checked against the current Necrons card transcriptions and the full 2026-11-23
// source export, not inferred from weapon names or earlier-edition cards:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Chronomancer
// https://wahapedia.ru/wh40k11ed/factions/necrons/Overlord
// https://wahapedia.ru/wh40k11ed/factions/necrons/The-Silent-King
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// Core 15.08–15.09 (normal reactions are not automatically snap shooting):
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Source terminology discrepancy: the Deathmarks card still calls the arrival
// window the "Reinforcements step"; Core 09/20.04 uses ingress in Move Units.
describe('source-reconciled intrinsic attack windows',()=>{
 it('keeps Aeonstave Blast on each living Chronomancer’s ranged weapon, including Overwatch',()=>{
  const a=army({id:'body',unit:'Immortals'},{id:'chrono',unit:'Chronomancer',attachedTo:'body'},{id:'other',unit:'Chronomancer'});
  const reminders=necronDatasheetReminders2026(a);
  const blast=reminders.filter(r=>r.title.includes('weapon abilities')&&r.summary.includes('Aeonstave'));
  expect(blast).toHaveLength(4);
  for(const id of ['chrono','other']){
   expect(blast.filter(r=>r.units?.includes(id))).toMatchObject([
    {window:'Shooting',units:[id],source:card('Chronomancer'),summary:expect.stringContaining('Blast')},
    {window:'Movement',timing:'end',turn:'opponent',units:[id],summary:expect.stringContaining('Blast')},
   ]);
  }
  expect(blast.some(r=>r.window==='Fight'||r.units?.includes('body'))).toBe(false);
  const surviving=necronDatasheetReminders2026(a,expandRoster(a).filter(s=>s.id!=='chrono'));
  expect(surviving.filter(r=>r.summary.includes('Aeonstave')).map(r=>r.units)).toEqual([['other'],['other']]);
 });

 it('carries a tachyon arrow into end-of-Movement Overwatch only for its equipped Overlord',()=>{
  const a=army({id:'arrow',unit:'Overlord',equipment:'Tachyon arrow and Overlord’s blade'},
   {id:'staff',unit:'Overlord',equipment:'Staff of light'},{id:'scythe',unit:'Overlord',equipment:'Voidscythe'});
  const arrows=necronDatasheetReminders2026(a).filter(r=>r.title.includes('Tachyon Arrow'));
  expect(arrows).toMatchObject([
   {window:'Shooting',units:['arrow'],source:card('Overlord')},
   {window:'Movement',timing:'end',turn:'opponent',units:['arrow']},
  ]);
  expect(arrows.every(r=>r.summary.includes('once per battle')&&r.summary.includes('returning that bearer'))).toBe(true);
  expect(necronDatasheetReminders2026(a,expandRoster(a).filter(s=>s.id!=='arrow')).some(r=>r.title.includes('Tachyon Arrow'))).toBe(false);
 });

 it('shares the arrow’s one shot across Shooting and Overwatch without spending a second Overlord’s arrow',()=>{
  const a=army({id:'first',unit:'Overlord',equipment:'Tachyon arrow and Overlord’s blade'},
   {id:'second',unit:'Overlord',equipment:'Tachyon arrow and Overlord’s blade'});
  const action={action:'overwatch',squadId:'first'} as const;
  const battle=observe(a,{...createBattle(),phase:'Movement',player:'B'},action);
  const arrow=battlefieldReminders(a,battle,'overwatch',action).find(r=>r.ruleId==='tachyon')!;
  expect(arrow).toMatchObject({squadId:'first',remaining:1});
  const spent=useBattlefieldAbility(a,battle,'overwatch',arrow);
  expect(battlefieldReminders(a,spent,'overwatch',action).some(r=>r.ruleId==='tachyon')).toBe(false);
  expect(battlefieldReminders(a,spent,'overwatch',{...action,squadId:'second'}).find(r=>r.ruleId==='tachyon')).toMatchObject({squadId:'second',remaining:1});
  const later={...spent,round:2,phase:'Shooting',player:'A'} as const;
  expect(battlefieldReminders(a,later,'shoot',{action:'shoot',squadId:'first'}).some(r=>r.ruleId==='tachyon')).toBe(false);
  const bearer=expandRoster(a)[0];
  const restored=changeRosterWounds(a,changeRosterWounds(a,later,bearer,0),bearer,6);
  expect(battlefieldReminders(a,restored,'shoot',{action:'shoot',squadId:'first'}).some(r=>r.ruleId==='tachyon')).toBe(false);
  expect(battlefieldReminders(a,{...battle,player:'A'},'overwatch',action)).toEqual([]);
  expect(battlefieldReminders(a,{...battle,phase:'Shooting'},'overwatch',action)).toEqual([]);
 });

 it('retains Szarekh’s damaged weapon Attacks during snap shooting without applying the reduction to Menhirs',()=>{
  const a=army({id:'king',unit:'The Silent King'},{id:'ark',unit:'Doomsday Ark'});
  const reminders=necronDatasheetReminders2026(a);
  const damaged=reminders.filter(r=>r.title.includes('Damaged profile')&&r.window==='Movement');
  expect(damaged).toMatchObject([{units:['king'],timing:'end',turn:'opponent',source:card('The-Silent-King')}]);
  expect(damaged[0].summary).toMatch(/Szarekh has 1–6 wounds.*halve the Attacks characteristic of Szarekh’s weapons/);
  expect(damaged[0].summary).toMatch(/Menhir weapon Attacks are unchanged.*ignores.*−1 Hit/);
  expect(reminders.filter(r=>r.title.endsWith(' · Triarchal Menhirs')).map(r=>r.window)).toEqual(PHASES);
  expect(necronDatasheetReminders2026(a,expandRoster(a).filter(s=>s.id!=='king')).some(r=>r.title.includes('Menhirs')||r.summary.includes('Szarekh'))).toBe(false);
 });

 it('distinguishes normal Hyperspace Hunters shooting from end-of-phase snap shooting and the Heavy phase condition',()=>{
  const a=army({id:'first',unit:'Deathmarks'},{id:'second',unit:'Deathmarks'});
  const reminders=necronDatasheetReminders2026(a);
  const hunters=reminders.filter(r=>r.title.endsWith(' · Hyperspace Hunters'));
  expect(hunters).toHaveLength(2);
  for(const r of hunters){
   expect(r).toMatchObject({window:'Movement',timing:'during',turn:'opponent',source:card('Deathmarks')});
   expect(r.summary).toMatch(/Once per turn.*enemy arrives from reserves in the opponent’s Movement phase.*18″.*normal reactive shooting, not snap shooting.*retain Precision.*Heavy bonus applies only in your Shooting phase/);
   expect(r.summary).not.toContain('End of the opponent’s Movement phase');
   expect(r.summary).not.toContain('Reinforcements step');
  }
  const overwatch=reminders.filter(r=>r.title.includes('Ranged weapon abilities')&&r.window==='Movement');
  expect(overwatch).toHaveLength(2);
  expect(overwatch.every(r=>r.timing==='end'&&r.summary.includes('Precision')&&!r.summary.includes('Heavy'))).toBe(true);
 });

 // Official September 30 v1.3 faction pack, pp.13 and 27: Harassment Swarm and
 // Infectious Murder-madness apply whenever the relevant model attacks.
 // https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
 it('carries Nekrosor’s Critical Hit aura into normal Deathmark reactions with independent range and target conditions',()=>{
  const a=army({id:'nekrosor',unit:'Nekrosor Ammentar'},{id:'first',unit:'Deathmarks'},
   {id:'second',unit:'Deathmarks'},{id:'immortals',unit:'Immortals'},{id:'shard',unit:'Transcendent C’tan'});
  const cue=(surviving=expandRoster(a))=>necronDatasheetReminders2026(a,surviving).filter(r=>r.title.includes('Infectious Murder-madness')&&r.window==='Movement');
  expect(cue()).toMatchObject([{timing:'during',turn:'opponent',units:['first','second'],summary:expect.stringMatching(/normal Hyperspace Hunters.*within 6″.*surviving Nekrosor.*Sustained Hits 1.*closest eligible enemy/)}]);
  expect(cue()[0].summary).toMatch(/Each Deathmarks unit.*separately.*Snap shooting.*no extra hits/);
  expect(cue()[0].summary).not.toContain('Reinforcements step');
  expect(cue(expandRoster(a).filter(s=>s.id!=='first'))[0].units).toEqual(['second']);
  expect(cue(expandRoster(a).filter(s=>s.unit!=='Deathmarks'))).toEqual([]);
  expect(cue(expandRoster(a).filter(s=>s.id!=='nekrosor'))).toEqual([]);
 });

 it('applies Harassment Swarm to normal enemy reactions without modifying snap hits or retaining a dead aura source',()=>{
  const a=army({id:'macrocytes',unit:'Canoptek Macrocytes'},{id:'other',unit:'Canoptek Macrocytes'});
  const cues=necronDatasheetReminders2026(a).filter(r=>r.title.includes('Harassment Swarm')&&r.window==='Movement');
  expect(cues.map(r=>r.units)).toEqual([['macrocytes'],['other']]);
  expect(cues.every(r=>r.turn==='either'&&r.timing==='during')).toBe(true);
  expect(cues[0].summary.startsWith('When an enemy makes a permitted normal reaction attack during Movement.')).toBe(true);
  expect(cues[0].summary).toMatch(/non-Monster, non-Vehicle.*within 3″.*surviving Macrocytes.*subtract 1.*normal reactive shooting.*Snap shooting.*ignores this Hit modifier/);
  const surviving=necronDatasheetReminders2026(a,expandRoster(a).filter(s=>s.id==='other')).filter(r=>r.title.includes('Harassment Swarm')&&r.window==='Movement');
  expect(surviving.map(r=>r.units)).toEqual([['other']]);
 });
});

// Duration/source separation: Core 01.02.02 (Persisting Rules Effects) and 19.04,
// plus the explicitly timed effects on these current cards:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Geomancer
// https://wahapedia.ru/wh40k11ed/factions/necrons/Obelisk
// https://wahapedia.ru/wh40k11ed/factions/necrons/Doom-Scythe
// https://wahapedia.ru/wh40k11ed/factions/necrons/Tomb-Blades
describe('already-applied intrinsic effects after source casualties',()=>{
 it('keeps conditional pin, pulse and duck-for-cover follow-ups after their source dies without granting new uses',()=>{
  const a=army({id:'geo',unit:'Geomancer'},{id:'obelisk',unit:'Obelisk'},{id:'scythe',unit:'Doom Scythe'},{id:'other',unit:'Immortals'});
  const reminders=necronDatasheetReminders2026(a,expandRoster(a).filter(s=>s.id==='other'));
  const pin=reminders.filter(r=>r.title.includes('Tectonic Reverberations'));
  expect(pin.map(r=>[r.window,r.turn])).toEqual([['Movement','either'],['Charge','either']]);
  expect(pin.every(r=>r.units?.[0]==='geo'&&r.summary.includes('previously pinned')&&r.summary.includes('until the start of your next Movement phase')&&r.summary.includes('Geomancer is destroyed'))).toBe(true);
  const pulse=reminders.filter(r=>r.title.includes('Gravitic Pulse'));
  expect(pulse.map(r=>r.window)).toEqual(['Movement','Charge','Fight']);
  expect(pulse.every(r=>r.timing==='during'&&r.units?.[0]==='obelisk'&&r.summary.includes('Obelisk'))).toBe(true);
  expect(pulse.find(r=>r.window==='Charge')?.summary).toMatch(/halve.*until turn end.*movement damage lasts until the start of your next Movement phase/);
  const duck=reminders.filter(r=>r.title.includes('Atavistic Instigation'));
  expect(duck.map(r=>r.window)).toEqual(['Shooting','Fight','Movement']);
  expect(duck.every(r=>r.turn==='either'&&r.summary.includes('previously ducked for cover')&&r.summary.includes('until the start of your next Shooting phase')&&r.summary.includes('Scythe is destroyed'))).toBe(true);
  expect(duck.find(r=>r.window==='Movement')?.summary).toMatch(/normal reactive attack.*Snap shooting.*ignores this Hit modifier/);
  expect(reminders.some(r=>r.title.endsWith(' · Tectonic Reverberations')||r.title.endsWith(' · Gravitic Pulse')||r.title.endsWith(' · Atavistic Instigation'))).toBe(false);
  expect(reminders.some(r=>r.title.startsWith('scythe · Ranged weapon')||r.title.startsWith('geo · Obelisk Node Control'))).toBe(false);
 });

 it('keeps independently identified duration sources but does not invent a prior effect for a newly supplied unit',()=>{
  const a=army({id:'first',unit:'Geomancer'},{id:'second',unit:'Geomancer'});
  const pin=necronDatasheetReminders2026(a,[]).filter(r=>r.title.includes('pinned'));
  expect(pin.map(r=>r.units)).toEqual([['first'],['first'],['second'],['second']]);
  const replaced=necronDatasheetReminders2026(a,[{id:'first',unit:'Technomancer'}]).filter(r=>r.title.includes('pinned'));
  expect(replaced.map(r=>r.units)).toEqual([['second'],['second']]);
  expect(necronDatasheetReminders2026(army(),[{id:'extra',unit:'Geomancer'}]).some(r=>r.title.includes('pinned'))).toBe(false);
 });

 it('keeps Chronometron’s charge lock on its surviving original formation after the Chronomancer dies',()=>{
  const a=army({id:'body',unit:'Immortals'},{id:'other',unit:'Immortals'},
   {id:'chrono',unit:'Chronomancer',attachedTo:'body'},{id:'thralls',unit:'Cryptothralls',retinueTo:'body'});
  const surviving=expandRoster(a).filter(s=>s.id!=='chrono');
  const reminders=necronDatasheetReminders2026(a,surviving);
  const lock=reminders.filter(r=>r.title.includes('Chronometron'));
  expect(lock).toMatchObject([{window:'Charge',turn:'own',units:['body'],summary:expect.stringMatching(/if it took the optional Normal move.*until turn end.*source is subsequently destroyed/)}]);
  expect(reminders.some(r=>r.title.includes('Timesplinter Mantle')||r.summary.includes('Aeonstave'))).toBe(false);
  const retinueOnly=necronDatasheetReminders2026(a,surviving.filter(s=>s.id!=='body')).filter(r=>r.title.includes('Chronometron'));
  expect(retinueOnly).toMatchObject([{window:'Charge',units:['thralls']}]);
  expect(necronDatasheetReminders2026(a,surviving.filter(s=>s.id==='other')).some(r=>r.title.includes('Chronometron'))).toBe(false);
 });

 it('does not transfer a charge lock through a changed identity, retinue link or illegal original attachment',()=>{
  const a=army({id:'body',unit:'Immortals'},{id:'other',unit:'Immortals'},
   {id:'chrono',unit:'Chronomancer',attachedTo:'body'},{id:'thralls',unit:'Cryptothralls',retinueTo:'body'});
  const lock=(surviving:RosterInstance[])=>necronDatasheetReminders2026(a,surviving).filter(r=>r.title.includes('Chronometron'));
  expect(lock([{id:'body',unit:'Necron Warriors'}])).toEqual([]);
  expect(lock([{id:'other',unit:'Immortals'},{id:'thralls',unit:'Cryptothralls',retinueTo:'other'}])).toEqual([]);
  expect(lock([{id:'body',unit:'Immortals'},{id:'chrono',unit:'Chronomancer',attachedTo:'other'}]).filter(r=>r.window==='Charge')).toEqual([]);
  const illegal=army({id:'blades',unit:'Tomb Blades'},{id:'chrono',unit:'Chronomancer',attachedTo:'blades'});
  expect(necronDatasheetReminders2026(illegal,[{id:'blades',unit:'Tomb Blades'}]).some(r=>r.title.includes('Chronometron'))).toBe(false);
  expect(necronDatasheetReminders2026(army({id:'blades',unit:'Tomb Blades'}),[]).some(r=>r.title.includes('Evasion Engrams'))).toBe(false);
 });

 // https://wahapedia.ru/wh40k11ed/factions/necrons/Triarch-Stalker
 it('retains only the already-selected Targeting Relay target until the same own Shooting phase ends',()=>{
  const a=army({id:'first',unit:'Triarch Stalker'},{id:'second',unit:'Triarch Stalker'},{id:'other',unit:'Immortals'});
  const surviving=expandRoster(a).filter(s=>s.id!=='first');
  const reminders=necronDatasheetReminders2026(a,surviving);
  const lasting=reminders.filter(r=>r.title.includes('Targeting Relay · selected target'));
  expect(lasting).toMatchObject([{window:'Shooting',turn:'own',timing:'during',units:['first'],source:card('Triarch-Stalker')}]);
  expect(lasting[0].summary).toMatch(/If this Triarch Stalker already selected an enemy it hit.*in this Shooting phase.*cannot have the Benefit of Cover until this phase ends.*Stalker is destroyed.*does not select a new target/);
  expect(reminders.filter(r=>r.title.endsWith(' · Targeting Relay')).map(r=>r.units)).toEqual([['second']]);
  expect(necronDatasheetReminders2026(a,[]).filter(r=>r.title.includes('Targeting Relay · selected target')).map(r=>r.units)).toEqual([['first'],['second']]);
  expect(necronDatasheetReminders2026(a,[{id:'first',unit:'Doomsday Ark'},...surviving]).some(r=>r.title.startsWith('first · Targeting Relay'))).toBe(false);
 });

 // Official v1.3 pack p.27 and https://wahapedia.ru/wh40k11ed/factions/necrons/Nekrosor-Ammentar
 it('preserves an already-selected Prophet buff on the original recipient formation after Nekrosor and its keyword source die',()=>{
  const a={...army({id:'nekrosor',unit:'Nekrosor Ammentar'},{id:'first',unit:'Lokhust Destroyers'},
   {id:'second',unit:'Lokhust Destroyers'},{id:'body',unit:'Immortals'},
   {id:'lord',unit:'Overlord',attachedTo:'body'},{id:'other',unit:'Immortals'}),
   detachments2026:['Cursed Legion'],upgrades2026:{lord:'Destroyer Ankh'}};
  const surviving=expandRoster(a).filter(s=>s.id!=='nekrosor'&&s.id!=='lord');
  const reminders=necronDatasheetReminders2026(a,surviving);
  const buff=reminders.filter(r=>r.title.includes('Prophet of Destruction · selected formation'));
  expect(buff.map(r=>r.window)).toEqual(['Movement','Shooting','Fight']);
  expect(buff.every(r=>r.units?.join(',')==='first,second,body')).toBe(true);
  expect(buff.every(r=>r.summary.includes('already selected one of these formations within 9″ after destroying an enemy unit in this phase')&&r.summary.includes('re-roll Wound rolls of 1 until this phase ends')&&r.summary.includes('Only the formation actually selected')&&r.summary.includes('no new selection'))).toBe(true);
  expect(reminders.some(r=>r.title.endsWith(' · Prophet of Destruction'))).toBe(false);
  const changed=necronDatasheetReminders2026(a,surviving.map(s=>s.id==='body'?{...s,unit:'Necron Warriors'}:s));
  expect(changed.filter(r=>r.title.includes('selected formation')).map(r=>r.units)).toEqual([['first','second'],['first','second'],['first','second']]);
  expect(necronDatasheetReminders2026(a,surviving.filter(s=>s.id==='other')).some(r=>r.title.includes('Prophet of Destruction'))).toBe(false);
  expect(necronDatasheetReminders2026(a).some(r=>r.title.includes('Prophet of Destruction · selected formation'))).toBe(false);
 });

 it('retains a selected Prophet effect after the recipient loses its Destroyer keyword while Nekrosor survives',()=>{
  const a={...army({id:'nekrosor',unit:'Nekrosor Ammentar'},{id:'destroyers',unit:'Lokhust Destroyers'},
   {id:'body',unit:'Immortals'},{id:'lord',unit:'Overlord',attachedTo:'body'},{id:'other',unit:'Immortals'}),
   detachments2026:['Cursed Legion'],upgrades2026:{lord:'Destroyer Ankh'}};
  const surviving=expandRoster(a).filter(s=>s.id!=='lord');
  const reminders=necronDatasheetReminders2026(a,surviving);
  const continuation=reminders.filter(r=>r.title.includes('Prophet of Destruction · selected formation'));
  expect(continuation.map(r=>[r.window,r.units])).toEqual([['Movement',['body']],['Shooting',['body']],['Fight',['body']]]);
  expect(continuation.every(r=>r.summary.includes('already selected one of these formations within 9″ after destroying an enemy unit in this phase')&&r.summary.includes('until this phase ends')&&r.summary.includes('formation loses its Destroyer Cult keyword')&&r.summary.includes('no new selection'))).toBe(true);
  const activation=reminders.filter(r=>r.title.endsWith(' · Prophet of Destruction'));
  expect(activation).toHaveLength(3);
  expect(activation.map(r=>r.units)).toEqual([['destroyers'],['destroyers'],['destroyers']]);
  const onlyFormerRecipient=necronDatasheetReminders2026(a,surviving.filter(s=>s.id!=='destroyers'));
  expect(onlyFormerRecipient.filter(r=>r.title.includes('Prophet of Destruction · selected formation')).map(r=>r.units)).toEqual([['body'],['body'],['body']]);
  expect(onlyFormerRecipient.some(r=>r.title.endsWith(' · Prophet of Destruction'))).toBe(false);
  const replaced=necronDatasheetReminders2026(a,surviving.map(s=>s.id==='body'?{...s,unit:'Necron Warriors'}:s));
  expect(replaced.some(r=>r.title.includes('Prophet of Destruction · selected formation'))).toBe(false);
 });

 // https://wahapedia.ru/wh40k11ed/factions/necrons/Trazyn-The-Infinite
 it('keeps previously secured Ancient Collector objectives after Trazyn or his entire original formation is lost',()=>{
  const a=army({id:'body',unit:'Immortals'},{id:'trazyn',unit:'Trazyn the Infinite',attachedTo:'body'},{id:'other',unit:'Immortals'});
  for(const surviving of [expandRoster(a).filter(s=>s.id!=='trazyn'),[]]){
   const reminders=necronDatasheetReminders2026(a,surviving);
   const secured=reminders.filter(r=>r.title.includes('Ancient Collector · secured objective'));
   expect(secured.map(r=>r.window)).toEqual(PHASES);
   expect(secured.every(r=>r.timing==='end'&&r.turn==='either'&&r.units?.join(',')==='trazyn')).toBe(true);
   expect(secured.every(r=>r.summary.includes('already secured an objective')&&r.summary.includes('while leading his formation at the end of your Command phase')&&r.summary.includes('until the opponent’s Level of Control is greater than yours at the end of a phase')&&r.summary.includes('does not secure a new one'))).toBe(true);
   expect(reminders.some(r=>r.title.endsWith(' · Ancient Collector')||r.title.endsWith(' · Surrogate Hosts'))).toBe(false);
  }
  expect(necronDatasheetReminders2026(a).some(r=>r.title.includes('Ancient Collector · secured objective'))).toBe(false);
  expect(necronDatasheetReminders2026(army({id:'trazyn',unit:'Trazyn the Infinite'}),[]).some(r=>r.title.includes('Ancient Collector'))).toBe(false);
  const illegal=army({id:'blades',unit:'Tomb Blades'},{id:'trazyn',unit:'Trazyn the Infinite',attachedTo:'blades'});
  expect(necronDatasheetReminders2026(illegal,[]).some(r=>r.title.includes('Ancient Collector'))).toBe(false);
  expect(necronDatasheetReminders2026(a,[{id:'trazyn',unit:'Technomancer'},{id:'body',unit:'Immortals'}]).some(r=>r.title.includes('Ancient Collector'))).toBe(false);
 });
});
