import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {astraMilitarumLoadout} from '../src/astra-militarum-loadouts';
import {ASTRA_SHEETS} from '../src/astra-militarum-data';
import {eligibleAstraMilitarumUpgrades} from '../src/astra-militarum-detachment-data';
import {astraMilitarumDetachmentReminders as generate} from '../src/astra-militarum-detachments';
import {astraOrderReminders} from '../src/astra-orders';
import type {RosterInstance} from '../src/roster-instances';

const combined='Combined Arms',skirmish='Armoured Infantry',steel='Steel Hammer',grizzled='Grizzled Company',abhuman='Abhuman Auxiliaries',design='Designation Force',recon='Recon Element',hammer='Hammer of the Emperor',bridge='Bridgehead Strike',siege='Siege Regiment',mech='Mechanised Assault';
const cadians='Cadian Shock Troops',castellan='Cadian Castellan',cmd='Cadian Command Squad',tempCmd='Militarum Tempestus Command Squad',scions='Tempestus Scions',tank='Leman Russ Battle Tank',sent='Scout Sentinels',lord='Lord Solar Leontus',tech='Tech-Priest Enginseer',tc='Leman Russ Commander';
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Astra Militarum'),units:counts,detachments2026:detachments,instances:units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}))};
}
const id=(u:string,n=1)=>u+'#'+n;
const config=(a:ArmySelection,u:string,patch:Partial<RosterInstance>)=>({...a,instances:a.instances?.map(s=>s.id===id(u)?{...s,...patch}:s)});
const equip=(a:ArmySelection,u:string,pick:string)=>({...a,upgrades2026:{[id(u)]:pick}});
const card=(a:ArmySelection,rule:string)=>generate(a).filter(r=>r.sourceRuleId===rule);
const named=(a:ArmySelection,name:string)=>generate(a).filter(r=>r.title===name);

describe('Astra Militarum detachment effects',()=>{
 it('enforces the MFM budgets, two keyed restrictions and both Grizzled dispositions',()=>{
  expect(detachmentBudget('Astra Militarum',[mech,bridge],'Strike Force')).toMatchObject({valid:true,spent:3,dispositions:['Reconnaissance','Priority Assets']});
  expect(detachmentBudget('Astra Militarum',[combined],'Incursion')).toMatchObject({valid:true,spent:2});
  expect(detachmentBudget('Astra Militarum',[grizzled],'Incursion').dispositions).toEqual(['Priority Assets','Purge the Foe']);
  expect(detachmentBudget('Astra Militarum',[recon,design],'Strike Force').valid).toBe(false);
  expect(detachmentBudget('Astra Militarum',[abhuman,grizzled],'Strike Force').valid).toBe(false);
  const a=force([combined,skirmish],castellan);
  expect(eligibleAstraMilitarumUpgrades(a,castellan,id(castellan)).filter(x=>x.name.startsWith('Grand Strategist')).map(x=>[x.name,x.points])).toEqual([['Grand Strategist (Combined Arms)',15],['Grand Strategist (Armoured Infantry)',25]]);
 });
 it('filters Born Soldiers by shooter and enemy type and needs two distinct formations for combined fire',()=>{
  const a=force([combined],tank,cadians,'Vindicare Assassin','Cyclops Demolition Vehicle');
  expect(named(a,'Born Soldiers · Regiment')[0]).toMatchObject({window:'Shooting',turn:'own',units:[id(cadians)]});
  expect(named(a,'Born Soldiers · Regiment')[0].summary).toContain('other than Monsters and Vehicles');
  expect(named(a,'Born Soldiers · Squadron')[0].units).toEqual([id(tank)]);
  expect(card(a,'000008381005')[0].units).toEqual([id(cadians),id(tank)]);
  expect(card(force([combined],cadians),'000008381002')).toHaveLength(0);
  expect(card(force([combined],tank,'Vindicare Assassin'),'000008381007')[0].summary).toContain('Vindicare Assassin#1');
 });
 it('uses the corrected September FAQ for the destroyed Regiment and size-limited Creeping Barrage',()=>{
  const a={...force([siege,combined],cadians,'Vindicare Assassin'),battleSize2026:'Incursion' as const};
  const support=named(a,'Artillery Support')[0];
  expect(support).toMatchObject({window:'Start of battle round',timing:'start',turn:'either',units:[id(cadians),'Vindicare Assassin#1']});
  expect(support.summary).toMatch(/up to 2.*choose the order.*12″.*5\+.*Stop rolling/);
  const replaced=card(a,'000008381003');
  expect(replaced).toHaveLength(5);
  expect(replaced.every(r=>r.turn==='either'&&r.units?.includes(id(cadians))&&r.summary.includes('not Battle-shocked')&&r.summary.includes('vox-caster'))).toBe(true);
 });
 it('only grants shooting, OC and hot-shot effects to the right Tempestus roster and actual equipped guns',()=>{
  const a={...force([bridge],tempCmd,scions,'Tempestus Aquilons','Kasrkin',castellan),warlordId:id(tempCmd)};
  expect(named(a,'Fire Zone Purge · Tempestus Scions')[0].units).toEqual([id(scions)]);
  expect(named({...a,warlordId:id(castellan)},'Fire Zone Purge · Tempestus Scions')).toHaveLength(0);
  expect(named(a,'Fire Zone Purge')[0].units).not.toContain('Kasrkin#1');
  const hot=card(a,'000009802003')[0];expect(hot.units).toContain('Kasrkin#1');
  expect(hot.summary).toContain('Hot-shot lasgun');
  expect(hot.summary).not.toContain('Sentry hot-shot volley gun');
 });
 it('does not offer outgoing or incoming transport effects where the selected formation and carrier cannot fit',()=>{
  const a=force([mech],tech,'Chimera',cadians,'Artillery Team');
  expect(named(a,'Armoured Fist')[0].units).toContain(id(cadians));
  expect(named(a,'Armoured Fist')[0].units).not.toContain('Artillery Team#1');
  for(const key of ['000009862007','000009862006','000009862003','000009862004']){
   expect(card(a,key)[0].summary).toContain(id(cadians)+' with Chimera#1');
   expect(card(force([mech],'Chimera','Artillery Team'),key)).toHaveLength(0);
  }
  expect(card(a,'000009862007')[0]).toMatchObject({window:'End of opponent turn',turn:'opponent',timing:'end'});
 });
 it('uses actual Orders, eligible recipients, skirmisher wounds, artillery and limited officer modes',()=>{
  const a=force([skirmish],castellan,sent,'Basilisk',tank,'Rogal Dorn Battle Tank');
  expect(named(a,'Squadron Command · On My Signal')[0].units).toEqual([id(sent)]);
  expect(card(a,'000010792005')[0].units).toEqual([id(sent)]);
  expect(named(force([skirmish],'Commissar',sent),'Squadron Command · On My Signal')).toHaveLength(0);
  const limited=force([grizzled],'Commissar',cadians);
  expect(card(limited,'000010638006')).toHaveLength(0);
  expect(card(force([grizzled],'Kasrkin'),'000010638006')[0].units).toEqual(['Kasrkin#1']);
  expect(named(force([grizzled],tank),'Ruthless Discipline')).toHaveLength(0);
  expect(named(force([grizzled],tc,tank),'Ruthless Discipline')[0].units).toContain(id(tank));
 });
 it('limits Flash Grenades to the enemy Fire Overwatch reaction at the end of your Movement phase',()=>{
  const a=equip(force([siege],castellan,cadians),castellan,'Flash Grenades');
  expect(card(a,'000009857003').map(r=>[r.window,r.turn,r.timing])).toEqual([['Movement','own','end']]);
 });
 it('gates Titanic Character upgrades per nominated copy and keeps bearer-only damage distinct from cargo',()=>{
  const a=config(force([steel],'Stormlord','Stormlord',cadians),'Stormlord',{characterPromotion:true});
  expect(eligibleAstraMilitarumUpgrades(a,'Stormlord',id('Stormlord')).map(x=>x.name)).toContain('Assault Hatches');
  expect(eligibleAstraMilitarumUpgrades(a,'Stormlord',id('Stormlord',2))).toEqual([]);
  expect(card(equip(a,'Stormlord','Titan Killer'),'000010787003')[0].units).toEqual(['Stormlord#1']);
  expect(card(equip(a,'Stormlord','Assault Hatches'),'000010787005')[0].units).toEqual([id(cadians)]);
 });
 it('applies 8-inch Recon reactions and separates actual Platoon, Infantry Smoke, Scout and non-Titanic targets',()=>{
  const a=force([recon,design],cadians,sent,'Baneblade','Ratlings','Kasrkin');
  expect(named(a,'Masters of Camouflage')[0].units).not.toContain('Baneblade#1');
  expect(card(a,'000009870003')[0]).toMatchObject({turn:'opponent',window:'Movement',units:[id(cadians)]});
  expect(card(a,'000009870003')[0].summary).toContain('8″');
  expect(named(a,'Designated Targets · Signal Flares')[0].units).toContain(id(sent));
  expect(card(a,'000010917004')).toHaveLength(0);
  expect(card(a,'000009870004')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'start'});
 });
 it('keeps fitted bearer pistols separate from sidearms belonging only to their veterans',()=>{
  const a=force([siege],tempCmd,'Krieg Command Squad');
  const sidearm=equip(a,tempCmd,'Legacy Sidearm');
  expect(card(sidearm,'000009857004')[0].summary.toLowerCase()).toContain('pistol');
  const slot=astraMilitarumLoadout(tempCmd)?.slots.find(s=>s.choices.some(c=>c.name==='Command rod'))!;
  const withheld=config(sidearm,tempCmd,{knightGear:{[slot.name]:'Command rod'}});
  const choices=card(withheld,'000009857004');
  expect(card(equip(a,'Krieg Command Squad','Legacy Sidearm'),'000009857004')[0].summary).toContain('Laspistol');
  expect(choices).toHaveLength(0);
 });
 it.each([
  [abhuman,'Commissar','Exemplar of Duty','Fight','Feel No Pain 4+'],[abhuman,'Ratlings','Sharp Eyes','Shooting','6″'],
  [skirmish,castellan,'Exemplary Officer','Command','two other Platoons'],[skirmish,castellan,'Grand Strategist','Pre-battle','two Regiment or Squadron'],
  [skirmish,castellan,'Master Manoeuvrist','Fight','within 3″'],[skirmish,tech,'Omnissian Unguents','Charge','Feel No Pain 5+'],
  [bridge,tempCmd,'Priority Drop Beacon','Movement','first Movement phase'],
  [combined,castellan,'Death Mask of Ollanius','Command','by 1'],[combined,castellan,'Drill Commander','Shooting','5+'],
  [combined,castellan,'Reactive Command','Movement','8″'],
  [design,sent,'Long-Range Scout','Pre-battle','Infiltrators'],[design,cadians,'Recon Star','Movement','ingress'],
  [grizzled,'Commissar','Abhuman Detail','Pre-battle','Ogryn'],[grizzled,castellan,'Aquilan Eye','Shooting','within 12″'],
  [grizzled,castellan,'Spec Ops Veteran','Shooting','Stealth'],[hammer,tc,'Calm Under Fire','Command','Once per turn'],
  [hammer,tc,'Indomitable Steed','Charge','Feel No Pain 6+'],[hammer,tc,'Regimental Banner','Command','3'],
  [hammer,tc,'Veteran Crew','Shooting','rolls of 1'],[mech,castellan,'Bold Leadership','Command','start or end of a turn'],
  [mech,tech,'Sacred Unguents','Shooting','within 3″'],[mech,castellan,'Smoke Grenades','Shooting','Stealth'],
  [mech,castellan,'Vanguard Honours','Movement','shock disembark'],[recon,castellan,'Guerrilla Honours','Pre-battle','three other'],
  [recon,castellan,'Scare Gas Grenades','Charge','Once per battle'],[recon,castellan,'Survival Gear','Pre-battle','Only the bearer'],
  [recon,castellan,'Tripwires','Charge','within 8″'],[siege,castellan,'Eager Advance','Pre-battle','Scouts 6″'],
  [siege,castellan,'Flash Grenades','Movement','Fire Overwatch'],[siege,castellan,'Legacy Sidearm','Shooting','2 Attacks'],
  [siege,castellan,'Stalwart’s Honours','Command','Take Cover!'],[steel,'Stormlord','Assault Hatches','Movement','assault disembark'],
  [steel,tech,'Engine Speaker','Command','3″ Move'],[steel,'Stormlord','Titan Killer','Shooting','Damage roll'],
 ])('resolves a fitted %s upgrade on %s – %s only at its appropriate activation',(det,bearer,choice,phase,expected)=>{
  let a=force([det],...new Set([bearer,'Chimera',sent,'Ogryn Squad',cadians,'Catachan Jungle Fighters',castellan,tank,'Stormlord','Commissar']));
  a=config(config(a,castellan,{attachedTo:id(cadians)}),'Stormlord',{characterPromotion:true});
  const proposed=eligibleAstraMilitarumUpgrades(a,bearer,id(bearer)).find(u=>u.name===choice)!;
  expect(proposed,choice).toBeDefined();
  const rows=card(equip(a,bearer,choice),proposed.id);
  expect(rows.find(r=>r.window===phase)?.summary,choice).toContain(expected);
  expect(card(a,proposed.id)).toHaveLength(0);
 });
 it('shows the four issuer-specific enhancements on actual Order cards, including a fitted Master Vox',()=>{
  const a=force([steel],'Stormlord',tank);
  const promoted=equip(config(a,'Stormlord',{characterPromotion:true}),'Stormlord','Battalion Commander');
  expect(astraOrderReminders(promoted).some(r=>r.title.includes('Stormlord')&&r.summary.includes('2 Orders'))).toBe(true);
  expect(astraOrderReminders(a).some(r=>r.title.startsWith(id('Stormlord')))).toBe(false);
  for(const [det,choice,text] of [[combined,'Grand Strategist','one additional Order'],[grizzled,'Laud Hailer','Within 12″']]){
   const b=equip(force([det],castellan,cadians),castellan,choice);
   expect(astraOrderReminders(b).some(r=>r.summary.includes(text))).toBe(true);
  }
  const kit=astraMilitarumLoadout(tempCmd)!;
  const slot=kit.slots.find(s=>s.choices.some(c=>c.items.includes('Master vox')))!;
  const gear={[slot.name]:slot.choices.find(c=>c.items.includes('Master vox'))!.name};
  const b=equip(config(force([bridge],tempCmd,cadians,scions),tempCmd,{knightGear:gear}),tempCmd,'Bombast-class Vox-array');
  expect(astraOrderReminders(b).some(r=>r.summary.includes('up to three eligible Regiment'))).toBe(true);
 });
 it('puts each of the 57 Stratagems on a printed timing with real target formations, CP cost and no duplicate per-phase IDs',()=>{
  for(const [det,count] of [[abhuman,3],[design,3],[bridge,3],[skirmish,6],[combined,6],[grizzled,6],[hammer,6],[mech,6],[recon,6],[siege,6],[steel,6]] as const){
   const a=force([det],...ASTRA_SHEETS.map(s=>s.unit));
   const out=generate(a),strats=out.filter(r=>r.id.startsWith('11e-astra-strat-'));
   expect(new Set(strats.map(r=>r.sourceRuleId)).size,det).toBe(count);
   expect(strats.every(r=>r.units?.length&&r.title.includes('CP')&&r.summary.length>30&&r.turn)).toBe(true);
   expect(new Set(out.map(r=>r.id)).size,det).toBe(out.length);
  }
 });
});
