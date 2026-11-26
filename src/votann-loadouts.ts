import {VOTANN_KITS} from './votann-loadouts.generated';
import {VOTANN_SHEETS} from './votann-data.generated';
import {equippedItems,knightItemsLabel,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';
import type {RosterInstance} from './roster-instances';

type Choice=string|readonly string[];
const byUnit=new Map<string,typeof VOTANN_KITS[number]>(VOTANN_KITS.map(k=>[k.unit,k]));
const sheets=new Map(VOTANN_SHEETS.map(s=>[s.unit,s]));
const copies=(item:string,n:number)=>Array<string>(n).fill(item);
const key=(value:string)=>value.trim().toLowerCase().replaceAll('’',"'");
const bolt='Autoch-pattern bolter',ion='Ion blaster',gauntlet='Concussion gauntlet';
const hearthkynGuns=['HYLas auto rifle','HYLas rotary cannon','L7 missile launcher','EtaCarn plasma beamer','Magna-rail rifle'];
const pioneerGuns=['HYLas rotary cannon','Ion beamer'];
const pioneerTools=['Multiwave Comms Array','Panspectral Scanner','Rollbar Searchlight'];
const ranged='Heavy volkanite disintegrator',knife='Plasma knife',sword='Plasma sword';

export function votannLoadout(unit:string,models?:number):KnightEquipment|undefined{
 const kit=byUnit.get(unit),sizes=sheets.get(unit)?.compositionBySize;
 if(!kit||!sizes)return undefined;
 const size=models??Number(Object.keys(sizes)[0]),composition=sizes[size];
 if(!composition)return undefined;
 const fixed:string[]=[],slots:KnightSlot[]=[];
 const roles=Object.entries(composition);
 for(const [model,count] of roles){
  const modelItems=Object.entries(kit.bearers).find(([name])=>key(name)===key(model))?.[1]??[];
  for(let i=0;i<count;i++)fixed.push(...kit.common,...modelItems);
 }
 const select=(name:string,baseline:Choice,...variants:Choice[])=>{
  const standard=typeof baseline==='string'?[baseline]:baseline;
  for(const item of standard){
   const i=fixed.indexOf(item);
   if(i<0)throw Error(unit+' lacks its printed '+item);
   fixed.splice(i,1);
  }
  const field=slot(name,baseline,...variants);
  slots.push(field);
  return field;
 };
 const uniform=(name:string,standard:string,...options:string[])=>{
  const choices=[standard,...options];
  select(name,copies(standard,size),...options.map(item=>copies(item,size))).choices.forEach((choice,i)=>choice.name=choices[i]);
 };
 const add=(name:string,...options:Choice[])=>select(name,[],...options);
 switch(unit){
  case 'Kâhl':
   select('Firearm','Autoch-pattern combi-bolter','Volkanite disintegrator');
   select('Melee weapon','Forgewrought plasma axe','Mass gauntlet');
   select('Crest','Rampart Crest','Teleport Crest');break;
  case 'Einhyr Champion':
   select('Melee weapon','Mass hammer','Darkstar axe');
   select('Crest','Weavefield Crest','Teleport Crest');break;
  case 'Hearthkyn Warriors':
   select('Theyn firearm',bolt,ion,'Theyn’s pistol');add('Theyn melee weapon','Theyn’s melee weapon');
   for(let n=1;n<=composition['Hearthkyn Warrior'];n++)select('Warrior '+n+' firearm',bolt,ion,...hearthkynGuns,knife);
   break;
  case 'Einhyr Hearthguard':{
   uniform('Squad firearms','EtaCarn plasma gun','Volkanite disintegrator');
   const blade='Plasma blade gauntlet',hammer='Graviton hammer';
   const field=select('Squad melee weapons',copies(gauntlet,size),copies(blade,size),
    [...copies(gauntlet,size-1),hammer],[...copies(blade,size-1),hammer]);
   const labels=[gauntlet,blade,gauntlet+' + Hesyr with '+hammer,blade+' + Hesyr with '+hammer];
   field.choices.forEach((c,i)=>c.name=labels[i]);
   select('Hesyr crest','Weavefield Crest','Teleport Crest');break;
  }
  case 'Cthonian Beserks':{
   const max=Math.floor(size/5),variants:string[][]=[],labels:string[]=[];
   // The launcher and the gauntlets go to different models. The remaining
   // standard axe/maul bearers always outnumber the possible launchers.
   for(const weapon of ['Heavy plasma axe','Concussion maul']){
    for(let n=0;n<=max;n++){
     const fists=copies('Twin concussion gauntlet',n);
     variants.push([...copies(weapon,size-n),...fists]);
     labels.push(n?weapon+' + '+knightItemsLabel(fists):weapon);
    }
   }
   select('Squad melee weapons',variants[0],...variants.slice(1)).choices.forEach((c,i)=>c.name=labels[i]);
   add('Mole launchers on axe or maul bearers',...Array.from({length:max},(_,n)=>copies('Mole grenade launcher',n+1)));break;
  }
  case 'Hernkyn Pioneers':
   for(let n=1;n<=size;n++)add('Pioneer '+n+' equipment',...pioneerGuns,...pioneerTools);
   break;
  case 'Sagitaur':
   select('Turret','HYLas beam cannon',['L7 missile launcher','Sagitaur missile launcher'],'MATR autocannon');break;
  case 'Brôkhyr Thunderkyn':
   uniform('Squad weapons','Bolt cannon','Graviton blast cannon','SP conversion beamer');break;
  case 'Hekaton Land Fortress':
   select('Main gun','Cyclic ion cannon','SP heavy conversion beamer','Heavy magna-rail cannon');
   select('Sponsons',copies('Twin bolt cannon',2),['Twin bolt cannon','Twin ion beamer'],copies('Twin ion beamer',2));
   select('Scanner or warhead','Panspectral Scanner','Hekaton warhead');break;
  case 'Hernkyn Yaegirs':{
   const variants:string[][]=[];
   // The Theyn always retains the squad choice. Only the nine other
   // Yaegirs may exchange their entire kit for either distinct special gun.
   for(const core of [['Bolt shotgun'],['Bolt revolver',knife]]){
    for(const special of [[],['Magna-coil rifle'],['APM launcher'],['Magna-coil rifle','APM launcher']]){
     variants.push([...Array.from({length:size-special.length},()=>core).flat(),...special]);
    }
   }
   select('Squad and specialist weapons',variants[0],...variants.slice(1));break;
  }
  case 'Ironkin Steeljacks with Heavy Volkanite Disintegrators':
   select('Steeljack Theyn weapons',[ranged,knife],[bolt,sword]);break;
  case 'Ironkin Steeljacks with Melee Weapons':
   select('Steeljack Theyn melee weapon',sword,gauntlet);
   for(let i=1;i<size;i++)select('Steeljack '+i+' melee weapon',sword,gauntlet);
   break;
  case 'Cthonian Earthshakers':uniform('Battery ordnance','Breacher ordnance','Tremor shells');break;
  case 'Kapricus Carrier':add('Smoke launcher','Smoke Launcher');break;
  case 'Kapricus Defenders':
   for(let n=1;n<=size;n++){
    select('Defender '+n+' gun','Magna-rail cannon','HYLas rotary cannon');
    add('Defender '+n+' smoke launcher','Smoke Launcher');
   }
   break;
 }
 return {fixed,slots};
}

export function validVotannGear(unit:string,gear:Record<string,string>,models?:number):boolean{
 const chosen=Object.values(gear);
 if(unit==='Hearthkyn Warriors'){
  const heavy=chosen.filter(item=>hearthkynGuns.includes(item));
  return heavy.length<=2&&new Set(heavy).size===heavy.length&&chosen.filter(item=>item===knife).length<=2;
 }
 if(unit==='Hernkyn Pioneers'){
  return chosen.filter(item=>pioneerGuns.includes(item)).length<=Math.floor((models??3)/3)
   &&pioneerTools.every(tool=>chosen.filter(item=>item===tool).length<=1);
 }
 return true;
}
export function resizeVotannGear(unit:string,gear:Record<string,string>,newSize:number):Record<string,string>|undefined{
 if(!byUnit.has(unit))return undefined;
 const result:Record<string,string>={};
 for(const slot of votannLoadout(unit,newSize)?.slots??[]){
  const saved=gear[slot.name];
  if(!saved)continue;
  let choice=slot.choices.find(c=>c.name===saved);
  // At five to nine models, two launcher bearers or two gauntlet bearers
  // become one. Keep the selected axe/maul and surviving legal specialist.
  if(!choice&&unit==='Cthonian Beserks'&&newSize<10)choice=slot.choices.find(c=>c.name===saved.replace('2 × ',''));
  if(choice&&validVotannGear(unit,{...result,[slot.name]:choice.name},newSize))result[slot.name]=choice.name;
 }
 return result;
}
export function votannHasRangedWeapon(squad:RosterInstance):boolean{
 const ranges=byUnit.get(squad.unit)?.ranged;
 if(!ranges)return false;
 const names=new Set(ranges.map(key));
 return equippedItems(votannLoadout(squad.unit,squad.models),squad.knightGear).some(item=>names.has(key(item)));
}

// Accompanying CORVs, E-COGs and the Ironkin Assistant retain their own
// weapons. Only the actual CHARACTER model receives bearer-only upgrades.
export function votannCharacterWeapons(squad:RosterInstance,type?:'Ranged'|'Melee'):readonly string[]{
 const kit=byUnit.get(squad.unit),sheet=sheets.get(squad.unit);
 if(!kit||!sheet)return [];
 const selected=sheet.keywords?.includes('CHARACTER')
  ?equippedItems(votannLoadout(squad.unit,squad.models),squad.knightGear)
  :Object.entries(kit.bearers).filter(([role])=>sheet.modelKeywords?.[role]?.includes('CHARACTER')).flatMap(([,items])=>items);
 const profileNames=new Set<string>(type==='Ranged'?kit.ranged:type==='Melee'?kit.melee:[...kit.ranged,...kit.melee]);
 return selected.filter(item=>profileNames.has(item));
}
