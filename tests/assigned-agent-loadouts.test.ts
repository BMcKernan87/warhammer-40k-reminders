import {expect,it} from 'vitest';
import type {ArmySelection} from '../src/catalog';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {knightEquippedItems,knightLoadoutFor,knightWeaponCount,setKnightGear,validKnightGear} from '../src/knight-loadouts';

const model=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
function change(squad:RosterInstance,slot:string,choice:string,faction:ArmySelection['faction']='Imperial Knights'){
  const army:ArmySelection={faction,detachment:'Select detachment (unverified)',units:{[squad.unit]:1},instances:[squad]};
  return expandRoster(setKnightGear(army,squad.id,slot,choice))[0];
}
it.each([['Inquisitor',6],['Inquisitor Kroyle',1],['Ministorum Priest',2],['Corvus Blackstar',8],
  ['Sisters of Battle Immolator',6],['Inquisitorial Chimera',36],['Imperial Rhino',2]] as const)(
 'equips all printed %s configurations as native and Assigned Agents',(unit,total)=>{
   for(const faction of ['Imperial Knights','Imperial Agents'] as const){
     const sheet=knightLoadoutFor(faction,unit)!;
     let layouts=[model(unit)];
     for(const slot of sheet.slots)layouts=layouts.flatMap(s=>slot.choices.map(c=>change(s,slot.name,c.name,faction)));
     expect(layouts.length).toBe(total);
     for(const roster of layouts){
       expect(validKnightGear(roster,faction)).toBe(true);
       expect(knightEquippedItems(roster).length).toBeGreaterThan(0);
     }
   }
 });
it('requires Psychic gifts for the force weapon and the accompanying ranged profile',()=>{
  const bearer=model('Inquisitor');
  expect(knightWeaponCount(bearer,'Blessed wardings')).toBe(1);
  expect(knightWeaponCount(bearer,'Force weapon')+knightWeaponCount(bearer,'Psychic Shock Wave')).toBe(0);
  expect(()=>change(bearer,'Inquisitorial gifts','Blessed wardings + Force weapon')).toThrow();
  const psyker=change(bearer,'Inquisitorial gifts','Psychic gifts + Psychic Shock Wave + Force weapon');
  expect(knightWeaponCount(psyker,'Inquisitorial melee weapon')+knightWeaponCount(psyker,'Blessed wardings')).toBe(0);
  expect(knightWeaponCount(psyker,'Psychic gifts')).toBe(1);
  expect(knightWeaponCount(psyker,'Psychic Shock Wave')).toBe(1);
});
it('resolves linked rocket launchers and independent Chimera weapons',()=>{
  const blackstar=change(model('Corvus Blackstar'),'Missile launchers','2 × Stormstrike missile launcher');
  expect(knightWeaponCount(blackstar,'Stormstrike missile launcher')).toBe(2);
  expect(knightWeaponCount(blackstar,'Blackstar rocket launcher')).toBe(0);
  expect(knightWeaponCount(blackstar,'Auspex array')).toBe(1);
  const chimera=change(change(model('Inquisitorial Chimera'),'Hull gun','Heavy flamer'),'Turret','Heavy flamer');
  expect(knightWeaponCount(chimera,'Heavy flamer')).toBe(2);
  expect(knightWeaponCount(chimera,'Multi-laser')+knightWeaponCount(chimera,'Heavy bolter')).toBe(0);
});

it('permits two distinct Arbites specials, retaining three separate shotgun tool bearers and the Proctor',()=>{
  for(const name of ['Vigilant Squad','Exaction Squad']){
    const bare=model(name);
    expect(knightWeaponCount(bare,'Arbites combat shotgun')).toBe(10);
    let squad=change(change(bare,'First specialist','Webber'),'Second specialist','Heavy stubber');
    expect(()=>change(squad,'Second specialist','Webber')).toThrow();
    expect(knightWeaponCount(squad,'Mechanical bite')).toBe(1);
    squad=change(squad,'Proctor equipment','Nuncio aquila');
    expect(knightWeaponCount(squad,'Nuncio aquila')).toBe(1);
    if(name==='Exaction Squad')for(const gear of ['Excruciator maul','Arbites medi-kit','Soulguilt scanner']){
      squad=change(squad,gear+' shotgun bearer',gear);
      expect(knightWeaponCount(squad,gear)).toBe(1);
    }
    expect(knightWeaponCount(squad,'Arbites combat shotgun')).toBe(8);
    expect(knightWeaponCount(squad,'Arbites shotpistol')).toBe(10);
  }
  const subductors=change(model('Subductor Squad'),'Proctor equipment','Nuncio aquila');
  expect(knightWeaponCount(subductors,'Shock maul')).toBe(10);
  expect(knightWeaponCount(subductors,'Mechanical bite')).toBe(1);
  expect(()=>change(subductors,'First specialist','Webber')).toThrow();
});
it('keeps Breacher shield, specialist guns, distinct melee bearers and a chosen demolitions bearer',()=>{
  let squad=model('Imperial Navy Breachers');
  expect(knightWeaponCount(squad,'Navis shotgun')).toBe(8);
  expect(knightWeaponCount(squad,'Endurant shield')).toBe(1);
  squad=change(squad,'Sergeant weapons','Bolt pistol + Power weapon');
  squad=change(squad,'Power weapon Armsman','Autopistol + Power weapon');
  squad=change(squad,'Chainfist Armsman','Autopistol + Chainfist');
  squad=change(squad,'Las-volley gunner','Plasma gun');
  squad=change(squad,'Demolition charge bearer','Endurant shield bearer');
  expect(knightWeaponCount(squad,'Navis shotgun')).toBe(5);
  expect(knightWeaponCount(squad,'Power weapon')).toBe(2);
  expect(knightWeaponCount(squad,'Plasma gun – supercharge')).toBe(1);
  expect(knightWeaponCount(squad,'Demolition charge')).toBe(1);
  expect(()=>change(squad,'Demolition charge bearer','Sergeant')).toThrow();
});
it('retains a separate storm bolter bearer for the Grey Knights banner when the heavy gun and narthecium are equipped',()=>{
  let squad=model('Grey Knights Terminator Squad');
  expect(knightWeaponCount(squad,'Storm bolter')).toBe(5);
  squad=change(change(change(squad,'Heavy gunner','Psycannon'),'Apothecary equipment','Narthecium'),'Storm bolter banner bearer','Ancient’s banner');
  expect(knightWeaponCount(squad,'Storm bolter')).toBe(3);
  expect(knightWeaponCount(squad,'Narthecium')).toBe(1);
  expect(knightWeaponCount(squad,'Ancient’s banner')).toBe(1);
  expect(knightWeaponCount(squad,'Nemesis force weapon')).toBe(5);
});
it('keeps the Battle Sister icon on a boltgun bearer, independent of two permitted special weapons',()=>{
  let squad=model('Sisters of Battle Squad');
  squad=change(change(squad,'Special gunner','Meltagun'),'Special or heavy gunner','Meltagun');
  squad=change(change(squad,'Boltgun icon bearer','Simulacrum imperialis'),'Sister Superior firearm','Bolt pistol');
  expect(knightWeaponCount(squad,'Meltagun')).toBe(2);
  expect(knightWeaponCount(squad,'Bolt pistol')).toBe(11);
  expect(knightWeaponCount(squad,'Boltgun')).toBe(7);
  expect(knightWeaponCount(squad,'Simulacrum imperialis')).toBe(1);
  expect(()=>change(squad,'Special gunner','Multi-melta')).toThrow();
  expect(knightWeaponCount(change(squad,'Sister Superior firearm','Plasma pistol'),'Plasma pistol - supercharge')).toBe(1);
});
it('gates the Missionary holy fire on keeping its plasma gun and leaves the Miraculist holy fire intact',()=>{
  let squad=model('Sanctifiers');
  expect(knightWeaponCount(squad,'Holy fire')).toBe(1);
  squad=change(squad,'Plasma Missionary','Plasma gun + Holy fire');
  expect(knightWeaponCount(squad,'Holy fire')).toBe(2);
  squad=change(squad,'Plasma Missionary','Meltagun');
  expect(knightWeaponCount(squad,'Holy fire')).toBe(1);
  expect(knightWeaponCount(squad,'Plasma gun')).toBe(0);
  squad=change(change(squad,'Hand flamer Sanctifier','Ministorum hand flamer + Close combat weapon'),'Icon Sanctifier','Close combat weapon + Simulacrum imperialis');
  expect(knightWeaponCount(squad,'Ministorum hand flamer')).toBe(5);
  expect(knightWeaponCount(squad,'Sanctifier melee weapon')).toBe(4);
  expect(knightWeaponCount(squad,'Salvationist medikit')).toBe(1);
});

it.each([['Imperial Navy Breachers',216],['Vigilant Squad',42],['Subductor Squad',2],['Exaction Squad',336],
  ['Grey Knights Terminator Squad',16],['Sisters of Battle Squad',1176],['Sanctifiers',12]] as const)(
 'enumerates legal specialist and bearer configurations for %s',(unit,total)=>{
  let layouts=[model(unit)];
  for(const slot of knightLoadoutFor('Imperial Knights',unit)!.slots){
    layouts=layouts.flatMap(s=>slot.choices.flatMap(c=>{
      const next={...s,knightGear:{...s.knightGear,[slot.name]:c.name}};
      return validKnightGear(next,'Imperial Knights')?[change(s,slot.name,c.name)]:[];
    }));
  }
  expect(layouts.length).toBe(total);
  for(const s of layouts)expect(knightEquippedItems(s).length).toBeGreaterThan(0);
});

it('gives Inquisitorial Agents only an eligible second servitor and one independent specialist per five actual Agents',()=>{
 for(let models=6;models<=12;models++){
  let squad=model('Inquisitorial Agents',models);
  const servitors=models===12?2:1,agents=models-servitors,groups=Math.floor(agents/5);
  expect(knightWeaponCount(squad,'Agent firearm')).toBe(agents);
  expect(knightWeaponCount(squad,'Heavy bolter')).toBe(servitors);
  expect(knightWeaponCount(squad,'Agent melee weapon')).toBe(models);
  for(let i=1;i<=groups;i++){
   for(const item of ['Eviscerator','Plasma pistol','Mystic stave'])squad=change(squad,item+' bearer '+i,item);
   squad=change(squad,'Tome-skull '+i,'Tome-skull');
  }
  expect(knightWeaponCount(squad,'Tome-skull')).toBe(groups);
  expect(knightWeaponCount(squad,'Plasma pistol – supercharge')).toBe(groups);
  if(servitors===1)expect(()=>change(squad,'Gun Servitor 2','Multi-melta')).toThrow();
  else {
   squad=change(change(squad,'Gun Servitor 1','Multi-melta'),'Gun Servitor 2','Plasma cannon');
   expect(knightWeaponCount(squad,'Heavy bolter')).toBe(0);
   expect(knightWeaponCount(squad,'Multi-melta')).toBe(1);
  }
 }
});
it('preserves valid agents and weapons when changing squad size',async()=>{
 const {resizeKnightComposition}=await import('../src/knight-loadouts');
 let squad=model('Inquisitorial Agents',12);
 squad=change(change(change(squad,'Gun Servitor 1','Multi-melta'),'Gun Servitor 2','Plasma cannon'),'Tome-skull 2','Tome-skull');
 const small={...squad,models:6,knightGear:resizeKnightComposition(squad,6)};
 expect(knightWeaponCount(small,'Multi-melta')).toBe(1);
 expect(knightWeaponCount(small,'Plasma cannon')+knightWeaponCount(small,'Tome-skull')).toBe(0);
 const large={...small,models:12,knightGear:resizeKnightComposition(small,12)};
 expect(knightWeaponCount(large,'Heavy bolter')).toBe(1);
 expect(knightWeaponCount(large,'Multi-melta')).toBe(1);
});
it('applies every Watch Veteran replacement limit at every legal size independently of Sergeant gear',()=>{
 const kits:[string,number][]=[['Heavy thunder hammer',2],['Black Shield blades',1],['Stalker-pattern boltgun + Knives and fists',1],
  ['Deathwatch shotgun + Knives and fists',2],['Boltgun + Storm shield',2],['Power weapon + Storm shield',2],
  ['Infernus heavy bolter + Knives and fists',1],['Frag cannon + Knives and fists',1]];
 for(let size=5;size<=10;size++){
  const base=model('Deathwatch Kill Team',size);
  expect(knightWeaponCount(base,'Boltgun')).toBe(size);
  for(const [choice,max] of kits){
   let body=change(change(base,'Watch Sergeant firearm','Combi-weapon'),'Watch Sergeant melee weapon','Xenophase blade');
   const limit=choice==='Black Shield blades'?1:max*Math.floor(size/5);
   for(let i=1;i<=limit;i++)body=change(body,'Deathwatch Veteran '+i,choice);
   expect(()=>change(body,'Deathwatch Veteran '+(limit+1),choice)).toThrow();
   expect(knightWeaponCount(body,'Xenophase blade')).toBe(1);
   expect(knightWeaponCount(body,'Combi-weapon')).toBe(1);
  }
 }
});
it('counts both shield kits toward the shared limit and trims excess copies after a resize',async()=>{
 const {resizeKnightComposition}=await import('../src/knight-loadouts');
 let team=model('Deathwatch Kill Team',10);
 for(const [bearer,choice] of [[1,'Boltgun + Storm shield'],[2,'Power weapon + Storm shield'],[3,'Boltgun + Storm shield'],[9,'Heavy thunder hammer']] as const){
  team=change(team,'Deathwatch Veteran '+bearer,choice);
 }
 const short={...team,models:8,knightGear:resizeKnightComposition(team,8)};
 expect(knightWeaponCount(short,'Storm shield')).toBe(2);
 expect(knightWeaponCount(short,'Heavy thunder hammer')).toBe(0);
 expect(()=>change(short,'Deathwatch Veteran 3','Power weapon + Storm shield')).toThrow();
 expect(knightWeaponCount(short,'Boltgun')).toBe(7);
});

it('musters only the two printed Aquila compositions, restores Gravis weapon bundles and keeps each replacement on its eligible model',async()=>{
 const {resizeKnightComposition}=await import('../src/knight-loadouts');
 for(const size of [5,10]){
   const base=model('Aquila Kill Team',size),groups=size/5;
   expect(knightWeaponCount(base,'Xenophase blade')).toBe(groups-1);
   expect(knightWeaponCount(base,'Deathwatch marksman bolt carbine')).toBe(groups);
   expect(knightWeaponCount(base,'Special-issue bolt pistol')).toBe(groups===1?1:3);
   expect(knightWeaponCount(base,'Knives and fists')).toBe(3*groups);
   let squad=base;
   for(let i=1;i<=groups;i++){
     squad=change(squad,'Gravis Veteran '+i,'Hellstorm bolt rifle + Astartes grenade launcher');
     squad=change(squad,'Hammer Veteran '+i,'Power weapon + Storm shield');
     squad=change(squad,'Stalker Veteran '+i,'Plasma incinerator');
   }
   expect(knightWeaponCount(squad,'Astartes grenade launcher – krak')).toBe(groups);
   expect(knightWeaponCount(squad,'Plasma incinerator')).toBe(groups);
   expect(knightWeaponCount(squad,'Power weapon')).toBe(groups+1);
   expect(knightWeaponCount(squad,'Heavy thunder hammer')+knightWeaponCount(squad,'Infernus heavy bolter')).toBe(0);
   expect(()=>change(squad,'Gravis Veteran 1','Hellstorm bolt rifle')).toThrow();
   const small={...squad,models:5,knightGear:resizeKnightComposition(squad,5)};
   expect(knightWeaponCount(small,'Storm shield')).toBe(1);
   expect(knightWeaponCount(small,'Xenophase blade')).toBe(0);
 }
 for(const size of [4,6,7,8,9,11])expect(knightLoadoutFor('Imperial Knights','Aquila Kill Team',size)).toBeUndefined();
});
