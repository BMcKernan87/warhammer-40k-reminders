import {finalDayHasRangedWeapon} from './final-day-loadouts';
import {broodBrotherHasRangedWeapon} from './astra-militarum-loadouts';
import {GSC_SHEETS} from './gsc-data.generated';
import {GSC_KITS} from './gsc-loadouts.generated';
import {equippedItems,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';
import type {RosterInstance} from './roster-instances';

const kits=new Map<string,typeof GSC_KITS[number]>(GSC_KITS.map(k=>[k.unit,k]));
const tiers=new Map(GSC_SHEETS.map(s=>[s.unit,s.compositionBySize!]));
const pistols='Acolyte Hybrids With Autopistols',flamers='Acolyte Hybrids With Hand Flamers';
const icon='Cult Icon',pistol='Autopistol',flamer='Hand flamer',claws='Cult claws and knife',leaderBlade='Leader’s bio-weapons';
const close='Close combat weapon',firearm='Hybrid firearm',laser='Heavy mining laser',stubber='Twin heavy stubber';
const heavies=['Heavy stubber','Mining laser','Seismic cannon'],specials=['Flamer','Grenade launcher','Webber'];
const scope='Spotter',survey='Survey Augur',flare='Flare Launcher';
const key=(name:string)=>name.trim().toLowerCase().replaceAll('’',"'");

type Choice=string|readonly string[];
export function gscLoadout(unit:string,models?:number):KnightEquipment|undefined{
 const source=kits.get(unit),sizes=tiers.get(unit);
 if(!source||!sizes)return undefined;
 const size=models??Number(Object.keys(sizes)[0]),composition=sizes[size];
 if(!composition)return undefined;
 const fixed:string[]=[],slots:KnightSlot[]=[];
 for(const [model,n] of Object.entries(composition)){
  const weapons=Object.entries(source.bearers).find(([role])=>key(role)===key(model))?.[1]??[];
  for(let i=0;i<n;i++)fixed.push(...source.common,...weapons);
 }
 const select=(name:string,standard:Choice,...choices:Choice[])=>{
  for(const item of typeof standard==='string'?[standard]:standard){
   const i=fixed.indexOf(item);
   if(i<0)throw Error(unit+' lacks its printed '+item);
   fixed.splice(i,1);
  }
  slots.push(slot(name,standard,...choices));
 };
 switch(unit){
  case pistols:
  case flamers:{
   const gun=unit===pistols?pistol:flamer;
   select('Acolyte Leader melee weapon',claws,leaderBlade);
   for(let n=1;n<size;n++){
    if(unit===pistols)select('Acolyte '+n+' weapons',[gun,claws],[icon,claws],'Heavy mining tool');
    else select('Acolyte '+n+' firearm',gun,icon,'Demolition charges');
   }
   break;
  }
  case 'Neophyte Hybrids':
   select('Neophyte Leader weapons',[firearm,close],['Anointed pistol','Chainsword'],['Anointed pistol','Power weapon']);
   for(let n=1;n<size;n++)select('Neophyte '+n+' equipment',firearm,[firearm,icon],...heavies,...specials);
   break;
  case 'Hybrid Metamorphs':
   select('Metamorph Leader firearm',pistol,flamer);
   for(let n=1;n<size;n++)select('Metamorph '+n+' equipment',pistol,flamer,icon);
   break;
  case 'Goliath Rockgrinder':
   select('Main gun',laser,'Clearance incinerator','Heavy seismic cannon');break;
  case 'Sanctus':
   select('Assassin weapons','Sanctus bio-dagger',['Cult sniper rifle',close]);break;
  case 'Achilles Ridgerunners':
   for(let n=1;n<=size;n++){
    select('Ridgerunner '+n+' main gun',laser,'Achilles missile launcher','Heavy mortar');
    select('Ridgerunner '+n+' equipment',flare,scope,survey);
   }
   break;
  case 'Atalan Jackals':
   for(let n=1;n<=composition['Atalan Jackal'];n++){
    select('Jackal '+n+' firearm','Atalan small arms','Grenade launcher');
    select('Jackal '+n+' melee weapon',close,'Atalan power weapon');
   }
   for(let n=1;n<=composition['Atalan Wolfquad'];n++)select('Wolfquad '+n+' gun','Heavy stubber','Atalan incinerator','Mining laser');
   break;
 }
 return {fixed,slots};
}

export function validGscGear(unit:string,gear:Record<string,string>,models?:number):boolean{
 const sizes=tiers.get(unit);
 if(!sizes)return true;
 const size=models??Number(Object.keys(sizes)[0]),composition=sizes[size];
 if(!composition)return false;
 const names=Object.values(gear).flatMap(value=>value.split(' + '));
 const count=(item:string)=>names.filter(n=>n===item).length;
 if(count(icon)>1)return false;
 if(unit===pistols)return count('Heavy mining tool')<=3*Math.floor(size/5);
 if(unit===flamers)return count('Demolition charges')<=2*Math.floor(size/5);
 if(unit==='Neophyte Hybrids'){
  const perTen=Math.floor(size/10);
  return [heavies,specials].every(group=>group.every(gun=>count(gun)<=perTen)&&group.reduce((n,w)=>n+count(w),0)<=2*perTen);
 }
 if(unit==='Atalan Jackals'){
  const groups=Math.floor(composition['Atalan Jackal']/4);
  return count('Grenade launcher')<=groups&&count('Atalan power weapon')<=2*groups;
 }
 return true;
}
export function resizeGscGear(unit:string,gear:Record<string,string>,models:number):Record<string,string>|undefined{
 if(!kits.has(unit))return undefined;
 const retained:Record<string,string>={};
 for(const field of gscLoadout(unit,models)?.slots??[]){
  const value=gear[field.name];
  if(field.choices.some(c=>c.name===value)&&validGscGear(unit,{...retained,[field.name]:value},models))retained[field.name]=value;
 }
 return retained;
}
export function gscHasRangedWeapon(squad:RosterInstance):boolean{
 const names=kits.get(squad.unit)?.ranged;
 if(!names)return finalDayHasRangedWeapon(squad)||broodBrotherHasRangedWeapon(squad);
 const ranged=new Set(names.map(key));
 return equippedItems(gscLoadout(squad.unit,squad.models),squad.knightGear).some(w=>ranged.has(key(w)));
}
// A spotter or survey augur is mounted on one particular vehicle. Effects
// from that option use the same vehicle's two equipped ranged weapons.
export function gscRidgerunnerWeapons(squad:RosterInstance,equipment:string):string[]{
 if(squad.unit!=='Achilles Ridgerunners')return [];
 const kit=gscLoadout(squad.unit,squad.models);
 if(!kit)return [];
 const names:string[]=[];
 for(let n=1;n<=(squad.models??1);n++){
  const selected=squad.knightGear?.['Ridgerunner '+n+' equipment']??flare;
  if(key(selected)!==key(equipment))continue;
  const gun=squad.knightGear?.['Ridgerunner '+n+' main gun']??laser;
  if(kit.slots.find(s=>s.name==='Ridgerunner '+n+' main gun')?.choices.some(c=>c.name===gun))names.push(gun,stubber);
 }
 return names;
}
