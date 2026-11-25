// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';

// Source expectations: 11e core 07.02.01, 15.07–15.09 and 24.09;
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/
// Death Guard faction pack v1.3, pages 3–4 (passive Flyblown/Paragons upgrades);
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_death_guard-bp5c8lcjq6-i4ew7urwyk.pdf
// Codex enhancement clauses and current errata (no phase restriction):
// https://wahapedia.ru/wh40k11ed/factions/death-guard/
const id=(unit:string)=>unit+'#1';
function army(detachment:string,...units:string[]):ArmySelection{
 let a=individualArmy({...newSelection('Death Guard'),detachments2026:[detachment]});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const join=(a:ArmySelection,leader:string,bodyguard:string)=>setInstanceAttachment(a,id(leader),id(bodyguard));
const chosen=(a:ArmySelection,bearer:string,upgrade:string)=>selectUpgrade2026(a,id(bearer),upgrade);
const effects=(a:ArmySelection,upgrade:string)=>generate11thReminders(a).filter(r=>r.title.endsWith(' · '+upgrade));
const stages=(a:ArmySelection,upgrade:string)=>effects(a,upgrade).map(r=>[r.window,r.turn,r.timing]);

describe('phase-unlocked Death Guard effects during reactions',()=>{
 it.each([
  ['Paragons of Putrescence','Malignant Plaguecaster','Plague Marines','Rejuvenating Swarm','Toughness'],
  ['Flyblown Host','Plague Marines',undefined,'Plagueveil','detection range'],
  ['Death Lord’s Chosen','Lord of Virulence','Blightlord Terminators','Helm of the Fly King','18″'],
  ['Shamblerot Vectorium','Malignant Plaguecaster','Poxwalkers','Talisman of Burgeoning','only to Poxwalkers'],
 ] as const)('%s preserves %s / %s defensive upgrade %s against enemy Overwatch',(detachment,bearer,bodyguard,upgrade,condition)=>{
  let a=army(detachment,bearer,...(bodyguard?[bodyguard]:[]),'Plague Marines');
  if(bodyguard)a=join(a,bearer,bodyguard);
  a=chosen(a,bearer,upgrade);
  const card=effects(a,upgrade).find(r=>r.window==='Movement'&&r.turn==='own');
  expect(card).toMatchObject({timing:'end',units:[id(bodyguard??bearer)]});
  expect(card?.summary).toContain('enemy Overwatch');
  expect(card?.summary).toContain(condition);
  expect(card?.units).not.toContain('Plague Marines#2');
  expect(effects(a,upgrade).some(r=>r.window==='Movement'&&r.turn==='opponent')).toBe(false);
 });

 it.each([
  ['Mortarion’s Hammer','Malignant Plaguecaster','Plague Marines','Eye of Affliction','Ignores Cover'],
  ['Flyblown Host','Plague Marines',undefined,'Insectile Murmuration','Wound rolls of 1'],
  ['Virulent Vectorium','Malignant Plaguecaster','Plague Marines','Arch Contaminator','objective you control'],
  ['Shamblerot Vectorium','Malignant Plaguecaster','Poxwalkers','Sorrowsyphon','destroy D3 Bodyguard models'],
 ] as const)('%s applies the selected %s / %s upgrade %s during real reactive shooting',(detachment,bearer,bodyguard,upgrade,condition)=>{
  let a=army(detachment,bearer,...(bodyguard?[bodyguard]:[]),'Plague Marines');
  if(bodyguard)a=join(a,bearer,bodyguard);
  a=chosen(a,bearer,upgrade);
  expect(stages(a,upgrade)).toContainEqual(['Movement','opponent','end']);
  const card=effects(a,upgrade).find(r=>r.window==='Movement');
  expect(card).toMatchObject({units:[id(bodyguard??bearer)]});
  expect(card?.summary).toContain(condition);
  expect(card?.summary).not.toMatch(/Critical Hits|re-roll.*Hit rolls/);
  expect(effects(a,upgrade).some(r=>r.window==='Shooting'&&r.turn==='opponent')).toBe(false);
  a=addSelectionUnit(a,'Mortarion');
  const reprisal=effects(a,upgrade).find(r=>r.window==='Shooting'&&r.turn==='opponent');
  expect(reprisal).toMatchObject({units:[id(bodyguard??bearer)]});
  expect(reprisal?.summary).toContain('Mortarion uses Inflamed Reprisal');
  expect(reprisal?.summary).toContain(condition);
  expect(reprisal?.units).not.toContain(id('Mortarion'));
 });

 it('shows Tendrilous Emissions for its bearer and only eligible nearby Vehicles during each reaction',()=>{
  let a=chosen(army('Mortarion’s Hammer','Lord of Virulence'),'Lord of Virulence','Tendrilous Emissions');
  expect(effects(a,'Tendrilous Emissions')).toEqual([]);
  for(const unit of ['Plagueburst Crawler','Foetid Bloat-drone','Plague Marines','War Dog Brigand','Mortarion'])a=addSelectionUnit(a,unit);
  const rows=effects(a,'Tendrilous Emissions');
  const own=rows.find(r=>r.window==='Movement'&&r.turn==='own');
  expect(own).toMatchObject({timing:'end',units:[id('Lord of Virulence')],summary:expect.stringContaining('Lone Operative')});
  const snap=rows.find(r=>r.window==='Movement'&&r.turn==='opponent');
  expect(snap).toMatchObject({timing:'end',units:[id('Plagueburst Crawler')]});
  expect(snap?.summary).toContain('within 3″');
  expect(snap?.summary).toContain('visible to that bearer');
  const reprisal=rows.find(r=>r.window==='Shooting'&&r.turn==='opponent'&&r.summary.includes('Inflamed Reprisal'));
  expect(reprisal?.units).toEqual([id('Plagueburst Crawler')]);
  // Both protection and return-fire effects coexist without a duplicate identity.
  expect(rows.filter(r=>r.window==='Shooting'&&r.turn==='opponent')).toHaveLength(2);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 });

 it('does not grant reactive ranged effects to an unarmed formation or a no-longer-led Poxwalker unit',()=>{
  let a=chosen(army('Virulent Vectorium','Lord of Contagion'),'Lord of Contagion','Arch Contaminator');
  a=addSelectionUnit(a,'Mortarion');
  expect(stages(a,'Arch Contaminator')).toEqual([['Fight','either','during']]);
  let pox=chosen(join(army('Shamblerot Vectorium','Malignant Plaguecaster','Poxwalkers'),'Malignant Plaguecaster','Poxwalkers'),'Malignant Plaguecaster','Sorrowsyphon');
  expect(effects(pox,'Sorrowsyphon').some(r=>r.window==='Movement')).toBe(true);
  pox=setInstanceAttachment(pox,id('Malignant Plaguecaster'),null);
  expect(effects(pox,'Sorrowsyphon')).toEqual([]);
 });

 it('retains Beckoning Blight and Lord of the Walking Pox for legal Rapid Ingress without waiving round-one restrictions',()=>{
  const summoned=chosen(army('Tallyband Summoners','Malignant Plaguecaster','Plaguebearers','Plague Marines'),'Malignant Plaguecaster','Beckoning Blight');
  const beckon=effects(summoned,'Beckoning Blight').find(r=>r.turn==='opponent');
  expect(beckon).toMatchObject({window:'Movement',timing:'end',units:[id('Plaguebearers')]});
  expect(beckon?.summary).toMatch(/after the first battle round.*wholly within 12″.*more than 6″/);
  const a=chosen(join(army('Shamblerot Vectorium','Malignant Plaguecaster','Poxwalkers'),'Malignant Plaguecaster','Poxwalkers'),'Malignant Plaguecaster','Lord of the Walking Pox');
  expect(effects(a,'Lord of the Walking Pox').find(r=>r.turn==='opponent')).toMatchObject({
   window:'Movement',timing:'end',units:[id('Poxwalkers')],summary:expect.stringMatching(/after the first battle round.*round three/),
  });
 });

 it('keeps phase-locked shooting bonuses out of Overwatch and Mortarion’s return fire',()=>{
  let a=chosen(army('Mortarion’s Hammer','Malignant Plaguecaster','Mortarion','Plagueburst Crawler','Myphitic Blight-hauler','Foetid Bloat-drone with Heavy Blight Launcher','Defiler'),'Malignant Plaguecaster','Bilemaw Blight');
  expect(stages(a,'Bilemaw Blight')).toEqual([['Shooting','own','start']]);
  for(const title of ['Pestilent Fallout','Spore-laced Shock Waves','Tank Hunters','Explosive Blight','Barrage of Filth']){
   const attacks=generate11thReminders(a).filter(r=>r.title===title&&r.window!=='Movement');
   expect(attacks.map(r=>[r.window,r.turn])).toEqual([['Shooting','own']]);
  }
  a=chosen(join(army('Champions of Contagion','Malignant Plaguecaster','Plague Marines','Biologus Putrifier'),'Malignant Plaguecaster','Plague Marines'),'Malignant Plaguecaster','Visions of Virulence');
  a=join(a,'Biologus Putrifier','Plague Marines');
  expect(stages(a,'Visions of Virulence')).toEqual([['Shooting','own','during']]);
  expect(generate11thReminders(a).filter(r=>['Foul Infusion','Gift of Contagion'].includes(r.title)&&r.window==='Movement')).toEqual([]);
 });
});
