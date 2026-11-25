import {DAEMONIC_ALLEGIANCES} from './daemonic-pact';
import {DAEMON_EQUIPMENT} from './daemonic-pact-equipment.generated';
import {chassis,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';

type DaemonAllegiance=typeof DAEMONIC_ALLEGIANCES[number];
const grinderWeapons:Record<DaemonAllegiance,string>={
  Khorne:'Torrent of burning blood',Tzeentch:'Warp gaze',Nurgle:'Phlegm bombardment',Slaanesh:'Scream of despair',
};
const allegiance=(grinder:boolean):KnightSlot=>({name:'Daemonic allegiance',
  choices:DAEMONIC_ALLEGIANCES.map(name=>({name,items:grinder?[grinderWeapons[name]]:[]}))});
const instruments=[slot('Instrument bearer',[],'Instrument of Chaos'),slot('Separate icon bearer',[],'Daemonic icon')];
const choices:Readonly<Record<string,KnightSlot[]>>={
  'Lord of Change':[slot('Additional weapon',[],'Rod of sorcery','Baleful sword')],
  'Keeper Of Secrets':[slot('Additional wargear',[],'Living whip','Ritual knife','Shining aegis')],
  'Great Unclean One':[slot('Plague flail arm','Plague flail','Bileblade'),slot('Bilesword arm','Bilesword','Doomsday bell')],
  'Bloodthirster':[slot('Axe weapons','Great axe of Khorne',['Axe of Khorne','Bloodflail'],['Axe of Khorne','Lash of Khorne'])],
  'Soul Grinder':[slot('Melee arm','Warpsword','Warpclaw'),allegiance(true)],
  'Daemon Prince of Chaos':[allegiance(false)],
  'Daemon Prince Of Chaos With Wings':[allegiance(false)],
};
export function daemonLoadout(unit:string,models?:number):KnightEquipment|undefined {
  if(!Object.hasOwn(DAEMON_EQUIPMENT,unit))return undefined;
  const row=DAEMON_EQUIPMENT[unit],size=models??row.minimum;
  if(!Number.isInteger(size)||size<row.minimum||size>row.maximum)return undefined;
  const slots=row.separateBearers?instruments:choices[unit]??[];
  const replaceable=slots.flatMap(s=>s.choices[0].items);
  const each=row.perModel.filter(item=>!replaceable.includes(item));
  return chassis([...Array.from({length:size},()=>each).flat(),...row.extra??[]],...slots);
}
