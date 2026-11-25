import {ORK_SHEETS} from './ork-data.generated';
import {ORK_KITS} from './ork-loadouts.generated';
import {equippedItems,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';
import type {RosterInstance} from './roster-instances';

type Kit=typeof ORK_KITS[number];
type Choice=string|readonly string[];
const byUnit=new Map<string,Kit>(ORK_KITS.map(kit=>[kit.unit,kit]));
const composition=new Map(ORK_SHEETS.map(sheet=>[sheet.unit,sheet.compositionBySize!]));
const normalized=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const copies=(item:string,n:number)=>Array<string>(n).fill(item);
const countSlots=(item:string,max:number)=>Array.from({length:max+1},(_,n)=>copies(item,n));
const nobMelee=['Kustom Choppa','Power Klaw'];
const nobGuns=['Kombi-skorcha','Kombi-rokkit','Kustom Shoota'];
const krumpa='Kustom Krumpa',shoota='Kustom Shoota',choppa='Kustom Choppa';
const boyGuns=['Big Shoota','Rokkit Launcha','Burna'];
const nobSpecials=['Big Skorcha','Kustom Big Shoota','Big Choppa','Paired Krumpas'];

// Permanent weapons come directly from the card. A slot takes only its
// explicitly replaced items out of that model's fixed equipment.
function configureModel(unit:string,model:string,original:readonly string[],prefix:string){
 const fixed=[...original],slots:KnightSlot[]=[];
 const select=(name:string,base:Choice,...alternatives:Choice[])=>{
  for(const item of typeof base==='string'?[base]:base){
   const i=fixed.indexOf(item);
   if(i<0)throw Error(unit+' / '+model+' has no standard '+item);
   fixed.splice(i,1);
  }
  slots.push(slot(prefix+name,base,...alternatives));
 };
 const add=(name:string,...choices:Choice[])=>select(name,[],...choices);
 switch(unit){
  case 'Warboss':
   select('Melee weapon',choppa,'Power Klaw');
   select('Firearm',shoota,'Kombi-rokkit','Kombi-skorcha');break;
  case 'Big Mek In Mega Armour':
   select('Firearm',shoota,'Killsaw','Kombi-weapon','Kustom Mega-blasta');
   add('Mek equipment','Tellyport Blasta','Kustom Force Field');break;
  case 'Big Mek':
   select('Melee weapon','Power Klaw','Drilla');select('Firearm','Kustom Mega-blasta','Traktor Blasta');break;
  case 'Beastboss on Squigosaur':add('Thump Gun','Thump Gun');break;
  case 'Boyz':
   if(model==='Nob'){
    const kits=nobMelee.flatMap(melee=>nobGuns.map(gun=>[melee,gun]));
    select('Weapons',kits[0],...kits.slice(1),'Big Choppa');
   }else select('Firearm','Shoota',...boyGuns);
   break;
  case 'Beast Snagga Boyz':
   if(model!=='Nob')add('Thump Gun','Thump Gun');
   break;
  case 'Nobz':
   select('Weapons',[krumpa,shoota],[krumpa,'Kombi-rokkit'],['Big Skorcha',choppa],
    ['Kustom Big Shoota',choppa],'Big Choppa',[krumpa,'Paired Krumpas']);break;
  case 'Meganobz':
   select('Weapons',[shoota,'Power Klaw'],[shoota,'Killsaw'],['Kombi-weapon','Power Klaw'],
    ['Kombi-weapon','Killsaw'],'Twin Killsaws');break;
  case 'Kommandos':
   if(model==='Nob')select('Melee weapon','Choppa','Big Choppa','Power Klaw');
   else {
    add('Special firearm','Burna','Rokkit Launcha','Kustom Shoota');
    select('Melee weapon','Choppa','Breacha Ram');
   }
   break;
  case 'Tankbustas':
   if(model==='Nob')select('Second pistol','Rokkit Pistol','Smash Hammer');
   else add('Special equipment','Busta Rokkit Launcha','Pulsa Rokkit');
   break;
  case 'Breaka Boyz':
   if(model==='Nob')select('Hammer','Smash Hammer','Rokkit Pistol');
   else select('Melee weapon','Smash Hammer','Knucklebustas','Tankhammer');
   break;
  case 'Stormboyz':if(model==='Nob')select('Melee weapon',choppa,'Power Klaw');break;
  case 'Deffkoptas':select('Main gun','Rokkit Launcha','Kustom Mega-blasta');break;
  case 'Warbuggies':select('Main gun','Mek Speshul','Rivet Kannon');break;
  case 'Mek Gunz':select('Main gun','Smasha Gun','Bubblechukka','Kustom Mega-kannon','Traktor Kannon');break;
  case 'Trukk':
   select('Main gun','Dual Big Shoota','Rokkit Launcha');add('Ram equipment','Buzzsaw','Grabbin’ Klaw');break;
  case 'Dakkajet':add('Additional gun','Dual Supa-shoota');break;
  case 'Burna-bommer':add('Missiles','Skorcha Missile Rack');break;
  case 'Wazbom Blastajet':
   select('Main gun','Dual Wazbom Mega-kannon','Dual Tellyport Mega-blasta');
   add('Force field','Blastajet Force Field');add('Additional gun','Dual Supa-shoota');break;
  case 'Gunwagon':
  case 'Battlewagon':
   if(unit==='Gunwagon'){select('Turret','Kannon','Killkannon','Zzap Gun');add('Lobba','Lobba');}
   add('Big Shootas',...countSlots('Big Shoota',4).slice(1));
   add('Wreckin’ Ball','Wreckin’ Ball');add('Grabbin’ Klaw','Grabbin’ Klaw');break;
  case 'Big’ed Bossbunka':add('Additional Big Shootas',...countSlots('Big Shoota',3).slice(1));break;
  case 'Deff Dread':
   select('Big Shoota arm','Big Shoota','Extra Klaw','Kustom Mega-blasta','Rokkit Launcha');
   select('Skorcha arm','Skorcha','Extra Klaw','Big Shoota','Kustom Mega-blasta','Rokkit Launcha');break;
  case 'Gargantuan Squiggoth':add('Gun','Kannon','Supa-kannon');break;
 }
 return {fixed,slots};
}

// The MFM's unit-composition tiers determine both the legal total and the
// number of models of each kind. This keeps per-model gear and pricing aligned.
export function orkLoadout(unit:string,models?:number):KnightEquipment|undefined {
 const kit=byUnit.get(unit),tiers=composition.get(unit);
 if(!kit||!tiers)return undefined;
 const size=models??Number(Object.keys(tiers)[0]);
 const tier=tiers[size];
 if(!tier)return undefined;
 const fixed:string[]=[],slots:KnightSlot[]=[];
 for(const profile of kit.models){
  const count=tier[profile.model]??Object.entries(tier).find(([name])=>normalized(name)===normalized(profile.model))?.[1];
  if(!count)return undefined;
  for(let n=1;n<=count;n++){
   const prefix=size===1?'':profile.model+(profile.max>1?' '+n:'')+' · ';
   const model=configureModel(unit,profile.model,profile.items,prefix);
   fixed.push(...model.fixed);
   slots.push(...model.slots);
  }
 }
 return {fixed,slots};
}

function limits(unit:string,size:number):Record<string,number>{
 switch(unit){
  case 'Boyz':return Object.fromEntries(boyGuns.map(item=>[item,Math.floor(size/10)]));
  case 'Beast Snagga Boyz':return {'Thump Gun':Math.floor(size/10)};
  case 'Nobz':return Object.fromEntries(nobSpecials.map(item=>[item,Math.floor(size/5)]));
  case 'Kommandos':return {'Breacha Ram':1,'Burna':1,'Rokkit Launcha':1,'Kustom Shoota':2};
  case 'Breaka Boyz':return {'Knucklebustas':1,'Tankhammer':1};
  case 'Deffkoptas':return {'Kustom Mega-blasta':Math.floor(size/3)};
  default:return {};
 }
}
export function validOrkGear(unit:string,gear:Record<string,string>,models?:number):boolean {
 const kit=byUnit.get(unit);
 if(!kit)return true;
 const size=models??kit.models.reduce((n,m)=>n+m.min,0);
 // Each specialist option has a unique item name in its selected kit. All
 // limited items are optional and never appear in the standard equipment.
 const chosen=Object.values(gear).flatMap(value=>value.split(' + '));
 if(unit==='Tankbustas')return chosen.filter(item=>item==='Busta Rokkit Launcha'||item==='Pulsa Rokkit').length<=1;
 return Object.entries(limits(unit,size)).every(([item,max])=>chosen.filter(name=>name===item).length<=max);
}
export function resizeOrkGear(gear:Record<string,string>,unit:string,models:number):Record<string,string>|undefined {
 if(!byUnit.has(unit))return undefined;
 const retained:Record<string,string>={};
 for(const slot of orkLoadout(unit,models)?.slots??[]){
  const value=gear[slot.name];
  if(slot.choices.some(c=>c.name===value)&&validOrkGear(unit,{...retained,[slot.name]:value},models))retained[slot.name]=value;
 }
 return retained;
}
export function orkHasRangedWeapon(squad:RosterInstance):boolean {
 const kit=byUnit.get(squad.unit);
 if(!kit)return false;
 const ranged=new Set(kit.ranged.map(normalized));
 return equippedItems(orkLoadout(kit.unit,squad.models),squad.knightGear).some(name=>ranged.has(normalized(name)));
}
