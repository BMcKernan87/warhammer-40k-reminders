import {describe,it,expect} from 'vitest';
import {newSelection,validateSelection} from '../src/catalog';
import {knightEquippedItems,knightWeaponCount,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {setInstanceModelCount,type RosterInstance} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {shadowLegionHasRangedWeapon} from '../src/shadow-legion-cards';
import {KNIGHT_CARD_STATS as cards} from '../src/shadow-marine-card-data.generated';
import {shadowMarineLoadout} from '../src/shadow-legion-loadouts';

const unit=(id:string,name=id,models?:number):RosterInstance=>({id,unit:name,...(models?{models}:{})});
const army=(...instances:RosterInstance[])=>{
 const units:Record<string,number>={};
 for(const s of instances)units[s.unit]=(units[s.unit]??0)+1;
 return {...newSelection('Chaos Daemons'),units,detachments2026:['Shadow Legion'],instances};
};
const named=(a:ReturnType<typeof army>,name:string)=>generate11thReminders(a).filter(r=>r.id.startsWith('11e-shadow-marine:')&&r.title.endsWith(' · '+name));
const edit=(s:RosterInstance,gear:Record<string,string>)=>({...s,knightGear:gear});
describe('Shadow Legion marine equipment',()=>{
 it('uses printed standard weapons and generates only the weapon keywords actually equipped by each of the fourteen allied cards',()=>{
  expect(Object.keys(cards)).toHaveLength(14);
  for(const name of Object.keys(cards)){
   const s=unit(name);
   expect(shadowMarineLoadout(name)).toBeDefined();
   expect(knightEquippedItems(s).length).toBeGreaterThan(0);
   for(const weapon of cards[name].weapons){
    if(knightWeaponCount(s,weapon.name)>0&&weapon.abilities.length&&weapon.phase==='Fight'){
      expect(named(army(s),'Melee weapon profiles').some(r=>r.summary.includes(weapon.name))).toBe(true);
    }
   }
  }
  const normal=unit('lord','Chaos Lord'),dual=edit(normal,{Sidearm:'Power fist'});
  expect(shadowLegionHasRangedWeapon(normal)).toBe(true);
  expect(shadowLegionHasRangedWeapon(dual)).toBe(false);
  expect(named(army(dual),'Ranged weapon profiles')).toEqual([]);
  expect(named(army(normal),'Ranged weapon profiles').some(r=>r.summary.includes('Hazardous'))).toBe(true);
 });
 it('uses per-five Terminator allowances, forbids heavy weapons for the Champion, and keeps paired replacements together',()=>{
  const s=unit('body','Chaos Terminator Squad',5),gear={'Model 2 weapons':'Heavy flamer + Power fist','Model 3 weapons':'Paired accursed weapons','Model 4 weapons':'Combi-weapon + Chainfist'};
  const original=edit(s,gear);
  expect(validKnightGear(original)).toBe(true);
  expect(validKnightGear(edit(original,{...gear,'Champion weapons':'Reaper autocannon + Power fist'}))).toBe(false);
  expect(validKnightGear(edit(original,{...gear,'Model 5 weapons':'Reaper autocannon + Power fist'}))).toBe(false);
  expect(validKnightGear(edit(original,{...gear,'Model 5 weapons':'Paired accursed weapons'}))).toBe(false);
  expect(knightWeaponCount(original,'Combi-bolter')).toBe(2);
  const full={...original,models:10,knightGear:{...gear,'Model 5 weapons':'Reaper autocannon + Power fist'}};
  expect(validKnightGear(full)).toBe(true);
  const smaller=setInstanceModelCount(army(full),'body',5).instances![0];
  expect(validKnightGear(smaller)).toBe(true);
  expect(knightWeaponCount(smaller,'Heavy flamer')).toBe(1);
  expect(knightWeaponCount(smaller,'Reaper autocannon')).toBe(0);
 });
 it('keeps each Chosen power fist with its boltgun and limits plasma pistols, combi-weapons, icons and paired weapons',()=>{
  const s=unit('chosen','Chosen',5);
  const gear={'Champion weapons':'Boltgun + Power fist','Model 2 weapons':'Paired accursed weapons','Model 2 pistol':'Plasma pistol','Model 3 pistol':'Plasma pistol','Chaos icon bearer':'Model 3'};
  expect(validKnightGear(edit(s,gear))).toBe(true);
  expect(validKnightGear(edit(s,{...gear,'Model 4 pistol':'Plasma pistol'}))).toBe(false);
  expect(validKnightGear(edit(s,{...gear,'Champion weapons':'Combi-weapon + Power fist'}))).toBe(false);
  expect(validKnightGear(edit(s,{...gear,'Model 4 weapons':'Boltgun + Power fist'}))).toBe(false);
  expect(validKnightGear(edit(s,{...gear,'Chaos icon bearer':'Model 6'}))).toBe(false);
  expect(named(army(edit(s,gear)),'Chaos Icon')[0].summary).toContain('Model 3');
  expect(named(army(s),'Chaos Icon')).toEqual([]);
 });
 it('distinguishes two pools of five Raptors while enforcing the distinct specialist choices and compulsory chainsword on plasma pistol bearers',()=>{
  const s=unit('raptors','Raptors',5);
  const gear={'Champion weapons':'Plasma pistol + Heavy melee weapon','Model 2 weapons':'Plasma pistol + Astartes chainsword','Model 3 weapons':'Bolt pistol + Flamer + Close combat weapon','Model 4 weapons':'Bolt pistol + Meltagun + Close combat weapon'};
  expect(validKnightGear(edit(s,gear))).toBe(true);
  expect(validKnightGear(edit(s,{...gear,'Model 2 weapons':'Plasma pistol + Heavy melee weapon'}))).toBe(false);
  expect(validKnightGear(edit(s,{...gear,'Model 4 weapons':gear['Model 3 weapons']}))).toBe(false);
  expect(validKnightGear(edit(s,{...gear,'Model 5 weapons':'Bolt pistol + Plasma gun + Close combat weapon'}))).toBe(false);
  const ten=edit({...s,models:10},{...gear,'Model 5 weapons':gear['Model 3 weapons'],'Model 6 weapons':'Bolt pistol + Plasma gun + Close combat weapon'});
  expect(validKnightGear(ten)).toBe(true);
  expect(knightWeaponCount(ten,'Flamer')).toBe(2);
  expect(validKnightGear({...ten,knightGear:{...ten.knightGear,'Model 7 weapons':gear['Model 4 weapons']}})).toBe(false);
 });
 it('handles the Legionary champion separately, allows two distinct special weapons at ten, and limits heavy melee and tomes per squad',()=>{
  const ten=unit('legion','Legionaries',10);
  const gear={'Champion boltgun':'Plasma pistol','Champion pistol':'Heavy melee weapon','Model 2 boltgun':'Heavy melee weapon','Model 3 boltgun':'Balefire tome','Model 4 boltgun':'Havoc autocannon','Model 5 boltgun':'Reaper chaincannon'};
  expect(validKnightGear(edit(ten,gear))).toBe(true);
  expect(validKnightGear(edit(ten,{...gear,'Champion pistol':'Plasma pistol'}))).toBe(false);
  expect(validKnightGear(edit(ten,{...gear,'Model 5 boltgun':'Havoc autocannon'}))).toBe(false);
  expect(validKnightGear(edit(ten,{...gear,'Model 6 boltgun':'Heavy melee weapon'}))).toBe(false);
  expect(validKnightGear(edit(ten,{...gear,'Model 6 boltgun':'Balefire tome'}))).toBe(false);
  expect(validKnightGear(edit({...ten,models:5},gear))).toBe(false);
  expect(knightWeaponCount(edit(ten,gear),'Heavy melee weapon')).toBe(2);
 });
 it('edits through the builder entry point, retains dedicated Havoc and Sorcerer choices, and survives JSON persistence',()=>{
  const a=army(unit('havocs','Havocs',5),unit('seer','Sorcerer In Terminator Armour'));
  let chosen=setKnightGear(a,'havocs','Havoc 1','Havoc reaper chaincannon');
  chosen=setKnightGear(chosen,'seer','Chaos familiar','Chaos familiar');
  const saved=JSON.parse(JSON.stringify(chosen));
  expect(validateSelection(saved)).toBe(true);
  expect(knightWeaponCount(saved.instances[0],'Havoc autocannon')).toBe(1);
  expect(knightWeaponCount(saved.instances[0],'Havoc lascannon')).toBe(2);
  expect(knightWeaponCount(saved.instances[0],'Havoc reaper chaincannon')).toBe(1);
  expect(named(saved,'Chaos Familiar')[0].summary).toContain('Damage characteristic to 0');
 });
});
describe('intrinsic allied card triggers in real formations',()=>{
 it('charges a single army-wide Lord discount while three variants retain their own personal or led abilities',()=>{
  const a=army(unit('body','Chosen'),{...unit('lord','Chaos Lord'),attachedTo:'body'},unit('tank','Chaos Lord In Terminator Armour'),unit('jump','Chaos Lord with Jump Pack'));
  expect(named(a,'Lord of Chaos')).toHaveLength(5);
  expect(named(a,'Lord of Chaos')[0].units).toEqual(['body','tank','jump']);
  expect(named(a,'Chance for Glory')).toMatchObject([{units:['lord'],window:'Fight',timing:'start'}]);
  expect(named(a,'Formidably Resilient')[0].units).toEqual(['tank']);
  expect(named(a,'Cruel Hunter')).toEqual([]);
  expect(named(army(unit('raptors','Raptors'),{...unit('jump','Chaos Lord with Jump Pack'),attachedTo:'raptors'}),'Cruel Hunter')[0].units).toEqual(['raptors']);
 });
 it('checks the actual army and formation for Dark Pacts abilities, Psychic shooting access and nearby Heretic Astartes targets',()=>{
  const possessed=unit('body','Possessed'),master={...unit('master','Master Of Possession'),attachedTo:'body'};
  const joined=army(possessed,master,unit('dark','Dark Apostle'),unit('cult','Cultist Mob'),unit('hounds','Flesh Hounds'));
  expect(named(joined,'Unholy Bloodshed').map(r=>r.window)).toEqual(['Movement','Shooting','Fight']);
  expect(named(army(possessed),'Unholy Bloodshed').map(r=>r.window)).toEqual(['Fight']);
  expect(named(joined,'Demagogue')[0].units).toEqual(['body','dark','cult']);
  expect(named(joined,'Daemonkin (Psychic)')[0].units).toEqual(['body']);
  expect(named(joined,'Sacrificial Dagger')[0].units).toEqual(['master']);
  expect(named({...joined,detachments2026:['Daemonic Incursion']},'Unholy Bloodshed')).toEqual([]);
 });
 it('resolves Death Hex once, preserves its exposure through the enemy turn, and resolves Psychic hit and Leadership conditions for Gift of Chaos',()=>{
  const a=army(unit('one','Sorcerer In Terminator Armour'),unit('two','Sorcerer In Terminator Armour'),unit('seer','Sorcerer'),unit('talons','Warp Talons'));
  expect(named(a,'Death Hex (Psychic)')).toMatchObject([{turn:'own',timing:'start',summary:expect.stringMatching(/On 1.*D3 mortal wounds.*On 2\+.*next Movement/),units:['one','two']}]);
  expect(named(a,'Death Hex · marked target').some(r=>r.turn==='opponent'&&r.window==='Shooting')).toBe(true);
  expect(named(a,'Gift of Chaos (Psychic)').find(r=>r.window==='Fight')?.summary).toMatch(/hit by.*Psychic attacks.*Leadership test.*D3 mortal wounds/);
  expect(named(a,'Warp Strike')).toMatchObject([{window:'Fight',timing:'end',summary:expect.stringMatching(/destroyed at least one enemy.*unengaged.*Strategic Reserves/)}]);
 });
});
