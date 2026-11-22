import type {Faction} from './catalog';
export type ForceDisposition='Take and Hold'|'Disruption'|'Purge the Foe'|'Priority Assets'|'Reconnaissance';
export interface Detachment2026 {name:string;disposition:ForceDisposition;dp:1|2|3}
export const EDITION_2026_SOURCE='https://www.warhammer-community.com/en-gb/articles/fchkklcq/new40k-download-new-xenos-faction-packs-today/';
export const DETACHMENTS_2026:Partial<Record<Faction,readonly Detachment2026[]>>={
 Necrons:[
 {name:'Hand of the Dynasty',disposition:'Take and Hold',dp:1},
 {name:'Skyshroud Spearhead',disposition:'Reconnaissance',dp:1},
 {name:"The Phaeron's Armoury",disposition:'Priority Assets',dp:1},
 {name:'Annihilation Legion',disposition:'Purge the Foe',dp:2},
 {name:'Awakened Dynasty',disposition:'Take and Hold',dp:3},
 {name:'Canoptek Court',disposition:'Take and Hold',dp:3},
 {name:'Cryptek Conclave',disposition:'Priority Assets',dp:2},
 {name:'Cursed Legion',disposition:'Purge the Foe',dp:2},
 {name:'Hypercrypt Legion',disposition:'Reconnaissance',dp:2},
 {name:'Obeisance Phalanx',disposition:'Disruption',dp:2},
 {name:'Pantheon of Woe',disposition:'Purge the Foe',dp:2},
 {name:'Starshatter Arsenal',disposition:'Priority Assets',dp:3}],
 Orks:[
 {name:'More Dakka!',disposition:'Purge the Foe',dp:1},
 {name:"Rollin' Deff",disposition:'Priority Assets',dp:1},
 {name:'Taktikal Brigade',disposition:'Disruption',dp:1},
 {name:'Blitz Brigade',disposition:'Reconnaissance',dp:2},
 {name:'Bully Boyz',disposition:'Purge the Foe',dp:2},
 {name:'Da Big Hunt',disposition:'Purge the Foe',dp:2},
 {name:'Dread Mob',disposition:'Purge the Foe',dp:2},
 {name:'Freebooter Krew',disposition:'Take and Hold',dp:2},
 {name:'Green Tide',disposition:'Take and Hold',dp:2},
 {name:'Kult of Speed',disposition:'Disruption',dp:2},
 {name:'Speedwaaagh!',disposition:'Reconnaissance',dp:2},
 {name:'War Horde',disposition:'Take and Hold',dp:3}],
 Tyranids:[
 {name:'Ambush Predators',disposition:'Disruption',dp:1},
 {name:'Talons of the Norn Queen',disposition:'Take and Hold',dp:1},
 {name:'Warrior Bioform Onslaught',disposition:'Take and Hold',dp:1},
 {name:'Assimilation Swarm',disposition:'Priority Assets',dp:2},
 {name:'Crusher Stampede',disposition:'Purge the Foe',dp:2},
 {name:'Invasion Fleet',disposition:'Take and Hold',dp:3},
 {name:'Subterranean Assault',disposition:'Disruption',dp:3},
 {name:'Synaptic Nexus',disposition:'Disruption',dp:2},
 {name:'Unending Swarm',disposition:'Take and Hold',dp:2},
 {name:'Vanguard Onslaught',disposition:'Reconnaissance',dp:2}]
};
export type BattleSize2026='Incursion'|'Strike Force';
export const BATTLE_SIZES_2026:Record<BattleSize2026,{points:number;dp:number;enhancements:number;unitLimit:number}>={
 Incursion:{points:1000,dp:2,enhancements:2,unitLimit:2},
 'Strike Force':{points:2000,dp:3,enhancements:4,unitLimit:3}
};
export function detachmentBudget(faction:Faction,selected:readonly string[],size:BattleSize2026){
 const available=DETACHMENTS_2026[faction];
 if(!available)return {supported:false,spent:0,limit:BATTLE_SIZES_2026[size].dp,valid:false,dispositions:[] as ForceDisposition[]};
 const entries=selected.map(name=>available.find(d=>d.name===name));
 const spent=entries.reduce((sum,d)=>sum+(d?.dp||0),0);
 return {supported:true,spent,limit:BATTLE_SIZES_2026[size].dp,valid:selected.length>0&&new Set(selected).size===selected.length&&entries.every(Boolean)&&spent<=BATTLE_SIZES_2026[size].dp,dispositions:[...new Set(entries.filter((d):d is Detachment2026=>!!d).map(d=>d.disposition))]};
}
