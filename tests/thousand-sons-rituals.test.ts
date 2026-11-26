// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';
import {RITUAL_BEARERS} from '../src/thousand-sons-data.generated';
import {thousandSonsRitualCasters} from '../src/thousand-sons-rituals';

const row=(unit:string,fields:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...fields});
const army=(detachment:string,...instances:RosterInstance[]):ArmySelection=>({...newSelection('Thousand Sons'),detachments2026:[detachment],instances});
const cards=(a:ArmySelection)=>generate11thReminders(a).filter(r=>r.id.startsWith('11e-ts-cabal-'));

it('uses the actual Sorcerer models in an attached formation and generates one set of Ritual choices',()=>{
 const body=row('Rubric Marines',{models:10}),leader=row('Exalted Sorcerer',{attachedTo:body.id}),termies=row('Scarab Occult Terminators',{models:5});
 const a=army('Grand Coven',leader,body,termies,row('War Dog Brigand')),out=cards(a);
 expect(Object.keys(RITUAL_BEARERS)).toHaveLength(12);
 expect(out.filter(r=>r.id==='11e-ts-cabal-test')).toMatchObject([{window:'Shooting',timing:'start',turn:'own',units:[leader.id,body.id,termies.id],summary:expect.stringMatching(/Rubric Marines#1 \(Aspiring Sorcerer only\).*Scarab Occult Sorcerer only/)}]);
 expect(out.find(r=>r.id.endsWith('-surge'))?.summary).toContain('Eligible formations: '+body.id+', '+termies.id+'.');
 expect(out.find(r=>r.id.endsWith('-surge-charge'))).toMatchObject({window:'Charge',turn:'own',units:[body.id,termies.id]});
 expect(new Set(out.map(r=>r.id)).size).toBe(out.length);
});
it('prints the two-dice decision and distinct Warp Charge thresholds and target restrictions',()=>{
 const out=cards(army('Grand Coven',row('Ahriman'),row('Magnus The Red')));
 const description=(key:string)=>out.find(r=>r.id==='11e-ts-cabal-'+key)?.summary;
 expect(description('test')).toMatch(/one attempt.*already attempted.*even if it failed.*Roll 2D6, then decide.*one D6.*Only if you channel.*doubles or triples.*D3 mortal wounds/i);
 for(const [key,low,high] of [['ruin',5,10],['surge',6,10],['bolt',7,11],['twist',9,12]] as const){
  const rule=out.find(r=>r.id==='11e-ts-cabal-'+key);
  expect(rule).toMatchObject({title:expect.stringContaining('Warp Charge '+low),window:'Shooting',turn:'own',timing:'start',summary:expect.stringContaining(high+'+')});
 }
 expect(description('ruin')).toMatch(/visible enemy within 24″.*Hit rolls of 1/);
 expect(description('surge')).toMatch(/unengaged friendly.*visible within 24″.*D6″.*6″.*cannot charge/);
 expect(description('bolt')).toMatch(/D3 mortal wounds.*D3\+3.*Lone Operative.*within 12″/);
 expect(description('twist')).toMatch(/AP by 1.*by 2/);
 expect(description('caster-Ahriman#1')).toContain('adds 1');
 expect(description('caster-Magnus The Red#1')).toMatch(/two different Rituals.*adds 2/);
});
it('distinguishes legal conditional Changehost Psykers from both aura sources and other daemons',()=>{
 const rhino=row('Chaos Rhino'),lord=row('Lord of Change'),flamers=row('Flamers'),dog=row('War Dog Brigand');
 const a=army('Changehost of Deceit',rhino,lord,flamers,dog);
 expect(thousandSonsRitualCasters(a).map(s=>s.id)).toEqual([lord.id]);
 for(const r of cards(a).filter(r=>r.window==='Shooting')){
  expect(r.units).toEqual([lord.id]);
  expect(r.summary).toMatch(/Lord of Change#1 only while within 6″ of and visible to.*Chaos Rhino#1/);
 }
 expect(cards(army('Changehost of Deceit',lord,flamers,dog))).toEqual([]);
 expect(cards(army('Grand Coven',rhino,lord,flamers))).toEqual([]);
});
it('blocks a whole legally attached Noctilith formation but preserves a second unit of Rubrics',()=>{
 const body=row('Rubric Marines',{models:5}),other=row('Rubric Marines',{models:5,id:'Rubric Marines#2'});
 const bearer=row('Sorcerer',{attachedTo:body.id,enhancement:'Noctilith Mantle'});
 expect(thousandSonsRitualCasters(army('Hexwarp Thrallband',body,other,bearer)).map(s=>s.id)).toEqual([other.id]);
 expect(thousandSonsRitualCasters(army('Grand Coven',body,other,bearer)).map(s=>s.id)).toEqual([body.id,other.id,bearer.id]);
});
it('restricts Incandaeum to its true bearer and keeps the unrelated conditional caster out of native modifiers',()=>{
 const valid=row('Exalted Sorcerer',{enhancement:'Incandaeum'}),wrong=row('Infernal Master',{enhancement:'Incandaeum'});
 const out=cards(army('Grand Coven',valid,wrong));
 expect(out.filter(r=>r.summary.includes('already attempted it this phase'))).toMatchObject([{units:[valid.id],summary:expect.stringContaining('Once per battle')}]);
 const mutant=row('Mutalith Vortex Beast'),prince=row('Daemon Prince of Tzeentch'),rubrics=row('Rubric Marines',{models:5}),lord=row('Lord of Change');
 const full=generate11thReminders(army('Changehost of Deceit',mutant,prince,rubrics,lord));
 expect(full.find(r=>r.id==='11e-ts-cabal-flare')).toMatchObject({units:[prince.id,rubrics.id],summary:expect.stringMatching(/channels within 6″.*does not stack/)});
 const snare=full.find(r=>r.id.startsWith('11e-ts-snare-'));
 expect(snare?.summary).toMatch(/destroyed within 9″.*cumulative \+1, capped at \+2.*Aspiring Sorcerer only/);
 expect(snare?.summary).not.toContain(lord.id);
});
