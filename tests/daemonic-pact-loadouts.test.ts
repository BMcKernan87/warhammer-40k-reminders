import {expect,it} from 'vitest';
import {DAEMON_EQUIPMENT} from '../src/daemonic-pact-equipment.generated';
import {knightEquippedItems,knightLoadoutFor,knightWeaponCount,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {expandRoster,type RosterInstance} from '../src/roster-instances';

const model=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
function change(s:RosterInstance,slot:string,choice:string){
 const army=setKnightGear({faction:'Chaos Knights',detachment:'Select detachment (unverified)',units:{[s.unit]:1},instances:[s]},s.id,slot,choice);
 return expandRoster(army)[0];
}
it.each(['Daemon Prince of Chaos','Daemon Prince Of Chaos With Wings','Soul Grinder'])('assigns %s one allegiance for each instance without stacking rival profiles',unit=>{
 const source={Khorne:'Torrent of burning blood',Tzeentch:'Warp gaze',Nurgle:'Phlegm bombardment',Slaanesh:'Scream of despair'};
 for(const [god,weapon] of Object.entries(source)){
  const squad=change(model(unit),'Daemonic allegiance',god);
  expect(squad.knightGear?.['Daemonic allegiance']).toBe(god);
  expect(validKnightGear(squad,'Chaos Daemons')).toBe(true);
  for(const other of Object.values(source))expect(knightWeaponCount(squad,other)).toBe(unit==='Soul Grinder'&&other===weapon?1:0);
  expect(knightWeaponCount(squad,unit==='Soul Grinder'?'Harvester cannon':'Infernal cannon')).toBe(1);
  if(unit==='Soul Grinder'){
   const replacement=change(squad,'Melee arm','Warpclaw');
   expect(knightWeaponCount(replacement,'Warpsword')).toBe(0);
   expect(knightWeaponCount(replacement,weapon)).toBe(1);
  }
 }
 expect(()=>change(model(unit),'Daemonic allegiance','Undivided')).toThrow();
 expect(knightWeaponCount(model(unit),'Torrent of burning blood')).toBe(unit==='Soul Grinder'?1:0);
});
it.each(['Bloodletters','Bloodcrushers','Pink Horrors','Plaguebearers','Plague Drones','Daemonettes','Seekers'])(
 'assigns the %s standard and instrument to separate eligible bearers',unit=>{
 const base=model(unit),first=change(base,'Instrument bearer','Instrument of Chaos');
 expect(knightWeaponCount(base,'Instrument of Chaos')+knightWeaponCount(base,'Daemonic icon')).toBe(0);
 expect(knightWeaponCount(first,'Instrument of Chaos')).toBe(1);
 expect(knightWeaponCount(first,'Daemonic icon')).toBe(0);
 const both=change(first,'Separate icon bearer','Daemonic icon');
 expect(knightWeaponCount(both,'Daemonic icon')).toBe(1);
 expect(knightWeaponCount(both,'Instrument of Chaos')).toBe(1);
 expect(()=>change(both,'Instrument bearer','Instrument of Chaos + Daemonic icon')).toThrow();
});
it('resolves linked Bloodthirster arms, independent Great Unclean One arms and optional greater daemon gear',()=>{
 const thirst=change(model('Bloodthirster'),'Axe weapons','Axe of Khorne + Bloodflail');
 expect(knightWeaponCount(thirst,'Great axe of Khorne – sweep')).toBe(0);
 expect(knightWeaponCount(thirst,'Axe of Khorne – sweep')).toBe(1);
 expect(knightWeaponCount(thirst,'Lash of Khorne')).toBe(0);
 expect(knightWeaponCount(thirst,'Bloodflail')).toBe(1);
 const bell=change(change(model('Great Unclean One'),'Plague flail arm','Bileblade'),'Bilesword arm','Doomsday bell');
 expect(knightWeaponCount(bell,'Doomsday bell')).toBe(1);
 expect(knightWeaponCount(bell,'Bilesword')+knightWeaponCount(bell,'Plague flail')).toBe(0);
 expect(knightWeaponCount(bell,'Putrid vomit')).toBe(1);
 const aegis=change(model('Keeper Of Secrets'),'Additional wargear','Shining aegis');
 expect(knightWeaponCount(aegis,'Shining aegis')).toBe(1);
 expect(knightWeaponCount(aegis,'Living whip')).toBe(0);
 expect(knightWeaponCount(change(model('Lord of Change'),'Additional weapon','Rod of sorcery'),'Baleful sword')).toBe(0);
});
it('uses starting Horror types, unique Gore Hound weapons and no profiles on weaponless fortifications',()=>{
 for(const colour of ['Pink','Blue']){
  const horrors=model(colour+' Horrors');
  expect(knightWeaponCount(horrors,'Coruscating '+colour+' Flames')).toBe(10);
  expect(knightWeaponCount(horrors,'Yellow claws')).toBe(0);
 }
 expect(knightWeaponCount(model('Pink Horrors'),'Blue claws')).toBe(0);
 for(let models=5;models<=10;models++){
  const pack=model('Flesh Hounds',models);
  expect(knightWeaponCount(pack,'Burning roar')).toBe(1);
  expect(knightWeaponCount(pack,'Gore-drenched fangs')).toBe(models);
  expect(knightWeaponCount(pack,'Collar of Khorne')).toBe(models);
 }
 for(const name of ['Skull Altar','Feculent Gnarlmaw'])expect(knightEquippedItems(model(name))).toEqual([]);
});
it.each(Object.entries(DAEMON_EQUIPMENT))('preserves each legal %s gear/size combination through save and reload',(unit,row)=>{
 for(let models=row.minimum;models<=row.maximum;models++){
  const base=model(unit,models);
  const sheet=knightLoadoutFor('Chaos Knights',unit,models)!;
  expect(knightLoadoutFor('Chaos Daemons',unit,models)).toEqual(sheet);
  let proposed=[base];
  for(const slot of sheet.slots)proposed=proposed.flatMap(s=>slot.choices.map(c=>change(s,slot.name,c.name)));
  for(const s of proposed){
   expect(validKnightGear(s,'Chaos Knights')).toBe(true);
   expect(knightEquippedItems(JSON.parse(JSON.stringify(s)))).toEqual(knightEquippedItems(s));
   if(!['Skull Altar','Feculent Gnarlmaw'].includes(unit))expect(knightEquippedItems(s).length).toBeGreaterThan(0);
  }
 }
});
