import type {RosterInstance} from './roster-instances';
import {chassis,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';

const chainsword='Astartes chainsword',fist='Power fist',accursed='Accursed weapon',heavy='Heavy melee weapon',bolt='Boltgun',pistol='Bolt pistol',plasma='Plasma pistol',ccw='Close combat weapon';
const combi='Combi-bolter',alternate='Combi-weapon',paired='Paired accursed weapons',mutations='Mutations';
const heavyGuns=['Havoc autocannon','Havoc heavy bolter','Havoc lascannon','Havoc missile launcher','Havoc reaper chaincannon'];
const specialists=['Flamer','Meltagun','Plasma gun'];
const legionSpecials=['Flamer','Havoc autocannon','Heavy bolter','Lascannon','Meltagun','Missile launcher','Plasma gun','Reaper chaincannon'];
const cross=(primary:string[],secondary:string[])=>primary.flatMap(a=>secondary.map(b=>[a,b]));
const termLord=cross([combi,alternate],['Exalted weapon','Chainfist',fist]);
const fixed:Record<string,KnightEquipment>={
 'Chaos Lord':chassis([],slot('Sidearm',plasma,fist),slot('Melee weapon','Daemon hammer',accursed,chainsword)),
 'Chaos Lord In Terminator Armour':chassis([],slot('Weapons',...termLord,paired)),
 'Chaos Lord with Jump Pack':chassis([],slot('Weapons',...cross([pistol,plasma],[accursed,fist]),'Twin lightning claws')),
 'Dark Apostle':chassis([pistol,'Accursed crozius',ccw,ccw]),
 'Sorcerer':chassis([pistol,'Infernal Gaze','Force weapon']),
 'Sorcerer In Terminator Armour':chassis(['Infernal Gaze','Force weapon'],slot('Gun',combi,alternate),slot('Chaos familiar',[],'Chaos familiar')),
 'Master Of Possession':chassis([pistol,'Rite of Possession','Staff of possession']),
 'Havocs':chassis([ccw,ccw,ccw,ccw],slot('Champion primary','Flamer',bolt,'Meltagun','Plasma gun',plasma,accursed,fist),slot('Champion melee',chainsword,accursed,fist),
  ...Array.from({length:4},(_,i)=>{const standard=heavyGuns[i<2?0:2];return slot('Havoc '+(i+1),standard,...heavyGuns.filter(g=>g!==standard));})),
};
const groups=new Set(['Warp Talons','Possessed','Chaos Terminator Squad','Chosen','Raptors','Legionaries']);
export function isShadowMarine(unit:string):boolean{return Object.hasOwn(fixed,unit)||groups.has(unit);}
const iconBearer=(count:number):KnightSlot=>({name:'Chaos icon bearer',choices:[{name:'None',items:[]},...Array.from({length:count},(_,i)=>({name:i===0?'Champion':'Model '+(i+1),items:['Chaos icon']}))]});
export function shadowMarineLoadout(unit:string,size?:number):KnightEquipment|undefined {
 if(Object.hasOwn(fixed,unit))return fixed[unit];
 if(!groups.has(unit))return;
 const count=size??5;
 if(!Number.isInteger(count)||count<5||count>10)return;
 if(unit==='Warp Talons')return chassis(Array<string>(count).fill('Warp claws'));
 if(unit==='Possessed')return chassis(Array<string>(count).fill('Hideous mutations'),iconBearer(count));
 const slots:KnightSlot[]=[];
 for(let i=0;i<count;i++){
  const champ=i===0,label=champ?'Champion':'Model '+(i+1);
  if(unit==='Chaos Terminator Squad'){
   slots.push(slot(label+' weapons',...cross(champ?[combi,alternate]:[combi,alternate,'Heavy flamer','Reaper autocannon'],[accursed,fist,'Chainfist']),paired));
  }else if(unit==='Chosen'){
   slots.push(slot(label+' pistol',pistol,plasma),slot(label+' weapons',[bolt,accursed],[alternate,accursed],paired,[bolt,fist]));
  }else if(unit==='Raptors'){
   const options=champ?cross([pistol,plasma],[chainsword,accursed,heavy]):[
    [pistol,chainsword],[plasma,chainsword],[pistol,heavy],[pistol,mutations],...specialists.map(g=>[pistol,g,ccw])];
   slots.push(slot(label+' weapons',...options));
  }else if(champ){
   slots.push(slot('Champion boltgun',bolt,plasma,accursed,chainsword,heavy),slot('Champion pistol',pistol,plasma,accursed,chainsword,heavy));
  }else{
   slots.push(slot(label+' boltgun',bolt,chainsword,heavy,'Balefire tome',[plasma,chainsword],...legionSpecials));
  }
 }
 if(unit==='Chosen'||unit==='Legionaries')slots.push(iconBearer(count));
 return chassis(unit==='Legionaries'?[...Array<string>(count).fill(ccw),...Array<string>(count-1).fill(pistol)]:[],...slots);
}

// Per-five allowances are based on purchased models. Champion allowances and
// restrictions on a single bearer must not consume ordinary Legionary/Raptor slots.
export function validShadowMarineGear(s:RosterInstance):boolean {
 const sheet=shadowMarineLoadout(s.unit,s.models);
 if(!sheet||!s.knightGear)return true;
 const perFive=Math.floor((s.models??5)/5);
 const choices=sheet.slots.map(slot=>{
  const selected=slot.choices.find(c=>c.name===(s.knightGear?.[slot.name]??slot.choices[0].name));
  return {name:slot.name,items:selected?.items??[]};
 });
 const ordinary=choices.filter(row=>row.name.startsWith('Model '));
 const count=(item:string,rows=choices)=>rows.reduce((total,row)=>total+row.items.filter(value=>value===item).length,0);
 switch(s.unit){
  case 'Chaos Terminator Squad':
   return count('Heavy flamer')+count('Reaper autocannon')<=perFive&&count(paired)<=perFive&&count(fist)<=3*perFive&&count('Chainfist')<=perFive;
  case 'Chosen':
   return count(plasma)<=2*perFive&&count(alternate)<=2*perFive&&count(paired)<=perFive&&count(fist)<=perFive;
  case 'Raptors':
   return count(plasma,ordinary)<=2*perFive&&count(heavy,ordinary)<=2*perFive&&count(mutations,ordinary)<=perFive&&
    specialists.every(g=>count(g,ordinary)<=perFive)&&specialists.reduce((sum,g)=>sum+count(g,ordinary),0)<=2*perFive;
  case 'Legionaries':{
   const guns=[...legionSpecials,plasma];
   return count(plasma,choices.filter(row=>row.name.startsWith('Champion')))<=1&&count('Balefire tome',ordinary)<=1&&count(heavy,ordinary)<=1&&
    guns.every(g=>count(g,ordinary)<=1)&&guns.reduce((sum,g)=>sum+count(g,ordinary),0)<=perFive;
  }
  default:return true;
 }
}

export function resizeShadowMarineGear(s:RosterInstance,models:number):Record<string,string>|undefined {
 const sheet=shadowMarineLoadout(s.unit,models);
 if(!s.knightGear||!sheet)return s.knightGear;
 const retained:Record<string,string>={};
 for(const slot of sheet.slots){
  const old=s.knightGear[slot.name];
  if(old&&slot.choices.some(c=>c.name===old)){
   retained[slot.name]=old;
   if(!validShadowMarineGear({...s,models,knightGear:retained}))delete retained[slot.name];
  }
 }
 return Object.keys(retained).length?retained:undefined;
}
