import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {expandRoster} from './roster-instances';

import {chassis,slot,type KnightEquipment} from './knight-gear-options';
import {agentLoadout,resizeAgentGear,validAgentGear} from './assigned-agent-loadouts';
export {countedKnightItems,knightItemsLabel} from './knight-gear-options';
export type {KnightSlot} from './knight-gear-options';

const stubber='Questoris heavy stubber';
const battleCannon='Rapid-fire battle cannon';
const sword='Reaper chainsword';
const gauntlet='Thunderstrike gauntlet';
const missile='Shieldbreaker missile launcher';
const siegebreaker='Twin siegebreaker cannon';
const autocannon='Acastus autocannon';

const auxiliary=slot('Hull weapon','Meltagun',stubber);
const carapace=slot('Carapace',[],'Ironstorm missile pod','Stormspear rocket pod','Twin Icarus autocannon');
const arm=slot('Melee arm',sword,gauntlet);
const dominus=slot('Carapace',[missile,missile,siegebreaker],[missile,siegebreaker,siegebreaker]);
const hekaton=slot('Melee arm',sword,['Hekaton siege claw','Twin rad cleanser']);
const siegeClaw=['Siege claw','Rad cleanser'];
const gatling='Chastiser gatling cannon',bombard='Frag bombard';
const destrierSword='Bellatus reaper chainsword',spear='Thundershock spear';
const feet='Titanic feet',armigerFeet='Armoured feet';

function skitarii(rifle:string):KnightEquipment {
  // One Alpha and nine line models. Three distinct line models can replace
  // their gun; the optics/data-tether bearer must retain a standard rifle.
  return chassis([...Array<string>(10).fill('Close combat weapon'),...Array<string>(6).fill(rifle)],
    slot('Alpha firearm',rifle,'Mechanicus pistol'),slot('Alpha melee equipment',[],'Alpha combat weapon'),
    ...['Arc rifle','Plasma caliver','Transuranic arquebus'].map(special=>slot(special+' bearer',rifle,special)),
    slot('Standard rifle bearer equipment',[],'Enhanced data-tether','Omnispex'));
}

// October 11e wargear options: https://wahapedia.ru/wh40k11ed/factions/imperial-knights/datasheets.html
export const IMPERIAL_KNIGHT_LOADOUTS:Readonly<Record<string,KnightEquipment>>={
  'Acastus Knight Asterius':chassis(['Asterius volkite culverin','Asterius volkite culverin','Karacnos mortar battery','Twin conversion beam cannon','Twin conversion beam cannon',feet]),
  'Acastus Knight Porphyrion':chassis(['Twin magna lascannon','Twin magna lascannon',feet],
    slot('Hull guns',[autocannon,autocannon],[autocannon,'Lascannon'],['Lascannon','Lascannon']),
    slot('Missiles','Acastus ironstorm missile pod','Helios defence missiles')),
  'Armiger Helverin':chassis(['Armiger autocannon','Armiger autocannon',armigerFeet],slot('Hull weapon',stubber,'Meltagun')),
  'Armiger Warglaive':chassis(['Thermal spear','Reaper chain-cleaver'],slot('Hull weapon',stubber,'Meltagun')),
  'Armiger Moirax':chassis([armigerFeet],
    slot('Volkite arm','Volkite veuglaire',siegeClaw,'Graviton pulsar','Lightning lock','Conversion beam cannon'),
    slot('Graviton arm','Graviton pulsar',siegeClaw,'Lightning lock','Conversion beam cannon','Volkite veuglaire')),
  'Canis Rex':chassis(['Las-impulsor','Questoris multi-laser','Freedom’s Hand']),
  'Sir Hekhtur':chassis(['Hekhtur’s pistol','Close combat weapon']),
  'Cerastus Knight Acheron':chassis(['Acheron flame cannon','Twin heavy bolter','Reaper chainfist']),
  'Cerastus Knight Atrapos':chassis(['Atrapos lascutter','Graviton singularity cannon']),
  'Cerastus Knight Castigator':chassis(['Castigator bolt cannon','Tempest warblade']),
  'Cerastus Knight Lancer':chassis(['Cerastus shock lance']),
  'Knight Castellan':chassis(['Plasma decimator','Twin meltagun','Twin meltagun','Volcano lance',feet],dominus),
  'Knight Crusader':chassis(['Avenger gatling cannon','Heavy flamer',feet],auxiliary,slot('Cannon','Thermal cannon',[battleCannon,stubber]),carapace),
  'Knight Defender':chassis(['Conversion beam obliterator','Plasma executor','Twin incendine combustor','Phosphor blaster',feet]),
  'Knight Destrier':chassis([stubber,feet],slot('Gatling arm',gatling,destrierSword,spear),slot('Bombard arm',bombard,destrierSword,spear)),
  'Knight Errant':chassis(['Thermal cannon'],auxiliary,arm,carapace),
  'Knight Gallant':chassis([gauntlet,sword],auxiliary,carapace),
  'Knight Paladin':chassis([stubber,battleCannon],auxiliary,arm,carapace),
  'Knight Preceptor':chassis(['Las-impulsor'],slot('Hull weapon','Questoris multi-laser','Meltagun',stubber),arm,carapace),
  'Knight Valiant':chassis(['Conflagration cannon','Thundercoil harpoon','Twin meltagun','Twin meltagun',feet],dominus),
  'Knight Warden':chassis(['Avenger gatling cannon','Heavy flamer'],auxiliary,arm,carapace),
  'Questoris Knight Magaera':chassis(['Lightning cannon','Phased plasma-fusil'],hekaton),
  'Questoris Knight Styrix':chassis(['Graviton crusher','Volkite chierovile'],hekaton),
  'Skitarii Marshal':chassis(['Mechanicus pistol','Control stave']),
  'Tech-priest Dominus':chassis(['Omnissian axe'],slot('Sidearm','Macrostubber','Phosphor serpenta'),slot('Main weapon','Volkite blaster','Eradication ray')),
  'Tech-priest Manipulus':chassis(['Omnissian staff'],slot('Main weapon','Magnarail lance','Transonic cannon')),
  'Skitarii Rangers':skitarii('Galvanic rifle'),
  'Skitarii Vanguard':skitarii('Radium carbine'),
};

// The eight Forge World chassis and the Moirax have the same fixed and
// replacement weapons in both printed October packs. Other entries below
// use the Chaos Knights datasheet, including its distinct arm and hull guns.
// https://wahapedia.ru/wh40k11ed/factions/chaos-knights/datasheets.html
const chaosStubber='Diabolus heavy stubber',daemonMelta='Daemonbreath meltagun';
const havoc=slot('Hull weapon',chaosStubber,'Havoc multi-launcher');
const dogMelta=slot('Hull weapon',chaosStubber,daemonMelta);
const despoilerCannons=[
  'Daemonbreath thermal cannon',['Despoiler gatling cannon','Heavy darkflamer'],
  ['Despoiler battle cannon',chaosStubber],
];
const gheist='Gheiststrike missile launcher',twinDesecrator='Twin Desecrator cannon';

const specialistWeapons=['Cultist grenade launcher','Flamer','Meltagun','Plasma gun','Cultist sniper rifle'];
function cultistMob(models:number):KnightEquipment {
  return chassis([...Array<string>(models).fill('Brutal assault weapon'),...Array<string>(models-1).fill('Autopistol')],
    slot('Champion firearm','Autopistol','Bolt pistol'));
}
function accursedCultists(models:number):KnightEquipment {
  const min=Math.max(3,models-10),max=Math.min(6,models-5);
  const choices=Array.from({length:max-min+1},(_,i)=>{
    const torments=min+i,mutants=models-torments;
    return {name:torments+' Torments + '+mutants+' Mutants',
      items:[...Array<string>(torments).fill('Hideous mutations'),...Array<string>(mutants).fill('Blasphemous appendages')]};
  });
  return chassis([],{name:'Composition',choices});
}
// On resize, preserve the selected Torments when possible and change only
// the additional Mutants, within the printed 3–6 Torment / 5–10 Mutant bounds.
export function resizeKnightComposition(squad:RosterInstance,models:number):Record<string,string>|undefined {
  if(!squad.knightGear)return undefined;
  if(squad.unit!=='Accursed Cultists'||!squad.knightGear.Composition)return resizeAgentGear(squad.unit,squad.knightGear,models);
  const previous=Number.parseInt(squad.knightGear.Composition,10);
  const options=accursedCultists(models).slots[0].choices;
  const keep=options.find(c=>Number.parseInt(c.name,10)>=previous)??options.at(-1)!;
  return {...squad.knightGear,Composition:keep.name};
}

export const CHAOS_KNIGHT_LOADOUTS:Readonly<Record<string,KnightEquipment>>={
  ...Object.fromEntries([
    'Acastus Knight Asterius','Acastus Knight Porphyrion','Cerastus Knight Acheron',
    'Cerastus Knight Atrapos','Cerastus Knight Castigator','Cerastus Knight Lancer',
    'Questoris Knight Magaera','Questoris Knight Styrix',
  ].map(name=>['Chaos '+name,IMPERIAL_KNIGHT_LOADOUTS[name]])),
  'War Dog Moirax':IMPERIAL_KNIGHT_LOADOUTS['Armiger Moirax'],
  'Cultist Firebrand':chassis(['Balefire pike','Close combat weapon']),
  'Dark Commune':chassis(['Autopistol','Commune stave','Warp Curse','Close combat weapon','Autopistol','Close combat weapon','Chaos icon','Commune blade','Commune blade']),
  'Traitor Enforcer':chassis(['Bolt pistol','Power fist','Ogryn weapons']),
  'Cultist Mob':cultistMob(10),
  'Accursed Cultists':accursedCultists(8),
  'Fellgor Beastmen':chassis(['Chainsword',...Array<string>(9).fill('Autopistol'),...Array<string>(7).fill('Close combat weapon')],
    slot('Champion firearm','Bolt pistol','Plasma pistol'),slot('Great weapon bearer','Close combat weapon','Great weapon'),
    slot('Stave bearer','Close combat weapon','Corrupted stave')),
  'Traitor Guardsmen Squad':chassis([...Array<string>(9).fill('Close combat weapon'),...Array<string>(6).fill('Lasgun')],
    slot('Sergeant firearm','Corrupted pistol','Boltgun'),slot('Sergeant melee weapon','Close combat weapon','Chainsword','Power weapon'),
    ...['First specialist','Second specialist','Third specialist'].map(name=>slot(name,'Lasgun',...specialistWeapons))),
  'Knight Abominant':chassis([chaosStubber,'Volkite combustor','Balemace','Electroscourge']),
  'Knight Desecrator':chassis(['Desecrator laser destructor',chaosStubber],slot('Melee arm',sword,'Warpstrike claw')),
  'Knight Despoiler':chassis([feet],slot('Hull weapon',daemonMelta,chaosStubber),
    slot('Chainsword arm',sword,...despoilerCannons),slot('Claw arm','Warpstrike claw',...despoilerCannons),
    slot('Carapace',[],'Havoc missile pod','Ruinspear rocket pod','Hellstorm autocannons')),
  'Knight Rampager':chassis([chaosStubber,sword,'Warpstrike claw']),
  'Knight Ruinator':chassis(['Darkflame lance','Terrorpulse missiles','Fellbore']),
  'Knight Tyrant':chassis(['Twin daemonbreath meltagun','Twin daemonbreath meltagun',feet],
    slot('Arm weapons',['Brimstone volcano lance','Ectoplasma decimator'],['Darkflame cannon','Warpshock harpoon']),
    slot('Carapace',[gheist,gheist,twinDesecrator],[gheist,twinDesecrator,twinDesecrator])),
  'War Dog Brigand':chassis(['Avenger chaincannon','Daemonbreath spear',armigerFeet],havoc),
  'War Dog Executioner':chassis(['War Dog autocannon','War Dog autocannon',armigerFeet],dogMelta),
  'War Dog Huntsman':chassis(['Daemonbreath spear','Reaper chaintalon'],dogMelta),
  'War Dog Karnivore':chassis(['Reaper chaintalon','Slaughterclaw'],havoc),
  'War Dog Stalker':chassis([],slot('Gun arm','Avenger chaincannon','Daemonbreath spear'),
    havoc,slot('Melee arm','Slaughterclaw','Reaper chaintalon')),
};

export function knightLoadoutFor(faction:ArmySelection['faction'],unit:string,models?:number):KnightEquipment|undefined {
  if(faction==='Imperial Knights'&&Object.hasOwn(IMPERIAL_KNIGHT_LOADOUTS,unit))return IMPERIAL_KNIGHT_LOADOUTS[unit];
  if(faction==='Imperial Knights'||faction==='Imperial Agents')return agentLoadout(unit,models);
  if(faction!=='Chaos Knights'||!Object.hasOwn(CHAOS_KNIGHT_LOADOUTS,unit))return undefined;
  if(models!==undefined&&unit==='Cultist Mob')return Number.isInteger(models)&&models>=10&&models<=20?cultistMob(models):undefined;
  if(models!==undefined&&unit==='Accursed Cultists')return Number.isInteger(models)&&models>=8&&models<=16?accursedCultists(models):undefined;
  return CHAOS_KNIGHT_LOADOUTS[unit];
}
function registeredLoadout(unit:string,models?:number) {
  return knightLoadoutFor('Imperial Knights',unit,models)??knightLoadoutFor('Chaos Knights',unit,models);
}
export function knightEquippedItems(squad:RosterInstance):string[] {
  const sheet=registeredLoadout(squad.unit,squad.models);
  if(!sheet)return [];
  return [...sheet.fixed,...sheet.slots.flatMap(s=>{
    const choice=squad.knightGear?.[s.name]??s.choices[0].name;
    return s.choices.find(c=>c.name===choice)?.items??[];
  })];
}
function weaponName(name:string) {
  return name.split(/\s+[–—-]\s+/)[0].toLowerCase().replaceAll('’',"'").replace('battlecannon','battle cannon');
}
export function knightWeaponCount(squad:RosterInstance,printedName:string):number {
  const target=weaponName(printedName);
  return knightEquippedItems(squad).filter(item=>weaponName(item)===target).length;
}
export function validKnightGear(squad:RosterInstance,faction?:ArmySelection['faction']):boolean {
  const gear=squad.knightGear;
  if(gear===undefined)return true;
  if(!gear||typeof gear!=='object'||Array.isArray(gear))return false;
  const sheet=faction?knightLoadoutFor(faction,squad.unit,squad.models):registeredLoadout(squad.unit,squad.models);
  if(!sheet||!Object.entries(gear).every(([name,choice])=>sheet.slots.find(s=>s.name===name)?.choices.some(c=>c.name===choice)))return false;
  if(!validAgentGear(squad.unit,gear,squad.models))return false;
  if(squad.unit==='Traitor Guardsmen Squad')return specialistWeapons.every(name=>knightWeaponCount(squad,name)<=1);
  return squad.unit!=='Knight Destrier'||(knightWeaponCount(squad,destrierSword)<=1&&knightWeaponCount(squad,spear)<=1);
}
export function setKnightGear(army:ArmySelection,id:string,slotName:string,choice:string):ArmySelection {
  const roster=expandRoster(army),squad=roster.find(s=>s.id===id);
  if(!squad||!knightLoadoutFor(army.faction,squad.unit,squad.models))throw Error('Select a Knight army squad with a supported datasheet');
  const updated={...squad,knightGear:{...squad.knightGear,[slotName]:choice}};
  if(!validKnightGear(updated,army.faction))throw Error('This weapon combination is unavailable on the datasheet');
  return {...army,instances:roster.map(s=>s.id===id?updated:s)};
}
