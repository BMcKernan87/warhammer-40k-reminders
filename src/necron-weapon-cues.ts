import type {RosterInstance} from './roster-instances';
import {NECRON_LOADOUTS,currentEquipmentName} from './necron-wargear';
import type {TriggerRule} from './necron-battlefield-rules';

interface WeaponCue {weapon:string; abilities:string; primary?:string; optional?:string}
interface WeaponPhases {shoot?:WeaponCue[]; fight?:WeaponCue[]}
// Weapon profiles with printed keywords. Battle-selected Vault powers and the expendable tachyon arrow have separate reminders.
const profiles:Record<string,WeaponPhases>={
  "Illuminor Szeras": {
    fight: [
      {weapon:"Impaling legs", abilities:"Extra Attacks"},
    ],
  },
  "Imotekh the Stormlord": {
    shoot: [
      {weapon:"Gauntlet of Fire", abilities:"Ignores Cover, Torrent"},
    ],
    fight: [
      {weapon:"Staff of the Destroyer", abilities:"Devastating Wounds"},
    ],
  },
  "Nekrosor Ammentar": {
    shoot: [
      {weapon:"Enmitic disintegrators", abilities:"Ignores Cover, Pistol, Sustained Hits 2"},
    ],
    fight: [
      {weapon:"Blade tail and whip coils", abilities:"Extra Attacks"},
    ],
  },
  "Orikan the Diviner": {
    fight: [
      {weapon:"Staff of Tomorrow", abilities:"Devastating Wounds"},
    ],
  },
  "Trazyn the Infinite": {
    fight: [
      {weapon:"Empathic Obliterator", abilities:"Sustained Hits D3"},
    ],
  },
  "C’tan Shard of the Deceiver": {
    shoot: [
      {weapon:"Cosmic insanity", abilities:"Anti-Character 4+, Devastating Wounds, Precision"},
    ],
  },
  "C’tan Shard of the Nightbringer": {
    fight: [
      {weapon:"Scythe of the Nightbringer – strike", abilities:"Devastating Wounds"},
    ],
  },
  "C’tan Shard of the Void Dragon": {
    shoot: [
      {weapon:"Spear of the Void Dragon", abilities:"Anti-Vehicle 2+"},
      {weapon:"Voltaic storm", abilities:"Blast, Sustained Hits 2"},
    ],
    fight: [
      {weapon:"Spear of the Void Dragon – strike", abilities:"Anti-Vehicle 2+"},
      {weapon:"Canoptek tail blades", abilities:"Extra Attacks"},
    ],
  },
  "The Silent King": {
    shoot: [
      {weapon:"Sceptre of Eternal Glory", abilities:"Devastating Wounds"},
      {weapon:"Staff of Stars", abilities:"Indirect Fire"},
    ],
    fight: [
      {weapon:"Weapons of the Final Triarch", abilities:"Lethal Hits"},
    ],
  },
  "Chronomancer": {
    shoot: [
      {weapon:"Aeonstave", abilities:"Blast"},
    ],
  },
  "Geomancer": {
    shoot: [
      {weapon:"Tremorglaive – reverberating beam", abilities:"Melta 2"},
      {weapon:"Tremorglaive – shock wave pulse", abilities:"Ignores Cover, Torrent"},
    ],
  },
  "Hexmark Destroyer": {
    shoot: [
      {weapon:"Enmitic disintegrator pistols", abilities:"Pistol, Ignores Cover"},
    ],
  },
  "Overlord": {
    fight: [
      {weapon:"Overlord’s blade", abilities:"Devastating Wounds", primary:"Tachyon arrow and Overlord’s blade"},
      {weapon:"Voidscythe", abilities:"Devastating Wounds", primary:"Voidscythe"},
    ],
  },
  "Overlord with translocation shroud": {
    fight: [
      {weapon:"Overlord's blade", abilities:"Devastating Wounds"},
    ],
  },
  "Royal Warden": {
    shoot: [
      {weapon:"Relic gauss blaster", abilities:"Lethal Hits, Rapid Fire 2"},
    ],
  },
  "Skorpekh Lord": {
    shoot: [
      {weapon:"Enmitic annihilator", abilities:"Rapid Fire 2"},
    ],
  },
  "Transcendent C’tan": {
    shoot: [
      {weapon:"Seismic assault", abilities:"Assault, Sustained Hits 1"},
    ],
    fight: [
      {weapon:"Crackling tendrils", abilities:"Sustained Hits 1"},
    ],
  },
  "Lokhust Lord": {
    fight: [
      {weapon:"Lord’s blade", abilities:"Devastating Wounds", primary:"Lord’s blade"},
    ],
  },
  "Catacomb Command Barge": {
    shoot: [
      {weapon:"Gauss cannon", abilities:"Lethal Hits", primary:"Gauss cannon"},
      {weapon:"Tesla cannon", abilities:"Sustained Hits 2", primary:"Tesla cannon"},
    ],
    fight: [
      {weapon:"Overlord’s blade", abilities:"Devastating Wounds", optional:"Overlord’s blade"},
    ],
  },
  "Immortals": {
    shoot: [
      {weapon:"Gauss blaster", abilities:"Lethal Hits", primary:"Gauss blaster"},
      {weapon:"Tesla carbine", abilities:"Assault, Sustained Hits 2", primary:"Tesla carbine"},
    ],
  },
  "Necron Warriors": {
    shoot: [
      {weapon:"Gauss flayer", abilities:"Lethal Hits, Rapid Fire 1", primary:"Gauss flayer"},
      {weapon:"Gauss reaper", abilities:"Lethal Hits", primary:"Gauss reaper"},
    ],
  },
  "Ghost Ark": {
    shoot: [
      {weapon:"Gauss flayer array", abilities:"Lethal Hits, Rapid Fire 5"},
    ],
  },
  "Doom Scythe": {
    shoot: [
      {weapon:"Heavy death ray", abilities:"Sustained Hits D3"},
      {weapon:"Twin tesla destructor", abilities:"Sustained Hits 2, Twin-Linked"},
    ],
  },
  "Canoptek Macrocytes": {
    shoot: [
      {weapon:"Gauss scalpel", abilities:"Lethal Hits", primary:"Gauss scalpel"},
      {weapon:"Tesla caster", abilities:"Assault, Sustained Hits 1", primary:"Tesla caster"},
    ],
  },
  "Canoptek Tomb Crawlers": {
    shoot: [
      {weapon:"Twin gauss reaper", abilities:"Lethal Hits, Twin-Linked"},
    ],
  },
  "Canoptek Wraiths": {
    shoot: [
      {weapon:"Particle caster", abilities:"Devastating Wounds, Pistol", optional:"Particle caster"},
    ],
  },
  "Deathmarks": {
    shoot: [
      {weapon:"Synaptic disintegrator", abilities:"Heavy, Precision"},
    ],
  },
  "Flayed Ones": {
    fight: [
      {weapon:"Flayer claws", abilities:"Sustained Hits 1, Twin-Linked"},
    ],
  },
  "Lychguard": {
    fight: [
      {weapon:"Warscythe", abilities:"Devastating Wounds", primary:"Warscythe"},
    ],
  },
  "Triarch Praetorians": {
    shoot: [
      {weapon:"Particle caster", abilities:"Devastating Wounds, Pistol", primary:"Voidblade and particle caster"},
    ],
  },
  "Lokhust Destroyers": {
    shoot: [
      {weapon:"Gauss cannon", abilities:"Lethal Hits"},
    ],
  },
  "Lokhust Heavy Destroyers": {
    shoot: [
      {weapon:"Enmitic exterminator", abilities:"Heavy, Rapid Fire 6, Sustained Hits 1", primary:"Enmitic exterminator"},
      {weapon:"Gauss destructor", abilities:"Heavy, Lethal Hits", primary:"Gauss destructor"},
    ],
  },
  "Tomb Blades": {
    shoot: [
      {weapon:"Particle beamer", abilities:"Blast, Devastating Wounds", primary:"Particle beamer"},
      {weapon:"Twin gauss blaster", abilities:"Lethal Hits, Twin-Linked", primary:"Twin gauss blaster"},
      {weapon:"Twin tesla carbine", abilities:"Assault, Sustained Hits 2, Twin-Linked", primary:"Twin tesla carbine"},
    ],
  },
  "Canoptek Scarab Swarms": {
    fight: [
      {weapon:"Feeder mandibles", abilities:"Lethal Hits"},
    ],
  },
  "Monolith": {
    shoot: [
      {weapon:"Death ray", abilities:"Sustained Hits D3", primary:"Four death rays"},
      {weapon:"Gauss flux arc", abilities:"Lethal Hits, Rapid Fire 3", primary:"Four gauss flux arcs"},
      {weapon:"Particle whip", abilities:"Blast, Devastating Wounds"},
    ],
  },
  "Obelisk": {
    shoot: [
      {weapon:"Tesla sphere", abilities:"Anti-Fly 4+, Sustained Hits 2"},
    ],
  },
  "Tesseract Vault": {
    shoot: [
      {weapon:"Tesla spheres", abilities:"Sustained Hits 2"},
    ],
  },
  "Seraptek Heavy Construct": {
    shoot: [
      {weapon:"Singularity generator", abilities:"Blast, Devastating Wounds", primary:"Two singularity generators"},
      {weapon:"Synaptic obliterator", abilities:"Sustained Hits 2", primary:"Two synaptic obliterators and two transdimensional projectors"},
    ],
  },
  "Night Scythe": {
    shoot: [
      {weapon:"Twin tesla destructor", abilities:"Sustained Hits 2, Twin-Linked"},
    ],
  },
  "Annihilation Barge": {
    shoot: [
      {weapon:"Gauss cannon", abilities:"Lethal Hits", primary:"Gauss cannon"},
      {weapon:"Tesla cannon", abilities:"Sustained Hits 2", primary:"Tesla cannon"},
      {weapon:"Twin tesla destructor", abilities:"Sustained Hits 2, Twin-Linked"},
    ],
  },
  "Canoptek Spyders": {
    shoot: [
      {weapon:"Particle beamer", abilities:"Blast, Devastating Wounds", optional:"Pair of particle beamers"},
    ],
  },
  "Doomsday Ark": {
    shoot: [
      {weapon:"Doomsday cannon", abilities:"Blast, Heavy"},
      {weapon:"Gauss flayer array", abilities:"Lethal Hits, Rapid Fire 5"},
    ],
  },
  "Canoptek Doomstalker": {
    shoot: [
      {weapon:"Doomsday blaster", abilities:"Blast, Heavy"},
      {weapon:"Twin gauss flayer", abilities:"Lethal Hits, Rapid Fire 1, Twin-Linked"},
    ],
  },
  "Triarch Stalker": {
    shoot: [
      {weapon:"Heat ray – dispersed", abilities:"Ignores Cover, Torrent", primary:"Heat ray"},
      {weapon:"Heat ray – focused", abilities:"Melta 4", primary:"Heat ray"},
      {weapon:"Particle shredder", abilities:"Blast, Devastating Wounds", primary:"Particle shredder"},
      {weapon:"Heavy gauss cannon array", abilities:"Lethal Hits", primary:"Heavy gauss cannon array"},
    ],
  },
};

function equipped(squad:RosterInstance, options:WeaponCue[]):WeaponCue[]{
  return options.filter(p=>{
    if(p.optional)return (squad.wargear?.[p.optional]??0)>0;
    if(!p.primary)return true;
    if(squad.weaponCounts)return (squad.weaponCounts[p.primary]??0)>0;
    return currentEquipmentName(squad.unit,squad.equipment??NECRON_LOADOUTS[squad.unit].primary?.[0]??'')===p.primary;
  });
}

export const weaponRules:TriggerRule[]=Object.entries(profiles).flatMap(([unit,phases])=>
  (['shoot','fight'] as const).flatMap(phase=>{
    const options=phases[phase];
    if(!options)return [];
    return [{
      id:'weapons-'+unit+'-'+phase,title:phase==='shoot'?'Ranged weapon abilities':'Melee weapon abilities',units:[unit],
      signal:phase==='shoot'?['shoot','overwatch'] as const:'fight',
      gear:(squad:RosterInstance)=>equipped(squad,options).length>0,
      text:({bearer})=>equipped(bearer,options).map(p=>p.weapon+' — '+p.abilities).join('. ')+'.',
    }];
  })
);
