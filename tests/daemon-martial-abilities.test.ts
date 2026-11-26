import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {daemonDatasheetReminders} from '../src/daemon-datasheets';
import type {RosterInstance} from '../src/roster-instances';

const s=(id:string,unit=id):RosterInstance=>({id,unit});
const sheet=(...instances:RosterInstance[])=>daemonDatasheetReminders({...newSelection('Chaos Knights'),instances},instances);
const ability=(army:ReturnType<typeof sheet>,name:string)=>army.filter(r=>r.title.endsWith(' · '+name));

// Daemon faction pack, Pact FAQ and revised 11th-edition datasheets. Sources
// for each card are also attached to the actual roster reminders under test.
describe('Khorne and Slaanesh daemon allies in the generated army sheet',()=>{
 it('uses the legal Bloodcrusher formation for its stampede, the leader’s horns and every nearby charge target',()=>{
  const a=sheet(s('crushers','Bloodcrushers'),{...s('master','Skullmaster'),attachedTo:'crushers'},s('solo','Skullmaster'));
  expect(ability(a,'Brass Stampede')).toMatchObject([{window:'Charge',units:['crushers'],summary:expect.stringMatching(/one D6 per model.*4\+ inflicts D3/)}]);
  expect(ability(a,'Skullmaster’s Fury').map(r=>[r.window,r.units])).toEqual([['Charge',['crushers']],['Fight',['crushers']]]);
  expect(ability(a,'Skullmaster’s Fury')[1].summary).toMatch(/bladed horns.*Devastating Wounds until turn end/);
  expect(ability(a,'Devastating Charge').map(r=>r.units)).toEqual([['crushers'],['solo']]);
  expect(ability(a,'Devastating Charge')[0].summary).toContain('every enemy unit');
 });
 it('keeps Karanak’s personal collar and prey separate from the Hounds’ collar and correctly repositions their whole formation',()=>{
  const a=sheet(s('hounds','Flesh Hounds'),{...s('karanak','Karanak'),attachedTo:'hounds'});
  expect(ability(a,'Brass Collar of Bloody Vengeance').every(r=>r.units?.join()==='karanak'&&r.summary.includes('mortal wounds'))).toBe(true);
  expect(ability(a,'Collar of Khorne').every(r=>r.units?.join()==='hounds'&&!r.summary.includes('mortal wounds'))).toBe(true);
  expect(ability(a,'Pack Leader').map(r=>r.units)).toEqual([['hounds'],['hounds']]);
  expect(ability(a,'Hunters from the Warp')).toMatchObject([{turn:'opponent',window:'End of opponent turn',units:['hounds']}]);
  expect(ability(a,'Prey of the Blood God').find(r=>r.window==='Start of battle round')?.summary).toContain('round one');
  expect(ability(a,'Prey of the Blood God').find(r=>r.window==='Fight')).toMatchObject({units:['hounds'],summary:expect.stringMatching(/melee Wound rolls.*new enemy/)});
  expect(ability(sheet(s('karanak','Karanak')),'Pack Leader')).toEqual([]);
 });
 it('filters auras by selected god and legal formations, including variable allegiance, while excluding Knight allies',()=>{
  const a=sheet(s('throne','Rendmaster On Blood Throne'),s('skarbrand','Skarbrand'),s('thirster','Bloodthirster'),s('letters','Bloodletters'),{...s('master','Bloodmaster'),attachedTo:'letters'},
   s('keeper','Keeper Of Secrets'),s('knight','Knight Tyrant'),{...s('prince','Daemon Prince of Chaos'),knightGear:{'Daemonic allegiance':'Slaanesh'}});
  for(const name of ['Blood Throne','Rage Embodied (Aura)','Daemon Lord of Khorne (Aura)']){
   expect(ability(a,name)[0].units).toEqual(['throne','skarbrand','thirster','letters']);
  }
  expect(ability(a,'Champion Slayer')[0].summary).toMatch(/Character or Monster.*up to D6 lost wounds/);
  expect(ability(a,'Daemon Lord of Slaanesh (Aura)')[0].units).toEqual(['keeper','prince']);
  expect(ability(a,'Bloodmaster')).toMatchObject([{units:['letters'],summary:expect.stringContaining('Wound rolls')}]);
  expect(ability(a,'A Gory Path')[0].summary).toContain('6″');
 });
 it('omits irrelevant Shooting rerolls, carries Symphony’s chosen target into legal attacks, and applies the Aegis only when equipped',()=>{
  const base=[s('dancers','Daemonettes'),{...s('weaver','Tranceweaver'),attachedTo:'dancers'}];
  const meleeOnly=sheet(...base);
  expect(ability(meleeOnly,'Tranceweaver').map(r=>r.window)).toEqual(['Fight']);
  expect(ability(meleeOnly,'Symphony of Pain (Psychic)').map(r=>r.window)).toEqual(['Movement','Fight']);
  const ranged=sheet(...base,{...s('keeper','Keeper Of Secrets'),knightGear:{'Additional wargear':'Shining aegis'}},s('enemyGod','Skull Cannon'));
  expect(ability(ranged,'Symphony of Pain (Psychic)').find(r=>r.window==='Shooting')).toMatchObject({units:['keeper'],turn:'own'});
  expect(ability(ranged,'Shining Aegis')[0]).toMatchObject({units:['keeper'],summary:expect.stringContaining('3+ armour Save')});
  expect(ability(sheet(s('unshielded','Keeper Of Secrets')),'Shining Aegis')).toEqual([]);
 });
 it('distinguishes the different attached Daemonette leader benefits and personal destruction/reaction durations',()=>{
  const attached=(name:string)=>sheet(s('dancers','Daemonettes'),{...s('leader',name),attachedTo:'dancers'});
  const enrapturess=attached('Infernal Enrapturess');
  expect(ability(enrapturess,'Harmonic Alignment')).toMatchObject([{window:'Command',turn:'own',units:['dancers'],summary:expect.stringContaining('D3 destroyed Bodyguard models')}]);
  expect(ability(enrapturess,'Discordant Disruption (Aura)')[0].summary).toMatch(/Psychic weapons.*enemy Psyker.*12″.*Hazardous/);
  const epitome=attached('Contorted Epitome');
  expect(ability(epitome,'Horrible Fascination (Psychic)')).toMatchObject([{window:'Shooting',turn:'opponent',timing:'start',summary:expect.stringMatching(/One Psyker.*enemy visible to it within 12″.*On 1.*On 2–5.*On 6/)}]);
  expect(ability(epitome,'Swallow Energy (Psychic)').every(r=>r.units?.join()==='dancers')).toBe(true);
  expect(ability(sheet(s('left','Contorted Epitome'),s('right','Contorted Epitome')),'Horrible Fascination (Psychic)')).toMatchObject([{units:['left','right']}]);
  const prince=attached('Syll’esske');
  expect(ability(prince,'Prince of Slaanesh')[0]).toMatchObject({units:['dancers'],summary:expect.stringContaining('5+')});
  expect(ability(prince,'Delightful Agonies').every(r=>r.units?.join()==='leader'&&r.timing==='end'&&r.summary.includes('On 2+'))).toBe(true);
  expect(ability(sheet(s('unattached','Syll’esske')),'Prince of Slaanesh')).toEqual([]);
 });
 it.each([
  ['Skulltaker','Skulls for Khorne','Fight','1CP'],['Skull Cannon','Skulls of the Fallen','Shooting','hit by at least one'],
  ['Bloodletters','Bane of Cowards','Movement','Monster or Vehicle'],['Skull Altar','Shadow of Khorne (Aura)','Command','re-roll Battle-shock'],
  ['Skarbrand','Murderlust','Charge','Advanced'],['Bloodthirster','Relentless Carnage','Fight','eight D6'],['The Masque Of Slaanesh','The Eternal Dance','Fight','own melee Wound rolls suffer −1'],
  ['Daemonettes','Horrifying Beauty','Fight','below half-strength'],['Fiends','Soporific Musk','Movement','Desperate Escape'],['Hellflayers','Cutting Down the Foe','Fight','+1 Damage'],
  ['Seekers','Unholy Speed','Charge','re-roll'],['Shalaxi Helbane','Monarch of the Hunt','Fight','Hit and Wound'],
  ['Tormentbringer','Hysterical Frenzy','Fight','after the attacking unit'],['Contorted Epitome','Horrible Fascination (Psychic)','Shooting','enemy cannot shoot'],
 ])('%s generates the actual %s effect in %s',(unit,name,window,text)=>{
  const a=sheet(s('ally',unit));
  expect(ability(a,name).find(r=>r.window===window)).toMatchObject({source:expect.stringContaining('/chaos-daemons/'),summary:expect.stringContaining(text),units:['ally']});
  expect(new Set(a.map(r=>r.id)).size).toBe(a.length);
 });
 it('keeps Fortification cover and the independent Khorne test reroll while Pact disables Shadow of Chaos army rules',()=>{
  const a=sheet(s('altar','Skull Altar'),s('crushers','Bloodcrushers'),s('seekers','Seekers'));
  const altar=ability(a,'Shadow of Khorne (Aura)')[0];
  expect(altar.units).toEqual(['altar','crushers']);
  expect(altar.summary).not.toContain('battlefield area');
  expect(ability(a,'Cover').find(r=>r.window==='Shooting')?.summary).toContain('Benefit of Cover');
  expect(ability(a,'Fortification').find(r=>r.window==='Movement')?.summary).toContain('Desperate Escape');
 });
});
