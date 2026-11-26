import type {ArmySelection} from './catalog';
export const NECRON_ENHANCEMENTS:Record<string,readonly string[]>={
 'Awakened Dynasty':['Veil of Darkness','Nether-realm Casket','Phasal Subjugator','Enaegic Dermal Bond']
};
export const NECRON_EPIC_HEROES=new Set(['Imotekh the Stormlord','Orikan the Diviner','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon']);
export const NECRON_CHARACTERS=new Set(['Technomancer','Plasmancer','Chronomancer','Overlord','Skorpekh Lord','Hexmark Destroyer','Imotekh the Stormlord','Orikan the Diviner','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon']);
export function eligibleEnhancementBearers(army:ArmySelection):string[]{
 if(army.faction!=='Necrons'||!NECRON_ENHANCEMENTS[army.detachment])return [];
 return Object.keys(army.units).filter(name=>NECRON_CHARACTERS.has(name)&&!NECRON_EPIC_HEROES.has(name));
}
export function assignEnhancement(army:ArmySelection,character:string,enhancement:string|null):ArmySelection{
 const enhancements={...army.enhancements};delete enhancements[character];
 if(enhancement===null)return {...army,enhancements};
 if(!eligibleEnhancementBearers(army).includes(character))throw Error('Enhancement bearer must be an eligible non-Epic Hero CHARACTER');
 if(!NECRON_ENHANCEMENTS[army.detachment]?.includes(enhancement))throw Error('Enhancement is unavailable in this detachment');
 if(Object.values(enhancements).includes(enhancement))throw Error('Each Enhancement can be selected only once');
 if(Object.keys(enhancements).length>=3)throw Error('Maximum three Enhancements per army');
 return {...army,enhancements:{...enhancements,[character]:enhancement}};
}
export function validateEnhancements(army:ArmySelection):boolean{
 if(!army.enhancements)return true;
 if(typeof army.enhancements!=='object'||Array.isArray(army.enhancements))return false;
 try{let candidate:ArmySelection={...army,enhancements:{}};for(const [character,enhancement] of Object.entries(army.enhancements))candidate=assignEnhancement(candidate,character,enhancement);return true;}catch{return false;}
}
