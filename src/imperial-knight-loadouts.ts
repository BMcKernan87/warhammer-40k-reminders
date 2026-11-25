import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {expandRoster} from './roster-instances';

export interface KnightSlot {
  name: string;
  choices: {name:string; items:readonly string[]}[];
}
interface KnightEquipment {
  fixed: readonly string[];
  slots: readonly KnightSlot[];
}

const stubber='Questoris heavy stubber';
const battleCannon='Rapid-fire battle cannon';
const sword='Reaper chainsword';
const gauntlet='Thunderstrike gauntlet';
const missile='Shieldbreaker missile launcher';
const siegebreaker='Twin siegebreaker cannon';
const autocannon='Acastus autocannon';
const none='None';

export function countedKnightItems(items:readonly string[]):Record<string,number> {
  const counts:Record<string,number>={};
  for(const name of items) counts[name]=(counts[name]??0)+1;
  return counts;
}
export function knightItemsLabel(items:readonly string[]):string {
  return Object.entries(countedKnightItems(items)).map(([name,n])=>n>1?n+' × '+name:name).join(' + ')||none;
}
// In each slot the first option is the printed standard equipment.
function slot(name:string,...options:(string|readonly string[])[]):KnightSlot {
  return {name,choices:options.map(option=>{
    const items=typeof option==='string'?[option]:option;
    return {name:knightItemsLabel(items),items};
  })};
}
const auxiliary=slot('Hull weapon','Meltagun',stubber);
const carapace=slot('Carapace',[],'Ironstorm missile pod','Stormspear rocket pod','Twin Icarus autocannon');
const arm=slot('Melee arm',sword,gauntlet);
const dominus=slot('Carapace',[missile,missile,siegebreaker],[missile,siegebreaker,siegebreaker]);
const hekaton=slot('Melee arm',sword,['Hekaton siege claw','Twin rad cleanser']);
const siegeClaw=['Siege claw','Rad cleanser'];
const gatling='Chastiser gatling cannon',bombard='Frag bombard';
const destrierSword='Bellatus reaper chainsword',spear='Thundershock spear';
const feet='Titanic feet',armigerFeet='Armoured feet';
const chassis=(fixed:readonly string[],...slots:KnightSlot[]):KnightEquipment=>({fixed,slots});

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

export function knightEquippedItems(squad:RosterInstance):string[] {
  const sheet=IMPERIAL_KNIGHT_LOADOUTS[squad.unit];
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
export function validKnightGear(squad:RosterInstance):boolean {
  const gear=squad.knightGear;
  if(gear===undefined)return true;
  if(!gear||typeof gear!=='object'||Array.isArray(gear))return false;
  const sheet=IMPERIAL_KNIGHT_LOADOUTS[squad.unit];
  if(!sheet||!Object.entries(gear).every(([name,choice])=>sheet.slots.find(s=>s.name===name)?.choices.some(c=>c.name===choice)))return false;
  return squad.unit!=='Knight Destrier'||(knightWeaponCount(squad,destrierSword)<=1&&knightWeaponCount(squad,spear)<=1);
}
export function setKnightGear(army:ArmySelection,id:string,slotName:string,choice:string):ArmySelection {
  const roster=expandRoster(army),squad=roster.find(s=>s.id===id);
  if(army.faction!=='Imperial Knights'||!squad)throw Error('Select an Imperial Knights squad');
  const updated={...squad,knightGear:{...squad.knightGear,[slotName]:choice}};
  if(!validKnightGear(updated))throw Error('This weapon combination is unavailable on the datasheet');
  return {...army,instances:roster.map(s=>s.id===id?updated:s)};
}
