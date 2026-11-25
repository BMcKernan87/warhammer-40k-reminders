import {expect,it} from 'vitest';
import type {ArmySelection} from '../src/catalog';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {knightEquippedItems,knightLoadoutFor,knightWeaponCount,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';

const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
function army(s:RosterInstance):ArmySelection {
  return {faction:'Chaos Knights',detachment:'Select detachment (unverified)',units:{[s.unit]:1},instances:[s]};
}
function change(s:RosterInstance,slot:string,choice:string) {
  return expandRoster(setKnightGear(army(s),s.id,slot,choice))[0];
}

const configurations: Record<string,number>={
  'Chaos Acastus Knight Asterius':1,'Chaos Acastus Knight Porphyrion':6,
  'Chaos Cerastus Knight Acheron':1,'Chaos Cerastus Knight Atrapos':1,
  'Chaos Cerastus Knight Castigator':1,'Chaos Cerastus Knight Lancer':1,
  'Chaos Questoris Knight Magaera':2,'Chaos Questoris Knight Styrix':2,
  'Knight Abominant':1,'Knight Desecrator':2,'Knight Despoiler':128,'Knight Rampager':1,
  'Knight Ruinator':1,'Knight Tyrant':4,'War Dog Brigand':2,'War Dog Executioner':2,
  'War Dog Huntsman':2,'War Dog Karnivore':2,'War Dog Moirax':25,'War Dog Stalker':8,
  'Accursed Cultists':1,'Cultist Firebrand':1,'Cultist Mob':2,'Dark Commune':1,'Fellgor Beastmen':8,
  'Traitor Enforcer':1,'Traitor Guardsmen Squad':816,
};
it.each(Object.entries(configurations))('equips every legal set of replacements on %s',(name,count)=>{
  const base=squad(name);
  let result=[base];
  for(const slot of knightLoadoutFor('Chaos Knights',name)!.slots){
    result=result.flatMap(s=>slot.choices.flatMap(c=>{
      const configured={...s,knightGear:{...s.knightGear,[slot.name]:c.name}};
      if(!validKnightGear(configured,'Chaos Knights'))return [];
      return [change(s,slot.name,c.name)];
    }));
  }
  expect(result).toHaveLength(count);
  for(const s of result){
    expect(knightEquippedItems(s).length).toBeGreaterThan(0);
    expect(knightEquippedItems(JSON.parse(JSON.stringify(s)))).toEqual(knightEquippedItems(s));
  }
});

it('counts each paid Despoiler gun with its accompanying weapon on the bearer',()=>{
  const model=squad('Knight Despoiler');
  expect(knightWeaponCount(model,'Warpstrike claw – sweep')).toBe(1);
  const gatling='Despoiler gatling cannon + Heavy darkflamer', battle='Despoiler battle cannon + Diabolus heavy stubber';
  const mixed=change(change(model,'Chainsword arm',gatling),'Claw arm',battle);
  for(const gun of ['Despoiler gatling cannon','Heavy darkflamer','Despoiler battle cannon','Diabolus heavy stubber'])expect(knightWeaponCount(mixed,gun)).toBe(1);
  for(const gun of ['Reaper chainsword','Warpstrike claw'])expect(knightWeaponCount(mixed,gun)).toBe(0);
  const twin=change(change(mixed,'Chainsword arm',battle),'Hull weapon','Diabolus heavy stubber');
  expect(knightWeaponCount(twin,'Despoiler battle cannon')).toBe(2);
  expect(knightWeaponCount(twin,'Diabolus heavy stubber')).toBe(3);
  expect(knightWeaponCount(twin,'Heavy darkflamer')).toBe(0);
  expect(knightWeaponCount(change(mixed,'Claw arm',gatling),'Despoiler gatling cannon')).toBe(2);
  expect(()=>change(mixed,'Claw arm','Despoiler battle cannon')).toThrow();
  expect(()=>change(mixed,'Carapace','Havoc multi-launcher')).toThrow();
});
it('exchanges both Tyrant arm weapons together and retains the linked missile count',()=>{
  let model=squad('Knight Tyrant');
  expect(knightWeaponCount(model,'Ectoplasma decimator – supercharge')).toBe(1);
  model=change(model,'Arm weapons','Darkflame cannon + Warpshock harpoon');
  expect(knightWeaponCount(model,'Brimstone volcano lance')+knightWeaponCount(model,'Ectoplasma decimator')).toBe(0);
  expect(knightWeaponCount(model,'Warpshock harpoon')).toBe(1);
  expect(()=>change(model,'Arm weapons','Darkflame cannon + Brimstone volcano lance')).toThrow();
  model=change(model,'Carapace','Gheiststrike missile launcher + 2 × Twin Desecrator cannon');
  expect(knightWeaponCount(model,'Gheiststrike missile launcher')).toBe(1);
  expect(knightWeaponCount(model,'Twin Desecrator cannon')).toBe(2);
  expect(knightWeaponCount(model,'Twin daemonbreath meltagun')).toBe(2);
});
it('distinguishes restricted War Dog weapon profiles and paired siege arms',()=>{
  const stalker=change(change(squad('War Dog Stalker'),'Gun arm','Daemonbreath spear'),'Melee arm','Reaper chaintalon');
  expect(knightWeaponCount(stalker,'Reaper chaintalon – strike')).toBe(1);
  expect(knightWeaponCount(stalker,'Slaughterclaw')+knightWeaponCount(stalker,'Avenger chaincannon')).toBe(0);
  expect(knightWeaponCount(squad('War Dog Huntsman'),'Armoured feet')).toBe(0);
  expect(knightWeaponCount(squad('War Dog Executioner'),'Armoured feet')).toBe(1);
  expect(knightWeaponCount(squad('War Dog Executioner'),'War Dog autocannon')).toBe(2);
  const moirax=change(change(squad('War Dog Moirax'),'Volkite arm','Siege claw + Rad cleanser'),'Graviton arm','Siege claw + Rad cleanser');
  expect(knightWeaponCount(moirax,'Rad cleanser')).toBe(2);
  expect(knightWeaponCount(moirax,'Siege claw')).toBe(2);
  expect(knightLoadoutFor('Imperial Knights','War Dog Moirax')).toBeUndefined();
});
it('equips three distinct guardsmen specialists without displacing the sergeant',()=>{
  let guardsmen=squad('Traitor Guardsmen Squad',10);
  guardsmen=change(change(guardsmen,'Sergeant firearm','Boltgun'),'Sergeant melee weapon','Power weapon');
  guardsmen=change(change(change(guardsmen,'First specialist','Flamer'),'Second specialist','Plasma gun'),'Third specialist','Meltagun');
  expect(knightWeaponCount(guardsmen,'Lasgun')).toBe(6);
  expect(knightWeaponCount(guardsmen,'Close combat weapon')).toBe(9);
  expect(knightWeaponCount(guardsmen,'Plasma gun – supercharge')).toBe(1);
  expect(()=>change(guardsmen,'Second specialist','Flamer')).toThrow();
  expect(validKnightGear({...guardsmen,knightGear:{...guardsmen.knightGear,'Third specialist':'Plasma gun'}})).toBe(false);
});
it('keeps the Fellgor specialists on separate bearers and the icon on its Iconarch',()=>{
  const herd=change(change(squad('Fellgor Beastmen'),'Great weapon bearer','Great weapon'),'Stave bearer','Corrupted stave');
  expect(knightWeaponCount(herd,'Close combat weapon')).toBe(7);
  expect(knightWeaponCount(herd,'Autopistol')).toBe(9);
  expect(knightWeaponCount(herd,'Bolt pistol')).toBe(1);
  const commune=squad('Dark Commune');
  expect(knightWeaponCount(commune,'Chaos icon')).toBe(1);
  expect(knightWeaponCount(commune,'Commune blade')).toBe(2);
  expect(knightWeaponCount(commune,'Warp Curse')).toBe(1);
});
it('equips every Cultist Mob model with its own pistol and brutal assault weapon',()=>{
  for(let models=10; models<=20; models++){
    const base=squad('Cultist Mob',models);
    expect(knightWeaponCount(base,'Autopistol')).toBe(models);
    const upgraded=change(base,'Champion firearm','Bolt pistol');
    expect(knightWeaponCount(upgraded,'Autopistol')).toBe(models-1);
    expect(knightWeaponCount(upgraded,'Brutal assault weapon')).toBe(models);
  }
});
it('offers just the legal model splits for all nine Accursed Cultist sizes and preserves the chosen split on resize',()=>{
  for(let size=8;size<=16;size++){
    const options=knightLoadoutFor('Chaos Knights','Accursed Cultists',size)!.slots[0].choices;
    const eligible=[];
    for(let t=3;t<=6;t++)if(size-t>=5&&size-t<=10)eligible.push(t);
    expect(options.length).toBe(eligible.length);
    for(const torments of eligible){
      const model=change(squad('Accursed Cultists',size),'Composition',torments+' Torments + '+(size-torments)+' Mutants');
      expect(knightWeaponCount(model,'Hideous mutations')).toBe(torments);
      expect(knightWeaponCount(model,'Blasphemous appendages')).toBe(size-torments);
      for(let resized=8;resized<=16;resized++){
        const result={...model,models:resized,knightGear:resizeKnightComposition(model,resized)};
        expect(validKnightGear(result,'Chaos Knights')).toBe(true);
        expect(knightWeaponCount(result,'Hideous mutations')).toBe(Math.max(resized-10,Math.min(torments,resized-5)));
        expect(knightEquippedItems(result)).toHaveLength(resized);
      }
    }
  }
  expect(()=>change(squad('Accursed Cultists',10),'Composition','6 Torments + 4 Mutants')).toThrow();
});

it('prices two identical guns on one Despoiler independently of the next hull',async()=>{
  const {rosterCost2026}=await import('../src/datasheets-2026');
  const first=squad('Knight Despoiler'),second={...first,id:'Knight Despoiler#2'};
  const armyWithTwo={...army(first),units:{'Knight Despoiler':2},instances:[first,second]};
  let lance=setKnightGear(armyWithTwo,first.id,'Chainsword arm','Despoiler gatling cannon + Heavy darkflamer');
  lance=setKnightGear(lance,first.id,'Claw arm','Despoiler gatling cannon + Heavy darkflamer');
  lance=setKnightGear(lance,second.id,'Claw arm','Despoiler battle cannon + Diabolus heavy stubber');
  expect(rosterCost2026(lance).entries.map(e=>[e.basePoints,e.wargearPoints,e.points])).toEqual([[360,50,410],[390,10,400]]);
  expect(rosterCost2026(lance).total).toBe(810);
});

it('resizes an Accursed squad through the roster editor, preserves its Torments and charges by total models',async()=>{
  const {setInstanceModelCount,validateRosterInstances}=await import('../src/roster-instances');
  const {rosterCost2026}=await import('../src/datasheets-2026');
  const unit=change(squad('Accursed Cultists',12),'Composition','6 Torments + 6 Mutants');
  let fiefdom={...army(unit),detachments2026:['Iconoclast Fiefdom']};
  expect(rosterCost2026(fiefdom).total).toBe(185);
  for(const [models,torments,points] of [[14,6,185],[10,5,185],[8,3,90]]){
    fiefdom={...setInstanceModelCount(fiefdom,unit.id,models),detachments2026:['Iconoclast Fiefdom']};
    expect(validateRosterInstances(fiefdom)).toBe(true);
    expect(knightWeaponCount(expandRoster(fiefdom)[0],'Hideous mutations')).toBe(torments);
    expect(rosterCost2026(fiefdom).total).toBe(points);
  }
});

it('exposes only legal Iconoclast formations and resolves each actual attached bodyguard',async()=>{
  const {instanceBodyguards,knightJoinedBodyguard,rosterAttachmentRole}=await import('../src/leader-eligibility');
  const {autoAttachUnambiguousInstances,reconcileInstanceAttachments,setInstanceAttachment,validateRosterInstances}=await import('../src/roster-instances');
  for(const [leader,body] of [['Cultist Firebrand','Accursed Cultists'],['Cultist Firebrand','Cultist Mob'],['Dark Commune','Accursed Cultists'],['Dark Commune','Cultist Mob'],['Traitor Enforcer','Traitor Guardsmen Squad']]){
    const member=squad(leader),target=squad(body);
    const force={...army(member),detachments2026:['Iconoclast Fiefdom'],units:{[leader]:1,[body]:1},instances:[member,target]};
    expect(rosterAttachmentRole(force.faction,leader)).toBe('leader');
    expect(instanceBodyguards(force,member)).toContain(body);
    const automatic=autoAttachUnambiguousInstances(force);
    const joined=expandRoster(automatic).find(x=>x.id===member.id)!;
    expect(knightJoinedBodyguard(automatic,joined)?.id).toBe(target.id);
    expect(validateRosterInstances(automatic)).toBe(true);
    const standalone=setInstanceAttachment(automatic,member.id,null);
    expect(expandRoster(autoAttachUnambiguousInstances(standalone))[0].attachedTo).toBeUndefined();
    const removed=reconcileInstanceAttachments({...automatic,detachments2026:[]});
    expect(expandRoster(removed)[0].attachedTo).toBeUndefined();
    expect(instanceBodyguards(removed,member)).toEqual([]);
  }
  const body=squad('Cultist Mob'),leaders=['Dark Commune','Cultist Firebrand'].map(x=>({...squad(x),attachedTo:body.id}));
  const duplicate={...army(body),detachments2026:['Iconoclast Fiefdom'],units:{'Dark Commune':1,'Cultist Firebrand':1,'Cultist Mob':1},instances:[body,...leaders]};
  expect(validateRosterInstances(duplicate)).toBe(false);
  expect(knightJoinedBodyguard(duplicate,leaders[0])).toBeUndefined();
});
