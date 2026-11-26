import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {EMPERORS_CHILDREN_SHEETS} from '../src/emperors-children-data.generated';
import {eligibleEmperorsChildrenUpgrades} from '../src/emperors-children-detachment-data';
import {emperorsChildrenDetachmentReminders as generate} from '../src/emperors-children-detachments';
import type {RosterInstance} from '../src/roster-instances';

const carnival='Carnival of Excess',coterie='Coterie of the Conceited',court='Court of the Phoenician',elegant='Elegant Brutes',frenzy='Frenzied Host',mercurial='Mercurial Host',peerless='Peerless Bladesmen',rapid='Rapid Evisceration',chosen='Slaanesh’s Chosen',spectacle='Spectacle of Slaughter';
const lord='Lord Exultant',kako='Lord Kakophonist',blades='Flawless Blades',tor='Tormentors',infr='Infractors',term='Chaos Terminators',noise='Noise Marines',prince='Daemon Prince of Slaanesh',keeper='Keeper of Secrets',daemon='Daemonettes',rhino='Chaos Rhino',land='Chaos Land Raider',shalaxi='Shalaxi Helbane';
const id=(u:string,n=1)=>u+'#'+n;
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Emperor’s Children'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1)}))};
}
const edit=(a:ArmySelection,u:string,p:Partial<RosterInstance>)=>({...a,instances:a.instances?.map(s=>s.id===id(u)?{...s,...p}:s)});
const equip=(a:ArmySelection,u:string,upgrade:string)=>({...a,upgrades2026:{[id(u)]:upgrade}});
const named=(a:ArmySelection,name:string)=>generate(a).filter(r=>r.title===name);
const rule=(a:ArmySelection,k:string)=>generate(a).filter(r=>r.sourceRuleId===k);
describe('Emperor’s Children detachment effects',()=>{
 it('uses October costs and dispositions and preserves historical Slaanesh spelling',()=>{
  expect(detachmentBudget('Emperor’s Children',[carnival],'Incursion')).toMatchObject({valid:true,spent:3,limit:3,dispositions:['Disruption','Priority Assets']});
  expect(detachmentBudget('Emperor’s Children',["Slaanesh's Chosen",frenzy],'Incursion')).toMatchObject({valid:true,spent:2,dispositions:['Purge the Foe','Reconnaissance']});
  const tilted=force(["Slaanesh's Chosen"],lord);
  expect(eligibleEmperorsChildrenUpgrades(tilted,lord).find(u=>u.name==='Slayer of Champions')?.points).toBe(15);
  expect(named(tilted,'Internal Rivalries · initial Favoured Champions')[0].units).toEqual([id(lord)]);
 });
 it('requires both factions for Empowerment, and applies the September FAQ to fitted Sustained Hits 3 or a legally led squad',()=>{
  expect(named(force([carnival],kako,noise),'Daemonic Empowerment')).toHaveLength(0);
  expect(named(force([mercurial],noise,shalaxi),'Daemonic Empowerment')).toHaveLength(0);
  const a=edit(force([carnival],kako,noise,shalaxi,'Knight Despoiler'),kako,{attachedTo:id(noise)});
  const out=named(a,'Daemonic Empowerment').find(r=>r.window==='Shooting')!;
  expect(out.units).toEqual([id(noise),id(shalaxi)]);
  expect(out.summary).toContain('Pavane of Slaanesh');
  expect(out.summary).toContain('Sonic blaster');
  expect(out.summary).toContain('5+');
  const solo=named(force([carnival],noise,shalaxi),'Daemonic Empowerment').find(r=>r.window==='Shooting')!;
  expect(solo.summary).not.toContain('Sonic blaster');
 });
 it('offers returned Daemonettes their 6-inch Deep Strike only near an actual friendly EC unit and gates heal/charge pairs',()=>{
  const solo=force([carnival],daemon);
  expect(named(solo,'Dark Apparitions · return from reserves')).toHaveLength(0);
  expect(rule(solo,'000010011005')).toHaveLength(0);
  const a=force([carnival],daemon,tor,shalaxi);
  const row=named(a,'Dark Apparitions · return from reserves')[0];
  expect(row).toMatchObject({window:'Movement',turn:'own',units:[id(daemon)]});
  expect(row.summary).toMatch(/within 8″.*more than 6″.*Tormentors#1/);
  expect(rule(a,'000010011002')[0].summary).toMatch(/3 lost wounds.*D3\+3/);
  expect(rule(a,'000010011005')[0].units).toContain(id(shalaxi));
  expect(rule(force([carnival],tor),'000010011002')).toHaveLength(0);
 });
 it('prints the real pledge steps for the legal Warlord, the zero-pledge FAQ and the cumulative ranged/melee thresholds',()=>{
  const a=force([coterie],'Fulgrim',lord,tor,'Knight Rampager');
  expect(named(a,'Pledges to the Dark Prince')[0]).toMatchObject({window:'Start of battle round',units:['Fulgrim#1']});
  expect(named(a,'Pledges to the Dark Prince · resolve')[0]).toMatchObject({window:'End of battle round',timing:'end'});
  const pact=named(a,'Pact points · cumulative benefits');
  expect(pact.find(r=>r.window==='Fight')?.summary).toContain('At 5+ melee');
  expect(pact.find(r=>r.window==='Shooting')?.summary).not.toContain('At 5+');
  expect(pact.every(r=>!r.units?.includes('Knight Rampager#1'))).toBe(true);
  expect(rule(a,'000010015006')[0].summary).toContain('zero pledge to one even when your Warlord is off');
 });
 it('requires a legal embarkation pair and a Tormentors formation for Advance and Claim',()=>{
  const blocked=force([rapid],rhino,term,blades);
  expect(named(blocked,'Mechanised Murder · disembarking models')).toHaveLength(0);
  expect(rule(blocked,'000010007006')).toHaveLength(0);
  const a=force([rapid],rhino,land,term,tor,blades);
  expect(rule(a,'000010007003')[0].summary).toContain(id(rhino)+' with '+id(tor));
  expect(rule(a,'000010007002')[0]).toMatchObject({window:'Fight',turn:'either',timing:'end'});
  expect(rule(a,'000010007002')[0].summary).toContain(id(blades)+' with '+id(land));
  expect(rule(a,'000010007002')[0].summary).not.toContain(id(blades)+' with '+id(rhino));
  expect(named(a,'Mechanised Murder · Transports')[0].units).toEqual([id(rhino),id(land)]);
 });
 it('distinguishes the attacking Battleline models from their joined non-Battleline Lord, without suppressing unit rules',()=>{
  const a=edit(force([frenzy],lord,tor,blades),lord,{attachedTo:id(tor)});
  expect(named(a,'Frantic Focus').find(r=>r.window==='Fight')?.units).toEqual([id(tor)]);
  expect(rule(a,'000010957003')[0].units).toEqual([id(tor)]);
  expect(rule(equip(a,lord,'Euphoric Crown'),'000010956002')[0].units).toEqual([id(lord)]);
  expect(rule(equip(a,lord,'Howling Plate'),'000010956003')[0].units).toEqual([id(tor)]);
 });
 it('makes a different Character formation necessary for Heightened Jealousy and applies Pageant CP relief only when Fulgrim is one of the targets',()=>{
  expect(rule(force([chosen],lord,tor),'000010019004')).toHaveLength(0);
  expect(rule(force([chosen],lord,prince),'000010019004')).toHaveLength(2);
  expect(rule(force([court],prince),'000010655004')[0].summary).not.toContain('1CP');
  const row=rule(force([court],prince,'Fulgrim'),'000010655004')[0];
  expect(row.summary).toContain('once per battle round shared');
  expect(rule(force([court],prince),'000010655003')[0].summary).not.toContain('Master of the Pageant');
 });
 it.each([
  [carnival,lord,'Dark Blessings','Fight','3+ invulnerable'],[carnival,lord,'Empyric Suffusion','Charge','cost by 1'],
  [carnival,lord,'Possessed Blade','Pre-battle','equipped melee weapons'],[carnival,keeper,'Warp Walker','Movement','Desperate Escape'],
  [coterie,lord,'Pledge of Dark Glory','Command','Objective Control'],[coterie,lord,'Pledge of Eternal Servitude','Movement','D6 wounds'],
  [coterie,lord,'Pledge of Mortal Pain','Shooting','3 mortal wounds'],[coterie,lord,'Pledge of Unholy Fortune','Fight','unmodified 6'],
  [court,lord,'Exalted Patron','Movement','1″'],[court,lord,'Soulstain Made Manifest','Fight','Battle-shock test at −1'],
  [court,prince,'Spiritsliver','Fight','1 Strength'],[court,lord,'Tears of the Phoenix','Fight','Weapon Skill'],
  [elegant,kako,'Cacophonic Accompaniment','Shooting','Ignores Cover'],[elegant,term,'Frenzied Ferocity','Fight','Sustained Hits 1'],
  [frenzy,lord,'Euphoric Crown','Fight','1 Strength'],[frenzy,lord,'Howling Plate','Shooting','by 1'],
  [mercurial,lord,'Intoxicating Musk','Fight','Toughness'],[mercurial,lord,'Loathsome Dexterity','Movement','Desperate Escape'],
  [mercurial,lord,'Steeped in Suffering','Fight','below Half-strength'],[mercurial,lord,'Tactical Perfection','Pre-battle','two friendly'],
  [peerless,lord,'Blinding Speed','Fight','Fights First'],[peerless,lord,'Distortion','Fight','1 Damage'],
  [peerless,lord,'Faultless Opportunist','Charge','already used'],[peerless,lord,'Rise to the Challenge','Fight','three enemy models'],
  [rapid,lord,'Accomplished Tactician','Shooting','wholly within 6″'],[rapid,lord,'Heretek Adept','Shooting','Damage to 0'],
  [rapid,lord,'Spearhead Striker','Movement','Fire Overwatch'],[rapid,lord,'Sublime Prescience','Movement','one higher'],
  [chosen,lord,'Eager to Prove','Charge','re-roll Charge'],[chosen,lord,'Proud and Vainglorious','Command','Objective Control'],
  [chosen,lord,'Repulsed by Weakness','Movement','Desperate Escape'],[chosen,lord,'Slayer of Champions','Fight','Precision'],
  [spectacle,blades,'Beguiling Grotesquerie','Movement','snap shooting'],[spectacle,blades,'Eager Patrons','Movement','2″'],
 ])('uses active %s enhancement on the actual %s bearer – %s',(det,bearer,pick,phase,body)=>{
  const a=edit(force([det],...new Set([bearer,lord,tor,rhino,noise,term])),lord,{attachedTo:id(tor)});
  const option=eligibleEmperorsChildrenUpgrades(a,bearer,id(bearer)).find(u=>u.name===pick)!;
  expect(option,pick).toBeDefined();
  expect(rule(equip(a,bearer,pick),option.id).find(r=>r.window===phase)?.summary).toContain(body);
  expect(rule(a,option.id)).toHaveLength(0);
 });
 it('exercises all 51 Stratagems across eligible real unit mixes with a distinct reminder per actual timing',()=>{
  for(const [det,count] of [[carnival,6],[coterie,6],[court,6],[elegant,3],[frenzy,3],[mercurial,6],[peerless,6],[rapid,6],[chosen,6],[spectacle,3]] as const){
   const a=force([det],...EMPERORS_CHILDREN_SHEETS.map(s=>s.unit));
   const rows=generate(a),strats=rows.filter(r=>r.id.startsWith('11e-ec-strat-'));
   expect(new Set(strats.map(r=>r.sourceRuleId)).size,det).toBe(count);
   expect(strats.every(r=>r.units?.length&&r.summary.length>26&&r.turn&&r.title.includes('CP'))).toBe(true);
   expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
  }
 });
});
