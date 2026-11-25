import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {DEATH_GUARD_SHEETS} from '../src/death-guard-data.generated';
import {eligibleDeathGuardUpgrades} from '../src/death-guard-detachment-data';
import {deathGuardDetachmentReminders as generate} from '../src/death-guard-detachments';
import {deathGuardIntrinsicReminders} from '../src/death-guard-intrinsic';
import type {RosterInstance} from '../src/roster-instances';
const champs='Champions of Contagion',eng='Contagion Engines',chosen='Death Lord’s Chosen',fly='Flyblown Host',hammer='Mortarion’s Hammer',para='Paragons of Putrescence',shamb='Shamblerot Vectorium',tally='Tallyband Summoners',vir='Virulent Vectorium';
const mar='Plague Marines',pox='Poxwalkers',sur='Plague Surgeon',casters='Malignant Plaguecaster',bio='Biologus Putrifier',bells='Noxious Blightbringer',lord='Lord of Virulence',term='Blightlord Terminators',rhino='Chaos Rhino',hel='Helbrute',unclean='Great Unclean One',legion='Plaguebearers',horde='Poxwalkers (Numberless Horde reinforcements)';
const id=(u:string,n=1)=>u+'#'+n;
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('Death Guard'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1)}))};
}
const edit=(a:ArmySelection,u:string,p:Partial<RosterInstance>)=>({...a,instances:a.instances?.map(s=>s.id===id(u)?{...s,...p}:s)});
const equip=(a:ArmySelection,u:string,pick:string)=>({...a,upgrades2026:{[id(u)]:pick}});
const named=(a:ArmySelection,title:string)=>generate(a).filter(r=>r.title===title);
const by=(a:ArmySelection,key:string)=>generate(a).filter(r=>r.sourceRuleId===key);
describe('Death Guard conditional detachments',()=>{
 it('preserves old detachments, correct October dispositions, and repeatable printed costs',()=>{
  expect(detachmentBudget('Death Guard',["Mortarion's Hammer",eng],'Strike Force')).toMatchObject({valid:true,spent:3,dispositions:['Purge the Foe','Reconnaissance']});
  expect(detachmentBudget('Death Guard',[vir],'Incursion').dispositions).toEqual(['Take and Hold','Purge the Foe']);
  const a=force(["Death Lord's Chosen"],lord);
  expect(eligibleDeathGuardUpgrades(a,lord,id(lord)).find(u=>u.name==='Face of Death')?.points).toBe(10);
  expect(eligibleDeathGuardUpgrades(force([fly],mar),mar)[0].repeatable).toBe(true);
 });
 it('requires a real joined formation and two actual Characters for the strongest Champions effects',()=>{
  const alone=force([champs],bio,mar,'Icon Bearer');
  expect(by(alone,'000010132002')).toHaveLength(0);
  expect(by(alone,'000010132006')[0].summary).toContain(id(bio)+' with '+id(mar));
  const one=edit(alone,bio,{attachedTo:id(mar)});
  expect(by(one,'000010132003')[0].units).toEqual([id(mar)]);
  expect(by(one,'000010132005')).toHaveLength(0);
  const both=edit(one,'Icon Bearer',{attachedTo:id(mar)});
  expect(by(both,'000010132005')[0]).toMatchObject({window:'Fight',timing:'start',turn:'either',units:[id(mar)]});
  expect(by(both,'000010132006')).toHaveLength(0);
 });
 it('applies Shamblerot to real future units even when only a Rhino has been mustered',()=>{
  const a={...force([shamb],rhino),battleSize2026:'Incursion' as const};
  expect(named(a,'Numberless Horde')[0]).toMatchObject({window:'Command',turn:'own',units:[horde]});
  expect(named(a,'Numberless Horde')[0].summary).toContain('2 and 3');
  expect(named(force([shamb],rhino),'Numberless Horde')[0].summary).toContain('2, 3 and 4');
  expect(by(a,'000010140005')[0].units).toEqual([horde]);
  expect(by(a,'000010140007')[0].units).toEqual([id(rhino)]);
  expect(by(a,'000010140007')[0].summary).toContain(horde);
  expect(by(force([vir],rhino),'000010140004')).toHaveLength(0);
  const joined=edit(force([shamb],pox,casters),casters,{attachedTo:id(pox)});
  expect(by(joined,'000010140005')[0].units).toEqual([horde]);
 });
 it('restricts Plaguesurge to the current Warlord and separates wounded models from 1-Wound Poxwalkers',()=>{
  const a=edit(force([vir],casters,pox,'Mortarion'),casters,{attachedTo:id(pox)});
  expect(by(a,'000010124004')[0].units).toEqual(['Mortarion#1']);
  expect(by(a,'000010124005')[0].units).toEqual([id(casters),'Mortarion#1']);
  expect(by(a,'000010124002')[0].units).toEqual(['Mortarion#1']);
  expect(by(force([vir],sur,pox),'000010124006')).toHaveLength(0);
  const g=by(force([vir],casters,pox),'000010124006')[0];
  expect(g.summary).toContain('Plague Wind');
 });
 it('uses the signed September control and charge triggers and exact round-specific enemy targets',()=>{
  const a={...force(["Mortarion's Hammer"],hel,mar),battleSize2026:'Incursion' as const};
  expect(named(a,'Miasmic Bombardment')[0].summary).toContain('one enemy unit');
  expect(named(force([hammer],hel),'Miasmic Bombardment')[0].summary).toContain('two enemy units');
  expect(by(a,'000010128007')[0]).toMatchObject({window:'Charge',timing:'start',turn:'opponent',units:[id(hel)]});
  expect(by(a,'000010128007')[0].summary).toMatch(/unengaged.*visible within 12″/);
  expect(named(force([vir],mar),'Worldblight')[0]).toMatchObject({window:'Command',turn:'own',timing:'end'});
  expect(named(force([chosen],hel),'Deadly Vectors')[0].summary).toMatch(/2D6.*Half-strength.*6 or less.*D3/);
 });
 it('separates Daemon interactions and reprints only compatible Deep Strike and Battleline recovery recipients',()=>{
  const a=force([tally],casters,legion,'Nurglings',unclean,'Chaos Warhound Titan');
  const close=by(equip(a,casters,'Beckoning Blight'),'000010135002')[0];
  expect(close.units).toContain(id(legion));
  expect(close.units).not.toContain(id(casters));
  expect(close.summary).toMatch(/wholly within 12″.*more than 6″/);
  expect(by(force([tally],mar),'000010136003')).toHaveLength(0);
  expect(by(force([tally],'Nurglings'),'000010136004')).toHaveLength(0);
  expect(by(a,'000010136002')).toHaveLength(5);
  expect(by(equip(a,casters,'Tome of Bounteous Blessings'),'000010135005')[0].summary).toContain('Battleline unit');
 });
 it('scopes Flyblown chosen deployment, actual Contagion Engines and selectable Warlord plagues',()=>{
  const a=force([eng,fly],mar,mar,mar,'Foetid Bloat-drone',hel,rhino);
  expect(named(a,'Verminous Haze')[0].units).toEqual([id(mar),id(mar,2),id(mar,3)]);
  expect(named(a,'Verminous Haze')[0].summary).toContain('up to two');
  expect(by(a,'000010945003')[0].units).toEqual([id(hel)]);
  expect(by(a,'000010945002').find(r=>r.window==='Fight')?.units).toEqual(['Foetid Bloat-drone#1',id(hel)]);
  expect(by(equip(force([para],sur),sur,'Host of the Hybridised Pox'),'000010948003')[0].summary).toMatch(/once per battle per army.*Skullsquirm Blight/i);
 });
 it.each([
  [champs,bio,'Final Ingredient','Fight','Character model'],[champs,casters,'Visions of Virulence','Shooting','Afflicted'],
  [champs,'Lord of Poxes','Cornucophagus','Pre-battle','select one Plague'],[eng,hel,'Lancet of the Worldsore','Charge','Mobile'],
  [eng,hel,'Parasitic Woe‑Reaper','Fight','heals D3'],[chosen,lord,'Face of Death','Fight','Battle-shock'],
  [chosen,lord,'Helm of the Fly King','Shooting','18″'],[chosen,lord,'Vile Vigour','Movement','1″ Move'],
  [chosen,lord,'Warprot Talisman','End of opponent turn','Once per battle'],[fly,mar,'Insectile Murmuration','Fight','Wound rolls of 1'],
  [fly,mar,'Plagueveil','Shooting','3″'],[hammer,casters,'Bilemaw Blight','Shooting','12″'],
  [hammer,casters,'Eye of Affliction','Shooting','Ignores Cover'],[hammer,lord,'Shriekworm Familiar','Movement','0CP'],
  [hammer,lord,'Tendrilous Emissions','Shooting','Lone Operative'],[para,casters,'Rejuvenating Swarm','Fight','Toughness'],
  [para,casters,'Host of the Hybridised Pox','Command','rest of the battle'],[shamb,casters,'Lord of the Walking Pox','Movement','round three'],
  [shamb,casters,'Sorrowsyphon','Shooting','destroy D3 Bodyguard'],[shamb,casters,'Talisman of Burgeoning','Fight','Poxwalkers models'],
  [shamb,bells,'Witherbone Pipes','Command','1 Objective Control'],[tally,casters,'Beckoning Blight','Movement','6″'],
  [tally,unclean,'Entropic Knell','Command','below Starting Strength'],[tally,casters,'Fell Harvester','Fight','2 Attacks'],
  [tally,casters,'Tome of Bounteous Blessings','Command','D3 wounds'],[vir,lord,'Arch Contaminator','Fight','Wound rolls'],
  [vir,lord,'Daemon Weapon of Nurgle','Fight','Critical Hits'],[vir,lord,'Furnace of Plagues','Fight','Devastating Wounds'],
  [vir,lord,'Revolting Regeneration','Movement','Feel No Pain 5+'],
 ])('applies the chosen %s upgrade to its actual %s bearer – %s',(det,bearer,choice,phase,trigger)=>{
  let a=force([det],...new Set([bearer,casters,mar,pox,term,rhino,legion,lord]));
  a=edit(edit(a,lord,{attachedTo:id(term)}),det===shamb?bearer:casters,{attachedTo:id(det===shamb?pox:mar)});
  const option=eligibleDeathGuardUpgrades(a,bearer).find(u=>u.name===choice);
  expect(option,choice).toBeDefined();
  const rows=by(equip(a,bearer,choice),option!.id);
  expect(rows.find(r=>r.window===phase)?.summary,choice).toContain(trigger);
  expect(by(a,option!.id)).toHaveLength(0);
 });
 it('replaces the Surgeon’s intrinsic restoration when the Needle of Nurgle is selected',()=>{
  const a=edit(force([champs],sur,mar),sur,{attachedTo:id(mar)});
  const before=deathGuardIntrinsicReminders(a).find(r=>r.title.includes('Tainted Narthecium'));
  const after=deathGuardIntrinsicReminders(equip(a,sur,'Needle of Nurgle')).filter(r=>r.title.includes('Tainted Narthecium'));
  expect(before?.summary).not.toContain('D3');
  expect(after).toHaveLength(1);
  expect(after[0].summary).toContain('D3');
 });
 it('exercises every one of the 45 matched Stratagems with real eligible models and printable windows',()=>{
  for(const [det,count] of [[champs,6],[eng,3],[chosen,6],[fly,3],[hammer,6],[para,3],[shamb,6],[tally,6],[vir,6]] as const){
   let a=force([det],...DEATH_GUARD_SHEETS.map(s=>s.unit),mar);
   a=edit(edit(a,bio,{attachedTo:id(mar)}),'Icon Bearer',{attachedTo:id(mar)});
   const all=generate(a),strats=all.filter(r=>r.id.startsWith('11e-dg-strat-'));
   expect(new Set(strats.map(r=>r.sourceRuleId)).size,det).toBe(count);
   expect(strats.every(r=>r.units?.length&&r.summary.length>30&&r.title.includes('CP')&&r.turn)).toBe(true);
   expect(new Set(all.map(r=>r.id)).size,det).toBe(all.length);
  }
 });
});
