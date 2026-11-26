import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {votannStratagemReminders as generate} from '../src/votann-stratagems';

const hearthguard='Einhyr Hearthguard',warriors='Hearthkyn Warriors',beserks='Cthonian Beserks',hekaton='Hekaton Land Fortress';
const steel='Ironkin Steeljacks with Heavy Volkanite Disintegrators',pioneers='Hernkyn Pioneers',thunderkyn='Brôkhyr Thunderkyn';
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 const instances=units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}));
 return {...newSelection('Leagues of Votann'),instances,units:counts,detachments2026:detachments};
}
const equip=(army:ArmySelection,unit:string,props:Partial<RosterInstance>):ArmySelection=>({
 ...army,instances:army.instances?.map(s=>s.unit===unit?{...s,...props}:s),
});
const card=(army:ArmySelection,name:string)=>generate(army).find(s=>s.title.startsWith(name+' ·'));

// Each case runs the current, roster-dependent generation path, requiring the
// relevant unit, disposition-specific trigger, printed phase and turn owner.
const cases=[
 ['Armoured Trailblazers','Sagitaur','Built To Last','Shooting','opponent','exceeds its Toughness'],
 ['Armoured Trailblazers','Sagitaur','Coordinated Crossfire','Shooting','own','up to two Sagitaurs'],
 ['Armoured Trailblazers','Sagitaur','Outflanking Armour','Movement','opponent','round 2'],
 ['Brandfast Oathband',hekaton,'Bastion Running','Movement','own','horizontally through terrain'],
 ['Brandfast Oathband','Sagitaur','Inexorable Efficiency','Shooting','own','Fell Back'],
 ['Brandfast Oathband','Sagitaur','Opportunistic Escalation','Shooting','opponent','Hostile Acquisition'],
 ['Dêlve Assault Shift',beserks,'Cyberstimm Infusion','Fight','either','2 YP'],
 ['Dêlve Assault Shift',beserks,'Weavewërke Buttress','Shooting','opponent','−1 to Wound'],
 ['Dêlve Assault Shift','Cthonian Earthshakers','Tectonic Fracture','Shooting','own','subtract 2 from its Charge rolls'],
 ['Dêlve Assault Shift',beserks,'Unstoppable Force','Fight','either','6″'],
 ['Dêlve Assault Shift',warriors,'Hidden Accessways','Fight','opponent','unengaged'],
 ['Dêlve Assault Shift',beserks,'Augmented Assault','Movement','own','no YP'],
 ['Farseekers',pioneers,'No Shot Wasted','Shooting','own','Lethal Hits'],
 ['Farseekers',pioneers,'Economy Of Motion','Movement','opponent','D3+3″'],
 ['Farseekers','Kapricus Carrier','Scornful Analysis','Shooting','own','visible'],
 ['Hearthband','Kâhl','Brëkkeknots','Fight','either','4+ invulnerable'],
 ['Hearthband',hearthguard,'Fury Of The Hearth','Shooting','own','Sustained Hits 1'],
 ['Hearthband',warriors,'Superior Craftsmanship','Fight','either','1 Damage'],
 ['Hearthband',hekaton,'Sure Of Purpose','Fight','either','6″'],
 ['Hearthband',warriors,'Unyielding Aggression','Movement','own','charge this turn'],
 ['Hearthfyre Arsenal',steel,'Wall Of Steel','Charge','own','maximum of six'],
 ['Hearthfyre Arsenal',thunderkyn,'Unwavering Accuracy','Shooting','own','Ballistic Skill'],
 ['Hearthfyre Arsenal',steel,'Cogitated Need','Movement','opponent','nearest objective'],
 ['Hearthfyre Arsenal','Arkanyst Evaluator','First Concern','Shooting','own','Remained Stationary'],
 ['Hearthfyre Arsenal',thunderkyn,'Preventative Purge','Movement','opponent','−1 to Hit'],
 ['Hearthfyre Arsenal',steel,'Delayed-Fire Rounds','Shooting','own','six per move'],
 ['Hearthguard Covenant',hearthguard,'Brëkkeknots','Shooting','opponent','4+ invulnerable'],
 ['Hearthguard Covenant',hearthguard,'Fury Of The Hearth','Shooting','own','Sustained Hits 1'],
 ['Mercenary Oathband',hekaton,'Grand Artifice','Movement','own','Falls Back'],
 ['Mercenary Oathband',pioneers,'Auxiliary Contract','Fight','either','Precision'],
 ['Mercenary Oathband',pioneers,'Mobile Exploitation','Fight','opponent','up to two'],
 ['Mercenary Oathband',beserks,'Optimal Expenditure','Fight','either','any Wound roll'],
 ['Mercenary Oathband',warriors,'Privateer Arsenal','Shooting','own','any Hit roll'],
 ['Needgaârd Oathband',warriors,'Huntr’s Mark','Shooting','own','Hit and Wound rolls of 1'],
 ['Needgaârd Oathband',pioneers,'Ancestral Sentence','Shooting','own','Sustained Hits 2'],
 ['Needgaârd Oathband',beserks,'Honour Of The Hold','Fight','either','improve it by 2'],
 ['Needgaârd Oathband','Sagitaur','Ordered Retreat','Movement','own','Falls Back'],
 ['Needgaârd Oathband',warriors,'Reactive Reprisal','Shooting','opponent','Fortify Takeover'],
 ['Needgaârd Oathband',warriors,'Void Hardened','Fight','either','duration of that enemy unit'],
 ['Persecution Prospect',pioneers,'Frontier Momentum','Movement','own','+6″'],
 ['Persecution Prospect',pioneers,'Exposed Flaws','Shooting','own','assailed'],
 ['Persecution Prospect',warriors,'Ranger Tactics','Shooting','own','assailed'],
 ['Persecution Prospect',pioneers,'Dispersed Formation','Shooting','opponent','cover'],
 ['Persecution Prospect',beserks,'Claimstaker Reflex','Movement','opponent','within 8″'],
 ['Persecution Prospect','Kâhl','Adaptable Avarice','Command','either','6 YP or fewer'],
] as const;
describe('Votann Stratagem rules on selected formations',()=>{
 it.each(cases)('%s applies %s rules in the printed attack or movement window', (det,unit,title,phase,turn,condition)=>{
  const list=generate(force([det],unit)).filter(s=>s.title.startsWith(title+' ·')&&s.window===phase);
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({turn,units:[unit+'#1']});
  expect(list[0].summary).toContain(condition);
  expect(generate(force([],unit)).some(s=>s.title.startsWith(title+' ·'))).toBe(false);
 });
 it('uses actual split passengers for Secure Positions at the end of every friendly phase and for New Horizons in the opposing Fight phase',()=>{
  const army=force(['Brandfast Oathband','Mercenary Oathband'],'Sagitaur',warriors,'Cthonian Earthshakers');
  const cards=generate(army).filter(r=>r.title.startsWith('Secure Positions'));
  expect(cards.map(r=>[r.window,r.turn,r.timing])).toEqual(['Command','Movement','Shooting','Charge','Fight'].map(p=>[p,'own','end']));
  expect(new Set(cards.map(s=>s.id)).size).toBe(5);
  expect(cards[0].units).toEqual(['Sagitaur#1']);
  expect(cards[0].summary).toContain(warriors+'#1 (split half)');
  expect(cards[0].summary).not.toContain('Earthshakers');
  expect(card(army,'New Horizons')).toMatchObject({window:'Fight',turn:'opponent',timing:'end',units:[warriors+'#1']});
  expect(card(force(['Brandfast Oathband'],'Sagitaur','Cthonian Earthshakers'),'Secure Positions')).toBeUndefined();
  expect(card(force(['Mercenary Oathband'],warriors,'Kapricus Carrier'),'New Horizons')).toBeUndefined();
 });
 it('offers Vengeance Flare only with a real vehicle, and reports the optional heavy-vehicle Yield cost',()=>{
  const army=force(['Brandfast Oathband'],warriors,hekaton,'Kapricus Defenders');
  const flare=card(army,'Vengeance Flare');
  expect(flare?.units).toEqual([warriors+'#1']);
  expect(flare?.summary).toContain('Kapricus Defenders#1');
  expect(flare?.summary).toContain('2 YP to choose '+hekaton+'#1');
  expect(card(force(['Brandfast Oathband'],warriors),'Vengeance Flare')).toBeUndefined();
  expect(card(force(['Brandfast Oathband'],hekaton),'Vengeance Flare')).toBeUndefined();
  expect(card(army,'Illuminated Priority')?.units).toEqual([hekaton+'#1','Kapricus Defenders#1']);
 });
 it('does not offer shooting options to a squad without a gun, and keeps response windows with the player who acts',()=>{
  const det=['Brandfast Oathband','Needgaârd Oathband','Mercenary Oathband'];
  const noGun=force(det,beserks,hekaton);
  expect(card(noGun,'Reactive Reprisal')?.units).toEqual([hekaton+'#1']);
  expect(card(noGun,'Illuminated Priority')).toBeUndefined();
  expect(generate(noGun).filter(s=>s.title.startsWith('Auxiliary Contract')).map(s=>s.window)).toEqual(['Fight']);
  const withGun=equip(noGun,beserks,{knightGear:{'Mole launchers on axe or maul bearers':'Mole grenade launcher'}});
  expect(card(withGun,'Reactive Reprisal')?.units).toEqual([beserks+'#1',hekaton+'#1']);
  expect(card(withGun,'Illuminated Priority')?.units).toEqual([hekaton+'#1']);
  expect(generate(withGun).filter(s=>s.title.startsWith('Auxiliary Contract')).map(s=>s.window)).toEqual(['Shooting','Fight']);
 });
 it('applies each distinct Materialisation Matrices to the legal crest formation and excludes other units',()=>{
  for(const det of ['Hearthguard Covenant','Hearthband']){
   const army=force([det],hearthguard,'Kâhl','Hearthkyn Warriors');
   expect(card(army,'Materialisation Matrices')).toBeUndefined();
   const crest=equip(army,hearthguard,{knightGear:{'Hesyr crest':'Teleport Crest'}});
   const r=card(crest,'Materialisation Matrices');
   expect(r).toMatchObject({window:'Movement',turn:'own',units:[hearthguard+'#1']});
   expect(r?.summary).toContain('6″');
   expect(r?.summary).toContain('cannot charge');
   expect(generate(crest).find(s=>s.title.startsWith('Deep Strike'))?.units).toEqual([hearthguard+'#1']);
  }
 });
 it('requires a Kâhl to lead for its crest and includes the Dêlve and Fârstrydr grants',()=>{
  const solo=equip(force(['Hearthband'],'Kâhl',warriors),'Kâhl',{knightGear:{Crest:'Teleport Crest'}});
  expect(card(solo,'Materialisation Matrices')).toBeUndefined();
  const joined=equip(solo,'Kâhl',{knightGear:{Crest:'Teleport Crest'},attachedTo:warriors+'#1'});
  expect(card(joined,'Materialisation Matrices')?.units).toEqual([warriors+'#1']);
  const delve=force(['Dêlve Assault Shift'],beserks,'Berehk Stornbröw');
  expect(generate(delve).find(s=>s.title.startsWith('Deep Strike'))?.units).toEqual([beserks+'#1']);
  const node={...force(['Hearthfyre Arsenal'],'Memnyr Strategist',steel),upgrades2026:{'Memnyr Strategist#1':'Fârstrydr Node'}};
  const withNode=equip(node,'Memnyr Strategist',{attachedTo:steel+'#1'});
  expect(generate(withNode).find(s=>s.title.startsWith('Deep Strike'))?.units).toEqual([steel+'#1']);
 });
 it('excludes Artillery while selecting the legal Infantry formation once and maintaining unique multi-phase cards',()=>{
  const a=force(['Persecution Prospect'],'Cthonian Earthshakers','Brôkhyr Iron-master',warriors,'Kâhl');
  const army=equip(a,'Brôkhyr Iron-master',{attachedTo:warriors+'#1'});
  expect(card(army,'Claimstaker Reflex')?.units).toEqual([warriors+'#1','Kâhl#1']);
  const rows=generate(army);
  expect(rows.filter(s=>s.title.startsWith('Adaptable Avarice')).map(s=>s.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
  expect(new Set(rows.map(s=>s.id)).size).toBe(rows.length);
 });
});
